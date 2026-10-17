export const WORLD_CHUNK_SCHEMA_VERSION=1 as const
export type WorldChunkCoord={x:number;z:number}
export type WorldChunkManifest={schemaVersion:typeof WORLD_CHUNK_SCHEMA_VERSION;worldId:string;chunkSize:number;seed:number;revision:number}
export type WorldChunk={id:string;coord:WorldChunkCoord;minX:number;maxX:number;minZ:number;maxZ:number;distanceSquared:number}
export function chunkId(c:WorldChunkCoord):string{return `chunk:${c.x}:${c.z}`}
export function worldToChunk(p:{x:number;z:number},size:number):WorldChunkCoord{
 if(!Number.isFinite(p.x)||!Number.isFinite(p.z))throw Error('world position must be finite')
 if(!Number.isFinite(size)||size<=0)throw Error('chunkSize must be positive')
 return {x:Math.floor(p.x/size),z:Math.floor(p.z/size)}
}
export function chunksAround(p:{x:number;z:number},size:number,radius:number):WorldChunk[]{
 if(!Number.isInteger(radius)||radius<0||radius>32)throw Error('radius must be an integer between 0 and 32')
 const center=worldToChunk(p,size),out:WorldChunk[]=[]
 for(let x=center.x-radius;x<=center.x+radius;x++)for(let z=center.z-radius;z<=center.z+radius;z++){
  const minX=x*size,minZ=z*size,cx=minX+size/2,cz=minZ+size/2
  out.push({id:chunkId({x,z}),coord:{x,z},minX,maxX:minX+size,minZ,maxZ:minZ+size,distanceSquared:(cx-p.x)**2+(cz-p.z)**2})
 }
 return out.sort((a,b)=>a.distanceSquared-b.distanceSquared||a.coord.x-b.coord.x||a.coord.z-b.coord.z)
}
export function validateChunkManifest(v:unknown):v is WorldChunkManifest{
 if(!v||typeof v!=='object')return false
 const m=v as Partial<WorldChunkManifest>
 return m.schemaVersion===1&&typeof m.worldId==='string'&&!!m.worldId.trim()&&Number.isFinite(m.chunkSize)&&(m.chunkSize??0)>=16&&Number.isInteger(m.seed)&&Number.isInteger(m.revision)&&(m.revision??-1)>=0
}