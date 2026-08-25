from pathlib import Path
import re

js_path = Path('src/v7.js')
index_path = Path('index.html')
main_path = Path('src/main.js')

s = js_path.read_text()
if 'PROJECT_V_ENVIRONMENT_V8' in s:
    print('Project V v8 environment already applied.')
else:
    if 'const VERSION = 7;' not in s:
        raise SystemExit('Expected Project V v7 runtime marker not found.')
    s = s.replace('const VERSION = 7;', '''const VERSION = 8;
// PROJECT_V_ENVIRONMENT_V8
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
''')

    old_lighting = '''const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcbd3cf);
scene.fog = new THREE.FogExp2(0xcbd3cf, .0115);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .045, 190);

scene.add(new THREE.HemisphereLight(0xeaf3ff, 0x59665b, 2.1));
const sun = new THREE.DirectionalLight(0xffeac3, 3.15);
sun.position.set(-11, 18, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.5,far:58});
sun.shadow.bias = -.00032; scene.add(sun);
const fill = new THREE.DirectionalLight(0xa9c9ff,.32); fill.position.set(9,8,-8); scene.add(fill);'''
    new_lighting = '''const scene = new THREE.Scene();
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
const fill = new THREE.DirectionalLight(ENV_CURRENT.sky_atmosphere,.30); fill.position.set(9,8,-8); scene.add(fill);'''
    if old_lighting not in s:
        raise SystemExit('Lighting block changed; v8 patch stopped safely.')
    s = s.replace(old_lighting, new_lighting)

    s = s.replace('''const collisionBoxes = [], shootables = [];
buildWorld();''', '''const collisionBoxes = [], shootables = [];
buildWorld();
atmosphere = buildAtmosphere();''')
    s = s.replace('''installGuards();
installControls();
boot();''', '''installGuards();
installControls();
installEnvironmentControl();
boot();''')

    classifier_pattern = r"function classifyBodyTriangle\(cx,cy,cz,box,size\)\{.*?\n\}"
    classifier_replacement = '''function classifyBodyTriangle(cx,cy,cz,box,size){
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
}'''
    s, count = re.subn(classifier_pattern, classifier_replacement, s, count=1, flags=re.S)
    if count != 1:
        raise SystemExit('Texture body classifier was not found exactly once.')

    atmosphere_code = r'''
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
'''
    if 'function buildWorld(){' not in s:
        raise SystemExit('buildWorld anchor missing.')
    s = s.replace('function buildWorld(){', atmosphere_code + '\nfunction buildWorld(){', 1)

    build_pattern = r"function buildWorld\(\)\{.*?\n\}\nfunction blocked"
    build_replacement = '''function buildWorld(){
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
function blocked'''
    s, count = re.subn(build_pattern, build_replacement, s, count=1, flags=re.S)
    if count != 1:
        raise SystemExit('buildWorld replacement failed.')

    old_quality = "renderer.setPixelRatio(Math.min(devicePixelRatio||1,balanced?1.5:1));renderer.shadowMap.enabled=balanced;$('#qualityLabel').textContent=balanced?'Balanced':'Fast';toast(balanced?'Balanced quality':'Fast mode');"
    new_quality = "renderer.setPixelRatio(Math.min(devicePixelRatio||1,balanced?1.5:1));renderer.shadowMap.enabled=balanced;setAtmosphereQuality(balanced);$('#qualityLabel').textContent=balanced?'Balanced':'Fast';toast(balanced?'Balanced quality':'Fast mode');"
    if old_quality not in s:
        raise SystemExit('Quality toggle anchor missing.')
    s = s.replace(old_quality, new_quality, 1)

    old_frame = '''  updateCharacter(dt);updateCamera(dt);renderer.render(scene,camera);'''
    new_frame = '''  updateEnvironment(dt,now);updateCharacter(dt);updateCamera(dt);renderer.render(scene,camera);'''
    if old_frame not in s:
        raise SystemExit('Frame update anchor missing.')
    s = s.replace(old_frame, new_frame, 1)
    js_path.write_text(s)

index = index_path.read_text()
index = index.replace('styles.css?v=7','styles.css?v=8').replace('styles-v7.css?v=7','styles-v7.css?v=8').replace('src/main.js?v=7','src/main.js?v=8').replace('GAMEPLAY FOUNDATION · V7','GAMEPLAY FOUNDATION · V8')
index = index.replace('Checking FBX, texture atlases, rig and animation','Checking textures, atmosphere, clouds, rig and animation')
index_path.write_text(index)

main = main_path.read_text()
main = main.replace("import './v7.js?v=7';", "import './v7.js?v=8';")
main_path.write_text(main)
print('Applied Project V v8 palette, atmosphere, cloud and texture-mapping upgrade.')
