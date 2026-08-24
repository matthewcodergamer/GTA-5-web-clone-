import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ASSETS = {
  character: './assets/michael.fbx',
  walk: './assets/michael_walk.fbx'
};

const WEAPONS = {
  pistol: {
    label: 'Pistol',
    url: 'https://static.poly.pizza/f5a88c73-af97-49ca-8650-4bde579d2f80.glb',
    length: .29, mag: 12, reserve: 72, fireDelay: .18,
    mount: [.018, -.018, .012], rot: [0, -Math.PI / 2, Math.PI / 2]
  },
  smg: {
    label: 'SMG',
    url: 'https://static.poly.pizza/100fd5db-d5e8-4db7-8ad3-9a96cc217e56.glb',
    length: .52, mag: 30, reserve: 120, fireDelay: .09,
    mount: [.022, -.02, .012], rot: [0, -Math.PI / 2, Math.PI / 2]
  },
  shotgun: {
    label: 'Sawed-off',
    url: 'https://static.poly.pizza/9a6ee0ee-068b-4774-8b0f-679c3cef0b6e.glb',
    length: .60, mag: 2, reserve: 28, fireDelay: .62,
    mount: [.024, -.02, .012], rot: [0, -Math.PI / 2, Math.PI / 2]
  }
};

const CFG = {
  height: 1.82,
  walk: 2.05,
  run: 4.25,
  gravity: 18.5,
  jump: 6.15,
  camera: 4.1,
  dpr: 1.5
};

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

const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, powerPreference: 'high-performance' });
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
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .05, 180);
scene.add(new THREE.HemisphereLight(0xe8f2ff, 0x5c675b, 2.1));
const sun = new THREE.DirectionalLight(0xffedcb, 3);
sun.position.set(-10, 18, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: .5, far: 55 });
sun.shadow.bias = -.00035;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9fc5ff, .38);
fill.position.set(8, 7, -8);
scene.add(fill);

const world = new THREE.Group();
const root = new THREE.Group();
scene.add(world, root);
const collisionBoxes = [];
const shootables = [];
buildWorld();

let michael = null;
let mixer = null;
let skeleton = null;
let bones = new Map();
let actions = {};
let active = null;
let ready = false;
let state = 'loading';
let grounded = true;
let vy = 0;
let jumpTime = 0;
let landTime = 0;
let speed = 0;
let runHeld = false;
let quality = 0;
let aim = false;
let aimWeight = 0;
let recoil = 0;
let cameraKick = 0;
let balance = 0;
let balanceSide = 1;
let lastShot = -99;
let reloading = false;
let weaponKey = 'pistol';
let weaponMount = null;
let weaponModel = null;
let ammo = WEAPONS.pistol.mag;
let reserve = WEAPONS.pistol.reserve;

const move = new THREE.Vector2();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const desired = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const targetQ = new THREE.Quaternion();
const orbit = { yaw: Math.PI * .78, pitch: .28, distance: CFG.camera };
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

boot();
frame(performance.now());
keyboardLoop();
installGuards();

async function boot() {
  progress(.04, 'Loading Michael character FBX…');
  try {
    michael = await loadCharacter();
    progress(.36, 'Inspecting mesh, UVs and skeleton…');
    prepareCharacter(michael);
    mixer = new THREE.AnimationMixer(michael);
    bones = collectBones(michael);

    actions.idle = loop(proceduralIdle());
    actions.jumpStart = once(jumpStart());
    actions.jumpAir = loop(jumpAir());
    actions.jumpLand = once(jumpLand());
    actions.idle.play();
    active = actions.idle;

    progress(.48, 'Loading your 60 FPS walking animation…');
    let mapped = false;
    try {
      const src = await loadWalk();
      if (src?.animations?.[0]) {
        const clip = mapClip(src.animations[0]);
        if (clip.tracks.length) {
          actions.walk = loop(clip);
          mapped = true;
          ui.animBadge.textContent = 'Mapped';
          ui.animInfo.textContent = `${clip.tracks.length} tracks mapped onto Michael. Horizontal hip travel is removed so the controller owns world movement.`;
        }
      }
    } catch (error) {
      console.warn('Walking FBX unavailable; using procedural fallback.', error);
    }
    if (!mapped) {
      actions.walk = loop(proceduralWalk());
      ui.animBadge.textContent = 'Fallback';
      ui.animInfo.textContent = 'Procedural bone walk active. Import michael_walk.fbx from diagnostics whenever you want the supplied 60 FPS clip.';
    }

    const info = inspect(michael);
    updateDiagnostics(info, mapped);
    skeleton = new THREE.SkeletonHelper(michael);
    skeleton.visible = false;
    skeleton.material.depthTest = false;
    skeleton.material.transparent = true;
    skeleton.material.opacity = .55;
    scene.add(skeleton);
    // Important: SkeletonHelper does NOT expose update(). Normal scene traversal updates it.

    root.position.set(0, 0, 4.6);
    root.rotation.y = Math.PI;
    resetCamera(true);

    progress(.78, 'Attaching weapon to the right-hand bone…');
    await equipWeapon('pistol');

    state = 'idle';
    ready = true;
    ui.state.textContent = 'Ready';
    ui.title.textContent = 'Michael is playable';
    ui.sub.textContent = `${info.bones} bones · ${info.meshes} mesh · ${mapped ? '60 FPS walk mapped' : 'procedural walk'} · weapon socket online`;
    ui.dot.classList.add('ready');
    progress(1, 'Ready');
    setTimeout(() => ui.loading.classList.add('done'), 240);
  } catch (error) {
    fail(error);
  }
}

