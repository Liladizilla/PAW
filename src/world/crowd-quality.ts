export const MAX_CROWD_POPULATION = 1008
export const MIN_CROWD_POPULATION = 240
export const CROWD_POPULATION_STEP = 24

/** Conservative starting tier; hardware thread count is only a hint, not a benchmark. */
export function initialCrowdPopulation(hardwareThreads: number): number {
  if (!Number.isFinite(hardwareThreads) || hardwareThreads < 1) return 420
  return hardwareThreads >= 8 ? MAX_CROWD_POPULATION : hardwareThreads >= 4 ? 720 : 420
}

/** Selects a bounded next tier from measured renderer FPS. Caller owns sampling/cooldown. */
export function nextCrowdPopulation(current: number, fps: number): number {
  if (!Number.isInteger(current) || current < MIN_CROWD_POPULATION || current > MAX_CROWD_POPULATION || current % CROWD_POPULATION_STEP !== 0) {
    throw new Error('current crowd population must be a valid tier from 240 to 1008 in steps of 24')
  }
  if (!Number.isFinite(fps) || fps < 0) throw new Error('fps must be finite and non-negative')
  if (fps < 24 && current > MIN_CROWD_POPULATION) {
    return Math.max(MIN_CROWD_POPULATION, Math.floor(current * 0.75 / CROWD_POPULATION_STEP) * CROWD_POPULATION_STEP)
  }
  if (fps > 54 && current < MAX_CROWD_POPULATION) return Math.min(MAX_CROWD_POPULATION, current + 96)
  return current
}
