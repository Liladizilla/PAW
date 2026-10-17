import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Boxes, BrainCircuit, Cpu, KeyRound, Layers3, Maximize2, Network, RotateCcw, Search, Send, Settings2, ShieldCheck, TerminalSquare, Workflow } from 'lucide-react'
import { Color3, Curve3, DirectionalLight, HemisphericLight, Matrix, Mesh, MeshBuilder, PBRMaterial, Quaternion, StandardMaterial, Vector3 } from '@babylonjs/core'
import { createEngineHost } from './world/engine-host'
import { createCityChunkStreamer } from './world/streamed-city'
import { SpatialIndex } from './world/spatial-index'
import { decodeSceneSnapshot, encodeSceneSnapshot } from './world/scene-snapshot'
import { demoGraph } from './runtime/demo-graph'
import { generateCityLots } from './world/city-layout'

type Agent = { id:string; name:string; role:string; color:string; x:number; z:number; state:string; task:string }
type RunRecord = Awaited<ReturnType<typeof window.paw.createRun>>
type HistoryRecord = Awaited<ReturnType<typeof window.paw.listHistory>>[number]
const agents:Agent[] = [
  {id:'orchestrator',name:'ORCHESTRATOR',role:'Team coordinator',color:'#d5e5ff',x:0,z:0,state:'READY',task:'Waiting for a real runtime connection'},
  {id:'research',name:'RESEARCH UNIT',role:'Research agent',color:'#a6a5ff',x:-5,z:-2.5,state:'IDLE',task:'No task assigned'},
  {id:'builder',name:'BUILD ENGINE',role:'Coding agent',color:'#5de0c2',x:4.5,z:-2,state:'IDLE',task:'No task assigned'},
  {id:'validator',name:'VALIDATOR',role:'Testing agent',color:'#ffbd78',x:.5,z:4,state:'IDLE',task:'No task assigned'}
]
function World({onSelect,selected,cameraControl}:{onSelect:(id:string)=>void;selected:string;cameraControl:{current:{focus:(id:string)=>void;reset:()=>void}|null}}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  const selectedRef=useRef(selected)
  selectedRef.current=selected
  useEffect(()=>{
    if(!canvas.current)return
    const host=createEngineHost(canvas.current)
    const {engine,scene,camera}=host
    const cityStreamer=createCityChunkStreamer(scene)
    try{
      const saved=localStorage.getItem('paw.scene.snapshot.v1')
      if(saved){
        const snapshot=decodeSceneSnapshot(saved)
        camera.alpha=snapshot.camera.alpha;camera.beta=snapshot.camera.beta;camera.radius=snapshot.camera.radius
        camera.target.set(snapshot.camera.target.x,snapshot.camera.target.y,snapshot.camera.target.z)
      }
    }catch{localStorage.removeItem('paw.scene.snapshot.v1')}
    cameraControl.current={
      focus:(id:string)=>{const agent=agents.find(item=>item.id===id);if(!agent)return;camera.target=new Vector3(agent.x,.8,agent.z);camera.radius=13},
      reset:()=>{camera.target=Vector3.Zero();camera.alpha=-Math.PI/2.2;camera.beta=1.04;camera.radius=185}
    }
    new HemisphericLight('ambient',new Vector3(.1,1,.1),scene).intensity=.9
    const sun=new DirectionalLight('city-sun',new Vector3(-.45,-1,.35),scene);sun.position=new Vector3(-18,32,-16);sun.intensity=.72
    const material=(name:string,color:string,emissive?:string)=>{
      const mat=new StandardMaterial(name,scene);mat.diffuseColor=Color3.FromHexString(color);if(emissive)mat.emissiveColor=Color3.FromHexString(emissive);return mat
    }
    const groundMat=material('city-ground-mat','#343631')
    const groundTile=(name:string,x:number,z:number,width:number,depth:number)=>{
      const tile=MeshBuilder.CreateGround(name,{width,height:depth},scene);tile.position.set(x,0,z);tile.material=groundMat
    }
    // Leave a physical opening in the street surface so the underground station is visible.
    groundTile('city-ground-west',-19.6,0,32.8,72)
    groundTile('city-ground-east',19.6,0,32.8,72)
    groundTile('city-ground-north',0,-13.85,72,44.3)
    groundTile('city-ground-south',0,26.65,72,18.7)
    // A central opening preserves the visible metro cutaway while the world floor extends far past the camera.
    groundTile('world-ground-west',-1018,0,1964,4000)
    groundTile('world-ground-east',1018,0,1964,4000)
    groundTile('world-ground-north',0,-1018,72,1964)
    groundTile('world-ground-south',0,1018,72,1964)
    const asphalt=material('street-asphalt','#222522')
    const pavement=material('pavement','#55554e')
    const lanePaint=material('lane-paint','#c4b58f')
    const glass=material('building-glass','#65716e','#202d2b')
    const warmGlass=material('warm-window-light','#9b8159','#463720')
    const concrete=material('station-concrete','#55534b')
    const dark=material('station-dark','#171a19')
    const road=(name:string,x:number,z:number,width:number,depth:number)=>{
      const mesh=MeshBuilder.CreateBox(name,{width,height:.09,depth},scene);mesh.position.set(x,.045,z);mesh.material=asphalt
    }
    const sidewalk=(name:string,x:number,z:number,width:number,depth:number)=>{
      const mesh=MeshBuilder.CreateBox(name,{width,height:.16,depth},scene);mesh.position.set(x,.08,z);mesh.material=pavement
    }
    // Continuous arterial roads and sidewalks repeat beyond the viewport; the camera never opens on a tiny island.
    for(let coordinate=-320;coordinate<=320;coordinate+=32){
      road('world-road-vertical-'+coordinate,coordinate,0,6,2400)
      road('world-road-horizontal-'+coordinate,0,coordinate,2400,6)
      sidewalk('world-walk-vertical-west-'+coordinate,coordinate-3.65,0,1.25,2400)
      sidewalk('world-walk-vertical-east-'+coordinate,coordinate+3.65,0,1.25,2400)
      sidewalk('world-walk-horizontal-north-'+coordinate,0,coordinate-3.65,2400,1.25)
      sidewalk('world-walk-horizontal-south-'+coordinate,0,coordinate+3.65,2400,1.25)
    }
    // A legible street grid: asphalt, raised pavements, curbs and dashed lane markings.
    road('north-south-avenue-north',0,-14.1,5.2,39.8);road('north-south-avenue-south',0,26.75,5.2,18.5)
    road('east-west-avenue',0,0,68,5.2)
    sidewalk('west-walk-north',-3.35,-14.1,1.25,39.8);sidewalk('west-walk-south',-3.35,26.75,1.25,18.5)
    sidewalk('east-walk-north',3.35,-14.1,1.25,39.8);sidewalk('east-walk-south',3.35,26.75,1.25,18.5)
    sidewalk('north-walk',0,-3.35,68,1.25);sidewalk('south-walk',0,3.35,68,1.25)
    for(let p=-30;p<=30;p+=4){
      if(Math.abs(p)>5){
        if(p<6||p>18){const v=MeshBuilder.CreateBox('north-lane-'+p,{width:.12,height:.018,depth:1.8},scene);v.position.set(0,.101,p);v.material=lanePaint}
        const h=MeshBuilder.CreateBox('east-lane-'+p,{width:1.8,height:.018,depth:.12},scene);h.position.set(p,.101,0);h.material=lanePaint
      }
    }
    // Crosswalks at the central intersection.
    for(let i=0;i<7;i++){
      const stripeA=MeshBuilder.CreateBox('crosswalk-n-'+i,{width:.34,height:.025,depth:1.5},scene);stripeA.position.set(-2.1+i*.7,.112,-3.9);stripeA.material=lanePaint
      const stripeB=MeshBuilder.CreateBox('crosswalk-s-'+i,{width:.34,height:.025,depth:1.5},scene);stripeB.position.set(-2.1+i*.7,.112,3.9);stripeB.material=lanePaint
      const stripeC=MeshBuilder.CreateBox('crosswalk-e-'+i,{width:1.5,height:.025,depth:.34},scene);stripeC.position.set(3.9,.112,-2.1+i*.7);stripeC.material=lanePaint
      const stripeD=MeshBuilder.CreateBox('crosswalk-w-'+i,{width:1.5,height:.025,depth:.34},scene);stripeD.position.set(-3.9,.112,-2.1+i*.7);stripeD.material=lanePaint
    }
    const makeBuilding=(id:string,x:number,z:number,width:number,depth:number,height:number,facade:string,floors:number)=>{
      const shell=MeshBuilder.CreateBox(id+'-structure',{width,height,depth},scene);shell.position.set(x,height/2+.16,z);shell.material=material(id+'-facade',facade)
      const roof=MeshBuilder.CreateBox(id+'-roof',{width:width+.18,height:.22,depth:depth+.18},scene);roof.position.set(x,height+.27,z);roof.material=material(id+'-roof-mat','#45453f')
      const windowRows=Math.max(2,floors)
      const cols=Math.max(2,Math.floor(width/1.35))
      for(let row=0;row<windowRows;row++){
        const y=.85+row*(height-.9)/windowRows
        for(let col=0;col<cols;col++){
          const wx=x-width/2+.7+col*(width-1.1)/Math.max(1,cols-1)
          const front=MeshBuilder.CreateBox(id+'-front-window-'+row+'-'+col,{width:.48,height:.48,depth:.055},scene)
          front.position.set(wx,y,z-depth/2-.035);front.material=((row+col)%4===0)?warmGlass:glass
          const side=MeshBuilder.CreateBox(id+'-side-window-'+row+'-'+col,{width:.055,height:.48,depth:.48},scene)
          side.position.set(x+width/2+.035,y,z-depth/2+.65+col*(depth-1.3)/Math.max(1,cols-1));side.material=((row+col)%5===0)?warmGlass:glass
        }
      }
      const door=MeshBuilder.CreateBox(id+'-entrance',{width:1.05,height:1.65,depth:.09},scene);door.position.set(x,.98,z-depth/2-.09);door.material=material(id+'-door','#252b29')
      const canopy=MeshBuilder.CreateBox(id+'-canopy',{width:width*.62,height:.12,depth:.85},scene);canopy.position.set(x,2,z-depth/2-.35);canopy.material=material(id+'-canopy-mat','#8b7959')
    }
    // Real architectural massing gives every district a physical address in the city.
    makeBuilding('research-hall',-14,-14,8.2,8.5,10,'#69675e',6)
    makeBuilding('engineering-works',14,-14,8.5,8.5,13,'#565b58',8)
    makeBuilding('review-house',14,14,8.5,8.2,8,'#777166',5)
    makeBuilding('archive-library',-14,14,8.2,8.5,7,'#625f56',4)
    makeBuilding('operations-tower',-26,-14,6.8,8.5,17,'#494f4c',10)
    makeBuilding('data-centre',26,-14,7.2,8.5,11,'#4a514f',6)
    makeBuilding('workshop-annex',26,14,7.2,8.2,6,'#70695c',3)
    makeBuilding('planning-office',-26,14,6.8,8.2,9,'#5d625d',5)
    // Seeded procedural lots add varied towers, slabs, stepped buildings, cylindrical forms and open courtyards.
    const proceduralLots=generateCityLots(320,4107)
    const proceduralMaterials=new Map<string,StandardMaterial>()
    const cityMaterial=(key:string,color:string)=>{
      const cached=proceduralMaterials.get(key)
      if(cached)return cached
      const created=material('procedural-'+key,color);proceduralMaterials.set(key,created);return created
    }
    for(const lot of proceduralLots){
      const y=lot.height/2+.16
      const facade=cityMaterial('facade-'+lot.facade,lot.facade)
      const roofMat=cityMaterial('roof','#45453f')
      if(lot.shape==='cylinder'){
        const shell=MeshBuilder.CreateCylinder(lot.id+'-shell',{height:lot.height,diameter:Math.min(lot.width,lot.depth),tessellation:12},scene)
        shell.position.set(lot.x,y,lot.z);shell.material=facade
      }else if(lot.shape==='courtyard'){
        const wall=Math.min(1.7,lot.width*.14,lot.depth*.14)
        const parts:[number,number,number,number,number,number][]=[
          [lot.width,lot.height,wall,lot.x,y,lot.z-lot.depth/2+wall/2],
          [lot.width,lot.height,wall,lot.x,y,lot.z+lot.depth/2-wall/2],
          [wall,lot.height,lot.depth-2*wall,lot.x-lot.width/2+wall/2,y,lot.z],
          [wall,lot.height,lot.depth-2*wall,lot.x+lot.width/2-wall/2,y,lot.z]
        ]
        parts.forEach(([width,height,depth,x,py,z],i)=>{const wallMesh=MeshBuilder.CreateBox(lot.id+'-courtyard-wall-'+i,{width,height,depth},scene);wallMesh.position.set(x,py,z);wallMesh.material=facade})
        const floor=MeshBuilder.CreateGround(lot.id+'-courtyard-floor',{width:lot.width-wall*2,height:lot.depth-wall*2},scene);floor.position.set(lot.x,lot.height+.17,lot.z);floor.material=cityMaterial('courtyard-floor','#343832')
      }else{
        const shell=MeshBuilder.CreateBox(lot.id+'-shell',{width:lot.width,height:lot.height,depth:lot.depth},scene)
        shell.position.set(lot.x,y,lot.z);shell.material=facade
        if(lot.shape==='stepped'){
          const tierHeight=lot.height*.28
          const tier=MeshBuilder.CreateBox(lot.id+'-upper-tier',{width:lot.width*.68,height:tierHeight,depth:lot.depth*.72},scene)
          tier.position.set(lot.x,lot.height-tierHeight/2+.16,lot.z);tier.material=facade
        }
      }
      const roof=MeshBuilder.CreateBox(lot.id+'-roof',{width:lot.width+.16,height:.18,depth:lot.depth+.16},scene)
      roof.position.set(lot.x,lot.height+.27,lot.z);roof.material=roofMat
      // Fine facade detail is limited to nearby blocks; distant skyline geometry stays cheap.
      if(Math.hypot(lot.x,lot.z)<88&&(lot.shape==='tower'||lot.shape==='slab')){
        const rows=Math.min(6,Math.max(2,lot.floors)),cols=Math.min(5,Math.max(2,Math.floor(lot.width/2.2)))
        for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
          const wx=lot.x-lot.width/2+.8+col*(lot.width-1.4)/Math.max(1,cols-1)
          const wy=.8+row*(lot.height-.8)/rows
          const window=MeshBuilder.CreateBox(lot.id+'-window-'+row+'-'+col,{width:.48,height:.5,depth:.045},scene)
          window.position.set(wx,wy,lot.z-lot.depth/2-.03);window.material=(row+col)%5===0?warmGlass:glass
        }
      }
    }
    // Small street furniture makes the scale read as infrastructure, not a graph grid.
    for(const side of [-1,1]){
      for(let p=-25;p<=25;p+=10){
        const pole=MeshBuilder.CreateCylinder('streetlamp-pole-'+side+'-'+p,{height:2.7,diameter:.09,tessellation:8},scene);pole.position.set(side*4.25,1.35,p);pole.material=material('streetlamp-metal-'+side+'-'+p,'#4c4b43')
        const lamp=MeshBuilder.CreateSphere('streetlamp-head-'+side+'-'+p,{diameter:.28,segments:10},scene);lamp.position.set(side*4.25,2.75,p);lamp.material=material('streetlamp-glow-'+side+'-'+p,'#d2b27a','#6e552d')
      }
    }
    // The central underground metro entrance is a real cutaway-like station, with stairs and a platform below street level.
    const stationBase=MeshBuilder.CreateBox('metro-platform',{width:5.8,height:.18,depth:7.5},scene);stationBase.position.set(0,-1.65,13.3);stationBase.material=concrete
    for(const side of [-1,1]){
      const wall=MeshBuilder.CreateBox('metro-retaining-wall-'+side,{width:.28,height:2.4,depth:7.7},scene);wall.position.set(side*3,-.72,13.3);wall.material=concrete
    }
    const backWall=MeshBuilder.CreateBox('metro-back-wall',{width:6.1,height:2.4,depth:.25},scene);backWall.position.set(0,-.72,17);backWall.material=dark
    const track=MeshBuilder.CreateBox('metro-track-bed',{width:1.2,height:.1,depth:6.6},scene);track.position.set(0,-1.49,13.4);track.material=dark
    for(const side of [-1,1]){
      const rail=MeshBuilder.CreateBox('metro-rail-'+side,{width:.07,height:.09,depth:6.4},scene);rail.position.set(side*.35,-1.39,13.4);rail.material=material('metro-rail-metal-'+side,'#aaa18d')
    }
    for(let step=0;step<8;step++){
      const stair=MeshBuilder.CreateBox('metro-stair-'+step,{width:2.4,height:.13,depth:.52},scene)
      stair.position.set(0,-.04-step*.19,9.9+step*.48);stair.material=material('metro-step-mat-'+step,'#817c70')
    }
    const canopy=MeshBuilder.CreateBox('metro-canopy',{width:4.2,height:.22,depth:2.3},scene);canopy.position.set(0,2.5,9.45);canopy.material=material('metro-canopy-mat','#4a4a42')
    const supports=material('metro-supports','#a08d69')
    for(const x of [-1.85,1.85]){
      const post=MeshBuilder.CreateCylinder('metro-canopy-post-'+x,{height:2.5,diameter:.13},scene);post.position.set(x,1.25,9.45);post.material=supports
    }
    const sign=MeshBuilder.CreateBox('metro-sign',{width:2.8,height:.52,depth:.08},scene);sign.position.set(0,2.05,8.3);sign.material=material('metro-sign-mat','#242824','#171d18')
    const stationMark=MeshBuilder.CreateBox('metro-sign-amber',{width:1.7,height:.06,depth:.1},scene);stationMark.position.set(0,2.05,8.23);stationMark.material=material('metro-sign-amber-mat','#d8b57b','#745a30')
    // Ambient city simulation: civilians are not AI agents and never imply runtime work.
    // Thin instances keep a dense crowd inexpensive to render on integrated graphics.
    type Pedestrian={axis:'x'|'z';fixed:number;dir:number;depth:number;lane:number;side:number;speed:number;x:number;z:number;mode:'queue'|'approach'|'cross'|'destination'|'return';batch:number}
    const pedestrianCount=1008
    const pedestrians:Pedestrian[]=[]
    const crosswalks:[ 'x'|'z',number ][]=[['x',-3.9],['x',3.9],['z',-3.9],['z',3.9]]
    const bodyTemplates:Mesh[]=[]
    const headTemplates:Mesh[]=[]
    const bodyColors=['#6f7775','#b5a07c','#6d7788']
    for(let batch=0;batch<3;batch++){
      const body=MeshBuilder.CreateCylinder('crowd-body-template-'+batch,{height:.72,diameterTop:.3,diameterBottom:.42,tessellation:7},scene)
      body.material=material('crowd-clothes-'+batch,bodyColors[batch]);body.position.set(1000,-1000,1000);body.isPickable=false;bodyTemplates.push(body)
      const head=MeshBuilder.CreateSphere('crowd-head-template-'+batch,{diameter:.25,segments:6},scene)
      head.material=material('crowd-skin-'+batch,'#b69b80');head.position.set(1000,-1000,1000);head.isPickable=false;headTemplates.push(head)
    }
    const crowdBatches=[0,1,2].map(()=>({people:[] as Pedestrian[],bodies:[] as Matrix[],heads:[] as Matrix[],bodyData:new Float32Array(0),headData:new Float32Array(0)}))
    for(let i=0;i<pedestrianCount;i++){
      const [axis,fixed]=crosswalks[i%4]
      const dir=(Math.floor(i/4)%2===0)?1:-1
      const row=Math.floor(i/8)
      const lane=((row%3)-1)*.38
      const depth=Math.floor(row/3)*.38
      const side=fixed>0?1:-1
      const start=dir>0?-3.55:3.55
      const queueOffset=fixed+side*(.65+depth)
      const x=axis==='x'?start:queueOffset
      const z=axis==='z'?start:queueOffset
      const batch=i%3
      const person:Pedestrian={axis,fixed,dir,depth,lane,side,speed:1.05+(i%7)*.055,x,z,mode:'queue',batch}
      pedestrians.push(person);crowdBatches[batch].people.push(person)
    }
    const matrixFor=(x:number,y:number,z:number,yaw=0,scale=new Vector3(1,1,1))=>
      Matrix.Compose(scale,Quaternion.RotationYawPitchRoll(yaw,0,0),new Vector3(x,y,z))
    for(let batch=0;batch<3;batch++){
      const group=crowdBatches[batch]
      group.bodyData=new Float32Array(group.people.length*16);group.headData=new Float32Array(group.people.length*16)
      group.people.forEach((person,index)=>{
        matrixFor(person.x-1000,1000.48,person.z-1000).copyToArray(group.bodyData,index*16)
        matrixFor(person.x-1000,1001.0,person.z-1000).copyToArray(group.headData,index*16)
      })
      bodyTemplates[batch].thinInstanceSetBuffer('matrix',group.bodyData,16,true)
      headTemplates[batch].thinInstanceSetBuffer('matrix',group.headData,16,true)
      bodyTemplates[batch].thinInstanceCount=group.people.length
      headTemplates[batch].thinInstanceCount=group.people.length
    }
    // Four traffic approaches; cars are kinematic and respect the signal plus a following gap.
    type Vehicle={axis:'x'|'z';lane:number;dir:number;coordinate:number;speed:number;body:Mesh;cabin:Mesh}
    const vehicles:Vehicle[]=[]
    const carPaint=['#b8b5a8','#6f827f','#a37b54','#555f69']
    for(const axis of ['x','z'] as const){
      for(const lane of [-.82,.82]){
        for(let n=0;n<4;n++){
          const dir=lane<0?1:-1
          const coordinate=dir>0?-32+n*8:32-n*8
          const body=MeshBuilder.CreateBox('traffic-car-'+axis+'-'+lane+'-'+n,{width:axis==='x'?1.55:.82,height:.48,depth:axis==='x'?.82:1.55},scene)
          body.material=material('traffic-car-paint-'+axis+'-'+lane+'-'+n,carPaint[(n+(axis==='z'?1:0))%carPaint.length])
          const cabin=MeshBuilder.CreateBox('traffic-cabin-'+axis+'-'+lane+'-'+n,{width:axis==='x'?.82:.55,height:.32,depth:axis==='x'?.55:.82},scene)
          cabin.material=material('traffic-cabin-glass-'+axis+'-'+lane+'-'+n,'#68736f','#202a28')
          vehicles.push({axis,lane,dir,coordinate,speed:2.3+(n%2)*.35,body,cabin})
        }
      }
    }
    // Each corner has a physical signal head. Material emissive states are driven by the signal controller.
    const signalBulbs:{axis:'x'|'z';red:StandardMaterial;amber:StandardMaterial;green:StandardMaterial}[]=[]
    const bulbMaterial=(name:string,color:string,on:boolean)=>{
      const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.emissiveColor=on?Color3.FromHexString(color).scale(.85):Color3.Black();return m
    }
    for(const [cornerX,cornerZ] of [[-4.9,-4.9],[4.9,-4.9],[-4.9,4.9],[4.9,4.9]] as [number,number][]){
      const pole=MeshBuilder.CreateCylinder('traffic-pole-'+cornerX+'-'+cornerZ,{height:2.2,diameter:.12,tessellation:8},scene)
      pole.position.set(cornerX,1.1,cornerZ);pole.material=material('traffic-pole-metal-'+cornerX+'-'+cornerZ,'#383b37')
      const head=MeshBuilder.CreateBox('traffic-signal-head-'+cornerX+'-'+cornerZ,{width:.42,height:1.0,depth:.3},scene)
      head.position.set(cornerX,2.15,cornerZ);head.material=dark
      const red=bulbMaterial('signal-red-'+cornerX+'-'+cornerZ,'#e45d51',true)
      const amber=bulbMaterial('signal-amber-'+cornerX+'-'+cornerZ,'#e0b65f',false)
      const green=bulbMaterial('signal-green-'+cornerX+'-'+cornerZ,'#71b88a',false)
      for(const [y,mat,label] of [[2.46,red,'red'],[2.15,amber,'amber'],[1.84,green,'green']] as [number,StandardMaterial,string][]){
        const bulb=MeshBuilder.CreateSphere('signal-'+label+'-'+cornerX+'-'+cornerZ,{diameter:.2,segments:8},scene)
        bulb.position.set(cornerX,y,cornerZ-.17);bulb.material=mat
      }
      signalBulbs.push({axis:cornerX<0?'x':'z',red,amber,green})
    }
    type TrafficPhase='x-green'|'x-amber'|'pedestrians-a'|'z-green'|'z-amber'|'pedestrians-b'
    const signalCycle=36
    let cityClock=0
    const getTrafficPhase=(time:number):TrafficPhase=>{
      const t=time%signalCycle
      if(t<8)return 'x-green'
      if(t<10)return 'x-amber'
      if(t<18)return 'pedestrians-a'
      if(t<26)return 'z-green'
      if(t<28)return 'z-amber'
      return 'pedestrians-b'
    }
    const isWalkPhase=(phase:TrafficPhase)=>phase==='pedestrians-a'||phase==='pedestrians-b'
    const crowdSpatialIndex=new SpatialIndex<Pedestrian>(.75)
    const updateCrowd=(dt:number,walkAllowed:boolean)=>{
      // Spatial hash limits collision checks to nearby people instead of comparing every pair.
      crowdSpatialIndex.clear()
      pedestrians.forEach((p,index)=>crowdSpatialIndex.set(String(index),{x:p.x,z:p.z},p))
      for(const p of pedestrians){
        const start=p.dir>0?-3.55:3.55
        const end=-start
        const queueOffset=p.fixed+p.side*(.65+p.depth)
        let tx:number,tz:number
        if(p.mode==='queue'){
          tx=p.axis==='x'?start:queueOffset;tz=p.axis==='z'?start:queueOffset
        }else if(p.mode==='approach'){
          tx=p.axis==='x'?start:p.fixed+p.lane;tz=p.axis==='z'?start:p.fixed+p.lane
        }else if(p.mode==='cross'){
          tx=p.axis==='x'?end:p.fixed+p.lane;tz=p.axis==='z'?end:p.fixed+p.lane
          if(!walkAllowed)continue
        }else if(p.mode==='destination'){
          tx=p.axis==='x'?end:p.fixed+p.side*(p.depth+7)
          tz=p.axis==='z'?end:p.fixed+p.side*(p.depth+7)
        }else{
          tx=p.axis==='x'?end:queueOffset;tz=p.axis==='z'?end:queueOffset
        }
        const dx=tx-p.x,dz=tz-p.z,distance=Math.hypot(dx,dz)
        if(distance<.12){
          if(p.mode==='queue')p.mode='approach'
          else if(p.mode==='approach'){if(walkAllowed)p.mode='cross'}
          else if(p.mode==='cross')p.mode='destination'
          else if(p.mode==='destination')p.mode='return'
          else{p.dir*=-1;p.depth=(p.depth+.48)%7.2;p.mode='queue'}
          continue
        }
        const step=Math.min(distance,p.speed*dt)
        p.x+=dx/distance*step;p.z+=dz/distance*step
        // Soft collision response: neighbors repel gently, but route direction remains authoritative.
        for(const entry of crowdSpatialIndex.query({x:p.x,z:p.z},.42)){
          const other=entry.value
          if(other===p)continue
          const ox=p.x-other.x,oz=p.z-other.z,dist=Math.hypot(ox,oz)
          if(dist>0&&dist<.42){
            const push=(.42-dist)*.08
            const movingAxis=(p.mode==='destination'||p.mode==='return')?(p.axis==='x'?'z':'x'):p.axis
            if(movingAxis==='x')p.z+=Math.max(-.035,Math.min(.035,oz/dist*push))
            else p.x+=Math.max(-.035,Math.min(.035,ox/dist*push))
          }
        }
        // Keep route-following pedestrians inside the clear crosswalk/sidewalk corridor beside the landmark blocks.
        if(p.axis==='x'&&(p.mode==='destination'||p.mode==='return'))p.x=Math.max(-6,Math.min(6,p.x))
        if(p.axis==='z'&&(p.mode==='destination'||p.mode==='return'))p.z=Math.max(-6,Math.min(6,p.z))
      }
      for(let batch=0;batch<3;batch++){
        const group=crowdBatches[batch]
        group.bodyData.fill(0);group.headData.fill(0)
        group.people.forEach((p,index)=>{
          const movingAxis=(p.mode==='destination'||p.mode==='return')?(p.axis==='x'?'z':'x'):p.axis
          const facing=(p.mode==='destination')?p.side:(p.mode==='return')?-p.side:p.dir
          const yaw=movingAxis==='x'?(facing>0?Math.PI/2:-Math.PI/2):(facing>0?0:Math.PI)
          matrixFor(p.x-1000,1000.48,p.z-1000,yaw).copyToArray(group.bodyData,index*16)
          matrixFor(p.x-1000,1001.0,p.z-1000,yaw).copyToArray(group.headData,index*16)
        })
        bodyTemplates[batch].thinInstanceBufferUpdated('matrix')
        headTemplates[batch].thinInstanceBufferUpdated('matrix')
      }
    }
    const nodeMaterials=new Map<string,PBRMaterial>()
    for(const agent of agents){
      const root=MeshBuilder.CreateCylinder(agent.id,{height:.72,diameterTop:.34,diameterBottom:.46,tessellation:12},scene)
      root.position.set(agent.x,.83,agent.z);root.material=new PBRMaterial(agent.id+'-body-mat',scene)
      const bodyMat=root.material as PBRMaterial;bodyMat.albedoColor=Color3.FromHexString(agent.color);bodyMat.metallic=.08;bodyMat.roughness=.72;nodeMaterials.set(agent.id,bodyMat);root.metadata={agentId:agent.id}
      const head=MeshBuilder.CreateSphere(agent.id+'-head',{diameter:.3,segments:12},scene);head.position.set(agent.x,1.36,agent.z);head.material=material(agent.id+'-head-mat','#bda78c');head.metadata={agentId:agent.id}
      for(const side of [-1,1]){
        const arm=MeshBuilder.CreateCylinder(agent.id+'-arm-'+side,{height:.52,diameter:.12,tessellation:8},scene)
        arm.position.set(agent.x+side*.27,.86,agent.z);arm.rotation.z=side*.13;arm.material=bodyMat;arm.metadata={agentId:agent.id}
        const leg=MeshBuilder.CreateCylinder(agent.id+'-leg-'+side,{height:.48,diameter:.14,tessellation:8},scene)
        leg.position.set(agent.x+side*.13,.34,agent.z);leg.material=material(agent.id+'-leg-mat-'+side,'#343632');leg.metadata={agentId:agent.id}
      }
      const badge=MeshBuilder.CreateBox(agent.id+'-badge',{width:.18,height:.1,depth:.06},scene);badge.position.set(agent.x,1.03,agent.z-.22);badge.material=material(agent.id+'-badge-mat',agent.color,agent.color);badge.metadata={agentId:agent.id}
    }
    for(const id of ['research','builder','validator']){
      const a=agents[0],b=agents.find(x=>x.id===id)!
      const curve=Curve3.CreateCatmullRomSpline([
        new Vector3(a.x,.72,a.z),
        new Vector3(a.x+(b.x-a.x)*.28,.46,a.z+(b.z-a.z)*.18),
        new Vector3((a.x+b.x)/2,.34,(a.z+b.z)/2),
        new Vector3(a.x+(b.x-a.x)*.82,.46,a.z+(b.z-a.z)*.84),
        new Vector3(b.x,.72,b.z)
      ],24,false)
      const tube=MeshBuilder.CreateTube('tube-'+id,{path:curve.getPoints(),radius:.065},scene)
      const m=new StandardMaterial('tube-mat-'+id,scene);m.diffuseColor=new Color3(.24,.31,.35);m.emissiveColor=new Color3(.055,.085,.095);tube.material=m
    }
    scene.onBeforeRenderObservable.add(()=>{
      cityStreamer.update(camera.target)
      const frameDelta=Math.min(engine.getDeltaTime()/1000,.1)
      simulationAccumulator=Math.min(simulationAccumulator+frameDelta,simulationStep*5)
      while(simulationAccumulator>=simulationStep){
      const dt=simulationStep
      cityClock+=dt
      const phase=getTrafficPhase(cityClock)
      for(const signal of signalBulbs){
        const green=(signal.axis==='x'&&phase==='x-green')||(signal.axis==='z'&&phase==='z-green')
        const amber=(signal.axis==='x'&&phase==='x-amber')||(signal.axis==='z'&&phase==='z-amber')
        signal.red.emissiveColor=green||amber?Color3.Black():Color3.FromHexString('#e45d51').scale(.85)
        signal.amber.emissiveColor=amber?Color3.FromHexString('#e0b65f').scale(.85):Color3.Black()
        signal.green.emissiveColor=green?Color3.FromHexString('#71b88a').scale(.85):Color3.Black()
      }
      for(const vehicle of vehicles){
        const allowed=(vehicle.axis==='x'&&phase==='x-green')||(vehicle.axis==='z'&&phase==='z-green')
        const current=vehicle.coordinate
        const stop=vehicle.dir>0?-5.3:5.3
        const atStop=vehicle.dir>0?current>=stop:current<=stop
        let blocked=!allowed&&atStop
        if(allowed||!atStop){
          const next=current+vehicle.dir*vehicle.speed*dt
          if(!blocked){
            for(const other of vehicles){
              if(other===vehicle||other.axis!==vehicle.axis||other.lane!==vehicle.lane||other.dir!==vehicle.dir)continue
              const gap=(other.coordinate-current)*vehicle.dir
              if(gap>0&&gap<2.25){blocked=true;break}
            }
          }
          if(!blocked)vehicle.coordinate=next
        }
        if(vehicle.coordinate>35)vehicle.coordinate=-35
        if(vehicle.coordinate< -35)vehicle.coordinate=35
        if(vehicle.axis==='x'){
          vehicle.body.position.set(vehicle.coordinate,.38,vehicle.lane);vehicle.cabin.position.set(vehicle.coordinate,.75,vehicle.lane)
        }else{
          vehicle.body.position.set(vehicle.lane,.38,vehicle.coordinate);vehicle.cabin.position.set(vehicle.lane,.75,vehicle.coordinate)
        }
      }
      updateCrowd(dt,isWalkPhase(phase))
      simulationAccumulator-=simulationStep
      }
    })
    let previousSelection=''
    scene.onBeforeRenderObservable.add(()=>{
      const current=selectedRef.current
      if(current===previousSelection)return
      for(const agent of agents){
        const material=nodeMaterials.get(agent.id)
        if(material)material.emissiveColor=agent.id===current?Color3.FromHexString(agent.color).scale(.1):Color3.Black()
      }
      previousSelection=current
    })
    scene.onPointerObservable.add(info=>{if(info.type!==1)return;const pick=scene.pick(scene.pointerX,scene.pointerY,m=>typeof m.metadata?.agentId==='string');const id=pick?.pickedMesh?.metadata?.agentId;if(typeof id==='string')onSelect(id)})
    // Fixed-step simulation decouples crowd/traffic motion from variable renderer frame rates.
    const simulationStep=1/60
    let simulationAccumulator=0
    engine.runRenderLoop(()=>scene.render());const resize=()=>engine.resize();window.addEventListener('resize',resize)
    return()=>{
      try{
        localStorage.setItem('paw.scene.snapshot.v1',encodeSceneSnapshot({
          schemaVersion:1,worldId:'paw-main-world',savedAt:new Date().toISOString(),
          camera:{alpha:camera.alpha,beta:camera.beta,radius:camera.radius,target:{x:camera.target.x,y:camera.target.y,z:camera.target.z}},
          loadedChunkIds:cityStreamer.loadedIds(),metadata:{engine:'babylonjs',snapshotVersion:1}
        }))
      }catch(error){console.warn('P.A.W. could not persist the scene view.',error)}
      cameraControl.current=null;window.removeEventListener('resize',resize);cityStreamer.dispose();host.dispose()
    }
  },[onSelect])
  return <canvas ref={canvas} className="world" aria-label="Interactive 3D agent network. Drag to orbit and scroll to zoom."/>
}
export default function App(){
  const cameraControl=useRef<{focus:(id:string)=>void;reset:()=>void}|null>(null)
  const [selected,setSelected]=useState('orchestrator');const [query,setQuery]=useState('')
  const [providerConfigured,setProviderConfigured]=useState(false)
  const [apiKey,setApiKey]=useState('')
  const [prompt,setPrompt]=useState('')
  const [answer,setAnswer]=useState('')
  const [providerMessage,setProviderMessage]=useState('Checking desktop provider bridge…')
  const [providerBusy,setProviderBusy]=useState(false)
  const [approvals,setApprovals]=useState<Awaited<ReturnType<typeof window.paw.listApprovals>>>([])
  const [approvalAction,setApprovalAction]=useState('')
  const [approvalSummary,setApprovalSummary]=useState('')
  const [approvalMessage,setApprovalMessage]=useState('Approval storage is available in the desktop app only.')
  const [activeRun,setActiveRun]=useState<RunRecord|null>(null)
  const [runBusy,setRunBusy]=useState(false)
  const [runMessage,setRunMessage]=useState('Run the local smoke test to exercise graph validation, scheduling and durable run history.')
  const [historyEvents,setHistoryEvents]=useState<HistoryRecord[]>([])
  useEffect(()=>{
    let cancelled=false
    if(!window.paw?.providerStatus){setProviderMessage('Desktop runtime required. Browser preview cannot store secrets or call Groq.');return}
    window.paw.providerStatus().then(status=>{if(!cancelled){setProviderConfigured(status.configured);setProviderMessage(status.configured?'Groq key stored securely on this device.':'Groq key not configured.')}}).catch(()=>{if(!cancelled)setProviderMessage('Provider status unavailable.')})
    window.paw.runtimeStatus().then(status=>{if(!cancelled)setRunMessage(status.executionEnabled?'Local guarded executor connected.':'Runtime is connected but execution is disabled.')}).catch(()=>{if(!cancelled)setRunMessage('Desktop runtime status unavailable.')})
    window.paw.listApprovals('pending').then(items=>{if(!cancelled)setApprovals(items)}).catch(()=>{if(!cancelled)setApprovalMessage('Could not load approval records.')})
    window.paw.listHistory(12).then(items=>{if(!cancelled)setHistoryEvents(items)}).catch(()=>{})
    return()=>{cancelled=true}
  },[])
  const refreshApprovals=async()=>{
    if(!window.paw?.listApprovals){setApprovalMessage('Open the desktop app to access persistent approvals.');return}
    try{setApprovals(await window.paw.listApprovals('pending'));setApprovalMessage('Pending approval records loaded from local storage.')}
    catch(error){setApprovalMessage(error instanceof Error?error.message:'Could not load approvals.')}
  }
  const createApproval=async()=>{
    if(!window.paw?.requestApproval){setApprovalMessage('Persistent approvals require the desktop app.');return}
    if(!approvalAction.trim()||!approvalSummary.trim()){setApprovalMessage('Provide an action and a summary.');return}
    try{await window.paw.requestApproval({action:approvalAction,summary:approvalSummary});setApprovalAction('');setApprovalSummary('');await refreshApprovals()}
    catch(error){setApprovalMessage(error instanceof Error?error.message:'Could not create approval.')}
  }
  const decideApproval=async(id:string,decision:'approved'|'denied')=>{
    if(!window.paw?.decideApproval)return
    try{await window.paw.decideApproval({id,decision});await refreshApprovals()}
    catch(error){setApprovalMessage(error instanceof Error?error.message:'Could not record decision.')}
  }
  const saveGroq=async()=>{
    if(!window.paw?.configureGroq){setProviderMessage('Open the installed desktop app to configure Groq securely.');return}
    if(!apiKey.trim()){setProviderMessage('Enter a Groq API key first.');return}
    setProviderBusy(true)
    try{await window.paw.configureGroq(apiKey);setApiKey('');const status=await window.paw.providerStatus();setProviderConfigured(status.configured);setProviderMessage('Groq credential saved using operating-system secure storage.')}
    catch(error){setProviderMessage(error instanceof Error?error.message:'Could not save the credential.')}
    finally{setProviderBusy(false)}
  }
  const askGroq=async()=>{
    if(!window.paw?.chatWithGroq){setProviderMessage('Groq calls are available only in the installed desktop app.');return}
    if(!prompt.trim()){setProviderMessage('Enter a prompt before sending.');return}
    setProviderBusy(true);setAnswer('')
    try{const result=await window.paw.chatWithGroq({prompt});setAnswer(result.text);setProviderMessage('Response received from '+result.model+'.');void window.paw.appendHistoryEvent({type:'provider.groq.response',payload:{model:result.model,promptLength:prompt.length}})}
    catch(error){setProviderMessage(error instanceof Error?error.message:'Groq request failed.')}
    finally{setProviderBusy(false)}
  }
  const runDemo=async()=>{
    if(!window.paw?.executeGraph){setRunMessage('Open the installed desktop app to run the local executor. The browser preview cannot invoke privileged runtime IPC.');return}
    setRunBusy(true)
    try{
      const validation=await window.paw.validateGraph(demoGraph)
      if(!validation.valid){setRunMessage('Demo graph validation failed: '+validation.issues.map(issue=>issue.message).join(' '));return}
      const run=await window.paw.executeGraph({graph:demoGraph,workspaceId:'default',concurrency:3})
      setActiveRun(run)
      setRunMessage('Run '+run.id.slice(0,8)+' accepted. Polling durable run state…')
    }catch(error){setRunMessage(error instanceof Error?error.message:'Could not start the local graph run.')}
    finally{setRunBusy(false)}
  }
  const controlRun=async(action:'pause'|'resume'|'cancel')=>{
    if(!activeRun)return
    try{
      if(action==='pause')await window.paw.pauseGraph(activeRun.id)
      else if(action==='resume')await window.paw.resumeGraph(activeRun.id)
      else await window.paw.cancelGraph(activeRun.id)
      setRunMessage(action==='pause'?'Pause requested. Active local handlers reach a safe boundary before scheduling stops.':action==='resume'?'Resume requested.':'Cancellation requested.')
    }catch(error){setRunMessage(error instanceof Error?error.message:'Could not control the run.')}
  }
  useEffect(()=>{
    if(!activeRun?.id||!window.paw?.listRuns||['succeeded','failed','cancelled','needs_recovery'].includes(activeRun.status))return
    let cancelled=false
    const refresh=async()=>{
      try{
        const records=await window.paw.listRuns(activeRun.workspaceId)
        const history=await window.paw.listHistory(12)
        const latest=records.find(item=>item.id===activeRun.id)
        if(!cancelled)setHistoryEvents(history)
        if(!cancelled&&latest){
          setActiveRun(latest)
          if(['succeeded','failed','cancelled','needs_recovery'].includes(latest.status))setRunMessage('Run '+latest.id.slice(0,8)+' finished with status: '+latest.status+'. Inspect the history panel for event details.')
        }
      }catch(error){if(!cancelled)setRunMessage(error instanceof Error?error.message:'Could not refresh run status.')}
    }
    void refresh()
    const timer=window.setInterval(()=>void refresh(),1000)
    return()=>{cancelled=true;window.clearInterval(timer)}
  },[activeRun?.id,activeRun?.workspaceId,activeRun?.status])
  const nodeStatuses=useMemo(()=>{
    const states=new Map<string,string>()
    if(!activeRun)return states
    const events=historyEvents.filter(event=>event.payload.runId===activeRun.id).slice().sort((a,b)=>new Date(a.timestamp).getTime()-new Date(b.timestamp).getTime())
    for(const event of events){
      const nodeId=event.payload.nodeId
      if(typeof nodeId!=='string')continue
      if(event.type==='execution.node.started')states.set(nodeId,'running')
      else if(event.type==='execution.node.succeeded')states.set(nodeId,'succeeded')
      else if(event.type==='execution.node.failed')states.set(nodeId,'failed')
      else if(event.type==='execution.node.blocked')states.set(nodeId,'blocked')
    }
    return states
  },[activeRun?.id,historyEvents])
  const select=useCallback((id:string)=>setSelected(id),[])
  const active=agents.find(a=>a.id===selected)??agents[0]
  return <main className="app">
    <header className="top"><div className="brand"><span className="brandicon"><Boxes size={21}/></span><div><b>P.A.W.</b><small>PERSONAL AGENT WORKSPACE</small></div></div><span className="workspace-tag"><i/> LOCAL WORKSPACE</span><div className="topright"><Settings2 size={16}/><span className="avatar">P</span></div></header>
    <nav className="rail"><Network/><Cpu/><Workflow/><BrainCircuit/><TerminalSquare/><div className="spacer"/><ShieldCheck/></nav>
    <section className="layout"><aside className="left"><div className="eyebrow">WORKSPACE</div><h1>Agent network</h1><label className="search"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find agents"/></label><div className="eyebrow section">NETWORK OBJECTS <span>{agents.length.toString().padStart(2,'0')}</span></div>{agents.filter(a=>(a.name+a.role).toLowerCase().includes(query.toLowerCase())).map(a=><button key={a.id} className={'agent '+(selected===a.id?'chosen':'')} onClick={()=>select(a.id)}><span className="glyph" style={{color:a.color}}><Cpu size={16}/></span><span><b>{a.name}</b><small>{a.role}</small></span><i className={a.state.toLowerCase()}/></button>)}<div className="runtime"><div className="eyebrow">RUNTIME STATUS</div><b><Activity size={15}/> Local executor available</b><small>Deterministic typed nodes run in the desktop main process. External tools remain unavailable unless registered behind policy.</small><button className="provider-button primary" onClick={runDemo} disabled={runBusy||!!(activeRun&&['queued','running','pause_requested','paused','cancel_requested'].includes(activeRun.status))}>{runBusy?'Starting…':'Run local smoke test'}</button><small>{runMessage}</small><div className="execution-nodes" aria-label="Live demo graph execution status"><div className="eyebrow">DEMO GRAPH NODES</div>{demoGraph.nodes.map(node=>{const status=nodeStatuses.get(node.id)??(activeRun?'waiting':'not run');return <div className="execution-node" key={node.id}><span><b>{node.label??node.id}</b><small>{node.type}</small></span><i className={'node-state '+status.replace(' ','-')}>{status.toUpperCase()}</i></div>})}</div>{activeRun&&<><small>RUN {activeRun.id.slice(0,8)} · {activeRun.status.toUpperCase()}</small>{activeRun&&['running','pause_requested'].includes(activeRun.status)&&<button className="provider-button" onClick={()=>void controlRun('pause')}>Pause</button>}{activeRun&&activeRun.status==='paused'&&<button className="provider-button" onClick={()=>void controlRun('resume')}>Resume</button>}{activeRun&&['running','pause_requested','paused'].includes(activeRun.status)&&<button className="provider-button" onClick={()=>void controlRun('cancel')}>Cancel run</button>}</>}</div></aside>
    <section className="viewport"><div className="viewhead"><div><div className="eyebrow">SPATIAL WORKSPACE / METROPOLITAN GRID</div><h2>Agent City</h2></div><div className="spatial"><Layers3 size={13}/> SPATIAL <button className="camera-control" onClick={()=>cameraControl.current?.focus(selected)} title="Focus selected agent" aria-label="Focus selected agent"><Maximize2 size={14}/></button><button className="camera-control reset-view" onClick={()=>cameraControl.current?.reset()} title="Reset camera" aria-label="Reset camera"><RotateCcw size={13}/></button></div></div><div className="scene"><World onSelect={select} selected={selected} cameraControl={cameraControl}/><div className="scene-label">CENTRAL DISTRICT / {agents.length} AI AGENTS · 1,008 PEDESTRIANS</div><div className="city-legend"><span><i className="legend-metro"/>METRO HUB</span><span><i className="legend-research"/>RESEARCH</span><span><i className="legend-build"/>ENGINEERING</span><span><i className="legend-review"/>REVIEW</span><span><i className="legend-traffic"/>SIGNAL-CONTROLLED TRAFFIC</span></div><div className="hint">Drag to orbit · Scroll to zoom · Select an agent to inspect</div></div><footer className="viewfoot"><span>GRAPH <b>{activeRun?.status?.toUpperCase()??'IDLE'}</b></span><span>NODES <b>{demoGraph.nodes.length.toString().padStart(2,'0')}</b></span><span className="spacer"/>CITY <b>PROCEDURAL GRID</b> · CAMERA <b>FREE</b></footer></section>
    <aside className="inspector"><div className="eyebrow">OBJECT INSPECTOR</div><h2>Agent details</h2><div className="object"><span style={{color:active.color}}><Cpu size={24}/></span><div><b>{active.name}</b><small>{active.role}</small></div><i>{active.state}</i></div><div className="section"><div className="eyebrow">IDENTITY</div><p><span>Node ID</span><code>{active.id}</code></p><p><span>Execution</span><b>Not connected</b></p><p><span>Autonomy</span><b>Not configured</b></p></div><div className="section"><div className="eyebrow">CURRENT TASK</div><div className="task"><b>Task summary</b><p>{active.task}</p><small>No live reasoning or tool activity available.</small></div></div><div className="section"><div className="eyebrow">CONNECTIONS</div><p><span>Dependencies</span><b>{active.id==='orchestrator'?'3 downstream':'1 upstream'}</b></p><p><span>Inputs / outputs</span><b>Not available</b></p></div><div className="section"><div className="eyebrow">OBSERVABILITY / RECENT EVENTS</div><div className="task">Recent events for the selected run. Start a smoke test to inspect node lifecycle events. Model-driven agent reasoning is not connected yet.</div><div className="approval-list">{historyEvents.filter(event=>!activeRun||event.payload.runId===activeRun.id).slice().reverse().slice(0,6).map(event=><article className="approval-item" key={event.id}><b>{event.type}</b><small>{new Date(event.timestamp).toLocaleTimeString()}</small><p>{typeof event.payload.nodeId==='string'?'Node '+event.payload.nodeId:typeof event.payload.status==='string'?'Status '+event.payload.status:'Workspace event'}</p></article>)}</div></div><div className="section approval-panel"><div className="eyebrow"><ShieldCheck size={12}/> PERSISTENT APPROVAL QUEUE <span>{approvals.length.toString().padStart(2,'0')}</span></div><p className="approval-note">Manual approval ledger. Approving a record does not execute its described action.</p><label className="provider-label">ACTION</label><input className="provider-input" value={approvalAction} onChange={e=>setApprovalAction(e.target.value)} placeholder="e.g. write-file"/><label className="provider-label">SUMMARY</label><textarea className="provider-input provider-prompt" value={approvalSummary} onChange={e=>setApprovalSummary(e.target.value)} placeholder="Describe the proposed operation and its scope…" rows={2}/><button className="provider-button" onClick={createApproval}>Create pending approval</button><div className="approval-list">{approvals.map(item=><article className="approval-item" key={item.id}><b>{item.action}</b><p>{item.summary}</p><small>{new Date(item.createdAt).toLocaleString()}</small><div><button onClick={()=>decideApproval(item.id,'approved')}>Approve</button><button onClick={()=>decideApproval(item.id,'denied')}>Deny</button></div></article>)}</div><small className="approval-message">{approvalMessage}</small></div><div className="section provider-panel"><div className="eyebrow"><KeyRound size={12}/> MODEL PROVIDER / GROQ</div><div className="provider-status"><i className={providerConfigured?'connected':''}/>{providerMessage}</div><label className="provider-label">API KEY <span>ENCRYPTED AT REST</span></label><input className="provider-input" type="password" autoComplete="off" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="gsk_… (desktop app only)"/><button className="provider-button" onClick={saveGroq} disabled={providerBusy||!apiKey.trim()}>Store credential securely</button><label className="provider-label">PROMPT</label><textarea className="provider-input provider-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Ask the Groq model something…" rows={3}/><button className="provider-button primary" onClick={askGroq} disabled={providerBusy||!providerConfigured||!prompt.trim()}><Send size={12}/>{providerBusy?'Working…':'Send prompt'}</button>{answer&&<div className="provider-answer">{answer}</div>}</div><div className="safe">The local typed graph executor is enabled for deterministic built-in nodes. External tools and autonomous model-driven execution remain disabled until policy, approval and tool adapters are connected.</div></aside></section>
    <footer className="status"><span>â  DEVELOPMENT PREVIEW</span><span>LOCAL GRAPH ENGINE <b>GUARDED</b></span><span>MODEL <b>{providerConfigured?'GROQ CONFIGURED':'NOT CONFIGURED'}</b></span><span className="spacer"/>v0.1.0 Â· Electron Â· Babylon.js</footer>
  </main>
}
