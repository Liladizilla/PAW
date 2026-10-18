import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { deflateSync, inflateSync } from 'node:zlib'

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
  // Windows requires an icon image of at least 256x256. Decode the checked-in
  // PNG and upscale it deterministically, without relying on platform tools.
  const scaled = resizePng(image, 256, 256)
  const header = Buffer.alloc(22)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4)
  header[6] = 0; header[7] = 0; header[8] = 0; header[9] = 0
  header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(scaled.length, 14); header.writeUInt32LE(22, 18)
  return Buffer.concat([header, scaled])
}
function resizePng(input, targetWidth, targetHeight) {
  const signature = input.subarray(0, 8)
  const chunks = []
  let palette = null, transparency = null
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0
  for (let offset = 8; offset < input.length;) {
    const length = input.readUInt32BE(offset)
    const type = input.toString('ascii', offset + 4, offset + 8)
    const data = input.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; interlace = data[12] }
    if (type === 'PLTE') palette = Buffer.from(data)
    if (type === 'tRNS') transparency = Buffer.from(data)
    if (type === 'IDAT') chunks.push(data)
    offset += 12 + length
    if (type === 'IEND') break
  }
  if (!width || !height || (colorType === 3 ? ![1, 2, 4, 8].includes(bitDepth) : bitDepth !== 8) || ![0, 2, 3, 4, 6].includes(colorType) || interlace !== 0) throw new Error('Icon PNG must be non-interlaced with a supported 8-bit color format or 1/2/4/8-bit indexed color.')
  if (colorType === 3 && (!palette || palette.length < 3 || palette.length % 3 !== 0)) throw new Error('Indexed icon PNG is missing a valid color palette.')
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 })[colorType], stride = Math.ceil(width * channels * bitDepth / 8), filterBpp = Math.max(1, Math.ceil(channels * bitDepth / 8))
  const packed = inflateSync(Buffer.concat(chunks))
  const raw = Buffer.alloc(height * stride)
  let inputOffset = 0
  for (let y = 0; y < height; y++) {
    const filter = packed[inputOffset++], row = y * stride
    for (let x = 0; x < stride; x++) {
      const value = packed[inputOffset++], left = x >= filterBpp ? raw[row + x - filterBpp] : 0
      const up = y ? raw[row - stride + x] : 0
      const upperLeft = y && x >= filterBpp ? raw[row - stride + x - filterBpp] : 0
      let predictor = 0
      if (filter === 1) predictor = left
      else if (filter === 2) predictor = up
      else if (filter === 3) predictor = Math.floor((left + up) / 2)
      else if (filter === 4) {
        const p = left + up - upperLeft, a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - upperLeft)
        predictor = a <= b && a <= c ? left : b <= c ? up : upperLeft
      } else if (filter !== 0) throw new Error('Unsupported PNG filter.')
      raw[row + x] = (value + predictor) & 255
    }
  }
  const out = Buffer.alloc(targetHeight * (targetWidth * 4 + 1))
  for (let y = 0; y < targetHeight; y++) {
    const row = y * (targetWidth * 4 + 1); out[row] = 0
    const sy = Math.min(height - 1, Math.floor(y * height / targetHeight))
    for (let x = 0; x < targetWidth; x++) {
      const sx = Math.min(width - 1, Math.floor(x * width / targetWidth))
      const src = sy * stride + sx * channels, dst = row + 1 + x * 4
      if (colorType === 3) {
        const bitOffset = sx * bitDepth, shift = 8 - bitDepth - (bitOffset % 8)
        const index = (raw[sy * stride + Math.floor(bitOffset / 8)] >> shift) & ((1 << bitDepth) - 1), color = index * 3
        if (color + 2 >= palette.length) throw new Error('Icon PNG contains an invalid palette index.')
        out[dst] = palette[color]; out[dst + 1] = palette[color + 1]; out[dst + 2] = palette[color + 2]; out[dst + 3] = transparency && index < transparency.length ? transparency[index] : 255
      } else if (colorType === 0 || colorType === 4) {
        out[dst] = raw[src]; out[dst + 1] = raw[src]; out[dst + 2] = raw[src]
        out[dst + 3] = colorType === 4 ? raw[src + 1] : 255
      } else {
        out[dst] = raw[src]; out[dst + 1] = raw[src + 1]; out[dst + 2] = raw[src + 2]; out[dst + 3] = channels === 4 ? raw[src + 3] : 255
      }
    }
  }
  const chunk = (type, data) => {
    const out = Buffer.alloc(data.length + 12); out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); data.copy(out, 8)
    let crc = 0xffffffff
    for (const byte of out.subarray(4, 8 + data.length)) { crc ^= byte; for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0) }
    out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + data.length); return out
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(targetWidth, 0); ihdr.writeUInt32BE(targetHeight, 4); ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(out)), chunk('IEND', Buffer.alloc(0))])
}
function makeIcns(image) {
  const chunk = Buffer.alloc(8 + image.length)
  chunk.write('ic06', 0, 'ascii'); chunk.writeUInt32BE(chunk.length, 4); image.copy(chunk, 8)
  const header = Buffer.alloc(8); header.write('icns', 0, 'ascii'); header.writeUInt32BE(header.length + chunk.length, 4)
  return Buffer.concat([header, chunk])
}
