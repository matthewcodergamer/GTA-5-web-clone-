import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createProjectVMinimap } from './minimap.js';

const VERSION = 9;
// PROJECT_V_ENVIRONMENT_V8
// PROJECT_V_MINIMAP_V9
const GAME_PALETTES = {
  day: {
    sky_atmosphere: 0xF1FBFB, vegetation_grass: 0x73894E, earth_terrain: 0x625851,
    sunlight_highlight: 0x929395, shadow_ao: 0x070707, water_cool_material: 0x263251,
    neutral_structure: 0x2B2E2C, accent_ui_signage: 0x515F88
  },
  sunrise: {
    sky_atmosphere: 0xDBDFDD, vegetation_grass: 0x64733A, earth_terrain: 0xD8D1B6,
    sunlight_highlight: 0x9E987F, shadow_ao: 0x20211F, water_cool_material: 0x7F8D4E,
    neutral_structure: 0x40433F, accent_ui_signage: 0x674342
  },
  evening: {
    sky_atmosphere: 0x9C8690, vegetation_grass: 0x41564D, earth_terrain: 0x353A4F,
    sunlight_highlight: 0x918394, shadow_ao: 0x121B1C, water_cool_material: 0x262D3F,
    neutral_structure: 0x2A282A, accent_ui_signage: 0x2F3933
  }
};
const ENV_ORDER = ['day','sunrise','evening'];
let environmentPreset = 'sunrise';
let targetEnvironmentPreset = 'sunrise';
const ENV_CURRENT = Object.fromEntries(Object.entries(GAME_PALETTES.sunrise).map(([k,v])=>[k,new THREE.Color(v)]));
const ENV_TARGET = Object.fromEntries(Object.entries(GAME_PALETTES.sunrise).map(([k,v])=>[k,new THREE.Color(v)]));
const ENV_MATS = { ground:null, road:null, buildings:[], trunk:null, leaf:null };
let atmosphere = null;

const $ = (s) => document.querySelector(s);

const ui = {
  canvas: $('#game'), loading: $('#loading'), loadingText: $('#loadingText'), bar: $('#progressBar'),
  state: $('#stateLabel'), fps: $('#fpsValue'), sheet: $('#sheet'), dot: $('#modelStatus'),
  title: $('#statusTitle'), sub: $('#statusSubtitle'), animBadge: $('#animationBadge'), animInfo: $('#animationInfo'),
  texBadge: $('#textureBadge'), texInfo: $('#textureInfo'), weaponBadge: $('#weaponBadge'), weaponInfo: $('#weaponInfo'),
  weaponLabel: $('#weaponLabel'), weaponHudName: $('#weaponHudName'), ammo: $('#ammoValue'), toast: $('#toast'),
  meshes: $('#meshCount'), bones: $('#boneCount'), textures: $('#textureCount'), clips: $('#clipCount'),
  crosshair: $('#crosshair'), aimButton: $('#aimButton'), fireButton: $('#fireButton')
};

const ASSETS = {
  michael: './assets/michael.fbx',
  walk: './assets/michael_walk.fbx',
  textures: {
    shoes: ['shoes.webp.b64'],
    hair: ['hair.00.b64','hair.01.b64','hair.02.b64','hair.03.b64','hair.04.b64'],
    hands: ['hands.webp.b64'],
    face: ['face_body.00.b64','face_body.01.b64'],
    pants: ['pants.webp.b64'],
    mouth: ['mouth.webp.b64'],
    jacket: ['jacket_shirt.webp.b64']
  }
};

const WEAPONS = {
  pistol: {
    label: 'Pistol', url: './assets/weapons/pistol.glb', length: .36,
    mag: 12, reserve: 60, fireDelay: .19, recoilImpulse: 5.9, cameraImpulse: .85,
    offset: [.045,-.018,.008], rotation: [0,-Math.PI/2,Math.PI/2], muzzle: [.30,.003,0]
  },
  smg: {
    label: 'SMG', url: './assets/weapons/smg.glb', length: .61,
    mag: 30, reserve: 120, fireDelay: .085, recoilImpulse: 3.1, cameraImpulse: .46,
    offset: [.05,-.022,.01], rotation: [0,-Math.PI/2,Math.PI/2], muzzle: [.52,.006,0]
  },
  shotgun: {
    label: 'Sawed-off', url: './assets/weapons/shotgun.glb', length: .74,
    mag: 2, reserve: 24, fireDelay: .68, recoilImpulse: 9.2, cameraImpulse: 1.35,
    offset: [.055,-.025,.012], rotation: [0,-Math.PI/2,Math.PI/2], muzzle: [.64,.006,0]
  }
};

const CFG = {
  height: 1.82, walkSpeed: 2.05, runSpeed: 4.45, gravity: 18.5, jumpSpeed: 6.15,
  cameraDistance: 4.15, dpr: 1.5
};

const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, CFG.dpr));
renderer.setSize(innerWidth, innerHeight, false);

const scene = new THREE.Scene();
scene.background = ENV_CURRENT.sky_atmosphere.clone();
scene.fog = new THREE.FogExp2(ENV_CURRENT.sky_atmosphere.clone(), .0132);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .045, 210);

const hemi = new THREE.HemisphereLight(ENV_CURRENT.sky_atmosphere, ENV_CURRENT.earth_terrain, 1.72);
scene.add(hemi);
const sun = new THREE.DirectionalLight(ENV_CURRENT.sunlight_highlight, 2.55);
sun.position.set(-11, 18, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.5,far:58});
sun.shadow.bias = -.00032; scene.add(sun);
const sunTarget = new THREE.Object3D(); scene.add(sunTarget); sun.target = sunTarget;
const fill = new THREE.DirectionalLight(ENV_CURRENT.sky_atmosphere,.30); fill.position.set(9,8,-8); scene.add(fill);

const world = new THREE.Group();
const root = new THREE.Group();
scene.add(world, root);
const collisionBoxes = [], shootables = [];
buildWorld();
atmosphere = buildAtmosphere();
const minimap = createProjectVMinimap({ root, worldExtent: 60, toast });

let michael = null, mixer = null, skeleton = null;
let bones = new Map(), restPose = new Map(), actions = {}, active = null;
let ready = false, gameState = 'loading', grounded = true, vy = 0, jumpTime = 0, landTime = 0;
let speed = 0, runHeld = false, quality = 0, idleClock = 0;
let aim = false, aimWeight = 0, fireHeld = false, lastShot = -99;
let recoilAngle = 0, recoilVelocity = 0, slideAmount = 0, slideVelocity = 0;
let cameraKick = 0, cameraKickVelocity = 0;
let balanceLean = 0, balanceVelocity = 0, balanceTwist = 0, balanceTwistVelocity = 0;
let reloadTimer = 0, reloadDuration = 1.18;
let weaponKey = 'pistol', weaponMount = null, weaponPivot = null, weaponModel = null, weaponHand = null, muzzleSocket = null, slideNode = null;
const weaponAmmo = Object.fromEntries(Object.entries(WEAPONS).map(([k,w]) => [k,{mag:w.mag,reserve:w.reserve}]));

const move = new THREE.Vector2();
const forward = new THREE.Vector3(), right = new THREE.Vector3(), desired = new THREE.Vector3(), up = new THREE.Vector3(0,1,0);
const targetQ = new THREE.Quaternion(), tempQ = new THREE.Quaternion(), tempV = new THREE.Vector3(), tempScale = new THREE.Vector3();
const orbit = { yaw: Math.PI*.78, pitch: .25, distance: CFG.cameraDistance };
const raycaster = new THREE.Raycaster(), screenCenter = new THREE.Vector2(0,0);
let last = performance.now(), fpsAcc = 0, fpsFrames = 0, fpsAt = last, toastTimer = null;

