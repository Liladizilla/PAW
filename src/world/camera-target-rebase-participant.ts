import type { PreparedRebase, RebaseParticipant } from './world-origin-coordinator'
import type { WorldOrigin } from './world-origin'
import type { MutablePosition } from './position-rebase-participant'

/** Camera-like owner whose target is expressed in renderer-relative coordinates. */
export type CameraTargetOwner = { target: MutablePosition }

/**
 * Stages a camera-focus shift with exact rollback. The camera target is a separate
 * coordinate owner from ordinary meshes and must be registered independently.
 * This adapter intentionally does not move the camera position or other controls.
 */
export function createCameraTargetRebaseParticipant(
  id: string,
  getCamera: () => CameraTargetOwner
): RebaseParticipant {
  if (!id.trim()) throw new Error('camera target participant requires an ID')
  return {
    id,
    prepareRebase(previous: WorldOrigin, next: WorldOrigin): PreparedRebase {
      const camera = getCamera()
      const before = { x: camera.target.x, y: camera.target.y, z: camera.target.z }
      const values = [before.x, before.y, before.z, previous.x, previous.y, previous.z, next.x, next.y, next.z]
      if (!values.every(Number.isFinite)) throw new Error('camera target rebase requires finite coordinates: ' + id)
      const delta = { x: next.x - previous.x, y: next.y - previous.y, z: next.z - previous.z }
      let committed = false
      return {
        commit: () => {
          camera.target.x = before.x - delta.x
          camera.target.y = before.y - delta.y
          camera.target.z = before.z - delta.z
          committed = true
        },
        rollback: () => {
          if (!committed) return
          camera.target.x = before.x
          camera.target.y = before.y
          camera.target.z = before.z
          committed = false
        }
      }
    }
  }
}
