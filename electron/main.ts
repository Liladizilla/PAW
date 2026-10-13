import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { appendHistoryEvent, loadWorkspace, readHistory, saveWorkspace } from './persistence'
import { clearGroqApiKey, configureGroqApiKey, groqChat, groqProviderStatus } from './providers/groq'
import { decideApproval, listApprovals, requestApproval } from './approvals'
import { createRun, listRuns, resolveRunRecovery, transitionRun } from './runs'
import { executeGraph, ExecutionControl, type GraphExecutionOptions } from '../src/runtime/executor'
import { validateGraph, type GraphDefinition } from '../src/runtime/graph'
import { builtinNodeHandlers } from '../src/runtime/builtins'

const WORKSPACE_ID = 'default'
const activeExecutions = new Map<string, { control: ExecutionControl; workspaceId: string }>()
const SAFE_WORKSPACE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/

function readGraphPayload(raw: unknown): GraphDefinition {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Graph must be an object.')
  const graph = raw as GraphDefinition
  let serialized: string
  try { serialized = JSON.stringify(graph) } catch { throw new Error('Graph must be JSON-serializable.') }
  if (Buffer.byteLength(serialized, 'utf8') > 1_000_000) throw new Error('Graph exceeds the 1 MB payload limit.')
  if (!Array.isArray(graph.nodes) || graph.nodes.length > 1000 || !Array.isArray(graph.edges) || graph.edges.length > 5000) {
    throw new Error('Graph limits are 1,000 nodes and 5,000 edges.')
  }
  return graph
}

async function settleRun(runId: string, workspaceId: string, target: 'succeeded' | 'failed' | 'cancelled', reason?: string) {
  const run = (await listRuns(workspaceId)).find(item => item.id === runId)
  if (!run || run.status === 'succeeded' || run.status === 'failed' || run.status === 'cancelled') return run
  let status = run.status
  if (target === 'cancelled') {
    if (status === 'running' || status === 'paused' || status === 'pause_requested') {
      await transitionRun(runId, 'cancel_requested', reason ?? 'Cancellation requested.')
      status = 'cancel_requested'
    }
    if (status === 'cancel_requested') return transitionRun(runId, 'cancelled', reason)
    return run
  }
  if (status === 'paused') {
    await transitionRun(runId, 'running', 'Execution resumed to settle a completed result.')
    status = 'running'
  } else if (status === 'pause_requested') {
    await transitionRun(runId, 'paused', 'Pause boundary reached while settling result.')
    await transitionRun(runId, 'running', 'Execution resumed to settle a completed result.')
    status = 'running'
  }
  if (status === 'running' || status === 'cancel_requested') {
    return transitionRun(runId, target, reason)
  }
  return run
}

