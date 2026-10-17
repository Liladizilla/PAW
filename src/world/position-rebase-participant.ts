import type { RebaseParticipant, PreparedRebase } from './world-origin-coordinator'
import type { WorldOrigin } from './world-origin'

/** Minimal mutable position shape shared by Babylon Vector3-like objects. */
export type MutablePosition = { x: number; y: number; z: number }
export type PositionOwner = { position: MutablePosition }

/**
 * Builds a transactional participant for objects whose positions are renderer-relative.
 * Supply a getter so newly streamed/imported owners can be included at each rebase.
 *
 * This adapter only owns object.position. It must not be used as a substitute for
 * dedicated adapters for thin-instance matrices, camera targets, simulation state,
 * chunk generation, or persisted world-space transforms.
 */
export function createPositionRebaseParticipant(
  id: string,
  getOwners: () => readonly PositionOwner[]
): RebaseParticipant {
  if (!id.trim()) throw new Error('position participant requires an ID')
  return {
    id,
    prepareRebase(previous: WorldOrigin, next: WorldOrigin): PreparedRebase {
      const delta = { x: next.x - previous.x, y: next.y - previous.y, z: next.z - previous.z }
      const staged = getOwners().map(owner => ({
        owner,
        before: { x: owner.position.x, y: owner.position.y, z: owner.position.z }
      }))
      if (staged.some(({ before }) => ![before.x, before.y, before.z].every(Number.isFinite))) {
        throw new Error('position participant contains non-finite render coordinates: ' + id)
      }
      let committed = false
      return {
        commit: () => {
          for (const item of staged) {
            item.owner.position.x = item.before.x - delta.x
            item.owner.position.y = item.before.y - delta.y
            item.owner.position.z = item.before.z - delta.z
          }
          committed = true
        },
        rollback: () => {
          if (!committed) return
          for (const item of staged) {
            item.owner.position.x = item.before.x
            item.owner.position.y = item.before.y
            item.owner.position.z = item.before.z
          }
          committed = false
        }
      }
    }
  }
}
