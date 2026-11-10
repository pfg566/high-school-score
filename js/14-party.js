/* 사회 게임 RPG · 파티 모드 (같은 반 최대 5명) · 점령전 맵
   파일은 01 → 14 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요.
   방장 컴퓨터가 몬스터 · 거점 · 웨이브를 계산해서 알려 주고, 다른 친구들은 받아서 보여 줘요.
   각자 공격은 자기 화면에서 맞히고 '맞혔다'는 소식만 방장에게 보내요. */

/* ---------- 점령전 맵 ---------- */
const CQ={r:4.4, camp:{x:0,z:23},
  pts:[{k:'A',name:'서쪽 거점',x:-17,z:-1,hex:'#3b6fd9'},{k:'B',name:'가운데 거점',x:0,z:-10,hex:'#3b6fd9'},{k:'C',name:'동쪽 거점',x:17,z:-1,hex:'#3b6fd9'}],
  portals:[{x:-22,z:-27},{x:0,z:-30},{x:22,z:-27}],
  cap:15, dec:17, loseHold:10, aggro:8.5, respawn:12, breakT:8, regen:1.5};
/* 파티 판은 가장 어려워요: 영웅 모드 위에 몬스터 체력 ×1.3 · 공격 ×1.25 · 속도 ×1.08, 사람 수만큼 더 많고 단단해져요 */
/* 퀴즈 점령 방도 낮췄어요: 영웅 기준 ×0.7 체력 · ×0.65 공격 → 보통과 비슷해요 (퀴즈 버프가 있어서 몹 막기보다 조금 세게) */
const PARTY_K={hp:.7,dmg:.65,spd:.95}, PARTY_SCALE={n:.35,hp:.12}, PARTY_MAXLIVE=26;
/* 몹 막기 방은 퀴즈 도움(버프·회복)이 없어서 훨씬 쉽게: 영웅 기준 ×0.6 체력 · ×0.55 공격 → 보통보다 조금 약해요 */
const SPAWN_PER_FRAME=2;   // 몬스터는 한 프레임에 2마리까지만 만들어요 (한꺼번에 만들면 노트북이 멈칫해요)
const PARTY_K_FIGHT={hp:.6,dmg:.55,spd:.92}, PARTY_SCALE_FIGHT={n:.3,hp:.1};
const partyFight=()=>PARTY.mode==='fight';
const partyK=()=>partyFight()?PARTY_K_FIGHT:PARTY_K;
const partyScale=()=>partyFight()?PARTY_SCALE_FIGHT:PARTY_SCALE;
const cqRespawn=()=>partyFight()?7:8, cqRegen=()=>partyFight()?3:2.5;   // 학교 노트북이 버티도록 한 번에 살아 있는 몬스터는 26마리까지
const CQ_SEGS=[], CQV=[], CQ_PORTALS=[];
MAP_KEYS.push('conquest');
MAPSTATE.conquest={colliders:[],stations:[],npcs:[]}; mapGroups.conquest=new THREE.Group(); mapGroups.conquest.visible=false; scene.add(mapGroups.conquest);
MAPS.conquest={name:'점령전 맵', need:['mc'], start:[0,23], recharge:30,
  desc:'파티원과 함께 세 거점을 점령하고 해골 대군단에게서 지켜요.',
  rules:['<b>점령:</b> 거점 원 안에 서 있으면 게이지가 차요. 친구가 함께 서면 더 빨리 차요','<b>퀴즈 점령 방:</b> 게이지가 다 차면 원 안의 한 명에게 퀴즈가 나와요. 맞히면 점령, 틀리면 게이지가 절반으로','<b>몹 막기 방:</b> 게이지만 다 차면 점령','<b>지키기:</b> 몬스터가 원에 들어오면 게이지를 깎아요. 세 거점을 10초 동안 모두 빼앗기면 패배','<b>점령한 거점 안</b>에서는 체력이 조금씩 차요','<b>난이도:</b> 퀴즈 점령 방은 보통 정도, 몹 막기 방은 보통보다 조금 쉬워요. 사람이 많을수록 더 많이 몰려와요. 웨이브 5개, 마지막에 해골 장군','쓰러지면 캠프에서 다시 일어나요(퀴즈 방 8초 · 몹 막기 방 7초). 모두 한꺼번에 쓰러지면 패배'],
  gateText:'', clearText:'웨이브 클리어!', winTitle:'점령전 승리!', winMsg:'파티원과 힘을 합쳐 해골 군단을 막아 냈어요. 아래 틀린 문제를 한 번 더 읽어 보고 마무리해요.'};
WAVESETS.conquest=[
  {name:'해골 정찰대',hp:70,spd:2.3,dmg:9,color:0xe0434a,groups:[{n:4,at:0},{n:3,at:8,runner:true},{n:4,at:16}]},
  {name:'해골 돌격대',hp:85,spd:2.5,dmg:10,color:0x8b5cf6,groups:[{n:5,at:0},{n:4,at:8,runner:true},{n:5,at:16},{n:3,at:24,runner:true}]},
  {name:'해골 공성대',hp:95,spd:2.6,dmg:11,color:0x8b5cf6,groups:[{n:6,at:0},{n:5,at:8,runner:true},{n:6,at:16},{n:5,at:26,runner:true}]},
  {name:'해골 대군단',hp:100,spd:2.7,dmg:12,color:0x8b5cf6,groups:[{n:7,at:0},{n:6,at:8,runner:true},{n:7,at:16},{n:6,at:24,runner:true},{n:6,at:32}]},
  {name:'해골 장군의 총공격',hp:95,spd:2.7,dmg:12,color:0x8b5cf6,boss:{...BOSS_BASE,hp:1500,dmg:28,shield:4,slamEvery:4.2,slamWarn:1.0,slamR:6,slamDmg:24,summonEvery:9},groups:[{n:5,at:0},{n:5,at:12,runner:true},{n:5,at:24},{n:5,at:36,runner:true}]}];
GRASS_OK.conquest=(x,z)=>!CQ.pts.some(p=>Math.hypot(x-p.x,z-p.z)<CQ.r+.5)&&Math.hypot(x-CQ.camp.x,z-CQ.camp.z)>6&&!CQ.portals.some(p=>Math.hypot(x-p.x,z-p.z)<3.2)&&!nearSegs(CQ_SEGS,x,z,1.8)&&!inCol(x,z);
MAP_BUILD.conquest=()=>buildConquest();

