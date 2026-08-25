// Project V v9 — clean-room GTA-style rotating radar/minimap.
// Uses original vector drawing code and public blip naming conventions; no Rockstar texture assets are redistributed.
export function createProjectVMinimap({ root, worldExtent = 60, toast = () => {} } = {}) {
  const app = document.querySelector('#app');
  if (!app || !root) return { update() {} };

  document.body.classList.add('has-project-v-radar');

  const shell = document.createElement('section');
  shell.id = 'projectVMinimap';
  shell.className = 'project-v-radar';
  shell.setAttribute('aria-label', 'Project V minimap');
  shell.innerHTML = `
    <canvas class="project-v-radar-canvas" aria-hidden="true"></canvas>
    <div class="project-v-radar-distance" aria-live="polite"></div>
    <div class="project-v-radar-bars" aria-label="Health armor and special ability">
      <span class="project-v-radar-bar health"><i></i></span>
      <span class="project-v-radar-bar armor"><i></i></span>
      <span class="project-v-radar-bar special"><i></i></span>
    </div>`;
  app.appendChild(shell);

  const canvas = shell.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  const distanceLabel = shell.querySelector('.project-v-radar-distance');
  const barEls = {
    health: shell.querySelector('.project-v-radar-bar.health i'),
    armor: shell.querySelector('.project-v-radar-bar.armor i'),
    special: shell.querySelector('.project-v-radar-bar.special i')
  };

  const WORLD = Math.max(56, Number(worldExtent) || 60);
  const MAP_EXTENT = WORLD + 6;
  const MAP_SIZE = 1024;
  const grid = [-48, -32, -16, 0, 16, 32, 48].filter(v => Math.abs(v) <= MAP_EXTENT);
  const zoomLevels = [27, 37, 49];
  let zoomIndex = 1;
  let expanded = false;
  let dpr = 1;
  let width = 220;
  let height = 132;
  let lastDrawAt = -1;
  let heading = Math.PI;
  let pointerDown = null;
  let lastTapAt = 0;

  const vitals = { health: 100, armor: 65, special: 100 };
  let waypoint = { x: 42, z: -42, active: true };

  const buildings = [
    [-24,-24,11,10],[-39,-23,11,16],[24,-25,13,11],[40,-26,12,12],
    [-24,24,12,13],[-40,26,11,11],[25,25,12,12],[41,27,12,15],
    [-24,-42,12,12],[24,-42,12,12],[-24,42,12,12],[24,42,12,12]
  ];

  const blips = [
    { id:'home', type:'safehouse', x:-24, z:-24, color:'#f4f4f2', priority:2 },
    { id:'michael', type:'character', x:24, z:-25, color:'#5bc0df', text:'M', priority:3 },
    { id:'question', type:'mission', x:-40, z:26, color:'#61b85d', priority:3 },
    { id:'garage', type:'garage', x:41, z:27, color:'#f0f2ef', priority:1 },
    { id:'store', type:'store', x:-39, z:-23, color:'#e9e9e5', priority:1 },
    { id:'police', type:'police', x:24, z:42, color:'#74a8d8', priority:1 },
    { id:'hospital', type:'hospital', x:-24, z:42, color:'#e7e9e6', priority:1 },
    { id:'weapon', type:'weapon', x:40, z:-26, color:'#f3f3f0', priority:1 },
    { id:'car', type:'car', x:31, z:-10, color:'#f2f2ef', priority:1 },
    { id:'race', type:'race', x:-31, z:9, color:'#f1f1ee', priority:1 }
  ];

  const baseMap = document.createElement('canvas');
  baseMap.width = baseMap.height = MAP_SIZE;
  const bctx = baseMap.getContext('2d', { alpha: true });
  buildBaseMap();

  const observer = new ResizeObserver(() => resize());
  observer.observe(shell);
  resize();
  installSettings();
  installPointerControls();

  function resize() {
    const r = shell.getBoundingClientRect();
    width = Math.max(1, r.width);
    height = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastDrawAt = -1;
  }

  function buildBaseMap() {
    const s = MAP_SIZE;
    bctx.clearRect(0, 0, s, s);

    const bg = bctx.createLinearGradient(0, 0, s, s);
    bg.addColorStop(0, '#282b2c');
    bg.addColorStop(.52, '#222526');
    bg.addColorStop(1, '#2b2d2e');
    bctx.fillStyle = bg;
    bctx.fillRect(0, 0, s, s);

    // Deterministic asphalt/map grain gives the translucent GTA radar texture without image assets.
    let seed = 2463534242;
    const rnd = () => {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      return ((seed >>> 0) % 100000) / 100000;
    };
    for (let i = 0; i < 4600; i++) {
      const a = .015 + rnd() * .035;
      bctx.fillStyle = `rgba(255,255,255,${a})`;
      const x = rnd() * s, y = rnd() * s, r = .45 + rnd() * 1.15;
      bctx.fillRect(x, y, r, r);
    }

    // Building/block silhouettes.
    for (const [x,z,w,d] of buildings) {
      const p = texPoint(x - w/2, z + d/2);
      const p2 = texPoint(x + w/2, z - d/2);
      bctx.fillStyle = 'rgba(10,12,12,.36)';
      bctx.fillRect(p.x, p.y, p2.x-p.x, p2.y-p.y);
      bctx.strokeStyle = 'rgba(205,210,208,.11)';
      bctx.lineWidth = 1.3;
      bctx.strokeRect(p.x+.7, p.y+.7, p2.x-p.x-1.4, p2.y-p.y-1.4);
    }

    const streets = [];
    // The two major streets mirror Project V's current rendered cross roads.
    streets.push({x1:0,z1:-MAP_EXTENT,x2:0,z2:MAP_EXTENT,w:16,major:true});
    streets.push({x1:-MAP_EXTENT,z1:0,x2:MAP_EXTENT,z2:0,w:16,major:true});
    // Secondary district streets make the radar readable as the world grows.
    for (const v of grid) {
      if (v === 0) continue;
      streets.push({x1:v,z1:-MAP_EXTENT,x2:v,z2:MAP_EXTENT,w:4.4});
      streets.push({x1:-MAP_EXTENT,z1:v,x2:MAP_EXTENT,z2:v,w:4.4});
    }

    // A few curved connectors keep the visual language closer to Los Santos' non-grid streets.
    const curves = [
      [[-MAP_EXTENT,-46],[-45,-41],[-31,-31],[-16,-16]],
      [[16,16],[29,28],[39,36],[MAP_EXTENT,41]],
      [[-MAP_EXTENT,37],[-46,33],[-36,23],[-32,16]]
    ];

    const unit = MAP_SIZE / (MAP_EXTENT * 2);
    for (const road of streets) {
      const a = texPoint(road.x1, road.z1), b = texPoint(road.x2, road.z2);
      drawRoadStroke(bctx, [a,b], road.w * unit, !!road.major);
    }
    for (const curve of curves) {
      const pts = curve.map(([x,z]) => texPoint(x,z));
      bctx.save();
      bctx.lineCap = 'round'; bctx.lineJoin = 'round';
      bctx.strokeStyle = 'rgba(8,9,9,.62)'; bctx.lineWidth = 5.6 * unit + 4;
      bctx.beginPath();
      bctx.moveTo(pts[0].x,pts[0].y);
      bctx.bezierCurveTo(pts[1].x,pts[1].y,pts[2].x,pts[2].y,pts[3].x,pts[3].y);
      bctx.stroke();
      bctx.strokeStyle = 'rgba(170,174,172,.68)'; bctx.lineWidth = 5.6 * unit;
      bctx.stroke();
      bctx.restore();
    }

    // Fine parcel/sidewalk traces.
    bctx.strokeStyle = 'rgba(211,215,212,.15)';
    bctx.lineWidth = 1.4;
    for (let i = -56; i <= 56; i += 8) {
      const a = texPoint(i,-MAP_EXTENT), b = texPoint(i,MAP_EXTENT);
      bctx.beginPath(); bctx.moveTo(a.x,a.y); bctx.lineTo(b.x,b.y); bctx.stroke();
    }
  }

  function drawRoadStroke(c, pts, widthPx, major) {
    c.save();
    c.lineCap = 'butt';
    c.lineJoin = 'round';
    c.strokeStyle = 'rgba(5,7,7,.68)';
    c.lineWidth = widthPx + (major ? 6 : 4);
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i=1;i<pts.length;i++) c.lineTo(pts[i].x,pts[i].y);
    c.stroke();
    c.strokeStyle = major ? 'rgba(191,195,192,.76)' : 'rgba(156,161,158,.68)';
    c.lineWidth = widthPx;
    c.stroke();
    if (major) {
      c.strokeStyle = 'rgba(225,228,225,.22)';
      c.lineWidth = Math.max(1.3, widthPx * .09);
      c.setLineDash([18,16]);
      c.stroke();
    }
    c.restore();
  }

  function texPoint(x,z) {
    return {
      x: ((x + MAP_EXTENT) / (MAP_EXTENT*2)) * MAP_SIZE,
      y: ((MAP_EXTENT - z) / (MAP_EXTENT*2)) * MAP_SIZE
    };
  }

  function getView() {
    const cy = height * .555;
    const cx = width * .5;
    const baseRadius = zoomLevels[zoomIndex];
    const motionZoom = Math.min(4, Math.max(0, currentSpeed - 2.2) * 1.15);
    const radius = baseRadius + motionZoom;
    const ppw = (height * .94) / (radius * 2);
    return { cx, cy, radius, ppw };
  }

  let currentSpeed = 0;
  function projectWorld(x,z, view) {
    const dx = x - root.position.x;
    const dz = z - root.position.z;
    const bx = dx, by = -dz;
    const c = Math.cos(-heading), s = Math.sin(-heading);
    return {
      x: view.cx + (bx*c - by*s) * view.ppw,
      y: view.cy + (bx*s + by*c) * view.ppw
    };
  }

  function drawMap(now) {
    const view = getView();
    const {cx,cy,ppw} = view;

    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(.5,.5,width-1,height-1);
    ctx.clip();

    // Semi-transparent map panel like the GTA V radar rather than opaque "app UI".
    ctx.fillStyle = 'rgba(14,16,17,.34)';
    ctx.fillRect(0,0,width,height);

    const texScale = ppw * ((MAP_EXTENT*2) / MAP_SIZE);
    const playerTex = texPoint(root.position.x, root.position.z);
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(-heading);
    ctx.scale(texScale,texScale);
    ctx.globalAlpha = .92;
    ctx.drawImage(baseMap,-playerTex.x,-playerTex.y);
    ctx.restore();

    drawRoute(view);
    drawBlips(view);

    // Soft vignette and dark frame are essential to the stock radar translucency.
    const vignette = ctx.createRadialGradient(cx,cy,Math.min(width,height)*.16,cx,cy,Math.max(width,height)*.68);
    vignette.addColorStop(0,'rgba(0,0,0,0)');
    vignette.addColorStop(1,'rgba(0,0,0,.26)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0,0,width,height);

    ctx.strokeStyle='rgba(238,241,239,.14)';
    ctx.lineWidth=1;
    ctx.strokeRect(.5,.5,width-1,height-1);

    drawNorth(view);
    drawPlayer(view);
    ctx.restore();

    if (waypoint.active) {
      const d = Math.hypot(waypoint.x-root.position.x, waypoint.z-root.position.z);
      distanceLabel.textContent = d >= 1000 ? `↑ ${(d/1000).toFixed(2)} km` : `↑ ${Math.max(1,Math.round(d))} m`;
      distanceLabel.classList.add('visible');
    } else {
      distanceLabel.classList.remove('visible');
    }
  }

  function drawRoute(view) {
    if (!waypoint.active) return;
    const points = buildRoute(root.position.x, root.position.z, waypoint.x, waypoint.z);
    if (points.length < 2) return;
    const projected = points.map(p => projectWorld(p.x,p.z,view));

    ctx.save();
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(projected[0].x,projected[0].y);
    for(let i=1;i<projected.length;i++)ctx.lineTo(projected[i].x,projected[i].y);
    ctx.strokeStyle='rgba(38,22,44,.88)';ctx.lineWidth=8.2;ctx.stroke();
    ctx.strokeStyle='#b95cff';ctx.lineWidth=5.4;ctx.stroke();
    ctx.strokeStyle='rgba(236,191,255,.40)';ctx.lineWidth=1.1;ctx.stroke();
    ctx.restore();

    const w = projectWorld(waypoint.x,waypoint.z,view);
    const edge = clampPointToRadar(w,view,13);
    drawIcon('waypoint',edge.x,edge.y, '#c66dff', 1, null);
  }

  function buildRoute(sx,sz,ex,ez) {
    const roadValues = grid.length ? grid : [0];
    const nearest = (v) => roadValues.reduce((a,b)=>Math.abs(b-v)<Math.abs(a-v)?b:a,roadValues[0]);
    const sxRoad=nearest(sx), szRoad=nearest(sz), exRoad=nearest(ex), ezRoad=nearest(ez);
    const viaXFirst = [
      {x:sx,z:sz},{x:sxRoad,z:sz},{x:sxRoad,z:szRoad},
      {x:exRoad,z:szRoad},{x:exRoad,z:ezRoad},{x:ex,z:ez}
    ];
    const viaZFirst = [
      {x:sx,z:sz},{x:sx,z:szRoad},{x:sxRoad,z:szRoad},
      {x:sxRoad,z:ezRoad},{x:exRoad,z:ezRoad},{x:ex,z:ez}
    ];
    const len = arr => arr.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-arr[i].x,p.z-arr[i].z),0);
    const route = len(viaXFirst) <= len(viaZFirst) ? viaXFirst : viaZFirst;
    return route.filter((p,i,a)=>!i || Math.hypot(p.x-a[i-1].x,p.z-a[i-1].z)>.05);
  }

  function drawBlips(view) {
    const margin=12;
    for(const b of blips){
      const p=projectWorld(b.x,b.z,view);
      const inside=p.x>=margin&&p.x<=width-margin&&p.y>=margin&&p.y<=height-margin;
      if(!inside && (b.priority||0)<3)continue;
      const q=inside?p:clampPointToRadar(p,view,margin);
      drawIcon(b.type,q.x,q.y,b.color||'#fff', b.priority>=3?1.03:.92, b);
    }
  }

  function clampPointToRadar(p,view,margin=10){
    const dx=p.x-view.cx,dy=p.y-view.cy;
    const hw=width*.5-margin,hh=height*.5-margin;
    const t=Math.min(hw/Math.max(.0001,Math.abs(dx)),hh/Math.max(.0001,Math.abs(dy)),1);
    return {x:view.cx+dx*t,y:view.cy+dy*t};
  }

  function drawNorth(view){
    const c=Math.cos(-heading),s=Math.sin(-heading);
    // world north is +Z => base radar vector (0,-1)
    const dx=s,dy=-c;
    const hw=width*.5-12,hh=height*.5-12;
    const t=Math.min(hw/Math.max(.001,Math.abs(dx)),hh/Math.max(.001,Math.abs(dy)));
    drawIcon('north',view.cx+dx*t*.96,view.cy+dy*t*.96,'#fff',.84,null);
  }

  function drawPlayer(view){
    ctx.save();
    ctx.translate(view.cx,view.cy);
    ctx.shadowColor='rgba(0,0,0,.48)';ctx.shadowBlur=2;ctx.shadowOffsetY=1;
    ctx.beginPath();
    ctx.moveTo(0,-11);
    ctx.lineTo(7.2,8.2);
    ctx.lineTo(0,5.1);
    ctx.lineTo(-7.2,8.2);
    ctx.closePath();
    ctx.fillStyle='#d9eef8';
    ctx.strokeStyle='#111719';
    ctx.lineWidth=2.1;
    ctx.fill();ctx.stroke();
    ctx.restore();
  }

  function drawIcon(type,x,y,color='#fff',scale=1,data=null){
    ctx.save();
    ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.lineJoin='round';ctx.lineCap='round';
    ctx.strokeStyle='#111516';ctx.fillStyle=color;ctx.lineWidth=2.5;
    ctx.shadowColor='rgba(0,0,0,.38)';ctx.shadowBlur=1.8;ctx.shadowOffsetY=.6;

    if(type==='north'){
      ctx.beginPath();ctx.arc(0,0,8.8,0,Math.PI*2);ctx.fillStyle='#050606';ctx.fill();ctx.lineWidth=1.1;ctx.strokeStyle='rgba(255,255,255,.52)';ctx.stroke();
      ctx.font='800 10px -apple-system,BlinkMacSystemFont,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText('N',0,.6);
    }else if(type==='waypoint'){
      ctx.strokeStyle='#1a0f1e';ctx.fillStyle=color;ctx.lineWidth=1.7;
      for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*Math.PI/2);ctx.beginPath();ctx.ellipse(0,-5.1,2.6,4.1,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
      ctx.beginPath();ctx.arc(0,0,2.2,0,Math.PI*2);ctx.fillStyle='#17121a';ctx.fill();
    }else if(type==='character'){
      ctx.font='900 15px Arial Black,Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.strokeStyle='#111516';ctx.lineWidth=3.2;ctx.strokeText(data?.text||'M',0,.5);ctx.fillStyle=color;ctx.fillText(data?.text||'M',0,.5);
    }else if(type==='mission'){
      ctx.font='900 17px Arial Black,Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.strokeStyle='#111516';ctx.lineWidth=3.5;ctx.strokeText('?',0,.3);ctx.fillStyle=color;ctx.fillText('?',0,.3);
    }else if(type==='safehouse'){
      ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(0,-7);ctx.lineTo(8,0);ctx.lineTo(6.2,0);ctx.lineTo(6.2,7);ctx.lineTo(-6.2,7);ctx.lineTo(-6.2,0);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#202425';ctx.fillRect(-1.8,2.2,3.6,4.8);
    }else if(type==='garage'){
      roundedRect(ctx,-8,-6,16,13,1.5);ctx.fill();ctx.stroke();ctx.strokeStyle='#3a3e3f';ctx.lineWidth=1.2;for(let yy=-2;yy<=4;yy+=3){ctx.beginPath();ctx.moveTo(-5.5,yy);ctx.lineTo(5.5,yy);ctx.stroke();}
    }else if(type==='store'){
      ctx.beginPath();ctx.rect(-6,-4,12,11);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,-4,4.2,Math.PI,0);ctx.stroke();
    }else if(type==='police'){
      starPath(ctx,0,0,8,3.5,5);ctx.fill();ctx.stroke();
    }else if(type==='hospital'){
      roundedRect(ctx,-7,-7,14,14,2);ctx.fill();ctx.stroke();ctx.fillStyle='#222728';ctx.fillRect(-2,-5,4,10);ctx.fillRect(-5,-2,10,4);
    }else if(type==='weapon'){
      ctx.beginPath();ctx.moveTo(-8,-3);ctx.lineTo(4,-3);ctx.lineTo(7,-5);ctx.lineTo(9,-2);ctx.lineTo(4,1);ctx.lineTo(1,1);ctx.lineTo(-1,7);ctx.lineTo(-5,7);ctx.lineTo(-3,1);ctx.lineTo(-8,1);ctx.closePath();ctx.fill();ctx.stroke();
    }else if(type==='car'){
      roundedRect(ctx,-7,-6,14,12,3);ctx.fill();ctx.stroke();ctx.fillStyle='#262a2b';ctx.fillRect(-4,-3,8,4);ctx.fillRect(-4,2,8,2);
    }else if(type==='race'){
      ctx.beginPath();ctx.moveTo(-6,8);ctx.lineTo(-6,-8);ctx.stroke();ctx.beginPath();ctx.moveTo(-5,-7);ctx.lineTo(7,-5);ctx.lineTo(4,1);ctx.lineTo(-5,0);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#2a2e2f';ctx.fillRect(-3,-5,3,3);ctx.fillRect(1,-2,3,3);
    }else if(type==='airport'){
      ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(2,-1);ctx.lineTo(8,2);ctx.lineTo(8,4);ctx.lineTo(2.5,3);ctx.lineTo(1,8);ctx.lineTo(-1,8);ctx.lineTo(-2.5,3);ctx.lineTo(-8,4);ctx.lineTo(-8,2);ctx.lineTo(-2,-1);ctx.closePath();ctx.fill();ctx.stroke();
    }else if(type==='clothes'){
      ctx.beginPath();ctx.moveTo(-7,-5);ctx.lineTo(-3,-8);ctx.lineTo(0,-5);ctx.lineTo(3,-8);ctx.lineTo(7,-5);ctx.lineTo(5,-1);ctx.lineTo(3,-2);ctx.lineTo(3,8);ctx.lineTo(-3,8);ctx.lineTo(-3,-2);ctx.lineTo(-5,-1);ctx.closePath();ctx.fill();ctx.stroke();
    }else if(type==='target'){
      ctx.beginPath();ctx.arc(0,0,6.4,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,2,0,Math.PI*2);ctx.fill();for(const a of[0,Math.PI/2,Math.PI,Math.PI*1.5]){ctx.beginPath();ctx.moveTo(Math.cos(a)*8,Math.sin(a)*8);ctx.lineTo(Math.cos(a)*4.8,Math.sin(a)*4.8);ctx.stroke();}
    }else{
      ctx.beginPath();ctx.arc(0,0,5.5,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
    ctx.restore();
  }

  function roundedRect(c,x,y,w,h,r){
    c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
  }
  function starPath(c,cx,cy,outer,inner,points){
    c.beginPath();
    for(let i=0;i<points*2;i++){const a=-Math.PI/2+i*Math.PI/points,r=i%2?inner:outer,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}
    c.closePath();
  }

  function installPointerControls(){
    canvas.addEventListener('pointerdown',e=>{
      e.preventDefault();
      pointerDown={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now()};
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointerup',e=>{
      if(!pointerDown||e.pointerId!==pointerDown.id)return;
      const now=performance.now(),move=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y),held=now-pointerDown.t;
      pointerDown=null;
      if(move>11)return;
      if(held>520){ toggleExpanded(); return; }
      if(now-lastTapAt<310){ cycleZoom(); lastTapAt=0; return; }
      lastTapAt=now;
      setWaypointFromClient(e.clientX,e.clientY);
    });
    canvas.addEventListener('pointercancel',()=>pointerDown=null);
  }

  function setWaypointFromClient(clientX,clientY){
    const r=canvas.getBoundingClientRect(),view=getView();
    const sx=clientX-r.left-view.cx,sy=clientY-r.top-view.cy;
    const bx=sx/view.ppw,by=sy/view.ppw;
    const c=Math.cos(heading),s=Math.sin(heading);
    const dx=bx*c-by*s;
    const mapY=bx*s+by*c;
    let x=root.position.x+dx,z=root.position.z-mapY;
    x=Math.max(-WORLD,Math.min(WORLD,x));z=Math.max(-WORLD,Math.min(WORLD,z));
    const nearest=v=>grid.reduce((a,b)=>Math.abs(b-v)<Math.abs(a-v)?b:a,grid[0]??0);
    const nx=nearest(x),nz=nearest(z);
    if(Math.abs(nx-x)<=Math.abs(nz-z))x=nx;else z=nz;
    waypoint={x,z,active:true};
    toast('Waypoint set');
  }

  function cycleZoom(){
    zoomIndex=(zoomIndex+1)%zoomLevels.length;
    const label=document.querySelector('#radarZoomLabel');
    if(label)label.textContent=['Near','Standard','Wide'][zoomIndex];
    toast(`Radar zoom: ${['near','standard','wide'][zoomIndex]}`);
    lastDrawAt=-1;
  }

  function toggleExpanded(){
    expanded=!expanded;
    shell.classList.toggle('expanded',expanded);
    const label=document.querySelector('#radarModeLabel');if(label)label.textContent=expanded?'Expanded':'Standard';
    setTimeout(resize,20);
    toast(expanded?'Expanded radar':'Standard radar');
  }

  function installSettings(){
    const list=document.querySelector('.setting-list');
    if(!list)return;
    const before=document.querySelector('#qualityToggle');

    if(!document.querySelector('#radarModeToggle')){
      const mode=document.createElement('button');mode.id='radarModeToggle';mode.className='setting';mode.type='button';
      mode.innerHTML='<span><b>Radar mode</b><small>Tap map = waypoint · double tap = zoom · hold = expand</small></span><em id="radarModeLabel">Standard</em>';
      list.insertBefore(mode,before||null);mode.addEventListener('click',toggleExpanded);
    }
    if(!document.querySelector('#radarZoomToggle')){
      const zoom=document.createElement('button');zoom.id='radarZoomToggle';zoom.className='setting';zoom.type='button';
      zoom.innerHTML='<span><b>Radar zoom</b><small>Near, standard and wide navigation scale</small></span><em id="radarZoomLabel">Standard</em>';
      list.insertBefore(zoom,before||null);zoom.addEventListener('click',cycleZoom);
    }
    if(!document.querySelector('#armorToggle')){
      const armor=document.createElement('button');armor.id='armorToggle';armor.className='setting';armor.type='button';
      armor.innerHTML='<span><b>Armor</b><small>Functional HUD armor bar test</small></span><em id="armorLabel">65%</em>';
      list.insertBefore(armor,before||null);armor.addEventListener('click',()=>{
        const values=[0,50,100],i=values.findIndex(v=>v===Math.round(vitals.armor));
        setArmor(values[(i+1+values.length)%values.length]);
        toast(`Armor ${Math.round(vitals.armor)}%`);
      });
    }
  }

  function setBar(name,value){
    vitals[name]=Math.max(0,Math.min(100,Number(value)||0));
    barEls[name].style.transform=`scaleX(${vitals[name]/100})`;
    if(name==='armor'){const l=document.querySelector('#armorLabel');if(l)l.textContent=`${Math.round(vitals.armor)}%`;}
  }
  function setHealth(v){setBar('health',v);}
  function setArmor(v){setBar('armor',v);}
  function setSpecial(v){setBar('special',v);}
  function damage(amount){
    let n=Math.max(0,Number(amount)||0);
    const absorbed=Math.min(vitals.armor,n);setArmor(vitals.armor-absorbed);n-=absorbed;
    if(n>0)setHealth(vitals.health-n);
  }
  function heal(amount){setHealth(vitals.health+Math.max(0,Number(amount)||0));}
  function addArmor(amount){setArmor(vitals.armor+Math.max(0,Number(amount)||0));}
  function setWaypoint(x,z){waypoint={x:Math.max(-WORLD,Math.min(WORLD,x)),z:Math.max(-WORLD,Math.min(WORLD,z)),active:true};lastDrawAt=-1;}
  function clearWaypoint(){waypoint.active=false;lastDrawAt=-1;}
  function addBlip(blip){if(blip?.id)blips.push({...blip});}
  function removeBlip(id){const i=blips.findIndex(b=>b.id===id);if(i>=0)blips.splice(i,1);}

  setHealth(vitals.health);setArmor(vitals.armor);setSpecial(vitals.special);

  function update(dt,now,state={}){
    currentSpeed=Number(state.speed)||0;
    const target=root.rotation?.y||0;
    const delta=Math.atan2(Math.sin(target-heading),Math.cos(target-heading));
    heading+=delta*(1-Math.exp(-Math.min(.05,dt||.016)*12));
    // 30Hz radar rendering is enough for smooth rotation and saves mobile GPU time.
    if(lastDrawAt>=0 && now-lastDrawAt<33)return;
    lastDrawAt=now;
    drawMap(now);
  }

  const api = {
    update,setHealth,setArmor,setSpecial,damage,heal,addArmor,
    setWaypoint,clearWaypoint,cycleZoom,toggleExpanded,addBlip,removeBlip,
    getVitals:()=>({...vitals}),getWaypoint:()=>({...waypoint})
  };
  window.ProjectVHUD = api;
  window.ProjectVMinimap = api;
  return api;
}
