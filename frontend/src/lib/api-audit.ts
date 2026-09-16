import { API_ORIGIN, API_URL } from "@/lib/api"

export type AuditSuiteId = "board" | "column" | "task"
export type AuditSuiteStatus = "idle" | "running" | "passed" | "failed"
export type AuditStepStatus = "pending" | "running" | "passed" | "failed" | "skipped"
export type AuditStepPhase = "setup" | "test" | "cleanup"
export type AuditMethod = "GET" | "POST" | "PUT" | "DELETE"

export interface AuditStepResult {
  id: string
  label: string
  phase: AuditStepPhase
  method: AuditMethod
  path: string
  status: AuditStepStatus
  expected: string
  payload?: unknown
  response?: unknown
  httpStatus?: number
  durationMs?: number
  diagnostic?: string
}

export interface AuditResidual {
  kind: "quadro" | "coluna" | "tarefa"
  name: string
  id?: string
  reason: string
}

export interface AuditSuiteResult {
  id: AuditSuiteId
  label: string
  description: string
  status: AuditSuiteStatus
  steps: AuditStepResult[]
  residuals: AuditResidual[]
}

export interface AuditRunOptions {
  fetchImpl?: typeof fetch
  timeoutMs?: number
  runId?: string
}

interface RawResponse {
  status: number
  durationMs: number
  body: unknown
  bodyText: string
  validJson: boolean
}

interface StepDefinition {
  id: string
  label: string
  phase: AuditStepPhase
  method: AuditMethod
  path: string
  expected: string
  payload?: unknown
  validate: (body: unknown) => string | null
}

interface Execution {
  raw?: RawResponse
  passed: boolean
}

interface BoardFixture {
  name: string
  id?: string
  created: boolean
  deleted: boolean
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const AUDIT_SUITE_META: Record<AuditSuiteId, Pick<AuditSuiteResult, "label" | "description">> = {
  board: { label: "1. Quadros — Controller", description: "Valida a listagem de quadros; a auditoria prepara e remove o dado de apoio." },
  column: { label: "2. Colunas — Controller e Service", description: "Valida a criação e a listagem de colunas para um quadro temporário." },
  task: { label: "3. Tarefas — Fluxo vertical", description: "Valida criação, listagem e atualização de tarefas." },
}

export function emptyAuditSuite(id: AuditSuiteId): AuditSuiteResult {
  return { id, ...AUDIT_SUITE_META[id], status: "idle", steps: [], residuals: [] }
}

export async function runAuditSuite(
  suiteId: AuditSuiteId,
  onUpdate: (suite: AuditSuiteResult) => void,
  options: AuditRunOptions = {},
): Promise<AuditSuiteResult> {
  const suite: AuditSuiteResult = { ...emptyAuditSuite(suiteId), status: "running" }
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? 10_000
  const runId = (options.runId ?? globalThis.crypto?.randomUUID?.() ?? String(Date.now())).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)
  let index = 0
  const emit = () => onUpdate({ ...suite, steps: suite.steps.map((step) => ({ ...step })), residuals: suite.residuals.map((residual) => ({ ...residual })) })

  const execute = async (definition: StepDefinition): Promise<Execution> => {
    const step: AuditStepResult = {
      id: `${suiteId}-${index++}-${definition.id}`,
      label: definition.label,
      phase: definition.phase,
      method: definition.method,
      path: definition.path,
      status: "running",
      expected: definition.expected,
      payload: definition.payload,
    }
    suite.steps.push(step)
    emit()

    try {
      const raw = await request(fetchImpl, timeoutMs, definition.method, definition.path, definition.payload)
      step.httpStatus = raw.status
      step.durationMs = raw.durationMs
      step.response = raw.validJson ? raw.body : raw.bodyText
      if (raw.status !== 200) {
        step.status = "failed"
        step.diagnostic = diagnoseStatus(raw.status)
      } else if (!raw.validJson) {
        step.status = "failed"
        step.diagnostic = "A API respondeu sem JSON válido."
      } else {
        const mismatch = definition.validate(raw.body)
        step.status = mismatch ? "failed" : "passed"
        step.diagnostic = mismatch ? `Contrato divergente: ${mismatch}` : "Resposta de acordo com o contrato."
      }
      emit()
      return { raw, passed: step.status === "passed" }
    } catch (error) {
      step.status = "failed"
      step.diagnostic = diagnoseTransport(error, timeoutMs)
      emit()
      return { passed: false }
    }
  }

  const skip = (definition: Omit<StepDefinition, "validate">, reason: string) => {
    suite.steps.push({ ...definition, id: `${suiteId}-${index++}-${definition.id}`, status: "skipped", diagnostic: reason })
    emit()
  }

  emit()
  if (suiteId === "board") await runBoard(runId, suite, execute, skip)
  if (suiteId === "column") await runColumn(runId, suite, execute, skip)
  if (suiteId === "task") await runTask(runId, suite, execute, skip)

