import { useEffect, useMemo, useRef, useState } from "react"
import { type DragEndEvent } from "@dnd-kit/core"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Cloud, LayoutDashboard, Loader2, MoreHorizontal, Pencil, Plus, RefreshCw, Settings, Trash2, WifiOff } from "lucide-react"
import { toast } from "sonner"
import { api, errorMessage, loadBoard, type Board, type BoardColumn, type Task } from "@/lib/api"
import { moveTask, persistOptimistically, reorderColumns } from "@/lib/board"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmAction, NameDialog, type TaskFormValues } from "@/components/forms"
import { KanbanBoard } from "@/components/kanban-board"
import { ApiAudit } from "@/components/api-audit"

const boardsKey = ["boards"] as const
const boardKey = (id: string) => ["board", id] as const

export default function App() {
  const queryClient = useQueryClient()
  const [activeView, setActiveView] = useState<"kanban" | "settings">("kanban")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newBoardOpen, setNewBoardOpen] = useState(false)
  const [editBoard, setEditBoard] = useState<Board | null>(null)
  const requestInFlightRef = useRef(false)
  const [requestInFlight, setRequestInFlight] = useState(false)

  const boardsQuery = useQuery({ queryKey: boardsKey, queryFn: api.listBoards, retry: false })
  const boards = boardsQuery.data ?? []

  useEffect(() => {
    if (!boards.length) setSelectedId(null)
    else if (!selectedId || !boards.some((board) => board.id === selectedId)) setSelectedId(boards[0].id)
  }, [boards, selectedId])

  const boardQuery = useQuery({ queryKey: boardKey(selectedId ?? ""), queryFn: () => loadBoard(selectedId!), enabled: Boolean(selectedId), retry: false })
  const selectedBoard = boards.find((board) => board.id === selectedId)
  const columns = boardQuery.data ?? []
  const interactionBusy = requestInFlight || boardsQuery.isFetching || boardQuery.isFetching
  const showRequestOverlay = interactionBusy && !boardsQuery.isLoading && !boardQuery.isLoading

  const run = async (operation: () => Promise<unknown>, message: string, invalidateBoard = true) => {
    if (requestInFlightRef.current) return
    requestInFlightRef.current = true
    setRequestInFlight(true)
    try {
      await operation()
      await queryClient.invalidateQueries({ queryKey: boardsKey })
      if (invalidateBoard && selectedId) await queryClient.invalidateQueries({ queryKey: boardKey(selectedId) })
      toast.success(message)
    } catch (error) {
      toast.error(errorMessage(error))
      throw error
    } finally {
      requestInFlightRef.current = false
      setRequestInFlight(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (requestInFlightRef.current || !selectedId || !event.over || event.active.id === event.over.id) return
    const previous = queryClient.getQueryData<BoardColumn[]>(boardKey(selectedId)) ?? []
    const activeType = event.active.data.current?.type
    let next = previous
    let persist: Promise<unknown>[] = []

    if (activeType === "column") {
      const activeId = String(event.active.id).replace("column:", "")
      const overId = String(event.over.data.current?.columnId ?? event.over.id).replace("column:", "")
      next = reorderColumns(previous, activeId, overId)
      const oldById = new Map(previous.map((column) => [column.id, column]))
      persist = next.filter((column) => oldById.get(column.id)?.position !== column.position).map(api.updateColumn)
    } else if (activeType === "task") {
      const taskId = String(event.active.id).replace("task:", "")
      const overType = event.over.data.current?.type
      const targetColumnId = overType === "task" ? String(event.over.data.current?.columnId) : String(event.over.data.current?.columnId ?? event.over.id).replace("column:", "")
      const targetTaskId = overType === "task" ? String(event.over.data.current?.taskId) : undefined
      next = moveTask(previous, taskId, targetColumnId, targetTaskId)
      const oldTasks = new Map(previous.flatMap((column) => column.tasks).map((task) => [task.id, task]))
      persist = next.flatMap((column) => column.tasks).filter((task) => {
        const old = oldTasks.get(task.id)
        return old && (old.position !== task.position || old.columnId !== task.columnId)
      }).map(api.updateTask)
    }

    if (next === previous || persist.length === 0) return
    requestInFlightRef.current = true
    setRequestInFlight(true)
    try {
      await persistOptimistically(next, previous, (value) => queryClient.setQueryData(boardKey(selectedId), value), () => Promise.all(persist))
      await queryClient.invalidateQueries({ queryKey: boardKey(selectedId) })
    } catch (error) {
      toast.error(`Não foi possível mover: ${errorMessage(error)}`)
    } finally {
      requestInFlightRef.current = false
      setRequestInFlight(false)
    }
  }

  const refreshAfterAudit = async () => {
    await queryClient.invalidateQueries({ queryKey: boardsKey })
    if (selectedId) await queryClient.invalidateQueries({ queryKey: boardKey(selectedId) })
  }

  const content = useMemo(() => {
    if (boardsQuery.isLoading) return <LoadingState label="Carregando seus quadros…" />
    if (boardsQuery.isError) return <ErrorState message={errorMessage(boardsQuery.error)} pending={boardsQuery.isFetching} onRetry={() => { void boardsQuery.refetch() }} />
    if (boards.length === 0) return <NoBoards onCreate={() => setNewBoardOpen(true)} />
    if (boardQuery.isLoading) return <LoadingState label="Montando o quadro…" />
    if (boardQuery.isError) return <ErrorState message={errorMessage(boardQuery.error)} pending={boardQuery.isFetching} onRetry={() => { void boardQuery.refetch() }} />

    return <KanbanBoard
      columns={columns}
      busy={interactionBusy}
      onCreateColumn={(name) => run(() => api.createColumn(name, columns.length, selectedId!), "Coluna criada")}
      onUpdateColumn={(column, name) => run(() => api.updateColumn({ ...column, name }), "Coluna atualizada")}
      onDeleteColumn={(column) => run(() => api.deleteColumn(column.id), "Coluna excluída")}
      onCreateTask={(column, values) => run(() => api.createTask(column.id, { ...values, completed: false, position: column.tasks.length, columnId: column.id }), "Tarefa criada")}
      onUpdateTask={(task, values) => run(() => api.updateTask({ ...task, ...values }), "Tarefa atualizada")}
      onDeleteTask={(task) => run(() => api.deleteTask(task.id), "Tarefa excluída")}
      onToggleTask={(task) => run(() => api.updateTask({ ...task, completed: !task.completed }), task.completed ? "Tarefa reaberta" : "Tarefa concluída")}
      onDragEnd={handleDragEnd}
    />
  }, [boardsQuery.isLoading, boardsQuery.isError, boardsQuery.error, boardsQuery.isFetching, boards.length, boardQuery.isLoading, boardQuery.isError, boardQuery.error, boardQuery.isFetching, columns, selectedId, interactionBusy])

  return <div className="flex min-h-dvh bg-white text-neutral-950">
    <aside className="fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b border-neutral-200 bg-white px-4 md:static md:h-dvh md:w-64 md:shrink-0 md:flex-col md:items-stretch md:border-b-0 md:border-r md:px-3 md:py-5">
      <div className="flex items-center gap-3 px-2 md:mb-7">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white"><LayoutDashboard className="h-4 w-4" /></div>
        <div><div className="text-sm font-semibold">Kanban</div><div className="hidden text-xs text-neutral-500 md:block">Do Zero à Cloud</div></div>
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-1 overflow-x-auto md:ml-0 md:block md:overflow-visible">
        <div className="mb-2 hidden items-center justify-between px-2 md:flex"><span className="text-xs font-medium uppercase tracking-wider text-neutral-400">Quadros</span><Button disabled={interactionBusy} variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNewBoardOpen(true)} aria-label="Novo quadro"><Plus className="h-4 w-4" /></Button></div>
        <nav className="flex gap-1 md:block md:space-y-1" aria-label="Quadros">
          {boards.map((board) => <div key={board.id} className={`group flex shrink-0 items-center rounded-lg ${activeView === "kanban" && selectedId === board.id ? "bg-neutral-100" : "hover:bg-neutral-50"}`}>
            <button disabled={interactionBusy} className="max-w-40 flex-1 truncate px-3 py-2 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 md:max-w-none" onClick={() => { setSelectedId(board.id); setActiveView("kanban") }}>{board.name}</button>
            <DropdownMenu><DropdownMenuTrigger asChild><Button disabled={interactionBusy} variant="ghost" size="icon" className="mr-1 hidden h-7 w-7 group-hover:inline-flex data-[state=open]:inline-flex md:flex md:opacity-0 md:group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditBoard(board)}><Pencil className="h-4 w-4" />Renomear</DropdownMenuItem>
              <ConfirmAction title="Excluir quadro?" description="Todas as colunas e tarefas deste quadro serão excluídas." onConfirm={() => run(() => api.deleteBoard(board.id), "Quadro excluído", false)}><DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-red-600"><Trash2 className="h-4 w-4" />Excluir</DropdownMenuItem></ConfirmAction>
            </DropdownMenuContent></DropdownMenu>
          </div>)}
        </nav>
        <Button disabled={interactionBusy} variant="outline" size="sm" className="ml-1 shrink-0 md:hidden" onClick={() => setNewBoardOpen(true)}><Plus className="h-4 w-4" />Quadro</Button>
        <Button variant="ghost" size="sm" className={`ml-1 shrink-0 md:hidden ${activeView === "settings" ? "bg-neutral-100" : ""}`} onClick={() => setActiveView("settings")}><Settings className="h-4 w-4" />Configurações</Button>
      </div>
      <div className="mt-auto hidden space-y-3 md:block">
        <button className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ${activeView === "settings" ? "bg-neutral-100 text-neutral-950" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950"}`} onClick={() => setActiveView("settings")}><Settings className="h-4 w-4" />Configurações</button>
        <div className="rounded-xl border border-neutral-200 p-3"><div className="flex items-center gap-2 text-xs font-medium"><Cloud className={`h-4 w-4 ${boardsQuery.isError ? "text-red-500" : "text-emerald-600"}`} />{boardsQuery.isError ? "API desconectada" : boardsQuery.isLoading ? "Conectando à API…" : "API conectada"}</div><p className="mt-1 truncate text-xs text-neutral-400">{boardsQuery.isError ? "Verifique a configuração e o CORS" : "Dados persistidos no backend"}</p></div>
      </div>
    </aside>
    <main className="flex min-h-dvh min-w-0 flex-1 flex-col pt-16 md:pt-0">
      <header className="flex h-20 shrink-0 items-center justify-between px-6 md:px-8"><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-widest text-neutral-400">{activeView === "settings" ? "Configurações" : "Meu quadro"}</p><h1 className="truncate text-xl font-semibold md:text-2xl">{activeView === "settings" ? "Auditoria da API" : selectedBoard?.name ?? "Seus projetos"}</h1></div>{activeView === "kanban" && <div className="flex items-center gap-3">{requestInFlight && <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500" role="status"><Loader2 className="h-4 w-4 animate-spin" />Salvando…</span>}{selectedBoard && <Button variant="outline" size="sm" onClick={() => { void boardQuery.refetch() }} disabled={interactionBusy}><RefreshCw className={`h-4 w-4 ${boardQuery.isFetching ? "animate-spin" : ""}`} />{boardQuery.isFetching ? "Atualizando…" : "Atualizar"}</Button>}</div>}</header>
      <div className="flex min-h-0 flex-1 flex-col bg-neutral-50/60">{activeView === "settings" ? <ApiAudit onFinished={refreshAfterAudit} /> : content}</div>
    </main>
    <NameDialog open={newBoardOpen} onOpenChange={setNewBoardOpen} title="Novo quadro" description="Crie um espaço para organizar seu projeto." submitLabel="Criar quadro" pending={interactionBusy} onSubmit={(name) => run(() => api.createBoard(name), "Quadro criado", false)} />
    <NameDialog open={Boolean(editBoard)} onOpenChange={(open) => !open && setEditBoard(null)} title="Renomear quadro" description="Atualize o nome deste projeto." initialName={editBoard?.name} pending={interactionBusy} onSubmit={(name) => run(() => api.updateBoard(editBoard!.id, name), "Quadro atualizado", false)} />
    {showRequestOverlay && <RequestOverlay label={requestInFlight ? "Salvando alterações…" : "Atualizando dados…"} />}
  </div>
}

