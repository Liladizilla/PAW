import type { PreparedRebase, RebaseParticipant } from './world-origin-coordinator'
import type { WorldOrigin } from './world-origin'

export type TrafficPosition = { x: number; y: number; z: number }
export type TrafficVehicleOwner = {
  axis: 'x' | 'z'
  coordinate: number
  body: { position: TrafficPosition }
  cabin: { position: TrafficPosition }
}

/** Stage each vehicle's scalar lane coordinate and both meshes as one participant. */
export function createTrafficRebaseParticipant(
  id: string,
  getVehicles: () => readonly TrafficVehicleOwner[],
  onMeshesChanged: () => void = () => {}
): RebaseParticipant {
  if (!id.trim()) throw new Error('traffic participant requires an ID')
  return {
    id,
    prepareRebase(previous: WorldOrigin, next: WorldOrigin): PreparedRebase {
      if (![previous.x, previous.y, previous.z, next.x, next.y, next.z].every(Number.isFinite)) {
        throw new Error('traffic rebase requires finite origins')
      }
      const dx = next.x - previous.x, dy = next.y - previous.y, dz = next.z - previous.z
      const staged = getVehicles().map(vehicle => {
        if ((vehicle.axis !== 'x' && vehicle.axis !== 'z') || !Number.isFinite(vehicle.coordinate)) {
          throw new Error('traffic vehicle has an invalid axis coordinate')
        }
        const positions = [vehicle.body.position, vehicle.cabin.position]
        if (positions.some(p => ![p.x, p.y, p.z].every(Number.isFinite))) {
          throw new Error('traffic vehicle has a non-finite mesh position')
        }
        return { vehicle, coordinate: vehicle.coordinate, delta: vehicle.axis === 'x' ? dx : dz,
          positions: positions.map(owner => ({ owner, before: { ...owner } })) }
      })
      let committed = false
      return {
        commit: () => {
          for (const item of staged) {
            item.vehicle.coordinate = item.coordinate - item.delta
            for (const p of item.positions) {
              p.owner.x = p.before.x - dx; p.owner.y = p.before.y - dy; p.owner.z = p.before.z - dz
            }
          }
          onMeshesChanged()
          committed = true
        },
        rollback: () => {
          if (!committed) return
          for (const item of staged) {
            item.vehicle.coordinate = item.coordinate
            for (const p of item.positions) Object.assign(p.owner, p.before)
          }
          onMeshesChanged()
          committed = false
        }
      }
    }
  }
}
