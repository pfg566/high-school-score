/* 사회 게임 RPG · 조별 점령전 (선생님 화면이 판을 진행해요)
   죽지 않고 밀어내요: 맞을수록 '밀림 게이지'가 차고 더 멀리 밀려요. 꽉 찬 상태로 맞거나 섬 밖으로 떨어지면 본진으로 날아가요.
   거점 원 안에 우리 조만 있으면 점령, 가진 거점마다 1초마다 점수. 황금 거점 ×3, 마지막 30초 피버 ×2.
   데이터: tw/{학급}/meta · st(선생님 화면이 계산) · pl/{uid}(내 위치) · pi/{uid} · hit/{uid} · req · inv · trap · ev
   파일은 01 → 13 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요. */
const TW_R=30;
const TW_PTS=[{x:0,z:0,r:5.5,v:2,n:'가운데'},{x:0,z:-21,r:4,v:1,n:'북쪽'},{x:21,z:0,r:4,v:1,n:'동쪽'},{x:0,z:21,r:4,v:1,n:'남쪽'},{x:-21,z:0,r:4,v:1,n:'서쪽'}];
const TW_BASES=[{x:-17,z:-17},{x:17,z:-17},{x:17,z:17},{x:-17,z:17}], TW_BASE_R=4.2;
const TW_COL=['#e5484d','#3b82f6','#22a35a','#e8a400'], TW_NAME=['빨강 조','파랑 조','초록 조','노랑 조'], TW_EMO=['🔴','🔵','🟢','🟡'];
const TW_ITEMS={hammer:{e:'🔨',n:'거대 망치'},shoes:{e:'👟',n:'번개 신발'},bubble:{e:'🫧',n:'방패 거품'},tornado:{e:'🌪️',n:'회오리 폭탄'},banana:{e:'🍌',n:'바나나 함정'}};
const TW_JOB={knight:{cd:.5,scd:6,anim:'slashH',sanim:'stab'},archer:{cd:.45,scd:6,anim:'shoot',sanim:'shoot'},mage:{cd:1.3,scd:8,anim:'cast',sanim:'spin'}};
const TWC={cid:'',metaRef:null,meta:null,st:null,on:false,joining:false,team:-1,rp:{},refs:[],vx:0,vz:0,g:0,launch:0,lx:0,lz:0,fall:0,y:0,lastHit:null,cd:0,scd:0,item:'',hammer:false,fastT:0,bubbleT:0,slowT:0,slipT:0,boostT:0,
  dash:0,dashHit:{},an:0,ak:0,sendT:0,lastSent:'',traps:{},stats:{ko:0,items:0,out:0},endShown:false,joinAt:0,proj:[],reqT:0,ptV:[],baseV:[],itemV:{},trapV:{},pi:{},feedN:0};
const twTeamBase=t=>TW_BASES[(TWC.meta&&TWC.meta.nt===2)?[0,2][t]||0:t]||TW_BASES[0];

/* ---------- 맵: 바다 위 둥근 섬 ---------- */
function buildTeamwar(){
  const lin=c=>new THREE.Color(c).convertSRGBToLinear();
  const wm=new THREE.ShaderMaterial({fog:true,uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uTime:{value:0},uR:{value:TW_R+1},uShal:{value:lin(0x5cc8d8)},uDeep:{value:lin(0x1f6aa5)}}]),
    vertexShader:'varying vec2 vW;\n#include <fog_pars_vertex>\nvoid main(){ vec4 wp=modelMatrix*vec4(position,1.); vW=wp.xz; vec4 mvPosition=viewMatrix*wp; gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader:'uniform float uTime; uniform float uR; uniform vec3 uShal; uniform vec3 uDeep; varying vec2 vW;\n#include <common>\n#include <fog_pars_fragment>\nvoid main(){ float r=length(vW); vec3 col=mix(uShal,uDeep,smoothstep(uR,uR+18.,r)); float w=sin(vW.x*.33+uTime*.7)*sin(vW.y*.29-uTime*.6); col+=smoothstep(.75,1.,w)*.08; float a=atan(vW.y,vW.x); float e=r-uR+sin(a*13.+uTime*1.4)*.3; col=mix(col,vec3(1.),(1.-smoothstep(0.,1.4,e))*.6); gl_FragColor=vec4(col,1.);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n#include <fog_fragment>\n}'});
  TWC.water=wm;
  const sea=new THREE.Mesh(new THREE.RingGeometry(TW_R+.3,175,160,1),wm); sea.rotation.x=-Math.PI/2; sea.position.y=-1.2; scene.add(sea);
  const cliff=new THREE.Mesh(new THREE.CylinderGeometry(TW_R+.6,TW_R-.4,3,96,1,true),std(0x8a6b4a,{flatShading:true,side:THREE.DoubleSide})); cliff.position.y=-1.5; scene.add(cliff);
  const gT=grassTex.clone(); gT.needsUpdate=true; gT.wrapS=gT.wrapT=THREE.RepeatWrapping; gT.repeat.set(9,9);
  const top=new THREE.Mesh(new THREE.CircleGeometry(TW_R+.6,96),toonMat({map:gT})); top.rotation.x=-Math.PI/2; top.position.y=.005; top.receiveShadow=true; scene.add(top);
  /* 거점 */
  const stone=std(0x6e6a62,{roughness:.95,flatShading:true});
  TWC.ptV=TW_PTS.map((p,i)=>{
    stoneDisc(p.x,p.z,p.r);
    const g=new THREE.Group(); g.position.set(p.x,0,p.z); scene.add(g);
    const ringMat=capRingMat(), ring=new THREE.Mesh(arcGeo(p.r+.05,p.r+.7,-Math.PI/2,Math.PI*1.5,96),ringMat); ring.rotation.x=-Math.PI/2; ring.position.y=.1; ring.renderOrder=3; g.add(ring);
    const fill=new THREE.Mesh(new THREE.CircleGeometry(p.r,48),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false})); fill.rotation.x=-Math.PI/2; fill.position.y=.06; g.add(fill);
    const base=cs(new THREE.Mesh(new THREE.CylinderGeometry(.75,.95,.45,8),stone)); base.position.y=.22; g.add(base);
    const gemMat=new THREE.MeshStandardMaterial({color:0x8a93a5,emissive:0x000000,emissiveIntensity:.9,roughness:.15,flatShading:true});
    const gem=cs(new THREE.Mesh(new THREE.OctahedronGeometry(.5,0),gemMat),false); gem.scale.set(.75,1.45,.75); gem.position.y=1.5; g.add(gem);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.5,.9,10,24,1,true),new THREE.MeshBasicMaterial({color:0xffd34d,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending})); beam.position.y=5.2; g.add(beam);
    addCol(p.x,p.z,1.3,1.3);
    return {g,ring,ringMat,fill,gem,gemMat,beam};
  });
  /* 본진 4곳 */
  TWC.baseV=TW_BASES.map((b,i)=>{
    const pad=new THREE.Mesh(new THREE.CircleGeometry(TW_BASE_R,40),toonMat({color:0xbfb6a3})); pad.rotation.x=-Math.PI/2; pad.position.set(b.x,.03,b.z); pad.receiveShadow=true; scene.add(pad);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(TW_BASE_R,.22,8,48),std(0x8d8577)); rim.rotation.x=Math.PI/2; rim.scale.z=.6; rim.position.set(b.x,.05,b.z); scene.add(rim);
    const pole=cs(new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,4.4,8),std(0x6b4a2f))); pole.position.set(b.x,2.2,b.z); scene.add(pole);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1),new THREE.MeshBasicMaterial({color:new THREE.Color(TW_COL[i]),side:THREE.DoubleSide})); flag.position.set(b.x+.82,3.8,b.z); scene.add(flag);
    return {pad,flag};
  });
  /* 장애물 바위 · 나무 (가장자리 쪽) */
  const keep=[...TW_PTS.map(p=>[p.x,p.z,p.r+2.5]),...TW_BASES.map(b=>[b.x,b.z,TW_BASE_R+2]),[0,0,9]];
  const okAt=(x,z,m)=>Math.hypot(x,z)<TW_R-2&&!keep.some(([kx,kz,kr])=>Math.hypot(x-kx,z-kz)<kr+m);
  let n=0; for (let t=0;t<200&&n<10;t++){ const a=rnd(0,Math.PI*2), r=rnd(8,26), x=Math.cos(a)*r, z=Math.sin(a)*r; if (!okAt(x,z,1.5)) continue; place(['rock_single_A','rock_single_C','rock_single_E'][n%3],x,z,rnd(4,6),rnd(0,6)); n++; }
  n=0; for (let t=0;t<200&&n<12;t++){ const a=rnd(0,Math.PI*2), r=rnd(24,28.5), x=Math.cos(a)*r, z=Math.sin(a)*r; if (!okAt(x,z,1)) continue; place(Math.random()<.5?'tree_single_A':'tree_single_B',x,z,rnd(3.2,4.2),rnd(0,6),.25); n++; }
  TWC.dyn=new THREE.Group(); scene.add(TWC.dyn);
}
MAP_BUILD.teamwar=()=>buildTeamwar();
GRASS_OK.teamwar=null;

