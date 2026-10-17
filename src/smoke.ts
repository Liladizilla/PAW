import { ArcRotateCamera, Color4, Engine, HemisphericLight, MeshBuilder, Scene, Vector3 } from '@babylonjs/core'

type SmokeBridge = { paw?: { desktopSmokeReady?: () => Promise<unknown> } }
const canvas = document.getElementById('smoke-canvas')
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Desktop smoke canvas is missing.')

try {
  const engine = new Engine(canvas, true, { stencil: true, antialias: false })
  const scene = new Scene(engine)
  scene.clearColor = new Color4(0.035, 0.043, 0.055, 1)
  const camera = new ArcRotateCamera('smoke-camera', -Math.PI / 2, Math.PI / 3, 4, Vector3.Zero(), scene)
  camera.attachControl(canvas, false)
  new HemisphericLight('smoke-light', new Vector3(0, 1, 0), scene)
  MeshBuilder.CreateBox('smoke-cube', { size: 1 }, scene)
  engine.runRenderLoop(() => scene.render())
  scene.executeWhenReady(() => {
    const bridge = (window as unknown as SmokeBridge).paw
    if (!bridge?.desktopSmokeReady) {
      console.error('PAW desktop smoke bridge is unavailable.')
      engine.dispose()
      return
    }
    void bridge.desktopSmokeReady()
  })
} catch (error) {
  console.error('PAW desktop smoke renderer failed to initialize:', error)
  throw error
}
