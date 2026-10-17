import type { PreparedRebase, RebaseParticipant } from './world-origin-coordinator'
import type { WorldOrigin } from './world-origin'

/**
 * Transactional adapter for Babylon thin-instance matrix buffers (16 floats per
 * matrix, column-major translation at indices 12..14). It shifts only translation,
 * preserving rotation/scale. The owner must provide every body/head buffer that
 * represents the same simulated population.
 */
export function createThinInstanceRebaseParticipant(
  id: string,
  getBuffers: () => readonly Float32Array[],
  onBuffersChanged: () => void = () => {}
): RebaseParticipant {
  if (!id.trim()) throw new Error('thin-instance participant requires an ID')
  return {
    id,
    prepareRebase(previous: WorldOrigin, next: WorldOrigin): PreparedRebase {
      const delta = { x: next.x - previous.x, y: next.y - previous.y, z: next.z - previous.z }
      if (![previous.x, previous.y, previous.z, next.x, next.y, next.z].every(Number.isFinite)) {
        throw new Error('thin-instance rebase requires finite origins: ' + id)
      }
      const staged = getBuffers().map(buffer => {
        if (!(buffer instanceof Float32Array) || buffer.length % 16 !== 0) {
          throw new Error('thin-instance matrix buffer must be Float32Array with 16-float matrices: ' + id)
        }
        const before = buffer.slice()
        for (let i = 0; i < before.length; i += 16) {
          if (![before[i + 12], before[i + 13], before[i + 14]].every(Number.isFinite)) {
            throw new Error('thin-instance buffer contains non-finite translation: ' + id)
          }
        }
        return { buffer, before }
      })
      let committed = false
      return {
        commit: () => {
          for (const { buffer, before } of staged) {
            for (let i = 0; i < before.length; i += 16) {
              buffer[i + 12] = before[i + 12] - delta.x
              buffer[i + 13] = before[i + 13] - delta.y
              buffer[i + 14] = before[i + 14] - delta.z
            }
          }
          committed = true
          onBuffersChanged()
        },
        rollback: () => {
          if (!committed) return
          for (const { buffer, before } of staged) buffer.set(before)
          onBuffersChanged()
          committed = false
        }
      }
    }
  }
}
