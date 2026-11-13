/* 사회 게임 RPG · 업적과 칭호
   코인으로 살 수 없고, 해내야만 받아요. 업적을 달성하면 칭호를 달 수 있고, 몇몇은 전용 꾸미기도 받아요.
   기록: profiles/{반}/{번호}/ach/{키}=1 · 단 칭호: profiles/{반}/{번호}/title */
const ACH=[
  {k:'first',   icon:'🌱',title:'새싹 탐구자', desc:'첫 판 끝내기',                         goal:1,   val:P=>P.plays|0},
  {k:'q100',    icon:'✏️',title:'문제 사냥꾼', desc:'문제 100개 맞히기 (모든 판을 더해요)',  goal:100, val:P=>P.correct|0},
  {k:'q500',    icon:'📖',title:'지식 수집가', desc:'문제 500개 맞히기',                     goal:500, val:P=>P.correct|0, reward:'xpgowl_p0'},
  {k:'q1000',   icon:'🎓',title:'사회 박사',   desc:'문제 1000개 맞히기',                    goal:1000,val:P=>P.correct|0, reward:'xhdoc_p0'},
  {k:'fix30',   icon:'🔁',title:'오답 정복자', desc:'틀렸던 문제 30개 다시 맞히기',          goal:30,  val:P=>P.fixed|0,   reward:'xtphx_p0'},
  {k:'streak10',icon:'🔥',title:'불꽃 연속왕', desc:'한 판에서 10연속 정답',                 game:true, reward:'xhfire_p0'},
  {k:'acc90',   icon:'🎯',title:'명사수',      desc:'문제를 15개 이상 푼 판에서 정답률 90% 이상', game:true},
  {k:'explorer',icon:'🧭',title:'탐험가',      desc:'한 주 안에 모든 모드 탐험하기 (🎁 전부 받기)', game:true, reward:'xtexp_p0'},
  {k:'dex',     icon:'📚',title:'도감 마스터', desc:'한 단원의 지식 도감 완성하기',          game:true, reward:'xtdex_p0'},
  {k:'modes5',  icon:'🎮',title:'만능 플레이어',desc:'5가지 모드에서 모드 기록 남기기',       goal:5,   val:P=>Object.keys(P.mb||{}).length},
  {k:'win10',   icon:'🏆',title:'승리의 용사', desc:'10번 이기기',                           goal:10,  val:P=>P.wins|0},
  {k:'lv10',    icon:'⭐',title:'베테랑',      desc:'레벨 10 되기',                          goal:10,  val:P=>levelOf(P.xp|0).lv}
];
const achDef=k=>ACH.find(a=>a.k===k);
function hasAch(k){ return !!(PROFILE&&PROFILE.ach&&PROFILE.ach[k]); }
function titleText(k){ const A=achDef(k); return A?`${A.icon} ${A.title}`:''; }
/* 아직 확인 안 한 새 업적 수 (상점 탭의 빨간 숫자) */
let ACH_SEEN=[]; try{ ACH_SEEN=JSON.parse(localStorage.getItem('gsd-achseen')||'[]'); }catch(e){}
function achNewCount(){ return PROFILE&&PROFILE.ach ? Object.keys(PROFILE.ach).filter(k=>achDef(k)&&!ACH_SEEN.includes(k)).length : 0; }
function achMarkSeen(){ if (!PROFILE||!PROFILE.ach) return; ACH_SEEN=Object.keys(PROFILE.ach); try{ localStorage.setItem('gsd-achseen',JSON.stringify(ACH_SEEN)); }catch(e){} }

