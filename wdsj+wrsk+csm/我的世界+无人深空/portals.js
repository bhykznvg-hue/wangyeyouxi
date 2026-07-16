// ============ 传送门系统 (Portal 2 机制 · 支持跨星球无缝穿越) ============
const Portals = (() => {
  const PW = 0.45, PH = 0.95;              // 椭圆半宽 / 半高
  const COLORS = { blue: 0x3fc0ff, orange: 0xff9a2a };
  const PASS_DEPTH = 4;                     // 穿墙放行深度 (方块层数)
  const FLIP = new THREE.Matrix4().makeRotationY(Math.PI);

  let renderer = null, camera = null;
  let gunActive = false, gunNotified = false;
  const portals = { blue: null, orange: null };
  let projectiles = [];
  let sparks = [];
  let extraBeams = [];                      // 穿门采矿光束的远端线段
  let remoteGlow = null;
  let time = 0;
  let fireCooldown = 0;

  // 复用对象
  const vcam = new THREE.PerspectiveCamera();
  const _m4 = new THREE.Matrix4(), _m4b = new THREE.Matrix4(), _m3 = new THREE.Matrix3();
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
  const _plane = new THREE.Plane();
  const _frustum = new THREE.Frustum();
  const _sphere = new THREE.Sphere();
  const _size = new THREE.Vector2();

  // ---------- 几何: 穹面 (贴近平面, 玩家穿越时鼓起避免近平面裁切) ----------
  function makeDomeGeometry(rings = 10, segs = 40) {
    const pos = [], idx = [];
    for (let j = 0; j <= rings; j++) {
      const r = j / rings;
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pos.push(Math.cos(a) * r, Math.sin(a) * r, (1 - r * r));
      }
    }
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < segs; i++) {
        const i2 = (i + 1) % segs;
        const a = j * segs + i, b = j * segs + i2, c = (j + 1) * segs + i, d = (j + 1) * segs + i2;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    return geo;
  }

  let domeGeo = null, ringGeo = null;

  const VIEW_VERT = `
    varying vec2 vLocal;
    void main() {
      vLocal = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const VIEW_FRAG = `
    uniform sampler2D uMap;
    uniform vec2 uRes;
    uniform vec3 uColor;
    uniform float uTime;
    uniform float uMode;
    varying vec2 vLocal;
    void main() {
      float r = length(vLocal);
      if (r > 1.0) discard;
      vec3 col;
      if (uMode > 0.5) {
        col = texture2D(uMap, gl_FragCoord.xy / uRes).rgb;
      } else {
        float a = atan(vLocal.y, vLocal.x);
        float sw = sin(a * 5.0 - uTime * 3.2 + r * 16.0) * 0.5 + 0.5;
        float core = smoothstep(0.95, 0.1, r);
        col = uColor * (0.05 + sw * 0.09);
        col = mix(col, vec3(0.008, 0.010, 0.016), core * 0.85);
      }
      float rim = smoothstep(0.80, 1.0, r);
      float pulse = 0.85 + 0.15 * sin(uTime * 4.0 + r * 6.0);
      col = mix(col, uColor * (1.35 * pulse), rim);
      gl_FragColor = vec4(col, 1.0);
    }`;
  const RING_VERT = `
    varying vec2 vP;
    void main() {
      vP = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const RING_FRAG = `
    uniform vec3 uColor;
    uniform float uTime;
    varying vec2 vP;
    void main() {
      float r = length(vP);
      float t = clamp((r - 1.0) / 0.5, 0.0, 1.0);
      float a = (1.0 - t) * (1.0 - t);
      a *= 0.55 + 0.25 * sin(uTime * 4.0 + r * 10.0);
      gl_FragColor = vec4(uColor * 1.5, a);
    }`;

  function init(rendererRef, cameraRef) {
    renderer = rendererRef;
    camera = cameraRef;
    domeGeo = makeDomeGeometry();
    ringGeo = new THREE.RingGeometry(1.0, 1.5, 48);
  }

  function rtSize() {
    renderer.getDrawingBufferSize(_size);
    return {
      w: Math.min(2048, Math.max(256, Math.floor(_size.x * 0.75))),
      h: Math.min(2048, Math.max(256, Math.floor(_size.y * 0.75))),
    };
  }

  function makeTargets() {
    const { w, h } = rtSize();
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
    return [new THREE.WebGLRenderTarget(w, h, opts), new THREE.WebGLRenderTarget(w, h, opts)];
  }

  function handleResize() {
    const { w, h } = rtSize();
    forEachPortal(P => P.rts.forEach(rt => rt.setSize(w, h)));
  }

  function forEachPortal(fn) {
    if (portals.blue) fn(portals.blue);
    if (portals.orange) fn(portals.orange);
  }
  function other(P) { return P.color === 'blue' ? portals.orange : portals.blue; }
  function pairActive() { return !!(portals.blue && portals.orange); }

  // ---------- 传送门枪切换 ----------
  function toggleGun(force) {
    gunActive = force !== undefined ? force : !gunActive;
    const label = UI.$('tool-name');
    if (label) label.textContent = gunActive ? '多功能工具 · 传送门装置' : '多功能工具 · 采矿光束';
    const pi = UI.$('portal-indicator');
    if (pi) pi.classList.toggle('hidden', !gunActive);
    Sfx.uiClick();
    if (gunActive) {
      Player.stopMine();
      if (!gunNotified) {
        gunNotified = true;
        UI.notify('传送门装置已激活', '左键 蓝色传送门 · 右键 橙色传送门 · 可跨星球连接');
      }
    }
    updateIndicator();
  }

  function updateIndicator() {
    const b = UI.$('pi-blue'), o = UI.$('pi-orange');
    if (b) b.classList.toggle('placed', !!portals.blue);
    if (o) o.classList.toggle('placed', !!portals.orange);
  }

  // ---------- 发射 ----------
  function fire(color) {
    if (!gunActive || Game.state !== 'planet' || fireCooldown > 0) return;
    fireCooldown = 0.22;
    const eye = new THREE.Vector3(Player.pos.x, Player.pos.y + Player.EYE, Player.pos.z);
    const dir = Player.getDir();
    Sfx.portalShoot(color === 'orange');

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshBasicMaterial({ color: COLORS[color] })
    );
    const light = new THREE.PointLight(COLORS[color], 1.4, 9);
    mesh.add(light);
    mesh.position.copy(eye).addScaledVector(dir, 0.6);
    World.scene.add(mesh);
    projectiles.push({ color, world: World, pos: eye.clone(), dir: dir.clone(), speed: 90, life: 2.5, mesh });
  }

  // ---------- 射线穿越传送门 (采矿光束 / 放置 / 投射物 共用) ----------
  function planeHit(P, o, d, maxT) {
    const denom = d.dot(P.n);
    if (denom > -1e-5) return null;                    // 只允许从正面进入
    const t = _v1.copy(P.pos).sub(o).dot(P.n) / denom;
    if (t < 0.001 || t > maxT) return null;
    _v2.copy(o).addScaledVector(d, t).applyMatrix4(P.inv);
    const e = (_v2.x / PW) ** 2 + (_v2.y / PH) ** 2;
    if (e > 1.0) return null;
    return t;
  }

  function castThrough(world, origin, dir, maxDist, maxHops = 2) {
    const segments = [];
    let w = world, o = origin.clone(), d = dir.clone(), remaining = maxDist, hops = 0;
    while (true) {
      const hit = w.raycast(o, d, remaining);
      const hitT = hit ? hit.dist : remaining;
      let bestT = Infinity, bestP = null;
      if (pairActive() && hops < maxHops) {
        forEachPortal(P => {
          if (P.world !== w) return;
          const t = planeHit(P, o, d, hitT + 0.05);
          if (t !== null && t < bestT) { bestT = t; bestP = P; }
        });
      }
      if (bestP) {
        const pt = o.clone().addScaledVector(d, bestT);
        segments.push({ world: w, a: o.clone(), b: pt });
        const Q = other(bestP);
        _m4.copy(Q.matrix).multiply(FLIP).multiply(bestP.inv);
        _m3.setFromMatrix4(_m4);
        o = pt.applyMatrix4(_m4).addScaledVector(Q.n, 0.01);
        d = d.applyMatrix3(_m3).normalize();
        w = Q.world;
        remaining -= bestT;
        hops++;
        if (remaining <= 0.01) return { world: w, hit: null, pos: o.clone(), dir: d.clone(), segments, hops };
        continue;
      }
      const end = o.clone().addScaledVector(d, hitT);
      segments.push({ world: w, a: o.clone(), b: end });
      return { world: w, hit, pos: end, dir: d.clone(), segments, hops };
    }
  }

  // ---------- 放置校验与开门 ----------
  let lastFizzleReason = '';

  function validateAt(world, center, m, n) {
    const support = [];
    for (const s of [-0.5, 0.5]) {
      const sc = _v1.copy(center).addScaledVector(m, s).addScaledVector(n, -0.5);
      const fc = _v2.copy(center).addScaledVector(m, s).addScaledVector(n, 0.5);
      const scc = [Math.floor(sc.x), Math.floor(sc.y), Math.floor(sc.z)];
      if (scc[1] < 0 || scc[1] >= world.HEIGHT) { lastFizzleReason = 'bounds'; return null; }
      const b = world.getBlock(scc[0], scc[1], scc[2]);
      if (b === 0 || BLOCKS[b].cross || BLOCKS[b].translucent) { lastFizzleReason = 'support:' + b; return null; }
      if (world.isSolid(fc.x, fc.y, fc.z)) { lastFizzleReason = 'front-blocked'; return null; }
      support.push(scc);
    }
    return support;
  }

  function overlapOK(color, world, center) {
    const otherP = portals[color === 'blue' ? 'orange' : 'blue'];
    if (otherP && otherP.world === world) {
      const l = center.clone().applyMatrix4(otherP.inv);
      if (Math.abs(l.z) < 0.6 && Math.abs(l.x) < PW * 2.1 && Math.abs(l.y) < PH * 2.1) {
        lastFizzleReason = 'overlap';
        return false;
      }
    }
    const same = portals[color];
    if (same && same.world === world && same.pos.distanceTo(center) < 0.6) {
      lastFizzleReason = 'same-spot';
      return false;
    }
    return true;
  }

  function tryPlace(color, world, hit, hitPoint, shotDir) {
    const def = BLOCKS[hit.block];
    const n = new THREE.Vector3(hit.face[0], hit.face[1], hit.face[2]);
    if (def.cross || def.translucent || n.lengthSq() === 0) return fizzleAt(world, hitPoint, color, 'surface:' + hit.block);

    // 主轴: 墙面竖直向上; 地面/天花板取水平射击方向 (Portal 2 规则)
    let majors;
    if (n.y === 0) {
      majors = [new THREE.Vector3(0, 1, 0)];
    } else {
      const h = new THREE.Vector3(shotDir.x, 0, shotDir.z);
      if (h.lengthSq() < 1e-6) h.set(-Math.sin(Player.yaw), 0, -Math.cos(Player.yaw));
      const mx = new THREE.Vector3(Math.sign(h.x) || 1, 0, 0);
      const mz = new THREE.Vector3(0, 0, Math.sign(h.z) || 1);
      majors = Math.abs(h.x) > Math.abs(h.z) ? [mx, mz] : [mz, mx];
    }

    // 候选位置: 命中点 + 沿主/副轴微调贴合 (Portal 2 的自动贴合)
    const offsets = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    lastFizzleReason = '';
    for (const m of majors) {
      const right = m.clone().cross(n);
      const cM = Math.round(hitPoint.dot(m));
      const cV = Math.floor(hitPoint.dot(right)) + 0.5;
      const cN = Math.round(hitPoint.dot(n));
      for (const [dm, dv] of offsets) {
        const center = new THREE.Vector3()
          .addScaledVector(m, cM + dm).addScaledVector(right, cV + dv).addScaledVector(n, cN);
        const support = validateAt(world, center, m, n);
        if (!support) continue;
        if (!overlapOK(color, world, center)) continue;
        openPortal(color, world, center, n, m, right, support);
        return true;
      }
    }
    return fizzleAt(world, hitPoint, color, lastFizzleReason || 'no-fit');
  }

  function openPortal(color, world, center, n, up, right, support) {
    destroyPortal(color, false);

    const pos = center.clone().addScaledVector(n, 0.015);
    const matrix = new THREE.Matrix4().makeBasis(right, up, n).setPosition(pos);
    const group = new THREE.Group();
    group.position.copy(pos);
    group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, n));
    group.scale.set(PW * 0.01, PH * 0.01, 1);

    const viewMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) },
        uColor: { value: new THREE.Color(COLORS[color]) },
        uTime: { value: 0 },
        uMode: { value: 0 },
      },
      vertexShader: VIEW_VERT, fragmentShader: VIEW_FRAG,
      side: THREE.DoubleSide,
    });
    const viewMesh = new THREE.Mesh(domeGeo, viewMat);
    viewMesh.scale.set(1, 1, 0.02);
    group.add(viewMesh);

    const ringMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(COLORS[color]) }, uTime: { value: 0 } },
      vertexShader: RING_VERT, fragmentShader: RING_FRAG,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.z = 0.002;
    group.add(ringMesh);

    world.scene.add(group);

    const passCells = new Set();
    support.forEach(([x, y, z]) => {
      for (let d = 0; d < PASS_DEPTH; d++)
        passCells.add((x - n.x * d) + ',' + (y - n.y * d) + ',' + (z - n.z * d));
    });

    portals[color] = {
      color, hex: COLORS[color], world, planetIdx: world.planetIdx,
      pos, n: n.clone(), up: up.clone(), right: right.clone(),
      matrix, inv: matrix.clone().invert(),
      group, viewMesh, viewMat, ringMat,
      supportCells: support, passCells,
      rts: makeTargets(), rtFlip: 0, hasView: false,
      openT: 0, bump: 0.02, engaged: false, prevLocal: null,
    };
    forEachPortal(P => { P.prevLocal = null; });
    refreshAnchors();
    updateIndicator();
    Sfx.portalOpen(color === 'orange');
    burstSparks(world.scene, pos.clone().addScaledVector(n, 0.1), COLORS[color], 10);
  }

  function destroyPortal(color, withFx = true) {
    const P = portals[color];
    if (!P) return;
    P.world.scene.remove(P.group);
    P.viewMat.dispose();
    P.ringMat.dispose();
    P.rts.forEach(rt => rt.dispose());
    portals[color] = null;
    if (withFx) {
      Sfx.portalFizzle();
      burstSparks(P.world.scene, P.pos.clone().addScaledVector(P.n, 0.1), P.hex, 14);
    }
    refreshAnchors();
    updateIndicator();
  }

  function refreshAnchors() {
    Worlds.cache.forEach(w => {
      const list = [];
      forEachPortal(P => { if (P.world === w) list.push({ x: P.pos.x, z: P.pos.z, r: 3 }); });
      w.setAnchors(list);
    });
  }

  function fizzleAt(world, point, color, reason = '') {
    lastFizzleReason = reason;
    Sfx.portalFizzle();
    burstSparks(world.scene, point, COLORS[color] || 0xffffff, 8);
    return false;
  }

  // ---------- 火花粒子 ----------
  function burstSparks(scene, point, hex, count) {
    const mat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.9 });
    for (let i = 0; i < count; i++) {
      const s = 0.05 + Math.random() * 0.06;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat);
      mesh.position.copy(point);
      scene.add(mesh);
      sparks.push({
        mesh, scene, life: 0.4 + Math.random() * 0.35,
        vel: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6),
      });
    }
  }

  // ---------- 碰撞放行 ----------
  function isPassable(x, y, z) {
    if (!pairActive()) return false;
    const key = x + ',' + y + ',' + z;
    let pass = false;
    forEachPortal(P => {
      if (!pass && P.engaged && P.world === World && P.passCells.has(key)) pass = true;
    });
    return pass;
  }

  // ---------- 穿越判定 ----------
  function checkTeleport() {
    if (!pairActive() || Game.state !== 'planet' || Player.dead) return;
    const eye = _v1.set(Player.pos.x, Player.pos.y + Player.EYE, Player.pos.z);
    const list = [portals.blue, portals.orange];
    for (const P of list) {
      if (P.world !== World) { P.prevLocal = null; continue; }
      const local = eye.clone().applyMatrix4(P.inv);
      const prev = P.prevLocal;
      P.prevLocal = local;
      if (!prev) continue;
      if (prev.z > 0 && local.z <= 0) {
        // 在跨越点插值取椭圆坐标
        const k = prev.z / Math.max(1e-6, prev.z - local.z);
        const lx = prev.x + (local.x - prev.x) * k;
        const ly = prev.y + (local.y - prev.y) * k;
        if ((lx / PW) ** 2 + (ly / PH) ** 2 <= 1.35) {
          doTeleport(P);
          return;
        }
      }
    }
  }

  function doTeleport(P) {
    const Q = other(P);
    _m4.copy(Q.matrix).multiply(FLIP).multiply(P.inv);
    _m3.setFromMatrix4(_m4);

    const eye = new THREE.Vector3(Player.pos.x, Player.pos.y + Player.EYE, Player.pos.z).applyMatrix4(_m4);
    const vel = Player.vel.clone().applyMatrix3(_m3);
    const dir = Player.getDir().applyMatrix3(_m3).normalize();

    if (Q.world !== World) Game.switchWorld(Q.planetIdx, true);

    Player.pos.set(eye.x, eye.y - Player.EYE, eye.z).addScaledVector(Q.n, 0.06);
    Player.vel.copy(vel);
    Player.yaw = Math.atan2(-dir.x, -dir.z);
    Player.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    // 出地面/天花板门时确保有最低脱出速度, 避免卡在门口
    const outSpeed = Player.vel.dot(Q.n);
    if (outSpeed < 1.2) Player.vel.addScaledVector(Q.n, 1.2 - outSpeed);

    forEachPortal(p => { p.prevLocal = null; p.engaged = false; });
    Q.engaged = true;
    Player.syncCamera();
    Sfx.portalPass();
  }

  // ---------- 主更新 ----------
  function update(dt) {
    time += dt;
    fireCooldown = Math.max(0, fireCooldown - dt);

    // 支撑面被破坏 → 熄灭
    forEachPortal(P => {
      for (const [x, y, z] of P.supportCells) {
        const b = P.world.getBlock(x, y, z);
        if (b === 0 || BLOCKS[b].cross) { destroyPortal(P.color, true); break; }
      }
    });

    // 开门动画 + 穹面鼓起
    const eyeNow = _v3.set(Player.pos.x, Player.pos.y + Player.EYE, Player.pos.z);
    forEachPortal(P => {
      P.openT = Math.min(1, P.openT + dt * 3.5);
      const t = P.openT;
      const k = 1 + 1.7 * Math.pow(t - 1, 3) + 0.7 * Math.pow(t - 1, 2); // easeOutBack
      P.group.scale.set(PW * Math.max(0.01, k), PH * Math.max(0.01, k), 1);
      P.viewMat.uniforms.uTime.value = time;
      P.ringMat.uniforms.uTime.value = time;
      P.viewMat.uniforms.uMode.value = (pairActive() && P.hasView) ? 1 : 0;
      // 玩家贴近且成对时, 穹面向外鼓起, 防止近平面穿帮
      let bumpTarget = 0.02;
      if (pairActive() && P.world === World && Game.state === 'planet') {
        const l = eyeNow.clone().applyMatrix4(P.inv);
        if (Math.abs(l.x) < PW + 0.6 && Math.abs(l.y) < PH + 0.6 && l.z > -0.3 && l.z < 1.5) bumpTarget = 0.5;
      }
      P.bump += (bumpTarget - P.bump) * Math.min(1, dt * 10);
      P.viewMesh.scale.set(1, 1, P.bump);
    });

    // 玩家穿墙放行状态机
    if (Game.state === 'planet') {
      const center = _v1.set(Player.pos.x, Player.pos.y + 0.9, Player.pos.z);
      forEachPortal(P => {
        if (!pairActive() || P.world !== World) { P.engaged = false; return; }
        const l = center.clone().applyMatrix4(P.inv);
        const inE = (l.x / (PW + 0.35)) ** 2 + (l.y / (PH + 0.35)) ** 2 < 1;
        if (!P.engaged) {
          if (inE && l.z > -0.15 && l.z < 1.4) P.engaged = true;
        } else {
          const inWide = (l.x / (PW + 0.8)) ** 2 + (l.y / (PH + 0.8)) ** 2 < 1 && l.z < 1.7 && l.z > -(PASS_DEPTH + 1.2);
          if (!inWide) P.engaged = false;
        }
      });
      checkTeleport();
    } else {
      forEachPortal(P => { P.engaged = false; P.prevLocal = null; });
    }

    // 投射物
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i];
      pr.life -= dt;
      if (pr.life <= 0) { pr.mesh.parent && pr.mesh.parent.remove(pr.mesh); projectiles.splice(i, 1); continue; }
      const step = pr.speed * dt;
      const res = castThrough(pr.world, pr.pos, pr.dir, step, 1);
      if (res.hops > 0) {
        // 穿过传送门, 移到目标世界继续飞
        pr.mesh.parent && pr.mesh.parent.remove(pr.mesh);
        res.world.scene.add(pr.mesh);
      }
      pr.world = res.world;
      pr.dir.copy(res.dir);
      if (res.hit) {
        pr.mesh.parent && pr.mesh.parent.remove(pr.mesh);
        projectiles.splice(i, 1);
        // 命中处若在已有传送门面内 → 熄灭 (不能门上开门)
        let onPortal = false;
        forEachPortal(P => {
          if (P.world !== res.world) return;
          const l = res.pos.clone().applyMatrix4(P.inv);
          if (Math.abs(l.z) < 0.35 && (l.x / (PW + 0.2)) ** 2 + (l.y / (PH + 0.2)) ** 2 < 1) onPortal = true;
        });
        if (onPortal) fizzleAt(res.world, res.pos, pr.color);
        else tryPlace(pr.color, res.world, res.hit, res.pos, res.dir);
      } else {
        pr.pos.copy(res.pos);
        pr.mesh.position.copy(pr.pos);
      }
    }

    // 火花
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      s.vel.y -= 12 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += dt * 8; s.mesh.rotation.y += dt * 6;
      if (s.life <= 0) { s.scene.remove(s.mesh); sparks.splice(i, 1); }
    }

    // 远端世界区块保活 (跨星球传送门的另一端)
    forEachPortal(P => {
      if (P.world !== World) P.world.update(P.pos.x, P.pos.z, 4);
    });

    // 传送门嗡鸣 (随距离渐变)
    if (portals.blue || portals.orange) {
      if (!Sfx.hasLoop('portal')) Sfx.portalHumLoop();
      let minD = Infinity;
      forEachPortal(P => {
        if (P.world === World) minD = Math.min(minD, P.pos.distanceTo(Player.pos));
      });
      const vol = minD === Infinity ? 0 : Math.max(0, 1 - minD / 14) * 0.09;
      Sfx.setLoopParam('portal', l => l.gain.gain.setTargetAtTime(Math.max(vol, 0.0001), 0, 0.2));
    } else if (Sfx.hasLoop('portal')) {
      Sfx.stopLoop('portal');
    }
  }

  // ---------- 渲染 ----------
  function applyObliqueClip(proj, clipPlaneCam) {
    const clip = new THREE.Vector4(clipPlaneCam.normal.x, clipPlaneCam.normal.y, clipPlaneCam.normal.z, clipPlaneCam.constant);
    const q = new THREE.Vector4(
      (Math.sign(clip.x) + proj.elements[8]) / proj.elements[0],
      (Math.sign(clip.y) + proj.elements[9]) / proj.elements[5],
      -1.0,
      (1.0 + proj.elements[10]) / proj.elements[14]
    );
    clip.multiplyScalar(2.0 / clip.dot(q));
    proj.elements[2] = clip.x;
    proj.elements[6] = clip.y;
    proj.elements[10] = clip.z + 1.0;
    proj.elements[14] = clip.w;
  }

  function setResUniforms(w, h) {
    forEachPortal(P => P.viewMat.uniforms.uRes.value.set(w, h));
  }

  function portalVisible(P, cam) {
    if (P.world !== World) return false;
    const d = _v1.copy(cam.position).sub(P.pos);
    const dist = d.length();
    if (dist > 90) return false;
    if (d.dot(P.n) < 0 && dist > 2.5) return false;
    _m4b.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_m4b);
    _sphere.set(P.pos, Math.max(PW, PH) * 1.6);
    return _frustum.intersectsSphere(_sphere);
  }

  function render(rendererRef, scene, cam) {
    const r = rendererRef || renderer;
    if (pairActive()) {
      cam.updateMatrixWorld();
      cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      const list = [portals.blue, portals.orange];
      for (const P of list) {
        if (!portalVisible(P, cam)) continue;
        const Q = other(P);
        // 虚拟相机 = 主相机经 P→Q 变换
        _m4.copy(Q.matrix).multiply(FLIP).multiply(P.inv);
        _m4b.multiplyMatrices(_m4, cam.matrixWorld);
        _m4b.decompose(vcam.position, vcam.quaternion, vcam.scale);
        vcam.updateMatrixWorld(true);
        // 斜近裁剪面: 剔除目标门背后的几何
        const proj = vcam.projectionMatrix.copy(cam.projectionMatrix);
        _plane.setFromNormalAndCoplanarPoint(Q.n, _v1.copy(Q.pos).addScaledVector(Q.n, 0.03));
        _plane.applyMatrix4(vcam.matrixWorldInverse);
        applyObliqueClip(proj, _plane);
        vcam.projectionMatrixInverse.copy(proj).invert();
        // 双缓冲渲染, 防止纹理反馈环
        P.rtFlip ^= 1;
        const rt = P.rts[P.rtFlip];
        setResUniforms(rt.width, rt.height);
        const qVis = Q.viewMesh.visible;
        Q.viewMesh.visible = false;
        r.setRenderTarget(rt);
        r.render(Q.world.scene, vcam);
        Q.viewMesh.visible = qVis;
        P.viewMat.uniforms.uMap.value = rt.texture;
        P.hasView = true;
      }
      r.setRenderTarget(null);
      r.getDrawingBufferSize(_size);
      setResUniforms(_size.x, _size.y);
    }
    r.setRenderTarget(null);
    r.render(scene, cam);
  }

  // ---------- 采矿光束远端可视化 ----------
  function setBeamPath(segments, glowPoint, glowWorld) {
    clearBeamPath();
    if (!segments || segments.length <= 1) {
      if (glowPoint && glowWorld && remoteGlow) { /* 首段由 Player 绘制 */ }
      return;
    }
    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];
      const geo = new THREE.BufferGeometry().setFromPoints([seg.a, seg.b]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffb54a, transparent: true, opacity: 0.9 }));
      line.frustumCulled = false;
      seg.world.scene.add(line);
      extraBeams.push({ line, scene: seg.world.scene });
    }
    if (glowPoint && glowWorld && glowWorld !== World) {
      remoteGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.85 })
      );
      remoteGlow.position.copy(glowPoint);
      remoteGlow.scale.setScalar(0.8 + Math.random() * 0.5);
      glowWorld.scene.add(remoteGlow);
    }
  }

  function clearBeamPath() {
    extraBeams.forEach(b => { b.scene.remove(b.line); b.line.geometry.dispose(); b.line.material.dispose(); });
    extraBeams = [];
    if (remoteGlow) {
      remoteGlow.parent && remoteGlow.parent.remove(remoteGlow);
      remoteGlow.geometry.dispose(); remoteGlow.material.dispose();
      remoteGlow = null;
    }
  }

  // ---------- 重置 ----------
  function reset() {
    destroyPortal('blue', false);
    destroyPortal('orange', false);
    projectiles.forEach(p => p.mesh.parent && p.mesh.parent.remove(p.mesh));
    projectiles = [];
    sparks.forEach(s => s.scene.remove(s.mesh));
    sparks = [];
    clearBeamPath();
    if (gunActive) toggleGun(false);
  }

  return {
    init, reset, toggleGun, fire, update, render, handleResize,
    isPassable, castThrough, setBeamPath, clearBeamPath,
    get gunActive() { return gunActive; },
    get pair() { return pairActive(); },
    get lastFizzleReason() { return lastFizzleReason; },
  };
})();
