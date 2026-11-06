/* 사회 게임 RPG · 정답 러너 · 앞으로 달리며 정답 색깔 문으로 통과해요
   ← → (A D) 줄 바꾸기 · 스페이스(↑ W) 점프. 4지선다는 4줄, O/X는 왼쪽 두 줄 = O, 오른쪽 두 줄 = X.
   파일은 01 → 13 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요. */
const RUN_LANES=[-4.5,-1.5,1.5,4.5], RUN_COL=['#e5484d','#3b82f6','#22a35a','#e8a400'], RUN_OXCOL=['#3b82f6','#e5484d'];
const RUN_TILE=40, RUN_NT=9;
const RUN_LV={easy:{n:10,spd:8,read:1.25}, normal:{n:12,spd:9.5,read:1.05}, hard:{n:15,spd:11,read:.92}, hero:{n:18,spd:12.5,read:.82}};
const RUN={tiles:[],far:null,dyn:null,gate:null,obs:[],coins:[],lane:1,y:0,vy:0,spd:9,stun:0,hearts:3,combo:0,maxCombo:0,coinsN:0,done:0,n:12,nextAt:0,res:null,lean:0,lv:null,hits:0};

/* 길 무늬: 밝은 흙길 + 줄 경계 점선 */
const runRoadTex=canvasTex(256,256,(g,w,h)=>{
  g.fillStyle='#b39565'; g.fillRect(0,0,w,h);
  for (let i=0;i<2600;i++){ g.fillStyle=Math.random()<.5?'rgba(140,105,60,.16)':'rgba(255,240,205,.25)'; g.fillRect(Math.random()*w,Math.random()*h,rnd(1,4),rnd(1,3)); }
  g.fillStyle='rgba(255,255,255,.85)'; for (const x of [.25,.5,.75]) for (let y=0;y<h;y+=64) g.fillRect(x*w-3,y+8,6,34);
  g.fillStyle='rgba(120,90,50,.45)'; g.fillRect(0,0,6,h); g.fillRect(w-6,0,6,h);
});
runRoadTex.wrapS=THREE.ClampToEdgeWrapping; runRoadTex.wrapT=THREE.RepeatWrapping; runRoadTex.repeat.set(1,RUN_TILE/12);

function buildRunner(){
  const grassT=grassTex.clone(); grassT.needsUpdate=true; grassT.wrapS=grassT.wrapT=THREE.RepeatWrapping; grassT.repeat.set(10,4.5);
  const grassM=toonMat({map:grassT}), roadM=toonMat({map:runRoadTex}), curbM=std(0x9a8f7c,{roughness:.9});
  const decor=['tree_single_A','tree_single_B','trees_A_large','trees_B_medium','rock_single_A','rock_single_C','rock_single_E'];
  for (let i=0;i<RUN_NT;i++){
    const t=new THREE.Group(); scene.add(t);
    const gr=new THREE.Mesh(new THREE.PlaneGeometry(110,RUN_TILE),grassM); gr.rotation.x=-Math.PI/2; gr.receiveShadow=true; t.add(gr);
    const rd=new THREE.Mesh(new THREE.PlaneGeometry(12.4,RUN_TILE),roadM); rd.rotation.x=-Math.PI/2; rd.position.y=.02; rd.receiveShadow=true; t.add(rd);
    for (const s of [-1,1]){ const c=cs(new THREE.Mesh(new THREE.BoxGeometry(.5,.28,RUN_TILE),curbM)); c.position.set(s*6.45,.14,0); t.add(c); }
    for (let k=0;k<7;k++){ const s=k%2?1:-1, x=s*rnd(9.5,34), z=rnd(-RUN_TILE/2,RUN_TILE/2), n=decor[(i*7+k)%decor.length];
      const o=place(n,x,z,n.startsWith('trees')?rnd(4,5.5):n.startsWith('tree')?rnd(3.2,4.4):rnd(2.5,4),rnd(0,6),false); if (o) t.add(o); }
    if (i%2===0) for (const s of [-1,1]){ const f=place('fence_wood_straight',s*7.6,rnd(-12,12),3.2,Math.PI/2,false); if (f) t.add(f); }
    RUN.tiles.push(t);
  }
  /* 멀리 보이는 산 · 언덕 (나를 따라와요) */
  RUN.far=new THREE.Group(); scene.add(RUN.far);
  for (let i=0;i<14;i++){ const s=i%2?1:-1, n=i%3?'mountain_A_grass_trees':'hills_A_trees';
    const o=place(n,s*rnd(55,85),-rnd(40,260),rnd(12,20),rnd(0,6),false); if (o) RUN.far.add(o); }
  RUN.dyn=new THREE.Group(); scene.add(RUN.dyn);
}
MAP_BUILD.runner=()=>buildRunner();
GRASS_OK.runner=null;

