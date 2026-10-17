import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'

const directory = resolve(process.argv[2] ?? 'release')
const entries = (await readdir(directory, { withFileTypes: true }))
  .filter(entry => entry.isFile() && !entry.name.startsWith('SHA256SUMS'))
  .map(entry => entry.name)
  .sort()

if (entries.length === 0) {
  throw new Error('No release artifacts found in ' + directory)
}

const lines = []
for (const name of entries) {
  const bytes = await readFile(join(directory, name))
  const digest = createHash('sha256').update(bytes).digest('hex')
  lines.push(digest + '  ' + basename(name))
}

await writeFile(join(directory, 'SHA256SUMS.txt'), lines.join('\n') + '\n', 'utf8')
process.stdout.write('Wrote SHA-256 checksums for ' + entries.length + ' artifact(s).\n')
