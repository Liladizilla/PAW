import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'

const platform = process.argv[2]
const directory = resolve(process.argv[3] ?? 'release')
const requiredExtensions = { linux: ['.AppImage', '.deb', '.rpm'], win: ['.exe'], mac: ['.dmg', '.zip'] }
const auxiliaryFiles = name => name.endsWith('.blockmap') || name === 'builder-debug.yml' || name.endsWith('.__uninstaller.exe')

if (!Object.hasOwn(requiredExtensions, platform)) throw new Error('Platform must be one of: ' + Object.keys(requiredExtensions).join(', '))
const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const entries = await readdir(directory, { withFileTypes: true })
const artifacts = entries.filter(entry => entry.isFile() && requiredExtensions[platform].some(extension => entry.name.endsWith(extension)) && !auxiliaryFiles(entry.name))
if (artifacts.length === 0) throw new Error('No installer artifacts found in ' + directory)
const version = metadata.version
const expectedNames = {
  linux: [
    name => name === 'P.A.W-' + version + '.AppImage',
    name => name === 'paw-personal-agent-workspace_' + version + '_amd64.deb',
    name => new RegExp('^.+-' + version.replaceAll('.', '\\\\.') + '\\\\.(x86_64|aarch64)\\\\.rpm  ],
  win: [name => name === 'P.A.W.Setup.' + version + '.exe'],
  mac: [
    name => new RegExp('^P\\.A\\.W-' + version.replaceAll('.', '\\.') + '-(arm64|x64)\\.dmg$').test(name),
    name => new RegExp('^P\\.A\\.W-' + version.replaceAll('.', '\\.') + '-(arm64|x64)-mac\\.zip$').test(name)
  ]
}
const names = artifacts.map(entry => entry.name)
for (const name of names) {
  if (basename(name) !== name) throw new Error('Invalid artifact filename: ' + name)
  const info = await stat(join(directory, name))
  if (info.size === 0) throw new Error('Release artifact is empty: ' + name)
  if (!expectedNames[platform].some(matches => matches(name))) throw new Error('Installer does not match the current electron-builder naming convention for ' + platform + ': ' + name)
}
for (const extension of requiredExtensions[platform]) if (!names.some(name => name.endsWith(extension))) throw new Error('Missing required ' + platform + ' release artifact (' + extension + '). Found: ' + names.join(', '))
process.stdout.write('Verified ' + platform + ' release artifacts: ' + names.sort().join(', ') + '\\n')
).test(name)
  ],
  win: [name => name === 'P.A.W.Setup.' + version + '.exe'],
  mac: [
    name => new RegExp('^P\\.A\\.W-' + version.replaceAll('.', '\\.') + '-(arm64|x64)\\.dmg$').test(name),
    name => new RegExp('^P\\.A\\.W-' + version.replaceAll('.', '\\.') + '-(arm64|x64)-mac\\.zip$').test(name)
  ]
}
const names = artifacts.map(entry => entry.name)
for (const name of names) {
  if (basename(name) !== name) throw new Error('Invalid artifact filename: ' + name)
  const info = await stat(join(directory, name))
  if (info.size === 0) throw new Error('Release artifact is empty: ' + name)
  if (!expectedNames[platform].some(matches => matches(name))) throw new Error('Installer does not match the current electron-builder naming convention for ' + platform + ': ' + name)
}
for (const extension of requiredExtensions[platform]) if (!names.some(name => name.endsWith(extension))) throw new Error('Missing required ' + platform + ' release artifact (' + extension + '). Found: ' + names.join(', '))
process.stdout.write('Verified ' + platform + ' release artifacts: ' + names.sort().join(', ') + '\\n')
