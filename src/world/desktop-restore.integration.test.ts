import test from 'node:test'
import assert from 'node:assert/strict'
import { loadStoredSceneSnapshot, saveStoredSceneSnapshot, type SnapshotStorage } from './scene-snapshot-store'
import { validateAssetCatalog, type AssetCatalogSnapshot } from './asset-catalog'
import { inspectAssetAvailability } from './asset-recovery'
import type { SceneSnapshot } from './scene-snapshot'

class RestartStorage implements SnapshotStorage {
 values = new Map<string,string>()
 getItem(key:string){return this.values.get(key)??null}
 setItem(key:string,value:string){this.values.set(key,value)}
 removeItem(key:string){this.values.delete(key)}
}
test('restart-shaped restore joins world-space entity snapshot to catalog and detects missing model files',async()=>{
 const firstLaunch=new RestartStorage()
 const snapshot:SceneSnapshot={
  schemaVersion:3,worldId:'paw-main-world',savedAt:'2026-10-17T00:00:00.000Z',
  worldOrigin:{x:16384,y:0,z:-8192},
  camera:{alpha:1.2,beta:1.1,radius:65,target:{x:16400,y:10,z:-8170}},
  loadedChunkIds:['chunk:256:-128'],
  entities:[{id:'asset:vehicle',name:'Imported vehicle',assetId:'vehicle-model',visible:false,
   transform:{position:{x:16402,y:1.5,z:-8174},rotation:{x:0,y:1.2,z:0},scale:{x:1.5,y:1.5,z:1.5}}}],
  metadata:{engine:'babylonjs'}
 }
 const catalog:AssetCatalogSnapshot={schemaVersion:1,revision:1,assets:[
  {id:'vehicle-model',kind:'mesh',uri:'assets/vehicle.glb',format:'glb',tags:['imported'],importSettings:{}}
 ]}
 saveStoredSceneSnapshot(firstLaunch,snapshot)
 firstLaunch.setItem('paw.asset.catalog.v1',JSON.stringify(catalog))
 // Simulate the application closing and a fresh process reading persistent storage.
 const secondLaunch=new RestartStorage()
 secondLaunch.values=new Map(firstLaunch.values)
 const restored=loadStoredSceneSnapshot(secondLaunch)
 assert.ok(restored)
 assert.deepEqual(restored.worldOrigin,snapshot.worldOrigin)
 assert.deepEqual(restored.camera,snapshot.camera)
 assert.deepEqual(restored.entities[0],snapshot.entities[0])
 const rawCatalog=secondLaunch.getItem('paw.asset.catalog.v1')
 assert.ok(rawCatalog)
 const decoded=JSON.parse(rawCatalog)
 assert.equal(validateAssetCatalog(decoded).valid,true)
 const availability=await inspectAssetAvailability(decoded,async asset=>asset.uri!=='assets/vehicle.glb')
 assert.deepEqual(availability,[{assetId:'vehicle-model',uri:'assets/vehicle.glb',available:false,reason:'missing'}])
})
