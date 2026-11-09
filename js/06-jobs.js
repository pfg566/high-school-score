/* 사회 게임 RPG · 직업(기사 · 궁수 · 마법사) · 마우스 조준 · 해골 석궁병
   파일은 01 → 13 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요. */
/* ---------- 직업: 기사 · 궁수 · 마법사 ---------- */
// 퀴즈를 대하는 방식이 직업마다 달라요. 기사는 틀려도 버티고, 궁수는 연달아 맞히면 강해지고, 마법사는 많이 풀수록 강해져요.
const JOBS={
  knight:{name:'기사',hp:150,spd:1,   dodgeCd:1.2,skillCd:6,ultName:'대검 회오리',dodgeName:'막기',skillName:'돌진 베기',
          hint:'WASD 이동 · 클릭 또는 스페이스 3단 베기 · Shift 막기(정면 피해 80% 감소, 반격) · E 돌진 베기 · Q 필살기(퀴즈 3문제)'},
  archer:{name:'궁수',hp:75, spd:1.1, dodgeCd:.7, skillCd:6,ultName:'화살비',dodgeName:'구르기',skillName:'세 갈래',
          hint:'WASD 이동 · 방향키 누르면 그쪽으로 연사 (마우스 클릭도 OK) · Shift 구르기 · E 세 갈래 · Q 필살기'},
  mage:  {name:'마법사',hp:80,spd:1,  dodgeCd:2.2,skillCd:7,ultName:'',dodgeName:'순간이동',skillName:'원소 마법',
          hint:'WASD 이동 · 클릭 또는 스페이스 원소 구슬(가까운 적 자동 조준, 터지면 주변까지) · Shift 순간이동 · E 원소 마법 · Q 필살기(퀴즈 3문제)'}
};
const ELEM={fire:{name:'불',color:0xff7a2f,css:'#ff7a2f',skill:'화염 폭발',ult:'운석'},
            ice:{name:'얼음',color:0x7fdcff,css:'#5cc8f0',skill:'얼음 고리',ult:'눈보라'},
            bolt:{name:'번개',color:0xa58cff,css:'#a58cff',skill:'연쇄 번개',ult:'낙뢰'}};
const ULT_NEED=3;
let JOB='knight', MELEM='fire';
/* 마법사 원소: 처음엔 불 하나. 레벨업할 때마다 25% 확률로 새 원소가 각성해요 (3번 연속 실패하면 다음엔 확정) */
const ELEM_ORDER=['fire','ice','bolt'], AWAKE_CHANCE=.25, AWAKE_PITY=3;
function ownedElems(){
  try{
    if (STUDENT && PROFILE){ const v=String(PROFILE.elems||'fire').split(',').filter(e=>ELEM[e]); return v.includes('fire')?v:['fire',...v]; }
    if (isAdmin) return ELEM_ORDER.slice();
  }catch(e){}
  return ['fire'];
}
try{ const j=localStorage.getItem('gsd-job'); if (JOBS[j]) JOB=j; const e=localStorage.getItem('gsd-elem'); if (ELEM[e]) MELEM=e; }catch(e){}
const jobInfo=()=>JOBS[JOB];
const ultLabel=()=>JOB==='mage'?ELEM[MELEM].ult:JOBS[JOB].ultName;
const skillLabel=()=>JOB==='mage'?ELEM[MELEM].skill:JOBS[JOB].skillName;

/* 직업별 기본 차림 (2단계에서 직업별 상점으로 바뀌어요) */
// 궁수 · 마법사는 각자 모델(레인저 · 마법사)이 따로 있어요. 상점 옷은 기사가 입고, 색 · 칼 궤적은 모두 함께 써요
function jobLookFor(j){ return equippedLook(j); }
function jobLook(){ return jobLookFor(JOB); }

/* 마우스 조준 (PC): 커서가 가리키는 땅 쪽으로 쏴요. 커서 방향 앞 20도 안의 적에게는 살짝 휘어서 맞아요 */
const MOUSE={x:0,y:0,on:false,held:false}, aimRay=new THREE.Raycaster(), aimPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0), aimHit=new THREE.Vector3();
const ARROW_MISS=.25;   // 궁수 화살은 4발 중 1발꼴로 빗나가요 (모든 모드 같음)
const AIM_ASSIST=Math.cos(10*Math.PI/180), ARROW_RANGE=11, ORB_RANGE=9, MAGE_AIM=8;
function mouseAimDir(){
  if (!MOUSE.on) return null;
  const r=canvas.getBoundingClientRect(), v=new THREE.Vector2((MOUSE.x-r.left)/r.width*2-1,-(MOUSE.y-r.top)/r.height*2+1);
  aimRay.setFromCamera(v,camera); if (!aimRay.ray.intersectPlane(aimPlane,aimHit)) return null;
  const dx=aimHit.x-P.x, dz=aimHit.z-P.z, d=Math.hypot(dx,dz); if (d<.4) return null;
  return {x:dx/d,z:dz/d,px:aimHit.x,pz:aimHit.z};
}
/* 키보드 조준 (마우스 없는 학생): 궁수는 방향키로 조준하며 쏴요. 8방향이라 앞 15도 안의 적에게 살짝 휘어서 맞아요 */
const KB_ASSIST=Math.cos(15*Math.PI/180);
let CTRL='auto'; try{ const c=localStorage.getItem('gsd-ctrl'); if (c==='kb'||c==='mouse') CTRL=c; }catch(e){}
const arrowsMove=()=>JOB!=='archer';                    // 궁수는 방향키가 조준, 다른 직업은 방향키도 이동
function kbAimDir(){
  if (JOB!=='archer') return null;
  const x=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0), z=(keys.ArrowDown?1:0)-(keys.ArrowUp?1:0), L=Math.hypot(x,z);
  return L?{x:x/L,z:z/L}:null;
}
/* 마우스 조준을 쓰는 중인지: '키보드만'이면 안 써요. '자동'이면 최근 2.5초 안에 마우스를 움직였을 때만 (터치패드 흔들림 방지) */
/* '자동'에서도 마우스로 클릭해 공격했거나 마우스를 크게 움직였으면 계속 마우스 방향을 봐요 (예전엔 2.5초 지나면 풀려서 360도 조준이 안 되는 것처럼 보였어요)
   키보드만 쓰는 학생: 마우스를 거의 안 움직이니 그대로 이동 방향을 봐요 · 궁수가 방향키로 조준하면 다시 키보드 조준으로 */
function mouseAiming(){ if (CTRL==='kb' || !MOUSE.on) return false; if (CTRL==='mouse' || MOUSE.held || MOUSE.sticky) return true; return performance.now()-(MOUSE.t||0)<2500; }
/* 마우스 방향 + 10도 안의 가까운 적에게 살짝 맞춰 주기 (세 직업 공통) */
function mouseAimAt(range){ const d=mouseAimDir(); if (!d) return undefined; P.fx=d.x; P.fz=d.z;
  let best=null, bc=AIM_ASSIST; for (const m of mobs){ if (m.dying>=0||m.spawnT>0) continue; const dx=m.x-P.x, dz=m.z-P.z, dd=Math.hypot(dx,dz)||1; if (dd>range) continue; const c=(dx*d.x+dz*d.z)/dd; if (c>bc){ bc=c; best=m; } }
  if (best){ const dx=best.x-P.x, dz=best.z-P.z, dd=Math.hypot(dx,dz)||1; P.fx=dx/dd; P.fz=dz/dd; } return best; }
