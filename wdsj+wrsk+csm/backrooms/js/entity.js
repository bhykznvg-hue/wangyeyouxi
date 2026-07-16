// ============ 实体 AI: "游荡者" ============
// 状态机: patrol → investigate(听到声音) → search(丢失目标) → chase(看见玩家) → attack
// 严格规则: 不瞬移 / 不穿墙 — 全部移动走 A* 网格路径
const Entity = (() => {
  let group = null, parts = {};
  let state = 'dormant';   // dormant | patrol | investigate | search | chase | attack
  const pos = new THREE.Vector3(60, 0, 60);
  let facing = 0;
  let path = [];           // [[i,k],...]
  let pathIdx = 0;
  let repathT = 0;
  let waitT = 0;
  let lastKnown = null;    // 最后目击/听到的位置
  let loseSightT = 0;
  let stepT = 0;
  let vocalT = 5;
  let searchCount = 0;
  let onCatch = null;
  let active = false;      // dormant 解除后为真

  const WALK_SPD = 1.7;
  const CHASE_SPD = 4.15;   // 略慢于玩家冲刺(4.4), 快于走路(2.2)
  const VIEW_DIST = 26;
  const VIEW_FOV = Math.cos(1.05);  // ~120° 视野半角 60°
  const HEAR_WALK = 9;      // 听到走路的距离
  const HEAR_RUN = 26;      // 听到奔跑的距离
  const ATTACK_DIST = 1.15;

  // ---------- 建模: 不规则细条状人形 + 血盆大口的大头 ----------
  function build(scene) {
    group = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ map: Tex.get('entitySkin') });
    let _s = 97;
    const rnd = () => (_s = (_s * 16807 + 12345) % 2147483647) / 2147483647;
    const strip = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), skin);

    // 躯干: 三节错位歪斜的窄条堆叠
    const torso = new THREE.Group();
    torso.position.y = 1.18;
    for (let i = 0; i < 3; i++) {
      const s = strip(0.15 + rnd() * 0.1, 0.36, 0.11 + rnd() * 0.07);
      s.position.set((rnd() - 0.5) * 0.12, i * 0.32 + 0.18, (rnd() - 0.5) * 0.09);
      s.rotation.z = (rnd() - 0.5) * 0.2;
      s.rotation.y = (rnd() - 0.5) * 0.3;
      torso.add(s);
    }
    group.add(torso);
    parts.torso = torso;

    // 大头: 相对身体明显过大, 正脸只有一张张开的黑色巨口 + 獠牙
    const head = new THREE.Group();
    head.position.y = 2.22;
    const faceMat = new THREE.MeshLambertMaterial({ map: Tex.get('entityFace') });
    const skull = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.62, 0.52),
      [skin, skin, skin, skin, faceMat, skin]   // +z 面朝前
    );
    skull.position.y = 0.28;
    skull.rotation.z = 0.05;
    head.add(skull);
    // 细脖颈
    const neck = strip(0.06, 0.2, 0.06);
    neck.position.y = -0.04;
    head.add(neck);
    group.add(head);
    parts.head = head;

    // 四肢: 每肢两节细条, 微错位弯折, 手臂垂得极长
    [-1, 1].forEach(s => {
      const armP = new THREE.Group();
      armP.position.set(s * 0.24, 2.06, 0);
      const a1 = strip(0.065, 0.64, 0.065);
      a1.position.y = -0.31;
      a1.rotation.z = s * (0.1 + rnd() * 0.08);
      armP.add(a1);
      const a2 = strip(0.05, 0.62, 0.055);
      a2.position.set(s * 0.08, -0.9, 0.04);
      a2.rotation.z = -s * 0.1;
      a2.rotation.x = 0.12;
      armP.add(a2);
      group.add(armP);
      parts['arm' + s] = armP;

      const legP = new THREE.Group();
      legP.position.set(s * 0.12, 1.2, 0);
      const l1 = strip(0.085, 0.62, 0.09);
      l1.position.y = -0.3;
      l1.rotation.z = -s * (0.05 + rnd() * 0.05);
      legP.add(l1);
      const l2 = strip(0.07, 0.62, 0.08);
      l2.position.set(-s * 0.05, -0.9, -0.02);
      l2.rotation.x = -0.08;
      legP.add(l2);
      group.add(legP);
      parts['leg' + s] = legP;
    });

    // 地面暗影 (无实时阴影的替代)
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    group.visible = false;
    scene.add(group);
  }

  // ---------- 激活 ----------
  function activate(px, pz) {
    // 在玩家 45~65m 外的空格出生 (走过来, 不瞬移到面前)
    const [pi, pk] = Maze.worldToCell(px, pz);
    const cell = Maze.randomOpenCell(pi, pk, 16, 22, 7);
    const [wx, wz] = Maze.cellCenter(cell[0], cell[1]);
    pos.set(wx, 0, wz);
    group.position.copy(pos);
    group.visible = true;
    active = true;
    state = 'patrol';
    pickPatrolTarget(px, pz);
  }

  function setOnCatch(cb) { onCatch = cb; }

  // ---------- 感知 ----------
  function canSee(playerPos, crouching) {
    const d = pos.distanceTo(playerPos);
    const maxD = crouching ? VIEW_DIST * 0.72 : VIEW_DIST;
    if (d > maxD) return false;
    // 视野角
    const to = playerPos.clone().sub(pos);
    to.y = 0; to.normalize();
    const fwd = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
    if (to.dot(fwd) < VIEW_FOV && d > 2.2) return false;
    // 墙体遮挡
    return Maze.lineOfSight(pos.x, pos.z, playerPos.x, playerPos.z);
  }

  function hearNoise(playerPos, noiseLevel) {
    if (noiseLevel <= 0) return false;
    const d = pos.distanceTo(playerPos);
    const range = noiseLevel >= 1 ? HEAR_RUN : noiseLevel >= 0.5 ? HEAR_WALK : 3.5;
    return d < range;
  }

  // 外部大噪音事件 (电闸等)
  function noiseEvent(x, z, radius = 50) {
    if (!active) return;
    const d = Math.hypot(pos.x - x, pos.z - z);
    if (d < radius && state !== 'chase') {
      lastKnown = new THREE.Vector3(x, 0, z);
      toInvestigate();
    }
  }

  // ---------- 寻路 ----------
  function pathTo(tx, tz) {
    const [si, sk] = Maze.worldToCell(pos.x, pos.z);
    const [ti, tk] = Maze.worldToCell(tx, tz);
    const p = Maze.findPath(si, sk, ti, tk);
    if (p && p.length > 1) {
      path = p; pathIdx = 1;
      return true;
    }
    return false;
  }

  function followPath(dt, speed) {
    if (pathIdx >= path.length) return true;
    const [ti, tk] = path[pathIdx];
    const [tx, tz] = Maze.cellCenter(ti, tk);
    const dx = tx - pos.x, dz = tz - pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.25) {
      pathIdx++;
      return pathIdx >= path.length;
    }
    const mv = speed * dt;
    const nx = pos.x + (dx / d) * mv;
    const nz = pos.z + (dz / d) * mv;
    // 双保险: 网格碰撞检查 (绝不穿墙)
    if (!Maze.collides(nx, pos.z, 0.3)) pos.x = nx;
    if (!Maze.collides(pos.x, nz, 0.3)) pos.z = nz;
    const targetFacing = Math.atan2(dx, dz);
    let df = targetFacing - facing;
    while (df > Math.PI) df -= Math.PI * 2;
    while (df < -Math.PI) df += Math.PI * 2;
    facing += df * Math.min(1, dt * 6);
    return false;
  }

  // ---------- 状态切换 ----------
  function pickPatrolTarget(px, pz) {
    // 巡逻: 在玩家周围 60m 圈内游荡 (保持存在感但不作弊)
    const [pi, pk] = Maze.worldToCell(
      px !== undefined ? px : pos.x, pz !== undefined ? pz : pos.z);
    const cell = Maze.randomOpenCell(pi + ((Math.random() * 10) | 0), pk + ((Math.random() * 10) | 0), 6, 18, (Math.random() * 100) | 0);
    if (cell) {
      const [wx, wz] = Maze.cellCenter(cell[0], cell[1]);
      if (!pathTo(wx, wz)) waitT = 1;
    } else waitT = 2;
  }

  function toInvestigate() {
    state = 'investigate';
    if (lastKnown) pathTo(lastKnown.x, lastKnown.z);
    Sfx.entityVocal(pos.x, pos.z, false);
  }

  function toChase() {
    if (state !== 'chase') {
      Sfx.stinger(1);
      Sfx.entityVocal(pos.x, pos.z, true);
      Sfx.chaseLoop(true);
      Sfx.heartbeat(1.7);
      Game.setDanger(1);
    }
    state = 'chase';
    loseSightT = 0;
    repathT = 0;
  }

  function toSearch() {
    state = 'search';
    searchCount = 3 + ((Math.random() * 3) | 0);
    Sfx.chaseLoop(false);
    Sfx.heartbeat(1);
    Game.setDanger(0.5);
    waitT = 0.5;
  }

  function toPatrol() {
    state = 'patrol';
    Sfx.chaseLoop(false);
    Sfx.stopHeartbeat();
    Game.setDanger(0);
    pickPatrolTarget();
  }

  // ---------- 主更新 ----------
  function update(dt, playerPos, playerNoise, playerCrouching) {
    if (!active) return;

    const dToPlayer = pos.distanceTo(playerPos);
    const seen = canSee(playerPos, playerCrouching);
    const heard = hearNoise(playerPos, playerNoise);

    // ----- 状态逻辑 -----
    if (state === 'patrol') {
      if (seen) { lastKnown = playerPos.clone(); toChase(); }
      else if (heard) { lastKnown = playerPos.clone(); toInvestigate(); }
      else {
        if (waitT > 0) { waitT -= dt; }
        else if (followPath(dt, WALK_SPD)) {
          waitT = 1.5 + Math.random() * 3;
          pickPatrolTarget(playerPos.x, playerPos.z);
        } else {
          moveAnim(dt, false);
        }
      }
    }
    else if (state === 'investigate') {
      if (seen) { lastKnown = playerPos.clone(); toChase(); }
      else if (heard) { lastKnown = playerPos.clone(); pathTo(lastKnown.x, lastKnown.z); }
      if (state === 'investigate') {
        if (followPath(dt, WALK_SPD * 1.35)) toSearch();
        else moveAnim(dt, false);
      }
    }
    else if (state === 'search') {
      if (seen) { lastKnown = playerPos.clone(); toChase(); }
      else if (heard) { lastKnown = playerPos.clone(); toInvestigate(); }
      else {
        if (waitT > 0) {
          waitT -= dt;
          // 原地环视
          facing += Math.sin(performance.now() * 0.001) * dt * 1.2;
        } else if (followPath(dt, WALK_SPD)) {
          searchCount--;
          if (searchCount <= 0) toPatrol();
          else {
            waitT = 1 + Math.random() * 1.5;
            // 在 lastKnown 周围随机搜索点
            const [li, lk] = Maze.worldToCell(lastKnown.x, lastKnown.z);
            const cell = Maze.randomOpenCell(li, lk, 2, 6, (Math.random() * 100) | 0);
            if (cell) {
              const [wx, wz] = Maze.cellCenter(cell[0], cell[1]);
              pathTo(wx, wz);
            }
          }
        } else moveAnim(dt, false);
      }
    }
    else if (state === 'chase') {
      if (seen) {
        lastKnown = playerPos.clone();
        loseSightT = 0;
      } else {
        loseSightT += dt;
        if (loseSightT > 5) { toSearch(); return; }
      }
      // 追踪: 频繁重寻路到最后已知位置
      repathT -= dt;
      if (repathT <= 0) {
        repathT = 0.4;
        pathTo(lastKnown.x, lastKnown.z);
      }
      const arrived = followPath(dt, CHASE_SPD);
      moveAnim(dt, true);
      if (arrived && !seen && loseSightT > 1.2) toSearch();
      // 攻击判定
      if (dToPlayer < ATTACK_DIST && seen) {
        state = 'attack';
        attack();
      }
    }

    // ----- 声音 -----
    stepT -= dt;
    const moving = pathIdx < path.length && waitT <= 0;
    if (moving && stepT <= 0) {
      stepT = state === 'chase' ? 0.3 : 0.62;
      Sfx.entityStep(pos.x, pos.z, state === 'chase');
    }
    vocalT -= dt;
    if (vocalT <= 0) {
      vocalT = 6 + Math.random() * 9;
      if (state !== 'chase' && dToPlayer < 40) Sfx.entityVocal(pos.x, pos.z, false);
    }

    // 危险氛围 (距离压迫)
    if (state === 'chase') Game.setDanger(Math.min(1, 1.4 - dToPlayer / 20));
    else if (dToPlayer < 14 && state !== 'dormant') Game.setDanger(Math.min(0.5, 1 - dToPlayer / 14));

    group.position.copy(pos);
    group.rotation.y = facing;
  }

  function attack() {
    Sfx.caught();
    if (onCatch) onCatch();
    // 攻击后退场 → 重新巡逻 (由 Game 复位)
  }

  function retreat() {
    // 被抓后: 实体走远 (瞬移例外仅发生在玩家昏迷时 — 叙事上合理)
    const [pi, pk] = Maze.worldToCell(pos.x, pos.z);
    const cell = Maze.randomOpenCell(pi, pk, 20, 28, 55);
    if (cell) {
      const [wx, wz] = Maze.cellCenter(cell[0], cell[1]);
      pos.set(wx, 0, wz);
    }
    state = 'patrol';
    Sfx.chaseLoop(false);
    Sfx.stopHeartbeat();
    Game.setDanger(0);
    pickPatrolTarget();
  }

  // ---------- 动画 ----------
  function moveAnim(dt, chase) {
    const t = performance.now() * 0.001;
    const freq = chase ? 9 : 4.2;
    const step = Math.sin(t * freq);
    const stiff = Math.sign(step) * Math.pow(Math.abs(step), 0.5);
    parts['leg-1'].rotation.x = stiff * 0.55;
    parts['leg1'].rotation.x = -stiff * 0.55;
    parts['arm-1'].rotation.x = -stiff * (chase ? 0.7 : 0.3);
    parts['arm1'].rotation.x = stiff * (chase ? 0.7 : 0.3);
    parts.torso.rotation.z = Math.sin(t * freq * 2.1) * 0.03;
    parts.head.rotation.z = Math.sin(t * 7.7) * 0.07;
    if (chase) {
      parts.torso.rotation.x = 0.18;
      parts.head.rotation.x = 0.05;
    } else {
      parts.torso.rotation.x = 0;
      parts.head.rotation.x = 0.22;
    }
  }

  return {
    build, activate, update, noiseEvent, setOnCatch, retreat,
    get state() { return state; },
    get position() { return pos; },
    get isActive() { return active; },
  };
})();
