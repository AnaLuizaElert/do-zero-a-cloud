import { useState } from "react"
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin, rectIntersection, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CalendarDays, Check, Circle, Grip, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import type { BoardColumn, Task } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmAction, NameDialog, TaskDialog, type TaskFormValues } from "@/components/forms"

interface KanbanProps {
  columns: BoardColumn[]
  busy?: boolean
  onCreateColumn: (name: string) => Promise<void>
  onUpdateColumn: (column: BoardColumn, name: string) => Promise<void>
  onDeleteColumn: (column: BoardColumn) => Promise<void>
  onCreateTask: (column: BoardColumn, values: TaskFormValues) => Promise<void>
  onUpdateTask: (task: Task, values: TaskFormValues) => Promise<void>
  onDeleteTask: (task: Task) => Promise<void>
  onToggleTask: (task: Task) => Promise<void>
  onDragEnd: (event: DragEndEvent) => Promise<void>
}

type ActiveDrag =
  | { type: "column"; column: BoardColumn }
  | { type: "task"; task: Task }

const collisionDetection: CollisionDetection = (args) => {
  const collisions = pointerWithin(args)
  const candidates = collisions.length > 0 ? collisions : rectIntersection(args)
  const activeType = args.active.data.current?.type
  const targetType = (id: string | number) => args.droppableContainers.find((container) => container.id === id)?.data.current?.type

  if (activeType === "column") {
    return candidates.filter(({ id }) => targetType(id) === "column")
  }

  if (activeType === "task") {
    const tasks = candidates.filter(({ id }) => targetType(id) === "task")
    if (tasks.length > 0) return tasks
    return candidates.filter(({ id }) => targetType(id) === "column")
  }

  return candidates
}

export function KanbanBoard(props: KanbanProps) {
  const [newColumnOpen, setNewColumnOpen] = useState(false)
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const handleDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type
    const id = String(event.active.id).replace(`${type}:`, "")
    if (type === "column") {
      const column = props.columns.find((item) => item.id === id)
      if (column) setActiveDrag({ type, column })
    } else if (type === "task") {
      const task = props.columns.flatMap((column) => column.tasks).find((item) => item.id === id)
      if (task) setActiveDrag({ type, task })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null)
    if (props.busy) return
    void props.onDragEnd(event)
  }

  return <>
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragCancel={() => setActiveDrag(null)} onDragEnd={handleDragEnd}>
      <SortableContext items={props.columns.map((column) => `column:${column.id}`)} strategy={horizontalListSortingStrategy}>
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto px-6 pb-8 pt-2 md:px-8">
          {props.columns.map((column) => <KanbanColumn key={column.id} column={column} {...props} />)}
          <button disabled={props.busy} className="flex h-12 w-72 shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:bg-white hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setNewColumnOpen(true)}><Plus className="h-4 w-4" />Adicionar coluna</button>
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null} zIndex={60}>
        {activeDrag?.type === "task" && <TaskDragPreview task={activeDrag.task} />}
        {activeDrag?.type === "column" && <ColumnDragPreview column={activeDrag.column} />}
      </DragOverlay>
    </DndContext>
    <NameDialog open={newColumnOpen} onOpenChange={setNewColumnOpen} title="Nova coluna" description="Crie uma nova etapa para o fluxo de trabalho." pending={props.busy} onSubmit={props.onCreateColumn} />
  </>
}

function KanbanColumn({ column, ...props }: Omit<KanbanProps, "columns"> & { column: BoardColumn }) {
  const [editOpen, setEditOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const sortable = useSortable({ id: `column:${column.id}`, data: { type: "column", columnId: column.id }, disabled: props.busy })
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.isDragging ? undefined : sortable.transition }

  return <section ref={sortable.setNodeRef} style={style} className={cn("flex h-fit max-h-full w-72 shrink-0 flex-col rounded-2xl border border-neutral-200 bg-neutral-50/80", sortable.isDragging && "opacity-0")} aria-label={`Coluna ${column.name}`}>
    <header className="flex items-center gap-2 px-3 py-3">
      <button disabled={props.busy} ref={sortable.setActivatorNodeRef} {...sortable.attributes} {...sortable.listeners} className="touch-none cursor-grab rounded-md p-1 text-neutral-400 hover:bg-neutral-200 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Mover coluna ${column.name}`}><Grip className="h-4 w-4" /></button>
      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{column.name}</h2><span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">{column.tasks.length}</span>
      <DropdownMenu><DropdownMenuTrigger asChild><Button disabled={props.busy} variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Ações da coluna</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setEditOpen(true)}><Pencil className="h-4 w-4" />Renomear</DropdownMenuItem>
        <ConfirmAction title="Excluir coluna?" description="Todas as tarefas desta coluna também serão excluídas." onConfirm={() => props.onDeleteColumn(column)}><DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-red-600"><Trash2 className="h-4 w-4" />Excluir</DropdownMenuItem></ConfirmAction>
      </DropdownMenuContent></DropdownMenu>
    </header>
    <SortableContext items={column.tasks.map((task) => `task:${task.id}`)} strategy={verticalListSortingStrategy}>
      <div className="min-h-12 space-y-2 overflow-y-auto px-2 pb-2">
        {column.tasks.map((task) => <TaskCard key={task.id} task={task} busy={props.busy} onUpdate={props.onUpdateTask} onDelete={props.onDeleteTask} onToggle={props.onToggleTask} />)}
        {column.tasks.length === 0 && <div className="flex h-20 items-center justify-center rounded-xl border border-dashed text-xs text-neutral-400">Arraste uma tarefa para cá</div>}
      </div>
    </SortableContext>
    <button disabled={props.busy} className="m-2 mt-0 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-200/70 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setTaskOpen(true)}><Plus className="h-4 w-4" />Adicionar tarefa</button>
    <NameDialog open={editOpen} onOpenChange={setEditOpen} title="Renomear coluna" description="Atualize o nome desta etapa." initialName={column.name} pending={props.busy} onSubmit={(name) => props.onUpdateColumn(column, name)} />
    <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} pending={props.busy} onSubmit={(values) => props.onCreateTask(column, values)} />
  </section>
}

