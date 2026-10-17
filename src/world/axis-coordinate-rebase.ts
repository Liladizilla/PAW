import type { PreparedRebase, RebaseParticipant } from './world-origin-coordinator'
import type { WorldOrigin } from './world-origin'

export type AxisCoordinateOwner = { axis: 'x' | 'z'; coordinate: number }

/** Shift authoritative scalar coordinates; corresponding render meshes need separate participants. */
export function createAxisCoordinateRebase(id: string, getOwners: () => readonly AxisCoordinateOwner[]): RebaseParticipant {
  if (!id.trim()) throw new Error('axis coordinate participant requires an ID')
  return {
    id,
    prepareRebase(previous: WorldOrigin, next: WorldOrigin): PreparedRebase {
      const dx = next.x - previous.x, dz = next.z - previous.z
      if (![previous.x, previous.y, previous.z, next.x, next.y, next.z].every(Number.isFinite)) throw new Error('origins must be finite')
      const staged = getOwners().map(owner => {
        if ((owner.axis !== 'x' && owner.axis !== 'z') || !Number.isFinite(owner.coordinate)) throw new Error('invalid axis coordinate owner')
        return { owner, before: owner.coordinate, delta: owner.axis === 'x' ? dx : dz }
      })
      let committed = false
      return {
        commit: () => { for (const item of staged) item.owner.coordinate = item.before - item.delta; committed = true },
        rollback: () => { if (committed) { for (const item of staged) item.owner.coordinate = item.before; committed = false } }
      }
    }
  }
}