/* ---------- 문 · 장애물 · 코인 ---------- */
function runWrap(g,text,maxW,font,lineH,maxLines){
  g.font=font; const words=String(text).split(''), lines=[]; let cur='';
  for (const ch of words){ const t=cur+ch; if (g.measureText(t).width>maxW && cur){ lines.push(cur); cur=ch.trim()?ch:''; } else cur=t; }
  if (cur) lines.push(cur);
  if (lines.length>maxLines){ lines.length=maxLines; lines[maxLines-1]=lines[maxLines-1].slice(0,-1)+'…'; }
  return lines;
}
function runPanelTex(label,text,color,wide){
  const W2=wide?768:512, H2=384, cv=document.createElement('canvas'); cv.width=W2; cv.height=H2; const g=cv.getContext('2d');
  g.fillStyle=color; roundRect(g,8,8,W2-16,H2-16,36); g.fill();
  g.strokeStyle='rgba(255,255,255,.9)'; g.lineWidth=10; roundRect(g,14,14,W2-28,H2-28,30); g.stroke();
  g.fillStyle='#fff'; g.textAlign='center'; g.textBaseline='middle';
  if (!text){ g.font=`bold ${wide?260:220}px Jua, "Malgun Gothic", sans-serif`; g.fillText(label,W2/2,H2/2+12); }
  else {
    g.font='bold 92px Jua, "Malgun Gothic", sans-serif'; g.fillText(label,W2/2,82);
    const len=String(text).length, fs=len>22?40:len>14?48:len>8?58:68;
    const lines=runWrap(g,text,W2-60,`${fs}px Jua, "Malgun Gothic", sans-serif`,fs*1.18,3);
    lines.forEach((l,i)=>g.fillText(l,W2/2,H2/2+40+(i-(lines.length-1)/2)*fs*1.18));
  }
  const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding; t.anisotropy=4; return t;
}
function runMakeGate(item,z){
  const g=new THREE.Group(); g.position.set(0,0,z); RUN.dyn.add(g);
  let opts, ci;
  if (item.kind==='mc'){ const order=item.o.map((_,i)=>i).sort(()=>Math.random()-.5); opts=order.map(i=>item.o[i]); ci=order.indexOf(0); }
  else { opts=['O','X']; ci=item.a?0:1; }
  const postM=std(0x6b4a2f,{roughness:.9}), texs=[];
  for (const x of [-6,-3,0,3,6]){ if (item.kind!=='mc'&&x!==-6&&x!==0&&x!==6) continue; const p=cs(new THREE.Mesh(new THREE.BoxGeometry(.32,4.6,.32),postM)); p.position.set(x,2.3,0); g.add(p); }
  const beam=cs(new THREE.Mesh(new THREE.BoxGeometry(12.6,.36,.4),postM)); beam.position.set(0,4.7,0); g.add(beam);
  const panel=(tex,x,w)=>{ texs.push(tex); const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w*.75*(w>4?.55:1)),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,toneMapped:false})); m.position.set(x,3.05,0); g.add(m); };
  const floor=(x,w,col)=>{ const f=new THREE.Mesh(new THREE.PlaneGeometry(w,16),new THREE.MeshBasicMaterial({color:new THREE.Color(col),transparent:true,opacity:.28,depthWrite:false})); f.rotation.x=-Math.PI/2; f.position.set(x,.04,8); g.add(f); };
  if (item.kind==='mc') opts.forEach((o,i)=>{ panel(runPanelTex(String(i+1),o,RUN_COL[i],false),RUN_LANES[i],2.85); floor(RUN_LANES[i],2.9,RUN_COL[i]); });
  else opts.forEach((o,i)=>{ panel(runPanelTex(o,'',RUN_OXCOL[i],true),i?3:-3,5.8); floor(i?3:-3,5.9,RUN_OXCOL[i]); });
  return {g,item,opts,ci,z,texs,startZ:P.z};
}
function runDisposeGate(G){ if (!G) return; RUN.dyn.remove(G.g); G.texs.forEach(t=>t.dispose()); }
const RUN_COIN_GEO=new THREE.CylinderGeometry(.42,.42,.12,20), RUN_COIN_MAT=new THREE.MeshStandardMaterial({color:0xffc531,emissive:0xb37a00,emissiveIntensity:.45,metalness:.6,roughness:.3});
function runSpawnStuff(z0,z1){
  // z0(가까운 곳) → z1(먼 곳, 더 작은 값). 문 바로 앞 18칸은 비워 둬요
  for (let z=z0-6; z>z1+18; z-=rnd(11,15)){
    const free=Math.floor(Math.random()*4), r=Math.random();
    if (r<.5){ const ln=[0,1,2,3].filter(l=>l!==free)[Math.floor(Math.random()*3)];
      const o=place(Math.random()<.6?'barrel':'crate_A_big',RUN_LANES[ln],z,Math.random()<.6?4.6:4.2,rnd(0,6),false);
      if (o){ RUN.dyn.add(o); RUN.obs.push({o,z,lane:ln,jump:o.userData.jump=true,hit:false}); } }
    else if (r<.75){ const ls=[0,1,2,3].filter(l=>l!==free).sort(()=>Math.random()-.5).slice(0,2);
      ls.forEach(ln=>{ const o=place('crate_A_big',RUN_LANES[ln],z,4.4,rnd(0,6),false); if (o){ RUN.dyn.add(o); RUN.obs.push({o,z,lane:ln,jump:true,hit:false}); } }); }
    if (Math.random()<.55) for (let k=0;k<3;k++){ const c=new THREE.Mesh(RUN_COIN_GEO,RUN_COIN_MAT); c.rotation.x=Math.PI/2; c.position.set(RUN_LANES[free],1.1,z+3-k*2); RUN.dyn.add(c); RUN.coins.push({m:c,lane:free,z:z+3-k*2}); }
  }
}

