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
export type Layout = Record<string, Point>     // by node id: a file path or a decision id
export type Why = { path: string; pending: boolean; text: string | null; failure: string | null }

declare module 'claude-code' {
  interface PluginState {
    'cc-graph': {
      graph: Graph
      turn: number                     // main-loop turns started in this conversation
      layout: Layout
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
