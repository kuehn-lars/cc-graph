# 02 Data model

| Status | Owner | Checked against |
| --- | --- | --- |
| Approved | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 |

The graph is a handful of small records held in `$.state` for the conversation. A file node moves through six states, a separate change mark survives every move, and every reducer keeps the invariants below true at every version a reader can see.

## Entities

| Entity | What it is | Written by |
| --- | --- | --- |
| `FileNode` | One file and what Claude saw of it | F01, F02, F03, F06, F07, F15 |
| `Edge` | An import between two files, or a decision linked to a file | F06, F07, F12 |
| `Decision` | A choice Claude logged with `log_decision` | F12 |
| `CompactMark` | One main-loop compaction | F03 |
| `ThinkingNote` | An excerpt of one step's visible thinking and the files that step named | F05 |
| `MemoryNote` | One memory file in the context | F04 |
| `Fill` | The context window's real fill | F03 |
| `Agent` | A subagent's type and task, kept after the engine forgets it | F15 |
| `Snapshot` | What changed in the graph during one turn | F13 |

## `$.state` contract

`types/index.d.ts` declares the contract; `plugin.json` names it under `types`, and `claude plugin validate` holds every key the module reads or writes to it. Every value is plain JSON. Each key is written on its own, so a key press never rewrites the graph and a layout pass never rewrites anything but positions (D3).

```ts
export type NodeState = 'ghost' | 'search' | 'partial' | 'read' | 'compacted' | 'unread'
export type Change = 'edited' | 'created' | 'external' | 'blind'

export type FileNode = {
  path: string               // I4
  state: NodeState
  change: Change | null      // survives every state transition
  reason: string | null      // one line on the change: "changed by `npm install left-pad`"
  tokens: number | null      // ≈ size of what is in context; null when unknown (P5)
  seen: string               // what Claude saw, in words: "lines 1 to 40 of 120"
  hits: number               // search hits counted (F02)
  added: number              // lines added by Claude's edits and writes
  removed: number            // lines removed by them
  line: number | null        // first line of the latest change, for "open in editor" (F11)
  readId: string | null      // tool_use_id of the read, or a search node's latest search, that put it in context (F01, F02, F03)
  agents: string[]           // ids of subagents that touched it (F15)
  mainLoop: boolean          // the main conversation touched it (F15)
  firstTurn: number
  lastTurn: number
  touched: number            // Graph.seq at the last touch: orders "most recent first"
}

export type Edge = {
  from: string               // importer, or decision id
  to: string                 // imported file, or linked file
  kind: 'import' | 'decision'
  blind: boolean             // a ghost importing a changed file (F07)
  guessed: boolean           // the target's extension was not confirmed (F06)
}

export type Decision = { id: string; title: string; because: string | null; files: string[]; turn: number }

export type CompactMark = {
  turn: number
  trigger: 'manual' | 'auto' | 'plugin'
  tokensBefore: number | null
  tokensAfter: number | null
  kept: number               // in-context nodes that survived it
}

export type Graph = {
  seq: number                // grows by one with every touch of a node
  files: Record<string, FileNode>
  edges: Edge[]
  decisions: Decision[]
  compactions: CompactMark[]
}

export type GraphDiff = {
  seq: number                              // Graph.seq after the turn
  files: Record<string, FileNode | null>   // the node after the turn; null when removed
  edgesAdded: Edge[]
  edgesRemoved: Edge[]
  decisionsAdded: Decision[]
  compactionsAdded: CompactMark[]
}
export type Snapshot = { turn: number; at: number; diff: GraphDiff }
export type Timeline = { base: Graph; snapshots: Snapshot[] }   // base: the graph before the oldest kept snapshot

export type ThinkingNote = { turn: number; step: number; text: string; chars: number; files: string[] }
export type MemoryNote = { path: string; type: string; tokens: number | null; reason: string | null }
export type Fill = { tokens: number | null; window: number; percent: number | null }
export type Agent = { id: string; type: string; description: string }
export type Point = { x: number; y: number }   // layout units on a 100 × 64 canvas
export type Why = { path: string; pending: boolean; text: string | null; failure: string | null }

declare module 'claude-code' {
  interface PluginState {
    'cc-graph': {
      graph: Graph
      turn: number                     // main-loop turns started in this conversation
      layout: Record<string, Point>    // by node id: a file path or a decision id
      fill: Fill | null
      memory: MemoryNote[]
      thinking: ThinkingNote[]         // newest 20
      timeline: Timeline               // newest 50 snapshots over a base
      agents: Record<string, Agent>
      notes: string[]                  // one-line footer notes, e.g. "blind spots need git"
      view: 'graph' | 'list'           // UI: kept across /clear
      selected: string | null          // UI
      viewTurn: number | null          // UI: null means live
      why: Why | null                  // UI: the "Ask why" side answer
    }
  }
}
```

## Node states

| State | Meaning | In context | Graph | List glyph |
| --- | --- | --- | --- | --- |
| `ghost` | Known to the graph, never opened (an import's other end, a decision's file, a mentioned PDF) | no | Faint dashed outline | `⋯` |
| `search` | Claude saw only search hits | the hit lines | Dotted outline | `◌` |
| `partial` | Read with a range, cut by the token cap, or edited without a read | part | Half-strength fill | `◐` |
| `read` | Read whole, written by Claude, mentioned by the person, or kept or re-attached by compaction | yes | Filled, size by tokens | `●` |
| `compacted` | Was in context before a compaction and was not kept | summary only | Hollow, dimmed | `○` |
| `unread` | Changed outside Claude's tools and never read | no | Outline with a red ring | `!` |

