/* 사회 게임 RPG · three.js 화면 · 셀 셰이딩 · 빛가루 · 풀밭 · 화질 · 땅 · 거점 바닥 · 이름판
   파일은 01 → 13 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요. */
/* ---------- three.js 기본 (판타지 RPG판) ---------- */
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.75));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const HORIZON = 0xe6e0ec;
scene.background = new THREE.Color(HORIZON);
scene.fog = new THREE.Fog(HORIZON, 38, 135);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);

/* 후처리: 빛 번짐(블룸) + 감마 보정 */
let composer=null, bloom=null, GRADE=null;
try{
  if (THREE.EffectComposer && THREE.UnrealBloomPass && THREE.GammaCorrectionShader){
    composer=new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene,camera));
    bloom=new THREE.UnrealBloomPass(new THREE.Vector2(512,512),.55,.65,.8);
    composer.addPass(bloom);
    GRADE=new THREE.ShaderPass({uniforms:{tDiffuse:{value:null},uSat:{value:1.08},uTint:{value:new THREE.Vector3(1.03,1,.985)},uLift:{value:new THREE.Vector3(.012,.008,.03)},uCon:{value:1.03},uVig:{value:.42}},
      vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:'uniform sampler2D tDiffuse; uniform float uSat; uniform vec3 uTint; uniform vec3 uLift; uniform float uCon; uniform float uVig; varying vec2 vUv; void main(){ vec4 c=texture2D(tDiffuse,vUv); float l=dot(c.rgb,vec3(.2126,.7152,.0722)); c.rgb=mix(vec3(l),c.rgb,uSat); c.rgb+=uLift*(1.0-clamp(l*2.0,0.0,1.0)); c.rgb*=uTint; c.rgb=(c.rgb-0.18)*uCon+0.18; vec2 d=vUv-.5; c.rgb*=1.0-dot(d,d)*uVig; gl_FragColor=c; }'});
    composer.addPass(GRADE);
    composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
  }
}catch(e){ composer=null; }
function resize(){ const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
  if (composer){ composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w,h); } }
addEventListener('resize', resize); resize();
function renderFrame(){ if (composer) composer.render(); else renderer.render(scene,camera); }

/* 하늘 */
let SKY=null;
{
  const m=SKY=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{top:{value:new THREE.Color(0x5b93d8)},mid:{value:new THREE.Color(0xaccdee)},bot:{value:new THREE.Color(HORIZON)}},
    vertexShader:'varying vec3 vP; void main(){ vP=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h=normalize(vP).y; vec3 c=h<0.18?mix(bot,mid,clamp(h/0.18,0.0,1.0)):mix(mid,top,clamp((h-0.18)/0.6,0.0,1.0)); gl_FragColor=vec4(pow(c,vec3(2.2)),1.0); }'});
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(400,32,16),m));
}

/* 빛과 그림자 */
const HEMI=new THREE.HemisphereLight(0xe6eeff, 0x5d6e40, 0.6); scene.add(HEMI);
const sun = new THREE.DirectionalLight(0xffe2b4, 1.2);
sun.position.set(22,38,14); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
{ const c=sun.shadow.camera; c.left=-34; c.right=34; c.top=34; c.bottom=-34; c.near=1; c.far=150; }
sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.04;
scene.add(sun); scene.add(sun.target);
const fill = new THREE.DirectionalLight(0xb9c9ff, 0.32); fill.position.set(-20,18,-25); scene.add(fill);

/* ---------- 몽환 그래픽: 셀 셰이딩(만화풍 명암) + 테두리빛 ---------- */
const TOON_GRAD=(()=>{ const v=[105,170,222,255], d=new Uint8Array(16); v.forEach((x,i)=>{ d.set([x,x,x,255],i*4); });
  const t=new THREE.DataTexture(d,4,1,THREE.RGBAFormat); t.minFilter=t.magFilter=THREE.NearestFilter; t.generateMipmaps=false; t.needsUpdate=true; return t; })();
