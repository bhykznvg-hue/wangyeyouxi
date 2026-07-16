// ============ 场景构建 (区块化渲染无限迷宫) ============
const World = (() => {
  const CEIL_H = 5.0;          // 天花板高 5m
  const CHUNK = 10;            // 单元格/渲染区块 (30m)
  const VIEW_R = 2;            // 区块可视半径
  let scene = null;
  let chunks = new Map();      // "cx,cz" -> {group, lights[]}
  let mats = {};
  const interactables = [];    // {pos, radius, label, onUse, enabled}
  let lightPool = [];          // 动态点光源池 (只点亮玩家附近)
  const LIGHT_SPACING = 2;     // 每 2 格一盏灯 (6m)

  function init(sc) {
    scene = sc;
    mats.wall = Tex.mat('wallpaper', {}, [1, 1]);
    mats.wallPlain = Tex.mat('wallpaper', {}, [1, 1]);
    mats.carpet = Tex.mat('carpet', {}, [1, 1]);
    mats.ceil = Tex.mat('ceilingTile', {}, [1, 1]);
    mats.lightPanel = new THREE.MeshBasicMaterial({ map: Tex.get('lightPanel'), color: 0xfff8dc });
    mats.lightPanelOff = new THREE.MeshLambertMaterial({ color: 0x5a564a });
    // 灯光池: 12 盏顶部射灯复用 (唯一主光源, 不投射实时阴影)
    for (let i = 0; i < 12; i++) {
      const l = new THREE.SpotLight(0xffe2a0, 0, 17, 1.12, 0.85, 1.15);
      l.position.set(0, CEIL_H - 0.15, 0);
      const tgt = new THREE.Object3D();
      scene.add(tgt);
      l.target = tgt;
      scene.add(l);
      lightPool.push(l);
    }
  }

  // ---------- 区块网格 ----------
  function key(cx, cz) { return cx + ',' + cz; }

  function buildChunk(cx, cz) {
    const group = new THREE.Group();
    const interacts = [];
    const i0 = cx * CHUNK, k0 = cz * CHUNK;
    const size = CHUNK * Maze.CELL;
    const ox = i0 * Maze.CELL, oz = k0 * Maze.CELL;

    // 地板 / 天花
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mats.carpet.clone());
    floor.material.map = Tex.get('carpet', [CHUNK, CHUNK]);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(ox + size / 2, 0, oz + size / 2);
    group.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mats.ceil.clone());
    ceil.material.map = Tex.get('ceilingTile', [CHUNK * 2, CHUNK * 2]);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(ox + size / 2, CEIL_H, oz + size / 2);
    group.add(ceil);

    // 墙体: 合并到单个 BufferGeometry
    const pos = [], nrm = [], uv = [], idx = [];
    let vi = 0;
    const C = Maze.CELL;
    for (let i = i0; i < i0 + CHUNK; i++) for (let k = k0; k < k0 + CHUNK; k++) {
      if (!Maze.isWall(i, k)) continue;
      const x0 = i * C, x1 = x0 + C, z0 = k * C, z1 = z0 + C;
      // 4 个面, 仅暴露面
      const faces = [
        { open: !Maze.isWall(i, k - 1), v: [[x1, z0], [x0, z0]], n: [0, 0, -1] }, // 北
        { open: !Maze.isWall(i, k + 1), v: [[x0, z1], [x1, z1]], n: [0, 0, 1] },  // 南
        { open: !Maze.isWall(i - 1, k), v: [[x0, z0], [x0, z1]], n: [-1, 0, 0] }, // 西
        { open: !Maze.isWall(i + 1, k), v: [[x1, z1], [x1, z0]], n: [1, 0, 0] },  // 东
      ];
      for (const f of faces) {
        if (!f.open) continue;
        const [[ax, az], [bx, bz]] = f.v;
        pos.push(ax, 0, az, bx, 0, bz, bx, CEIL_H, bz, ax, CEIL_H, az);
        for (let j = 0; j < 4; j++) nrm.push(f.n[0], f.n[1], f.n[2]);
        // uv: 高 5m → 壁纸重复 (踢脚线只在底部一段)
        const rep = CEIL_H / 2.5;
        uv.push(0, 0, 1, 0, 1, rep, 0, rep);
        idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
        vi += 4;
      }
    }
    if (pos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      const wallMat = new THREE.MeshLambertMaterial({ map: Tex.get('wallpaper', [1, 1]) });
      const mesh = new THREE.Mesh(g, wallMat);
      group.add(mesh);
    }

    // 荧光灯板 (每 LIGHT_SPACING 格, 在空格上方)
    const lights = [];
    for (let i = i0; i < i0 + CHUNK; i++) for (let k = k0; k < k0 + CHUNK; k++) {
      if (Maze.isWall(i, k)) continue;
      if (((i % LIGHT_SPACING) + LIGHT_SPACING) % LIGHT_SPACING !== 0) continue;
      if (((k % LIGHT_SPACING) + LIGHT_SPACING) % LIGHT_SPACING !== 0) continue;
      const [wx, wz] = Maze.cellCenter(i, k);
      const dead = Maze.hash(i, k, 777) < 0.07; // 少数坏灯
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 1.24),
        dead ? mats.lightPanelOff : mats.lightPanel);
      panel.position.set(wx, CEIL_H - 0.05, wz);
      group.add(panel);
      if (!dead) lights.push({ x: wx, z: wz, i, k, flicker: Maze.hash(i, k, 778) < 0.1 });
    }

    // 环境道具与污渍装饰
    decorate(group, i0, k0, interacts);

    scene.add(group);
    return { group, lights, interacts, cx, cz };
  }

  // ---------- 装饰 ----------
  function decorate(group, i0, k0, interacts) {
    for (let i = i0; i < i0 + CHUNK; i++) for (let k = k0; k < k0 + CHUNK; k++) {
      if (Maze.isWall(i, k)) continue;
      const h = Maze.hash(i, k, 900);
      const [wx, wz] = Maze.cellCenter(i, k);
      // 地毯污渍贴片
      if (h < 0.05) {
        const stain = new THREE.Mesh(
          new THREE.CircleGeometry(0.5 + Maze.hash(i, k, 901) * 0.8, 10),
          new THREE.MeshLambertMaterial({ color: 0x4a4228, transparent: true, opacity: 0.4 })
        );
        stain.rotation.x = -Math.PI / 2;
        stain.position.set(wx + (Maze.hash(i, k, 902) - 0.5) * 2, 0.012, wz + (Maze.hash(i, k, 903) - 0.5) * 2);
        group.add(stain);
      }
      // 粉笔记号 (墙面, 引导性)
      if (h > 0.05 && h < 0.075) {
        const dirs = [[1, 0, -Math.PI / 2], [-1, 0, Math.PI / 2], [0, 1, Math.PI], [0, -1, 0]];
        for (const [di, dk, ry] of dirs) {
          if (Maze.isWall(i + di, k + dk)) {
            const kind = Math.floor(Maze.hash(i, k, 904) * 3);
            const mark = new THREE.Mesh(
              new THREE.PlaneGeometry(0.4, 0.4),
              new THREE.MeshLambertMaterial({ map: Tex.get('chalkMark', undefined, kind), transparent: true })
            );
            const C = Maze.CELL;
            mark.position.set(
              (i + di) * C + C / 2 - di * (C / 2 + 0.01),
              1.5,
              (k + dk) * C + C / 2 - dk * (C / 2 + 0.01)
            );
            mark.rotation.y = ry;
            group.add(mark);
            break;
          }
        }
      }
      // 杏仁水 (稀疏散落, 喝过不再刷新)
      if (h > 0.075 && h < 0.087) {
        spawnAlmondWater(group, i, k, interacts);
      }
    }
  }

  // ---------- 杏仁水 ----------
  const drunkBottles = new Set();
  function buildBottle() {
    const b = new THREE.Group();
    const glass = new THREE.MeshLambertMaterial({ color: 0xdfe9e2, transparent: true, opacity: 0.85 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.2, 10), glass);
    body.position.y = 0.1;
    b.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.05, 0.06, 10), glass);
    neck.position.y = 0.23;
    b.add(neck);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 10),
      new THREE.MeshLambertMaterial({ color: 0x8a2f26 }));
    cap.position.y = 0.275;
    b.add(cap);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.085, 10),
      new THREE.MeshLambertMaterial({ color: 0xe8e0c2 }));
    label.position.y = 0.1;
    b.add(label);
    return b;
  }
  function spawnAlmondWater(parent, i, k, interacts) {
    const bkey = i + ',' + k;
    if (drunkBottles.has(bkey)) return null;
    const [wx, wz] = Maze.cellCenter(i, k);
    const x = wx + (Maze.hash(i, k, 911) - 0.5) * 1.4;
    const z = wz + (Maze.hash(i, k, 912) - 0.5) * 1.4;
    const bottle = buildBottle();
    bottle.position.set(x, 0, z);
    bottle.rotation.y = Maze.hash(i, k, 913) * Math.PI * 2;
    parent.add(bottle);
    const it = addInteract(x, 0.35, z, 1.6, '喝下杏仁水', () => {
      drunkBottles.add(bkey);
      parent.remove(bottle);
      removeInteract(it);
      Sfx.drink();
      Player.restoreStamina();
      Game.notify('杏仁的甜味。手不抖了，呼吸也稳了。（体力恢复）', 3);
    });
    if (interacts) interacts.push(it);
    return it;
  }
  // 固定投放 (出生点附近保底, 常驻 scene)
  function placeAlmondWater(i, k) {
    return spawnAlmondWater(scene, i, k, null);
  }

  // ---------- 区块管理 ----------
  function update(px, pz) {
    const ccx = Math.floor(px / (CHUNK * Maze.CELL));
    const ccz = Math.floor(pz / (CHUNK * Maze.CELL));
    // 卸载
    for (const [k, ch] of chunks) {
      if (Math.abs(ch.cx - ccx) > VIEW_R + 1 || Math.abs(ch.cz - ccz) > VIEW_R + 1) {
        scene.remove(ch.group);
        ch.group.traverse(o => {
          if (o.geometry) o.geometry.dispose();
        });
        if (ch.interacts) ch.interacts.forEach(removeInteract);
        chunks.delete(k);
      }
    }
    // 加载 (每帧最多 1 个新区块)
    for (let r = 0; r <= VIEW_R; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const k = key(ccx + dx, ccz + dz);
        if (!chunks.has(k)) {
          chunks.set(k, buildChunk(ccx + dx, ccz + dz));
          return; // 分帧
        }
      }
    }
  }

  // ---------- 动态灯光池 ----------
  let flickerT = 0;
  function updateLights(dt, px, pz, t) {
    // 收集附近灯
    const near = [];
    for (const ch of chunks.values()) {
      for (const l of ch.lights) {
        const d2 = (l.x - px) * (l.x - px) + (l.z - pz) * (l.z - pz);
        if (d2 < 500) near.push({ l, d2 });
      }
    }
    near.sort((a, b) => a.d2 - b.d2);
    for (let i = 0; i < lightPool.length; i++) {
      const pl = lightPool[i];
      if (i < near.length) {
        const { l } = near[i];
        pl.position.set(l.x, CEIL_H - 0.15, l.z);
        pl.target.position.set(l.x, 0, l.z);
        pl.target.updateMatrixWorld();
        let intensity = 1.1;
        if (l.flicker) {
          // 闪烁灯
          const ph = t * 7 + l.i * 13.7;
          if (Math.sin(ph) * Math.sin(ph * 1.7 + 2) > 0.55) intensity = 0.12 + Math.random() * 0.28;
        }
        pl.intensity = intensity;
      } else {
        pl.intensity = 0;
      }
    }
  }

  // ---------- 交互 ----------
  function addInteract(x, y, z, radius, label, onUse) {
    const it = { pos: new THREE.Vector3(x, y, z), radius, label, onUse, enabled: true };
    interactables.push(it);
    return it;
  }
  function removeInteract(it) {
    const idx = interactables.indexOf(it);
    if (idx >= 0) interactables.splice(idx, 1);
  }
  function nearestInteract(pos, dir) {
    let best = null, bestScore = Infinity;
    for (const it of interactables) {
      if (!it.enabled) continue;
      const d = it.pos.distanceTo(pos);
      if (d > it.radius) continue;
      const to = it.pos.clone().sub(pos).normalize();
      const dot = to.dot(dir);
      if (dot < 0.2) continue;
      const score = d * (2 - dot);
      if (score < bestScore) { bestScore = score; best = it; }
    }
    return best;
  }

  // ---------- 特殊设施 ----------
  // 出口房 (在迷宫中开辟)
  function placeExitRoom(i, k) {
    Maze.carveRoom(i, k, 4, 4, [[-1, 2]]);
    const C = Maze.CELL;
    // 出口大门 (房间东墙中央)
    const doorX = (i + 4) * C + C / 2 - (C / 2 + 0.08);
    const doorZ = (k + 2) * C;
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 2.4, 1.6),
      new THREE.MeshLambertMaterial({ map: Tex.get('exitDoor') })
    );
    door.position.set(doorX, 1.2, doorZ);
    scene.add(door);
    // EXIT 灯牌 (常亮)
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.3, 0.9),
      new THREE.MeshBasicMaterial({ color: 0x38b054 })
    );
    sign.position.set(doorX - 0.1, 2.9, doorZ);
    scene.add(sign);
    const signLight = new THREE.PointLight(0x40c860, 1.4, 8, 1.8);
    signLight.position.set(doorX - 0.5, 2.7, doorZ);
    scene.add(signLight);
    World.exitSignLight = signLight;
    World.exitDoorPos = new THREE.Vector3(doorX, 1.2, doorZ);
    const it = addInteract(doorX, 1.2, doorZ, 2.4, '推开安全门', () => {
      Game.tryExit();
    });
    return { x: doorX, z: doorZ };
  }

  // 纸条
  function placeNote(i, k, noteIdx) {
    const [wx, wz] = Maze.cellCenter(i, k);
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.32),
      new THREE.MeshLambertMaterial({ map: Tex.get('paper') })
    );
    paper.rotation.x = -Math.PI / 2;
    paper.rotation.z = Maze.hash(i, k, 950) * 3;
    paper.position.set(wx, 0.015, wz);
    scene.add(paper);
    const it = addInteract(wx, 0.4, wz, 1.6, '捡起纸条', () => {
      Game.showNote(noteIdx);
    });
  }

  return {
    init, update, updateLights,
    addInteract, removeInteract, nearestInteract,
    placeExitRoom, placeNote, placeAlmondWater,
    interactables,
    CEIL_H,
  };
})();