installGuards();
installControls();
installEnvironmentControl();
boot();
requestAnimationFrame(frame);
keyboardLoop();

async function boot(){
  progress(.03,'Loading Michael…');
  try {
    michael = await new FBXLoader().loadAsync(`${ASSETS.michael}?v=${VERSION}`, e => {
      if(e.lengthComputable) progress(.03 + .22*(e.loaded/e.total), `Loading Michael… ${Math.round(e.loaded/e.total*100)}%`);
    });
    prepareCharacter(michael);
    mixer = new THREE.AnimationMixer(michael);
    bones = collectBones(michael);
    captureRestPose();

    progress(.28,'Loading Michael texture atlases…');
    const textures = await loadTextureSet();
    const textureResult = applyCharacterTextures(michael, textures);

    progress(.48,'Building fluid animation state machine…');
    actions.idle = loop(proceduralIdle());
    actions.run = loop(proceduralRun('run', .76, .73, .54));
    actions.sprint = loop(proceduralRun('sprint', .62, .92, .70));
    actions.jumpStart = once(jumpStart());
    actions.jumpAir = loop(jumpAir());
    actions.jumpLand = once(jumpLand());

    let mappedWalk = false;
    try {
      const source = await new FBXLoader().loadAsync(`${ASSETS.walk}?v=${VERSION}`);
      if(source?.animations?.[0]){
        const mapped = mapClip(source.animations[0], 'michael_walk_mapped');
        if(mapped.tracks.length){ actions.walk = loop(mapped); mappedWalk = true; }
      }
    } catch(error){ console.warn('Meshy walk unavailable; using procedural walk.', error); }
    if(!mappedWalk) actions.walk = loop(proceduralWalk());

    actions.idle.play(); active = actions.idle;
    const info = inspect(michael);
    ui.animBadge.textContent = mappedWalk ? '60 FPS mapped' : 'Procedural';
    ui.animInfo.textContent = mappedWalk
      ? 'Meshy walk is mapped to Michael. Idle, run, sprint, jump, aiming, recoil and balance are blended around it.'
      : 'Procedural locomotion is active. Aim, recoil and balance are layered without replacing the lower-body controller.';
    ui.texBadge.textContent = textureResult.applied ? 'Mapped' : 'Loaded';
    ui.texInfo.textContent = textureResult.message;
    updateDiagnostics(info);

    skeleton = new THREE.SkeletonHelper(michael);
    skeleton.visible = false; skeleton.material.depthTest = false; skeleton.material.transparent = true; skeleton.material.opacity = .52;
    scene.add(skeleton);

    root.position.set(0,0,4.6); root.rotation.y = Math.PI;
    resetCamera(true);
    progress(.78,'Calibrating pistol and right-hand socket…');
    await equipWeapon('pistol');

    gameState = 'idle'; ready = true;
    ui.state.textContent = 'Ready'; ui.title.textContent = 'Michael is playable';
    ui.sub.textContent = `${info.bones} bones · ${info.meshes} mesh · ${textureResult.count} texture atlases · local weapons online`;
    ui.dot.classList.add('ready');
    progress(1,'Ready'); setTimeout(()=>ui.loading.classList.add('done'),230);
  } catch(error){ fail(error); }
}

function prepareCharacter(obj){
  obj.name = 'Michael'; obj.updateMatrixWorld(true);
  const initial = new THREE.Box3().setFromObject(obj), h = initial.getSize(new THREE.Vector3()).y;
  if(!Number.isFinite(h) || h <= 0) throw new Error('Michael FBX has no measurable skinned mesh.');
  obj.scale.setScalar(CFG.height / h); obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj); obj.position.y -= box.min.y;
  obj.traverse(node => {
    if(!node.isMesh) return;
    node.castShadow = true; node.receiveShadow = true; node.frustumCulled = true;
  });
  root.add(obj);
}

async function loadTextureSet(){
  const entries = Object.entries(ASSETS.textures);
  const loaded = await Promise.all(entries.map(async ([name,parts]) => [name, await loadB64Texture(parts)]));
  return Object.fromEntries(loaded);
}

async function loadB64Texture(parts){
  let encoded = '';
  for(const file of parts){
    const r = await fetch(`./assets/textures/${file}?v=${VERSION}`, {cache:'no-store'});
    if(!r.ok) throw new Error(`Texture part ${file} failed (${r.status}).`);
    encoded += (await r.text()).trim();
  }
  const raw = atob(encoded), bytes = new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++) bytes[i] = raw.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
  try {
    const tex = await new THREE.TextureLoader().loadAsync(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  } finally { URL.revokeObjectURL(url); }
}

function makeCharacterMaterials(t){
  const mk = (map, roughness=.78, opts={}) => new THREE.MeshStandardMaterial({
    map, color:0xffffff, roughness, metalness:0,
    transparent: !!opts.transparent, alphaTest: opts.alphaTest || 0,
    side: THREE.FrontSide
  });
  return [
    mk(t.shoes,.70),
    mk(t.hair,.88,{transparent:true,alphaTest:.28}),
    mk(t.hands,.72),
    mk(t.face,.70),
    mk(t.pants,.88),
    mk(t.mouth,.66,{transparent:true,alphaTest:.05}),
    mk(t.jacket,.83)
  ];
}

function applyCharacterTextures(obj, textures){
  const mats = makeCharacterMaterials(textures);
  let applied = 0, rebuilt = 0, grouped = 0;
  obj.traverse(node => {
    if(!node.isMesh || !node.geometry?.attributes?.uv) return;
    const geo = node.geometry;
    const distinct = new Set((geo.groups||[]).map(g=>g.materialIndex));
    if(geo.groups?.length >= 5 && distinct.size >= 5){
      node.material = mats;
      for(const g of geo.groups) g.materialIndex = THREE.MathUtils.clamp(g.materialIndex,0,mats.length-1);
      grouped++; applied++; return;
    }
    const rebuiltGeo = rebuildGeometryByBodyRegion(geo, mats.length);
    if(rebuiltGeo){ node.geometry = rebuiltGeo; node.material = mats; rebuilt++; applied++; }
  });
  return {
    applied: applied>0, count:Object.keys(textures).length,
    message: applied
      ? `${Object.keys(textures).length} uploaded atlases loaded. ${grouped?`${grouped} existing material-group mesh${grouped===1?'':'es'} preserved. `:''}${rebuilt?`${rebuilt} merged mesh${rebuilt===1?'':'es'} split into body regions for shoes, pants, jacket, skin and hair.`:''}`
      : 'Texture atlases loaded, but this FBX exposed no UV-mapped mesh to receive them.'
  };
}

