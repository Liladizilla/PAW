import type { PreparedRebase, RebaseParticipant } from './world-origin-coordinator'
import type { WorldOrigin } from './world-origin'

export type WorldRootOwner = { position: { x: number; y: number; z: number } }

/** Keeps world-space child transforms stable while the root projects them into render space. */
export function createWorldRootRebaseParticipant(id: string, getRoot: () => WorldRootOwner): RebaseParticipant {
  if (!id.trim()) throw new Error('world root participant requires an ID')
  return {
    id,
    prepareRebase(previous: WorldOrigin, next: WorldOrigin): PreparedRebase {
      if (![previous.x, previous.y, previous.z, next.x, next.y, next.z].every(Number.isFinite)) {
        throw new Error('world root rebase requires finite origins')
      }
      const root = getRoot()
      const before = { x: root.position.x, y: root.position.y, z: root.position.z }
      if (![before.x, before.y, before.z].every(Number.isFinite)) throw new Error('world root position must be finite')
      let committed = false
      return {
        commit: () => {
          root.position.x = -next.x
          root.position.y = -next.y
          root.position.z = -next.z
          committed = true
        },
        rollback: () => {
          if (!committed) return
          Object.assign(root.position, before)
          committed = false
        }
      }
    }
  }
}
