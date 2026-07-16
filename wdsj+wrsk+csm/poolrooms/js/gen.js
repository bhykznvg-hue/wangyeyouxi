// ============ 无限空间生成 (确定性 · 宏大版) ============
// 24m 区域制, 层高 10m。开放型区域 (中庭/水道/阶梯殿) 边界无墙,
// 相邻开放区域无缝连成超大空间; 封闭型区域自带 6m 宽 4.6m 高门洞。
const Gen = (() => {
  const AREA = 24;
  const WALL_H = 10;
  let seed = 20260716;

  function setSeed(s) { seed = s >>> 0; }
  function hash(a, b, k = 0) {
    let h = (a | 0) * 374761393 + (b | 0) * 668265263 + (k | 0) * 2246822519 + seed * 40503;
    h = (h ^ (h >>> 13)) >>> 0;
    h = (h * 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function areaType(ax, az) {
    if (ax === 0 && az === 0) return 'atrium';
    const h = hash(ax, az, 1);
    if (h < 0.20) return 'atrium';
    if (h < 0.35) return 'bigpool';
    if (h < 0.49) return 'shallow';
    if (h < 0.61) return 'canal';
    if (h < 0.73) return 'steps';
    if (h < 0.83) return 'pillars';
    if (h < 0.93) return 'deeppool';
    return 'corridor';
  }

  // ---------- 区域描述 ----------
  function describe(ax, az) {
    const type = areaType(ax, az);
    const r = k => hash(ax, az, 100 + k);
    const boxes = [];
    let water = null;
    const F = 0.5;

    const addFloor = () => boxes.push({ x0: 0, y0: -F, z0: 0, x1: AREA, y1: 0, z1: AREA, mat: 'tile' });

    // 封闭型四周墙 (6m 门洞, 4.6m 高)
    const addWalls = (doorH = 4.6) => {
      const dw = 6, d0 = (AREA - dw) / 2, d1 = (AREA + dw) / 2;
      const t = 0.4;
      [[-t, 0], [AREA, AREA + t]].forEach(([za, zb]) => {
        boxes.push({ x0: 0, y0: 0, z0: za, x1: d0, y1: WALL_H, z1: zb, mat: 'tile' });
        boxes.push({ x0: d1, y0: 0, z0: za, x1: AREA, y1: WALL_H, z1: zb, mat: 'tile' });
        boxes.push({ x0: d0, y0: doorH, z0: za, x1: d1, y1: WALL_H, z1: zb, mat: 'tile' });
      });
      [[-t, 0], [AREA, AREA + t]].forEach(([xa, xb]) => {
        boxes.push({ x0: xa, y0: 0, z0: 0, x1: xb, y1: WALL_H, z1: d0, mat: 'tile' });
        boxes.push({ x0: xa, y0: 0, z0: d1, x1: xb, y1: WALL_H, z1: AREA, mat: 'tile' });
        boxes.push({ x0: xa, y0: doorH, z0: d0, x1: xb, y1: WALL_H, z1: d1, mat: 'tile' });
      });
    };

    // 天花板
    const addCeiling = (style = 'square') => {
      const t = 0.45;
      if (style === 'full') {
        boxes.push({ x0: 0, y0: WALL_H, z0: 0, x1: AREA, y1: WALL_H + t, z1: AREA, mat: 'conc' });
        return;
      }
      if (style === 'square') {
        const s = 10 + r(3) * 6, a0 = (AREA - s) / 2, a1 = (AREA + s) / 2;
        boxes.push({ x0: 0, y0: WALL_H, z0: 0, x1: AREA, y1: WALL_H + t, z1: a0, mat: 'conc' });
        boxes.push({ x0: 0, y0: WALL_H, z0: a1, x1: AREA, y1: WALL_H + t, z1: AREA, mat: 'conc' });
        boxes.push({ x0: 0, y0: WALL_H, z0: a0, x1: a0, y1: WALL_H + t, z1: a1, mat: 'conc' });
        boxes.push({ x0: a1, y0: WALL_H, z0: a0, x1: AREA, y1: WALL_H + t, z1: a1, mat: 'conc' });
      } else { // strips
        const n = 4, gap = 2.2;
        const bw = (AREA - gap * (n - 1)) / n;
        for (let i = 0; i < n; i++) {
          const z0 = i * (bw + gap);
          boxes.push({ x0: 0, y0: WALL_H, z0, x1: AREA, y1: WALL_H + t, z1: z0 + bw, mat: 'conc' });
        }
      }
    };

    // 方柱
    const column = (cx, cz, s = 0.55, h = WALL_H, y0 = 0) =>
      boxes.push({ x0: cx - s, y0, z0: cz - s, x1: cx + s, y1: h, z1: cz + s, mat: 'tile' });

    // ============ 模板 ============
    if (type === 'atrium') {
      // 中庭大厅: 无墙, 边界柱廊, 中央下沉大池 + 岛台 + 双桥, 大天窗
      const p = 4; // 走道宽
      // 走道环
      boxes.push({ x0: 0, y0: -F, z0: 0, x1: AREA, y1: 0, z1: p, mat: 'tile' });
      boxes.push({ x0: 0, y0: -F, z0: AREA - p, x1: AREA, y1: 0, z1: AREA, mat: 'tile' });
      boxes.push({ x0: 0, y0: -F, z0: p, x1: p, y1: 0, z1: AREA - p, mat: 'tile' });
      boxes.push({ x0: AREA - p, y0: -F, z0: p, x1: AREA, y1: 0, z1: AREA - p, mat: 'tile' });
      // 大池 (16x16, 1.6m 深)
      const depth = 1.6;
      boxes.push({ x0: p, y0: -depth - F, z0: p, x1: AREA - p, y1: -depth, z1: AREA - p, mat: 'pool' });
      boxes.push({ x0: p, y0: -depth, z0: p, x1: AREA - p, y1: 0, z1: p + 0.3, mat: 'pool' });
      boxes.push({ x0: p, y0: -depth, z0: AREA - p - 0.3, x1: AREA - p, y1: 0, z1: AREA - p, mat: 'pool' });
      boxes.push({ x0: p, y0: -depth, z0: p, x1: p + 0.3, y1: 0, z1: AREA - p, mat: 'pool' });
      boxes.push({ x0: AREA - p - 0.3, y0: -depth, z0: p, x1: AREA - p, y1: 0, z1: AREA - p, mat: 'pool' });
      // 中央岛台 + 双桥
      const c = AREA / 2;
      boxes.push({ x0: c - 2.2, y0: -depth, z0: c - 2.2, x1: c + 2.2, y1: 0.02, z1: c + 2.2, mat: 'tile' });
      boxes.push({ x0: c - 0.9, y0: -0.32, z0: p, x1: c + 0.9, y1: 0.0, z1: c - 2.2, mat: 'tile' });
      boxes.push({ x0: c - 0.9, y0: -0.32, z0: c + 2.2, x1: c + 0.9, y1: 0.0, z1: AREA - p, mat: 'tile' });
      // 入水台阶
      for (let i = 0; i < 4; i++) {
        boxes.push({ x0: p + i * 0.42, y0: -0.4 * (i + 1), z0: p, x1: p + (i + 1) * 0.42 + 2.4, y1: -0.4 * i, z1: p + 2.6, mat: 'pool' });
      }
      // 边界柱廊 (每 6m)
      for (let i = 3; i <= AREA - 3; i += 6) {
        column(i, 1.1); column(i, AREA - 1.1);
        column(1.1, i); column(AREA - 1.1, i);
      }
      // 天窗: 边环顶板 4m 宽
      const t = 0.45, e = 4.5;
      boxes.push({ x0: 0, y0: WALL_H, z0: 0, x1: AREA, y1: WALL_H + t, z1: e, mat: 'conc' });
      boxes.push({ x0: 0, y0: WALL_H, z0: AREA - e, x1: AREA, y1: WALL_H + t, z1: AREA, mat: 'conc' });
      boxes.push({ x0: 0, y0: WALL_H, z0: e, x1: e, y1: WALL_H + t, z1: AREA - e, mat: 'conc' });
      boxes.push({ x0: AREA - e, y0: WALL_H, z0: e, x1: AREA, y1: WALL_H + t, z1: AREA - e, mat: 'conc' });
      water = { level: -0.22, x0: p + 0.28, z0: p + 0.28, x1: AREA - p - 0.28, z1: AREA - p - 0.28, depth };
    }
    else if (type === 'canal') {
      // 大水道: 贯穿南北, 两侧宽走道, E/W 高墙带门, N/S 全开放
      const cw = 10, c0 = (AREA - cw) / 2, c1 = (AREA + cw) / 2;
      const depth = 2.0;
      // 走道
      boxes.push({ x0: 0, y0: -F, z0: 0, x1: c0, y1: 0, z1: AREA, mat: 'tile' });
      boxes.push({ x0: c1, y0: -F, z0: 0, x1: AREA, y1: 0, z1: AREA, mat: 'tile' });
      // 水道底与侧壁
      boxes.push({ x0: c0, y0: -depth - F, z0: 0, x1: c1, y1: -depth, z1: AREA, mat: 'pool' });
      boxes.push({ x0: c0, y0: -depth, z0: 0, x1: c0 + 0.3, y1: 0, z1: AREA, mat: 'pool' });
      boxes.push({ x0: c1 - 0.3, y0: -depth, z0: 0, x1: c1, y1: 0, z1: AREA, mat: 'pool' });
      // 邻区不是水道 → 封端 (顶面可走)
      const capN = areaType(ax, az - 1) !== 'canal';
      const capS = areaType(ax, az + 1) !== 'canal';
      if (capN) boxes.push({ x0: c0, y0: -depth, z0: 0, x1: c1, y1: 0, z1: 0.9, mat: 'pool' });
      if (capS) boxes.push({ x0: c0, y0: -depth, z0: AREA - 0.9, x1: c1, y1: 0, z1: AREA, mat: 'pool' });
      // 中桥
      boxes.push({ x0: c0, y0: -0.1, z0: AREA / 2 - 1.6, x1: c1, y1: 0.22, z1: AREA / 2 + 1.6, mat: 'tile' });
      // E/W 高墙带门
      const dw = 6, d0 = (AREA - dw) / 2, d1 = (AREA + dw) / 2, t = 0.4;
      [[-t, 0], [AREA, AREA + t]].forEach(([xa, xb]) => {
        boxes.push({ x0: xa, y0: 0, z0: 0, x1: xb, y1: WALL_H, z1: d0, mat: 'tile' });
        boxes.push({ x0: xa, y0: 0, z0: d1, x1: xb, y1: WALL_H, z1: AREA, mat: 'tile' });
        boxes.push({ x0: xa, y0: 4.6, z0: d0, x1: xb, y1: WALL_H, z1: d1, mat: 'tile' });
      });
      // 走道柱列
      for (let i = 3; i <= AREA - 3; i += 6) {
        column(c0 - 1.2, i); column(c1 + 1.2, i);
      }
      addCeiling('strips');
      water = { level: -0.2, x0: c0 + 0.28, z0: capN ? 0.9 : 0, x1: c1 - 0.28, z1: capS ? AREA - 0.9 : AREA, depth };
    }
    else if (type === 'steps') {
      // 阶梯圣殿: 南北向对称大台阶登上中央高台, N/S 开放, E/W 实墙
      const t = 0.4;
      [[-t, 0], [AREA, AREA + t]].forEach(([xa, xb]) => {
        boxes.push({ x0: xa, y0: 0, z0: 0, x1: xb, y1: WALL_H, z1: AREA, mat: 'tile' });
      });
      addFloor();
      // 台阶: z 从 5 起五级上到 1.5m, 中央平台, 再对称下
      const steps = 5, stepH = 0.3, stepD = 1.1;
      const platZ0 = 5 + steps * stepD, platZ1 = AREA - 5 - steps * stepD;
      for (let i = 0; i < steps; i++) {
        const y1 = (i + 1) * stepH;
        boxes.push({ x0: 2, y0: 0, z0: 5 + i * stepD, x1: AREA - 2, y1, z1: platZ1 + (steps - i) * stepD, mat: 'tile' });
      }
      // 中央高台
      boxes.push({ x0: 2, y0: 0, z0: platZ0, x1: AREA - 2, y1: steps * stepH, z1: platZ1, mat: 'tile' });
      // 高台圆柱阵
      for (let i = 5; i <= AREA - 5; i += 4.5) {
        column(i, AREA / 2 - 2.5, 0.5, WALL_H, steps * stepH);
        column(i, AREA / 2 + 2.5, 0.5, WALL_H, steps * stepH);
      }
      // 两侧水槽 (贴 E/W 墙)
      const depth = 0.5;
      boxes.push({ x0: 0, y0: -depth - F, z0: 0, x1: 2, y1: -depth, z1: AREA, mat: 'pool' });
      boxes.push({ x0: AREA - 2, y0: -depth - F, z0: 0, x1: AREA, y1: -depth, z1: AREA, mat: 'pool' });
      addCeiling('square');
      water = { level: -0.14, x0: 0, z0: 0, x1: AREA, z1: AREA, depth: 0.5, thin: true };
    }
    else if (type === 'bigpool') {
      const p = 4;
      addWalls(); addCeiling('square');
      boxes.push({ x0: 0, y0: -F, z0: 0, x1: AREA, y1: 0, z1: p, mat: 'tile' });
      boxes.push({ x0: 0, y0: -F, z0: AREA - p, x1: AREA, y1: 0, z1: AREA, mat: 'tile' });
      boxes.push({ x0: 0, y0: -F, z0: p, x1: p, y1: 0, z1: AREA - p, mat: 'tile' });
      boxes.push({ x0: AREA - p, y0: -F, z0: p, x1: AREA, y1: 0, z1: AREA - p, mat: 'tile' });
      const depth = 2.0;
      boxes.push({ x0: p, y0: -depth - F, z0: p, x1: AREA - p, y1: -depth, z1: AREA - p, mat: 'pool' });
      boxes.push({ x0: p, y0: -depth, z0: p, x1: AREA - p, y1: 0, z1: p + 0.3, mat: 'pool' });
      boxes.push({ x0: p, y0: -depth, z0: AREA - p - 0.3, x1: AREA - p, y1: 0, z1: AREA - p, mat: 'pool' });
      boxes.push({ x0: p, y0: -depth, z0: p, x1: p + 0.3, y1: 0, z1: AREA - p, mat: 'pool' });
      boxes.push({ x0: AREA - p - 0.3, y0: -depth, z0: p, x1: AREA - p, y1: 0, z1: AREA - p, mat: 'pool' });
      for (let i = 0; i < 4; i++) {
        boxes.push({ x0: p, y0: -0.4 * (i + 1), z0: p + i * 0.45, x1: p + 3, y1: -0.4 * i, z1: p + (i + 1) * 0.45, mat: 'pool' });
      }
      water = { level: -0.25, x0: p + 0.28, z0: p + 0.28, x1: AREA - p - 0.28, z1: AREA - p - 0.28, depth };
    }
    else if (type === 'deeppool') {
      const p = 2.5;
      addWalls(); addCeiling('square');
      boxes.push({ x0: 0, y0: -F, z0: 0, x1: AREA, y1: 0, z1: p, mat: 'tile' });
      boxes.push({ x0: 0, y0: -F, z0: AREA - p, x1: AREA, y1: 0, z1: AREA, mat: 'tile' });
      boxes.push({ x0: 0, y0: -F, z0: p, x1: p, y1: 0, z1: AREA - p, mat: 'tile' });
      boxes.push({ x0: AREA - p, y0: -F, z0: p, x1: AREA, y1: 0, z1: AREA - p, mat: 'tile' });
      const depth = 3.6;
      boxes.push({ x0: p, y0: -depth - F, z0: p, x1: AREA - p, y1: -depth, z1: AREA - p, mat: 'pool' });
      boxes.push({ x0: p, y0: -depth, z0: p, x1: AREA - p, y1: 0, z1: p + 0.3, mat: 'pool' });
      boxes.push({ x0: p, y0: -depth, z0: AREA - p - 0.3, x1: AREA - p, y1: 0, z1: AREA - p, mat: 'pool' });
      boxes.push({ x0: p, y0: -depth, z0: p, x1: p + 0.3, y1: 0, z1: AREA - p, mat: 'pool' });
      boxes.push({ x0: AREA - p - 0.3, y0: -depth, z0: p, x1: AREA - p, y1: 0, z1: AREA - p, mat: 'pool' });
      if (r(5) < 0.75) {
        const cx = AREA / 2 + (r(6) - 0.5) * 6, cz = AREA / 2 + (r(7) - 0.5) * 6;
        boxes.push({ x0: cx - 1.6, y0: -depth, z0: cz - 1.6, x1: cx + 1.6, y1: 0.02, z1: cz + 1.6, mat: 'tile' });
      }
      water = { level: -0.2, x0: p + 0.28, z0: p + 0.28, x1: AREA - p - 0.28, z1: AREA - p - 0.28, depth };
    }
    else if (type === 'shallow') {
      addWalls(); addCeiling('strips');
      const depth = 0.42;
      boxes.push({ x0: 0, y0: -depth - F, z0: 0, x1: AREA, y1: -depth, z1: AREA, mat: 'pool' });
      const dw = 7, d0 = (AREA - dw) / 2, d1 = (AREA + dw) / 2;
      [[d0, 0, d1, 3.5], [d0, AREA - 3.5, d1, AREA], [0, d0, 3.5, d1], [AREA - 3.5, d0, AREA, d1]].forEach(([x0, z0, x1, z1]) => {
        boxes.push({ x0, y0: -depth, z0, x1, y1: 0, z1, mat: 'tile' });
      });
      const n = 3 + (r(8) * 4) | 0;
      for (let i = 0; i < n; i++) {
        const w = 3 + r(10 + i) * 4.5, d = 3 + r(20 + i) * 4.5;
        const x = 3 + r(30 + i) * (AREA - 6 - w), z = 3 + r(40 + i) * (AREA - 6 - d);
        boxes.push({ x0: x, y0: -depth, z0: z, x1: x + w, y1: 0.02, z1: z + d, mat: 'tile' });
        if (r(60 + i) < 0.6) column(x + w / 2, z + d / 2, 0.55);
      }
      water = { level: -0.12, x0: 0.3, z0: 0.3, x1: AREA - 0.3, z1: AREA - 0.3, depth };
    }
    else if (type === 'corridor') {
      addFloor();
      const cw = 4.5, c0 = (AREA - cw) / 2, c1 = (AREA + cw) / 2;
      const lowH = 3.4;
      [[0, 0, c0, c0], [c1, 0, AREA, c0], [0, c1, c0, AREA], [c1, c1, AREA, AREA]].forEach(([x0, z0, x1, z1]) => {
        boxes.push({ x0, y0: 0, z0, x1, y1: lowH, z1, mat: 'tile' });
      });
      boxes.push({ x0: 0, y0: lowH, z0: 0, x1: AREA, y1: lowH + 0.4, z1: AREA, mat: 'conc' });
      if (r(9) < 0.5) {
        const depth = 0.18;
        boxes.push({ x0: c0, y0: -depth - F, z0: c0, x1: c1, y1: -depth, z1: c1, mat: 'pool' });
        water = { level: -0.06, x0: c0, z0: c0, x1: c1, z1: c1, depth };
        boxes.push({ x0: c0, y0: -F, z0: 0, x1: c1, y1: 0, z1: c0, mat: 'tile' });
        boxes.push({ x0: c0, y0: -F, z0: c1, x1: c1, y1: 0, z1: AREA, mat: 'tile' });
        boxes.push({ x0: 0, y0: -F, z0: c0, x1: c0, y1: 0, z1: c1, mat: 'tile' });
        boxes.push({ x0: c1, y0: -F, z0: c0, x1: AREA, y1: 0, z1: c1, mat: 'tile' });
      }
    }
    else { // pillars: 高柱林大厅
      addFloor();
      addWalls();
      addCeiling(r(11) < 0.5 ? 'square' : 'strips');
      const n = 4;
      const gap = AREA / (n + 1);
      for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) {
        if (r(50 + i * 7 + j) < 0.18) continue;
        column(i * gap, j * gap, 0.7);
      }
    }

    return { type, boxes, water };
  }

  return { setSeed, hash, areaType, describe, AREA, WALL_H };
})();
