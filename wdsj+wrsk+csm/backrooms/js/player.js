// ============ 玩家控制器 ============
const Player = (() => {
  let camera = null;
  const pos = new THREE.Vector3(0, 0, 0);
  let yaw = 0, pitch = 0;
  const keys = {};
  const EYE_STAND = 1.62;    // 1.7m 身高的眼高
  const EYE_CROUCH = 0.95;
  let eyeH = EYE_STAND;
  let crouching = false;

  // 体力
  let stamina = 1;
  let exhausted = false;

  // 噪音等级 (供 AI 感知): 0 静止, 0.3 蹲行, 0.5 走, 1 跑
  let noiseLevel = 0;

  let bobT = 0, bobAmp = 0;
  let inputEnabled = true;
  const _dir = new THREE.Vector3();

  function init(cam) { camera = cam; }

  function spawn(x, z, yw = 0) {
    pos.set(x, 0, z);
    yaw = yw; pitch = 0;
    stamina = 1; exhausted = false;
  }

  function setKey(code, down) { keys[code] = down; }
  function onMouseMove(mx, my) {
    if (!inputEnabled) return;
    yaw -= mx * 0.0021;
    pitch -= my * 0.0021;
    pitch = Math.max(-1.4, Math.min(1.4, pitch));
  }

  function toggleCrouch() {
    crouching = !crouching;
  }

  function restoreStamina() {
    stamina = 1;
    exhausted = false;
  }

  function lookDir() {
    _dir.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    return _dir;
  }

  function update(dt) {
    // 蹲起过渡
    eyeH += ((crouching ? EYE_CROUCH : EYE_STAND) - eyeH) * Math.min(1, dt * 8);

    let fx = 0, fz = 0;
    if (inputEnabled) {
      if (keys['KeyW']) { fx -= Math.sin(yaw); fz -= Math.cos(yaw); }
      if (keys['KeyS']) { fx += Math.sin(yaw); fz += Math.cos(yaw); }
      if (keys['KeyA']) { fx -= Math.cos(yaw); fz += Math.sin(yaw); }
      if (keys['KeyD']) { fx += Math.cos(yaw); fz -= Math.sin(yaw); }
    }
    const len = Math.hypot(fx, fz);
    const wantRun = keys['ShiftLeft'] && !crouching && len > 0 && !exhausted;

    // 体力
    if (wantRun) {
      stamina -= dt / 7;           // 7 秒耗尽
      if (stamina <= 0) { stamina = 0; exhausted = true; }
    } else {
      stamina += dt / 11;
      if (stamina >= 0.35) exhausted = false;
      stamina = Math.min(1, stamina);
    }
    const running = wantRun && !exhausted;

    const speed = crouching ? 0.85 : running ? 4.4 : 2.2;
    if (len > 0) {
      fx /= len; fz /= len;
      const nx = pos.x + fx * speed * dt;
      if (!Maze.collides(nx, pos.z)) pos.x = nx;
      const nz = pos.z + fz * speed * dt;
      if (!Maze.collides(pos.x, nz)) pos.z = nz;
      Sfx.footstep(crouching ? 'crouch' : running ? 'run' : 'walk');
      bobAmp = Math.min(1, bobAmp + dt * 4);
      noiseLevel = crouching ? 0.25 : running ? 1 : 0.5;
    } else {
      bobAmp = Math.max(0, bobAmp - dt * 5);
      noiseLevel = 0;
    }
    bobT += dt * (running ? 12.5 : crouching ? 5 : 8);

    // 疲惫喘息
    Sfx.breathing(exhausted || stamina < 0.2);

    // 相机
    const bobY = Math.sin(bobT) * (running ? 0.05 : 0.026) * bobAmp;
    const bobX = Math.cos(bobT * 0.5) * 0.015 * bobAmp;
    camera.position.set(pos.x + bobX, eyeH + bobY, pos.z);
    camera.rotation.set(0, 0, 0, 'YXZ');
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    // HUD 体力条
    const wrap = document.getElementById('stamina-wrap');
    if (stamina < 0.995) {
      wrap.classList.remove('hidden');
      document.getElementById('stamina-fill').style.width = (stamina * 100) + '%';
      document.getElementById('stamina-fill').style.background =
        exhausted ? 'rgba(190,90,60,0.8)' : 'rgba(200,190,140,0.75)';
    } else {
      wrap.classList.add('hidden');
    }
  }

  return {
    init, spawn, setKey, onMouseMove, update, lookDir, toggleCrouch, restoreStamina,
    pos,
    get yaw() { return yaw; }, set yaw(v) { yaw = v; },
    get pitch() { return pitch; }, set pitch(v) { pitch = v; },
    get noiseLevel() { return noiseLevel; },
    get crouching() { return crouching; },
    get stamina() { return stamina; },
    get eyeH() { return eyeH; },
    get inputEnabled() { return inputEnabled; }, set inputEnabled(v) { inputEnabled = v; },
  };
})();
