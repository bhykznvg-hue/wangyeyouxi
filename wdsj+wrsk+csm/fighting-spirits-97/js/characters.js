// ============ characters.js : 原创角色 (体型/招式/帧数据/专属动画) ============
'use strict';
// 坐标: 世界像素, 原点=脚底, x正=面向, y负=向上

// ---------- 通用普通技生成 ----------
function mkNormals(m){
  m = m || {};
  const R = m.reach || 1, D = m.dmg || 1;
  const bx = (x, y, w, h) => ({ x: Math.round(x * R), y, w: Math.round(w * R), h });
  return {
    a:  { id:'a', anim:'a', total:14, cancel:[4,10], chain:true,
          hits:[Object.assign(bx(18,-128,48,20),{from:4,to:6,dmg:Math.round(25*D),hs:15,bs:11,stop:6,guard:'mid',kbx:2.5,spark:'hit',sfx:'hit_l',whiff:'whiff_l'})] },
    b:  { id:'b', anim:'b', total:17, cancel:[5,11],
          hits:[Object.assign(bx(20,-96,52,22),{from:5,to:8,dmg:Math.round(30*D),hs:15,bs:11,stop:6,guard:'mid',kbx:3,spark:'hit',sfx:'hit_l',whiff:'whiff_l'})] },
    c:  { id:'c', anim:'c', total:26, cancel:[7,13],
          hits:[Object.assign(bx(20,-132,58,26),{from:7,to:10,dmg:Math.round(68*D),hs:21,bs:16,stop:9,guard:'mid',kbx:5,spark:'hitB',sfx:'hit_h',whiff:'whiff_h'})],
          vel:[{from:5,to:8,vx:2}] },
    d:  { id:'d', anim:'d', total:30,
          hits:[Object.assign(bx(22,-148,60,30),{from:9,to:13,dmg:Math.round(75*D),hs:22,bs:16,stop:9,guard:'mid',kbx:5.5,spark:'hitB',sfx:'hit_h',whiff:'whiff_h'})] },
    cra:{ id:'cra', anim:'cra', total:13, cancel:[4,9], chain:true, stance:'crouch',
          hits:[Object.assign(bx(16,-92,46,20),{from:4,to:6,dmg:Math.round(22*D),hs:14,bs:10,stop:6,guard:'mid',kbx:2.5,spark:'hit',sfx:'hit_l',whiff:'whiff_l'})] },
    crb:{ id:'crb', anim:'crb', total:15, cancel:[5,10], chain:true, stance:'crouch',
          hits:[Object.assign(bx(18,-26,52,26),{from:5,to:7,dmg:Math.round(24*D),hs:14,bs:10,stop:6,guard:'low',kbx:2.5,spark:'hit',sfx:'hit_l',whiff:'whiff_l'})] },
    crc:{ id:'crc', anim:'crc', total:28, cancel:[6,13], stance:'crouch',
          hits:[Object.assign(bx(8,-160,44,66),{from:6,to:10,dmg:Math.round(70*D),hs:22,bs:16,stop:9,guard:'mid',kbx:3,kby:-4,launch:true,spark:'hitB',sfx:'hit_h',whiff:'whiff_h'})] },
    crd:{ id:'crd', anim:'crd', total:32, cancel:[8,14], stance:'crouch',
          hits:[Object.assign(bx(16,-24,66,24),{from:8,to:12,dmg:Math.round(72*D),hs:24,bs:17,stop:9,guard:'low',kbx:3,knockdown:true,spark:'hitB',sfx:'hit_h',whiff:'whiff_h'})] },
    ja: { id:'ja', anim:'ja', total:999, air:true,
          hits:[Object.assign(bx(14,-120,44,26),{from:4,to:26,dmg:Math.round(28*D),hs:16,bs:12,stop:6,guard:'high',kbx:2,spark:'hit',sfx:'hit_l',whiff:'whiff_l'})] },
    jb: { id:'jb', anim:'jb', total:999, air:true,
          hits:[Object.assign(bx(18,-90,52,30),{from:5,to:26,dmg:Math.round(32*D),hs:16,bs:12,stop:6,guard:'high',kbx:2.5,spark:'hit',sfx:'hit_l',whiff:'whiff_l'})] },
    jc: { id:'jc', anim:'jc', total:999, air:true,
          hits:[Object.assign(bx(12,-104,50,40),{from:7,to:20,dmg:Math.round(70*D),hs:22,bs:17,stop:9,guard:'high',kbx:4,spark:'hitB',sfx:'hit_h',whiff:'whiff_h'})] },
    jd: { id:'jd', anim:'jd', total:999, air:true,
          hits:[Object.assign(bx(20,-110,56,32),{from:7,to:22,dmg:Math.round(72*D),hs:22,bs:17,stop:9,guard:'high',kbx:5,spark:'hitB',sfx:'hit_h',whiff:'whiff_h'})] },
    cd: { id:'cd', anim:'cd', total:34, cancel:[13,18],
          hits:[Object.assign(bx(22,-120,62,34),{from:13,to:17,dmg:Math.round(90*D),hs:30,bs:20,stop:12,guard:'mid',kbx:9,kby:-5,knockdown:true,spark:'hitB',sfx:'hit_hh',whiff:'whiff_h'})],
          vel:[{from:10,to:14,vx:3.5}] },
  };
}
function hb(x, y, w, h, o){ return Object.assign({ x, y, w, h }, o); }

// ================================================================
const CHARS = [];

