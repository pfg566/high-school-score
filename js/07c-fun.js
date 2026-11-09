/* 사회 게임 RPG · 몹 사냥 맵의 새 퀴즈 방식 (평화 모드 · 파티 모드는 예전 그대로)
   ① 정답 몬스터 사냥: 돌발 퀴즈 대신, 보기 깃발을 든 정예 몬스터 중 정답 몬스터를 잡아요
   ② 레벨업 카드: 몬스터를 잡아 레벨업하면 카드 3장(일반 O/X · 희귀 4지선다 · 전설 내 오답) 중 하나를 골라 문제를 풀어요
   ③ 보스 퀴즈 결투: 보스가 직접 문제를 내요. 맞히면 지식 방패가 깨지고 보스가 휘청여요
   ④ 연속 정답: 어디서 맞히든 이어지고, 이어질수록 지식 폭발이 커지고 경험치가 더 들어와요 (동 → 은 → 금)
   ⑤ 지식 도감: 맞힌 문제가 단원별 도감에 모여요 (dex/{반}/{번호})
   파일은 01 → 13 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요. */
const AM_NEAR=7.5;   // 정답 몬스터는 이 거리 안에서만 맞아요 (멀리서 광역기·관통 화살에 엉뚱한 몬스터가 잡히지 않게)
const AM_EVERY=45, AM_TIME=30, AM_COL=['#e5484d','#3b82f6','#22a35a','#e8a400'], AM_OXCOL=['#3b82f6','#e5484d'];
const LV_NEED=lv=>4+lv*2;
const QS_TIER=n=>n>=5?2:n>=3?1:0, QS_NAME=['','🥈 은빛','🥇 금빛'], QS_XP=[1,1.5,2];
const FUN={am:null,lv:{n:1,xp:0,pend:0,cards:null,card:null},dex:null};
const funOn=()=>NEWQ() && W.state==='play';

function funReset(){
  amClear(true);
  FUN.lv={n:1,xp:0,pend:0,cards:null,card:null}; W.qs=0; W.qsMax=0; W.lvUps=0;
  $('#lvUp').hidden=true; $('#amCard').hidden=true; $('#amRes').hidden=true;
  $('#lvBox').hidden=!NEWQ();
  if (NEWQ()) W.nextQuiz=W.t+AM_EVERY*.6;
  funLoadNotes();
}
/* 오답 노트(지난 판들)에서 아직 못 맞힌 문제 → 전설 카드 문제로 써요 */
async function funLoadNotes(){
  FUN.noteItems=[];
  if (!(AUTHMODE==='student'&&STUDENT&&fbDb)) return;
  try{ const v=(await withTimeout(fbDb.ref(`notes/${STUDENT.cid}/${STUDENT.num}`).once('value'),6000)).val()||{};
    const todo=new Set(Object.values(v).filter(e=>e&&e.s===1).map(e=>e.q));
    FUN.noteItems=MC.concat(OX).filter(it=>todo.has(it.q)); }catch(e){}
}

