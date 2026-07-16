// ============ 世界管理 (区域加载/网格/碰撞/焦散/光柱) ============
const World = (() => {
  let scene = null;
  const areas = new Map();   // "ax,az" -> {group, boxes, water, waterMesh, caustic}
  const VIEW_R = 2;          // 区域可视半径 (24m 区域 → 5x5 = 120m)
  let mats = {};
  let causticTexIdx = 0, causticTimer = 0;
  let causticMat = null;

  function init(sc) {
    scene = sc;
    const rep = 4;
    // 釉面瓷砖 (清漆层 = 湿润高光)
    mats.tile = new THREE.MeshPhysicalMaterial({
      map: Tex.get('tileAlbedo', [rep, rep]),
      normalMap: Tex.get('tileNormal', [rep, rep]),
      roughnessMap: Tex.get('tileRough', [rep, rep]),
      roughness: 1.0,
      metalness: 0.0,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.3,
    });
    mats.pool = new THREE.MeshPhysicalMaterial({
      map: Tex.get('poolTileAlbedo', [rep * 2, rep * 2]),
      normalMap: Tex.get('tileNormal', [rep * 2, rep * 2]),
      roughnessMap: Tex.get('tileRough', [rep * 2, rep * 2]),
      roughness: 1.0,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.1,
    });
    mats.conc = new THREE.MeshStandardMaterial({
      map: Tex.get('concAlbedo', [2, 2]),
      normalMap: Tex.get('concNormal', [2, 2]),
      roughnessMap: Tex.get('concRough', [2, 2]),
      roughness: 1.0,
      metalness: 0.0,
      envMapIntensity: 0.5,
    });
    causticMat = new THREE.MeshBasicMaterial({
      map: Tex.getCaustics()[0],
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  function key(ax, az) { return ax + ',' + az; }

  // ---------- 构建区域 ----------
  function buildArea(ax, az) {
    const desc = Gen.describe(ax, az);
    const group = new THREE.Group();
    const ox = ax * Gen.AREA, oz = az * Gen.AREA;

    // 按材质合并 boxes
    const byMat = { tile: [], pool: [], conc: [] };
    desc.boxes.forEach(b => byMat[b.mat].push(b));

    for (const matName in byMat) {
      const list = byMat[matName];
      if (!list.length) continue;
      const geos = [];
      list.forEach(b => {
        const w = b.x1 - b.x0, h = b.y1 - b.y0, d = b.z1 - b.z0;
        if (w <= 0 || h <= 0 || d <= 0) return;
        const g = new THREE.BoxGeometry(w, h, d);
        // 世界坐标 UV (三向映射简化: 按面积缩放 UV)
        g.translate(ox + b.x0 + w / 2, b.y0 + h / 2, oz + b.z0 + d / 2);
        geos.push(g);
      });
      if (!geos.length) continue;
      const merged = mergeGeos(geos);
      remapWorldUV(merged, 0.25); // 1 unit = 0.25 uv (4m per repeat)
      const mesh = new THREE.Mesh(merged, mats[matName]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    // 水面
    let waterMesh = null, caustic = null, floorOverlay = null;
    if (desc.water && !desc.water.thin) {
      const w = desc.water;
      waterMesh = Water.makeWaterMesh(ox + w.x0, oz + w.z0, ox + w.x1, oz + w.z1, w.level, w.depth);
      group.add(waterMesh);
      // 焦散面 (池底上方 2cm)
      const cw = w.x1 - w.x0, cd = w.z1 - w.z0;
      const cg = new THREE.PlaneGeometry(cw, cd);
      cg.rotateX(-Math.PI / 2);
      caustic = new THREE.Mesh(cg, causticMat.clone());
      caustic.material.map = Tex.getCaustics()[0];
      caustic.material.opacity = Math.min(0.42, 0.2 + w.depth * 0.08);
      caustic.position.set(ox + w.x0 + cw / 2, w.level - w.depth + 0.03, oz + w.z0 + cd / 2);
      const uvs = cg.attributes.uv;
      for (let i = 0; i < uvs.count; i++) {
        uvs.setXY(i, uvs.getX(i) * cw / 3.2, uvs.getY(i) * cd / 3.2);
      }
      group.add(caustic);
    } else if (desc.water && desc.water.thin) {
      // 薄水槽 (阶梯殿两侧): 仅水面, 无焦散
      const w = desc.water;
      waterMesh = Water.makeWaterMesh(ox + 0.1, oz + 0.1, ox + 2, oz + Gen.AREA - 0.1, w.level, w.depth);
      group.add(waterMesh);
      const wm2 = Water.makeWaterMesh(ox + Gen.AREA - 2, oz + 0.1, ox + Gen.AREA - 0.1, oz + Gen.AREA - 0.1, w.level, w.depth);
      group.add(wm2);
      if (!group.userData.extraWater) group.userData.extraWater = [];
      group.userData.extraWater.push(wm2);
    }

    // 湿滑地面镜面叠加层 (整区)
    floorOverlay = Water.makeFloorOverlay(ox, oz, ox + Gen.AREA, oz + Gen.AREA, 0);
    group.add(floorOverlay);

    scene.add(group);
    return { group, boxes: desc.boxes, water: desc.water, waterMesh, caustic, floorOverlay, ox, oz, type: desc.type };
  }

  // 合并 BoxGeometry
  function mergeGeos(geos) {
    let vCount = 0, iCount = 0;
    geos.forEach(g => {
      vCount += g.attributes.position.count;
      iCount += g.index.count;
    });
    const pos = new Float32Array(vCount * 3);
    const nrm = new Float32Array(vCount * 3);
    const uv = new Float32Array(vCount * 2);
    const idx = new (vCount > 65535 ? Uint32Array : Uint16Array)(iCount);
    let vo = 0, io = 0;
    geos.forEach(g => {
      pos.set(g.attributes.position.array, vo * 3);
      nrm.set(g.attributes.normal.array, vo * 3);
      uv.set(g.attributes.uv.array, vo * 2);
      const gi = g.index.array;
      for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
      vo += g.attributes.position.count;
      io += gi.length;
      g.dispose();
    });
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    merged.setIndex(new THREE.BufferAttribute(idx, 1));
    return merged;
  }

  // 世界坐标三向 UV 映射
  function remapWorldUV(geo, scale) {
    const pos = geo.attributes.position;
    const nrm = geo.attributes.normal;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i));
      let u, v;
      if (ny > 0.5) { u = pos.getX(i); v = pos.getZ(i); }
      else if (nx > 0.5) { u = pos.getZ(i); v = pos.getY(i); }
      else { u = pos.getX(i); v = pos.getY(i); }
      uv.setXY(i, u * scale, v * scale);
    }
  }

  // ---------- 区域管理 ----------
  function update(px, pz) {
    const ax = Math.floor(px / Gen.AREA), az = Math.floor(pz / Gen.AREA);
    for (const [k, a] of areas) {
      if (Math.abs(a.ax - ax) > VIEW_R + 1 || Math.abs(a.az - az) > VIEW_R + 1) {
        scene.remove(a.group);
        if (a.waterMesh) Water.removeWaterMesh(a.waterMesh);
        if (a.group.userData.extraWater) a.group.userData.extraWater.forEach(m => Water.removeWaterMesh(m));
        if (a.floorOverlay) Water.removeFloorOverlay(a.floorOverlay);
        a.group.traverse(o => { if (o.geometry && o !== a.waterMesh && o !== a.floorOverlay) o.geometry.dispose(); });
        areas.delete(k);
      }
    }
    for (let r = 0; r <= VIEW_R; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const k = key(ax + dx, az + dz);
        if (!areas.has(k)) {
          const a = buildArea(ax + dx, az + dz);
          a.ax = ax + dx; a.az = az + dz;
          areas.set(k, a);
          return; // 分帧
        }
      }
    }
  }

  // ---------- 焦散动画 ----------
  function updateCaustics(dt) {
    causticTimer += dt;
    if (causticTimer > 0.07) {
      causticTimer = 0;
      causticTexIdx = (causticTexIdx + 1) % Tex.CAUS_FRAMES;
      const tex = Tex.getCaustics()[causticTexIdx];
      for (const a of areas.values()) {
        if (a.caustic) a.caustic.material.map = tex;
      }
    }
  }

  // ---------- 碰撞 & 地面查询 ----------
  // 玩家胶囊: 半径 r, 从脚 y 到 y+1.7
  function collide(px, py, pz, r = 0.32) {
    // 查玩家所在与相邻区域的 boxes
    const ax = Math.floor(px / Gen.AREA), az = Math.floor(pz / Gen.AREA);
    let push = null;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const a = areas.get(key(ax + dx, az + dz));
      if (!a) continue;
      for (const b of a.boxes) {
        const x0 = a.ox + b.x0 - r, x1 = a.ox + b.x1 + r;
        const z0 = a.oz + b.z0 - r, z1 = a.oz + b.z1 + r;
        // 垂直重叠判定 (身体 0.25~1.6, 允许脚下台阶)
        if (py + 1.6 < b.y0 || py + 0.55 > b.y1) continue;
        if (px > x0 && px < x1 && pz > z0 && pz < z1) {
          // 推出最近的面
          const dxl = px - x0, dxr = x1 - px;
          const dzl = pz - z0, dzr = z1 - pz;
          const m = Math.min(dxl, dxr, dzl, dzr);
          if (!push || m < push.m) {
            push = { m, x: m === dxl ? x0 : m === dxr ? x1 : px, z: m === dzl ? z0 : m === dzr ? z1 : pz,
                     axis: (m === dxl || m === dxr) ? 'x' : 'z' };
          }
        }
      }
    }
    return push;
  }

  // 地面高度: 玩家 xz 处, 低于 py+0.6 的最高面
  function groundHeight(px, pz, py) {
    const ax = Math.floor(px / Gen.AREA), az = Math.floor(pz / Gen.AREA);
    let g = -50;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const a = areas.get(key(ax + dx, az + dz));
      if (!a) continue;
      for (const b of a.boxes) {
        if (px < a.ox + b.x0 || px > a.ox + b.x1 || pz < a.oz + b.z0 || pz > a.oz + b.z1) continue;
        if (b.y1 <= py + 0.55 && b.y1 > g) g = b.y1;
      }
    }
    return g;
  }

  // 水深查询: 返回 {level, depth} 或 null
  function waterAt(px, pz) {
    const ax = Math.floor(px / Gen.AREA), az = Math.floor(pz / Gen.AREA);
    const a = areas.get(key(ax, az));
    if (!a || !a.water) return null;
    const w = a.water;
    if (px >= a.ox + w.x0 && px <= a.ox + w.x1 && pz >= a.oz + w.z0 && pz <= a.oz + w.z1) {
      return { level: w.level, depth: w.depth, floor: w.level - w.depth };
    }
    return null;
  }

  return {
    init, update, updateCaustics, collide, groundHeight, waterAt,
    get areas() { return areas; },
  };
})();
