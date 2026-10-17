import test from 'node:test'
import assert from 'node:assert/strict'
import { createImportedAssetLeaseRegistry } from './imported-asset-lease'

const asset = 'assets/123e4567-e89b-12d3-a456-426614174000.glb'

test('only a registered import can be discarded, and the lease is one-use', () => {
  const leases = createImportedAssetLeaseRegistry()
  assert.equal(leases.canDiscard(asset), false)
  assert.throws(() => leases.discard(asset), /not an active/)
  leases.register(asset)
  assert.equal(leases.canDiscard(asset), true)
  leases.discard(asset)
  assert.equal(leases.canDiscard(asset), false)
  assert.equal(leases.pendingCount, 0)
})

test('committing an import removes its discard capability', () => {
  const leases = createImportedAssetLeaseRegistry()
  leases.register(asset)
  leases.commit(asset)
  assert.equal(leases.canDiscard(asset), false)
  assert.throws(() => leases.commit(asset), /cannot be committed/)
})

test('rejects arbitrary paths and duplicate leases', () => {
  const leases = createImportedAssetLeaseRegistry()
  assert.throws(() => leases.register('assets/model.glb'), /UUID-named/)
  leases.register(asset)
  assert.throws(() => leases.register(asset), /already has/)
})
