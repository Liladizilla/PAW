import test from 'node:test'
import assert from 'node:assert/strict'
import { isTrustedRendererUrl } from '../../electron/renderer-security'

const production = {
  packaged: true,
  expectedFileUrl: 'file:///opt/paw/out/renderer/index.html'
}

test('packaged renderer accepts only the exact local app entry point', () => {
  assert.equal(isTrustedRendererUrl('file:///opt/paw/out/renderer/index.html', production), true)
  assert.equal(isTrustedRendererUrl('file:///opt/paw/out/renderer/other.html', production), false)
  assert.equal(isTrustedRendererUrl('https://attacker.example/index.html', production), false)
})

test('development renderer is restricted to the configured origin and entry path', () => {
  const config = { packaged: false, expectedFileUrl: production.expectedFileUrl, developmentUrl: 'http://localhost:5173/' }
  assert.equal(isTrustedRendererUrl('http://localhost:5173/', config), true)
  assert.equal(isTrustedRendererUrl('http://localhost:5173/index.html', config), false)
  assert.equal(isTrustedRendererUrl('http://localhost:5174/', config), false)
  assert.equal(isTrustedRendererUrl('https://localhost:5173/', config), false)
})

test('renderer trust rejects credentials, malformed URLs and absent development configuration', () => {
  const config = { packaged: false, expectedFileUrl: production.expectedFileUrl, developmentUrl: 'http://localhost:5173/' }
  assert.equal(isTrustedRendererUrl('http://user:pass@localhost:5173/', config), false)
  assert.equal(isTrustedRendererUrl('not a URL', config), false)
  assert.equal(isTrustedRendererUrl('http://localhost:5173/', { packaged: false, expectedFileUrl: production.expectedFileUrl }), false)
})

test('packaged renderer rejects file URL path and query variations', () => {
  assert.equal(isTrustedRendererUrl('file:///opt/paw/out/renderer/index.html?x=1', production), false)
  assert.equal(isTrustedRendererUrl('file:///opt/paw/out/renderer/../renderer/index.html', production), false)
})
