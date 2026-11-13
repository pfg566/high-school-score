/* 사회 게임 RPG · 🥚 펫 알 (레벨 10 · 20 · 30마다 하나씩)
   알을 받고 → 코인을 넣거나 문제를 맞혀서 따뜻하게 → 100%가 되면 부화!
   어떤 펫이 나올지는 '부화 버튼을 누른 순간의 서버 시각(1/1000초)'으로 정해요.
   학생 컴퓨터 시계가 아니라 Firebase 서버 시계라서 아무도 고를 수 없고, 보안 규칙이 결과를 다시 확인해요.
   이미 가진 펫이 나오면 저절로 다시 굴려요(규칙도 '가진 펫일 때만' 다시 굴리기를 허락해요).
   기록: wardrobe/{반}/{번호}/eggs/{1|2|3} = {t:받은 시각, pc:넣은 코인, qb:공부 보너스, qt:마지막 보너스 시각, h:부화 시각, pet:나온 펫} */
const EGG_COST=2000;                   // 100% = 2000점 (코인 1개 = 1점)
const EGG_LV=[10,20,30];
const EGG_XP=[3150,11400,24650];       // 위 레벨이 되는 누적 경험치 (levelOf와 같아야 해요 · 보안 규칙에도 같은 숫자)
const EGG_Q=4, EGG_Q_GAME=40, EGG_Q_MAX=600;   // 정답 1개 = 0.2%, 한 판 최대 2%, 알 하나에 공부 보너스는 최대 30%
/* 확률표 (1000칸 중 몇 칸) · 보안 규칙과 순서 · 숫자가 같아야 해요 */
const EGG_TABLE=[['pdog_egg',120,'보통'],['pcat_egg',120,'보통'],['prabbit_egg',120,'보통'],['pslime_egg',120,'보통'],
                 ['ppeng_egg',100,'희귀'],['pbear_egg',100,'희귀'],['pfox_egg',100,'희귀'],
                 ['powl_egg',85,'영웅'],['pribbon_egg',85,'영웅'],['pdragon_egg',50,'전설']];
const EGG_RARE={'보통':'#7a8597','희귀':'#2f8fe0','영웅':'#9a4fe0','전설':'#e08a12'};
function eggPetAt(h){ let r=((h%1000)+1000)%1000; for (const [id,w] of EGG_TABLE){ if (r<w) return id; r-=w; } return EGG_TABLE[0][0]; }
const eggList=()=>(typeof WARDROBE!=='undefined'&&WARDROBE&&WARDROBE.eggs)||{};
function eggOwnedPet(id){ const it=CAT[id], E=eggList();
  return ['1','2','3'].some(k=>E[k]&&E[k].pet===id) || !!(it&&it.was&&WARDROBE&&WARDROBE.inv&&WARDROBE.inv[it.was]); }
const eggProg=e=>e?Math.min(EGG_COST,(e.pc|0)+(e.qb|0)):0;
const eggPct=n=>Math.floor(n/EGG_COST*1000)/10;
/* 아직 안 가진 펫끼리 나눈 실제 확률 */
function eggChance(id){ const left=EGG_TABLE.filter(([k])=>!eggOwnedPet(k)), sum=left.reduce((a,[,w])=>a+w,0); const row=left.find(([k])=>k===id); return row&&sum?row[1]/sum:0; }
function eggChanceText(id){ const c=eggChance(id); if (!c) return "-"; const v=Math.round(c*1000)/10; return (v%1?v.toFixed(1):v)+"%"; }
function eggIncubating(){ const E=eggList(); for (const k of ['1','2','3']){ const e=E[k]; if (e&&e.t&&!e.pet) return {i:+k,e}; } return null; }
/* 키우는 알이 있고 펫을 안 데리고 있으면, 알이 대신 따라다녀요 (내 화면에서만) */
function eggDecorate(L){ if (!L||!STUDENT||L.pet&&L.pet!=='nopet_p0') return L; return eggIncubating()?{...L,pet:'eggpet'}:L; }
function eggShowProg(){ const x=eggIncubating(); return x?eggProg(x.e)/EGG_COST:0; }

