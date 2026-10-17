import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PERFORMANCE_BUDGET, evaluatePerformanceBudget } from './performance-budget'

test('performance budget accepts a sample within every declared bound', () => {
  assert.deepEqual(evaluatePerformanceBudget({fps:48,p95FrameMs:22,meshes:1800,materials:500,loadedChunks:9,activePedestrians:720}), [])
})
test('performance budget reports each exceeded bound with measured values', () => {
  assert.deepEqual(evaluatePerformanceBudget({fps:19,p95FrameMs:58,meshes:2601,materials:901,loadedChunks:26,activePedestrians:1200}), [
    {metric:'fps',actual:19,limit:DEFAULT_PERFORMANCE_BUDGET.minimumFps,direction:'minimum'},
    {metric:'p95FrameMs',actual:58,limit:DEFAULT_PERFORMANCE_BUDGET.maximumP95FrameMs,direction:'maximum'},
    {metric:'meshes',actual:2601,limit:2500,direction:'maximum'},
    {metric:'materials',actual:901,limit:900,direction:'maximum'},
    {metric:'loadedChunks',actual:26,limit:25,direction:'maximum'},
    {metric:'activePedestrians',actual:1200,limit:1008,direction:'maximum'}
  ])
})
test('performance budget rejects non-finite and negative measurements', () => {
 const violations=evaluatePerformanceBudget({fps:NaN,p95FrameMs:Infinity,meshes:-1,materials:0,loadedChunks:0,activePedestrians:0})
 assert.deepEqual(violations.map(v=>v.metric),['fps','p95FrameMs','meshes'])
})
