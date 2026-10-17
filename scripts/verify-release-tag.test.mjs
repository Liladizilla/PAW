import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const metadata = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const script = resolve(root, 'scripts/verify-release-tag.mjs')

test('accepts a tag that exactly matches package metadata', () => {
  const output = execFileSync(process.execPath, [script, 'v' + metadata.version], { encoding: 'utf8' })
  assert.match(output, /Release tag matches package version/)
})

test('rejects a tag that would publish mismatched installer versions', () => {
  assert.throws(() => execFileSync(process.execPath, [script, 'v' + metadata.version + '-wrong'], { encoding: 'utf8' }))
})

test('rejects missing or malformed version tags', () => {
  assert.throws(() => execFileSync(process.execPath, [script, 'latest'], { encoding: 'utf8' }))
})
