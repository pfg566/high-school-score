/* 사회 게임 RPG · 게임 상태 · 몬스터 · 입력 · 걷기 동작 · 효과음 · 칼 궤적 · 콤보
   파일은 01 → 13 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요. */
/* ---------- 상태 ---------- */
const P={x:0,z:4,hp:100,max:100,fx:0,fz:-1,atkCd:0,swingT:0,combo:0,lastAtk:-9,buffer:false,pendingHit:null,lunge:0,dodgeT:0,dodgeCd:0,ddx:0,ddz:0,spinT:0,spinCd:0,spinHits:[]};
const W={t:0,paused:true,state:'title',wave:-1,nextWaveAt:-1,gate:false,nextQuiz:TIMED_EVERY,timedFlip:0,kills:0,correct:0,asked:0,effects:[],used:new Set(),wrong:[],loc:null};
let mobs=[];

function atkMult(){ return W.effects.filter(e=>e.k==='atk').reduce((a,e)=>a*e.mult,1)*(W.up?W.up.atk:1); }
function spdMult(){ return W.effects.filter(e=>e.k==='spd').reduce((a,e)=>a*e.mult,1)*(W.up?W.up.spd:1); }

function resolve(p,r){
  for (const b of colliders){
    const cx=Math.min(Math.max(p.x,b.x0),b.x1), cz=Math.min(Math.max(p.z,b.z0),b.z1);
    const dx=p.x-cx, dz=p.z-cz, d2=dx*dx+dz*dz;
    if (d2<r*r){
      if (d2>1e-6){ const d=Math.sqrt(d2); p.x=cx+dx/d*r; p.z=cz+dz/d*r; }
      else { const l=p.x-b.x0, rr=b.x1-p.x, t=p.z-b.z0, bt=b.z1-p.z, m=Math.min(l,rr,t,bt);
        if (m===l) p.x=b.x0-r; else if (m===rr) p.x=b.x1+r; else if (m===t) p.z=b.z0-r; else p.z=b.z1+r; }
    }
  }
  p.x=Math.max(-34,Math.min(34,p.x)); p.z=Math.max(-34,Math.min(34,p.z));
  if (MAPK==='island'){ const d=Math.hypot(p.x,p.z); if (d>ISL_R){ p.x*=ISL_R/d; p.z*=ISL_R/d; } }
  if (MAPK==='glacier'){ const d=Math.hypot(p.x,p.z); if (d>GL_R){ p.x*=GL_R/d; p.z*=GL_R/d; } }
}

/* ---------- 몬스터 ---------- */
function makeBar(w){
  const g=new THREE.Group();
  const bg=new THREE.Mesh(new THREE.PlaneGeometry(w+.1,0.24), new THREE.MeshBasicMaterial({color:0x18213a,toneMapped:false}));
  const fg=new THREE.Mesh(new THREE.PlaneGeometry(w,0.14), new THREE.MeshBasicMaterial({color:0xe0434a,toneMapped:false}));
  fg.position.z=.01; g.add(bg,fg); scene.add(g); return {g,fg,w};
}
const MOB_MODEL={0xe0434a:'sk_minion',0x8b5cf6:'sk_rogue'};
const SK_MAP={idle:'Idle_Combat',run:'Running_C',attack:'1H_Melee_Attack_Chop',hit:'Hit_A',death:'Death_A',spawn:'Spawn_Ground_Skeletons'};
const BOSS_MAP={idle:'Idle_Combat',run:'Walking_A',slam:'2H_Melee_Attack_Chop',attack:'2H_Melee_Attack_Chop',hit:'Hit_B',death:'Death_A',taunt:'Taunt',summon:'Spellcast_Summon',spawn:'Spawn_Ground_Skeletons'};
function arm(c,key,scale){ const hand=c.root.getObjectByName('handslotr')||c.root.getObjectByName('handslot.r'); if (!hand||!GL[key]) return;
  const w=GL[key].scene.clone(true); w.traverse(o=>{ if (o.isMesh){ o.castShadow=true; o.material=toToon(o.material,.4,0xfff2dc); c.mats.push(o.material); } }); if (scale) w.scale.setScalar(scale); hand.add(w); }