/* ---------- 상점: 알 둥지 ---------- */
function eggNestHTML(){
  if (!STUDENT||!PROFILE) return `<div class="egg-nest"><div class="egg-head"><b>🥚 알 둥지</b><small>펫은 알에서만 나와요. 코드로 로그인하면 레벨 10 · 20 · 30마다 알을 하나씩 받아요.</small></div></div>`;
  const lv=levelOf(PROFILE.xp|0).lv, E=eggList(), coins=availCoins();
  const cards=[1,2,3].map(i=>{ const e=E[i], open=lv>=EGG_LV[i-1];
    if (!e){ if (!open) return `<div class="egg-card lock"><div class="egg-ico">🔒</div><b>${i}번째 알</b><small>레벨 ${EGG_LV[i-1]}에 열려요 (지금 Lv.${lv})</small></div>`;
      return `<div class="egg-card new"><div class="egg-ico wob">🥚</div><b>${i}번째 알</b><small>받을 수 있어요!</small><button class="btn sm" data-egg="take" data-i="${i}">알 받기</button></div>`; }
    if (e.pet){ const it=CAT[e.pet]; return `<div class="egg-card done"><div class="egg-ico">${it?it.ico:'🐣'}</div><b>${it?esc(it.name):'펫'}</b><small>${i}번째 알에서 태어났어요</small></div>`; }
    const n=eggProg(e), pct=eggPct(n), cpct=eggPct(Math.min(EGG_COST,e.pc|0)), qpct=eggPct(e.qb|0), need=EGG_COST-n;
    if (n>=EGG_COST) return `<div class="egg-card ready"><div class="egg-ico wob hard">🥚</div><b>${i}번째 알 · 100%</b><small>${e.h?'부화하는 중이었어요. 다시 눌러 주세요':'금이 가고 있어요!'}</small><button class="btn sm hatch" data-egg="hatch" data-i="${i}">🐣 부화하기!</button></div>`;
    const btn=(a,label)=>`<button class="btn sm ghost" data-egg="inv${a}" data-i="${i}" ${coins<1||SHOP.busy?'disabled':''}>${label}</button>`;
    return `<div class="egg-card grow"><div class="egg-ico wob" style="--wob:${(.4+pct/100*1.6).toFixed(2)}">${pct>=80?'🥚💥':pct>=50?'🥚✨':'🥚'}</div><b>${i}번째 알 · ${pct}%</b>
      <div class="egg-bar"><i class="c" style="width:${cpct}%"></i><i class="q" style="width:${qpct}%"></i></div>
      <small>코인 ${cpct}% · 공부 ${qpct}% · 남은 ${need.toLocaleString('ko-KR')}점</small>
      <div class="egg-btns">${btn(100,'+100')}${btn(500,'+500')}${btn(0,'가득')}</div></div>`; }).join('');
  const rows=EGG_TABLE.map(([id,w,rk])=>{ const it=CAT[id], own=eggOwnedPet(id); return `<tr class="${own?'own':''}"><td>${it.ico} ${esc(it.name)}</td><td style="color:${EGG_RARE[rk]}">${rk}</td><td>${(w/10).toFixed(1)}%</td><td>${own?'✔ 가짐':eggChanceText(id)}</td></tr>`; }).join('');
  return `<div class="egg-nest"><div class="egg-head"><b>🥚 알 둥지</b><small>코인을 넣거나 문제를 맞혀서(정답 1개 0.2% · 한 판 최대 2%) 100%를 채우면 부화해요. 이미 가진 펫은 나오지 않아요.</small></div>
    <div class="egg-cards">${cards}</div>
    <details class="egg-odds"><summary>🎲 확률표 보기</summary><table><tr><th>펫</th><th>등급</th><th>기본 확률</th><th>나의 확률</th></tr>${rows}</table>
    <small>부화 버튼을 누른 순간의 서버 시각(1/1000초)으로 정해져서 아무도 결과를 고를 수 없어요. 가진 펫이 나오면 저절로 다시 굴려서, 남은 펫의 확률이 그만큼 올라가요.</small></details></div>`;
}
const eggRef=i=>wardRef().child('eggs/'+i);
const eggPermErr=e=>/permission|PERMISSION/i.test(String(e&&(e.code||e.message)));
async function eggAction(act,i){
  if (!STUDENT||!WARDROBE||SHOP.busy) return;
  SHOP.busy=true; renderShop();
  try{
    if (act==='take'){
      const lv=levelOf(PROFILE.xp|0).lv; if (lv<EGG_LV[i-1]||eggList()[i]) throw new Error('no');
      const upd={['eggs/'+i]:{t:firebase.database.ServerValue.TIMESTAMP,pc:0,qb:0}}; if (!WARDROBE.hasSpent){ upd.spent=WARDROBE.spent|0; }
      await withTimeout(wardRef().update(upd),10000); WARDROBE.hasSpent=true;
      WARDROBE.eggs[i]={t:Date.now(),pc:0,qb:0}; shopMsg(`${i}번째 알을 받았어요! 코인을 넣거나 문제를 맞혀서 따뜻하게 해 주세요.`,'ok'); SFX.card(); applyLook();
    } else if (act.startsWith('inv')){
      const e=WARDROBE.eggs[i]; if (!e||e.pet) throw new Error('no');
      const room=EGG_COST-eggProg(e), want=+act.slice(3)||room, amt=Math.min(want,room,availCoins());
      if (amt<=0){ shopMsg(availCoins()<=0?'넣을 코인이 없어요.':'이미 가득 찼어요.','err'); }
      else { const sp=(WARDROBE.spent|0)+amt, pc=(e.pc|0)+amt;
        await withTimeout(wardRef().update({['eggs/'+i+'/pc']:pc,spent:sp}),10000);
        e.pc=pc; WARDROBE.spent=sp; SFX.correct();
        shopMsg(eggProg(e)>=EGG_COST?'100%! 이제 부화시킬 수 있어요 🐣':`코인 ${amt}개를 넣었어요 · ${eggPct(eggProg(e))}%`,'ok'); }
    } else if (act==='hatch'){
      const id=await eggHatch(i); SHOP.busy=false; renderShop(); eggShow(id); return;
    }
  }catch(e){ shopMsg(eggPermErr(e)?'저장하지 못했어요. 선생님께 보안 규칙이 최신인지 알려 주세요.':'저장하지 못했어요. 인터넷을 확인하고 다시 눌러 주세요.','err'); }
  SHOP.busy=false; renderShop();
}
/* 부화: 서버 시각을 기록 → 그 시각으로 펫 정하기 → 가진 펫이면 다시 기록 → 펫 저장 */
async function eggHatch(i){
  const ref=eggRef(i);
  const fresh=(await withTimeout(ref.once('value'),10000)).val(); if (!fresh) throw new Error('noegg');
  const e=WARDROBE.eggs[i]=fresh; if (e.pet) return e.pet;
  if (EGG_TABLE.every(([k])=>eggOwnedPet(k))) throw new Error('all');
  for (let n=0;n<40;n++){
    if (!e.h || eggOwnedPet(eggPetAt(e.h))){
      if (e.h) await new Promise(r=>setTimeout(r,80+Math.random()*420));   // 다시 굴릴 땐 잠깐 쉬었다가: 같은 칸에 또 걸리지 않게
      await withTimeout(ref.child('h').set(firebase.database.ServerValue.TIMESTAMP),10000);
      e.h=(await withTimeout(ref.child('h').once('value'),10000)).val(); continue; }
    const id=eggPetAt(e.h);
    await withTimeout(ref.child('pet').set(id),10000); e.pet=id; return id;
  }
  throw new Error('retry');
}
/* 부화 연출 */
function eggShow(id){
  const it=CAT[id]; if (!it) return; const row=EGG_TABLE.find(([k])=>k===id)||[id,0,'보통'];
  let ov=$('#eggHatch'); if (!ov){ ov=document.createElement('div'); ov.id='eggHatch'; document.body.appendChild(ov); }
  ov.innerHTML=`<div class="eh-box"><div class="eh-egg">🥚</div><div class="eh-flash"></div>
    <div class="eh-pet"><div class="eh-rays"></div><div class="eh-ico">${it.ico}</div><b>${esc(it.name)}</b><span class="eh-rk" style="background:${EGG_RARE[row[2]]}">${row[2]}</span>
    <small>${esc(it.desc||'')}</small><div class="eh-btns"><button class="btn" id="ehWear">${JOB_NAME[SHOP.job]}에게 데려가기</button><button class="btn ghost" id="ehClose">닫기</button></div></div></div>`;
  ov.className='go'; ov.hidden=false; SFX.card();
  setTimeout(()=>{ try{ SFX.correct(); }catch(e){} },2300);
  setTimeout(()=>{ try{ SFX.wave(); }catch(e){} if (typeof fx!=='undefined') try{ fx.rise(P.x,P.z,0xffd34d,40); }catch(e){} },2700);
  const close=()=>{ ov.hidden=true; ov.className=''; };
  $('#ehClose').onclick=close;
  $('#ehWear').onclick=async()=>{ close(); SHOP.tab='pet'; SHOP.sel=id; SHOP.try[it.slot]=id; await shopAction(); applyLook(); setTimeout(()=>{ if (typeof petReact==='function') petReact(true); },600); };
}
/* 판이 끝난 뒤: 맞힌 문제만큼 알이 따뜻해져요 (보상 저장 뒤에 불러요) */
async function eggQuizBonus(correct,box){
  if (!STUDENT||!WARDROBE||!(correct>0)) return;
  try{
    const v=(await withTimeout(wardRef().child('eggs').once('value'),8000)).val()||{}; WARDROBE.eggs=v;
    const x=eggIncubating(); if (!x||x.e.h) return; const e=x.e;
    const add=Math.min(EGG_Q_GAME,correct*EGG_Q,EGG_Q_MAX-(e.qb|0),EGG_COST-eggProg(e)); if (add<=0) return;
    await withTimeout(eggRef(x.i).update({qb:(e.qb|0)+add,qt:firebase.database.ServerValue.TIMESTAMP}),8000);
    e.qb=(e.qb|0)+add; applyLook();
    if (box) box.insertAdjacentHTML('beforeend',`<span class="egg-warm">🥚 ${x.i}번째 알이 따뜻해졌어요 +${eggPct(add)}% → ${eggPct(eggProg(e))}%${eggProg(e)>=EGG_COST?' · 상점에서 부화시켜요! 🐣':''}</span>`);
  }catch(e){}
}