function registerRuntimeIpc() {
  ipcMain.handle('paw:runs:list', (_event, workspaceId: unknown) => listRuns(workspaceId === undefined ? 'default' : String(workspaceId)))
  ipcMain.handle('paw:runs:create', (_event, input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Run input must be an object.')
    const value = input as { graphId?: unknown; workspaceId?: unknown }
    if (typeof value.graphId !== 'string' || (value.workspaceId !== undefined && typeof value.workspaceId !== 'string')) throw new Error('Invalid run input.')
    return createRun({ graphId: value.graphId, workspaceId: value.workspaceId as string | undefined })
  })
  ipcMain.handle('paw:runs:transition', (_event, input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Run transition must be an object.')
    const value = input as { id?: unknown; status?: unknown; reason?: unknown }
    const statuses = ['queued','running','pause_requested','paused','cancel_requested','cancelled','succeeded','failed','needs_recovery']
    if (typeof value.id !== 'string' || typeof value.status !== 'string' || !statuses.includes(value.status) ||
        (value.reason !== undefined && typeof value.reason !== 'string')) throw new Error('Invalid run transition.')
    return transitionRun(value.id, value.status as import('../src/runtime/run-state').RunStatus, value.reason as string | undefined)
  })
  ipcMain.handle('paw:runs:recover', (_event, input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Run recovery must be an object.')
    const value = input as { id?: unknown; resolution?: unknown; note?: unknown }
    if (typeof value.id !== 'string' || (value.resolution !== 'retry' && value.resolution !== 'abandon') ||
        (value.note !== undefined && typeof value.note !== 'string')) throw new Error('Invalid run recovery.')
    return resolveRunRecovery(value.id, value.resolution, value.note as string | undefined)
  })
  ipcMain.handle('paw:approvals:list', (_event, status: unknown) => {
    if (status !== undefined && status !== 'pending' && status !== 'approved' && status !== 'denied') throw new Error('Invalid approval status filter.')
    return listApprovals(status as 'pending' | 'approved' | 'denied' | undefined)
  })
  ipcMain.handle('paw:approvals:request', (_event, input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Approval request must be an object.')
    const value = input as { action?: unknown; summary?: unknown; requestedBy?: unknown }
    if (typeof value.action !== 'string' || typeof value.summary !== 'string' ||
        (value.requestedBy !== undefined && typeof value.requestedBy !== 'string')) throw new Error('Invalid approval request.')
    return requestApproval({ action: value.action, summary: value.summary, requestedBy: value.requestedBy as string | undefined })
  })
  ipcMain.handle('paw:approvals:decide', (_event, input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Approval decision must be an object.')
    const value = input as { id?: unknown; decision?: unknown; note?: unknown }
    if (typeof value.id !== 'string' || (value.decision !== 'approved' && value.decision !== 'denied') ||
        (value.note !== undefined && typeof value.note !== 'string')) throw new Error('Invalid approval decision.')
    return decideApproval(value.id, value.decision, value.note as string | undefined)
  })
  ipcMain.handle('paw:graph:validate', (_event, raw: unknown) => {
    const graph = readGraphPayload(raw)
    const issues = validateGraph(graph)
    return { valid: issues.length === 0, issues }
  })
  ipcMain.handle('paw:graph:execute', async (_event, input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Execution input must be an object.')
    const value = input as { graph?: unknown; workspaceId?: unknown; concurrency?: unknown }
    if (value.workspaceId !== undefined && (typeof value.workspaceId !== 'string' || !SAFE_WORKSPACE_ID.test(value.workspaceId))) throw new Error('Invalid workspace id.')
    const workspaceId = (value.workspaceId as string | undefined) ?? WORKSPACE_ID
    const graph = readGraphPayload(value.graph)
    const issues = validateGraph(graph)
    if (issues.length) throw new Error(issues.map(issue => issue.path + ': ' + issue.message).join(' '))
    const concurrency = value.concurrency === undefined ? 3 : value.concurrency
    if (typeof concurrency !== 'number' || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error('Concurrency must be an integer between 1 and 8.')
    const run = await createRun({ graphId: graph.id, workspaceId })
    await transitionRun(run.id, 'running', 'Validated graph accepted by the local deterministic executor.')
    const control = new ExecutionControl()
    activeExecutions.set(run.id, { control, workspaceId })
    void executeGraph(graph, {
      handlers: builtinNodeHandlers,
      concurrency,
      control,
      onEvent: async event => {
        await appendHistoryEvent(workspaceId, {
          type: 'execution.' + event.type,
          payload: { runId: run.id, ...(event.nodeId ? { nodeId: event.nodeId } : {}), ...(event.message ? { message: event.message } : {}) }
        })
        if (event.type === 'graph.paused') {
          const current = (await listRuns(workspaceId)).find(item => item.id === run.id)
          if (current?.status === 'running') await transitionRun(run.id, 'pause_requested', 'Pause requested by user.')
          const latest = (await listRuns(workspaceId)).find(item => item.id === run.id)
          if (latest?.status === 'pause_requested') await transitionRun(run.id, 'paused', 'Active local node work reached a pause boundary.')
        } else if (event.type === 'graph.resumed') {
          const current = (await listRuns(workspaceId)).find(item => item.id === run.id)
          if (current?.status === 'paused') await transitionRun(run.id, 'running', 'User resumed graph execution.')
        }
      }
    }).then(async result => {
      await settleRun(run.id, workspaceId, result.status, result.error)
      await appendHistoryEvent(workspaceId, { type: 'execution.result', payload: { runId: run.id, status: result.status, completedNodes: result.completedNodeIds.length, ...(result.error ? { error: result.error } : {}) } })
    }).catch(async error => {
      try {
        await settleRun(run.id, workspaceId, 'failed', error instanceof Error ? error.message : 'Unexpected execution failure.')
        await appendHistoryEvent(workspaceId, { type: 'execution.result', payload: { runId: run.id, status: 'failed', error: error instanceof Error ? error.message : 'Unexpected execution failure.' } })
      } catch { /* Preserve the original failure; durable run state remains the source of truth. */ }
    }).finally(() => activeExecutions.delete(run.id))
    return { ...run, status: 'running' as const }
  })
  ipcMain.handle('paw:graph:pause', (_event, id: unknown) => {
    if (typeof id !== 'string') throw new Error('Run id is required.')
    const active = activeExecutions.get(id)
    if (!active) throw new Error('Run is not active.')
    active.control.pause()
    return { requested: true, id }
  })
  ipcMain.handle('paw:graph:resume', (_event, id: unknown) => {
    if (typeof id !== 'string') throw new Error('Run id is required.')
    const active = activeExecutions.get(id)
    if (!active) throw new Error('Run is not active.')
    active.control.resume()
    return { requested: true, id }
  })
  ipcMain.handle('paw:graph:cancel', (_event, id: unknown) => {
    if (typeof id !== 'string') throw new Error('Run id is required.')
    const active = activeExecutions.get(id)
    if (!active) throw new Error('Run is not active.')
    active.control.cancel('Cancelled by user.')
    return { requested: true, id }
  })
  ipcMain.handle('paw:provider:status', () => groqProviderStatus())
  ipcMain.handle('paw:provider:configure-groq', (_event, key: unknown) => {
    if (typeof key !== 'string') throw new Error('API key must be text.')
    return configureGroqApiKey(key)
  })
  ipcMain.handle('paw:provider:clear-groq', () => clearGroqApiKey())
  ipcMain.handle('paw:provider:chat', (_event, input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Chat input must be an object.')
    const value = input as { prompt?: unknown; system?: unknown; model?: unknown }
    if (typeof value.prompt !== 'string' ||
        (value.system !== undefined && typeof value.system !== 'string') ||
        (value.model !== undefined && typeof value.model !== 'string')) throw new Error('Invalid chat input.')
    return groqChat({ prompt: value.prompt, system: value.system as string | undefined, model: value.model as string | undefined })
  })
  ipcMain.handle('paw:runtime-status', async () => ({
    connected: true,
    mode: 'local-guarded-executor',
    executionEnabled: true,
    providerConfigured: (await groqProviderStatus()).configured,
    workspaceId: WORKSPACE_ID
  }))
  ipcMain.handle('paw:workspace:load', () => loadWorkspace(WORKSPACE_ID))
  ipcMain.handle('paw:workspace:save', (_event, data: unknown) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Workspace data must be a JSON object.')
    return saveWorkspace(WORKSPACE_ID, data as Record<string, unknown>)
  })
  ipcMain.handle('paw:history:append', (_event, input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('History event must be an object.')
    const event = input as { type?: unknown; payload?: unknown }
    if (typeof event.type !== 'string') throw new Error('History event type is required.')
    if (event.payload !== undefined && (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload))) {
      throw new Error('History event payload must be an object.')
    }
    return appendHistoryEvent(WORKSPACE_ID, { type: event.type, payload: event.payload as Record<string, unknown> | undefined })
  })
  ipcMain.handle('paw:history:list', (_event, limit: unknown) => readHistory(WORKSPACE_ID, limit === undefined ? 200 : Number(limit)))
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1600, height: 1000, minWidth: 1080, minHeight: 700,
    backgroundColor: '#090b0f', title: 'P.A.W. — Personal Agent Workspace',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
}
app.whenReady().then(() => {
  registerRuntimeIpc()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
