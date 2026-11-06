/* 사회 게임 RPG · 화면 표시(HUD) · 판 시작 · 결과 화면
   파일은 01 → 13 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요. */
/* ---------- UI ---------- */
function showBanner(t){ const b=$('#banner'); b.textContent=t; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
let chipKey='', shieldKey='';
function updateHUD(){
  $('#hpTxt').textContent=`${Math.ceil(P.hp)} / ${P.max}`;
  $('#hpBar').style.width=(P.hp/P.max*100)+'%';
  $('#waveTxt').textContent=`${Math.max(1,W.wave+1)}/${WAVES.length}`;
  $('#killTxt').textContent=W.kills;
  $('#corTxt').textContent=`${W.correct}/${W.asked}`;
  $('#nextCard').hidden=!!W.loc||!!W.prep;
  const bgOn=NEWQ()&&W.bg&&W.bg.st; $('#bgCard').hidden=!bgOn; if (bgOn) $('#bgTxt').textContent=Math.max(0,Math.ceil(W.bg.until-W.t));
  if (W.up && W.up.list.length) { /* 강화 목록은 칩으로 */ }
  $('#nextTxt').textContent=Math.max(0,Math.ceil(W.nextQuiz-W.t));
  const effs=W.effects.concat(MAPK==='defense'?TURRETS.filter(t=>W.t<t.until).map(t=>({label:t.title+(PEACE_RUN?' 정화 중':' 자동 공격'),until:t.until,good:true})):[]);
  if (W.up && W.up.list.length) effs.push({label:`강화 ${W.up.list.length}개`,good:true,noT:true});
  if (W.qshield>0) effs.push({label:`방어막 ${Math.ceil(W.qshield)}`,good:true,noT:true});
  if (JOB==='archer' && W.streak>0) effs.push({label:`${W.streak}연속 정답 · 치명타 ${Math.round(archerCrit()*100)}%${W.streak>=5?' · 관통':''}`,good:true,noT:true});
  if (JOB==='mage' && W.orbBoost>0) effs.push({label:`큰 구슬 ${W.orbBoost}개`,good:true,noT:true});
  const ck=effs.map(e=>e.label+(e.noT?'':Math.ceil(e.until-W.t))).join('|');
  if (ck!==chipKey){ chipKey=ck; $('#chips').innerHTML=effs.map(e=>`<span class="chip ${e.good?'good':'bad'}">${e.label}${e.noT?'':` · ${Math.ceil(e.until-W.t)}초`}</span>`).join(''); }
  const boss=liveBoss();
  $('#bossbar').hidden=!boss;
  if (boss){
    $('#bossHp').style.width=Math.max(0,boss.hp/boss.max*100)+'%';
    const sk=boss.shield+'/'+boss.shieldMax+NEWQ();
    if (sk!==shieldKey){ shieldKey=sk; $('#shields').innerHTML=Array.from({length:boss.shieldMax},(_,i)=>`<i class="${i<boss.shield?'':'off'}"></i>`).join('');
      $('#bossHelp').textContent=NEWQ()?(boss.shield>0?'보라색 빛줄기를 따라 수정으로 가서 퀴즈를 맞히면 보호막이 깨져요. 늦으면 보호막이 다시 생겨요!':'보호막이 모두 깨졌어요! 공격하세요. 수정 퀴즈를 맞히면 보스가 휘청여 피해 1.5배'):boss.shield>0?'퀴즈를 맞히면 보호막이 깨지고, 틀리면 되살아나요. 붉은 원이 보이면 피하세요!':'보호막이 모두 깨졌어요. 지금 공격하세요! 오답이면 보호막이 되살아나요.'; }
  }
  $('#gateCard').hidden=!W.gate||!!W.prep;
  if (MAPK==='island' && W.isl){ const S=W.isl, show=S.quota>0; $('#parcelRow').hidden=!show; if (show){ const cp=S.carry; $('#parcelTxt').textContent=`${S.done-0} / ${S.quota}`+(S.lost?` · 잃어버림 ${S.lost}`:'')+(PEACE_RUN&&S.stars?` · ★${S.stars}`:'')+(PEACE_RUN&&cp&&cp.due?(W.t<=cp.due?` · ⏱ ${Math.ceil(cp.due-W.t)}초`:' · ⏱ 늦었어요'):''); $('#parcelBar').style.width=(S.done/S.quota*100)+'%'; } }
  glHUD();
  if (MAPK==='defense'){ const dk=Math.max(0,W.door); $('#doorTxt').textContent=`${Math.ceil(dk)} / ${W.doorMax}`; $('#doorBar').style.width=(dk/W.doorMax*100)+'%'; }
  if (W.loc){
    const rem=W.loc.until-W.t;
    $('#locTime').textContent=Math.max(0,Math.ceil(rem))+'초';
    $('#locBar').style.width=Math.max(0,rem/LOC_TIME*100)+'%';
    $('#locCard').classList.toggle('hurry',rem<=8);
  }
}

function clearWorld(){
  mobs.forEach(removeMob); mobs=[];
  parcels.forEach(p=>{ if (p.mesh.parent) p.mesh.parent.remove(p.mesh); scene.remove(p.g); }); parcels=[]; if (W.isl) W.isl.carry=null;
  cards.forEach(c=>scene.remove(c.m)); cards=[];
}
function reset(){
  clearWorld();
  const st=MAPS[MAPK].start;
  Object.assign(P,{x:st[0],z:st[1],hp:100,fx:0,fz:-1,atkCd:0,swingT:0,combo:0,lastAtk:-9,buffer:false,pendingHit:null,lunge:0,dodgeT:0,dodgeCd:0,spinT:0,spinCd:0,spinHits:[],spinBuf:false,blockT:0,dashT:0,ultT:0,dodgeMax:1,spinMax:1,backstep:false}); P.max=jobInfo().hp; P.hp=P.max; hitStop=0; skKey=''; clearProj(); clearEBolts();
  Object.assign(W,{won:false,door:DOOR_HP,doorMax:DOOR_HP,doorWarnAt:0,revived:false,revive:null,invuln:0,t:0,paused:false,state:'play',wave:-1,nextWaveAt:1.2,gate:false,nextQuiz:timedEvery(),cardCoins:0,timedFlip:0,kills:0,correct:0,asked:0,effects:[],wrong:[],loc:null,spawnQ:[],runnerSeen:false,ult:0,streak:0,qshield:0,speedPts:0,right:new Set(),locLeftFrac:0,prep:null,up:{atk:1,spd:1,turret:0,list:[]},orbBoost:0,rangedSeen:false,stats:{dealt:0,taken:0,minHp:1,melee:0,ranged:0,boss:0,quiz:0,blocks:0,blocked:0,dodges:0,ults:0,evaded:0,shots:0,ws:[]}});
  W.used=new Set(); stations.forEach(s=>s.readyAt=0); bgReset(); $('#prep').hidden=true; chipKey=''; shieldKey=''; $('#chips').innerHTML='';
  $('#locCard').hidden=true; $('#gateCard').hidden=true;
  TURRETS.forEach(t=>{ t.until=0; t.cd=0; }); bolts.forEach(b=>scene.remove(b.mesh)); bolts=[]; doorFlash=0;
  $('#doorRow').hidden=MAPK!=='defense';
  $('#parcelRow').hidden=true; islReset(); glacierReset(); runnerReset(); stageReset(); twReset();
}
let NICK='', BAN='', CI=null;
try{ NICK=localStorage.getItem('gsd-nick')||''; }catch(e){}
$('#nick').value=NICK;
/* 학교·학급 목록 (선생님이 결과판에서 만들어요) */
let SCHOOLS={}, CLASSES={}, LEGACY=false;
const clsLabel=c=>`${c.grade}학년 ${c.cls}반`;
function classInfo(cid){
  if (!cid) return null;
  if (cid.startsWith('n:')) { const n=cid.slice(2); return {cid:'',sch:'',year:0,grade:0,cls:n,label:n+'반',legacy:true}; }
  const c=CLASSES[cid]; if (!c) return null; const sc=SCHOOLS[c.sid]||{};
  return {cid,ease:+sc.ease||0,sch:sc.name||'',year:c.year,grade:c.grade,cls:String(c.cls),label:`${sc.name?sc.name+' ':''}${c.grade}-${c.cls}`,short:`${c.grade}-${c.cls}`};
}
function fillSchools(){
  const act=Object.entries(CLASSES).filter(([k,c])=>!c.hidden&&SCHOOLS[c.sid]);
  LEGACY=!act.length;
  $('#noClassNote').hidden=!LEGACY; $('#loginBox').classList.toggle('disabled',LEGACY);
  if (LEGACY){
    $('#pkSchWrap').hidden=true; $('#classPick').classList.add('one');
    $('#pkCls').innerHTML='<option value="">반 선택</option>'+Array.from({length:15},(_,i)=>`<option value="n:${i+1}">${i+1}반</option>`).join('');
    return;
  }
  const sids=[...new Set(act.map(([k,c])=>c.sid))].sort((a,b)=>((SCHOOLS[a].order||0)-(SCHOOLS[b].order||0))||SCHOOLS[a].name.localeCompare(SCHOOLS[b].name,'ko'));
  $('#pkSchWrap').hidden=sids.length<2; $('#classPick').classList.toggle('one',sids.length<2);
  $('#pkSch').innerHTML=sids.map(id=>`<option value="${id}">${esc(SCHOOLS[id].name)}</option>`).join('');
  let saved=''; try{ saved=localStorage.getItem('gsd-sch')||''; }catch(e){}
  if (sids.includes(saved)) $('#pkSch').value=saved;
  fillClasses();
}
function fillClasses(){
  if (LEGACY) return;
  const sid=$('#pkSch').value;
  const list=Object.entries(CLASSES).filter(([k,c])=>!c.hidden&&c.sid===sid).sort((a,b)=>(b[1].year-a[1].year)||(a[1].grade-b[1].grade)||(a[1].cls-b[1].cls));
  const years=new Set(list.map(([k,c])=>c.year));
  $('#pkCls').innerHTML='<option value="">학급 선택</option>'+list.map(([k,c])=>`<option value="${k}">${years.size>1?c.year+'년 ':''}${clsLabel(c)}</option>`).join('');
  let saved=''; try{ saved=localStorage.getItem('gsd-cid')||''; }catch(e){}
  if (list.some(([k])=>k===saved)) $('#pkCls').value=saved;
}
$('#pkSch').addEventListener('change',()=>{ try{ localStorage.setItem('gsd-sch',$('#pkSch').value); }catch(e){} fillClasses(); });
$('#pkCls').addEventListener('change',()=>{ try{ localStorage.setItem('gsd-cid',$('#pkCls').value); }catch(e){} $('#nickErr').hidden=true; lgError(''); updateGateUI(); });
function loadClasses(){
  if (!fbDb){ CLASSES={}; fillSchools(); return; }
  Promise.all([fbDb.ref('schools').once('value'),fbDb.ref('classes').once('value')])
    .then(([a,b])=>{ SCHOOLS=a.val()||{}; CLASSES=b.val()||{}; fillSchools(); })
    .catch(()=>{ SCHOOLS={}; CLASSES={}; fillSchools(); });
}
function skillKey(){ return 'gsd-skill:'+BAN+'|'+NICK; }
function loadSkill(){ if (STUDENT&&PROFILE){ const v=+PROFILE.skill; return isFinite(v)&&v>0?Math.min(1.25,Math.max(.7,v)):1; } try{ const v=parseFloat(localStorage.getItem(skillKey())); return isFinite(v)?Math.min(1.25,Math.max(.7,v)):1; }catch(e){ return 1; } }
function updateSkill(win){
  if (MODE==='hero') return DIFF;
  let r=DIFF;
  if (win) r+= P.hp>60 ? .1 : .05; else r-= W.revived ? .1 : .07;
  r=Math.min(1.25,Math.max(.7,r));
  if (!STUDENT){ try{ localStorage.setItem(skillKey(),String(r)); }catch(e){} }
  return r;
}
function startGame(){
  if (!assetsReady) return;
  SFX.init();
  if (AUTHMODE==='student' && STUDENT && PROFILE){
    CI=classInfo(STUDENT.cid)||{cid:STUDENT.cid,sch:'',year:0,grade:0,cls:'',label:'',short:''};
    NICK=`${STUDENT.num} ${PROFILE.name}`; BAN=STUDENT.cid;
    $('#hudNick').textContent=`Lv.${levelOf(PROFILE.xp).lv} · ${CI.short||''} ${PROFILE.name}`;
  } else if (AUTHMODE==='guest'){
    const v=$('#nick').value.trim(), c=$('#pkCls').value;
    if (!v||!c){ $('#nickErr').hidden=false; (c?$('#nick'):$('#pkCls')).focus(); return; }
    CI=classInfo(c); NICK=v; BAN=CI.cid||('n'+CI.cls); $('#nickErr').hidden=true; $('#hudNick').textContent=`연습 · ${CI.short||CI.label} ${NICK}`;
    try{ localStorage.setItem('gsd-nick',NICK); }catch(e){}
  } else {
    if (AUTHMODE==='name'){ $('#pfErr').hidden=false; $('#pfErr').textContent='이름을 먼저 저장해 주세요.'; $('#pfName').focus(); }
    else { lgError('번호와 코드로 로그인해 주세요.'); $('#lgCode').focus(); }
    return;
  }
  readLevel(); if (LEVEL==='hero' && !HERO_OPEN) LEVEL='normal';
  MODE = PARTY.on || LEVEL==='hero' ? 'hero' : 'normal';   // 파티 판은 늘 영웅 모드 이상
  DIFF = loadSkill();
  EASEF = EASES[MODE==='hero'?0:Math.min(2,Math.max(0,(CI&&CI.ease)|0))];
  LOC_TIME = MODE==='hero' ? HERO.loc : Math.round(25*(DIFF<1? 1+(1-DIFF)*.8 : 1))+EASEF.loc;
  document.body.classList.toggle('hero',MODE==='hero');
  { applyPlay(); const pu=DATA.units.find(u=>u.id===playUnit); applyZoneCfg(zcfgOf(pu)); setMap(PARTY.on?'conquest':STG.joining?'stage':TWC.joining?'teamwar':(PLAYMAP||mapOf(pu))); }
  PEACE_RUN=PEACE && PEACE_MAPS.includes(MAPK);
  if (PEACE_RUN) WAVES=WAVESETS[MAPK+'_peace'];
  document.body.classList.toggle('peace',PEACE_RUN); document.body.classList.toggle('aim-mouse',JOB==='archer'&&!PEACE_RUN);
  startQualityMonitor();
  applyLook(jobLook()); applyJobHUD(); loadParts('rogue').catch(()=>{});
  $('#title').hidden=true; $('#end').hidden=true;
  ['#hud','#hint','#touch','#skillbar'].forEach(s=>$(s).hidden=false);
  setTimeout(()=>{ W.snapCam=true; },0);
  if (PEACE_RUN) $('#hint').textContent='🕊️ 평화 모드 · WASD 이동 · Shift '+(JOB==='knight'?'막기':'구르기')+' · '+(MAPK==='island'?'상자에 다가가면 집어요 · 배달 깔개에 서면 배달':'빛나는 수정에 다가가 퀴즈를 맞혀 포탑을 깨워요');
  reset(); canvas.focus({preventScroll:true});
  try{ applyMood(!PARTY.on&&MAPK==='glacier'?'arctic':pickMood(PARTY.on?PARTY.rid:'')); }catch(e){}
  // 한 판 시간 제한: 선생님이 '게임 열기'에서 정한 분(퀴즈 푸는 시간 포함, 실제 시계 기준)
  { const g=!PARTY.on&&MAPK!=='stage'&&MAPK!=='teamwar'&&typeof activeGate==='function'?activeGate():null, lim=g&&g.lim>0?g.lim:0;
    W.lim=lim; W.limEnd=lim?performance.now()+lim*60000:0; W.limWarn=0; W.timeUp=false; $('#timeCard').hidden=!lim; $('#timeCard').classList.remove('hurry'); }
}
/* 남은 시간 (매 프레임, 퀴즈 중에도 흘러요) */
function limitTick(){
  if (W.state!=='play' || !W.limEnd || PARTY.on) return;
  const rem=W.limEnd-performance.now(), s=Math.max(0,Math.ceil(rem/1000));
  $('#timeTxt').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  $('#timeCard').classList.toggle('hurry',s<=30);
  if (s<=60 && W.limWarn<1){ W.limWarn=1; showBanner('1분 남았어요!'); }
  if (s<=30 && W.limWarn<2){ W.limWarn=2; flashPrompt('30초 남았어요! 서둘러요',2.5); }
  if (rem>0) return;
  // 퀴즈 창이 열려 있으면 그 문제까지는 풀고 끝나요
  if (!$('#quiz').hidden){ $('#timeTxt').textContent='이 문제까지!'; return; }
  W.timeUp=true; endGame(false);
}
function esc(s){ return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function questionText(item){ return item.kind==='cls' ? `“${item.q}” ${ZCFG.q}` : item.kind==='ox' ? `[O/X] ${item.q}` : item.q; }
function pct(r){ return r.asked?Math.round(r.correct/r.asked*100):0; }
function resultText(r){
  return `[사회 게임 RPG 결과]\n닉네임: ${r.nick}\n단원: ${r.unit}\n결과: ${r.win?'승리':'게임 오버'} · 점수 ${r.score}점\n정답: ${r.correct}/${r.asked} (${pct(r)}%) · 처치 ${r.kills} · 시간 ${r.time}\n`+
    (r.wrong.length?`복습할 문제:\n`+r.wrong.map((q,i)=>`${i+1}) ${q}`).join('\n'):'복습할 문제: 없음')+`\n기록 시각: ${r.when}`;
}
function submitUrl(r){
  return '';
  const base=(DATA.settings&&DATA.settings.submitUrl)||'';
  if (!/^https:\/\//.test(base)) return '';
  const map={'닉네임':r.nick,'단원':r.unit,'결과':r.win?'승리':'게임 오버','점수':r.score,'정답':r.correct,'문제수':r.asked,'정답률':pct(r)+'%','처치':r.kills,'시간':r.time,'틀린문제':r.wrong.join(' / ')||'없음'};
  return base.replace(/\{(닉네임|단원|결과|점수|정답|문제수|정답률|처치|시간|틀린문제)\}/g,(m,k)=>encodeURIComponent(String(map[k])));
}

/* 난이도 고르기: 쉬움 · 보통 · 어려움 · 영웅(선생님이 열었을 때만) */
function renderLevels(){
  const box=$('#modePick'); if (!box) return;
  if (LEVEL==='hero' && !HERO_OPEN) LEVEL='normal';
  $('#modeHeroL').hidden=!HERO_OPEN; box.classList.toggle('three',!HERO_OPEN);
  box.querySelectorAll('input[name=mode]').forEach(i=>{ i.checked=i.value===LEVEL; i.nextElementSibling.querySelector('small').textContent=LEVELS[i.value].desc; });
}
function readLevel(){ const i=document.querySelector('#modePick input[name=mode]:checked'); if (i && LEVELS[i.value]) LEVEL=i.value; }
$('#modePick').addEventListener('change',()=>{ readLevel(); try{ localStorage.setItem('gsd-level',LEVEL); }catch(e){} });
renderLevels();
