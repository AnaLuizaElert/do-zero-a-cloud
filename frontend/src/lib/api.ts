import { configuredApiOrigin } from "@/lib/config"

export interface Board {
  id: string
  name: string
}

export interface BoardColumn {
  id: string
  name: string
  position: number
  boardId: string
  tasks: Task[]
}

export interface Task {
  id: string
  name: string
  position: number
  createdAt: string
  dueDate: string | null
  completed: boolean
  tags: string[]
  columnId: string
}

export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  fields?: Record<string, string>
}

export interface TaskPayload {
  name: string
  position: number
  createdAt?: string
  dueDate: string | null
  completed: boolean
  tags: string[]
  columnId: string
}

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly problem: ProblemDetail) {
    super(problem.detail || problem.title || "Não foi possível concluir a operação")
  }
}

export const API_ORIGIN = configuredApiOrigin()
export const API_URL = `${API_ORIGIN}/api/v1`

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })

  if (!response.ok) {
    let problem: ProblemDetail = { status: response.status, title: "Erro na API" }
    try {
      problem = await response.json() as ProblemDetail
    } catch {
      problem.detail = `A API respondeu com status ${response.status}.`
    }
    throw new ApiError(response.status, problem)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) })

export const api = {
  listBoards: () => request<Board[]>("/board"),
  createBoard: (name: string) => request<Board>("/board", { method: "POST", ...json({ name }) }),
  updateBoard: (id: string, name: string) => request<Board>(`/board/${id}`, { method: "PUT", ...json({ name }) }),
  deleteBoard: (id: string) => request<void>(`/board/${id}`, { method: "DELETE" }),

  listColumns: (boardId: string) => request<Omit<BoardColumn, "tasks">[]>(`/column/from/${boardId}`),
  createColumn: (name: string, position: number, boardId: string) => request<Omit<BoardColumn, "tasks">>("/column", { method: "POST", ...json({ name, position, boardId }) }),
  updateColumn: (column: Pick<BoardColumn, "id" | "name" | "position" | "boardId">) => request<Omit<BoardColumn, "tasks">>(`/column/${column.id}`, { method: "PUT", ...json({ name: column.name, position: column.position, boardId: column.boardId }) }),
  deleteColumn: (id: string) => request<void>(`/column/${id}`, { method: "DELETE" }),

  listTasks: (columnId: string) => request<Task[]>(`/task/from/${columnId}`),
  createTask: (columnId: string, payload: TaskPayload) => request<Task>(`/task/from/${columnId}`, { method: "POST", ...json(payload) }),
  updateTask: (task: Task) => request<Task>(`/task/${task.id}`, { method: "PUT", ...json({ name: task.name, position: task.position, createdAt: task.createdAt, dueDate: task.dueDate, completed: task.completed, tags: task.tags, columnId: task.columnId }) }),
  deleteTask: (id: string) => request<void>(`/task/${id}`, { method: "DELETE" }),
}

export async function loadBoard(boardId: string): Promise<BoardColumn[]> {
  const columns = await api.listColumns(boardId)
  return Promise.all(columns.map(async (column) => ({ ...column, tasks: await api.listTasks(column.id) })))
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fieldMessage = error.problem.fields && Object.values(error.problem.fields)[0]
    return fieldMessage || error.message
  }
  if (error instanceof TypeError) return "Não foi possível conectar à API. Confira a URL e o CORS do backend."
  return "Ocorreu um erro inesperado. Tente novamente."
}