function spawnMob(def,isBoss,at){
  const color=isBoss?def.boss.color:def.color;
  const c=makeChar(isBoss?'sk_warrior':def.ranged?'sk_rogue':(MOB_MODEL[color]||'sk_minion'),isBoss?2.05:1,isBoss?BOSS_MAP:def.ranged?SKR_MAP:SK_MAP);
  if (def.ranged) armXbow(c); else if (!PEACE_RUN) arm(c,isBoss?'axe':'blade');
  if (!isBoss && def.ranged) c.mats.forEach(m=>{ if (m.color) m.color.multiply(new THREE.Color(0xb8f0c0)); });
  if (!isBoss && color===0x8b5cf6 && !def.runner && !def.ranged) c.mats.forEach(m=>{ if (m.color) m.color.multiply(new THREE.Color(0xd9c8ff)); });
  if (!isBoss && def.leaper){ c.mats.forEach(m=>{ if (m.color) m.color.multiply(new THREE.Color(0xffe27a)); }); c.root.scale.setScalar(.92); }
  if (!isBoss && def.runner){ c.mats.forEach(m=>{ if (m.color) m.color.multiply(new THREE.Color(0xffa060)); }); c.root.scale.setScalar(.88); }
  glTintMob(c);
  const g=new THREE.Group(); g.add(c.root);
  let shieldMesh=null, slamMesh=null, eyeLight=null;
  if (isBoss){
    slamMesh=new THREE.Mesh(new THREE.CircleGeometry(def.boss.slamR,48),new THREE.MeshBasicMaterial({color:0xe0434a,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
    slamMesh.rotation.x=-Math.PI/2; slamMesh.position.y=.07; slamMesh.visible=false; scene.add(slamMesh);
    shieldMesh=new THREE.Mesh(new THREE.SphereGeometry(3.1,40,24),new THREE.MeshStandardMaterial({color:0x7fd6ff,emissive:0x2a9fe0,emissiveIntensity:.9,transparent:true,opacity:.28,roughness:.1,metalness:.2,depthWrite:false}));
    shieldMesh.position.y=2.3; g.add(shieldMesh);
    eyeLight=new THREE.PointLight(0x7fd6ff,1.4,10,2); eyeLight.position.y=4.2; g.add(eyeLight);
  }
  let x,z,tries=0;
  if (MAPK==='glacier' && !at){
    do { const a=Math.random()*Math.PI*2, r=rnd(21,25.5); x=Math.cos(a)*r; z=Math.sin(a)*r; tries++; } while ((colliders.some(b=>x>b.x0-2&&x<b.x1+2&&z>b.z0-2&&z<b.z1+2)||Math.hypot(x-P.x,z-P.z)<9) && tries<40);
  } else if (MAPK==='defense' && !at){
    do { x=rnd(-26,26); z=rnd(21,32); tries++; } while (colliders.some(b=>x>b.x0-2&&x<b.x1+2&&z>b.z0-2&&z<b.z1+2) && tries<40);
  } else do { const a=Math.random()*Math.PI*2, r=at?3+Math.random()*2:14+Math.random()*16, cx=at?at.x:P.x, cz=at?at.z:P.z; x=cx+Math.cos(a)*r; z=cz+Math.sin(a)*r; tries++; }
  while ((Math.abs(x)>32||Math.abs(z)>32||(MAPK==='island'&&Math.hypot(x,z)>ISL_R-1.5)||colliders.some(b=>x>b.x0-2&&x<b.x1+2&&z>b.z0-2&&z<b.z1+2)) && tries<60);
  x=Math.max(-32,Math.min(32,x)); z=Math.max(-32,Math.min(32,z));
  if (MAPK==='island'){ const dd=Math.hypot(x,z); if (dd>ISL_R-1.5){ x*=(ISL_R-1.5)/dd; z*=(ISL_R-1.5)/dd; } }
  if (MAPK==='glacier'){ const dd=Math.hypot(x,z); if (dd>GL_R-1){ x*=(GL_R-1)/dd; z*=(GL_R-1)/dd; } }
  g.position.set(x,0,z); g.rotation.y=Math.atan2(P.x-x,P.z-z); scene.add(g);
  fx.burst(x,.4,z,isBoss?0x8a8f99:0xc9c2b0,isBoss?30:12,isBoss?6:3);
  const K=MODE==='hero'?{hp:HERO.hp,dmg:HERO.dmg,spd:HERO.spd}:(()=>{ const L=LEVELS[LEVEL].k||{hp:1,dmg:1,spd:1}; return {hp:DIFF*EASEF.hp*L.hp,dmg:DIFF*EASEF.dmg*L.dmg,spd:(.9+.1*DIFF)*EASEF.spd*L.spd}; })();
  if (PARTY.on){ const PK=partyK(); K.hp*=PK.hp; K.dmg*=PK.dmg; K.spd*=PK.spd; }   // 파티 판: 영웅 모드보다 더 세요
  const hp=Math.round((isBoss?def.boss.hp:def.hp)*K.hp*MOB_HP);
  const mats=c.mats; let em=-1;
  const m={g,body:c.root,parts:{},color,boss:isBoss,r:isBoss?1.6:.8,x,z,hp,max:hp,spd:(isBoss?def.boss.spd:def.spd)*K.spd,dmg:Math.round((isBoss?def.boss.dmg:def.dmg)*K.dmg),
    mat:{emissive:{setHex(h){ if (h===em) return; em=h; mats.forEach(mt=>{ if (mt.emissive) mt.emissive.setHex(h); }); }}},
    anim:c.anim, mixer:c.mixer, sink:0, spawnT:1.6,
    shield:isBoss?def.boss.shield:0,shieldMax:isBoss?def.boss.shield:0,shieldMesh,slamMesh,eyeLight,def,recover:0,hop:0,
    slamCd:isBoss?4:0,slamT:0,slamX:0,slamZ:0,summonCd:isBoss?def.boss.summonEvery:0,
    atkCd:0,flash:0,kbx:0,kbz:0,phase:Math.random()*6,bar:makeBar(isBoss?2.6:1.2),barY:isBoss?5.4:2.75,shadow:blob(),dying:-1};
  m.runner=!isBoss&&!!def.runner; m.leaper=!isBoss&&!!def.leaper; if (m.leaper){ m.leapCd=1.5; m.leapS=0; }
  if (!isBoss && def.ranged){ m.ranged=true; m.aimLine=makeAimLine(); }
  m.onDying=()=>{ m.sink=Math.max(0,.7-m.dying)*1.6; };
  if (PEACE_RUN){ c.mats.forEach(mt=>{ if (mt.color) mt.color.lerp(new THREE.Color(0xa9d4ff),.82); mt.transparent=true; mt.opacity=.72; }); m.onDying=()=>{ m.sink=-(1.6-m.dying)*1.8; const o=Math.max(0,m.dying/1.6)*.72; mats.forEach(mt=>{ mt.opacity=o; }); }; }
  c.anim.once('spawn',2.2,true);
  if (isBoss){ m.spawnT=1.8; setTimeout(()=>{ if (m.dying<0) m.anim.once('taunt',1,true); },1700); }
  mobs.push(m);
  return m;
}
let lastSlam=new WeakMap(), lastSummonCd=new WeakMap();
function animMob(m,real,dt){
  if (m.dying>=0) return;
  if (m.boss){
    if (m.slamT>0 && !lastSlam.get(m)){ m.anim.once('slam',.8,true); }
    lastSlam.set(m,m.slamT>0);
    const prev=lastSummonCd.get(m); if (prev!==undefined && m.summonCd>prev+1) m.anim.once('summon',2.4,true); lastSummonCd.set(m,m.summonCd);
    m.anim.setBase(m.atDoor?'idle':'run',Math.max(.6,m.spd*(W.loc?.5:1)/RUN_SPEED.boss));
  } else m.anim.setBase(m.atDoor||m.stun>0||(m.ranged&&!m.moving)?'idle':'run',Math.max(.6,m.spd*(W.loc?.5:1)/RUN_SPEED.minion));
}
function removeMob(m){ if (m.leapRing) scene.remove(m.leapRing); if (m.aimLine) scene.remove(m.aimLine); scene.remove(m.g); scene.remove(m.bar.g); if (m.slamMesh) scene.remove(m.slamMesh); if (m.mixer) m.mixer.stopAllAction(); }
function liveBoss(){ return mobs.find(m=>m.boss&&m.dying<0); }

function startWave(i){
  if (W.stats) W.stats.ws[i]=Math.round(W.t);
  W.wave=i; W.nextWaveAt=-1; W.gate=false;
  const d=WAVES[i];
  for (let k=0;k<d.n;k++) spawnMob(d,false);
  if (d.groups){ const lanes=[-20,0,20]; d.groups.forEach((g,gi)=>W.spawnQ.push({at:W.t+g.at,n:g.n,runner:!!g.runner,lane:lanes[Math.floor(Math.random()*3)],def:d,first:gi===0})); }
  if (d.boss && typeof FUN!=='undefined' && FUN.am && !FUN.am.done){ amClear(true); W.nextQuiz=W.t+25; flashPrompt('보스가 나타나 정답 몬스터가 물러났어요',2); }
  if (d.boss){ spawnMob(d,true); if (NEWQ()) bgBossSpawned(liveBoss()); else stations.forEach(s=>s.readyAt=Math.min(s.readyAt,W.t)); }
  if (W.up && W.up.turret && MAPK==='defense'){ TURRETS.forEach(t=>{ t.until=W.t+W.up.turret; t.cd=.3; }); W.up.turret=0; setTimeout(()=>flashPrompt('강화 카드: 포탑 3개가 자동으로 쏴요!',2.5),1200); }
  const nr=rangedCount(i); for (let k=0;k<nr;k++) spawnRanged(d);
  const nl=leapCount(i); for (let k=0;k<nl;k++) spawnMob({...d,leaper:true,hp:Math.round(d.hp*.8)},false);
  if (nl && !W.leapSeen){ W.leapSeen=true; setTimeout(()=>flashPrompt('노란 도약 해골은 가까이 오면 뛰어들어요! 빨간 원이 보이면 구르기로 피하세요',3.5),nr?5200:1800); }
  if (MAPK==='island') islWaveStart(d);
  showBanner(`웨이브 ${i+1} · ${d.name}`); SFX.wave();
  if (nr && !W.rangedSeen){ W.rangedSeen=true; setTimeout(()=>flashPrompt('석궁 든 해골은 멀리서 쏴요! 빨간 조준선이 보이면 옆으로 피하세요',3.5),1800); }
}

/* 도약 해골: 6칸 안에 들어오면 0.55초 동안 웅크린 뒤(빨간 원) 그 자리로 훌쩍 뛰어들어요 */
const LEAP={range:6.5,warn:.55,fly:.45,cd:4,r:1.7};
function leapCount(i){ if (PEACE_RUN || i<1) return 0; let n=i>=2?2:1; const e=easeIdx(); if (e<0) n++; else if (e===2) n=Math.max(0,n-1); return n; }
const leapRingGeo=new THREE.RingGeometry(LEAP.r-.25,LEAP.r,40);
function leapAI(m,dt){
  m.leapCd-=dt;
  if (m.leapS===0){
    const pd=Math.hypot(P.x-m.x,P.z-m.z);
    if (m.leapCd>0 || pd>LEAP.range || (MAPK==='defense' && pd>7)) return false;
    m.leapS=1; m.leapT=LEAP.warn; m.lx=m.x; m.lz=m.z; m.tx=P.x; m.tz=P.z;
    if (!m.leapRing){ m.leapRing=new THREE.Mesh(leapRingGeo,new THREE.MeshBasicMaterial({color:0xe0434a,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false,toneMapped:false})); m.leapRing.rotation.x=-Math.PI/2; scene.add(m.leapRing); }
    m.leapRing.position.set(m.tx,.07,m.tz); m.leapRing.visible=true; if (m.anim) m.anim.once('hit',1,true);
  }
  m.g.rotation.y=Math.atan2(m.tx-m.x,m.tz-m.z);
  if (m.leapS===1){ m.leapT-=dt; m.leapRing.material.opacity=.45+.4*Math.abs(Math.sin(W.t*18)); m.leapRing.scale.setScalar(1+(1-m.leapT/LEAP.warn)*.15);
    if (m.leapT<=0){ m.leapS=2; m.leapT=LEAP.fly; if (m.anim) m.anim.once('attack',1.2,true); } return true; }
  if (m.leapS===2){ m.leapT-=dt; const k=1-Math.max(0,m.leapT)/LEAP.fly;
    m.x=m.lx+(m.tx-m.lx)*k; m.z=m.lz+(m.tz-m.lz)*k; m.ay=Math.sin(k*Math.PI)*2.2;
    if (m.leapT<=0){ m.ay=0; m.leapS=0; m.leapCd=LEAP.cd; m.leapRing.visible=false; resolve(m,m.r);
      fx.shock(m.x,m.z,LEAP.r+.3); fx.burst(m.x,.3,m.z,0xc9b48a,14,4); shake=Math.max(shake,.15);
      if (Math.hypot(P.x-m.x,P.z-m.z)<LEAP.r && W.t>W.invuln) hurtPlayer(Math.round(m.dmg*1.4),{x:m.x,z:m.z,mob:m}); }
    return true; }
  return false;
}

/* ---------- 입력 ---------- */
const keys={};
let UI_LOCK=0; const QUIZ_LOCK_MS=800;
function blurAll(){ const a=document.activeElement; if (a&&a!==document.body&&a.blur) a.blur(); }
addEventListener('keydown',e=>{
  if (e.target.closest && e.target.closest('input,textarea,select')) return;
  // 퀴즈·안내 창이 떠 있을 때 스페이스바(공격 키)는 무시해요. 공격하다가 실수로 답이 눌리지 않게요.
  const overlay=!$('#locIntro').hidden||!$('#reviveIntro').hidden||!$('#quiz').hidden;
  if (overlay){ if (e.code==='Space'||e.code==='KeyJ'||e.code==='KeyE'||e.code==='KeyL'||e.code==='KeyQ'||e.key==='Shift'){ e.preventDefault(); return; } for (const k in keys) keys[k]=false; }
  const nowMs=performance.now();
  if (!$('#locIntro').hidden){ if (e.key==='Enter' && nowMs>=UI_LOCK){ e.preventDefault(); goLoc(); } return; }
  if (!$('#reviveIntro').hidden){ if (e.key==='Enter' && nowMs>=UI_LOCK){ e.preventDefault(); reviveStart(); } return; }
  if (!$('#quiz').hidden){
    if (Q.answered){ if (e.key==='Enter' && nowMs>=Q.closeAt){ e.preventDefault(); closeQuiz(); } }
    else if (nowMs<Q.lockUntil) {}
    else if (/^[1-4]$/.test(e.key) && +e.key<=Q.nOpts) answer(+e.key-1);
    else if (Q.item && Q.item.kind==='ox' && /^[oOxX]$/.test(e.key)) answer(/[oO]/.test(e.key)?0:1);
    return;
  }
  keys[e.code]=true;
  if (/^Arrow/.test(e.code) && W.state==='play') e.preventDefault();
  if (e.code==='Space'||e.code==='KeyJ'){ e.preventDefault(); attack(); }
  else if (e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='KeyK'){ e.preventDefault(); dodge(); }
  else if (e.code==='KeyE'||e.code==='KeyL'){ e.preventDefault(); spinSkill(); }
  else if (e.code==='KeyQ'||e.code==='KeyU'){ e.preventDefault(); ultimate(); }
});
addEventListener('keyup',e=>{ keys[e.code]=false; });
addEventListener('blur',()=>{ for (const k in keys) keys[k]=false; });

const joy={x:0,y:0,id:null};
const joyEl=$('#joy'), knob=$('#knob');
joyEl.addEventListener('pointerdown',e=>{ joy.id=e.pointerId; joyEl.setPointerCapture(e.pointerId); moveJoy(e); });
joyEl.addEventListener('pointermove',e=>{ if (e.pointerId===joy.id) moveJoy(e); });
const endJoy=e=>{ if (e.pointerId!==joy.id) return; joy.id=null; joy.x=joy.y=0; knob.style.transform=''; };
joyEl.addEventListener('pointerup',endJoy); joyEl.addEventListener('pointercancel',endJoy);
function moveJoy(e){
  const r=joyEl.getBoundingClientRect(); let dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2);
  const L=Math.hypot(dx,dy), max=42; if (L>max){ dx=dx/L*max; dy=dy/L*max; }
  joy.x=dx/max; joy.y=dy/max; knob.style.transform=`translate(${dx}px,${dy}px)`;
}
$('#atkBtn').addEventListener('pointerdown',e=>{ e.preventDefault(); attack(); });

let promptUntil=0, promptMsg='';
function flashPrompt(msg,sec){ promptMsg=msg; promptUntil=W.t+sec; }


/* ---------- 걷기·공격 동작 다듬기: 발 미끄러짐 없애기, 움직이며 베면 하체는 달리고 상체만 베기 ---------- */
const RUN_SPEED={knight:3.43, minion:2.42, boss:.72*2.05};   // 각 달리기 동작이 원래 내는 속도(발이 땅에 닿아 있는 동안)
const UPPER_BONES=new Set(['spine','chest','upperarml','lowerarml','wristl','handl','handslotl','upperarmr','lowerarmr','wristr','handr','handslotr','head','elbowIKl','handIKl','elbowIKr','handIKr']);
const ATK_KEYS=['slashH','slashD','chop','shoot','cast'];
function partClip(clip,upper,name){ return new THREE.AnimationClip(name,clip.duration,clip.tracks.filter(t=>UPPER_BONES.has(t.name.split('.')[0])===upper)); }
function setupKnightLayers(k){
  const clips=GL.pclips.animations, A=k.anim, by=n=>clips.find(c=>c.name===n), M=P2[k.job||'knight'].map;
  if (by(M.run)) A.actions.runLow=k.mixer.clipAction(partClip(by(M.run),false,'runLow'));
  if (by(M.idle)) A.actions.idleLow=k.mixer.clipAction(partClip(by(M.idle),false,'idleLow'));
  const src={}; ATK_KEYS.forEach(key=>{ if (M[key]) src[key]=M[key]; });
  k.upper={acts:{},cur:null,left:0};
  for (const key in src){ const c0=by(src[key]); if (!c0) continue; const c=partClip(c0,true,'up_'+key); k.upper.acts[key]=k.mixer.clipAction(c); k.upper.acts[key].dur=c.duration; }
  k.runScale=1;
}
function playUpper(key,speed,from){
  const U=knight.upper, a=U.acts[key]; if (!a) return;
  if (U.cur && U.cur!==a) U.cur.fadeOut(.06);
  a.reset(); a.setLoop(THREE.LoopOnce,1); a.clampWhenFinished=true; a.timeScale=speed; a.setEffectiveWeight(1); a.fadeIn(from?.1:.05); a.play();
  if (from) a.time=from;
  U.cur=a; U.left=(a.dur-(from||0))/speed;
  if (!from && knight.anim.onAct) knight.anim.onAct(key,speed);
}
function knightAttackAnim(key,speed){
  if (!knight) return;
  if (inputDir() && knight.upper.acts[key]) playUpper(key,speed); else knight.anim.once(key,speed,true);
}
function setBaseSynced(A,key,scale){
  if (A.baseKey===key){ A.setBase(key,scale); return; }
  const t=A.cur&&A.baseKey?A.cur.time:0; A.setBase(key,scale);
  if (A.baseKey===key && A.cur && t) A.cur.time=t%(A.cur.getClip().duration||1);
}

/* ---------- 타격감: 효과음 (파일 없이 브라우저에서 바로 만들어요) ---------- */
const SFX=(()=>{
  let ctx=null, master=null, muted=false, nb=null; const last={};
  try{ muted=localStorage.getItem('gsd-mute')==='1'; }catch(e){}
  function init(){
    if (ctx){ if (ctx.state==='suspended') ctx.resume().catch(()=>{}); return; }
    try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); master=ctx.createGain(); master.gain.value=muted?0:.5; master.connect(ctx.destination); }catch(e){ ctx=null; }
  }
  function noiseBuf(){ if (!nb){ nb=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.8),ctx.sampleRate); const d=nb.getChannelData(0); for (let i=0;i<d.length;i++) d[i]=Math.random()*2-1; } return nb; }
  function env(g,t,vol,dur){ g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+Math.min(.02,dur*.2)); g.gain.exponentialRampToValueAtTime(.0001,t+dur); }
  function nz(dur,f0,f1,q,vol,delay){ const t=ctx.currentTime+(delay||0); const s=ctx.createBufferSource(); s.buffer=noiseBuf();
    const f=ctx.createBiquadFilter(); f.type='bandpass'; f.Q.value=q; f.frequency.setValueAtTime(f0,t); f.frequency.exponentialRampToValueAtTime(f1,t+dur);
    const g=ctx.createGain(); env(g,t,vol,dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t+dur+.05); }
  function tone(type,f0,f1,dur,vol,delay){ const t=ctx.currentTime+(delay||0); const o=ctx.createOscillator(); o.type=type;
    o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
    const g=ctx.createGain(); env(g,t,vol,dur); o.connect(g); g.connect(master); o.start(t); o.stop(t+dur+.05); }
  const ok=(k,gap)=>{ if (!ctx||muted) return false; const n=performance.now(); if (last[k]&&n-last[k]<gap) return false; last[k]=n; return true; };
  return {
    init,
    get muted(){ return muted; },
    setMuted(v){ muted=!!v; try{ localStorage.setItem('gsd-mute',muted?'1':'0'); }catch(e){} if (master) master.gain.value=muted?0:.5; },
    swing(step){ if (!ok('sw',40)) return; nz(.14+step*.04,700+step*250,3800,1.1,.32); },
    hit(big){ if (!ok('hit',35)) return; tone('sine',170,48,.13,.55); nz(.07,2600,700,.9,.35); if (big){ tone('square',95,38,.2,.2); nz(.18,900,200,.6,.3); } },
    block(){ if (!ok('blk',90)) return; tone('triangle',1500,1300,.09,.16); tone('triangle',2200,1900,.07,.08,.02); },
    kill(){ if (!ok('kill',60)) return; tone('triangle',520,110,.28,.22); nz(.22,1200,300,.7,.18); },
    dodge(){ if (!ok('dg',100)) return; nz(.22,350,1900,.8,.28); },
    spin(){ if (!ok('spin',200)) return; nz(.5,500,3000,.9,.32); nz(.35,2500,600,.9,.22,.18); },
    hurt(){ if (!ok('hurt',150)) return; tone('sawtooth',190,85,.15,.13); nz(.08,500,200,1,.18); },
    correct(){ if (!ok('cor',100)) return; tone('sine',660,660,.12,.26); tone('sine',990,990,.24,.26,.1); },
    wrong(){ if (!ok('wr',100)) return; tone('square',220,150,.28,.1); },
    shield(){ if (!ok('sh',150)) return; tone('triangle',1400,300,.35,.22); nz(.3,4000,800,.7,.22); },
    door(){ if (!ok('door',250)) return; tone('sine',95,55,.18,.4); nz(.12,700,250,2,.25); },
    zap(){ if (!ok('zap',120)) return; tone('sine',900,1600,.1,.07); },
    card(){ if (!ok('card',100)) return; tone('sine',880,1320,.14,.18); },
    wave(){ if (!ok('wave',500)) return; tone('triangle',330,330,.18,.18); tone('triangle',440,440,.18,.18,.16); tone('triangle',660,660,.3,.18,.32); }
  };
})();
addEventListener('pointerdown',()=>SFX.init(),{passive:true});
addEventListener('keydown',()=>SFX.init());