/* ---------- 선생님이 연 점령전 지켜보기 ---------- */
function twCidNow(){ return typeof stgCidNow==='function'?stgCidNow():''; }
function twWatch(){
  const cid=fbDb?twCidNow():'';
  if (cid===TWC.cid) return;
  if (TWC.metaRef){ TWC.metaRef.off(); TWC.metaRef=null; }
  TWC.cid=cid; TWC.meta=null; twBtn(); if (!cid) return;
  TWC.metaRef=fbDb.ref(`tw/${cid}/meta`); TWC.metaRef.on('value',s=>{ TWC.meta=s.val(); twBtn(); twTeamCheck(); },()=>{});
}
function twOpen(){ const m=TWC.meta; return !!m&&(m.state==='wait'||m.state==='run'); }
function twBtn(){ const b=$('#twBtn'); if (!b) return; const on=twOpen()&&W.state!=='play'&&!PARTY.rid; b.hidden=!on; if (on) b.innerHTML=TWC.meta.state==='run'?'⚔️ 조별 점령전 진행 중 · 지금 들어가기':'⚔️ 조별 점령전 · 입장하기'; }
setInterval(()=>{ try{ twWatch(); twBtn(); }catch(e){} },1500);
const twMyNum=()=>STUDENT?String(+STUDENT.num):'0';
function twTeamCheck(){ const m=TWC.meta; if (!m||!m.tm) return; const t=m.tm[twMyNum()]; if (t!=null && +t!==TWC.team){ TWC.team=+t; if (TWC.on){ twRespawn(true); twWritePi(); } } }
function twJoin(){ if (!twOpen()) return; if (!myUid()){ flashPrompt('로그인한 학생만 들어갈 수 있어요',2); return; } TWC.joining=true; startGame(); TWC.joining=false; }
function twWritePi(){ const u=myUid(); if (!u||!TWC.cid) return; fbDb.ref(`tw/${TWC.cid}/pi/${u}`).set({n:myName().slice(0,12),num:+twMyNum(),job:JOB,look:equippedLook(JOB),tm:TWC.team}).catch(()=>{}); }
function twReset(){
  twEndUI();
  if (MAPK!=='teamwar'){ TWC.on=false; return; }
  TWC.on=true; TWC.endShown=false; TWC.joinAt=Date.now();
  Object.assign(TWC,{vx:0,vz:0,g:0,launch:0,fall:0,y:0,lastHit:null,cd:0,scd:0,item:'',hammer:false,fastT:0,bubbleT:0,slowT:0,slipT:0,boostT:0,dash:0,an:0,ak:0,sendT:0,lastSent:'',stats:{ko:0,items:0,out:0},reqT:0,feedN:0});
  TWC.team=TWC.meta&&TWC.meta.tm&&TWC.meta.tm[twMyNum()]!=null?+TWC.meta.tm[twMyNum()]:-1;
  twRemoveAll(); while (TWC.dyn&&TWC.dyn.children.length) TWC.dyn.remove(TWC.dyn.children[0]); TWC.itemV={}; TWC.trapV={}; TWC.proj=[];
  if (!TWC.bub){ const m=new THREE.Mesh(new THREE.SphereGeometry(1.1,20,14),new THREE.MeshBasicMaterial({color:0x9fe6ff,transparent:true,opacity:.28,depthWrite:false})); m.position.y=1; m.visible=false; pg.add(m); TWC.bub=m; }
  twRespawn(true);
  W.nextWaveAt=-1; W.nextQuiz=1e9;
  document.body.classList.add('twmode'); $('#twHud').hidden=false; $('#twMe').hidden=false; $('#twFeed').hidden=false; $('#twFeed').innerHTML='';
  twWritePi(); twListen();
}
function twRespawn(instant){ const b=TWC.team>=0?twTeamBase(TWC.team):{x:0,z:12}; P.x=b.x+rnd(-1.5,1.5); P.z=b.z+rnd(-1.5,1.5); TWC.vx=TWC.vz=0; TWC.g=0; TWC.y=0; W.snapCam=!!instant; }
/* ---------- 네트워크 ---------- */
function twListen(){
  twOff(); const c=TWC.cid, me=myUid(); const L=(path,ev,cb)=>{ const r=fbDb.ref(path); r.on(ev,cb,()=>{}); TWC.refs.push([r,ev,cb]); };
  L(`tw/${c}/st`,'value',s=>{ TWC.st=s.val(); });
  const onP=s=>{ if (s.key===me) return; twRemoteNet(s.key,s.val()); };
  L(`tw/${c}/pl`,'child_added',onP); L(`tw/${c}/pl`,'child_changed',onP);
  L(`tw/${c}/pl`,'child_removed',s=>twRemoveOne(s.key));
  L(`tw/${c}/hit/${me}`,'child_added',s=>{ const h=s.val(); fbDb.ref(`tw/${c}/hit/${me}/${s.key}`).remove().catch(()=>{}); if (h) twGotHit(h); });
  L(`tw/${c}/inv/${me}`,'value',s=>{ const k=s.val(); TWC.item=TW_ITEMS[k]?k:''; });
  L(`tw/${c}/trap`,'value',s=>{ TWC.traps=s.val()||{}; });
  L(`tw/${c}/ev`,'child_added',s=>{ const e=s.val(); if (e&&e.t>TWC.joinAt-1500) twFeed(e.m,e.c); });
}
function twOff(){ TWC.refs.forEach(([r,ev,cb])=>{ try{ r.off(ev,cb); }catch(e){} }); TWC.refs=[]; }
function twSend(dt){
  TWC.sendT-=dt; if (TWC.sendT>0) return; TWC.sendT=.12;
  const fl=(TWC.launch>0||TWC.fall>0?1:0)|(TWC.bubbleT>0?2:0)|(TWC.fastT>0?4:0);
  const f=Math.round(Math.atan2(P.fx,P.fz)*100);
  const s=[Math.round(performance.now()/10)%60000,Math.round(P.x*10),Math.round(P.z*10),f,TWC.team,Math.round(TWC.g),fl,TWC.ak,TWC.an,Math.round(TWC.y*10)].join(',');
  if (s.slice(s.indexOf(',')+1)===TWC.lastSent) return; TWC.lastSent=s.slice(s.indexOf(',')+1);
  fbDb.ref(`tw/${TWC.cid}/pl/${myUid()}`).set(s).catch(()=>{});
}
function twDecP(v){ const a=String(v).split(','); return {t:+a[0],x:+a[1]/10,z:+a[2]/10,f:+a[3]/100,tm:+a[4],g:+a[5],fl:+a[6],ak:+a[7],an:+a[8],y:+a[9]/10}; }
async function twRemoteNet(u,v){
  const st=twDecP(v); let R=TWC.rp[u];
  if (!R){ if (TWC.rp[u]===null) return; TWC.rp[u]=null; let info=TWC.pi[u];
    if (!info){ try{ info=(await fbDb.ref(`tw/${TWC.cid}/pi/${u}`).once('value')).val()||{}; }catch(e){ info={}; } TWC.pi[u]=info; }
    R=twMakeRemote(u,info,st); TWC.rp[u]=R; }
  const now=performance.now();
  if (R.st){ let dts=(st.t-R.st.t)/100; if (dts<0) dts+=600; if (dts>.03&&dts<1.5){ R.vx=(st.x-R.st.x)/dts; R.vz=(st.z-R.st.z)/dts; const sp=Math.hypot(R.vx,R.vz); if (sp>14){ R.vx*=14/sp; R.vz*=14/sp; } } }
  if (st.fl&1){ R.vx=R.vz=0; }
  if (R.st && st.an!==R.st.an) twRemoteFx(R,st.ak);
  if (st.tm!==R.tm){ R.tm=st.tm; twTagColor(R); }
  R.st=st; R.netAt=now;
}
function twTag(text,col){
  const cv=document.createElement('canvas'); cv.width=256; cv.height=64; const g=cv.getContext('2d');
  g.fillStyle=col||'rgba(18,22,34,.8)'; roundRect(g,4,8,248,48,14); g.fill();
  g.fillStyle='#fff'; g.font='700 30px "Noto Sans KR","Malgun Gothic",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,128,33);
  const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,toneMapped:false})); sp.scale.set(2.4,.6,1); sp.renderOrder=8; return sp;
}
function twMakeRemote(u,info,st){
  const job=JOBS[info.job]?info.job:'knight', ch=makePlayerChar(job), g=new THREE.Group(); g.add(ch.root); TWC.dyn.add(g);
  dressP2(ch,{...DEFAULTS[job],...(info.look||{})}).catch(()=>{});
  const R={u,info,job,ch,g,tag:null,ring:null,st:null,x:st.x,z:st.z,f:st.f,vx:0,vz:0,netAt:0,tm:st.tm};
  R.ring=new THREE.Mesh(new THREE.RingGeometry(.55,.75,32),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false})); R.ring.rotation.x=-Math.PI/2; R.ring.position.y=.06; g.add(R.ring);
  R.bub=new THREE.Mesh(new THREE.SphereGeometry(1.1,20,14),new THREE.MeshBasicMaterial({color:0x9fe6ff,transparent:true,opacity:.28,depthWrite:false})); R.bub.position.y=1; R.bub.visible=false; g.add(R.bub);
  twTagColor(R); ch.anim.setBase('idle'); return R;
}
function twTagColor(R){ if (R.tag) R.g.remove(R.tag); R.tag=twTag((R.info.n||'친구'),R.tm>=0?TW_COL[R.tm]:null); R.tag.position.y=3.05; R.g.add(R.tag); R.ring.material.color.set(R.tm>=0?TW_COL[R.tm]:'#ffffff'); }
function twRemoveOne(u){ const R=TWC.rp[u]; if (R){ TWC.dyn.remove(R.g); R.ch.mixer.stopAllAction(); } delete TWC.rp[u]; }
function twRemoveAll(){ for (const u in TWC.rp) twRemoveOne(u); TWC.rp={}; }
function twRemoteFx(R,k){
  const dx=Math.sin(R.f), dz=Math.cos(R.f), J=TW_JOB[R.job]||TW_JOB.knight;
  if (k===1){ R.ch.anim.once(J.anim,R.job==='knight'?2.4:2.6,true);
    if (R.job==='archer'){ const m=makeArrow(0); m.rotation.y=R.f; TWC.dyn.add(m); TWC.proj.push({mesh:m,x:R.x+dx*.6,z:R.z+dz*.6,y:1.25,vx:dx*26,vz:dz*26,life:15/26,vis:true}); }
    else if (R.job==='mage'){ const m=makeOrb(0xa77bff,false); TWC.dyn.add(m); TWC.proj.push({mesh:m,x:R.x+dx*.7,z:R.z+dz*.7,y:1.3,vx:dx*14,vz:dz*14,life:8/14,vis:true,boom:true}); }
    else impactFx(R.x+dx*1.4,1.1,R.z+dz*1.4,0xfff1c4,1.6); }
  else if (k===2){ R.ch.anim.once(J.sanim,2.2,true); if (R.job==='mage') fx.shock(R.x,R.z,4.2); else fx.burst(R.x,1,R.z,0xffffff,12,4); }
  else if (k===3){ fx.shock(R.x+dx*3,R.z+dz*3,4.5); fx.burst(R.x+dx*3,1,R.z+dz*3,0xc7f0ff,24,6); }
  else if (k===4){ impactFx(R.x+dx*1.4,1.1,R.z+dz*1.4,0xffd34d,2.6); }
}
/* ---------- 맞았을 때 ---------- */
function twGotHit(h){
  if (TWC.launch>0||TWC.fall>0||TWC.bubbleT>0) return;
  const dx=(h.x||0)/100, dz=(h.z||0)/100, L=Math.hypot(dx,dz)||1;
  TWC.lastHit={u:h.f,t:performance.now()};
  if (h.k&1) TWC.slowT=1.1;
  const launchNow=TWC.g>=100 || (h.k&2 && TWC.g>=55);
  if (launchNow){ twLaunch(); return; }
  TWC.g=Math.min(100,TWC.g+(h.g||8));
  const v=(h.p||4)*2*(1+TWC.g/50);
  TWC.vx+=dx/L*v; TWC.vz+=dz/L*v; shake=Math.max(shake,.12);
  if (knight) knight.anim.once('hit',1.2,true);
  fx.burst(P.x,1.2,P.z,0xffffff,8,3);
}
function twKoCredit(){
  const h=TWC.lastHit; if (!h||performance.now()-h.t>4500) return;
  const a=TWC.pi[h.u]||{}, at=a.tm!=null?a.tm:-1;
  fbDb.ref(`tw/${TWC.cid}/ev`).push({t:Date.now(),k:'ko',a:h.u,v:myUid(),m:`${at>=0?TW_EMO[at]:''} ${a.n||'친구'} → ${TWC.team>=0?TW_EMO[TWC.team]:''} ${myName()} 날려 보냈어요!`,c:at}).catch(()=>{});
}
function twLaunch(){ TWC.launch=3; TWC.lx=P.x; TWC.lz=P.z; TWC.stats.out++; twKoCredit(); TWC.lastHit=null; TWC.vx=TWC.vz=0; SFX.wrong&&SFX.wrong(); flashPrompt('으악! 본진으로 날아가요 (3초)',1.8); }
/* ---------- 내 공격 ---------- */
function twAimDir(){ const md=mouseAiming()?mouseAimDir():null, kb=kbAimDir(); const d=kb||md; if (d){ P.fx=d.x; P.fz=d.z; } return {x:P.fx,z:P.fz,px:md?md.px:null,pz:md?md.pz:null}; }
function twEnemies(){ const out=[]; for (const u in TWC.rp){ const R=TWC.rp[u]; if (!R||!R.st) continue; if (R.tm===TWC.team||R.tm<0) continue; if (R.st.fl&3) continue; out.push(R); } return out; }
function twHitSend(R,dx,dz,p,g,k){ const L=Math.hypot(dx,dz)||1; fbDb.ref(`tw/${TWC.cid}/hit/${R.u}`).push({x:Math.round(dx/L*100),z:Math.round(dz/L*100),p,g,f:myUid(),k:k|0}).catch(()=>{}); fx.burst(R.x,1.2,R.z,0xffd34d,10,4); }
function twAct(k){ TWC.ak=k; TWC.an=(TWC.an+1)%1000; TWC.sendT=0; }
function twAttack(){
  if (TWC.cd>0||TWC.launch>0||TWC.fall>0||TWC.team<0) return;
  const J=TW_JOB[JOB]||TW_JOB.knight, d=twAimDir(); TWC.cd=J.cd;
  const ham=TWC.hammer; if (ham){ TWC.hammer=false; }
  if (knight) knight.anim.once(J.anim,JOB==='knight'?2.4:2.6,true);
  twAct(ham?4:1);
  if (JOB==='archer' && !ham){ const m=makeArrow(0); m.rotation.y=Math.atan2(d.x,d.z); TWC.dyn.add(m); TWC.proj.push({mesh:m,x:P.x+d.x*.6,z:P.z+d.z*.6,y:1.25,vx:d.x*26,vz:d.z*26,life:15/26,mine:true,p:3,g:7,k:1}); SFX.shoot&&SFX.shoot(); return; }
  if (JOB==='mage' && !ham){ const m=makeOrb(0xa77bff,false); TWC.dyn.add(m); TWC.proj.push({mesh:m,x:P.x+d.x*.7,z:P.z+d.z*.7,y:1.3,vx:d.x*14,vz:d.z*14,life:8/14,mine:true,boom:true,p:6,g:12}); return; }
  // 근접(기사) 또는 망치
  const rng=ham?3.2:2.7; impactFx(P.x+d.x*1.4,1.1,P.z+d.z*1.4,ham?0xffd34d:0xfff1c4,ham?2.6:1.6); SFX.hit&&SFX.hit();
  for (const R of twEnemies()){ const dx=R.x-P.x, dz=R.z-P.z, dd=Math.hypot(dx,dz); if (dd>rng+.4) continue; if ((dx*d.x+dz*d.z)/(dd||1)<.3) continue; twHitSend(R,dx,dz,ham?12:5,ham?35:10,ham?2:0); }
}
function twSkill(){
  if (TWC.scd>0||TWC.launch>0||TWC.fall>0||TWC.team<0) return;
  const J=TW_JOB[JOB]||TW_JOB.knight, d=twAimDir(); TWC.scd=J.scd; twAct(2);
  if (knight) knight.anim.once(J.sanim,2.2,true);
  if (JOB==='knight'){ TWC.dash=.32; TWC.dashHit={}; TWC.dashDir=d; }
  else if (JOB==='archer'){ for (const a of [-.22,0,.22]){ const c=Math.cos(a), s=Math.sin(a), x=d.x*c-d.z*s, z=d.x*s+d.z*c; const m=makeArrow(0); m.rotation.y=Math.atan2(x,z); TWC.dyn.add(m); TWC.proj.push({mesh:m,x:P.x+x*.6,z:P.z+z*.6,y:1.25,vx:x*26,vz:z*26,life:15/26,mine:true,p:4,g:9,k:1}); } }
  else { fx.shock(P.x,P.z,4.2); for (const R of twEnemies()){ const dx=R.x-P.x, dz=R.z-P.z; if (Math.hypot(dx,dz)<4.4) twHitSend(R,dx,dz,8,15,0); } }
}
function twUseItem(){
  const k=TWC.item; if (!k||TWC.launch>0||TWC.fall>0) return;
  TWC.item=''; fbDb.ref(`tw/${TWC.cid}/inv/${myUid()}`).remove().catch(()=>{}); TWC.stats.items++;
  fbDb.ref(`tw/${TWC.cid}/ev`).push({t:Date.now(),k:'item',a:myUid(),m:`${TWC.team>=0?TW_EMO[TWC.team]:''} ${myName()} ${TW_ITEMS[k].e} ${TW_ITEMS[k].n} 사용!`,c:TWC.team}).catch(()=>{});
  const d=twAimDir();
  if (k==='hammer'){ TWC.hammer=true; flashPrompt('🔨 다음 공격이 엄청 세져요!',1.6); }
  else if (k==='shoes') TWC.fastT=5;
  else if (k==='bubble') TWC.bubbleT=3;
  else if (k==='tornado'){ const cx=P.x+d.x*3, cz=P.z+d.z*3; twAct(3); fx.shock(cx,cz,4.5); fx.burst(cx,1,cz,0xc7f0ff,24,6); for (const R of twEnemies()){ const dx=R.x-cx, dz=R.z-cz; if (Math.hypot(dx,dz)<4.6) twHitSend(R,dx||.01,dz,10,20,0); } }
  else if (k==='banana'){ fbDb.ref(`tw/${TWC.cid}/trap`).push({x:Math.round(P.x*10)/10,z:Math.round(P.z*10)/10,tm:TWC.team,o:myUid()}).catch(()=>{}); }
}
addEventListener('keydown',e=>{
  if (MAPK!=='teamwar'||W.state!=='play'||W.paused) return;
  const k=e.code;
  if (k==='Space'){ if (!e.repeat) twAttack(); }
  else if (k==='KeyE'||k==='ShiftLeft'||k==='ShiftRight'){ twSkill(); }
  else if (k==='KeyQ'||k==='KeyF'){ twUseItem(); }
  else if (/^(Key[WASD]|Arrow)/.test(k)) return;
  else return;
  e.preventDefault(); e.stopImmediatePropagation();
},true);
canvas.addEventListener('contextmenu',e=>{ if (MAPK==='teamwar'&&W.state==='play'){ e.preventDefault(); twSkill(); } });

