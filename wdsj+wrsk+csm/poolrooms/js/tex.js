// ============ 程序化 PBR 贴图 (ImageData 高速版) ============
const Tex = (() => {
  const cache = {};

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function toTex(c, repeat = [1, 1], srgb = false) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
    if (srgb) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  function rnd(seed) {
    let s = seed;
    return () => (s = (s * 16807 + 12345) % 2147483647) / 2147483647;
  }

  // 值噪声 (平滑)
  function makeValueNoise(size, cells, seed) {
    const r = rnd(seed);
    const g = new Float32Array((cells + 1) * (cells + 1));
    for (let i = 0; i < g.length; i++) g[i] = r();
    const sm = t => t * t * (3 - 2 * t);
    return (x, y) => {
      const fx = (x / size) * cells, fy = (y / size) * cells;
      const ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = sm(fx - ix), ty = sm(fy - iy);
      const i0 = ix % (cells + 1), i1 = (ix + 1) % (cells + 1);
      const j0 = (iy % (cells + 1)) * (cells + 1), j1 = ((iy + 1) % (cells + 1)) * (cells + 1);
      const a = g[j0 + i0], b = g[j0 + i1], c2 = g[j1 + i0], d = g[j1 + i1];
      return a + (b - a) * tx + (c2 - a) * ty + (a - b - c2 + d) * tx * ty;
    };
  }

  // 通用: 按函数填充 ImageData
  function fillImage(size, fn) {
    const c = canvas(size, size), ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const [r, g, b] = fn(x, y);
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  // 高度图 → 法线贴图
  function heightToNormal(hf, size, strength = 2) {
    return fillImage(size, (x, y) => {
      const l = hf((x - 1 + size) % size, y), rr = hf((x + 1) % size, y);
      const u = hf(x, (y - 1 + size) % size), dd = hf(x, (y + 1) % size);
      let nx = (l - rr) * strength, ny = (u - dd) * strength, nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      return [(nx / len * 0.5 + 0.5) * 255, (ny / len * 0.5 + 0.5) * 255, (nz / len * 0.5 + 0.5) * 255];
    });
  }

  // ---------- 瓷砖组 ----------
  const TILE_N = 8, TSIZE = 512;
  // 每砖随机微倾斜 (贴砖不完美 → 反光角度差异)
  const tiltR = rnd(881);
  const tilts = [];
  for (let i = 0; i < TILE_N * TILE_N; i++) tilts.push([(tiltR() - 0.5) * 0.16, (tiltR() - 0.5) * 0.16]);

  function tileHeight(x, y) {
    const cell = TSIZE / TILE_N;
    const lx = x % cell, ly = y % cell;
    const gw = 5;
    if (lx < gw || ly < gw) return 0;
    const bx = (lx - gw) / (cell - gw), by = (ly - gw) / (cell - gw);
    const ti = Math.floor(y / cell) * TILE_N + Math.floor(x / cell);
    const [tx, ty] = tilts[ti % tilts.length];
    const dome = Math.sin(bx * Math.PI) * Math.sin(by * Math.PI);
    return 0.7 + dome * 0.22 + (bx - 0.5) * tx + (by - 0.5) * ty;
  }

  function tileAlbedo(tint = [0.92, 0.97, 0.99]) {
    const noise = makeValueNoise(TSIZE, 24, 5);
    const cell = TSIZE / TILE_N;
    // 每砖亮度
    const r = rnd(77);
    const bright = [];
    for (let i = 0; i < TILE_N * TILE_N; i++) bright.push(0.93 + r() * 0.09);
    return fillImage(TSIZE, (x, y) => {
      const h = tileHeight(x, y);
      if (h < 0.1) {
        const g = 105 + noise(x, y) * 30;
        return [g, g * 1.02, g * 1.03];
      }
      const ti = Math.floor(y / cell) * TILE_N + Math.floor(x / cell);
      const b = bright[ti] * (0.97 + noise(x * 2 % TSIZE, y * 2 % TSIZE) * 0.05);
      return [235 * tint[0] * b, 243 * tint[1] * b, 248 * tint[2] * b];
    });
  }

  function tileNormal() { return heightToNormal(tileHeight, TSIZE, 6); }

  function tileRoughness() {
    const noise = makeValueNoise(TSIZE, 20, 9);
    return fillImage(TSIZE, (x, y) => {
      const h = tileHeight(x, y);
      const rough = h < 0.1 ? 0.88 : 0.06 + noise(x, y) * 0.09;
      const v = rough * 255;
      return [v, v, v];
    });
  }

  function poolTileAlbedo() { return tileAlbedo([0.62, 0.88, 0.95]); }

  // ---------- 混凝土组 ----------
  const CSIZE = 512;
  let concN1 = null, concN2 = null;
  function concHeight(x, y) {
    if (!concN1) {
      concN1 = makeValueNoise(CSIZE, 12, 21);
      concN2 = makeValueNoise(CSIZE, 48, 22);
    }
    return concN1(x, y) * 0.7 + concN2(x, y) * 0.3;
  }
  function concreteAlbedo() {
    const r = rnd(31);
    const c = fillImage(CSIZE, (x, y) => {
      const v = 168 + concHeight(x, y) * 42 + (r() - 0.5) * 10;
      return [v, v, v * 0.985];
    });
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(120,120,118,0.5)';
    ctx.fillRect(0, CSIZE / 2 - 1, CSIZE, 2);
    ctx.fillRect(CSIZE / 2 - 1, 0, 2, CSIZE);
    return c;
  }
  function concreteNormal() { return heightToNormal(concHeight, CSIZE, 1.6); }
  function concreteRoughness() {
    return fillImage(CSIZE, (x, y) => {
      const v = (0.55 + concHeight(x, y) * 0.3) * 255;
      return [v, v, v];
    });
  }

  // ---------- 焦散动画帧 (轻量正弦干涉 + 异步生成) ----------
  const CAUS_SIZE = 128, CAUS_FRAMES = 16;
  function causticFrame(frame) {
    const t = frame / CAUS_FRAMES * Math.PI * 2;
    const S = CAUS_SIZE;
    const TAU = Math.PI * 2;
    return fillImage(S, (x, y) => {
      const u = x / S * TAU, v = y / S * TAU;
      // 三组行波干涉 (无缝平铺: 频率为整数)
      let w1 = Math.sin(u * 3 + t) + Math.sin(v * 2 - t * 1.3) + Math.sin((u + v) * 2 + t * 0.7);
      let w2 = Math.sin(u * 5 - t * 1.1) + Math.sin(v * 4 + t * 0.9) + Math.sin((u * 2 - v) * 1.5 - t);
      // 干涉亮线: 接近波峰交叠处
      let c = Math.pow(Math.max(0, 1 - Math.abs(w1) * 0.55), 3) + Math.pow(Math.max(0, 1 - Math.abs(w2) * 0.6), 3) * 0.7;
      c = Math.min(1, c);
      const b = c * 255;
      return [b * 0.75, b * 0.95, b];
    });
  }

  let causticTextures = null;
  function getCaustics() {
    if (!causticTextures) {
      // 先同步第一帧, 其余异步分帧生成
      causticTextures = [];
      const first = toTex(causticFrame(0), [1, 1]);
      for (let i = 0; i < CAUS_FRAMES; i++) causticTextures.push(first);
      let i = 1;
      const genNext = () => {
        if (i >= CAUS_FRAMES) return;
        causticTextures[i] = toTex(causticFrame(i), [1, 1]);
        i++;
        setTimeout(genNext, 30);
      };
      setTimeout(genNext, 100);
    }
    return causticTextures;
  }

  // ---------- 水波法线 ----------
  function waterNormalCanvas(seed = 91) {
    const S = 128;
    const n1 = makeValueNoise(S, 10, seed);
    const n2 = makeValueNoise(S, 28, seed + 1);
    const hf = (x, y) => n1(x, y) * 0.65 + n2(x, y) * 0.35;
    return heightToNormal(hf, S, 2.2);
  }

  // ---------- 缓存接口 ----------
  function get(name, repeat) {
    const key = name + '|' + (repeat ? repeat.join('x') : '');
    if (!cache[key]) {
      const makers = {
        tileAlbedo: () => toTex(tileAlbedo(), repeat, true),
        tileNormal: () => toTex(tileNormal(), repeat),
        tileRough: () => toTex(tileRoughness(), repeat),
        poolTileAlbedo: () => toTex(poolTileAlbedo(), repeat, true),
        concAlbedo: () => toTex(concreteAlbedo(), repeat, true),
        concNormal: () => toTex(concreteNormal(), repeat),
        concRough: () => toTex(concreteRoughness(), repeat),
        waterNormal: () => toTex(waterNormalCanvas(), repeat),
        waterNormal2: () => toTex(waterNormalCanvas(131), repeat),
      };
      cache[key] = makers[name]();
    }
    return cache[key];
  }

  return { get, getCaustics, CAUS_FRAMES };
})();