`read`, `partial` and `search` form the in-context group. A node no main-loop event touched is drawn with a second, dotted outline and the word "agent" ("subagent only", F15). Decisions are violet diamonds `◆` (F12); memory files are squares `■` in their own cluster (F04).

## Changes

`change` is its own field and survives every state transition.

| Change | Meaning | Ring | Badge |
| --- | --- | --- | --- |
| `edited` | Changed by `Edit`, `NotebookEdit`, or a `Write` over an existing file | amber | `edited +3 −1` |
| `created` | Created by a `Write` whose result was `type: 'create'` | green | `created +12` |
| `external` | Changed outside Claude's tools, and Claude Code showed Claude the change | grey | `external` |
| `blind` | Changed outside Claude's tools, and Claude was not shown it | red | `blind` |

## Transitions

| Event | From | To | Spec |
| --- | --- | --- | --- |
| Whole text `Read`; image, PDF or notebook `Read`; `Write`; whole `@` mention; file re-attached after compaction | any | `read` | F01, F03 |
| Ranged or token-capped text `Read`; `@` mention of a line range | any but `read` | `partial` | F01 |
| `Read` answered `file_unchanged` | any | unchanged | F01 |
| `Edit`, `NotebookEdit` | any | unchanged (a new node starts `partial`) | F01 |
| Search hit | new, `ghost`, `compacted`, `unread` | `search`, hits and tokens from this call | F02 |
| Search hit | `read`, `partial`, `search` | unchanged, hits added (a `search` node's tokens too) | F02 |
| Main-loop compaction that stands | `read`, `partial`, `search` touched by the main loop, whose read was not kept | `compacted` | F03, F15 |
| Shell change seen by `git` | new, `ghost` | `unread` | F07 |
| Shell change seen by `git` | any other | unchanged, `change: blind` | F07 |
| Import found; decision names a file; `@` mention of a PDF by reference | new | `ghost` | F06, F07, F12, F01 |
| `/clear`, `/resume`, `/branch` | any | removed (the graph starts empty) | F03 |

## Invariants

Every reducer keeps these true. Each has a test, named by its ID, in the event tests.

1. **I1** The meter sums `tokens` over main-loop nodes in the in-context group. Nodes with `tokens: null` are counted ("+3 unknown"), never summed as zero. Memory files are shown beside it, not in it.
2. **I2** `change` is `created` only after a `Write` whose result was `type: 'create'`. Later edits keep `created`.
3. **I3** Every edge's endpoints exist: a file node or a decision. A missing file endpoint is added as a `ghost`.
4. **I4** One node per normalized path. Paths inside the conversation's working directory (from `session.start`) are stored relative to it; others stay absolute. Normalization is lexical: `\` becomes `/`, `.` and `..` segments are resolved, repeated separators collapse, a Windows drive letter is lower-cased. Symbolic links are not resolved, because the mod reads no file system (D6).
5. **I5** The graph holds at most `maxNodes` file nodes (F14, default 60). When a write would exceed it, nodes are evicted oldest `lastTurn` first, in this order: `ghost`, `search`, `compacted`, `partial`, `read`. A node with a change, and any node with an edge to or from one, is never evicted. If nothing can be evicted, the cap is exceeded and the footer says by how much.
6. **I6** `ui.render` hooks only read state. Every write comes from another event, a press or the off-path queue.
7. **I7** A compaction with `agentId` set never changes a node.
8. **I8** Thinking text lives only in `$.state`. Nothing is written to `$.store`, to disk, or into the conversation.
9. **I9** One event changes `graph` with one `update`, so every version a reader sees satisfies I1 to I5.

## Estimates

- File, search and memory sizes are estimates, `ceil(characters / 4)`, always shown with "≈". Claude reads a file with line numbers added, so the estimate runs low; the window fill beside it is the engine's own figure.
- Search tokens add up per call, because Claude's context holds every search output. Claude Code 2.1.296 has two ways to clear old tool results before a compaction, a keep-recent microcompact and a clearing after 65 minutes idle. Both are behind remote flags, off, and no event reports them, so the graph does not model them: with either on, old search tokens are overstated ([F02 research](../features/F02-search-tracking/research-repeated-search.md)).
- The window fill is not an estimate. It is what `session.measure` reports: `context.tokens` over `context.window`. Before the first response it is unknown and shown as "–".

## Limits

| What | Limit | Why |
| --- | --- | --- |
| File nodes | `maxNodes`, 20 to 200, default 60 | Readability and state size (I5, F14) |
| Thinking notes | Newest 20, at most 400 characters each | NFR-P5; thinking is the most sensitive data held |
| Snapshots | Newest 50 over a base graph | NFR-P5; the base keeps replay exact (F13) |
| Footer notes | Newest 5 shown | One line each |
| Whole state | Under 1 MB on the 500-call fixture | NFR-P5 |

## Reset

On `/clear`, `/resume` and `/branch` (F03-R7) every key returns to its empty value except `view`, which is the person's preference. `turn` starts again at 0.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Graph fields merged into one `graph` key written atomically (I9); positions moved to their own `layout` key; added `readId`, `hits`, `line`, `touched` and `Graph.seq` (a stable "most recent first"), `turn`, `agents`, `notes`, `Timeline.base` (replay stays exact after pruning) and `Why.failure`; `unread` and `ghost` meanings sharpened; eviction order completed; symbolic links named as a known limit.
- 2026-10-11 Approved by the owner.
- 2026-10-12 F02 ticketing: `readId` also holds a search node's latest search call; search hits and tokens add up per call and restart from `compacted`; tool-result clearing named as a known limit under Estimates. Approved by the owner.
