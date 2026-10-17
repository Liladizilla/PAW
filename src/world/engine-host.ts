import { ArcRotateCamera, Engine, Scene, Vector3 } from '@babylonjs/core'

export type EngineHost = {
  engine: Engine
  scene: Scene
  camera: ArcRotateCamera
  resize: () => void
  dispose: () => void
}

/** Owns renderer, scene, camera and resize lifecycle independently of React UI. */
export function createEngineHost(canvas: HTMLCanvasElement): EngineHost {
  const engine = new Engine(canvas, true, { adaptToDeviceRatio: true, stencil: true })
  const scene = new Scene(engine)
  scene.clearColor.set(.035, .043, .055, 1)
  const camera = new ArcRotateCamera('camera', -Math.PI / 2.2, 1.04, 185, Vector3.Zero(), scene)
  camera.attachControl(canvas, true)
  camera.lowerRadiusLimit = 10
  camera.upperRadiusLimit = 1400
  camera.wheelPrecision = 42
  camera.panningSensibility = 85
  camera.inertia = .84
  const resize = () => engine.resize()
  let disposed = false
  return {
    engine, scene, camera, resize,
    dispose: () => {
      if (disposed) return
      disposed = true
      engine.stopRenderLoop()
      scene.dispose()
      engine.dispose()
    }
  }
}
