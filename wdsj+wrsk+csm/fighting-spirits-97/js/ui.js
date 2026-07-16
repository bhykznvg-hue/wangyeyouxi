// ============ ui.js : 街机HUD (血条/气槽/计时/头像/连击) ============
'use strict';
const HUD = (() => {
  function bar(ctx, x, y, w, h, pct, colFull, colLow, right){
    // 底槽
    ctx.fillStyle = '#181018'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#3a2a30'; ctx.fillRect(x, y, w, h);
    const fw = Math.round(w * U.clamp(pct, 0, 1));
    const col = pct < 0.28 ? colLow : colFull;
    if (right) ctx.fillStyle = col, ctx.fillRect(x + w - fw, y, fw, h);
    else ctx.fillStyle = col, ctx.fillRect(x, y, fw, h);
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    if (right) ctx.fillRect(x + w - fw, y, fw, 2); else ctx.fillRect(x, y, fw, 2);
  }

  function draw(ctx, battle){
    const [f1, f2] = battle.fighters;
    const t = battle.frame;
    // ---------- 血条 ----------
    drawHealth(ctx, f1, 14, 16, 250, false, battle);
    drawHealth(ctx, f2, 640 - 14 - 250, 16, 250, true, battle);
    // ---------- 计时 ----------
    const timeStr = battle.time === Infinity ? '99' : String(Math.max(0, Math.ceil(battle.time))).padStart(2, '0');
    ctx.fillStyle = '#100c14'; ctx.fillRect(640/2 - 26, 8, 52, 34);
    ctx.fillStyle = '#282034'; ctx.fillRect(640/2 - 23, 11, 46, 28);
    const timeCol = battle.time <= 10 && (t >> 4) % 2 === 0 ? '#ff3030' : '#ffe040';
    Font.draw(ctx, timeStr, 640/2, 14, { size: 3, color: timeCol, align: 'center' });
    // 回合标记 (队战: 显示双方已淘汰数)
    drawTeam(ctx, battle, 0);
    drawTeam(ctx, battle, 1);
    // ---------- 气力槽 ----------
    drawPower(ctx, f1, 14, 322, false, t);
    drawPower(ctx, f2, 640 - 14 - 200, 322, true, t);
    // ---------- 连击数 ----------
    drawCombo(ctx, battle, f2, 60, 90);        // P1打出的连击显示在左
    drawCombo(ctx, battle, f1, 640 - 60, 90);  // P2打出的连击在右
  }

  function drawHealth(ctx, f, x, y, w, right, battle){
    // 伤害残影条
    if (f.dispHealth == null) f.dispHealth = f.health;
    if (f.dispHealth > f.health) f.dispHealth = Math.max(f.health, f.dispHealth - 3.2);
    else f.dispHealth = f.health;
    const h = 13;
    ctx.fillStyle = '#181018'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#401818'; ctx.fillRect(x, y, w, h);
    // 红色残影
    const gw = Math.round(w * U.clamp(f.dispHealth / f.maxHealth, 0, 1));
    ctx.fillStyle = '#c03028';
    if (right) ctx.fillRect(x + w - gw, y, gw, h); else ctx.fillRect(x, y, gw, h);
    // 当前血量
    const fw = Math.round(w * U.clamp(f.health / f.maxHealth, 0, 1));
    const pct = f.health / f.maxHealth;
    const col = pct < 0.25 ? ((battle.frame >> 3) % 2 ? '#ffd040' : '#ff8030') : '#f8d838';
    ctx.fillStyle = col;
    if (right) ctx.fillRect(x + w - fw, y, fw, h); else ctx.fillRect(x, y, fw, h);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    if (right) ctx.fillRect(x + w - fw, y, fw, 2); else ctx.fillRect(x, y, fw, 2);
    // 头像
    const port = SpriteGen.portrait(f.def, 36);
    const px2 = right ? x + w + 4 : x - 4 - 36;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (f.flashT > 0){ ctx.globalAlpha = 0.6; }
    if (right){ ctx.translate(px2 + 18, y - 2); ctx.scale(-1, 1); ctx.drawImage(port, -18, 0, 36, 36); }
    else ctx.drawImage(port, px2, y - 2, 36, 36);
    ctx.restore();
    ctx.strokeStyle = '#e8c34a'; ctx.lineWidth = 2;
    ctx.strokeRect(px2, y - 2, 36, 36);
    // 名字
    Font.draw(ctx, f.def.ename, right ? x + w - 2 : x + 2, y + h + 4, { size: 1, color: '#ffe8a0', align: right ? 'right' : 'left' });
  }

  function drawTeam(ctx, battle, side){
    const team = battle.teams ? battle.teams[side] : null;
    if (!team) return;
    const y = 52;
    for (let i = 0; i < team.ids.length; i++){
      const x = side === 0 ? 18 + i * 20 : 640 - 18 - 16 - i * 20;
      const alive = i >= team.lostCount;
      const cur = i === team.lostCount;
      ctx.fillStyle = alive ? (cur ? '#ffe040' : '#40c060') : '#582828';
      ctx.fillRect(x, y, 14, 6);
      ctx.strokeStyle = '#181018'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, 13, 5);
    }
  }

  function drawPower(ctx, f, x, y, right, t){
    const w = 200, h = 10;
    ctx.fillStyle = '#181018'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#242030'; ctx.fillRect(x, y, w, h);
    const segW = w / 3;
    for (let i = 0; i < 3; i++){
      const segPower = U.clamp((f.power - i * 1000) / 1000, 0, 1);
      const sx = right ? x + w - (i + 1) * segW : x + i * segW;
      if (segPower > 0){
        const full = segPower >= 1;
        ctx.fillStyle = full ? ((t >> 3) % 2 ? '#ffe040' : '#ff9020') : '#3878c8';
        const fw2 = Math.round(segW * segPower) - 2;
        if (right) ctx.fillRect(sx + segW - fw2 - 1, y + 1, fw2, h - 2);
        else ctx.fillRect(sx + 1, y + 1, fw2, h - 2);
      }
      ctx.strokeStyle = '#100c14'; ctx.strokeRect(sx + 0.5, y + 0.5, segW - 1, h - 1);
    }
    // MAX模式显示
    if (f.inMax){
      const mw = Math.round(w * f.maxMode / 480);
      ctx.fillStyle = (t >> 2) % 2 ? '#ff4020' : '#ffd040';
      ctx.fillRect(right ? x + w - mw : x, y + h + 2, mw, 3);
      Font.draw(ctx, 'MAX', right ? x + w : x, y - 12, { size: 1, color: '#ff8030', align: right ? 'right' : 'left' });
    } else {
      Font.draw(ctx, String(f.stocks), right ? x + w + 10 : x - 10, y - 1, { size: 2, color: '#ffe040', align: 'center' });
    }
  }

  function drawCombo(ctx, battle, victim, x, y){
    if (victim.comboCount >= 2 && victim.comboTimer > 0){
      const n = victim.comboCount;
      const shake = victim.comboTimer > 44 ? U.rand(-2, 2) : 0;
      Font.draw(ctx, String(n), x + shake, y, { size: 5, color: '#ffe040', outline: '#a02020' });
      Font.draw(ctx, 'HITS!', x + shake, y + 40, { size: 2, color: '#ff9020', outline: '#601010' });
      if (battle.training)
        Font.draw(ctx, victim.comboDmg + ' DMG', x, y + 58, { size: 1, color: '#c0e0ff' });
    }
  }

  return { draw, bar };
})();
