import test from 'node:test'
import assert from 'node:assert/strict'
import { commitAssetImportPersistence, type AssetImportPersistenceStorage } from './asset-import-persistence'

class MemoryStorage implements AssetImportPersistenceStorage {
  values = new Map<string, string>()
  failSnapshotWrite = false
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) {
    if (key === 'paw.scene.snapshot.v2' && this.failSnapshotWrite) {
      this.failSnapshotWrite = false
      this.values.set(key, value)
      throw new Error('simulated snapshot quota failure')
    }
    this.values.set(key, value)
  }
  removeItem(key: string) { this.values.delete(key) }
}

test('asset import persistence writes catalog before saving the scene snapshot', () => {
  const storage = new MemoryStorage()
  const order: string[] = []
  commitAssetImportPersistence(storage, {
    catalogKey: 'paw.asset.catalog.v1',
    catalogValue: '{"revision":1}',
    snapshotKey: 'paw.scene.snapshot.v2',
    persistSnapshot: () => {
      order.push('snapshot')
      storage.setItem('paw.scene.snapshot.v2', '{"entities":["asset"]}')
    }
  })
  assert.deepEqual(order, ['snapshot'])
  assert.equal(storage.getItem('paw.asset.catalog.v1'), '{"revision":1}')
  assert.equal(storage.getItem('paw.scene.snapshot.v2'), '{"entities":["asset"]}')
})

test('asset import persistence restores both previous keys when snapshot save fails', () => {
  const storage = new MemoryStorage()
  storage.setItem('paw.asset.catalog.v1', '{"revision":4}')
  storage.setItem('paw.scene.snapshot.v2', '{"entities":["old"]}')
  storage.failSnapshotWrite = true
  assert.throws(() => commitAssetImportPersistence(storage, {
    catalogKey: 'paw.asset.catalog.v1',
    catalogValue: '{"revision":5}',
    snapshotKey: 'paw.scene.snapshot.v2',
    persistSnapshot: () => storage.setItem('paw.scene.snapshot.v2', '{"entities":["new"]}')
  }), /simulated snapshot quota failure/)
  assert.equal(storage.getItem('paw.asset.catalog.v1'), '{"revision":4}')
  assert.equal(storage.getItem('paw.scene.snapshot.v2'), '{"entities":["old"]}')
})

test('asset import persistence removes keys that did not exist before a failed commit', () => {
  const storage = new MemoryStorage()
  assert.throws(() => commitAssetImportPersistence(storage, {
    catalogKey: 'paw.asset.catalog.v1',
    catalogValue: '{"revision":1}',
    snapshotKey: 'paw.scene.snapshot.v2',
    persistSnapshot: () => { throw new Error('snapshot write failed') }
  }), /snapshot write failed/)
  assert.equal(storage.getItem('paw.asset.catalog.v1'), null)
  assert.equal(storage.getItem('paw.scene.snapshot.v2'), null)
})

test('asset import persistence reports incomplete rollback instead of hiding it', () => {
  const storage = new MemoryStorage()
  storage.setItem('paw.asset.catalog.v1', '{"revision":4}')
  const originalSetItem = storage.setItem.bind(storage)
  storage.setItem = (key: string, value: string) => {
    if (key === 'paw.asset.catalog.v1' && value === '{"revision":4}') throw new Error('rollback write blocked')
    originalSetItem(key, value)
  }
  assert.throws(() => commitAssetImportPersistence(storage, {
    catalogKey: 'paw.asset.catalog.v1',
    catalogValue: '{"revision":5}',
    snapshotKey: 'paw.scene.snapshot.v2',
    persistSnapshot: () => { throw new Error('snapshot write failed') }
  }), /rollback was incomplete: paw.asset.catalog.v1: rollback write blocked/)
})