/* ---------- 판 진행 ---------- */
function runnerReset(){
  document.body.classList.remove('runner');
  ['#runHud','#runQ','#runRes','#runHelp'].forEach(s=>{ const e=$(s); if (e) e.hidden=true; });
  if (MAPK!=='runner' || !RUN.dyn) return;
  runDisposeGate(RUN.gate); RUN.gate=null;
  while (RUN.dyn.children.length) RUN.dyn.remove(RUN.dyn.children[0]);
  RUN.obs=[]; RUN.coins=[];
  const lv=RUN_LV[MODE==='hero'?'hero':LEVEL]||RUN_LV.normal; RUN.lv=lv;
  Object.assign(RUN,{lane:1,y:0,vy:0,spd:lv.spd,stun:0,hearts:3,combo:0,maxCombo:0,coinsN:0,done:0,n:lv.n,nextAt:2.2,res:null,lean:0,hits:0});
  P.x=RUN_LANES[1]; P.z=0; P.fx=0; P.fz=-1;
  RUN.tiles.forEach((t,i)=>{ t.position.z=20-i*RUN_TILE; });
  runSpawnStuff(-8,-60);
  W.nextWaveAt=-1; W.nextQuiz=1e9;
  document.body.classList.add('runner');
  $('#runHud').hidden=false; $('#runHelp').hidden=false; setTimeout(()=>{ if ($('#runHelp')) $('#runHelp').hidden=true; },7000);
  setTimeout(()=>{ if (MAPK==='runner'&&W.state==='play') showBanner('준비… 출발!'); },300);
}
function runNextQuestion(){
  const hasMC=MC.length>0, hasOX=OX.length>0;
  const kind=hasMC&&hasOX?(Math.random()<.62?'mc':'ox'):hasMC?'mc':'ox';
  const item=kind==='mc'?pick(['mc'],MC):pick(['ox'],OX);
  if (!item){ endGame(true); return; }
  const read=(item.kind==='mc'?9:6)*RUN.lv.read*(MODE==='hero'?1:EASEF.quiz||1);
  const dist=Math.max(40,RUN.spd*read);
  RUN.gate=runMakeGate(item,P.z-dist);
  runSpawnStuff(P.z,RUN.gate.z);
  // 문제 칸
  $('#runQText').textContent=(item.kind==='ox'?'[O/X] ':'')+item.q;
  const box=$('#runOpts'); box.className='run-opts'+(item.kind==='ox'?' two':'');
  box.innerHTML=RUN.gate.opts.map((o,i)=>`<div class="run-opt" style="--c:${item.kind==='mc'?RUN_COL[i]:RUN_OXCOL[i]}"><b>${item.kind==='mc'?i+1:o}</b>${item.kind==='mc'?`<span>${esc(o)}</span>`:`<span>${i?'오른쪽 두 줄':'왼쪽 두 줄'}</span>`}</div>`).join('');
  $('#runQ').hidden=false; $('#runProg').textContent=`문제 ${RUN.done+1}/${RUN.n}`;
}
function runLaneNow(){ let best=0, bd=99; RUN_LANES.forEach((x,i)=>{ const d=Math.abs(P.x-x); if (d<bd){ bd=d; best=i; } }); return best; }
function runPassGate(){
  const G=RUN.gate; RUN.gate=null; const ln=runLaneNow();
  const pickI=G.item.kind==='mc'?ln:(ln<2?0:1), ok=pickI===G.ci;
  let sp=0; if (ok){ RUN.combo++; RUN.maxCombo=Math.max(RUN.maxCombo,RUN.combo); sp=Math.min(50,20+RUN.combo*5); W.speedPts=(W.speedPts||0)+sp; } else RUN.combo=0;
  settle(ok,G.item,{type:'runner'});
  RUN.done++;
  let extra='';
  if (ok){ SFX.correct(); fx.burst(P.x,1.5,P.z,0xffd34d,30,6); RUN.spd=RUN.lv.spd*(1+Math.min(.35,RUN.combo*.05));
    if (RUN.combo>0 && RUN.combo%5===0 && RUN.hearts<3){ RUN.hearts++; extra=' · ❤️ 하트 회복!'; } }
  else { SFX.wrong(); RUN.hearts--; RUN.stun=.6; shake=.3; fx.burst(P.x,1.2,P.z,0x8a8fa0,18,4); RUN.spd=RUN.lv.spd; }
  const r=$('#runRes'); r.className='run-res '+(ok?'good':'bad'); r.hidden=false;
  r.innerHTML=ok?`<b>정답! ${RUN.combo>=2?`🔥 ${RUN.combo}연속`:''}</b> <small>+${sp}점${extra}</small><p>${esc(G.item.e||'')}</p>`
    :`<b>아쉬워요… ❤️ -1</b> <small>정답: ${esc(correctText(G.item))}</small><p>${esc(G.item.e||'')}</p>`;
  RUN.res=W.t+(ok?3:4.5);
  $('#runQ').hidden=true;
  setTimeout(()=>runDisposeGate(G),1500);
  if (RUN.hearts<=0){ setTimeout(()=>{ if (MAPK==='runner'&&W.state==='play') endGame(false); },900); RUN.nextAt=1e9; return; }
  if (RUN.done>=RUN.n){ setTimeout(()=>{ if (MAPK==='runner'&&W.state==='play') endGame(true); },1400); RUN.nextAt=1e9; return; }
  RUN.nextAt=W.t+(ok?2.2:3);
}
function runUpdate(dt){
  // 이동
  const spd=RUN.spd*(RUN.stun>0?.45:1); RUN.stun=Math.max(0,RUN.stun-dt);
  P.z-=spd*dt;
  const tx=RUN_LANES[RUN.lane], dx=tx-P.x; P.x+=Math.sign(dx)*Math.min(Math.abs(dx),15*dt); RUN.lean+=(Math.max(-1,Math.min(1,dx))-RUN.lean)*Math.min(1,dt*10);
  if (RUN.y>0||RUN.vy>0){ RUN.vy-=26*dt; RUN.y=Math.max(0,RUN.y+RUN.vy*dt); if (RUN.y===0) RUN.vy=0; }
  // 길 이어 붙이기
  for (const t of RUN.tiles){ if (t.position.z-RUN_TILE/2>P.z+16) t.position.z-=RUN_TILE*RUN_NT; }
  RUN.far.position.z=P.z;
  // 문제 · 문
  if (!RUN.gate && W.t>=RUN.nextAt) runNextQuestion();
  if (RUN.gate){ const G=RUN.gate, tot=G.startZ-G.z, k=Math.max(0,Math.min(1,(P.z-G.z)/tot)); $('#runBar').style.width=(k*100)+'%'; $('#runBar').classList.toggle('hurry',k<.3);
    if (P.z<=G.z) runPassGate(); }
  if (RUN.res && W.t>=RUN.res){ RUN.res=null; $('#runRes').hidden=true; }
  // 장애물 · 코인
  const ln=runLaneNow();
  for (const o of RUN.obs){ if (o.hit) continue; if (Math.abs(o.z-P.z)<.85 && o.lane===ln && Math.abs(P.x-RUN_LANES[o.lane])<1.3){
      if (RUN.y>.85){ continue; }
      o.hit=true; RUN.stun=1; RUN.hits++; shake=.35; SFX.door&&SFX.door(); fx.burst(P.x,1,P.z-.6,0xc9a06a,14,4); flashPrompt('쿵! 점프(스페이스)하거나 줄을 바꿔 피해요',1.4); } }
  for (const c of RUN.coins){ if (!c.m.parent) continue; c.m.rotation.z+=dt*4;
    if (Math.abs(c.z-P.z)<.9 && c.lane===ln && RUN.y<2.2){ RUN.dyn.remove(c.m); RUN.coinsN++; W.cardCoins=(W.cardCoins||0)+1; SFX.card&&SFX.card(); fx.burst(c.m.position.x,1.1,c.z,0xffc531,6,2); } }
  // 지나간 것 치우기
  RUN.obs=RUN.obs.filter(o=>{ if (o.z>P.z+14){ RUN.dyn.remove(o.o); return false; } return true; });
  RUN.coins=RUN.coins.filter(c=>{ if (c.z>P.z+14||!c.m.parent){ if (c.m.parent) RUN.dyn.remove(c.m); return false; } return true; });
}
function runHUD(){
  $('#runHearts').textContent='❤️'.repeat(Math.max(0,RUN.hearts))+'🤍'.repeat(Math.max(0,3-RUN.hearts));
  $('#runCombo').textContent=RUN.combo>=2?`🔥 ${RUN.combo}연속`:'';
  $('#runCoins').textContent=`🪙 ${RUN.coinsN}`;
  if (!RUN.gate) $('#runProg').textContent=`문제 ${Math.min(RUN.n,RUN.done+1)}/${RUN.n}`;
}
function runnerFrame(dt,real,now){
  if (!W.paused){ W.t+=dt; runUpdate(dt); }
  lobbyTick(real,dt);
  pg.position.set(P.x,RUN.y,P.z); pg.rotation.set(0,Math.PI-RUN.lean*.25,0);
  if (knight){ const A=knight.anim; setBaseSynced(A,'run',Math.min(2.4,Math.max(1,RUN.spd*(RUN.stun>0?.45:1)/6.5))); knight.mixer.update(W.paused?0:dt); }
  for (const c of clouds){ c.position.x+=c.userData.v*dt; if (c.position.x>130) c.position.x=-130; }
  fx.update(dt); updateCombatFx(dt); updateDreamy(real); qualityTick(now);
  { const o=sun.userData.off||[22,38,14]; sun.position.set(P.x+o[0],o[1],P.z+o[2]); sun.target.position.set(P.x,0,P.z); sun.target.updateMatrixWorld(); }
  const cx=P.x*.45, tgt=new THREE.Vector3(cx,6.6,P.z+10.5);
  camera.position.lerp(tgt,W.snapCam?1:Math.min(1,dt*8)); W.snapCam=false; camera.lookAt(P.x*.55,1.6,P.z-9);
  if (shake>0){ shake=Math.max(0,shake-dt); camera.position.x+=rnd(-1,1)*shake*.6; camera.position.y+=rnd(-1,1)*shake*.6; }
  limitTick(); if (W.state!=='play'){ renderFrame(); return; }
  runHUD(); renderFrame();
}
/* 키 입력: 러너 판에서는 다른 조작(공격 · 스킬)보다 먼저 받아요 */
addEventListener('keydown',e=>{
  if (MAPK!=='runner' || W.state!=='play' || W.paused) return;
  const k=e.code;
  if (k==='ArrowLeft'||k==='KeyA'){ if (!e.repeat) RUN.lane=Math.max(0,RUN.lane-1); }
  else if (k==='ArrowRight'||k==='KeyD'){ if (!e.repeat) RUN.lane=Math.min(3,RUN.lane+1); }
  else if (k==='Space'||k==='ArrowUp'||k==='KeyW'){ if (RUN.y===0&&RUN.vy===0) RUN.vy=10; }
  else if (/^F\d+$|Escape|Tab/.test(k)) return;
  e.preventDefault(); e.stopImmediatePropagation();
},true);
function runEndUI(){ document.body.classList.remove('runner'); ['#runHud','#runQ','#runRes','#runHelp'].forEach(s=>{ const e=$(s); if (e) e.hidden=true; }); }
