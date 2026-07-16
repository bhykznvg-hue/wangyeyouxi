// ============ poses.js : 骨骼姿势库 + 通用动作动画 ============
'use strict';
// 姿势参数 (角度: 0=竖直向下, 正=朝面向方向摆动; 单位=度)
// lean 躯干前倾 | px/py 骨盆偏移(py正=下蹲) | hF/kF 前腿髋/膝 | hB/kB 后腿
// sF/eF 前臂肩/肘 | sB/eB 后臂 | headA/headX/headY 头 | fF/fB 脚尖 | handF/handB 手型
const POSE_DEF = {
  lean: 4, px: 0, py: 2,
  hF: 14, kF: 12, hB: -16, kB: 10,
  sF: 42, eF: 100, sB: 25, eB: 118,
  headA: 0, headX: 0, headY: 0, fF: 0, fB: 0,
  handF: 'fist', handB: 'fist',
};
function P(o){ return Object.assign({}, POSE_DEF, o || {}); }
function A(loop, frames){ return { loop, frames }; }
function F(p, t){ return { p, t }; }

const ANIMS = {};

// ---------- 站立 / 移动 ----------
ANIMS.idle = A(true, [
  F(P({ py: 2 }), 14),
  F(P({ py: 3, lean: 5, sF: 44, eF: 96, headY: 1 }), 14),
  F(P({ py: 4, lean: 6, sF: 46, eF: 92, headY: 1 }), 14),
  F(P({ py: 3, lean: 5, sF: 44, eF: 96 }), 14),
]);
ANIMS.walkF = A(true, [
  F(P({ px: 1, hF: 30, kF: 6, hB: -22, kB: 18, fB: 20 }), 7),
  F(P({ px: 2, hF: 16, kF: 14, hB: -4, kB: 22, py: 3 }), 7),
  F(P({ px: 1, hF: -18, kF: 16, hB: 28, kB: 8, fF: 20 }), 7),
  F(P({ px: 2, hF: -2, kF: 20, hB: 12, kB: 12, py: 3 }), 7),
]);
ANIMS.walkB = A(true, [
  F(P({ px: -1, hF: -24, kF: 14, hB: 24, kB: 8 }), 8),
  F(P({ px: -2, hF: -8, kF: 18, hB: 8, kB: 16, py: 3 }), 8),
  F(P({ px: -1, hF: 26, kF: 6, hB: -20, kB: 16 }), 8),
  F(P({ px: -2, hF: 10, kF: 14, hB: -4, kB: 20, py: 3 }), 8),
]);
ANIMS.run = A(true, [
  F(P({ lean: 22, py: 4, hF: 48, kF: 20, hB: -34, kB: 48, sF: -30, eF: 80, sB: 60, eB: 70, fB: 30 }), 5),
  F(P({ lean: 24, py: 6, hF: 10, kF: 30, hB: 6, kB: 40, sF: 10, eF: 90, sB: 20, eB: 90 }), 4),
  F(P({ lean: 22, py: 4, hF: -34, kF: 50, hB: 46, kB: 16, sF: 60, eF: 70, sB: -30, eB: 80, fF: 30 }), 5),
  F(P({ lean: 24, py: 6, hF: 8, kF: 36, hB: 8, kB: 34, sF: 20, eF: 90, sB: 10, eB: 90 }), 4),
]);
ANIMS.backdash = A(false, [
  F(P({ lean: -14, py: 4, hF: 30, kF: 30, hB: -30, kB: 20, sF: 55, eF: 90, sB: 40, eB: 100 }), 6),
  F(P({ lean: -20, py: 0, hF: 44, kF: 44, hB: -20, kB: 40, sF: 60, eF: 80 }), 8),
  F(P({ lean: -6, py: 3, hF: 18, kF: 16, hB: -18, kB: 12 }), 8),
]);
ANIMS.prejump = A(false, [ F(P({ py: 12, lean: 10, hF: 40, kF: 60, hB: -20, kB: 50, sF: 20, eF: 60, sB: 0, eB: 60 }), 4) ]);
ANIMS.jumpU = A(false, [
  F(P({ py: 0, lean: 2, hF: 42, kF: 70, hB: -12, kB: 40, sF: 50, eF: 95, sB: 30, eB: 105 }), 10),
  F(P({ py: 0, lean: 4, hF: 30, kF: 50, hB: -8, kB: 30 }), 999),
]);
ANIMS.jumpF = A(false, [
  F(P({ py: 0, lean: 16, hF: 60, kF: 90, hB: 10, kB: 80, sF: 40, eF: 90, sB: 20, eB: 100 }), 12),
  F(P({ py: 0, lean: 10, hF: 40, kF: 60, hB: 0, kB: 55 }), 999),
]);
ANIMS.fall = A(false, [ F(P({ py: 0, lean: 0, hF: 26, kF: 26, hB: -14, kB: 16, sF: 55, eF: 80, sB: 40, eB: 90 }), 999) ]);
ANIMS.land = A(false, [ F(P({ py: 10, lean: 12, hF: 36, kF: 50, hB: -18, kB: 44, sF: 30, eF: 70 }), 6) ]);
ANIMS.crouch = A(true, [
  F(P({ py: 22, lean: 14, hF: 64, kF: 100, hB: -30, kB: 96, sF: 40, eF: 100, sB: 26, eB: 112, headY: 1 }), 20),
  F(P({ py: 23, lean: 15, hF: 64, kF: 100, hB: -30, kB: 96, sF: 42, eF: 96, sB: 26, eB: 112, headY: 2 }), 20),
]);
ANIMS.turn = A(false, [ F(P({ lean: 2, sF: 30, eF: 90, sB: 30, eB: 90 }), 6) ]);

