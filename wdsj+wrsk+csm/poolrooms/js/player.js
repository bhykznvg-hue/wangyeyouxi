// ============ 玩家控制器 (行走 / 游泳 / 潜水) ============
const Player = (() => {
  let camera = null;
  const pos = new THREE.Vector3(12, 0, 12);  // 脚部位置
  let vy = 0;
  let yaw = 0, pitch = 0;
  const keys = {};
  const EYE = 1.62;         // 1.7m 身高
  let mode = 'walk';        // walk | swim
  let bobT = 0, bobAmp = 0;
  let wasInWater = false;
  const _dir = new THREE.Vector3();

  function init(cam) { camera = cam; }
  function spawn(x, z, yw = 0) {
    pos.set(x, 0, z);
    yaw = yw; pitch = 0; vy = 0;
  }
  function setKey(code, down) { keys[code] = down; }
  function onMouseMove(mx, my) {
    yaw -= mx * 0.0021;
    pitch -= my * 0.0021;
    pitch = Math.max(-1.45, Math.min(1.45, pitch));
  }
  function lookDir() {
    _dir.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    return _dir;
  }

  function update(dt) {
    const water = World.waterAt(pos.x, pos.z);
    const inDeepWater = water && (water.level - water.floor) > 1.25 && pos.y < water.level - 0.9;

    // 模式切换
    if (mode === 'walk' && inDeepWater) {
      mode = 'swim';
      Sfx.splash(true);
    } else if (mode === 'swim' && (!water || pos.y > water.level - 0.4 && World.groundHeight(pos.x, pos.z, pos.y + 0.5) > water.level - 1.2)) {
      const g = World.groundHeight(pos.x, pos.z, pos.y + 0.6);
      if (!water || g > water.floor + 0.2) {
        mode = 'walk';
        Sfx.splash(false);
      }
    }

    let fx = 0, fz = 0;
    if (keys['KeyW']) { fx -= Math.sin(yaw); fz -= Math.cos(yaw); }
    if (keys['KeyS']) { fx += Math.sin(yaw); fz += Math.cos(yaw); }
    if (keys['KeyA']) { fx -= Math.cos(yaw); fz += Math.sin(yaw); }
    if (keys['KeyD']) { fx += Math.cos(yaw); fz -= Math.sin(yaw); }
    const len = Math.hypot(fx, fz);
    if (len > 0) { fx /= len; fz /= len; }

    if (mode === 'walk') {
      updateWalk(dt, fx, fz, len, water);
    } else {
      updateSwim(dt, fx, fz, len, water);
    }

    // 相机
    const bobY = Math.sin(bobT) * (mode === 'swim' ? 0.04 : 0.03) * bobAmp;
    const bobX = Math.cos(bobT * 0.5) * 0.014 * bobAmp;
    const eyeY = mode === 'swim' ? pos.y + 0.55 : pos.y + EYE;
    camera.position.set(pos.x + bobX, eyeY + bobY, pos.z);
    camera.rotation.set(0, 0, 0, 'YXZ');
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    // 游泳时轻微摇摆
    if (mode === 'swim') camera.rotation.z = Math.sin(bobT * 0.7) * 0.02;
  }

  function updateWalk(dt, fx, fz, len, water) {
    const running = keys['ShiftLeft'] && len > 0;
    const inShallow = water && pos.y < water.level;
    let speed = running ? 4.6 : 2.4;
    if (inShallow) speed *= 0.72;

    if (len > 0) {
      tryMove(fx * speed * dt, fz * speed * dt);
      bobAmp = Math.min(1, bobAmp + dt * 4);
      if (inShallow) Sfx.wadeStep(running ? 'run' : 'walk');
      else Sfx.footstep(running ? 'run' : 'walk');
    } else {
      bobAmp = Math.max(0, bobAmp - dt * 5);
    }
    bobT += dt * (running ? 11.5 : 7.5);

    // 重力 & 地面
    const ground = World.groundHeight(pos.x, pos.z, pos.y + 0.6);
    vy -= 16 * dt;
    if (keys['Space'] && Math.abs(pos.y - ground) < 0.05) vy = 5.4;
    pos.y += vy * dt;
    if (pos.y <= ground) {
      // 台阶平滑上抬
      if (ground - pos.y < 0.55) pos.y = pos.y + (ground - pos.y) * Math.min(1, dt * 14);
      if (Math.abs(pos.y - ground) < 0.03) pos.y = ground;
      vy = 0;
    }
    // 涉水音效状态
    if (water && !wasInWater && pos.y < water.level) { Sfx.splash(false); wasInWater = true; }
    if ((!water || pos.y > (water ? water.level : 0)) && wasInWater) wasInWater = false;
  }

  function updateSwim(dt, fx, fz, len, water) {
    const speed = 2.0;
    if (len > 0) {
      tryMove(fx * speed * dt, fz * speed * dt);
      Sfx.swimStroke();
      bobAmp = Math.min(1, bobAmp + dt * 3);
    } else {
      bobAmp = Math.max(0, bobAmp - dt * 3);
    }
    bobT += dt * 3.4;

    // 垂直: 浮力回到水面 (眼睛微露出水面), Space 上浮, C 下潜
    const surfaceY = water ? water.level - 0.47 : pos.y;
    const floorY = water ? water.floor + 0.3 : pos.y;
    if (keys['Space']) vy += 8 * dt;
    else if (keys['KeyC']) vy -= 8 * dt;
    else vy += (surfaceY - pos.y) * 2.2 * dt; // 浮力
    vy *= Math.pow(0.12, dt); // 水阻
    pos.y += vy * dt;
    if (pos.y < floorY) { pos.y = floorY; vy = 0; }
    if (pos.y > surfaceY + 0.15) { pos.y = surfaceY + 0.15; vy = Math.min(vy, 0); }
    // 也允许跟随视线下潜 (按 W 且看向下)
    if (keys['KeyW'] && pitch < -0.5) pos.y += pitch * dt * 1.4;
  }

  function tryMove(dx, dz) {
    // X 轴
    pos.x += dx;
    let push = World.collide(pos.x, pos.y, pos.z);
    if (push && push.axis === 'x') pos.x = push.x;
    else if (push) pos.x -= dx;
    // Z 轴
    pos.z += dz;
    push = World.collide(pos.x, pos.y, pos.z);
    if (push && push.axis === 'z') pos.z = push.z;
    else if (push) pos.z -= dz;
  }

  return {
    init, spawn, setKey, onMouseMove, update, lookDir,
    pos,
    get yaw() { return yaw; }, set yaw(v) { yaw = v; },
    get pitch() { return pitch; }, set pitch(v) { pitch = v; },
    get mode() { return mode; },
    get eyeY() { return mode === 'swim' ? pos.y + 0.55 : pos.y + EYE; },
  };
})();
