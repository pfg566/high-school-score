/* 사회 게임 RPG · 상점 · 꾸미기 (직업별)
   파일은 01 → 13 순서로 불러와요. 모든 파일이 같은 전역 공간을 함께 써요. */
/* ---------- 직업별 상점 ----------
   코인은 하나로 함께 쓰고, 산 아이템과 착용은 직업마다 따로예요.
   옷: 기사(기사 · 바바리안) · 궁수(레인저 · 도적) · 마법사(마법사 · 드루이드). 색 버전은 옷 아이템으로 따로 있어요.
   머리색 아이템은 머리카락만 바꿔요(옷 · 무기는 그대로). */
const JOB_LIST=['knight','archer','mage'];
const JOB_SLOTS={knight:['outfit','hat','cape','weapon','shield','hair','eyes','eyecol','trail','pet'],archer:['outfit','hat','cape','weapon','hair','eyes','eyecol','trail','pet'],mage:['outfit','hat','cape','weapon','shield','hair','eyes','eyecol','trail','pet']};
const SLOTS=['outfit','hat','cape','weapon','shield','hair','eyes','eyecol','trail','pet'];
const SLOT_INFO={outfit:{label:'옷',icon:'👕'},hat:{label:'모자',icon:'⛑️'},cape:{label:'망토',icon:'🧣'},weapon:{label:'무기',icon:'⚔️'},shield:{label:'왼손',icon:'🛡️'},hair:{label:'머리색',icon:'💇'},trail:{label:'칼 궤적',icon:'✨'},pet:{label:'펫',icon:'🐾'},eyes:{label:'표정',icon:'😊'},eyecol:{label:'눈 색',icon:'👁️'}};
const TRAIL_LABEL={knight:'칼 궤적',archer:'화살 꼬리',mage:'구슬 꼬리'};
const slotLabel=(job,s)=>s==='trail'?TRAIL_LABEL[job]||SLOT_INFO.trail.label:SLOT_INFO[s].label;
const JOB_NAME={knight:'🛡️ 기사',archer:'🏹 궁수',mage:'🔮 마법사'};