/* ---------- 매 프레임 ---------- */
function twTick(dt){
  // 쿨타임 · 효과
  TWC.cd=Math.max(0,TWC.cd-dt); TWC.scd=Math.max(0,TWC.scd-dt); TWC.fastT=Math.max(0,TWC.fastT-dt); TWC.bubbleT=Math.max(0,TWC.bubbleT-dt); TWC.slowT=Math.max(0,TWC.slowT-dt); TWC.slipT=Math.max(0,TWC.slipT-dt); TWC.boostT=Math.max(0,TWC.boostT-dt);
  if (MOUSE.held) twAttack();
  // 날아가는 중 (본진으로)
  if (TWC.launch>0){
    TWC.launch-=dt; const b=twTeamBase(Math.max(0,TWC.team)), k=Math.min(1,(3-TWC.launch)/1.4);
    if (k<1){ P.x=TWC.lx+(b.x-TWC.lx)*k; P.z=TWC.lz+(b.z-TWC.lz)*k; TWC.y=Math.sin(Math.PI*k)*9; }
    else { P.x=b.x; P.z=b.z; TWC.y=0; }
    if (TWC.launch<=0){ TWC.launch=0; TWC.g=0; TWC.bubbleT=1.2; const sc=TWC.st&&TWC.st.sc; if (sc&&TWC.team>=0){ const live=sc.filter((_,i)=>i<(TWC.meta.nt||2)); if (sc[TWC.team]===Math.min(...live)&&Math.max(...live)>sc[TWC.team]) TWC.boostT=4; } }
    return false;
  }
  // 떨어지는 중
  if (TWC.fall>0){ TWC.fall-=dt; TWC.y-=dt*12; P.x+=TWC.vx*dt*.4; P.z+=TWC.vz*dt*.4; if (TWC.fall<=0){ TWC.fall=0; TWC.stats.out++; twKoCredit(); TWC.lastHit=null; twRespawn(false); TWC.launch=1.6; TWC.lx=P.x; TWC.lz=P.z; TWC.bubbleT=1.6; flashPrompt('풍덩! 본진에서 다시 시작해요',1.6); } return false; }
  // 이동
  let ix=0, iz=0;
  if (TWC.team>=0 && TWC.slipT<=0){ const am=arrowsMove(); ix=(keys.KeyD||am&&keys.ArrowRight?1:0)-(keys.KeyA||am&&keys.ArrowLeft?1:0)+joy.x; iz=(keys.KeyS||am&&keys.ArrowDown?1:0)-(keys.KeyW||am&&keys.ArrowUp?1:0)+joy.y; }
  const L=Math.hypot(ix,iz); let moving=false;
  const spd=7.2*(TWC.fastT>0?1.6:1)*(TWC.boostT>0?1.3:1)*(TWC.slowT>0?.55:1);
  if (L>.12){ if (L>1){ ix/=L; iz/=L; } P.x+=ix*spd*dt; P.z+=iz*spd*dt; if (!mouseAiming()&&!kbAimDir()){ P.fx=ix; P.fz=iz; } moving=true; }
  if (TWC.dash>0){ TWC.dash-=dt; const d=TWC.dashDir; P.x+=d.x*19*dt; P.z+=d.z*19*dt; for (const R of twEnemies()){ if (TWC.dashHit[R.u]) continue; if (Math.hypot(R.x-P.x,R.z-P.z)<1.7){ TWC.dashHit[R.u]=1; twHitSend(R,R.x-P.x+d.x,R.z-P.z+d.z,9,16,0); } } }
  // 밀림 속도
  P.x+=TWC.vx*dt; P.z+=TWC.vz*dt; const fr=Math.exp(-(TWC.slipT>0?1.2:5)*dt); TWC.vx*=fr; TWC.vz*=fr;
  // 바나나
  for (const id in TWC.traps){ const t=TWC.traps[id]; if (!t||t.tm===TWC.team) continue; if (Math.hypot(t.x-P.x,t.z-P.z)<.9){ TWC.slipT=1.2; const a=rnd(0,Math.PI*2); TWC.vx+=Math.cos(a)*7; TWC.vz+=Math.sin(a)*7; fbDb.ref(`tw/${TWC.cid}/trap/${id}`).remove().catch(()=>{}); delete TWC.traps[id]; flashPrompt('🍌 미끄러졌어요!',1.2); if (knight) knight.anim.once('hit',1,true); } }
  // 내 본진에서는 게이지가 빨리 줄어요
  const b=TWC.team>=0?twTeamBase(TWC.team):null, atBase=b&&Math.hypot(P.x-b.x,P.z-b.z)<TW_BASE_R;
  const quiet=!TWC.lastHit||performance.now()-TWC.lastHit.t>3000;   // 맞은 뒤 3초 동안은 게이지가 줄지 않아요
  TWC.g=Math.max(0,TWC.g-dt*(atBase?40:quiet?2.5:0));
  // 섬 밖으로 나가면 떨어져요
  if (Math.hypot(P.x,P.z)>TW_R+.4){ TWC.fall=.9; SFX.wrong&&SFX.wrong(); }
  // 아이템 줍기
  const it=TWC.st&&TWC.st.it; if (it && !TWC.item){ TWC.reqT-=dt; for (const id in it){ const v=it[id]; if (Math.hypot(v[0]-P.x,v[1]-P.z)<1.4 && TWC.reqT<=0){ TWC.reqT=.6; fbDb.ref(`tw/${TWC.cid}/req/${myUid()}`).set({i:id,t:Date.now()}).catch(()=>{}); } } }
  return moving;
}
function twProjTick(dt){
  TWC.proj=TWC.proj.filter(p=>{
    p.x+=p.vx*dt; p.z+=p.vz*dt; p.life-=dt; p.mesh.position.set(p.x,p.y,p.z);
    let done=p.life<=0;
    if (p.mine && !done){ for (const R of twEnemies()){ if (Math.hypot(R.x-p.x,R.z-p.z)<.85){ if (p.boom){ done=true; break; } twHitSend(R,p.vx,p.vz,p.p,p.g,p.k); done=true; break; } } }
    if (done){ if (p.boom){ fx.shock(p.x,p.z,2.6); fx.burst(p.x,1,p.z,0xa77bff,16,4); if (p.mine) for (const R of twEnemies()){ const dx=R.x-p.x, dz=R.z-p.z; if (Math.hypot(dx,dz)<2.8) twHitSend(R,dx||p.vx,dz||p.vz,p.p,p.g,0); } }
      TWC.dyn.remove(p.mesh); return false; }
    return true; });
}
function twRemoteTick(dt){
  const now=performance.now();
  for (const u in TWC.rp){ const R=TWC.rp[u]; if (!R||!R.st) continue; const s=R.st;
    const age=R.netAt?Math.min(.3,(now-R.netAt)/1000):0, tx=s.x+(R.vx||0)*age, tz=s.z+(R.vz||0)*age, k=Math.min(1,dt*14);
    const ox=R.x, oz=R.z; R.x+=(tx-R.x)*k; R.z+=(tz-R.z)*k; const mv=Math.hypot(R.x-ox,R.z-oz)/Math.max(dt,1e-3);
    let df=s.f-R.f; df=Math.atan2(Math.sin(df),Math.cos(df)); R.f+=df*Math.min(1,dt*12);
    R.g.position.set(R.x,s.y,R.z); R.ch.root.rotation.y=R.f; R.bub.visible=!!(s.fl&2);
    R.ch.anim.setBase(mv>1.2?'run':'idle'); R.ch.mixer.update(dt);
  }
}
/* 거점 · 아이템 · 함정 모습 (선생님 화면이 보낸 상태 그대로) */
function twWorldTick(dt){
  const st=TWC.st; if (TWC.water) TWC.water.uniforms.uTime.value+=dt;
  const nt=(TWC.meta&&TWC.meta.nt)||2;
  TWC.baseV.forEach((v,i)=>{ const act=nt===2?(i===0||i===2):true, ti=nt===2?(i===0?0:i===2?1:-1):i; v.flag.visible=act; v.pad.material.color.set(act&&ti>=0?new THREE.Color(TW_COL[ti]).lerp(new THREE.Color(0xffffff),.45):0xbfb6a3); if (act) v.flag.material.color.set(TW_COL[ti]); });
  TWC.ptV.forEach((v,i)=>{ const p=st&&st.p&&st.p[i]||[-1,-1,0], own=p[0], cap=p[1], prog=p[2]/100;
    v.ringMat.uniforms.uFill.value=prog; v.ringMat.uniforms.uCol.value.set(cap>=0?TW_COL[cap]:'#8a93a5');
    v.fill.material.opacity=own>=0?.22:0; if (own>=0) v.fill.material.color.set(TW_COL[own]);
    v.gemMat.color.set(own>=0?TW_COL[own]:'#8a93a5'); v.gemMat.emissive.set(own>=0?TW_COL[own]:'#000000'); v.gem.rotation.y+=dt*1.5;
    const gold=st&&st.gold===i; v.beam.material.opacity=gold?.38+Math.sin(W.t*4)*.1:0; });
  // 아이템
  const it=(st&&st.it)||{};
  for (const id in TWC.itemV) if (!it[id]){ TWC.dyn.remove(TWC.itemV[id]); delete TWC.itemV[id]; }
  for (const id in it){ if (!TWC.itemV[id]){ const k=it[id][2], sp=twTag(TW_ITEMS[k]?TW_ITEMS[k].e:'?','rgba(255,255,255,.9)'); sp.scale.set(1.6,.4,1);
      const g=new THREE.Group(); const box=new THREE.Mesh(new THREE.BoxGeometry(.8,.8,.8),new THREE.MeshStandardMaterial({color:0xffc531,emissive:0xb37a00,emissiveIntensity:.5,roughness:.4})); box.position.y=.8; g.add(box);
      const icon=twItemIcon(TW_ITEMS[k]?TW_ITEMS[k].e:'?'); icon.position.y=1.9; g.add(icon); g.position.set(it[id][0],0,it[id][1]); TWC.dyn.add(g); TWC.itemV[id]=g; }
    const g=TWC.itemV[id]; g.children[0].rotation.y+=dt*2; g.children[0].position.y=.8+Math.sin(W.t*3)*.12; }
  // 바나나
  const tr=TWC.traps||{};
  for (const id in TWC.trapV) if (!tr[id]){ TWC.dyn.remove(TWC.trapV[id]); delete TWC.trapV[id]; }
  for (const id in tr){ if (!TWC.trapV[id]){ const t=tr[id]; const g=twItemIcon('🍌'); g.scale.set(.9,.9,1); g.position.set(t.x,.45,t.z); TWC.dyn.add(g); TWC.trapV[id]=g; } }
}
function twItemIcon(e){ const cv=document.createElement('canvas'); cv.width=cv.height=128; const g=cv.getContext('2d'); g.font='96px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(e,64,70);
  const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding; const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,toneMapped:false})); sp.scale.set(1.1,1.1,1); sp.renderOrder=7; return sp; }
