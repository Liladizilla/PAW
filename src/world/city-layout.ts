export type CityPoint = { x: number; z: number }
export type BuildingShape = 'tower' | 'slab' | 'courtyard' | 'cylinder' | 'stepped'

export type CityLot = {
  id: string
  x: number
  z: number
  width: number
  depth: number
  height: number
  floors: number
  shape: BuildingShape
  facade: string
}

export type RectObstacle = { minX: number; maxX: number; minZ: number; maxZ: number }

const facades = ['#69675e', '#565b58', '#777166', '#625f56', '#494f4c', '#4a514f', '#70695c', '#5d625d', '#6a7069', '#555b63']
const shapes: BuildingShape[] = ['tower', 'slab', 'courtyard', 'cylinder', 'stepped']

function hash(x: number, z: number, seed: number): number {
  let value = Math.imul(x ^ seed, 0x45d9f3b) ^ Math.imul(z + seed, 0x119de1f3)
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296
}

/** Deterministic city parcels. Road corridors occupy the grid lines; lots sit inside each block. */
export function generateCityLots(radius = 320, seed = 4107): CityLot[] {
  const spacing = 32
  const lots: CityLot[] = []
  for (let gx = -radius; gx <= radius; gx += spacing) {
    for (let gz = -radius; gz <= radius; gz += spacing) {
      const x = gx + spacing / 2
      const z = gz + spacing / 2
      // Preserve the central transit plaza and its eight authored landmark buildings.
      if (Math.abs(x) < 48 && Math.abs(z) < 48) continue
      const roll = hash(gx, gz, seed)
      if (roll < 0.12) continue // parks, plazas and loading yards create breathing room
      const width = 8 + hash(gx + 3, gz - 7, seed) * 11
      const depth = 8 + hash(gx - 5, gz + 11, seed) * 11
      const heightRoll = hash(gx + 17, gz - 13, seed)
      const height = heightRoll < 0.22 ? 5 + heightRoll * 12
        : heightRoll < 0.78 ? 14 + heightRoll * 30
        : 42 + heightRoll * 54
      const shape = shapes[Math.floor(hash(gx - 19, gz + 23, seed) * shapes.length)]
      lots.push({
        id: `district-${gx}-${gz}`, x, z, width, depth, height,
        floors: Math.max(2, Math.round(height / 3.2)),
        shape,
        facade: facades[Math.floor(hash(gx + 29, gz - 31, seed) * facades.length)]
      })
    }
  }
  return lots
}

export function lotObstacle(lot: Pick<CityLot, 'x' | 'z' | 'width' | 'depth'>, padding = 0.45): RectObstacle {
  return {
    minX: lot.x - lot.width / 2 - padding,
    maxX: lot.x + lot.width / 2 + padding,
    minZ: lot.z - lot.depth / 2 - padding,
    maxZ: lot.z + lot.depth / 2 + padding
  }
}

export function pointInsideObstacle(point: CityPoint, obstacle: RectObstacle): boolean {
  return point.x > obstacle.minX && point.x < obstacle.maxX && point.z > obstacle.minZ && point.z < obstacle.maxZ
}

/** Grid A* for civilian navigation. Returns no path if either endpoint is blocked or outside bounds. */
export function findWalkablePath(
  start: CityPoint,
  goal: CityPoint,
  obstacles: RectObstacle[],
  bounds = 512,
  step = 2
): CityPoint[] {
  const blocked = (p: CityPoint) => Math.abs(p.x) > bounds || Math.abs(p.z) > bounds || obstacles.some(o => pointInsideObstacle(p, o))
  if (blocked(start) || blocked(goal)) return []
  const key = (x: number, z: number) => `${x},${z}`
  const toGrid = (p: CityPoint) => ({ x: Math.round(p.x / step), z: Math.round(p.z / step) })
  const fromGrid = (p: { x: number; z: number }): CityPoint => ({ x: p.x * step, z: p.z * step })
  const a = toGrid(start), b = toGrid(goal)
  const startKey = key(a.x, a.z), goalKey = key(b.x, b.z)
  const open = new Set([startKey])
  const cameFrom = new Map<string, string>()
  const gScore = new Map<string, number>([[startKey, 0]])
  const fScore = new Map<string, number>([[startKey, Math.abs(a.x - b.x) + Math.abs(a.z - b.z)]])
  const coords = new Map<string, { x: number; z: number }>([[startKey, a]])
  const directions = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }]
  let visits = 0
  while (open.size && visits++ < 60000) {
    let current = ''
    let best = Infinity
    for (const candidate of open) {
      const score = fScore.get(candidate) ?? Infinity
      if (score < best) { best = score; current = candidate }
    }
    if (current === goalKey) {
      const path: CityPoint[] = [goal]
      let cursor = current
      while (cameFrom.has(cursor)) {
        const previous = cameFrom.get(cursor)!
        const c = coords.get(previous)!
        path.push(fromGrid(c))
        cursor = previous
      }
      path.push(start)
      path.reverse()
      return path.filter((p, i) => i === 0 || Math.hypot(p.x - path[i - 1].x, p.z - path[i - 1].z) > 0.01)
    }
    open.delete(current)
    const currentPoint = coords.get(current)!
    for (const d of directions) {
      const next = { x: currentPoint.x + d.x, z: currentPoint.z + d.z }
      const world = fromGrid(next)
      if (blocked(world)) continue
      const nextKey = key(next.x, next.z)
      const tentative = (gScore.get(current) ?? Infinity) + 1
      if (tentative >= (gScore.get(nextKey) ?? Infinity)) continue
      cameFrom.set(nextKey, current)
      coords.set(nextKey, next)
      gScore.set(nextKey, tentative)
      fScore.set(nextKey, tentative + Math.abs(next.x - b.x) + Math.abs(next.z - b.z))
      open.add(nextKey)
    }
  }
  return []
}