/* 옷을 가져오는 2.0 모델: 몸 · 팔 · 다리(+망토 등) */
const OSRC={
  knight:{key:'p_knight',pre:'Knight',tex:'knight_texture',parts:['ArmLeft','ArmRight','Body','LegLeft','LegRight'],cape:'Cape'},
  ranger:{key:'p_ranger',pre:'Ranger',tex:'ranger_texture',parts:['ArmLeft','ArmRight','Body','LegLeft','LegRight'],cape:'Cape'},
  mage:  {key:'p_mage',pre:'Mage',tex:'mage_texture',parts:['ArmLeft','ArmRight','Body','LegLeft','LegRight'],cape:'Cape'},
  rogue: {key:'m_rogue',file:'Rogue',pre:'Rogue',tex:'rogue_texture',parts:['ArmLeft','ArmRight','Body','LegLeft','LegRight'],cape:'Cape'},
  hood:  {key:'m_hood',file:'Rogue_Hooded',pre:'RogueHooded',tex:'rogue_texture',parts:['ArmLeft','ArmRight','Body','LegLeft','LegRight','Mask'],cape:'Cape',head:'Head'},
  druid: {key:'m_druid',file:'Druid',pre:'Druid',tex:'druid_texture',parts:['ArmLeft','ArmRight','Body','LegLeft','LegRight','Backpack']},
  barb:  {key:'m_barb',file:'Barbarian',pre:'Barbarian',tex:'barbarian_texture',parts:['ArmLeft','ArmRight','Body','LegLeft','LegRight']}
};
// 검정 · 황금(금발)은 비싼 아이템이에요. was = 예전 번호(이미 산 학생은 그대로 가져요)
const HAIRS=[['gold2','금발','#e8bf63',1000,'gold'],['brown','갈색','#7a4b2c',200],['black2','검정','#2e2c33',1000,'black'],['red','빨강','#cc452e',300],['silver','은발','#d8dce3',300],['sky','하늘색','#5aa6e6',400],['pink','분홍','#ee84b2',400]];
const SW={silver:'linear-gradient(90deg,#b9bec6 60%,#d23a3a 60%)'};
const CATALOG=[
  /* ===== 기사 ===== */
  {id:'knight_p0',job:'knight',slot:'outfit',name:'은기사 갑옷',src:'knight',sw:SW.silver,desc:'처음 받은 은빛 갑옷'},
  {id:'wknight_p800',job:'knight',slot:'outfit',name:'백기사 갑옷',src:'knight',tex:'knight_texture_alt_A',sw:'linear-gradient(90deg,#f2f4f7 60%,#3fa565 60%)',desc:'눈처럼 하얀 갑옷과 초록 망토'},
  {id:'rknight_p800',job:'knight',slot:'outfit',name:'적기사 갑옷',src:'knight',tex:'knight_texture_alt_C',sw:'linear-gradient(90deg,#b81f2e 60%,#f2f2f2 60%)',desc:'붉은 갑옷과 하얀 망토'},
  {id:'bknight_p2500',was:'bknight_p1000',job:'knight',slot:'outfit',name:'흑기사 갑옷',src:'knight',rec:'black',sw:'linear-gradient(90deg,#2b2b31 60%,#7a1b24 60%)',desc:'검은 갑옷과 검붉은 망토'},
  {id:'barb_p800',job:'knight',slot:'outfit',name:'바바리안 전사복',src:'barb',tex:'barbarian_texture_alt_A',sw:'linear-gradient(90deg,#f0c9a0 60%,#5f7d3b 60%)',desc:'북쪽 땅 전사의 옷 (망토 없음)'},
  {id:'barbw_p1000',job:'knight',slot:'outfit',name:'설원 전사복',src:'barb',tex:'barbarian_texture_alt_B',sw:'linear-gradient(90deg,#f0c9a0 60%,#c9ccd2 60%)',desc:'눈 덮인 땅 전사의 옷 (망토 없음)'},
  {id:'khelm_p600',job:'knight',slot:'hat',name:'기사 투구',sig:{src:'knight',meshes:['Helmet','HelmetVisor']},desc:'얼굴 가리개 달린 투구 · 갑옷 색을 따라가요'},
  {id:'barbhat_p400',job:'knight',slot:'hat',name:'곰 털모자',sig:{src:'barb',meshes:['BearHat'],own:true},desc:'바바리안의 곰 털모자'},
  {id:'kcape_p300',job:'knight',slot:'cape',name:'기사 망토',own:true,desc:'갑옷과 같은 색 망토 (바바리안 옷에는 안 보여요)'},
  {id:'barbcape_p300',job:'knight',slot:'cape',name:'털 망토',part:'barb',mesh:'Barbarian_Cape'},
  {id:'sword_p0',job:'knight',slot:'weapon',name:'한손검',w:'sword_1handed',t:'knight_texture'},
  {id:'mug_p300',was:'mug_p150',job:'knight',slot:'weapon',name:'머그잔',w:'mug_full',t:'barbarian_texture',desc:'이걸로 싸울 수 있을까?'},
  {id:'knife_p300',was:'knife_p200',job:'knight',slot:'weapon',name:'단검',w:'dagger',t:'rogue_texture'},
  {id:'axe_p300',job:'knight',slot:'weapon',name:'한손 도끼',w:'axe_1handed',t:'barbarian_texture',ry:Math.PI},
  {id:'sword2_p500',job:'knight',slot:'weapon',name:'양손 대검',w:'sword_2handed',t:'knight_texture'},
  {id:'axe2_p600',job:'knight',slot:'weapon',name:'양손 도끼',w:'axe_2handed',t:'barbarian_texture'},
  {id:'gsword_p2000',was:'gsword_p800',job:'knight',slot:'weapon',name:'황금 대검',w:'sword_2handed_color',t:'knight_texture',desc:'손잡이가 금빛인 대검'},
  {id:'rshield_p250',was:'rshield_p150',job:'knight',slot:'shield',name:'둥근 방패',w:'shield_round',t:'knight_texture',hand:'l'},
  {id:'badge_p300',was:'badge_p200',job:'knight',slot:'shield',name:'문장 방패',w:'shield_badge',t:'knight_texture',hand:'l'},
  {id:'rect_p250',job:'knight',slot:'shield',name:'사각 방패',w:'shield_square',t:'knight_texture',hand:'l'},
  {id:'barbsh_p250',job:'knight',slot:'shield',name:'나무 방패',w:'shield_round_barbarian',t:'barbarian_texture',hand:'l'},
  {id:'rshieldc_p300',job:'knight',slot:'shield',name:'붉은 둥근 방패',w:'shield_round_color',t:'knight_texture',hand:'l'},
  {id:'badgec_p300',job:'knight',slot:'shield',name:'붉은 문장 방패',w:'shield_badge_color',t:'knight_texture',hand:'l'},
  {id:'knifeoff_p300',job:'knight',slot:'shield',name:'왼손 단검',w:'dagger',t:'rogue_texture',hand:'l'},
  {id:'spike_p400',job:'knight',slot:'shield',name:'가시 방패',w:'shield_spikes',t:'knight_texture',hand:'l'},
  {id:'rectc_p400',job:'knight',slot:'shield',name:'붉은 사각 방패',w:'shield_square_color',t:'knight_texture',hand:'l'},
  {id:'swordoff_p450',job:'knight',slot:'shield',name:'쌍검',w:'sword_1handed',t:'knight_texture',hand:'l'},
  {id:'axeoff_p450',job:'knight',slot:'shield',name:'쌍도끼',w:'axe_1handed',t:'barbarian_texture',hand:'l',ry:Math.PI},
  {id:'spikec_p500',job:'knight',slot:'shield',name:'붉은 가시 방패',w:'shield_spikes_color',t:'knight_texture',hand:'l'},
  {id:'gold_p0',job:'knight',slot:'trail',name:'금빛 궤적',color:0xfff1c4},
  {id:'ice_p300',was:'ice_p200',job:'knight',slot:'trail',name:'얼음 궤적',color:0x8fe3ff},
  {id:'leaf_p250',job:'knight',slot:'trail',name:'바람 궤적',color:0x9dff9a},
  {id:'fire_p300',job:'knight',slot:'trail',name:'불꽃 궤적',color:0xff8a3d},
  {id:'star_p400',job:'knight',slot:'trail',name:'별빛 궤적',color:0xd9a8ff},
  {id:'rainbow_p800',job:'knight',slot:'trail',name:'무지개 궤적',rainbow:true,desc:'휘두를 때마다 색이 바뀌어요'},
  /* ===== 궁수 ===== */
  {id:'ranger_p0',job:'archer',slot:'outfit',name:'레인저 옷',src:'ranger',sw:'linear-gradient(90deg,#f3ead9 60%,#3b9be0 60%)',desc:'하늘색 스카프의 레인저'},
  {id:'rangerb_p600',job:'archer',slot:'outfit',name:'숲 레인저',src:'ranger',tex:'ranger_texture_alt_B',sw:'linear-gradient(90deg,#97b33a 60%,#6b8a2a 60%)',desc:'숲에 숨는 초록 옷'},
  {id:'rangera_p600',job:'archer',slot:'outfit',name:'햇살 레인저',src:'ranger',tex:'ranger_texture_alt_A',sw:'linear-gradient(90deg,#f0d26a 60%,#e8a53a 60%)',desc:'밝은 노란 옷'},
  {id:'rangerc_p600',job:'archer',slot:'outfit',name:'노을 레인저',src:'ranger',tex:'ranger_texture_alt_C',sw:'linear-gradient(90deg,#e8843a 60%,#b85a2a 60%)',desc:'주황빛 사냥꾼 옷'},
  {id:'rogue_p800',job:'archer',slot:'outfit',name:'도적 옷',src:'rogue',sw:'linear-gradient(90deg,#2e9a6a 60%,#2a8a5a 60%)',desc:'날렵한 초록 도적 옷'},
  {id:'roguea_p800',job:'archer',slot:'outfit',name:'푸른 도적',src:'rogue',tex:'rogue_texture_alt_A',sw:'linear-gradient(90deg,#4a8ad0 60%,#3aa0f0 60%)',desc:'푸른 망토의 도적'},
  {id:'rogueb_p1000',job:'archer',slot:'outfit',name:'진홍 도적',src:'rogue',tex:'rogue_texture_alt_B',sw:'linear-gradient(90deg,#2a7f8a 60%,#e8342e 60%)',desc:'붉은 망토의 도적'},
  {id:'hood_p1200',job:'archer',slot:'outfit',name:'복면 도적',src:'hood',sw:'linear-gradient(90deg,#3a4a5a 60%,#2e9a6a 60%)',desc:'후드와 복면으로 얼굴을 가려요 (모자 · 머리색은 안 보여요)'},
  {id:'abear_p400',job:'archer',slot:'hat',name:'곰 털모자',sig:{src:'barb',meshes:['BearHat'],own:true},desc:'바바리안의 곰 털모자'},
  {id:'ahelm_p600',job:'archer',slot:'hat',name:'기사 투구',sig:{src:'knight',meshes:['Helmet','HelmetVisor']},desc:'궁수도 투구를 써요'},
  {id:'acape_p300',job:'archer',slot:'cape',name:'궁수 망토',own:true,desc:'옷과 같은 색 망토'},
  {id:'roguecape_p300',job:'archer',slot:'cape',name:'도적 망토',part:'rogue',mesh:'Rogue_Cape'},
  {id:'bow_p0',job:'archer',slot:'weapon',name:'활',sw:'#8f4c39',w:'bow_withString',t:'ranger_texture',hand:'l',ry:Math.PI},
  {id:'bowh_p400',job:'archer',slot:'weapon',name:'사냥꾼 활',w:'bow_withString',t:'ranger_texture',bow:'#a29a8e',sw:'#a29a8e',hand:'l',ry:Math.PI,desc:'잿빛 나무로 만든 활'},
  {id:'bowr_p400',hidden:true,job:'archer',slot:'weapon',name:'붉은 활',w:'bow_withString',t:'ranger_texture',bow:'#c0353d',sw:'#c0353d',hand:'l',ry:Math.PI,desc:'붉게 칠한 활'},
  {id:'bowf_p500',hidden:true,job:'archer',slot:'weapon',name:'숲의 활',w:'bow_withString',t:'ranger_texture',bow:'#5c9a3c',sw:'#5c9a3c',hand:'l',ry:Math.PI,desc:'초록 나무로 만든 활'},
  {id:'bowd_p1500',was:'bowd_p600',job:'archer',slot:'weapon',name:'흑단 활',w:'bow_withString',t:'ranger_texture',bow:'#3b3238',sw:'#3b3238',hand:'l',ry:Math.PI,desc:'검은 나무로 만든 활'},
  {id:'bowg_p2000',job:'archer',slot:'weapon',name:'황금 활',w:'bow_withString',t:'ranger_texture',bow:'#e0b23a',sw:'linear-gradient(90deg,#f6dc7a,#c8921c)',hand:'l',ry:Math.PI,desc:'금빛으로 빛나는 활'},
  /* ===== 마법사 ===== */
  {id:'magerobe_p0',job:'mage',slot:'outfit',name:'마법사 로브',src:'mage',sw:'linear-gradient(90deg,#5a4aa8 60%,#d0408a 60%)',desc:'보랏빛 로브'},
  {id:'magea_p600',job:'mage',slot:'outfit',name:'노을 로브',src:'mage',tex:'mage_texture_alt_A',sw:'linear-gradient(90deg,#e8843a 60%,#5a86b8 60%)',desc:'주황 로브'},
  {id:'mageb_p600',job:'mage',slot:'outfit',name:'숲 로브',src:'mage',tex:'mage_texture_alt_B',sw:'linear-gradient(90deg,#a9b833 60%,#c9c4bd 60%)',desc:'연두 로브'},
  {id:'mage_p1000',job:'mage',slot:'outfit',name:'하늘 로브',src:'mage',tex:'mage_texture_alt_C',sw:'linear-gradient(90deg,#5a86b8 60%,#f0c860 60%)',desc:'파란 로브와 금빛 모자'},
  {id:'druid_p800',job:'mage',slot:'outfit',name:'드루이드 옷',src:'druid',sw:'linear-gradient(90deg,#3fb57a 60%,#8a9a2a 60%)',desc:'숲의 마법사 옷'},
  {id:'druidb_p1000',job:'mage',slot:'outfit',name:'눈꽃 드루이드',src:'druid',tex:'druid_texture_alt_B',sw:'linear-gradient(90deg,#f2efe8 60%,#f07a2a 60%)',desc:'하얀 털옷의 드루이드'},
  {id:'druidc_p1000',job:'mage',slot:'outfit',name:'햇살 드루이드',src:'druid',tex:'druid_texture_alt_C',sw:'linear-gradient(90deg,#f2c84a 60%,#2aa8a0 60%)',desc:'노란 옷의 드루이드'},
  {id:'magehat_p500',job:'mage',slot:'hat',name:'마법사 모자',sig:{src:'mage',meshes:['Hat']},desc:'커다란 마법사 모자 · 로브 색을 따라가요'},
  {id:'dhood_p800',job:'mage',slot:'hat',name:'사슴뿔 두건',head:'druid',desc:'드루이드의 사슴뿔 두건 (머리를 감싸요)'},
  {id:'mcape_p300',job:'mage',slot:'cape',name:'마법사 망토',own:true,desc:'로브와 같은 색 망토 (드루이드 옷에는 안 보여요)'},
  {id:'magecape_p400',job:'mage',slot:'cape',name:'별 망토',part:'mage',mesh:'Mage_Cape'},
  {id:'mstaff_p0',job:'mage',slot:'weapon',name:'마법 지팡이',w:'staff',t:'mage_texture'},
  {id:'wand_p400',job:'mage',slot:'weapon',name:'마법봉',w:'wand',t:'mage_texture'},
  {id:'istaff_p500',job:'mage',slot:'weapon',name:'얼음 지팡이',w:'staff',t:'mage_texture_alt_A',desc:'하늘빛 보석 지팡이'},
  {id:'fstaff_p500',job:'mage',slot:'weapon',name:'불꽃 지팡이',w:'staff',t:'mage_texture_alt_B',desc:'주황빛 보석 지팡이'},
  {id:'staff_p600',job:'mage',slot:'weapon',name:'드루이드 지팡이',w:'druid_staff',t:'druid_texture',desc:'사슴뿔 나무 지팡이'},
  {id:'potb_p300',was:'potb_p200',job:'mage',slot:'shield',name:'파란 물약',w:'potion_large_blue',t:'druid_texture',hand:'l'},
  {id:'potr_p300',was:'potr_p200',job:'mage',slot:'shield',name:'빨간 물약',w:'potion_large_red',t:'druid_texture',hand:'l'},
  {id:'potg_p300',was:'potg_p200',job:'mage',slot:'shield',name:'초록 물약',w:'potion_large_green',t:'druid_texture',hand:'l'},
  {id:'bookc_p300',job:'mage',slot:'shield',name:'닫힌 마법책',w:'spellbook_closed',t:'mage_texture',hand:'l'},
  {id:'book_p500',job:'mage',slot:'shield',name:'펼친 마법책',w:'spellbook_open',t:'mage_texture',hand:'l'},
  {id:'atrnone_p0',job:'archer',slot:'trail',name:'꼬리 없음',none:true,desc:'화살이 그냥 날아가요'},
  {id:'atrice_p300',job:'archer',slot:'trail',name:'얼음 꼬리',color:0x8fe3ff,desc:'화살 뒤로 빛가루가 남아요'},
  {id:'atrleaf_p300',job:'archer',slot:'trail',name:'바람 꼬리',color:0x9dff9a,desc:'화살 뒤로 빛가루가 남아요'},
  {id:'atrfire_p400',job:'archer',slot:'trail',name:'불꽃 꼬리',color:0xff8a3d,desc:'화살 뒤로 빛가루가 남아요'},
  {id:'atrstar_p500',job:'archer',slot:'trail',name:'별빛 꼬리',color:0xd9a8ff,desc:'화살 뒤로 빛가루가 남아요'},
  {id:'atrrain_p1000',job:'archer',slot:'trail',name:'무지개 꼬리',rainbow:true,desc:'쏠 때마다 색이 바뀌어요'},
  {id:'mtrnone_p0',job:'mage',slot:'trail',name:'원소 색 꼬리',none:true,desc:'구슬 뒤 빛가루가 원소 색이에요 (구슬 색은 원소를 따라가요)'},
  {id:'mtrice_p300',job:'mage',slot:'trail',name:'얼음 꼬리',color:0x8fe3ff,desc:'구슬 뒤 빛가루 색만 바뀌어요'},
  {id:'mtrleaf_p300',job:'mage',slot:'trail',name:'바람 꼬리',color:0x9dff9a,desc:'구슬 뒤 빛가루 색만 바뀌어요'},
  {id:'mtrgold_p400',job:'mage',slot:'trail',name:'금빛 꼬리',color:0xffe08a,desc:'구슬 뒤 빛가루 색만 바뀌어요'},
  {id:'mtrstar_p500',job:'mage',slot:'trail',name:'별빛 꼬리',color:0xd9a8ff,desc:'구슬 뒤 빛가루 색만 바뀌어요'},
  {id:'mtrrain_p1000',job:'mage',slot:'trail',name:'무지개 꼬리',rainbow:true,desc:'빛가루 색이 계속 바뀌어요'},
  /* ===== 업적 보상: 코인으로는 못 사요 (세 직업 모두) ===== */
  {id:'xtexp_p0',job:'all',slot:'trail',name:'탐험가의 바람',color:0x46e6c8,ach:'explorer',desc:'업적 🧭 탐험가 보상'},
  {id:'xtdex_p0',job:'all',slot:'trail',name:'지식의 금빛',color:0xffd23a,ach:'dex',desc:'업적 📚 도감 마스터 보상'},
  {id:'xtphx_p0',job:'all',slot:'trail',name:'불사조 궤적',color:0xff4d2e,ach:'fix30',desc:'업적 🔁 오답 정복자 보상'},
  {id:'xhfire_p0',job:'all',slot:'hair',name:'불꽃 머리',hair:'#ff6a2a',sw:'#ff6a2a',ach:'streak10',desc:'업적 🔥 불꽃 연속왕 보상 · 머리카락 색만 바뀌어요'},
  {id:'xhdoc_p0',job:'all',slot:'hair',name:'박사의 보랏빛 머리',hair:'#8a5cff',sw:'#8a5cff',ach:'q1000',desc:'업적 🎓 사회 박사 보상 · 머리카락 색만 바뀌어요'},
  /* ===== 함께 쓰는 '없음' ===== */
  {id:'nohat_p0',job:'all',slot:'hat',name:'맨머리'},
  {id:'nocape_p0',job:'all',slot:'cape',name:'망토 없음'},
  /* ===== 날개 (망토 자리 · 세 직업 모두) ===== */
  {id:'wangel_p1200',job:'all',slot:'cape',name:'천사 날개',wing:'angel',desc:'깃털을 한 장씩 겹친 하얀 날개 · 달리면 힘차게 퍼덕여요'},
  {id:'wbat_p1200',job:'all',slot:'cape',name:'박쥐 날개',wing:'bat',desc:'뼈대와 막이 있는 보랏빛 날개'},
  {id:'wbfly_p1500',job:'all',slot:'cape',name:'나비 날개',wing:'butterfly',desc:'무늬가 그려진 나비 날개 · 팔랑팔랑 빠르게 움직여요'},
  {id:'wice_p2000',job:'all',slot:'cape',name:'얼음 결정 날개',wing:'crystal',desc:'빛나는 얼음 조각 날개 · 반짝이가 떠다녀요'},
  {id:'wphx_p2500',job:'all',slot:'cape',name:'불사조 날개',wing:'phoenix',desc:'스스로 빛나는 불꽃 깃털 · 불씨가 피어올라요'},
  {id:'noshield_p0',job:'all',slot:'shield',name:'빈손'},
  /* ===== 표정 (세 직업 모두 · 한 번 사면 세 직업 다 써요 · 고른 표정이 늘 그 얼굴이 돼요 · 입은 그대로) ===== */
  {id:'eyenone_p0',job:'all',slot:'eyes',name:'기본 눈',ico:'😐',desc:'캐릭터의 원래 눈'},
  {id:'fbase_p600',job:'all',slot:'eyes',face:'base',name:'반짝 눈',ico:'🙂',desc:'반짝임이 들어간 동그란 눈 · 가끔 깜빡여요'},
  {id:'fhappy_p600',job:'all',slot:'eyes',face:'happy',name:'웃는 눈 ^^',ico:'😊',desc:'늘 싱글벙글 웃는 눈'},
  {id:'fsleepy_p600',job:'all',slot:'eyes',face:'sleepy',name:'졸린 눈',ico:'😪',desc:'꾸벅꾸벅 졸린 눈'},
  {id:'fdot_p600',job:'all',slot:'eyes',face:'dot',name:'점 눈',ico:'😶',desc:'콕 찍은 작은 점 눈 · 멍~'},
  {id:'fwink_p800',job:'all',slot:'eyes',face:'wink',name:'윙크',ico:'😉',desc:'한쪽 눈을 찡긋'},
  {id:'ffocus_p800',job:'all',slot:'eyes',face:'focus',name:'결의의 눈',ico:'😤',desc:'반쯤 내리깐 진지한 눈'},
  {id:'fangry_p800',job:'all',slot:'eyes',face:'angry',name:'화난 눈',ico:'😠',desc:'눈꼬리가 올라간 화난 눈'},
  {id:'fsurp_p800',job:'all',slot:'eyes',face:'surprise',name:'놀란 눈',ico:'😳',desc:'동그랗게 뜬 깜짝 놀란 눈'},
  {id:'fsad_p800',job:'all',slot:'eyes',face:'sad',name:'글썽 눈',ico:'🥺',desc:'눈물이 그렁그렁'},
  {id:'fsparkle_p1000',job:'all',slot:'eyes',face:'sparkle',name:'초롱초롱 눈',ico:'🥹',desc:'크고 반짝이는 눈 + 볼터치'},
  {id:'fhurt_p1000',job:'all',slot:'eyes',face:'hurt',name:'질끈 눈 ><',ico:'😣',desc:'눈을 질끈 감은 얼굴'},
  {id:'fheart_p1200',job:'all',slot:'eyes',face:'heart',name:'하트 눈',ico:'😍',desc:'눈이 하트! 볼터치까지'},
  {id:'fstar_p1200',job:'all',slot:'eyes',face:'star',name:'별 눈',ico:'🤩',desc:'반짝반짝 별 모양 눈'},
  {id:'fswirl_p1200',job:'all',slot:'eyes',face:'swirl',name:'어질어질 눈',ico:'😵‍💫',desc:'빙글빙글 도는 눈'},
  /* ===== 눈 색 (표정 아이템을 낀 눈에만 칠해져요 · 기본 눈에는 안 보여요) ===== */
  {id:'ecblk_p0',job:'all',slot:'eyecol',eyecol:0,name:'까만 눈동자',sw:'#2a2638',desc:'기본 눈 색'},
  {id:'ecbrn_p600',job:'all',slot:'eyecol',eyecol:1,name:'갈색 눈동자',sw:'linear-gradient(180deg,#3b2214,#a8703f)',desc:'표정 아이템과 함께 써요'},
  {id:'ecblu_p600',job:'all',slot:'eyecol',eyecol:2,name:'파란 눈동자',sw:'linear-gradient(180deg,#13306e,#6fb0ff)',desc:'표정 아이템과 함께 써요'},
  {id:'ecgrn_p600',job:'all',slot:'eyecol',eyecol:3,name:'초록 눈동자',sw:'linear-gradient(180deg,#0f4a2c,#62d39a)',desc:'표정 아이템과 함께 써요'},
  {id:'ecpur_p800',job:'all',slot:'eyecol',eyecol:4,name:'보라 눈동자',sw:'linear-gradient(180deg,#33195e,#b18cff)',desc:'표정 아이템과 함께 써요'},
  {id:'ecred_p800',job:'all',slot:'eyecol',eyecol:5,name:'루비 눈동자',sw:'linear-gradient(180deg,#5e1016,#ff8a8a)',desc:'표정 아이템과 함께 써요'},
  /* ===== 펫 (세 직업 모두 · 가게에서 못 사요: 🥚 알을 부화시키면 무작위로 나와요 · 꾸미기 전용) =====
     was = 알 시스템 전에 코인으로 산 학생은 그대로 가져요 */
  {id:'nopet_p0',job:'all',slot:'pet',name:'펫 없음',ico:'➖'},
  {id:'pdog_egg',job:'all',slot:'pet',name:'강아지',pet:'dog',ico:'🐶',egg:true,was:'pdog_p1500',desc:'졸졸 따라오며 꼬리를 흔들어요 · 문제를 맞히면 폴짝!'},
  {id:'pcat_egg',job:'all',slot:'pet',name:'고양이',pet:'cat',ico:'🐱',egg:true,was:'pcat_p1500',desc:'살금살금 따라와요 · 가만히 있으면 앉아서 꼬리를 살랑'},
  {id:'prabbit_egg',job:'all',slot:'pet',name:'토끼',pet:'rabbit',ico:'🐰',egg:true,was:'prabbit_p2000',desc:'깡충깡충 뛰어서 따라와요'},
  {id:'pslime_egg',job:'all',slot:'pet',name:'슬라임',pet:'slime',ico:'🟢',egg:true,was:'pslime_p2000',desc:'말랑말랑 통통 튀는 투명 슬라임'},
  {id:'ppeng_egg',job:'all',slot:'pet',name:'펭귄',pet:'penguin',ico:'🐧',egg:true,was:'ppeng_p2500',desc:'뒤뚱뒤뚱 걸어요 · 맞히면 날개를 파닥파닥'},
  {id:'pbear_egg',job:'all',slot:'pet',name:'아기 북극곰',pet:'bear',ico:'🐻‍❄️',egg:true,was:'pbear_p2500',desc:'포동포동 하얀 아기 곰'},
  {id:'pribbon_egg',job:'all',slot:'pet',name:'리본 고양이',pet:'ribbon',ico:'🎀',egg:true,desc:'분홍 리본에 방울 목걸이 · 꼬리 끝이 하트예요'},
  {id:'pfox_egg',job:'all',slot:'pet',name:'아기 여우',pet:'fox',ico:'🦊',egg:true,desc:'복슬복슬 큰 꼬리를 살랑살랑'},
  {id:'powl_egg',job:'all',slot:'pet',name:'부엉이',pet:'owl',ico:'🦉',egg:true,was:'powl_p3000',desc:'어깨 옆을 날아다녀요 · 가끔 고개를 휙 돌려요'},
  {id:'pdragon_egg',job:'all',slot:'pet',name:'아기 용',pet:'dragon',ico:'🐲',egg:true,was:'pdragon_p5000',desc:'작은 날개로 파닥파닥 날아다니는 아기 용'},
  {id:'eggpet',hidden:true,job:'none',slot:'pet',name:'키우는 알',pet:'egg'},
  {id:'xpgowl_p0',job:'all',slot:'pet',name:'황금 부엉이',pet:'gowl',ico:'✨',ach:'q500',desc:'업적 📖 지식 수집가 보상 · 반짝이가 맴돌아요'}
];
/* 머리색: 직업마다 따로 사요 (k: 기사, a: 궁수, m: 마법사) */
JOB_LIST.forEach(j=>{
  const p=j[0];
  CATALOG.push({id:p+'hair_p0',job:j,slot:'hair',name:'처음 머리색',desc:'캐릭터의 원래 머리색'});
  HAIRS.forEach(([k,nm,col,pr,old])=>CATALOG.push({id:`${p}h${k}_p${pr}`,job:j,slot:'hair',name:nm+' 머리',hair:col,sw:col,desc:'머리카락 색만 바뀌어요',...(old?{was:`${p}h${old}_p200`}:{})}));
});
const CAT={}; CATALOG.forEach(it=>CAT[it.id]=it); CATALOG.forEach(it=>{ if (it.was && !CAT[it.was]) CAT[it.was]=it; });
const priceOf=id=>{ const m=/_p(\d+)$/.exec(id||''); return m?+m[1]:0; };
const DEFAULTS={
  knight:{outfit:'knight_p0',hat:'nohat_p0',cape:'nocape_p0',weapon:'sword_p0',shield:'noshield_p0',hair:'khair_p0',trail:'gold_p0',pet:'nopet_p0',eyes:'eyenone_p0',eyecol:'ecblk_p0'},
  archer:{outfit:'ranger_p0',hat:'nohat_p0',cape:'nocape_p0',weapon:'bow_p0',hair:'ahair_p0',trail:'atrnone_p0',pet:'nopet_p0',eyes:'eyenone_p0',eyecol:'ecblk_p0'},
  mage:{outfit:'magerobe_p0',hat:'nohat_p0',cape:'nocape_p0',weapon:'mstaff_p0',shield:'noshield_p0',hair:'mhair_p0',trail:'mtrnone_p0',pet:'nopet_p0',eyes:'eyenone_p0',eyecol:'ecblk_p0'}
};
const fitsJob=(id,job,slot)=>{ const it=CAT[id]; return !!it && it.slot===slot && (it.job===job||it.job==='all') && JOB_SLOTS[job].includes(slot); };
/* 저장된 착용: equip/<직업>_<칸>. 예전(직업 없이 칸만) 기록은 기사 것으로 읽어요 */
function lookOf(job,eq){ const L={...DEFAULTS[job]}; eq=eq||{};
  for (const s of JOB_SLOTS[job]){ let id=eq[job+'_'+s]; if (id===undefined && job==='knight') id=eq[s]; if (fitsJob(id,job,s)) L[s]=id; } return L; }