function addRim(m,str,col){
  if (!str) return m;
  const rim=new THREE.Color(col||0xfff2dc).multiplyScalar(str);
  m.onBeforeCompile=sh=>{ sh.uniforms.uRim={value:rim};
    sh.fragmentShader='uniform vec3 uRim;\n'+sh.fragmentShader.replace('#include <tonemapping_fragment>',
      '{ vec3 vd=normalize(vViewPosition); float r=pow(1.0-clamp(dot(normal,vd),0.0,1.0),2.6); gl_FragColor.rgb+=uRim*r*(0.55+0.45*diffuseColor.rgb); }\n#include <tonemapping_fragment>'); };
  m.customProgramCacheKey=()=>'rim'+str.toFixed(2);
  return m;
}
function toonMat(o){
  o=Object.assign({},o); delete o.roughness; delete o.metalness; delete o.envMapIntensity; delete o.flatShading;
  const rim=o.rim; delete o.rim;
  const m=new THREE.MeshToonMaterial(Object.assign({gradientMap:TOON_GRAD},o));
  return addRim(m,rim||0);
}
function toToon(m,rim,rimCol){
  if (!m || !m.isMeshStandardMaterial) return m;
  const t=new THREE.MeshToonMaterial({color:m.color.clone(),map:m.map,emissive:m.emissive.clone(),emissiveIntensity:m.emissiveIntensity,emissiveMap:m.emissiveMap,
    transparent:m.transparent,opacity:m.opacity,side:m.side,alphaTest:m.alphaTest,depthWrite:m.depthWrite,vertexColors:m.vertexColors,skinning:m.skinning,morphTargets:m.morphTargets,gradientMap:TOON_GRAD});
  if (t.map) t.map.anisotropy=4;
  t.name=m.name; return addRim(t,rim||0,rimCol);
}
const toonCache=new WeakMap();
function toonCached(m){ if (!m || !m.isMeshStandardMaterial) return m; let t=toonCache.get(m); if (!t){ t=toToon(m,.16,0xe8eeff); toonCache.set(m,t); } return t; }

/* ---------- 몽환 그래픽: 떠다니는 빛가루 ---------- */
let MOTES=null;
function makeMotes(){
  const N=420, pos=new Float32Array(N*3), seed=new Float32Array(N), col=new Float32Array(N*3);
  const pal=[[1,.93,.62],[1,.85,.7],[.75,.95,1],[.9,1,.75]];
  for (let i=0;i<N;i++){ pos[i*3]=rnd(-38,38); pos[i*3+1]=rnd(.4,5.5); pos[i*3+2]=rnd(-38,38); seed[i]=Math.random(); const c=pal[i%4]; col.set(c,i*3); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1)); g.setAttribute('aCol',new THREE.BufferAttribute(col,3));
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{uTime:{value:0},uPR:{value:1},uSize:{value:.22},uTint:{value:new THREE.Vector3(1,1,1)}},
    vertexShader:'uniform float uTime; uniform float uPR; uniform float uSize; uniform vec3 uTint; attribute float aSeed; attribute vec3 aCol; varying float vA; varying vec3 vC;'+
      'void main(){ vec3 p=position; float t=uTime*(.25+aSeed*.2); p+=vec3(sin(t+aSeed*40.)*1.2, sin(t*1.7+aSeed*13.)*.6, cos(t*.8+aSeed*27.)*1.2);'+
      'vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=uSize*uPR*(520./-mv.z);'+
      'vA=.35+.65*pow(.5+.5*sin(uTime*(1.5+aSeed*2.)+aSeed*60.),2.); vC=aCol*uTint; }',
    fragmentShader:'varying float vA; varying vec3 vC; void main(){ vec2 d=gl_PointCoord-.5; float r=length(d); float a=smoothstep(.5,.0,r); a*=a; gl_FragColor=vec4(vC*a*vA*1.3,a*vA); }'});
  const p=new THREE.Points(g,m); p.frustumCulled=false; p.userData.max=N; scene.add(p); MOTES=p;
}

/* ---------- 몽환 그래픽: 바람에 흔들리는 풀밭 ---------- */
const GRASS=[];
const grassBlade=(()=>{ const g=new THREE.InstancedBufferGeometry();
  const v=[-.055,0,0, .055,0,0, -.04,.45,0, .04,.45,0, 0,1,0];
  g.setAttribute('position',new THREE.Float32BufferAttribute(v,3)); g.setIndex([0,1,2, 1,3,2, 2,3,4]); return g; })();
const grassMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,fog:true,
  uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uTime:{value:0},uPlayer:{value:new THREE.Vector3()},uBase:{value:new THREE.Color(0x2a5418)},uTip:{value:new THREE.Color(0x93c24c)}}]),
  vertexShader:'uniform float uTime; uniform vec3 uPlayer; attribute vec4 aOff; varying float vH; varying float vC;\n#include <fog_pars_vertex>\n'+
    'void main(){ float k=position.y; vec3 p=position; p.y*=aOff.w; float c=cos(aOff.y*6.283), s=sin(aOff.y*6.283); p=vec3(p.x*c,p.y,p.x*s);'+
    'vec3 wp=vec3(aOff.x,0.,aOff.z)+p; float w=sin(uTime*1.7+wp.x*.31+wp.z*.23)*.6+sin(uTime*2.9+wp.x*.83-wp.z*.4)*.25;'+
    'wp.x+=w*.22*k*k*aOff.w; wp.z+=w*.1*k*k*aOff.w;'+
    'vec2 d=wp.xz-uPlayer.xz; float dl=length(d); float push=smoothstep(1.3,.0,dl)*k; wp.xz+=d/(dl+.001)*push*.55; wp.y-=push*.35*aOff.w;'+
    'vec4 mvPosition=modelViewMatrix*vec4(wp,1.); gl_Position=projectionMatrix*mvPosition; vH=k; vC=fract(aOff.y*7.13);\n#include <fog_vertex>\n}',
  fragmentShader:'uniform vec3 uBase; uniform vec3 uTip; varying float vH; varying float vC;\n#include <common>\n#include <fog_pars_fragment>\n'+
    'void main(){ vec3 col=mix(uBase,uTip,vH*vH)*(.82+.36*vC); gl_FragColor=vec4(col,1.);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n#include <fog_fragment>\n}'});
function buildGrass(n,ok){
  const off=[]; let tries=0;
  while (off.length/4<n && tries<n*3){ tries++; const x=rnd(-40,40), z=rnd(-40,40); if (Math.hypot(x,z)>44 || !ok(x,z)) continue; off.push(x,Math.random(),z,rnd(.3,.62)); }
  const g=grassBlade.clone(); g.setAttribute('aOff',new THREE.InstancedBufferAttribute(new Float32Array(off),4));
  const max=off.length/4; g.instanceCount=max;
  const mesh=new THREE.Mesh(g,grassMat); mesh.frustumCulled=false; mesh.userData.max=max; scene.add(mesh); GRASS.push(mesh);
}
const inCol=(x,z)=>colliders.some(b=>x>b.x0-.2&&x<b.x1+.2&&z>b.z0-.2&&z<b.z1+.2);
/* 맵마다 풀을 심지 않을 곳(길 · 광장 · 건물) */
const GRASS_OK={
  zones:(x,z)=>!zoneAt(x,z)&&Math.hypot(x-PLAZA.x,z-PLAZA.z)>PLAZA.r+.3&&!nearPath(x,z,1.9)&&!inCol(x,z),
  general:(x,z)=>Math.hypot(x,z-2)>6.8&&![[0,-15],[-15,11],[15,11]].some(([a,b])=>Math.hypot(x-a,z-b)<3.2)&&!nearSegs(GEN_SEGS,x,z,1.9)&&!inCol(x,z),
  island:(x,z)=>Math.hypot(x,z)<ISL_R-2.8&&Math.hypot(x-ISL_PLAZA.x,z-ISL_PLAZA.z)>ISL_PLAZA.r+.3&&Math.hypot(x-ISL_DOCK.x,z-ISL_DOCK.z)>3.6&&!ISL_STATIONS.some(([a,b])=>Math.hypot(x-a,z-b)<3.2)&&!ISL_HOUSES.some(h=>Math.hypot(x-h.x,z-h.z)<2)&&!nearSegs(ISL_SEGS,x,z,1.7)&&!inCol(x,z),
  defense:(x,z)=>(z>-13.1||z<-15.2)&&![[-15,-8.2],[0,-6.4],[15,-8.2]].some(([a,b])=>Math.hypot(x-a,z-b)<3.2)&&!nearSegs(DEF_SEGS,x,z,2.7)&&!inCol(x,z)
};

/* ---------- 화질 3단계 (자동으로 맞춰요) ---------- */
const QUALITY={high:{label:'고화질',pr:1.5,shadow:2048,grass:1,bloom:true,motes:1},
               medium:{label:'보통',pr:1.0,shadow:1024,grass:.6,bloom:true,motes:.6},
               low:{label:'가벼움',pr:.8,shadow:0,grass:0,bloom:false,motes:.35}};
