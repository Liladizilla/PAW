import { readFile } from 'node:fs/promises'

const tag = process.argv[2]
if (!tag || !/^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(tag)) {
  throw new Error('Expected a version tag such as v0.1.4.')
}
const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const tagVersion = tag.slice(1)
if (tagVersion !== metadata.version) {
  throw new Error('Release tag ' + tag + ' does not match package.json version ' + metadata.version + '. Update package metadata or use the matching tag before publishing.')
}
process.stdout.write('Release tag matches package version: ' + tag + '\\n')
