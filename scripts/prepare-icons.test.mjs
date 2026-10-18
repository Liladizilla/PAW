import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

test('generated icon source is a valid PNG and is shared by all platform icon formats', async () => {
  const encoded = (await readFile(resolve('assets/paw-icon.png.base64'), 'utf8')).trim()
  const png = Buffer.from(encoded, 'base64')
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.ok(png.length > 1000)
  const pkg = JSON.parse(await readFile(resolve('package.json'), 'utf8'))
  assert.equal(pkg.build.linux.icon, 'build/icons/paw-icon.png')
  assert.equal(pkg.build.win.icon, 'build/icons/paw-icon.ico')
  assert.equal(pkg.build.mac.icon, 'build/icons/paw-icon.icns')
})