/* 게이지 고리: 각도(uv.x)만큼 채워져요 */
function capRingMat(){
  return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{uFill:{value:0},uCol:{value:new THREE.Color(0x4f86ff)},uBg:{value:new THREE.Color(0x1d2433)},uGlow:{value:0}},
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader:'uniform float uFill; uniform vec3 uCol; uniform vec3 uBg; uniform float uGlow; varying vec2 vUv; void main(){ bool on=vUv.x<uFill; vec3 c=on?uCol*(1.+uGlow*.5):uBg; float a=on?.92:.45; float edge=smoothstep(0.,.18,vUv.y)*smoothstep(1.,.82,vUv.y); gl_FragColor=vec4(c,a*(.55+.45*edge)); }'});
}
function buildConquest(){
  const C=CQ.camp;
  stoneDisc(C.x,C.z,5.6);
  CQ.pts.forEach(p=>dirtStrip(C.x,C.z-5.2,p.x,p.z+CQ.r-.4,CQ_SEGS));
  dirtStrip(CQ.pts[0].x+CQ.r-.4,CQ.pts[0].z,CQ.pts[1].x-CQ.r+.4,CQ.pts[1].z,CQ_SEGS);
  dirtStrip(CQ.pts[2].x-CQ.r+.4,CQ.pts[2].z,CQ.pts[1].x+CQ.r-.4,CQ.pts[1].z,CQ_SEGS);
  CQ.portals.forEach((q,i)=>{ const p=CQ.pts[i]; dirtStrip(q.x,q.z+2.4,p.x,p.z-CQ.r+.4,CQ_SEGS); });
  /* 캠프 */
  place('tent',-6.5,27.5,5,.5,.8); place('tent',6.5,27.5,5,-.5,.8);
  place('flag_blue',-3.4,18.6,7,0,false); place('flag_blue',3.4,18.6,7,0,false);
  place('weaponrack',8.6,22,6,-1.2,false);
  [['barrel',-8.6,21.5,5],['barrel',-9.4,22.6,5],['crate_A_big',-8.4,24,5],['sack',9,25.4,6]].forEach(([n,x,z,s])=>place(n,x,z,s,rnd(0,6),false));
  label('파티 캠프','쓰러지면 여기서 다시 일어나요','#3b6fd9',C.x,7,C.z+5.5);
  /* 거점 */
  const stone=std(0x6e6a62,{roughness:.95,flatShading:true});
  CQ.pts.forEach((p,i)=>{
    stoneDisc(p.x,p.z,CQ.r);
    const g=new THREE.Group(); g.position.set(p.x,0,p.z); scene.add(g);
    const ringMat=capRingMat(), ring=new THREE.Mesh(arcGeo(CQ.r+.05,CQ.r+.6,-Math.PI/2,Math.PI*1.5,96),ringMat);
    ring.rotation.x=-Math.PI/2; ring.position.y=.1; ring.renderOrder=3; g.add(ring);
    const base=cs(new THREE.Mesh(new THREE.CylinderGeometry(.85,1.05,.5,8),stone)); base.position.y=.25; g.add(base);
    const gemMat=new THREE.MeshStandardMaterial({color:0x8a93a5,emissive:0x000000,emissiveIntensity:.9,roughness:.15,metalness:.1,flatShading:true});
    const gem=cs(new THREE.Mesh(new THREE.OctahedronGeometry(.55,0),gemMat),false); gem.scale.set(.75,1.45,.75); gem.position.y=1.6; g.add(gem);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.45,.8,9,24,1,true),new THREE.MeshBasicMaterial({color:0xffd34d,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
    beam.position.y=4.8; g.add(beam);
    addCol(p.x,p.z,1.5,1.5);
    const fb=place('flag_blue',p.x+2.9,p.z-2.9,7,0,false), fr=place('flag_red',p.x+2.9,p.z-2.9,7,0,false), fn=place('flag_green',p.x+2.9,p.z-2.9,7,0,false);
    const lab=label(`${p.k} · ${p.name}`,'아무도 차지하지 않았어요','#8a93a5',p.x,7.4,p.z);
    CQV[i]={g,ring,ringMat,gem,gemMat,beam,fb,fr,fn,lab,labKey:''};
  });
  /* 몬스터가 나오는 차원문 */
  CQ.portals.forEach(q=>{
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.3,.38,10,48),new THREE.MeshStandardMaterial({color:0x3a2550,emissive:0x8b5cf6,emissiveIntensity:.85,roughness:.5,flatShading:true}));
    ring.position.set(q.x,2.6,q.z); cs(ring); scene.add(ring);
    const disc=new THREE.Mesh(new THREE.CircleGeometry(2.05,40),new THREE.MeshBasicMaterial({color:0x7b3cff,transparent:true,opacity:.6,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    disc.position.set(q.x,2.6,q.z); scene.add(disc); CQ_PORTALS.push(disc);
    const pad=new THREE.Mesh(new THREE.CircleGeometry(3.2,40),toonMat({color:0x3b2f45})); pad.rotation.x=-Math.PI/2; pad.position.set(q.x,.04,q.z); pad.receiveShadow=true; scene.add(pad);
    place('rock_single_C',q.x-3.2,q.z+.6,4,rnd(0,6),false); place('rock_single_A',q.x+3.3,q.z-.4,4,rnd(0,6),false);
  });
  /* 나무 · 바위 */
  const keep=[[C.x,C.z,8],...CQ.pts.map(p=>[p.x,p.z,CQ.r+3]),...CQ.portals.map(p=>[p.x,p.z,5])];
  scatter(22,[-33,33,-33,33],3,CQ_SEGS,keep,(x,z)=>place(Math.random()<.5?'tree_single_A':'tree_single_B',x,z,rnd(3.2,4.4),rnd(0,6),.25));
  scatter(14,[-34,34,-34,34],2.5,CQ_SEGS,keep,(x,z,k)=>place(['rock_single_A','rock_single_C','rock_single_E'][k%3],x,z,rnd(3,5),rnd(0,6),false));
}

/* ---------- 파티 상태 ---------- */
const PARTY={on:false,host:false,cid:'',rid:'',me:'',mode:'quiz',members:{},order:[],n:1,rp:{},room:null,refs:[],sendT:0,bcT:0,snap:null,bonus:0,ended:false,
  lastWave:-1,msgN:0,lastQ:'',kc:0,act:{k:'',s:1,n:0},downAt:{},pending:{}};
const PH={id:0,wave:-1,next:0,q:[],pts:[],loseT:0,downT:0,held:0,end:null,msg:{n:0,t:''},seq:0};
const partyQuiz=()=>PARTY.mode==='quiz';
const pRef=p=>fbDb.ref(p);
const idxPath=()=>`partyIdx/${PARTY.cid}/${PARTY.rid}`, livePath=()=>`partyLive/${PARTY.rid}`;
function partyCid(){
  if (STUDENT) return STUDENT.cid;
  if (isAdmin){ const c=$('#pkCls').value; return c&&!c.startsWith('n:')?c:'teacher'; }
  return '';
}
function myUid(){ return fbAuth&&fbAuth.currentUser?fbAuth.currentUser.uid:''; }
function myName(){ return STUDENT&&PROFILE?(PROFILE.name||STUDENT.num+'번'):(isAdmin?'선생님':($('#nick').value.trim()||'손님')); }
function memberInfo(){ return {name:myName().slice(0,12),num:STUDENT?+STUDENT.num:0,job:JOB,el:MELEM,look:equippedLook(JOB),at:firebase.database.ServerValue.TIMESTAMP}; }
function partyOff(){ PARTY.refs.forEach(([r,ev,cb])=>{ try{ r.off(ev,cb); }catch(e){} }); PARTY.refs=[]; }
function listen(path,ev,cb){ const r=pRef(path), f=r.on(ev,cb,()=>{}); PARTY.refs.push([r,ev,f||cb]); return r; }

/* ---------- 파티 방 화면 ---------- */
let PP={open:false,mode:'quiz',rooms:{},listRef:null,listCb:null};
function ppNote(t,kind){ const e=$('#ppNote'); e.textContent=t||''; e.className='pp-note'+(kind?' '+kind:''); }
/* 선생님 잠금: 퀴즈 점령 방 · 몹 막기 방을 따로 잠글 수 있어요 (선생님 계정은 시험해 볼 수 있게 열려 있어요) */
let PARTY_LOCK={quiz:true,fight:true};   // 기본은 잠김 · 선생님 화면에서 열어요
const modeLocked=m=>!isAdmin && !!PARTY_LOCK[m==='fight'?'fight':'quiz'];
const allLocked=()=>modeLocked('quiz')&&modeLocked('fight');
function applyPartyLock(){
  const b=$('#partyBtn'); if (b){ b.classList.toggle('locked',allLocked()); b.innerHTML=allLocked()?'🔒 파티 모드<small>선생님이 잠갔어요</small>':'👥 파티 모드<small>점령전 · 최대 5명</small>'; }
  document.querySelectorAll('[data-pmode]').forEach(x=>{ const L=modeLocked(x.dataset.pmode); x.disabled=L; x.classList.toggle('locked',L); });
  if (modeLocked(PP.mode) && !allLocked()) PP.mode=modeLocked('quiz')?'fight':'quiz';
  renderModes();
  if (PP.open && !PARTY.rid){ PP.html=''; try{ renderRooms(); }catch(e){} }
  if (PARTY.room && !PARTY.on) try{ renderRoom(PARTY.room); }catch(e){}
}
const lockWhy=m=>`🔒 선생님이 ${m==='fight'?'⚔️ 몹 막기':'🧠 퀴즈 점령'} 방을 잠갔어요.`;
function openPartyPanel(){
  if (!assetsReady) return;
  if (!fbDb || !(STUDENT||isAdmin)){ $('#partyPanel').hidden=false; $('#ppList').hidden=false; $('#ppRoom').hidden=true; $('#ppRooms').innerHTML=''; ppNote('파티 모드는 코드로 로그인해야 쓸 수 있어요.','err'); return; }
  PP.open=true; PARTY.cid=partyCid(); PARTY.me=myUid();
  $('#partyPanel').hidden=false;
  if (PARTY.rid) showRoom(); else showList();
}
function closePartyPanel(){ if (PARTY.rid) return; PP.open=false; $('#partyPanel').hidden=true; stopList(); }
function stopList(){ if (PP.listRef){ PP.listRef.off('value',PP.listCb); PP.listRef=null; } }
function showList(){
  $('#ppList').hidden=false; $('#ppRoom').hidden=true; ppNote(partyGateOpen()?'같은 반 친구가 만든 방에 들어가거나, 새 방을 만들어요. 한 방에 5명까지 · 🧠 퀴즈 점령은 보통 정도, ⚔️ 몹 막기는 보통보다 조금 쉬워요.':gateWhy());
  stopList(); PP.listRef=pRef('partyIdx/'+PARTY.cid);
  PP.listCb=PP.listRef.on('value',s=>{ PP.rooms=s.val()||{}; renderRooms(); },()=>ppNote('방 목록을 불러오지 못했어요. 선생님께 보안 규칙이 최신인지 알려 주세요.','err'));
  renderModes();
}
function renderModes(){ document.querySelectorAll('[data-pmode]').forEach(b=>b.classList.toggle('on',b.dataset.pmode===PP.mode)); }
function renderRooms(){
  const now=Date.now(), list=Object.entries(PP.rooms).filter(([k,r])=>r&&r.meta&&r.meta.state==='wait'&&now-(+r.meta.at||0)<3*3600e3)
    .sort((a,b)=>(+a[1].meta.at||0)-(+b[1].meta.at||0));
  const ok=partyGateOpen();
  const html=list.length?list.map(([k,r])=>{ const n=Object.keys(r.m||{}).length, full=n>=5, lk=modeLocked(r.meta.mode);
      return `<div class="pp-room"><span><b>${esc(r.meta.hostName||'친구')}의 방</b><small>${r.meta.mode==='quiz'?'🧠 퀴즈 점령':'⚔️ 몹 막기'} · ${n}/5명 · ${Object.values(r.m||{}).map(m=>esc(m.name)).join(', ')}</small></span><button class="btn small" data-join="${k}"${full||!ok||lk?' disabled':''}>${lk?'🔒 잠김':full?'가득 참':'들어가기'}</button></div>`; }).join('')
    :'<p class="pp-empty">아직 열린 방이 없어요. 새 방을 만들어 보세요!</p>';
  if (html!==PP.html){ PP.html=html; $('#ppRooms').innerHTML=html; }
  $('#ppCreate').disabled=!ok||allLocked();
  if (ok && allLocked()) ppNote('🔒 선생님이 파티 모드를 잠갔어요.','err');
}
/* 파티 판 수: 혼자 하는 판과 따로 세요. 선생님이 정한 판 수만큼 파티도 따로 할 수 있어요 */
let PPLOG={}, pplogRef=null;
function watchPartyLog(){
  if (pplogRef){ pplogRef.off(); pplogRef=null; } PPLOG={};
  if (!(AUTHMODE==='student'&&STUDENT&&fbDb)) return;
  pplogRef=fbDb.ref(`partylog/${STUDENT.cid}/${STUDENT.num}`);
  pplogRef.on('value',s=>{ PPLOG=s.val()||{}; if (PP.open) try{ renderRooms(); }catch(e){} },()=>{ PPLOG={}; });
}
function partyUsed(g){
  if (!g||!g.sid) return 0;
  if (AUTHMODE==='student'&&STUDENT) return +PPLOG[g.sid]||0;
  try{ return +localStorage.getItem('gsd-ppl-'+g.sid)||0; }catch(e){ return 0; }
}
function partyLeft(g){ if (!g) return 0; if (g.stop) return 0; if (!g.sid||!g.plays||g.plays>=999) return Infinity; return Math.max(0,g.plays-partyUsed(g)); }
function partyGateOpen(){ if (isAdmin || !fbDb || GATE_OK===false) return true; const g=activeGate(); return !!g && partyLeft(g)>0; }
function gateWhy(){ const g=activeGate(); if (!g) return '🔒 선생님이 게임을 열어야 방을 만들 수 있어요.'; if (g.stop) return '🔒 선생님이 이번 시간 게임을 마무리했어요.'; if (partyLeft(g)<=0) return '이번 시간에 할 수 있는 파티 판을 다 했어요. (혼자 하는 판은 따로 남아 있을 수 있어요)'; return '지금은 방을 만들 수 없어요.'; }
async function createRoom(){
  if (!partyGateOpen()){ ppNote(gateWhy(),'err'); return; }
  if (modeLocked(PP.mode)){ ppNote(lockWhy(PP.mode),'err'); return; }
  PARTY.cid=partyCid(); PARTY.me=myUid(); if (!PARTY.cid||!PARTY.me){ ppNote('로그인 정보를 확인하지 못했어요. 새로고침 후 다시 해 주세요.','err'); return; }
  const rid=pRef('partyIdx/'+PARTY.cid).push().key; PARTY.rid=rid;
  const room={meta:{host:PARTY.me,hostName:myName().slice(0,12),mode:PP.mode,state:'wait',at:firebase.database.ServerValue.TIMESTAMP},m:{[PARTY.me]:memberInfo()}};
  try{
    await withTimeout(pRef(idxPath()).set(room),8000);
    await withTimeout(pRef(livePath()+'/host').set(PARTY.me),8000);
    try{ pRef(idxPath()).onDisconnect().remove(); pRef(livePath()).onDisconnect().remove(); }catch(e){}
    showRoom();
  }catch(e){ const code=String(e&&(e.code||e.message)||'오류'); try{ pRef(idxPath()).remove().catch(()=>{}); }catch(_){} PARTY.rid=''; ppNote(`방을 만들지 못했어요 (${code}).`+(/permission/i.test(code)?' 선생님께 보안 규칙이 최신인지 알려 주세요.':' 잠시 뒤 다시 해 보세요.'),'err'); }
}
async function joinRoom(rid){
  const r=PP.rooms[rid]; if (!r) return; if (!partyGateOpen()){ ppNote(gateWhy(),'err'); return; }
  if (modeLocked(r.meta.mode)){ ppNote(lockWhy(r.meta.mode),'err'); return; }
  if (Object.keys(r.m||{}).length>=5){ ppNote('방이 가득 찼어요.','err'); return; }
  PARTY.rid=rid; PARTY.me=myUid();
  try{ await withTimeout(pRef(idxPath()+'/m/'+PARTY.me).set(memberInfo()),8000); try{ pRef(idxPath()+'/m/'+PARTY.me).onDisconnect().remove(); }catch(e){} showRoom(); }
  catch(e){ const code=String(e&&(e.code||e.message)||'오류'); PARTY.rid=''; ppNote(`들어가지 못했어요 (${code}). 잠시 뒤 다시 해 보세요.`,'err'); }
}
function showRoom(){
  stopList(); $('#ppList').hidden=true; $('#ppRoom').hidden=false;
  if (PARTY.roomRef) return;
  PARTY.roomRef=pRef(idxPath());
  PARTY.roomCb=PARTY.roomRef.on('value',s=>{ const r=s.val(); PARTY.room=r;
    if (!r||!r.meta){ if (!PARTY.on){ leaveRoomLocal(); ppNote('방이 사라졌어요. 방장이 나갔을 수 있어요.','err'); } return; }
    PARTY.mode=r.meta.mode==='fight'?'fight':'quiz'; PARTY.host=r.meta.host===PARTY.me;
    renderRoom(r);
    if (r.meta.state==='play' && !PARTY.on && r.m && r.m[PARTY.me]) startPartyGame(r);
    if (!r.m || !r.m[PARTY.me]){ if (!PARTY.on){ leaveRoomLocal(); ppNote('방에서 나왔어요.'); } }
  });
}
const JOBI={knight:'🛡️',archer:'🏹',mage:'🔮'};
function renderRoom(r){
  const ms=Object.entries(r.m||{}).sort((a,b)=>(+a[1].at||0)-(+b[1].at||0));
  $('#ppMode').innerHTML=`${r.meta.mode==='quiz'?'🧠 <b>퀴즈 점령 방</b> · 게이지를 채운 뒤 퀴즈를 맞혀야 점령':'⚔️ <b>몹 막기 방</b> · 퀴즈 없이 거점을 지켜요'} · ${ms.length}/5명`;
  const mh=ms.map(([u,m])=>`<li${u===PARTY.me?' class="me"':''}><i>${JOBI[m.job]||'🙂'}</i><b>${esc(m.name)}</b>${u===r.meta.host?'<em>방장</em>':''}<small>${({knight:'기사',archer:'궁수',mage:'마법사'})[m.job]||''}</small></li>`).join(''); if (mh!==PARTY.mh){ PARTY.mh=mh; $('#ppMembers').innerHTML=mh; }
  const host=r.meta.host===PARTY.me;
  const lk=modeLocked(r.meta.mode);
  $('#ppStart').hidden=!host; $('#ppStart').disabled=!partyGateOpen()||lk;
  $('#ppRoomNote').textContent=lk?lockWhy(r.meta.mode)+' 방에서 나가 다른 방을 골라 주세요.':host?'친구들이 다 들어오면 시작을 눌러요. 아래에서 직업을 바꿀 수 있어요.':'방장이 시작하면 바로 게임이 열려요. 아래에서 직업을 바꿀 수 있어요.';
}
function leaveRoomLocal(){
  if (PARTY.roomRef){ PARTY.roomRef.off('value',PARTY.roomCb); PARTY.roomRef=null; }
  PARTY.rid=''; PARTY.room=null; PARTY.host=false;
  if (PP.open) showList();
}
async function leaveRoom(){
  const wasHost=PARTY.host, ip=idxPath(), lp=livePath();
  leaveRoomLocal();
  try{ if (wasHost){ await pRef(ip).remove(); await pRef(lp).remove(); } else await pRef(ip+'/m/'+PARTY.me).remove(); }catch(e){}
}
async function hostStart(){
  if (!PARTY.host || !PARTY.room || !partyGateOpen()) return;
  if (modeLocked(PARTY.room.meta.mode)){ $('#ppRoomNote').textContent=lockWhy(PARTY.room.meta.mode)+' 방에서 나가 다른 방을 골라 주세요.'; return; }
  const n=Object.keys(PARTY.room.m||{}).length;
  try{ await pRef(idxPath()+'/meta').update({state:'play',n,start:firebase.database.ServerValue.TIMESTAMP}); }catch(e){ $('#ppRoomNote').textContent='시작하지 못했어요. 다시 눌러 주세요.'; }
}
/* 직업을 바꾸면 방에도 알려요 */
function partyJobChanged(){ if (PARTY.rid && !PARTY.on && PARTY.room && PARTY.room.meta.state==='wait'){ pRef(idxPath()+'/m/'+PARTY.me).update({job:JOB,el:MELEM,look:equippedLook(JOB)}).catch(()=>{}); } }

/* 판 수 쓰기 (정해진 판 수가 있을 때만) */
async function consumePlayQuiet(){
  try{ const g=activeGate(); if (!g||!g.sid||partyLeft(g)===Infinity) return;
    if (AUTHMODE==='guest'){ try{ localStorage.setItem('gsd-ppl-'+g.sid,String(partyUsed(g)+1)); }catch(e){} return; }
    if (!(AUTHMODE==='student'&&STUDENT)) return;
    const ref=fbDb.ref(`partylog/${STUDENT.cid}/${STUDENT.num}/${g.sid}`); const cur=+((await ref.once('value')).val())||0; await ref.set(cur+1); PPLOG[g.sid]=cur+1; }catch(e){}
}

/* ---------- 게임 시작 ---------- */
function startPartyGame(r){
  PARTY.on=true; PARTY.ended=false; PARTY.bonus=0; PARTY.lastWave=-1; PARTY.msgN=0; PARTY.lastQ=''; PARTY.kc=0; PARTY.snap=null; PARTY.rp={}; PARTY.downAt={};
  PARTY.members=r.m||{}; PARTY.order=Object.keys(PARTY.members).sort((a,b)=>(+PARTY.members[a].at||0)-(+PARTY.members[b].at||0));
  PARTY.n=Math.max(1,PARTY.order.length); PARTY.host=r.meta.host===PARTY.me; PARTY.mode=r.meta.mode==='fight'?'fight':'quiz';
  Object.assign(PH,{id:0,wave:-1,next:4,q:[],pts:CQ.pts.map(()=>({g:0,own:0,qb:'',qt:0,qn:0,cd:0})),loseT:0,downT:0,held:0,end:null,msg:{n:0,t:''},seq:0,sq:[],bid:0,bolts:[],rSeen:false,lSeen:false}); PARTY.snapSeen=null; PARTY.snapPrevT=0; PARTY.boltSeen=new Set(); PARTY.evBuf=[]; PARTY.dmBuf={}; PARTY.flushT=0; PARTY.lastP=''; PARTY.lastPT=0;
  $('#partyPanel').hidden=true; PP.open=false;
  consumePlayQuiet();
  document.body.classList.add('party');
  if (AUTHMODE==='guest' && !$('#nick').value.trim()) $('#nick').value='선생님';
  startGame();
  if (W.state!=='play'){ partyCleanup(); return; }
  DIFF=1; P.down=false;
  const k=PARTY.order.indexOf(PARTY.me), off=(k-(PARTY.n-1)/2)*1.6; P.x=CQ.camp.x+off; P.z=CQ.camp.z-1; P.fx=0; P.fz=-1;
  for (const j in PCH){ PCH[j].anim.onAct=(key,sp)=>{ PARTY.act={k:key,s:+(sp||1).toFixed(2),n:PARTY.act.n+1}; }; }
  if (knight) knight.anim.onAct=PCH[JOB].anim.onAct;
  // 친구 캐릭터
  PARTY.order.forEach(u=>{ if (u!==PARTY.me) makeRemote(u,PARTY.members[u]); });
  try{ pRef(livePath()+'/p/'+PARTY.me).onDisconnect().remove(); }catch(e){}
  // 실시간 소식 듣기
  const onP=s=>{ const u=s.key; if (u===PARTY.me) return; const R=PARTY.rp[u]; const st=s.val(); if (!R||!st) return; remoteNet(R,st); };
  listen(livePath()+'/p','child_added',onP); listen(livePath()+'/p','child_changed',onP);
  listen(livePath()+'/dm/'+PARTY.me,'child_added',s=>{ const d=s.val(); pRef(livePath()+'/dm/'+PARTY.me+'/'+s.key).remove().catch(()=>{}); if (!d||W.state!=='play') return; hurtPlayer(+d.d||0,{x:+d.x||P.x,z:+d.z||P.z}); });
  if (PARTY.host){
    listen(livePath()+'/ev','child_added',s=>{ const e=s.val(); pRef(livePath()+'/ev/'+s.key).remove().catch(()=>{}); if (e) hostEvent(e); });
  } else {
    listen(livePath()+'/g','value',s=>{ const g=s.val(); if (g) PARTY.snap=g; });
    listen(livePath()+'/host','value',s=>{ if (!s.val() && PARTY.on && !PARTY.ended && W.state==='play') partyEnd(false,'host'); });
  }
  showBanner(PARTY.mode==='quiz'?'점령전 · 퀴즈 점령':'점령전 · 몹 막기');
  flashPrompt('세 거점(A · B · C) 원 안에 함께 서서 점령하세요',4);
  $('#partyHud').hidden=false; $('#partyList').hidden=false;
}
function partySend(e){ if (!PARTY.on||PARTY.ended) return; if (PARTY.host){ hostEvent({...e,u:PARTY.me}); return; } PARTY.evBuf.push(e); if (e.k==='q') partyFlush(); }
/* 친구 → 방장 소식은 0.1초마다 한 번에 묶어 보내요 (쓰기 횟수를 크게 줄여요) */
function partyFlush(){
  if (PARTY.evBuf.length && !PARTY.host){ const l=PARTY.evBuf.splice(0); pRef(livePath()+'/ev').push({k:'b',u:PARTY.me,l}).catch(()=>{}); }
  if (PARTY.host){ for (const u in PARTY.dmBuf){ const d=PARTY.dmBuf[u]; pRef(livePath()+'/dm/'+u).push({d:Math.round(d.d),x:Math.round(d.x*10)/10,z:Math.round(d.z*10)/10}).catch(()=>{}); } PARTY.dmBuf={}; }
}

/* ---------- 친구 캐릭터 ---------- */
function nameTag(text){
  const cv=document.createElement('canvas'); cv.width=256; cv.height=64; const g=cv.getContext('2d');
  g.fillStyle='rgba(18,22,34,.78)'; roundRect(g,4,8,248,48,14); g.fill();
  g.fillStyle='#fff'; g.font='700 30px "Noto Sans KR","Malgun Gothic",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,128,33);
  const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,toneMapped:false})); sp.scale.set(2.4,.6,1); sp.renderOrder=8; return sp;
}
function makeRemote(u,m){
  const job=JOBS[m.job]?m.job:'knight';
  const ch=makePlayerChar(job), g=new THREE.Group(); g.add(ch.root); scene.add(g);
  dressP2(ch,{...DEFAULTS[job],...(m.look||{})}).catch(()=>{});
  const tag=nameTag(m.name||'친구'); tag.position.y=3.05; g.add(tag);
  const bar=makeBar(1.3); bar.fg.material=bar.fg.material.clone(); bar.fg.material.color.setHex(0x3fbf6a);
  ch.anim.setBase('idle');
  PARTY.rp[u]={u,m,job,ch,g,tag,bar,st:null,seen:0,x:CQ.camp.x,z:CQ.camp.z,f:Math.PI,lastN:-1,down:false};
}
function removeRemotes(){ for (const u in PARTY.rp){ const R=PARTY.rp[u]; scene.remove(R.g); scene.remove(R.bar.g); R.ch.mixer.stopAllAction(); } PARTY.rp={}; }
const RPROJ=[];
/* 내 상태는 짧은 글자 하나로 보내요: t,x,z,f,hp,mx,dn,q,b,동작이름,동작속도,동작번호 */
function encP(s){ const a=s.a||{}; return [s.t,s.x,s.z,s.f,s.hp,s.mx,s.dn,s.q,s.b,a.k||'',a.s||1,a.n|0].join(','); }
function decP(v){ if (typeof v!=='string') return v; const a=v.split(','); return {t:+a[0],x:+a[1],z:+a[2],f:+a[3],hp:+a[4],mx:+a[5],dn:+a[6],q:+a[7],b:+a[8],a:{k:a[9],s:+a[10],n:+a[11]}}; }
function remoteNet(R,st){
  st=decP(st);
  const now=performance.now(), x=st.x/10, z=st.z/10;
  if (R.st && st.t!=null && R.st.t!=null){ let dts=(st.t-R.st.t)/100; if (dts<0) dts+=600; if (dts>.03 && dts<1.5){ const vx=(x-R.st.x/10)/dts, vz=(z-R.st.z/10)/dts, sp=Math.hypot(vx,vz), c=sp>9?9/sp:1; R.vx=vx*c; R.vz=vz*c; } else { R.vx=0; R.vz=0; } }
  if (st.dn){ R.vx=0; R.vz=0; }
  R.st=st; R.seen=now; R.netAt=now;
}
function remoteTick(dt){
  const now=performance.now();
  for (const u in PARTY.rp){ const R=PARTY.rp[u], s=R.st; if (!s) continue;
    const age=R.netAt?Math.min(.35,(now-R.netAt)/1000):0, tx=s.x/10+(R.vx||0)*age, tz=s.z/10+(R.vz||0)*age, k=Math.min(1,dt*14);
    const ox=R.x, oz=R.z; R.x+=(tx-R.x)*k; R.z+=(tz-R.z)*k;
    let df=(s.f/100)-R.f; df=Math.atan2(Math.sin(df),Math.cos(df)); R.f+=df*Math.min(1,dt*12);
    R.g.position.set(R.x,0,R.z); R.g.rotation.y=R.f;
    const spd=Math.hypot(R.x-ox,R.z-oz)/Math.max(dt,1e-3);
    const A=R.ch.anim;
    if (s.dn && !R.down){ R.down=true; A.die(); }
    else if (!s.dn && R.down){ R.down=false; A.revive(); }
    if (!R.down){
      if (s.a && s.a.n!==R.lastN){ if (R.lastN>=0){ A.once(s.a.k,s.a.s||1,true); remoteFx(R,s.a.k); } R.lastN=s.a.n; }
      A.setBase(s.b?'blocking':spd>.6?'run':'idle',spd>.6?Math.min(2.4,Math.max(.7,spd/RUN_SPEED.knight)):1);
    }
    R.ch.mixer.update(dt);
    R.tag.visible=true; R.tag.material.opacity=s.q?.6:1;
    const r=Math.max(0,s.hp/Math.max(1,s.mx)); R.bar.fg.scale.x=Math.max(.001,r); R.bar.fg.position.x=-(1-r)*R.bar.w/2;
    R.bar.g.position.set(R.x,2.7,R.z); R.bar.g.quaternion.copy(camera.quaternion); R.bar.g.visible=!R.down;
    R.g.visible=now-R.seen<15000;
  }
  for (let i=RPROJ.length-1;i>=0;i--){ const p=RPROJ[i]; p.life-=dt; p.x+=p.vx*dt; p.z+=p.vz*dt; p.mesh.position.set(p.x,p.y,p.z); if (p.life<=0){ scene.remove(p.mesh); RPROJ.splice(i,1); } }
}
function remoteFx(R,k){
  const dx=Math.sin(R.f), dz=Math.cos(R.f);
  if (k==='shoot'){ const m=makeArrow(0); m.rotation.y=R.f; RPROJ.push({mesh:m,x:R.x+dx*.6,z:R.z+dz*.6,y:1.25,vx:dx*30,vz:dz*30,life:ARROW_RANGE/30}); }
  else if (k==='cast'){ const col=ELEM[R.m.el]?ELEM[R.m.el].color:0xff7a2f; const m=makeOrb(col,false); RPROJ.push({mesh:m,x:R.x+dx*.7,z:R.z+dz*.7,y:1.35,vx:dx*15,vz:dz*15,life:ORB_RANGE/15}); }
  else if (k==='slashH'||k==='slashD'||k==='chop'){ impactFx(R.x+dx*1.4,1.1,R.z+dz*1.4,0xfff1c4,1.6); }
}

