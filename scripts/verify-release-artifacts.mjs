import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'

const platform = process.argv[2]
const directory = resolve(process.argv[3] ?? 'release')
const requiredExtensions = {
  linux: ['.AppImage', '.deb'],
  win: ['.exe'],
  mac: ['.dmg', '.zip']
}
const installerExtensions = [...new Set(Object.values(requiredExtensions).flat())]
const auxiliaryFiles = name => name.endsWith('.blockmap') || name === 'builder-debug.yml' || name.endsWith('.__uninstaller.exe')

if (!Object.hasOwn(requiredExtensions, platform)) {
  throw new Error('Platform must be one of: ' + Object.keys(requiredExtensions).join(', '))
}

const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const entries = await readdir(directory, { withFileTypes: true })
const artifacts = entries.filter(entry =>
  entry.isFile() &&
  installerExtensions.some(extension => entry.name.endsWith(extension)) &&
  !auxiliaryFiles(entry.name)
)
if (artifacts.length === 0) throw new Error('No installer artifacts found in ' + directory)

const expectedPrefix = metadata.build?.productName + '-' + metadata.version + '-' + platform + '-'
const names = artifacts.map(entry => entry.name)
for (const name of names) {
  if (basename(name) !== name) throw new Error('Invalid artifact filename: ' + name)
  const info = await stat(join(directory, name))
  if (info.size === 0) throw new Error('Release artifact is empty: ' + name)
  if (!name.startsWith(expectedPrefix) || !/-(x64|arm64|x86_64|amd64)\.(AppImage|deb|exe|dmg|zip)$/.test(name)) {
    throw new Error('Installer does not include the expected product, version, platform and architecture: ' + name)
  }
  if (!requiredExtensions[platform].some(extension => name.endsWith(extension))) {
    throw new Error('Unexpected installer format for ' + platform + ': ' + name)
  }
}

for (const extension of requiredExtensions[platform]) {
  if (!names.some(name => name.endsWith(extension))) {
    throw new Error('Missing required ' + platform + ' release artifact (' + extension + '). Found: ' + names.join(', '))
  }
}

process.stdout.write('Verified ' + platform + ' release artifacts: ' + names.sort().join(', ') + '\n')
