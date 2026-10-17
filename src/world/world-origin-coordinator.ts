import { chooseWorldOrigin, type WorldOrigin, type WorldPosition } from './world-origin'

export type PreparedRebase = {
  /** Apply the prepared coordinate shift. Must not perform asynchronous work. */
  commit: () => void
  /** Restore the exact pre-rebase state; safe after prepare or commit. */
  rollback: () => void
}
export type RebaseParticipant = {
  id: string
  /** Prepare local state without exposing the new coordinate space yet. */
  prepareRebase: (previous: WorldOrigin, next: WorldOrigin) => PreparedRebase
}
export type RebaseResult = { changed: boolean; previous: WorldOrigin; current: WorldOrigin }

/**
 * Synchronous two-phase coordinator for scene-wide origin changes.
 *
 * Participants should stage their changes in prepareRebase and only publish them
 * from commit. If any stage/commit throws, rollback is called in reverse order.
 * This deliberately does not mutate Babylon objects itself: the live renderer
 * must register every coordinate-owning subsystem before enabling rebasing.
 */
export class WorldOriginCoordinator {
  private currentOrigin: WorldOrigin
  private readonly participants = new Map<string, RebaseParticipant>()

  constructor(initialOrigin: WorldOrigin = { x: 0, y: 0, z: 0 }) {
    this.assertOrigin(initialOrigin)
    this.currentOrigin = { ...initialOrigin }
  }

  get origin(): WorldOrigin {
    return { ...this.currentOrigin }
  }

  register(participant: RebaseParticipant): () => void {
    if (!participant.id.trim()) throw new Error('rebase participant requires an ID')
    if (this.participants.has(participant.id)) throw new Error('duplicate rebase participant: ' + participant.id)
    this.participants.set(participant.id, participant)
    return () => {
      if (this.participants.get(participant.id) === participant) this.participants.delete(participant.id)
    }
  }

  rebase(focus: WorldPosition, chunkSize = 64, threshold = 2048): RebaseResult {
    const previous = { ...this.currentOrigin }
    const next = chooseWorldOrigin(focus, previous, chunkSize, threshold)
    if (next.x === previous.x && next.y === previous.y && next.z === previous.z) {
      return { changed: false, previous, current: { ...previous } }
    }

    const prepared: PreparedRebase[] = []
    try {
      for (const participant of this.participants.values()) {
        const stage = participant.prepareRebase(previous, next)
        if (!stage || typeof stage.commit !== 'function' || typeof stage.rollback !== 'function') {
          throw new Error('invalid rebase stage from participant: ' + participant.id)
        }
        prepared.push(stage)
      }
      for (const stage of prepared) stage.commit()
      this.currentOrigin = { ...next }
      return { changed: true, previous, current: { ...next } }
    } catch (error) {
      const rollbackErrors: unknown[] = []
      for (const stage of prepared.reverse()) {
        try { stage.rollback() } catch (rollbackError) { rollbackErrors.push(rollbackError) }
      }
      if (rollbackErrors.length) {
        throw new AggregateError([error, ...rollbackErrors], 'world rebase failed and one or more participants could not roll back')
      }
      throw error
    }
  }

  private assertOrigin(origin: WorldOrigin): void {
    if (![origin.x, origin.y, origin.z].every(Number.isFinite)) throw new Error('world origin must be finite')
  }
}
