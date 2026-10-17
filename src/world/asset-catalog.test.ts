import test from 'node:test'
import assert from 'node:assert/strict'
import {validateAssetCatalog} from './asset-catalog'
const asset={id:'mesh:station',kind:'mesh',uri:'assets/station.glb',format:'glb',tags:['building'],importSettings:{scale:1,collisions:true},bounds:{min:{x:-1,y:0,z:-1},max:{x:1,y:4,z:1}}}
test('catalog accepts workspace-relative asset records',()=>assert.equal(validateAssetCatalog({schemaVersion:1,revision:0,assets:[asset]}).valid,true))
test('catalog rejects duplicate IDs, unsafe URIs and inverted bounds',()=>{const r=validateAssetCatalog({schemaVersion:1,revision:0,assets:[asset,{...asset,uri:'assets/../../secret',bounds:{min:{x:3,y:0,z:0},max:{x:1,y:1,z:1}}}]});assert.equal(r.valid,false);assert.ok(r.issues.some(x=>x.includes('duplicate asset ID')));assert.ok(r.issues.some(x=>x.includes('workspace-relative')));assert.ok(r.issues.some(x=>x.includes('inverted')))})
test('catalog rejects unsupported schema versions',()=>assert.equal(validateAssetCatalog({schemaVersion:9,revision:0,assets:[]}).valid,false))
import { upsertAssetCatalog, type AssetRecord } from './asset-catalog'
const simpleAsset: AssetRecord = { id:'model-a', kind:'mesh', uri:'assets/model-a.glb', format:'glb', tags:['imported'], importSettings:{} }
test('catalog upsert adds assets and advances revision',()=>{const next=upsertAssetCatalog(undefined,simpleAsset);assert.equal(next.revision,1);assert.deepEqual(next.assets,[simpleAsset])})
test('catalog upsert replaces a matching ID without duplicates',()=>{const first=upsertAssetCatalog(undefined,simpleAsset);const next=upsertAssetCatalog(first,{...simpleAsset,tags:['updated']});assert.equal(next.revision,2);assert.equal(next.assets.length,1);assert.deepEqual(next.assets[0].tags,['updated'])})
test('catalog upsert rejects unsafe records without mutating the prior snapshot',()=>{const first=upsertAssetCatalog(undefined,simpleAsset);assert.throws(()=>upsertAssetCatalog(first,{...simpleAsset,id:'bad',uri:'assets/../escape.glb'}));assert.equal(first.revision,1);assert.equal(first.assets.length,1)})
