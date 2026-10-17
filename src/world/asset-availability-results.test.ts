import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAssetAvailabilityResults } from './asset-availability-results'

test('accepts only availability results for requested assets', () => {
  assert.deepEqual(normalizeAssetAvailabilityResults([
    { uri: 'assets/a.glb', available: true },
    { uri: 'assets/other.glb', available: false },
    { uri: 'assets/b.glb', available: false, reason: 'missing' }
  ], ['assets/a.glb', 'assets/b.glb']), [
    { uri: 'assets/a.glb', available: true },
    { uri: 'assets/b.glb', available: false, reason: 'missing' }
  ])
})

test('ignores malformed records and duplicate URIs', () => {
  assert.deepEqual(normalizeAssetAvailabilityResults([
    null,
    { uri: 'assets/a.glb', available: 'yes' },
    { uri: 'assets/a.glb', available: true },
    { uri: 'assets/a.glb', available: false, reason: 'duplicate' },
    { uri: 3, available: true }
  ], ['assets/a.glb']), [{ uri: 'assets/a.glb', available: true }])
})

test('bounds untrusted reason text and safely handles a non-array response', () => {
  const reason = 'x'.repeat(500)
  assert.equal(normalizeAssetAvailabilityResults([{ uri: 'assets/a.glb', available: false, reason }], ['assets/a.glb'])[0].reason?.length, 160)
  assert.deepEqual(normalizeAssetAvailabilityResults({ error: 'bad IPC response' }, ['assets/a.glb']), [])
})
