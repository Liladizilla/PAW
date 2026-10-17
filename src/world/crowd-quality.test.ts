import test from 'node:test'
import assert from 'node:assert/strict'
import { initialCrowdPopulation, nextCrowdPopulation } from './crowd-quality'

test('initial crowd tier uses conservative hardware-thread hints', () => {
  assert.equal(initialCrowdPopulation(2), 420)
  assert.equal(initialCrowdPopulation(4), 720)
  assert.equal(initialCrowdPopulation(8), 1008)
  assert.equal(initialCrowdPopulation(0), 420)
  assert.equal(initialCrowdPopulation(Number.NaN), 420)
})

test('crowd tier scales down on low FPS and never crosses the minimum', () => {
  assert.equal(nextCrowdPopulation(1008, 20), 744)
  assert.equal(nextCrowdPopulation(240, 10), 240)
  assert.equal(nextCrowdPopulation(720, 23.9), 528)
})

test('crowd tier grows only above the recovery threshold and stays bounded', () => {
  assert.equal(nextCrowdPopulation(720, 54), 720)
  assert.equal(nextCrowdPopulation(720, 55), 816)
  assert.equal(nextCrowdPopulation(960, 60), 1008)
  assert.equal(nextCrowdPopulation(1008, 60), 1008)
})

test('crowd tier rejects invalid populations and frame rates', () => {
  assert.throws(() => nextCrowdPopulation(241, 30), /valid tier/)
  assert.throws(() => nextCrowdPopulation(720, Infinity), /finite/)
})
