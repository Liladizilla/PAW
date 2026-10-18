import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const root = process.cwd()
const encoded = (await readFile(resolve(root, 'assets/paw-icon.png.base64'), 'utf8')).trim()
const png = Buffer.from(encoded, 'base64')
if (png.length < 1000 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('P.A.W. generated icon source is invalid.')
const output = [
  ['public/paw-icon.png', png],
  ['build/icons/paw-icon.png', png],
  ['build/icons/paw-icon.ico', makeIco(png)],
  ['build/icons/paw-icon.icns', makeIcns(png)]
]
for (const [path, bytes] of output) { await mkdir(dirname(resolve(root, path)), { recursive: true }); await writeFile(resolve(root, path), bytes) }
console.log('Prepared shared generated P.A.W. icon for renderer, Linux, Windows, and macOS.')

function makeIco(image) {
  const header = Buffer.alloc(22)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4)
  header[6] = 128; header[7] = 128; header[8] = 0; header[9] = 0
  header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(image.length, 14); header.writeUInt32LE(22, 18)
  return Buffer.concat([header, image])
}
function makeIcns(image) {
  const chunk = Buffer.alloc(8 + image.length)
  chunk.write('ic07', 0, 'ascii'); chunk.writeUInt32BE(chunk.length, 4); image.copy(chunk, 8)
  const header = Buffer.alloc(8); header.write('icns', 0, 'ascii'); header.writeUInt32BE(header.length + chunk.length, 4)
  return Buffer.concat([header, chunk])
}