// ---------- 防御 / 受击 ----------
ANIMS.standBlock = A(false, [ F(P({ lean: -4, py: 4, sF: 55, eF: 118, sB: 45, eB: 125, hF: 10, kF: 14, hB: -14, kB: 12, headY: 1 }), 999) ]);
ANIMS.crouchBlock = A(false, [ F(P({ py: 22, lean: 6, hF: 64, kF: 100, hB: -30, kB: 96, sF: 58, eF: 120, sB: 48, eB: 126, headY: 1 }), 999) ]);
ANIMS.hitHi = A(false, [
  F(P({ lean: -16, headA: -34, py: 3, sF: 70, eF: 40, sB: -20, eB: 60, hF: 8, kF: 10, hB: -20, kB: 8, handF: 'open', handB: 'open' }), 8),
  F(P({ lean: -10, headA: -18, py: 3, sF: 55, eF: 60, sB: -10, eB: 70 }), 999),
]);
ANIMS.hitLo = A(false, [
  F(P({ lean: 26, headA: 16, py: 6, sF: -10, eF: 50, sB: -20, eB: 40, hF: 12, kF: 18, hB: -18, kB: 14, handF: 'open', handB: 'open' }), 8),
  F(P({ lean: 16, headA: 8, py: 5, sF: 0, eF: 70, sB: -10, eB: 60 }), 999),
]);
ANIMS.hitCr = A(false, [
  F(P({ py: 22, lean: 0, headA: -24, hF: 64, kF: 100, hB: -30, kB: 96, sF: 60, eF: 40, sB: -15, eB: 50, handF: 'open' }), 8),
  F(P({ py: 22, lean: 6, headA: -10, hF: 64, kF: 100, hB: -30, kB: 96, sF: 45, eF: 70 }), 999),
]);
ANIMS.launch = A(false, [
  F(P({ py: 0, lean: -46, headA: -30, hF: 60, kF: 40, hB: 20, kB: 30, sF: 80, eF: 30, sB: 50, eB: 40, handF: 'open', handB: 'open' }), 12),
  F(P({ py: 0, lean: -70, headA: -24, hF: 76, kF: 30, hB: 40, kB: 24, sF: 100, eF: 20, sB: 70, eB: 30, handF: 'open', handB: 'open' }), 999),
]);
ANIMS.fallB = A(false, [
  F(P({ py: 0, lean: -80, headA: -14, hF: 80, kF: 20, hB: 60, kB: 26, sF: 110, eF: 20, sB: 90, eB: 20, handF: 'open', handB: 'open' }), 999),
]);
ANIMS.lie = A(false, [
  F(P({ py: 30, lean: -86, headA: 0, headY: 2, hF: 92, kF: 8, hB: 84, kB: 14, sF: 120, eF: 10, sB: 100, eB: 8, handF: 'open', handB: 'open' }), 999),
]);
ANIMS.wakeup = A(false, [
  F(P({ py: 26, lean: -40, hF: 90, kF: 60, hB: 60, kB: 80, sF: 100, eF: 20, sB: 60, eB: 30 }), 6),
  F(P({ py: 20, lean: 20, hF: 70, kF: 90, hB: -20, kB: 80, sF: 30, eF: 60, sB: 10, eB: 60 }), 7),
  F(P({ py: 8, lean: 8, hF: 30, kF: 40, hB: -20, kB: 30, sF: 40, eF: 90 }), 6),
]);
ANIMS.rollF = A(false, [
  F(P({ lean: 40, py: 14, hF: 60, kF: 80, hB: -10, kB: 70, sF: 60, eF: 100, sB: 30, eB: 100, headA: 20 }), 5),
  F(P({ lean: 80, py: 26, hF: 90, kF: 110, hB: 60, kB: 110, sF: 100, eF: 110, sB: 80, eB: 110, headA: 40, headY: 3 }), 8),
  F(P({ lean: 30, py: 18, hF: 70, kF: 90, hB: 10, kB: 70, sF: 40, eF: 90, headA: 10 }), 6),
  F(P({ lean: 8, py: 6, hF: 24, kF: 26, hB: -18, kB: 20 }), 5),
]);
ANIMS.rollB = A(false, [
  F(P({ lean: -20, py: 14, hF: 40, kF: 60, hB: -30, kB: 60, sF: 60, eF: 90, headA: -10 }), 5),
  F(P({ lean: -60, py: 26, hF: 80, kF: 110, hB: 40, kB: 110, sF: 90, eF: 110, sB: 70, eB: 110, headA: -30, headY: 3 }), 8),
  F(P({ lean: -14, py: 16, hF: 50, kF: 70, hB: -10, kB: 60, headA: -6 }), 6),
  F(P({ lean: 4, py: 6, hF: 20, kF: 24, hB: -16, kB: 18 }), 5),
]);
ANIMS.recover = A(false, [
  F(P({ py: 10, lean: -30, hF: 70, kF: 60, hB: 30, kB: 60, sF: 80, eF: 40, sB: 60, eB: 40 }), 8),
  F(P({ py: 6, lean: 0, hF: 30, kF: 30, hB: -20, kB: 24, sF: 45, eF: 95 }), 8),
]);
ANIMS.dizzy = A(true, [
  F(P({ lean: 10, headA: -20, headX: -1, py: 6, sF: 10, eF: 30, sB: -10, eB: 30, handF: 'open', handB: 'open' }), 10),
  F(P({ lean: 6, headA: 20, headX: 1, py: 7, sF: -5, eF: 30, sB: 5, eB: 30, handF: 'open', handB: 'open' }), 10),
]);

