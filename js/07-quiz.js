/* 사회 게임 RPG · 문제 고르기 · 퀴즈 창 · 부활 퀴즈 · 위치 퀴즈
   파일은 01 → 13 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요. */
/* ---------- 문제 고르기 (틀린 문제 우선 재출제) ---------- */
function retryOf(kinds,filter){ return W.wrong.filter(w=>!w.fixed && !w.pending && kinds.includes(w.item.kind) && (!filter||filter(w.item))); }
function pickFrom(pool){
  if (!pool.length) return null;
  let fresh=pool.filter(b=>!W.used.has(b));
  if (!fresh.length){ pool.forEach(b=>W.used.delete(b)); fresh=pool; }
  const q=fresh[Math.floor(Math.random()*fresh.length)]; W.used.add(q); return q;
}
function pick(kinds,pool,filter){
  const r=retryOf(kinds,filter);
  if (r.length && Math.random()<.6){ const w=r[0]; w.pending=true; return w.item; }
  return pickFrom(pool);
}

/* ---------- 모달 퀴즈 (4지선다 · O/X · 분류) ---------- */
const Q={item:null,correctIdx:0,nOpts:4,start:0,dur:20,answered:true,source:null,resultOnly:false};
function openQuiz(item,source){
  if (!item){ if (source.type==='timed') W.nextQuiz=W.t+timedEvery(); return; }
  W.paused=true; for (const k in keys) keys[k]=false;
  let opts, correctIdx;
  if (item.kind==='mc'){ const order=item.o.map((_,i)=>i).sort(()=>Math.random()-.5); opts=order.map(i=>item.o[i]); correctIdx=order.indexOf(0); }
  else if (item.kind==='ox'){ opts=['O','X']; correctIdx=item.a?0:1; }
  else { opts=CLS_OPTS; correctIdx=item.a; }
  Object.assign(Q,{item,correctIdx,nOpts:opts.length,start:performance.now(),dur:Math.round(TIME_BY_KIND[item.kind]*(MODE==='hero'&&source.type!=='revive'?HERO.quiz:1)*(MODE==='hero'?1:EASEF.quiz)),answered:false,source,resultOnly:false});
  const tagName = source.type==='prep'?`정비 퀴즈 ${W.prep?W.prep.step+1:1}/${W.prep?W.prep.n:PREP_N}`:(source.type==='station'&&W.bg&&W.bg.st===source.station&&NEWQ())?'보스의 힘 끊기':source.type==='cap'?`점령 퀴즈 · ${CQ.pts[source.point].k} ${CQ.pts[source.point].name}`:source.type==='station'?(source.station.title||`${ZINFO[source.station.zone].name} 퀴즈`):source.type==='card'?(item.kind==='ox'?'지식 카드 · O/X':'지식 카드 · 분류'):source.type==='parcel'?'택배 퀴즈':'돌발 퀴즈';
  const tagColor = source.type==='prep'?'#2fb36b':(source.type==='station'&&W.bg&&W.bg.st===source.station&&NEWQ())?'#7b2fd0':source.type==='cap'?'#2f6fed':source.type==='station'?(source.station.hex||ZINFO[source.station.zone].color):source.type==='card'?'#c28a00':source.type==='parcel'?'#b86b1f':'#18213a';
  $('#qtag').textContent=tagName; $('#qtag').style.background=tagColor;
  $('#qtext').textContent = item.kind==='cls' ? `“${item.q}” ${ZCFG.q}` : item.q;
  const box=$('#qopts'); box.innerHTML=''; box.className='opts'+(opts.length===2?' two':''); box.hidden=false;
  opts.forEach((t,i)=>{ const b=document.createElement('button'); b.className='opt'; b.id='opt'+i;
    b.innerHTML=`<span class="n">${i+1}</span><span></span>`; b.lastChild.textContent=t;
    b.addEventListener('click',()=>answer(i)); box.appendChild(b); });
  $('#qtimer').hidden=false; $('#qtime').hidden=false;
  $('#qres').hidden=true; $('#quiz').hidden=false; $('#prompt').hidden=true;
  // 처음 0.8초는 답을 고를 수 없어요(문제를 읽을 시간 + 실수로 누르기 방지)
  blurAll(); Q.lockUntil=performance.now()+QUIZ_LOCK_MS; box.classList.add('locked'); setTimeout(()=>box.classList.remove('locked'),QUIZ_LOCK_MS);
}
function answer(i){
  if (Q.answered) return; if (i>=0 && performance.now()<(Q.lockUntil||0)) return; Q.answered=true;
  const ok=i===Q.correctIdx;
  [...document.querySelectorAll('.opt')].forEach((b,j)=>{ b.disabled=true; if (j===Q.correctIdx) b.classList.add('right'); else if (j===i) b.classList.add('wrong'); });
  showResult(ok, i<0, Q.item);
}
function correctText(item){
  if (item.kind==='mc') return item.o[0];
  if (item.kind==='ox') return item.a?'O (맞다)':'X (틀리다)';
  if (item.kind==='cls') return CLS_OPTS[item.a];
  return ZINFO[item.a].name;
}

