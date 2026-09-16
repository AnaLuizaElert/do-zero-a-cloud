import { arrayMove } from "@dnd-kit/sortable"
import type { BoardColumn } from "@/lib/api"

export function reorderColumns(columns: BoardColumn[], activeId: string, overId: string): BoardColumn[] {
  const from = columns.findIndex((column) => column.id === activeId)
  const to = columns.findIndex((column) => column.id === overId)
  if (from < 0 || to < 0 || from === to) return columns
  return arrayMove(columns, from, to).map((column, position) => ({ ...column, position }))
}

export function moveTask(
  columns: BoardColumn[],
  taskId: string,
  targetColumnId: string,
  targetTaskId?: string,
): BoardColumn[] {
  const next = columns.map((column) => ({ ...column, tasks: [...column.tasks] }))
  const source = next.find((column) => column.tasks.some((task) => task.id === taskId))
  const target = next.find((column) => column.id === targetColumnId)
  if (!source || !target) return columns

  const sourceIndex = source.tasks.findIndex((task) => task.id === taskId)
  if (source.id === target.id) {
    const requestedIndex = targetTaskId ? source.tasks.findIndex((candidate) => candidate.id === targetTaskId) : source.tasks.length - 1
    if (requestedIndex < 0 || requestedIndex === sourceIndex) return columns
    source.tasks = arrayMove(source.tasks, sourceIndex, requestedIndex)
    return next.map((column) => ({
      ...column,
      tasks: column.tasks.map((item, position) => ({ ...item, position, columnId: column.id })),
    }))
  }

  const [task] = source.tasks.splice(sourceIndex, 1)
  let targetIndex = targetTaskId ? target.tasks.findIndex((candidate) => candidate.id === targetTaskId) : target.tasks.length
  if (targetIndex < 0) targetIndex = target.tasks.length
  target.tasks.splice(targetIndex, 0, { ...task, columnId: target.id })

  return next.map((column) => ({
    ...column,
    tasks: column.tasks.map((item, position) => ({ ...item, position, columnId: column.id })),
  }))
}

export async function persistOptimistically<T>(next: T, previous: T, apply: (value: T) => void, persist: () => Promise<unknown>): Promise<void> {
  apply(next)
  try {
    await persist()
  } catch (error) {
    apply(previous)
    throw error
  }
}
