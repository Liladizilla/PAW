import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core'
import { chunksAround, type WorldChunk } from './world-chunks'

type LoadedChunk = { meshes: Mesh[]; materials: StandardMaterial[] }
export type CityChunkStreamer = { update: (focus: Vector3) => void; dispose: () => void; loadedIds: () => string[] }

function hash(seed: number, x: number, z: number): number {
  let n = (seed ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263)) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

/**
 * Creates and disposes real Babylon meshes around the camera target.
 * The hand-authored central district remains owned by App; streamed chunks extend
 * the city beyond it and never overlap the existing +/-320m procedural district.
 */
export function createCityChunkStreamer(scene: Scene, chunkSize = 64, radius = 2): CityChunkStreamer {
  const loaded = new Map<string, LoadedChunk>()
  const makeChunk = (chunk: WorldChunk): LoadedChunk | null => {
    // Existing central district already owns these lots. Stream only the expanding outskirts.
    if (Math.abs(chunk.coord.x) <= 5 && Math.abs(chunk.coord.z) <= 5) return null
    const meshes: Mesh[] = [], materials: StandardMaterial[] = []
    const mat = (name: string, color: string) => {
      const m = new StandardMaterial(name, scene)
      m.diffuseColor = Color3.FromHexString(color)
      m.roughness = .86
      materials.push(m)
      return m
    }
    const asphalt = mat(chunk.id + '-asphalt', '#252824')
    const pavement = mat(chunk.id + '-pavement', '#55564f')
    const facadeColors = ['#5b605b', '#706a5f', '#494f4d', '#777368', '#5a6260']
    const x = chunk.minX, z = chunk.minZ, size = chunkSize
    const addBox = (name: string, width: number, height: number, depth: number, px: number, py: number, pz: number, material: StandardMaterial) => {
      const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene)
      mesh.position.set(px, py, pz); mesh.material = material; mesh.isPickable = false; meshes.push(mesh)
      return mesh
    }
    // Road and sidewalks cross the chunk boundaries exactly, preventing visible seams.
    addBox(chunk.id + '-road-x', size, .08, 6, x + size / 2, .04, z + size / 2, asphalt)
    addBox(chunk.id + '-road-z', 6, .08, size, x + size / 2, .04, z + size / 2, asphalt)
    addBox(chunk.id + '-walk-x-n', size, .14, 1.4, x + size / 2, .07, z + size / 2 - 3.8, pavement)
    addBox(chunk.id + '-walk-x-s', size, .14, 1.4, x + size / 2, .07, z + size / 2 + 3.8, pavement)
    addBox(chunk.id + '-walk-z-w', 1.4, .14, size, x + size / 2 - 3.8, .07, z + size / 2, pavement)
    addBox(chunk.id + '-walk-z-e', 1.4, .14, size, x + size / 2 + 3.8, .07, z + size / 2, pavement)
    const lotCount = 4 + Math.floor(hash(2026, chunk.coord.x, chunk.coord.z) * 5)
    for (let i = 0; i < lotCount; i++) {
      const r1 = hash(100 + i, chunk.coord.x, chunk.coord.z)
      const r2 = hash(200 + i, chunk.coord.x, chunk.coord.z)
      const r3 = hash(300 + i, chunk.coord.x, chunk.coord.z)
      const width = 7 + r1 * 9, depth = 7 + r2 * 9, height = 5 + r3 * 34
      const px = x + 10 + hash(400 + i, chunk.coord.x, chunk.coord.z) * (size - 20)
      const pz = z + 10 + hash(500 + i, chunk.coord.x, chunk.coord.z) * (size - 20)
      // Keep the avenue corridor clear. Small deterministic offsets make blocks varied without random flicker.
      const bx = Math.abs((px - x) - size / 2), bz = Math.abs((pz - z) - size / 2)
      if (bx < width / 2 + 5 || bz < depth / 2 + 5) continue
      const buildingMat = mat(chunk.id + '-building-' + i, facadeColors[Math.floor(r1 * facadeColors.length)])
      const shell = addBox(chunk.id + '-building-' + i, width, height, depth, px, height / 2 + .16, pz, buildingMat)
      shell.metadata = { chunkId: chunk.id, procedural: true }
      addBox(chunk.id + '-roof-' + i, width + .18, .18, depth + .18, px, height + .25, pz, pavement)
    }
    return { meshes, materials }
  }
  const update = (focus: Vector3) => {
    const desired = new Map(chunksAround({ x: focus.x, z: focus.z }, chunkSize, radius).map(c => [c.id, c]))
    for (const [id, chunk] of loaded) if (!desired.has(id)) {
      chunk.meshes.forEach(mesh => mesh.dispose(false, false))
      chunk.materials.forEach(material => material.dispose())
      loaded.delete(id)
    }
    for (const [id, chunk] of desired) if (!loaded.has(id)) {
      const created = makeChunk(chunk)
      if (created) loaded.set(id, created)
    }
  }
  return { update, dispose: () => { for (const chunk of loaded.values()) { chunk.meshes.forEach(m => m.dispose(false, false)); chunk.materials.forEach(m => m.dispose()) } loaded.clear() }, loadedIds: () => [...loaded.keys()].sort() }
}
