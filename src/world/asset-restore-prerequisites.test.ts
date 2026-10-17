import test from 'node:test'
import assert from 'node:assert/strict'
import { assetRestorePrerequisiteStatus } from './asset-restore-prerequisites'

test('does not report restore warnings when no imported assets were saved', () => {
  assert.equal(assetRestorePrerequisiteStatus({savedAssetCount:0,hasCatalog:false,hasWorkspaceResolver:false}),undefined)
})

test('warns when saved models exist but their catalog is missing', () => {
  assert.equal(assetRestorePrerequisiteStatus({savedAssetCount:2,hasCatalog:false,hasWorkspaceResolver:true}), 'Restore warning: 2 saved model(s) reference a missing asset catalog.')
})

test('explains when saved models cannot be restored outside the desktop runtime', () => {
  assert.equal(assetRestorePrerequisiteStatus({savedAssetCount:1,hasCatalog:true,hasWorkspaceResolver:false}), 'Restore unavailable: saved models can only be restored in the installed P.A.W. desktop app.')
})

test('allows restore when catalog and desktop resolver exist', () => {
  assert.equal(assetRestorePrerequisiteStatus({savedAssetCount:1,hasCatalog:true,hasWorkspaceResolver:true}),undefined)
})

test('rejects invalid saved asset counts', () => {
  assert.throws(() => assetRestorePrerequisiteStatus({savedAssetCount:-1,hasCatalog:true,hasWorkspaceResolver:true}), /non-negative integer/)
})