/* ---------- 타격감: 칼 궤적 · 타격 섬광 ---------- */
const slashTex=(()=>{ const cv=document.createElement('canvas'); cv.width=256; cv.height=64; const g=cv.getContext('2d');
  const v=g.createLinearGradient(0,0,0,64); v.addColorStop(0,'rgba(255,255,255,0)'); v.addColorStop(.1,'rgba(255,255,255,1)'); v.addColorStop(.35,'rgba(255,255,255,.55)'); v.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=v; g.fillRect(0,0,256,64);
  g.globalCompositeOperation='destination-in'; const u=g.createLinearGradient(0,0,256,0); u.addColorStop(0,'rgba(0,0,0,0)'); u.addColorStop(.65,'rgba(0,0,0,.75)'); u.addColorStop(1,'rgba(0,0,0,1)');
  g.fillStyle=u; g.fillRect(0,0,256,64); return new THREE.CanvasTexture(cv); })();
const glowTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=64; const g=cv.getContext('2d'); const r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.25,'rgba(255,255,255,.8)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(cv); })();
function arcGeo(r0,r1,a0,a1,seg){
  const pos=[],uv=[],idx=[];
  for (let i=0;i<=seg;i++){ const t=i/seg, a=a0+(a1-a0)*t, c=Math.cos(a), s=Math.sin(a);
    pos.push(c*r0,s*r0,0, c*r1,s*r1,0); uv.push(t,0, t,1); if (i<seg){ const k=i*2; idx.push(k,k+1,k+2, k+1,k+3,k+2); } }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); g.setIndex(idx); return g;
}
const SLASH_TYPES=[
  {tilt:0,    y:1.05, geo:arcGeo(.8,2.7,-Math.PI/2-1.45,-Math.PI/2+1.25,28), color:0xfff1c4, life:.2,  sweep:-.9},
  {tilt:-.8,  y:1.15, geo:arcGeo(.8,2.7,-Math.PI/2+1.45,-Math.PI/2-1.25,28), color:0xfff1c4, life:.2,  sweep:.9},
  {tilt:Math.PI/2, y:1.25, geo:arcGeo(.6,3.0,-Math.PI/2-1.6,-Math.PI/2+.5,28), color:0xffd76a, life:.26, sweep:-1.0},
  {tilt:0,    y:.7,  geo:arcGeo(2.6,4.4,0,Math.PI*1.5,64), color:0x6fc8f0, life:.5, spin:true, op:.5}
];
const slashes=[], flashes=[];
function slashFx(type){
  const T=SLASH_TYPES[type];
  const holder=new THREE.Group(); holder.position.set(P.x,T.y,P.z); holder.rotation.y=Math.atan2(P.fx,P.fz);
  const tilt=new THREE.Group(); tilt.rotation.z=T.tilt; holder.add(tilt);
  const mat=new THREE.MeshBasicMaterial({map:slashTex,color:trailColor(type),transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  const mesh=new THREE.Mesh(T.geo,mat); mesh.rotation.x=-Math.PI/2; tilt.add(mesh);
  scene.add(holder); slashes.push({holder,mesh,mat,T,t:0});
}
function impactFx(x,y,z,color,size){
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,toneMapped:false}));
  sp.position.set(x,y,z); sp.renderOrder=9; scene.add(sp); flashes.push({sp,size,t:0});
}
function updateCombatFx(dt){
  for (let i=slashes.length-1;i>=0;i--){ const s=slashes[i]; s.t+=dt; const k=Math.min(1,s.t/s.T.life);
    if (s.T.spin){ s.holder.position.set(P.x,s.T.y,P.z); s.mesh.rotation.z=-k*Math.PI*2.2; s.mat.opacity=(s.T.op||1)*(k<.7?1:1-(k-.7)/.3); }
    else { s.mesh.rotation.z=s.T.sweep*(1-Math.min(1,k*2.2)); s.mat.opacity=1-k*k; const sc=1+k*.12; s.mesh.scale.set(sc,sc,1); }
    if (k>=1){ scene.remove(s.holder); s.mat.dispose(); slashes.splice(i,1); } }
  for (let i=flashes.length-1;i>=0;i--){ const f=flashes[i]; f.t+=dt; const k=Math.min(1,f.t/.14);
    f.sp.scale.setScalar(f.size*(.4+k)); f.sp.material.opacity=1-k;
    if (k>=1){ scene.remove(f.sp); f.sp.material.dispose(); flashes.splice(i,1); } }
}

