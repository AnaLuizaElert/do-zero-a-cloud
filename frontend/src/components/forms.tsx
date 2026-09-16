import { useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import type { Task } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

const nameSchema = z.object({ name: z.string().trim().min(1, "Informe um nome").max(120, "Use no máximo 120 caracteres") })
type NameValues = z.infer<typeof nameSchema>

interface NameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  initialName?: string
  submitLabel?: string
  pending?: boolean
  onSubmit: (name: string) => Promise<void> | void
}

export function NameDialog({ open, onOpenChange, title, description, initialName = "", submitLabel = "Salvar", pending, onSubmit }: NameDialogProps) {
  const submittingRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const isPending = Boolean(pending || submitting)
  const form = useForm<NameValues>({ resolver: zodResolver(nameSchema), defaultValues: { name: initialName } })
  useEffect(() => { if (open) form.reset({ name: initialName }) }, [open, initialName, form])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) onOpenChange(nextOpen)
  }

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <form className="space-y-5" aria-busy={isPending} onSubmit={form.handleSubmit(async ({ name }) => {
        if (submittingRef.current || pending) return
        submittingRef.current = true
        setSubmitting(true)
        try {
          await onSubmit(name.trim())
          onOpenChange(false)
        } catch {
          // A camada que executa a requisição já apresenta a mensagem de erro.
        } finally {
          submittingRef.current = false
          setSubmitting(false)
        }
      })}>
        <div className="space-y-2"><Label htmlFor="resource-name">Nome</Label><Input id="resource-name" autoFocus disabled={isPending} {...form.register("name")} /><p className="text-xs text-red-600">{form.formState.errors.name?.message}</p></div>
        <DialogFooter><Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="h-4 w-4 animate-spin" />}{isPending ? "Salvando…" : submitLabel}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

const taskSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(120, "Use no máximo 120 caracteres"),
  dueDate: z.string(),
  tags: z.string().refine((value) => value.split(",").every((tag) => tag.trim().length <= 40), "Cada tag deve ter no máximo 40 caracteres"),
})
type TaskValues = z.infer<typeof taskSchema>

export interface TaskFormValues { name: string; dueDate: string | null; tags: string[] }

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task
  pending?: boolean
  onSubmit: (values: TaskFormValues) => Promise<void> | void
}

export function TaskDialog({ open, onOpenChange, task, pending, onSubmit }: TaskDialogProps) {
  const submittingRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const isPending = Boolean(pending || submitting)
  const form = useForm<TaskValues>({ resolver: zodResolver(taskSchema), defaultValues: { name: "", dueDate: "", tags: "" } })
  useEffect(() => {
    if (open) form.reset({ name: task?.name ?? "", dueDate: task?.dueDate?.slice(0, 10) ?? "", tags: task?.tags.join(", ") ?? "" })
  }, [open, task, form])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) onOpenChange(nextOpen)
  }

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle><DialogDescription>Organize o trabalho com prazo e tags opcionais.</DialogDescription></DialogHeader>
      <form className="space-y-4" aria-busy={isPending} onSubmit={form.handleSubmit(async (values) => {
        if (submittingRef.current || pending) return
        submittingRef.current = true
        setSubmitting(true)
        const tags = [...new Set(values.tags.split(",").map((tag) => tag.trim()).filter(Boolean))]
        const dueDate = values.dueDate ? new Date(`${values.dueDate}T23:59:59.999`).toISOString() : null
        try {
          await onSubmit({ name: values.name.trim(), dueDate, tags })
          onOpenChange(false)
        } catch {
          // A camada que executa a requisição já apresenta a mensagem de erro.
        } finally {
          submittingRef.current = false
          setSubmitting(false)
        }
      })}>
        <div className="space-y-2"><Label htmlFor="task-name">Nome</Label><Input id="task-name" autoFocus disabled={isPending} {...form.register("name")} /><p className="text-xs text-red-600">{form.formState.errors.name?.message}</p></div>
        <div className="space-y-2"><Label htmlFor="task-due">Prazo</Label><Input id="task-due" type="date" disabled={isPending} {...form.register("dueDate")} /></div>
        <div className="space-y-2"><Label htmlFor="task-tags">Tags</Label><Input id="task-tags" placeholder="backend, urgente, revisão" disabled={isPending} {...form.register("tags")} /><p className="text-xs text-neutral-500">Separe as tags com vírgulas.</p><p className="text-xs text-red-600">{form.formState.errors.tags?.message}</p></div>
        <DialogFooter><Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="h-4 w-4 animate-spin" />}{isPending ? "Salvando…" : "Salvar tarefa"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

interface ConfirmProps { title: string; description: string; onConfirm: () => Promise<void> | void; children: React.ReactNode }
export function ConfirmAction({ title, description, onConfirm, children }: ConfirmProps) {
  const [open, setOpen] = useState(false)
  const confirmingRef = useRef(false)
  const [confirming, setConfirming] = useState(false)
  return <AlertDialog open={open} onOpenChange={(nextOpen) => !confirming && setOpen(nextOpen)}>
    <span onClick={() => setOpen(true)}>{children}</span>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel disabled={confirming}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={confirming} onClick={async (event) => {
        event.preventDefault()
        if (confirmingRef.current) return
        confirmingRef.current = true
        setConfirming(true)
        try {
          await onConfirm()
          setOpen(false)
        } catch {
          // A camada que executa a requisição já apresenta a mensagem de erro.
        } finally {
          confirmingRef.current = false
          setConfirming(false)
        }
      }}>{confirming && <Loader2 className="h-4 w-4 animate-spin" />}{confirming ? "Excluindo…" : "Excluir"}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
