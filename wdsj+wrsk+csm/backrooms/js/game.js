// ============ 游戏主控制器 ============
const Game = (() => {
  let renderer, scene, camera;
  let state = 'title';    // title | playing | note | caught | ending
  let clock = new THREE.Clock();
  let pointerLocked = false;
  let danger = 0;

  // 目标: 找到出口安全门 → 逃出
  let exitPos = null;
  let subQueue = [], subTimer = 0;
  let entityTimer = 40;   // 游戏开始 40s 后实体激活

  const NOTES = [
    '（字迹工整）\n\n第 0 层生存守则：\n一、荧光灯永远亮着。别指望天黑。\n二、听到湿地毯的脚步声——\n　　不是你的，就蹲下，别跑。\n三、墙上的粉笔箭头是前人留的。\n　　信一半就好。',
    '（数字潦草）\n\n出口是一扇灰色的安全门。\n门上挂着绿色的 EXIT 灯，\n靠近了还能听见电流声。\n\n我见过它一次。\n然后我跑了——因为"它"也在。\n\n别停下来找路。边走边找。',
    '（水渍晕开了大半）\n\n第 …… 天。\n捡到一瓶杏仁水。喝完，\n腿不抖了。像睡了一觉。\n别问是谁放在那的。\n\n我不想再数房间了。\n它们根本不是房间。',
  ];

  // ---------- 初始化 ----------
  function init() {
    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!window.__TEST__ });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 90);

    scene = new THREE.Scene();
    // 氛围: 光感只来自天花板灯 + 黄墙漫反射的低强度环境光; 远处沉入暗黄
    scene.background = new THREE.Color(0x6e5f33);
    scene.fog = new THREE.FogExp2(0x7d6d3c, 0.05);
    scene.add(new THREE.AmbientLight(0xd4b268, 0.32));

    Maze.setSeed((Math.random() * 1e9) | 0);
    World.init(scene);
    Player.init(camera);
    Entity.build(scene);
    Entity.setOnCatch(onCaught);
    layoutLevel();
    bindEvents();
    animate();
  }

  // ---------- 关卡布局 ----------
  function layoutLevel() {
    // 出生点: 找一个空格
    const spawn = Maze.nearestOpen(5, 5, 8);
    const [sx, sz] = Maze.cellCenter(spawn[0], spawn[1]);
    Player.spawn(sx, sz, Math.PI * 0.3);

    // 出口房: 距出生点 ~35 格
    const exitCell = Maze.randomOpenCell(spawn[0] + 26, spawn[1] + 26, 4, 10, 31);
    World.placeExitRoom(exitCell[0], exitCell[1]);
    exitPos = World.exitDoorPos;

    // 杏仁水: 出生点附近保底 2 瓶 (其余随区块稀疏散落)
    const a1 = Maze.randomOpenCell(spawn[0] + 2, spawn[1] + 2, 2, 5, 81);
    if (a1) World.placeAlmondWater(a1[0], a1[1]);
    const a2 = Maze.randomOpenCell(spawn[0] + 9, spawn[1] + 6, 3, 7, 82);
    if (a2) World.placeAlmondWater(a2[0], a2[1]);

    // 3 张纸条: 出生点附近 / 中途 / 远处
    const n1 = Maze.randomOpenCell(spawn[0], spawn[1], 2, 5, 71);
    if (n1) World.placeNote(n1[0], n1[1], 0);
    const n2 = Maze.randomOpenCell(spawn[0] + 8, spawn[1] + 4, 3, 7, 72);
    if (n2) World.placeNote(n2[0], n2[1], 1);
    const n3 = Maze.randomOpenCell(spawn[0] + 16, spawn[1] + 16, 3, 7, 73);
    if (n3) World.placeNote(n3[0], n3[1], 2);

    // 预生成出生区块
    World.update(sx, sz);
  }

  // ---------- 出口 ----------
  function tryExit() {
    onEscape();
  }

  // ---------- 字幕 ----------
  function sub(text, dur = 3) { subQueue.push({ text, dur }); }
  function updateSub(dt) {
    const el = document.getElementById('subtitle');
    if (subTimer > 0) {
      subTimer -= dt;
      if (subTimer <= 0) el.classList.remove('show');
      return;
    }
    if (subQueue.length) {
      const s = subQueue.shift();
      el.textContent = s.text;
      el.classList.add('show');
      subTimer = s.dur;
    }
  }
  function objective(t) { document.getElementById('objective-text').textContent = t; }

  // ---------- 开始 ----------
  async function startGame() {
    Sfx.init(); Sfx.resume();
    Sfx.uiSelect();
    const fadeEl = document.getElementById('fade-overlay');
    fadeEl.style.transition = 'none';
    fadeEl.style.opacity = 1;
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('hud').classList.remove('hidden');

    state = 'playing';
    Sfx.ambientLoop();
    // 出口电流声 (常鸣, 靠近时可听声辨位)
    if (exitPos) Sfx.breakerHum(exitPos.x, exitPos.z);
    objective('找到出口 —— 一扇挂着 EXIT 绿灯的安全门');
    setTimeout(() => {
      sub('……这里不是我该在的地方。', 3.5);
      sub('黄色的墙。湿地毯的味道。嗡嗡声。', 3.5);
      sub('（找到出口。留意绿色的灯光, 和电流声。）', 3);
    }, 1800);

    await new Promise(r => setTimeout(r, 80));
    fadeEl.style.transition = 'opacity 2.5s ease';
    fadeEl.style.opacity = 0;
    requestPointerLock();
  }

  // ---------- 纸条 ----------
  function showNote(idx) {
    state = 'note';
    Sfx.paperRustle();
    document.getElementById('note-text').textContent = NOTES[idx];
    document.getElementById('note-screen').classList.remove('hidden');
    document.exitPointerLock();
  }
  function closeNote() {
    state = 'playing';
    document.getElementById('note-screen').classList.add('hidden');
    Sfx.paperRustle();
    requestPointerLock();
  }

  // ---------- 被抓 ----------
  async function onCaught() {
    if (state !== 'playing') return;
    state = 'caught';
    setDanger(1);
    document.exitPointerLock();
    const fadeEl = document.getElementById('fade-overlay');
    fadeEl.style.transition = 'opacity 0.25s ease';
    fadeEl.style.opacity = 1;
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('caught-screen').classList.remove('hidden');
    await new Promise(r => setTimeout(r, 3200));
    // 重生: 在附近随机位置醒来
    document.getElementById('caught-screen').classList.add('hidden');
    const [pi, pk] = Maze.worldToCell(Player.pos.x, Player.pos.z);
    const cell = Maze.randomOpenCell(pi, pk, 8, 14, (Math.random() * 100) | 0);
    if (cell) {
      const [wx, wz] = Maze.cellCenter(cell[0], cell[1]);
      Player.spawn(wx, wz, Math.random() * Math.PI * 2);
    }
    Entity.retreat();
    setDanger(0);
    state = 'playing';
    fadeEl.style.transition = 'opacity 1.5s ease';
    fadeEl.style.opacity = 0;
    sub('……你在潮湿的地毯上醒来。头很痛。', 3.5);
    requestPointerLock();
  }

  // ---------- 逃脱 ----------
  async function onEscape() {
    if (state !== 'playing') return;
    state = 'ending';
    Sfx.chaseLoop(false);
    Sfx.stopHeartbeat();
    Sfx.exitHum();
    document.exitPointerLock();
    const fadeEl = document.getElementById('fade-overlay');
    fadeEl.classList.add('white');
    fadeEl.style.transition = 'opacity 2s ease';
    fadeEl.style.opacity = 1;
    await new Promise(r => setTimeout(r, 2300));
    document.getElementById('ending-screen').classList.remove('hidden');
    fadeEl.style.opacity = 0;
    const txt = document.getElementById('ending-text');
    const lines = '推开门的瞬间，嗡嗡声消失了。\n\n世界安静得像一场大病初愈。\n\n你不确定自己回到了哪里，\n但至少，这里的墙不是黄色的。\n\n— 阈限 · 完 —';
    txt.textContent = '';
    for (const ch of lines) {
      txt.textContent += ch;
      await new Promise(r => setTimeout(r, ch === '\n' ? 100 : 85));
    }
    await new Promise(r => setTimeout(r, 2500));
    txt.textContent += '\n\n[ 刷新页面 · 每一次的迷宫都不同 ]';
  }

  // ---------- 危险氛围 ----------
  function setDanger(v) {
    danger = Math.max(0, Math.min(1, v));
    document.getElementById('danger-vignette').style.opacity = danger * 0.85;
  }

  // ---------- 事件 ----------
  function bindEvents() {
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    const canvas = renderer.domElement;
    document.addEventListener('pointerlockchange', () => {
      pointerLocked = document.pointerLockElement === canvas;
    });
    canvas.addEventListener('click', () => {
      if (state === 'playing' && !pointerLocked) requestPointerLock();
    });
    document.addEventListener('mousemove', e => {
      if (pointerLocked && state === 'playing') Player.onMouseMove(e.movementX, e.movementY);
    });
    document.addEventListener('keydown', e => {
      if (e.code === 'KeyE' && !e.repeat) {
        if (state === 'note') { closeNote(); return; }
        if (state === 'playing') {
          const it = World.nearestInteract(
            new THREE.Vector3(Player.pos.x, 1.3, Player.pos.z), Player.lookDir());
          if (it) it.onUse();
        }
        return;
      }
      if (e.code === 'KeyC' && !e.repeat && state === 'playing') { Player.toggleCrouch(); return; }
      if (state === 'playing') Player.setKey(e.code, true);
    });
    document.addEventListener('keyup', e => Player.setKey(e.code, false));

    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-how').addEventListener('click', () => {
      Sfx.init(); Sfx.resume(); Sfx.uiSelect();
      document.getElementById('how-panel').classList.remove('hidden');
    });
    document.getElementById('btn-how-close').addEventListener('click', () => {
      Sfx.uiSelect();
      document.getElementById('how-panel').classList.add('hidden');
    });
  }

  function requestPointerLock() {
    if (state === 'playing') renderer.domElement.requestPointerLock();
  }

  // ---------- 交互提示 ----------
  function updateInteractTip() {
    const tip = document.getElementById('interact-tip');
    if (state !== 'playing') { tip.classList.add('hidden'); return; }
    const it = World.nearestInteract(
      new THREE.Vector3(Player.pos.x, 1.3, Player.pos.z), Player.lookDir());
    if (it) {
      document.getElementById('interact-label').textContent = it.label;
      tip.classList.remove('hidden');
    } else tip.classList.add('hidden');
  }

  // ---------- 主循环 ----------
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (state === 'playing') {
      Player.update(dt);
      World.update(Player.pos.x, Player.pos.z);
      World.updateLights(dt, Player.pos.x, Player.pos.z, t);
      updateSub(dt);
      updateInteractTip();
      // 3D 音频监听者
      Sfx.updateListener(
        new THREE.Vector3(Player.pos.x, Player.eyeH, Player.pos.z),
        Player.lookDir()
      );
      Sfx.setListenerPos(Player.pos.x, Player.pos.z);
      // 实体
      if (!Entity.isActive) {
        entityTimer -= dt;
        if (entityTimer <= 0) {
          Entity.activate(Player.pos.x, Player.pos.z);
          sub('（远处传来湿地毯上的脚步声。不是你的。）', 4);
        }
      } else {
        Entity.update(dt, Player.pos, Player.noiseLevel, Player.crouching);
        // 危险衰减
        if (Entity.state === 'patrol') setDanger(Math.max(0, danger - dt * 0.3));
      }
    } else if (state === 'note' || state === 'caught') {
      updateSub(dt);
    }

    renderer.render(scene, camera);
  }

  window.addEventListener('DOMContentLoaded', init);

  return {
    get state() { return state; },
    showNote, closeNote, tryExit, setDanger, requestPointerLock,
    notify: sub,
  };
})();
