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

function verify(platform, directory) {
  return execFileSync(process.execPath, [verifier.pathname, platform, directory], { encoding: 'utf8' })
}

test('release artifact verifier accepts the complete Linux installer set', async t => {
  const directory = await fixture(t, [
    'P.A.W.-0.1.0-linux-x64.AppImage',
    'P.A.W.-0.1.0-linux-x64.deb'
  ])
  assert.match(verify('linux', directory), /Verified linux release artifacts/)
})

test('release artifact verifier accepts Windows and macOS package sets', async t => {
  const windows = await fixture(t, ['P.A.W.-0.1.0-win-x64.exe'])
  assert.match(verify('win', windows), /Verified win release artifacts/)

  const mac = await fixture(t, [
    'P.A.W.-0.1.0-mac-x64.dmg',
    'P.A.W.-0.1.0-mac-x64.zip'
  ])
  assert.match(verify('mac', mac), /Verified mac release artifacts/)
})

test('release artifact verifier rejects a missing required package format', async t => {
  const directory = await fixture(t, ['P.A.W.-0.1.0-linux-x64.AppImage'])
  assert.throws(() => verify('linux', directory))
})

test('release artifact verifier rejects an unexpected version or platform filename', async t => {
  const directory = await fixture(t, [
    'P.A.W.-0.1.0-linux-x64.AppImage',
    'P.A.W.-0.1.0-linux-x64.deb',
    'P.A.W.-0.2.0-linux-x64.extra'
  ])
  assert.throws(() => verify('linux', directory))
})

test('release artifact verifier rejects unsupported architectures', async t => {
  const directory = await fixture(t, [
    'P.A.W.-0.1.0-linux-ia32.AppImage',
    'P.A.W.-0.1.0-linux-ia32.deb'
  ])
  assert.throws(() => verify('linux', directory))
})

test('release artifact verifier rejects empty installer files', async t => {
  const directory = await fixture(t, [
    'P.A.W.-0.1.0-linux-x64.AppImage',
    'P.A.W.-0.1.0-linux-x64.deb'
  ])
  await writeFile(join(directory, 'P.A.W.-0.1.0-linux-x64.deb'), '')
  assert.throws(() => verify('linux', directory))
})

test('release artifact verifier rejects unknown platforms', async t => {
  const directory = await fixture(t, ['P.A.W.-0.1.0-linux-x64.AppImage'])
  assert.throws(() => verify('freebsd', directory))
})