  suite.status = suite.steps.some((step) => step.status === "failed" || step.status === "skipped") || suite.residuals.length > 0 ? "failed" : "passed"
  emit()
  return { ...suite, steps: suite.steps.map((step) => ({ ...step })), residuals: suite.residuals.map((residual) => ({ ...residual })) }
}

async function runBoard(runId: string, suite: AuditSuiteResult, execute: Execute, skip: Skip) {
  const board = await prepareBoard(runId, suite, execute)
  try {
    if (!board.id) {
      skip(step("list-board", "Listar quadro preparado", "GET", "/board", "200 e lista contendo o quadro temporário"), "O quadro de apoio não foi criado com um UUID utilizável.")
      return
    }
    await execute({
      ...step("list-board", "Listar quadro preparado", "GET", "/board", "200 e lista contendo o quadro temporário"),
      validate: (body) => listContains(body, board.id, (item) => validateBoard(item, board.name, board.id)),
    })
  } finally {
    await cleanupBoard(board, suite, execute)
  }
}

async function runColumn(runId: string, suite: AuditSuiteResult, execute: Execute, skip: Skip) {
  const board = await prepareBoard(runId, suite, execute)
  try {
    if (!board.id) {
      skip(step("create-column", "Criar coluna", "POST", "/column", "200 e coluna vinculada ao quadro"), "O quadro de apoio não foi criado com um UUID utilizável.")
      skip(step("list-column", "Listar coluna criada", "GET", "/column/from/{boardId}", "200 e lista contendo a coluna"), "A criação da coluna depende do quadro de apoio.")
      return
    }
    const name = `[AUDIT ${runId}] Coluna`
    const created = await execute({
      ...step("create-column", "Criar coluna", "POST", "/column", "200 e coluna vinculada ao quadro", { name, position: 0, boardId: board.id }),
      validate: (body) => validateColumn(body, name, 0, board.id!),
    })
    const id = readId(created.raw?.body)
    await execute({
      ...step("list-column", "Listar coluna criada", "GET", `/column/from/${board.id}`, "200 e lista contendo a coluna"),
      validate: (body) => listContains(body, id, (item) => validateColumn(item, name, 0, board.id!)),
    })
  } finally {
    await cleanupBoard(board, suite, execute)
  }
}

async function runTask(runId: string, suite: AuditSuiteResult, execute: Execute, skip: Skip) {
  const board = await prepareBoard(runId, suite, execute)
  try {
    if (!board.id) {
      skipTaskSteps(skip, "O quadro de apoio não foi criado com um UUID utilizável.")
      return
    }
    const columnName = `[AUDIT ${runId}] Coluna`
    const column = await execute({
      ...step("setup-column", "Preparar coluna temporária", "POST", "/column", "200 e coluna temporária válida", { name: columnName, position: 0, boardId: board.id }),
      validate: (body) => validateColumn(body, columnName, 0, board.id!),
    })
    const columnId = readId(column.raw?.body)
    if (!columnId) {
      skipTaskSteps(skip, "A coluna de apoio não foi criada com um UUID utilizável.")
      return
    }

    const createdAt = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString()
    const dueDate = new Date(Date.parse(createdAt) + 86_400_000).toISOString()
    const updatedDueDate = new Date(Date.parse(createdAt) + 172_800_000).toISOString()
    const name = `[AUDIT ${runId}] Tarefa`
    const payload = { name, position: 0, createdAt, dueDate, completed: false, tags: ["auditoria"], columnId }
    const created = await execute({
      ...step("create-task", "Criar tarefa", "POST", `/task/from/${columnId}`, "200 e tarefa com os campos enviados", payload),
      validate: (body) => validateTask(body, payload),
    })
    const taskId = readId(created.raw?.body)
    await execute({
      ...step("list-task", "Listar tarefa criada", "GET", `/task/from/${columnId}`, "200 e lista contendo a tarefa"),
      validate: (body) => listContains(body, taskId, (item) => validateTask(item, payload)),
    })
    if (!taskId) {
      skip(step("update-task", "Atualizar tarefa", "PUT", "/task/{taskId}", "200 e tarefa atualizada"), "A criação não retornou um UUID utilizável.")
      return
    }
    const updatePayload = { ...payload, name: `[AUDIT ${runId}] Tarefa atualizada`, dueDate: updatedDueDate, completed: true, tags: ["auditoria", "atualizada"] }
    await execute({
      ...step("update-task", "Atualizar tarefa", "PUT", `/task/${taskId}`, "200 e tarefa atualizada", updatePayload),
      validate: (body) => validateTask(body, updatePayload, taskId),
    })
  } finally {
    await cleanupBoard(board, suite, execute)
  }
}

async function prepareBoard(runId: string, suite: AuditSuiteResult, execute: Execute): Promise<BoardFixture> {
  const board: BoardFixture = { name: `[AUDIT ${runId}] Quadro`, created: true, deleted: false }
  const created = await execute({
    ...step("setup-board", "Preparar quadro temporário", "POST", "/board", "200 e quadro temporário válido", { name: board.name }),
    validate: (body) => validateBoard(body, board.name),
  })
  board.id = readId(created.raw?.body)
  if (!board.id && created.passed) suite.residuals.push({ kind: "quadro", name: board.name, reason: "A criação foi aceita, mas não retornou um UUID para limpeza." })
  return board
}