const QORDER=['low','medium','high'];
let QSET='auto', QCUR='medium', qMon=null;
try{ QSET=localStorage.getItem('gsd-q')||'auto'; }catch(e){}
const autoQ=()=>{ try{ const v=localStorage.getItem('gsd-q-auto'); return QUALITY[v]?v:'medium'; }catch(e){ return 'medium'; } };
function applyQuality(q){
  if (!QUALITY[q]) q='medium'; QCUR=q; const C=QUALITY[q];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,C.pr));
  sun.castShadow=C.shadow>0;
  if (C.shadow && sun.shadow.mapSize.x!==C.shadow){ sun.shadow.mapSize.set(C.shadow,C.shadow); if (sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null; } }
  if (bloom) bloom.enabled=C.bloom;
  GRASS.forEach(g=>{ g.geometry.instanceCount=Math.floor(g.userData.max*C.grass); g.visible=C.grass>0; });
  if (MOTES){ MOTES.geometry.setDrawRange(0,Math.floor(MOTES.userData.max*C.motes)); MOTES.material.uniforms.uPR.value=renderer.getPixelRatio(); }
  resize();
}
function startQualityMonitor(){ qMon = QSET==='auto' ? {frames:0,start:0,last:0,warm:performance.now()+1500} : null; }
function qualityTick(now){
  if (!qMon || W.state!=='play' || W.paused) return;
  if (now<qMon.warm || now-qMon.last>250){ qMon.start=now; qMon.frames=0; qMon.last=now; return; }
  qMon.last=now; qMon.frames++;
  const el=now-qMon.start; if (el<4000) return;
  const fps=qMon.frames*1000/el, i=QORDER.indexOf(QCUR);
  const save=v=>{ try{ localStorage.setItem('gsd-q-auto',v); }catch(e){} };
  if (fps<40 && i>0){ applyQuality(QORDER[i-1]); save(QCUR); qMon={frames:0,start:0,last:0,warm:now+1500,tried:qMon.tried}; }
  else if (qMon.up && fps<48){ applyQuality(qMon.up); save(QCUR); qMon=null; }
  else if (fps>57 && i<2 && !qMon.tried){ const prev=QCUR; applyQuality(QORDER[i+1]); qMon={frames:0,start:0,last:0,warm:now+1500,tried:true,up:prev}; }
  else { save(QCUR); qMon=null; }
}
function updateDreamy(real){
  grassMat.uniforms.uTime.value=real; grassMat.uniforms.uPlayer.value.set(P.x,0,P.z);
  if (MOTES) MOTES.material.uniforms.uTime.value=real;
}

const std=(c,o)=>toonMat(Object.assign({color:c},o||{}));
const lam=std, toon=std;
function cs(m,recv){ m.castShadow=true; m.receiveShadow=recv!==false; return m; }
function canvasTex(w,h,draw,rx,ry){
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h; draw(cv.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; if (rx) t.repeat.set(rx,ry); t.anisotropy=8; t.encoding=THREE.sRGBEncoding; return t;
}
function roundRect(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
const rnd=(a,b)=>a+Math.random()*(b-a);

/* 땅: 여러 겹의 풀 색 */
const grassTex=canvasTex(512,512,(g,w,h)=>{
  g.fillStyle='#5f8a3e'; g.fillRect(0,0,w,h);
  for (let i=0;i<60;i++){ const x=Math.random()*w,y=Math.random()*h,r=rnd(30,90); const gr=g.createRadialGradient(x,y,0,x,y,r);
    const c=Math.random()<.5?'rgba(96,140,58,.45)':'rgba(132,160,72,.35)'; gr.addColorStop(0,c); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr;
    for (const ox of [-w,0,w]) for (const oy of [-h,0,h]){ g.save(); g.translate(ox,oy); g.fillRect(x-r,y-r,r*2,r*2); g.restore(); } }
  for (let i=0;i<5200;i++){ const x=Math.random()*w,y=Math.random()*h; const l=rnd(3,8);
    g.strokeStyle=['rgba(52,92,36,.55)','rgba(150,186,92,.45)','rgba(86,128,52,.5)','rgba(176,196,110,.3)'][i%4];
    g.lineWidth=1; g.beginPath(); g.moveTo(x,y); g.lineTo(x+rnd(-1.5,1.5),y-l); g.stroke(); }
},18,18);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(220,220),toonMat({map:grassTex}));
ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);