function rebuildGeometryByBodyRegion(source, materialCount){
  const geo = source.index ? source.toNonIndexed() : source.clone();
  const pos = geo.getAttribute('position');
  if(!pos || pos.count < 3) return null;
  geo.computeBoundingBox();
  const box = geo.boundingBox, size = box.getSize(new THREE.Vector3());
  if(size.y <= 0) return null;
  const attrs = Object.fromEntries(Object.entries(geo.attributes).filter(([,a])=>a?.array && a.itemSize));
  const morph = Object.keys(geo.morphAttributes||{});
  if(morph.length) console.warn('Project V texture mapper: morph attributes are not regrouped.', morph);
  const buckets = Array.from({length:materialCount},()=>[]);
  for(let i=0;i<pos.count;i+=3){
    const cx=(pos.getX(i)+pos.getX(i+1)+pos.getX(i+2))/3;
    const cy=(pos.getY(i)+pos.getY(i+1)+pos.getY(i+2))/3;
    const cz=(pos.getZ(i)+pos.getZ(i+1)+pos.getZ(i+2))/3;
    buckets[classifyBodyTriangle(cx,cy,cz,box,size)].push(i,i+1,i+2);
  }
  const out = new THREE.BufferGeometry();
  const total = buckets.reduce((n,b)=>n+b.length,0);
  for(const [name,attr] of Object.entries(attrs)){
    const Ctor = attr.array.constructor, arr = new Ctor(total*attr.itemSize);
    let o=0;
    for(const bucket of buckets){
      for(const vi of bucket){
        const base=vi*attr.itemSize;
        for(let c=0;c<attr.itemSize;c++) arr[o++] = attr.array[base+c];
      }
    }
    out.setAttribute(name,new THREE.BufferAttribute(arr,attr.itemSize,attr.normalized));
  }
  let start=0;
  buckets.forEach((bucket,materialIndex)=>{ if(bucket.length){ out.addGroup(start,bucket.length,materialIndex); start+=bucket.length; } });
  out.computeBoundingBox(); out.computeBoundingSphere();
  out.name = `${source.name||'Michael'}_textured_regions`;
  return out;
}

function classifyBodyTriangle(cx,cy,cz,box,size){
  const x=(cx-box.min.x)/(size.x||1), y=(cy-box.min.y)/(size.y||1), z=(cz-box.min.z)/(size.z||1);
  const side=Math.abs(x-.5);
  if(y < .115) return 0;                       // shoes
  if(y < .515) return 4;                       // trousers
  if(y < .79){
    if(side > .355 && y > .49) return 2;       // exposed hands / wrists
    return 6;                                  // jacket + shirt
  }
  if(y > .947) return 1;                       // hair cap / crown
  if(y > .822 && y < .885 && side < .17 && z > .52) return 5; // mouth/teeth only on front-center facial triangles
  return 3;                                    // face / neck skin
}

function inspect(obj){
  const textures=new Set(); let meshes=0,boneCount=0,clips=Object.keys(actions).length;
  obj.traverse(n=>{
    if(n.isBone) boneCount++;
    if(!n.isMesh) return; meshes++;
    for(const m of(Array.isArray(n.material)?n.material:[n.material])){
      if(!m) continue; for(const v of Object.values(m)) if(v?.isTexture) textures.add(v.uuid);
    }
  });
  return {meshes,bones:boneCount,textures:textures.size,clips};
}
function updateDiagnostics(info){
  ui.meshes.textContent=info.meshes; ui.bones.textContent=info.bones; ui.textures.textContent=info.textures; ui.clips.textContent=info.clips;
}

function norm(name=''){ return name.split('|').pop().split(':').pop().replace(/[^a-z0-9]/gi,'').toLowerCase(); }
function collectBones(obj){ const map=new Map(); obj.traverse(n=>{if(n.isBone) map.set(norm(n.name),n)}); return map; }
function bone(...names){
  for(const n of names){const b=bones.get(norm(n));if(b)return b;}
  for(const [k,b] of bones) if(names.some(n=>k.endsWith(norm(n)))) return b;
  return null;
}
const OVERLAY_NAMES=['Hips','Spine','Spine01','Spine1','Chest','Neck','Head','LeftShoulder','RightShoulder','LeftArm','LeftUpperArm','LeftForeArm','LeftLowerArm','LeftHand','RightArm','RightUpperArm','RightForeArm','RightLowerArm','RightHand'];
function captureRestPose(){ restPose.clear(); for(const n of OVERLAY_NAMES){const b=bone(n);if(b&&!restPose.has(b.uuid))restPose.set(b.uuid,{bone:b,q:b.quaternion.clone(),p:b.position.clone()});} }
function resetOverlayPose(){ for(const {bone:b,q,p} of restPose.values()){b.quaternion.copy(q);b.position.copy(p);} }

