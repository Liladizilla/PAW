import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const electron = require('electron')
const entry = resolve('out/main/index.js')
if (!existsSync(entry)) {
  process.stderr.write('Desktop smoke test requires a successful build (missing out/main/index.js).\n')
  process.exit(2)
}
const command = process.platform === 'linux' ? 'xvfb-run' : electron
// CI has no physical GPU. Force Chromium's software renderer and verify that
// Electron can compile shaders and render a real WebGL frame.
const electronArgs = [
  '--no-sandbox',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  entry
]
const args = process.platform === 'linux'
  ? ['-a', 'env', 'PAW_DESKTOP_SMOKE=1', electron, ...electronArgs]
  : electronArgs
const result = spawnSync(command, args, {
  encoding: 'utf8',
  timeout: 60000,
  maxBuffer: 4 * 1024 * 1024,
  env: { ...process.env, PAW_DESKTOP_SMOKE: '1', ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' }
})
if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)
if (result.error) {
  process.stderr.write('Desktop smoke test failed: ' + result.error.message + '\n')
  process.exit(1)
}
if (result.signal || result.status !== 0) {
  process.stderr.write('Desktop smoke test failed (status=' + result.status + ', signal=' + result.signal + ').\n')
  process.exit(1)
}
if (!result.stdout?.includes('PAW_DESKTOP_SMOKE_RENDERER_READY')) {
  process.stderr.write('Desktop smoke test exited without the renderer-ready marker.\n')
  process.exit(1)
}
process.stdout.write('Desktop smoke test passed: Electron renderer and WebGL frame rendered successfully.\n')