// ---------- 1. 炎堂 凯 KAI : 烈焰速攻 ----------
(() => {
const anims = {};
anims.kai_flame = A(false, [ // 236P 烈火拳
  F(P({ lean:-6, py:3, sB:-30, eB:95, sF:50, eF:100 }), 6),
  F(P({ lean:20, px:4, py:2, sB:92, eB:0, sF:26, eF:110, hF:30, kF:8, hB:-34, kB:16, fB:26, headA:6 }), 8),
  F(P({ lean:14, px:3, sB:80, eB:14 }), 8),
  F(P({ lean:4, sB:30, eB:100 }), 12),
]);
anims.kai_dp = A(false, [ // 623P 昇炎
  F(P({ py:16, lean:22, hF:50, kF:80, hB:-30, kB:70, sB:-40, eB:100, sF:30, eF:90 }), 5),
  F(P({ py:0, lean:-12, hF:60, kF:70, hB:-20, kB:30, sB:155, eB:6, sF:0, eF:80, headA:-12 }), 12),
  F(P({ py:0, lean:-4, hF:40, kF:50, hB:-10, kB:30, sB:130, eB:14 }), 10),
  F(P({ py:6, lean:8, hF:36, kF:48, hB:-20, kB:40, sB:60, eB:60 }), 14),
]);
anims.kai_wheel = A(false, [ // 214K 焔車
  F(P({ lean:14, py:8, hF:40, kF:70, hB:-24, kB:60, sF:60, eF:80, sB:40, eB:80 }), 8),
  F(P({ lean:34, py:0, hF:120, kF:10, fF:30, hB:-10, kB:80, sF:80, eF:40, sB:60, eB:40, headA:10 }), 8),
  F(P({ lean:10, py:0, hF:90, kF:10, fF:36, hB:0, kB:70, sF:60, eF:60 }), 8),
  F(P({ lean:8, py:6, hF:36, kF:50, hB:-20, kB:44 }), 12),
]);
anims.kai_spin = A(false, [ // 214P 裏拳
  F(P({ lean:-8, py:4, sF:-40, eF:60, sB:30, eB:100, headA:-10 }), 6),
  F(P({ lean:10, px:3, sF:100, eF:6, sB:-20, eB:80, headA:8 }), 6),
  F(P({ lean:16, px:4, sB:96, eB:2, sF:40, eF:80, headA:4 }), 7),
  F(P({ lean:6, sB:40, eB:90 }), 12),
]);
anims.kai_super = A(false, [ // 超必杀 烈火連斬
  F(P({ lean:-10, py:6, sF:60, eF:110, sB:-40, eB:100 }), 8),
  F(P({ lean:24, px:4, sF:92, eF:2, sB:20, eB:100, hF:34, kF:10, hB:-30, kB:20 }), 5),
  F(P({ lean:24, px:4, sB:92, eB:2, sF:20, eF:100, hF:34, kF:10, hB:-30, kB:20 }), 5),
  F(P({ lean:22, px:4, sF:96, eF:0, sB:30, eB:90 }), 5),
  F(P({ lean:22, px:4, sB:96, eB:0, sF:30, eF:90 }), 5),
  F(P({ py:8, lean:26, hF:50, kF:80, hB:-30, kB:70, sB:-50, eB:110, sF:40, eF:90 }), 6),
  F(P({ py:0, lean:-14, hF:60, kF:70, hB:-20, kB:30, sB:158, eB:4, sF:0, eF:80, headA:-14 }), 14),
  F(P({ py:6, lean:8, hF:36, kF:48, hB:-20, kB:40, sB:60, eB:60 }), 20),
]);
const N = mkNormals({ reach: 1.0, dmg: 1.0 });
CHARS.push({
  id:'kai', name:'炎堂 凯', ename:'KAI', title:'苍炎の拳', themeColor:'#e04818',
  body: { skin:'#eab887', hair:{style:'spiky', color:'#5a3820'}, top:{type:'jacket', color:'#20386e', sleeve:'#20386e', trim:'#e8e8e8'},
          pants:{color:'#2a2a34', style:'slim'}, shoes:'#c8c0b0', gloves:'#b03020', belt:'#803030', emblem:'#ff7a20', torsoW:9, armW:5, legW:6 },
  alt: { top:{type:'jacket', color:'#6e2020', sleeve:'#6e2020', trim:'#e8d8a0'}, pants:{color:'#342a2a', style:'slim'}, gloves:'#203080' },
  stats:{ hp:1000, walkF:2.4, walkB:1.9, run:5.4, jumpVX:3.4, jumpVY:-12.4, gravity:0.72 },
  aiStyle:'rush', shout:'shout_m',
  normals: N, anims,
  specials: [
    { id:'kai_flame_c', name:'烈火拳·重', motion:'236', btn:'c', move:{ id:'kai_flame_c', anim:'kai_flame', total:34, cost:0,
        hits:[hb(26,-136,72,44,{from:14,to:19,dmg:88,hs:28,bs:20,stop:12,guard:'mid',kbx:7,kby:-4.5,knockdown:true,spark:'fire',sfx:'fire_hit',whiff:'fireball',chip:true})],
        vel:[{from:6,to:13,vx:4.5}], sfxStart:'fireball' } },
    { id:'kai_flame_a', name:'烈火拳·轻', motion:'236', btn:'a', move:{ id:'kai_flame_a', anim:'kai_flame', total:30, cost:0,
        hits:[hb(24,-134,64,40,{from:10,to:15,dmg:65,hs:24,bs:18,stop:10,guard:'mid',kbx:6,spark:'fire',sfx:'fire_hit',whiff:'fireball',chip:true})],
        vel:[{from:4,to:9,vx:3.5}], sfxStart:'fireball' } },
    { id:'kai_dp_c', name:'昇炎·重', motion:'623', btn:'c', move:{ id:'kai_dp_c', anim:'kai_dp', total:52, cost:0,
        hits:[hb(10,-150,52,70,{from:6,to:9,dmg:70,hs:24,bs:18,stop:10,guard:'mid',kbx:3,kby:-9,launch:true,knockdown:true,spark:'fire',sfx:'fire_hit',whiff:'whiff_h',chip:true}),
              hb(10,-170,50,80,{from:10,to:18,dmg:45,hs:24,bs:14,stop:8,guard:'mid',kbx:3,kby:-8,launch:true,knockdown:true,spark:'fire',sfx:'fire_hit',chip:true})],
        vel:[{from:6,to:16,vx:2.2,vy:-8.5}], gravityFrom:17, landLag:16, inv:[{from:1,to:9,type:'full'}], sfxStart:'charge' } },
    { id:'kai_dp_a', name:'昇炎·轻', motion:'623', btn:'a', move:{ id:'kai_dp_a', anim:'kai_dp', total:42, cost:0,
        hits:[hb(10,-150,50,66,{from:5,to:12,dmg:70,hs:24,bs:16,stop:10,guard:'mid',kbx:3,kby:-7.5,launch:true,knockdown:true,spark:'fire',sfx:'fire_hit',whiff:'whiff_h',chip:true})],
        vel:[{from:5,to:12,vx:1.4,vy:-6.5}], gravityFrom:13, landLag:12, inv:[{from:1,to:6,type:'upper'}], sfxStart:'charge' } },
    { id:'kai_wheel_d', name:'焔車·重', motion:'214', btn:'d', move:{ id:'kai_wheel_d', anim:'kai_wheel', total:44, cost:0,
        hits:[hb(14,-130,58,60,{from:14,to:22,dmg:80,hs:26,bs:18,stop:10,guard:'high',kbx:5,knockdown:true,spark:'fire',sfx:'fire_hit',whiff:'whiff_h',chip:true})],
        vel:[{from:6,to:20,vx:4.6,vy:-3.2}], gravityFrom:14, landLag:10, sfxStart:'whiff_h' } },
    { id:'kai_wheel_b', name:'焔車·轻', motion:'214', btn:'b', move:{ id:'kai_wheel_b', anim:'kai_wheel', total:38, cost:0,
        hits:[hb(12,-124,54,56,{from:11,to:18,dmg:60,hs:24,bs:16,stop:9,guard:'high',kbx:4,knockdown:true,spark:'fire',sfx:'fire_hit',whiff:'whiff_h',chip:true})],
        vel:[{from:5,to:16,vx:3.6,vy:-2.4}], gravityFrom:12, landLag:8, sfxStart:'whiff_l' } },
    { id:'kai_spin', name:'裏拳·炎打', motion:'214', btn:'a', alsoBtn:'c', move:{ id:'kai_spin', anim:'kai_spin', total:31, cost:0,
        hits:[hb(20,-126,54,30,{from:7,to:10,dmg:45,hs:20,bs:14,stop:8,guard:'mid',kbx:2,spark:'fire',sfx:'hit_h',whiff:'whiff_h',chip:true}),
              hb(24,-130,60,34,{from:13,to:17,dmg:55,hs:24,bs:16,stop:10,guard:'mid',kbx:6,spark:'fire',sfx:'fire_hit',chip:true})],
        vel:[{from:4,to:14,vx:3}], sfxStart:'whiff_h' } },
  ],
  supers: [
    { id:'kai_super', name:'烈火連斬', motion:'236236', btn:'a', alsoBtn:'c', cost:1000,
      move:{ id:'kai_super', anim:'kai_super', total:76, cost:1000, freeze:42, superFlash:true,
        hits:[hb(22,-130,60,40,{from:10,to:13,dmg:40,hs:22,bs:14,stop:7,guard:'mid',kbx:1,spark:'fire',sfx:'fire_hit',whiff:'whiff_h',chip:true}),
              hb(24,-130,62,40,{from:15,to:18,dmg:40,hs:22,bs:14,stop:7,guard:'mid',kbx:1,spark:'fire',sfx:'hit_h',chip:true}),
              hb(24,-132,62,42,{from:20,to:23,dmg:40,hs:22,bs:14,stop:7,guard:'mid',kbx:1,spark:'fire',sfx:'fire_hit',chip:true}),
              hb(26,-132,64,42,{from:25,to:28,dmg:40,hs:22,bs:14,stop:7,guard:'mid',kbx:1,spark:'fire',sfx:'hit_h',chip:true}),
              hb(14,-160,56,84,{from:34,to:44,dmg:90,hs:30,bs:18,stop:14,guard:'mid',kbx:5,kby:-10,launch:true,knockdown:true,hard:true,spark:'fireB',sfx:'superHit',chip:true})],
        vel:[{from:6,to:28,vx:5},{from:34,to:42,vx:1.5,vy:-7}], gravityFrom:43, landLag:18,
        inv:[{from:1,to:12,type:'full'}], afterimage:[4,44] } },
    { id:'kai_super_max', name:'MAX烈火連斬', motion:'236236', btn:'c', max:true, cost:1000,
      move:{ id:'kai_super_max', anim:'kai_super', total:86, cost:1000, freeze:48, superFlash:true, maxSuper:true,
        hits:[hb(22,-130,64,44,{from:8,to:11,dmg:42,hs:22,bs:14,stop:7,guard:'mid',kbx:1,spark:'fire',sfx:'fire_hit',whiff:'whiff_h',chip:true}),
              hb(24,-130,64,44,{from:13,to:16,dmg:42,hs:22,bs:14,stop:7,guard:'mid',kbx:1,spark:'fire',sfx:'hit_h',chip:true}),
              hb(24,-132,66,44,{from:18,to:21,dmg:42,hs:22,bs:14,stop:7,guard:'mid',kbx:1,spark:'fire',sfx:'fire_hit',chip:true}),
              hb(26,-132,66,44,{from:23,to:26,dmg:42,hs:22,bs:14,stop:7,guard:'mid',kbx:1,spark:'fire',sfx:'hit_h',chip:true}),
              hb(26,-134,68,46,{from:28,to:31,dmg:42,hs:22,bs:14,stop:7,guard:'mid',kbx:1,spark:'fire',sfx:'fire_hit',chip:true}),
              hb(14,-164,60,90,{from:38,to:50,dmg:130,hs:30,bs:18,stop:16,guard:'mid',kbx:6,kby:-11,launch:true,knockdown:true,hard:true,spark:'fireB',sfx:'explode',chip:true})],
        vel:[{from:5,to:31,vx:5.5},{from:38,to:46,vx:1.5,vy:-8}], gravityFrom:47, landLag:18,
        inv:[{from:1,to:14,type:'full'}], afterimage:[4,50] } },
  ],
  movelist: [
    ['烈火拳', '↓↘→ + 拳'], ['昇炎', '→↓↘ + 拳'], ['焔車', '↓↙← + 脚'], ['裏拳·炎打', '↓↙← + 拳'],
    ['超·烈火連斬', '↓↘→↓↘→ + 拳'], ['MAX版(爆气/残血)', '↓↘→↓↘→ + 重拳'],
  ],
  winQuote: '燃烧殆尽吧!',
});
})();

