export type PerformanceCounters = {
  meshes: number
  materials: number
  loadedChunks: number
  activePedestrians: number
}

export type PerformanceSnapshot = PerformanceCounters & {
  samples: number
  averageFps: number
  p95FrameMs: number
  latestFrameMs: number
}

/** Bounded renderer telemetry. It records measurements, never synthetic benchmark values. */
export class PerformanceMonitor {
  private readonly frameTimes: number[] = []
  private nextIndex = 0
  private count = 0
  private latestFrameMs = 0
  private counters: PerformanceCounters = { meshes: 0, materials: 0, loadedChunks: 0, activePedestrians: 0 }

  constructor(private readonly capacity = 120) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('capacity must be a positive integer')
  }

  record(frameMs: number, counters: PerformanceCounters): void {
    if (!Number.isFinite(frameMs) || frameMs < 0) throw new Error('frameMs must be finite and non-negative')
    for (const [name, value] of Object.entries(counters)) {
      if (!Number.isFinite(value) || value < 0) throw new Error(name + ' must be finite and non-negative')
    }
    this.latestFrameMs = frameMs
    this.frameTimes[this.nextIndex] = frameMs
    this.nextIndex = (this.nextIndex + 1) % this.capacity
    this.count = Math.min(this.capacity, this.count + 1)
    this.counters = { ...counters }
  }

  snapshot(): PerformanceSnapshot {
    const times = this.frameTimes.slice(0, this.count).sort((a, b) => a - b)
    const averageFrameMs = times.length ? times.reduce((sum, value) => sum + value, 0) / times.length : 0
    const p95Index = times.length ? Math.min(times.length - 1, Math.ceil(times.length * 0.95) - 1) : 0
    return {
      ...this.counters,
      samples: this.count,
      averageFps: averageFrameMs > 0 ? 1000 / averageFrameMs : 0,
      p95FrameMs: times[p95Index] ?? 0,
      latestFrameMs: this.latestFrameMs
    }
  }
}
