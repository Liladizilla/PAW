import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core'
import { chunksAround, type WorldChunk } from './world-chunks'
import { planCityChunk } from './city-chunk-layout'

type LoadedChunk = { meshes: Mesh[]; materials: StandardMaterial[] }
export type CityChunkStats = { loadedChunks: number; meshes: number; materials: number }
export type CityChunkStreamer = { update: (focus: Vector3) => void; dispose: () => void; loadedIds: () => string[]; stats: () => CityChunkStats }

/**
 * Creates and disposes real Babylon meshes around the camera target.
 * The hand-authored central district remains owned by App; streamed chunks extend
 * the city beyond it. Each chunk's roads lie on its min-edge grid lines so adjoining
 * chunks share the same continuous arterial coordinates.
 */
export function createCityChunkStreamer(scene: Scene, chunkSize = 64, radius = 2): CityChunkStreamer {
  const loaded = new Map<string, LoadedChunk>()
  const makeChunk = (chunk: WorldChunk): LoadedChunk | null => {
    if (Math.abs(chunk.coord.x) <= 5 && Math.abs(chunk.coord.z) <= 5) return null
    const layout = planCityChunk(chunk)
    const meshes: Mesh[] = [], materials: StandardMaterial[] = []
    const mat = (name: string, color: string) => {
      const m = new StandardMaterial(name, scene)
      m.diffuseColor = Color3.FromHexString(color)
      materials.push(m)
      return m
    }
    try {
      const asphalt = mat(chunk.id + '-asphalt', '#252824')
      const pavement = mat(chunk.id + '-pavement', '#55564f')
      const facadeColors = ['#5b605b', '#706a5f', '#494f4d', '#777368', '#5a6260']
      const addBox = (name: string, width: number, height: number, depth: number, px: number, py: number, pz: number, material: StandardMaterial) => {
        const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene)
        mesh.position.set(px, py, pz); mesh.material = material; mesh.isPickable = false; meshes.push(mesh)
        return mesh
      }
      for (const [index, road] of layout.roads.entries()) {
        addBox(chunk.id + '-road-' + index, road.axis === 'x' ? road.length : road.width, .08, road.axis === 'x' ? road.width : road.length, road.x, .04, road.z, asphalt)
      }
      for (const [index, walk] of layout.sidewalks.entries()) {
        addBox(chunk.id + '-walk-' + index, walk.axis === 'x' ? walk.length : walk.width, .14, walk.axis === 'x' ? walk.width : walk.length, walk.x, .07, walk.z, pavement)
      }
      for (const lot of layout.buildings) {
        const buildingMat = mat(lot.id + '-facade', facadeColors[lot.facadeIndex])
        const shell = addBox(lot.id, lot.width, lot.height, lot.depth, lot.x, lot.height / 2 + .16, lot.z, buildingMat)
        shell.metadata = { chunkId: chunk.id, procedural: true, assetKind: 'building' }
        addBox(lot.id + '-roof', lot.width + .18, .18, lot.depth + .18, lot.x, lot.height + .25, lot.z, pavement)
      }
      return { meshes, materials }
    } catch (error) {
      meshes.forEach(mesh => mesh.dispose(false, false))
      materials.forEach(material => material.dispose())
      throw error
    }
  }
  const disposeChunk = (chunk: LoadedChunk) => {
    chunk.meshes.forEach(mesh => mesh.dispose(false, false))
    chunk.materials.forEach(material => material.dispose())
  }
  const update = (focus: Vector3) => {
    const desired = new Map(chunksAround({ x: focus.x, z: focus.z }, chunkSize, radius).map(c => [c.id, c]))
    for (const [id, chunk] of loaded) if (!desired.has(id)) {
      disposeChunk(chunk)
      loaded.delete(id)
    }
    for (const [id, chunk] of desired) if (!loaded.has(id)) {
      const created = makeChunk(chunk)
      if (created) loaded.set(id, created)
    }
  }
  return {
    update,
    dispose: () => { for (const chunk of loaded.values()) disposeChunk(chunk); loaded.clear() },
    loadedIds: () => [...loaded.keys()].sort(),
    stats: () => [...loaded.values()].reduce((total, chunk) => ({
      loadedChunks: total.loadedChunks + 1,
      meshes: total.meshes + chunk.meshes.length,
      materials: total.materials + chunk.materials.length
    }), { loadedChunks: 0, meshes: 0, materials: 0 })
  }
}
