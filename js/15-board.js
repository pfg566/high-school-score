/* 사회 게임 RPG · 이번 시간 순위 (선생님이 '게임 열기'로 연 한 번의 시간 · 같은 반끼리)
   판이 끝날 때마다 내 기록을 board/{반}/{열기}/{번호}에 모아요. 점수는 가장 좋은 판, 나머지는 더해요. */
function boardSid(){ try{ const g=activeGate(); return g&&g.sid?g.sid:''; }catch(e){ return ''; } }
function boardRef(){ const sid=boardSid(); return (AUTHMODE==='student'&&STUDENT&&fbDb&&sid)?fbDb.ref(`board/${STUDENT.cid}/${sid}`):null; }
async function boardWrite(r){
  const ref=boardRef(); if (!ref||!PROFILE) return;
  // 평소 정답률(이번 시간 첫 판을 시작하기 전)
  const base=(PROFILE.asked|0)>0?Math.round((PROFILE.correct|0)/(PROFILE.asked|0)*100):-1;
  const cs=r.cs||{}, win=!!r.win, me=ref.child(String(STUDENT.num));
  try{
    const cur=(await withTimeout(me.once('value'),8000)).val()||null;
    const add=(k,v)=>Math.max(0,Math.round((cur&&+cur[k]||0)+(+v||0)));
    const e={n:String(PROFILE.name||STUDENT.num+'번').slice(0,12), s:Math.max(cur?+cur.s||0:0,r.score|0),
      c:add('c',r.correct), a:add('a',r.asked), g:add('g',1), w:add('w',win?1:0), k:add('k',r.kills),
      ev:add('ev',cs.evaded), bl:add('bl',cs.blocked), cc:add('cc',W.cardCoins), bd:add('bd',cs.boss), u:add('u',cs.ults),
      mh:win?Math.min(cur&&cur.mh!=null?+cur.mh:101,cs.minHp==null?101:+cs.minHp):(cur&&cur.mh!=null?+cur.mh:101),
      tk:win?(cur&&+cur.tk>=0?Math.min(+cur.tk,cs.taken|0):(cs.taken|0)):(cur&&cur.tk!=null?+cur.tk:-1),
      br:cur&&cur.br!=null?+cur.br:base, j:String(JOB).slice(0,8), ...(PROFILE.title?{tt:String(PROFILE.title).slice(0,12)}:{}), t:firebase.database.ServerValue.TIMESTAMP};
    await withTimeout(me.set(e),8000);
  }catch(err){ /* 순위표는 덤이라 실패해도 조용히 넘어가요 */ }
}

/* ---------- 학생 화면: 🏆 이번 시간 순위 (로비 · 상점 · 결과 화면에서) ---------- */
const BOARD={open:false,ref:null,cb:null,data:{},sid:''};
function boardShowable(){ return AUTHMODE==='student' && !!STUDENT && !!boardSid() && W.state!=='play'; }
function boardBtnUpdate(){ const b=$('#boardBtn'); if (!b) return; b.hidden=!boardShowable(); if (BOARD.open && !boardShowable() && W.state==='play') boardClose(); }
function boardOpen(){
  if (!boardShowable()) return;
  BOARD.open=true; $('#boardPop').hidden=false;
  const ref=boardRef(); if (BOARD.ref && BOARD.sid===boardSid()) { boardRender(); return; }
  boardStop(); BOARD.sid=boardSid(); BOARD.ref=ref; BOARD.data={}; boardRender();
  if (ref) BOARD.cb=ref.on('value',s=>{ BOARD.data=s.val()||{}; boardRender(); },()=>{ $('#boardList').innerHTML='<p class="bd-empty">순위를 불러오지 못했어요. 선생님께 보안 규칙이 최신인지 알려 주세요.</p>'; });
}
function boardStop(){ if (BOARD.ref&&BOARD.cb){ BOARD.ref.off('value',BOARD.cb); } BOARD.ref=null; BOARD.cb=null; }
function boardClose(){ BOARD.open=false; $('#boardPop').hidden=true; boardStop(); }
function boardRender(){
  const rows=Object.entries(BOARD.data||{}).map(([num,e])=>({num,...e,rate:e.a?Math.round(e.c/e.a*100):0}))
    .sort((a,b)=>(b.s-a.s)||(b.rate-a.rate)||(b.c-a.c));
  const me=String(STUDENT?STUDENT.num:''), myI=rows.findIndex(x=>x.num===me);
  let rank=0, prev=null; rows.forEach((x,i)=>{ const key=x.s+'|'+x.rate; if (key!==prev){ rank=i+1; prev=key; } x.rank=rank; });
  const show=rows.slice(0,15); if (myI>=15) show.push(rows[myI]);
  const medal=r=>r===1?'🥇':r===2?'🥈':r===3?'🥉':r;
  $('#boardSub').textContent=rows.length?`${rows.length}명 참여 · 게임이 끝날 때마다 바로 바뀌어요`:'';
  $('#boardList').innerHTML=rows.length?`<table class="bd-tbl"><thead><tr><th>순위</th><th>이름</th><th>최고 점수</th><th>정답률</th><th>판</th></tr></thead><tbody>`+
    show.map(x=>`<tr class="${x.num===me?'me':''}${x.rank<=3?' top':''}"><td>${medal(x.rank)}</td><td>${x.tt&&typeof titleText==='function'&&titleText(x.tt)?`<small class="bd-title">${esc(titleText(x.tt))}</small> `:''}${esc(x.n||'')}</td><td><b>${(x.s|0).toLocaleString('ko-KR')}</b></td><td>${x.rate}% <small>(${x.c|0}/${x.a|0})</small></td><td>${x.g|0}</td></tr>`).join('')+'</tbody></table>'
    :'<p class="bd-empty">아직 이번 시간에 게임을 끝낸 친구가 없어요. 첫 번째가 되어 보세요!</p>';
}
$('#boardBtn').addEventListener('click',boardOpen);
$('#boardEnd').addEventListener('click',boardOpen);
$('#boardClose').addEventListener('click',boardClose);
$('#boardPop').addEventListener('click',e=>{ if (e.target.id==='boardPop') boardClose(); });
setInterval(()=>{ boardBtnUpdate(); const eb=$('#boardEnd'); if (eb) eb.hidden=!boardShowable(); },1000);