function guestEquip(){ try{ return JSON.parse(localStorage.getItem('gsd-look2')||'{}'); }catch(e){ return {}; } }
function guestLook(job){ job=job||JOB; const L=lookOf(job,guestEquip()); JOB_SLOTS[job].forEach(s=>{ if ((priceOf(L[s])>0||(CAT[L[s]]&&(CAT[L[s]].ach||CAT[L[s]].egg))) && !isAdmin) L[s]=DEFAULTS[job][s]; }); return L; }
function equippedLook(job){ job=job||JOB; return STUDENT&&WARDROBE ? lookOf(job,WARDROBE.equip) : guestLook(job); }
function owns(id){ const it=CAT[id]; if (it&&it.egg) return eggOwnedPet(it.id) || (!STUDENT && typeof isAdmin!=='undefined' && isAdmin); if (it&&it.ach) return hasAch(it.ach) || (!STUDENT && typeof isAdmin!=='undefined' && isAdmin); return priceOf(id)===0 || !!(WARDROBE&&WARDROBE.inv&&(WARDROBE.inv[id]||(it&&it.was&&WARDROBE.inv[it.was]))) || (!STUDENT && typeof isAdmin!=='undefined' && isAdmin); }
function availCoins(){ return PROFILE ? Math.max(0,(PROFILE.coins|0)-((WARDROBE&&WARDROBE.spent)|0)) : 0; }