async function loadCharacter() {
  try {
    return await loadFBXUrl(ASSETS.character, (p) => progress(.04 + p * .28, `Loading Michael… ${Math.round(p * 100)}%`));
  } catch (networkError) {
    const bytes = await assetDBGet('michael');
    if (bytes) return new FBXLoader().parse(bytes, './assets/');
    const error = new Error('Michael FBX is not hosted yet. Import the supplied character FBX once from Diagnostics and it will be cached on this device.');
    error.code = 'MISSING_MICHAEL';
    throw error;
  }
}

async function loadWalk() {
  try {
    return await loadFBXUrl(ASSETS.walk);
  } catch (networkError) {
    const bytes = await assetDBGet('walk');
    if (!bytes) throw networkError;
    return new FBXLoader().parse(bytes, './assets/');
  }
}

function loadFBXUrl(url, onProgress) {
  const loader = new FBXLoader();
  return new Promise((resolve, reject) => loader.load(
    url,
    resolve,
    (event) => event.lengthComputable && onProgress?.(event.loaded / event.total),
    reject
  ));
}

function prepareCharacter(obj) {
  obj.name = 'Michael';
  obj.updateMatrixWorld(true);
  const box0 = new THREE.Box3().setFromObject(obj);
  const h = box0.getSize(new THREE.Vector3()).y;
  if (!Number.isFinite(h) || h <= 0) throw new Error('Michael FBX has no measurable skinned mesh.');
  obj.scale.setScalar(CFG.height / h);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box.min.y;
  obj.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!material) continue;
      if ('roughness' in material) material.roughness = Math.max(.5, material.roughness ?? .8);
      if ('metalness' in material) material.metalness = Math.min(.08, material.metalness ?? 0);
      for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap']) {
        const texture = material[key];
        if (!texture?.isTexture) continue;
        if (key === 'map' || key === 'emissiveMap') texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        texture.needsUpdate = true;
      }
      material.needsUpdate = true;
    }
  });
  root.add(obj);
}

function inspect(obj) {
  const textures = new Set();
  const materials = new Set();
  let meshes = 0, boneCount = 0, uv = 0, verts = 0, tris = 0;
  obj.traverse((node) => {
    if (node.isBone) boneCount++;
    if (!node.isMesh) return;
    meshes++;
    const geo = node.geometry;
    if (geo?.attributes?.uv) uv++;
    if (geo?.attributes?.position) verts += geo.attributes.position.count;
    tris += geo?.index ? geo.index.count / 3 : (geo?.attributes?.position?.count || 0) / 3;
    for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
      if (!material) continue;
      materials.add(material.uuid);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value.uuid);
    }
  });
  return { meshes, bones: boneCount, uv, verts: Math.round(verts), tris: Math.round(tris), textures: textures.size, materials: materials.size };
}

function updateDiagnostics(info, mapped) {
  ui.meshes.textContent = info.meshes;
  ui.bones.textContent = info.bones;
  ui.textures.textContent = info.textures;
  ui.clips.textContent = Object.keys(actions).length;
  if (info.textures) {
    ui.texBadge.textContent = 'Ready';
    ui.texInfo.textContent = `${info.textures} texture map${info.textures === 1 ? '' : 's'} detected. Existing FBX materials are preserved.`;
  } else if (info.uv) {
    ui.texBadge.textContent = 'UV ready';
    ui.texInfo.textContent = `Michael has UVs (${info.verts.toLocaleString()} vertices / ~${info.tris.toLocaleString()} triangles), but the supplied FBX contains no embedded texture image. Its original material is preserved until an albedo is supplied.`;
  } else {
    ui.texBadge.textContent = 'No UV';
    ui.texInfo.textContent = 'No texture maps or usable UV coordinates were detected.';
  }
  if (!mapped) ui.animBadge.textContent = 'Fallback';
}

