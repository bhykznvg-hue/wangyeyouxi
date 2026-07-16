// ============ stages.js : 多层视差像素场景 (原创) ============
'use strict';
// 场景绘制在 320x180 低分辨率画布上再 x2 放大 => 粗像素质感
const Stages = (() => {
  const LW = 320, LH = 180;
  const buf = U.makeCanvas(LW, LH);
  const bctx = buf.getContext('2d');
  const FLOOR = 160; // 低分辨率下地板线 (世界320 => 屏幕y=320)

  function px(c, x, y, w, h, col){ c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }

  // 人群小人 (row of bobbing spectators)
  function crowd(c, y, count, seed, t, palette, camx, para){
    for (let i = 0; i < count; i++){
      const rx = (i * 47 + seed * 13) % 617;
      const x = ((rx * 0.83 + 8) % 560) - camx * para - 60;
      if (x < -8 || x > LW + 8) continue;
      const bob = Math.sin(t * 0.09 + i * 1.7) > 0.55 ? -2 : 0;
      const excite = Math.sin(t * 0.11 + i * 2.3) > 0.8 ? -2 : 0;
      const col = palette[(i + seed) % palette.length];
      const skin = ['#d8a878','#c89060','#e8c098'][(i + seed) % 3];
      px(c, x, y + bob + excite, 5, 7, col);              // 身体
      px(c, x + 1, y - 4 + bob + excite, 3, 4, skin);     // 头
      px(c, x + 1, y - 6 + bob + excite, 3, 2, ['#282828','#503820','#684430','#803828'][(i*3+seed)%4]); // 发
      if (excite < 0){ px(c, x - 1, y - 3 + bob + excite, 2, 2, skin); px(c, x + 5, y - 3 + bob + excite, 2, 2, skin); } // 举手
    }
  }

  const STAGE_LIST = [
    // ---------- 1. 唐人街夜市 ----------
    { id:'china', name:'南门夜市', music:'stage1', width: 960,
      draw(c, camx, t){
        // 天空
        const g = c.createLinearGradient(0, 0, 0, 110);
        g.addColorStop(0, '#0a0820'); g.addColorStop(1, '#302048');
        c.fillStyle = g; c.fillRect(0, 0, LW, 140);
        // 月亮+星
        px(c, 250 - camx * 0.04, 18, 14, 14, '#f8f0d0'); px(c, 252 - camx * 0.04, 20, 4, 4, '#d8d0a8');
        for (let i = 0; i < 24; i++){
          const sx = (i * 89) % 340 - camx * 0.04, sy = (i * 37) % 70 + 4;
          if ((i + (t >> 4)) % 7) px(c, sx, sy, 1, 1, '#c8c8e8');
        }
        // 远景楼群
        for (let i = 0; i < 9; i++){
          const bx = i * 48 - camx * 0.15 - 20, bh = 40 + (i * 29) % 36;
          px(c, bx, 118 - bh, 38, bh, i % 2 ? '#241838' : '#2c1c40');
          for (let w = 0; w < 10; w++){
            if ((w * 7 + i * 13) % 3 === 0)
              px(c, bx + 3 + (w % 4) * 9, 122 - bh + Math.floor(w / 4) * 12, 4, 5, (w+i+(t>>5))%5 ? '#e8c060' : '#403050');
          }
        }
        // 牌楼(中景)
        const ax = 120 - camx * 0.45;
        px(c, ax, 60, 8, 70, '#801818'); px(c, ax + 120, 60, 8, 70, '#801818');
        px(c, ax - 12, 52, 152, 10, '#a02020'); px(c, ax - 6, 46, 140, 8, '#c04030');
        px(c, ax - 18, 60, 164, 4, '#e8b040');
        // 灯笼(摇摆)
        for (let i = 0; i < 6; i++){
          const lx = ax - 30 + i * 36 + Math.sin(t * 0.03 + i) * 2;
          const glow = (t >> 3) % 2 === 0 ? '#ff6838' : '#f05828';
          px(c, lx, 66, 8, 10, glow); px(c, lx + 2, 63, 4, 3, '#c8a030'); px(c, lx + 3, 76, 2, 3, '#e8c060');
        }
        // 店铺摊位
        for (let i = 0; i < 5; i++){
          const sx = i * 90 - camx * 0.45 - 30;
          px(c, sx, 96, 60, 34, '#382030');
          px(c, sx - 3, 90, 66, 9, i % 2 ? '#a03028' : '#286048');
          px(c, sx + 6, 104, 12, 16, '#e8c060'); // 灯窗
          px(c, sx + 30, 104, 20, 26, '#201828');
          if ((t >> 4) % 2) px(c, sx + 8, 106, 8, 3, '#fff0a0');
        }
        // 蒸汽
        for (let i = 0; i < 3; i++){
          const stx = 60 + i * 130 - camx * 0.45, sty = 92 - (t * 0.4 + i * 20) % 26;
          c.fillStyle = U.rgba('#c8c8d0', 0.25); c.fillRect(stx + Math.sin(t*0.05+i)*4, sty, 10, 6);
        }
        // 人群
        crowd(c, 122, 34, 3, t, ['#803030','#305080','#806030','#308050','#603080'], camx, 0.6);
        crowd(c, 130, 30, 7, t + 30, ['#a04040','#4060a0','#a08040'], camx, 0.7);
        // 地面
        const fg = c.createLinearGradient(0, 138, 0, LH);
        fg.addColorStop(0, '#484050'); fg.addColorStop(1, '#28242e');
        c.fillStyle = fg; c.fillRect(0, 138, LW, LH - 138);
        px(c, 0, 138, LW, 2, '#686070');
        // 地砖
        for (let i = 0; i < 14; i++){
          const tx = (i * 56 - camx * 1.0) % (LW + 80) - 40;
          px(c, tx, 150, 40, 1, '#383440'); px(c, tx + 20, 162, 40, 1, '#383440');
        }
        // 霓虹倒影
        for (let i = 0; i < 5; i++){
          const rx = i * 90 - camx * 1.0 - 10;
          c.fillStyle = U.rgba(i % 2 ? '#ff6838' : '#e8c060', 0.12 + 0.04 * ((t >> 3) % 2));
          c.fillRect(rx + 10, 140, 30, 22);
        }
      } },
    // ---------- 2. 港口黄昏 ----------
    { id:'harbor', name:'落日码头', music:'stage2', width: 980,
      draw(c, camx, t){
        const g = c.createLinearGradient(0, 0, 0, 130);
        g.addColorStop(0, '#402858'); g.addColorStop(0.5, '#b04830'); g.addColorStop(1, '#e8a040');
        c.fillStyle = g; c.fillRect(0, 0, LW, 130);
        // 落日
        px(c, 150 - camx * 0.03, 62, 30, 30, '#ffd860'); px(c, 155 - camx * 0.03, 67, 20, 20, '#fff0b0');
        // 云
        for (let i = 0; i < 4; i++){
          const cx2 = (i * 100 + t * 0.06) % 400 - camx * 0.05 - 30;
          c.fillStyle = U.rgba('#e87848', 0.7);
          c.fillRect(cx2, 30 + i * 16, 54, 5); c.fillRect(cx2 + 10, 27 + i * 16, 30, 3);
        }
        // 海面
        const wg = c.createLinearGradient(0, 96, 0, 130);
        wg.addColorStop(0, '#c06838'); wg.addColorStop(1, '#684058');
        c.fillStyle = wg; c.fillRect(0, 96, LW, 34);
        for (let i = 0; i < 20; i++){
          const wx = (i * 43 + t * (i % 3 + 1) * 0.25) % 360 - camx * 0.1 - 20;
          px(c, wx, 100 + (i * 17) % 26, 12 + (i % 3) * 6, 1, U.rgba('#ffd890', 0.5));
        }
        // 货轮
        const shx = 210 - camx * 0.1 + Math.sin(t * 0.01) * 3;
        px(c, shx, 84, 70, 14, '#382838'); px(c, shx + 8, 76, 26, 8, '#584858');
        px(c, shx + 40, 70, 6, 14, '#806858'); if ((t >> 4) % 3 < 2) px(c, shx + 41, 62 - (t % 16) * 0.4, 5, 5, U.rgba('#889', 0.5));
        // 起重机(中景)
        for (let i = 0; i < 3; i++){
          const kx = i * 150 - camx * 0.35 - 20;
          px(c, kx, 48, 6, 74, '#a04828'); px(c, kx - 24, 48, 80, 5, '#a04828');
          px(c, kx - 20, 53, 3, 16 + (i * 7) % 10, '#683018');
          px(c, kx - 22, 69 + (i * 7) % 10, 8, 8, '#484048'); // 吊箱
        }
        // 集装箱+人群
        for (let i = 0; i < 5; i++){
          const bx = i * 80 - camx * 0.6 - 30;
          px(c, bx, 108, 56, 24, ['#a04030','#286048','#a08030','#3868a0','#804878'][i % 5]);
          px(c, bx, 108, 56, 3, U.rgba('#fff', 0.16));
          for (let r = 0; r < 5; r++) px(c, bx + 6 + r * 10, 112, 2, 17, U.rgba('#000', 0.2));
        }
        crowd(c, 104, 26, 11, t, ['#e0d0b0','#3868a0','#a04030','#c8b838'], camx, 0.6);
        // 码头地面
        const fg = c.createLinearGradient(0, 132, 0, LH);
        fg.addColorStop(0, '#786048'); fg.addColorStop(1, '#463828');
        c.fillStyle = fg; c.fillRect(0, 132, LW, LH - 132);
        px(c, 0, 132, LW, 2, '#987850');
        for (let i = 0; i < 12; i++){
          const tx = (i * 64 - camx * 1.0) % (LW + 100) - 50;
          px(c, tx, 132, 2, 48, U.rgba('#302818', 0.5)); // 木板缝
          px(c, tx + 20, 146, 24, 1, U.rgba('#a89068', 0.4));
        }
        // 缆桩
        const bx2 = 40 - camx * 1.0; px(c, bx2, 124, 10, 10, '#282430'); px(c, bx2 + 1, 122, 8, 3, '#3a3644');
      } },
    // ---------- 3. 神社祭典 ----------
    { id:'shrine', name:'月见神社', music:'stage3', width: 920,
      draw(c, camx, t){
        const g = c.createLinearGradient(0, 0, 0, 120);
        g.addColorStop(0, '#181038'); g.addColorStop(1, '#483058');
        c.fillStyle = g; c.fillRect(0, 0, LW, 136);
        px(c, 60 - camx * 0.04, 20, 18, 18, '#f0e8c8'); px(c, 64 - camx * 0.04, 24, 6, 6, '#d0c8a0');
        for (let i = 0; i < 20; i++){
          const sx = (i * 71) % 330 - camx * 0.03, sy = (i * 43) % 60 + 6;
          if ((i + (t >> 5)) % 6) px(c, sx, sy, 1, 1, '#b8b8d8');
        }
        // 远山
        for (let i = 0; i < 4; i++){
          const mx = i * 110 - camx * 0.1 - 40;
          c.fillStyle = '#241c40';
          c.beginPath(); c.moveTo(mx, 118); c.lineTo(mx + 55, 66 + (i * 13) % 20); c.lineTo(mx + 110, 118); c.fill();
        }
        // 神社主殿(中景)
        const sx2 = 90 - camx * 0.3;
        px(c, sx2, 70, 110, 52, '#402828');
        px(c, sx2 - 10, 58, 130, 14, '#582828');
        c.fillStyle = '#301c20';
        c.beginPath(); c.moveTo(sx2 - 16, 60); c.lineTo(sx2 + 55, 40); c.lineTo(sx2 + 126, 60); c.fill();
        for (let i = 0; i < 5; i++) px(c, sx2 + 8 + i * 22, 84, 8, 38, '#805838');
        px(c, sx2 + 40, 92, 28, 30, '#f0d888'); // 殿门灯光
        if ((t >> 4) % 2) px(c, sx2 + 44, 96, 20, 22, '#fff0b0');
        // 鸟居(近中景)
        const tx2 = 250 - camx * 0.5;
        px(c, tx2, 52, 10, 78, '#c03028'); px(c, tx2 + 70, 52, 10, 78, '#c03028');
        px(c, tx2 - 14, 44, 108, 10, '#d84030'); px(c, tx2 - 6, 56, 92, 6, '#a02820');
        // 灯笼串
        for (let i = 0; i < 8; i++){
          const lx = i * 44 - camx * 0.55 - 10 + Math.sin(t * 0.04 + i * 2) * 2;
          px(c, lx, 58 + (i % 2) * 8, 7, 9, (t >> 3) % 2 ? '#ffd860' : '#f0b840');
          px(c, lx + 2, 55 + (i % 2) * 8, 3, 3, '#803828');
        }
        // 樱吹雪
        for (let i = 0; i < 14; i++){
          const fx2 = (i * 67 + t * (0.4 + i % 3 * 0.2)) % 360 - camx * 0.6 - 20;
          const fy = (i * 53 + t * (0.7 + i % 2 * 0.4)) % 150;
          px(c, fx2, fy, 2, 2, i % 2 ? '#ffb8d0' : '#f090b0');
        }
        crowd(c, 118, 30, 5, t, ['#804058','#405880','#a06838','#588048','#985878'], camx, 0.65);
        // 石板地
        const fg = c.createLinearGradient(0, 134, 0, LH);
        fg.addColorStop(0, '#585868'); fg.addColorStop(1, '#302c3c');
        c.fillStyle = fg; c.fillRect(0, 134, LW, LH - 134);
        px(c, 0, 134, LW, 2, '#787888');
        for (let i = 0; i < 16; i++){
          const gx = (i * 44 - camx * 1.0) % (LW + 80) - 40;
          px(c, gx, 142 + (i % 3) * 10, 34, 1, '#44404f');
        }
        // 石灯笼(前景剪影方向感)
        const slx = 300 - camx * 0.85;
        px(c, slx, 108, 12, 26, '#3a3644'); px(c, slx - 3, 104, 18, 6, '#484454'); px(c, slx + 3, 112, 6, 8, '#f0d080');
      } },
    // ---------- 4. 地下竞技场 ----------
    { id:'arena', name:'地下斗技场', music:'stage4', width: 900,
      draw(c, camx, t){
        c.fillStyle = '#100c14'; c.fillRect(0, 0, LW, LH);
        // 扫射灯
        for (let i = 0; i < 3; i++){
          const a = Math.sin(t * 0.02 + i * 2.1) * 0.7;
          const lx = 60 + i * 100 - camx * 0.2;
          c.fillStyle = U.rgba(['#e04040','#4060e0','#e0c040'][i], 0.10);
          c.beginPath(); c.moveTo(lx, 0);
          c.lineTo(lx + a * 120 - 26, 140); c.lineTo(lx + a * 120 + 26, 140); c.fill();
          px(c, lx - 4, 0, 8, 5, '#383844');
        }
        // 铁架
        for (let i = 0; i < 6; i++){
          const bx = i * 60 - camx * 0.15 - 20;
          px(c, bx, 8, 3, 26, '#2c2c38'); px(c, bx - 12, 12, 28, 3, '#2c2c38');
        }
        // 大屏幕
        const scx = 130 - camx * 0.25;
        px(c, scx, 20, 76, 40, '#181828'); px(c, scx + 3, 23, 70, 34, (t >> 4) % 2 ? '#283858' : '#302848');
        for (let i = 0; i < 5; i++) px(c, scx + 5, 26 + i * 6, 66 * ((Math.sin(t * 0.05 + i) + 1) / 2), 2, '#5878b8');
        px(c, scx + 20, 60, 36, 4, '#0c0c14');
        // 观众席(多排,暗中攒动)
        c.fillStyle = '#181420'; c.fillRect(0, 70, LW, 60);
        crowd(c, 84, 40, 13, t, ['#382838','#283848','#403028','#2c3830'], camx, 0.35);
        crowd(c, 98, 44, 17, t + 40, ['#483048','#304858','#504038','#384840'], camx, 0.45);
        crowd(c, 112, 48, 23, t + 80, ['#584058','#405868','#605048','#485850'], camx, 0.55);
        // 围栏
        px(c, 0, 126, LW, 6, '#383440');
        for (let i = 0; i < 30; i++){
          const fx2 = (i * 24 - camx * 0.8) % (LW + 40) - 20;
          px(c, fx2, 118, 3, 12, '#484450');
        }
        // 灯串
        for (let i = 0; i < 12; i++){
          const lx = (i * 40 - camx * 0.8) % (LW + 40) - 20;
          px(c, lx, 116, 3, 3, (i + (t >> 3)) % 3 ? '#ffd860' : '#806030');
        }
        // 擂台地面
        const fg = c.createLinearGradient(0, 132, 0, LH);
        fg.addColorStop(0, '#4c4450'); fg.addColorStop(1, '#241f28');
        c.fillStyle = fg; c.fillRect(0, 132, LW, LH - 132);
        px(c, 0, 132, LW, 2, '#6c6478');
        for (let i = 0; i < 10; i++){
          const tx = (i * 70 - camx) % (LW + 100) - 50;
          px(c, tx, 148, 50, 2, U.rgba('#181420', 0.6));
          px(c, tx + 12, 166, 40, 2, U.rgba('#181420', 0.5));
        }
        // 台面灯光反射
        c.fillStyle = U.rgba('#8090c0', 0.06 + 0.03 * Math.sin(t * 0.05));
        c.fillRect(40 - camx * 0.9, 134, 90, 44);
        c.fillRect(220 - camx * 0.9, 134, 70, 44);
      } },
    // ---------- 5. 王座祭坛 (BOSS) ----------
    { id:'throne', name:'终焉祭坛', music:'boss', width: 860,
      draw(c, camx, t){
        const g = c.createLinearGradient(0, 0, 0, 140);
        g.addColorStop(0, '#180820'); g.addColorStop(1, '#481028');
        c.fillStyle = g; c.fillRect(0, 0, LW, 140);
        // 血月
        px(c, 230 - camx * 0.03, 16, 26, 26, '#c02830'); px(c, 236 - camx * 0.03, 22, 12, 12, '#e05848');
        // 雷云闪电
        if ((t % 90) < 5){
          c.strokeStyle = U.rgba('#e0c0ff', 0.8); c.lineWidth = 2;
          c.beginPath(); let lx = 60 + (t * 37) % 200 - camx * 0.05, ly = 0;
          c.moveTo(lx, ly);
          for (let i = 0; i < 5; i++){ lx += U.rand(-14, 14); ly += 18; c.lineTo(lx, ly); }
          c.stroke();
        }
        // 巨柱
        for (let i = 0; i < 5; i++){
          const px2 = i * 90 - camx * 0.3 - 30;
          px(c, px2, 30, 20, 100, '#2c1430');
          px(c, px2 - 4, 26, 28, 8, '#3c1c40'); px(c, px2 - 4, 124, 28, 8, '#3c1c40');
          for (let r = 0; r < 4; r++) px(c, px2 + 4, 40 + r * 22, 12, 2, '#1c0c20');
        }
        // 王座
        const thx = 150 - camx * 0.4;
        px(c, thx, 56, 44, 70, '#381838');
        px(c, thx - 8, 48, 60, 12, '#502048');
        px(c, thx + 6, 42, 8, 10, '#e8c34a'); px(c, thx + 30, 42, 8, 10, '#e8c34a');
        px(c, thx + 14, 34, 16, 14, '#e8c34a'); px(c, thx + 18, 38, 8, 6, '#a08020');
        // 漂浮火焰
        for (let i = 0; i < 8; i++){
          const fx2 = (i * 47 - camx * 0.5) % (LW + 40) - 20;
          const fy = 70 + (i * 23) % 40 + Math.sin(t * 0.06 + i * 1.9) * 6;
          const fl = (t >> 2) % 2;
          px(c, fx2, fy, 4, 6 + fl * 2, i % 2 ? '#a040e0' : '#e04870');
          px(c, fx2 + 1, fy - 3, 2, 3, '#f0c0ff');
        }
        // 信徒剪影
        crowd(c, 118, 26, 19, t, ['#241028','#2c1430','#1c0c24'], camx, 0.55);
        // 祭坛地面
        const fg = c.createLinearGradient(0, 134, 0, LH);
        fg.addColorStop(0, '#40203c'); fg.addColorStop(1, '#1c0c1c');
        c.fillStyle = fg; c.fillRect(0, 134, LW, LH - 134);
        px(c, 0, 134, LW, 2, '#68305c');
        // 魔法阵纹路
        for (let i = 0; i < 8; i++){
          const gx = (i * 56 - camx) % (LW + 80) - 40;
          px(c, gx, 150, 40, 1, U.rgba('#a04890', 0.4 + 0.2 * Math.sin(t * 0.04 + i)));
          px(c, gx + 20, 164, 30, 1, U.rgba('#7838a0', 0.35));
        }
      } },
  ];

  // 渲染入口: 主画布ctx, 摄像机, 帧计数
  function draw(ctx, stage, cam, t){
    if (!bctx) return;
    bctx.clearRect(0, 0, LW, LH);
    stage.draw(bctx, cam.x / 2, t);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, LW, LH, 0, 0, 640, 360);
  }

  return { list: STAGE_LIST, draw, FLOOR: 320 };
})();
