// Pure reducers: (graph, action, turn) -> graph.
import type { Graph } from '../../types'
import { batch, type Batch } from './batch'
import { commanded, type Commanded } from './commanded'
import { compacted, type Compacted } from './compacted'
import { external, type External } from './external'
import { fileEdited, type FileEdited } from './fileEdited'
import { fileRead, fileUnchanged, type FileRead, type FileUnchanged } from './fileRead'
import { fileWritten, type FileWritten } from './fileWritten'
import { importers, type Importers } from './importers'
import { mention, type Mention } from './mention'
import { outside, type Outside } from './outside'
import { reattached, type Reattached } from './reattached'
import { searched, type Searched } from './searched'
import { shellChanged, type ShellChanged } from './shellChanged'

// F15-R1: the actions that name a file (a Batch holds them), and so carry the calling agent's id.
export type FileAction = FileRead | FileUnchanged | FileEdited | FileWritten | Mention | Searched | Commanded | Batch
export type Action = FileAction | Compacted | Reattached | ShellChanged | Importers | External | Outside

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
    case 'batch': return batch(graph, a, turn, reduce)
    case 'compacted': return compacted(graph, a, turn)
    case 'reattached': return reattached(graph, a)
    case 'shellChanged': return shellChanged(graph, a, turn)
    case 'importers': return importers(graph, a, turn)
    case 'external': return external(graph, a, turn)
    case 'commanded': return commanded(graph, a, turn)
    case 'outside': return outside(graph, a, turn)
  }
}
