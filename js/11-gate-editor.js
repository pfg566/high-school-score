/* 사회 게임 RPG · 게임 열기 · 단원·맵 고르기 · 문제 관리
   파일은 01 → 13 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요. */
/* ---------- 게임 열기: 선생님이 연 동안만, 정한 판 수만큼 시작할 수 있어요 ---------- */
let GATE={}, GATE_OK=null, SOFF=0, PLOG={}, plogRef=null, starting=false;
function gateKey(){ if (AUTHMODE==='student'&&STUDENT) return STUDENT.cid; const c=$('#pkCls').value; return c&&!c.startsWith('n:')?c:''; }
function activeGate(){
  const now=Date.now()+SOFF, k=gateKey();
  for (const key of [k,'all']){ if (!key) continue; const g=GATE[key]; if (g && +g.until>now) return {key,sid:g.sid||'',plays:+g.plays||0,lim:+g.lim||0,until:+g.until,left:+g.until-now}; }
  return null;
}
function playsUsed(g){
  if (!g||!g.sid) return 0;
  if (AUTHMODE==='student'&&STUDENT) return +PLOG[g.sid]||0;
  try{ return +localStorage.getItem('gsd-pl-'+g.sid)||0; }catch(e){ return 0; }
}
function playsLeft(g){ if (!g) return 0; if (!g.sid||!g.plays||g.plays>=999) return Infinity; return Math.max(0,g.plays-playsUsed(g)); }
function gateOpen(){ if (isAdmin || !fbDb || GATE_OK===false) return true; const g=activeGate(); return !!g && playsLeft(g)>0; }
function watchPlog(){
  if (plogRef){ plogRef.off(); plogRef=null; } PLOG={};
  if (!(AUTHMODE==='student'&&STUDENT&&fbDb)) return;
  plogRef=fbDb.ref(`playlog/${STUDENT.cid}/${STUDENT.num}`);
  plogRef.on('value',s=>{ PLOG=s.val()||{}; updateGateUI(); },()=>{ PLOG={}; });
}
function updateGateUI(){
  const b=$('#startBtn'), note=$('#gateNote'); if (!note) return;
  if (!assetsReady){ note.hidden=true; return; }
  if (starting){ b.disabled=true; b.textContent='확인 중…'; return; }
  if (isAdmin){ b.disabled=false; b.textContent='게임 시작'; note.hidden=false; note.className='gatenote teacher'; note.textContent='선생님 계정이라 언제든, 몇 판이든 시작할 수 있어요.'; return; }
  if (!fbDb || GATE_OK===false){ b.disabled=false; b.textContent='게임 시작'; note.hidden=true; return; }
  if (GATE_OK===null){ b.disabled=true; b.textContent='확인 중…'; note.hidden=true; return; }
  const g=activeGate(); note.hidden=false;
  if (!g){ b.disabled=true; b.textContent='🔒 선생님이 열면 시작할 수 있어요'; note.className='gatenote shut';
    note.textContent=AUTHMODE==='guest'&&!gateKey()?'학급을 고르면 열렸는지 확인할 수 있어요.':'지금은 수업 시간이에요. 선생님이 게임을 열면 이 버튼이 켜져요. 상점 구경은 언제든 할 수 있어요.'; return; }
  const m=Math.ceil(g.left/60000), left=playsLeft(g);
  if (left<=0){ b.disabled=true; b.textContent='이번 시간에 할 판을 다 했어요'; note.className='gatenote shut';
    note.textContent=`🎉 오늘 정해진 ${g.plays}판을 모두 했어요. 더 하고 싶으면 선생님께 '한 판 더'를 부탁하세요. (게임 시간 ${m}분 남음)`; return; }
  b.disabled=false; b.textContent=left===Infinity?'게임 시작':`게임 시작 · 남은 판 ${left}`; note.className='gatenote open';
  note.textContent=left===Infinity?`🔓 게임 시간이에요 · ${m}분 남았어요`:`🔓 게임 시간이에요 · ${m}분 남음 · 이번 시간에 ${g.plays}판 중 ${g.plays-left}판 했어요`;
}
function watchGate(){
  if (!fbDb) return;
  try{ fbDb.ref('.info/serverTimeOffset').on('value',s=>{ SOFF=+s.val()||0; }); }catch(e){}
  fbDb.ref('playgate').on('value',s=>{ GATE=s.val()||{}; GATE_OK=true; updateGateUI(); applyPlay(); },()=>{ GATE_OK=false; updateGateUI(); });
}
/* 판 하나를 쓰고 시작 */
async function tryStart(){
  if (!assetsReady || starting) return;
  if (isAdmin || !fbDb || GATE_OK===false){ startGame(); return; }
  const g=activeGate();
  if (!g || playsLeft(g)<=0){ if (!$('#end').hidden) $('#homeBtn').click(); updateGateUI(); return; }
  if (!g.sid || playsLeft(g)===Infinity){ startGame(); return; }
  if (AUTHMODE==='student'&&STUDENT){
    starting=true; updateGateUI();
    const ref=fbDb.ref(`playlog/${STUDENT.cid}/${STUDENT.num}/${g.sid}`);
    try{ const cur=+((await withTimeout(ref.once('value'),8000)).val())||0;
      if (cur>=g.plays){ PLOG[g.sid]=cur; starting=false; if (!$('#end').hidden) $('#homeBtn').click(); updateGateUI(); return; }
      await withTimeout(ref.set(cur+1),8000); PLOG[g.sid]=cur+1; }
    catch(e){ starting=false; updateGateUI(); lgError(''); $('#gateNote').hidden=false; $('#gateNote').className='gatenote shut'; $('#gateNote').textContent='시작하지 못했어요. 인터넷을 확인하고 다시 눌러 주세요. (판 수를 다 썼거나 시간이 끝났을 수도 있어요)'; return; }
    starting=false; startGame(); return;
  }
  // 연습 모드: 이 기기에서만 셉니다
  if (AUTHMODE==='guest'){ const v=$('#nick').value.trim(), c=$('#pkCls').value; if (v&&c){ try{ localStorage.setItem('gsd-pl-'+g.sid,String(playsUsed(g)+1)); }catch(e){} } }
  startGame();
}
setInterval(()=>{ if (W.state!=='play'){ updateGateUI(); const c=DATA&&DATA.units&&DATA.units.length?playChoice():null; if (c&&c.u&&(c.u.id!==playUnit||c.m!==PLAYMAP)) applyPlay(); } },2000);

