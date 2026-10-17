import test from 'node:test'
import assert from 'node:assert/strict'
import { NullEngine, Scene, TransformNode } from '@babylonjs/core'
import { planAssetRehydration, applySavedEntityRecord } from './asset-rehydration'
import type { SceneEntityRecord } from './scene-snapshot'
import type { AssetCatalogSnapshot } from './asset-catalog'

const asset={id:'station',kind:'mesh' as const,uri:'assets/station.glb',format:'glb',tags:['imported'],importSettings:{}}
const entity=(id:string,assetId?:string,visible=true):SceneEntityRecord=>({
 id,name:'Restored '+id,assetId,visible,
 transform:{position:{x:4098.5,y:2,z:-8190.25},rotation:{x:0,y:.75,z:0},scale:{x:2,y:1.5,z:2}}
})
test('rehydration plan separates resolvable, missing and app-owned entities',()=>{
 const catalog:AssetCatalogSnapshot={schemaVersion:1,revision:1,assets:[asset]}
 const plan=planAssetRehydration([entity('asset:ok','station'),entity('asset:missing','gone'),entity('builder','station'),entity('agent-no-asset')],catalog,['builder'])
 assert.deepEqual(plan.ready.map(x=>[x.entity.id,x.asset.id]),[['asset:ok','station']])
 assert.deepEqual(plan.missing,[{entityId:'asset:missing',assetId:'gone'}])
})
test('saved transform, visibility and world-root projection restore without changing world coordinates',()=>{
 const engine=new NullEngine(),scene=new Scene(engine)
 const worldRoot=new TransformNode('world-root',scene),root=new TransformNode('imported',scene)
 const record=entity('asset:station','station',false)
 try{
  worldRoot.position.set(-4096,0,8192)
  applySavedEntityRecord(root,record,worldRoot)
  scene.render()
  assert.equal(root.parent,worldRoot)
  assert.equal(root.isEnabled(),false)
  assert.equal(root.name,record.name)
  assert.deepEqual(root.position.asArray(),[4098.5,2,-8190.25])
  const absolute=root.getAbsolutePosition()
  assert.ok(Math.abs(absolute.x-2.5)<1e-3)
  assert.ok(Math.abs(absolute.y-2)<1e-3)
  assert.ok(Math.abs(absolute.z-1.75)<1e-3)
  assert.equal(root.metadata.entityId,record.id)
  assert.equal(root.metadata.assetId,'station')
 }finally{scene.dispose();engine.dispose()}
})
