// ============ 无限迷宫 (确定性程序生成) ============
// 单元格 3m, 街区 10x10 单元格 (30m)
// 街区边界为墙线(带缺口), 内部按模式生成, 保证全图连通
const Maze = (() => {
  const CELL = 3;        // 米/单元格
  const BLOCK = 10;      // 单元格/街区
  let seed = 1234;

  function setSeed(s) { seed = s >>> 0; }

  // 整数哈希 → [0,1)
  function hash(a, b, k = 0) {
    let h = (a | 0) * 374761393 + (b | 0) * 668265263 + (k | 0) * 2246822519 + seed * 40503;
    h = (h ^ (h >>> 13)) >>> 0;
    h = (h * 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  const mod = (n, m) => ((n % m) + m) % m;

  // ---------- 核心: 单元格是否为墙 ----------
  function isWall(i, k) {
    // 特殊区域覆盖 (出口房等) 由 overrides 决定
    const ov = overrideAt(i, k);
    if (ov !== null) return ov;

    const bi = Math.floor(i / BLOCK), bk = Math.floor(k / BLOCK);
    const ri = mod(i, BLOCK), rk = mod(k, BLOCK);

    // ----- 街区边界线 -----
    // 北墙线 rk==0 归属 (bi,bk); 西墙线 ri==0 归属 (bi,bk)
    if (ri === 0 && rk === 0) return true; // 角柱
    if (rk === 0) {
      // 横向边线: 两个 2 格宽缺口
      const g1 = 1 + Math.floor(hash(bi, bk, 101) * 6);   // 1..6
      const g2 = 1 + Math.floor(hash(bi, bk, 102) * 6);
      if ((ri >= g1 && ri <= g1 + 1) || (ri >= g2 && ri <= g2 + 1)) return false;
      return true;
    }
    if (ri === 0) {
      const g1 = 1 + Math.floor(hash(bi, bk, 201) * 6);
      const g2 = 1 + Math.floor(hash(bi, bk, 202) * 6);
      if ((rk >= g1 && rk <= g1 + 1) || (rk >= g2 && rk <= g2 + 1)) return false;
      return true;
    }

    // ----- 街区内部模式 -----
    const pat = Math.floor(hash(bi, bk, 301) * 4);
    if (pat === 0) {
      // 柱厅: 稀疏方柱
      return (ri % 3 === 0 && rk % 3 === 0);
    } else if (pat === 1) {
      // 四分房: 十字内墙带缺口
      const gp = 1 + Math.floor(hash(bi, bk, 302) * 7);
      const gq = 1 + Math.floor(hash(bi, bk, 303) * 7);
      if (ri === 5 && !(rk >= gp && rk <= gp + 1)) return true;
      if (rk === 5 && !(ri >= gq && ri <= gq + 1)) return true;
      return false;
    } else if (pat === 2) {
      // 密柱走廊: 2x2 柱网 (offset)
      return (ri % 2 === 1 && rk % 2 === 1 && hash(i, k, 304) < 0.75);
    } else {
      // 开阔厅: 偶发孤柱
      return hash(i, k, 305) < 0.045;
    }
  }

  // ---------- 特殊区域覆盖 ----------
  // overrides: Map "i,k" -> true(墙)/false(空)
  const overrides = new Map();
  function overrideAt(i, k) {
    const v = overrides.get(i + ',' + k);
    return v === undefined ? null : v;
  }
  function setOverride(i, k, wall) {
    overrides.set(i + ',' + k, wall);
  }
  function clearOverrides() { overrides.clear(); }

  // 开辟一个矩形房间 (内空外墙, 指定门)
  function carveRoom(ci, ck, w, h, doors) {
    for (let di = -1; di <= w; di++) for (let dk = -1; dk <= h; dk++) {
      const edge = di === -1 || dk === -1 || di === w || dk === h;
      setOverride(ci + di, ck + dk, edge);
    }
    doors.forEach(([di, dk]) => setOverride(ci + di, ck + dk, false));
  }

  // ---------- 坐标转换 ----------
  function worldToCell(x, z) {
    return [Math.floor(x / CELL), Math.floor(z / CELL)];
  }
  function cellCenter(i, k) {
    return [i * CELL + CELL / 2, k * CELL + CELL / 2];
  }

  // ---------- 碰撞 (世界坐标, 半径) ----------
  function collides(x, z, r = 0.35) {
    const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL);
    const k0 = Math.floor((z - r) / CELL), k1 = Math.floor((z + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) {
      if (!isWall(i, k)) continue;
      // AABB 精确: 墙块占满整格
      const wx0 = i * CELL, wx1 = wx0 + CELL, wz0 = k * CELL, wz1 = wz0 + CELL;
      const cx = Math.max(wx0, Math.min(x, wx1));
      const cz = Math.max(wz0, Math.min(z, wz1));
      if ((cx - x) * (cx - x) + (cz - z) * (cz - z) < r * r) return true;
    }
    return false;
  }

  // ---------- 视线 (格子 Bresenham) ----------
  function lineOfSight(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0;
    const dist = Math.hypot(dx, dz);
    const steps = Math.ceil(dist / (CELL * 0.4));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const [i, k] = worldToCell(x0 + dx * t, z0 + dz * t);
      if (isWall(i, k)) return false;
    }
    return true;
  }

  // ---------- A* 寻路 (格子) ----------
  function findPath(si, sk, ti, tk, maxNodes = 2600) {
    if (isWall(ti, tk)) {
      // 目标在墙里: 找邻近空格
      const near = nearestOpen(ti, tk, 3);
      if (!near) return null;
      ti = near[0]; tk = near[1];
    }
    const open = new Map(), closed = new Set();
    const startKey = si + ',' + sk;
    open.set(startKey, { i: si, k: sk, g: 0, f: heur(si, sk, ti, tk), parent: null });
    let count = 0;
    while (open.size && count < maxNodes) {
      count++;
      // 取最小 f
      let cur = null, curKey = null;
      for (const [key, n] of open) {
        if (!cur || n.f < cur.f) { cur = n; curKey = key; }
      }
      if (cur.i === ti && cur.k === tk) {
        const path = [];
        let n = cur;
        while (n) { path.push([n.i, n.k]); n = n.parent; }
        return path.reverse();
      }
      open.delete(curKey);
      closed.add(curKey);
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [di, dk] of dirs) {
        const ni = cur.i + di, nk = cur.k + dk;
        const key = ni + ',' + nk;
        if (closed.has(key) || isWall(ni, nk)) continue;
        const g = cur.g + 1;
        const ex = open.get(key);
        if (!ex || g < ex.g) {
          open.set(key, { i: ni, k: nk, g, f: g + heur(ni, nk, ti, tk), parent: cur });
        }
      }
    }
    return null;
  }
  function heur(i, k, ti, tk) { return Math.abs(i - ti) + Math.abs(k - tk); }

  function nearestOpen(i, k, maxR = 4) {
    if (!isWall(i, k)) return [i, k];
    for (let r = 1; r <= maxR; r++) {
      for (let di = -r; di <= r; di++) for (let dk = -r; dk <= r; dk++) {
        if (Math.max(Math.abs(di), Math.abs(dk)) !== r) continue;
        if (!isWall(i + di, k + dk)) return [i + di, k + dk];
      }
    }
    return null;
  }

  // 随机可达空格 (在环形范围内)
  function randomOpenCell(ci, ck, minR, maxR, salt = 0) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const a = hash(ci + attempt, ck, 400 + salt) * Math.PI * 2;
      const d = minR + hash(ci, ck + attempt, 500 + salt) * (maxR - minR);
      const i = Math.round(ci + Math.cos(a) * d);
      const k = Math.round(ck + Math.sin(a) * d);
      if (!isWall(i, k)) return [i, k];
    }
    return nearestOpen(ci + minR, ck, 6);
  }

  return {
    setSeed, hash, isWall, collides, lineOfSight, findPath,
    worldToCell, cellCenter, nearestOpen, randomOpenCell,
    carveRoom, setOverride, clearOverrides,
    CELL, BLOCK,
  };
})();
