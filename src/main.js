import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const ASSETS = { character: './assets/michael.fbx', walk: './assets/michael_walk.fbx' };
const BUNDLES = {
  [ASSETS.character]: Array.from({length:8},(_,i)=>`./assets/chunks/michael.${String(i).padStart(2,'0')}.gz.b64`),
  [ASSETS.walk]: Array.from({length:8},(_,i)=>`./assets/chunks/michael_walk.${String(i).padStart(2,'0')}.gz.b64`)
};
const CFG = { height:1.82, walk:2.05, run:4.25, gravity:18.5, jump:6.15, camera:4.1, dpr:1.5 };
const $ = s => document.querySelector(s);
const ui = {
  canvas:$('#game'), loading:$('#loading'), loadingText:$('#loadingText'), bar:$('#progressBar'), state:$('#stateLabel'), fps:$('#fpsValue'),
  sheet:$('#sheet'), dot:$('#modelStatus'), title:$('#statusTitle'), sub:$('#statusSubtitle'), animBadge:$('#animationBadge'), animInfo:$('#animationInfo'),
  texBadge:$('#textureBadge'), texInfo:$('#textureInfo'), toast:$('#toast'), meshes:$('#meshCount'), bones:$('#boneCount'), textures:$('#textureCount'), clips:$('#clipCount')
};

const renderer = new THREE.WebGLRenderer({ canvas:ui.canvas, antialias:true, powerPreference:'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, CFG.dpr));
renderer.setSize(innerWidth, innerHeight, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc6d0d1);
scene.fog = new THREE.FogExp2(0xc6d0d1, .0125);
const camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, .05, 180);
scene.add(new THREE.HemisphereLight(0xe8f2ff,0x5c675b,2.1));
const sun = new THREE.DirectionalLight(0xffedcb,3);
sun.position.set(-10,18,7); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:.5,far:55}); sun.shadow.bias=-.00035; scene.add(sun);

const world = new THREE.Group(); scene.add(world);
const collisionBoxes=[]; buildWorld();
const root = new THREE.Group(); scene.add(root);
let michael=null,mixer=null,skeleton=null,bones=new Map(),actions={},active=null,state='loading',grounded=true,vy=0,jumpTime=0,landTime=0,speed=0,runHeld=false,quality=0,ready=false;
const move=new THREE.Vector2(), forward=new THREE.Vector3(), right=new THREE.Vector3(), desired=new THREE.Vector3(), up=new THREE.Vector3(0,1,0), targetQ=new THREE.Quaternion();
const orbit={yaw:Math.PI*.78,pitch:.28,distance:CFG.camera};

boot(); frame(performance.now()); keyboardLoop(); installGuards();

async function boot(){
  progress(.05,'Loading Michael character FBX…');
  try{
    michael=await loadFBX(ASSETS.character,p=>progress(.05+p*.36,`Loading Michael… ${Math.round(p*100)}%`));
    progress(.43,'Inspecting mesh, UVs and skeleton…');
    prepareCharacter(michael); mixer=new THREE.AnimationMixer(michael); bones=collectBones(michael);
    actions.idle=loop(proceduralIdle()); actions.jumpStart=once(jumpStart()); actions.jumpAir=loop(jumpAir()); actions.jumpLand=once(jumpLand());
    actions.idle.play(); active=actions.idle;
    progress(.55,'Loading your 60 FPS walking animation…');
    let mapped=false;
    try{
      const src=await loadFBX(ASSETS.walk,p=>progress(.55+p*.28,`Loading walk… ${Math.round(p*100)}%`));
      if(src.animations?.[0]){
        const clip=mapClip(src.animations[0]);
        if(clip.tracks.length){ actions.walk=loop(clip); mapped=true; ui.animBadge.textContent='Mapped'; ui.animInfo.textContent=`${clip.tracks.length} tracks mapped to Michael. Horizontal hip travel is removed so the controller owns world movement.`; }
      }
    }catch(e){ console.warn('Walk FBX unavailable; using procedural fallback.',e); }
    if(!mapped){ actions.walk=loop(proceduralWalk()); ui.animBadge.textContent='Fallback'; ui.animInfo.textContent='Procedural bone walk active. Michael remains playable even if the separate walking FBX cannot load.'; }
    const info=inspect(michael); updateDiagnostics(info,mapped);
    skeleton=new THREE.SkeletonHelper(michael); skeleton.visible=false; skeleton.material.depthTest=false; skeleton.material.transparent=true; skeleton.material.opacity=.58; scene.add(skeleton);
    // Deliberately no skeleton.update(): SkeletonHelper has no such public method.
    root.position.set(0,0,4.6); root.rotation.y=Math.PI; resetCamera(true);
    state='idle'; ready=true; ui.state.textContent='Ready'; ui.title.textContent='Michael is ready'; ui.sub.textContent=`${info.bones} bones · ${info.meshes} mesh · ${mapped?'60 FPS walk mapped':'procedural walk'}`; ui.dot.classList.add('ready');
    progress(1,'Ready'); setTimeout(()=>ui.loading.classList.add('done'),250);
  }catch(e){ fail(e); }
}

