import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { basename, join, resolve, sep } from 'node:path'

const directory = resolve(process.argv[2] ?? 'release')
const manifestPath = join(directory, 'SHA256SUMS.txt')
const manifest = await readFile(manifestPath, 'utf8')
const rows = manifest.split(/\r?\n/).filter(Boolean)
if (rows.length === 0) throw new Error('Checksum manifest is empty')

const expected = new Map()
for (const row of rows) {
  const match = /^([a-f0-9]{64})  (.+)$/.exec(row)
  if (!match) throw new Error('Invalid checksum manifest row: ' + row)
  const [, digest, name] = match
  if (name !== basename(name) || name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
    throw new Error('Unsafe artifact name in checksum manifest: ' + name)
  }
  if (expected.has(name)) throw new Error('Duplicate artifact in checksum manifest: ' + name)
  expected.set(name, digest)
}

const actualNames = (await readdir(directory, { withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name !== 'SHA256SUMS.txt')
  .map(entry => entry.name)
  .sort()
const expectedNames = [...expected.keys()].sort()
if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
  throw new Error('Checksum manifest does not match release artifacts. Expected: ' + expectedNames.join(', ') + '; found: ' + actualNames.join(', '))
}

for (const name of expectedNames) {
  const actual = createHash('sha256').update(await readFile(join(directory, name))).digest('hex')
  if (actual !== expected.get(name)) throw new Error('SHA-256 mismatch for ' + name)
}
process.stdout.write('Verified SHA-256 checksums for ' + expectedNames.length + ' release artifact(s).\n')