/* 정답·오답 처리: 효과, 틀린 문제 기록, 보스 보호막, 웨이브 잠금 */
function settle(ok,item,source){
  if (typeof petReact==='function') petReact(ok);
  W.asked++; if (ok){ W.correct++; (W.right||(W.right=new Set())).add(item.q); } W.lastFx=ok?'good':'bad';
  let entry=W.wrong.find(w=>w.item===item);
  if (entry){ entry.pending=false; if (ok) entry.fixed=true; }
  else if (!ok) W.wrong.push({item,fixed:false,pending:false});
  const extras=[];
  if (source && source.type==='revive'){
    const left=W.revive?W.revive.items.length-W.revive.step-1:0;
    if (entry && ok) entry.fixed=true;
    return {fx:{label: ok?(left>0?`부활까지 ${left}문제 남았어요`:'부활 성공!'):'부활 실패'},extras:ok?[]:['이번 판은 여기까지예요. 결과 화면에서 틀린 문제를 복습해요.']};
  }
  if (source && source.type==='cap') partyQuizDone(source.point,ok);
  const parcelQ=source&&source.type==='parcel';
  const prepQ=!!W.prep && source && (source.type==='prep'||source.type==='loc');
  const cardQ=NEWQ() && source && source.type==='card' && ok;
  const lvQ=source && source.type==='lv';
  const fx=lvQ?lvFx(ok,source):prepQ?prepFx(ok):cardQ?cardFx(ok):jobFx((ok?GOOD:BAD)[parcelQ||PEACE_RUN?1:Math.floor(Math.random()*3)],ok);
  if (parcelQ) extras.push(ok?'급행 배송! 빨리 달려서 배달하세요.':'상자가 무거워졌어요… 그래도 배달은 할 수 있어요.');
  if (!prepQ && !cardQ && !lvQ) applyEffect(fx);
  if (cardQ && W.cardCoins) extras.push(`이번 판 카드 코인 ${W.cardCoins} (판이 끝나면 받아요)`);
  if (entry && ok) extras.push('지난번에 틀린 문제를 이번엔 맞혔어요!');
  if (!entry && !ok) extras.push('이 문제는 잠시 뒤에 다시 나와요.');
  const boss=liveBoss();
  if (NEWQ() && source && source.type==='bossq') duelSettle(ok,extras);
  else if (NEWQ() && source && source.type==='station' && W.bg && W.bg.st===source.station) bgSettle(ok,extras);
  else if (NEWQ()){}
  else if (!PARTY.on && ok && boss && boss.shield>0){
    boss.shield--; W.lastShield=boss; extras.push(boss.shield>0?`보스 보호막 파괴! 남은 보호막 ${boss.shield}개`:'보스 보호막이 모두 깨졌어요. 이제 공격이 통해요!');
  } else if (!PARTY.on && !ok && boss && boss.shield<boss.shieldMax){
    boss.shield++; extras.push(`오답이라 보스 보호막이 하나 되살아났어요 (${boss.shield}개)`);
  }
  if (ok && MAPK==='defense' && source && source.type==='station' && source.station.turret){
    const tt=PEACE_RUN?PEACE_TURRET:TURRET_TIME; const t=source.station.turret; t.until=W.t+tt; t.cd=.3; extras.push(PEACE_RUN?`${t.title}이 ${tt}초 동안 정화의 빛을 쏴요!`:`${t.title}이 ${tt}초 동안 자동으로 공격해요!`);
  }
  if (ok && MAPK==='defense' && source && source.type==='timed'){
    const before=W.door; W.door=Math.min(W.doorMax,W.door+Math.round(W.doorMax*.1)); extras.push(W.door>before?`성문 수리 +${W.door-before}`:'성문은 이미 튼튼해요.');
  }
  if (W.gate && source && source.type==='station'){
    if (ok){ W.gate=false; W.nextWaveAt=W.t+2; extras.push(`웨이브 ${W.wave+2}가 열려요!`); }
    else extras.push(MAPK==='zones'?'다른 거점 기둥에서 다시 도전해 보세요.':'다른 수정에서 다시 도전해 보세요.');
  }
  funSettle(ok,item,source,extras);
  glQuiz(ok,source,extras);
  jobQuiz(ok,source,extras);
  return {fx,extras};
}
/* 빨리 맞힐수록 보너스 (최대 50점): 주어진 시간의 앞 1/4 안에 맞히면 50점, 시간이 끝날 때 0점 */
const SPEED_MAX=50;
function speedPts(frac){ const k=Math.max(0,Math.min(1,frac/.75)); return Math.round(SPEED_MAX*k/5)*5; }
/* 정답률 보너스: 문제 5개 이상 풀었을 때, 정답 점수에 더해요 */
function accBonusK(correct,asked){ if (asked<5) return 0; const r=correct/asked; return r>=.9?.5:r>=.8?.3:r>=.7?.15:0; }
function showResult(ok,timeout,item){
  Q.ok=ok;
  let sp=0;
  if (ok && Q.source && Q.source.type!=='revive'){
    const left = Q.source.type==='loc' ? (W.locLeftFrac||0) : Math.max(0,1-((performance.now()-Q.start)/1000-QUIZ_LOCK_MS/1000)/Math.max(1,Q.dur));
    sp=speedPts(left); W.speedPts=(W.speedPts||0)+sp; }
  const {fx,extras}=settle(ok,item,Q.source);
  if (sp>0) extras.unshift(`⚡ 빠른 정답 +${sp}점`); if (ok) SFX.correct(); else SFX.wrong();
  const v=$('#qverdict'); v.className='verdict '+(ok?'good':'bad');
  v.textContent=(ok?'정답! ':(timeout?'시간 초과… ':'아쉬워요… '))+fx.label+(fx.dur?` (${fx.dur}초)`:'');
  const ex=$('#qextra'); ex.hidden=!extras.length; ex.textContent=extras.join(' ');
  $('#qexp').textContent=(ok?'':`정답: ${correctText(item)}. `)+item.e;
  $('#qres').hidden=false; blurAll(); Q.closeAt=performance.now()+800; const qn=$('#qnext'); qn.disabled=true; setTimeout(()=>{ qn.disabled=false; },800);
}
function applyEffect(fx){
  if (fx.k==='heal') P.hp=Math.min(P.max,P.hp+fx.amount);
  else if (fx.k==='dmg'){ const b=P.hp; P.hp=Math.max(1,P.hp-fx.amount); if (W.stats){ W.stats.quiz+=b-P.hp; W.stats.taken+=b-P.hp; W.stats.minHp=Math.min(W.stats.minHp,P.hp/P.max); } }
  else { W.effects=W.effects.filter(e=>e.k!==fx.k); W.effects.push({k:fx.k,mult:fx.mult,label:fx.label,until:W.t+fx.dur,good:fx.mult>1}); }
}
function closeQuiz(){
  $('#quiz').hidden=true;
  const s=Q.source;
  if (s && s.type==='revive'){ reviveNext(Q.ok); return; }
  if (s && (s.type==='lv'||s.type==='bossq') && funClose(s,Q.ok)) return;
  if (W.prep && s && (s.type==='prep'||s.type==='loc')){ if (W.lastFx){ fx.rise(P.x,P.z,W.lastFx==='good'?0xffd34d:0x8a8fa0,W.lastFx==='good'?26:12); W.lastFx=null; } prepAfter(Q.ok); return; }
  if (s && s.type==='station'){
    const quick = W.gate || !!liveBoss();
    s.station.readyAt=W.t+(quick?8:(PEACE_RUN&&MAPK==='defense'?PEACE_RECHARGE:MAPS[MAPK].recharge));
    W.nextQuiz=Math.max(W.nextQuiz,W.t+10);
  } else if (s && s.type==='timed'){ W.nextQuiz=W.t+timedEvery(); }
  else if (s && s.type==='parcel'){ W.nextQuiz=Math.max(W.nextQuiz,W.t+12); }
  if (W.lastFx){ fx.rise(P.x,P.z,W.lastFx==='good'?0xffd34d:0x8a8fa0,W.lastFx==='good'?26:12); W.lastFx=null; }
  if (W.lastShield){ SFX.shield(); const b=W.lastShield; fx.burst(b.x,2.5,b.z,0x5cc8f0,34,8); fx.shock(b.x,b.z,4); shake=.3; W.lastShield=null; }
  W.paused=false; canvas.focus({preventScroll:true});
}
$('#qnext').addEventListener('click',closeQuiz);
$('#jobPick').addEventListener('click',e=>{ const b=e.target.closest('button'); if (!b) return; if (b.dataset.job) setJob(b.dataset.job); else if (b.dataset.elem) setJob(null,b.dataset.elem); });

