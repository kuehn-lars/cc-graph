// Pure: what the views draw a node with: its glyph, Claude Code's colours, its change word, and which node is now.
import type { Change, FileNode, Graph, NodeState } from '../../types'

// 02 Data model: the glyph of each state, in the list and in the graph's boxes. No state is told by color alone (NFR-A1).
export const GLYPH: Record<NodeState, string> = { read: '●', partial: '◐', search: '◌', compacted: '○', unread: '!', ghost: '⋯' }

/** A theme key for a `Text`, and its value in Claude Code's dark theme for a `Raster` cell. */
export type Tone = { key: string; rgb: number }

/**
 * F09-R29: Claude Code's own colours, by theme key. A `Text` names the key, so it follows the person's theme; a `Raster` cell takes a raw colour, so it paints the key's value in Claude Code's dark theme.
 */
const tone = (key: string, rgb: number): Tone => ({ key, rgb })
export const TONE = {
  claude: tone('claude', 0xd77757), shimmer: tone('claudeShimmer', 0xeb9f7f), inContext: tone('suggestion', 0xb1b9f9), search: tone('planMode', 0x48968c),
  inactive: tone('inactive', 0x999999), border: tone('promptBorder', 0x888888), subtle: tone('subtle', 0x505050), text: tone('text', 0xffffff),
  edited: tone('warning', 0xffc107), created: tone('success', 0x4eba65), blind: tone('error', 0xff6b80),
}

/** The colour of each state's glyph and size bar (F09-R24). */
export const STATE_TONE: Record<NodeState, Tone> = { read: TONE.inContext, partial: TONE.inContext, search: TONE.search, compacted: TONE.inactive, unread: TONE.inactive, ghost: TONE.inactive }

/** The colour of each change: its box's border and its word (F09-R24). */
export const CHANGE_TONE: Record<Change, Tone> = { edited: TONE.edited, created: TONE.created, deleted: TONE.blind, external: TONE.inactive, blind: TONE.blind }

/** F09-R24: a solid box: the states that are in context (by state alone; `inContext` of the model also asks for the main loop). */
export const solid = (s: NodeState) => s === 'read' || s === 'partial' || s === 'search'

/** F09-R18: the now node, the node that is not a ghost with the highest `touched`. */
export const nowNode = (graph: Graph) => Object.values(graph.files).filter(n => n.state !== 'ghost').reduce<FileNode | null>((top, n) => (!top || n.touched > top.touched ? n : top), null)

/** F09-R24: what a change says, in its colours: an edit's added lines in the created colour and its removed lines in the deleted one, as a diff does; every other change in its own. */
export function changeParts(n: FileNode): [string, Tone][] {
  switch (n.change) {
    case 'edited': return !n.added && !n.removed ? [['edited', TONE.edited]] : [[`+${n.added}`, TONE.created], [' ', TONE.text], [`−${n.removed}`, TONE.blind]]
    case 'created': return [[`+${n.added} new`, TONE.created]]
    case 'deleted': return [['deleted', TONE.blind]]
    case 'external': return [['changed', TONE.inactive]]
    case 'blind': return [['changed unseen', TONE.blind]]
    default: return []
  }
}
