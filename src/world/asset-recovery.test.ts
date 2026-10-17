import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectAssetAvailability } from './asset-recovery'
import type { AssetCatalogSnapshot } from './asset-catalog'

const catalog:AssetCatalogSnapshot={schemaVersion:1,revision:2,assets:[
 {id:'present',kind:'mesh',uri:'assets/present.glb',format:'glb',tags:[],importSettings:{}},
 {id:'deleted',kind:'mesh',uri:'assets/deleted.glb',format:'glb',tags:[],importSettings:{}},
 {id:'unreadable',kind:'mesh',uri:'assets/permission.glb',format:'glb',tags:[],importSettings:{}}
]}
test('asset recovery distinguishes available, deleted and unreadable files without aborting the catalog scan',async()=>{
 const result=await inspectAssetAvailability(catalog,async asset=>{
  if(asset.id==='unreadable')throw new Error('permission denied')
  return asset.id==='present'
 })
 assert.deepEqual(result,[
  {assetId:'present',uri:'assets/present.glb',available:true},
  {assetId:'deleted',uri:'assets/deleted.glb',available:false,reason:'missing'},
  {assetId:'unreadable',uri:'assets/permission.glb',available:false,reason:'unreadable'}
 ])
})
test('asset recovery probes every asset even after an earlier probe fails',async()=>{
 const visited:string[]=[]
 await inspectAssetAvailability(catalog,async asset=>{visited.push(asset.id);if(asset.id==='deleted')throw Error('failed');return true})
 assert.deepEqual(visited,['present','deleted','unreadable'])
})