/* ---------- 모든 사람 위치 (방장이 계산할 때) ---------- */
function partyPlayers(){
  const out=[{uid:PARTY.me,x:P.x,z:P.z,alive:!P.down&&W.state==='play',q:!!W.paused,local:true}];
  const now=performance.now();
  for (const u in PARTY.rp){ const R=PARTY.rp[u], s=R.st; if (!s||now-R.seen>8000) continue; out.push({uid:u,x:s.x/10,z:s.z/10,alive:!s.dn,q:!!s.q,local:false}); }
  return out;
}
function hostDamage(pl,d,src){
  if (pl.local){ hurtPlayer(d,src); return; }
  const b=PARTY.dmBuf[pl.uid]||(PARTY.dmBuf[pl.uid]={d:0,x:src.x,z:src.z}); b.d+=d; b.x=src.x; b.z=src.z;
}
function hostMsg(t){ PH.msg={n:PH.msg.n+1,t}; flashPrompt(t,2.6); }

/* ---------- 방장: 웨이브 ---------- */
const TYPES_DEF=w=>({0:{...w,color:0xe0434a},1:{...w,color:0x8b5cf6},2:{...w,color:0x8b5cf6,runner:true,hp:Math.round(w.hp*.6),spd:3.4},
  4:{...w,color:0x8b5cf6,ranged:true,hp:Math.round(w.hp*RANGED.hpK),spd:2.0},5:{...w,color:0xe0434a,leaper:true,hp:Math.round(w.hp*.8)}});
