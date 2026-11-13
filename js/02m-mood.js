/* 사회 게임 RPG · 맵 분위기(시간대 · 하늘 · 안개 · 빛 · 색감) */
const MOODS={
 day:   {name:'맑은 낮', exp:.88, grass:[0x2a5418,0x93c24c], sky:[0x5b93d8,0xaccdee,0xe6e0ec], fog:[0xe6e0ec,38,135], hemi:[0xe6eeff,0x5d6e40,.6], sun:[0xffe2b4,1.2,22,38,14], fill:[0xb9c9ff,.32],
         bloom:[.55,.65,.8], grade:{sat:1.08,tint:[1.03,1,.985],lift:[.012,.008,.03],con:1.03,vig:.42}, motes:[1,1,1], size:.22},
 dawn:  {name:'몽환 새벽', exp:.9, grass:[0x2a5a46,0x9cc79e], sky:[0x7f9fe0,0xf2c6dc,0xfde4e6], fog:[0xf0d6e4,26,118], hemi:[0xffe9f3,0x55667c,.72], sun:[0xffc9bd,1.0,40,18,-10], fill:[0xa9c4ff,.5],
         bloom:[.85,.85,.7], grade:{sat:.95,tint:[1.0,.96,1.05],lift:[.025,.015,.05],con:1.02,vig:.38}, motes:[1.15,1.05,1.3], size:.3},
 golden:{name:'황금빛 오후', exp:.92, grass:[0x4a5414,0xc9c24a], sky:[0x4f86c9,0xf6d39a,0xffe2b0], fog:[0xf5d8aa,28,120], hemi:[0xfff0d0,0x6b5a3a,.55], sun:[0xffbf72,1.5,32,20,26], fill:[0x9fb6ff,.25],
         bloom:[.8,.7,.72], grade:{sat:1.15,tint:[1.08,1.0,.88],lift:[.035,.018,0],con:1.05,vig:.46}, motes:[1.3,1.05,.7], size:.26},
 arctic:{name:'북극', exp:.72, grass:[0x2a5418,0x93c24c], sky:[0x5d97d6,0xb9dcf0,0xe8f3fa], fog:[0xe2eef7,40,150], hemi:[0xeef6ff,0x8fb0c8,.7], sun:[0xfff1dc,1.05,24,34,16], fill:[0xbfd8ff,.42],
         bloom:[.4,.55,.9], grade:{sat:1.12,tint:[.95,.99,1.06],lift:[.0,.008,.025],con:1.1,vig:.45}, motes:[1.15,1.2,1.35], size:.3},
 dusk:  {name:'보랏빛 황혼', exp:.74, grass:[0x232a48,0x6a6f9c], sky:[0x1e2160,0x7a4fa8,0xf09a8c], fog:[0x8f6c9c,24,110], hemi:[0xc9b4ff,0x2c2645,.55], sun:[0xff8a66,1.0,-36,14,10], fill:[0x6f7cff,.6],
         bloom:[.95,.8,.62], grade:{sat:1.0,tint:[.95,.86,1.08],lift:[.015,0,.04],con:1.08,vig:.62}, motes:[.95,.95,1.5], size:.34},
};
let MOOD='day';
function applyMood(k){
  const M=MOODS[k]||MOODS.day; MOOD=MOODS[k]?k:'day';
  renderer.toneMappingExposure=M.exp;
  if (SKY){ SKY.uniforms.top.value.setHex(M.sky[0]); SKY.uniforms.mid.value.setHex(M.sky[1]); SKY.uniforms.bot.value.setHex(M.sky[2]); }
  scene.background.setHex(M.fog[0]); scene.fog.color.setHex(M.fog[0]); scene.fog.near=M.fog[1]; scene.fog.far=M.fog[2];
  HEMI.color.setHex(M.hemi[0]); HEMI.groundColor.setHex(M.hemi[1]); HEMI.intensity=M.hemi[2];
  sun.color.setHex(M.sun[0]); sun.intensity=M.sun[1]; sun.userData.off=[M.sun[2],M.sun[3],M.sun[4]];
  fill.color.setHex(M.fill[0]); fill.intensity=M.fill[1];
  if (bloom){ bloom.strength=M.bloom[0]; bloom.radius=M.bloom[1]; bloom.threshold=M.bloom[2]; }
  if (GRADE){ const G=M.grade, u=GRADE.uniforms; u.uSat.value=G.sat; u.uTint.value.set(...G.tint); u.uLift.value.set(...G.lift); u.uCon.value=G.con; u.uVig.value=G.vig; }
  try{ grassMat.uniforms.uBase.value.setHex(M.grass[0]); grassMat.uniforms.uTip.value.setHex(M.grass[1]); }catch(e){}
  if (MOTES){ MOTES.material.uniforms.uTint.value.set(...M.motes); MOTES.material.uniforms.uSize.value=M.size; }
}

/* 판마다 분위기를 무작위로 (방금 것과 다르게). 파티는 방 번호로 정해서 모두 같은 분위기 */
const MOOD_KEYS=Object.keys(MOODS).filter(k=>k!=='arctic');   // 북극은 빙하 맵 전용
function pickMood(seed){
  if (seed){ let h=0; for (const c of String(seed)) h=(h*31+c.charCodeAt(0))|0; return MOOD_KEYS[Math.abs(h)%MOOD_KEYS.length]; }
  const c=MOOD_KEYS.filter(k=>k!==MOOD); return c[Math.floor(Math.random()*c.length)];
}
applyMood(pickMood());