async function cleanupBoard(board: BoardFixture, suite: AuditSuiteResult, execute: Execute) {
  if (!board.id || board.deleted) return
  const deleted = await execute({
    ...step("cleanup-board", "Limpar quadro temporário", "DELETE", `/board/${board.id}`, "200 e { status: \"ok\" }"),
    phase: "cleanup",
    validate: (body) => isRecord(body) && body.status === "ok" ? null : "esperava o JSON { status: \"ok\" }",
  })
  board.deleted = deleted.passed
  if (!board.deleted) suite.residuals.push({ kind: "quadro", name: board.name, id: board.id, reason: "Não foi possível confirmar a limpeza; o quadro pode conter os dados auxiliares." })
}

type Execute = (definition: StepDefinition) => Promise<Execution>
type Skip = (definition: Omit<StepDefinition, "validate">, reason: string) => void

function step(id: string, label: string, method: AuditMethod, path: string, expected: string, payload?: unknown): Omit<StepDefinition, "validate"> {
  return { id, label, phase: "test", method, path, expected, payload }
}

function skipTaskSteps(skip: Skip, reason: string) {
  skip(step("create-task", "Criar tarefa", "POST", "/task/from/{columnId}", "200 e tarefa válida"), reason)
  skip(step("list-task", "Listar tarefa criada", "GET", "/task/from/{columnId}", "200 e lista contendo a tarefa"), reason)
  skip(step("update-task", "Atualizar tarefa", "PUT", "/task/{taskId}", "200 e tarefa atualizada"), reason)
}

function validateBoard(body: unknown, name: string, id?: string) {
  if (!isRecord(body)) return "a resposta não é um objeto"
  if (body.name !== name) return `esperava name = ${JSON.stringify(name)}`
  return validateId(body.id, id)
}

function validateColumn(body: unknown, name: string, position: number, boardId: string) {
  if (!isRecord(body)) return "a resposta não é um objeto"
  if (body.name !== name || body.position !== position || body.boardId !== boardId) return "nome, posição ou quadro não correspondem ao payload"
  return validateId(body.id)
}

function validateTask(body: unknown, expected: Record<string, unknown>, id?: string) {
  if (!isRecord(body)) return "a resposta não é um objeto"
  const idError = validateId(body.id, id)
  if (idError) return idError
  for (const key of ["name", "position", "completed", "columnId"] as const) if (body[key] !== expected[key]) return `esperava ${key} = ${JSON.stringify(expected[key])}`
  if (!Array.isArray(body.tags) || JSON.stringify(body.tags) !== JSON.stringify(expected.tags)) return "as tags não correspondem ao payload"
  if (typeof body.createdAt !== "string" || typeof body.dueDate !== "string") return "createdAt e dueDate devem ser datas em texto"
  return null
}

function listContains(body: unknown, id: string | undefined, validate: (item: unknown) => string | null) {
  if (!Array.isArray(body)) return "a resposta da listagem não é um array"
  const item = id ? body.find((candidate) => isRecord(candidate) && candidate.id === id) : body.find((candidate) => validate(candidate) === null)
  return item ? validate(item) : "a lista não contém o recurso criado"
}

function validateId(value: unknown, expected?: string) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) return "o campo id não contém um UUID válido"
  return expected && value !== expected ? `esperava id = ${expected}` : null
}

function readId(body: unknown) {
  return isRecord(body) && typeof body.id === "string" ? body.id : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function request(fetchImpl: typeof fetch, timeoutMs: number, method: AuditMethod, path: string, payload?: unknown): Promise<RawResponse> {
  if (!API_ORIGIN) throw new Error("not-configured")
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = performance.now()
  try {
    const response = await fetchImpl(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: payload === undefined ? undefined : { "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    })
    const bodyText = await response.text()
    try {
      return { status: response.status, durationMs: Math.round(performance.now() - startedAt), body: JSON.parse(bodyText), bodyText, validJson: true }
    } catch {
      return { status: response.status, durationMs: Math.round(performance.now() - startedAt), body: undefined, bodyText, validJson: false }
    }
  } finally {
    clearTimeout(timer)
  }
}

function diagnoseStatus(status: number) {
  if (status === 404) return "Rota ou recurso não encontrado. Confira o mapeamento e o prefixo /api/v1."
  if (status === 400) return "A API rejeitou o payload. Confira tipos, validações e campos obrigatórios."
  if (status >= 500) return "O backend falhou. Confira o log da aplicação e a implementação atual."
  return `A API respondeu com status ${status}; era esperado 200.`
}

function diagnoseTransport(error: unknown, timeoutMs: number) {
  if (error instanceof DOMException && error.name === "AbortError") return `A API não respondeu em ${Math.round(timeoutMs / 1000)} segundos.`
  if (error instanceof TypeError) return "Não foi possível conectar à API. Confira URL, backend e CORS."
  return `Falha inesperada: ${error instanceof Error ? error.message : "erro desconhecido"}`
}