function mapClip(source,name){
  const tracks=[];
  for(const st of source.tracks){
    const dot=st.name.lastIndexOf('.'); if(dot<1)continue;
    const target=bones.get(norm(st.name.slice(0,dot))); if(!target)continue;
    const prop=st.name.slice(dot+1), tr=st.clone(); tr.name=`${target.name}.${prop}`;
    if(prop==='position' && /hips|root/i.test(target.name) && tr.values.length>=3){
      const x=tr.values[0],z=tr.values[2]; for(let i=0;i<tr.values.length;i+=3){tr.values[i]=x;tr.values[i+2]=z;}
    }
    tracks.push(tr);
  }
  const clip=new THREE.AnimationClip(name,source.duration,tracks); clip.optimize(); return clip;
}
function loop(clip){const a=mixer.clipAction(clip);a.setLoop(THREE.LoopRepeat,Infinity);return a;}
function once(clip){const a=mixer.clipAction(clip);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;return a;}
function qTrack(tracks,times,b,deltas){
  if(!b)return; const base=b.quaternion.clone(),values=[];
  for(const [x,y,z] of deltas){const q=base.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z))).normalize();values.push(q.x,q.y,q.z,q.w);}
  tracks.push(new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`,times,values));
}
function pTrack(tracks,times,b,deltas){
  if(!b)return;const base=b.position.clone(),values=[];for(const[x,y,z]of deltas)values.push(base.x+x,base.y+y,base.z+z);
  tracks.push(new THREE.VectorKeyframeTrack(`${b.name}.position`,times,values));
}

function proceduralIdle(){
  const t=[0,.625,1.25,1.875,2.5,3.125,3.75,4.375,5],a=[];
  pTrack(a,t,bone('Hips'),[[0,0,0],[.004,.002,0],[.008,0,0],[.004,-.001,0],[0,0,0],[-.004,.001,0],[-.008,0,0],[-.004,.001,0],[0,0,0]]);
  qTrack(a,t,bone('Spine'),[[0,0,0],[.004,.005,.004],[.008,.01,.006],[.004,.004,.002],[0,-.004,-.002],[-.004,-.006,-.004],[-.007,-.008,-.004],[-.003,-.002,-.002],[0,0,0]]);
  qTrack(a,t,bone('Spine01','Spine1','Chest'),[[0,0,0],[.01,0,0],[.017,.004,0],[.009,0,0],[.002,-.004,0],[.012,0,0],[.018,-.004,0],[.009,0,0],[0,0,0]]);
  qTrack(a,t,bone('Head'),[[0,0,0],[.002,-.012,0],[0,-.018,.003],[-.002,-.008,0],[0,.004,0],[.002,.018,-.003],[0,.024,-.004],[-.002,.008,0],[0,0,0]]);
  qTrack(a,t,bone('LeftArm','LeftUpperArm'),[[0,0,0],[.006,0,.004],[.012,0,.007],[.006,0,.003],[0,0,0],[-.005,0,-.003],[-.01,0,-.005],[-.004,0,-.002],[0,0,0]]);
  qTrack(a,t,bone('RightArm','RightUpperArm'),[[0,0,0],[-.005,0,-.004],[-.01,0,-.006],[-.004,0,-.003],[0,0,0],[.006,0,.003],[.011,0,.006],[.005,0,.002],[0,0,0]]);
  return new THREE.AnimationClip('idle_personality',5,a);
}
function proceduralWalk(){ return proceduralRun('walk',1.04,.40,.30); }
function proceduralRun(name,duration,legAmp,armAmp){
  const samples=9,t=[],la=[],ra=[],lk=[],rk=[],lar=[],rar=[],sp=[],hips=[];
  for(let i=0;i<samples;i++){
    const u=i/(samples-1),phase=u*Math.PI*2,s=Math.sin(phase),c=Math.cos(phase);
    t.push(u*duration);
    la.push([-legAmp*s,0,0]); ra.push([legAmp*s,0,0]);
    lk.push([Math.max(0,.58*c)*legAmp,0,0]); rk.push([Math.max(0,-.58*c)*legAmp,0,0]);
    lar.push([armAmp*s,0,.025*c]); rar.push([-armAmp*s,0,-.025*c]);
    sp.push([name==='walk'?.015:.055, -.035*s, -.018*s]);
    hips.push([0,(name==='walk'?.006:.014)*(1-Math.cos(phase*2)),0]);
  }
  const a=[];qTrack(a,t,bone('LeftUpLeg'),la);qTrack(a,t,bone('RightUpLeg'),ra);qTrack(a,t,bone('LeftLeg'),lk);qTrack(a,t,bone('RightLeg'),rk);
  qTrack(a,t,bone('LeftArm','LeftUpperArm'),lar);qTrack(a,t,bone('RightArm','RightUpperArm'),rar);qTrack(a,t,bone('Spine'),sp);pTrack(a,t,bone('Hips'),hips);
  return new THREE.AnimationClip(name,duration,a);
}
function jumpStart(){const t=[0,.15,.39],a=[];for(const n of['LeftUpLeg','RightUpLeg'])qTrack(a,t,bone(n),[[0,0,0],[-.38,0,0],[.08,0,0]]);for(const n of['LeftLeg','RightLeg'])qTrack(a,t,bone(n),[[0,0,0],[.52,0,0],[.12,0,0]]);qTrack(a,t,bone('Spine'),[[0,0,0],[.12,0,0],[-.035,0,0]]);qTrack(a,t,bone('LeftArm','LeftUpperArm'),[[0,0,0],[.18,0,0],[-.22,0,0]]);qTrack(a,t,bone('RightArm','RightUpperArm'),[[0,0,0],[.18,0,0],[-.22,0,0]]);return new THREE.AnimationClip('jumpStart',.39,a);}
function jumpAir(){const t=[0,.32,.64],a=[];qTrack(a,t,bone('LeftUpLeg'),[[.1,0,0],[.17,0,.03],[.1,0,0]]);qTrack(a,t,bone('RightUpLeg'),[[.1,0,0],[.06,0,-.03],[.1,0,0]]);qTrack(a,t,bone('LeftArm','LeftUpperArm'),[[-.2,0,0],[-.12,0,.04],[-.2,0,0]]);qTrack(a,t,bone('RightArm','RightUpperArm'),[[-.2,0,0],[-.12,0,-.04],[-.2,0,0]]);return new THREE.AnimationClip('jumpAir',.64,a);}
function jumpLand(){const t=[0,.14,.34,.60],a=[];for(const n of['LeftUpLeg','RightUpLeg'])qTrack(a,t,bone(n),[[.08,0,0],[-.40,0,0],[-.18,0,0],[0,0,0]]);for(const n of['LeftLeg','RightLeg'])qTrack(a,t,bone(n),[[.1,0,0],[.60,0,0],[.28,0,0],[0,0,0]]);qTrack(a,t,bone('Spine'),[[-.03,0,0],[.20,0,0],[.08,0,0],[0,0,0]]);return new THREE.AnimationClip('jumpLand',.60,a);}
function setAction(name,fade=.18,restart=false,timeScale=1){
  const next=actions[name]; if(!next || (next===active&&!restart)){next?.setEffectiveTimeScale(timeScale);return;}
  next.enabled=true; if(restart||next!==active)next.reset(); next.setEffectiveWeight(1).setEffectiveTimeScale(timeScale).play();
  if(active&&active!==next) active.crossFadeTo(next,fade,false); active=next;
}


function buildAtmosphere(){
  const group = new THREE.Group(); group.name='ProjectV_Atmosphere'; scene.add(group);
  const skyMat = new THREE.ShaderMaterial({
    side:THREE.BackSide, depthWrite:false, depthTest:false,
    uniforms:{uZenith:{value:ENV_CURRENT.sky_atmosphere.clone()},uHorizon:{value:ENV_CURRENT.sunlight_highlight.clone()},uShadow:{value:ENV_CURRENT.shadow_ao.clone()}},
    vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 vUv;uniform vec3 uZenith;uniform vec3 uHorizon;uniform vec3 uShadow;void main(){float h=smoothstep(.08,.78,vUv.y);vec3 c=mix(uHorizon,uZenith,h);float low=1.0-smoothstep(.04,.23,vUv.y);c=mix(c,uShadow,low*.10);gl_FragColor=vec4(c,1.0);}`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(176,32,16),skyMat);sky.renderOrder=-20;group.add(sky);

  const cloudVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
  const cloudFragment=`
    precision mediump float;varying vec2 vUv;uniform float uTime;uniform float uCoverage;uniform float uOpacity;uniform vec3 uLight;uniform vec3 uShade;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(17.2,9.1);a*=.5;}return v;}
    void main(){vec2 p=vec2(vUv.x*7.5+uTime*.010,vUv.y*3.0);float n=fbm(p)+.32*fbm(p*2.15-vec2(uTime*.006,0.));n/=1.32;float edge=smoothstep(.02,.19,vUv.y)*(1.0-smoothstep(.70,.98,vUv.y));float d=smoothstep(1.0-uCoverage,1.02,n)*edge;float lit=clamp(vUv.y*.92+n*.30,.0,1.);vec3 c=mix(uShade,uLight,lit);gl_FragColor=vec4(c,d*uOpacity);}
  `;
  function ring(radius,height,y,opacity,speed){
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,uniforms:{uTime:{value:0},uCoverage:{value:.56},uOpacity:{value:opacity},uLight:{value:ENV_CURRENT.sunlight_highlight.clone()},uShade:{value:ENV_CURRENT.shadow_ao.clone()}},vertexShader:cloudVertex,fragmentShader:cloudFragment});
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,64,1,true),mat);mesh.position.y=y;mesh.userData.speed=speed;mesh.renderOrder=-8;group.add(mesh);return mesh;
  }
  const ringFar=ring(138,52,26,.72,1.0), ringNear=ring(104,40,22,.31,1.42);

  const hatMat=new THREE.MeshBasicMaterial({color:ENV_CURRENT.sunlight_highlight,transparent:true,opacity:.16,depthWrite:false});
  const hatGeo=new THREE.IcosahedronGeometry(1,1);const hats=new THREE.InstancedMesh(hatGeo,hatMat,30);hats.renderOrder=-7;
  const dummy=new THREE.Object3D();let idx=0;
  for(let cluster=0;cluster<10;cluster++){
    const a=(cluster/10)*Math.PI*2+0.19*Math.sin(cluster*8.7),r=72+(cluster%3)*7,baseY=23+(cluster%4)*2.4;
    for(let lobe=0;lobe<3;lobe++){
      dummy.position.set(Math.sin(a)*r+(lobe-1)*3.8,baseY+(lobe===1?1.5:0),Math.cos(a)*r+(lobe-1)*1.7);
      dummy.scale.set(5.8+(cluster%3)*1.2,2.1+(lobe===1?.9:0),3.2+(cluster%2));dummy.rotation.set(0,a+.5*lobe,0);dummy.updateMatrix();hats.setMatrixAt(idx++,dummy.matrix);
    }
  }
  hats.instanceMatrix.needsUpdate=true;group.add(hats);
  return {group,sky,skyMat,rings:[ringFar,ringNear],hats,hatMat};
}

