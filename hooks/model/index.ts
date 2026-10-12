// Pure reducers: (graph, action, turn) -> graph.
import type { Graph } from '../../types'
import { fileEdited, type FileEdited } from './fileEdited'
import { fileRead, fileUnchanged, type FileRead, type FileUnchanged } from './fileRead'
import { fileWritten, type FileWritten } from './fileWritten'
import { mention, type Mention } from './mention'
import { searched, type Searched } from './searched'

export type Action = FileRead | FileUnchanged | FileEdited | FileWritten | Mention | Searched

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
  }
}