/* 웨이브마다 섞는 비율: 보라 해골 비율 · 석궁 해골 수 · 도약 해골 수 (사람 수에 따라 늘어요) */
const CQ_MIX=[{p:.25,r:0,l:0},{p:.45,r:1,l:1},{p:.55,r:2,l:1},{p:.65,r:2,l:2},{p:.6,r:2,l:2}];
function cqSpawn(def,isBoss,portal){
  const before=mobs.length; spawnMob(def,isBoss,{x:portal.x,z:portal.z}); const m=mobs[before]; if (!m) return null;
  m.id=++PH.id; m.typ=isBoss?3:def.ranged?4:def.leaper?5:def.runner?2:def.color===0x8b5cf6?1:0; m.atkN=0; if (m.leaper){ m.ls=0; m.lCd=1.5; }
  if (isBoss){ m.shield=partyQuiz()?(def.boss.shield||4):0; m.shieldMax=m.shield; }
  const a=Math.random()*6.283, rr=Math.random()*(CQ.r-1.6); m.ox=Math.cos(a)*rr; m.oz=Math.sin(a)*rr; m.goal=null;
  return m;
}
function hostStartWave(i){
  W.wave=i; PH.wave=i; PH.next=0; const d=WAVES[i], S=partyScale(), kN=(1+S.n*(PARTY.n-1))*(partyFight()?.8:.85), kH=1+S.hp*(PARTY.n-1);
  d.groups.forEach((g,gi)=>PH.q.push({at:W.t+g.at,n:Math.max(1,Math.round(g.n*kN)),runner:!!g.runner,portal:CQ.portals[(gi+i)%3],def:{...d,hp:Math.round(d.hp*kH),boss:undefined}}));
  if (d.boss){ const bd={...d,boss:{...d.boss,hp:Math.round(d.boss.hp*kH),slamEvery:5.5,slamWarn:1.2,summonEvery:partyFight()?14:12}}; cqSpawn(bd,true,CQ.portals[1]); }
  { const X=CQ_MIX[Math.min(i,CQ_MIX.length-1)], T=TYPES_DEF({...d,hp:Math.round(d.hp*kH),boss:undefined}), extra=k=>Math.max(0,Math.round(k*(1+.25*(PARTY.n-1))*(partyFight()?.8:1)));
    for (let k=0;k<extra(X.r);k++) PH.sq.push({def:T[4],portal:CQ.portals[(k+i)%3],at:W.t+3+k*2});
    for (let k=0;k<extra(X.l);k++) PH.sq.push({def:T[5],portal:CQ.portals[(k+i+1)%3],at:W.t+6+k*3});
    if (X.r && !PH.rSeen){ PH.rSeen=true; setTimeout(()=>PARTY.on&&hostMsg('석궁 든 해골은 멀리서 쏴요! 빨간 조준선이 보이면 옆으로 피하세요'),4000); }
    else if (X.l && !PH.lSeen){ PH.lSeen=true; setTimeout(()=>PARTY.on&&hostMsg('노란 도약 해골은 가까이 오면 뛰어들어요! 빨간 원이 보이면 피하세요'),7000); } }
  showBanner(`웨이브 ${i+1} · ${d.name}`); SFX.wave();
}
function pickGoal(m){
  const S=PH.pts; let best=null, bd=1e9;
  CQ.pts.forEach((p,i)=>{ if (S[i].own===2) return; const d=Math.hypot(p.x-m.x,p.z-m.z)-(S[i].own===1?6:0); if (d<bd){ bd=d; best=i; } });
  return best;
}
function hostMobs(dt,players){
  for (const m of mobs){
    if (m.dying>=0){ m.dying=Math.max(0,m.dying-dt); if (m.onDying) m.onDying();
      m.x+=m.kbx*dt; m.z+=m.kbz*dt; m.kbx*=Math.pow(.03,dt); m.kbz*=Math.pow(.03,dt);
      if (m.avy||m.ay>0){ m.avy=(m.avy||0)-22*dt; m.ay=Math.max(0,(m.ay||0)+m.avy*dt); if (m.ay===0) m.avy=0; } continue; }
    if (m.spawnT>0){ m.spawnT-=dt; continue; }
    mobStatus(m,dt); if (m.dying>=0) continue;
    if (m.stun>0){ m.stun-=dt; m.x+=m.kbx*dt; m.z+=m.kbz*dt; m.kbx*=Math.pow(.02,dt); m.kbz*=Math.pow(.02,dt); resolve(m,m.r); m.flash=Math.max(0,m.flash-dt); m.mat.emissive.setHex(m.flash>0?0xffffff:0x000000); continue; }
    let pl=null, pd=1e9; for (const a of players){ if (!a.alive||a.q) continue; const d=Math.hypot(a.x-m.x,a.z-m.z); if (d<pd){ pd=d; pl=a; } }
    if (m.ranged && pRangedAI(m,dt,pl,pd)) continue;
    if (m.leaper && pLeapAI(m,dt,pl,pd)) continue;
    let tx, tz, chase=false;
    if (pl && !m.runner && pd<(m.boss?10:CQ.aggro)){ tx=pl.x; tz=pl.z; chase=true; }
    else { if (m.goal==null || PH.pts[m.goal].own===2) m.goal=pickGoal(m);
      if (m.goal!=null){ const p=CQ.pts[m.goal]; tx=p.x+m.ox; tz=p.z+m.oz; } else if (pl){ tx=pl.x; tz=pl.z; chase=true; } else { tx=m.x; tz=m.z; } }
    const dx=tx-m.x, dz=tz-m.z, d=Math.hypot(dx,dz)||1;
    if (m.boss){ const B=m.def.boss; m.summonCd-=dt;
      if (m.summonCd<=0){ m.summonCd=B.summonEvery; if (mobs.filter(o=>o.dying<0).length<16){ for (let k=0;k<2+Math.min(3,PARTY.n-1);k++){ const s=cqSpawn(TYPES_DEF(m.def)[1],false,{x:m.x,z:m.z}); } hostMsg('해골 장군이 부하를 불렀어요!'); } }
      if (m.slamT>0){ m.slamT-=dt;
        if (m.slamT<=0){ fx.shock(m.slamX,m.slamZ,B.slamR); fx.burst(m.slamX,.3,m.slamZ,0x9aa3b5,26,7); shake=.45; m.recover=.35; m.slamN=(m.slamN||0)+1;
          for (const a of players){ if (a.alive && Math.hypot(a.x-m.slamX,a.z-m.slamZ)<B.slamR) hostDamage(a,Math.round(B.slamDmg*HERO.dmg*partyK().dmg),{x:m.slamX,z:m.slamZ}); }
          m.slamCd=B.slamEvery; }
        m.g.rotation.y=Math.atan2(dx,dz); m.flash=Math.max(0,m.flash-dt); m.mat.emissive.setHex(0x661111); continue; }
      m.slamCd-=dt; if (m.slamCd<=0 && pl && pd<10){ m.slamT=B.slamWarn; m.slamX=m.x; m.slamZ=m.z; }
    }
    const stay=!chase && d<.7, sp=m.spd*slowK(m)*(stay?0:1);
    m.x+=(dx/d*sp+m.kbx)*dt; m.z+=(dz/d*sp+m.kbz)*dt; m.kbx*=Math.pow(.02,dt); m.kbz*=Math.pow(.02,dt);
    for (const o of mobs){ if (o===m||o.dying>=0) continue; const ox=m.x-o.x, oz=m.z-o.z, od=Math.hypot(ox,oz), min=m.r+o.r; if (od>0&&od<min){ m.x+=ox/od*(min-od)*.5; m.z+=oz/od*(min-od)*.5; } }
    resolve(m,m.r); m.atDoor=stay;
    if (!stay) m.g.rotation.y=Math.atan2(dx,dz);
    m.atkCd=Math.max(0,m.atkCd-dt);
    if (chase && pd<m.r+.75 && m.atkCd<=0){ if (m.anim) m.anim.once('attack',1.6); m.atkN=(m.atkN+1)%100; hostDamage(pl,m.dmg,{x:m.x,z:m.z,mob:m}); m.atkCd=1; }
    m.flash=Math.max(0,m.flash-dt); m.mat.emissive.setHex(m.flash>0?0xffffff:0x000000);
  }
  mobs=mobs.filter(m=>{ if (m.dying===0){ removeMob(m); return false; } return true; });
}
/* 석궁 해골 (방장): 가까운 친구를 겨냥해요. 화살은 각자 화면에서 자기에게 맞았는지 판정해요 */
const pAim=()=>RANGED.aim*(partyFight()?1.25:1.1);
function pRangedAI(m,dt,pl,pd){
  if (!pl || pd>20){ if (m.aimT>0){ m.aimT=0; if (m.aimLine) m.aimLine.visible=false; } return false; }
  const dx=pl.x-m.x, dz=pl.z-m.z, d=Math.hypot(dx,dz)||1;
  m.shotCd=(m.shotCd===undefined?rnd(1,2.2):m.shotCd)-dt; m.moving=false;
  if (m.aimT>0){ m.aimT-=dt; if (m.aimT>.3){ m.aimX=pl.x; m.aimZ=pl.z; } m.aimD=pAim(); drawAim(m);
    if (m.aimT<=0){ fireBolt(m); const b=EBOLTS[EBOLTS.length-1]; if (b){ b.pid=++PH.bid; PH.bolts.push({id:b.pid,x:b.x,z:b.z,vx:b.vx,vz:b.vz,dmg:b.dmg,tb:W.t,end:W.t+b.life}); } m.shotCd=RANGED.cd*(partyFight()?1.2:1); m.aimLine.visible=false; } }
  else { let mv=0; if (d>RANGED.keep+1.5) mv=1; else if (d<RANGED.min) mv=-.7;
    const sp=m.spd*slowK(m); m.x+=(dx/d*sp*mv+m.kbx)*dt; m.z+=(dz/d*sp*mv+m.kbz)*dt; m.moving=mv!==0; m.g.rotation.y=Math.atan2(dx,dz);
    if (d<RANGED.keep+3.5 && m.shotCd<=0){ m.aimT=pAim(); m.aimX=pl.x; m.aimZ=pl.z; m.atkN=(m.atkN+1)%100; if (m.anim) m.anim.once('aim',1,true); } }
  m.kbx*=Math.pow(.02,dt); m.kbz*=Math.pow(.02,dt);
  for (const o of mobs){ if (o===m||o.dying>=0) continue; const ox=m.x-o.x, oz=m.z-o.z, od=Math.hypot(ox,oz), min=m.r+o.r; if (od>0&&od<min){ m.x+=ox/od*(min-od)*.5; m.z+=oz/od*(min-od)*.5; } }
  resolve(m,m.r); m.flash=Math.max(0,m.flash-dt); m.mat.emissive.setHex(m.flash>0?0xffffff:(m.aimT>0?0x2a0606:0x000000));
  return true;
}
/* 조준선 그리기 (방장 · 친구 화면 공용) */
function drawAim(m){
  const L=m.aimLine; if (!L) return; if (!(m.aimT>0)){ L.visible=false; return; }
  const ax=m.aimX-m.x, az=m.aimZ-m.z, len=Math.min(17,Math.hypot(ax,az)+3);
  m.g.rotation.y=Math.atan2(ax,az); L.visible=true; L.position.set(m.x,.13,m.z); L.rotation.y=Math.atan2(ax,az); L.scale.set(1,1,len);
  L.material.opacity=m.aimT<=.3?.85+Math.sin(W.t*40)*.15:.35+(1-m.aimT/(m.aimD||1))*.3;
}
/* 도약 해골 (방장): 가까운 친구 자리에 빨간 원 → 뛰어듦. 맞았는지는 각자 화면에서 판정해요 */
const pLeapWarn=()=>LEAP.warn*(partyFight()?1.35:1.15);
function leapRingOf(m){ if (!m.leapRing){ m.leapRing=new THREE.Mesh(leapRingGeo,new THREE.MeshBasicMaterial({color:0xe0434a,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false,toneMapped:false})); m.leapRing.rotation.x=-Math.PI/2; scene.add(m.leapRing); } return m.leapRing; }
function pLeapAI(m,dt,pl,pd){
  m.lCd-=dt;
  if (m.ls===0){ if (!pl || m.lCd>0 || pd>LEAP.range) return false;
    m.ls=1; m.lT=pLeapWarn(); m.lx=m.x; m.lz=m.z; m.ltx=pl.x; m.ltz=pl.z; if (m.anim) m.anim.once('hit',1,true); }
  m.g.rotation.y=Math.atan2(m.ltx-m.x,m.ltz-m.z);
  if (m.ls===1){ m.lT-=dt; if (m.lT<=0){ m.ls=2; m.lT=LEAP.fly; if (m.anim) m.anim.once('attack',1.2,true); } leapDraw(m,m.ls,m.lT); return true; }
  m.lT-=dt; const k=1-Math.max(0,m.lT)/LEAP.fly; m.x=m.lx+(m.ltx-m.lx)*k; m.z=m.lz+(m.ltz-m.lz)*k; m.ay=Math.sin(k*Math.PI)*2.2; leapDraw(m,2,m.lT);
  if (m.lT<=0){ m.ay=0; m.ls=0; m.lCd=LEAP.cd*(partyFight()?1.3:1); resolve(m,m.r); leapLand(m); }
  return true;
}
function leapDraw(m,s,t){ const R=leapRingOf(m); R.visible=s>0; if (!R.visible) return; R.position.set(m.ltx,.07,m.ltz);
  if (s===1){ R.material.opacity=.45+.4*Math.abs(Math.sin(W.t*18)); R.scale.setScalar(1+(1-t/pLeapWarn())*.15); } }
