import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const verifier = new URL('./verify-release-artifacts.mjs', import.meta.url)
const packageMetadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const version = packageMetadata.version
const linuxAppImage = 'P.A.W-' + version + '.AppImage'
const linuxDeb = 'paw-personal-agent-workspace_' + version + '_amd64.deb'
const linuxRpm = 'P.A.W.-' + version + '.x86_64.rpm'
const windowsInstaller = 'P.A.W.Setup.' + version + '.exe'
const macDmg = 'P.A.W-' + version + '-arm64.dmg'
const macZip = 'P.A.W-' + version + '-arm64-mac.zip'

async function fixture(t, files) {
  const directory = await mkdtemp(join(tmpdir(), 'paw-release-artifacts-'))
  t.after(async () => rm(directory, { recursive: true, force: true }))
  for (const name of files) await writeFile(join(directory, name), 'fake installer bytes')
  return directory
}
function verify(platform, directory) {
  return execFileSync(process.execPath, [verifier.pathname, platform, directory], { encoding: 'utf8' })
}

test('accepts actual Linux release filenames and ignores builder metadata', async t => {
  const directory = await fixture(t, [linuxAppImage, linuxDeb, linuxRpm, linuxAppImage + '.blockmap', 'builder-debug.yml'])
  assert.match(verify('linux', directory), /Verified linux release artifacts/)
})
test('accepts actual Windows and macOS release filenames and ignores auxiliary files', async t => {
  const windows = await fixture(t, [windowsInstaller, windowsInstaller + '.blockmap', 'P.A.W.Setup.' + version + '.__uninstaller.exe', 'builder-debug.yml'])
  assert.match(verify('win', windows), /Verified win release artifacts/)
  const mac = await fixture(t, [macDmg, macZip, macDmg + '.blockmap', macZip + '.blockmap'])
  assert.match(verify('mac', mac), /Verified mac release artifacts/)
})
test('rejects a missing required package format', async t => {
  const directory = await fixture(t, [linuxAppImage])
  assert.throws(() => verify('linux', directory))
})
test('rejects an unexpected version or platform filename', async t => {
  const directory = await fixture(t, [linuxAppImage, linuxDeb, linuxRpm, 'paw-personal-agent-workspace_0.2.0_amd64.deb'])
  assert.throws(() => verify('linux', directory))
})
test('rejects unsupported architectures', async t => {
  const directory = await fixture(t, ['P.A.W-' + version + '-ia32.AppImage', 'paw-personal-agent-workspace_' + version + '_ia32.deb', 'P.A.W.-' + version + '.ia32.rpm'])
  assert.throws(() => verify('linux', directory))
})
test('rejects empty installer files', async t => {
  const directory = await fixture(t, [linuxAppImage, linuxDeb, linuxRpm])
  await writeFile(join(directory, linuxDeb), '')
  assert.throws(() => verify('linux', directory))
})
test('rejects unknown platforms', async t => {
  const directory = await fixture(t, [linuxAppImage])
  assert.throws(() => verify('freebsd', directory))
})