function archerAim(range){
  const kb=kbAimDir(), md=!kb&&mouseAiming()?mouseAimDir():null;
  const dir=kb||md||{x:P.fx,z:P.fz}; P.fx=dir.x; P.fz=dir.z;
  let best=null, bc=md?AIM_ASSIST:KB_ASSIST;
  for (const m of mobs){ if (m.dying>=0||m.spawnT>0) continue; const dx=m.x-P.x, dz=m.z-P.z, d=Math.hypot(dx,dz)||1; if (d>range) continue;
    const c=(dx*dir.x+dz*dir.z)/d; if (c>bc){ bc=c; best=m; } }
  if (best){ const dx=best.x-P.x, dz=best.z-P.z, d=Math.hypot(dx,dz)||1; P.fx=dx/d; P.fz=dz/d; }
  return best;
}
addEventListener('pointermove',e=>{ if (e.pointerType!=='mouse') return; const mv=Math.abs(e.clientX-MOUSE.x)+Math.abs(e.clientY-MOUSE.y), now=performance.now();
  if (mv>2){ MOUSE.t=now; if (now-(MOUSE.accT||0)>1500){ MOUSE.acc=0; MOUSE.accT=now; } MOUSE.acc=(MOUSE.acc||0)+mv; if (MOUSE.acc>160) MOUSE.sticky=true; }
  MOUSE.x=e.clientX; MOUSE.y=e.clientY; MOUSE.on=true; });