// ---------- 2. 月城 莲 REN : 冥火裂爪 ----------
(() => {
const anims = {};
anims.idle = A(true, [
  F(P({ lean:12, py:4, sF:30, eF:70, sB:14, eB:60, handF:'open', handB:'open', headA:-6 }), 16),
  F(P({ lean:14, py:5, sF:33, eF:66, sB:16, eB:56, handF:'open', handB:'open', headA:-6, headY:1 }), 16),
  F(P({ lean:13, py:4, sF:31, eF:70, sB:15, eB:60, handF:'open', handB:'open', headA:-5 }), 16),
]);
anims.ren_wave = A(false, [ // 214P 冥火波
  F(P({ lean:-6, py:4, sF:70, eF:100, sB:60, eB:110, handF:'open', handB:'open' }), 9),
  F(P({ lean:22, py:8, sF:60, eF:10, sB:50, eB:20, handF:'open', handB:'open', hF:30, kF:30, hB:-26, kB:30 }), 10),
  F(P({ lean:14, py:6, sF:40, eF:30, handF:'open' }), 18),
]);
anims.ren_claw = A(false, [ // 623P 裂爪
  F(P({ py:14, lean:24, hF:50, kF:80, hB:-30, kB:70, sF:-30, eF:60, sB:-40, eB:70, handF:'open', handB:'open' }), 5),
  F(P({ py:0, lean:-16, hF:56, kF:66, hB:-16, kB:30, sF:150, eF:10, sB:120, eB:20, handF:'open', handB:'open', headA:-10 }), 12),
  F(P({ py:0, lean:-6, hF:40, kF:50, sF:120, eF:20, handF:'open' }), 10),
  F(P({ py:6, lean:10, hF:36, kF:48, hB:-20, kB:40, sF:50, eF:60 }), 16),
]);
anims.ren_rekka = A(false, [ // 236P 連牙(每段)
  F(P({ lean:6, py:3, sF:-20, eF:70, handF:'open', handB:'open' }), 5),
  F(P({ lean:22, px:4, sF:92, eF:4, sB:10, eB:90, handF:'open', headA:6, hF:32, kF:8, hB:-30, kB:18 }), 6),
  F(P({ lean:14, px:2, sF:70, eF:20, handF:'open' }), 6),
  F(P({ lean:8, sF:40, eF:70 }), 10),
]);
anims.ren_rekka3 = A(false, [ // 第三段 上挑
  F(P({ lean:10, py:6, sF:-30, eF:50, sB:-20, eB:60, handF:'open', handB:'open' }), 5),
  F(P({ lean:-14, py:2, sF:140, eF:10, sB:110, eB:20, handF:'open', handB:'open', headA:-10, hF:30, kF:30 }), 8),
  F(P({ lean:-4, sF:110, eF:20, handF:'open' }), 8),
  F(P({ lean:6, sF:40, eF:70 }), 14),
]);
anims.ren_shadow = A(false, [ // 63214K 影縫
  F(P({ lean:20, py:8, hF:40, kF:60, hB:-30, kB:50, sF:30, eF:90, handF:'open', handB:'open' }), 6),
  F(P({ lean:34, py:4, hF:60, kF:30, hB:-40, kB:60, sF:60, eF:40, sB:40, eB:40, handF:'open', handB:'open', headA:10 }), 12),
  F(P({ lean:-8, py:2, sF:110, eF:10, sB:20, eB:60, handF:'open', headA:-8 }), 8),
  F(P({ lean:6, py:4 }), 14),
]);
anims.ren_super = A(false, [ // 冥界葬送
  F(P({ lean:-12, py:6, sF:80, eF:100, sB:70, eB:110, handF:'open', handB:'open', headA:-8 }), 10),
  F(P({ lean:28, px:4, py:4, sF:80, eF:10, sB:70, eB:20, handF:'open', handB:'open', hF:36, kF:10, hB:-30, kB:20 }), 14),
  F(P({ lean:-20, py:2, sF:160, eF:6, sB:150, eB:10, handF:'open', handB:'open', headA:-16 }), 24),
  F(P({ lean:8, py:4, sF:40, eF:70, handF:'open' }), 22),
]);
anims.win = A(false, [
  F(P({ lean:10, py:4, sF:30, eF:70, handF:'open', handB:'open' }), 20),
  F(P({ lean:-4, py:2, sF:60, eF:130, sB:-14, eB:30, handF:'open', handB:'open', headA:-10, headX:-1 }), 999),
]);
const N = mkNormals({ reach: 1.06, dmg: 1.0 });
N.c.hits[0].spark = 'slash'; N.d.hits[0].spark = 'slash';
CHARS.push({
  id:'ren', name:'月城 莲', ename:'REN', title:'冥月の爪', themeColor:'#8030c0',
  body: { skin:'#e8cfae', hair:{style:'wild', color:'#d8d8e2'}, top:{type:'coat', color:'#581828', coat:'#581828', sleeve:'#581828', trim:'#c0c0cc'},
          pants:{color:'#26202c', style:'slim'}, shoes:'#3a3040', belt:'#802040', torsoW:8.6, armW:4.8, legW:5.6 },
  alt: { top:{type:'coat', color:'#203050', coat:'#203050', sleeve:'#203050', trim:'#c0c0cc'}, hair:{style:'wild', color:'#c04040'} },
  stats:{ hp:980, walkF:2.3, walkB:1.9, run:5.6, jumpVX:3.5, jumpVY:-12.6, gravity:0.74 },
  aiStyle:'tricky', shout:'shout_m',
  normals: N, anims,
  specials: [
    { id:'ren_wave', name:'冥火波', motion:'214', btn:'a', alsoBtn:'c', move:{ id:'ren_wave', anim:'ren_wave', total:37, cost:0,
        proj:[{frame:11, type:'groundflame', x:40, y:0, vx:4.2, dmg:62, hs:26, bs:18, guard:'low', kbx:4, kby:-5, launch:true, knockdown:true, spark:'fireP', sfx:'fire_hit', life:130, w:44, h:40}],
        hits:[], sfxStart:'fireball' } },
    { id:'ren_claw', name:'裂爪', motion:'623', btn:'a', alsoBtn:'c', move:{ id:'ren_claw', anim:'ren_claw', total:43, cost:0,
        hits:[hb(12,-150,50,64,{from:6,to:10,dmg:60,hs:24,bs:16,stop:10,guard:'mid',kbx:3,kby:-8,launch:true,knockdown:true,spark:'slash',sfx:'slash',whiff:'whiff_h',chip:true}),
              hb(12,-170,48,76,{from:11,to:17,dmg:50,hs:24,bs:14,stop:8,guard:'mid',kbx:3,kby:-7,launch:true,knockdown:true,spark:'fireP',sfx:'fire_hit',chip:true})],
        vel:[{from:6,to:14,vx:1.8,vy:-7.6}], gravityFrom:15, landLag:14, inv:[{from:1,to:7,type:'upper'}], sfxStart:'charge' } },
    { id:'ren_rekka1', name:'連牙·壱', motion:'236', btn:'a', alsoBtn:'c', move:{ id:'ren_rekka1', anim:'ren_rekka', total:27, cost:0,
        hits:[hb(20,-128,56,32,{from:8,to:11,dmg:45,hs:22,bs:15,stop:9,guard:'mid',kbx:2,spark:'slash',sfx:'slash',whiff:'whiff_h',chip:true})],
        vel:[{from:4,to:10,vx:4}], next:{ motion:'236', btns:['a','c'], move:'ren_rekka2', window:[10,26] }, sfxStart:'whiff_h' } },
    { id:'ren_shadow', name:'影縫', motion:'63214', btn:'b', alsoBtn:'d', move:{ id:'ren_shadow', anim:'ren_shadow', total:40, cost:0,
        hits:[hb(6,-140,50,50,{from:20,to:26,dmg:75,hs:26,bs:18,stop:11,guard:'mid',kbx:5,kby:-6,launch:true,knockdown:true,spark:'slash',sfx:'slash',whiff:'whiff_h',chip:true})],
        vel:[{from:6,to:18,vx:7.5}], inv:[{from:6,to:16,type:'full'}], passThrough:[6,18], afterimage:[4,26], sfxStart:'dash' } },
  ],
  extraMoves: {
    ren_rekka2: { id:'ren_rekka2', anim:'ren_rekka', total:27, cost:0,
      hits:[hb(20,-128,58,32,{from:8,to:11,dmg:42,hs:22,bs:15,stop:9,guard:'mid',kbx:2,spark:'slash',sfx:'slash',whiff:'whiff_h',chip:true})],
      vel:[{from:4,to:10,vx:4}], next:{ motion:'236', btns:['a','c'], move:'ren_rekka3', window:[10,26] }, sfxStart:'whiff_h' },
    ren_rekka3: { id:'ren_rekka3', anim:'ren_rekka3', total:35, cost:0,
      hits:[hb(14,-156,54,70,{from:7,to:13,dmg:58,hs:26,bs:16,stop:11,guard:'mid',kbx:4,kby:-8.5,launch:true,knockdown:true,spark:'fireP',sfx:'fire_hit',whiff:'whiff_h',chip:true})],
      vel:[{from:4,to:9,vx:2.5}], sfxStart:'fireball' },
  },
  supers: [
    { id:'ren_super', name:'冥界葬送', motion:'2141236', btn:'a', alsoBtn:'c', cost:1000,
      move:{ id:'ren_super', anim:'ren_super', total:70, cost:1000, freeze:42, superFlash:true,
        hits:[hb(20,-130,58,44,{from:14,to:24,dmg:60,hs:30,bs:18,stop:14,guard:'mid',kbx:0.5,spark:'fireP',sfx:'fire_hit',whiff:'whiff_h',chip:true}),
              hb(0,-190,74,190,{from:30,to:44,dmg:180,hs:34,bs:20,stop:16,guard:'mid',kbx:6,kby:-11,launch:true,knockdown:true,hard:true,spark:'fireP',sfx:'explode',chip:true})],
        vel:[{from:6,to:22,vx:5.5}], inv:[{from:1,to:14,type:'full'}], afterimage:[4,30],
        onFrame: { 30:'pillarFx' } } },
    { id:'ren_super_max', name:'MAX冥界葬送', motion:'2141236', btn:'c', max:true, cost:1000,
      move:{ id:'ren_super_max', anim:'ren_super', total:82, cost:1000, freeze:48, superFlash:true, maxSuper:true,
        hits:[hb(20,-130,60,46,{from:12,to:24,dmg:70,hs:30,bs:18,stop:14,guard:'mid',kbx:0.5,spark:'fireP',sfx:'fire_hit',whiff:'whiff_h',chip:true}),
              hb(0,-190,80,190,{from:30,to:40,dmg:110,hs:30,bs:18,stop:12,guard:'mid',kbx:0.5,kby:-2,spark:'fireP',sfx:'fire_hit',chip:true}),
              hb(0,-200,86,200,{from:44,to:58,dmg:150,hs:34,bs:20,stop:16,guard:'mid',kbx:7,kby:-12,launch:true,knockdown:true,hard:true,spark:'fireP',sfx:'explode',chip:true})],
        vel:[{from:6,to:22,vx:6}], inv:[{from:1,to:16,type:'full'}], afterimage:[4,40],
        onFrame: { 30:'pillarFx', 44:'pillarFx' } } },
  ],
  movelist: [
    ['冥火波', '↓↙← + 拳'], ['裂爪', '→↓↘ + 拳'], ['連牙(可三連)', '↓↘→ + 拳 ×3'], ['影縫', '→↘↓↙← + 脚'],
    ['超·冥界葬送', '↓↙←↙↓↘→ + 拳'], ['MAX版(爆气/残血)', '同指令 + 重拳'],
  ],
  winQuote: '月已沉,你也该落幕了。',
});
})();

