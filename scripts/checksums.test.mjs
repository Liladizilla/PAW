import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const writer = new URL('./write-checksums.mjs', import.meta.url)
const verifier = new URL('./verify-checksums.mjs', import.meta.url)

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'paw-checksums-'))
  t.after(async () => rm(directory, { recursive: true, force: true }))
  await writeFile(join(directory, 'P.A.W.-0.1.0-linux-x64.AppImage'), 'fake app image bytes')
  await writeFile(join(directory, 'P.A.W.-0.1.0-linux-x64.deb'), 'fake deb bytes')
  return directory
}

test('checksum writer and verifier accept a complete artifact set', async t => {
  const directory = await fixture(t)
  execFileSync(process.execPath, [writer.pathname, directory])
  execFileSync(process.execPath, [verifier.pathname, directory])
  const manifest = await readFile(join(directory, 'SHA256SUMS.txt'), 'utf8')
  assert.match(manifest, /P\.A\.W\.-0\.1\.0-linux-x64\.AppImage/)
  assert.match(manifest, /P\.A\.W\.-0\.1\.0-linux-x64\.deb/)
})

test('checksum verifier rejects an artifact modified after manifest creation', async t => {
  const directory = await fixture(t)
  execFileSync(process.execPath, [writer.pathname, directory])
  await writeFile(join(directory, 'P.A.W.-0.1.0-linux-x64.deb'), 'modified bytes')
  assert.throws(() => execFileSync(process.execPath, [verifier.pathname, directory]))
})

test('checksum verifier rejects files missing from the manifest', async t => {
  const directory = await fixture(t)
  execFileSync(process.execPath, [writer.pathname, directory])
  await writeFile(join(directory, 'unlisted-installer.bin'), 'unlisted')
  assert.throws(() => execFileSync(process.execPath, [verifier.pathname, directory]))
})