function leapLand(m){ if (m.leapRing) m.leapRing.visible=false; fx.shock(m.ltx,m.ltz,LEAP.r+.3); fx.burst(m.ltx,.3,m.ltz,0xc9b48a,14,4); shake=Math.max(shake,.15);
  if (!P.down && Math.hypot(P.x-m.ltx,P.z-m.ltz)<LEAP.r) hurtPlayer(Math.round(m.dmg*1.4),{x:m.ltx,z:m.ltz,mob:m}); }
/* ---------- 방장: 거점 ---------- */
function hostPoints(dt,players){
  const live=mobs.filter(m=>m.dying<0&&!(m.spawnT>0));
  CQ.pts.forEach((p,i)=>{ const S=PH.pts[i];
    const inP=players.filter(a=>a.alive&&Math.hypot(a.x-p.x,a.z-p.z)<CQ.r), nP=inP.length;
    const nM=live.filter(m=>Math.hypot(m.x-p.x,m.z-p.z)<CQ.r).length;
    S.cd=Math.max(0,S.cd-dt);
    if (nP&&!nM){ const cap=partyQuiz()&&S.own!==1?100:100; S.g=Math.min(cap,S.g+CQ.cap*(1+.5*(nP-1))*dt); }
    else if (nM&&!nP){ S.g=Math.max(-100,S.g-CQ.dec*(1+.3*(nM-1))*dt); }
    if (S.own===1 && S.g<=0){ S.own=0; hostMsg(`${p.k} 거점을 빼앗겼어요! 다시 점령하세요`); }
    if (S.own===2 && S.g>=0){ S.own=0; }
    if (S.g<=-100 && S.own!==2){ S.own=2; S.qb=''; hostMsg(`해골이 ${p.k} 거점을 차지했어요!`); }
    if (S.g>=100 && S.own!==1){
      if (!partyQuiz()){ S.own=1; hostMsg(`${p.k} 거점 점령!`); SFX.correct(); }
      else if (!S.qb && S.cd<=0 && nP){ const who=inP.filter(a=>!a.q).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
        if (who){ S.qb=who.uid; S.qt=W.t; S.qn++; } }
    }
    if (S.qb){ const still=players.find(a=>a.uid===S.qb); if (!still || W.t-S.qt>40){ S.qb=''; S.cd=2; } }
  });
  PH.held+=PH.pts.filter(S=>S.own===1).length*dt;
}
function hostEvent(e){
  if (!PARTY.on||PARTY.ended) return;
  if (e.k==='b'){ const l=Array.isArray(e.l)?e.l:Object.values(e.l||{}); for (const x of l) if (x) hostEvent({...x,u:e.u}); return; }
  if (e.k==='h'){ const m=mobs.find(o=>o.id===e.id); if (!m||m.dying>=0) return;
    hitMob(m,+e.d||0,+e.x,+e.z,+e.kb||0,'#ffffff',false,{by:e.u,stun:+e.st||.2,crit:!!e.cr,launch:!!e.ln,noStun:!!e.ns,quiet:e.u!==PARTY.me&&!e.cr}); return; }
  if (e.k==='st'){ const m=mobs.find(o=>o.id===e.id); if (!m||m.dying>=0) return; if (e.b) burnRaw(m,e.b[0],e.b[1]); if (e.s) slowRaw(m,e.s[0],e.s[1]); return; }
  if (e.k==='q'){ const S=PH.pts[e.p]; if (!S||S.qb!==e.u) return; S.qb='';
    if (e.ok){ S.own=1; S.g=100; const nm=(PARTY.members[e.u]||{}).name||'친구'; hostMsg(`${nm}이(가) 퀴즈를 맞혀 ${CQ.pts[e.p].k} 거점을 점령했어요!`); SFX.correct();
      const b=liveBoss(); if (b && b.shield>0){ b.shield--; fx.burst(b.x,2.5,b.z,0x5cc8f0,34,8); SFX.shield(); hostMsg(b.shield>0?`보스 보호막 파괴! 남은 보호막 ${b.shield}개`:'보스 보호막이 모두 깨졌어요!'); } }
    else { S.g=50; S.cd=3; hostMsg(`${CQ.pts[e.p].k} 거점 퀴즈 오답… 게이지가 절반으로 줄었어요`); }
  }
}
function hostTick(dt){
  const players=partyPlayers();
  // 웨이브
  if (PH.wave<0){ if (W.t>=PH.next) hostStartWave(0); }
  const liveN=mobs.filter(m=>m.dying<0).length;
  for (let i=PH.q.length-1;i>=0;i--){ const q=PH.q[i]; if (W.t<q.at) continue;
    if (liveN+q.n>PARTY_MAXLIVE && liveN>0){ q.at=W.t+1.5; continue; }   // 너무 많으면 조금 뒤에 나와요
    PH.q.splice(i,1);
    const T=TYPES_DEF(q.def), X=CQ_MIX[Math.min(PH.wave,CQ_MIX.length-1)];
    for (let k=0;k<q.n;k++) PH.sq.push({def:q.runner?T[2]:T[(k+.5)/q.n<X.p?1:0],portal:q.portal});
    hostMsg(q.runner?'주황 돌격병은 거점으로만 달려가요! 거점을 지키세요':'해골들이 차원문에서 몰려와요!'); }
  for (let k=0,j=0;k<SPAWN_PER_FRAME && j<PH.sq.length;){ const s=PH.sq[j]; if (s.at && W.t<s.at){ j++; continue; } PH.sq.splice(j,1); cqSpawn(s.def,false,s.portal); k++; }
  hostMobs(dt,players);
  hostPoints(dt,players);
  if (PH.wave>=0 && !PH.q.length && !PH.sq.length && !mobs.length && !PH.end){
    if (PH.wave>=WAVES.length-1) hostEnd(true,'clear');
    else if (!PH.next){ PH.next=W.t+CQ.breakT; hostMsg(`웨이브 클리어! ${CQ.breakT}초 뒤 다음 웨이브가 와요`); }
    else if (W.t>=PH.next) hostStartWave(PH.wave+1);
  }
  // 지는 조건
  if (PH.pts.every(S=>S.own===2)){ PH.loseT+=dt; if (PH.loseT>=CQ.loseHold) hostEnd(false,'pts'); } else PH.loseT=0;
  if (players.length && players.every(a=>!a.alive)){ PH.downT+=dt; if (PH.downT>1.5) hostEnd(false,'down'); } else PH.downT=0;
  // 소식 보내기 (1초에 8번)
  PARTY.bcT-=dt; if (PARTY.bcT<=0 || PH.end){ PARTY.bcT=.125; hostBroadcast(); }
}
function hostBroadcast(){
  const n=Math.round;
  const ms=mobs.map(m=>{ const a=[m.id,n(m.x*10),n(m.z*10),n(m.g.rotation.y*100),Math.max(0,n(m.hp)),n(m.max),m.typ,m.dying>=0?2:m.spawnT>0?1:0,m.shield|0,m.atkN|0,m.dying>=0?(m.killer||''):''];
    if (m.boss) a.push(m.slamT>0?n(m.slamT*100):0,n((m.slamX||0)*10),n((m.slamZ||0)*10));
    else if (m.ranged) a.push(m.aimT>0?n(m.aimT*100):0,n((m.aimX||0)*10),n((m.aimZ||0)*10));
    else if (m.leaper) a.push(m.ls|0,n((m.ltx||0)*10),n((m.ltz||0)*10),m.ls?n(Math.max(0,m.lT)*100):0);
    return a.join(','); }).join(';');
  PH.bolts=PH.bolts.filter(b=>b.end>W.t);
  const bs=PH.bolts.map(b=>[b.id,n(b.x*10),n(b.z*10),n(b.vx*10),n(b.vz*10),b.dmg,n(b.tb*100)].join(',')).join(';');
  const g={t:n(W.t*100),w:PH.wave,nx:PH.next>W.t?Math.ceil(PH.next-W.t):0,lt:n(PH.loseT),
    pts:PH.pts.map(S=>[n(S.g),S.own,S.qb||'',S.qn].join(',')).join(';'),ms:ms||'-',bs:bs||'-',msg:PH.msg,held:n(PH.held)};
  if (PH.end) g.end=PH.end;
  pRef(livePath()+'/g').set(g).catch(()=>{});
}
function hostEnd(win,reason){
  if (PH.end) return; PH.end={win:!!win,reason,bonus:Math.round(PH.held*.5)};
  hostBroadcast();
  partyEnd(win,reason,PH.end.bonus);
  const ip=idxPath(), lp=livePath();
  pRef(ip+'/meta/state').set('end').catch(()=>{});
  setTimeout(()=>{ pRef(lp).remove().catch(()=>{}); pRef(ip).remove().catch(()=>{}); },8000);
}

