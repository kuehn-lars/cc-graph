// Pure reducers: (graph, action, turn) -> graph.
import type { Graph } from '../../types'
import { compacted, type Compacted } from './compacted'
import { fileEdited, type FileEdited } from './fileEdited'
import { fileRead, fileUnchanged, type FileRead, type FileUnchanged } from './fileRead'
import { fileWritten, type FileWritten } from './fileWritten'
import { mention, type Mention } from './mention'
import { reattached, type Reattached } from './reattached'
import { searched, type Searched } from './searched'

// F15-R1: the actions that name a file, and so carry the calling agent's id.
export type FileAction = FileRead | FileUnchanged | FileEdited | FileWritten | Mention | Searched
export type Action = FileAction | Compacted | Reattached

export const emptyGraph: Graph = { seq: 0, files: {}, edges: [], decisions: [], compactions: [] }

export function reduce(g: Graph | undefined, a: Action, turn: number): Graph {
  const graph = g ?? emptyGraph
  switch (a.type) {
    case 'fileRead': return fileRead(graph, a, turn)
    case 'fileUnchanged': return fileUnchanged(graph, a, turn)
    case 'mention': return mention(graph, a, turn)
    case 'fileEdited': return fileEdited(graph, a, turn)
    case 'fileWritten': return fileWritten(graph, a, turn)
    case 'searched': return searched(graph, a, turn)
    case 'compacted': return compacted(graph, a, turn)
    case 'reattached': return reattached(graph, a)
  }
}