function saveHistory(r){
  try{ const h=JSON.parse(localStorage.getItem('gsd-history')||'[]'); h.unshift({nick:r.nick,score:r.score,correct:r.correct,asked:r.asked,win:r.win,when:r.when}); localStorage.setItem('gsd-history',JSON.stringify(h.slice(0,20))); }catch(e){}
}
function renderHistory(){
  let h=[]; try{ h=JSON.parse(localStorage.getItem('gsd-history')||'[]'); }catch(e){}
  const box=$('#history'); box.hidden=!h.length; if (!h.length) return;
  box.innerHTML='<h2>이 기기의 최근 기록</h2><ol>'+h.slice(0,5).map(x=>`<li><span>${esc(x.when)} · ${esc(x.nick)} · ${x.win?'승리':'게임 오버'}</span><b>${x.score}점 · ${x.correct}/${x.asked}</b></li>`).join('')+'</ol>';
}
renderHistory();
function endGame(win){
  $('#rewardBox').hidden=true;
  if (MAPK==='runner') runEndUI();
  if (MAPK==='stage') stgEndUI();
  if (MAPK==='teamwar') twEndUI();
  W.state='end'; W.paused=true; W.loc=null; W.prep=null; $('#timeCard').hidden=true; $('#prep').hidden=true; $('#locIntro').hidden=true; $('#reviveIntro').hidden=true;
  $('#locCard').hidden=true; $('#gateCard').hidden=true; $('#bossbar').hidden=true; $('#prompt').hidden=true;
  const tu=!win&&!!W.timeUp, wc=tu?Math.max(0,W.wave+(W.gate||W.prep?1:0)):0;
  $('#endEyebrow').textContent=win?'승리':tu?'시간 종료':'게임 오버';
  W.won=!!win;
  $('#endTitle').textContent=win?(PEACE_RUN?PEACE_TXT[MAPK].winTitle:MAPS[MAPK].winTitle):tu?'시간이 다 됐어요!':(MAPK==='defense'&&W.door<=0?'성문이 무너졌어요':MAPK==='glacier'&&W.gl&&!glAlive().length?'빙하가 모두 녹았어요':MAPK==='runner'?'하트를 모두 잃었어요':MAPK==='stage'?'목숨을 모두 잃었어요':MAPK==='teamwar'?'아쉬운 패배':'체력이 모두 닳았어요');
  $('#endMsg').textContent=win?(PEACE_RUN?PEACE_TXT[MAPK].winMsg:MAPS[MAPK].winMsg):tu?(MAPK==='runner'?`${RUN.n}문제 중 ${RUN.done}문제를 지나왔어요. 아래 틀린 문제를 복습해 보세요.`:`${WAVES.length}웨이브 중 ${wc}웨이브를 깼어요. 깬 웨이브마다 100점을 더 받아요. 아래 틀린 문제를 복습해 보세요.`):MAPK==='runner'?'틀린 문제를 다시 읽어 보고 한 번 더 달려 봐요.':MAPK==='stage'?'틀린 문제를 다시 읽어 보고 다음 판에 도전해요.':MAPK==='teamwar'?'잘 싸웠어요! 다음 판에는 조원들과 작전을 짜 봐요.':'퀴즈를 맞히면 회복하거나 더 강해질 수 있어요. 아래 틀린 문제를 복습하고 다시 도전해 보세요.';
  $('#sKills').textContent=W.kills; $('#sCorrect').textContent=`${W.correct}/${W.asked}`;
  const s=Math.floor(W.t); $('#sTime').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const rv=$('#review');
  if (!W.wrong.length) rv.innerHTML = W.asked ? '<div class="allgood">틀린 문제가 하나도 없어요. 완벽해요!</div>' : '';
  else {
    const list=[...W.wrong].sort((a,b)=>a.fixed-b.fixed);
    rv.innerHTML=`<h2>틀린 문제 다시 보기 (${W.wrong.length})</h2><ol>`+list.map(w=>
      `<li><span class="badge ${w.fixed?'fixed':'todo'}">${w.fixed?'다시 맞힘':'복습 필요'}</span><p class="rq">${esc(questionText(w.item))}</p><p class="ra">정답: <b>${esc(correctText(w.item))}</b></p><p class="re">${esc(w.item.e)}</p></li>`).join('')+'</ol>';
  }
  const unit=DATA.units.find(u=>u.id===playUnit);
  const fixedN=W.wrong.filter(w=>w.fixed).length;
  const gls=glScore(), rnb=MAPK==='runner'?{pts:RUN.coinsN*2+RUN.maxCombo*20,c:RUN.coinsN,m:RUN.maxCombo}:null;
  const dlv=MAPK==='island'&&W.isl?W.isl.delivered:0, stars=PEACE_RUN&&W.isl?(W.isl.stars|0):0;
  // 점수는 퀴즈 중심: 정답 · 빠른 정답 · 정답률 보너스가 대부분이고, 몬스터 처치는 조금만
  const spd=Math.round(W.speedPts||0), accK=accBonusK(W.correct,W.asked), quizPts=W.correct*100+fixedN*50+spd, accPts=Math.round(quizPts*accK);
  const rateP=W.asked?Math.round(W.correct/W.asked*100):0;
  const score=Math.round((quizPts+accPts+W.kills*2+dlv*30+stars*30+gls.pts+(rnb?rnb.pts:0)+(win?300:0)+wc*50+(PARTY.on?PARTY.bonus:0))*(MODE==='hero'?HERO.score:LEVELS[LEVEL].score));
  $('#sScoreNote').textContent=`정답 100점 · 빠른 정답 +${spd}점 · 다시 맞힘 50점(${fixedN}개) · 정답률 ${rateP}% 보너스 +${Math.round(accK*100)}%(${accPts}점) · 처치 2점`+(MAPK==='island'?` · 배달 30점(${dlv}개)`:'')+(rnb?` · 최고 ${rnb.m}연속×20 + 코인 ${rnb.c}개×2(${rnb.pts}점)`:'')+(MAPK==='glacier'?` · 남은 빙하 ${gls.alive}개×30 + 평균 ${gls.avg}%(${gls.pts}점)`:'')+(stars?` · 별 30점(${stars}개)`:'')+(PEACE_RUN?' · 평화 모드':'')+(PARTY.on?` · 거점 지키기 +${PARTY.bonus}점`:'')+(tu?` · 깬 웨이브 50점(${wc}개)`:' · 승리 300점')+(PARTY.on||MODE==='hero'?' · 영웅 ×1.5':LEVEL!=='normal'?` · ${LEVELS[LEVEL].name} ×${LEVELS[LEVEL].score}`:'');
  if (MAPK==='island'&&W.isl) $('#endMsg').textContent=`택배 ${W.isl.delivered}개 배달`+(stars?` · 제시간 배달 ★${stars}`:'')+(W.isl.lost?` · 도둑에게 ${W.isl.lost}개 잃어버림`:'')+'. '+$('#endMsg').textContent;
  const newSkill=PARTY.on||tu?loadSkill():updateSkill(win);
  const d=new Date();
  const when=`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  lastResult={diff:DIFF,mode:MODE,lv:PARTY.on?'hero':LEVEL,nick:NICK,cls:CI.cls,cid:CI.cid,sch:CI.sch,grade:CI.grade,year:CI.year,label:CI.label,unit:unit?unit.name:'',unitId:playUnit,win,score,correct:W.correct,asked:W.asked,kills:W.kills,sp:spd,acc:accK,
    time:$('#sTime').textContent,timeSec:s,when,wrong:W.wrong.filter(w=>!w.fixed).map(w=>w.item.q),
    job:JOB+(JOB==='mage'?':'+MELEM:''),map:MAPK,ease:easeIdx(),cs:combatStats()};
  $('#endWho').textContent=`${CI.label} ${NICK} · ${lastResult.unit} · ${when}`;
  saveResult(lastResult);
  try{ boardWrite(lastResult); }catch(e){}
  try{ notesWrite(); }catch(e){}
  grantRewards({...lastResult,newSkill},fixedN);
  $('#sScore').textContent=score;
  $('#copyStatus').textContent=''; $('#copyText').hidden=true;
  const url=submitUrl(lastResult), a=$('#submitLink');
  a.hidden=!url; if (url) a.href=url;
  saveHistory(lastResult);
  $('#end').hidden=false;
  $('#end .panel').scrollTop=0;
  setTimeout(()=>$('#againBtn').focus({preventScroll:true}),30);
}
$('#startBtn').addEventListener('click',tryStart);
$('#nick').addEventListener('input',()=>{ $('#nickErr').hidden=true; });
$('#homeBtn').addEventListener('click',()=>{ $('#end').hidden=true; showAuthUI(); ['#hud','#hint','#touch','#skillbar'].forEach(s=>$(s).hidden=true); W.state='title'; renderHistory(); $('#title').hidden=false; $('#nick').focus(); });
let lastResult=null;
$('#copyBtn').addEventListener('click',()=>{
  if (!lastResult) return;
  const text=resultText(lastResult), ta=$('#copyText');
  const fallback=()=>{ ta.hidden=false; ta.value=text; ta.focus(); ta.select(); $('#copyStatus').className='ed-status ok'; $('#copyStatus').textContent='아래 글을 길게 누르거나 Ctrl+C로 복사하세요.'; };
  try{ navigator.clipboard.writeText(text).then(()=>{ $('#copyStatus').className='ed-status ok'; $('#copyStatus').textContent='복사했어요. 선생님이 알려준 곳에 붙여넣으세요.'; },fallback); }catch(e){ fallback(); }
});
$('#againBtn').addEventListener('click',tryStart);

/* ---------- 문제은행(단원별) 불러오기 · 문제 관리 ---------- */
const TYPES={
  mc:{label:'4지선다',desc:'정비 시간, 웨이브를 여는 거점 기둥, 돌발 퀴즈(50초마다), 보스 수정에서 나와요. 거점을 정해 두면 그 거점의 기둥에서 주로 나오고, "공통"은 어디서나 나와요.',
      cols:['거점(본사/연구소/생산 공장/공통)','문제','정답','오답1','오답2','오답3','해설']},
  loc:{label:'위치 퀴즈',desc:'상황을 읽고 알맞은 거점 바닥으로 직접 달려가는 문제예요. 웨이브 사이 정비 시간마다 첫 문제로 나와요.',
      cols:['상황','정답 거점(본사/연구소/생산 공장)','해설']},
  ox:{label:'O/X',desc:'몬스터가 떨어뜨린 지식 카드를 주우면 나와요. 10초 안에 풀어야 해요.',
      cols:['문장','정답(O/X)','해설']},
  cls:{label:'분류',desc:'어떤 변화가 "공장이 들어선 지역"과 "공장이 빠져나간 지역" 중 어디의 모습인지 고르는 문제예요. 지식 카드에서 나와요.',
      cols:['변화 문장','정답(들어선/빠져나간)','해설']}
};
const ZOPTS=[['hq','본사'],['lab','연구소'],['fac','생산 공장'],['any','공통']];
function zopts(){ const c=zcfgOf(curU()); return [['hq',c.n[0]],['lab',c.n[1]],['fac',c.n[2]],['any','공통']]; }
const DEFAULT_UNIT_NAME='중3 사회2 · IX-2 다국적 기업의 공간적 분업';
const defaultBank=()=>JSON.parse(JSON.stringify({mc:DEF_MC,ox:DEF_OX,cls:DEF_CLS,loc:DEF_LOC}));
const emptyBank=()=>({mc:[],ox:[],cls:[],loc:[]});
const isReady=u=>MAPS[mapOf(u)].need.every(k=>u.bank[k].length>0);
const countOf=b=>b.mc.length+b.loc.length+b.ox.length+b.cls.length;

/* 저장 형식: {version:2, active, units:[{id,name,bank}]} — 예전 형식(문제은행 하나)도 첫 단원으로 읽어요 */
function normalize(d){
  if (looksLikeBank(d)) return {version:2,active:'u1',units:[{id:'u1',name:DEFAULT_UNIT_NAME,map:'zones',bank:d}],settings:{submitUrl:''}};
  if (d && d.units && typeof d.units==='object'){
    const arr=x=>Array.isArray(x)?x.filter(Boolean):(x&&typeof x==='object'?Object.values(x):[]);
    const units=arr(d.units).filter(u=>u&&typeof u.id==='string').map(u=>{ const b=u.bank||{}; return {id:u.id,name:String(u.name||'이름 없는 단원'),map:MAPS[u.map]?u.map:(u.id==='u1'?'zones':'general'),...(u.zcfg&&typeof u.zcfg==='object'?{zcfg:zcfgOf(u)}:{}),
      bank:{mc:arr(b.mc).map(x=>({...x,o:arr(x.o)})),ox:arr(b.ox),cls:arr(b.cls),loc:arr(b.loc)}}; });
    if (units.length){ const active=units.some(u=>u.id===d.active&&isReady(u))?d.active:(units.find(isReady)||units[0]).id; const su=d.settings&&typeof d.settings.submitUrl==='string'&&/^https:\/\//.test(d.settings.submitUrl)?d.settings.submitUrl:''; return {version:2,active,units,settings:{submitUrl:su}}; }
  }
  return null;
}
let DATA={version:2,active:'u1',units:[{id:'u1',name:DEFAULT_UNIT_NAME,map:'zones',bank:defaultBank()}],settings:{submitUrl:''}};
let playUnit='u1';
let ED=null, edUnit='u1', edTab='mc', resetArmed=false, delArmed=false;

function useUnit(id){
  const u=DATA.units.find(x=>x.id===id&&isReady(x)) || DATA.units.find(x=>x.id===DATA.active) || DATA.units[0];
  playUnit=u.id; applyBank(u.bank); applyZoneCfg(zcfgOf(u));
  $('#unitEyebrow').innerHTML=`${esc(u.name)}<span class="mapname">${MAPS[mapOf(u)].name}</span>`;
  if (W.state!=='play') setMap(mapOf(u));
  updateBankInfo();
}
function setMap(k){
  if (!MAPS[k]) k='zones';
  if (k!==MAPK){ clearWorld(); bolts.forEach(b=>scene.remove(b.mesh)); bolts=[]; }
  MAPK=k;
  ensureMap(k);
  for (const g in mapGroups) mapGroups[g].visible=g===k;
  bgGroup.visible=!['island','glacier','runner','stage','teamwar'].includes(k); ground.visible=!['glacier','runner','stage','teamwar'].includes(k);
  colliders=MAPSTATE[k].colliders; stations=MAPSTATE[k].stations; npcs=MAPSTATE[k].npcs;
  WAVES=wavesFor(k==='zones'?(MAPS.zones.waves||'zones'):k);
  const M=MAPS[k];
  $('#mapDesc').textContent=M.desc; $('#mapZones').hidden=k!=='zones';
  $('#mapRules').innerHTML=M.rules.concat(['<b>조작:</b> 스페이스 연타 = 3단 콤보(마지막 타가 가장 세요) · Shift = 구르기(잠깐 무적) · E = 회전 베기(8초마다)']).map(r=>`<li>${r}</li>`).join('');
  $('#gateCard').textContent=M.gateText;
  $('#bossName').textContent=WAVES[WAVES.length-1].name;
  if (W.state!=='play'){ P.x=M.start[0]; P.z=M.start[1]; }
}
let FREE_PLAY=false, PLAYMAP=null, PICK={};
try{ PICK=JSON.parse(localStorage.getItem('gsd-pick')||'{}')||{}; }catch(e){ PICK={}; }
const MAP_ORDER=['zones','general','defense','island','glacier','runner'];
const mapOK=(u,k)=>!!(u&&MAPS[k]&&MAPS[k].need.every(t=>u.bank[t]&&u.bank[t].length>0));
function playChoice(){
  const byId=id=>DATA.units.find(u=>u.id===id), ready=DATA.units.filter(isReady);
  const def=()=>{ const u=byId(DATA.active)&&isReady(byId(DATA.active))?byId(DATA.active):ready[0]||DATA.units[0]; return u; };
  if (isAdmin || FREE_PLAY){ let u=byId(PICK.unit); if (!u||!isReady(u)) u=def(); return {u,m:mapOK(u,PICK.map)?PICK.map:mapOf(u),free:true,src:FREE_PLAY?'free':'admin'}; }
  const g=activeGate(), raw=g&&GATE[g.key];
  if (raw && raw.unit){ const u=byId(raw.unit); if (u&&isReady(u)) return {u,m:mapOK(u,raw.map)?raw.map:mapOf(u),free:false,src:'gate'}; }
  const u=def(); return {u,m:mapOf(u),free:false,src:'default'};
}
function applyPlay(){
  if (!DATA||!DATA.units||!DATA.units.length) return;
  const c=playChoice(); if (!c.u) return;
  if (c.u.id!==playUnit) useUnit(c.u.id);
  PLAYMAP=c.m; if (W.state!=='play' && MAPK!==c.m) setMap(c.m);
  $('#unitEyebrow').innerHTML=`${esc(c.u.name)}<span class="mapname">${MAPS[c.m].name}</span>`;
  renderUnitPicker(c); updateBankInfo(); refreshStyle();
}
function refreshStyle(){
  const ok=PEACE_MAPS.includes(MAPK), on=ok&&PEACE, M=MAPS[MAPK], T=PEACE_TXT[MAPK];
  $('#stylePick').hidden=!ok;
  $('#stylePick').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.style==='peace')===on)));
  $('#mapDesc').textContent=on?T.desc:M.desc;
  $('#mapRules').innerHTML=(on?T.rules:M.rules).concat([on?'<b>조작:</b> WASD 이동 · Shift 구르기(기사는 막기) · 공격 버튼은 쓰지 않아요':'<b>조작:</b> 스페이스 연타 = 3단 콤보(마지막 타가 가장 세요) · Shift = 구르기(잠깐 무적) · E = 회전 베기(8초마다)']).map(r=>`<li>${r}</li>`).join('');
}
$('#stylePick').addEventListener('click',e=>{ const b=e.target.closest('[data-style]'); if (!b) return; PEACE=b.dataset.style==='peace'; try{ localStorage.setItem('gsd-peace',PEACE?'1':'0'); }catch(_){} refreshStyle(); });
function renderUnitPicker(c){
  c=c||playChoice(); if (!c||!c.u) return;
  const ready=DATA.units.filter(isReady);
  $('#unitPick').hidden=!c.free||ready.length<2; $('#mapPick').hidden=!c.free;
  $('#unitSelect').innerHTML=ready.map(u=>`<option value="${esc(u.id)}"${u.id===c.u.id?' selected':''}>${esc(u.name)}${u.id===DATA.active?' (수업 단원)':''}</option>`).join('');
  $('#mapSelect').innerHTML=MAP_ORDER.filter(k=>mapOK(c.u,k)).map(k=>`<option value="${k}"${k===c.m?' selected':''}>${MAPS[k].name}</option>`).join('');
  $('#ppLock').textContent=c.src==='gate'?'🔒 선생님이 정한 단원과 맵이에요':c.src==='default'?'🔒 선생님이 정한 수업 단원이에요':c.src==='admin'?'⚙️ 선생님 계정이라 단원과 맵을 바꿀 수 있어요':'🗺️ 자유 플레이: 단원과 맵을 골라 보세요';
}
$('#mapSelect').addEventListener('change',e=>{ PICK.map=e.target.value; try{ localStorage.setItem('gsd-pick',JSON.stringify(PICK)); }catch(_){} applyPlay(); });
function updateBankInfo(){
  $('#bankInfo').textContent= MAPK==='zones' ? `문제 ${MC.length+LOC.length+OX.length+CLS.length}개 · 4지선다 ${MC.length} · 위치 ${LOC.length} · O/X ${OX.length} · 분류 ${CLS.length}` : `문제 ${MC.length+OX.length}개 · 4지선다 ${MC.length} · O/X ${OX.length}`;
}
$('#unitSelect').addEventListener('change',e=>{ PICK={unit:e.target.value,map:''}; try{ localStorage.setItem('gsd-pick',JSON.stringify(PICK)); }catch(_){} applyPlay(); });
/* 화면 속도(FPS) 표시: 설정 창에서 켜요 */
const FPS={on:false,n:0,t:performance.now()};
try{ FPS.on=localStorage.getItem('gsd-fps')==='1'; }catch(e){}
$('#fpsChk').checked=FPS.on; $('#fpsBox').hidden=!FPS.on;
$('#fpsChk').addEventListener('change',e=>{ FPS.on=e.target.checked; $('#fpsBox').hidden=!FPS.on; try{ localStorage.setItem('gsd-fps',FPS.on?'1':'0'); }catch(_){} });
function fpsTick(now){
  if (!FPS.on) return; FPS.n++;
  if (now-FPS.t>=1000){ const f=Math.round(FPS.n*1000/(now-FPS.t)); FPS.n=0; FPS.t=now;
    const box=$('#fpsBox'); box.textContent=`FPS ${f} · ${QUALITY[QCUR].label}`; box.style.background=f>=45?'rgba(31,122,76,.85)':f>=25?'rgba(160,110,0,.88)':'rgba(170,40,44,.88)'; }
}
function setPopOpen(on){ $('#setPop').hidden=!on; $('#gearBtn').setAttribute('aria-expanded',String(on)); }
$('#gearBtn').addEventListener('click',e=>{ e.stopPropagation(); setPopOpen($('#setPop').hidden); });
document.addEventListener('pointerdown',e=>{ if (!$('#setPop').hidden && !e.target.closest('#setPop,#gearBtn')) setPopOpen(false); });
addEventListener('keydown',e=>{ if (e.key==='Escape' && !$('#setPop').hidden) setPopOpen(false); });
$('#qSel').addEventListener('change',e=>{ QSET=e.target.value; try{ localStorage.setItem('gsd-q',QSET); }catch(_){} applyQuality(QSET==='auto'?autoQ():QSET); });
useUnit('u1'); renderUnitPicker();
initFirebase();
if (!fbDb) loadClasses();
$('#startBtn').disabled=true; $('#startBtn').textContent='불러오는 중…';
assetsPromise.then(()=>{ buildWorld(); WORLD_READY=true; ensureMap(MAPK); applyLook(WARDROBE?LOOK:guestLook()); $('#shopBtn').disabled=false; makeMotes(); applyQuality(QSET==='auto'?autoQ():QSET); $('#qSel').value=QSET; assetsReady=true; $('#startBtn').disabled=false; $('#startBtn').textContent='게임 시작'; updateGateUI(); })
  .catch(err=>{ $('#startBtn').textContent='불러오기 실패'; $('#netWarn').hidden=false; $('#netWarn').textContent='3D 모델을 불러오지 못했어요. 새로고침해 보세요. ('+(err&&err.message||'')+')'; });



const curU=()=>ED.units.find(u=>u.id===edUnit);
const B=()=>curU().bank;
const blankItem={mc:()=>({z:'any',q:'',o:['','','',''],e:''}),loc:()=>({q:'',a:'hq',e:''}),ox:()=>({q:'',a:true,e:''}),cls:()=>({q:'',a:0,e:''})};
function fieldHTML(t,item,i){
  const inp=(f,label,val,cls='',sub)=>`<label class="fld ${cls}"><span${sub===0?' class="ans"':''}>${label}</span><input data-i="${i}" data-f="${f}"${sub!==undefined?` data-s="${sub}"`:''} value="${esc(String(val))}"></label>`;
  const area=(label,val)=>`<label class="fld wide"><span>${label}</span><textarea data-i="${i}" data-f="q" rows="2">${esc(val)}</textarea></label>`;
  const sel=(f,label,val,opts)=>`<label class="fld"><span class="ans">${label}</span><select data-i="${i}" data-f="${f}">${opts.map(([v,l])=>`<option value="${v}"${String(v)===String(val)?' selected':''}>${l}</option>`).join('')}</select></label>`;
  if (t==='mc') return `<label class="fld"><span>거점</span><select data-i="${i}" data-f="z">${zopts().map(([v,l])=>`<option value="${v}"${v===item.z?' selected':''}>${l}</option>`).join('')}</select></label><div></div>`+
    area('문제',item.q)+inp('o','정답',item.o[0]||'','',0)+inp('o','오답 1',item.o[1]||'','',1)+inp('o','오답 2',item.o[2]||'','',2)+inp('o','오답 3',item.o[3]||'','',3)+inp('e','해설 (답한 뒤 보여줘요)',item.e,'wide');
  if (t==='loc') return area('상황',item.q)+sel('a','정답 거점',item.a,zopts().slice(0,3))+'<div></div>'+inp('e','해설',item.e,'wide');
  if (t==='ox') return area('문장',item.q)+sel('a','정답',item.a,[[true,'O (맞다)'],[false,'X (틀리다)']])+'<div></div>'+inp('e','해설',item.e,'wide');
  return area('문장',item.q)+sel('a','정답',item.a,[[0,zcfgOf(curU()).c[0]],[1,zcfgOf(curU()).c[1]]])+'<div></div>'+inp('e','해설',item.e,'wide');
}
function renderUnitBar(){
  $('#edUnit').innerHTML=ED.units.map(u=>`<option value="${esc(u.id)}"${u.id===edUnit?' selected':''}>${esc(u.name)}${u.id===ED.active?' · 수업 단원':''}</option>`).join('');
  const u=curU(), ready=isReady(u);
  const missing=MAPS[mapOf(u)].need.filter(k=>!u.bank[k].length).map(k=>TYPES[k].label);
  $('#edMap').value=mapOf(u);
  $('#edZcfg').hidden=mapOf(u)!=='zones';
  if (mapOf(u)==='zones'){ const c=zcfgOf(u);
    $('#edZPresets').innerHTML=Object.entries(ZCFG_PRESETS).map(([k,p])=>`<button class="btn small ghost" data-zpre="${k}">${p.label}</button>`).join(' ');
    document.querySelectorAll('[data-zc]').forEach(el=>{ const f=el.dataset.zc; el.value=f==='q'?c.q:c[f[0]][+f[1]]; }); }
  $('#edUnitNote').innerHTML = (u.id===ED.active?'<b>지금 수업 단원이에요.</b> ':'')+
    (ready?`문제 ${countOf(u.bank)}개 · 수업에 쓸 수 있어요.`:`<i>준비 중</i> · ${missing.join(', ')} 문제를 1개 이상 넣으면 수업에 쓸 수 있어요.`);
  const act=$('#edUnitActive'); act.disabled=u.id===ED.active||!ready; act.textContent=u.id===ED.active?'수업 단원 ✓':'수업 단원으로 지정';
  $('#edUnitDel').hidden=ED.units.length<2;
}
function renderEditor(){
  renderUnitBar();
  const b=B();
  $('#edTabs').innerHTML=Object.keys(TYPES).map(k=>`<button class="tab" role="tab" data-tab="${k}" aria-selected="${k===edTab}">${TYPES[k].label} ${b[k].length}</button>`).join('');
  const um=mapOf(curU());
  $('#edDesc').textContent=(um!=='zones'&&(edTab==='loc'||edTab==='cls')?`이 단원은 ${MAPS[um].name}이라 이 유형은 게임에 나오지 않아요. `:'')+(um!=='zones'&&edTab==='mc'?'4지선다는 정비 시간, 수정 기둥, 돌발 퀴즈, 보스 수정에서 나와요. 거점 칸은 세 거점 맵에서만 쓰여요.':TYPES[edTab].desc);
  { const zc=zcfgOf(curU()), cols=[...TYPES[edTab].cols];
    if (edTab==='mc') cols[0]=`거점(${zc.n.join('/')}/공통)`; if (edTab==='loc') cols[1]=`정답 거점(${zc.n.join('/')})`; if (edTab==='cls'){ cols[0]='문장'; cols[1]=`정답(${zc.c.join('/')})`; }
    $('#edCols').textContent=cols.join('  |  ');
    if (um==='zones'&&edTab==='cls') $('#edDesc').textContent=`제시된 문장이 "${zc.c[0]}"과 "${zc.c[1]}" 중 어디에 해당하는지 고르는 문제예요. 지식 카드에서 나와요.`;
    if (um==='zones'&&edTab==='loc') $('#edDesc').textContent=`상황을 읽고 알맞은 거점(${zc.n.join(', ')}) 바닥으로 직접 달려가는 문제예요. 웨이브 사이 정비 시간마다 첫 문제로 나와요.`; }
  $('#edList').innerHTML=b[edTab].map((it,i)=>`<div class="qrow" data-row="${i}"><div class="qrow-top"><span class="qnum">${i+1}번</span><button class="del" data-del="${i}">삭제</button></div><div class="fields">${fieldHTML(edTab,it,i)}</div></div>`).join('')
    || '<p class="ed-desc">아직 문제가 없어요. 아래 버튼으로 추가하거나 시트에서 붙여넣으세요.</p>';
}
function setStatus(id,msg,kind){ const el=$(id); el.textContent=msg; el.className='ed-status'+(kind?' '+kind:''); }
function disarm(){ resetArmed=false; delArmed=false; $('#edReset').textContent='이 단원을 기본 문제로 되돌리기'; $('#edUnitDel').textContent='이 단원 삭제'; }
function openEditor(){
  ED=JSON.parse(JSON.stringify(DATA)); edUnit=playUnit; edTab='mc'; disarm();
  $('#edRenameBox').hidden=true;
  $('#edSubmitUrl').value=(DATA.settings&&DATA.settings.submitUrl)||'';
  ['#edStatus','#edBulkStatus','#edBackupStatus'].forEach(id=>setStatus(id,''));
  renderEditor(); $('#title').hidden=true; $('#editor').hidden=false;
}
$('#editBtn').addEventListener('click',openEditor);
$('#edClose').addEventListener('click',()=>{ $('#editor').hidden=true; $('#title').hidden=false; });
$('#edTabs').addEventListener('click',e=>{ const b=e.target.closest('[data-tab]'); if (!b) return; edTab=b.dataset.tab; renderEditor(); });
$('#edList').addEventListener('input',e=>{
  const el=e.target, i=+el.dataset.i, f=el.dataset.f; if (!f) return;
  const it=B()[edTab][i];
  if (f==='o') it.o[+el.dataset.s]=el.value;
  else if (f==='a') it.a = edTab==='ox' ? el.value==='true' : edTab==='cls' ? +el.value : el.value;
  else it[f]=el.value;
  el.closest('.fld').classList.remove('bad');
});
$('#edList').addEventListener('click',e=>{ const d=e.target.closest('[data-del]'); if (!d) return; B()[edTab].splice(+d.dataset.del,1); renderEditor(); });
$('#edAdd').addEventListener('click',()=>{ B()[edTab].push(blankItem[edTab]()); renderEditor();
  const rows=document.querySelectorAll('.qrow'); const lastRow=rows[rows.length-1]; if (lastRow){ lastRow.scrollIntoView({block:'nearest'}); const t=lastRow.querySelector('textarea'); if (t) t.focus({preventScroll:true}); } });

/* 단원 관리 */
$('#edZcfg').addEventListener('click',e=>{ const b=e.target.closest('[data-zpre]'); if (!b) return; const p=ZCFG_PRESETS[b.dataset.zpre]; curU().zcfg=JSON.parse(JSON.stringify(p.cfg)); renderEditor(); setStatus('#edStatus',`거점 이름을 '${p.label}'(으)로 바꿨어요. '저장하기'를 눌러야 반영돼요.`,'ok'); });
$('#edZcfg').addEventListener('change',e=>{ const el=e.target.closest('[data-zc]'); if (!el) return; const u=curU(), c=zcfgOf(u), f=el.dataset.zc, v=el.value.trim();
  if (f==='q') c.q=v||c.q; else if (v) c[f[0]][+f[1]]=v; u.zcfg=c; renderEditor(); });
$('#edMap').addEventListener('change',e=>{ curU().map=e.target.value; renderEditor(); setStatus('#edStatus',"맵을 바꿨어요. '저장하기'를 눌러야 반영돼요.",'ok'); });
$('#edUnit').addEventListener('change',e=>{ edUnit=e.target.value; edTab='mc'; disarm(); $('#edRenameBox').hidden=true; renderEditor(); });
$('#edUnitAdd').addEventListener('click',()=>{
  let n=1; while (ED.units.some(u=>u.id==='u'+n)) n++;
  ED.units.push({id:'u'+n,name:`새 단원 ${ED.units.length+1}`,map:'general',bank:emptyBank()});
  edUnit='u'+n; edTab='mc'; disarm(); renderEditor();
  $('#edRenameBox').hidden=false; const ri=$('#edRenameInput'); ri.value=''; ri.focus();
  setStatus('#edStatus',"새 단원을 만들었어요. 이름을 정하고 문제를 넣은 뒤 '저장하기'를 눌러 주세요.",'ok');
});
$('#edUnitRename').addEventListener('click',()=>{ const box=$('#edRenameBox'); box.hidden=!box.hidden; if (!box.hidden){ const ri=$('#edRenameInput'); ri.value=curU().name; ri.focus(); ri.select(); } });
function applyRename(){ const v=$('#edRenameInput').value.trim(); if (!v){ $('#edRenameInput').focus(); return; } curU().name=v; $('#edRenameBox').hidden=true; renderEditor(); }
$('#edRenameOk').addEventListener('click',applyRename);
$('#edRenameInput').addEventListener('keydown',e=>{ if (e.key==='Enter'){ e.preventDefault(); applyRename(); } });
$('#edUnitActive').addEventListener('click',()=>{ if (!isReady(curU())) return; ED.active=edUnit; renderEditor();
  setStatus('#edStatus',"수업 단원을 바꿨어요. '저장하기'를 눌러야 학생 화면에 반영돼요.",'ok'); });
$('#edUnitDel').addEventListener('click',()=>{
  if (ED.units.length<2) return;
  if (!delArmed){ delArmed=true; $('#edUnitDel').textContent=`정말 "${curU().name}" 단원을 지울까요? 한 번 더 누르면 지워져요`; return; }
  ED.units=ED.units.filter(u=>u.id!==edUnit);
  if (!ED.units.some(u=>u.id===ED.active&&isReady(u))) ED.active=(ED.units.find(isReady)||ED.units[0]).id;
  edUnit=ED.units[0].id; edTab='mc'; disarm(); renderEditor();
  setStatus('#edStatus',"단원을 지웠어요. '저장하기'를 눌러야 반영되고, 그 전에 '닫기'를 누르면 취소돼요.",'ok');
});

/* 시트 붙여넣기 · 복사 */
function parseZone(s){ s=(s||'').trim(); const zc=zcfgOf(curU()); const order=[0,1,2].sort((a,b)=>zc.n[b].length-zc.n[a].length);
  for (const i of order){ if (s&&(s===zc.n[i]||s.includes(zc.n[i])||(s.length>=2&&zc.n[i].includes(s)))) return ZK[i]; }
  if (!isDefaultZ(zc)) return 'any';
  if (s.includes('본사')) return 'hq'; if (s.includes('연구')) return 'lab'; if (s.includes('공장')||s.includes('생산')) return 'fac'; return 'any'; }
function parseRows(t,text){
  const out=[];
  for (const line of text.split(/\r?\n/)){
    if (!line.trim()) continue;
    const c=line.split('\t').map(x=>x.trim());
    if (t==='mc'){ if (!c[1]||/^문제$/.test(c[1])) continue; out.push({z:parseZone(c[0]),q:c[1],o:[c[2]||'',c[3]||'',c[4]||'',c[5]||''],e:c[6]||''}); }
    else { if (!c[0]||/^(상황|문장|변화|변화 문장|제도)$/.test(c[0])) continue;
      const a = t==='loc' ? (parseZone(c[1])==='any'?'hq':parseZone(c[1])) : t==='ox' ? /^(o|ㅇ|맞|참|true)/i.test(c[1]||'') : (()=>{ const v=(c[1]||'').trim(), zc=zcfgOf(curU()); if (v&&(v===zc.c[1]||v.includes(zc.c[1]))) return 1; if (v&&(v===zc.c[0]||v.includes(zc.c[0]))) return 0; if (v==='1'||v==='2') return +v-1; return v.includes('빠져')?1:0; })();
      out.push({q:c[0],a,e:c[2]||''}); }
  }
  return out;
}
function toTSV(t){
  const rows=[TYPES[t].cols];
  for (const it of B()[t]){
    const zc=zcfgOf(curU()), zn=k=>zc.n[ZK.indexOf(k)];
    if (t==='mc') rows.push([ZK.includes(it.z)?zn(it.z):'공통',it.q,...it.o,it.e]);
    else if (t==='loc') rows.push([it.q,zn(it.a),it.e]);
    else if (t==='ox') rows.push([it.q,it.a?'O':'X',it.e]);
    else rows.push([it.q,zc.c[it.a?1:0],it.e]);
  }
  return rows.map(r=>r.map(x=>String(x).replace(/[\t\n]/g,' ')).join('\t')).join('\n');
}
$('#edImport').addEventListener('click',()=>{
  const rows=parseRows(edTab,$('#edPaste').value);
  if (!rows.length){ setStatus('#edBulkStatus','붙여넣은 내용에서 문제를 찾지 못했어요. 열 순서를 확인해 주세요.','err'); return; }
  B()[edTab].push(...rows); $('#edPaste').value=''; renderEditor();
  setStatus('#edBulkStatus',`${rows.length}개를 추가했어요. 확인한 뒤 '저장하기'를 눌러야 반영돼요.`,'ok');
});
$('#edCopy').addEventListener('click',()=>{
  const tsv=toTSV(edTab), ta=$('#edPaste');
  const fallback=()=>{ ta.value=tsv; ta.focus(); ta.select(); setStatus('#edBulkStatus','아래 칸에 표를 넣어 두었어요. Ctrl+C로 복사해 시트에 붙여넣으세요.','ok'); };
  try{ navigator.clipboard.writeText(tsv).then(()=>setStatus('#edBulkStatus','복사했어요. 시트에 붙여넣으면 열이 나뉘어 들어가요.','ok'),fallback); }catch(e){ fallback(); }
});
$('#edReset').addEventListener('click',()=>{
  if (!resetArmed){ resetArmed=true; $('#edReset').textContent='정말 되돌릴까요? 한 번 더 누르면 이 단원 문제가 기본 문제로 바뀌어요'; return; }
  curU().bank=defaultBank(); curU().map='zones'; disarm(); renderEditor();
  setStatus('#edStatus',"기본 문제로 바꿨어요. '저장하기'를 눌러야 반영돼요.",'ok');
});

/* 백업 */
function cleanData(){
  const tr=s=>String(s).trim();
  const su=($('#edSubmitUrl').value||'').trim();
  return {version:2,active:ED.active,settings:{submitUrl:/^https:\/\//.test(su)?su:''},units:ED.units.map(u=>({id:u.id,name:u.name.trim()||'이름 없는 단원',map:mapOf(u),...(u.zcfg?{zcfg:zcfgOf(u)}:{}),bank:{
    mc:u.bank.mc.map(x=>({z:x.z,q:tr(x.q),o:x.o.map(tr),e:tr(x.e)})),
    loc:u.bank.loc.map(x=>({q:tr(x.q),a:x.a,e:tr(x.e)})),
    ox:u.bank.ox.map(x=>({q:tr(x.q),a:!!x.a,e:tr(x.e)})),
    cls:u.bank.cls.map(x=>({q:tr(x.q),a:x.a?1:0,e:tr(x.e)}))}}))};
}
$('#edBackup').addEventListener('click',async()=>{
  const json=JSON.stringify(cleanData(),null,1);
  const d=new Date(), stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  try{ const url=URL.createObjectURL(new Blob([json],{type:'application/json'})); const a=document.createElement('a'); a.href=url; a.download=`사회게임RPG_문제백업_${stamp}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000); setStatus('#edBackupStatus','백업 파일을 내려받았어요.','ok'); }
  catch(err){ setStatus('#edBackupStatus', err&&err.code==='cancelled'||err&&err.code==='declined' ? '저장을 취소했어요.' : '백업 파일을 저장하지 못했어요.','err'); }
});
$('#edRestore').addEventListener('change',e=>{
  const f=e.target.files&&e.target.files[0]; if (!f) return;
  const rd=new FileReader();
  rd.onload=()=>{
    let n=null; try{ n=normalize(JSON.parse(rd.result)); }catch(err){}
    e.target.value='';
    if (!n){ setStatus('#edBackupStatus','이 파일은 문제 백업 파일이 아니에요.','err'); return; }
    ED=n; $('#edSubmitUrl').value=(n.settings&&n.settings.submitUrl)||''; edUnit=ED.active; edTab='mc'; disarm(); renderEditor();
    setStatus('#edBackupStatus',`단원 ${ED.units.length}개를 불러왔어요. '저장하기'를 눌러야 반영되고, 그 전에 '닫기'를 누르면 취소돼요.`,'ok');
  };
  rd.readAsText(f);
});