/* ---------- 파일 불러오기 (필요할 때 한 번만) ---------- */
const PARTS_FILES={barb:'models/parts_barbarian.glb',mage:'models/parts_mage.glb',rogue:'models/parts_rogue.glb?v=3',hood:'models/parts_rogueh.glb'};
const partsLoader=new THREE.GLTFLoader(), partsP={}, partToon=new WeakMap();
const loadParts=k=>partsP[k]||(partsP[k]=new Promise((res,rej)=>partsLoader.load(PARTS_FILES[k],res,undefined,e=>{ delete partsP[k]; rej(e); })));
function partMat(m,rim){ let t=partToon.get(m); if (!t){ t=toToon(m,rim,0xfff2dc); partToon.set(m,t); } return t; }
const wardP={};
function loadGLB(key,url){ if (GL[key]) return Promise.resolve(GL[key]); return wardP[key]||(wardP[key]=new Promise((res,rej)=>partsLoader.load(url,g=>{ GL[key]=g; res(g); },undefined,e=>{ delete wardP[key]; rej(e); }))); }
const loadSrc=s=>{ const O=OSRC[s]; return O.file?loadGLB(O.key,`models/p2/${O.file}.glb`):Promise.resolve(GL[O.key]); };
const loadW=w=>loadGLB('w2_'+w,`models/p2/${w}.glb`);
const IMG={};
function loadImg(n){ return IMG[n]||(IMG[n]=new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>{ delete IMG[n]; rej(new Error(n)); }; i.src=`models/p2/tex/${n}.png?v=2`; })); }
const TEXC={};
function plainTex(n){ if (TEXC[n]) return TEXC[n]; const t=new THREE.TextureLoader().load(`models/p2/tex/${n}.png?v=2`); t.flipY=false; t.encoding=THREE.sRGBEncoding; t.anisotropy=4; return TEXC[n]=t; }

