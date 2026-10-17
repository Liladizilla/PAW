import test from 'node:test'
import assert from 'node:assert/strict'
import { PerformanceMonitor } from './performance-monitor'

const counters = { meshes: 120, materials: 18, loadedChunks: 9, activePedestrians: 720 }

test('performance monitor reports measured rolling frame-time and scene counters', () => {
  const monitor = new PerformanceMonitor(4)
  monitor.record(10, counters)
  monitor.record(20, { ...counters, meshes: 130 })
  const snapshot = monitor.snapshot()
  assert.equal(snapshot.samples, 2)
  assert.equal(snapshot.averageFps, 1000 / 15)
  assert.equal(snapshot.p95FrameMs, 20)
  assert.equal(snapshot.latestFrameMs, 20)
  assert.equal(snapshot.meshes, 130)
  assert.equal(snapshot.activePedestrians, 720)
})

test('performance monitor bounds its history to configured capacity', () => {
  const monitor = new PerformanceMonitor(3)
  monitor.record(10, counters)
  monitor.record(20, counters)
  monitor.record(30, counters)
  monitor.record(40, counters)
  const snapshot = monitor.snapshot()
  assert.equal(snapshot.samples, 3)
  assert.equal(snapshot.p95FrameMs, 40)
  assert.equal(snapshot.averageFps, 1000 / 30)
})

test('performance monitor rejects invalid capacities and measurements', () => {
  assert.throws(() => new PerformanceMonitor(0))
  const monitor = new PerformanceMonitor()
  assert.throws(() => monitor.record(-1, counters))
  assert.throws(() => monitor.record(16, { ...counters, meshes: Number.NaN }))
})