function setEnvironmentPreset(name,instant=false){
  if(!GAME_PALETTES[name])return;targetEnvironmentPreset=name;
  for(const[k,v]of Object.entries(GAME_PALETTES[name]))ENV_TARGET[k].setHex(v);
  if(instant)for(const k of Object.keys(ENV_CURRENT))ENV_CURRENT[k].copy(ENV_TARGET[k]);
  const label=$('#environmentLabel');if(label)label.textContent=name[0].toUpperCase()+name.slice(1);
  toast(`Lighting: ${name}`);
}
function installEnvironmentControl(){
  const list=$('.setting-list');if(!list||$('#environmentToggle'))return;
  const b=document.createElement('button');b.id='environmentToggle';b.className='setting';b.type='button';b.innerHTML='<span><b>Time & weather</b><small>Chrometry palette + GTA-style cloud ring</small></span><em id="environmentLabel">Sunrise</em>';
  const quality=$('#qualityToggle');list.insertBefore(b,quality||null);b.addEventListener('click',()=>{const i=ENV_ORDER.indexOf(targetEnvironmentPreset);setEnvironmentPreset(ENV_ORDER[(i+1)%ENV_ORDER.length]);});
}
function setAtmosphereQuality(balanced){if(!atmosphere)return;atmosphere.rings[1].visible=balanced;atmosphere.hats.visible=balanced;}
function updateEnvironment(dt,now){
  const blend=1-Math.exp(-dt*1.55);for(const k of Object.keys(ENV_CURRENT))ENV_CURRENT[k].lerp(ENV_TARGET[k],blend);
  if(scene.background?.isColor)scene.background.copy(ENV_CURRENT.sky_atmosphere);scene.fog.color.copy(ENV_CURRENT.sky_atmosphere);
  const isDay=targetEnvironmentPreset==='day',isEvening=targetEnvironmentPreset==='evening';scene.fog.density=THREE.MathUtils.lerp(scene.fog.density,isEvening?.0172:isDay?.0106:.0132,1-Math.exp(-dt*.8));
  hemi.color.copy(ENV_CURRENT.sky_atmosphere);hemi.groundColor.copy(ENV_CURRENT.earth_terrain);hemi.intensity=THREE.MathUtils.lerp(hemi.intensity,isEvening?1.22:isDay?1.95:1.66,blend);
  fill.color.copy(ENV_CURRENT.sky_atmosphere);fill.intensity=THREE.MathUtils.lerp(fill.intensity,isEvening?.18:.28,blend);
  const t=now*.001,coverage=isEvening?.66:isDay?.48:.56,passing=.5+.28*Math.sin(t*.12)+.22*Math.sin(t*.047+1.7);
  sun.color.copy(ENV_CURRENT.sunlight_highlight);const sunBase=isEvening?1.45:isDay?3.05:2.38;sun.intensity=THREE.MathUtils.lerp(sun.intensity,sunBase*(1-.13*coverage*passing),blend);
  sunTarget.position.copy(root.position).setY(1.0);sun.position.set(root.position.x-13,isEvening?10:18,root.position.z+9);

  if(ENV_MATS.ground)ENV_MATS.ground.color.copy(ENV_CURRENT.vegetation_grass);
  if(ENV_MATS.road)ENV_MATS.road.color.copy(ENV_CURRENT.neutral_structure).lerp(ENV_CURRENT.shadow_ao,.34);
  ENV_MATS.buildings.forEach((m,i)=>m.color.copy(ENV_CURRENT.neutral_structure).lerp(i%2?ENV_CURRENT.earth_terrain:ENV_CURRENT.sunlight_highlight,.22+(i%3)*.06));
  if(ENV_MATS.trunk)ENV_MATS.trunk.color.copy(ENV_CURRENT.earth_terrain).lerp(ENV_CURRENT.shadow_ao,.32);
  if(ENV_MATS.leaf)ENV_MATS.leaf.color.copy(ENV_CURRENT.vegetation_grass).lerp(ENV_CURRENT.shadow_ao,.08);

  if(atmosphere){
    atmosphere.group.position.set(root.position.x,0,root.position.z);
    atmosphere.skyMat.uniforms.uZenith.value.copy(ENV_CURRENT.sky_atmosphere);atmosphere.skyMat.uniforms.uHorizon.value.copy(ENV_CURRENT.sunlight_highlight);atmosphere.skyMat.uniforms.uShadow.value.copy(ENV_CURRENT.shadow_ao);
    atmosphere.rings.forEach((r,i)=>{r.material.uniforms.uTime.value=t*r.userData.speed+i*11.3;r.material.uniforms.uCoverage.value=coverage;r.material.uniforms.uLight.value.copy(ENV_CURRENT.sunlight_highlight);r.material.uniforms.uShade.value.copy(ENV_CURRENT.shadow_ao).lerp(ENV_CURRENT.earth_terrain,.18);});
    atmosphere.hatMat.color.copy(ENV_CURRENT.sunlight_highlight).lerp(ENV_CURRENT.sky_atmosphere,.25);atmosphere.hatMat.opacity=isEvening?.12:.16;
  }
  if(environmentPreset!==targetEnvironmentPreset){let close=true;for(const k of Object.keys(ENV_CURRENT))if(ENV_CURRENT[k].distanceTo(ENV_TARGET[k])>.008){close=false;break;}if(close)environmentPreset=targetEnvironmentPreset;}
}

function buildWorld(){
  ENV_MATS.ground=new THREE.MeshStandardMaterial({color:GAME_PALETTES.sunrise.vegetation_grass,roughness:1});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,120),ENV_MATS.ground);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;world.add(ground);shootables.push(ground);
  ENV_MATS.road=new THREE.MeshStandardMaterial({color:GAME_PALETTES.sunrise.neutral_structure,roughness:.97});
  for(const geo of[new THREE.PlaneGeometry(16,120),new THREE.PlaneGeometry(120,16)]){const r=new THREE.Mesh(geo,ENV_MATS.road);r.rotation.x=-Math.PI/2;r.position.y=.006;world.add(r);shootables.push(r);}
  const geo=new THREE.BoxGeometry(1,1,1),blocks=[[-24,-24,11,10,9],[-39,-23,11,16,7],[24,-25,13,11,12],[40,-26,12,12,8],[-24,24,12,13,7],[-40,26,11,11,11],[25,25,12,12,9],[41,27,12,15,13],[-24,-42,12,12,14],[24,-42,12,12,8],[-24,42,12,12,10],[24,42,12,12,15]];
  const buildingMats=Array.from({length:4},(_,i)=>new THREE.MeshStandardMaterial({color:new THREE.Color(GAME_PALETTES.sunrise.neutral_structure).lerp(new THREE.Color(i%2?GAME_PALETTES.sunrise.earth_terrain:GAME_PALETTES.sunrise.sunlight_highlight),.22+i*.05),roughness:.89}));ENV_MATS.buildings=buildingMats;
  blocks.forEach(([x,z,w,d,h],i)=>{const b=new THREE.Mesh(geo,buildingMats[i%buildingMats.length]);b.scale.set(w,h,d);b.position.set(x,h/2,z);b.receiveShadow=true;b.castShadow=i%3===0;world.add(b);shootables.push(b);collisionBoxes.push(new THREE.Box3(new THREE.Vector3(x-w/2-.5,0,z-d/2-.5),new THREE.Vector3(x+w/2+.5,h,z+d/2+.5)));});
  const trunkGeo=new THREE.CylinderGeometry(.12,.16,1.2,7),crownGeo=new THREE.IcosahedronGeometry(.65,1);ENV_MATS.trunk=new THREE.MeshStandardMaterial({color:GAME_PALETTES.sunrise.earth_terrain,roughness:1});ENV_MATS.leaf=new THREE.MeshStandardMaterial({color:GAME_PALETTES.sunrise.vegetation_grass,roughness:1});
  for(const[x,z]of[[-9,-22],[9,-30],[-10,29],[11,38],[-31,9],[31,-10],[-44,8],[44,-8]]){const tr=new THREE.Mesh(trunkGeo,ENV_MATS.trunk);tr.position.set(x,.6,z);const cr=new THREE.Mesh(crownGeo,ENV_MATS.leaf);cr.scale.set(1,1.28,1);cr.position.set(x,1.65,z);world.add(tr,cr);shootables.push(tr,cr);}
}
function blocked(p){return Math.abs(p.x)>55||Math.abs(p.z)>55||collisionBoxes.some(b=>p.x>b.min.x&&p.x<b.max.x&&p.z>b.min.z&&p.z<b.max.z);}