/* ---------- ① 정답 몬스터 사냥 ---------- */
function amTag(label,text,color){
  const cv=document.createElement('canvas'); cv.width=512; cv.height=200; const g=cv.getContext('2d');
  g.fillStyle=color; roundRect(g,6,6,500,188,34); g.fill(); g.strokeStyle='#fff'; g.lineWidth=8; roundRect(g,10,10,492,180,30); g.stroke();
  g.fillStyle='#fff'; g.textAlign='center'; g.textBaseline='middle';
  if (text){ g.font='bold 64px Jua, "Malgun Gothic", sans-serif'; g.fillText(label,58,100);
    const fs=text.length>16?34:text.length>10?40:48, lines=runWrap(g,text,400,`${fs}px Jua, "Malgun Gothic", sans-serif`,fs*1.15,2);
    lines.forEach((l,i)=>g.fillText(l,290,100+(i-(lines.length-1)/2)*fs*1.15)); }
  else { g.font='bold 130px Jua, "Malgun Gothic", sans-serif'; g.fillText(label,256,108); }
  const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,toneMapped:false})); sp.scale.set(2.9,1.13,1); sp.renderOrder=9; return sp;
}
function amStart(){
  if (!funOn() || W.gate || W.prep || W.loc || W.wave<0 || liveBoss() || FUN.am || W.spawnQ.length>6) return false;
  const useOx=OX.length && (!MC.length || Math.random()<.35);
  const item=useOx?pick(['ox'],OX):pick(['mc'],MC); if (!item) return false;
  let opts, ci;
  if (item.kind==='mc'){ const order=item.o.map((_,i)=>i).sort(()=>Math.random()-.5); opts=order.map(i=>item.o[i]); ci=order.indexOf(0); }
  else { opts=['O','X']; ci=item.a?0:1; }
  const def=WAVES[Math.min(W.wave,WAVES.length-1)]||WAVES[0], base={...def,boss:null,runner:false,ranged:false,leaper:false};
  const n=opts.length, a0=Math.random()*Math.PI*2, elites=[];
  opts.forEach((o,i)=>{
    const a=a0+i/n*Math.PI*2, r=n>2?10.5:9.5, at={x:P.x+Math.cos(a)*r,z:P.z+Math.sin(a)*r};
    const m=spawnMob(base,false,at); if (!m) return;
    m.hp=m.max=Math.round(m.max*2.2); m.ans={i,ok:i===ci}; m.spd*=.85; m.hold={x:at.x,z:at.z};   // 쫓아오지 않고 제자리에서 깃발을 들고 기다려요
    const col=item.kind==='mc'?AM_COL[i]:AM_OXCOL[i];
    m.body.scale.multiplyScalar(1.22);
    if (m.bar&&m.bar.fg) m.bar.fg.material.color.set(col);
    const tag=amTag(item.kind==='mc'?String(i+1):o,item.kind==='mc'?o:'',col); tag.position.y=3.6; m.g.add(tag); m.ansTag=tag;
    const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1.2,32),new THREE.MeshBasicMaterial({color:new THREE.Color(col),transparent:true,opacity:.85,depthWrite:false})); ring.rotation.x=-Math.PI/2; ring.position.y=.06; m.g.add(ring);
    elites.push(m);
  });
  if (!elites.length) return false;
  FUN.am={item,opts,ci,elites,until:W.t+AM_TIME,start:W.t,done:false};
  $('#amQ').textContent=(item.kind==='ox'?'[O/X] ':'')+item.q;
  const box=$('#amOpts'); box.className='run-opts'+(item.kind==='ox'?' two':'');
  box.innerHTML=opts.map((o,i)=>`<div class="run-opt" style="--c:${item.kind==='mc'?AM_COL[i]:AM_OXCOL[i]}"><b>${item.kind==='mc'?i+1:o}</b><span>${item.kind==='mc'?esc(o):(i?'X 깃발 몬스터':'O 깃발 몬스터')}</span></div>`).join('');
  $('#amCard').hidden=false; $('#amRes').hidden=true;
  SFX.wave(); showBanner('⚔️ 정답 몬스터 등장! 정답 깃발 몬스터에게 가까이 가서 잡아요');
  return true;
}
function amKill(m){
  const A=FUN.am; if (!A||A.done||!m.ans) return;
  amResolve(m.ans.ok,m);
}
function amResolve(ok,killed,timeout){
  const A=FUN.am; if (!A||A.done) return; A.done=true;
  const frac=Math.max(0,(A.until-W.t)/AM_TIME); let sp=0;
  if (ok){ sp=speedPts(frac); W.speedPts=(W.speedPts||0)+sp; }
  const {fx:f,extras}=settle(ok,A.item,{type:'am'});
  if (ok){ SFX.correct(); funBlast(true); }
  else { SFX.wrong();
    if (killed && !timeout){ const def=WAVES[Math.min(W.wave,WAVES.length-1)]||WAVES[0]; for (let k=0;k<2;k++){ const s=spawnMob({...def,boss:null,runner:false,ranged:false,leaper:false},false,{x:killed.x,z:killed.z}); if (s){ s.hp=s.max=Math.round(s.max*.6); s.body.scale.multiplyScalar(.8); } } flashPrompt('오답 몬스터였어요! 몬스터가 둘로 갈라졌어요',2.2); } }
  amClear(false,killed);
  const r=$('#amRes'); r.className='run-res card '+(ok?'good':'bad'); r.hidden=false;
  r.innerHTML=ok?`<b>정답! 지식 폭발 💥</b><small>${sp?`⚡ +${sp}점 · `:''}${esc(f.label||'')}</small><p>${esc(A.item.e||'')}</p>${extras.length?`<p class="am-ex">${esc(extras.join(' '))}</p>`:''}`
    :`<b>${timeout?'시간 초과…':'아쉬워요…'}</b><small>정답: ${esc(correctText(A.item))} · ${esc(f.label||'')}</small><p>${esc(A.item.e||'')}</p>`;
  setTimeout(()=>{ if (!FUN.am||FUN.am===A||FUN.am.done){ $('#amRes').hidden=true; } },6500);
  W.nextQuiz=W.t+AM_EVERY;
  setTimeout(()=>{ if (FUN.am===A) FUN.am=null; },300);
}
function amClear(instant,except){
  const A=FUN.am; $('#amCard').hidden=true;
  if (!A) return;
  for (const e of A.elites){ if (e===except||e.dying>=0) continue; e.hp=0; e.dying=.6; e.noReward=true; if (e.anim) e.anim.die(); if (!instant) fx.burst(e.x,1.2,e.z,0xffffff,14,4); }
  if (instant) FUN.am=null;
}
function amTick(){
  const A=FUN.am; if (!A||A.done) return;
  const k=Math.max(0,(A.until-W.t)/AM_TIME); $('#amBar').style.width=(k*100)+'%'; $('#amBar').classList.toggle('hurry',k<.3);
  $('#amTime').textContent=Math.ceil(Math.max(0,A.until-W.t))+'초';
  if (W.t>=A.until) amResolve(false,null,true);
}

