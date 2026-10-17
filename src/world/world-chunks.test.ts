import test from 'node:test'
import assert from 'node:assert/strict'
import {chunksAround,validateChunkManifest,worldToChunk} from './world-chunks'
test('world coordinates map across negative and positive chunk boundaries',()=>{assert.deepEqual(worldToChunk({x:0,z:0},128),{x:0,z:0});assert.deepEqual(worldToChunk({x:-.01,z:-128},128),{x:-1,z:-1});assert.deepEqual(worldToChunk({x:128,z:127.99},128),{x:1,z:0})})
test('streaming ring is deterministic, complete and nearest-first',()=>{const a=chunksAround({x:4,z:-3},128,2);assert.deepEqual(a,chunksAround({x:4,z:-3},128,2));assert.equal(a.length,25);assert.equal(a[0].id,'chunk:0:0');assert.ok(a.every(c=>c.maxX-c.minX===128&&c.maxZ-c.minZ===128))})
test('chunk manifests reject invalid config',()=>{assert.equal(validateChunkManifest({schemaVersion:1,worldId:'city',chunkSize:128,seed:42,revision:0}),true);assert.equal(validateChunkManifest({schemaVersion:1,worldId:' ',chunkSize:8,seed:42,revision:-1}),false)})