// ---------- 3. 疾风 美嘉 MIKA : 疾影忍舞 ----------
(() => {
const anims = {};
anims.idle = A(true, [
  F(P({ lean:16, py:8, hF:30, kF:26, hB:-30, kB:24, sF:60, eF:60, sB:10, eB:100, handF:'open', headA:-8 }), 14),
  F(P({ lean:17, py:9, hF:31, kF:27, hB:-30, kB:25, sF:63, eF:56, sB:12, eB:96, handF:'open', headA:-8, headY:1 }), 14),
  F(P({ lean:16, py:8, hF:30, kF:26, hB:-29, kB:24, sF:61, eF:59, sB:11, eB:99, handF:'open', headA:-7 }), 14),
]);
anims.mika_kunai = A(false, [ // 236P 手裏剣
  F(P({ lean:0, py:4, sF:-40, eF:80, sB:40, eB:90, handF:'chop' }), 7),
  F(P({ lean:18, px:2, sF:95, eF:2, sB:20, eB:100, handF:'chop', headA:6 }), 6),
  F(P({ lean:10, sF:70, eF:20 }), 6),
  F(P({ lean:6 }), 9),
]);
anims.c = A(false, [ // 重拳: 突进肘击(忍者风)
  F(P({ lean:-2, py:6, sB:-35, eB:90, sF:50, eF:80, handF:'open', headA:-4 }), 6),
  F(P({ lean:22, px:6, py:3, sB:95, eB:0, sF:16, eF:100, headA:8, hF:34, kF:8, hB:-34, kB:18, fB:26 }), 5),
  F(P({ lean:14, px:4, sB:76, eB:18 }), 5),
  F(P({ lean:6, sB:30, eB:92, handF:'open' }), 10),
]);
anims.mika_spiral = A(false, [ // 623K 旋風脚
  F(P({ py:14, lean:14, hF:46, kF:76, hB:-30, kB:66, sF:40, eF:80, sB:30, eB:80 }), 5),
  F(P({ py:0, lean:-14, hF:110, kF:6, fF:36, hB:0, kB:70, sF:60, eF:60, sB:70, eB:50, headA:-8 }), 8),
  F(P({ py:0, lean:-20, hF:60, kF:60, hB:100, kB:10, fB:36, sF:70, eF:50, sB:60, eB:60, headA:-10 }), 8),
  F(P({ py:0, lean:-8, hF:50, kF:56, hB:-8, kB:36 }), 8),
  F(P({ py:6, lean:8, hF:36, kF:48, hB:-20, kB:40 }), 14),
]);
anims.mika_tele = A(false, [ // 214K 幻影行
  F(P({ lean:24, py:10, hF:40, kF:60, hB:-30, kB:56, sF:60, eF:90, sB:50, eB:90, handF:'chop', handB:'chop' }), 6),
  F(P({ lean:40, py:6, hF:60, kF:40, hB:-40, kB:70, sF:80, eF:30, sB:60, eB:40, headA:12 }), 12),
  F(P({ lean:10, py:4, hF:30, kF:30, hB:-24, kB:26 }), 10),
]);
anims.mika_swallow = A(false, [ // 41236K 飛燕
  F(P({ py:12, lean:20, hF:44, kF:70, hB:-28, kB:60, sF:50, eF:80 }), 7),
  F(P({ py:0, lean:30, hF:90, kF:4, fF:40, hB:20, kB:90, sF:70, eF:40, sB:50, eB:60, headA:10 }), 999),
]);
anims.mika_super = A(false, [ // 飛燕乱舞
  F(P({ lean:24, py:10, hF:40, kF:60, hB:-30, kB:56, sF:60, eF:90, sB:50, eB:90, handF:'chop', handB:'chop' }), 10),
  F(P({ lean:30, px:4, sF:95, eF:0, sB:20, eB:90, handF:'chop', hF:36, kF:10, hB:-30, kB:20 }), 5),
  F(P({ lean:-10, px:2, hF:100, kF:4, fF:36, hB:10, kB:80, sF:50, eF:60, headA:-8 }), 5),
  F(P({ lean:26, px:4, sB:95, eB:0, sF:20, eF:90, handB:'chop' }), 5),
  F(P({ lean:-14, px:2, hB:104, kB:4, fB:36, hF:16, kF:80, sF:60, eF:50, headA:-10 }), 5),
  F(P({ py:0, lean:-20, hF:110, kF:6, fF:40, hB:6, kB:76, sF:70, eF:40, headA:-12 }), 14),
  F(P({ py:6, lean:10, hF:36, kF:48, hB:-20, kB:40 }), 20),
]);
anims.win = A(false, [
  F(P({ lean:10, py:6, sF:50, eF:80, handF:'chop' }), 18),
  F(P({ lean:-4, py:2, sF:150, eF:20, sB:20, eB:100, handF:'chop', headA:-6, hF:20, kF:60 }), 999),
]);
const N = mkNormals({ reach: 0.94, dmg: 0.92 });
CHARS.push({
  id:'mika', name:'疾风 美嘉', ename:'MIKA', title:'绯之疾影', themeColor:'#d02858',
  body: { skin:'#f0d0b0', female:true, hair:{style:'pony', color:'#68283a'}, top:{type:'tank', color:'#b02040', sleeve:null, sleeveShort:false},
          pants:{color:'#302838', style:'slim'}, shoes:'#c04858', gloves:'#803048', belt:'#e0c060', scarf:'#c83040', torsoW:7.6, armW:4.2, legW:5, fistR:3.4, headR:6.6 },
  alt: { top:{type:'tank', color:'#207050'}, hair:{style:'pony', color:'#204a68'}, scarf:'#3080c0', shoes:'#3a8a70' },
  stats:{ hp:900, walkF:2.7, walkB:2.2, run:6.2, jumpVX:3.9, jumpVY:-13.2, gravity:0.78 },
  aiStyle:'tricky', shout:'shout_f',
  normals: N, anims,
  specials: [
    { id:'mika_kunai', name:'绯燕手裏剣', motion:'236', btn:'a', alsoBtn:'c', move:{ id:'mika_kunai', anim:'mika_kunai', total:28, cost:0,
        proj:[{frame:9, type:'kunai', x:44, y:-120, vx:9.5, dmg:50, hs:20, bs:14, guard:'mid', kbx:3, spark:'slash', sfx:'slash', life:90, w:30, h:12}],
        hits:[], sfxStart:'whiff_l' } },
    { id:'mika_spiral_d', name:'旋風脚·重', motion:'623', btn:'d', move:{ id:'mika_spiral_d', anim:'mika_spiral', total:43, cost:0,
        hits:[hb(10,-140,50,56,{from:6,to:10,dmg:50,hs:22,bs:15,stop:9,guard:'mid',kbx:2,kby:-8,launch:true,knockdown:true,spark:'hitB',sfx:'hit_h',whiff:'whiff_h',chip:true}),
              hb(12,-160,52,70,{from:11,to:20,dmg:48,hs:22,bs:14,stop:8,guard:'mid',kbx:3,kby:-7.5,launch:true,knockdown:true,spark:'hitB',sfx:'hit_h',chip:true})],
        vel:[{from:6,to:18,vx:2.4,vy:-8}], gravityFrom:19, landLag:14, inv:[{from:1,to:7,type:'upper'}], sfxStart:'whiff_h' } },
    { id:'mika_spiral_b', name:'旋風脚·轻', motion:'623', btn:'b', move:{ id:'mika_spiral_b', anim:'mika_spiral', total:37, cost:0,
        hits:[hb(10,-140,48,58,{from:5,to:13,dmg:60,hs:22,bs:15,stop:9,guard:'mid',kbx:2.5,kby:-7,launch:true,knockdown:true,spark:'hitB',sfx:'hit_h',whiff:'whiff_h',chip:true})],
        vel:[{from:5,to:12,vx:1.6,vy:-6.4}], gravityFrom:13, landLag:11, sfxStart:'whiff_l' } },
    { id:'mika_tele_d', name:'幻影行·远', motion:'214', btn:'d', move:{ id:'mika_tele_d', anim:'mika_tele', total:28, cost:0, hits:[],
        vel:[{from:5,to:17,vx:11}], inv:[{from:3,to:19,type:'full'}], passThrough:[3,19], afterimage:[3,20], sfxStart:'dash' } },
    { id:'mika_tele_b', name:'幻影行·近', motion:'214', btn:'b', move:{ id:'mika_tele_b', anim:'mika_tele', total:24, cost:0, hits:[],
        vel:[{from:4,to:13,vx:9}], inv:[{from:3,to:14,type:'full'}], passThrough:[3,14], afterimage:[3,16], sfxStart:'dash' } },
    { id:'mika_swallow', name:'飛燕', motion:'41236', btn:'b', alsoBtn:'d', move:{ id:'mika_swallow', anim:'mika_swallow', total:60, cost:0,
        hits:[hb(16,-100,56,50,{from:10,to:34,dmg:70,hs:24,bs:17,stop:10,guard:'high',kbx:5,kby:-4,knockdown:true,spark:'hitB',sfx:'hit_h',whiff:'whiff_h',chip:true})],
        vel:[{from:8,to:30,vx:6,vy:-4.5}], gravityFrom:20, landLag:12, sfxStart:'jump' } },
  ],
  supers: [
    { id:'mika_super', name:'飛燕乱舞', motion:'236236', btn:'b', alsoBtn:'d', cost:1000,
      move:{ id:'mika_super', anim:'mika_super', total:64, cost:1000, freeze:42, superFlash:true,
        hits:[hb(20,-124,58,36,{from:11,to:14,dmg:38,hs:22,bs:14,stop:7,guard:'mid',kbx:0.5,spark:'slash',sfx:'slash',whiff:'whiff_h',chip:true}),
              hb(20,-110,58,40,{from:16,to:19,dmg:38,hs:22,bs:14,stop:7,guard:'mid',kbx:0.5,spark:'hit',sfx:'hit_h',chip:true}),
              hb(20,-124,58,36,{from:21,to:24,dmg:38,hs:22,bs:14,stop:7,guard:'mid',kbx:0.5,spark:'slash',sfx:'slash',chip:true}),
              hb(20,-110,58,40,{from:26,to:29,dmg:38,hs:22,bs:14,stop:7,guard:'mid',kbx:0.5,spark:'hit',sfx:'hit_h',chip:true}),
              hb(16,-150,56,76,{from:31,to:40,dmg:80,hs:30,bs:18,stop:14,guard:'mid',kbx:6,kby:-10,launch:true,knockdown:true,hard:true,spark:'slashB',sfx:'superHit',chip:true})],
        vel:[{from:6,to:30,vx:6},{from:31,to:38,vx:2,vy:-6}], gravityFrom:39, landLag:14,
        inv:[{from:1,to:12,type:'full'}], afterimage:[4,40] } },
    { id:'mika_super_max', name:'MAX飛燕乱舞', motion:'236236', btn:'d', max:true, cost:1000,
      move:{ id:'mika_super_max', anim:'mika_super', total:76, cost:1000, freeze:48, superFlash:true, maxSuper:true,
        hits:[hb(20,-124,60,38,{from:9,to:12,dmg:40,hs:22,bs:14,stop:7,guard:'mid',kbx:0.5,spark:'slash',sfx:'slash',whiff:'whiff_h',chip:true}),
              hb(20,-110,60,40,{from:14,to:17,dmg:40,hs:22,bs:14,stop:7,guard:'mid',kbx:0.5,spark:'hit',sfx:'hit_h',chip:true}),
              hb(20,-124,60,38,{from:19,to:22,dmg:40,hs:22,bs:14,stop:7,guard:'mid',kbx:0.5,spark:'slash',sfx:'slash',chip:true}),
              hb(20,-110,60,40,{from:24,to:27,dmg:40,hs:22,bs:14,stop:7,guard:'mid',kbx:0.5,spark:'hit',sfx:'hit_h',chip:true}),
              hb(20,-124,60,38,{from:29,to:32,dmg:40,hs:22,bs:14,stop:7,guard:'mid',kbx:0.5,spark:'slash',sfx:'slash',chip:true}),
              hb(16,-154,60,80,{from:36,to:46,dmg:110,hs:30,bs:18,stop:16,guard:'mid',kbx:7,kby:-11,launch:true,knockdown:true,hard:true,spark:'slashB',sfx:'explode',chip:true})],
        vel:[{from:5,to:33,vx:6.5},{from:36,to:44,vx:2,vy:-7}], gravityFrom:45, landLag:14,
        inv:[{from:1,to:14,type:'full'}], afterimage:[3,46] } },
  ],
  movelist: [
    ['绯燕手裏剣', '↓↘→ + 拳'], ['旋風脚', '→↓↘ + 脚'], ['幻影行(穿身)', '↓↙← + 脚'], ['飛燕', '←↙↓↘→ + 脚'],
    ['超·飛燕乱舞', '↓↘→↓↘→ + 脚'], ['MAX版(爆气/残血)', '同指令 + 重脚'],
  ],
  winQuote: '太慢了,连残影都碰不到。',
});
})();