/* ---------- 부활 퀴즈: 이번 판에서 틀린 문제 2개를 맞히면 부활 ---------- */
function reviveItems(){
  const modal=w=>w.item.kind!=='loc';
  let list=W.wrong.filter(w=>!w.fixed&&modal(w)).map(w=>w.item);
  if (list.length<2) list=list.concat(W.wrong.filter(w=>w.fixed&&modal(w)).map(w=>w.item));
  const pool=MC.concat(OX).filter(q=>!list.includes(q));
  while (list.length<2 && pool.length) list.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  return list.sort(()=>Math.random()-.5).slice(0,2);
}
function tryRevive(){
  if (W.revived) return false;
  const items=reviveItems(); if (items.length<2) return false;
  W.revived=true; W.revive={items,step:0}; W.paused=true; for (const k in keys) keys[k]=false;
  $('#reviveIntro .q').innerHTML = MAPK==='defense'&&W.door<=0 ? '이번 판에서 틀렸던 문제 2개를 모두 맞히면<br>무너진 성문이 다시 세워져요.' : '이번 판에서 틀렸던 문제 2개를 모두 맞히면<br>체력 절반으로 다시 일어나요.';
  $('#reviveIntro').hidden=false; blurAll(); UI_LOCK=performance.now()+QUIZ_LOCK_MS;
  return true;
}
function reviveStart(){ if ($('#reviveIntro').hidden || performance.now()<UI_LOCK) return; $('#reviveIntro').hidden=true; openQuiz(W.revive.items[0],{type:'revive'}); }
$('#reviveGo').addEventListener('click',reviveStart);
function reviveNext(ok){
  if (!ok){ W.revive=null; endGame(false); return; }
  W.revive.step++;
  if (W.revive.step<W.revive.items.length){ openQuiz(W.revive.items[W.revive.step],{type:'revive'}); return; }
  W.revive=null; P.hp=Math.max(P.hp,Math.round(P.max*.5)); W.invuln=W.t+3;
  const doorUp=MAPK==='defense'&&W.door<=0;
  if (doorUp){ W.door=Math.round(W.doorMax*.4); for (const m of mobs){ const dx=m.x-DOOR.x, dz=m.z-DOOR.z, d=Math.hypot(dx,dz)||1; if (d<8){ m.kbx=dx/d*14; m.kbz=dz/d*14; } } fx.shock(DOOR.x,DOOR.z,8); fx.rise(DOOR.x,DOOR.z+1,0xffd34d,40); }
  for (const m of mobs){ const dx=m.x-P.x, dz=m.z-P.z, d=Math.hypot(dx,dz)||1; if (d<7){ m.kbx=dx/d*14; m.kbz=dz/d*14; } }
  fx.shock(P.x,P.z,7); fx.rise(P.x,P.z,0xffd34d,40); shake=.3;
  showBanner(doorUp?'성문 복구! 다시 지켜 내세요':'부활! 3초 동안 무적이에요');
  W.paused=false; canvas.focus({preventScroll:true});
}

