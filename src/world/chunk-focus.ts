import { renderToWorld, worldToRender, type WorldOrigin, type WorldPosition } from './world-origin'

/**
 * Convert a renderer-relative camera focus into authoritative world coordinates
 * before asking the chunk planner which world chunks should be resident.
 * Chunk IDs and procedural layouts must never be derived from rebased render space.
 */
export function worldFocusFromRender(renderFocus: WorldPosition, origin: WorldOrigin): WorldPosition {
  return renderToWorld(renderFocus, origin)
}

/** Project an authoritative world focus into the current renderer-relative space. */
export function renderFocusFromWorld(worldFocus: WorldPosition, origin: WorldOrigin): WorldPosition {
  return worldToRender(worldFocus, origin)
}