/* ---------- ④ 연속 정답 · 지식 폭발 ---------- */
function funBlast(big){
  const t=QS_TIER(W.qs||0), R=(big?5:3.5)+t*1.5, dmg=(big?60:35)+t*15;
  fx.shock(P.x,P.z,R); fx.burst(P.x,1.4,P.z,0xffd34d,30+t*15,6+t*2); impactFx(P.x,1.4,P.z,0xffe08a,4+t); shake=Math.max(shake,.25);
  let n=0; for (const m of mobs){ if (m.dying>=0||m.boss||m.ans) continue; if (Math.hypot(m.x-P.x,m.z-P.z)<R){ hitMob(m,dmg*atkMult(),P.x,P.z,1.6,'#ffd34d',n===0,{stun:.5,quiet:true}); n++; } }
}
/* 퀴즈 결과마다 (settle 안에서 불러요) */
function funSettle(ok,item,source,extras){
  if (!NEWQ() || !source || source.type==='revive') return;
  if (ok){ W.qs=(W.qs||0)+1; W.qsMax=Math.max(W.qsMax||0,W.qs); const t=QS_TIER(W.qs);
    if (W.qs===3||W.qs===5) extras.push(`🔥 ${W.qs}연속 정답! ${QS_NAME[t]} 상태 · 경험치 ×${QS_XP[t]}`);
    if (!W.prep && source.type!=='am' && source.type!=='lv') funBlast(false); }
  else { if ((W.qs||0)>=3) extras.push(`연속 정답 ${W.qs}개가 끊겼어요`); W.qs=0; }
  if (ok && MAPK==='defense' && source.type==='am'){ const b=W.door; W.door=Math.min(W.doorMax,W.door+Math.round(W.doorMax*.1)); if (W.door>b) extras.push(`성문 수리 +${W.door-b}`); }
}