/* 저장 */
function validate(){
  const errs=[];
  ED.units.forEach(u=>{
    for (const t of Object.keys(TYPES)){
      const L=TYPES[t].label;
      u.bank[t].forEach((it,i)=>{
        const at={u:u.id,t,i};
        if (!String(it.q).trim()) errs.push({...at,f:'q',msg:`[${u.name}] ${L} ${i+1}번: 문제 내용이 비어 있어요.`});
        if (t==='mc') it.o.forEach((o,k)=>{ if (!String(o).trim()) errs.push({...at,f:'o',s:k,msg:`[${u.name}] ${L} ${i+1}번: ${k?'오답 '+k:'정답'}이 비어 있어요.`}); });
        if (!String(it.e).trim()) errs.push({...at,f:'e',msg:`[${u.name}] ${L} ${i+1}번: 해설이 비어 있어요.`});
      });
    }
  });
  const act=ED.units.find(u=>u.id===ED.active);
  if (!act||!isReady(act)) errs.unshift({u:ED.active,t:'mc',i:-1,msg:`수업 단원(${act?MAPS[mapOf(act)].name:''})은 ${act?MAPS[mapOf(act)].need.map(k=>TYPES[k].label).join(', '):''} 문제가 1개 이상 있어야 해요.`});
  return errs;
}
$('#edSave').addEventListener('click',async()=>{
  const errs=validate();
  if (errs.length){
    const first=errs[0];
    if (first.u!==edUnit||first.t!==edTab){ edUnit=first.u; edTab=first.t; renderEditor(); }
    errs.filter(e=>e.u===edUnit&&e.t===edTab&&e.i>=0).forEach(e=>{ const sel=`[data-i="${e.i}"][data-f="${e.f}"]`+(e.s!==undefined?`[data-s="${e.s}"]`:''); const el=document.querySelector('#edList '+sel); if (el) el.closest('.fld').classList.add('bad'); });
    setStatus('#edStatus',first.msg+(errs.length>1?` 외 ${errs.length-1}곳을 고쳐 주세요.`:''),'err'); return;
  }
  const su=$('#edSubmitUrl').value.trim();
  if (su && !/^https:\/\//.test(su)){ setStatus('#edStatus','결과 제출 주소는 https://로 시작해야 해요.','err'); return; }
  if (!fbDb||!isAdmin){ setStatus('#edStatus','선생님 계정으로 로그인해야 저장할 수 있어요.','err'); return; }
  const data=cleanData();
  const btn=$('#edSave'); btn.disabled=true; setStatus('#edStatus','저장하는 중…');
  try{
    await withTimeout(fbDb.ref('bank').set(data),15000);
    DATA=data; ED=JSON.parse(JSON.stringify(DATA));
    useUnit(isReady(DATA.units.find(u=>u.id===edUnit))?edUnit:DATA.active); if (isReady(DATA.units.find(u=>u.id===edUnit))){ PICK={unit:edUnit,map:''}; } applyPlay(); renderEditor();
    setStatus('#edStatus','저장했어요. 이제 게임을 새로 여는 학생들은 이 문제로 시작해요.','ok');
  }catch(err){
    const c=String(err&&err.code||err&&err.message||'');
    if (/permission|PERMISSION/.test(c)) setStatus('#edStatus','이 계정은 문제를 저장할 권한이 없어요. 보안 규칙이 올라가 있는지 확인해 주세요.','err');
    else if (c==='timeout') setStatus('#edStatus','저장 서버가 응답하지 않아요. 인터넷 연결을 확인하고 다시 눌러 주세요.','err');
    else setStatus('#edStatus','저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.','err');
  }finally{ btn.disabled=false; }
});

