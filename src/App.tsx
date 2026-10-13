import { useEffect, useRef, useState } from 'react'
import { Activity, Boxes, BrainCircuit, Cpu, Layers3, Maximize2, Network, Search, Settings2, ShieldCheck, TerminalSquare, Workflow } from 'lucide-react'
import { ArcRotateCamera, Color3, Engine, HemisphericLight, MeshBuilder, PBRMaterial, Scene, StandardMaterial, Vector3 } from '@babylonjs/core'

type Agent = { id:string; name:string; role:string; color:string; x:number; z:number; state:string; task:string }
const agents:Agent[] = [
  {id:'orchestrator',name:'ORCHESTRATOR',role:'Team coordinator',color:'#d5e5ff',x:0,z:0,state:'READY',task:'Waiting for a real runtime connection'},
  {id:'research',name:'RESEARCH UNIT',role:'Research agent',color:'#a6a5ff',x:-5,z:-2.5,state:'IDLE',task:'No task assigned'},
  {id:'builder',name:'BUILD ENGINE',role:'Coding agent',color:'#5de0c2',x:4.5,z:-2,state:'IDLE',task:'No task assigned'},
  {id:'validator',name:'VALIDATOR',role:'Testing agent',color:'#ffbd78',x:.5,z:4,state:'IDLE',task:'No task assigned'}
]
function World({onSelect}:{onSelect:(id:string)=>void}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    if(!canvas.current)return
    const engine=new Engine(canvas.current,true,{adaptToDeviceRatio:true,stencil:true})
    const scene=new Scene(engine);scene.clearColor.set(.035,.043,.055,1)
    const camera=new ArcRotateCamera('camera',-Math.PI/2.2,1.08,17,Vector3.Zero(),scene)
    camera.attachControl(canvas.current,true);camera.lowerRadiusLimit=7;camera.upperRadiusLimit=34;camera.wheelPrecision=45
    new HemisphericLight('ambient',new Vector3(.1,1,.1),scene).intensity=.9
    const floor=MeshBuilder.CreateGround('floor',{width:100,height:100},scene)
    const fm=new StandardMaterial('floor-mat',scene);fm.diffuseColor=new Color3(.045,.055,.07);floor.material=fm
    for(let i=-10;i<=10;i++){const a=MeshBuilder.CreateLines('grid-a'+i,{points:[new Vector3(i*2,.015,-20),new Vector3(i*2,.015,20)]},scene);const b=MeshBuilder.CreateLines('grid-b'+i,{points:[new Vector3(-20,.015,i*2),new Vector3(20,.015,i*2)]},scene);a.color=b.color=new Color3(.12,.15,.19)}
    for(const agent of agents){
      const root=MeshBuilder.CreateBox(agent.id,{width:2.15,height:1.25,depth:1.55},scene);root.position=new Vector3(agent.x,.9,agent.z);root.metadata={agentId:agent.id}
      const mat=new PBRMaterial(agent.id+'-mat',scene);mat.albedoColor=Color3.FromHexString(agent.color);mat.metallic=.72;mat.roughness=.36;root.material=mat
      const top=MeshBuilder.CreateBox(agent.id+'-top',{width:1.55,height:.16,depth:1.1},scene);top.position=new Vector3(agent.x,1.62,agent.z);const tm=new StandardMaterial(agent.id+'-tm',scene);tm.diffuseColor=new Color3(.12,.15,.2);tm.emissiveColor=Color3.FromHexString(agent.color).scale(.12);top.material=tm;top.metadata={agentId:agent.id}
      const core=MeshBuilder.CreateCylinder(agent.id+'-core',{height:.12,diameter:.72},scene);core.position=new Vector3(agent.x,1.74,agent.z);const cm=new StandardMaterial(agent.id+'-cm',scene);cm.emissiveColor=Color3.FromHexString(agent.color).scale(.45);core.material=cm;core.metadata={agentId:agent.id}
    }
    for(const id of ['research','builder','validator']){const a=agents[0],b=agents.find(x=>x.id===id)!;const tube=MeshBuilder.CreateTube('tube-'+id,{path:[new Vector3(a.x,.7,a.z),new Vector3((a.x+b.x)/2,.6,(a.z+b.z)/2),new Vector3(b.x,.9,b.z)],radius:.055},scene);const m=new StandardMaterial('tube-mat-'+id,scene);m.diffuseColor=new Color3(.19,.27,.35);m.emissiveColor=new Color3(.035,.08,.12);tube.material=m}
    scene.onPointerObservable.add(info=>{if(info.type!==1)return;const pick=scene.pick(scene.pointerX,scene.pointerY,m=>typeof m.metadata?.agentId==='string');const id=pick?.pickedMesh?.metadata?.agentId;if(typeof id==='string')onSelect(id)})
    engine.runRenderLoop(()=>scene.render());const resize=()=>engine.resize();window.addEventListener('resize',resize)
    return()=>{window.removeEventListener('resize',resize);engine.stopRenderLoop();scene.dispose();engine.dispose()}
  },[onSelect])
  return <canvas ref={canvas} className="world" aria-label="Interactive 3D agent network. Drag to orbit and scroll to zoom."/>
}
export default function App(){
  const [selected,setSelected]=useState('orchestrator');const [query,setQuery]=useState('')
  const select=(id:string)=>setSelected(id)
  const active=agents.find(a=>a.id===selected)??agents[0]
  return <main className="app">
    <header className="top"><div className="brand"><span className="brandicon"><Boxes size={21}/></span><div><b>P.A.W.</b><small>PERSONAL AGENT WORKSPACE</small></div></div><span className="workspace-tag"><i/> LOCAL WORKSPACE</span><div className="topright"><Settings2 size={16}/><span className="avatar">P</span></div></header>
    <nav className="rail"><Network/><Cpu/><Workflow/><BrainCircuit/><TerminalSquare/><div className="spacer"/><ShieldCheck/></nav>
    <section className="layout"><aside className="left"><div className="eyebrow">WORKSPACE</div><h1>Agent network</h1><label className="search"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find agents"/></label><div className="eyebrow section">NETWORK OBJECTS <span>{agents.length.toString().padStart(2,'0')}</span></div>{agents.filter(a=>(a.name+a.role).toLowerCase().includes(query.toLowerCase())).map(a=><button key={a.id} className={'agent '+(selected===a.id?'chosen':'')} onClick={()=>select(a.id)}><span className="glyph" style={{color:a.color}}><Cpu size={16}/></span><span><b>{a.name}</b><small>{a.role}</small></span><i className={a.state.toLowerCase()}/></button>)}<div className="runtime"><div className="eyebrow">RUNTIME STATUS</div><b><Activity size={15}/> Runtime offline</b><small>Preview data only. No real agents are running.</small></div></aside>
    <section className="viewport"><div className="viewhead"><div><div className="eyebrow">SPATIAL WORKSPACE / DEFAULT ZONE</div><h2>Coordination field</h2></div><span className="spatial"><Layers3 size={13}/> SPATIAL <Maximize2 size={14}/></span></div><div className="scene"><World onSelect={select}/><div className="scene-label">PHYSICS PREVIEW / {agents.length} NODES</div><div className="hint">Drag to orbit Â· Scroll to zoom Â· Click a machine to inspect</div></div><footer className="viewfoot"><span>â READY <b>01</b></span><span>â IDLE <b>03</b></span><span className="spacer"/>QUALITY <b>ADAPTIVE</b> Â· CAMERA <b>FREE</b></footer></section>
    <aside className="inspector"><div className="eyebrow">OBJECT INSPECTOR</div><h2>Agent details</h2><div className="object"><span style={{color:active.color}}><Cpu size={24}/></span><div><b>{active.name}</b><small>{active.role}</small></div><i>{active.state}</i></div><div className="section"><div className="eyebrow">IDENTITY</div><p><span>Node ID</span><code>{active.id}</code></p><p><span>Execution</span><b>Not connected</b></p><p><span>Autonomy</span><b>Not configured</b></p></div><div className="section"><div className="eyebrow">CURRENT TASK</div><div className="task"><b>Task summary</b><p>{active.task}</p><small>No live reasoning or tool activity available.</small></div></div><div className="section"><div className="eyebrow">CONNECTIONS</div><p><span>Dependencies</span><b>{active.id==='orchestrator'?'3 downstream':'1 upstream'}</b></p><p><span>Inputs / outputs</span><b>Not available</b></p></div><div className="section"><div className="eyebrow">OBSERVABILITY</div><div className="task">Execution logs appear here when a real runtime is connected.</div></div><div className="safe">Controls disabled until a trusted runtime is connected.</div></aside></section>
    <footer className="status"><span>â  DEVELOPMENT PREVIEW</span><span>RUNTIME <b>DISCONNECTED</b></span><span>MODEL <b>NOT CONFIGURED</b></span><span className="spacer"/>v0.1.0 Â· Electron Â· Babylon.js</footer>
  </main>
}