document.addEventListener('mouseout',e=>{ if (!e.relatedTarget) MOUSE.sticky=false; });
canvas.addEventListener('pointerdown',e=>{ if (e.pointerType!=='mouse' || e.button!==0) return; MOUSE.x=e.clientX; MOUSE.y=e.clientY; MOUSE.on=true; if (W.state!=='play'||W.paused) return; MOUSE.held=true; MOUSE.sticky=true; MOUSE.t=performance.now(); if (MAPK!=='teamwar') attack(); });
addEventListener('pointerup',e=>{ if (e.button===0) MOUSE.held=false; });
addEventListener('blur',()=>{ MOUSE.held=false; });
canvas.addEventListener('contextmenu',e=>e.preventDefault());
/* 궁수 조준점: 땅 위의 작은 과녁 */
const aimMark=new THREE.Group();
{ const m1=new THREE.Mesh(new THREE.RingGeometry(.42,.56,32),new THREE.MeshBasicMaterial({color:0xffd34d,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
  const m2=new THREE.Mesh(new THREE.CircleGeometry(.12,16),new THREE.MeshBasicMaterial({color:0xffd34d,transparent:true,opacity:.95,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
  [m1,m2].forEach(m=>{ m.rotation.x=-Math.PI/2; m.renderOrder=4; aimMark.add(m); }); aimMark.position.y=.08; aimMark.visible=false; scene.add(aimMark); }
const aimLine=new THREE.Mesh(new THREE.PlaneGeometry(1,1).translate(0,.5,0),new THREE.MeshBasicMaterial({color:0xffd34d,transparent:true,opacity:.45,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
aimLine.rotation.order='YXZ'; aimLine.visible=false; aimLine.renderOrder=4; scene.add(aimLine);
function aimTick(real){
  aimMark.visible=false; aimLine.visible=false;
  if (JOB!=='archer'){ if (W.state==='play' && !W.paused && !PEACE_RUN && !P.down && MAPK!=='teamwar' && mouseAiming()){ const d=mouseAimDir(); if (d && P.dodgeT<=0 && !(P.dashT>0) && !(P.spinT>0)){ P.fx=d.x; P.fz=d.z; } } return; }
  const on=W.state==='play' && !W.paused && !PEACE_RUN && !P.down; if (!on) return;
  const kb=kbAimDir(); if (kb) MOUSE.sticky=false;
  if (kb){ if (P.dodgeT<=0 && !(P.dashT>0)){ P.fx=kb.x; P.fz=kb.z; }
    aimLine.position.set(P.x+kb.x*.7,.09,P.z+kb.z*.7); aimLine.rotation.set(Math.PI/2,Math.atan2(kb.x,kb.z),0); aimLine.scale.set(.14,ARROW_RANGE-.7,1); aimLine.visible=true;
    aimMark.visible=true; aimMark.position.set(P.x+kb.x*ARROW_RANGE,.08,P.z+kb.z*ARROW_RANGE); aimMark.rotation.y=real*1.5; aimMark.children[0].material.color.setHex(0xffd34d); return; }
  if (!mouseAiming()) return;
  const d=mouseAimDir(); if (!d) return;
  if (P.dodgeT<=0 && !(P.dashT>0)){ P.fx=d.x; P.fz=d.z; }
  const far=Math.min(ARROW_RANGE,Math.hypot(d.px-P.x,d.pz-P.z));
  aimLine.position.set(P.x+d.x*.7,.09,P.z+d.z*.7); aimLine.rotation.set(Math.PI/2,Math.atan2(d.x,d.z),0); aimLine.scale.set(.14,Math.max(.1,far-.7),1); aimLine.visible=true;
  aimMark.visible=true; aimMark.position.set(d.px,.08,d.pz); aimMark.rotation.y=real*1.5;
  aimMark.children[0].material.color.setHex(Math.hypot(d.px-P.x,d.pz-P.z)>ARROW_RANGE?0x9aa3b5:0xffd34d);
  if (MOUSE.held && W.t>=0) attack();
}

/* 가까운 적 자동 조준 (앞쪽에 있는 적을 조금 더 골라요) */
function aimAt(range){
  if (mouseAiming()){ const b=mouseAimAt(range); if (b!==undefined) return b; }
  let best=null, bs=1e9;
  for (const m of mobs){ if (m.dying>=0||m.spawnT>0) continue; const dx=m.x-P.x, dz=m.z-P.z, d=Math.hypot(dx,dz); if (d>range) continue;
    const front=(dx*P.fx+dz*P.fz)/(d||1), s=d-front*2.5; if (s<bs){ bs=s; best=m; } }
  if (best){ const dx=best.x-P.x, dz=best.z-P.z, d=Math.hypot(dx,dz)||1; P.fx=dx/d; P.fz=dz/d; }
  return best;
}
/* 적이 가장 많이 모인 곳 */
function crowdSpot(range,fallback){
  let best=null, bn=-1;
  for (const m of mobs){ if (m.dying>=0||m.spawnT>0) continue; if (Math.hypot(m.x-P.x,m.z-P.z)>range) continue;
    let n=0; for (const o of mobs){ if (o.dying<0 && Math.hypot(o.x-m.x,o.z-m.z)<4) n++; } if (n>bn){ bn=n; best=m; } }
  return best?{x:best.x,z:best.z}:{x:P.x+P.fx*fallback,z:P.z+P.fz*fallback};
}
function mobsNear(x,z,r){ return mobs.filter(m=>m.dying<0&&!(m.spawnT>0)&&Math.hypot(m.x-x,m.z-z)<r+m.r*.5); }

/* 상태 이상: 불타기 · 느려짐 */
function burn(m,sec,dps){ if (PARTY.on && !PARTY.host && m.net){ partySend({k:'st',id:m.id,b:[sec,dps]}); return; } burnRaw(m,sec,dps); }
function burnRaw(m,sec,dps){ m.burnT=Math.max(m.burnT||0,sec); m.burnDps=Math.max(m.burnDps||0,dps); }
function slowMob(m,sec,k){ if (PARTY.on && !PARTY.host && m.net){ partySend({k:'st',id:m.id,s:[sec,k]}); return; } slowRaw(m,sec,k); }
function slowRaw(m,sec,k){ m.slowT=Math.max(m.slowT||0,sec); m.slowK=Math.min(m.slowK||1,k); }
function mobStatus(m,dt){
  if (m.slowT>0){ m.slowT-=dt; if (m.slowT<=0){ m.slowT=0; m.slowK=1; } }
  if (m.burnT>0){ m.burnT-=dt; m.burnTick=(m.burnTick||0)-dt;
    if (m.burnTick<=0){ m.burnTick=.5; if (Math.random()<.7) fx.burst(m.x,1.2,m.z,0xff8a3d,3,1.6); hitMob(m,m.burnDps*.5,m.x,m.z,0,'#ffb36b',false,{noStun:true,quiet:true}); }
    if (m.burnT<=0){ m.burnT=0; m.burnDps=0; } }
}
const slowK=m=>m.slowT>0?(m.slowK||1):1;

/* 날아가는 것들: 화살 · 원소 구슬 · 떨어지는 화살 */
let PROJ=[], ZONEFX=[];
const arrowGeo=(()=>{ const g=new THREE.Group(); return g; })();
const ARROW_SHAFT=new THREE.CylinderGeometry(.035,.035,1.0,6).rotateX(Math.PI/2), ARROW_HEAD=new THREE.ConeGeometry(.09,.26,6).rotateX(Math.PI/2).translate(0,0,.6);
const ARROW_FLETCH=new THREE.BoxGeometry(.2,.02,.2).translate(0,0,-.45);
const arrowMat=toonMat({color:0x8a5a33}), arrowHeadMat=toonMat({color:0xdfe6f2}), fletchMat=toonMat({color:0xf3efe2});
function makeArrow(glow){
  const g=new THREE.Group(); g.add(new THREE.Mesh(ARROW_SHAFT,arrowMat),new THREE.Mesh(ARROW_HEAD,arrowHeadMat),new THREE.Mesh(ARROW_FLETCH,fletchMat));
  if (glow){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:glow,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false})); s.scale.setScalar(.9); s.position.z=.5; g.add(s); }
  scene.add(g); return g;
}
const ORB_GEO=new THREE.IcosahedronGeometry(.26,1);
function makeOrb(color,big){
  const g=new THREE.Group();
  g.add(new THREE.Mesh(ORB_GEO,new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false})));
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false})); s.scale.setScalar(big?2.2:1.5); g.add(s);
  g.scale.setScalar(big?1.5:1); scene.add(g); return g;
}
function shootArrow(ang,o){
  const dx=Math.sin(ang), dz=Math.cos(ang);
  const crit=Math.random()<archerCrit(), pierce=!!o.pierce||W.streak>=5;
  const mesh=makeArrow(pierce?0xffe08a:(crit?0xffd34d:0)); mesh.rotation.y=ang;
  PROJ.push({kind:'arrow',mesh,x:P.x+dx*.6,z:P.z+dz*.6,y:1.25,vx:dx*30,vz:dz*30,life:ARROW_RANGE/30,dmg:o.dmg,crit,pierce,hit:new Set(),tc:projTrailColor()});
}
function archerCrit(){ return Math.min(.6,CRIT_CHANCE+.08*Math.min(6,W.streak||0)); }
function castOrb(ang){
  const dx=Math.sin(ang), dz=Math.cos(ang), big=W.orbBoost>0; if (big) W.orbBoost--;
  const col=ELEM[MELEM].color, mesh=makeOrb(col,big);
  PROJ.push({kind:'orb',mesh,x:P.x+dx*.7,z:P.z+dz*.7,y:1.35,vx:dx*15,vz:dz*15,life:ORB_RANGE/15,dmg:big?50:32,r:big?3.1:2.1,big,el:MELEM,tc:projTrailColor()});
}
function orbBurst(p){
  const E=ELEM[p.el], hit=mobsNear(p.x,p.z,p.r);
  fx.shock(p.x,p.z,p.r); impactFx(p.x,1.2,p.z,E.color,p.big?4.2:3); fx.burst(p.x,1.1,p.z,E.color,p.big?26:14,5);
  let n=0;
  for (const m of hit){ if (hitMob(m,p.dmg*atkMult(),p.x,p.z,.8,E.css,n===0,{stun:.25})) n++;
    if (p.el==='fire') burn(m,2.5,6); else if (p.el==='ice') slowMob(m,2,.5); }
  if (p.el==='bolt' && hit.length){ // 옆 적에게 튀는 번개
    const done=new Set(hit); let from=hit[0];
    for (let k=0;k<2;k++){ const nx=mobs.filter(m=>m.dying<0&&!done.has(m)&&Math.hypot(m.x-from.x,m.z-from.z)<5.5).sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z))[0];
      if (!nx) break; done.add(nx); boltLine(from,nx); hitMob(nx,p.dmg*.6*atkMult(),from.x,from.z,.4,E.css,false,{stun:.35}); from=nx; } }
  if (n){ hitStop=Math.max(hitStop,.04); SFX.hit(p.big); }
}
/* 번개 줄기 */
function boltLine(a,b){
  const pts=[]; const N=7; for (let i=0;i<=N;i++){ const t=i/N; pts.push(new THREE.Vector3(a.x+(b.x-a.x)*t+(i&&i<N?rnd(-.35,.35):0),1.3+(i&&i<N?rnd(-.3,.3):0),a.z+(b.z-a.z)*t+(i&&i<N?rnd(-.35,.35):0))); }
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xe8e0ff,transparent:true,toneMapped:false}));
  scene.add(line); ZONEFX.push({kind:'fade',mesh:line,t:0,life:.22});
}
function skyBolt(x,z){
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.18,.32,14,8,1,true),new THREE.MeshBasicMaterial({color:0xd8ccff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  beam.position.set(x,7,z); scene.add(beam); ZONEFX.push({kind:'fade',mesh:beam,t:0,life:.3});
  impactFx(x,1,z,0xb9a8ff,4); fx.shock(x,z,2.4); fx.burst(x,.6,z,0xd8ccff,16,6);
}
function updateProj(dt){
  for (let i=PROJ.length-1;i>=0;i--){ const p=PROJ[i]; p.life-=dt;
    if (p.kind==='rain'){ p.delay-=dt; if (p.delay>0) continue;
      p.y-=34*dt; p.mesh.visible=true; p.mesh.position.set(p.x,p.y,p.z);
      if (p.y<=.3){ fx.burst(p.x,.3,p.z,0xd8c9a8,4,3); let n=0; for (const m of mobsNear(p.x,p.z,1.7)){ if (hitMob(m,p.dmg*atkMult(),p.x,p.z,.5,'#ffe08a',n===0,{stun:.2})) n++; }
        if (n) SFX.hit(false); scene.remove(p.mesh); PROJ.splice(i,1); }
      continue; }
    p.x+=p.vx*dt; p.z+=p.vz*dt; p.mesh.position.set(p.x,p.y,p.z);
    if (p.kind==='orb'){ p.mesh.rotation.y+=dt*6; if (Math.random()<.7) fx.burst(p.x,p.y,p.z,p.tc!=null&&Math.random()<.7?p.tc:ELEM[p.el].color,1,.6); }
    else if (p.kind==='arrow' && p.tc!=null && Math.random()<.8) fx.burst(p.x,p.y,p.z,p.tc,1,.35);
    let boom=false;
    for (const m of mobs){ if (m.dying>=0||m.spawnT>0) continue; if (p.hit&&p.hit.has(m)) continue;
      if (Math.hypot(m.x-p.x,m.z-p.z)<m.r+.45){
        if (p.kind==='arrow'){ p.hit.add(m);
          if (Math.random()<ARROW_MISS){ fx.num(m.x,m.boss?5.2:2.6,m.z,'MISS','#d6dde8',1.3); continue; }
          const d=p.dmg*atkMult()*(p.crit?CRIT_MULT:1);
          hitMob(m,d,p.x-p.vx*.02,p.z-p.vz*.02,.5,'#ffffff',true,{crit:p.crit,stun:.15}); SFX.hit(p.crit); if (!p.pierce){ boom=true; break; } }
        else { boom=true; break; } } }
    const out=Math.abs(p.x)>36||Math.abs(p.z)>36;
    if (boom||p.life<=0||out){ if (p.kind==='orb') orbBurst(p); scene.remove(p.mesh); PROJ.splice(i,1); }
  }
  for (let i=ZONEFX.length-1;i>=0;i--){ const z=ZONEFX[i]; z.t+=dt;
    if (z.kind==='fade'){ z.mesh.material.opacity=Math.max(0,1-z.t/z.life); if (z.t>=z.life){ scene.remove(z.mesh); z.mesh.geometry.dispose(); z.mesh.material.dispose(); ZONEFX.splice(i,1); } continue; }
    if (z.kind==='meteor'){ const k=Math.min(1,z.t/z.delay); z.ring.material.opacity=.25+.5*k; z.rock.position.y=18*(1-k)+.5; z.rock.position.x=z.x-6*(1-k); z.rock.rotation.x+=dt*5;
      if (Math.random()<.8) fx.burst(z.rock.position.x,z.rock.position.y,z.rock.position.z,0xff8a3d,2,1.5);
      if (z.t>=z.delay){ scene.remove(z.ring); scene.remove(z.rock); ZONEFX.splice(i,1);
        fx.shock(z.x,z.z,6.5); fx.shock(z.x,z.z,4); impactFx(z.x,1.4,z.z,0xff7a2f,7); fx.burst(z.x,.6,z.z,0xff7a2f,40,9); shake=Math.max(shake,.45); SFX.hit(true);
        let n=0; for (const m of mobsNear(z.x,z.z,6)){ if (hitMob(m,130*atkMult(),z.x,z.z,2.2,'#ff9a4d',n===0,{launch:true,stun:.6})) n++; burn(m,4,8); }
        hitStop=Math.max(hitStop,.1); }
      continue; }
    if (z.kind==='blizzard'){ z.ring.position.set(P.x,.1,P.z); z.ring.rotation.z+=dt*.8; z.ring.material.opacity=.35+Math.sin(z.t*6)*.1;
      for (let k=0;k<4;k++) fx.burst(P.x+rnd(-6,6),rnd(2,5),P.z+rnd(-6,6),0xe8f8ff,1,.4);
      z.tick-=dt; if (z.tick<=0){ z.tick=.5; let n=0; for (const m of mobsNear(P.x,P.z,6.2)){ slowMob(m,1,.35); if (hitMob(m,12*atkMult(),P.x,P.z,.2,'#bfefff',n===0,{noStun:true,quiet:n>0})) n++; } }
      if (z.t>=z.life){ scene.remove(z.ring); ZONEFX.splice(i,1); }
      continue; }
    if (z.kind==='thunder'){ z.tick-=dt; if (z.tick<=0 && z.left>0){ z.tick=.25; z.left--;
        const pool=mobs.filter(m=>m.dying<0&&!(m.spawnT>0)&&Math.hypot(m.x-P.x,m.z-P.z)<18); const m=pool[Math.floor(Math.random()*pool.length)];
        const x=m?m.x:P.x+rnd(-6,6), zz=m?m.z:P.z+rnd(-6,6); skyBolt(x,zz); shake=Math.max(shake,.15);
        let n=0; for (const o of mobsNear(x,zz,2.4)){ if (hitMob(o,70*atkMult(),x,zz,.8,'#d8ccff',n===0,{stun:.6})) n++; } if (n) SFX.hit(true); }
      if (z.left<=0 && z.tick<=0) ZONEFX.splice(i,1);
      continue; }
  }
}
function clearProj(){ PROJ.forEach(p=>scene.remove(p.mesh)); PROJ=[]; ZONEFX.forEach(z=>{ ['mesh','ring','rock'].forEach(k=>{ if (z[k]) scene.remove(z[k]); }); }); ZONEFX=[]; }

/* 직업별 공격 */
function jobAttack(){
  if (P.atkCd>0){ if (P.atkCd<.12) P.buffer=true; return; }
  P.buffer=false; P.lastAtk=W.t;
  if (JOB==='archer'){
    P.atkCd=.55; archerAim(ARROW_RANGE); const ang=Math.atan2(P.fx,P.fz);   // 연사 너프: 0.3초 → 0.55초 (클릭을 빨리 눌러도 이 간격보다 빨리 안 나가요)
    knightAttackAnim('shoot',3.4); SFX.zap(); shootArrow(ang,{dmg:26});
  } else {
    P.atkCd=.8; P.castT=.3; aimAt(MAGE_AIM); const ang=Math.atan2(P.fx,P.fz);
    knightAttackAnim('cast',2.2); SFX.zap(); castOrb(ang);
  }
}
/* Shift: 기사 막기 · 마법사 순간이동 (궁수는 구르기 그대로) */
function knightBlock(){
  if (P.dodgeCd>0||P.blockT>0) return;
  P.blockT=.9; P.dodgeCd=JOBS.knight.dodgeCd+.9; P.pendingHit=null; P.combo=0; P.buffer=false;
  if (knight) knight.anim.once('block',1.4,true);
  SFX.block();
}
function mageBlink(){
  if (P.dodgeCd>0) return;
  const dir=inputDir()||{x:P.fx,z:P.fz}, col=ELEM[MELEM].color;
  fx.burst(P.x,1,P.z,col,14,4); impactFx(P.x,1.1,P.z,col,2.4);
  P.x+=dir.x*4.8; P.z+=dir.z*4.8; resolve(P,.6); P.fx=dir.x; P.fz=dir.z;
  pg.position.set(P.x,0,P.z); camera.position.x+=dir.x*2.4; camera.position.z+=dir.z*2.4;
  fx.burst(P.x,1,P.z,col,14,4); impactFx(P.x,1.1,P.z,col,2.4);
  W.invuln=Math.max(W.invuln||0,W.t+.3); P.dodgeCd=JOBS.mage.dodgeCd; SFX.dodge();
}
/* E 스킬 */
function knightDash(){
  P.spinCd=JOBS.knight.skillCd; aimAt(7);
  P.dashT=.3; P.dashHit=new Set(); P.atkCd=.38; P.combo=0; P.buffer=false; P.pendingHit=null;
  W.invuln=Math.max(W.invuln||0,W.t+.35);
  if (knight) knight.anim.once('stab',2.3,true);
  SFX.spin(); slashFx(2);
}
function dashTick(dt){
  P.dashT-=dt; if (P.dashT<1e-4) P.dashT=0;
  P.x+=P.fx*19*dt; P.z+=P.fz*19*dt; if (Math.random()<.8) fx.burst(P.x,.2,P.z,0xd8c9a8,2,1.6);
  let n=0;
  for (const m of mobs){ if (m.dying>=0||P.dashHit.has(m)) continue; if (Math.hypot(m.x-P.x,m.z-P.z)<1.9+m.r*.5){ P.dashHit.add(m);
      if (hitMob(m,48*atkMult(),P.x-P.fx,P.z-P.fz,1.5,'#ffffff',true,{stun:.45,crit:Math.random()<CRIT_CHANCE})) n++; } }
  if (n){ hitStop=Math.max(hitStop,.05); SFX.hit(true); }
}
function archerVolley(){
  P.spinCd=JOBS.archer.skillCd; archerAim(ARROW_RANGE);
  P.ddx=-P.fx; P.ddz=-P.fz; P.dodgeT=.2; W.invuln=Math.max(W.invuln||0,W.t+.3); P.backstep=true;
  const ang=Math.atan2(P.fx,P.fz);
  if (knight) knight.anim.once('dodgeB',1.1,true);
  setTimeout(()=>{ if (knight && W.state==='play') knight.anim.once('shoot',3.4,true); },180);
  SFX.dodge(); [-.26,0,.26].forEach(a=>shootArrow(ang+a,{dmg:30,pierce:true}));
}
function mageSkill(){
  P.spinCd=JOBS.mage.skillCd; const E=ELEM[MELEM];
  if (knight) knight.anim.once('castBig',2.6,true);
  SFX.spin();
  if (MELEM==='fire'){ const t=crowdSpot(12,5); setTimeout(()=>{ if (W.state!=='play') return;
      fx.shock(t.x,t.z,3.6); impactFx(t.x,1.2,t.z,E.color,4.4); fx.burst(t.x,.8,t.z,E.color,30,7); shake=Math.max(shake,.25);
      let n=0; for (const m of mobsNear(t.x,t.z,3.4)){ if (hitMob(m,48*atkMult(),t.x,t.z,1.6,E.css,n===0,{stun:.4})) n++; burn(m,3,6); } if (n) SFX.hit(true); },300); }
  else if (MELEM==='ice'){ fx.shock(P.x,P.z,4.4); fx.burst(P.x,.8,P.z,0xe8f8ff,30,6); impactFx(P.x,1,P.z,E.color,4);
      let n=0; for (const m of mobsNear(P.x,P.z,4.4)){ if (hitMob(m,26*atkMult(),P.x,P.z,1.8,E.css,n===0,{stun:.3})) n++; slowMob(m,3,.4); } if (n) SFX.hit(true); }
  else { const near=mobs.filter(m=>m.dying<0&&!(m.spawnT>0)&&Math.hypot(m.x-P.x,m.z-P.z)<13).sort((a,b)=>Math.hypot(a.x-P.x,a.z-P.z)-Math.hypot(b.x-P.x,b.z-P.z)).slice(0,4);
      let from={x:P.x,z:P.z}; near.forEach((m,i)=>{ boltLine(from,m); hitMob(m,40*atkMult(),from.x,from.z,.6,E.css,i===0,{stun:.55}); from=m; }); if (near.length) SFX.hit(true); }
}
/* Q 필살기: 퀴즈 3문제를 맞히면 가득 차요 */
function ultimate(){
  if (P.down) return;
  if (W.paused || W.state!=='play' || PEACE_RUN) return;
  if ((W.ult||0)<ULT_NEED){ flashPrompt(`필살기는 퀴즈를 ${ULT_NEED-(W.ult||0)}문제 더 맞히면 쓸 수 있어요`,1.6); return; }
  W.ult=0; if (W.stats) W.stats.ults++; showBanner(`${ultLabel()}!`); SFX.wave();
  if (JOB==='knight'){ P.ultT=1.8; P.ultTick=0; P.atkCd=1.8; P.combo=0; P.pendingHit=null; P.buffer=false;
    if (knight) knight.anim.once('whirl',1.2,true); slashFx(3); fx.shock(P.x,P.z,5.5); }
  else if (JOB==='archer'){ const t=crowdSpot(18,7); if (knight) knight.anim.once('ult',1.5,true);
    for (let k=0;k<16;k++){ const a=Math.random()*6.283, r=Math.sqrt(Math.random())*4.2, x=t.x+Math.cos(a)*r, z=t.z+Math.sin(a)*r;
      const mesh=makeArrow(0xffe08a); mesh.rotation.x=Math.PI/2; mesh.visible=false; PROJ.push({kind:'rain',mesh,x,z,y:13,delay:.25+k*.08,dmg:32,life:9}); }
    const ring=new THREE.Mesh(new THREE.RingGeometry(3.8,4.3,48),new THREE.MeshBasicMaterial({color:0xffe08a,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2; ring.position.set(t.x,.08,t.z); scene.add(ring); ZONEFX.push({kind:'fade',mesh:ring,t:0,life:1.8}); }
  else { if (knight) knight.anim.once('ult',2.4,true);
    if (MELEM==='fire'){ const t=crowdSpot(16,7);
      const ring=new THREE.Mesh(new THREE.CircleGeometry(6,48),new THREE.MeshBasicMaterial({color:0xff5a2a,transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false})); ring.rotation.x=-Math.PI/2; ring.position.set(t.x,.07,t.z); scene.add(ring);
      const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(1.3,0),new THREE.MeshBasicMaterial({color:0xff7a2f,toneMapped:false})); rock.position.set(t.x-6,18,t.z); scene.add(rock);
      ZONEFX.push({kind:'meteor',x:t.x,z:t.z,ring,rock,t:0,delay:.95}); }
    else if (MELEM==='ice'){ const ring=new THREE.Mesh(new THREE.RingGeometry(5.6,6.2,64),new THREE.MeshBasicMaterial({color:0xbfefff,transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
      ring.rotation.x=-Math.PI/2; scene.add(ring); ZONEFX.push({kind:'blizzard',ring,t:0,life:4.5,tick:0}); }
    else ZONEFX.push({kind:'thunder',t:0,tick:0,left:6}); }
}
function ultTick(dt){
  P.ultT-=dt; P.ultTick-=dt; if (P.ultT<1e-4) P.ultT=0;
  if (P.ultTick<=0){ P.ultTick=.3; slashFx(3); let n=0;
    for (const m of mobsNear(P.x,P.z,5.4)){ if (hitMob(m,34*atkMult(),P.x,P.z,P.ultT<=.3?2.2:.9,'#9fe3ff',n===0,{stun:.4,launch:P.ultT<=.3})) n++; }
    if (n){ SFX.hit(P.ultT<=.3); hitStop=Math.max(hitStop,.03); } }
}

/* 주인공이 맞을 때: 막기 · 방어막 · 직업 체력 */
function hurtPlayer(amount,src){
  if (W.t<=W.invuln || PEACE_RUN) return 0;
  if (PARTY.on && (W.paused || P.down || PARTY.ended)) return 0;
  let dmg=amount;
  if (JOB==='knight' && P.blockT>0 && src){
    const dx=src.x-P.x, dz=src.z-P.z, d=Math.hypot(dx,dz)||1;
    if ((dx*P.fx+dz*P.fz)/d>-.2){ dmg=amount*.2; SFX.block(); if (W.stats){ W.stats.blocks++; W.stats.blocked+=Math.round(amount-dmg); } impactFx(P.x+dx/d*.8,1.3,P.z+dz/d*.8,0x9fe3ff,2.4); fx.num(P.x,3.4,P.z,'막기!','#9fe3ff');
      if (src.mob && src.mob.dying<0 && d<3.5){ hitMob(src.mob,28*atkMult(),P.x,P.z,1.6,'#ffffff',true,{stun:.7}); if (knight) knight.anim.once('blockAtk',1.8,true); } } }
  if (W.qshield>0){ const a=Math.min(W.qshield,dmg); W.qshield-=a; dmg-=a; if (a>0) fx.num(P.x,3.8,P.z,'방어막 -'+Math.round(a),'#9fe3ff'); }
  if (P.ultT>0) dmg*=.5;
  dmg=Math.round(dmg); if (dmg<=0) return 0;
  P.hp-=dmg; hurtT=.3; SFX.hurt(); fx.num(P.x,3,P.z,'-'+dmg,'#ff6b6b');
  if (W.stats){ const k=src&&src.mob?(src.mob.ranged?'ranged':src.mob.boss?'boss':'melee'):'boss'; W.stats.taken+=dmg; W.stats[k]+=dmg; W.stats.minHp=Math.min(W.stats.minHp,Math.max(0,P.hp)/P.max); }
  return dmg;
}

/* 퀴즈 특성 */
function jobFx(fx,ok){
  const f={...fx};
  if (JOB==='mage'){ if (f.dur) f.dur=Math.round(f.dur*1.5); }
  if (JOB==='knight' && !ok){ if (f.dur) f.dur=Math.round(f.dur*.5); if (f.amount){ f.amount=Math.round(f.amount*.5); f.label=f.label.replace(/\d+/,f.amount); } }
  return f;
}
function jobQuiz(ok,source,extras){
  W.streak=ok?(W.streak||0)+1:0;
  if (ok){ const before=W.ult||0; W.ult=Math.min(ULT_NEED,before+1); if (W.ult>=ULT_NEED && before<ULT_NEED) extras.push(`필살기 ${ultLabel()} 준비 완료! Q를 누르세요.`); }
  if (JOB==='knight'){ if (ok){ W.qshield=Math.min(60,(W.qshield||0)+30); extras.push('기사: 방어막 +30'); } else extras.push('기사: 오답 너프를 절반만 받아요.'); }
  if (JOB==='archer'){ if (ok) extras.push(`궁수: ${W.streak}연속 정답 · 치명타 ${Math.round(archerCrit()*100)}%${W.streak>=5?' · 관통 화살!':''}`); else extras.push('궁수: 연속 정답이 0으로 돌아갔어요.'); }
  if (JOB==='mage'){ if (ok && source && (source.type==='station'||source.type==='loc')){ W.orbBoost=(W.orbBoost||0)+3; extras.push('마법사: 다음 구슬 3개가 커져요.'); }
    extras.push(ok?'마법사: 정답 효과가 1.5배 오래가요.':'마법사: 오답 효과도 1.5배 오래가요.'); }
}

/* 시작 화면: 직업 고르기 */
function renderJobPick(){
  const box=$('#jobPick'); if (!box) return;
  box.querySelectorAll('[data-job]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.job===JOB)));
  $('#elemPick').hidden=JOB!=='mage';
  const own=ownedElems(); if (!own.includes(MELEM)) MELEM='fire';
  $('#elemPick').querySelectorAll('[data-elem]').forEach(b=>{ const ok=own.includes(b.dataset.elem); b.setAttribute('aria-pressed',String(b.dataset.elem===MELEM)); b.disabled=!ok; b.classList.toggle('locked',!ok);
    b.textContent=(ok?'':'🔒 ')+{fire:'🔥 불',ice:'❄️ 얼음',bolt:'⚡ 번개'}[b.dataset.elem]; b.title=ok?'':'레벨업할 때 각성하면 얻어요'; });
  $('#elemNote').textContent=own.length>=3?'모든 원소를 각성했어요!':`레벨업할 때마다 ${Math.round(AWAKE_CHANCE*100)}% 확률로 새 원소가 각성해요 · 3번 놓치면 다음 레벨업엔 확정`;
  const J=JOBS[JOB];
  $('#jobDesc').textContent=JOB==='knight'?'보통 · 붙어서 싸워요 · 체력 150% · 막기와 반격 · 오답 너프 절반, 정답이면 방어막'
    :JOB==='archer'?'어려움 · 방향키로 직접 조준하며 연사(마우스가 있으면 마우스로도) · 쏘는 동안 느려져요 · 체력 75% · 연속 정답마다 치명타'
    :`쉬움 · 가까운 적 자동 조준(짧은 거리) · 쏠 때 잠깐 멈춰요 · ${ELEM[MELEM].name} 구슬이 터져 주변까지 · 체력 80% · 퀴즈 효과 1.5배`;
}
function setJob(j,el){
  if (j && JOBS[j]) JOB=j; if (el && ELEM[el] && ownedElems().includes(el)) MELEM=el;
  try{ localStorage.setItem('gsd-job',JOB); localStorage.setItem('gsd-elem',MELEM); }catch(e){}
  renderJobPick(); if (WORLD_READY && W.state!=='play') applyLook(jobLook());
  try{ partyJobChanged(); }catch(e){}
}
function applyJobHUD(){
  const J=jobInfo();
  $('#hint').textContent=J.hint;
  const set=(sel,txt,html)=>{ const el=$(sel); if (el) el.querySelector('span').innerHTML=html||txt; };
  set('#skDodge',J.dodgeName); set('#skSpin',skillLabel()); set('#skUlt',ultLabel());
  set('#dodgeBtn',J.dodgeName); set('#spinBtn',skillLabel()); set('#ultBtn','필살기');
  $('#dodgeBtn').setAttribute('aria-label',J.dodgeName); $('#spinBtn').setAttribute('aria-label',skillLabel());
}

/* ---------- 해골 석궁병: 멀리서 멈춰 서서 쏘는 적 (웨이브 2부터) ---------- */
// 쏘기 전에 빨간 조준선이 보여요. 구르기·순간이동으로 피하거나, 기사는 막기로 막을 수 있어요. 조준 중에 맞으면 조준이 끊겨요.
const RANGED={keep:10, min:6, aim:1.0, cd:2.6, speed:15, hpK:.7};
const SKR_MAP={...SK_MAP, aim:'1H_Ranged_Aiming', shoot:'1H_Ranged_Shoot'};
let EBOLTS=[];
function easeIdx(){ return MODE==='hero'?-1:Math.max(0,EASES.indexOf(EASEF)); }
function rangedCount(i){
  if (PEACE_RUN) return 0;
  if (i<1) return 0;
  let n=MAPK==='island'?Math.min(i,2):1+i;           // 웨이브 2: 2명, 웨이브 3: 3명 (디펜스는 웨이브 4: 4명)
  const e=easeIdx(); if (e<0) n+=1; else if (e===2) n=Math.max(1,n-1); else if (e===1) n=Math.max(1,n-1+(i>=2?0:0));
  return n;
}
function aimK(){ const e=easeIdx(); return e===2?1.35:e===1?1.15:e<0?.85:1; }   // 쉬운 학교는 조준이 길고 화살이 느려요
function boltK(){ const e=easeIdx(); return e===2?.72:e===1?.85:e<0?1.15:1; }
function spawnRanged(d){
  spawnMob({...d,ranged:true,boss:undefined,groups:undefined,n:0,runner:false,hp:Math.round(d.hp*RANGED.hpK),spd:2.0,name:'해골 석궁병'},false);
}
function armXbow(c){
  const hand=c.root.getObjectByName('handslotr')||c.root.getObjectByName('handslot.r'); if (!hand) return;
  loadParts('rogue').then(g=>{ const src=g.scene.getObjectByName('1H_Crossbow'); if (!src) return; const w=src.clone(true);
    w.traverse(x=>{ if (x.isMesh){ x.material=partMat(x.material,.3); x.castShadow=true; } }); w.position.set(0,0,0); w.rotation.set(0,0,0); hand.add(w); }).catch(()=>{});
}
function makeAimLine(){
  const geo=new THREE.PlaneGeometry(.16,1).translate(0,.5,0).rotateX(Math.PI/2);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xff3b3b,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
  m.visible=false; m.renderOrder=2; scene.add(m); return m;
}
function rangedAI(m,dt){
  let tx=P.x, tz=P.z, door=false;
  if (MAPK==='defense' && Math.hypot(P.x-m.x,P.z-m.z)>14){ tx=DOOR.x; tz=DOOR.z+1.2; door=true; }
  const dx=tx-m.x, dz=tz-m.z, d=Math.hypot(dx,dz)||1;
  m.shotCd=(m.shotCd===undefined?rnd(1,2.2):m.shotCd)-dt; m.moving=false;
  if (m.aimT>0){
    m.aimT-=dt;
    if (m.aimT>.3){ m.aimX=tx; m.aimZ=tz; m.aimDoor=door; }        // 마지막 0.3초는 방향을 고정해요 (그때 피하면 돼요)
    const ax=m.aimX-m.x, az=m.aimZ-m.z, len=Math.min(17,Math.hypot(ax,az)+3);
    m.g.rotation.y=Math.atan2(ax,az);
    const L=m.aimLine; L.visible=true; L.position.set(m.x,.13,m.z); L.rotation.y=Math.atan2(ax,az); L.scale.set(1,1,len);
    L.material.opacity=m.aimT<=.3?.85+Math.sin(W.t*40)*.15:.35+(1-m.aimT/(RANGED.aim*aimK()))*.3;
    if (m.aimT<=0){ fireBolt(m); m.shotCd=RANGED.cd; L.visible=false; }
  } else {
    let mv=0; if (d>RANGED.keep+1.5) mv=1; else if (d<RANGED.min && !door) mv=-.7;
    const sp=m.spd*slowK(m)*(W.loc?.5:1);
    m.x+=(dx/d*sp*mv+m.kbx)*dt; m.z+=(dz/d*sp*mv+m.kbz)*dt; m.moving=mv!==0;
    m.g.rotation.y=Math.atan2(dx,dz);
    if (d<RANGED.keep+3.5 && m.shotCd<=0){ m.aimT=RANGED.aim*aimK(); m.aimX=tx; m.aimZ=tz; m.aimDoor=door; if (m.anim) m.anim.once('aim',1,true); }
  }
  m.kbx*=Math.pow(.02,dt); m.kbz*=Math.pow(.02,dt);
  for (const o of mobs){ if (o===m||o.dying>=0) continue; const ox=m.x-o.x, oz=m.z-o.z, od=Math.hypot(ox,oz), min=m.r+o.r; if (od>0&&od<min){ m.x+=ox/od*(min-od)*.5; m.z+=oz/od*(min-od)*.5; } }
  resolve(m,m.r);
  m.flash=Math.max(0,m.flash-dt); m.mat.emissive.setHex(m.flash>0?0xffffff:(m.aimT>0?0x2a0606:0x000000));
}
function fireBolt(m){
  const ax=m.aimX-m.x, az=m.aimZ-m.z, d=Math.hypot(ax,az)||1, sp=RANGED.speed*boltK();
  const mesh=makeArrow(0xff4a4a); mesh.rotation.y=Math.atan2(ax,az);
  EBOLTS.push({mesh,x:m.x+ax/d*.8,z:m.z+az/d*.8,vx:ax/d*sp,vz:az/d*sp,life:19/sp,dmg:Math.round(m.dmg*1.3),door:!!m.aimDoor,src:{x:m.x,z:m.z,mob:m}});
  if (m.anim) m.anim.once('shoot',1.3,true); SFX.zap(); if (W.stats && !m.aimDoor) W.stats.shots++;
}
function updateEBolts(dt){
  for (let i=EBOLTS.length-1;i>=0;i--){ const b=EBOLTS[i]; b.life-=dt;
    b.x+=b.vx*dt; b.z+=b.vz*dt; b.mesh.position.set(b.x,1.2,b.z);
    let gone=b.life<=0||Math.abs(b.x)>36||Math.abs(b.z)>36;
    if (!gone && !b.near && !b.door && Math.hypot(P.x-b.x,P.z-b.z)<1.6 && W.t<=W.invuln){ b.near=true; if (W.stats) W.stats.evaded++; }
    if (!gone && Math.hypot(P.x-b.x,P.z-b.z)<.75){
      if (W.t>W.invuln){ hurtPlayer(b.dmg,b.src); fx.burst(b.x,1.2,b.z,0xff6b6b,8,3); gone=true; }
    }
    if (!gone && b.door && MAPK==='defense' && Math.abs(b.x-DOOR.x)<2.4 && Math.abs(b.z-DOOR.z)<1.2){
      const dd=Math.round(b.dmg*.8); W.door-=dd; doorFlash=.2; SFX.door(); fx.num(b.x,4.4,DOOR.z+.5,'-'+dd,'#ffb36b'); fx.burst(b.x,1.6,DOOR.z+.2,0xc9a06a,6,3); gone=true; }
    if (gone){ scene.remove(b.mesh); EBOLTS.splice(i,1); }
  }
}
function clearEBolts(){ EBOLTS.forEach(b=>scene.remove(b.mesh)); EBOLTS=[]; }

$('#muteBtn').addEventListener('click',e=>{ e.preventDefault(); SFX.init(); SFX.setMuted(!SFX.muted); $('#muteBtn').textContent=SFX.muted?'🔇':'🔊'; canvas.focus({preventScroll:true}); });
$('#muteBtn').textContent=SFX.muted?'🔇':'🔊';
renderJobPick();
$('#dodgeBtn').addEventListener('pointerdown',e=>{ e.preventDefault(); dodge(); });
$('#spinBtn').addEventListener('pointerdown',e=>{ e.preventDefault(); spinSkill(); });
$('#ultBtn').addEventListener('pointerdown',e=>{ e.preventDefault(); ultimate(); });
let skKey='';
function updateSkillHUD(){
  const d=P.dodgeCd/(P.dodgeMax||1), s=P.spinCd/(P.spinMax||1), u=1-Math.min(ULT_NEED,W.ult||0)/ULT_NEED, k=Math.round(d*50)+'|'+Math.round(s*50)+'|'+Math.ceil(P.spinCd)+'|'+(W.ult||0);
  if (k===skKey) return; skKey=k;
  const ut=(W.ult||0)>=ULT_NEED?'':`${W.ult||0}/${ULT_NEED}`;
  for (const [sel,v,txt] of [['#skDodge',d,''],['#dodgeBtn',d,''],['#skSpin',s,P.spinCd>0?Math.ceil(P.spinCd):''],['#spinBtn',s,P.spinCd>0?Math.ceil(P.spinCd):''],['#skUlt',u,ut],['#ultBtn',u,ut]]){
    const el=$(sel); if (!el) continue; el.querySelector('.cdm').style.height=(Math.max(0,v)*100)+'%'; el.classList.toggle('ready',v<=0);
    const t=el.querySelector('.cdt'); if (t) t.textContent=txt; }
}

function hitMob(m,dmg,sx,sz,kbk,col,byPlayer,o){
  o=o||{};
  if (PARTY.on && !PARTY.host && m.net) return partyClientHit(m,dmg,sx,sz,kbk,col,byPlayer,o);
  if (m.ans && !o.by){ // 정답 몬스터: 포탑에는 안 맞고, 내가 가까이 있을 때만 맞아요
    if (o.src==='turret') return false;
    if (Math.hypot(P.x-m.x,P.z-m.z)>AM_NEAR){ if (!m.farT||W.t-m.farT>1){ m.farT=W.t; fx.num(m.x,3.2,m.z,'더 가까이!','#ffe08a',1.1); } return false; } }
  const dx=m.x-sx, dz=m.z-sz, d=Math.hypot(dx,dz)||1, hy=m.boss?2.4:1.1;
  const k=(m.boss?3:7)*kbk; m.kbx=dx/d*k; m.kbz=dz/d*k;
  if (m.shield>0){ if (byPlayer){ flashPrompt('보호막! 퀴즈를 맞혀야 깰 수 있어요',1.5); SFX.block(); } fx.burst(m.x,2.4,m.z,0x5cc8f0,8,4); fx.num(m.x,5,m.z,'막힘','#9fe3ff'); return false; }
  if (m.boss && m.groggy>W.t) dmg=Math.round(dmg*GROGGY_DMG);
  const hpBefore=m.hp; m.hp-=dmg; if (W.stats && o.src!=='turret' && !o.by) W.stats.dealt+=Math.max(0,Math.min(dmg,hpBefore)); m.flash=o.crit?.2:.15; if (!m.boss && !o.noStun) m.stun=Math.max(m.stun||0,o.stun||.2);
  if (!o.quiet){ fx.burst(m.x,hy,m.z,0xfff1a8,o.crit?12:7,o.crit?6:4); fx.burst(m.x,hy,m.z,0xffffff,o.crit?8:4,8); }
  if (!o.quiet) impactFx(m.x-dx/d*.35,hy,m.z-dz/d*.35,o.crit?0xffd34d:0xfff2d6,o.crit?3.4:(o.fin?2.8:2));
  fx.num(m.x,m.boss?5.2:2.5,m.z,o.crit?Math.round(dmg)+'!':String(Math.round(dmg)),o.crit?'#ffcf3a':col,o.crit?1.4:1);
  if (m.hp>0 && m.anim && !o.noStun && !(m.boss&&m.slamT>0)) m.anim.once('hit',1.5,true);
  if (m.hp<=0){ m.dying=1.6; if (!o.by || o.by===PARTY.me) W.kills++; m.killer=o.by||PARTY.me; if (PEACE_RUN){ fx.rise(m.x,m.z,0xdff1ff,16); if (m.anim){ m.anim.dead=true; } } else if (m.anim) m.anim.die(); fx.burst(m.x,.9,m.z,m.color,m.boss?40:22,m.boss?8:6); SFX.kill();
    if (!m.boss && (o.launch||o.crit)){ m.avy=o.launch?7:4.5; m.kbx*=1.7; m.kbz*=1.7; }
    if (m.boss) shake=.5;
    if (m.ans) amKill(m); else if (NEWQ()) lvKill(m);   // 새 방식: 지식 카드 대신 경험치 → 레벨업 카드
    else if (!m.boss && !PARTY.on && Math.random()<CARD_CHANCE) dropCard(m.x,m.z); }
  return true;
}


/* 설정: 조작 방식 */
{ const sel=$('#ctrlSel'); if (sel){ sel.value=CTRL; sel.addEventListener('change',e=>{ CTRL=e.target.value; try{ localStorage.setItem('gsd-ctrl',CTRL); }catch(_){} }); } }
