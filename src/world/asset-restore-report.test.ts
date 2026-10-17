import test from 'node:test'
import assert from 'node:assert/strict'
import { formatAssetRestoreReport } from './asset-restore-report'

test('reports actual successful restores, not planned restore count', () => {
  assert.equal(formatAssetRestoreReport({restoredEntityIds:['a'],missingCatalog:[],missingFiles:[],failures:[]}), 'Restored 1 saved model(s).')
})

test('reports load failures even when another model restores', () => {
  assert.equal(formatAssetRestoreReport({restoredEntityIds:['a'],missingCatalog:[],missingFiles:[],failures:[{entityId:'b',reason:'invalid GLB'}]}), 'Restored 1 model(s); warnings: b: invalid GLB')
})

test('reports unavailable files and catalog references', () => {
  assert.equal(formatAssetRestoreReport({restoredEntityIds:[],missingCatalog:['entity-x → gone'],missingFiles:['assets/missing.glb'],failures:[]}), 'Restore warning: missing catalog record: entity-x → gone; missing file: assets/missing.glb')
})

test('bounds visible detail and reports total issue count', () => {
  const report = formatAssetRestoreReport({restoredEntityIds:[],missingCatalog:['a','b'],missingFiles:['c'],failures:[{entityId:'d',reason:'load failed'}]})
  assert.equal(report, 'Restore warning: missing catalog record: a; missing catalog record: b; missing file: c… (4 issues total)')
})

test('returns no status when there are no saved models and no failures', () => {
  assert.equal(formatAssetRestoreReport({restoredEntityIds:[],missingCatalog:[],missingFiles:[],failures:[]}), undefined)
})