// ---------- 通用普通技 ----------
ANIMS.a = A(false, [ // 轻拳: 刺拳
  F(P({ lean: 6, sF: 60, eF: 60 }), 3),
  F(P({ lean: 10, px: 1, sF: 88, eF: 2, sB: 20, eB: 110, headA: 4 }), 4),
  F(P({ lean: 7, sF: 60, eF: 70 }), 3),
  F(P(), 4),
]);
ANIMS.b = A(false, [ // 轻脚: 前踢
  F(P({ lean: 2, py: 4, hF: 40, kF: 70, sF: 30, eF: 100, sB: 40, eB: 100 }), 4),
  F(P({ lean: -4, py: 3, hF: 78, kF: 4, fF: 40, sF: 20, eF: 100, sB: 46, eB: 96 }), 4),
  F(P({ lean: 0, py: 4, hF: 40, kF: 60 }), 4),
  F(P(), 4),
]);
ANIMS.c = A(false, [ // 重拳: 后手直拳
  F(P({ lean: -6, py: 3, sB: -25, eB: 95, sF: 50, eF: 100, headA: -4 }), 6),
  F(P({ lean: 16, px: 3, py: 2, sB: 92, eB: 0, sF: 30, eF: 110, headA: 6, hF: 26, kF: 10, hB: -30, kB: 14, fB: 24 }), 5),
  F(P({ lean: 10, px: 2, sB: 70, eB: 30 }), 5),
  F(P({ lean: 2, sB: 30, eB: 100 }), 8),
]);
ANIMS.d = A(false, [ // 重脚: 回旋高踢
  F(P({ lean: -4, py: 5, hF: 30, kF: 60, sF: 55, eF: 90, sB: 40, eB: 90 }), 7),
  F(P({ lean: -14, py: 2, hF: 108, kF: 6, fF: 30, sF: 30, eF: 80, sB: 60, eB: 60, headA: -6 }), 5),
  F(P({ lean: -6, py: 4, hF: 60, kF: 40 }), 5),
  F(P({ py: 4, hF: 30, kF: 40 }), 9),
]);
ANIMS.cra = A(false, [ // 蹲轻拳
  F(P({ py: 22, lean: 8, hF: 64, kF: 100, hB: -30, kB: 96, sF: 60, eF: 60 }), 3),
  F(P({ py: 22, lean: 12, hF: 64, kF: 100, hB: -30, kB: 96, sF: 86, eF: 4, sB: 20, eB: 110 }), 4),
  F(P({ py: 22, lean: 9, hF: 64, kF: 100, hB: -30, kB: 96, sF: 60, eF: 70 }), 6),
]);
ANIMS.crb = A(false, [ // 蹲轻脚(下段)
  F(P({ py: 24, lean: 16, hF: 40, kF: 80, hB: -30, kB: 100, sF: 40, eF: 90 }), 4),
  F(P({ py: 24, lean: 12, hF: 86, kF: 2, fF: 40, hB: -30, kB: 104, sF: 34, eF: 96 }), 4),
  F(P({ py: 24, lean: 14, hF: 50, kF: 70, hB: -30, kB: 100 }), 7),
]);
ANIMS.crc = A(false, [ // 蹲重拳(升拳对空)
  F(P({ py: 24, lean: 18, hF: 64, kF: 100, hB: -30, kB: 96, sB: -30, eB: 80, sF: 40, eF: 90 }), 6),
  F(P({ py: 10, lean: -12, hF: 40, kF: 60, hB: -24, kB: 60, sB: 150, eB: 8, sF: 20, eF: 90, headA: -10 }), 5),
  F(P({ py: 14, lean: -4, hF: 50, kF: 80, hB: -26, kB: 80, sB: 120, eB: 20 }), 5),
  F(P({ py: 22, lean: 10, hF: 64, kF: 100, hB: -30, kB: 96, sB: 30, eB: 100 }), 9),
]);
ANIMS.crd = A(false, [ // 蹲重脚(扫堂腿,击倒)
  F(P({ py: 26, lean: 24, hF: 50, kF: 90, hB: -36, kB: 106, sF: 20, eF: 80, sB: 0, eB: 80 }), 7),
  F(P({ py: 28, lean: 18, hF: 88, kF: 0, fF: 40, hB: -40, kB: 110, sF: 10, eF: 70, sB: -10, eB: 70 }), 6),
  F(P({ py: 27, lean: 20, hF: 60, kF: 60, hB: -38, kB: 108 }), 6),
  F(P({ py: 24, lean: 16, hF: 64, kF: 100, hB: -30, kB: 96 }), 10),
]);
ANIMS.ja = A(false, [ // 跳轻拳
  F(P({ py: 0, lean: 8, hF: 50, kF: 80, hB: 0, kB: 60, sF: 70, eF: 30, sB: 30, eB: 100 }), 3),
  F(P({ py: 0, lean: 12, hF: 50, kF: 80, hB: 0, kB: 60, sF: 95, eF: 4, sB: 30, eB: 100 }), 999),
]);
ANIMS.jb = A(false, [ // 跳轻脚
  F(P({ py: 0, lean: 10, hF: 40, kF: 80, hB: 6, kB: 70, sF: 50, eF: 90 }), 3),
  F(P({ py: 0, lean: 6, hF: 84, kF: 6, fF: 40, hB: 14, kB: 90, sF: 40, eF: 90, sB: 40, eB: 90 }), 999),
]);
ANIMS.jc = A(false, [ // 跳重拳(下劈)
  F(P({ py: 0, lean: 10, hF: 46, kF: 76, hB: 6, kB: 66, sB: 150, eB: 10, sF: 40, eF: 90 }), 4),
  F(P({ py: 0, lean: 22, hF: 50, kF: 80, hB: 10, kB: 70, sB: 60, eB: 4, sF: 30, eF: 90, headA: 8, handB: 'fist' }), 999),
]);
ANIMS.jd = A(false, [ // 跳重脚(空中回旋)
  F(P({ py: 0, lean: 4, hF: 40, kF: 90, hB: 10, kB: 80, sF: 50, eF: 80, sB: 40, eB: 80 }), 5),
  F(P({ py: 0, lean: -8, hF: 96, kF: 4, fF: 30, hB: 20, kB: 96, sF: 40, eF: 70, sB: 56, eB: 60, headA: -6 }), 999),
]);
ANIMS.cd = A(false, [ // 重击吹飞(CD)
  F(P({ lean: -10, py: 6, sB: -30, eB: 90, sF: 40, eF: 100, hF: 20, kF: 30, hB: -20, kB: 20 }), 8),
  F(P({ lean: 24, px: 4, py: 3, sB: 88, eB: 4, sF: 80, eF: 10, hF: 34, kF: 8, hB: -34, kB: 16, fB: 26, headA: 8 }), 5),
  F(P({ lean: 16, px: 3, sB: 70, eB: 20, sF: 66, eF: 20 }), 6),
  F(P({ lean: 4 }), 12),
]);
ANIMS.throwF = A(false, [ // 投技(抓取->摔出)
  F(P({ lean: 14, px: 2, sF: 80, eF: 20, sB: 70, eB: 30, handF: 'open', handB: 'open' }), 8),
  F(P({ lean: -14, py: 2, sF: 130, eF: 10, sB: 120, eB: 16, hF: 20, kF: 10, hB: -24, kB: 12 }), 10),
  F(P({ lean: 30, py: 6, sF: 20, eF: 20, sB: 10, eB: 20, hF: 30, kF: 20, hB: -20, kB: 20 }), 12),
  F(P(), 10),
]);
ANIMS.win = A(false, [
  F(P({ lean: 2, py: 3, sF: 40, eF: 90, sB: 30, eB: 90 }), 20),
  F(P({ lean: -6, py: 2, sB: 175, eB: 5, sF: 30, eF: 60, headA: -8, hF: 12, kF: 8, hB: -16, kB: 8 }), 999),
]);
ANIMS.lose = A(true, [
  F(P({ lean: 30, py: 10, headA: 20, sF: 5, eF: 20, sB: -5, eB: 20, hF: 30, kF: 40, hB: -20, kB: 36, handF: 'open', handB: 'open' }), 24),
  F(P({ lean: 32, py: 11, headA: 22, sF: 3, eF: 18, sB: -7, eB: 18, hF: 30, kF: 40, hB: -20, kB: 36, handF: 'open', handB: 'open' }), 24),
]);
ANIMS.intro = A(false, [
  F(P({ lean: 30, py: 8, headA: 24, sF: 10, eF: 30, sB: 0, eB: 30 }), 30),
  F(P({ lean: 0, py: 4, sF: 30, eF: 80, sB: 20, eB: 90 }), 14),
  F(P(), 20),
]);
// 挑衅
ANIMS.taunt = A(false, [
  F(P({ lean: -8, sF: 70, eF: 10, handF: 'open', headA: -6 }), 20),
  F(P({ lean: -6, sF: 76, eF: 4, handF: 'open', headA: 4 }), 20),
  F(P(), 10),
]);

// 动画解析: 角色覆盖优先
function getAnim(charDef, name){
  if (charDef && charDef.anims && charDef.anims[name]) return charDef.anims[name];
  return ANIMS[name] || ANIMS.idle;
}
// 取第i帧姿势(按累计时长)
function animFrameAt(anim, f){
  let acc = 0, idx = 0;
  for (let i = 0; i < anim.frames.length; i++){
    acc += anim.frames[i].t;
    if (f < acc){ idx = i; break; }
    idx = i;
  }
  if (anim.loop){
    let total = 0; for (const fr of anim.frames) total += fr.t;
    const ff = f % total; acc = 0;
    for (let i = 0; i < anim.frames.length; i++){
      acc += anim.frames[i].t;
      if (ff < acc){ idx = i; break; }
    }
  }
  return idx;
}
function animTotal(anim){ let t = 0; for (const fr of anim.frames) t += fr.t; return t; }
