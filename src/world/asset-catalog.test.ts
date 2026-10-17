import test from 'node:test'
import assert from 'node:assert/strict'
import {validateAssetCatalog} from './asset-catalog'
const asset={id:'mesh:station',kind:'mesh',uri:'assets/station.glb',format:'glb',tags:['building'],importSettings:{scale:1,collisions:true},bounds:{min:{x:-1,y:0,z:-1},max:{x:1,y:4,z:1}}}
test('catalog accepts workspace-relative asset records',()=>assert.equal(validateAssetCatalog({schemaVersion:1,revision:0,assets:[asset]}).valid,true))
test('catalog rejects duplicate IDs, unsafe URIs and inverted bounds',()=>{const r=validateAssetCatalog({schemaVersion:1,revision:0,assets:[asset,{...asset,uri:'assets/../../secret',bounds:{min:{x:3,y:0,z:0},max:{x:1,y:1,z:1}}}]});assert.equal(r.valid,false);assert.ok(r.issues.some(x=>x.includes('duplicate asset ID')));assert.ok(r.issues.some(x=>x.includes('workspace-relative')));assert.ok(r.issues.some(x=>x.includes('inverted')))})
test('catalog rejects unsupported schema versions',()=>assert.equal(validateAssetCatalog({schemaVersion:9,revision:0,assets:[]}).valid,false))