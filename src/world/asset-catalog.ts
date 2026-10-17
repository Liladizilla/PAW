export const ASSET_CATALOG_SCHEMA_VERSION=1 as const
export type AssetKind='mesh'|'material'|'texture'|'audio'|'scene'|'prefab'
export type AssetRecord={id:string;kind:AssetKind;uri:string;format:string;contentHash?:string;bounds?:{min:{x:number;y:number;z:number};max:{x:number;y:number;z:number}};tags:string[];importSettings:Record<string,string|number|boolean>}
export type AssetCatalogSnapshot={schemaVersion:typeof ASSET_CATALOG_SCHEMA_VERSION;revision:number;assets:AssetRecord[]}
export function validateAssetCatalog(value:unknown):{valid:boolean;issues:string[]}{
 const issues:string[]=[];if(!value||typeof value!=='object')return {valid:false,issues:['catalog must be an object']}
 const c=value as Partial<AssetCatalogSnapshot>;if(c.schemaVersion!==1)issues.push('unsupported asset catalog schema');if(!Number.isInteger(c.revision)||(c.revision??-1)<0)issues.push('revision must be non-negative integer')
 if(!Array.isArray(c.assets))return {valid:false,issues:[...issues,'assets must be an array']}
 const ids=new Set<string>()
 for(const [i,item] of c.assets.entries()){
  if(!item||typeof item!=='object'){issues.push(`assets[${i}] must be an object`);continue}
  const a=item as AssetRecord
  if(typeof a.id!=='string'||!a.id.trim())issues.push(`assets[${i}] has empty ID`);else if(ids.has(a.id))issues.push(`duplicate asset ID: ${a.id}`);else ids.add(a.id)
  if(!['mesh','material','texture','audio','scene','prefab'].includes(a.kind))issues.push(`assets[${i}] has unsupported kind`)
  if(typeof a.uri!=='string'||!a.uri.trim())issues.push(`assets[${i}] has empty URI`);else if(/^(https?:|file:|javascript:)/i.test(a.uri)||a.uri.split(/[\\/]/).includes('..'))issues.push(`assets[${i}] URI must be workspace-relative and traversal-free`)
  if(typeof a.format!=='string'||!a.format.trim())issues.push(`assets[${i}] has no format`)
  if(!Array.isArray(a.tags)||!a.tags.every(t=>typeof t==='string'))issues.push(`assets[${i}] tags must be strings`)
  if(!a.importSettings||typeof a.importSettings!=='object'||Array.isArray(a.importSettings))issues.push(`assets[${i}] import settings must be an object`)
  if(a.bounds){const v=[a.bounds.min,a.bounds.max];if(!v.every(p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k as 'x'|'y'|'z']))))issues.push(`assets[${i}] has invalid bounds`);else if(a.bounds.min.x>a.bounds.max.x||a.bounds.min.y>a.bounds.max.y||a.bounds.min.z>a.bounds.max.z)issues.push(`assets[${i}] bounds are inverted`)}
 }
 return {valid:issues.length===0,issues}
}
/** Adds or replaces one record and advances the catalog revision only after validation. */
export function upsertAssetCatalog(snapshot: AssetCatalogSnapshot | undefined, asset: AssetRecord): AssetCatalogSnapshot {
 const current: AssetCatalogSnapshot = snapshot ?? { schemaVersion: ASSET_CATALOG_SCHEMA_VERSION, revision: 0, assets: [] }
 const before = validateAssetCatalog(current)
 if (!before.valid) throw new Error('invalid asset catalog: ' + before.issues.join('; '))
 const next: AssetCatalogSnapshot = {
  schemaVersion: ASSET_CATALOG_SCHEMA_VERSION,
  revision: current.revision + 1,
  assets: [...current.assets.filter(item => item.id !== asset.id), asset]
 }
 const result = validateAssetCatalog(next)
 if (!result.valid) throw new Error('asset rejected: ' + result.issues.join('; '))
 return next
}
