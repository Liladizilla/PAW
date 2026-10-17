export type WorldPosition = { x: number; y: number; z: number }
export type WorldOrigin = { x: number; y: number; z: number }
export const DEFAULT_REBASE_THRESHOLD = 2048

const finitePosition = (p: WorldPosition) =>
  Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)

/** Stable world coordinates stay authoritative; renderer positions are relative to this origin. */
export function worldToRender(position: WorldPosition, origin: WorldOrigin): WorldPosition {
  if (!finitePosition(position) || !finitePosition(origin)) throw new Error('world positions and origin must be finite')
  return { x: position.x - origin.x, y: position.y - origin.y, z: position.z - origin.z }
}
export function renderToWorld(position: WorldPosition, origin: WorldOrigin): WorldPosition {
  if (!finitePosition(position) || !finitePosition(origin)) throw new Error('render positions and origin must be finite')
  return { x: position.x + origin.x, y: position.y + origin.y, z: position.z + origin.z }
}
/** Rebase only after crossing a threshold; snap X/Z to chunk boundaries to avoid streaming jitter. */
export function chooseWorldOrigin(
  focus: WorldPosition,
  current: WorldOrigin,
  chunkSize = 64,
  threshold = DEFAULT_REBASE_THRESHOLD
): WorldOrigin {
  if (!finitePosition(focus) || !finitePosition(current)) throw new Error('focus and origin must be finite')
  if (!Number.isFinite(chunkSize) || chunkSize <= 0 || !Number.isFinite(threshold) || threshold <= 0) throw new Error('chunkSize and threshold must be positive')
  if (Math.hypot(focus.x - current.x, focus.z - current.z) < threshold) return { ...current }
  return {
    x: Math.floor(focus.x / chunkSize) * chunkSize,
    y: Math.floor(focus.y / chunkSize) * chunkSize,
    z: Math.floor(focus.z / chunkSize) * chunkSize
  }
}