/* ---------- 친구 화면: 방장이 보낸 소식 적용 ---------- */
const DEF_BY_TYP=t=>{ const w=WAVES[Math.max(0,Math.min(WAVES.length-1,PARTY.lastWave<0?0:PARTY.lastWave))]; const T=TYPES_DEF(w);
  if (t===3){ const b=WAVES[WAVES.length-1]; return {...b,boss:{...b.boss}}; } return T[t]||T[0]; };
function clientTick(dt){
  const g=PARTY.snap; if (!g) return;
  W.wave=g.w; PH.wave=g.w;
  if (g.w!==PARTY.lastWave && g.w>=0){ PARTY.lastWave=g.w; showBanner(`웨이브 ${g.w+1} · ${WAVES[g.w].name}`); SFX.wave(); }
  if (g.msg && g.msg.n!==PARTY.msgN){ PARTY.msgN=g.msg.n; if (g.msg.t) flashPrompt(g.msg.t,2.6); }
  String(g.pts||'').split(';').forEach((s,i)=>{ const S=PH.pts[i]; if (!S||!s) return; const a=s.split(','); S.g=+a[0]; S.own=+a[1]; S.qb=a[2]||''; S.qn=+a[3]; });
  PH.loseT=g.lt||0; PH.next=g.nx?W.t+g.nx:0;
  const fresh=PARTY.snapSeen!==g; PARTY.snapSeen=g;
  const now=performance.now(), hdt=fresh&&PARTY.snapPrevT?Math.max(.05,(g.t-PARTY.snapPrevT)/100):0; if (fresh) PARTY.snapPrevT=g.t;
  let made=0; const seen=new Set();
  if (fresh||PARTY.spawnLeft) { PARTY.spawnLeft=false; for (const ss of String(g.ms||'').split(';')){ if (!ss||ss==='-') continue; const a=ss.split(','); const id=+a[0],x10=+a[1],z10=+a[2],r100=+a[3],hp=+a[4],max=+a[5],typ=+a[6],st=+a[7],sh=+a[8],atk=+a[9],killer=a[10]; seen.add(id);
    let m=mobs.find(o=>o.id===id);
    if (!m){ if (st===2) continue; if (made>=SPAWN_PER_FRAME){ PARTY.spawnLeft=true; continue; } made++; const before=mobs.length; spawnMob(DEF_BY_TYP(typ),typ===3,{x:x10/10,z:z10/10}); m=mobs[before]; if (!m) continue;
      m.id=id; m.typ=typ; m.x=x10/10; m.z=z10/10; m.atkN=atk; m.net=true; m.nx=m.x; m.nz=m.z; m.vx=0; m.vz=0; m.netAt=now; }
    { const nx=x10/10, nz=z10/10; if (hdt && m.netAt){ const vx=(nx-m.nx)/hdt, vz=(nz-m.nz)/hdt, sp=Math.hypot(vx,vz); const c=sp>6?6/sp:1; m.vx=vx*c; m.vz=vz*c; } if (nx!==m.nx||nz!==m.nz||fresh){ m.nx=nx; m.nz=nz; m.netAt=now; } }
    m.tx=x10/10; m.tz=z10/10; m.tr=r100/100; m.hp=hp; m.max=max; m.shield=sh; if (m.boss && !m.shieldMax) m.shieldMax=Math.max(sh,1);
    if (st!==1 && m.spawnT>0) m.spawnT=0;
    if (atk!==m.atkN){ m.atkN=atk; if (m.anim && m.dying<0) m.anim.once(m.ranged?'aim':'attack',m.ranged?1:1.6,m.ranged); }
    if (m.ranged){ const aT=+a[11]/100; if (aT>0){ m.aimT=aT; m.aimX=+a[12]/10; m.aimZ=+a[13]/10; m.aimD=pAim(); } else if (m.aimT>0 && fresh){ m.aimT=0; } }
    if (m.leaper){ const ls=+a[11]; if (fresh){ if (ls>0){ if (!(m.ls>0)) m.lStart=1; m.ltx=+a[12]/10; m.ltz=+a[13]/10; m.lT=+a[14]/100; if (ls===2 && m.ls===1 && m.anim) m.anim.once('attack',1.2,true); if (ls===1 && !(m.ls>0) && m.anim) m.anim.once('hit',1,true); }
      else if (m.ls>0){ m.ay=0; leapLand(m); }
      m.ls=ls; } }
    if (m.boss){ const sT=a[11]/100; if (sT>0 && !(m.slamT>0)) m.anim.once('slam',.8,true); m.slamT=sT; m.slamX=a[12]/10; m.slamZ=a[13]/10; }
    if (st===2 && m.dying<0){ m.dying=1.6; m.hp=0; if (m.anim) m.anim.die(); fx.burst(m.x,.9,m.z,m.color,m.boss?40:22,m.boss?8:6); SFX.kill(); if (m.boss) shake=.5;
      if (killer===PARTY.me) W.kills++; }
  }
  if (!PARTY.spawnLeft) for (const m of mobs){ if (!seen.has(m.id) && m.dying<0){ m.dying=.01; } } }
  if (fresh) for (const ss of String(g.bs||'').split(';')){ if (!ss||ss==='-') continue; const a=ss.split(','), id=+a[0]; if (PARTY.boltSeen.has(id)) continue; PARTY.boltSeen.add(id);
    const x=+a[1]/10, z=+a[2]/10, vx=+a[3]/10, vz=+a[4]/10, sp=Math.hypot(vx,vz)||1, age=Math.max(0,(g.t-(+a[6]))/100), life=19/sp-age; if (life<=0) continue;
    const mesh=makeArrow(0xff4a4a); mesh.rotation.y=Math.atan2(vx,vz);
    EBOLTS.push({mesh,x:x+vx*age,z:z+vz*age,vx,vz,life,dmg:+a[5],door:false,src:{x,z,mob:null}});
    if (Math.hypot(x-P.x,z-P.z)<22) SFX.zap(); if (PARTY.boltSeen.size>400) PARTY.boltSeen=new Set([...PARTY.boltSeen].slice(-200)); }
  // 부드럽게 따라가기
  for (const m of mobs){
    if (m.dying>=0){ m.dying=Math.max(0,m.dying-dt); if (m.onDying) m.onDying(); continue; }
    // 소식이 늦게 와도 멈추지 않게, 마지막 속도로 0.4초까지 앞질러 움직여요
    const age=m.netAt?Math.min(.4,(now-m.netAt)/1000):0, px=(m.nx??m.tx)+(m.vx||0)*age, pz=(m.nz??m.tz)+(m.vz||0)*age;
    const k=Math.min(1,dt*12), ox=m.x, oz=m.z; m.x+=(px-m.x)*k; m.z+=(pz-m.z)*k;
    let dr=m.tr-m.g.rotation.y; dr=Math.atan2(Math.sin(dr),Math.cos(dr)); m.g.rotation.y+=dr*k;
    if (m.ranged){ if (m.aimT>0){ m.aimT-=dt; if (m.aimT<=0 && m.anim) m.anim.once('shoot',1.3,true); } drawAim(m); }
    if (m.leaper){ if (m.ls>0){ m.lT=Math.max(0,m.lT-dt); if (m.ls===2){ const kk=1-m.lT/LEAP.fly; m.ay=Math.sin(Math.min(1,kk)*Math.PI)*2.2; } leapDraw(m,m.ls,m.lT); } else if (m.leapRing) m.leapRing.visible=false; }
    m.moving=Math.hypot(m.x-ox,m.z-oz)/Math.max(dt,1e-3)>.3; m.atDoor=!m.moving;
    m.flash=Math.max(0,m.flash-dt); m.mat.emissive.setHex(m.flash>0?0xffffff:(m.boss&&m.slamT>0?0x661111:0x000000));
  }
  mobs=mobs.filter(m=>{ if (m.dying===0){ removeMob(m); return false; } return true; });
  if (g.end && !PARTY.ended) partyEnd(g.end.win,g.end.reason,g.end.bonus);
}
/* 친구 화면에서 맞힘: 효과만 보여 주고 방장에게 알려요 */
function partyClientHit(m,dmg,sx,sz,kbk,col,byPlayer,o){
  if (m.shield>0){ if (byPlayer){ flashPrompt(partyQuiz()?'보호막! 거점 퀴즈를 맞혀야 깰 수 있어요':'보호막!',1.5); SFX.block(); } fx.burst(m.x,2.4,m.z,0x5cc8f0,8,4); fx.num(m.x,5,m.z,'막힘','#9fe3ff'); return false; }
  const dx=m.x-sx, dz=m.z-sz, d=Math.hypot(dx,dz)||1, hy=m.boss?2.4:1.1;
  if (W.stats) W.stats.dealt+=Math.max(0,Math.min(dmg,m.hp));
  m.flash=o.crit?.2:.15;
  if (!o.quiet){ fx.burst(m.x,hy,m.z,0xfff1a8,o.crit?12:7,o.crit?6:4); fx.burst(m.x,hy,m.z,0xffffff,o.crit?8:4,8); impactFx(m.x-dx/d*.35,hy,m.z-dz/d*.35,o.crit?0xffd34d:0xfff2d6,o.crit?3.4:(o.fin?2.8:2)); }
  fx.num(m.x,m.boss?5.2:2.5,m.z,o.crit?Math.round(dmg)+'!':String(Math.round(dmg)),o.crit?'#ffcf3a':col,o.crit?1.4:1);
  if (m.anim && !o.noStun && !m.boss) m.anim.once('hit',1.5,true);
  m.hp=Math.max(1,m.hp-dmg);
  partySend({k:'h',id:m.id,d:Math.round(dmg*10)/10,x:Math.round(sx*10)/10,z:Math.round(sz*10)/10,kb:kbk,st:o.stun||0,cr:o.crit?1:0,ln:o.launch?1:0,ns:o.noStun?1:0});
  return true;
}

