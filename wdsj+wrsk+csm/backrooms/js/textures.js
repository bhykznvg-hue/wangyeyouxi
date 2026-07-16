// ============ 程序化纹理 (阈限空间美学) ============
const Tex = (() => {
  const cache = {};

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function toTex(c, repeat = [1, 1], filter = 'linear') {
    const t = new THREE.CanvasTexture(c);
    if (filter === 'nearest') {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
    } else {
      t.magFilter = THREE.LinearFilter;
      t.minFilter = THREE.LinearMipMapLinearFilter;
    }
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 4;
    return t;
  }
  function rnd(seed) {
    let s = seed;
    return () => (s = (s * 16807 + 12345) % 2147483647) / 2147483647;
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * f) | 0;
    const g = Math.min(255, ((n >> 8) & 255) * f) | 0;
    const b = Math.min(255, (n & 255) * f) | 0;
    return `rgb(${r},${g},${b})`;
  }
  function noiseFill(ctx, w, h, base, vary, r) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      ctx.fillStyle = shade(base, 1 - vary / 2 + r() * vary);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  function stains(ctx, w, h, color, count, r, maxR = 20) {
    for (let i = 0; i < count; i++) {
      const cx = r() * w, cy = r() * h, cr = 4 + r() * maxR;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      g.addColorStop(0, color);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
    }
  }

  // ---------- 黄色墙纸 (较新) ----------
  // 特征: 明亮均匀的黄, 纵向细条纹压纹, 仅少量轻微色差
  function wallpaper(seed = 11) {
    const w = 128, h = 128, c = canvas(w, h), ctx = c.getContext('2d');
    const r = rnd(seed);
    noiseFill(ctx, w, h, '#c4b46a', 0.04, r);
    // 纵向条纹 (壁纸压纹)
    for (let x = 0; x < w; x += 4) {
      ctx.fillStyle = 'rgba(150,136,74,0.14)';
      ctx.fillRect(x, 0, 1, h);
      ctx.fillStyle = 'rgba(222,208,132,0.10)';
      ctx.fillRect(x + 2, 0, 1, h);
    }
    // 极轻微的大面积色差 (新墙也有的批次差异)
    stains(ctx, w, h, 'rgba(170,152,80,0.07)', 3, r, 48);
    stains(ctx, w, h, 'rgba(210,196,124,0.07)', 3, r, 40);
    return c;
  }

  // ---------- 地毯 (较新, 干燥) ----------
  function carpet(seed = 21) {
    const w = 128, h = 128, c = canvas(w, h), ctx = c.getContext('2d');
    const r = rnd(seed);
    // 短绒噪点 (均匀致密)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = 0.9 + r() * 0.18;
      ctx.fillStyle = shade('#b0a25e', v * (0.97 + Math.sin(x * 0.8 + y * 1.3) * 0.025));
      ctx.fillRect(x, y, 1, 1);
    }
    // 极淡的绒毛方向差异
    stains(ctx, w, h, 'rgba(160,148,86,0.10)', 4, r, 30);
    stains(ctx, w, h, 'rgba(130,118,66,0.08)', 3, r, 26);
    return c;
  }

  // ---------- 天花板 (黄色调吸音板, 较新) ----------
  function ceilingTile(seed = 31) {
    const w = 128, h = 128, c = canvas(w, h), ctx = c.getContext('2d');
    const r = rnd(seed);
    noiseFill(ctx, w, h, '#c8b872', 0.05, r);
    // 吸音板小孔
    for (let i = 0; i < 380; i++) {
      ctx.fillStyle = `rgba(150,136,80,${0.2 + r() * 0.25})`;
      ctx.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
    // 板格缝 (64px = 一块板)
    ctx.fillStyle = 'rgba(120,106,58,0.7)';
    ctx.fillRect(0, 0, w, 2); ctx.fillRect(0, 64, w, 2);
    ctx.fillRect(0, 0, 2, h); ctx.fillRect(64, 0, 2, h);
    // 极淡的批次色差
    stains(ctx, w, h, 'rgba(180,166,100,0.08)', 3, r, 34);
    return c;
  }

  // ---------- 荧光灯板 ----------
  function lightPanel() {
    const w = 64, h = 128, c = canvas(w, h), ctx = c.getContext('2d');
    // 乳白灯罩
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#d8d4be');
    g.addColorStop(0.5, '#fffef2');
    g.addColorStop(1, '#d8d4be');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // 灯管亮芯
    ctx.fillStyle = '#fffff8';
    ctx.fillRect(14, 4, 12, h - 8);
    ctx.fillRect(38, 4, 12, h - 8);
    // 边框
    ctx.strokeStyle = '#8a836a';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
    return c;
  }

  // ---------- 电闸箱 ----------
  function breakerBox() {
    const w = 64, h = 96, c = canvas(w, h), ctx = c.getContext('2d');
    const r = rnd(41);
    noiseFill(ctx, w, h, '#6a6e66', 0.1, r);
    ctx.strokeStyle = '#3a3d38';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    // 内格
    ctx.fillStyle = '#4a4e46';
    ctx.fillRect(10, 12, w - 20, h - 36);
    // 开关排
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#2c2e2a';
      ctx.fillRect(14, 17 + i * 12, w - 28, 8);
      ctx.fillStyle = '#c8b868';
      ctx.fillRect(16, 19 + i * 12, 8, 4);
    }
    // 警示条纹
    for (let x = 0; x < w; x += 12) {
      ctx.fillStyle = x % 24 === 0 ? '#b8a840' : '#2a2a26';
      ctx.beginPath();
      ctx.moveTo(x, h - 14); ctx.lineTo(x + 8, h - 14);
      ctx.lineTo(x + 2, h - 4); ctx.lineTo(x - 6, h - 4);
      ctx.fill();
    }
    // 锈
    stains(ctx, w, h, 'rgba(110,70,36,0.4)', 4, r, 8);
    return c;
  }

  // ---------- 出口门 ----------
  function exitDoor() {
    const w = 64, h = 128, c = canvas(w, h), ctx = c.getContext('2d');
    const r = rnd(51);
    noiseFill(ctx, w, h, '#5a5e58', 0.08, r);
    ctx.strokeStyle = '#33352f';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    // 推杠
    ctx.fillStyle = '#8a8e86';
    ctx.fillRect(8, 66, w - 16, 7);
    ctx.fillStyle = '#a8aca4';
    ctx.fillRect(8, 66, w - 16, 2);
    // EXIT 灯牌区域 (门上方贴片)
    ctx.fillStyle = '#1c3a22';
    ctx.fillRect(14, 12, 36, 14);
    ctx.fillStyle = '#48d868';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', 32, 23);
    stains(ctx, w, h, 'rgba(30,32,28,0.4)', 5, r, 10);
    return c;
  }

  // ---------- 粉笔记号 ----------
  function chalkMark(kind = 0) {
    const c = canvas(32, 32), ctx = c.getContext('2d');
    ctx.strokeStyle = 'rgba(240,235,215,0.85)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (kind === 0) { // 箭头
      ctx.moveTo(6, 16); ctx.lineTo(26, 16);
      ctx.moveTo(19, 9); ctx.lineTo(26, 16); ctx.lineTo(19, 23);
    } else if (kind === 1) { // 圈
      ctx.arc(16, 16, 9, 0.3, Math.PI * 2 - 0.2);
    } else { // 叉
      ctx.moveTo(8, 8); ctx.lineTo(24, 24);
      ctx.moveTo(24, 8); ctx.lineTo(8, 24);
    }
    ctx.stroke();
    return c;
  }

  // ---------- 纸条 ----------
  function paper() {
    const c = canvas(24, 32), ctx = c.getContext('2d');
    const r = rnd(61);
    noiseFill(ctx, 24, 32, '#cfc8ad', 0.06, r);
    for (let y = 5; y < 28; y += 4) {
      ctx.fillStyle = 'rgba(60,54,40,0.5)';
      ctx.fillRect(3, y, 14 + r() * 4, 1);
    }
    return c;
  }

  // ---------- 怪物皮肤 (湿润的深色) ----------
  function entitySkin() {
    const w = 64, h = 64, c = canvas(w, h), ctx = c.getContext('2d');
    const r = rnd(71);
    noiseFill(ctx, w, h, '#3a3630', 0.16, r);
    // 湿润高光斑
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(130,124,105,${0.12 + r() * 0.14})`;
      const x = r() * w, y = r() * h;
      ctx.fillRect(x, y, 2 + r() * 3, 1 + r() * 2);
    }
    stains(ctx, w, h, 'rgba(16,14,10,0.5)', 6, r, 10);
    return c;
  }

  // ---------- 怪物面部 (无五官, 只有一张张开的黑色大嘴 + 獠牙) ----------
  function entityFace() {
    const w = 64, h = 64, c = canvas(w, h), ctx = c.getContext('2d');
    const r = rnd(73);
    noiseFill(ctx, w, h, '#3a3630', 0.16, r);
    // 黑色血盆大口, 占满大半张脸
    ctx.fillStyle = '#060504';
    ctx.beginPath();
    ctx.ellipse(32, 38, 25, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    // 口腔深处更黑
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(32, 40, 16, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    // 上排獠牙: 不规则长尖三角
    ctx.fillStyle = '#cfc4a4';
    for (let x = 9; x < 54; x += 5 + ((r() * 3) | 0)) {
      const len = 8 + r() * 10;
      const ww = 3.5 + r() * 3;
      ctx.beginPath();
      ctx.moveTo(x, 20 + r() * 3);
      ctx.lineTo(x + ww, 20 + r() * 3);
      ctx.lineTo(x + ww / 2, 21 + len);
      ctx.fill();
    }
    // 下排獠牙: 略短, 向上
    for (let x = 12; x < 52; x += 6 + ((r() * 3) | 0)) {
      const len = 6 + r() * 8;
      const ww = 3 + r() * 3;
      ctx.beginPath();
      ctx.moveTo(x, 57 - r() * 3);
      ctx.lineTo(x + ww, 57 - r() * 3);
      ctx.lineTo(x + ww / 2, 56 - len);
      ctx.fill();
    }
    return c;
  }

  const makers = { wallpaper, carpet, ceilingTile, lightPanel, breakerBox, exitDoor, chalkMark, paper, entitySkin, entityFace };

  function get(name, repeat, ...args) {
    const key = name + '|' + (args.join(',')) + '|' + (repeat ? repeat.join('x') : '');
    if (!cache[key]) cache[key] = toTex(makers[name](...args), repeat);
    return cache[key];
  }
  function mat(name, opts = {}, repeat, ...args) {
    return new THREE.MeshLambertMaterial({ map: get(name, repeat, ...args), ...opts });
  }

  return { get, mat, toTex, makers };
})();