/* 맵마다 장면 묶음 · 충돌 상자 · 기둥 · 사람을 따로 두고, 고른 맵만 보여 줘요 */
const MAP_KEYS=['zones','general','defense','island','glacier','runner','stage','teamwar'];
const MAPSTATE={}, mapGroups={};
MAP_KEYS.forEach(k=>{ MAPSTATE[k]={colliders:[],stations:[],npcs:[]}; mapGroups[k]=new THREE.Group(); scene.add(mapGroups[k]); });
let MAPK='zones';
const bgGroup=new THREE.Group(); scene.add(bgGroup);
let colliders=MAPSTATE.zones.colliders, stations=MAPSTATE.zones.stations, npcs=MAPSTATE.zones.npcs;
function within(k,fn){
  const prev={colliders,stations,npcs,MAPK};
  colliders=MAPSTATE[k].colliders; stations=MAPSTATE[k].stations; npcs=MAPSTATE[k].npcs; MAPK=k;
  scene.add=function(){ mapGroups[k].add.apply(mapGroups[k],arguments); return scene; };
  try{ fn(); } finally { delete scene.add; colliders=prev.colliders; stations=prev.stations; npcs=prev.npcs; MAPK=prev.MAPK; }
}
function addCol(x,z,w,d){ colliders.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2}); }

/* 거점 바닥: 돌판 */
const ZONES = {hq:{x:0,z:-25,r:12}, lab:{x:-25,z:14,r:11}, fac:{x:25,z:14,r:11}};
const pads = {};
function stoneTex(base,dark,light){ return canvasTex(256,256,(g,w,h)=>{
  g.fillStyle=dark; g.fillRect(0,0,w,h);
  const rows=6; for (let r=0;r<rows;r++){ let x=r%2?-20:0; const hh=h/rows;
    while (x<w){ const ww=rnd(34,58); g.fillStyle=Math.random()<.5?base:light; roundRect(g,x+2,r*hh+2,ww-4,hh-4,5); g.fill();
      g.fillStyle='rgba(0,0,0,.08)'; g.fillRect(x+2,r*hh+hh-7,ww-4,5); x+=ww; } }
  for (let i=0;i<900;i++){ g.fillStyle=`rgba(0,0,0,${rnd(.02,.07)})`; g.fillRect(Math.random()*w,Math.random()*h,2,2); }
},6,6); }
function pad(zone,hi,base,dark,light){
  const Z=ZONES[zone];
  const mat=toonMat({map:stoneTex(base,dark,light),emissive:hi,emissiveIntensity:0});
  const m=new THREE.Mesh(new THREE.CircleGeometry(Z.r,64),mat); m.rotation.x=-Math.PI/2; m.position.set(Z.x,.03,Z.z); m.receiveShadow=true; scene.add(m);
  const curb=new THREE.Mesh(new THREE.TorusGeometry(Z.r,.28,8,96),std(0x8d8577,{roughness:.95})); curb.rotation.x=Math.PI/2; curb.position.set(Z.x,.05,Z.z); curb.receiveShadow=true; curb.castShadow=true; curb.scale.z=.6; scene.add(curb);
  const rim=new THREE.Mesh(new THREE.RingGeometry(Z.r-.8,Z.r-.2,96),new THREE.MeshBasicMaterial({color:hi,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));
  rim.rotation.x=-Math.PI/2; rim.position.set(Z.x,.06,Z.z); scene.add(rim);
  pads[zone]={mat,rim};
}
function zoneAt(x,z){ if (MAPK!=='zones') return null; for (const k in ZONES){ const Z=ZONES[k]; if (Math.hypot(x-Z.x,z-Z.z)<Z.r) return k; } return null; }
within('zones',()=>{
pad('hq',0x3b6fd9,'#8c8982','#5a554e','#9b978f');
pad('lab',0x21966f,'#878d80','#545c50','#969c8f');
pad('fac',0xea7d1f,'#96866f','#5e4e3c','#a6957e');
});

/* 위치 퀴즈: 빛기둥과 발밑 화살표 */
const locBeams={}, locArrows={};
const arrowG=new THREE.Group(); scene.add(arrowG);
within('zones',()=>[['hq',0x3b6fd9],['lab',0x21966f],['fac',0xea7d1f]].forEach(([k,c])=>{
  const Z=ZONES[k];
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(Z.r*.55,Z.r*.8,40,32,1,true),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
  beam.position.set(Z.x,20,Z.z); beam.visible=false; scene.add(beam); locBeams[k]=beam;
  const ar=new THREE.Group();
  const sh=new THREE.Shape(); sh.moveTo(0,.95); sh.lineTo(.5,.25); sh.lineTo(.2,.25); sh.lineTo(.2,-.4); sh.lineTo(-.2,-.4); sh.lineTo(-.2,.25); sh.lineTo(-.5,.25); sh.lineTo(0,.95);
  const m=new THREE.Mesh(new THREE.ShapeGeometry(sh),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide,depthWrite:false,transparent:true,opacity:.95}));
  m.rotation.x=Math.PI/2; m.position.z=2.6; ar.add(m);
  const o=new THREE.Mesh(new THREE.ShapeGeometry(sh),new THREE.MeshBasicMaterial({color:0x18213a,side:THREE.DoubleSide,depthWrite:false}));
  o.rotation.x=Math.PI/2; o.position.set(0,-.01,2.6); o.scale.setScalar(1.22); ar.add(o);
  ar.visible=false; arrowG.add(ar); locArrows[k]=ar;
}));