/* ---------- 텍스처 합치기: 옷 색은 옷 텍스처에서, 피부 · 머리는 그 직업 캐릭터 것으로 ----------
   KayKit 2.0 텍스처는 모두 같은 배치예요. 왼쪽 위 256×256 칸이 피부(왼쪽)와 머리카락(오른쪽 x128~255, y32~223)이에요 */
const COMP={};
function compTex(src,rec,job,hair){
  const key=[src,rec||'',job,hair||''].join('|'); if (COMP[key]) return COMP[key];
  return COMP[key]=Promise.all([loadImg(src),job?loadImg(P2[job].tex+'_texture'):null]).then(([a,b])=>{
    const c=document.createElement('canvas'); c.width=c.height=1024; const g=c.getContext('2d');
    g.drawImage(a,0,0,1024,1024);
    if (rec==='black') recolorBlack(g);
    if (b){ g.clearRect(0,0,256,256); g.drawImage(b,0,0,256,256,0,0,256,256); if (hair) dyeHair(g,hair); }
    const t=new THREE.CanvasTexture(c); t.flipY=false; t.encoding=THREE.sRGBEncoding; t.anisotropy=4; return t;
  });
}
function recolorBlack(g){
  const d=g.getImageData(0,0,1024,1024), p=d.data;
  for (let i=0;i<p.length;i+=4){ const r=p[i],gg=p[i+1],b=p[i+2], mx=Math.max(r,gg,b), mn=Math.min(r,gg,b), l=(r*.3+gg*.59+b*.11);
    if (mx-mn<38){ const v=16+l*.3; p[i]=v; p[i+1]=v; p[i+2]=v*1.08; }          // 은빛 쇠 → 검은 쇠
    else if (r>gg*1.35 && r>b*1.25){ p[i]=r*.55; p[i+1]=gg*.25; p[i+2]=b*.32; }  // 붉은색 → 검붉은색
    else { p[i]=r*.45; p[i+1]=gg*.42; p[i+2]=b*.45; } }                          // 나머지(가죽 등)는 어둡게
  g.putImageData(d,0,0);
}
function dyeHair(g,hex){
  const col=new THREE.Color(hex), T=[col.r*255,col.g*255,col.b*255];
  const d=g.getImageData(128,32,128,192), p=d.data; let s=0,n=0;
  for (let i=0;i<p.length;i+=4){ if (p[i+3]<8) continue; s+=p[i]*.3+p[i+1]*.59+p[i+2]*.11; n++; }
  const ref=n?s/n:128;
  for (let i=0;i<p.length;i+=4){ if (p[i+3]<8) continue; const k=Math.min(1.6,Math.max(.35,(p[i]*.3+p[i+1]*.59+p[i+2]*.11)/ref));
    p[i]=Math.min(255,T[0]*k); p[i+1]=Math.min(255,T[1]*k); p[i+2]=Math.min(255,T[2]*k); }
  g.putImageData(d,128,32);
}