/* ---------- 모두: 매 프레임 ---------- */
function partyTick(dt){
  if (!PARTY.on) return;
  if (PARTY.host) hostTick(dt); else clientTick(dt);
  if (PARTY.ended) return;
  // 쓰러짐 · 다시 일어나기
  if (!P.down && P.hp<=0){ P.down=true; P.hp=0; P.downT=cqRespawn(); P.dx=P.x; P.dz=P.z; if (knight) knight.anim.die(); flashPrompt(`쓰러졌어요! ${cqRespawn()}초 뒤 캠프에서 다시 일어나요`,3); }
  if (P.down){ P.x=P.dx; P.z=P.dz; P.downT-=dt;
    if (P.downT<=0){ P.down=false; P.hp=P.max; const k=PARTY.order.indexOf(PARTY.me); P.x=CQ.camp.x+(k-2)*1.4; P.z=CQ.camp.z-1; W.invuln=W.t+2.5; if (knight) knight.anim.revive(); W.snapCam=true; flashPrompt('다시 일어났어요! 거점으로 달려가요',2); } }
  else {
    // 점령한 거점 안에서는 체력이 차요
    CQ.pts.forEach((p,i)=>{ if (PH.pts[i].own===1 && Math.hypot(P.x-p.x,P.z-p.z)<CQ.r) P.hp=Math.min(P.max,P.hp+cqRegen()*dt); });
    // 내 차례 퀴즈
    if (partyQuiz() && $('#quiz').hidden && !W.loc){ PH.pts.forEach((S,i)=>{ const key=i+':'+S.qn;
      if (S.qb===PARTY.me && PARTY.lastQ!==key){ PARTY.lastQ=key; const useOX=OX.length&&Math.random()<.35, item=pick(useOX?['ox']:['mc'],useOX?OX:MC);
        if (!item) partySend({k:'q',p:i,ok:true}); else openQuiz(item,{type:'cap',point:i}); } }); }
  }
  // 몹 막기 방: 처치 5번마다 필살기 1칸
  if (!partyQuiz()){ while (W.kills-PARTY.kc>=5){ PARTY.kc+=5; const b=W.ult||0; W.ult=Math.min(ULT_NEED,b+1); if (W.ult>=ULT_NEED&&b<ULT_NEED) flashPrompt(`필살기 ${ultLabel()} 준비 완료! Q를 누르세요`,2.5); } }
  // 내 상태 보내기 (1초에 10번)
  PARTY.sendT-=dt; if (PARTY.sendT<=0){ PARTY.sendT=.125;
    const st={x:Math.round(P.x*10),z:Math.round(P.z*10),f:Math.round(Math.atan2(P.fx,P.fz)*20)*5,hp:Math.max(0,Math.round(P.hp)),mx:P.max,dn:P.down?1:0,q:W.paused?1:0,b:P.blockT>0?1:0,a:PARTY.act};
    const key=JSON.stringify(st), now=performance.now();
    if (key!==PARTY.lastP || now-PARTY.lastPT>1000){ PARTY.lastP=key; PARTY.lastPT=now; st.t=Math.round(now/10)%60000; pRef(livePath()+'/p/'+PARTY.me).set(encP(st)).catch(()=>{}); } }
  PARTY.flushT-=dt; if (PARTY.flushT<=0){ PARTY.flushT=.1; partyFlush(); }
  remoteTick(dt);
}
/* 퀴즈 결과 알리기 (07-quiz settle에서 불러요) */
function partyQuizDone(i,ok){ partySend({k:'q',p:i,ok:!!ok}); }