/* ---------- 3단 콤보 · 구르기 · 회전 베기 ---------- */
const COMBO=[
  {a:'slashH',sp:2.6,dmg:30,cd:.30,r:2.7,kb:1,  stun:.22,trail:0},
  {a:'slashD',sp:2.6,dmg:30,cd:.30,r:2.7,kb:1,  stun:.22,trail:1},
  {a:'chop',  sp:2.3,dmg:55,cd:.55,r:3.2,kb:2.1,stun:.45,trail:2,fin:true}
];
const CRIT_CHANCE=.12, CRIT_MULT=1.8, DODGE_CD=1.1, DODGE_TIME=.3, SPIN_CD=8, SPIN_DMG=26, SPIN_R=4.3, MOB_HP=1.3;
let hitStop=0;
function inputDir(){
  const am=arrowsMove(); let ix=(keys.KeyD||am&&keys.ArrowRight?1:0)-(keys.KeyA||am&&keys.ArrowLeft?1:0)+joy.x, iz=(keys.KeyS||am&&keys.ArrowDown?1:0)-(keys.KeyW||am&&keys.ArrowUp?1:0)+joy.y;
  const L=Math.hypot(ix,iz); return L>.12?{x:ix/L,z:iz/L}:null;
}
function aimAssist(){
  if (mouseAiming() && mouseAimAt(4.6)!==undefined) return;   // 마우스를 쓰면 마우스 방향으로 휘둘러요
  let best=null, bd=4.6;
  for (const m of mobs){ if (m.dying>=0||m.spawnT>0) continue; const d=Math.hypot(m.x-P.x,m.z-P.z); if (d<bd){ bd=d; best=m; } }
  if (best){ const dx=best.x-P.x, dz=best.z-P.z, d=Math.hypot(dx,dz)||1; P.fx=dx/d; P.fz=dz/d; }
}
function attack(){
  if (P.down) return;
  if (W.paused || W.state!=='play' || PEACE_RUN) return;
  if (P.dodgeT>0 || P.spinT>0 || P.dashT>0 || P.ultT>0){ P.buffer=true; return; }
  if (JOB!=='knight'){ jobAttack(); return; }
  P.blockT=0;
  if (P.atkCd>0){ if (P.atkCd<.22) P.buffer=true; return; }
  P.buffer=false;
  if (W.t-P.lastAtk>.8) P.combo=0;
  const c=COMBO[P.combo]; const step=P.combo; P.combo=(P.combo+1)%COMBO.length; P.lastAtk=W.t;
  P.atkCd=c.cd; P.swingT=.22; P.lunge=c.fin?.12:.08;
  aimAssist();
  knightAttackAnim(c.a,c.sp);
  SFX.swing(step); slashFx(c.trail);
  P.pendingHit={t:W.t+.09,c};
}
function doHit(c){
  let n=0, big=false;
  for (const m of mobs){
    if (m.dying>=0) continue;
    const d=Math.hypot(m.x-P.x,m.z-P.z);
    if (d<c.r+m.r*.6){
      const crit=Math.random()<CRIT_CHANCE; big=big||crit||!!c.fin;
      const dmg=c.dmg*atkMult()*(crit?CRIT_MULT:1);
      hitMob(m,dmg,P.x,P.z,c.kb,atkMult()>1?'#ffc531':'#ffffff',true,{crit,fin:c.fin,launch:c.fin,stun:c.stun});
      n++;
    }
  }
  if (n){ hitStop=Math.max(hitStop,big?.09:.055); SFX.hit(big); if (big) shake=Math.max(shake,.16); }
}
function dodge(){
  if (P.down) return;
  if (W.paused || W.state!=='play' || P.dodgeCd>0 || P.dodgeT>0 || P.dashT>0) return;
  if (W.stats) W.stats.dodges++;
  if (JOB==='knight'){ knightBlock(); P.dodgeMax=P.dodgeCd; return; }
  if (JOB==='mage'){ mageBlink(); P.dodgeMax=P.dodgeCd; return; }
  P.backstep=false;
  const dir=inputDir()||{x:P.fx,z:P.fz};
  P.ddx=dir.x; P.ddz=dir.z; P.fx=dir.x; P.fz=dir.z;
  P.dodgeT=DODGE_TIME; P.dodgeCd=jobInfo().dodgeCd; P.dodgeMax=P.dodgeCd; P.pendingHit=null; P.atkCd=0; P.buffer=false; P.combo=0;
  W.invuln=Math.max(W.invuln||0,W.t+DODGE_TIME+.12);
  if (knight) knight.anim.once('dodge',.95,true);
  SFX.dodge(); fx.burst(P.x,.2,P.z,0xd8c9a8,8,2.5);
}
function spinSkill(){
  if (PEACE_RUN || P.down) return;
  if (W.paused || W.state!=='play' || P.spinCd>0 || P.ultT>0 || P.dashT>0) return;
  if (P.dodgeT>0){ P.spinBuf=true; return; }
  P.blockT=0;
  if (JOB==='knight'){ knightDash(); P.spinMax=P.spinCd; return; }
  if (JOB==='archer'){ archerVolley(); P.spinMax=P.spinCd; return; }
  if (JOB==='mage'){ mageSkill(); P.spinMax=P.spinCd; return; }
  P.spinCd=SPIN_CD; P.spinT=.62; P.atkCd=.62; P.combo=0; P.buffer=false; P.pendingHit=null;
  if (knight) knight.anim.once('spin',3.7,true);
  SFX.spin(); slashFx(3); fx.shock(P.x,P.z,SPIN_R);
  P.spinHits=[{t:W.t+.14,kb:1},{t:W.t+.36,kb:1.9,last:true}];
}
function spinHit(h){
  let n=0;
  for (const m of mobs){
    if (m.dying>=0) continue;
    if (Math.hypot(m.x-P.x,m.z-P.z)<SPIN_R+m.r*.5){
      const crit=Math.random()<CRIT_CHANCE;
      hitMob(m,SPIN_DMG*atkMult()*(crit?CRIT_MULT:1),P.x,P.z,h.kb,'#9fe3ff',n===0,{crit,launch:!!h.last,stun:.35}); n++;
    }
  }
  if (n){ hitStop=Math.max(hitStop,h.last?.08:.04); SFX.hit(!!h.last); if (h.last) shake=Math.max(shake,.2); }
  if (h.last) fx.shock(P.x,P.z,SPIN_R+.5);
}