/* 광장과 흙길 */
const PLAZA={x:0,z:3,r:7};
within('zones',()=>{
  const m=new THREE.Mesh(new THREE.CircleGeometry(PLAZA.r,48),toonMat({map:stoneTex('#928c7f','#625b4f','#a29c8e')}));
  m.rotation.x=-Math.PI/2; m.position.set(PLAZA.x,.03,PLAZA.z); m.receiveShadow=true; scene.add(m);
});
const pathSegs=[];
const dirtTex=canvasTex(128,256,(g,w,h)=>{ g.fillStyle='#a88c62'; g.fillRect(0,0,w,h);
  for (let i=0;i<1400;i++){ g.fillStyle=Math.random()<.5?'rgba(90,70,44,.35)':'rgba(205,184,140,.35)'; g.fillRect(Math.random()*w,Math.random()*h,rnd(1,3),rnd(1,3)); }
  const gr=g.createLinearGradient(0,0,w,0); gr.addColorStop(0,'rgba(95,138,62,1)'); gr.addColorStop(.18,'rgba(95,138,62,0)'); gr.addColorStop(.82,'rgba(95,138,62,0)'); gr.addColorStop(1,'rgba(95,138,62,1)'); g.fillStyle=gr; g.fillRect(0,0,w,h); });
