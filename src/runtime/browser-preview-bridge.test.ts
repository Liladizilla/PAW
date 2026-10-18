import assert from 'node:assert/strict'
import test from 'node:test'
import { installBrowserPreviewBridge } from './browser-preview-bridge'

test('browser preview installs a read-only bridge instead of crashing renderer startup', async () => {
  const target = {} as Window
  installBrowserPreviewBridge(target)
  assert.equal(target.paw.platform, 'browser-preview')
  assert.equal((await target.paw.runtimeStatus()).executionEnabled, false)
  assert.equal((await target.paw.providerStatus()).configured, false)
  assert.deepEqual(await target.paw.listApprovals('pending'), [])
  assert.deepEqual(await target.paw.listHistory(12), [])
  assert.equal(target.paw.desktopSmokeReady, undefined)
})

test('browser preview never grants privileged actions', async () => {
  const target = {} as Window
  installBrowserPreviewBridge(target)
  await assert.rejects(target.paw.executeGraph({ graph: {}, workspaceId: 'preview' }), /requires the installed P\.A\.W\. Electron desktop app/)
  await assert.rejects(target.paw.configureGroq('not-a-real-key'), /requires the installed P\.A\.W\. Electron desktop app/)
})

test('an existing Electron preload bridge is never replaced', () => {
  const target = { paw: { platform: 'linux' } } as unknown as Window
  const existing = target.paw
  installBrowserPreviewBridge(target)
  assert.equal(target.paw, existing)
})