/* ---------- 위치 퀴즈 (멈추지 않고 직접 달려가서 답하기) ---------- */
function startLoc(){
  const item=pick(['loc'],LOC);
  if (!item){ W.nextQuiz=W.t+timedEvery(); return; }
  W.loc={item,until:W.t+LOC_TIME,startZone:zoneAt(P.x,P.z),left:false};
  $('#locText').textContent=item.q;
  $('#locIntroQ').textContent=item.q;
  const dirName=k=>{ const Z=ZONES[k], dx=Z.x-P.x, dz=Z.z-P.z; if (Math.hypot(dx,dz)<Z.r) return '지금 여기'; const a=Math.atan2(dx,-dz)*180/Math.PI; const n=['위쪽','오른쪽 위','오른쪽','오른쪽 아래','아래쪽','왼쪽 아래','왼쪽','왼쪽 위']; return n[Math.round(((a+360)%360)/45)%8]; };
  $('#dirHq').textContent=dirName('hq'); $('#dirLab').textContent=dirName('lab'); $('#dirFac').textContent=dirName('fac');
  W.paused=true; for (const k in keys) keys[k]=false;
  $('#locIntro').hidden=false; blurAll(); UI_LOCK=performance.now()+QUIZ_LOCK_MS;
  $('#locHelp').textContent = W.loc.startZone ? '지금 서 있는 거점은 일단 벗어났다가, 정답 거점 바닥으로 들어가세요' : '맞다고 생각하는 거점의 바닥으로 달려가세요';
  $('#locCard').hidden=false;
}
function goLoc(){
  if ($('#locIntro').hidden || performance.now()<UI_LOCK) return;
  $('#locIntro').hidden=true;
  if (W.loc) W.loc.until=W.t+LOC_TIME;
  W.paused=false; canvas.focus({preventScroll:true});
  showBanner('달려가세요!');
}
$('#locGo').addEventListener('click',goLoc);
function finishLoc(zone){
  const item=W.loc.item; W.locLeftFrac=Math.max(0,(W.loc.until-W.t)/Math.max(1,LOC_TIME)); W.loc=null; $('#locCard').hidden=true; $('#locCard').classList.remove('hurry');
  W.nextQuiz=W.t+timedEvery();
  const ok=zone===item.a;
  W.paused=true; for (const k in keys) keys[k]=false;
  Object.assign(Q,{item,answered:true,source:{type:'loc'},resultOnly:true});
  $('#qtag').textContent='위치 퀴즈'; $('#qtag').style.background='#18213a';
  $('#qtext').textContent=item.q;
  const box=$('#qopts'); box.className='opts'; box.innerHTML='';
  const row=document.createElement('div'); row.className='opt'+(ok?' right':' wrong');
  row.innerHTML='<span class="n">→</span><span></span>';
  row.lastChild.textContent = zone ? `내가 달려간 곳: ${ZINFO[zone].name}` : '시간 안에 거점에 도착하지 못했어요';
  box.appendChild(row);
  $('#qtimer').hidden=true; $('#qtime').hidden=true;
  $('#quiz').hidden=false; $('#prompt').hidden=true;
  showResult(ok,!zone,item);
}

