import test from 'node:test'
import assert from 'node:assert/strict'
import { chunksAround } from './world-chunks'
import { renderFocusFromWorld, worldFocusFromRender } from './chunk-focus'

test('chunk selection stays invariant when renderer focus is rebased', () => {
  const worldFocus = { x: 3021.25, y: 0, z: -2170.5 }
  const oldOrigin = { x: 0, y: 0, z: 0 }
  const newOrigin = { x: 3008, y: 0, z: -2176 }
  const oldRenderFocus = renderFocusFromWorld(worldFocus, oldOrigin)
  const newRenderFocus = renderFocusFromWorld(worldFocus, newOrigin)
  assert.deepEqual(worldFocusFromRender(oldRenderFocus, oldOrigin), worldFocus)
  assert.deepEqual(worldFocusFromRender(newRenderFocus, newOrigin), worldFocus)
  const oldIds = chunksAround(worldFocusFromRender(oldRenderFocus, oldOrigin), 64, 2).map(chunk => chunk.id)
  const newIds = chunksAround(worldFocusFromRender(newRenderFocus, newOrigin), 64, 2).map(chunk => chunk.id)
  assert.deepEqual(newIds, oldIds)
})

test('chunk focus conversion rejects non-finite renderer coordinates and origins', () => {
  assert.throws(() => worldFocusFromRender({ x: Infinity, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }), /finite/)
  assert.throws(() => renderFocusFromWorld({ x: 0, y: 0, z: 0 }, { x: 0, y: NaN, z: 0 }), /finite/)
})
