import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const verifier = new URL('./verify-release-artifacts.mjs', import.meta.url)
async function fixture(t, files) { const directory = await mkdtemp(join(tmpdir(), 'paw-release-artifacts-')); t.after(async () => rm(directory, { recursive: true, force: true })); for (const name of files) await writeFile(join(directory, name), 'fake installer bytes'); return directory }
function verify(platform, directory) { return execFileSync(process.execPath, [verifier.pathname, platform, directory], { encoding: 'utf8' }) }

test('accepts actual Linux release filenames and ignores builder metadata', async t => {
 const directory = await fixture(t, ['P.A.W-0.1.2.AppImage','paw-personal-agent-workspace_0.1.2_amd64.deb','P.A.W-0.1.2.AppImage.blockmap','builder-debug.yml'])
 assert.match(verify('linux', directory), /Verified linux release artifacts/)
})
test('accepts actual Windows and macOS release filenames and ignores auxiliary files', async t => {
 const windows = await fixture(t, ['P.A.W.Setup.0.1.2.exe','P.A.W.Setup.0.1.2.exe.blockmap','P.A.W.Setup.0.1.2.__uninstaller.exe','builder-debug.yml'])
 assert.match(verify('win', windows), /Verified win release artifacts/)
 const mac = await fixture(t, ['P.A.W-0.1.2-arm64.dmg','P.A.W-0.1.2-arm64-mac.zip','P.A.W-0.1.2-arm64.dmg.blockmap','P.A.W-0.1.2-arm64-mac.zip.blockmap'])
 assert.match(verify('mac', mac), /Verified mac release artifacts/)
})
test('rejects a missing required package format', async t => { const directory = await fixture(t, ['P.A.W-0.1.2.AppImage']); assert.throws(() => verify('linux', directory)) })
test('rejects an unexpected version or platform filename', async t => { const directory = await fixture(t, ['P.A.W-0.1.2.AppImage','paw-personal-agent-workspace_0.1.2_amd64.deb','paw-personal-agent-workspace_0.2.0_amd64.deb']); assert.throws(() => verify('linux', directory)) })
test('rejects unsupported architectures', async t => { const directory = await fixture(t, ['P.A.W-0.1.2-ia32.AppImage','paw-personal-agent-workspace_0.1.2_ia32.deb']); assert.throws(() => verify('linux', directory)) })
test('rejects empty installer files', async t => { const directory = await fixture(t, ['P.A.W-0.1.2.AppImage','paw-personal-agent-workspace_0.1.2_amd64.deb']); await writeFile(join(directory, 'paw-personal-agent-workspace_0.1.2_amd64.deb'), ''); assert.throws(() => verify('linux', directory)) })
test('rejects unknown platforms', async t => { const directory = await fixture(t, ['P.A.W-0.1.2.AppImage']); assert.throws(() => verify('freebsd', directory)) })
