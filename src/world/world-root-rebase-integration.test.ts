import test from 'node:test'
import assert from 'node:assert/strict'
import { NullEngine, Scene, TransformNode, Vector3 } from '@babylonjs/core'
import { createCameraTargetRebaseParticipant } from './camera-target-rebase-participant'
import { pedestrianStateToRender, pedestrianStateToWorld } from './pedestrian-coordinates'
import { WorldOriginCoordinator } from './world-origin-coordinator'
import { createWorldRootRebaseParticipant } from './world-root-rebase-participant'
import { renderToWorld, worldToRender } from './world-origin'

test('world-root projection preserves imported entity and pedestrian world data across repeated rebases', () => {
  const engine = new NullEngine(), scene = new Scene(engine)
  const root = new TransformNode('world-root', scene)
  const importedAsset = new TransformNode('restored-imported-asset', scene)
  importedAsset.parent = root
  const entityWorldPosition = { x: 12012.5, y: 3, z: -8030.25 }
  importedAsset.position.set(entityWorldPosition.x, entityWorldPosition.y, entityWorldPosition.z)
  const camera = { target: new Vector3(0, 12, 0) }
  const coordinator = new WorldOriginCoordinator()
  coordinator.register(createWorldRootRebaseParticipant('world-root', () => root))
  coordinator.register(createCameraTargetRebaseParticipant('camera-target', () => camera))
  const pedestrianWorld = {
    position: { x: 12014, y: 0, z: -8028 },
    route: [{ x: 12032, y: 0, z: -8000 }, { x: 12064, y: 0, z: -7968 }]
  }
  const destinations = [
    { x: 2700, y: 12, z: -2700 },
    { x: 6200, y: 12, z: 6100 },
    { x: -6400, y: 12, z: 6500 },
    { x: 12288, y: 12, z: -8192 },
    { x: -16384, y: 12, z: 16384 }
  ]

  try {
    for (const focus of destinations) {
      camera.target.copyFrom(Vector3.FromArray([
        worldToRender(focus, coordinator.origin).x,
        worldToRender(focus, coordinator.origin).y,
        worldToRender(focus, coordinator.origin).z
      ]))
      coordinator.rebase(focus, 64, 2048)
      root.computeWorldMatrix(true)
      importedAsset.computeWorldMatrix(true)

      const expectedRender = worldToRender(entityWorldPosition, coordinator.origin)
      const actualRender = importedAsset.getAbsolutePosition()
      assert.ok(Math.abs(actualRender.x - expectedRender.x) < 1e-6)
      assert.ok(Math.abs(actualRender.y - expectedRender.y) < 1e-6)
      assert.ok(Math.abs(actualRender.z - expectedRender.z) < 1e-6)
      assert.deepEqual(renderToWorld(
        { x: actualRender.x, y: actualRender.y, z: actualRender.z },
        coordinator.origin
      ), entityWorldPosition)

      const pedestrianRender = pedestrianStateToRender(pedestrianWorld, coordinator.origin)
      assert.deepEqual(pedestrianStateToWorld(pedestrianRender, coordinator.origin), pedestrianWorld)
      assert.deepEqual(importedAsset.position.asArray(), [
        entityWorldPosition.x, entityWorldPosition.y, entityWorldPosition.z
      ])
    }
  } finally {
    scene.dispose()
    engine.dispose()
  }
})

test('traffic simulation coordinates stay authoritative while vehicle meshes inherit root projection', () => {
  const engine = new NullEngine(), scene = new Scene(engine)
  const root = new TransformNode('world-root', scene)
  const body = new TransformNode('traffic-body', scene), cabin = new TransformNode('traffic-cabin', scene)
  body.parent = root; cabin.parent = root
  const vehicle = { axis: 'x' as const, coordinate: 12290, lane: -2.4 }
  body.position.set(vehicle.coordinate, .38, vehicle.lane)
  cabin.position.set(vehicle.coordinate, .75, vehicle.lane)
  const coordinator = new WorldOriginCoordinator()
  coordinator.register(createWorldRootRebaseParticipant('world-root', () => root))
  const originalCoordinate = vehicle.coordinate
  const originalBody = body.position.asArray(), originalCabin = cabin.position.asArray()
  try {
    for (const focus of [
      { x: 2700, y: 0, z: -2700 },
      { x: -6400, y: 0, z: 6500 },
      { x: 12288, y: 0, z: -8192 },
      { x: -16384, y: 0, z: 16384 }
    ]) {
      coordinator.rebase(focus, 64, 2048)
      root.computeWorldMatrix(true); body.computeWorldMatrix(true); cabin.computeWorldMatrix(true)
      assert.equal(vehicle.coordinate, originalCoordinate)
      assert.deepEqual(body.position.asArray(), originalBody)
      assert.deepEqual(cabin.position.asArray(), originalCabin)
      const bodyWorld = body.getAbsolutePosition()
      const bodyInWorld = renderToWorld(
        { x: bodyWorld.x, y: bodyWorld.y, z: bodyWorld.z }, coordinator.origin
      )
      assert.ok(Math.abs(bodyInWorld.x - originalCoordinate) < 1e-6)
      // Babylon stores local transforms in Float32-backed matrices, so allow sub-millimeter drift.
      assert.ok(Math.abs(bodyInWorld.y - .38) < 1e-3)
      assert.ok(Math.abs(bodyInWorld.z - vehicle.lane) < 1e-3)
    }
  } finally {
    scene.dispose()
    engine.dispose()
  }
})
