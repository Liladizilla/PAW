import '@babylonjs/loaders/glTF'
import { SceneLoader, TransformNode, type Scene } from '@babylonjs/core'
import type { AssetLoader } from './asset-importer'

/** Real GLTF/GLB loader; external files resolve through the privileged paw-workspace scheme. */
export function createBabylonAssetLoader(scene: Scene): AssetLoader<TransformNode> {
  return async (location, asset) => {
    const imported = await SceneLoader.ImportMeshAsync('', location.rootUrl, location.fileName, scene)
    const root = new TransformNode('asset:' + asset.id, scene)
    for (const mesh of imported.meshes) mesh.parent = root
    for (const node of imported.transformNodes) if (node !== root) node.parent = root
    root.metadata = { assetId: asset.id, assetKind: asset.kind, sourceUri: asset.uri }
    let disposed = false
    return {
      value: root,
      dispose: () => {
        if (disposed) return
        disposed = true
        root.dispose(false, true)
        for (const group of imported.animationGroups) group.dispose()
        for (const skeleton of imported.skeletons) skeleton.dispose()
        for (const system of imported.particleSystems) system.dispose()
        for (const light of imported.lights) light.dispose()
      }
    }
  }
}