async function equipWeapon(key){
  weaponKey=key; const spec=WEAPONS[key]; updateAmmo();
  ui.weaponHudName.textContent=spec.label; ui.weaponLabel.textContent=spec.label;
  weaponHand=bone('RightHand','mixamorigRightHand');
  if(!weaponHand){ui.weaponBadge.textContent='No hand';ui.weaponInfo.textContent='Right-hand bone not found.';return;}
  if(weaponMount) weaponMount.removeFromParent();
  weaponMount=new THREE.Group(); weaponMount.name='WeaponWorldSocket'; scene.add(weaponMount);
  weaponPivot=new THREE.Group(); weaponMount.add(weaponPivot);
  muzzleSocket=new THREE.Object3D(); muzzleSocket.position.fromArray(spec.muzzle); weaponPivot.add(muzzleSocket);
  slideNode=null;
  try {
    const gltf=await new GLTFLoader().loadAsync(`${spec.url}?v=${VERSION}`);
    weaponModel=gltf.scene; fitWeaponModel(weaponModel,spec.length); weaponPivot.add(weaponModel);
    let visibleMeshes=0;
    weaponModel.traverse(n=>{
      if(/slide/i.test(n.name)&&!slideNode)slideNode=n;
      if(!n.isMesh)return;visibleMeshes++;n.visible=true;n.castShadow=true;n.receiveShadow=true;
      for(const m of(Array.isArray(n.material)?n.material:[n.material]))if(m){m.transparent=false;m.opacity=1;if('roughness'in m)m.roughness=Math.max(.34,m.roughness??.55);m.needsUpdate=true;}
    });
    if(!visibleMeshes) throw new Error('Weapon GLB contains no visible mesh.');
    ui.weaponBadge.textContent='Local GLB'; ui.weaponInfo.textContent=`${spec.label} is rendered at world scale and follows ${weaponHand.name}; it no longer inherits Michael's FBX scale.`;
  } catch(error){
    console.warn('Weapon model fallback:',error);weaponModel=createFallbackWeapon(key,spec.length);weaponPivot.add(weaponModel);ui.weaponBadge.textContent='Fallback';ui.weaponInfo.textContent=`${spec.label} fallback is active and follows ${weaponHand.name}.`;
  }
  syncWeaponSocket();
}
function fitWeaponModel(model,targetLength){
  model.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(model), size=box.getSize(new THREE.Vector3());
  const axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
  if(axis==='y')model.rotation.z=-Math.PI/2; else if(axis==='z')model.rotation.y=Math.PI/2;
  model.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(model);size=box.getSize(new THREE.Vector3());
  model.scale.multiplyScalar(targetLength/Math.max(size.x,.0001));model.updateMatrixWorld(true);
  box=new THREE.Box3().setFromObject(model);size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());
  model.position.x-=box.min.x + targetLength*.18; model.position.y-=center.y + size.y*.08; model.position.z-=center.z; model.updateMatrixWorld(true);
}
function createFallbackWeapon(key,len){
  const g=new THREE.Group(),dark=new THREE.MeshStandardMaterial({color:0x202321,roughness:.38,metalness:.48}),grip=new THREE.MeshStandardMaterial({color:0x101210,roughness:.82});
  const body=new THREE.Mesh(new THREE.BoxGeometry(len*.72,.055,.075),dark);body.position.x=len*.28;
  const handle=new THREE.Mesh(new THREE.BoxGeometry(.065,.15,.072),grip);handle.position.set(-len*.08,-.078,0);handle.rotation.z=-.22;g.add(body,handle);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,len*.25,10),dark);barrel.rotation.z=Math.PI/2;barrel.position.x=len*.72;g.add(barrel);return g;
}
function syncWeaponSocket(){
  if(!weaponMount||!weaponHand)return; const spec=WEAPONS[weaponKey];
  weaponHand.getWorldPosition(tempV); weaponHand.getWorldQuaternion(tempQ); weaponHand.getWorldScale(tempScale);
  const offset=new THREE.Vector3(...spec.offset).applyQuaternion(tempQ);
  weaponMount.position.copy(tempV).add(offset);
  weaponMount.quaternion.copy(tempQ).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...spec.rotation)));
  weaponMount.scale.setScalar(1);
  if(weaponPivot){
    weaponPivot.position.set(-recoilAngle*.012,-reloadPose()*0.035,0);
    weaponPivot.rotation.set(-recoilAngle*.105 + reloadPose()*.24,0,0);
  }
  if(slideNode){ slideNode.position.x = -Math.max(0,slideAmount)*.032; }
}
function updateAmmo(){const a=weaponAmmo[weaponKey],spec=WEAPONS[weaponKey];ui.ammo.textContent=a.mag;const s=$('#weaponPill .ammo small');if(s)s.textContent=`/ ${a.reserve}`;ui.weaponHudName.textContent=spec.label;}
function setAim(v){aim=!!v;ui.crosshair.classList.toggle('visible',aim);ui.aimButton.classList.toggle('active',aim);}
function reloadPose(){if(reloadTimer<=0)return 0;const u=1-reloadTimer/reloadDuration;return Math.sin(Math.PI*THREE.MathUtils.clamp(u,0,1));}
function reload(){
  if(reloadTimer>0)return;const a=weaponAmmo[weaponKey],spec=WEAPONS[weaponKey];if(a.mag>=spec.mag||a.reserve<=0)return toast(a.reserve<=0?'No reserve ammo':'Magazine is full');
  reloadTimer=reloadDuration;toast('Reloading…');
}
function completeReload(){const a=weaponAmmo[weaponKey],spec=WEAPONS[weaponKey],need=spec.mag-a.mag,take=Math.min(need,a.reserve);a.mag+=take;a.reserve-=take;updateAmmo();}
function tryShoot(){
  if(!ready||reloadTimer>0)return;const now=performance.now()/1000,spec=WEAPONS[weaponKey],a=weaponAmmo[weaponKey];if(now-lastShot<spec.fireDelay)return;if(a.mag<=0){reload();return;}
  lastShot=now;a.mag--;updateAmmo();if(!aim)setAim(true);
  recoilVelocity+=spec.recoilImpulse;slideVelocity+=8.5;cameraKickVelocity+=spec.cameraImpulse;
  flashMuzzleAndTrace();navigator.vibrate?.(weaponKey==='shotgun'?20:7);
}
function flashMuzzleAndTrace(){
  if(!muzzleSocket)return;
  const flash=new THREE.Mesh(new THREE.SphereGeometry(.032,7,5),new THREE.MeshBasicMaterial({color:0xffd18a,transparent:true,opacity:.95}));flash.scale.set(1.8,.75,.75);muzzleSocket.add(flash);
  const light=new THREE.PointLight(0xffc46b,6,.95,2);muzzleSocket.add(light);
  const from=new THREE.Vector3();muzzleSocket.getWorldPosition(from);
  raycaster.setFromCamera(screenCenter,camera);const hit=raycaster.intersectObjects(shootables,false)[0];
  const to=hit?.point?.clone()||raycaster.ray.at(85,new THREE.Vector3());
  if(hit)spawnImpact(hit.point,hit.face?.normal);
  const geo=new THREE.BufferGeometry().setFromPoints([from,to]),line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xffedbd,transparent:true,opacity:.75}));scene.add(line);
  setTimeout(()=>{flash.geometry.dispose();flash.material.dispose();flash.removeFromParent();light.removeFromParent();line.geometry.dispose();line.material.dispose();line.removeFromParent();},55);
}
function spawnImpact(point,normal){const mark=new THREE.Mesh(new THREE.SphereGeometry(.018,5,4),new THREE.MeshBasicMaterial({color:0x282724}));mark.position.copy(point).addScaledVector(normal||up,.012);scene.add(mark);setTimeout(()=>{mark.geometry.dispose();mark.material.dispose();mark.removeFromParent();},3200);}