const pebbleGeo=new THREE.DodecahedronGeometry(.22,0), pebbleMat=std(0x9b9488,{flatShading:true});
function dirtStrip(x1,z1,x2,z2,segs,w){
  w=w||3.4; const L=Math.hypot(x2-x1,z2-z1), ux=(x2-x1)/L, uz=(z2-z1)/L;
  segs.push({x1,z1,x2,z2});
  const t=dirtTex.clone(); t.needsUpdate=true; t.repeat.set(1,L/6);
  const strip=new THREE.Mesh(new THREE.PlaneGeometry(w,L),toonMat({map:t})); strip.rotation.x=-Math.PI/2; strip.rotation.z=-Math.atan2(x2-x1,z2-z1);
  strip.position.set((x1+x2)/2,.02,(z1+z2)/2); strip.receiveShadow=true; scene.add(strip);
  const n=Math.floor(L/2.2), e=w/2+.15;
  for (let i=0;i<=n;i++){ const tt=i/n, px=x1+(x2-x1)*tt, pz=z1+(z2-z1)*tt;
    for (const side of [-e,e]){ if (Math.random()<.45) continue; const s=new THREE.Mesh(pebbleGeo,pebbleMat); s.position.set(px-uz*side+rnd(-.2,.2),.08,pz+ux*side+rnd(-.2,.2));
      s.rotation.set(rnd(0,3),rnd(0,3),0); s.scale.setScalar(rnd(.6,1.3)); s.castShadow=true; s.receiveShadow=true; scene.add(s); } }
}
function pathTo(zone){
  const Z=ZONES[zone], dx=Z.x-PLAZA.x, dz=Z.z-PLAZA.z, D=Math.hypot(dx,dz), ux=dx/D, uz=dz/D;
  dirtStrip(PLAZA.x+ux*(PLAZA.r-.3), PLAZA.z+uz*(PLAZA.r-.3), Z.x-ux*(Z.r-.3), Z.z-uz*(Z.r-.3), pathSegs);
}
/* 세 거점 맵 길: 부드럽게 굽은 큰길(광장 → 거점) + 거점끼리 잇는 둘레길 */
function smoothRoad(ctrl,w,segs,pebbles){
  const curve=new THREE.CatmullRomCurve3(ctrl.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
  const L=curve.getLength(), N=Math.max(8,Math.ceil(L/.7)), pts=curve.getSpacedPoints(N), pos=[], uv=[], idx=[], nrm=[];
  for (let i=0;i<=N;i++){ const p=pts[i], q=pts[Math.min(N,i+1)], o=pts[Math.max(0,i-1)]; let tx=q.x-o.x, tz=q.z-o.z; const tl=Math.hypot(tx,tz)||1; tx/=tl; tz/=tl;
    const nx=-tz, nz=tx, ww=w*(1+.04*Math.sin(i*.37)), v=i*L/N/6;
    pos.push(p.x+nx*ww/2,0,p.z+nz*ww/2, p.x-nx*ww/2,0,p.z-nz*ww/2); nrm.push(0,1,0,0,1,0); uv.push(0,v,1,v);
    if (i<N){ const a=i*2; idx.push(a,a+2,a+1, a+1,a+2,a+3); segs.push({x1:p.x,z1:p.z,x2:q.x,z2:q.z}); } }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); g.setIndex(idx);
  const t=dirtTex.clone(); t.needsUpdate=true; t.repeat.set(1,1);
  const m=new THREE.Mesh(g,toonMat({map:t,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})); m.position.y=.022+(w<3?-.002:0); m.receiveShadow=true; scene.add(m);
  if (pebbles!==false) for (let i=2;i<N-1;i+=3){ const p=pts[i], q=pts[i+1]; let tx=q.x-p.x, tz=q.z-p.z; const tl=Math.hypot(tx,tz)||1; tx/=tl; tz/=tl;
    for (const side of [-1,1]){ if (Math.random()<.5) continue; const e=w/2+.18; const s=new THREE.Mesh(pebbleGeo,pebbleMat);
      s.position.set(p.x-tz*side*e+rnd(-.2,.2),.08,p.z+tx*side*e+rnd(-.2,.2)); s.rotation.set(rnd(0,3),rnd(0,3),0); s.scale.setScalar(rnd(.6,1.3)); s.castShadow=true; s.receiveShadow=true; scene.add(s); } }
  return pts;
}
const ZROADS={main:[
  [[0,-3.4],[.9,-8.6],[0,-14.6]],
  [[-6.4,5.6],[-10.6,8.9],[-15.8,10.4]],
  [[6.4,5.6],[10.6,8.9],[15.8,10.4]]],
 ring:[
  [[-11.4,-21.5],[-19,-17],[-25.5,-9],[-27.5,-1],[-25.4,3.6]],
  [[11.4,-21.5],[19,-17],[25.5,-9],[27.5,-1],[25.4,3.6]],
  [[-16.4,20.2],[-9,25.4],[0,26.6],[9,25.4],[16.4,20.2]]]};
