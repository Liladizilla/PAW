import test from 'node:test'
import assert from 'node:assert/strict'
import { describeUnavailableAssets } from './asset-restore-availability'

test('groups multiple saved entities that reference the same unavailable asset', () => {
  assert.deepEqual(describeUnavailableAssets([
    { uri: 'assets/shared.glb', available: false, reason: 'missing' },
    { uri: 'assets/ok.glb', available: true }
  ], [
    { entityId: 'model-a', uri: 'assets/shared.glb' },
    { entityId: 'model-b', uri: 'assets/shared.glb' },
    { entityId: 'model-a', uri: 'assets/shared.glb' },
    { entityId: 'model-c', uri: 'assets/ok.glb' }
  ]), ['model-a, model-b → assets/shared.glb (missing)'])
})

test('does not report availability records unrelated to saved entities', () => {
  assert.deepEqual(describeUnavailableAssets([
    { uri: 'assets/unrelated.glb', available: false, reason: 'outside workspace' }
  ], [{ entityId: 'model-a', uri: 'assets/expected.glb' }]), [])
})

test('deduplicates repeated availability records and ignores blank candidates', () => {
  assert.deepEqual(describeUnavailableAssets([
    { uri: 'assets/a.glb', available: false },
    { uri: 'assets/a.glb', available: false, reason: 'duplicate' }
  ], [
    { entityId: 'model-a', uri: 'assets/a.glb' },
    { entityId: ' ', uri: 'assets/a.glb' }
  ]), ['model-a → assets/a.glb (missing)'])
})