// ---------- 4. 铁牛 BULL : 钢铁投掷 ----------
(() => {
const anims = {};
anims.idle = A(true, [
  F(P({ lean:6, py:4, hF:22, kF:14, hB:-24, kB:12, sF:30, eF:70, sB:20, eB:70, handF:'open', handB:'open' }), 16),
  F(P({ lean:7, py:5, hF:22, kF:15, hB:-24, kB:13, sF:33, eF:64, sB:23, eB:64, handF:'open', handB:'open', headY:1 }), 16),
  F(P({ lean:6, py:4, hF:22, kF:14, hB:-24, kB:12, sF:31, eF:68, sB:21, eB:68, handF:'open', handB:'open' }), 16),
]);
anims.bull_grab = A(false, [ // 63214P 岩石炸弹
  F(P({ lean:16, px:2, py:4, sF:70, eF:20, sB:60, eB:30, handF:'open', handB:'open' }), 10),
  F(P({ lean:-10, py:0, sF:150, eF:10, sB:140, eB:16, handF:'open', handB:'open', hF:20, kF:10, hB:-24, kB:12 }), 14),
  F(P({ lean:36, py:10, sF:10, eF:20, sB:0, eB:20, hF:40, kF:50, hB:-26, kB:44 }), 14),
  F(P({ lean:8, py:4 }), 16),
]);
anims.bull_run = A(false, [ // 41236K 突进抓
  F(P({ lean:26, py:6, hF:46, kF:24, hB:-34, kB:46, sF:60, eF:40, sB:40, eB:50, handF:'open', handB:'open' }), 10),
  F(P({ lean:30, py:6, hF:-30, kF:46, hB:44, kB:18, sF:70, eF:30, sB:50, eB:40, handF:'open', handB:'open' }), 10),
  F(P({ lean:26, py:6, hF:46, kF:24, hB:-34, kB:46, sF:76, eF:24, sB:56, eB:36, handF:'open', handB:'open' }), 999),
]);
anims.bull_head = A(false, [ // 623P 火牛升击
  F(P({ py:16, lean:30, hF:50, kF:80, hB:-30, kB:70, sF:20, eF:60, sB:10, eB:60 }), 8),
  F(P({ py:0, lean:-22, hF:56, kF:60, hB:-16, kB:30, sF:120, eF:30, sB:110, eB:36, headA:-20 }), 14),
  F(P({ py:0, lean:-8, hF:44, kF:50, sF:90, eF:40 }), 10),
  F(P({ py:8, lean:10, hF:36, kF:48, hB:-20, kB:40 }), 18),
]);
anims.bull_lariat = A(false, [ // 214P 钢腕横扫
  F(P({ lean:-8, py:4, sF:-50, eF:40, sB:30, eB:80, headA:-6 }), 9),
  F(P({ lean:18, px:4, sF:100, eF:2, sB:-30, eB:60, headA:8, hF:30, kF:10, hB:-30, kB:16 }), 8),
  F(P({ lean:22, px:4, sB:100, eB:2, sF:30, eF:60, headA:6 }), 8),
  F(P({ lean:8, py:2 }), 16),
]);
anims.bull_super = A(false, [ // 极限炸弹
  F(P({ lean:20, px:3, py:6, sF:76, eF:16, sB:66, eB:26, handF:'open', handB:'open' }), 12),
  F(P({ lean:-14, py:0, sF:155, eF:8, sB:145, eB:12, handF:'open', handB:'open' }), 16),
  F(P({ lean:-6, py:2, sF:130, eF:12, sB:120, eB:16, handF:'open', handB:'open' }), 14),
  F(P({ lean:40, py:12, sF:8, eF:16, sB:0, eB:16, hF:44, kF:56, hB:-28, kB:48 }), 16),
  F(P({ lean:8, py:4 }), 20),
]);
anims.win = A(false, [
  F(P({ lean:4, py:2, sF:40, eF:80, sB:30, eB:80 }), 20),
  F(P({ lean:-8, py:0, sF:170, eF:6, sB:170, eB:6, headA:-8 }), 999),
]);
const N = mkNormals({ reach: 1.12, dmg: 1.15 });
CHARS.push({
  id:'bull', name:'铁牛', ename:'BULL', title:'钢铁蛮牛', themeColor:'#c08018',
  body: { skin:'#d8a070', scale:1.13, hair:{style:'mask', color:'#a02828', panel:'#e8d890'}, top:{type:'tank', color:'#283848'},
          pants:{color:'#a02828', style:'loose'}, shoes:'#e8d890', belt:'#e0b040', torsoW:11.5, armW:6.5, legW:7.5, fistR:5, headR:7.4 },
  alt: { hair:{style:'mask', color:'#204880', panel:'#d0d8e0'}, pants:{color:'#204880', style:'loose'}, shoes:'#d0d8e0' },
  stats:{ hp:1150, walkF:1.9, walkB:1.6, run:4.4, jumpVX:2.8, jumpVY:-11.6, gravity:0.8 },
  aiStyle:'grapple', shout:'shout_b',
  normals: N, anims,
  specials: [
    { id:'bull_grab', name:'岩石炸弹', motion:'63214', btn:'a', alsoBtn:'c', move:{ id:'bull_grab', anim:'bull_grab', total:54, cost:0,
        grab:{ frame:6, range:52, dmg:180, type:'spin' }, hits:[], sfxStart:'shout_b' } },
    { id:'bull_run', name:'蛮牛突进', motion:'41236', btn:'b', alsoBtn:'d', move:{ id:'bull_run', anim:'bull_run', total:56, cost:0,
        grab:{ frameFrom:12, frameTo:40, range:44, dmg:150, type:'run' }, hits:[],
        vel:[{from:8,to:40,vx:6}], sfxStart:'dash' } },
    { id:'bull_head', name:'火牛升击', motion:'623', btn:'a', alsoBtn:'c', move:{ id:'bull_head', anim:'bull_head', total:50, cost:0,
        hits:[hb(8,-160,58,80,{from:9,to:20,dmg:85,hs:26,bs:18,stop:11,guard:'mid',kbx:3,kby:-9,launch:true,knockdown:true,spark:'hitB',sfx:'hit_hh',whiff:'whiff_h',chip:true})],
        vel:[{from:9,to:18,vx:1.8,vy:-7.8}], gravityFrom:19, landLag:16, armor:[{from:1,to:8}], sfxStart:'shout_b' } },
    { id:'bull_lariat', name:'钢腕横扫', motion:'214', btn:'a', alsoBtn:'c', move:{ id:'bull_lariat', anim:'bull_lariat', total:41, cost:0,
        hits:[hb(20,-134,66,36,{from:10,to:16,dmg:60,hs:24,bs:17,stop:10,guard:'mid',kbx:3,spark:'hitB',sfx:'hit_h',whiff:'whiff_h',chip:true}),
              hb(22,-134,68,36,{from:18,to:24,dmg:60,hs:26,bs:18,stop:11,guard:'mid',kbx:7,kby:-5,knockdown:true,spark:'hitB',sfx:'hit_hh',chip:true})],
        vel:[{from:6,to:22,vx:3.2}], armor:[{from:4,to:20}], sfxStart:'shout_b' } },
  ],
  supers: [
    { id:'bull_super', name:'极限炸弹', motion:'63214x2', btn:'a', alsoBtn:'c', cost:1000,
      move:{ id:'bull_super', anim:'bull_super', total:78, cost:1000, freeze:42, superFlash:true,
        grab:{ frame:8, range:60, dmg:300, type:'super' }, hits:[], inv:[{from:1,to:8,type:'full'}], sfxStart:'shout_b' } },
    { id:'bull_super_max', name:'MAX极限炸弹', motion:'63214x2', btn:'c', max:true, cost:1000,
      move:{ id:'bull_super_max', anim:'bull_super', total:78, cost:1000, freeze:48, superFlash:true, maxSuper:true,
        grab:{ frame:6, range:66, dmg:400, type:'super' }, hits:[], inv:[{from:1,to:10,type:'full'}], sfxStart:'shout_b' } },
  ],
  movelist: [
    ['岩石炸弹(指令投)', '→↘↓↙← + 拳'], ['蛮牛突进(移动投)', '←↙↓↘→ + 脚'], ['火牛升击(霸体)', '→↓↘ + 拳'], ['钢腕横扫(霸体)', '↓↙← + 拳'],
    ['超·极限炸弹', '→↘↓↙←×2 + 拳'], ['MAX版(爆气/残血)', '同指令 + 重拳'],
  ],
  winQuote: '骨头,还挺结实。',
});
})();