within('zones',()=>{ ZROADS.main.forEach(c=>smoothRoad(c,3.8,pathSegs)); ZROADS.ring.forEach(c=>smoothRoad(c,2.7,pathSegs)); });
/* 광장 분수 */
within('zones',()=>{
  const stone=toonMat({map:stoneTex('#a39d90','#6c665a','#b3ad9f')}), dark=std(0x8d8577,{roughness:.95});
  const basin=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.8,.7,40),stone); basin.position.set(PLAZA.x,.35,PLAZA.z); basin.castShadow=basin.receiveShadow=true; scene.add(basin);
  const lip=new THREE.Mesh(new THREE.TorusGeometry(2.62,.16,8,48),dark); lip.rotation.x=Math.PI/2; lip.position.set(PLAZA.x,.72,PLAZA.z); scene.add(lip);
  const water=new THREE.Mesh(new THREE.CircleGeometry(2.45,40),new THREE.MeshBasicMaterial({color:0x5cb8e0})); water.rotation.x=-Math.PI/2; water.position.set(PLAZA.x,.715,PLAZA.z); scene.add(water);
  const col=new THREE.Mesh(new THREE.CylinderGeometry(.32,.45,1.9,12),stone); col.position.set(PLAZA.x,1.4,PLAZA.z); col.castShadow=true; scene.add(col);
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(1.05,.45,.38,24),stone); bowl.position.set(PLAZA.x,2.4,PLAZA.z); bowl.castShadow=true; scene.add(bowl);
  const top=new THREE.Mesh(new THREE.SphereGeometry(.34,16,10),new THREE.MeshBasicMaterial({color:0x8fd8f5})); top.position.set(PLAZA.x,2.75,PLAZA.z); scene.add(top);
  addCol(PLAZA.x,PLAZA.z,4.6,4.6);
  // 광장 둘레 돌 테두리
  const ring=new THREE.Mesh(new THREE.TorusGeometry(PLAZA.r,.22,8,96),dark); ring.rotation.x=Math.PI/2; ring.position.set(PLAZA.x,.05,PLAZA.z); ring.scale.z=.6; ring.receiveShadow=true; scene.add(ring);
});
function nearSegs(segs,x,z,m){ return segs.some(s=>{ const vx=s.x2-s.x1, vz=s.z2-s.z1, t=Math.max(0,Math.min(1,((x-s.x1)*vx+(z-s.z1)*vz)/(vx*vx+vz*vz))); return Math.hypot(x-(s.x1+vx*t),z-(s.z1+vz*t))<m; }); }
function nearPath(x,z,m){ return pathSegs.some(s=>{ const vx=s.x2-s.x1, vz=s.z2-s.z1, t=Math.max(0,Math.min(1,((x-s.x1)*vx+(z-s.z1)*vz)/(vx*vx+vz*vz))); return Math.hypot(x-(s.x1+vx*t),z-(s.z1+vz*t))<m; }); }
function freeSpot(x,z,m){ return !zoneAt(x,z) && Math.hypot(x-PLAZA.x,z-PLAZA.z)>PLAZA.r+1.5 && !nearPath(x,z,m) && !colliders.some(b=>x>b.x0-1.5&&x<b.x1+1.5&&z>b.z0-1.5&&z<b.z1+1.5); }

/* 거점 이름판 */
const labels = [];
const LABEL_SPRITES=[];   // 거점 이름판 (로비·로그인 화면에서는 숨겨요)
function label(title, sub, color, x, y, z){
  const cv=document.createElement('canvas'); cv.width=512; cv.height=150;
  const tex=new THREE.CanvasTexture(cv); tex.encoding=THREE.sRGBEncoding;
  const draw=()=>{ const g=cv.getContext('2d'); g.clearRect(0,0,512,150);
    g.fillStyle='rgba(18,22,34,.86)'; roundRect(g,6,6,500,138,18); g.fill();
    g.fillStyle=color; roundRect(g,6,6,16,138,8); g.fill(); g.fillRect(14,6,8,138);
    g.strokeStyle='rgba(232,200,120,.85)'; g.lineWidth=3; roundRect(g,8,8,496,134,17); g.stroke();
    g.fillStyle='#f7f1e3'; g.textAlign='center';
    g.font='56px Jua, "Malgun Gothic", sans-serif'; g.fillText(title,262,70);
    g.fillStyle='rgba(232,200,120,.95)'; g.font='600 26px "IBM Plex Sans KR", "Malgun Gothic", sans-serif'; g.fillText(sub,262,114);
    tex.needsUpdate=true; };
  draw(); labels.push(draw);
  const api={set(t,s2){ title=t; sub=s2; draw(); }};
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,fog:false,toneMapped:false})); sp.scale.set(8.2,2.4,1); sp.position.set(x,y,z); scene.add(sp); LABEL_SPRITES.push(sp);
  return api;
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(()=>labels.forEach(d=>d()));
within('zones',()=>{
ZLAB.hq=label(ZCFG.n[0],ZCFG.s[0],'#3b6fd9',0,24,-31);
ZLAB.lab=label(ZCFG.n[1],ZCFG.s[1],'#21966f',-27,16,16);
ZLAB.fac=label(ZCFG.n[2],ZCFG.s[2],'#ea7d1f',27,14,16);
});

