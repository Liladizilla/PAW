import test from 'node:test'
import assert from 'node:assert/strict'
import { isSafeWorkspaceAssetUri } from './asset-path-security'

test('accepts safe workspace-relative model and sidecar asset paths', () => {
  assert.equal(isSafeWorkspaceAssetUri('assets/ab12/model.glb', true), true)
  assert.equal(isSafeWorkspaceAssetUri('assets/model.gltf', true), true)
  assert.equal(isSafeWorkspaceAssetUri('assets/models/texture.webp'), true)
})

test('rejects traversal, absolute paths, backslashes and empty segments', () => {
  for (const uri of [
    '../secret.glb', '/assets/model.glb', 'assets/../secret.glb', 'assets/models/../../secret.glb',
    'assets\\\\secret.glb', 'assets//model.glb', 'assets/./model.glb', 'assets/',
    'assets/%2e%2e/secret.glb', 'assets/model.glb?download=1', 'paw-workspace://assets/model.glb'
  ]) assert.equal(isSafeWorkspaceAssetUri(uri), false, uri)
})

test('model-only paths reject non-model extensions and non-string input', () => {
  assert.equal(isSafeWorkspaceAssetUri('assets/image.png', true), false)
  assert.equal(isSafeWorkspaceAssetUri(null, true), false)
  assert.equal(isSafeWorkspaceAssetUri({ uri: 'assets/model.glb' }, true), false)
})

test('rejects oversized workspace asset URIs before filesystem resolution', () => {
  assert.equal(isSafeWorkspaceAssetUri('assets/' + 'a'.repeat(506) + '.glb', true), false)
})

test('rejects path segments that exceed common filesystem component limits', () => {
  assert.equal(isSafeWorkspaceAssetUri('assets/' + 'a'.repeat(256) + '.glb', true), false)
})


test('only newly imported UUID GLB paths may be discarded', async () => {
  const { isDisposableImportedGlbUri } = await import('./asset-path-security')
  assert.equal(isDisposableImportedGlbUri('assets/123e4567-e89b-12d3-a456-426614174000.glb'), true)
  for (const uri of [
    'assets/model.glb',
    'assets/../123e4567-e89b-12d3-a456-426614174000.glb',
    'assets/123e4567-e89b-12d3-a456-426614174000.gltf',
    '../123e4567-e89b-12d3-a456-426614174000.glb',
    null
  ]) assert.equal(isDisposableImportedGlbUri(uri), false, String(uri))
})
