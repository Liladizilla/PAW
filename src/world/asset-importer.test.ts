import test from 'node:test'
import assert from 'node:assert/strict'
import { importWorkspaceAsset } from './asset-importer'

const asset = { id: 'mesh:station', kind: 'mesh' as const, uri: 'assets/station.glb', format: 'glb', tags: ['building'], importSettings: { scale: 1 } }
test('asset importer validates, resolves and delegates to a format driver', async () => {
  let disposed = 0, loaded = ''
  const imported = await importWorkspaceAsset(asset, async uri => ({ rootUrl: 'paw-workspace://assets/', fileName: uri }), async (location) => { loaded = location.fileName; return { value: { meshCount: 3 }, dispose: () => disposed++ } })
  assert.equal(imported.assetId, asset.id); assert.equal(loaded, asset.uri); assert.deepEqual(imported.value, { meshCount: 3 })
  imported.dispose(); imported.dispose(); assert.equal(disposed, 1)
})
test('asset importer rejects unsafe catalog paths before invoking a driver', async () => {
  await assert.rejects(() => importWorkspaceAsset({ ...asset, uri: '../../secret.glb' }, async uri => ({ rootUrl: '', fileName: uri }), async () => { throw new Error('must not load') }), /asset rejected/)
})
test('asset importer rejects an unsafe resolver result', async () => {
  await assert.rejects(() => importWorkspaceAsset(asset, async () => ({ rootUrl: 'https://evil.example/assets/', fileName: 'station.glb' }), async () => { throw new Error('must not load') }), /unsafe asset location/)
})