/* ---------- ② 레벨업 카드 ---------- */
function lvKill(m){
  if (!NEWQ()||m.noReward||m.boss) return;
  const t=QS_TIER(W.qs||0), L=FUN.lv; L.xp+=QS_XP[t];
  fx.rise(m.x,m.z,t===2?0xffd34d:t===1?0xdfe6f2:0xc9a06a,6);
  while (L.xp>=LV_NEED(L.n)){ L.xp-=LV_NEED(L.n); L.n++; L.pend++; }
}
function lvDraw(){
  const pool=UPCARDS.filter(c=>(!c.map||c.map===MAPK)&&(!c.ok||c.ok())).sort(()=>Math.random()-.5);
  const up=(i)=>pool[i%pool.length];
  const wrongIt=W.wrong.filter(w=>!w.fixed&&!w.pending&&(w.item.kind==='mc'||w.item.kind==='ox')).map(w=>w.item);
  const legendQ=wrongIt[0]||(FUN.noteItems||[]).find(it=>!W.right||!W.right.has(it.q))||null;
  const cards=[];
  if (OX.length) cards.push({tier:0,name:'일반',kind:'ox',up:[up(0)],desc:up(0).name});
  if (MC.length) cards.push({tier:1,name:'희귀',kind:'mc',up:[up(1),up(1)],desc:`${up(1).name} ×2`});
  if (legendQ) cards.push({tier:2,name:'전설',item:legendQ,up:[up(2),up(3)],desc:`${up(2).name} + ${up(3).name} + 체력 회복 + 지식 폭발`,note:'내가 틀렸던 문제'});
  else if (MC.length) cards.push({tier:1,name:'희귀',kind:'mc',up:[up(2),up(2)],desc:`${up(2).name} ×2`});
  if (cards.length<2 && MC.length) cards.push({tier:0,name:'일반',kind:'mc',up:[up(4)],desc:up(4).name});
  return cards.slice(0,3);
}
function lvOpen(){
  const L=FUN.lv; L.pend--; L.cards=lvDraw(); if (!L.cards.length) return;
  W.paused=true; for (const k in keys) keys[k]=false; W.lvUps=(W.lvUps||0)+1;
  $('#lvTitle').textContent=`레벨 업! Lv.${L.n}`;
  $('#lvCards').innerHTML=L.cards.map((c,i)=>`<button class="upcard lv t${c.tier}" data-lv="${i}"><span class="n">${i+1}</span><span class="lv-tier">${['⬜ 일반','🟦 희귀','🟨 전설'][c.tier]}</span><span class="ic">${c.up[0].icon}</span><b>${esc(c.desc)}</b><small>${c.item?`📒 ${c.note} 다시 풀기`:c.kind==='ox'?'O/X 문제 1개':'4지선다 문제 1개'}</small></button>`).join('');
  $('#lvUp').hidden=false; blurAll(); UI_LOCK=performance.now()+QUIZ_LOCK_MS; SFX.wave(); fx.rise(P.x,P.z,0xffd34d,30);
}
function lvChoose(i){
  const L=FUN.lv, c=L.cards&&L.cards[i]; if (!c||performance.now()<UI_LOCK) return;
  L.card=c; L.cards=null; $('#lvUp').hidden=true;
  const item=c.item||(c.kind==='ox'?pick(['ox'],OX):pick(['mc'],MC));
  if (!item){ L.card=null; W.paused=false; return; }
  if (c.item){ const w=W.wrong.find(w=>w.item===c.item); if (w) w.pending=true; }
  openQuiz(item,{type:'lv',card:c});
  $('#qtag').textContent=`레벨업 카드 · ${c.name}`; $('#qtag').style.background=['#6b7280','#2f6fed','#c28a00'][c.tier];
}
function lvFx(ok,source){
  const c=source.card; if (!c) return {label:''};
  if (!ok) return {label:'카드 강화는 실패했어요 · 다음 레벨업에서 다시 도전!'};
  c.up.forEach(u=>u.go()); W.up.list.push(...c.up.map(u=>u.name));
  if (c.tier===2){ P.hp=P.max; }
  return {label:`${['일반','희귀','전설'][c.tier]} 카드 획득: ${c.desc}`};
}
function funClose(s,ok){
  if (s.type==='lv'){ const c=FUN.lv.card; FUN.lv.card=null; if (ok){ fx.rise(P.x,P.z,c&&c.tier===2?0xffd34d:0x9fd3ff,c&&c.tier===2?50:26); if (c&&c.tier===2) funBlast(true); SFX.correct(); } }
  if (s.type==='bossq'){ if (W.bg) W.bg.next=W.t+((liveBoss()&&liveBoss().shield>0)?7:14); W.bg.asking=false; }
  if (W.lastShield){ SFX.shield(); const b=W.lastShield; fx.burst(b.x,2.5,b.z,0x5cc8f0,34,8); fx.shock(b.x,b.z,4); shake=.3; W.lastShield=null; }
  W.paused=false; canvas.focus({preventScroll:true}); return true;
}
$('#lvCards').addEventListener('click',e=>{ const b=e.target.closest('[data-lv]'); if (b) lvChoose(+b.dataset.lv); });
addEventListener('keydown',e=>{
  if ($('#lvUp').hidden) return; e.stopPropagation();
  const m=/^(Digit|Numpad)([1-3])$/.exec(e.code); if (m){ e.preventDefault(); lvChoose(+m[2]-1); }
},true);

