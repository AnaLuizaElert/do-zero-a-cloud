import { useMemo, useState } from "react"
import { AlertTriangle, Check, ChevronRight, CircleDashed, Clock3, FlaskConical, LoaderCircle, Play, RotateCcw, Server, SkipForward, X } from "lucide-react"
import { API_ORIGIN, API_URL } from "@/lib/api"
import { AUDIT_SUITE_META, emptyAuditSuite, runAuditSuite, type AuditStepResult, type AuditSuiteId, type AuditSuiteResult } from "@/lib/api-audit"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const suiteIds: AuditSuiteId[] = ["board", "column", "task"]

interface ApiAuditProps {
  onFinished: () => Promise<void> | void
}

export function ApiAudit({ onFinished }: ApiAuditProps) {
  const [suites, setSuites] = useState<Record<AuditSuiteId, AuditSuiteResult>>(() => ({
    board: emptyAuditSuite("board"),
    column: emptyAuditSuite("column"),
    task: emptyAuditSuite("task"),
  }))
  const [running, setRunning] = useState(false)
  const unlocked = {
    board: true,
    column: suites.board.status === "passed",
    task: suites.column.status === "passed",
  }

  const counts = useMemo(() => {
    const steps = suiteIds.flatMap((id) => suites[id].steps)
    return {
      passed: steps.filter((step) => step.status === "passed").length,
      failed: steps.filter((step) => step.status === "failed").length,
      skipped: steps.filter((step) => step.status === "skipped").length,
      residuals: suiteIds.reduce((total, id) => total + suites[id].residuals.length, 0),
    }
  }, [suites])

  const updateSuite = (id: AuditSuiteId, result: AuditSuiteResult) => {
    setSuites((current) => ({ ...current, [id]: result }))
  }

  const executeOne = async (id: AuditSuiteId) => {
    if (running) return
    setRunning(true)
    setSuites((current) => ({ ...current, [id]: emptyAuditSuite(id) }))
    try {
      await runAuditSuite(id, (result) => updateSuite(id, result))
    } finally {
      try { await onFinished() } finally { setRunning(false) }
    }
  }

  const executeAll = async () => {
    if (running) return
    setRunning(true)
    setSuites({ board: emptyAuditSuite("board"), column: emptyAuditSuite("column"), task: emptyAuditSuite("task") })
    try {
      for (const id of suiteIds) {
        const result = await runAuditSuite(id, (result) => updateSuite(id, result))
        if (result.status !== "passed") break
      }
    } finally {
      try { await onFinished() } finally { setRunning(false) }
    }
  }

  const hasResults = counts.passed + counts.failed + counts.skipped > 0

  return <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white"><FlaskConical className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h2 className="font-semibold">Contrato da API Kanban</h2>
              <p className="mt-1 max-w-2xl text-sm text-neutral-500">Siga os checkpoints em ordem. A auditoria prepara dados temporários, valida apenas o exercício atual e remove o quadro de apoio ao final.</p>
              <div className="mt-3 flex min-w-0 items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                <Server className="h-3.5 w-3.5 shrink-0" />
                <span className="shrink-0 font-medium text-neutral-700">API testada:</span>
                <code className="truncate">{API_ORIGIN ? API_URL : "VITE_API_URL não configurada"}</code>
              </div>
            </div>
          </div>
          <Button onClick={() => void executeAll()} disabled={running} className="shrink-0">
            {running ? <LoaderCircle className="h-4 w-4 animate-spin" /> : hasResults ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? "Executando…" : hasResults ? "Executar tudo novamente" : "Executar tudo"}
          </Button>
        </div>
        <div className="grid grid-cols-2 border-t border-neutral-200 bg-neutral-50/60 md:grid-cols-4">
          <SummaryValue label="Aprovadas" value={counts.passed} tone="success" />
          <SummaryValue label="Falhas" value={counts.failed} tone="danger" />
          <SummaryValue label="Ignoradas" value={counts.skipped} tone="muted" />
          <SummaryValue label="Possíveis resíduos" value={counts.residuals} tone={counts.residuals ? "warning" : "muted"} />
        </div>
      </section>

      {!API_ORIGIN && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div><p className="font-medium">API não configurada para produção</p><p className="mt-0.5 text-amber-800">Defina <code>VITE_API_URL</code> e gere um novo build antes de executar a auditoria.</p></div>
      </div>}

      <div className="space-y-4">
        {suiteIds.map((id) => <SuiteCard key={id} suite={suites[id]} disabled={running} locked={!unlocked[id]} onExecute={() => executeOne(id)} />)}
      </div>
    </div>
  </div>
}

function SummaryValue({ label, value, tone }: { label: string; value: number; tone: "success" | "danger" | "warning" | "muted" }) {
  return <div className="border-neutral-200 px-4 py-3 even:border-l md:border-l md:first:border-l-0">
    <p className={cn("text-xl font-semibold", tone === "success" && "text-emerald-700", tone === "danger" && "text-red-700", tone === "warning" && "text-amber-700")}>{value}</p>
    <p className="text-xs text-neutral-500">{label}</p>
  </div>
}

