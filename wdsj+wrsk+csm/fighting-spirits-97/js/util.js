// ============ util.js : 基础工具 ============
'use strict';
const U = {
  TAU: Math.PI * 2,
  clamp(v, a, b){ return v < a ? a : (v > b ? b : v); },
  lerp(a, b, t){ return a + (b - a) * t; },
  rand(a, b){ return a + Math.random() * (b - a); },
  irand(a, b){ return Math.floor(a + Math.random() * (b - a + 1)); },
  chance(p){ return Math.random() < p; },
  pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; },
  sgn(v){ return v > 0 ? 1 : (v < 0 ? -1 : 0); },
  deg(d){ return d * Math.PI / 180; },
  // 命中盒相交
  boxHit(a, b){
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  },
  // 颜色处理: '#rrggbb' -> 加深/变亮
  shade(hex, f){
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f < 0){ const m = 1 + f; r *= m; g *= m; b *= m; }
    else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    r = U.clamp(Math.round(r), 0, 255); g = U.clamp(Math.round(g), 0, 255); b = U.clamp(Math.round(b), 0, 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  },
  rgba(hex, a){
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  },
  makeCanvas(w, h){
    let cv;
    if (typeof document !== 'undefined') cv = document.createElement('canvas');
    else cv = { width: 0, height: 0, getContext: () => null }; // headless stub
    cv.width = w; cv.height = h;
    return cv;
  },
  store(key, val){
    try { localStorage.setItem('fs97_' + key, JSON.stringify(val)); } catch (e) {}
  },
  load(key, def){
    try {
      const v = localStorage.getItem('fs97_' + key);
      return v == null ? def : JSON.parse(v);
    } catch (e) { return def; }
  },
};
// 全局设置
const OPTS = {
  difficulty: U.load('difficulty', 3),   // 1..5
  roundTime: U.load('roundTime', 60),    // 30/60/90/0(∞)
  voice: U.load('voice', true),
  bgmVol: U.load('bgmVol', 6),           // 0..10
  sfxVol: U.load('sfxVol', 8),
  scanline: U.load('scanline', true),
  save(){
    U.store('difficulty', this.difficulty); U.store('roundTime', this.roundTime);
    U.store('voice', this.voice); U.store('bgmVol', this.bgmVol);
    U.store('sfxVol', this.sfxVol); U.store('scanline', this.scanline);
  }
};