/* ---------- 거점 · 파티 화면 표시 ---------- */
function partyLook(real,dt){
  if (MAPK!=='conquest') return;
  CQ_PORTALS.forEach((d,i)=>{ d.material.opacity=.45+Math.sin(real*2.4+i)*.15; d.rotation.z=real*.6; });
  CQ.pts.forEach((p,i)=>{ const V=CQV[i]; if (!V) return; const S=PH.pts[i]||{g:0,own:0,qb:''};
    const f=Math.abs(S.g)/100, col=S.own===1||(S.own===0&&S.g>0)?0x4f86ff:S.own===2||S.g<0?0xe0434a:0x8a93a5;
    V.ringMat.uniforms.uFill.value=S.own===1||S.own===2?1:f; V.ringMat.uniforms.uCol.value.setHex(col); V.ringMat.uniforms.uGlow.value=Math.sin(real*4)*.5+.5;
    V.fb.visible=S.own===1; V.fr.visible=S.own===2; V.fn.visible=S.own===0;
    const ready=partyQuiz()&&S.g>=100&&S.own!==1;
    V.gem.rotation.y=real*1.5; V.gem.position.y=1.6+Math.sin(real*2+i)*.12;
    V.gemMat.color.setHex(ready?0xffd34d:S.own===1?0x4f86ff:S.own===2?0xe0434a:0x8a93a5); V.gemMat.emissive.setHex(ready?0xffb300:S.own===1?0x2a5ad9:S.own===2?0x8a1a1a:0x000000);
    V.beam.material.opacity=ready?.22+Math.sin(real*5)*.08:0;
    const lk=S.own+'|'+(ready?1:0); if (lk!==V.labKey){ V.labKey=lk; V.lab.set(`${p.k} · ${p.name}`,S.own===1?'파티가 지키는 중':S.own===2?'해골이 차지했어요':ready?'퀴즈를 맞히면 점령!':'원 안에 서서 점령하세요'); }
  });
}
let phKey='';
function partyHUD(){
  if (!PARTY.on) return;
  const k=PH.pts.map(S=>Math.round(S.g)+':'+S.own+':'+(S.qb?1:0)).join('|')+'|'+PH.wave+'|'+Math.ceil(PH.next-W.t)+'|'+Math.round(PH.loseT);
  if (k!==phKey){ phKey=k;
    $('#cqPts').innerHTML=CQ.pts.map((p,i)=>{ const S=PH.pts[i], f=S.own===1||S.own===2?100:Math.abs(Math.round(S.g)), cls=S.own===1?'own':S.own===2?'mob':S.g>0?'up':S.g<0?'down':'';
      return `<div class="cq-pt ${cls}"><b>${p.k}</b><i style="--f:${f}%"></i><small>${S.own===1?'점령':S.own===2?'빼앗김':S.qb?'퀴즈 중':f+'%'}</small></div>`; }).join('');
    const nx=PH.next>W.t?Math.ceil(PH.next-W.t):0;
    $('#cqInfo').innerHTML=`${partyQuiz()?'🧠 퀴즈 점령':'⚔️ 몹 막기'} · 웨이브 ${Math.max(1,PH.wave+1)}/${WAVES.length}`+(nx?` · 다음 웨이브 ${nx}초`:'')+(PH.loseT>0?` · <span class="warn">모두 빼앗김! ${Math.max(0,CQ.loseHold-Math.round(PH.loseT))}초 안에 되찾으세요</span>`:'');
  }
  const rows=[{u:PARTY.me,name:myName(),job:JOB,hp:P.hp,mx:P.max,dn:P.down,me:true}].concat(Object.values(PARTY.rp).map(R=>({u:R.u,name:R.m.name,job:R.job,hp:R.st?R.st.hp:0,mx:R.st?R.st.mx:1,dn:R.st&&R.st.dn})));
  const lk=rows.map(r=>r.name+Math.round(r.hp)+(r.dn?1:0)).join('|'); if (lk===PARTY.plKey) return; PARTY.plKey=lk;
  $('#partyList').innerHTML=rows.map(r=>`<div class="pl${r.me?' me':''}${r.dn?' dn':''}"><span>${JOBI[r.job]||''} ${esc(r.name)}${r.dn?' · 쓰러짐':''}</span><i><b style="width:${Math.max(0,Math.min(100,r.hp/Math.max(1,r.mx)*100))}%"></b></i></div>`).join('');
}

/* ---------- 끝 ---------- */
function partyEnd(win,reason,bonus){
  if (PARTY.ended) return; PARTY.ended=true; PARTY.bonus=bonus|0;
  if (!$('#quiz').hidden){ $('#quiz').hidden=true; }
  W.paused=false; P.down=false; if (knight && knight.anim.dead) knight.anim.revive();
  endGame(!!win);
  const T={quit:['중간에 나왔어요','파티에서 먼저 나왔어요. 지금까지 푼 문제는 기록됐어요.'],clear:['점령전 승리!','파티원과 힘을 합쳐 해골 군단을 막아 냈어요.'],pts:['거점을 모두 빼앗겼어요','세 거점을 10초 동안 모두 빼앗겼어요. 다음엔 한 거점씩 함께 지켜 보세요.'],down:['파티가 모두 쓰러졌어요','한꺼번에 쓰러지지 않게 서로 거리를 두고 싸워 보세요.'],host:['방장이 나갔어요','방장의 연결이 끊겨서 게임이 끝났어요. 지금까지 한 만큼 기록은 남아요.']}[reason]||['게임 끝',''];
  $('#endTitle').textContent=T[0]; $('#endMsg').textContent=T[1]+(PARTY.bonus?` 거점을 지킨 보너스 +${PARTY.bonus}점.`:'')+' 아래 틀린 문제를 한 번 더 읽어 보고 마무리해요.';
  $('#againBtn').hidden=true; $('#partyHud').hidden=true; $('#partyList').hidden=true;
  partyOff();
}
function partyCleanup(){
  const wasOn=PARTY.on;
  partyOff(); removeRemotes(); RPROJ.forEach(p=>scene.remove(p.mesh)); RPROJ.length=0;
  if (PARTY.rid){ const host=PARTY.host, ip=idxPath(), lp=livePath();
    if (host) { pRef(ip).remove().catch(()=>{}); pRef(lp).remove().catch(()=>{}); } else pRef(ip+'/m/'+PARTY.me).remove().catch(()=>{});
    try{ pRef(ip).onDisconnect().cancel(); pRef(lp).onDisconnect().cancel(); }catch(e){} }
  if (PARTY.roomRef){ PARTY.roomRef.off('value',PARTY.roomCb); PARTY.roomRef=null; }
  Object.assign(PARTY,{on:false,host:false,rid:'',room:null,ended:false,snap:null,bonus:0});
  for (const j in PCH) PCH[j].anim.onAct=null;
  document.body.classList.remove('party'); $('#partyHud').hidden=true; $('#partyList').hidden=true; $('#againBtn').hidden=false;
  if (wasOn && MAPK==='conquest'){ try{ applyPlay(); }catch(e){} }
}
$('#homeBtn').addEventListener('click',()=>{ if (PARTY.on||PARTY.rid) partyCleanup(); });
addEventListener('beforeunload',()=>{ if (PARTY.rid) partyCleanup(); });

/* ---------- 버튼 ---------- */
$('#partyBtn').addEventListener('click',openPartyPanel);
$('#ppClose').addEventListener('click',closePartyPanel);
$('#ppCreate').addEventListener('click',createRoom);
$('#ppRooms').addEventListener('click',e=>{ const b=e.target.closest('[data-join]'); if (b) joinRoom(b.dataset.join); });
document.querySelectorAll('[data-pmode]').forEach(b=>b.addEventListener('click',()=>{ if (modeLocked(b.dataset.pmode)){ ppNote(lockWhy(b.dataset.pmode),'err'); return; } PP.mode=b.dataset.pmode; renderModes(); }));
$('#ppLeave').addEventListener('click',async()=>{ await leaveRoom(); });
$('#ppStart').addEventListener('click',hostStart);
setInterval(()=>{ if (PP.open && !PARTY.rid) renderRooms(); if (PARTY.room && !PARTY.on) renderRoom(PARTY.room); },3000);
applyPartyLock();