// ---------- 5. 王 龙司 RYUJI : 破浪空手道 ----------
(() => {
const anims = {};
anims.idle = A(true, [
  F(P({ lean:2, py:3, hF:18, kF:10, hB:-20, kB:10, sF:70, eF:40, sB:30, eB:110, handF:'open' }), 15),
  F(P({ lean:3, py:4, hF:18, kF:11, hB:-20, kB:11, sF:72, eF:36, sB:32, eB:106, handF:'open', headY:1 }), 15),
  F(P({ lean:2, py:3, hF:18, kF:10, hB:-20, kB:10, sF:71, eF:39, sB:31, eB:109, handF:'open' }), 15),
]);
anims.ryu_fire = A(false, [ // 236P 気弾
  F(P({ lean:-4, py:5, sF:-30, eF:60, sB:-40, eB:70, handF:'open', handB:'open' }), 9),
  F(P({ lean:18, px:2, py:4, sF:88, eF:6, sB:80, eB:14, handF:'open', handB:'open', hF:28, kF:12, hB:-30, kB:16 }), 10),
  F(P({ lean:12, py:4, sF:80, eF:12, sB:70, eB:20, handF:'open', handB:'open' }), 10),
  F(P({ lean:4, py:3 }), 12),
]);
anims.ryu_dp = A(false, [
  F(P({ py:14, lean:20, hF:48, kF:78, hB:-30, kB:68, sF:-30, eF:90, sB:20, eB:80 }), 5),
  F(P({ py:0, lean:-14, hF:58, kF:68, hB:-18, kB:30, sF:152, eF:6, sB:10, eB:80, headA:-12 }), 12),
  F(P({ py:0, lean:-6, hF:42, kF:52, sF:126, eF:16 }), 10),
  F(P({ py:6, lean:8, hF:36, kF:48, hB:-20, kB:40, sF:60, eF:60 }), 15),
]);
anims.ryu_hurr = A(false, [ // 214K 龙巻
  F(P({ lean:8, py:8, hF:36, kF:60, hB:-26, kB:50, sF:50, eF:80 }), 7),
  F(P({ lean:-10, py:2, hF:104, kF:6, fF:34, hB:10, kB:80, sF:60, eF:50, sB:70, eB:40, headA:-8 }), 7),
  F(P({ lean:-16, py:2, hF:50, kF:60, hB:100, kB:8, fB:34, sF:70, eF:40, sB:60, eB:50, headA:-10 }), 7),
  F(P({ lean:-10, py:2, hF:104, kF:6, fF:34, hB:10, kB:80, headA:-8 }), 7),
  F(P({ py:6, lean:8, hF:36, kF:48, hB:-20, kB:40 }), 14),
]);
anims.ryu_axe = A(false, [ // 63214K 斧脚
  F(P({ lean:-8, py:6, hF:30, kF:70, sF:50, eF:90 }), 10),
  F(P({ lean:6, py:2, hF:130, kF:6, fF:-20, sF:30, eF:80, headA:4 }), 8),
  F(P({ lean:20, py:4, hF:70, kF:6, fF:30, headA:8 }), 8),
  F(P({ lean:8, py:4, hF:36, kF:40 }), 14),
]);
anims.ryu_super = A(false, [ // 覇王弾
  F(P({ lean:-8, py:8, sF:-40, eF:70, sB:-50, eB:80, handF:'open', handB:'open', hF:24, kF:20, hB:-26, kB:20 }), 16),
  F(P({ lean:24, px:3, py:5, sF:90, eF:4, sB:84, eB:10, handF:'open', handB:'open', hF:32, kF:12, hB:-32, kB:18 }), 20),
  F(P({ lean:16, py:4, sF:84, eF:10, sB:78, eB:16, handF:'open', handB:'open' }), 16),
  F(P({ lean:4, py:3 }), 18),
]);
const N = mkNormals({ reach: 1.04, dmg: 1.05 });
CHARS.push({
  id:'ryuji', name:'王 龙司', ename:'RYUJI', title:'破浪之道', themeColor:'#c8641a',
  body: { skin:'#dca878', hair:{style:'buzz', color:'#28221c'}, top:{type:'gi', color:'#e8e0d0', sleeve:'#e8e0d0', trim:'#c05018', sleeveShort:true},
          pants:{color:'#e8e0d0', style:'gi'}, shoes:'#dca878', belt:'#282828', torsoW:10, armW:5.5, legW:6.5, beard:'#28221c' },
  alt: { top:{type:'gi', color:'#c8b8d8', sleeve:'#c8b8d8', trim:'#402868', sleeveShort:true}, pants:{color:'#c8b8d8', style:'gi'}, belt:'#602020' },
  stats:{ hp:1050, walkF:2.2, walkB:1.8, run:5.0, jumpVX:3.2, jumpVY:-12.2, gravity:0.72 },
  aiStyle:'zone', shout:'shout_m',
  normals: N, anims,
  specials: [
    { id:'ryu_fire', name:'気弾', motion:'236', btn:'a', alsoBtn:'c', move:{ id:'ryu_fire', anim:'ryu_fire', total:41, cost:0,
        proj:[{frame:12, type:'fireball', x:48, y:-110, vx:6.5, dmg:60, hs:22, bs:16, guard:'mid', kbx:5, spark:'fireP', sfx:'fire_hit', life:200, w:36, h:28}],
        hits:[], sfxStart:'fireball' } },
    { id:'ryu_dp_c', name:'昇龙波·重', motion:'623', btn:'c', move:{ id:'ryu_dp_c', anim:'ryu_dp', total:52, cost:0,
        hits:[hb(10,-152,52,70,{from:6,to:9,dmg:75,hs:24,bs:18,stop:10,guard:'mid',kbx:3,kby:-9.5,launch:true,knockdown:true,spark:'hitB',sfx:'hit_hh',whiff:'whiff_h',chip:true}),
              hb(10,-172,50,80,{from:10,to:18,dmg:45,hs:24,bs:14,stop:8,guard:'mid',kbx:3,kby:-8,launch:true,knockdown:true,spark:'hitB',sfx:'hit_h',chip:true})],
        vel:[{from:6,to:16,vx:2,vy:-8.8}], gravityFrom:17, landLag:17, inv:[{from:1,to:9,type:'full'}], sfxStart:'shout_m' } },
    { id:'ryu_dp_a', name:'昇龙波·轻', motion:'623', btn:'a', move:{ id:'ryu_dp_a', anim:'ryu_dp', total:42, cost:0,
        hits:[hb(10,-150,50,66,{from:5,to:12,dmg:75,hs:24,bs:16,stop:10,guard:'mid',kbx:3,kby:-7.5,launch:true,knockdown:true,spark:'hitB',sfx:'hit_hh',whiff:'whiff_h',chip:true})],
        vel:[{from:5,to:12,vx:1.2,vy:-6.6}], gravityFrom:13, landLag:12, inv:[{from:1,to:6,type:'upper'}], sfxStart:'shout_m' } },
    { id:'ryu_hurr', name:'龙巻旋风', motion:'214', btn:'b', alsoBtn:'d', move:{ id:'ryu_hurr', anim:'ryu_hurr', total:42, cost:0,
        hits:[hb(14,-136,56,40,{from:8,to:13,dmg:45,hs:22,bs:15,stop:9,guard:'mid',kbx:2,spark:'hitB',sfx:'hit_h',whiff:'whiff_h',chip:true}),
              hb(16,-136,58,40,{from:15,to:20,dmg:45,hs:22,bs:15,stop:9,guard:'mid',kbx:2,spark:'hitB',sfx:'hit_h',chip:true}),
              hb(16,-136,58,40,{from:22,to:27,dmg:45,hs:24,bs:16,stop:10,guard:'mid',kbx:6,kby:-4,knockdown:true,spark:'hitB',sfx:'hit_hh',chip:true})],
        vel:[{from:6,to:26,vx:3.8}], sfxStart:'whiff_h' } },
    { id:'ryu_axe', name:'斧刃脚', motion:'63214', btn:'b', alsoBtn:'d', move:{ id:'ryu_axe', anim:'ryu_axe', total:40, cost:0,
        hits:[hb(18,-150,50,80,{from:12,to:20,dmg:78,hs:28,bs:18,stop:11,guard:'high',kbx:3,knockdown:true,spark:'hitB',sfx:'hit_hh',whiff:'whiff_h',chip:true})],
        vel:[{from:6,to:16,vx:3}], sfxStart:'whiff_h' } },
  ],
  supers: [
    { id:'ryu_super', name:'覇王疾風弾', motion:'236236', btn:'a', alsoBtn:'c', cost:1000,
      move:{ id:'ryu_super', anim:'ryu_super', total:70, cost:1000, freeze:42, superFlash:true,
        proj:[{frame:18, type:'beam', x:60, y:-116, vx:8, dmg:230, hs:34, bs:22, guard:'mid', kbx:8, kby:-8, launch:true, knockdown:true, hard:true, spark:'fireB', sfx:'explode', life:110, w:100, h:52, chipBig:true}],
        hits:[], inv:[{from:1,to:16,type:'full'}], sfxStart:'superFlash' } },
    { id:'ryu_super_max', name:'MAX覇王疾風弾', motion:'236236', btn:'c', max:true, cost:1000,
      move:{ id:'ryu_super_max', anim:'ryu_super', total:74, cost:1000, freeze:48, superFlash:true, maxSuper:true,
        proj:[{frame:18, type:'beam', x:60, y:-124, vx:7.5, dmg:330, hs:36, bs:24, guard:'mid', kbx:9, kby:-9, launch:true, knockdown:true, hard:true, spark:'fireB', sfx:'explode', life:120, w:130, h:70, chipBig:true, big:true}],
        hits:[], inv:[{from:1,to:20,type:'full'}], sfxStart:'superFlash' } },
  ],
  movelist: [
    ['気弾', '↓↘→ + 拳'], ['昇龙波', '→↓↘ + 拳'], ['龙巻旋风', '↓↙← + 脚'], ['斧刃脚(中段)', '→↘↓↙← + 脚'],
    ['超·覇王疾風弾', '↓↘→↓↘→ + 拳'], ['MAX版(爆气/残血)', '同指令 + 重拳'],
  ],
  winQuote: '修行,还差得远。',
});
})();