function twFeed(m,c){ const box=$('#twFeed'); if (!box||!m) return; const d=document.createElement('div'); d.className='tw-feed-i'; d.style.borderColor=c>=0?TW_COL[c]:'#8a93a5'; d.textContent=m; box.prepend(d); while (box.children.length>6) box.lastChild.remove(); setTimeout(()=>d.classList.add('old'),6000); }
function twHUD(){
  const st=TWC.st, nt=(TWC.meta&&TWC.meta.nt)||2, sc=(st&&st.sc)||[0,0,0,0];
  $('#twScores').innerHTML=[...Array(nt).keys()].map(i=>`<div class="tw-sc${i===TWC.team?' me':''}" style="--c:${TW_COL[i]}"><b>${TW_NAME[i]}</b><span>${sc[i]|0}</span></div>`).join('');
  const left=st&&st.left!=null?st.left:(TWC.meta&&TWC.meta.dur)||0;
  $('#twTime').textContent=`${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,'0')}`+(st&&st.fev?' 🔥 피버 ×2':'');
  $('#twTime').classList.toggle('fever',!!(st&&st.fev));
  const gold=st&&st.gold>=0?TW_PTS[st.gold]:null; $('#twGold').textContent=gold?`✨ 황금 거점: ${gold.n} (점수 ×3)`:'';
  $('#twGauge').style.width=TWC.g+'%'; $('#twGauge').className=TWC.g>=100?'max':TWC.g>=60?'hi':''; $('#twGTxt').textContent=TWC.g>=100?'꽉 참! 한 대 더 맞으면 날아가요':`밀림 게이지 ${Math.round(TWC.g)}%`;
  $('#twItem').innerHTML=TWC.item?`<b>${TW_ITEMS[TWC.item].e}</b><small>Q · ${TW_ITEMS[TWC.item].n}</small>`:(TWC.hammer?'<b>🔨</b><small>다음 공격 강화</small>':'<b>·</b><small>아이템 없음</small>');
  const J=TW_JOB[JOB]||TW_JOB.knight; $('#twSkill').innerHTML=`<b>${TWC.scd>0?Math.ceil(TWC.scd):'E'}</b><small>${JOB==='knight'?'방패 돌진':JOB==='archer'?'세 갈래 화살':'회오리 밀기'}</small>`; $('#twSkill').classList.toggle('cd',TWC.scd>0);
  $('#twFx').textContent=[TWC.fastT>0?'👟':'',TWC.bubbleT>0?'🫧':'',TWC.slowT>0?'🐢':'',TWC.boostT>0?'💨 역전 부스트':''].join(' ');
  const w=$('#twWait'); const m=TWC.meta;
  if (TWC.team<0){ w.hidden=false; w.innerHTML='<b>조 배정을 기다리는 중…</b><p>선생님이 조를 정하면 본진으로 이동해요</p>'; }
  else if (m&&m.state==='wait'){ w.hidden=false; w.innerHTML=`<b>${TW_EMO[TWC.team]} ${TW_NAME[TWC.team]}</b><p>선생님이 곧 시작해요 · WASD 이동 · 스페이스/클릭 공격 · E 스킬 · Q 아이템</p>`; }
  else if (st&&st.intro>0){ w.hidden=false; w.innerHTML=`<b>${Math.ceil(st.intro)}</b><p>거점 원 안에 우리 조만 있으면 점령! 상대를 밀어내세요</p>`; }
  else w.hidden=true;
}
function twFrame(dt,real,now){
  if (!W.paused) W.t+=dt;
  lobbyTick(real,dt);
  const m=TWC.meta, running=m&&m.state==='run'&&TWC.st&&!(TWC.st.intro>0)&&!TWC.st.end;
  let moving=false;
  if (m&&(m.state==='run'||m.state==='wait')&&!(TWC.st&&TWC.st.end)){
    if (!running && TWC.launch<=0 && TWC.fall<=0){ // 시작 전: 본진 둘레만 걸어요
      moving=twTick(dt); const b=TWC.team>=0?twTeamBase(TWC.team):null; if (b){ const dx=P.x-b.x, dz=P.z-b.z, d=Math.hypot(dx,dz); if (d>TW_BASE_R+2){ P.x=b.x+dx/d*(TW_BASE_R+2); P.z=b.z+dz/d*(TW_BASE_R+2); } }
    } else moving=twTick(dt);
    resolve(P,.45);
    twSend(dt);
  }
  twProjTick(dt); twRemoteTick(dt); twWorldTick(dt);
  if (TWC.st&&TWC.st.end&&!TWC.endShown) twShowEnd();
  if (m&&m.state==='end'&&!TWC.endShown&&!(TWC.st&&TWC.st.end)) twShowEnd();
  pg.position.set(P.x,TWC.y,P.z); { let dy=Math.atan2(P.fx,P.fz)-pg.rotation.y; dy=Math.atan2(Math.sin(dy),Math.cos(dy)); pg.rotation.y+=dy*Math.min(1,dt*14); }
  if (TWC.bub) TWC.bub.visible=TWC.bubbleT>0;
  if (knight){ const A=knight.anim; setBaseSynced(A,TWC.launch>0?'idle':moving?'run':'idle',moving?1.15:1); knight.mixer.update(dt); }
  for (const c of clouds){ c.position.x+=c.userData.v*dt; if (c.position.x>130) c.position.x=-130; }
  fx.update(dt); updateDreamy(real); qualityTick(now);
  { const o=sun.userData.off||[22,38,14]; sun.position.set(P.x+o[0],o[1],P.z+o[2]); sun.target.position.set(P.x,0,P.z); sun.target.updateMatrixWorld(); }
  const tgt=new THREE.Vector3(P.x,15+TWC.y*.3,P.z+14); camera.position.lerp(tgt,W.snapCam?1:Math.min(1,dt*6)); W.snapCam=false; camera.lookAt(P.x,TWC.y*.3,P.z);
  if (shake>0){ shake=Math.max(0,shake-dt); camera.position.x+=rnd(-1,1)*shake*.6; camera.position.y+=rnd(-1,1)*shake*.6; }
  twHUD(); renderFrame();
}
/* 끝: 결과 · MVP */
function twShowEnd(){
  TWC.endShown=true; const st=TWC.st||{}, e=st.end||{}, nt=(TWC.meta&&TWC.meta.nt)||2, sc=st.sc||[0,0,0,0];
  fbDb.ref(`tw/${TWC.cid}/stats/${myUid()}`).set({ko:TWC.stats.ko|0,it:TWC.stats.items|0,out:TWC.stats.out|0}).catch(()=>{});
  const order=[...Array(nt).keys()].sort((a,b)=>sc[b]-sc[a]); const win=e.win!=null?e.win:order[0];
  const nm=u=>{ const p=TWC.pi[u]; return p&&p.n?p.n:(u===myUid()?myName():'친구'); };
  const mv=e.mvp||{}; const row=(k,ic,lab,unit)=>mv[k]?`<li><b>${ic} ${lab}</b><span>${esc(nm(mv[k][0]))}</span><em>${mv[k][1]}${unit}</em></li>`:'';
  $('#twEndTitle').innerHTML=`${TW_EMO[win]} ${TW_NAME[win]} 승리!`;
  $('#twEndSc').innerHTML=order.map((i,r)=>`<div class="tw-sc${i===TWC.team?' me':''}" style="--c:${TW_COL[i]}"><b>${r+1}위 ${TW_NAME[i]}</b><span>${sc[i]|0}</span></div>`).join('');
  $('#twEndMvp').innerHTML=row('cap','🚩','점령왕','초')+row('ko','💥','밀어내기왕','번')+row('item','🎁','아이템왕','개')+row('surv','🛡️','생존왕','번');
  $('#twEndMe').textContent=TWC.team===win?'우리 조가 이겼어요! 🎉':'아쉽지만 잘 싸웠어요!';
  $('#twEnd').hidden=false; TWC.win=TWC.team===win;
}
function twFinish(){ $('#twEnd').hidden=true; if (W.state!=='play') return; W.kills=TWC.stats.ko|0; W.cardCoins=(W.cardCoins||0)+10+(TWC.win?10:0); endGame(!!TWC.win); }
function twEndUI(){ document.body.classList.remove('twmode'); ['#twHud','#twMe','#twFeed','#twWait','#twEnd'].forEach(s=>{ const e=$(s); if (e) e.hidden=true; }); if (MAPK!=='teamwar') twOff(); }
$('#twBtn')&&$('#twBtn').addEventListener('click',twJoin);
$('#twEndGo')&&$('#twEndGo').addEventListener('click',twFinish);