/* ---------- ③ 보스 퀴즈 결투 ---------- */
function duelAsk(boss){
  const b=W.bg; if (!b||b.asking) return;
  if (W.paused||!$('#quiz').hidden||!$('#lvUp').hidden){ b.next=W.t+1.5; return; }
  const item=pick(['mc'],MC)||pick(['ox'],OX); if (!item){ b.next=W.t+10; return; }
  b.asking=true; b.next=Infinity;
  SFX.wave(); fx.shock(boss.x,boss.z,6); fx.burst(boss.x,4,boss.z,0xc06bff,30,7); shake=.35;
  showBanner(boss.shield>0?'👑 보스가 문제를 냈어요! 맞히면 지식 방패가 깨져요':'👑 보스의 문제! 맞히면 보스가 휘청여요');
  setTimeout(()=>{ if (W.state!=='play'||!liveBoss()){ b.asking=false; return; } openQuiz(item,{type:'bossq'}); $('#qtag').textContent='👑 보스의 문제'; $('#qtag').style.background='#7b2fd0'; },900);
}
function duelSettle(ok,extras){
  const boss=liveBoss(); if (!boss) return;
  if (ok){
    if (boss.shield>0){ boss.shield--; W.lastShield=boss; extras.push(boss.shield>0?`지식 방패 파괴! 남은 방패 ${boss.shield}개`:'지식 방패가 모두 깨졌어요! 이제 공격이 통해요'); }
    boss.stun=GROGGY; boss.groggy=W.t+GROGGY; boss.slamT=0;
    extras.push(`보스가 ${GROGGY}초 동안 휘청여요 · 이때 공격하면 피해 ${GROGGY_DMG}배!`);
  } else {
    if (boss.shield<boss.shieldMax){ boss.shield++; extras.push(`보스가 분노했어요! 지식 방패가 하나 되살아났어요 (${boss.shield}개)`); }
    else extras.push('보스가 분노했어요!');
    boss.hp=Math.min(boss.max,boss.hp+Math.round(boss.max*.05));
  }
}

/* ---------- ⑤ 지식 도감 ---------- */
async function dexWrite(){
  if (!(AUTHMODE==='student'&&STUDENT&&fbDb)) return;
  const right=W.right||new Set(); const ref=fbDb.ref(`dex/${STUDENT.cid}/${STUDENT.num}`);
  try{
    const cur=(await withTimeout(ref.once('value'),8000)).val()||{}, up={}; let fresh=0;
    for (const q of right){ const k=noteKey(String(q).slice(0,300)); if (!cur[k]){ up[k]=1; fresh++; } }
    if (fresh) await withTimeout(ref.update(up),8000);
    const have=new Set([...Object.keys(cur),...Object.keys(up)]);
    const unitQs=MC.concat(OX,typeof CLS!=='undefined'?CLS:[],typeof LOC!=='undefined'?LOC:[]).filter(it=>it&&it.q);
    const got=unitQs.filter(it=>have.has(noteKey(String(it.q).slice(0,300)))).length;
    const el=$('#sDex'); if (el){ el.hidden=false; el.innerHTML=`📚 <b>지식 도감</b> ${fresh?`새 카드 <b>+${fresh}</b> · `:''}이 단원 ${got}/${unitQs.length}장 모음${got>=unitQs.length&&unitQs.length?' 🎉 완성!':''}`; }
    if (unitQs.length>=10 && got>=unitQs.length && typeof achGrant==='function') setTimeout(()=>achGrant(['dex']),1500);
  }catch(e){}
}

/* ---------- 매 프레임 · 화면 ---------- */
function funTick(dt){
  if (!NEWQ()) return;
  { const l=$('#nextLbl'); if (l) l.textContent='정답 몬스터까지'; const nc=$('#nextCard'); if (nc&&FUN.am&&!FUN.am.done) nc.hidden=true; }
  amTick();
  if (W.state==='play' && !W.paused && FUN.lv.pend>0 && $('#quiz').hidden && $('#prep').hidden && !W.loc && !W.revive) lvOpen();
  const L=FUN.lv, need=LV_NEED(L.n), t=QS_TIER(W.qs||0);
  $('#lvLv').textContent=`Lv.${L.n}`; $('#lvXp').style.width=Math.min(100,L.xp/need*100)+'%';
  $('#lvQs').textContent=(W.qs||0)>=1?`🔥 ${W.qs}연속${t?' · '+QS_NAME[t]:''}`:'';
  $('#lvQs').className='lv-qs t'+t;
}
