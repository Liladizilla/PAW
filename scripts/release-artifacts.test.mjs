import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const verifier = new URL('./verify-release-artifacts.mjs', import.meta.url)

async function fixture(t, files) {
  const directory = await mkdtemp(join(tmpdir(), 'paw-release-artifacts-'))
  t.after(async () => rm(directory, { recursive: true, force: true }))
  for (const name of files) await writeFile(join(directory, name), 'fake installer bytes')
  return directory
}

test('release artifact verifier accepts the complete Linux installer set', async t => {
  const directory = await fixture(t, [
    'P.A.W.-0.1.0-linux-x64.AppImage',
    'P.A.W.-0.1.0-linux-x64.deb'
  ])
  execFileSync(process.execPath, [verifier.pathname, 'linux', directory])
})

test('release artifact verifier rejects a missing required package format', async t => {
  const directory = await fixture(t, ['P.A.W.-0.1.0-linux-x64.AppImage'])
  assert.throws(() => execFileSync(process.execPath, [verifier.pathname, 'linux', directory]))
})

test('release artifact verifier rejects an unexpected version or platform filename', async t => {
  const directory = await fixture(t, [
    'P.A.W.-0.1.0-linux-x64.AppImage',
    'P.A.W.-0.1.0-linux-x64.deb',
    'P.A.W.-0.2.0-linux-x64.extra'
  ])
  assert.throws(() => execFileSync(process.execPath, [verifier.pathname, 'linux', directory]))
})

test('release artifact verifier rejects empty installer files', async t => {
  const directory = await fixture(t, [
    'P.A.W.-0.1.0-linux-x64.AppImage',
    'P.A.W.-0.1.0-linux-x64.deb'
  ])
  await writeFile(join(directory, 'P.A.W.-0.1.0-linux-x64.deb'), '')
  assert.throws(() => execFileSync(process.execPath, [verifier.pathname, 'linux', directory]))
})