function RequestOverlay({ label }: { label: string }) { return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/10 backdrop-blur-[1px]" role="status" aria-live="polite" aria-label={label}><div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700 shadow-xl"><Loader2 className="h-5 w-5 animate-spin" />{label}</div></div> }
function LoadingState({ label }: { label: string }) { return <div className="flex flex-1 items-center justify-center"><div className="text-center"><RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin text-neutral-400" /><p className="text-sm text-neutral-500">{label}</p></div></div> }
function ErrorState({ message, pending, onRetry }: { message: string; pending: boolean; onRetry: () => void }) { return <div className="flex flex-1 items-center justify-center p-6"><div className="max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm"><WifiOff className="mx-auto mb-3 h-6 w-6 text-red-500" /><h2 className="font-semibold">Falha ao conectar</h2><p className="mt-1 text-sm text-neutral-500">{message}</p><Button className="mt-4" variant="outline" disabled={pending} onClick={onRetry}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{pending ? "Tentando…" : "Tentar novamente"}</Button></div></div> }
function NoBoards({ onCreate }: { onCreate: () => void }) { return <div className="flex flex-1 items-center justify-center p-6"><div className="max-w-sm text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm"><LayoutDashboard className="h-5 w-5" /></div><h2 className="text-lg font-semibold">Seu primeiro quadro</h2><p className="mt-1 text-sm text-neutral-500">Crie um quadro para começar a organizar colunas e tarefas.</p><Button className="mt-5" onClick={onCreate}><Plus className="h-4 w-4" />Criar quadro</Button></div></div> }
