export type SpatialPoint={x:number;z:number}
export type SpatialEntry<T>={id:string;point:SpatialPoint;value:T}
/** Uniform-grid broadphase helper, not a physics solver. */
export class SpatialIndex<T>{
 private cells=new Map<string,Map<string,SpatialEntry<T>>>()
 private byId=new Map<string,{key:string;entry:SpatialEntry<T>}>()
 constructor(readonly cellSize=4){if(!Number.isFinite(cellSize)||cellSize<=0)throw Error('cellSize must be positive')}
 private cell(p:SpatialPoint){const x=Math.floor(p.x/this.cellSize),z=Math.floor(p.z/this.cellSize);return {key:`${x},${z}`}}
 set(id:string,point:SpatialPoint,value:T):void{
  if(!id.trim()||!Number.isFinite(point.x)||!Number.isFinite(point.z))throw Error('entry requires an ID and finite position')
  this.delete(id);const {key}=this.cell(point),entry={id,point:{...point},value},bucket=this.cells.get(key)??new Map<string,SpatialEntry<T>>()
  bucket.set(id,entry);this.cells.set(key,bucket);this.byId.set(id,{key,entry})
 }
 delete(id:string):boolean{const old=this.byId.get(id);if(!old)return false;const b=this.cells.get(old.key);b?.delete(id);if(!b?.size)this.cells.delete(old.key);this.byId.delete(id);return true}
 get(id:string):SpatialEntry<T>|undefined{const e=this.byId.get(id)?.entry;return e?{...e,point:{...e.point}}:undefined}
 query(center:SpatialPoint,radius:number):SpatialEntry<T>[]{
  if(!Number.isFinite(center.x)||!Number.isFinite(center.z)||!Number.isFinite(radius)||radius<0)throw Error('query requires finite coordinates and non-negative radius')
  const minX=Math.floor((center.x-radius)/this.cellSize),maxX=Math.floor((center.x+radius)/this.cellSize),minZ=Math.floor((center.z-radius)/this.cellSize),maxZ=Math.floor((center.z+radius)/this.cellSize),r2=radius*radius,out:SpatialEntry<T>[]=[]
  for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++)for(const e of this.cells.get(`${x},${z}`)?.values()??[])if((e.point.x-center.x)**2+(e.point.z-center.z)**2<=r2)out.push({...e,point:{...e.point}})
  return out.sort((a,b)=>a.id.localeCompare(b.id))
 }
 get size(){return this.byId.size}
 clear(){this.cells.clear();this.byId.clear()}
}