async function loadFBX(url,onProgress){
  const loader=new FBXLoader();
  try{
    return await new Promise((ok,no)=>loader.load(url,ok,e=>{if(e.lengthComputable)onProgress?.(e.loaded/e.total)},no));
  }catch(directError){
    const parts=BUNDLES[url]; if(!parts) throw directError;
    const text=[];
    for(let i=0;i<parts.length;i++){
      const r=await fetch(parts[i],{cache:'force-cache'}); if(!r.ok) throw directError;
      text.push((await r.text()).trim()); onProgress?.((i+1)/parts.length*.84);
    }
    if(typeof DecompressionStream==='undefined') throw new Error('This browser cannot unpack the hosted FBX bundle.');
    const packed=fromBase64(text.join(''));
    const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
    const raw=await new Response(stream).arrayBuffer(); onProgress?.(1);
    return loader.parse(raw,'./assets/');
  }
}
function fromBase64(s){ const b=atob(s),o=new Uint8Array(b.length); for(let i=0;i<b.length;i++)o[i]=b.charCodeAt(i); return o; }

function prepareCharacter(obj){
  obj.name='Michael'; obj.updateMatrixWorld(true);
  const box0=new THREE.Box3().setFromObject(obj), h=box0.getSize(new THREE.Vector3()).y;
  if(!Number.isFinite(h)||h<=0) throw new Error('Michael FBX has no measurable mesh.');
  obj.scale.setScalar(CFG.height/h); obj.updateMatrixWorld(true); const box=new THREE.Box3().setFromObject(obj); obj.position.y-=box.min.y;
  obj.traverse(n=>{ if(!n.isMesh)return; n.castShadow=true; n.receiveShadow=true; const mats=Array.isArray(n.material)?n.material:[n.material];
    for(const m of mats){ if(!m)continue; if('roughness'in m)m.roughness=.82; if('metalness'in m)m.metalness=0; if('color'in m&&!hasTexture(m))m.color.set(0xd7d4ce);
      for(const k of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','alphaMap']){const t=m[k];if(!t?.isTexture)continue;if(k==='map'||k==='emissiveMap')t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());t.needsUpdate=true;} m.needsUpdate=true; }
  }); root.add(obj);
}
function hasTexture(m){return ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','alphaMap'].some(k=>m?.[k]?.isTexture)}
function inspect(obj){const tex=new Set(),mats=new Set();let meshes=0,boneCount=0,uv=0,verts=0,tris=0;obj.traverse(n=>{if(n.isBone)boneCount++;if(!n.isMesh)return;meshes++;const g=n.geometry;if(g?.attributes?.uv)uv++;if(g?.attributes?.position)verts+=g.attributes.position.count;tris+=g?.index?g.index.count/3:(g?.attributes?.position?.count||0)/3;for(const m of (Array.isArray(n.material)?n.material:[n.material])){if(!m)continue;mats.add(m.uuid);for(const v of Object.values(m))if(v?.isTexture)tex.add(v.uuid)}});return{meshes,bones:boneCount,uv,verts:Math.round(verts),tris:Math.round(tris),textures:tex.size,materials:mats.size}}
function updateDiagnostics(s,mapped){ui.meshes.textContent=s.meshes;ui.bones.textContent=s.bones;ui.textures.textContent=s.textures;ui.clips.textContent=Object.keys(actions).length;
  if(s.textures){ui.texBadge.textContent='Ready';ui.texInfo.textContent=`${s.textures} texture map${s.textures===1?'':'s'} detected. Existing FBX materials are preserved.`}
  else if(s.uv){ui.texBadge.textContent='UV ready';ui.texInfo.textContent=`Michael has UVs (${s.verts.toLocaleString()} vertices / ~${s.tris.toLocaleString()} triangles), but the supplied FBX contains no embedded texture image. A neutral surface is used until a legal albedo is supplied.`}
  else{ui.texBadge.textContent='No UV';ui.texInfo.textContent='No texture maps or usable UVs detected.'} if(!mapped)ui.animBadge.textContent='Fallback';}

function norm(n=''){return n.split('|').pop().split(':').pop().replace(/[^a-z0-9]/gi,'').toLowerCase()}
function collectBones(obj){const m=new Map();obj.traverse(n=>{if(n.isBone)m.set(norm(n.name),n)});return m}
function bone(...names){for(const n of names){const b=bones.get(norm(n));if(b)return b}return null}
function mapClip(src){const tracks=[];for(const st of src.tracks){const dot=st.name.lastIndexOf('.');if(dot<1)continue;const b=bones.get(norm(st.name.slice(0,dot)));if(!b)continue;const property=st.name.slice(dot+1),t=st.clone();t.name=`${b.name}.${property}`;
    if(property==='position'&&/hips|root/i.test(b.name)&&t.values.length>=3){const x=t.values[0],z=t.values[2];for(let i=0;i<t.values.length;i+=3){t.values[i]=x;t.values[i+2]=z}} tracks.push(t)}const c=new THREE.AnimationClip('michael_walk_mapped',src.duration,tracks);c.optimize();return c}
function loop(c){const a=mixer.clipAction(c);a.setLoop(THREE.LoopRepeat,Infinity);return a}
function once(c){const a=mixer.clipAction(c);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;return a}
function qTrack(tracks,times,b,deltas){if(!b)return;const base=b.quaternion.clone(),values=[];for(const [x,y,z]of deltas){const q=base.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z))).normalize();values.push(q.x,q.y,q.z,q.w)}tracks.push(new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`,times,values))}
function proceduralIdle(){const t=[0,1,2,3,4],a=[];qTrack(a,t,bone('Spine'),[[0,0,0],[.006,.006,.006],[0,-.004,-.005],[-.005,.004,.005],[0,0,0]]);qTrack(a,t,bone('Spine01'),[[0,0,0],[.01,0,0],[.016,0,0],[.008,0,0],[0,0,0]]);qTrack(a,t,bone('Head'),[[0,0,0],[.003,-.012,0],[0,.016,.004],[-.003,.01,-.003],[0,0,0]]);return new THREE.AnimationClip('idle',4,a)}
function proceduralWalk(){const t=[0,.25,.5,.75,1],a=[];qTrack(a,t,bone('LeftUpLeg'),[[-.38,0,0],[0,0,0],[.38,0,0],[0,0,0],[-.38,0,0]]);qTrack(a,t,bone('RightUpLeg'),[[.38,0,0],[0,0,0],[-.38,0,0],[0,0,0],[.38,0,0]]);qTrack(a,t,bone('LeftLeg'),[[.12,0,0],[.44,0,0],[.1,0,0],[.2,0,0],[.12,0,0]]);qTrack(a,t,bone('RightLeg'),[[.1,0,0],[.2,0,0],[.12,0,0],[.44,0,0],[.1,0,0]]);qTrack(a,t,bone('LeftArm'),[[.28,0,0],[0,0,0],[-.28,0,0],[0,0,0],[.28,0,0]]);qTrack(a,t,bone('RightArm'),[[-.28,0,0],[0,0,0],[.28,0,0],[0,0,0],[-.28,0,0]]);return new THREE.AnimationClip('walk',1,a)}
function jumpStart(){const t=[0,.16,.42],a=[];for(const n of['LeftUpLeg','RightUpLeg'])qTrack(a,t,bone(n),[[0,0,0],[-.34,0,0],[.1,0,0]]);for(const n of['LeftLeg','RightLeg'])qTrack(a,t,bone(n),[[0,0,0],[.48,0,0],[.1,0,0]]);for(const n of['LeftArm','RightArm'])qTrack(a,t,bone(n),[[0,0,0],[.22,0,0],[-.18,0,0]]);qTrack(a,t,bone('Spine'),[[0,0,0],[.1,0,0],[-.03,0,0]]);return new THREE.AnimationClip('jumpStart',.42,a)}
function jumpAir(){const t=[0,.32,.64],a=[];qTrack(a,t,bone('LeftUpLeg'),[[.1,0,0],[.16,0,.03],[.1,0,0]]);qTrack(a,t,bone('RightUpLeg'),[[.1,0,0],[.06,0,-.03],[.1,0,0]]);qTrack(a,t,bone('LeftArm'),[[-.18,0,0],[-.12,0,.04],[-.18,0,0]]);qTrack(a,t,bone('RightArm'),[[-.18,0,0],[-.12,0,-.04],[-.18,0,0]]);return new THREE.AnimationClip('jumpAir',.64,a)}
function jumpLand(){const t=[0,.14,.34,.58],a=[];for(const n of['LeftUpLeg','RightUpLeg'])qTrack(a,t,bone(n),[[.08,0,0],[-.38,0,0],[-.18,0,0],[0,0,0]]);for(const n of['LeftLeg','RightLeg'])qTrack(a,t,bone(n),[[.1,0,0],[.56,0,0],[.28,0,0],[0,0,0]]);qTrack(a,t,bone('Spine'),[[-.03,0,0],[.18,0,0],[.08,0,0],[0,0,0]]);return new THREE.AnimationClip('jumpLand',.58,a)}
function setAction(name,fade=.18,restart=false){const next=actions[name];if(!next||next===active&&!restart)return;next.enabled=true;if(restart||next!==active)next.reset();next.setEffectiveWeight(1).play();if(active&&active!==next)active.crossFadeTo(next,fade,false);active=next}

function buildWorld(){const mat=new THREE.MeshStandardMaterial({color:0x778173,roughness:1}),ground=new THREE.Mesh(new THREE.PlaneGeometry(120,120),mat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;world.add(ground);
  const roadMat=new THREE.MeshStandardMaterial({color:0x454946,roughness:.97});for(const g of [new THREE.PlaneGeometry(16,120),new THREE.PlaneGeometry(120,16)]){const r=new THREE.Mesh(g,roadMat);r.rotation.x=-Math.PI/2;r.position.y=.006;world.add(r)}
  const buildingGeo=new THREE.BoxGeometry(1,1,1),colors=[0xc4c0b4,0xaebbb6,0xcbbdab,0xa8b2a7],blocks=[[-24,-24,11,10,9],[-39,-23,11,16,7],[24,-25,13,11,12],[40,-26,12,12,8],[-24,24,12,13,7],[-40,26,11,11,11],[25,25,12,12,9],[41,27,12,15,13],[-24,-42,12,12,14],[24,-42,12,12,8],[-24,42,12,12,10],[24,42,12,12,15]];
  blocks.forEach(([x,z,w,d,h],i)=>{const b=new THREE.Mesh(buildingGeo,new THREE.MeshStandardMaterial({color:colors[i%colors.length],roughness:.88}));b.scale.set(w,h,d);b.position.set(x,h/2,z);b.receiveShadow=true;world.add(b);collisionBoxes.push(new THREE.Box3(new THREE.Vector3(x-w/2-.5,0,z-d/2-.5),new THREE.Vector3(x+w/2+.5,h,z+d/2+.5)))});
  const tg=new THREE.CylinderGeometry(.12,.16,1.2,7),cg=new THREE.SphereGeometry(.62,8,7),tm=new THREE.MeshStandardMaterial({color:0x6d5d48,roughness:1}),lm=new THREE.MeshStandardMaterial({color:0x526b4c,roughness:1});for(const[x,z]of[[-9,-22],[9,-30],[-10,29],[11,38],[-31,9],[31,-10],[-44,8],[44,-8]]){const t=new THREE.Mesh(tg,tm);t.position.set(x,.6,z);const c=new THREE.Mesh(cg,lm);c.scale.set(1,1.25,1);c.position.set(x,1.65,z);world.add(t,c)}}
function blocked(p){return Math.abs(p.x)>55||Math.abs(p.z)>55||collisionBoxes.some(b=>p.x>b.min.x&&p.x<b.max.x&&p.z>b.min.z&&p.z<b.max.z)}

function updateCharacter(dt){if(!michael||!mixer)return;const amount=Math.min(1,move.length()),moving=amount>.045,target=moving?(runHeld?CFG.run:CFG.walk)*Math.max(.36,amount):0;speed+=(target-speed)*(1-Math.exp(-dt*(target>speed?8:10)));
  if(moving){camera.getWorldDirection(forward);forward.y=0;forward.normalize();right.crossVectors(forward,up).normalize();desired.copy(forward).multiplyScalar(-move.y).addScaledVector(right,move.x).normalize();targetQ.setFromAxisAngle(up,Math.atan2(desired.x,desired.z));root.quaternion.slerp(targetQ,1-Math.exp(-dt*13));const step=desired.clone().multiplyScalar(speed*dt),px=root.position.clone();px.x+=step.x;if(!blocked(px))root.position.x=px.x;const pz=root.position.clone();pz.z+=step.z;if(!blocked(pz))root.position.z=pz.z}
  if(!grounded){jumpTime+=dt;vy-=CFG.gravity*dt;root.position.y+=vy*dt;if(jumpTime>.32&&active!==actions.jumpAir)setAction('jumpAir',.1);if(root.position.y<=0){root.position.y=0;vy=0;grounded=true;jumpTime=0;landTime=.58;setAction('jumpLand',.08,true);state='landing'}else state='airborne'}
  else if(landTime>0){landTime=Math.max(0,landTime-dt);state='landing';if(!landTime)setAction(moving?'walk':'idle',.12)}
  else if(moving){setAction('walk',.18);actions.walk?.setEffectiveTimeScale(runHeld?1.48:.9+amount*.2);state=runHeld?'running':'walking'}else{setAction('idle',.24);state='idle'}
  mixer.update(dt);ui.state.textContent=state==='running'?'Running':state==='walking'?'Walking':state==='airborne'?'Airborne':state==='landing'?'Landing':'Ready'}
function jump(){if(!michael||!grounded||landTime>.05)return;grounded=false;vy=CFG.jump;jumpTime=0;landTime=0;setAction('jumpStart',.08,true);state='airborne'}
function updateCamera(dt){const target=root.position.clone().add(new THREE.Vector3(0,1.34,0)),cp=Math.cos(orbit.pitch),pos=new THREE.Vector3(Math.sin(orbit.yaw)*cp,Math.sin(orbit.pitch),Math.cos(orbit.yaw)*cp).multiplyScalar(orbit.distance).add(target);camera.position.lerp(pos,1-Math.exp(-dt*10));camera.lookAt(target.clone().add(new THREE.Vector3(0,.1,0)))}
function resetCamera(immediate=false){orbit.yaw=root.rotation.y+Math.PI;orbit.pitch=.25;orbit.distance=CFG.camera;if(!immediate)return;const t=root.position.clone().add(new THREE.Vector3(0,1.34,0)),cp=Math.cos(orbit.pitch);camera.position.set(t.x+Math.sin(orbit.yaw)*cp*orbit.distance,t.y+Math.sin(orbit.pitch)*orbit.distance,t.z+Math.cos(orbit.yaw)*cp*orbit.distance);camera.lookAt(t)}

let last=performance.now(),acc=0,frames=0,fpsAt=last;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.04,Math.max(.001,(now-last)/1000));last=now;updateCharacter(dt);updateCamera(dt);renderer.render(scene,camera);acc+=1/dt;frames++;if(now-fpsAt>650){ui.fps.textContent=Math.round(acc/frames);acc=frames=0;fpsAt=now}}
function progress(p,text){ui.bar.style.width=`${Math.max(4,Math.min(100,p*100))}%`;ui.loadingText.textContent=text}
let toastTimer;function toast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2200)}
function fail(e){console.error('Project V boot failed:',e);ui.dot.classList.add('error');ui.title.textContent='Character could not load';ui.sub.textContent=e?.message||'Unknown FBX error';ui.state.textContent='Load error';ui.loadingText.textContent='Michael could not load. Open diagnostics.';toast('FBX load failed. Open diagnostics for details.');openSheet()}
function installGuards(){addEventListener('error',e=>{if(ready){console.error('Runtime error:',e.error||e.message);toast('A runtime issue was caught safely.')}});addEventListener('unhandledrejection',e=>{console.error('Unhandled promise rejection:',e.reason);if(ready)toast('A background task failed safely.')})}
function openSheet(){ui.sheet.classList.add('open');ui.sheet.setAttribute('aria-hidden','false')}function closeSheet(){ui.sheet.classList.remove('open');ui.sheet.setAttribute('aria-hidden','true')}
$('#menuButton').addEventListener('click',openSheet);$('#brand').addEventListener('click',openSheet);document.querySelectorAll('[data-close-sheet]').forEach(x=>x.addEventListener('click',closeSheet));
$('#skeletonToggle').addEventListener('click',e=>{if(!skeleton)return toast('Skeleton is available after Michael loads.');skeleton.visible=!skeleton.visible;e.currentTarget.querySelector('em').textContent=skeleton.visible?'On':'Off'});$('#cameraReset').addEventListener('click',()=>{resetCamera();closeSheet()});$('#qualityToggle').addEventListener('click',()=>{quality=(quality+1)%2;const balanced=!quality;renderer.setPixelRatio(Math.min(devicePixelRatio||1,balanced?1.5:1));renderer.shadowMap.enabled=balanced;$('#qualityLabel').textContent=balanced?'Balanced':'Fast';toast(balanced?'Balanced quality enabled.':'Fast mode enabled.')});

const joy=$('#joystick'),knob=$('#joystickKnob');let joyId=null;function joyMove(x,y){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,rad=r.width*.31;let dx=x-cx,dy=y-cy,l=Math.hypot(dx,dy);if(l>rad){dx=dx/l*rad;dy=dy/l*rad}knob.style.transform=`translate3d(${dx}px,${dy}px,0)`;move.set(dx/rad,dy/rad)}
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);joy.classList.add('active');joyMove(e.clientX,e.clientY)});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e.clientX,e.clientY)});function joyUp(e){if(joyId!==null&&(!e||e.pointerId===joyId)){joyId=null;joy.classList.remove('active');knob.style.transform='translate3d(0,0,0)';move.set(0,0)}}joy.addEventListener('pointerup',joyUp);joy.addEventListener('pointercancel',joyUp);
const run=$('#runButton');function setRun(v){runHeld=v;run.classList.toggle('held',v)}run.addEventListener('pointerdown',e=>{e.preventDefault();setRun(true);run.setPointerCapture(e.pointerId)});run.addEventListener('pointerup',()=>setRun(false));run.addEventListener('pointercancel',()=>setRun(false));$('#jumpButton').addEventListener('pointerdown',e=>{e.preventDefault();jump()});
let camId=null,cx=0,cy=0;ui.canvas.addEventListener('pointerdown',e=>{if(e.clientX<innerWidth*.3)return;camId=e.pointerId;cx=e.clientX;cy=e.clientY;ui.canvas.setPointerCapture(e.pointerId)});ui.canvas.addEventListener('pointermove',e=>{if(e.pointerId!==camId)return;orbit.yaw-=(e.clientX-cx)*.0062;orbit.pitch=THREE.MathUtils.clamp(orbit.pitch+(e.clientY-cy)*.0045,-.06,.72);cx=e.clientX;cy=e.clientY});ui.canvas.addEventListener('pointerup',e=>{if(e.pointerId===camId)camId=null});ui.canvas.addEventListener('pointercancel',e=>{if(e.pointerId===camId)camId=null});
const keys=new Set();addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='Space'){e.preventDefault();jump()}if(e.code==='ShiftLeft'||e.code==='ShiftRight')setRun(true)});addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='ShiftLeft'||e.code==='ShiftRight')setRun(false)});function keyboardLoop(){let x=0,y=0;if(keys.has('KeyA')||keys.has('ArrowLeft'))x--;if(keys.has('KeyD')||keys.has('ArrowRight'))x++;if(keys.has('KeyW')||keys.has('ArrowUp'))y--;if(keys.has('KeyS')||keys.has('ArrowDown'))y++;if(x||y)move.set(x,y).normalize();else if(joyId===null)move.set(0,0);requestAnimationFrame(keyboardLoop)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)});addEventListener('contextmenu',e=>e.preventDefault());
