import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('packaged renderer uses relative asset URLs for file protocol loading', async () => {
  const config = await readFile(new URL('../electron.vite.config.ts', import.meta.url), 'utf8')
  assert.match(config, /renderer:\s*\{[\s\S]*?base:\s*['"]\.\/['"]/,
    'renderer base must stay relative because packaged Electron loads renderer/index.html via file://')
})
