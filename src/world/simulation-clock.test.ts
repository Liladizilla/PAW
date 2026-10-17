import test from 'node:test'
import assert from 'node:assert/strict'
import {FixedStepClock} from './simulation-clock'
test('clock runs fixed steps and retains interpolation remainder',()=>{const c=new FixedStepClock(1/60,.1,5),steps:number[]=[];const r=c.advance(.05,dt=>steps.push(dt));assert.equal(steps.length,3);assert.ok(steps.every(dt=>Math.abs(dt-1/60)<1e-12));assert.ok(r.alpha>=0&&r.alpha<1)})
test('clock bounds catch-up and accounts for dropped time',()=>{const c=new FixedStepClock(1/60,.1,3);let n=0;const r=c.advance(1,()=>n++);assert.equal(n,3);assert.ok(r.droppedSeconds>.9);assert.ok(r.alpha>=0&&r.alpha<1)})
test('clock rejects invalid deltas and resets',()=>{const c=new FixedStepClock();assert.throws(()=>c.advance(-1,()=>{}));c.advance(.05,()=>{});c.reset();assert.equal(c.droppedSeconds,0)})