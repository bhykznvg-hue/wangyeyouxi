// ============ input.js : 键盘/手柄输入 + 指令缓冲 + 搓招判定 ============
'use strict';
const Input = (() => {
  const DEF_KEYS = [
    { up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD', a:'KeyJ', b:'KeyK', c:'KeyU', d:'KeyI', start:'Enter' },
    { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight', a:'Numpad1', b:'Numpad2', c:'Numpad4', d:'Numpad5', start:'Numpad0' },
  ];
  let keymap = U.load('keys', null) || JSON.parse(JSON.stringify(DEF_KEYS));
  const down = new Set();
  let lastKeyCode = null; // 键位设置用
  const BTNS = ['a','b','c','d'];

  // 每个玩家的虚拟手柄状态
  function newPad(){
    return {
      up:false,down:false,left:false,right:false,a:false,b:false,c:false,d:false,start:false,
      prev:{}, press:{}, // press = 本帧刚按下
    };
  }
  const pads = [newPad(), newPad()];
  // AI 覆盖: battle 里为CPU一侧写入
  const override = [null, null];

  function init(){
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      down.add(e.code); lastKeyCode = e.code;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => down.delete(e.code));
    window.addEventListener('blur', () => down.clear());
  }

  function readGamepad(idx){
    try {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gps[idx];
      if (!gp || !gp.connected) return null;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      const bt = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
      return {
        left: ax < -0.4 || bt(14), right: ax > 0.4 || bt(15),
        up: ay < -0.4 || bt(12), down: ay > 0.4 || bt(13),
        a: bt(2), b: bt(3), c: bt(0), d: bt(1),  // X Y A B -> 轻拳轻脚重拳重脚
        start: bt(9),
      };
    } catch (e) { return null; }
  }

  function update(){
    for (let p = 0; p < 2; p++){
      const pad = pads[p], km = keymap[p];
      const gp = readGamepad(p);
      const src = override[p];
      for (const k of ['up','down','left','right','a','b','c','d','start']){
        pad.prev[k] = pad[k];
        if (src) pad[k] = !!src[k];
        else pad[k] = down.has(km[k]) || !!(gp && gp[k]);
        pad.press[k] = pad[k] && !pad.prev[k];
      }
    }
  }
  function setOverride(p, state){ override[p] = state; }
  function anyStart(){ return pads[0].press.start || pads[1].press.start; }
  function anyBtn(){
    for (const p of pads) for (const k of ['a','b','c','d','start']) if (p.press[k]) return true;
    return false;
  }
  function consumeKey(){ const k = lastKeyCode; lastKeyCode = null; return k; }
  function setKey(p, name, code){ keymap[p][name] = code; U.store('keys', keymap); }
  function resetKeys(){ keymap = JSON.parse(JSON.stringify(DEF_KEYS)); U.store('keys', keymap); }
  function keyName(code){
    if (!code) return '---';
    return code.replace('Key','').replace('Arrow','').replace('Numpad','Num').replace('Digit','');
  }

  return { init, update, pads, setOverride, anyStart, anyBtn, consumeKey, setKey, resetKeys, keyName,
           get keymap(){ return keymap; }, BTNS, newPad };
})();

// ---------- 指令缓冲: 搓招/蓄力/连点 ----------
class CommandBuffer {
  constructor(){
    this.hist = [];       // {d:数字键盘方向(相对朝向), t:帧号}
    this.frame = 0;
    this.chargeB = 0;     // 持续按后方向帧数
    this.chargeD = 0;     // 持续按下方向帧数
    this.chargeBRel = -999; this.chargeBVal = 0;
    this.chargeDRel = -999; this.chargeDVal = 0;
    this.lastDir = 5;
    this.tapF = []; this.tapB = []; // 双击前/后 时间戳
    this.btnHist = [];    // {b, t} 按键历史(投技拆解等)
  }
  // dir: 相对朝向的数字键盘方向 (6=前)
  feed(dir, pad){
    this.frame++;
    if (dir !== this.lastDir){
      this.hist.push({ d: dir, t: this.frame });
      if (this.hist.length > 40) this.hist.shift();
      // 双击检测: 5 -> 6
      if (dir === 6 && this.lastDir !== 3 && this.lastDir !== 9) this.tapF.push(this.frame);
      if (dir === 4 && this.lastDir !== 1 && this.lastDir !== 7) this.tapB.push(this.frame);
      if (this.tapF.length > 3) this.tapF.shift();
      if (this.tapB.length > 3) this.tapB.shift();
      this.lastDir = dir;
    }
    // 蓄力
    if (dir === 1 || dir === 4 || dir === 7) this.chargeB++;
    else { if (this.chargeB >= 40){ this.chargeBRel = this.frame; this.chargeBVal = this.chargeB; } this.chargeB = 0; }
    if (dir === 1 || dir === 2 || dir === 3) this.chargeD++;
    else { if (this.chargeD >= 40){ this.chargeDRel = this.frame; this.chargeDVal = this.chargeD; } this.chargeD = 0; }
    for (const b of ['a','b','c','d']){
      if (pad.press[b]){ this.btnHist.push({ b, t: this.frame }); if (this.btnHist.length > 12) this.btnHist.shift(); }
    }
  }
  // 序列匹配: seq如[2,3,6], 从最近往前找, 每步间隔<=gap, 总时长<=total
  matchSeq(seq, gap, total){
    gap = gap || 11; total = total || 26;
    let i = this.hist.length - 1, si = seq.length - 1, lastT = this.frame;
    if (this.frame - (this.hist[i] ? this.hist[i].t : -999) > 8 && seq[si] !== this.lastDir) {}
    while (i >= 0 && si >= 0){
      const h = this.hist[i];
      if (this.frame - h.t > total) return false;
      if (lastT - h.t > gap && si < seq.length - 1) return false;
      if (h.d === seq[si]){ si--; lastT = h.t; }
      else if (si < seq.length - 1 && !this._transitional(h.d, seq[si], seq[si+1])) {
        // 允许中间夹杂过渡方向(斜方向)
      }
      i--;
    }
    return si < 0;
  }
  _transitional(d, a, b){ return false; }
  // 招式指令检测(按键按下那一帧调用)
  motion(name){
    switch (name){
      case '236': return this.matchSeq([2,3,6]) || this.matchSeq([2,6], 8, 16);
      case '214': return this.matchSeq([2,1,4]) || this.matchSeq([2,4], 8, 16);
      case '623': return this.matchSeq([6,2,3]) || this.matchSeq([6,2,6], 11, 26) || this.matchSeq([3,2,3], 11, 22);
      case '421': return this.matchSeq([4,2,1]) || this.matchSeq([4,2,4], 11, 26);
      case '63214': return this.matchSeq([6,3,2,1,4], 11, 34) || this.matchSeq([6,2,4], 9, 24);
      case '41236': return this.matchSeq([4,1,2,3,6], 11, 34) || this.matchSeq([4,2,6], 9, 24);
      case '236236': return this.matchSeq([2,3,6,2,3,6], 13, 52) || this.matchSeq([2,6,2,6], 11, 40) || this.matchSeq([2,3,6,2,6],12,46) || this.matchSeq([2,6,2,3,6],12,46);
      case '214214': return this.matchSeq([2,1,4,2,1,4], 13, 52) || this.matchSeq([2,4,2,4], 11, 40) || this.matchSeq([2,1,4,2,4],12,46) || this.matchSeq([2,4,2,1,4],12,46);
      case '2141236': return this.matchSeq([2,1,4,1,2,3,6], 13, 60) || this.matchSeq([2,4,1,2,6], 12, 48) || this.matchSeq([2,4,2,6], 11, 44);
      case '6321463214': return this.motion('63214x2');
      case '63214x2': return this.matchSeq([6,3,2,1,4,6,3,2,1,4], 13, 80) || this.matchSeq([6,2,4,6,2,4], 12, 56) || this.matchSeq([6,3,2,1,4,6,2,4],13,68);
      case 'b_f': // 蓄后前
        return (this.chargeB >= 40 || (this.frame - this.chargeBRel) <= 9) && (this.lastDir === 6 || this.lastDir === 3 || this.lastDir === 9) && this._recent(6, 8, true);
      case 'd_u': // 蓄下上
        return (this.chargeD >= 40 || (this.frame - this.chargeDRel) <= 9) && (this.lastDir === 8 || this.lastDir === 9 || this.lastDir === 7) && this._recent(8, 8, true);
      default: return false;
    }
  }
  _recent(dir, within, anyDiag){
    for (let i = this.hist.length - 1; i >= 0; i--){
      const h = this.hist[i];
      if (this.frame - h.t > within) return false;
      if (h.d === dir) return true;
      if (anyDiag && dir === 6 && (h.d === 3 || h.d === 9)) return true;
      if (anyDiag && dir === 8 && (h.d === 7 || h.d === 9)) return true;
    }
    return false;
  }
  doubleTapF(){
    const n = this.tapF.length;
    return n >= 2 && this.tapF[n-1] - this.tapF[n-2] <= 13 && this.frame - this.tapF[n-1] <= 2;
  }
  doubleTapB(){
    const n = this.tapB.length;
    return n >= 2 && this.tapB[n-1] - this.tapB[n-2] <= 13 && this.frame - this.tapB[n-1] <= 2;
  }
  btnWithin(b, within){
    for (let i = this.btnHist.length - 1; i >= 0; i--){
      const h = this.btnHist[i];
      if (this.frame - h.t > within) return false;
      if (h.b === b) return true;
    }
    return false;
  }
  reset(){ this.hist.length = 0; this.chargeB = 0; this.chargeD = 0; this.tapF.length = 0; this.tapB.length = 0; }
}
