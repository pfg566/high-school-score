/* 사회 게임 RPG · 매 프레임 루프
   파일은 01 → 13 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요. */
/* ---------- 루프 ---------- */
let last=performance.now(), hurtT=0;
const camOff=new THREE.Vector3(0,13.5,14.5);
function frame(now){
  requestAnimationFrame(frame);
  let dt=Math.min(.05,(now-last)/1000); last=now;
  if (hitStop>0 && W.state==='play' && !W.paused){ hitStop-=dt; dt=0; }
  const real=now/1000;

  if (!$('#quiz').hidden && !Q.answered && !Q.resultOnly){
    const rem=Q.dur-(now-Q.start)/1000;
    $('#qbar').style.width=Math.max(0,rem/Q.dur*100)+'%';
    $('#qtime').textContent=Math.max(0,Math.ceil(rem))+'초';
    if (rem<=0) answer(-1);
  }

  if (MAPK==='runner' && W.state==='play' && !PARTY.on){ runnerFrame(dt,real,now); return; }
  if (MAPK==='stage' && W.state==='play' && !PARTY.on){ stageFrame(dt,real,now); return; }
  if (MAPK==='teamwar' && W.state==='play' && !PARTY.on){ twFrame(dt,real,now); return; }
  if (PARTY.on && W.state==='play' && W.paused){ W.t+=dt; W.effects=W.effects.filter(e=>e.until>W.t); partyTick(dt); }
  if (W.state==='play' && !W.paused){
    W.t+=dt;
    W.effects=W.effects.filter(e=>e.until>W.t);
    const am=arrowsMove();
    let ix=(keys.KeyD||am&&keys.ArrowRight?1:0)-(keys.KeyA||am&&keys.ArrowLeft?1:0)+joy.x;
    let iz=(keys.KeyS||am&&keys.ArrowDown?1:0)-(keys.KeyW||am&&keys.ArrowUp?1:0)+joy.y;
    const L=Math.hypot(ix,iz);
    if (P.dashT>0){ dashTick(dt); }
    else if (P.dodgeT>0){ P.dodgeT-=dt; if (P.dodgeT<1e-4) P.dodgeT=0; P.x+=P.ddx*16*dt; P.z+=P.ddz*16*dt; if (Math.random()<.6) fx.burst(P.x,.15,P.z,0xd8c9a8,2,1.4); }
    else if (L>.12){ if (L>1){ix/=L;iz/=L;} const sp=7*spdMult()*jobInfo().spd*(P.blockT>0?.35:1)*(P.ultT>0?.7:1)*(P.spinT>0?.5:P.castT>0?.12:P.atkCd>0?(JOB==='knight'?.6:JOB==='archer'?.5:.85):1); P.x+=ix*sp*dt; P.z+=iz*sp*dt; if (P.atkCd<=0){ const n=Math.hypot(ix,iz); P.fx=ix/n; P.fz=iz/n; } }
    if (P.lunge>0){ P.lunge-=dt; P.x+=P.fx*6*dt; P.z+=P.fz*6*dt; }
    resolve(P,.6);
    P.atkCd=Math.max(0,P.atkCd-dt); P.dodgeCd=Math.max(0,P.dodgeCd-dt); P.spinCd=Math.max(0,P.spinCd-dt); if (P.spinT>0){ P.spinT-=dt; if (P.spinT<1e-4) P.spinT=0; }
    if (P.blockT>0){ P.blockT-=dt; if (P.blockT<1e-4) P.blockT=0; }
    if (P.castT>0) P.castT=Math.max(0,P.castT-dt);
    if (P.ultT>0) ultTick(dt);
    updateProj(dt); updateEBolts(dt);
    if (P.spinBuf && P.dodgeT<=0){ P.spinBuf=false; spinSkill(); }
    if (P.pendingHit && W.t>=P.pendingHit.t){ const c=P.pendingHit.c; P.pendingHit=null; doHit(c); }
    while (P.spinHits.length && W.t>=P.spinHits[0].t) spinHit(P.spinHits.shift());
    if (P.buffer && P.atkCd<=0 && P.dodgeT<=0 && P.spinT<=0 && !(P.dashT>0) && !(P.ultT>0)) attack();

    if (PARTY.on) partyTick(dt); else {
    for (const m of mobs){
      if (m.dying>=0){ if (m.aimLine) m.aimLine.visible=false; if (m.leapRing) m.leapRing.visible=false; m.dying=Math.max(0,m.dying-dt); if (m.onDying) m.onDying();
        m.x+=m.kbx*dt; m.z+=m.kbz*dt; m.kbx*=Math.pow(.03,dt); m.kbz*=Math.pow(.03,dt);
        if (m.avy||m.ay>0){ m.avy=(m.avy||0)-22*dt; m.ay=Math.max(0,(m.ay||0)+m.avy*dt); if (m.ay===0) m.avy=0; }
        m.x=Math.max(-34,Math.min(34,m.x)); m.z=Math.max(-34,Math.min(34,m.z)); continue; }
      if (m.spawnT>0){ m.spawnT-=dt; continue; }
      mobStatus(m,dt); if (m.dying>=0) continue;
      if (m.ranged){ rangedAI(m,dt); continue; }
      if (m.stun>0){ if (m.aimT>0){ m.aimT=0; if (m.aimLine) m.aimLine.visible=false; } m.stun-=dt; m.x+=m.kbx*dt; m.z+=m.kbz*dt; m.kbx*=Math.pow(.02,dt); m.kbz*=Math.pow(.02,dt); resolve(m,m.r);
        m.flash=Math.max(0,m.flash-dt); m.mat.emissive.setHex(m.flash>0?0xffffff:0x000000); continue; }
      if (MAPK==='island' && m.def && m.def.thief && thiefAI(m,dt)) continue;
      if (m.leaper && leapAI(m,dt)) continue;
      const pdx=P.x-m.x, pdz=P.z-m.z, pd=Math.hypot(pdx,pdz)||1;
      let dx=pdx, dz=pdz, d=pd, atDoor=false;
      if (MAPK==='defense' && (m.runner || PEACE_RUN || pd>(m.boss?9:7))){ dx=DOOR.x-m.x; dz=DOOR.z-m.z; d=Math.hypot(dx,dz)||1; atDoor=d<m.r+2.6; }
      else if (MAPK==='glacier' && !PEACE_RUN){ const b=glTarget(m); if (b && (m.runner || pd>(m.boss?GL_CHASE+2:GL_CHASE))){ dx=b.x-m.x; dz=b.z-m.z; d=Math.hypot(dx,dz)||1; atDoor=d<b.r+m.r+.5; m.glB=b; } else m.glB=null; }
      m.atDoor=atDoor;
      if (m.boss){
        const B=m.def.boss;
        m.summonCd-=dt;
        if (m.summonCd<=0){ m.summonCd=B.summonEvery; if (mobs.filter(o=>o.dying<0).length<8){ spawnMob(m.def,false,{x:m.x,z:m.z}); spawnMob(m.def,false,{x:m.x,z:m.z}); flashPrompt('해골 장군이 부하를 불렀어요!',2); } }
        if (m.slamT>0){
          m.slamT-=dt;
          if (m.slamT<=0){
            fx.shock(m.slamX,m.slamZ,B.slamR); fx.burst(m.slamX,.3,m.slamZ,0x9aa3b5,26,7); shake=.45; m.recover=.35;
            if (Math.hypot(P.x-m.slamX,P.z-m.slamZ)<B.slamR){ if (W.t>W.invuln){ const sd=Math.round(B.slamDmg*(MODE==='hero'?HERO.dmg:DIFF*EASEF.dmg)); hurtPlayer(sd,{x:m.slamX,z:m.slamZ}); } flashPrompt(`내려찍기에 맞았어요! 체력 -${B.slamDmg}`,1.5); }
            glBossSlam(m.slamX,m.slamZ,B.slamR);
            if (MAPK==='defense' && Math.hypot(DOOR.x-m.slamX,DOOR.z-m.slamZ)<B.slamR+1){ const dd=B.slamDmg*2; W.door-=dd; doorFlash=.35; fx.num(DOOR.x,5.6,DOOR.z+.6,'-'+dd,'#ffb36b'); flashPrompt(`내려찍기가 성문을 부쉈어요! 성문 -${dd}`,1.8); }
            m.slamCd=B.slamEvery;
          }
          m.kbx*=Math.pow(.02,dt); m.kbz*=Math.pow(.02,dt);
          m.g.rotation.y=Math.atan2(dx,dz); m.flash=Math.max(0,m.flash-dt); m.mat.emissive.setHex(0x661111);
          continue;
        }
        m.slamCd-=dt;
        if (m.slamCd<=0 && ((!PEACE_RUN && pd<10) || atDoor)){ m.slamT=B.slamWarn; m.slamX=m.x; m.slamZ=m.z; flashPrompt(atDoor&&pd>=10?'해골 장군이 성문을 내려찍으려 해요!':'붉은 원 밖으로 피하세요!',B.slamWarn); }
      }
      const slow=W.loc?.5:1, mv=atDoor?0:1;
      m.x+=(dx/d*m.spd*slow*mv*slowK(m) + m.kbx)*dt; m.z+=(dz/d*m.spd*slow*mv*slowK(m) + m.kbz)*dt;
      m.kbx*=Math.pow(.02,dt); m.kbz*=Math.pow(.02,dt);
      for (const o of mobs){ if (o===m||o.dying>=0) continue; const ox=m.x-o.x, oz=m.z-o.z, od=Math.hypot(ox,oz), min=m.r+o.r; if (od>0&&od<min){ m.x+=ox/od*(min-od)*.5; m.z+=oz/od*(min-od)*.5; } }
      resolve(m,m.r);
      m.g.rotation.y=Math.atan2(dx,dz);
      m.atkCd=Math.max(0,m.atkCd-dt);
      if (!PEACE_RUN && pd<m.r+.75 && m.atkCd<=0 && W.t>W.invuln){ if (m.anim) m.anim.once('attack',1.6); hurtPlayer(m.dmg,{x:m.x,z:m.z,mob:m}); m.atkCd=1; }
      if (atDoor && MAPK==='glacier') glMobHit(m,dt);
      else if (atDoor){ m.doorCd=(m.doorCd||0)-dt;
        const dh=Math.round(m.dmg*DOOR_HIT);
        if (m.doorCd<=0){ m.doorCd=1.2; W.door-=dh; doorFlash=.2; SFX.door(); if (m.anim) m.anim.once('attack',1.6,true);
          fx.burst(m.x+(DOOR.x-m.x)*.6,1.6,DOOR.z+.2,0xc9a06a,6,3); fx.num(m.x+(DOOR.x-m.x)*.6,4.4,DOOR.z+.5,'-'+dh,'#ffb36b');
          if (W.t>=W.doorWarnAt){ W.doorWarnAt=W.t+5; flashPrompt('성문이 공격받고 있어요! 가까이 가서 몬스터를 끌어내세요',2.2); } } }
      m.flash=Math.max(0,m.flash-dt);
      m.mat.emissive.setHex(m.flash>0?0xffffff:0x000000);
    }
    mobs=mobs.filter(m=>{ if (m.dying===0){ removeMob(m); return false; } return true; });
    if (MAPK==='defense'){ updateTurrets(dt); updateBolts(dt); }
    islandTick(dt); glacierTick(dt);

    // 웨이브 진행 · 잠금
    if (W.nextWaveAt>=0 && W.t>=W.nextWaveAt) startWave(W.wave+1);
    if (W.spawnQ.length){ for (let i=W.spawnQ.length-1;i>=0;i--){ const q=W.spawnQ[i]; if (W.t<q.at) continue; W.spawnQ.splice(i,1);
        const def=q.runner?{...q.def,hp:Math.round(q.def.hp*.6),spd:3.6,dmg:q.def.dmg,runner:true}:q.def;
        for (let k=0;k<q.n;k++) spawnMob(def,false,{x:q.lane+rnd(-4,4),z:rnd(25,31)});
        if (q.runner){ if (!W.runnerSeen){ W.runnerSeen=true; flashPrompt('주황 돌격병은 성문만 노려요! 성문에 닿기 전에 막으세요',3); } else flashPrompt('돌격병이 몰려와요!',2); }
        else if (!q.first) flashPrompt('해골 지원군이 몰려와요!',2); } }
    if (W.nextWaveAt<0 && !W.gate && W.wave>=0 && mobs.length===0 && !W.spawnQ.length && islWaveDone()){
      if (W.wave<WAVES.length-1){
        P.hp=Math.min(P.max,P.hp+Math.round(P.max*.2)); glWaveHeal();
        if (NEWQ()){ showBanner('웨이브 클리어! 정비 시간'); startPrep(); }
        else { W.gate=true; stations.forEach(s=>s.readyAt=W.t); showBanner(MAPS[MAPK].clearText); }
      } else endGame(true);
    }

    if (W.state==='play'){
      // 지식 카드 줍기
      let pickedCard=null;
      if (!W.prep) for (const c of cards){ if (Math.hypot(P.x-c.x,P.z-c.z)<1.4){ pickedCard=c; break; } }
      if (!W.paused) bgTick();
      // 위치 퀴즈 판정
      if (W.loc){
        const zNow=zoneAt(P.x,P.z);
        if (zNow!==W.loc.startZone) W.loc.left=true;
        if (zNow && W.loc.left) finishLoc(zNow);
        else if (W.t>=W.loc.until) finishLoc(null);
      }
      let near=null;
      if (!W.loc && !W.paused) for (const s of stations){ if (W.t>=s.readyAt && stationOn(s) && Math.hypot(P.x-s.g.position.x,P.z-s.g.position.z)<2.3) near=s; }
      if (glacierLost()){ if (P.hp<0) P.hp=0; endGame(false); }
      else if (P.hp<=0 || (MAPK==='defense' && W.door<=0)){ if (P.hp<0) P.hp=0; if (W.door<0) W.door=0; if (!tryRevive()) endGame(false); }
      else if (W.paused){ /* 위치 퀴즈 결과 표시 중 */ }
      else if (pickedCard){
        SFX.card(); scene.remove(pickedCard.m); fx.burst(pickedCard.x,1.2,pickedCard.z,0xffc531,14,4); cards=cards.filter(c=>c!==pickedCard);
        const canCls=MAPK==='zones'&&CLS.length>0;
        const useOX=!canCls||Math.random()<.6;
        const item = useOX ? pick(canCls?['ox','cls']:['ox'],OX) : pick(['cls','ox'],CLS);
        openQuiz(item,{type:'card'});
      }
      else if (near){
        let item;
        if (MAPK==='zones'){
          const zf=it=>it.kind==='mc'&&(it.z===near.zone||it.z==='any');
          const own=MC.filter(b=>b.z===near.zone&&!W.used.has(b));
          const zoneOrAny=MC.filter(b=>b.z===near.zone||b.z==='any');
          item=pick(['mc'], own.length?own:(zoneOrAny.length?zoneOrAny:MC), zf);
        } else item=pick(['mc'],MC);
        openQuiz(item,{type:'station',station:near});
      }
      else if (!W.loc && !W.prep && W.t>=W.nextQuiz){
        W.timedFlip^=1;
        if (W.timedFlip && MAPK==='zones' && LOC.length && !NEWQ()) startLoc();
        else openQuiz(pick(['mc'],MC),{type:'timed'});
      }
    }
    }
  }

  // 시각 갱신
  const lockedForLoc=!!W.loc;
  bgVisual(real);
  for (const s of stations){
    const bgS=!!(W.bg&&W.bg.st===s&&W.state==='play');
    const ready=bgS||W.state!=='play'||(W.t>=s.readyAt&&!lockedForLoc&&stationOn(s));
    s.gem.rotation.y=real*1.5; s.gem.position.y=2.75+Math.sin(real*2)*.15;
    const gc=bgS?0xb24dff:s.color; s.gemMat.color.setHex(ready?gc:0x7d8594); s.gemMat.emissive.setHex(ready?gc:0x000000);
    s.light.intensity=ready?.7+Math.sin(real*3)*.2:0;
    s.ring.visible=ready; s.ring.material.opacity=.45+Math.sin(real*4)*.25;
    s.orbit.visible=s.orbit2.visible=s.beam.visible=ready;
    s.orbit.position.y=s.orbit2.position.y=s.gem.position.y;
    s.orbit.rotation.set(real*1.3,real*.7,0); s.orbit2.rotation.set(-real*.9,0,real*1.1);
    s.beam.material.opacity=(W.gate?.26:.13)+Math.sin(real*3)*.05;
    const sc=W.gate&&ready?1.25+Math.sin(real*5)*.15:1; s.gem.scale.set(.75*sc,1.45*sc,.75*sc);
  }
  { const on=!!W.loc&&W.state==='play';
    arrowG.position.set(P.x,.14,P.z);
    for (const k in locBeams){
      const Z=ZONES[k], b=locBeams[k], a=locArrows[k];
      b.visible=on; if (on){ b.material.opacity=.22+Math.sin(real*4)*.1; b.rotation.y=real*.5; }
      const inside=Math.hypot(P.x-Z.x,P.z-Z.z)<Z.r;
      a.visible=on&&!inside;
      if (a.visible){ a.rotation.y=Math.atan2(Z.x-P.x,Z.z-P.z); const sc=1+Math.sin(real*6)*.12; a.children[0].scale.setScalar(sc); a.children[1].scale.setScalar(1.22*sc); }
    } }
  for (const k in pads){ const p=pads[k]; const on=!!W.loc;
    p.mat.emissiveIntensity=on?.18+Math.sin(real*4)*.1:0; p.rim.material.opacity=on?.6+Math.sin(real*4)*.3:.35; }
  for (const c of cards){ c.m.rotation.y=real*2; c.card.position.y=1.2+Math.sin(real*3+c.x)*.15; }

  // 주인공 동작
  const animDt=W.paused&&W.state==='play'&&!PARTY.on?0:dt;
  const moved=Math.hypot(P.x-pg.position.x,P.z-pg.position.z);
  pg.position.set(P.x,0,P.z);
  { let dy=Math.atan2(P.fx,P.fz)-pg.rotation.y; dy=Math.atan2(Math.sin(dy),Math.cos(dy)); pg.rotation.y+=dy*Math.min(1,dt*14); }
  const walking=moved>.004 && !W.paused && W.state==='play';
  if (P.swingT>0 && !W.paused){ P.swingT-=dt; }
  const sw=Math.max(0,P.swingT)/.22;
  if (knight){
    const A=knight.anim;
    if (W.state==='play'){
      const U=knight.upper;
      if ((A.dead&&!P.down)||endPose){ A.revive(); endPose=false; U.cur=null; }
      if (hurtT>lastHurt+.05 && !A.lock) A.once('hit',1.6);
      // 제자리에서 베다가 움직이기 시작하면: 남은 베기를 상체로 넘기고 하체는 바로 달려요
      if (walking && A.lock && A.cur && !A.dead){ const key=ATK_KEYS.find(k2=>A.actions[k2]===A.cur);
        if (key){ const t=A.cur.time, sp=A.cur.timeScale; A.cur.fadeOut(.1); A.cur=null; A.lock=false; A.baseKey=null; playUpper(key,sp,t); } }
      if (U.cur){ U.left-=animDt; if (U.left<=0){ U.cur.fadeOut(.15); U.cur=null; } }
      const spd=moved/Math.max(dt,1e-3);
      knight.runScale+=(Math.min(2.6,Math.max(.7,spd/RUN_SPEED.knight))-knight.runScale)*Math.min(1,dt*12);
      setBaseSynced(A, P.blockT>0?'blocking':walking?(U.cur?'runLow':'run'):(U.cur?'idleLow':'idle'), P.blockT>0?1:walking?knight.runScale:1);
      if (walking && P.dodgeT<=0 && !W.paused){ stepT-=dt*knight.runScale; if (stepT<=0){ stepT=.4; fx.burst(P.x-P.fx*.3,.08,P.z-P.fz*.3,0xcdbf9f,3,.9); } }
    } else if (W.state==='end' && !endPose){ endPose=true; if (!W.won) A.die(); else { A.once('cheer',1,true); A.want='idle'; } }
    knight.mixer.update(animDt);
    knight.mats.forEach(mt=>{ if (mt.emissive) mt.emissive.setHex(hurtT>0?0x5a0d0d:0x000000); });
  }
  lastSwing=P.swingT; lastHurt=hurtT;
  swing.position.set(P.x,.12,P.z); swing.material.opacity=sw*.45; const ss=1+(1-sw)*.25; swing.scale.set(ss,ss,ss);
  arcG.position.set(P.x,1.1,P.z); arcG.rotation.y=pg.rotation.y+(1-sw)*1.2-.6; swingArc.material.opacity=0;

  // 거점 사람들
  for (const n of npcs){ n.next-=dt; if (n.next<=0){ n.next=rnd(5,10); n.anim.once(Math.random()<.7?'work':'cheer',1); }
    n.mixer.update(dt); }

  // 몬스터 동작
  for (const m of mobs){
    m.g.position.set(m.x,(m.ay||0)-(m.sink||0),m.z);
    if (!W.paused) animMob(m,real,dt);
    if (m.mixer) m.mixer.update(animDt);
    if (m.slamMesh){ const on=m.slamT>0&&m.dying<0; m.slamMesh.visible=on; if (on){ const B=m.def.boss; const k=1-m.slamT/B.slamWarn; m.slamMesh.position.set(m.slamX,.07,m.slamZ); m.slamMesh.material.opacity=.15+k*.45; m.slamMesh.scale.setScalar(.4+.6*Math.min(1,k*1.4)); } }
    if (m.shieldMesh){ m.shieldMesh.visible=m.shield>0&&m.dying<0; m.shieldMesh.material.opacity=.14+.16*m.shield/m.shieldMax+Math.sin(real*3)*.04; m.shieldMesh.rotation.y=real*.4; }
    if (m.eyeLight) m.eyeLight.intensity=m.dying<0?(m.shield>0?1.4:.6):0;
    const r=Math.max(0,m.hp/m.max); m.bar.fg.scale.x=Math.max(.001,r); m.bar.fg.position.x=-(1-r)*m.bar.w/2;
    m.bar.g.position.set(m.x,m.barY,m.z); m.bar.g.quaternion.copy(camera.quaternion); m.bar.g.visible=m.dying<0&&!(m.spawnT>0);
  }

  // 배경 움직임
  for (const c of clouds){ c.position.x+=c.userData.v*dt; if (c.position.x>130) c.position.x=-130; }
  smokeT-=dt; if (smokeT<=0){ smokeT=.5; if (MAPK==='zones') fx.smoke(29.2,5.4,7.6); }
  updateDefenseLook(real,dt); islandLook(real,dt); partyLook(real,dt); aimTick(real); fpsTick(now);
  if (MOUSE.held && JOB!=='archer' && W.state==='play' && !W.paused) attack();
  if (JOB==='archer' && kbAimDir() && W.state==='play' && !W.paused) attack();   // 방향키를 누르고 있으면 그쪽으로 연사
  fx.update(dt); updateCombatFx(dt); updateDreamy(real); qualityTick(now);

  // 해 · 카메라
  { const o=sun.userData.off||[22,38,14]; sun.position.set(P.x+o[0],o[1],P.z+o[2]); } sun.target.position.set(P.x,0,P.z); sun.target.updateMatrixWorld();
  const inLobby=lobbyTick(real,dt);
  if (!shopCamera(real) && !inLobby){
    const target=new THREE.Vector3(P.x,0,P.z);
    camera.position.lerp(target.clone().add(camOff), W.state==='play'&&!W.snapCam?.12:1); W.snapCam=false;
    camera.lookAt(P.x,1.4,P.z);
  }
  if (shake>0){ shake=Math.max(0,shake-dt); camera.position.x+=rnd(-1,1)*shake*.9; camera.position.y+=rnd(-1,1)*shake*.9; }

  hurtT=Math.max(0,hurtT-dt); $('#hurt').style.opacity=hurtT>0?1:0;
  if (W.state==='play'){
    limitTick(); if (W.state!=='play'){ renderFrame(); return; }
    updateHUD(); updateSkillHUD(); partyHUD();
    const pr=$('#prompt');
    let msg='';
    if (W.t<promptUntil) msg=promptMsg;
    else { for (const s of stations){ if (W.t<s.readyAt && s.readyAt<1e9 && stationOn(s) && Math.hypot(P.x-s.g.position.x,P.z-s.g.position.z)<3) msg=`충전 중 · ${Math.ceil(s.readyAt-W.t)}초 후 다시 풀 수 있어요`; } }
    if (msg && !W.paused){ pr.hidden=false; pr.textContent=msg; } else pr.hidden=true;
  }
  renderFrame();
}
requestAnimationFrame(frame);