// ---------- 6. 冰宫 雪 YUKI : 蓄力冰刃 ----------
(() => {
const anims = {};
anims.idle = A(true, [
  F(P({ lean:-2, py:3, hF:10, kF:8, hB:-14, kB:8, sF:20, eF:60, sB:10, eB:50, handF:'open', handB:'open' }), 15),
  F(P({ lean:-1, py:4, hF:10, kF:9, hB:-14, kB:9, sF:22, eF:56, sB:12, eB:46, handF:'open', handB:'open', headY:1 }), 15),
  F(P({ lean:-2, py:3, hF:10, kF:8, hB:-14, kB:8, sF:21, eF:59, sB:11, eB:49, handF:'open', handB:'open' }), 15),
]);
anims.yuki_slide = A(false, [ // 蓄←→K 冰刃滑踢
  F(P({ lean:14, py:10, hF:40, kF:60, hB:-30, kB:56, sF:40, eF:80 }), 5),
  F(P({ lean:30, py:22, hF:84, kF:4, fF:40, hB:-40, kB:90, sF:20, eF:60, sB:-20, eB:60, headA:8 }), 16),
  F(P({ lean:18, py:16, hF:60, kF:50, hB:-34, kB:80 }), 8),
  F(P({ lean:6, py:6 }), 12),
]);
anims.yuki_flash = A(false, [ // 蓄↓↑K 月光后空翻
  F(P({ py:16, lean:16, hF:46, kF:76, hB:-30, kB:66, sF:30, eF:80 }), 4),
  F(P({ py:0, lean:-30, hF:130, kF:4, fF:40, hB:0, kB:60, sF:80, eF:40, sB:60, eB:50, headA:-16 }), 10),
  F(P({ py:0, lean:-50, hF:100, kF:30, hB:40, kB:50, sF:100, eF:30, headA:-24 }), 10),
  F(P({ py:0, lean:-10, hF:40, kF:50, hB:-10, kB:36 }), 8),
  F(P({ py:8, lean:10, hF:36, kF:48, hB:-20, kB:40 }), 16),
]);
anims.yuki_cres = A(false, [ // 蓄←→P 冰月刃
  F(P({ lean:-6, py:4, sF:-40, eF:80, sB:30, eB:90, handF:'open' }), 6),
  F(P({ lean:16, px:2, sF:96, eF:2, sB:10, eB:90, handF:'open', headA:6 }), 9),
  F(P({ lean:10, sF:76, eF:14, handF:'open' }), 9),
  F(P({ lean:2 }), 12),
]);
anims.yuki_super = A(false, [ // 絶対零度
  F(P({ lean:20, py:12, hF:44, kF:66, hB:-30, kB:60, sF:50, eF:90, sB:40, eB:90, handF:'open', handB:'open' }), 10),
  F(P({ lean:26, py:18, hF:86, kF:4, fF:40, hB:-40, kB:92, sF:20, eF:60, headA:8 }), 10),
  F(P({ lean:-8, py:2, hF:104, kF:6, fF:36, hB:10, kB:80, sF:60, eF:50, headA:-8 }), 6),
  F(P({ lean:-16, py:2, hF:50, kF:60, hB:102, kB:8, fB:36, sF:70, eF:40, headA:-10 }), 6),
  F(P({ lean:-8, py:2, hF:106, kF:6, fF:36, hB:10, kB:80, headA:-8 }), 6),
  F(P({ py:0, lean:-30, hF:132, kF:4, fF:40, hB:0, kB:60, sF:84, eF:36, headA:-16 }), 12),
  F(P({ py:8, lean:10, hF:36, kF:48, hB:-20, kB:40 }), 20),
]);
anims.win = A(false, [
  F(P({ lean:2, py:3, sF:30, eF:70, handF:'open', handB:'open' }), 20),
  F(P({ lean:-4, py:2, sF:40, eF:120, sB:160, eB:10, handF:'open', handB:'open', headA:-6 }), 999),
]);
const N = mkNormals({ reach: 1.0, dmg: 0.96 });
N.d.hits[0].spark = 'ice'; N.crc.hits[0].spark = 'ice';
CHARS.push({
  id:'yuki', name:'冰宫 雪', ename:'YUKI', title:'零度之月', themeColor:'#3888d8',
  body: { skin:'#f2dcc2', female:true, hair:{style:'long', color:'#284878'}, top:{type:'jacket', color:'#d8e4f0', sleeve:'#d8e4f0', trim:'#3060a8'},
          pants:{color:'#284878', style:'slim'}, shoes:'#e8eef4', gloves:'#3060a8', belt:'#3060a8', torsoW:7.8, armW:4.3, legW:5.2, fistR:3.4, headR:6.6 },
  alt: { top:{type:'jacket', color:'#e8d8e8', sleeve:'#e8d8e8', trim:'#a03060'}, hair:{style:'long', color:'#602848'}, pants:{color:'#402038', style:'slim'}, gloves:'#a03060' },
  stats:{ hp:950, walkF:2.4, walkB:2.0, run:5.5, jumpVX:3.4, jumpVY:-12.6, gravity:0.74 },
  aiStyle:'charge', shout:'shout_f',
  normals: N, anims,
  specials: [
    { id:'yuki_slide_d', name:'冰刃滑踢·重', motion:'b_f', btn:'d', move:{ id:'yuki_slide_d', anim:'yuki_slide', total:41, cost:0,
        hits:[hb(18,-30,66,30,{from:7,to:20,dmg:75,hs:26,bs:18,stop:10,guard:'low',kbx:4,knockdown:true,spark:'ice',sfx:'ice',whiff:'whiff_h',chip:true})],
        vel:[{from:5,to:20,vx:7}], sfxStart:'ice' } },
    { id:'yuki_slide_b', name:'冰刃滑踢·轻', motion:'b_f', btn:'b', move:{ id:'yuki_slide_b', anim:'yuki_slide', total:35, cost:0,
        hits:[hb(16,-30,60,30,{from:6,to:16,dmg:60,hs:24,bs:16,stop:9,guard:'low',kbx:4,knockdown:true,spark:'ice',sfx:'ice',whiff:'whiff_l',chip:true})],
        vel:[{from:4,to:16,vx:5.5}], sfxStart:'ice' } },
    { id:'yuki_flash', name:'月光冰轮', motion:'d_u', btn:'b', alsoBtn:'d', move:{ id:'yuki_flash', anim:'yuki_flash', total:48, cost:0,
        hits:[hb(6,-150,52,76,{from:5,to:9,dmg:70,hs:24,bs:17,stop:10,guard:'mid',kbx:3,kby:-9,launch:true,knockdown:true,spark:'ice',sfx:'ice',whiff:'whiff_h',chip:true}),
              hb(2,-176,50,90,{from:10,to:18,dmg:45,hs:24,bs:14,stop:8,guard:'mid',kbx:3,kby:-8,launch:true,knockdown:true,spark:'ice',sfx:'ice',chip:true})],
        vel:[{from:5,to:16,vx:1.2,vy:-9}], gravityFrom:17, landLag:16, inv:[{from:1,to:9,type:'full'}], sfxStart:'jump' } },
    { id:'yuki_cres', name:'冰月刃', motion:'b_f', btn:'a', alsoBtn:'c', move:{ id:'yuki_cres', anim:'yuki_cres', total:36, cost:0,
        proj:[{frame:9, type:'icecres', x:44, y:-116, vx:5.5, dmg:65, hs:24, bs:17, guard:'mid', kbx:5, kby:-3, spark:'ice', sfx:'ice', life:160, w:34, h:44}],
        hits:[], sfxStart:'ice' } },
  ],
  supers: [
    { id:'yuki_super', name:'絶対零度', motion:'236236', btn:'b', alsoBtn:'d', cost:1000,
      move:{ id:'yuki_super', anim:'yuki_super', total:70, cost:1000, freeze:42, superFlash:true,
        hits:[hb(20,-32,64,32,{from:12,to:20,dmg:50,hs:26,bs:16,stop:9,guard:'low',kbx:0.5,spark:'ice',sfx:'ice',whiff:'whiff_h',chip:true}),
              hb(16,-130,58,44,{from:24,to:28,dmg:45,hs:22,bs:14,stop:8,guard:'mid',kbx:0.5,spark:'ice',sfx:'hit_h',chip:true}),
              hb(16,-130,58,44,{from:30,to:34,dmg:45,hs:22,bs:14,stop:8,guard:'mid',kbx:0.5,spark:'ice',sfx:'hit_h',chip:true}),
              hb(10,-166,54,90,{from:38,to:48,dmg:85,hs:30,bs:18,stop:14,guard:'mid',kbx:5,kby:-10.5,launch:true,knockdown:true,hard:true,spark:'iceB',sfx:'superHit',chip:true})],
        vel:[{from:8,to:20,vx:7},{from:38,to:46,vx:1,vy:-7}], gravityFrom:47, landLag:14,
        inv:[{from:1,to:12,type:'full'}], afterimage:[4,48] } },
    { id:'yuki_super_max', name:'MAX絶対零度', motion:'236236', btn:'d', max:true, cost:1000,
      move:{ id:'yuki_super_max', anim:'yuki_super', total:82, cost:1000, freeze:48, superFlash:true, maxSuper:true,
        hits:[hb(20,-32,66,32,{from:10,to:18,dmg:55,hs:26,bs:16,stop:9,guard:'low',kbx:0.5,spark:'ice',sfx:'ice',whiff:'whiff_h',chip:true}),
              hb(16,-130,60,46,{from:22,to:26,dmg:48,hs:22,bs:14,stop:8,guard:'mid',kbx:0.5,spark:'ice',sfx:'hit_h',chip:true}),
              hb(16,-130,60,46,{from:28,to:32,dmg:48,hs:22,bs:14,stop:8,guard:'mid',kbx:0.5,spark:'ice',sfx:'hit_h',chip:true}),
              hb(16,-130,60,46,{from:34,to:38,dmg:48,hs:22,bs:14,stop:8,guard:'mid',kbx:0.5,spark:'ice',sfx:'hit_h',chip:true}),
              hb(10,-170,58,96,{from:42,to:54,dmg:120,hs:30,bs:18,stop:16,guard:'mid',kbx:6,kby:-11.5,launch:true,knockdown:true,hard:true,spark:'iceB',sfx:'explode',chip:true})],
        vel:[{from:6,to:18,vx:7.5},{from:42,to:50,vx:1,vy:-8}], gravityFrom:51, landLag:14,
        inv:[{from:1,to:14,type:'full'}], afterimage:[3,54] } },
  ],
  movelist: [
    ['冰刃滑踢(下段)', '蓄← →+脚'], ['冰月刃', '蓄← →+拳'], ['月光冰轮', '蓄↓ ↑+脚'],
    ['超·絶対零度', '↓↘→↓↘→ + 脚'], ['MAX版(爆气/残血)', '同指令 + 重脚'],
  ],
  winQuote: '在零度之下,一切都会安静。',
});
})();