/* 활: 활대 칸만 다시 칠해요 (줄 · 손잡이는 기본 그대로) */
const BOWC={};
function bowTex(hex){
  if (BOWC[hex]) return BOWC[hex];
  return BOWC[hex]=loadImg('ranger_texture').then(img=>{
    const c=document.createElement('canvas'); c.width=c.height=1024; const g=c.getContext('2d'); g.drawImage(img,0,0,1024,1024);
    const d=g.getImageData(832,352,64,96), p=d.data, T=new THREE.Color(hex); let s=0,n=0;
    for (let i=0;i<p.length;i+=4){ s+=p[i]*.3+p[i+1]*.59+p[i+2]*.11; n++; } const ref=s/n||1;
    for (let i=0;i<p.length;i+=4){ const k=Math.min(1.5,Math.max(.4,(p[i]*.3+p[i+1]*.59+p[i+2]*.11)/ref)); p[i]=Math.min(255,T.r*255*k); p[i+1]=Math.min(255,T.g*255*k); p[i+2]=Math.min(255,T.b*255*k); }
    g.putImageData(d,832,352);
    const t=new THREE.CanvasTexture(c); t.flipY=false; t.encoding=THREE.sRGBEncoding; t.anisotropy=4; return t; });
}
/* ---------- 캐릭터 입히기 ---------- */
function charMat(ch,tex){ ch.matCache=ch.matCache||new Map(); let m=ch.matCache.get(tex); if (!m){ m=toonMat({map:tex,rim:.5,skinning:true}); ch.matCache.set(tex,m); } return m; }
function srcMesh(s,part){ const O=OSRC[s]; const g=GL[O.key]; return g&&g.scene.getObjectByName(O.pre+'_'+part); }
/* 다른 모델의 메시를 입힐 때: 뼈 순서가 모델마다 달라서 이름으로 짝지어 새 뼈대를 만들어요 */
function skelFor(ch,src){
  ch.skelCache=ch.skelCache||new Map(); let k=ch.skelCache.get(src); if (k) return k;
  if (!ch.boneByName){ ch.boneByName={}; ch.skel.bones.forEach(b=>ch.boneByName[b.name]=b); }
  const bones=src.bones.map(b=>ch.boneByName[b.name]);
  k=bones.every(Boolean)?new THREE.Skeleton(bones,src.boneInverses.map(m=>m.clone())):ch.skel; ch.skelCache.set(src,k); return k;
}
async function dressP2(ch,L){
  const tok=ch.dressTok=(ch.dressTok||0)+1, job=ch.job;
  const o=CAT[L.outfit], hat=CAT[L.hat], cape=CAT[L.cape], hairIt=CAT[L.hair];
  const hair=hairIt&&hairIt.hair||null;
  const srcs=new Set([o.src]); if (hat.sig) srcs.add(hat.sig.src); if (hat.head) srcs.add(hat.head); if (job==='archer') srcs.add('ranger');
  const held=[CAT[L.weapon], L.shield?CAT[L.shield]:null].filter(x=>x&&x.w);
  await Promise.all([...[...srcs].map(loadSrc), ...held.map(it=>loadW(it.w)), cape.part?loadParts(cape.part):null]);
  const oTex=await compTex(o.tex||OSRC[o.src].tex,o.rec,job,hair);
  const texFor=async s=>s===o.src?oTex:compTex(OSRC[s].tex,null,job,hair);
  const hatTex=hat.sig&&hat.sig.own?await compTex(hat.sig.src===o.src?(o.tex||OSRC[o.src].tex):OSRC[hat.sig.src].tex,null,null,null):hat.sig?await texFor(hat.sig.src):hat.head?await texFor(hat.head):null;
  const quivTex=job==='archer'?await texFor('ranger'):null;
  const capeG=cape.part?await loadParts(cape.part):null;
  const heldTex={}; for (const it of held){ heldTex[it.id]=it.bow?await bowTex(it.bow):plainTex(it.t); }
  if (tok!==ch.dressTok) return;
  // 지난번에 입힌 것 벗기기
  (ch.wardParts||[]).forEach(m=>{ if (m.parent) m.parent.remove(m); }); ch.wardParts=[];
  const root=ch.root, skel=ch.skel, host=ch.host;
  ch.native.forEach(m=>{ m.visible=false; });
  const addSkin=(src,tex)=>{ if (!src) return; src.traverse(x=>{ if (!x.isSkinnedMesh) return;
    const m=x.clone(); m.bind(skelFor(ch,x.skeleton),x.bindMatrix); m.material=charMat(ch,tex); m.frustumCulled=false; m.castShadow=true; m.receiveShadow=true; host.add(m); ch.wardParts.push(m); }); };
  // 머리: 복면 도적 옷이나 사슴뿔 두건은 머리를 통째로 바꿔요
  const headSrc=OSRC[o.src].head?[o.src,oTex]:hat.head?[hat.head,hatTex]:null;
  const nHead=ch.wardParts.length;
  if (headSrc) addSkin(srcMesh(headSrc[0],'Head'),headSrc[1]);
  else { ch.nativeHead.visible=true; ch.nativeHead.material=charMat(ch,oTex); }
  // 눈: 원래 막대 눈 대신 반짝이는 그린 눈 (10f-face.js)
  if (typeof attachFace==='function'){ const hm=headSrc?ch.wardParts.slice(nHead).find(m=>/Head/.test(m.name))||ch.wardParts[nHead]:ch.nativeHead; const ey=CAT[L.eyes], ec=CAT[L.eyecol];
    if (ch.nativeHead && ch.nativeHead.userData.geo0) ch.nativeHead.geometry=ch.nativeHead.userData.geo0;   // 기본 눈으로 되돌리기
    ch.face=null;
    if (ey && ey.face){ const fm=attachFace(ch,hm,ey.face,ec&&ec.eyecol||0); if (fm) ch.wardParts.push(fm); } }
  // 옷 · 망토
  OSRC[o.src].parts.forEach(p=>addSkin(srcMesh(o.src,p),oTex));
  if (cape.own && OSRC[o.src].cape) addSkin(srcMesh(o.src,OSRC[o.src].cape),oTex);
  else if (capeG){ const src=capeG.scene.getObjectByName(cape.mesh); const bone=src&&src.parent&&root.getObjectByName(src.parent.name);
    if (bone){ const m=src.clone(true); m.traverse(x=>{ if (x.isMesh){ x.material=partMat(x.material,.4); x.castShadow=true; } }); bone.add(m); ch.wardParts.push(m); } }
  if (cape.wing && typeof attachWings==='function'){ const h=attachWings(ch,cape.wing); if (h) ch.wardParts.push(h); }
  const petIt=CAT[L.pet]; if (petIt && petIt.pet && typeof attachPet==='function'){ const pg2=attachPet(ch,petIt.pet); if (pg2) ch.wardParts.push(pg2); }
  if (job==='archer') addSkin(srcMesh('ranger','Quiver'),quivTex);
  // 모자 (머리를 감싸는 옷이면 안 써요)
  if (hat.sig && !headSrc) hat.sig.meshes.forEach(n=>addSkin(srcMesh(hat.sig.src,n),hatTex));
  // 손에 드는 것: 원래 텍스처 그대로 (머리색 · 옷 색과 상관없어요)
  for (const it of held){ const bone=root.getObjectByName(it.hand==='l'?'handslotl':'handslotr'); if (!bone) continue;
    const w=GL['w2_'+it.w].scene.clone(true); if (it.ry) w.rotation.y=it.ry;
    w.traverse(x=>{ if (x.isMesh){ x.material=toonMat({map:heldTex[it.id],color:it.tint||0xffffff,rim:.4}); x.castShadow=true; } });
    bone.add(w); ch.wardParts.push(w); }
  // 맞았을 때 빨갛게 번쩍이는 재질 목록 다시 모으기
  const mats=new Set(); root.traverse(x=>{ if (x.isMesh && x.visible!==false && !x.userData.noFlash){ (Array.isArray(x.material)?x.material:[x.material]).forEach(m=>mats.add(m)); } });
  ch.mats=[...mats]; ch.doneTok=tok;
}