function spring(value,velocity,target,stiffness,damping,dt){velocity+=(stiffness*(target-value)-damping*velocity)*dt;value+=velocity*dt;return[value,velocity];}
function applyBoneOffset(b,x,y,z,w=1){if(!b||w<=.001)return;b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x*w,y*w,z*w))).normalize();}
function applyProceduralLayer(dt){
  aimWeight+=((aim?1:0)-aimWeight)*(1-Math.exp(-dt*(aim?10.5:8.0)));
  [recoilAngle,recoilVelocity]=spring(recoilAngle,recoilVelocity,0,78,14,dt);
  [slideAmount,slideVelocity]=spring(slideAmount,slideVelocity,0,120,18,dt);
  [cameraKick,cameraKickVelocity]=spring(cameraKick,cameraKickVelocity,0,58,13,dt);
  [balanceLean,balanceVelocity]=spring(balanceLean,balanceVelocity,0,24,8.4,dt);
  [balanceTwist,balanceTwistVelocity]=spring(balanceTwist,balanceTwistVelocity,0,28,9.2,dt);
  const r=reloadPose(), w=aimWeight*(1-r*.38);
  applyBoneOffset(bone('RightArm','RightUpperArm'),-.78,-.19,-.15,w);
  applyBoneOffset(bone('RightForeArm','RightLowerArm'),-.70,.025,-.055,w);
  applyBoneOffset(bone('RightHand'),-.025,.035,-.025,w);
  applyBoneOffset(bone('LeftArm','LeftUpperArm'),-.67,.20,.16,w);
  applyBoneOffset(bone('LeftForeArm','LeftLowerArm'),-.89,-.045,.075,w);
  applyBoneOffset(bone('LeftHand'),.018,-.035,.032,w);
  applyBoneOffset(bone('RightShoulder'),-.035,-.035,-.035,w);
  applyBoneOffset(bone('LeftShoulder'),-.03,.035,.035,w);
  applyBoneOffset(bone('Spine01','Spine1','Chest'),-.055-recoilAngle*.12,balanceTwist*.52,balanceLean*.55,Math.max(w,Math.min(1,Math.abs(balanceLean)*3)));
  applyBoneOffset(bone('Spine'),-.018-recoilAngle*.05,balanceTwist*.28,balanceLean*.30,Math.max(w,Math.min(1,Math.abs(balanceLean)*3)));
  applyBoneOffset(bone('Hips'),0,balanceTwist*.16,balanceLean*.22,Math.min(1,Math.abs(balanceLean)*3));
  applyBoneOffset(bone('Head'),recoilAngle*.018,-balanceTwist*.15,-balanceLean*.12,Math.max(w*.45,Math.min(1,Math.abs(balanceLean)*2)));
  if(r>0){applyBoneOffset(bone('RightArm','RightUpperArm'),.16,0,.08,r);applyBoneOffset(bone('LeftArm','LeftUpperArm'),.24,0,-.10,r);}
  syncWeaponSocket();
}
function testImpact(){balanceVelocity += (Math.random()>.5?1:-1)*.78;balanceTwistVelocity += (Math.random()>.5?1:-1)*.55;toast('Balance recovery impulse');}

function updateCharacter(dt){
  if(!michael||!mixer)return;
  if(reloadTimer>0){const before=reloadTimer;reloadTimer=Math.max(0,reloadTimer-dt);if(before>0&&reloadTimer===0)completeReload();}
  if(fireHeld)tryShoot();
  const amount=Math.min(1,move.length()),moving=amount>.045,targetSpeed=moving?(runHeld?CFG.runSpeed:CFG.walkSpeed)*Math.max(.34,amount):0;
  speed+=(targetSpeed-speed)*(1-Math.exp(-dt*(targetSpeed>speed?7.5:9.5)));
  if(moving){
    idleClock=0;camera.getWorldDirection(forward);forward.y=0;forward.normalize();right.crossVectors(forward,up).normalize();
    desired.copy(forward).multiplyScalar(-move.y).addScaledVector(right,move.x).normalize();targetQ.setFromAxisAngle(up,Math.atan2(desired.x,desired.z));root.quaternion.slerp(targetQ,1-Math.exp(-dt*12));
    const step=desired.clone().multiplyScalar(speed*dt),px=root.position.clone();px.x+=step.x;if(!blocked(px))root.position.x=px.x;const pz=root.position.clone();pz.z+=step.z;if(!blocked(pz))root.position.z=pz.z;
  } else idleClock+=dt;

  if(!grounded){
    jumpTime+=dt;vy-=CFG.gravity*dt;root.position.y+=vy*dt;if(jumpTime>.30&&active!==actions.jumpAir)setAction('jumpAir',.10);
    if(root.position.y<=0){root.position.y=0;vy=0;grounded=true;jumpTime=0;landTime=.60;setAction('jumpLand',.08,true);gameState='landing';}else gameState='airborne';
  } else if(landTime>0){landTime=Math.max(0,landTime-dt);gameState='landing';if(!landTime)setAction(moving?(runHeld?'run':'walk'):'idle',.14);}
  else if(moving){
    if(runHeld){const sprinting=amount>.92&&speed>CFG.runSpeed*.86;setAction(sprinting?'sprint':'run',sprinting?.13:.16,false,sprinting?1.0:.96+amount*.08);gameState=sprinting?'sprinting':'running';}
    else{setAction('walk',.20,false,.88+amount*.18);gameState='walking';}
  } else {setAction('idle',.28,false,1);gameState='idle';}

  resetOverlayPose();mixer.update(dt);applyProceduralLayer(dt);
  ui.state.textContent=aim?(gameState==='running'||gameState==='sprinting'?'Aiming · Run':'Aiming'):gameState==='sprinting'?'Sprinting':gameState==='running'?'Running':gameState==='walking'?'Walking':gameState==='airborne'?'Airborne':gameState==='landing'?'Landing':idleClock>5?'Idle':'Ready';
}
function jump(){if(!michael||!grounded||landTime>.05)return;grounded=false;vy=CFG.jumpSpeed;jumpTime=0;landTime=0;setAction('jumpStart',.08,true);gameState='airborne';}
function updateCamera(dt){
  const target=root.position.clone().add(new THREE.Vector3(0,1.34,0)),pitch=orbit.pitch+cameraKick*.025,cp=Math.cos(pitch),dist=orbit.distance-(aim?.65:0);
  const shoulder=aim?.30:0,pos=new THREE.Vector3(Math.sin(orbit.yaw)*cp,Math.sin(pitch),Math.cos(orbit.yaw)*cp).multiplyScalar(dist).add(target);
  if(aim){right.set(Math.cos(orbit.yaw),0,-Math.sin(orbit.yaw));pos.addScaledVector(right,shoulder);target.addScaledVector(right,.12);}
  camera.position.lerp(pos,1-Math.exp(-dt*10));camera.lookAt(target.clone().add(new THREE.Vector3(0,aim?.14:.09,0)));
}
function resetCamera(immediate=false){orbit.yaw=root.rotation.y+Math.PI;orbit.pitch=.25;orbit.distance=CFG.cameraDistance;if(!immediate)return;const target=root.position.clone().add(new THREE.Vector3(0,1.34,0)),cp=Math.cos(orbit.pitch);camera.position.set(target.x+Math.sin(orbit.yaw)*cp*orbit.distance,target.y+Math.sin(orbit.pitch)*orbit.distance,target.z+Math.cos(orbit.yaw)*cp*orbit.distance);camera.lookAt(target);}

