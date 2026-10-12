// Pure reducers: (graph, action, turn) -> graph. A later F01 ticket adds its action to `Action` and one `case`.
import type { Graph } from '../../types'
import { fileEdited, type FileEdited } from './fileEdited'
import { fileRead, type FileRead } from './fileRead'

export type Action = FileRead | FileEdited

export const emptyGraph: Graph = { seq: 0, files: {}, edges: [], decisions: [], compactions: [] }

export function reduce(g: Graph | undefined, a: Action, turn: number): Graph {
  const graph = g ?? emptyGraph
  switch (a.type) {
    case 'fileRead': return fileRead(graph, a, turn)
    case 'fileEdited': return fileEdited(graph, a, turn)
  }
}