function norm(name = '') {
  return name.split('|').pop().split(':').pop().replace(/[^a-z0-9]/gi, '').toLowerCase();
}
function collectBones(obj) {
  const map = new Map();
  obj.traverse((node) => { if (node.isBone) map.set(norm(node.name), node); });
  return map;
}
function bone(...names) {
  for (const name of names) {
    const hit = bones.get(norm(name));
    if (hit) return hit;
  }
  for (const [key, value] of bones) {
    if (names.some((name) => key.endsWith(norm(name)))) return value;
  }
  return null;
}

function mapClip(source) {
  const tracks = [];
  for (const sourceTrack of source.tracks) {
    const dot = sourceTrack.name.lastIndexOf('.');
    if (dot < 1) continue;
    const targetBone = bones.get(norm(sourceTrack.name.slice(0, dot)));
    if (!targetBone) continue;
    const property = sourceTrack.name.slice(dot + 1);
    const track = sourceTrack.clone();
    track.name = `${targetBone.name}.${property}`;
    if (property === 'position' && /hips|root/i.test(targetBone.name) && track.values.length >= 3) {
      const x = track.values[0], z = track.values[2];
      for (let i = 0; i < track.values.length; i += 3) {
        track.values[i] = x;
        track.values[i + 2] = z;
      }
    }
    tracks.push(track);
  }
  const clip = new THREE.AnimationClip('michael_walk_mapped', source.duration, tracks);
  clip.optimize();
  return clip;
}
function loop(clip) {
  const action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopRepeat, Infinity);
  return action;
}
function once(clip) {
  const action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  return action;
}
function qTrack(tracks, times, targetBone, deltas) {
  if (!targetBone) return;
  const base = targetBone.quaternion.clone();
  const values = [];
  for (const [x, y, z] of deltas) {
    const q = base.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z))).normalize();
    values.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${targetBone.name}.quaternion`, times, values));
}
function proceduralIdle() {
  const t = [0, 1, 2, 3, 4], tracks = [];
  qTrack(tracks, t, bone('Spine'), [[0,0,0],[.006,.006,.006],[0,-.004,-.005],[-.005,.004,.005],[0,0,0]]);
  qTrack(tracks, t, bone('Spine01','Spine1'), [[0,0,0],[.01,0,0],[.016,0,0],[.008,0,0],[0,0,0]]);
  qTrack(tracks, t, bone('Head'), [[0,0,0],[.003,-.012,0],[0,.016,.004],[-.003,.01,-.003],[0,0,0]]);
  return new THREE.AnimationClip('idle', 4, tracks);
}
function proceduralWalk() {
  const t = [0,.25,.5,.75,1], tracks = [];
  qTrack(tracks,t,bone('LeftUpLeg'),[[-.38,0,0],[0,0,0],[.38,0,0],[0,0,0],[-.38,0,0]]);
  qTrack(tracks,t,bone('RightUpLeg'),[[.38,0,0],[0,0,0],[-.38,0,0],[0,0,0],[.38,0,0]]);
  qTrack(tracks,t,bone('LeftLeg'),[[.12,0,0],[.44,0,0],[.1,0,0],[.2,0,0],[.12,0,0]]);
  qTrack(tracks,t,bone('RightLeg'),[[.1,0,0],[.2,0,0],[.12,0,0],[.44,0,0],[.1,0,0]]);
  qTrack(tracks,t,bone('LeftArm'),[[.28,0,0],[0,0,0],[-.28,0,0],[0,0,0],[.28,0,0]]);
  qTrack(tracks,t,bone('RightArm'),[[-.28,0,0],[0,0,0],[.28,0,0],[0,0,0],[-.28,0,0]]);
  return new THREE.AnimationClip('walk', 1, tracks);
}
function jumpStart() {
  const t = [0,.16,.42], tracks = [];
  for (const name of ['LeftUpLeg','RightUpLeg']) qTrack(tracks,t,bone(name),[[0,0,0],[-.34,0,0],[.1,0,0]]);
  for (const name of ['LeftLeg','RightLeg']) qTrack(tracks,t,bone(name),[[0,0,0],[.48,0,0],[.1,0,0]]);
  for (const name of ['LeftArm','RightArm']) qTrack(tracks,t,bone(name),[[0,0,0],[.22,0,0],[-.18,0,0]]);
  qTrack(tracks,t,bone('Spine'),[[0,0,0],[.1,0,0],[-.03,0,0]]);
  return new THREE.AnimationClip('jumpStart', .42, tracks);
}
function jumpAir() {
  const t = [0,.32,.64], tracks = [];
  qTrack(tracks,t,bone('LeftUpLeg'),[[.1,0,0],[.16,0,.03],[.1,0,0]]);
  qTrack(tracks,t,bone('RightUpLeg'),[[.1,0,0],[.06,0,-.03],[.1,0,0]]);
  qTrack(tracks,t,bone('LeftArm'),[[-.18,0,0],[-.12,0,.04],[-.18,0,0]]);
  qTrack(tracks,t,bone('RightArm'),[[-.18,0,0],[-.12,0,-.04],[-.18,0,0]]);
  return new THREE.AnimationClip('jumpAir', .64, tracks);
}
function jumpLand() {
  const t = [0,.14,.34,.58], tracks = [];
  for (const name of ['LeftUpLeg','RightUpLeg']) qTrack(tracks,t,bone(name),[[.08,0,0],[-.38,0,0],[-.18,0,0],[0,0,0]]);
  for (const name of ['LeftLeg','RightLeg']) qTrack(tracks,t,bone(name),[[.1,0,0],[.56,0,0],[.28,0,0],[0,0,0]]);
  qTrack(tracks,t,bone('Spine'),[[-.03,0,0],[.18,0,0],[.08,0,0],[0,0,0]]);
  return new THREE.AnimationClip('jumpLand', .58, tracks);
}
function setAction(name, fade = .18, restart = false) {
  const next = actions[name];
  if (!next || (next === active && !restart)) return;
  next.enabled = true;
  if (restart || next !== active) next.reset();
  next.setEffectiveWeight(1).play();
  if (active && active !== next) active.crossFadeTo(next, fade, false);
  active = next;
}

function buildWorld() {
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x788174, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);
  shootables.push(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x444945, roughness: .97 });
  for (const geo of [new THREE.PlaneGeometry(16,120), new THREE.PlaneGeometry(120,16)]) {
    const road = new THREE.Mesh(geo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = .006;
    world.add(road);
    shootables.push(road);
  }

  const buildingGeo = new THREE.BoxGeometry(1,1,1);
  const colors = [0xc4c0b4,0xaebbb6,0xcbbdab,0xa8b2a7];
  const blocks = [[-24,-24,11,10,9],[-39,-23,11,16,7],[24,-25,13,11,12],[40,-26,12,12,8],[-24,24,12,13,7],[-40,26,11,11,11],[25,25,12,12,9],[41,27,12,15,13],[-24,-42,12,12,14],[24,-42,12,12,8],[-24,42,12,12,10],[24,42,12,12,15]];
  blocks.forEach(([x,z,w,d,h], i) => {
    const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: .88 });
    const building = new THREE.Mesh(buildingGeo, mat);
    building.scale.set(w,h,d);
    building.position.set(x,h/2,z);
    building.receiveShadow = true;
    world.add(building);
    shootables.push(building);
    collisionBoxes.push(new THREE.Box3(new THREE.Vector3(x-w/2-.5,0,z-d/2-.5),new THREE.Vector3(x+w/2+.5,h,z+d/2+.5)));
  });

  const trunkGeo = new THREE.CylinderGeometry(.12,.16,1.2,7);
  const crownGeo = new THREE.SphereGeometry(.62,8,7);
  const trunkMat = new THREE.MeshStandardMaterial({color:0x6d5d48,roughness:1});
  const leafMat = new THREE.MeshStandardMaterial({color:0x526b4c,roughness:1});
  for (const [x,z] of [[-9,-22],[9,-30],[-10,29],[11,38],[-31,9],[31,-10],[-44,8],[44,-8]]) {
    const trunk = new THREE.Mesh(trunkGeo,trunkMat); trunk.position.set(x,.6,z);
    const crown = new THREE.Mesh(crownGeo,leafMat); crown.scale.set(1,1.25,1); crown.position.set(x,1.65,z);
    world.add(trunk,crown); shootables.push(trunk,crown);
  }
}
function blocked(p) {
  return Math.abs(p.x) > 55 || Math.abs(p.z) > 55 || collisionBoxes.some((b) => p.x>b.min.x && p.x<b.max.x && p.z>b.min.z && p.z<b.max.z);
}

async function equipWeapon(key) {
  if (!michael) return;
  const spec = WEAPONS[key];
  weaponKey = key;
  ammo = spec.mag;
  reserve = spec.reserve;
  updateAmmo();
  ui.weaponHudName.textContent = spec.label;
  ui.weaponLabel.textContent = spec.label;

  const hand = bone('RightHand','mixamorigRightHand');
  if (!hand) {
    ui.weaponBadge.textContent = 'No hand';
    ui.weaponInfo.textContent = 'Could not find a right-hand bone in this rig.';
    return;
  }
  if (weaponMount) weaponMount.removeFromParent();
  weaponMount = new THREE.Group();
  weaponMount.name = 'WeaponSocket_RightHand';
  weaponMount.position.fromArray(spec.mount);
  weaponMount.rotation.set(...spec.rot);
  hand.add(weaponMount);

  try {
    const gltf = await new GLTFLoader().loadAsync(spec.url);
    weaponModel = gltf.scene;
    normalizeWeapon(weaponModel, spec.length);
    weaponModel.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow = true;
      n.receiveShadow = true;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m) => { if (m && 'roughness' in m) m.roughness = Math.max(.38, m.roughness ?? .6); });
    });
    weaponMount.add(weaponModel);
    ui.weaponBadge.textContent = 'CC0';
    ui.weaponInfo.textContent = `${spec.label} loaded and attached to ${hand.name}. If the remote asset ever fails, the built-in fallback keeps gunplay functional.`;
  } catch (error) {
    console.warn('Remote CC0 weapon unavailable, using fallback.', error);
    weaponModel = createFallbackWeapon(key);
    weaponMount.add(weaponModel);
    ui.weaponBadge.textContent = 'Fallback';
    ui.weaponInfo.textContent = `${spec.label} remote model could not load, so a lightweight local fallback is attached to ${hand.name}.`;
  }
}
function normalizeWeapon(obj, targetLength) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const longest = Math.max(size.x,size.y,size.z) || 1;
  obj.scale.setScalar(targetLength / longest);
  obj.updateMatrixWorld(true);
  const centered = new THREE.Box3().setFromObject(obj);
  const center = centered.getCenter(new THREE.Vector3());
  obj.position.sub(center);
}
function createFallbackWeapon(key) {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({color:0x232624,roughness:.48,metalness:.35});
  const grip = new THREE.MeshStandardMaterial({color:0x111311,roughness:.8});
  const len = key==='pistol'?.24:key==='smg'?.43:.52;
  const body = new THREE.Mesh(new THREE.BoxGeometry(len,.055,.075),dark); body.position.x=len*.35;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(.06,.14,.07),grip); handle.position.set(.02,-.075,0); handle.rotation.z=-.2;
  g.add(body,handle);
  if (key!=='pistol') {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,len*.38,8),dark); barrel.rotation.z=Math.PI/2; barrel.position.x=len*.78; g.add(barrel);
  }
  return g;
}
function updateAmmo() {
  ui.ammo.textContent = ammo;
  const small = $('#weaponPill small');
  if (small) small.textContent = `/ ${reserve}`;
}
function setAim(value) {
  aim = !!value;
  ui.crosshair.classList.toggle('visible', aim);
  ui.aimButton.classList.toggle('active', aim);
}
function reload() {
  if (reloading) return;
  const spec = WEAPONS[weaponKey];
  if (ammo >= spec.mag || reserve <= 0) return toast(reserve <= 0 ? 'No reserve ammo' : 'Magazine is full');
  reloading = true;
  toast('Reloading…');
  setTimeout(() => {
    const need = spec.mag - ammo;
    const take = Math.min(need, reserve);
    ammo += take;
    reserve -= take;
    reloading = false;
    updateAmmo();
  }, 1050);
}
function shoot() {
  if (!ready || reloading) return;
  const now = performance.now() / 1000;
  const spec = WEAPONS[weaponKey];
  if (now-lastShot < spec.fireDelay) return;
  if (ammo <= 0) return reload();
  lastShot = now;
  ammo--;
  updateAmmo();
  if (!aim) setAim(true);
  recoil = 1;
  cameraKick = weaponKey==='shotgun'?.035:weaponKey==='smg'?.013:.022;
  flashMuzzle();
  raycaster.setFromCamera(screenCenter,camera);
  const hits = raycaster.intersectObjects(shootables,false);
  if (hits[0]) spawnImpact(hits[0].point,hits[0].face?.normal);
  if (weaponKey==='shotgun') navigator.vibrate?.(18); else navigator.vibrate?.(7);
}
function flashMuzzle() {
  if (!weaponMount) return;
  const light = new THREE.PointLight(0xffd68a,4.5,.9,2);
  light.position.set(.28,0,0);
  weaponMount.add(light);
  setTimeout(() => light.removeFromParent(),45);
}
function spawnImpact(point, normal) {
  const mark = new THREE.Mesh(new THREE.SphereGeometry(.018,5,4),new THREE.MeshBasicMaterial({color:0x2a2926}));
  mark.position.copy(point).addScaledVector(normal || up,.012);
  scene.add(mark);
  setTimeout(()=>{mark.material.dispose();mark.geometry.dispose();mark.removeFromParent()},3500);
}

function applyBoneOffset(targetBone, x, y, z, weight) {
  if (!targetBone || weight <= .001) return;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x*weight,y*weight,z*weight));
  targetBone.quaternion.multiply(q).normalize();
}
function applyProceduralLayer(dt) {
  aimWeight += ((aim ? 1 : 0)-aimWeight) * (1-Math.exp(-dt*12));
  recoil *= Math.exp(-dt*16);
  balance *= Math.exp(-dt*2.6);
  cameraKick *= Math.exp(-dt*10);

  applyBoneOffset(bone('RightArm','RightUpperArm'),-.76,-.20,-.16,aimWeight);
  applyBoneOffset(bone('RightForeArm','RightLowerArm'),-.72,.02,-.05,aimWeight);
  applyBoneOffset(bone('RightHand'),-.03,.04,-.02,aimWeight);
  applyBoneOffset(bone('LeftArm','LeftUpperArm'),-.66,.20,.16,aimWeight);
  applyBoneOffset(bone('LeftForeArm','LeftLowerArm'),-.88,-.04,.07,aimWeight);
  applyBoneOffset(bone('LeftHand'),.02,-.04,.03,aimWeight);
  applyBoneOffset(bone('Spine01','Spine1','Chest'),-.045-recoil*.06,0,balanceSide*balance*.16,Math.max(aimWeight,balance));
  applyBoneOffset(bone('Spine'),-.018,0,balanceSide*balance*.08,Math.max(aimWeight,balance));
  applyBoneOffset(bone('Head'),0,-balanceSide*balance*.035,0,balance);

  if (weaponMount) {
    const spec = WEAPONS[weaponKey];
    weaponMount.rotation.set(...spec.rot);
    weaponMount.rotation.x += recoil*.09;
    weaponMount.position.fromArray(spec.mount);
    weaponMount.position.z += recoil*.01;
  }
}
function testImpact() {
  balance = 1;
  balanceSide *= -1;
  root.position.x += balanceSide*.035;
  toast(balanceSide > 0 ? 'Balance reaction: left impact' : 'Balance reaction: right impact');
}

function updateCharacter(dt) {
  if (!michael || !mixer) return;
  const amount = Math.min(1,move.length());
  const moving = amount>.045;
  const targetSpeed = moving ? (runHeld?CFG.run:CFG.walk)*Math.max(.36,amount) : 0;
  speed += (targetSpeed-speed)*(1-Math.exp(-dt*(targetSpeed>speed?8:10)));

  if (moving) {
    camera.getWorldDirection(forward); forward.y=0; forward.normalize();
    right.crossVectors(forward,up).normalize();
    desired.copy(forward).multiplyScalar(-move.y).addScaledVector(right,move.x).normalize();
    targetQ.setFromAxisAngle(up,Math.atan2(desired.x,desired.z));
    root.quaternion.slerp(targetQ,1-Math.exp(-dt*13));
    const step=desired.clone().multiplyScalar(speed*dt);
    const px=root.position.clone(); px.x+=step.x; if(!blocked(px))root.position.x=px.x;
    const pz=root.position.clone(); pz.z+=step.z; if(!blocked(pz))root.position.z=pz.z;
  }

  if (!grounded) {
    jumpTime+=dt; vy-=CFG.gravity*dt; root.position.y+=vy*dt;
    if(jumpTime>.32 && active!==actions.jumpAir)setAction('jumpAir',.1);
    if(root.position.y<=0){root.position.y=0;vy=0;grounded=true;jumpTime=0;landTime=.58;setAction('jumpLand',.08,true);state='landing'}
    else state='airborne';
  } else if (landTime>0) {
    landTime=Math.max(0,landTime-dt); state='landing'; if(!landTime)setAction(moving?'walk':'idle',.12);
  } else if (moving) {
    setAction('walk',.18); actions.walk?.setEffectiveTimeScale(runHeld?1.48:.9+amount*.2); state=runHeld?'running':'walking';
  } else {
    setAction('idle',.24); state='idle';
  }

  mixer.update(dt);
  applyProceduralLayer(dt);
  ui.state.textContent = aim ? (state==='running'?'Aiming · Run':'Aiming') : state==='running'?'Running':state==='walking'?'Walking':state==='airborne'?'Airborne':state==='landing'?'Landing':'Ready';
}
function jump() {
  if(!michael||!grounded||landTime>.05)return;
  grounded=false;vy=CFG.jump;jumpTime=0;landTime=0;setAction('jumpStart',.08,true);state='airborne';
}
function updateCamera(dt) {
  const target=root.position.clone().add(new THREE.Vector3(0,1.34,0));
  const pitch=orbit.pitch+cameraKick;
  const cp=Math.cos(pitch);
  const distance=orbit.distance-(aim?.55:0);
  const pos=new THREE.Vector3(Math.sin(orbit.yaw)*cp,Math.sin(pitch),Math.cos(orbit.yaw)*cp).multiplyScalar(distance).add(target);
  camera.position.lerp(pos,1-Math.exp(-dt*10));
  camera.lookAt(target.clone().add(new THREE.Vector3(0,aim?.16:.1,0)));
}
function resetCamera(immediate=false) {
  orbit.yaw=root.rotation.y+Math.PI;orbit.pitch=.25;orbit.distance=CFG.camera;
  if(!immediate)return;
  const target=root.position.clone().add(new THREE.Vector3(0,1.34,0)),cp=Math.cos(orbit.pitch);
  camera.position.set(target.x+Math.sin(orbit.yaw)*cp*orbit.distance,target.y+Math.sin(orbit.pitch)*orbit.distance,target.z+Math.cos(orbit.yaw)*cp*orbit.distance);
  camera.lookAt(target);
}

let last=performance.now(),acc=0,frames=0,fpsAt=last;
function frame(now) {
  requestAnimationFrame(frame);
  const dt=Math.min(.04,Math.max(.001,(now-last)/1000));last=now;
  updateCharacter(dt);updateCamera(dt);renderer.render(scene,camera);
  acc+=1/dt;frames++;
  if(now-fpsAt>650){ui.fps.textContent=Math.round(acc/frames);acc=frames=0;fpsAt=now}
}
function progress(p,text){ui.bar.style.width=`${Math.max(4,Math.min(100,p*100))}%`;ui.loadingText.textContent=text}
let toastTimer;
function toast(message){ui.toast.textContent=message;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2200)}
function fail(error){
  console.error('Project V boot failed:',error);
  ui.dot.classList.add('error');ui.title.textContent='Michael needs his FBX';ui.sub.textContent=error?.message||'Unknown FBX error';ui.state.textContent='Asset needed';
  ui.loading.classList.add('done');openSheet();offerAssetImport();toast('Import the supplied Michael FBX from Diagnostics.');
}
function installGuards(){
  addEventListener('error',(e)=>{console.error('Runtime error:',e.error||e.message);if(ready)toast('A runtime issue was caught safely.')});
  addEventListener('unhandledrejection',(e)=>{console.error('Unhandled promise rejection:',e.reason);if(ready)toast('A background task failed safely.')});
}
function openSheet(){ui.sheet.classList.add('open');ui.sheet.setAttribute('aria-hidden','false')}
function closeSheet(){ui.sheet.classList.remove('open');ui.sheet.setAttribute('aria-hidden','true')}

$('#menuButton').addEventListener('click',openSheet);
$('#brand').addEventListener('click',openSheet);
document.querySelectorAll('[data-close-sheet]').forEach((node)=>node.addEventListener('click',closeSheet));
$('#skeletonToggle').addEventListener('click',(e)=>{if(!skeleton)return toast('Skeleton is available after Michael loads.');skeleton.visible=!skeleton.visible;e.currentTarget.querySelector('em').textContent=skeleton.visible?'On':'Off'});
$('#cameraReset').addEventListener('click',()=>{resetCamera();closeSheet()});
$('#impactTest').addEventListener('click',testImpact);
$('#qualityToggle').addEventListener('click',()=>{quality=(quality+1)%2;const balanced=!quality;renderer.setPixelRatio(Math.min(devicePixelRatio||1,balanced?1.5:1));renderer.shadowMap.enabled=balanced;$('#qualityLabel').textContent=balanced?'Balanced':'Fast';toast(balanced?'Balanced quality enabled.':'Fast mode enabled.')});
$('#weaponToggle').addEventListener('click',async()=>{const order=['pistol','smg','shotgun'];const next=order[(order.indexOf(weaponKey)+1)%order.length];await equipWeapon(next);toast(`${WEAPONS[next].label} equipped`)});
ui.aimButton.addEventListener('pointerdown',(e)=>{e.preventDefault();setAim(!aim)});
ui.fireButton.addEventListener('pointerdown',(e)=>{e.preventDefault();shoot()});
$('#weaponPill').addEventListener('click',reload);

const joy=$('#joystick'),knob=$('#joystickKnob');
let joyId=null;
function joyMove(x,y){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,rad=r.width*.31;let dx=x-cx,dy=y-cy,l=Math.hypot(dx,dy);if(l>rad){dx=dx/l*rad;dy=dy/l*rad}knob.style.transform=`translate3d(${dx}px,${dy}px,0)`;move.set(dx/rad,dy/rad)}
joy.addEventListener('pointerdown',(e)=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);joy.classList.add('active');joyMove(e.clientX,e.clientY)});
joy.addEventListener('pointermove',(e)=>{if(e.pointerId===joyId)joyMove(e.clientX,e.clientY)});
function joyUp(e){if(joyId!==null&&(!e||e.pointerId===joyId)){joyId=null;joy.classList.remove('active');knob.style.transform='translate3d(0,0,0)';move.set(0,0)}}
joy.addEventListener('pointerup',joyUp);joy.addEventListener('pointercancel',joyUp);
const run=$('#runButton');
function setRun(value){runHeld=value;run.classList.toggle('held',value)}
run.addEventListener('pointerdown',(e)=>{e.preventDefault();setRun(true);run.setPointerCapture(e.pointerId)});
run.addEventListener('pointerup',()=>setRun(false));run.addEventListener('pointercancel',()=>setRun(false));
$('#jumpButton').addEventListener('pointerdown',(e)=>{e.preventDefault();jump()});

let camId=null,cx=0,cy=0;
ui.canvas.addEventListener('pointerdown',(e)=>{if(e.clientX<innerWidth*.3)return;camId=e.pointerId;cx=e.clientX;cy=e.clientY;ui.canvas.setPointerCapture(e.pointerId)});
ui.canvas.addEventListener('pointermove',(e)=>{if(e.pointerId!==camId)return;orbit.yaw-=(e.clientX-cx)*.0062;orbit.pitch=THREE.MathUtils.clamp(orbit.pitch+(e.clientY-cy)*.0045,-.06,.72);cx=e.clientX;cy=e.clientY});
ui.canvas.addEventListener('pointerup',(e)=>{if(e.pointerId===camId)camId=null});ui.canvas.addEventListener('pointercancel',(e)=>{if(e.pointerId===camId)camId=null});

const keys=new Set();
addEventListener('keydown',(e)=>{keys.add(e.code);if(e.code==='Space'){e.preventDefault();jump()}if(e.code==='ShiftLeft'||e.code==='ShiftRight')setRun(true);if(e.code==='KeyF')shoot();if(e.code==='KeyQ')setAim(!aim);if(e.code==='KeyR')reload()});
addEventListener('keyup',(e)=>{keys.delete(e.code);if(e.code==='ShiftLeft'||e.code==='ShiftRight')setRun(false)});
function keyboardLoop(){let x=0,y=0;if(keys.has('KeyA')||keys.has('ArrowLeft'))x--;if(keys.has('KeyD')||keys.has('ArrowRight'))x++;if(keys.has('KeyW')||keys.has('ArrowUp'))y--;if(keys.has('KeyS')||keys.has('ArrowDown'))y++;if(x||y)move.set(x,y).normalize();else if(joyId===null)move.set(0,0);requestAnimationFrame(keyboardLoop)}

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)});
addEventListener('contextmenu',(e)=>e.preventDefault());
document.addEventListener('gesturestart',(e)=>e.preventDefault(),{passive:false});
document.addEventListener('gesturechange',(e)=>e.preventDefault(),{passive:false});

function offerAssetImport(){
  if($('#importMichaelButton'))return;
  const list=$('.setting-list');if(!list)return;
  const charInput=document.createElement('input');charInput.type='file';charInput.accept='.fbx';charInput.hidden=true;
  const walkInput=document.createElement('input');walkInput.type='file';walkInput.accept='.fbx';walkInput.hidden=true;
  const charButton=document.createElement('button');charButton.id='importMichaelButton';charButton.className='setting';charButton.type='button';charButton.innerHTML='<span><b>Import Michael FBX</b><small>Cached privately on this device after one selection</small></span><em>Choose</em>';
  const walkButton=document.createElement('button');walkButton.className='setting';walkButton.type='button';walkButton.innerHTML='<span><b>Import walk FBX</b><small>Optional 60 FPS Meshy walking clip</small></span><em>Choose</em>';
  list.prepend(walkButton);list.prepend(charButton);list.append(charInput,walkInput);
  charButton.addEventListener('click',()=>charInput.click());walkButton.addEventListener('click',()=>walkInput.click());
  charInput.addEventListener('change',async()=>{const file=charInput.files?.[0];if(!file)return;await assetDBSet('michael',await file.arrayBuffer());toast('Michael cached. Reloading…');setTimeout(()=>location.reload(),350)});
  walkInput.addEventListener('change',async()=>{const file=walkInput.files?.[0];if(!file)return;await assetDBSet('walk',await file.arrayBuffer());toast('Walk animation cached. Reload to use it.')});
}

function openAssetDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('project-v-assets',1);req.onupgradeneeded=()=>req.result.createObjectStore('files');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function assetDBGet(key){try{const db=await openAssetDB();return await new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly'),req=tx.objectStore('files').get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)})}catch{return null}}
async function assetDBSet(key,value){const db=await openAssetDB();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
