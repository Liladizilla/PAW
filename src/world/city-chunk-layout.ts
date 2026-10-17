import type { WorldChunk } from './world-chunks'

export type CityBuildingLot = { id: string; x: number; z: number; width: number; depth: number; height: number; facadeIndex: number }
export type CityRoadPlan = { axis: 'x' | 'z'; x: number; z: number; width: number; length: number }
export type CityChunkLayout = { chunkId: string; roads: CityRoadPlan[]; sidewalks: CityRoadPlan[]; buildings: CityBuildingLot[] }

function seeded(seed: number, x: number, z: number): number {
  let n = (seed ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263)) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

/** Pure deterministic layout data, independent of Babylon and safe to unit-test. */
export function planCityChunk(chunk: WorldChunk, seed = 2026): CityChunkLayout {
  const size = chunk.maxX - chunk.minX
  if (!Number.isFinite(size) || size < 16 || chunk.maxZ - chunk.minZ !== size) throw new Error('city chunks must be square and at least 16 units wide')
  const { minX: x, minZ: z } = chunk
  // Roads sit on chunk boundaries, so neighboring chunks join without gaps.
  const roads: CityRoadPlan[] = [
    { axis: 'x', x: x + size / 2, z, width: 6, length: size },
    { axis: 'z', x, z: z + size / 2, width: 6, length: size }
  ]
  const sidewalks: CityRoadPlan[] = [
    { axis: 'x', x: x + size / 2, z: z - 3.8, width: 1.4, length: size },
    { axis: 'x', x: x + size / 2, z: z + 3.8, width: 1.4, length: size },
    { axis: 'z', x: x - 3.8, z: z + size / 2, width: 1.4, length: size },
    { axis: 'z', x: x + 3.8, z: z + size / 2, width: 1.4, length: size }
  ]
  const count = 4 + Math.floor(seeded(seed, chunk.coord.x, chunk.coord.z) * 5)
  const buildings: CityBuildingLot[] = []
  for (let i = 0; i < count; i++) {
    const a = seeded(seed + 100 + i, chunk.coord.x, chunk.coord.z)
    const b = seeded(seed + 200 + i, chunk.coord.x, chunk.coord.z)
    const c = seeded(seed + 300 + i, chunk.coord.x, chunk.coord.z)
    const width = 7 + a * 9, depth = 7 + b * 9
    const px = x + 10 + seeded(seed + 400 + i, chunk.coord.x, chunk.coord.z) * (size - 20)
    const pz = z + 10 + seeded(seed + 500 + i, chunk.coord.x, chunk.coord.z) * (size - 20)
    const roadX = Math.abs((px - x) - size / 2), roadZ = Math.abs((pz - z) - size / 2)
    if (roadX < width / 2 + 5 || roadZ < depth / 2 + 5) continue
    buildings.push({ id: chunk.id + '-building-' + i, x: px, z: pz, width, depth, height: 5 + c * 34, facadeIndex: Math.floor(a * 5) })
  }
  return { chunkId: chunk.id, roads, sidewalks, buildings }
}
