// Pure: F07-R10. The lines of the Blind spots section.
import type { Graph } from '../../types'
import { fileName } from '../layout/seed'

export const MAX_BLIND = 5

/** At most five blind spots, newest first: a ghost that imports a changed file, "imports login.ts, never opened", and a file a command changed unseen, with its reason. */
export function blindSpots(graph: Graph): string[] {
  const spots = Object.values(graph.files).flatMap(n => {
    const edge = n.state === 'ghost' ? graph.edges.find(e => e.from === n.path && e.blind) : undefined
    const reason = edge ? `imports ${fileName(edge.to)}, never opened` : n.change === 'blind' ? n.reason : null
    return reason ? [{ touched: n.touched, line: `${n.path}  ${reason}` }] : []
  })
  return spots.reverse().sort((a, b) => b.touched - a.touched).slice(0, MAX_BLIND).map(s => s.line) // reversed first: of equal age, the one added later is newer
}
