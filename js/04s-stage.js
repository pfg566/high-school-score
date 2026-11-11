/* 사회 게임 RPG · 발판 서바이벌 (반 전체) · 선생님이 열고 시작해요
   문제가 뜨면 정답 발판으로 달려가요. 발판 배치는 학생마다 달라서 친구를 따라가도 소용없어요.
   한 발판에 1.5초 서 있으면 답이 잠기고, 빨리 잠글수록 점수를 더 받아요. 목숨 3개, 다 잃어도 정답을 맞히면 부활!
   데이터: stage/{학급}/meta · qs · ans/{문제}/{uid} · p/{uid}
   파일은 01 → 13 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요. */
const STG_COL=['#e5484d','#3b82f6','#22a35a','#e8a400'], STG_OXCOL=['#3b82f6','#e5484d'];
const STG_SLOT=[[-1,-1],[1,-1],[-1,1],[1,1]], STG_POS=['왼쪽 위','오른쪽 위','왼쪽 아래','오른쪽 아래'];
const STG_HALF=7.6, STG_LOCK=1.5, STG_INTRO=8;
const STG={av:{},live:{},liveRef:null,names:{},posT:0,posLast:'',nameT:0,cid:'',metaRef:null,meta:null,qs:null,qsKey:'',joining:false,on:false,qi:-1,phase:'',lives:3,score:0,correct:0,perm:null,oxLeft:0,
  slotHold:-1,holdT:0,locked:-1,lockFrac:0,answered:false,ghosts:[],fallY:0,falling:false,rvShown:-1,slabs:[],oxSlabs:[],texs:[],ended:false,rank:null,off:0,pT:0,joinN:0,dropK:0,wasDead:false};
let stageSea=null;

