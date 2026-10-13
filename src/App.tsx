import { useEffect, useRef, useState } from 'react'
import { Activity, Boxes, BrainCircuit, Cpu, KeyRound, Layers3, Maximize2, Network, Search, Send, Settings2, ShieldCheck, TerminalSquare, Workflow } from 'lucide-react'
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
  useEffect(()=>{
    let cancelled=false
    if(!window.paw?.providerStatus){setProviderMessage('Desktop runtime required. Browser preview cannot store secrets or call Groq.');return}
    window.paw.providerStatus().then(status=>{if(!cancelled){setProviderConfigured(status.configured);setProviderMessage(status.configured?'Groq key stored securely on this device.':'Groq key not configured.')}}).catch(()=>{if(!cancelled)setProviderMessage('Provider status unavailable.')})
    window.paw.listApprovals('pending').then(items=>{if(!cancelled)setApprovals(items)}).catch(()=>{if(!cancelled)setApprovalMessage('Could not load approval records.')})
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
  const select=(id:string)=>setSelected(id)
  const active=agents.find(a=>a.id===selected)??agents[0]
  return <main className="app">
    <header className="top"><div className="brand"><span className="brandicon"><Boxes size={21}/></span><div><b>P.A.W.</b><small>PERSONAL AGENT WORKSPACE</small></div></div><span className="workspace-tag"><i/> LOCAL WORKSPACE</span><div className="topright"><Settings2 size={16}/><span className="avatar">P</span></div></header>
    <nav className="rail"><Network/><Cpu/><Workflow/><BrainCircuit/><TerminalSquare/><div className="spacer"/><ShieldCheck/></nav>
    <section className="layout"><aside className="left"><div className="eyebrow">WORKSPACE</div><h1>Agent network</h1><label className="search"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find agents"/></label><div className="eyebrow section">NETWORK OBJECTS <span>{agents.length.toString().padStart(2,'0')}</span></div>{agents.filter(a=>(a.name+a.role).toLowerCase().includes(query.toLowerCase())).map(a=><button key={a.id} className={'agent '+(selected===a.id?'chosen':'')} onClick={()=>select(a.id)}><span className="glyph" style={{color:a.color}}><Cpu size={16}/></span><span><b>{a.name}</b><small>{a.role}</small></span><i className={a.state.toLowerCase()}/></button>)}<div className="runtime"><div className="eyebrow">RUNTIME STATUS</div><b><Activity size={15}/> Runtime offline</b><small>Preview data only. No real agents are running.</small></div></aside>
    <section className="viewport"><div className="viewhead"><div><div className="eyebrow">SPATIAL WORKSPACE / DEFAULT ZONE</div><h2>Coordination field</h2></div><span className="spatial"><Layers3 size={13}/> SPATIAL <Maximize2 size={14}/></span></div><div className="scene"><World onSelect={select}/><div className="scene-label">PHYSICS PREVIEW / {agents.length} NODES</div><div className="hint">Drag to orbit Â· Scroll to zoom Â· Click a machine to inspect</div></div><footer className="viewfoot"><span>â READY <b>01</b></span><span>â IDLE <b>03</b></span><span className="spacer"/>QUALITY <b>ADAPTIVE</b> Â· CAMERA <b>FREE</b></footer></section>
    <aside className="inspector"><div className="eyebrow">OBJECT INSPECTOR</div><h2>Agent details</h2><div className="object"><span style={{color:active.color}}><Cpu size={24}/></span><div><b>{active.name}</b><small>{active.role}</small></div><i>{active.state}</i></div><div className="section"><div className="eyebrow">IDENTITY</div><p><span>Node ID</span><code>{active.id}</code></p><p><span>Execution</span><b>Not connected</b></p><p><span>Autonomy</span><b>Not configured</b></p></div><div className="section"><div className="eyebrow">CURRENT TASK</div><div className="task"><b>Task summary</b><p>{active.task}</p><small>No live reasoning or tool activity available.</small></div></div><div className="section"><div className="eyebrow">CONNECTIONS</div><p><span>Dependencies</span><b>{active.id==='orchestrator'?'3 downstream':'1 upstream'}</b></p><p><span>Inputs / outputs</span><b>Not available</b></p></div><div className="section"><div className="eyebrow">OBSERVABILITY</div><div className="task">Execution logs appear here when a real runtime is connected.</div></div><div className="section approval-panel"><div className="eyebrow"><ShieldCheck size={12}/> PERSISTENT APPROVAL QUEUE <span>{approvals.length.toString().padStart(2,'0')}</span></div><p className="approval-note">Manual approval ledger. Approving a record does not execute its described action.</p><label className="provider-label">ACTION</label><input className="provider-input" value={approvalAction} onChange={e=>setApprovalAction(e.target.value)} placeholder="e.g. write-file"/><label className="provider-label">SUMMARY</label><textarea className="provider-input provider-prompt" value={approvalSummary} onChange={e=>setApprovalSummary(e.target.value)} placeholder="Describe the proposed operation and its scope…" rows={2}/><button className="provider-button" onClick={createApproval}>Create pending approval</button><div className="approval-list">{approvals.map(item=><article className="approval-item" key={item.id}><b>{item.action}</b><p>{item.summary}</p><small>{new Date(item.createdAt).toLocaleString()}</small><div><button onClick={()=>decideApproval(item.id,'approved')}>Approve</button><button onClick={()=>decideApproval(item.id,'denied')}>Deny</button></div></article>)}</div><small className="approval-message">{approvalMessage}</small></div><div className="section provider-panel"><div className="eyebrow"><KeyRound size={12}/> MODEL PROVIDER / GROQ</div><div className="provider-status"><i className={providerConfigured?'connected':''}/>{providerMessage}</div><label className="provider-label">API KEY <span>ENCRYPTED AT REST</span></label><input className="provider-input" type="password" autoComplete="off" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="gsk_… (desktop app only)"/><button className="provider-button" onClick={saveGroq} disabled={providerBusy||!apiKey.trim()}>Store credential securely</button><label className="provider-label">PROMPT</label><textarea className="provider-input provider-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Ask the Groq model something…" rows={3}/><button className="provider-button primary" onClick={askGroq} disabled={providerBusy||!providerConfigured||!prompt.trim()}><Send size={12}/>{providerBusy?'Working…':'Send prompt'}</button>{answer&&<div className="provider-answer">{answer}</div>}</div><div className="safe">Agent execution remains disabled. Groq chat is an isolated provider test, not autonomous tool execution.</div></aside></section>
    <footer className="status"><span>â  DEVELOPMENT PREVIEW</span><span>RUNTIME <b>DISCONNECTED</b></span><span>MODEL <b>NOT CONFIGURED</b></span><span className="spacer"/>v0.1.0 Â· Electron Â· Babylon.js</footer>
  </main>
}