// ---------- 7. 王牙 OUGA : 最终BOSS ----------
(() => {
const anims = {};
anims.idle = A(true, [
  F(P({ lean:-4, py:1, hF:8, kF:4, hB:-10, kB:4, sF:10, eF:20, sB:-10, eB:20, handF:'open', handB:'open', headA:2 }), 18),
  F(P({ lean:-3, py:2, hF:8, kF:5, hB:-10, kB:5, sF:12, eF:16, sB:-8, eB:16, handF:'open', handB:'open', headA:2, headY:1 }), 18),
  F(P({ lean:-4, py:1, hF:8, kF:4, hB:-10, kB:4, sF:11, eF:19, sB:-9, eB:19, handF:'open', handB:'open', headA:2 }), 18),
]);
anims.ouga_orb = A(false, [
  F(P({ lean:-8, py:3, sF:60, eF:110, sB:50, eB:120, handF:'open', handB:'open' }), 12),
  F(P({ lean:8, px:2, sF:90, eF:10, sB:84, eB:16, handF:'open', handB:'open' }), 12),
  F(P({ lean:4, sF:70, eF:20, handF:'open' }), 10),
  F(P({ lean:-2 }), 12),
]);
anims.ouga_tele = A(false, [
  F(P({ lean:-6, py:2, sF:40, eF:100, sB:30, eB:100, handF:'open', handB:'open' }), 8),
  F(P({ lean:0, py:6, sF:80, eF:60, sB:70, eB:60, handF:'open', handB:'open', headA:6 }), 14),
  F(P({ lean:-4, py:2 }), 8),
]);
anims.ouga_pillar = A(false, [
  F(P({ lean:-10, py:4, sF:-40, eF:60, sB:-50, eB:70, handF:'open', handB:'open' }), 14),
  F(P({ lean:6, py:2, sF:160, eF:6, sB:150, eB:10, handF:'open', handB:'open', headA:-8 }), 16),
  F(P({ lean:0, py:2, sF:120, eF:20, handF:'open' }), 12),
  F(P({ lean:-2 }), 14),
]);
anims.ouga_super = A(false, [
  F(P({ lean:-12, py:6, sF:50, eF:110, sB:40, eB:120, handF:'open', handB:'open', headA:-4 }), 16),
  F(P({ lean:-6, py:0, sF:170, eF:4, sB:168, eB:6, handF:'open', handB:'open', headA:-10 }), 30),
  F(P({ lean:0, py:2, sF:100, eF:30, sB:90, eB:30, handF:'open', handB:'open' }), 16),
  F(P({ lean:-2, py:1 }), 16),
]);
anims.win = A(false, [
  F(P({ lean:-4, py:1, sF:20, eF:20, sB:-10, eB:20, handF:'open', handB:'open' }), 20),
  F(P({ lean:-8, py:0, sF:150, eF:10, sB:-20, eB:20, handF:'open', handB:'open', headA:-6 }), 999),
]);
const N = mkNormals({ reach: 1.15, dmg: 1.2 });
CHARS.push({
  id:'ouga', name:'王牙', ename:'OUGA', title:'终焉之王', themeColor:'#a01830', boss:true,
  body: { skin:'#e0c8b0', scale:1.16, hair:{style:'crown', color:'#f0e8e0', crown:'#e8c34a'}, top:{type:'coat', color:'#301828', coat:'#301828', sleeve:'#301828', trim:'#e8c34a'},
          pants:{color:'#201020', style:'slim'}, shoes:'#484858', belt:'#e8c34a', emblem:'#e8c34a', torsoW:10.5, armW:5.5, legW:6.5 },
  alt: { top:{type:'coat', color:'#182838', coat:'#182838', sleeve:'#182838', trim:'#c0c8e0'}, hair:{style:'crown', color:'#c0c8e0', crown:'#c03030'} },
  stats:{ hp:1250, walkF:2.0, walkB:1.7, run:4.8, jumpVX:3.0, jumpVY:-11.8, gravity:0.7 },
  aiStyle:'boss', shout:'shout_b',
  normals: N, anims,
  specials: [
    { id:'ouga_orb', name:'终焉魔弹', motion:'236', btn:'a', alsoBtn:'c', move:{ id:'ouga_orb', anim:'ouga_orb', total:46, cost:0,
        proj:[{frame:14, type:'darkorb', x:50, y:-112, vx:4, dmg:75, hs:26, bs:18, guard:'mid', kbx:6, kby:-4, knockdown:true, spark:'darkP', sfx:'fire_hit', life:240, w:44, h:44}],
        hits:[], sfxStart:'charge' } },
    { id:'ouga_tele', name:'瞬狱影', motion:'214', btn:'a', alsoBtn:'c', move:{ id:'ouga_tele', anim:'ouga_tele', total:30, cost:0, hits:[],
        vel:[{from:6,to:16,vx:12}], inv:[{from:3,to:18,type:'full'}], passThrough:[3,18], afterimage:[3,20], sfxStart:'dash' } },
    { id:'ouga_pillar', name:'狱炎柱', motion:'623', btn:'a', alsoBtn:'c', move:{ id:'ouga_pillar', anim:'ouga_pillar', total:56, cost:0,
        proj:[{frame:16, type:'pillar', x:110, y:0, vx:0, dmg:85, hs:28, bs:18, guard:'mid', kbx:4, kby:-9, launch:true, knockdown:true, spark:'darkP', sfx:'explode', life:36, w:44, h:170, delay:10}],
        hits:[], sfxStart:'charge' } },
    { id:'ouga_wave', name:'连狱波', motion:'63214', btn:'a', alsoBtn:'c', move:{ id:'ouga_wave', anim:'ouga_pillar', total:64, cost:0,
        proj:[{frame:16, type:'pillar', x:80, y:0, vx:0, dmg:60, hs:26, bs:16, guard:'mid', kbx:3, kby:-8, launch:true, knockdown:true, spark:'darkP', sfx:'fire_hit', life:30, w:40, h:150, delay:8},
              {frame:24, type:'pillar', x:150, y:0, vx:0, dmg:60, hs:26, bs:16, guard:'mid', kbx:3, kby:-8, launch:true, knockdown:true, spark:'darkP', sfx:'fire_hit', life:30, w:40, h:150, delay:8},
              {frame:32, type:'pillar', x:220, y:0, vx:0, dmg:60, hs:26, bs:16, guard:'mid', kbx:4, kby:-9, launch:true, knockdown:true, spark:'darkP', sfx:'explode', life:30, w:40, h:150, delay:8}],
        hits:[], sfxStart:'charge' } },
  ],
  supers: [
    { id:'ouga_super', name:'终焉·灭', motion:'236236', btn:'a', alsoBtn:'c', cost:1000,
      move:{ id:'ouga_super', anim:'ouga_super', total:78, cost:1000, freeze:46, superFlash:true,
        proj:[{frame:20, type:'pillar', x:70, y:0, vx:0, dmg:70, hs:28, bs:18, guard:'mid', kbx:3, kby:-9, launch:true, knockdown:true, spark:'darkP', sfx:'explode', life:34, w:46, h:180, delay:6, chipBig:true},
              {frame:30, type:'pillar', x:140, y:0, vx:0, dmg:70, hs:28, bs:18, guard:'mid', kbx:3, kby:-9, launch:true, knockdown:true, spark:'darkP', sfx:'explode', life:34, w:46, h:180, delay:6, chipBig:true},
              {frame:40, type:'pillar', x:210, y:0, vx:0, dmg:80, hs:30, bs:20, guard:'mid', kbx:5, kby:-11, launch:true, knockdown:true, hard:true, spark:'darkP', sfx:'explode', life:34, w:50, h:190, delay:6, chipBig:true}],
        hits:[], inv:[{from:1,to:24,type:'full'}], sfxStart:'superFlash' } },
    { id:'ouga_super_max', name:'MAX终焉·灭', motion:'236236', btn:'c', max:true, cost:1000,
      move:{ id:'ouga_super_max', anim:'ouga_super', total:92, cost:1000, freeze:50, superFlash:true, maxSuper:true,
        proj:[{frame:18, type:'pillar', x:60, y:0, vx:0, dmg:75, hs:28, bs:18, guard:'mid', kbx:3, kby:-9, launch:true, knockdown:true, spark:'darkP', sfx:'explode', life:34, w:48, h:184, delay:6, chipBig:true},
              {frame:26, type:'pillar', x:120, y:0, vx:0, dmg:75, hs:28, bs:18, guard:'mid', kbx:3, kby:-9, launch:true, knockdown:true, spark:'darkP', sfx:'explode', life:34, w:48, h:184, delay:6, chipBig:true},
              {frame:34, type:'pillar', x:180, y:0, vx:0, dmg:75, hs:28, bs:18, guard:'mid', kbx:3, kby:-10, launch:true, knockdown:true, spark:'darkP', sfx:'explode', life:34, w:48, h:184, delay:6, chipBig:true},
              {frame:42, type:'pillar', x:240, y:0, vx:0, dmg:90, hs:30, bs:20, guard:'mid', kbx:5, kby:-12, launch:true, knockdown:true, hard:true, spark:'darkP', sfx:'explode', life:36, w:54, h:194, delay:6, chipBig:true}],
        hits:[], inv:[{from:1,to:28,type:'full'}], sfxStart:'superFlash' } },
  ],
  movelist: [
    ['终焉魔弹', '↓↘→ + 拳'], ['瞬狱影(穿身)', '↓↙← + 拳'], ['狱炎柱', '→↓↘ + 拳'], ['连狱波', '→↘↓↙← + 拳'],
    ['超·终焉之灭', '↓↘→↓↘→ + 拳'], ['MAX版(爆气/残血)', '同指令 + 重拳'],
  ],
  winQuote: '跪下吧,凡人。',
});
})();

// ---------- 索引/别名色 ----------
const CHARS_BY_ID = {};
for (const c of CHARS) CHARS_BY_ID[c.id] = c;
const CHAR_ALTS = {};
for (const c of CHARS){
  const body = JSON.parse(JSON.stringify(c.body));
  Object.assign(body, JSON.parse(JSON.stringify(c.alt || {})));
  CHAR_ALTS[c.id] = Object.assign({}, c, { id: c.id + '_p2', body });
}
function getCharDef(id, alt){ return alt ? CHAR_ALTS[id] : CHARS_BY_ID[id]; }
// 查找额外派生招式(莲的連牙)
function findExtraMove(charDef, id){
  const base = CHARS_BY_ID[charDef.id.replace('_p2','')] || charDef;
  return (base.extraMoves && base.extraMoves[id]) || null;
}