/* 판이 끝난 뒤(보상 저장 직후) 새로 달성한 업적 찾기. P = 저장된 뒤의 프로필 */
function achCheck(P,ctx){
  const got=P.ach||{}, out=[];
  for (const A of ACH){ if (got[A.k]) continue;
    let ok=false;
    if (A.val) ok=A.val(P)>=A.goal;
    else if (A.k==='streak10') ok=(ctx.qsMax|0)>=10;
    else if (A.k==='acc90') ok=(ctx.asked|0)>=15 && ctx.correct/ctx.asked>=.9;
    else if (A.k==='explorer') ok=!!ctx.exploreAll;
    else if (A.k==='dex') ok=!!ctx.dexDone;
    if (ok) out.push(A.k); }
  return out;
}
/* 업적 저장 + 결과 화면에 알림 */
async function achGrant(keys,box){
  keys=(keys||[]).filter(k=>achDef(k)&&!hasAch(k)); if (!keys.length||!STUDENT||!fbDb) return;
  const upd={}; keys.forEach(k=>upd['ach/'+k]=1);
  try{ await withTimeout(profRef().update(upd),10000); }
  catch(e){ if (box) box.insertAdjacentHTML('beforeend','<small class="warn">업적은 선생님이 보안 규칙을 새로 올린 뒤부터 저장돼요.</small>'); return; }
  PROFILE.ach={...(PROFILE.ach||{})}; keys.forEach(k=>PROFILE.ach[k]=1);
  const html=keys.map(k=>{ const A=achDef(k), R=A.reward&&CAT[A.reward];
    return `<div class="ach-pop"><i>${A.icon}</i><span><b>업적 달성! ${esc(A.title)}</b><small>${esc(A.desc)} · 칭호를 달 수 있어요${R?` · 전용 <b>${esc(R.name)}</b> 획득!`:''}</small></span></div>`; }).join('');
  const host=box||$('#rewardBox'); if (host) host.insertAdjacentHTML('beforeend',html+'<small class="ach-hint">상점 → 🏅 업적 · 칭호에서 칭호를 달아 보세요</small>');
  try{ SFX.correct(); }catch(e){}
  renderProfileCard();
}

/* ---------- 상점 안 🏅 업적 · 칭호 화면 ---------- */
function renderAchView(){
  const P=PROFILE||{}, stu=!!(STUDENT&&PROFILE), done=ACH.filter(a=>hasAch(a.k)).length;
  $('#shopGrid').innerHTML=`<p class="ach-sum">🏅 업적 <b>${done}/${ACH.length}</b> · 코인으로는 못 사요. 해내면 칭호와 보상을 받아요</p>`+ACH.map(A=>{
    const own=hasAch(A.k), on=P.title===A.k, R=A.reward&&CAT[A.reward];
    const prog=A.val&&!own?Math.min(A.goal,A.val(P)):null;
    return `<button class="ach-card${own?' own':''}${on?' on':''}${A.k===SHOP.achSel?' sel':''}${own&&!ACH_SEEN.includes(A.k)?' fresh':''}" data-ach="${A.k}">
      <i>${own?A.icon:'🔒'}</i><span><b>${esc(A.title)}${on?' <em>달고 있어요</em>':''}</b><small>${esc(A.desc)}</small>
      ${prog!=null?`<span class="ach-bar"><i style="width:${Math.round(prog/A.goal*100)}%"></i></span><small class="ach-n">${prog.toLocaleString('ko-KR')} / ${A.goal.toLocaleString('ko-KR')}</small>`:''}
      ${R?`<small class="ach-r">🎁 보상: ${esc(R.name)} (${R.slot==='hair'?'머리색':'궤적'} · 세 직업 모두)</small>`:''}</span></button>`; }).join('');
  const A=achDef(SHOP.achSel), btn=$('#shopBuy'); btn.classList.remove('warn');
  if (!A){ $('#shopSel').innerHTML=`<small>${P.title?`지금 칭호: <b>${esc(titleText(P.title))}</b> · `:''}업적을 누르면 칭호를 달 수 있어요.</small>`; btn.hidden=true; }
  else { btn.hidden=false; const own=hasAch(A.k), on=P.title===A.k;
    $('#shopSel').innerHTML=`<b>${A.icon} ${esc(A.title)}</b><small>${esc(A.desc)}</small>`;
    btn.disabled=SHOP.busy||!stu||!own; btn.textContent=!own?'🔒 아직 달성하지 못했어요':on?'칭호 떼기':'칭호 달기'; }
  achMarkSeen();
}
async function achTitleAction(){
  const A=achDef(SHOP.achSel); if (!A||!hasAch(A.k)||SHOP.busy||!STUDENT) return;
  const next=PROFILE.title===A.k?null:A.k; SHOP.busy=true; renderShop();
  try{ await withTimeout(profRef().child('title').set(next),10000); PROFILE.title=next||undefined;
    shopMsg(next?`칭호 ${titleText(next)}을(를) 달았어요!`:'칭호를 뗐어요.','ok'); if (next){ SFX.card(); if (knight) knight.anim.once('cheer',1.3,true); } renderProfileCard(); }
  catch(e){ shopMsg('저장하지 못했어요. 선생님께 보안 규칙이 최신인지 알려 주세요.','err'); }
  SHOP.busy=false; renderShop();
}
$('#shopGrid').addEventListener('click',e=>{ const b=e.target.closest('[data-ach]'); if (!b) return; SHOP.achSel=b.dataset.ach; shopMsg(''); renderShop(); });