function SuiteCard({ suite, disabled, locked, onExecute }: { suite: AuditSuiteResult; disabled: boolean; locked: boolean; onExecute: () => Promise<void> }) {
  const passed = suite.steps.filter((step) => step.status === "passed").length
  const failed = suite.steps.filter((step) => step.status === "failed").length
  const isRunning = suite.status === "running"

  return <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
    <header className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <SuiteStatusIcon status={suite.status} />
        <div>
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{AUDIT_SUITE_META[suite.id].label}</h3><SuiteStatusBadge suite={suite} /></div>
          <p className="mt-1 text-sm text-neutral-500">{AUDIT_SUITE_META[suite.id].description}</p>
          {locked && <p className="mt-2 text-xs text-amber-700">Conclua o checkpoint anterior para liberar esta etapa.</p>}
          {suite.steps.length > 0 && <p className="mt-2 text-xs text-neutral-400">{passed} aprovadas · {failed} falhas · {suite.steps.length} etapas</p>}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => void onExecute()} disabled={disabled || locked} className="shrink-0">
        {isRunning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : suite.status === "idle" ? <Play className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
        {locked ? "Bloqueado" : isRunning ? "Executando…" : suite.status === "idle" ? "Executar" : "Executar novamente"}
      </Button>
    </header>

    {suite.steps.length > 0 && <div className="border-t border-neutral-200">
      {suite.steps.map((step) => <StepRow key={step.id} step={step} />)}
    </div>}

    {suite.residuals.length > 0 && <div className="border-t border-amber-200 bg-amber-50 p-4">
      <div className="flex gap-3 text-sm text-amber-950">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0"><p className="font-medium">A limpeza não pôde ser confirmada</p>
          <ul className="mt-2 space-y-1 text-xs text-amber-800">
            {suite.residuals.map((residual, index) => <li key={`${residual.kind}-${index}`} className="break-words"><strong className="font-semibold capitalize">{residual.kind}:</strong> {residual.name}{residual.id ? ` (${residual.id})` : ""}. {residual.reason}</li>)}
          </ul>
        </div>
      </div>
    </div>}
  </section>
}

function StepRow({ step }: { step: AuditStepResult }) {
  return <details className="group border-b border-neutral-100 last:border-b-0">
    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-neutral-50 md:px-5 [&::-webkit-details-marker]:hidden">
      <StepStatusIcon status={step.status} />
      <span className={cn("w-14 shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[10px] font-bold", methodTone(step.method))}>{step.method}</span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-medium">{step.label}</span>{step.phase !== "test" && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500">{step.phase === "setup" ? "preparação" : "limpeza"}</span>}</div>
        <code className="block truncate text-xs text-neutral-400">{step.path}</code>
      </div>
      {step.httpStatus !== undefined && <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", step.httpStatus === 200 || step.httpStatus === 404 && step.phase === "cleanup" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{step.httpStatus}</span>}
      {step.durationMs !== undefined && <span className="hidden items-center gap-1 text-xs text-neutral-400 sm:flex"><Clock3 className="h-3 w-3" />{step.durationMs} ms</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-90" />
    </summary>
    <div className="grid gap-4 bg-neutral-50/70 px-4 pb-4 pt-2 text-xs md:grid-cols-2 md:px-12">
      <Detail label="Esperado" value={step.expected} />
      <Detail label="Diagnóstico" value={step.diagnostic ?? "Aguardando execução."} tone={step.status === "failed" ? "danger" : undefined} />
      {step.payload !== undefined && <JsonDetail label="Payload enviado" value={step.payload} />}
      {step.response !== undefined && <JsonDetail label="Resposta recebida" value={step.response} />}
    </div>
  </details>
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return <div><p className="mb-1 font-medium uppercase tracking-wide text-neutral-400">{label}</p><p className={cn("break-words leading-relaxed text-neutral-700", tone === "danger" && "text-red-700")}>{value}</p></div>
}

function JsonDetail({ label, value }: { label: string; value: unknown }) {
  const rendered = typeof value === "string" ? value : JSON.stringify(value, null, 2)
  return <div className="min-w-0"><p className="mb-1 font-medium uppercase tracking-wide text-neutral-400">{label}</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-neutral-200 bg-white p-3 font-mono leading-relaxed text-neutral-700">{rendered}</pre></div>
}

function SuiteStatusIcon({ status }: { status: AuditSuiteResult["status"] }) {
  return <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", status === "passed" && "bg-emerald-50 text-emerald-700", status === "failed" && "bg-red-50 text-red-700", status === "running" && "bg-blue-50 text-blue-700", status === "idle" && "bg-neutral-100 text-neutral-400")}>
    {status === "passed" ? <Check className="h-4 w-4" /> : status === "failed" ? <X className="h-4 w-4" /> : status === "running" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleDashed className="h-4 w-4" />}
  </div>
}

function SuiteStatusBadge({ suite }: { suite: AuditSuiteResult }) {
  const labels = { idle: "Não executada", running: "Em execução", passed: "Aprovada", failed: "Com falhas" }
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", suite.status === "passed" && "bg-emerald-50 text-emerald-700", suite.status === "failed" && "bg-red-50 text-red-700", suite.status === "running" && "bg-blue-50 text-blue-700", suite.status === "idle" && "bg-neutral-100 text-neutral-500")}>{labels[suite.status]}</span>
}

function StepStatusIcon({ status }: { status: AuditStepResult["status"] }) {
  if (status === "passed") return <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-3 w-3" /></span>
  if (status === "failed") return <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700"><X className="h-3 w-3" /></span>
  if (status === "skipped") return <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"><SkipForward className="h-3 w-3" /></span>
  if (status === "running") return <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-blue-600" />
  return <CircleDashed className="h-5 w-5 shrink-0 text-neutral-300" />
}

function methodTone(method: AuditStepResult["method"]) {
  if (method === "GET") return "bg-blue-50 text-blue-700"
  if (method === "POST") return "bg-emerald-50 text-emerald-700"
  if (method === "PUT") return "bg-amber-50 text-amber-700"
  return "bg-red-50 text-red-700"
}