/* 시드 섞기: 학생마다 · 문제마다 다르게 */
function stgHash(s){ let h=2166136261; for (const c of String(s)){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
function stgRng(seed){ let a=seed||1; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

function buildStage(){
  stageSea=new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.MeshBasicMaterial({color:0x7ec4ea})); stageSea.rotation.x=-Math.PI/2; stageSea.position.y=-34; scene.add(stageSea);
  const rockM=std(0x8b7d6b,{flatShading:true}), grassM=std(0x6fb04a,{flatShading:true});
  /* 공중에 떠 있는 작은 섬들 (배경) */
  for (let i=0;i<16;i++){ const a=i/16*Math.PI*2+rnd(-.1,.1), r=rnd(24,48), s=rnd(1.5,4);
    const g=new THREE.Group(); g.position.set(Math.cos(a)*r,rnd(-10,4),Math.sin(a)*r);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(s,s*.9,.5,7),grassM); g.add(top);
    const bot=new THREE.Mesh(new THREE.ConeGeometry(s*.9,s*1.8,7),rockM); bot.rotation.x=Math.PI; bot.position.y=-s*.9-.25; g.add(bot); scene.add(g); }
  /* 4칸 발판 · O/X 2칸 발판 */
  STG.slabs=STG_SLOT.map(([sx,sz],i)=>{ const g=new THREE.Group(); g.position.set(sx*3.85,0,sz*3.85);
    const b=cs(new THREE.Mesh(new THREE.BoxGeometry(7.4,1.4,7.4),std(new THREE.Color(STG_COL[i]).getHex(),{flatShading:true}))); b.position.y=-.7; g.add(b);
    const under=cs(new THREE.Mesh(new THREE.ConeGeometry(4.6,5,6),rockM)); under.rotation.x=Math.PI; under.position.y=-3.9; g.add(under);
    const top=new THREE.Mesh(new THREE.PlaneGeometry(6.9,6.9),new THREE.MeshBasicMaterial({transparent:true,color:0xcfcfcf})); top.rotation.x=-Math.PI/2; top.position.y=.02; top.visible=false; g.add(top);
    scene.add(g); return {g,top,slot:i}; });
  STG.oxSlabs=[-1,1].map((sx,i)=>{ const g=new THREE.Group(); g.position.set(sx*3.95,0,0);
    const b=cs(new THREE.Mesh(new THREE.BoxGeometry(7.6,1.4,15.6),std(0xffffff,{flatShading:true}))); b.position.y=-.7; g.add(b);
    const under=cs(new THREE.Mesh(new THREE.ConeGeometry(5.5,6,6),rockM)); under.rotation.x=Math.PI; under.position.y=-4.3; g.add(under);
    const top=new THREE.Mesh(new THREE.PlaneGeometry(7.1,15.1),new THREE.MeshBasicMaterial({transparent:true,color:0xcfcfcf})); top.rotation.x=-Math.PI/2; top.position.y=.02; top.visible=false; g.add(top);
    g.visible=false; scene.add(g); return {g,top,box:b,slot:i}; });
  const start=new THREE.Mesh(new THREE.CircleGeometry(1.1,32),new THREE.MeshBasicMaterial({color:0xdddddd,transparent:true,opacity:.75})); start.rotation.x=-Math.PI/2; start.position.y=.05; scene.add(start);
  STG.start=start;
}
MAP_BUILD.stage=()=>buildStage();
GRASS_OK.stage=null;

function stgFloorTex(num,text,color,tall){
  const W2=512, H2=tall?1024:512, cv=document.createElement('canvas'); cv.width=W2; cv.height=H2; const g=cv.getContext('2d');
  g.fillStyle=color; g.fillRect(0,0,W2,H2);
  g.strokeStyle='rgba(255,255,255,.85)'; g.lineWidth=14; roundRect(g,18,18,W2-36,H2-36,40); g.stroke();
  g.fillStyle='#fff'; g.textAlign='center'; g.textBaseline='middle';
  if (!text){ g.font='bold 360px Jua, "Malgun Gothic", sans-serif'; g.fillText(num,W2/2,H2/2+20); }
  else { g.font='bold 120px Jua, "Malgun Gothic", sans-serif'; g.fillText(num,W2/2,110);
    const len=String(text).length, fs=len>24?40:len>15?50:len>8?60:74;
    const lines=runWrap(g,text,W2-70,`${fs}px Jua, "Malgun Gothic", sans-serif`,fs*1.2,4);
    lines.forEach((l,i)=>g.fillText(l,W2/2,H2/2+50+(i-(lines.length-1)/2)*fs*1.2)); }
  const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding; t.anisotropy=4; STG.texs.push(t); return t;
}

/* ---------- 선생님이 연 발판 서바이벌 지켜보기 ---------- */
function stgCidNow(){ if (AUTHMODE==='student'&&STUDENT) return STUDENT.cid; if (isAdmin){ const c=$('#pkCls').value; return c&&!c.startsWith('n:')?c:''; } return ''; }
function stgWatch(){
  const cid=fbDb?stgCidNow():'';
  if (cid===STG.cid) return;
  if (STG.metaRef){ STG.metaRef.off(); STG.metaRef=null; }
  STG.cid=cid; STG.meta=null; stgBtn();
  if (!cid) return;
  if (!STG.offOn){ STG.offOn=true; try{ fbDb.ref('.info/serverTimeOffset').on('value',s=>{ STG.off=+s.val()||0; },()=>{}); }catch(e){} }
  STG.metaRef=fbDb.ref(`stage/${cid}/meta`);
  STG.metaRef.on('value',s=>{ STG.meta=s.val(); stgBtn(); if (STG.meta&&STG.meta.t0&&STG.meta.t0!==STG.qsKey) stgLoadQs(); },()=>{});
}
async function stgLoadQs(){ const k=STG.meta.t0; try{ const v=(await fbDb.ref(`stage/${STG.cid}/qs`).once('value')).val(); STG.qs=Array.isArray(v)?v:(v?Object.values(v):[]); STG.qsKey=k; }catch(e){} }
function stgOpen(){ const m=STG.meta; return !!m && (m.state==='wait'||m.state==='run'); }
function stgBtn(){ const b=$('#stageBtn'); if (!b) return; const on=stgOpen()&&W.state!=='play'&&!PARTY.rid; b.hidden=!on;
  if (on) b.innerHTML=STG.meta.state==='run'?'🟦 발판 서바이벌 진행 중 · 지금 들어가기':'🟦 발판 서바이벌 · 입장하기'; }
setInterval(()=>{ try{ stgWatch(); stgBtn(); }catch(e){} },1500);
const stgNow=()=>Date.now()+STG.off;

function stageJoin(){
  if (!stgOpen()) return;
  if (!myUid()){ flashPrompt('로그인한 학생만 들어갈 수 있어요',2); return; }
  STG.joining=true; startGame(); STG.joining=false;
}
function stageReset(){
  document.body.classList.remove('stagemode');
  ['#stHud','#stQ','#stMsg','#stRank'].forEach(s=>{ const e=$(s); if (e) e.hidden=true; });
  if (MAPK!=='stage'){ STG.on=false; return; }
  STG.on=true; Object.assign(STG,{qi:-1,phase:'',lives:3,score:0,correct:0,perm:null,slotHold:-1,holdT:0,locked:-1,lockFrac:0,answered:false,falling:false,fallY:0,rvShown:-1,ended:false,rank:null,pT:0,dropK:0,wasDead:false});
  stgRemoveAvatars(); stgSlabsUp(true); stgListenLive(); STG.nameT=0; STG.posLast='';
  P.x=0; P.z=0; W.nextWaveAt=-1; W.nextQuiz=1e9;
  document.body.classList.add('stagemode'); $('#stHud').hidden=false;
  stgWriteMe();
}
function stgWriteMe(){ const u=myUid(); if (!u||!STG.cid) return; fbDb.ref(`stage/${STG.cid}/p/${u}`).set({n:myName().slice(0,12),num:STUDENT?+STUDENT.num:0,l:STG.lives,s:STG.score,c:STG.correct,a:W.asked|0,job:JOB,look:equippedLook(JOB),t:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{}); }

/* 지금 몇 번째 문제 · 어떤 단계인지 (선생님이 시작한 시각 기준으로 모두 같아요) */
function stgClock(){
  const m=STG.meta; if (!m) return {ph:'gone'};
  if (m.state==='wait') return {ph:'wait'};
  if (m.state!=='run'||!STG.qs||STG.qsKey!==m.t0) return {ph:m.state==='end'?'done':'load'};
  let t=(stgNow()-m.t0)/1000;
  if (t<STG_INTRO) return {ph:'intro',left:STG_INTRO-t};
  t-=STG_INTRO;
  const n=Math.min(m.n||STG.qs.length,STG.qs.length);
  for (let i=0;i<n;i++){ const d=STG.qs[i].k==='mc'?m.dm:m.dx, c=d+m.rv;
    if (t<d) return {ph:'q',i,left:d-t,dur:d}; if (t<c) return {ph:'rv',i,left:c-t}; t-=c; }
  return {ph:'done'};
}
function stgItem(i){ const q=STG.qs[i]; return q.k==='mc'?{kind:'mc',q:q.q,o:q.o,e:q.e||''}:{kind:'ox',q:q.q,a:!!q.a,e:q.e||''}; }
function stgSetupQ(i){
  STG.qi=i; STG.locked=-1; STG.slotHold=-1; STG.holdT=0; STG.answered=false; STG.lockFrac=0; STG.dropK=0;
  stgClearGhosts(); stgSlabsUp(false);
  P.x=0; P.z=0; W.snapCam=true; STG.falling=false; STG.fallY=0;   // 문제마다 모두 가운데에서 출발해요
  const q=STG.qs[i], rng=stgRng(stgHash(myUid()+':'+STG.meta.t0+':'+i));
  STG.texs.forEach(t=>t.dispose()); STG.texs=[];
  if (q.k==='mc'){
    const perm=[0,1,2,3]; for (let k=3;k>0;k--){ const j=Math.floor(rng()*(k+1)); [perm[k],perm[j]]=[perm[j],perm[k]]; } STG.perm=perm;
    STG.slabs.forEach((s,slot)=>{ s.g.visible=true; s.top.material.map=stgFloorTex(String(slot+1),q.o[perm[slot]],STG_COL[slot],false); s.top.material.needsUpdate=true; s.top.visible=true; });
    STG.oxSlabs.forEach(s=>s.g.visible=false);
  } else {
    STG.oxLeft=rng()<.5?0:1;   // 0이면 왼쪽이 O
    STG.oxSlabs.forEach((s,slot)=>{ const v=slot===0?STG.oxLeft:1-STG.oxLeft; s.g.visible=true; s.box.material.color.set(STG_OXCOL[v]); s.top.material.map=stgFloorTex(v?'X':'O','',STG_OXCOL[v],true); s.top.material.needsUpdate=true; s.top.visible=true; });
    STG.slabs.forEach(s=>s.g.visible=false);
  }
  // 문제 칸
  $('#stQText').textContent=(q.k==='ox'?'[O/X] ':'')+q.q;
  const box=$('#stOpts'); box.className='run-opts'+(q.k==='ox'?' two':'');
  if (q.k==='mc') box.innerHTML=STG.perm.map((oi,slot)=>`<div class="run-opt" style="--c:${STG_COL[slot]}"><b>${slot+1}</b><span>${esc(q.o[oi])}<small> · ${STG_POS[slot]}</small></span></div>`).join('');
  else box.innerHTML=[0,1].map(slot=>{ const v=slot===0?STG.oxLeft:1-STG.oxLeft; return `<div class="run-opt" style="--c:${STG_OXCOL[v]}"><b>${v?'X':'O'}</b><span>${slot?'오른쪽 발판':'왼쪽 발판'}</span></div>`; }).join('');
  $('#stQ').hidden=false; $('#stLock').textContent=STG.lives>0?'정답 발판으로 달려가요! 시간이 끝날 때 서 있는 발판이 내 답 · 일찍 도착할수록 점수 UP':'👻 관전 중 · 이 문제를 맞히면 부활해요!';
  $('#stMsg').hidden=true;
}
/* 내가 서 있는 칸 → 보기 번호 */
function stgSlotAt(x,z){ const q=STG.qs[STG.qi]; if (!q) return -1;
  // 발판 사이 틈(가운데 십자 줄)만 '안 고름'으로 쳐요 (예전엔 0.7m까지라, 정답 발판 가장자리에 서 있어도 떨어지는 것처럼 보였어요)
  if (q.k==='mc'){ if (Math.abs(x)<.2||Math.abs(z)<.2) return -1; return (x>0?1:0)+(z>0?2:0); }
  if (Math.abs(x)<.2) return -1; return x>0?1:0; }
function stgOptOfSlot(slot){ const q=STG.qs[STG.qi]; if (slot<0) return -1; return q.k==='mc'?STG.perm[slot]:(slot===0?STG.oxLeft:1-STG.oxLeft); }
function stgSlotOfOpt(opt){ const q=STG.qs[STG.qi]; if (opt<0) return -1; return q.k==='mc'?STG.perm.indexOf(opt):(opt===STG.oxLeft?0:1); }
function stgCorrectOpt(){ const q=STG.qs[STG.qi]; return q.k==='mc'?0:(q.a?0:1); }
function stgSendAns(opt,frac){ const u=myUid(); if (!u) return; fbDb.ref(`stage/${STG.cid}/ans/${STG.qi}/${u}`).set({c:opt,f:Math.round(frac*100)/100,d:STG.lives<=0?1:0}).catch(()=>{}); }
function stgQTick(dt,C){
  // 잠금 없음: 시간이 끝날 때 서 있는 발판이 답. 빠른 보너스는 그 발판에 마지막으로 도착한 시각으로 계산해요
  const slot=stgSlotAt(P.x,P.z);
  if (slot!==STG.slotHold){ STG.slotHold=slot; STG.lockFrac=slot>=0?Math.max(0,C.left/C.dur):0;
    const q=STG.qs[STG.qi];
    $('#stLock').textContent=slot<0?(STG.lives>0?'정답 발판으로 달려가요! 일찍 도착할수록 점수 UP':'👻 관전 중 · 이 문제를 맞히면 부활해요!')
      :`지금 ${q.k==='mc'?(slot+1)+'번':(stgOptOfSlot(slot)?'X':'O')} 발판 · 시간이 끝날 때 서 있는 발판이 내 답이에요`; }
  const k=Math.max(0,Math.min(1,C.left/C.dur)); $('#stBar').style.width=(k*100)+'%'; $('#stBar').classList.toggle('hurry',k<.3);
  $('#stTime').textContent=Math.ceil(C.left)+'초';
  STG.ring.visible=false;
}
function stgReveal(){
  const i=STG.qi, item=stgItem(i), C=stgCorrectOpt();
  const slot=stgSlotAt(P.x,P.z), opt=stgOptOfSlot(slot), frac=slot>=0&&slot===STG.slotHold?STG.lockFrac:0;
  if (opt>=0) stgSendAns(opt,frac);
  const ok=opt===C, dead=STG.lives<=0;
  settle(ok,item,{type:'stage'});
  let msg='';
  if (ok){ SFX.correct();
    if (dead){ STG.lives=1; msg='부활! ❤️ 1개로 다시 시작해요'; }
    else { const bonus=Math.round(50*frac/5)*5; STG.score+=100+bonus; STG.correct++; W.speedPts=(W.speedPts||0)+bonus; msg=`정답! +${100+bonus}점`+(bonus?` (일찍 도착 +${bonus})`:''); }
  } else { SFX.wrong();
    if (!dead){ STG.lives--; msg=opt<0?'발판을 고르지 않았어요… ❤️ -1':'아쉬워요… ❤️ -1'; } else msg='아쉬워요… 다음 문제에서 다시 도전!';
    if (opt>=0||!dead) { STG.falling=true; STG.fallV=0; }
    shake=.3; }
  if (!ok && STG.lives<=0 && !dead) msg+=' · 목숨을 모두 잃었어요. 👻 관전하며 맞히면 부활해요';
  const m=$('#stMsg'); m.className='run-res card '+(ok?'good':'bad'); m.hidden=false;
  m.innerHTML=`<b>${msg}</b><small>정답: ${esc(correctText(item))}</small><p>${esc(item.e||'')}</p>`;
  $('#stQ').hidden=true; STG.ring.visible=false;
  stgWriteMe();
  setTimeout(()=>{ if (STG.qi===i) stgLoadGhosts(i); },1300);   // 친구들 답이 모두 올라올 때까지 잠깐 기다려요
}
/* 친구들: 결과가 나올 때만, 내 발판 배치 위에 보여요 */
/* 친구들: 항상 보여요. 친구 화면에서 서 있는 자리를 그대로 보여 주는데, 발판 배치가 학생마다 달라서 따라가도 소용없어요.
   정답 발표 때는 친구가 고른 보기가 '내 화면'에서 놓인 발판으로 옮겨 가고, 틀린 친구는 발판과 함께 떨어져요. */
function stgClearGhosts(){ for (const u in STG.av){ const A=STG.av[u]; A.rv=null; A.y=0; } }
function stgAvatar(u){
  let A=STG.av[u]; if (A) return A;
  const info=STG.names[u]; if (!info) return null;
  const job=JOBS[info.job]?info.job:'knight', ch=makePlayerChar(job), g=new THREE.Group(); g.add(ch.root); scene.add(g);
  dressP2(ch,{...DEFAULTS[job],...(info.look||{})}).catch(()=>{});
  const tag=nameTag(info.n||'친구'); tag.position.y=3.05; g.add(tag); ch.anim.setBase('idle');
  A={u,g,ch,x:0,z:0,f:0,y:0,rv:null,seen:0}; STG.av[u]=A; return A;
}
function stgRemoveAvatars(){ for (const u in STG.av){ const A=STG.av[u]; scene.remove(A.g); A.ch.mixer.stopAllAction(); } STG.av={}; }
function stgListenLive(){
  stgUnlisten(); const c=STG.cid, me=myUid(); const r=fbDb.ref(`stage/${c}/pos`);
  const cb=s=>{ if (s.key===me) return; const a=String(s.val()||'').split(','); if (a.length<3) return; STG.live[s.key]={x:+a[0]/10,z:+a[1]/10,f:+a[2]/100,t:performance.now()}; };
  r.on('child_added',cb,()=>{}); r.on('child_changed',cb,()=>{}); STG.liveRef=[r,cb];
}
function stgUnlisten(){ if (STG.liveRef){ const [r,cb]=STG.liveRef; r.off('child_added',cb); r.off('child_changed',cb); STG.liveRef=null; } STG.live={}; }
function stgSendPos(dt){
  STG.posT-=dt; if (STG.posT>0) return; STG.posT=.2;
  const s=[Math.round(P.x*10),Math.round(P.z*10),Math.round(Math.atan2(P.fx,P.fz)*100)].join(','); if (s===STG.posLast) return; STG.posLast=s;
  fbDb.ref(`stage/${STG.cid}/pos/${myUid()}`).set(s).catch(()=>{});
}
function stgAvatarTick(dt){
  const now=performance.now();
  for (const u in STG.live){ const L=STG.live[u], A=stgAvatar(u); if (!A) continue;
    A.g.visible=now-L.t<30000||!!A.rv;
    let tx=L.x, tz=L.z, ty=0;
    if (A.rv){ tx=A.rv.x; tz=A.rv.z; if (!A.rv.ok&&A.rv.fall){ A.rv.vy+=24*dt; A.y-=A.rv.vy*dt; } ty=A.y; }
    const ox=A.x, oz=A.z, k=Math.min(1,dt*(A.rv?6:12)); A.x+=(tx-A.x)*k; A.z+=(tz-A.z)*k;
    const mv=Math.hypot(A.x-ox,A.z-oz)/Math.max(dt,1e-3);
    if (mv>.4){ const f=Math.atan2(A.x-ox,A.z-oz); let df=f-A.f; df=Math.atan2(Math.sin(df),Math.cos(df)); A.f+=df*Math.min(1,dt*12); }
    A.g.position.set(A.x,Math.max(-40,ty),A.z); A.ch.root.rotation.y=A.f;
    A.ch.anim.setBase(mv>1.2?'run':'idle'); A.ch.mixer.update(dt);
  }
}
async function stgLoadGhosts(i){
  let v=null; try{ v=(await fbDb.ref(`stage/${STG.cid}/ans/${i}`).once('value')).val(); }catch(e){}
  if (STG.qi!==i||!v) return;
  const me=myUid(), C=stgCorrectOpt(), q=STG.qs[i]; let right=0, all=0;
  for (const u in v){ const a=v[u]; if (!a||typeof a.c!=='number'||a.c<0) continue; all++; if (a.c===C) right++; if (u===me) continue;
    const A=stgAvatar(u); if (!A) continue;
    const slot=stgSlotOfOpt(a.c), rng=stgRng(stgHash(u+':'+i));
    let x,z; if (q.k==='mc'){ const [sx,sz]=STG_SLOT[slot]; x=sx*(1.4+rng()*5.2); z=sz*(1.4+rng()*5.2); } else { x=(slot?1:-1)*(1.4+rng()*5.4); z=-6.8+rng()*13.6; }
    A.rv={x,z,ok:a.c===C,vy:0,fall:false}; A.y=0; A.g.visible=true;
    setTimeout(()=>{ if (A.rv) A.rv.fall=true; },700); }
  const rate=all?Math.round(right/all*100):0;
  const m=$('#stMsg'); if (!m.hidden && all) m.insertAdjacentHTML('beforeend',`<p class="st-rate">반 전체 정답률 ${rate}% (${right}/${all}명)</p>`);
}
function stgSlabsUp(instant){ STG.dropK=0; [...STG.slabs,...STG.oxSlabs].forEach(s=>{ s.g.position.y=0; }); if (STG.start){ STG.start.position.y=.05; STG.start.visible=true; } }
function stgRvTick(dt){
  STG.dropK=Math.min(1,STG.dropK+dt*.8);
  const C=stgCorrectOpt(), q=STG.qs[STG.qi], cs=stgSlotOfOpt(C), y=-STG.dropK*STG.dropK*30;
  if (q.k==='mc') STG.slabs.forEach((s,slot)=>{ if (slot!==cs) s.g.position.y=y; });
  else STG.oxSlabs.forEach((s,slot)=>{ if (slot!==cs) s.g.position.y=y; });
  if (STG.start){ STG.start.position.y=.05+y; STG.start.visible=y>-25; }   // 가운데 출발 원판도 오답 발판과 함께 떨어져요
}
async function stgShowRank(){
  if (STG.rank) return; STG.rank=true;
  $('#stQ').hidden=true; $('#stMsg').hidden=true;
  let v={}; try{ v=(await fbDb.ref(`stage/${STG.cid}/p`).once('value')).val()||{}; }catch(e){}
  const me=myUid(), list=Object.entries(v).map(([u,p])=>({u,...p})).sort((a,b)=>(b.s|0)-(a.s|0)||(b.l|0)-(a.l|0));
  const myR=list.findIndex(p=>p.u===me)+1;
  $('#stRankList').innerHTML=list.slice(0,10).map((p,i)=>`<li class="${p.u===me?'me':''}"><b>${i+1}</b><span>${esc(p.n||'친구')}</span><em>${'❤️'.repeat(Math.max(0,p.l|0))||'👻'}</em><strong>${p.s|0}점</strong></li>`).join('')+(myR>10?`<li class="me"><b>${myR}</b><span>${esc(myName())}</span><em></em><strong>${STG.score}점</strong></li>`:'');
  $('#stRankMe').textContent=myR?`나는 ${list.length}명 중 ${myR}등 · ${STG.score}점 · 정답 ${STG.correct}개`:'';
  $('#stRank').hidden=false;
}
function stgEndUI(){ stgUnlisten(); stgRemoveAvatars(); document.body.classList.remove('stagemode'); ['#stHud','#stQ','#stMsg','#stRank'].forEach(s=>{ const e=$(s); if (e) e.hidden=true; }); STG.ring.visible=false; }
function stgFinish(){ $('#stRank').hidden=true; if (W.state==='play') endGame(STG.lives>0); }
function stageFrame(dt,real,now){
  if (knight && (knight.anim.dead||endPose)){ knight.anim.revive(); endPose=false; }   // 지난 판에서 쓰러진(누운) 자세가 남지 않게
  if (!W.paused) W.t+=dt;
  lobbyTick(real,dt);
  const C=stgClock();
  // 이동 (떨어지는 중이 아니면)
  let moving=false;
  if (!STG.falling && !W.paused && C.ph!=='done'){
    const am=arrowsMove();
    let ix=(keys.KeyD||am&&keys.ArrowRight?1:0)-(keys.KeyA||am&&keys.ArrowLeft?1:0)+joy.x, iz=(keys.KeyS||am&&keys.ArrowDown?1:0)-(keys.KeyW||am&&keys.ArrowUp?1:0)+joy.y;
    const L=Math.hypot(ix,iz); if (L>.12){ if (L>1){ ix/=L; iz/=L; } P.x+=ix*7.5*dt; P.z+=iz*7.5*dt; P.fx=ix; P.fz=iz; moving=true; }
    P.x=Math.max(-STG_HALF,Math.min(STG_HALF,P.x)); P.z=Math.max(-STG_HALF,Math.min(STG_HALF,P.z));
  }
  if (STG.falling){ STG.fallV=(STG.fallV||0)+24*dt; STG.fallY-=STG.fallV*dt; if (STG.fallY<-40) STG.fallY=-40; }
  // 단계 바뀜
  if (C.ph==='q'){ if (STG.qi!==C.i || STG.phase!=='q') stgSetupQ(C.i); stgQTick(dt,C); }
  else if (C.ph==='rv'){ if (STG.qi!==C.i){ stgSetupQ(C.i); } if (STG.phase!=='rv'||STG.rvShown!==C.i){ STG.rvShown=C.i; stgReveal(); } stgRvTick(dt); }
  else if (C.ph==='wait'||C.ph==='intro'||C.ph==='load'){ $('#stQ').hidden=true; const m=$('#stMsg'); m.hidden=false; m.className='run-res card';
    STG.pT-=dt; if (STG.pT<=0){ STG.pT=3; fbDb.ref(`stage/${STG.cid}/p`).once('value').then(s=>{ STG.joinN=Object.keys(s.val()||{}).length; }).catch(()=>{}); }
    m.innerHTML=C.ph==='intro'?`<b>곧 시작해요! ${Math.ceil(C.left)}</b><p>문제가 뜨면 정답 발판으로 달려가요. 발판 배치는 친구마다 달라요!</p>`:`<b>선생님이 곧 시작해요</b><p>지금 ${STG.joinN}명 들어왔어요 · WASD로 발판 위를 걸어 보세요</p>`; }
  else if (C.ph==='done'||C.ph==='gone'){ stgShowRank(); }
  STG.phase=C.ph;
  STG.nameT-=dt; if (STG.nameT<=0){ STG.nameT=4; fbDb.ref(`stage/${STG.cid}/p`).once('value').then(s=>{ const v=s.val()||{}; STG.names=v; STG.joinN=Object.keys(v).length; }).catch(()=>{}); }
  if (C.ph!=='done'&&C.ph!=='gone'&&!STG.falling) stgSendPos(dt);
  stgAvatarTick(dt);
  // 캐릭터
  pg.position.set(P.x,STG.fallY,P.z); { let dy=Math.atan2(P.fx,P.fz)-pg.rotation.y; dy=Math.atan2(Math.sin(dy),Math.cos(dy)); pg.rotation.y+=dy*Math.min(1,dt*14); }
  pg.traverse&&0;
  if (knight){ const A=knight.anim; setBaseSynced(A,moving?'run':'idle',moving?1.15:1); knight.mixer.update(dt); }
  if (STG.falling && STG.fallY<-14 && C.ph!=='rv'){ STG.falling=false; STG.fallY=0; P.x=0; P.z=0; }
  for (const c of clouds){ c.position.x+=c.userData.v*dt; if (c.position.x>130) c.position.x=-130; }
  fx.update(dt); updateCombatFx(dt); updateDreamy(real); qualityTick(now);
  { const o=sun.userData.off||[22,38,14]; sun.position.set(P.x+o[0],o[1],P.z+o[2]); sun.target.position.set(P.x,0,P.z); sun.target.updateMatrixWorld(); }
  const tgt=new THREE.Vector3(P.x*.3,19,P.z*.3+12.5); camera.position.lerp(tgt,W.snapCam?1:Math.min(1,dt*6)); W.snapCam=false; camera.lookAt(P.x*.3,0,P.z*.3-3.2);
  if (shake>0){ shake=Math.max(0,shake-dt); camera.position.x+=rnd(-1,1)*shake*.6; camera.position.y+=rnd(-1,1)*shake*.6; }
  $('#stLives').textContent=STG.lives>0?'❤️'.repeat(STG.lives)+'🤍'.repeat(Math.max(0,3-STG.lives)):'👻 관전 중';
  $('#stScore').textContent=`${STG.score}점`;
  $('#stProg').textContent=STG.meta&&STG.qs?`문제 ${Math.min((STG.meta.n||STG.qs.length),Math.max(1,STG.qi+1))}/${Math.min(STG.meta.n||STG.qs.length,STG.qs.length)}`:'';
  renderFrame();
}
/* 잠금 고리: 1.5초 동안 채워져요 */
STG.ring=(()=>{ const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uK:{value:0}},
  vertexShader:'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader:'uniform float uK; varying vec2 vU; void main(){ vec2 p=vU-.5; float r=length(p); if (r<.36||r>.5) discard; float a=atan(p.x,-p.y)/6.2831853+.5; vec3 c=a<uK?vec3(1.,.85,.25):vec3(1.); gl_FragColor=vec4(c,a<uK?.95:.35); }'});
  const g=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),m); g.rotation.x=-Math.PI/2; g.visible=false; scene.add(g); return g; })();
$('#stageBtn')&&$('#stageBtn').addEventListener('click',stageJoin);
$('#stRankGo')&&$('#stRankGo').addEventListener('click',stgFinish);