function TaskCard({ task, busy, onUpdate, onDelete, onToggle }: { task: Task; busy?: boolean; onUpdate: (task: Task, values: TaskFormValues) => Promise<void>; onDelete: (task: Task) => Promise<void>; onToggle: (task: Task) => Promise<void> }) {
  const [editOpen, setEditOpen] = useState(false)
  const sortable = useSortable({ id: `task:${task.id}`, data: { type: "task", columnId: task.columnId, taskId: task.id }, disabled: busy })
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.isDragging ? undefined : sortable.transition }
  const overdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date()

  return <article ref={sortable.setNodeRef} style={style} className={cn("group rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition-shadow", sortable.isDragging && "opacity-0")}>
    <div className="flex items-start gap-2">
      <Checkbox disabled={busy} checked={task.completed} onCheckedChange={() => void onToggle(task)} aria-label={task.completed ? "Reabrir tarefa" : "Concluir tarefa"} className="mt-0.5" />
      <button disabled={busy} className="min-w-0 flex-1 text-left disabled:cursor-not-allowed" onClick={() => setEditOpen(true)}><h3 className={cn("text-sm font-medium leading-snug", task.completed && "text-neutral-400 line-through")}>{task.name}</h3></button>
      <DropdownMenu><DropdownMenuTrigger asChild><Button disabled={busy} variant="ghost" size="icon" className="-mr-2 -mt-2 h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setEditOpen(true)}><Pencil className="h-4 w-4" />Editar</DropdownMenuItem>
        <ConfirmAction title="Excluir tarefa?" description="Esta ação não poderá ser desfeita." onConfirm={() => onDelete(task)}><DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-red-600"><Trash2 className="h-4 w-4" />Excluir</DropdownMenuItem></ConfirmAction>
      </DropdownMenuContent></DropdownMenu>
      <button disabled={busy} ref={sortable.setActivatorNodeRef} {...sortable.attributes} {...sortable.listeners} className="-mr-1 touch-none cursor-grab rounded p-0.5 text-neutral-300 hover:text-neutral-600 active:cursor-grabbing disabled:cursor-not-allowed" aria-label={`Mover tarefa ${task.name}`}><Grip className="h-4 w-4" /></button>
    </div>
    {(task.tags.length > 0 || task.dueDate) && <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {task.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
      {task.dueDate && <span className={cn("ml-auto inline-flex items-center gap-1 text-xs text-neutral-500", overdue && "font-medium text-red-600")}><CalendarDays className="h-3.5 w-3.5" />{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(task.dueDate))}</span>}
    </div>}
    <TaskDialog open={editOpen} onOpenChange={setEditOpen} task={task} pending={busy} onSubmit={(values) => onUpdate(task, values)} />
  </article>
}

function TaskDragPreview({ task }: { task: Task }) {
  return <div className="w-68 rotate-1 cursor-grabbing rounded-xl border border-neutral-200 bg-white p-3 shadow-2xl">
    <div className="flex items-start gap-2"><Checkbox checked={task.completed} disabled className="mt-0.5" /><h3 className={cn("min-w-0 flex-1 text-sm font-medium leading-snug", task.completed && "text-neutral-400 line-through")}>{task.name}</h3><Grip className="h-4 w-4 text-neutral-400" /></div>
    {task.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{task.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>}
  </div>
}

function ColumnDragPreview({ column }: { column: BoardColumn }) {
  return <div className="w-72 rotate-1 cursor-grabbing rounded-2xl border border-neutral-200 bg-neutral-50 p-3 shadow-2xl">
    <div className="mb-3 flex items-center gap-2"><Grip className="h-4 w-4 text-neutral-400" /><h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{column.name}</h2><span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">{column.tasks.length}</span></div>
    <div className="space-y-2">{column.tasks.slice(0, 3).map((task) => <div key={task.id} className="rounded-xl border border-neutral-200 bg-white p-3 text-sm font-medium shadow-sm">{task.name}</div>)}</div>
  </div>
}

export function EmptyBoard() {
  return <div className="flex flex-1 items-center justify-center p-8"><div className="max-w-sm text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100"><Circle className="h-5 w-5 text-neutral-500" /></div><h2 className="font-semibold">Comece pelo seu fluxo</h2><p className="mt-1 text-sm text-neutral-500">Adicione uma coluna para organizar as primeiras tarefas deste quadro.</p></div></div>
}

export function CompletedIcon() { return <Check className="h-4 w-4" /> }
