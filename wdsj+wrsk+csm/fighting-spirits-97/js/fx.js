// ============ fx.js : 命中火花/粒子/飞行道具绘制/震屏/残影 ============
'use strict';
const FX = (() => {
  let list = [];
  let shakeT = 0, shakeMag = 0;
  let flashT = 0, flashColor = '#fff', flashAlpha = 0.5;

  function spawn(type, x, y, opt){
    list.push(Object.assign({ type, x, y, t: 0, dir: 1 }, opt || {}));
  }
  function shake(frames, mag){ shakeT = Math.max(shakeT, frames); shakeMag = Math.max(shakeMag, mag); }
  function flash(frames, color, alpha){ flashT = frames; flashColor = color || '#fff'; flashAlpha = alpha == null ? 0.5 : alpha; }
  function clear(){ list = []; shakeT = 0; flashT = 0; }

  function update(){
    if (shakeT > 0) shakeT--;
    if (flashT > 0) flashT--;
    for (let i = list.length - 1; i >= 0; i--){
      const e = list[i];
      e.t++;
      if (e.vx){ e.x += e.vx; }
      if (e.vy){ e.y += e.vy; if (e.grav) e.vy += e.grav; }
      const life = e.life || dur(e.type);
      if (e.t >= life) list.splice(i, 1);
    }
  }
  function dur(type){
    switch (type){
      case 'hit': return 12; case 'hitB': return 16; case 'fire': return 18; case 'fireB': return 26;
      case 'slash': return 12; case 'slashB': return 20; case 'ice': return 18; case 'iceB': return 26;
      case 'guard': return 12; case 'dust': return 14; case 'runDust': return 12;
      case 'fireP': return 16; case 'darkP': return 18; case 'spark': return 20; case 'ring': return 18;
      case 'kolight': return 40; case 'text': return 40; case 'petal': return 200; case 'ember': return 60;
      default: return 16;
    }
  }
  function shakeOffset(){
    if (shakeT <= 0) return [0, 0];
    const m = shakeMag * (shakeT / 10 + 0.4);
    return [U.rand(-m, m), U.rand(-m, m)];
  }

  // ---------- 绘制单个特效 ----------
  function draw(ctx, cam){
    for (const e of list){
      const x = Math.round(e.x - cam.x), y = Math.round(e.y - (cam.y || 0));
      const p = e.t / (e.life || dur(e.type));
      ctx.save();
      switch (e.type){
        case 'hit': case 'hitB': { // 经典星形火花
          const big = e.type === 'hitB';
          const r = (big ? 22 : 13) * (1 - p * 0.5);
          const col = p < 0.35 ? '#fff' : (p < 0.7 ? '#ffe040' : '#ff7020');
          starBurst(ctx, x, y, r, col, e.t, big ? 7 : 5);
          if (p < 0.3){ ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 3, 6, 6); }
          break; }
        case 'guard': { // 防御波纹
          ctx.strokeStyle = p < 0.5 ? '#80c0ff' : '#3a6ac0'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, y, 6 + p * 22, -1.9 + (e.dir<0?Math.PI:0), 1.9 + (e.dir<0?Math.PI:0)); ctx.stroke();
          ctx.fillStyle = '#c0e0ff';
          for (let i = 0; i < 3; i++) ctx.fillRect(x + Math.cos(i*2.1+e.t)*10*p*e.dir, y + Math.sin(i*2.1)*14*p, 3, 3);
          break; }
        case 'fire': case 'fireB': { // 火焰爆裂
          const big = e.type === 'fireB';
          const n = big ? 10 : 6;
          for (let i = 0; i < n; i++){
            const a = (i / n) * U.TAU + e.t * 0.15;
            const rr = (big ? 26 : 15) * p + 4;
            const fx2 = x + Math.cos(a) * rr, fy = y + Math.sin(a) * rr - p * 14;
            const sz = (big ? 9 : 6) * (1 - p);
            ctx.fillStyle = i % 3 === 0 ? '#fff0a0' : (i % 3 === 1 ? '#ff9020' : '#e04010');
            ctx.fillRect(fx2 - sz/2, fy - sz/2, sz, sz);
          }
          if (p < 0.4){ ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, y - 4, 8, 8); }
          break; }
        case 'ice': case 'iceB': { // 冰晶
          const big = e.type === 'iceB';
          const n = big ? 9 : 6;
          for (let i = 0; i < n; i++){
            const a = (i / n) * U.TAU + 0.4;
            const rr = (big ? 26 : 15) * p + 3;
            ctx.fillStyle = i % 2 ? '#c0e8ff' : '#fff';
            const sz = (big ? 7 : 5) * (1 - p * 0.7);
            const fx2 = x + Math.cos(a) * rr, fy = y + Math.sin(a) * rr + p * 6;
            ctx.fillRect(fx2 - sz/2, fy - sz/2, sz, sz);
          }
          ctx.strokeStyle = U.rgba('#a0d8ff', 1 - p); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, 4 + p * (big?30:18), 0, U.TAU); ctx.stroke();
          break; }
        case 'slash': case 'slashB': { // 斩击
          const big = e.type === 'slashB';
          const len = (big ? 40 : 26) * (0.5 + p);
          ctx.strokeStyle = p < 0.4 ? '#fff' : '#c0a0ff'; ctx.lineWidth = big ? 5 * (1-p) + 1 : 3 * (1-p) + 1;
          ctx.beginPath(); ctx.moveTo(x - len * 0.7 * e.dir, y + len * 0.6);
          ctx.lineTo(x + len * 0.7 * e.dir, y - len * 0.6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x - len * 0.5 * e.dir, y - len * 0.5);
          ctx.lineTo(x + len * 0.5 * e.dir, y + len * 0.5); ctx.stroke();
          break; }
        case 'fireP': case 'darkP': { // 火焰/暗焰命中
          const dark = e.type === 'darkP';
          for (let i = 0; i < 8; i++){
            const a = (i / 8) * U.TAU + e.t * 0.2;
            const rr = 18 * p + 4;
            ctx.fillStyle = dark ? (i % 2 ? '#a040e0' : '#5020a0') : (i % 2 ? '#ff8020' : '#ffd040');
            const sz = 6 * (1 - p);
            ctx.fillRect(x + Math.cos(a) * rr - sz/2, y + Math.sin(a) * rr - p*10 - sz/2, sz, sz);
          }
          break; }
        case 'dust': { // 落地/翻滚尘土
          for (let i = 0; i < 5; i++){
            const a = Math.PI + (i / 5) * Math.PI;
            const rr = 12 * p + 2;
            ctx.fillStyle = U.rgba('#c8b8a0', (1 - p) * 0.8);
            const sz = 4 * (1 - p * 0.5);
            ctx.fillRect(x + Math.cos(a) * rr * 1.6 - sz/2, y - Math.abs(Math.sin(a)) * rr * 0.7 - sz/2, sz, sz);
          }
          break; }
        case 'runDust': {
          ctx.fillStyle = U.rgba('#c8b8a0', (1 - p) * 0.6);
          const sz = 5 * (1 - p);
          ctx.fillRect(x - e.dir * p * 12 - sz/2, y - 3 - p * 6, sz, sz);
          ctx.fillRect(x - e.dir * p * 20 - sz/2, y - 1 - p * 3, sz * 0.8, sz * 0.8);
          break; }
        case 'spark': { // 电光
          ctx.strokeStyle = e.t % 4 < 2 ? '#fff' : '#ffe860'; ctx.lineWidth = 2;
          ctx.beginPath();
          let px2 = x - 14, py2 = y;
          ctx.moveTo(px2, py2);
          for (let i = 0; i < 4; i++){ px2 += 8; py2 = y + U.rand(-10, 10); ctx.lineTo(px2, py2); }
          ctx.stroke();
          break; }
        case 'ring': { // 能量环(爆气)
          ctx.strokeStyle = U.rgba(e.color || '#ffd040', 1 - p); ctx.lineWidth = 4 * (1 - p) + 1;
          ctx.beginPath(); ctx.arc(x, y, 8 + p * 46, 0, U.TAU); ctx.stroke();
          break; }
        case 'kolight': { // KO白光柱
          ctx.fillStyle = U.rgba('#fff', (1 - p) * 0.8);
          ctx.fillRect(x - 30 * (1-p), 0, 60 * (1-p), 360);
          break; }
        case 'ember': { // 环境火星
          ctx.fillStyle = U.rgba(e.color || '#ff9030', (1 - p));
          ctx.fillRect(x, y, 2, 2);
          break; }
        case 'petal': { // 樱花瓣
          ctx.fillStyle = U.rgba('#ffb8d0', 0.9);
          ctx.fillRect(x + Math.sin(e.t * 0.05 + e.x) * 10, y, 3, 2);
          break; }
      }
      ctx.restore();
    }
  }
  function starBurst(ctx, x, y, r, col, t, n){
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++){
      const a = (i / n) * U.TAU + t * 0.1;
      const x2 = x + Math.cos(a) * r, y2 = y + Math.sin(a) * r;
      const sz = Math.max(1, r * 0.28);
      ctx.fillRect(x2 - sz/2, y2 - sz/2, sz, sz);
      ctx.fillRect(x + Math.cos(a) * r * 0.5 - 1, y + Math.sin(a) * r * 0.5 - 1, 3, 3);
    }
  }

  // ---------- 飞行道具外观 ----------
  function drawProjectile(ctx, pr, cam, t){
    const x = Math.round(pr.x - cam.x), y = Math.round(pr.y - (cam.y || 0));
    const d = pr.dir;
    ctx.save();
    switch (pr.type){
      case 'fireball': { // 气功波
        for (let i = 0; i < 7; i++){
          const a = (i / 7) * U.TAU + t * 0.3;
          ctx.fillStyle = i % 2 ? '#60c0ff' : '#c0e8ff';
          const rr = 10 + Math.sin(t * 0.4 + i) * 3;
          ctx.fillRect(x + Math.cos(a) * rr - 3, y + Math.sin(a) * rr - 3, 6, 6);
        }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 8, 0, U.TAU); ctx.fill();
        for (let i = 1; i < 4; i++){
          ctx.fillStyle = U.rgba('#60c0ff', 0.5 - i * 0.12);
          ctx.fillRect(x - d * i * 10 - 4, y - 4, 8, 8);
        }
        break; }
      case 'beam': { // 超必杀大波
        const w = pr.w, h = pr.h;
        ctx.fillStyle = U.rgba('#4090ff', 0.4);
        ctx.fillRect(x - w/2 - 8, y - h/2 - 6, w + 16, h + 12);
        ctx.fillStyle = '#80c8ff'; ctx.fillRect(x - w/2, y - h/2, w, h);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - w/2 + 4, y - h/2 + h*0.25, w - 8, h*0.5);
        for (let i = 0; i < 6; i++){
          const a = t * 0.5 + i;
          ctx.fillStyle = i % 2 ? '#c0e8ff' : '#fff';
          ctx.fillRect(x - w/2 + ((i * 17 + t * 6) % w), y + Math.sin(a) * h * 0.4 - 2, 5, 5);
        }
        break; }
      case 'groundflame': { // 地面紫焰
        for (let i = 0; i < 6; i++){
          const fx2 = x + (i - 3) * 6 * d;
          const hh = 16 + Math.sin(t * 0.5 + i * 1.7) * 8 + (i === 2 ? 8 : 0);
          ctx.fillStyle = i % 2 ? '#a040e0' : '#6020b0';
          ctx.fillRect(fx2 - 3, y - hh, 7, hh);
          ctx.fillStyle = '#e0a0ff'; ctx.fillRect(fx2 - 1, y - hh, 3, 6);
        }
        break; }
      case 'kunai': { // 手裏剣
        ctx.translate(x, y); ctx.rotate(t * 0.6 * d);
        ctx.fillStyle = '#c8c8d8'; ctx.fillRect(-9, -2, 18, 4); ctx.fillRect(-2, -9, 4, 18);
        ctx.fillStyle = '#fff'; ctx.fillRect(-2, -2, 4, 4);
        break; }
      case 'icecres': { // 冰月刃
        ctx.translate(x, y);
        ctx.strokeStyle = '#c0e8ff'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(-6 * d, 0, 16, -1.3, 1.3); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(-6 * d, 0, 16, -1.1, 1.1); ctx.stroke();
        for (let i = 0; i < 3; i++){
          ctx.fillStyle = '#e0f4ff';
          ctx.fillRect(-d * (14 + i * 8) - 2, Math.sin(t * 0.4 + i) * 8 - 2, 4, 4);
        }
        break; }
      case 'darkorb': { // 暗黑魔弹
        for (let i = 0; i < 8; i++){
          const a = (i / 8) * U.TAU - t * 0.25;
          ctx.fillStyle = i % 2 ? '#a040e0' : '#401080';
          const rr = 14 + Math.sin(t * 0.3 + i) * 4;
          ctx.fillRect(x + Math.cos(a) * rr - 4, y + Math.sin(a) * rr - 4, 8, 8);
        }
        ctx.fillStyle = '#201040'; ctx.beginPath(); ctx.arc(x, y, 11, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#e0a0ff'; ctx.beginPath(); ctx.arc(x, y, 5, 0, U.TAU); ctx.fill();
        break; }
      case 'pillar': { // 狱炎柱
        if (pr.warn > 0){ // 预警
          ctx.fillStyle = U.rgba('#e04040', 0.3 + 0.2 * Math.sin(t));
          ctx.fillRect(x - pr.w/2, y - 6, pr.w, 6);
          break;
        }
        const h = pr.h * Math.min(1, pr.t / 6);
        for (let i = 0; i < 5; i++){
          const fx2 = x + (i - 2) * pr.w / 5.5;
          const hh = h * (0.75 + Math.sin(t * 0.7 + i * 2.1) * 0.22);
          ctx.fillStyle = i % 2 ? '#a040e0' : '#5818a0';
          ctx.fillRect(fx2 - pr.w/9, y - hh, pr.w/4.5, hh);
        }
        ctx.fillStyle = U.rgba('#e0b0ff', 0.9);
        for (let i = 0; i < 4; i++){
          ctx.fillRect(x + Math.sin(t * 0.9 + i * 1.8) * pr.w * 0.4 - 2, y - (t * 6 + i * 40) % h - 4, 4, 8);
        }
        break; }
    }
    ctx.restore();
  }

  function drawScreenFlash(ctx){
    if (flashT > 0){
      ctx.fillStyle = U.rgba(flashColor, flashAlpha * Math.min(1, flashT / 6));
      ctx.fillRect(0, 0, 640, 360);
    }
  }

  return { spawn, shake, flash, clear, update, draw, drawProjectile, drawScreenFlash, shakeOffset,
           get flashActive(){ return flashT > 0; } };
})();