function installControls(){
  $('#menuButton')?.addEventListener('click',openSheet);$('#brand')?.addEventListener('click',openSheet);document.querySelectorAll('[data-close-sheet]').forEach(n=>n.addEventListener('click',closeSheet));
  $('#skeletonToggle')?.addEventListener('click',e=>{if(!skeleton)return toast('Skeleton becomes available after Michael loads.');skeleton.visible=!skeleton.visible;e.currentTarget.querySelector('em').textContent=skeleton.visible?'On':'Off';});
  $('#cameraReset')?.addEventListener('click',()=>{resetCamera();closeSheet();});$('#impactTest')?.addEventListener('click',testImpact);
  $('#qualityToggle')?.addEventListener('click',()=>{quality=(quality+1)%2;const balanced=!quality;renderer.setPixelRatio(Math.min(devicePixelRatio||1,balanced?1.5:1));renderer.shadowMap.enabled=balanced;setAtmosphereQuality(balanced);$('#qualityLabel').textContent=balanced?'Balanced':'Fast';toast(balanced?'Balanced quality':'Fast mode');});
  const cycleWeapon=async()=>{const order=['pistol','smg','shotgun'],next=order[(order.indexOf(weaponKey)+1)%order.length];await equipWeapon(next);toast(`${WEAPONS[next].label} equipped`);};
  $('#weaponToggle')?.addEventListener('click',cycleWeapon);$('#weaponButton')?.addEventListener('pointerdown',e=>{e.preventDefault();cycleWeapon();});
  ui.aimButton?.addEventListener('pointerdown',e=>{e.preventDefault();setAim(!aim);});
  ui.fireButton?.addEventListener('pointerdown',e=>{e.preventDefault();fireHeld=true;ui.fireButton.setPointerCapture?.(e.pointerId);tryShoot();});
  const stopFire=()=>{fireHeld=false;};ui.fireButton?.addEventListener('pointerup',stopFire);ui.fireButton?.addEventListener('pointercancel',stopFire);ui.fireButton?.addEventListener('pointerleave',stopFire);
  $('#reloadButton')?.addEventListener('pointerdown',e=>{e.preventDefault();reload();});$('#weaponPill')?.addEventListener('click',reload);

  const joy=$('#joystick'),knob=$('#joystickKnob');let joyId=null;
  function joyMove(x,y){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,rad=r.width*.31;let dx=x-cx,dy=y-cy,l=Math.hypot(dx,dy);if(l>rad){dx=dx/l*rad;dy=dy/l*rad;}knob.style.transform=`translate3d(${dx}px,${dy}px,0)`;move.set(dx/rad,dy/rad);}
  joy?.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);joy.classList.add('active');joyMove(e.clientX,e.clientY);});joy?.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e.clientX,e.clientY);});
  function joyUp(e){if(joyId!==null&&(!e||e.pointerId===joyId)){joyId=null;joy.classList.remove('active');knob.style.transform='translate3d(0,0,0)';move.set(0,0);}}joy?.addEventListener('pointerup',joyUp);joy?.addEventListener('pointercancel',joyUp);
  const run=$('#runButton');function setRun(v){runHeld=v;run?.classList.toggle('held',v);}run?.addEventListener('pointerdown',e=>{e.preventDefault();setRun(true);run.setPointerCapture?.(e.pointerId);});run?.addEventListener('pointerup',()=>setRun(false));run?.addEventListener('pointercancel',()=>setRun(false));
  $('#jumpButton')?.addEventListener('pointerdown',e=>{e.preventDefault();jump();});
  let camId=null,cx=0,cy=0;ui.canvas.addEventListener('pointerdown',e=>{if(e.clientX<innerWidth*.30)return;camId=e.pointerId;cx=e.clientX;cy=e.clientY;ui.canvas.setPointerCapture?.(e.pointerId);});ui.canvas.addEventListener('pointermove',e=>{if(e.pointerId!==camId)return;orbit.yaw-=(e.clientX-cx)*.006;orbit.pitch=THREE.MathUtils.clamp(orbit.pitch+(e.clientY-cy)*.0044,-.06,.72);cx=e.clientX;cy=e.clientY;});ui.canvas.addEventListener('pointerup',e=>{if(e.pointerId===camId)camId=null;});ui.canvas.addEventListener('pointercancel',e=>{if(e.pointerId===camId)camId=null;});
  const keys=new Set();addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='Space'){e.preventDefault();jump();}if(e.code==='ShiftLeft'||e.code==='ShiftRight')setRun(true);if(e.code==='KeyF'){fireHeld=true;tryShoot();}if(e.code==='KeyE')setAim(!aim);if(e.code==='KeyR')reload();if(e.code==='KeyQ')cycleWeapon();});addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='ShiftLeft'||e.code==='ShiftRight')setRun(false);if(e.code==='KeyF')fireHeld=false;});
  window.__projectVKeys=keys;window.__projectVJoy=()=>joyId;
}
function keyboardLoop(){const keys=window.__projectVKeys||new Set();let x=0,y=0;if(keys.has('KeyA')||keys.has('ArrowLeft'))x--;if(keys.has('KeyD')||keys.has('ArrowRight'))x++;if(keys.has('KeyW')||keys.has('ArrowUp'))y--;if(keys.has('KeyS')||keys.has('ArrowDown'))y++;if(x||y)move.set(x,y).normalize();else if(window.__projectVJoy?.()===null)move.set(0,0);requestAnimationFrame(keyboardLoop);}

function progress(p,text){if(ui.bar)ui.bar.style.width=`${Math.max(4,Math.min(100,p*100))}%`;if(ui.loadingText)ui.loadingText.textContent=text;}
function toast(msg){if(!ui.toast)return;ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1800);}
function fail(error){console.error('Project V v9 boot failed:',error);ui.dot?.classList.add('error');if(ui.title)ui.title.textContent='Michael needs attention';if(ui.sub)ui.sub.textContent=error?.message||'Unknown asset error';if(ui.state)ui.state.textContent='Asset error';ui.loading?.classList.add('done');openSheet();toast('Project V caught a startup issue.');}
function installGuards(){addEventListener('error',e=>{console.error('Runtime error:',e.error||e.message);if(ready)toast('A runtime issue was caught safely.');});addEventListener('unhandledrejection',e=>{console.error('Unhandled promise rejection:',e.reason);if(ready)toast('A background task failed safely.');});}
function openSheet(){ui.sheet?.classList.add('open');ui.sheet?.setAttribute('aria-hidden','false');}
function closeSheet(){ui.sheet?.classList.remove('open');ui.sheet?.setAttribute('aria-hidden','true');}

function frame(now){
  requestAnimationFrame(frame);const dt=Math.min(.04,Math.max(.001,(now-last)/1000));last=now;
  updateEnvironment(dt,now);updateCharacter(dt);updateCamera(dt);minimap.update(dt,now,{gameState,speed,runHeld,aim,ready});renderer.render(scene,camera);
  fpsAcc+=1/dt;fpsFrames++;if(now-fpsAt>650){ui.fps.textContent=Math.round(fpsAcc/fpsFrames);fpsAcc=fpsFrames=0;fpsAt=now;}
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);});
addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});document.addEventListener('gesturechange',e=>e.preventDefault(),{passive:false});