export type RuntimePerformanceSample = {
  fps: number
  p95FrameMs: number
  meshes: number
  materials: number
  loadedChunks: number
  activePedestrians: number
}
export type PerformanceBudget = {
  minimumFps: number
  maximumP95FrameMs: number
  maximumMeshes: number
  maximumMaterials: number
  maximumLoadedChunks: number
  maximumActivePedestrians: number
}
export type BudgetViolation = { metric: keyof RuntimePerformanceSample; actual: number; limit: number; direction: 'minimum'|'maximum' }

export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  minimumFps: 30,
  maximumP95FrameMs: 33.4,
  maximumMeshes: 2500,
  maximumMaterials: 900,
  maximumLoadedChunks: 25,
  maximumActivePedestrians: 1008
}

/** Evaluates measured samples only. Passing this contract is not a substitute for hardware profiling. */
export function evaluatePerformanceBudget(sample: RuntimePerformanceSample, budget: PerformanceBudget = DEFAULT_PERFORMANCE_BUDGET): BudgetViolation[] {
  const violations: BudgetViolation[] = []
  const checks: Array<[keyof RuntimePerformanceSample, number, number, 'minimum'|'maximum']> = [
    ['fps', sample.fps, budget.minimumFps, 'minimum'],
    ['p95FrameMs', sample.p95FrameMs, budget.maximumP95FrameMs, 'maximum'],
    ['meshes', sample.meshes, budget.maximumMeshes, 'maximum'],
    ['materials', sample.materials, budget.maximumMaterials, 'maximum'],
    ['loadedChunks', sample.loadedChunks, budget.maximumLoadedChunks, 'maximum'],
    ['activePedestrians', sample.activePedestrians, budget.maximumActivePedestrians, 'maximum']
  ]
  for (const [metric, actual, limit, direction] of checks) {
    if (!Number.isFinite(actual) || actual < 0 || (direction === 'minimum' ? actual < limit : actual > limit)) {
      violations.push({ metric, actual, limit, direction })
    }
  }
  return violations
}