/* ---------- 지금 차림 적용: 게임 · 로비 · 상점 미리보기 ---------- */
let LOOK=null, lookToken=0, TRAIL=CAT.gold_p0, WARDROBE=null;
function lookFor(job){ const L=SHOP.open&&job===SHOP.job&&SHOP.try ? SHOP.try : equippedLook(job); return typeof eggDecorate==='function'?eggDecorate(L):L; }
async function applyLook(){
  TRAIL=CAT[lookFor('knight').trail]||CAT.gold_p0; LOOK=lookFor(JOB);
  if (!WORLD_READY) return; const t=++lookToken;
  usePlayer(SHOP.open?SHOP.job:JOB);
  try{
    const first=SHOP.open?SHOP.job:JOB, order=[first,...JOB_LIST.filter(j=>j!==first)];
    for (const j of order){ const L=lookFor(j);
      await dressP2(playerFor(j),L); if (typeof LOBBY!=='undefined' && LOBBY.chars[j]) await dressP2(LOBBY.chars[j],L);
      if (t!==lookToken) return; }
  }catch(e){ if (t===lookToken && !$('#shop').hidden) shopMsg('꾸미기 파일을 불러오지 못했어요. 인터넷을 확인해 주세요.','err'); }
}
function trailColor(type){
  const t=TRAIL||CAT.gold_p0;
  if (t.rainbow) return new THREE.Color().setHSL((performance.now()/700)%1,.9,.62).getHex();
  if (t.id==='gold_p0') return SLASH_TYPES[type].color;
  return t.color;
}
/* 화살 · 구슬 꼬리 색 (없으면 null) */
function projTrailColor(){ const t=CAT[(LOOK||{}).trail]; if (!t||t.none||t.slot!=='trail') return null;
  if (t.rainbow) return new THREE.Color().setHSL((performance.now()/700)%1,.9,.62).getHex(); return t.color; }
function wardRef(){ return fbDb.ref(`wardrobe/${STUDENT.cid}/${STUDENT.num}`); }
async function loadWardrobe(){
  if (!STUDENT||!fbDb){ WARDROBE=null; applyLook(); return; }
  try{ const v=(await withTimeout(wardRef().once('value'),10000)).val()||{}; WARDROBE={inv:v.inv||{},spent:+v.spent||0,equip:v.equip||{},eggs:v.eggs||{},hasSpent:v.spent!=null}; }
  catch(e){ WARDROBE={inv:{},spent:0,equip:{},eggs:{},err:true}; }
  applyLook();
  if (AUTHMODE==='student'&&PROFILE) renderProfileCard();
  if (!$('#shop').hidden) renderShop();
}

