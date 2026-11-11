/* 사회 게임 RPG · 로비 무대 · 설정 창
   파일은 01 → 13 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요. */
/* ---------- 로비: 로그인하면 기사 · 궁수 · 마법사가 지금 꾸민 모습으로 서 있어요 ---------- */
const LOBBY={g:null,chars:{},tok:0,last:null}, LOBBY_JOBS=['archer','knight','mage'], LOBBY_AT={x:0,z:96}, STAGE_Y=.32;
function ensureLobby(){
  if (LOBBY.g || !knight) return;
  const g=new THREE.Group(); scene.add(g); LOBBY.g=g; g.visible=false;
  const ringGeo=new THREE.RingGeometry(.62,.9,40);
  { const stone=toonMat({map:stoneTex('#a39d90','#6c665a','#b3ad9f')}); const top=cs(new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.3,STAGE_Y,48),stone)); top.position.y=STAGE_Y/2; g.add(top);
    const rim=cs(new THREE.Mesh(new THREE.TorusGeometry(2.1,.12,8,64),std(0x8d8577))); rim.rotation.x=Math.PI/2; rim.position.y=STAGE_Y; g.add(rim);
    const lawn=new THREE.Mesh(new THREE.CircleGeometry(16,48),toonMat({map:grassTex})); lawn.rotation.x=-Math.PI/2; lawn.position.y=.08; lawn.receiveShadow=true; g.add(lawn);
    for (let i=0;i<9;i++){ const a=i/9*Math.PI*2+.3, r=rnd(5.5,8); const t=GL.tree_single_A&&GL.tree_single_A.scene.clone(true); if (!t||Math.sin(a)>.35) continue; prepMesh(t); t.scale.setScalar(rnd(3,4)); t.position.set(Math.cos(a)*r,0,Math.sin(a)*r); g.add(t); }
    const sp=new THREE.PointLight(0xfff1c8,.8,9,2); sp.position.set(0,4,2.5); g.add(sp); LOBBY.light=sp; }
  LOBBY_JOBS.forEach((j,i)=>{
    const c=makePlayerChar(j);
    c.root.position.x=(i-1)*1.85; g.add(c.root); c.anim.setBase('idle');
    c.mixer.setTime(i*.37);
    const ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xffc531,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
    ring.rotation.x=-Math.PI/2; g.add(ring); c.ring=ring;
    const glow=new THREE.Mesh(new THREE.CircleGeometry(.62,32),new THREE.MeshBasicMaterial({color:0xffe9a0,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
    glow.rotation.x=-Math.PI/2; g.add(glow); c.glow=glow;
    LOBBY.chars[j]=c;
  });
  dressLobby();
}
async function dressLobby(){
  if (!LOBBY.g) return; const t=++LOBBY.tok;
  // 직업마다 자기 차림으로 (10-shop.js · applyLook이 로비 캐릭터도 함께 입혀요)
  applyLook();
}
function lobbyActive(){ return W.state!=='play' && !$('#title').hidden && !$('#title').classList.contains('step-login') && !SHOP.open; }
function loginActive(){ return W.state!=='play' && !$('#title').hidden && $('#title').classList.contains('step-login') && !SHOP.open; }
function lobbyTick(real,dt){
  const login=loginActive(), on=lobbyActive()||login; if (on) ensureLobby();
  if (LOBBY.g) LOBBY.g.visible=on;
  LABEL_SPRITES.forEach(s=>{ s.visible=!on; });
  // 로비·로그인 화면은 캐릭터가 카메라 가까이 있어서 빛 번짐을 줄여요 (얼굴이 하얗게 날아가지 않게)
  // 로비·로그인 화면은 캐릭터가 카메라 바로 앞이라 햇빛과 빛 번짐을 줄여요 (하얗게 날아가지 않게)
  if (MOODS[MOOD]){ const M=MOODS[MOOD]; if (bloom) bloom.strength=M.bloom[0]*(on?.6:1); sun.intensity=M.sun[1]*(on?.8:1); renderer.toneMappingExposure=M.exp*(on?.95:1); }
  // 발판 서바이벌: 큰 색 발판이 화면을 꽉 채워서 눈부셔요 → 빛 번짐은 아주 연하게, 밝기도 살짝 낮춰요 (매 프레임 위에서 덮어써서 여기서 맞춰야 해요)
  if (!on && MAPK==='stage' && MOOD!=='day') applyMood('day');   // 판마다 바뀌는 분위기(황금빛·새벽·황혼)는 발판에서 특히 눈부셔서, 발판 서바이벌은 늘 '맑은 낮'으로 고정
  if (!on && MAPK==='stage' && MOODS[MOOD]){ if (bloom){ bloom.strength=Math.min(bloom.strength,.06); bloom.threshold=.98; } renderer.toneMappingExposure*=.9; sun.intensity*=.85; }
  pg.visible=!on;
  if (!on || !LOBBY.g) return false;
  const LX=LOBBY_AT.x, LZ=LOBBY_AT.z;
  LOBBY.g.position.set(LX,0,LZ);
  { const o=sun.userData.off||[22,38,14]; sun.position.set(LX+o[0],o[1],LZ+o[2]); } sun.target.position.set(LX,0,LZ); sun.target.updateMatrixWorld();
  if (LOBBY.light && !login) LOBBY.light.intensity=.5;
  if (login) return loginTick(real,dt);
  // 고른 직업 캐릭터 하나만 가운데에. 바꾸면 '뿅' 하고 나타나며 만세해요
  if (LOBBY.last!==JOB){ const c=LOBBY.chars[JOB]; if (c){ LOBBY.popT=0; c.root.scale.setScalar(.01); if (LOBBY.last){ c.anim.once('cheer',1.5,true); fx.burst(LX,1.5,LZ,0xffd34d,22,4); fx.rise(LX,LZ,0xffe9a0,16); } } LOBBY.last=JOB; }
  LOBBY.popT=Math.min(1,(LOBBY.popT??1)+dt*3.2);
  const t=LOBBY.popT, u=t-1, pop=t<1?1+2.70158*u*u*u+1.70158*u*u:1;
  LOBBY_JOBS.forEach(j=>{
    const c=LOBBY.chars[j], sel=j===JOB;
    c.root.visible=sel; c.ring.visible=c.glow.visible=sel;
    c.root.position.set(0,STAGE_Y,0); c.ring.position.set(0,STAGE_Y+.02,0); c.glow.position.set(0,STAGE_Y+.015,0);
    if (!sel) return;
    c.root.scale.setScalar(Math.max(.01,pop*1.15));
    c.root.rotation.y=LOBBY.rot+(LOBBY.drag||reduceMotion()?0:Math.sin(real*.6)*.35)+(t<1?(1-t)*Math.PI*2:0);
    c.ring.material.opacity=.7+Math.sin(real*4)*.25; c.glow.material.opacity=.3;
    c.ring.scale.setScalar(1.25+Math.sin(real*3)*.06); c.glow.scale.setScalar(1.25);
    c.mixer.update(dt);
  });
  // 캐릭터가 직업 고르기 막대 바로 위 가운데(휴대폰은 위쪽 빈칸)에 오도록 카메라를 옮겨요
  const W0=innerWidth, H0=innerHeight, tn=Math.tan(camera.fov*Math.PI/360);
  let cx, cy, h;
  if (W0<760){ const r=$('#lobbyStage').getBoundingClientRect(); cx=r.left+r.width/2; cy=r.top+r.height/2; h=Math.max(120,r.height); }
  else { const jb=document.querySelector('.jobbar').getBoundingClientRect(); const top=60, bot=jb.top-6; cx=jb.left+jb.width/2; cy=(top+bot)/2; h=Math.max(160,bot-top); }
  const dd=Math.max(5,Math.min(18,2.5*H0/(h*tn))), k=2*dd*tn/H0, ox=(cx-W0/2)*k, oy=(H0/2-cy)*k;
  camera.position.set(LX-ox,1.75-oy+.9,LZ+dd); camera.lookAt(LX-ox,1.75-oy,LZ);
  return true;
}
/* 로그인 화면: 궁수 · 기사 · 마법사가 나란히 서 있고, 카메라가 천천히 좌우로 흔들려요 (로그인 카드는 오른쪽) */
function loginTick(real,dt){
  const LX=LOBBY_AT.x, LZ=LOBBY_AT.z;
  LOBBY_JOBS.forEach((j,i)=>{ const c=LOBBY.chars[j]; if (!c) return;
    c.root.visible=true; c.ring.visible=c.glow.visible=false; c.root.scale.setScalar(1.05);
    c.root.position.set((i-1)*1.55,STAGE_Y,i===1?.35:-.15); c.root.rotation.y=(i-1)*-.28+Math.sin(real*.5+i)*.06; c.mixer.update(dt); });
  LOBBY.last=null;
  const W0=innerWidth, H0=innerHeight, tn=Math.tan(camera.fov*Math.PI/360), wide=W0>=900;
  const panel=document.querySelector('#title .panel'), pr=panel?panel.getBoundingClientRect():null;
  const free=wide&&pr?pr.left:W0, cx=free/2, cy=H0*(wide?.6:.42);
  if (LOBBY.light) LOBBY.light.intensity=.2;
  const dd=wide?11.5:13, a=reduceMotion()?0:Math.sin(real*.11)*.32;
  const rx=Math.cos(a), rz=-Math.sin(a), k=2*dd*tn/H0, ox=(cx-W0/2)*k, oy=(H0/2-cy)*k;
  const lx=LX-rx*ox, lz=LZ-rz*ox, ly=1.15-oy;
  camera.position.set(lx+Math.sin(a)*dd, ly+2.6, lz+Math.cos(a)*dd); camera.lookAt(lx,ly,lz);
  return true;
}
/* 화면을 좌우로 끌면 캐릭터를 돌려 볼 수 있어요 */
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
LOBBY.rot=0; LOBBY.drag=null;
$('#title').addEventListener('pointerdown',e=>{ if (e.target!==$('#title') || !LOBBY.g || !LOBBY.g.visible) return; LOBBY.drag={x:e.clientX,r:LOBBY.rot}; });
addEventListener('pointermove',e=>{ if (LOBBY.drag) LOBBY.rot=LOBBY.drag.r+(e.clientX-LOBBY.drag.x)*.01; });
addEventListener('pointerup',()=>{ LOBBY.drag=null; });