/* ---------- 상점 화면 ---------- */
const SHOP={ach:false,achSel:null,open:false,job:'knight',tab:'outfit',sel:null,armed:false,rot:0,try:null,busy:false,drag:null};
function shopMsg(t,kind){ const e=$('#shopMsg'); e.textContent=t||''; e.className='ed-status'+(kind?' '+kind:''); }
function shopSetJob(j){ SHOP.job=j; SHOP.try={...equippedLook(j)}; if (!JOB_SLOTS[j].includes(SHOP.tab)) SHOP.tab='outfit'; SHOP.sel=SHOP.try[SHOP.tab]; SHOP.armed=false; }
function openShop(){
  if (!assetsReady) return;
  if (STUDENT&&fbDb){ loadWardrobe(); profRef().once('value').then(s=>{ const v=s.val(); if (v){ PROFILE=v; if (typeof renderProfileCard==='function') renderProfileCard(); if (!$('#shop').hidden) renderShop(); } }).catch(()=>{}); }
  SHOP.open=true; SHOP.ach=false; SHOP.tab='outfit'; shopSetJob(JOB); SHOP.rot=0;
  clearWorld(); const st=MAPS[MAPK].start; P.x=st[0]; P.z=st[1];
  if (knight && knight.anim.dead){ knight.anim.revive(); } endPose=false;
  applyLook();
  $('#title').hidden=true; $('#shop').hidden=false; shopMsg(''); renderShop();
}
function closeShop(){ SHOP.open=false; SHOP.try=null; $('#shop').hidden=true; $('#title').hidden=false; applyLook(); if (AUTHMODE==='student'&&PROFILE) renderProfileCard(); }
function renderShop(){
  const coins=availCoins(), J=SHOP.job;
  $('#shopCoins').textContent=STUDENT&&PROFILE?coins.toLocaleString('ko-KR'):'-';
  $('#shopNote').textContent=STUDENT&&PROFILE?'코인은 세 직업이 함께 쓰고, 산 물건과 착용은 직업마다 따로예요. 눌러서 미리 입어 볼 수 있어요.':'연습 모드에서는 기본 아이템만 쓸 수 있어요. 코드로 로그인하면 코인으로 살 수 있어요.';
  $('#shopJobs').innerHTML=JOB_LIST.map(j=>`<button class="tab" data-sjob="${j}" aria-selected="${!SHOP.ach&&j===J}">${JOB_NAME[j]}</button>`).join('')+`<button class="tab ach-tab" data-sjob="ach" aria-selected="${!!SHOP.ach}">🏅 업적 · 칭호${achNewCount()?` <em>${achNewCount()}</em>`:''}</button>`;
  $('#shopTabs').hidden=!!SHOP.ach;
  if (SHOP.ach){ renderAchView(); return; }
  $('#shopTabs').innerHTML=JOB_SLOTS[J].map(s=>`<button class="tab" data-stab="${s}" aria-selected="${s===SHOP.tab}">${SLOT_INFO[s].icon} ${slotLabel(J,s)}</button>`).join('');
  const eq=equippedLook(J);
  $('#shopGrid').innerHTML=(SHOP.tab==='pet'&&typeof eggNestHTML==='function'?eggNestHTML():'')+CATALOG.filter(it=>it.slot===SHOP.tab&&(it.job===J||it.job==='all')&&(!it.hidden||owns(it.id))).map(it=>{
    const pr=priceOf(it.id), own=owns(it.id), on=CAT[eq[it.slot]]===it;
    const st=on?'착용 중':own?(it.ach?'🏅 업적 보상':it.egg?'🐣 부화':pr?'보유':'기본'):it.ach?'🔒 업적':it.egg?`🥚 ${eggChanceText(it.id)}`:`${pr.toLocaleString('ko-KR')} 코인`;
    const sw=it.ico?`<span class="ico">${it.ico}</span>`:it.sw?`<span class="sw" style="background:${it.sw}"></span>`:it.slot==='trail'?`<span class="sw" style="background:${it.rainbow?'linear-gradient(90deg,#ff6b6b,#ffd34d,#7be38a,#5cc8f0,#b38cff)':it.none?'repeating-linear-gradient(45deg,#ddd 0 4px,#fff 4px 8px)':'#'+it.color.toString(16).padStart(6,'0')}"></span>`:'';
    return `<button class="item${it.id===SHOP.sel?' sel':''}${on?' on':''}${own?' own':''}${it.ach?' achit':''}" data-item="${it.id}">${sw}<b>${esc(it.name)}</b><span class="pr">${st}</span></button>`; }).join('');
  const it=CAT[SHOP.sel], btn=$('#shopBuy');
  if (!it || it.slot!==SHOP.tab){ $('#shopSel').innerHTML='<small>아이템을 눌러 미리 입어 보세요.</small>'; btn.hidden=true; return; }
  btn.hidden=false;
  const pr=priceOf(it.id), own=owns(it.id), on=CAT[eq[it.slot]]===it;
  $('#shopSel').innerHTML=`<b>${esc(it.name)}</b><small>${esc(it.desc||(pr?pr.toLocaleString('ko-KR')+' 코인':'기본 아이템'))}</small>`;
  btn.disabled=SHOP.busy; btn.classList.remove('warn');
  if (on){ btn.textContent='착용 중'; btn.disabled=true; }
  else if (own) btn.textContent='착용하기';
  else if (it.egg){ btn.textContent='🥚 알을 부화시키면 무작위로 나와요'; btn.disabled=true; }
  else if (it.ach){ const A=achDef(it.ach); btn.textContent=`🔒 업적 ${A?A.icon+' '+A.title:''}을(를) 달성하면 받아요`; btn.disabled=true; }
  else if (!STUDENT||!PROFILE){ btn.textContent='로그인하면 살 수 있어요'; btn.disabled=true; }
  else if (coins<pr){ btn.textContent=`코인이 ${(pr-coins).toLocaleString('ko-KR')} 부족해요`; btn.disabled=true; }
  else if (SHOP.armed){ btn.textContent=`정말 살까요? 한 번 더 누르세요 (${pr.toLocaleString('ko-KR')} 코인)`; btn.classList.add('warn'); }
  else btn.textContent=`사기 · ${pr.toLocaleString('ko-KR')} 코인`;
}
async function shopAction(){
  const it=CAT[SHOP.sel]; if (!it||SHOP.busy) return;
  const pr=priceOf(it.id), own=owns(it.id), key=SHOP.job+'_'+it.slot;
  if (own){
    SHOP.busy=true; renderShop();
    try{
      const eid=(WARDROBE&&WARDROBE.inv&&!WARDROBE.inv[it.id]&&it.was&&WARDROBE.inv[it.was])?it.was:it.id;   // 예전 번호로 산 학생
      if (STUDENT&&WARDROBE){ await withTimeout(wardRef().child('equip/'+key).set(eid),10000); WARDROBE.equip[key]=eid; }
      else { const g=guestEquip(); g[key]=it.id; try{ localStorage.setItem('gsd-look2',JSON.stringify(g)); }catch(e){} }
      shopMsg(`${it.name}을(를) 착용했어요.`,'ok'); if (knight) knight.anim.once('cheer',1.3,true); SFX.card();
    }catch(e){ shopMsg(/permission|PERMISSION/i.test(String(e&&(e.code||e.message)))?'저장하지 못했어요. 선생님께 보안 규칙이 최신인지 알려 주세요.':'저장하지 못했어요. 잠시 뒤 다시 해 주세요.','err'); }
    SHOP.busy=false; renderShop(); return;
  }
  if (it.ach||!STUDENT||!PROFILE||availCoins()<pr) return;
  if (!SHOP.armed){ SHOP.armed=true; renderShop(); return; }
  SHOP.armed=false; SHOP.busy=true; renderShop();
  const sp=((WARDROBE&&WARDROBE.spent)|0)+pr;
  try{
    await withTimeout(wardRef().update({['inv/'+it.id]:true,spent:sp,['equip/'+key]:it.id}),10000);
    WARDROBE.inv[it.id]=true; WARDROBE.spent=sp; WARDROBE.equip[key]=it.id;
    shopMsg(`${it.name}을(를) 샀어요! 바로 착용했어요.`,'ok'); SFX.correct(); fx.rise(P.x,P.z,0xffd34d,30); if (knight) knight.anim.once('cheer',1.2,true);
  }catch(e){ shopMsg(/permission|PERMISSION/i.test(String(e&&(e.code||e.message)))?'살 수 없었어요. 선생님께 보안 규칙이 최신인지 알려 주세요.':'사지 못했어요. 인터넷을 확인하고 다시 눌러 주세요.','err'); }
  SHOP.busy=false; renderShop();
}
$('#shopBtn').addEventListener('click',openShop);
$('#shopClose').addEventListener('click',closeShop);
$('#shopJobs').addEventListener('click',e=>{ const b=e.target.closest('[data-sjob]'); if (!b) return;
  if (b.dataset.sjob==='ach'){ SHOP.ach=true; SHOP.achSel=null; shopMsg(''); renderShop(); return; } SHOP.ach=false; shopSetJob(b.dataset.sjob); shopMsg(''); applyLook(); renderShop(); });
$('#shopTabs').addEventListener('click',e=>{ const b=e.target.closest('[data-stab]'); if (!b) return; SHOP.tab=b.dataset.stab; SHOP.sel=SHOP.try[SHOP.tab]; SHOP.armed=false; renderShop(); });
$('#shopGrid').addEventListener('click',e=>{ const eb=e.target.closest('[data-egg]'); if (eb){ eggAction(eb.dataset.egg,+eb.dataset.i); return; } if (e.target.closest('.egg-nest')) return; const b=e.target.closest('[data-item]'); if (!b) return; const it=CAT[b.dataset.item];
  SHOP.sel=it.id; SHOP.armed=false; SHOP.try[it.slot]=it.id; applyLook(); shopMsg('');
  if (it.slot==='trail'){ setTimeout(()=>{ if (SHOP.open) slashFx(0); },60); }
  else if (it.slot==='pet'){ setTimeout(()=>{ if (SHOP.open && typeof petReact==='function') petReact(true); },350); }
  else if (knight) knight.anim.once('cheer',1.6,true);
  renderShop(); });
$('#shopBuy').addEventListener('click',()=>SHOP.ach?achTitleAction():shopAction());
$('#shop').addEventListener('pointerdown',e=>{ if (e.target.closest('.shop-panel')) return; SHOP.drag={x:e.clientX,r:SHOP.rot}; });
addEventListener('pointermove',e=>{ if (SHOP.drag) SHOP.rot=SHOP.drag.r+(e.clientX-SHOP.drag.x)*.012; });
addEventListener('pointerup',()=>{ SHOP.drag=null; });
addEventListener('keydown',e=>{ if (SHOP.open && e.key==='Escape') closeShop(); });
function shopCamera(real){
  if (!SHOP.open) return false;
  const narrow=innerWidth<760;
  if (narrow){ camera.position.set(P.x,2.5,P.z+6.2); camera.lookAt(P.x,.35,P.z); }
  else { camera.position.set(P.x+1.5,2.3,P.z+5.6); camera.lookAt(P.x+1.5,1.15,P.z); }
  pg.rotation.y=SHOP.rot+(SHOP.drag?0:Math.sin(real*.6)*.35);
  return true;
}
