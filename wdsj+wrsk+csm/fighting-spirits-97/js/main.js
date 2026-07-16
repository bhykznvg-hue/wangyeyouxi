// ============ main.js : 启动/主循环/场景管理 ============
'use strict';
const Game = {
  scene: null,
  setScene(s){ this.scene = s; },
  arcade: { stage: 0, score: 0, continues: 0 },
  arcadeTeam: null,
};

function applyScanline(){
  const el = document.getElementById('scanlines');
  if (el) el.className = OPTS.scanline ? '' : 'off';
}

(function boot(){
  if (typeof document === 'undefined') return; // 无头测试环境跳过
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  Input.init();
  applyScanline();

  // 画布自适应缩放(保持像素比例)
  function resize(){
    const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / 640, window.innerHeight / 360) * 2) / 2);
    canvas.style.width = 640 * scale + 'px';
    canvas.style.height = 360 * scale + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  // 首次交互启动音频(浏览器自动播放限制)
  let audioReady = false;
  function tryAudio(){
    if (audioReady) return;
    SND.init();
    if (SND.started){
      audioReady = true;
      const hint = document.getElementById('boot-hint');
      if (hint) hint.style.display = 'none';
      if (Game.scene instanceof TitleScene) SND.music('title');
    }
  }
  window.addEventListener('keydown', tryAudio);
  window.addEventListener('mousedown', tryAudio);
  window.addEventListener('touchstart', tryAudio);

  Game.setScene(new TitleScene());

  // 主循环: 固定60fps步进
  let last = performance.now(), acc = 0;
  function loop(now){
    requestAnimationFrame(loop);
    let dt = now - last; last = now;
    if (dt > 100) dt = 100;
    acc += dt;
    const STEP = 1000 / 60;
    let steps = 0;
    while (acc >= STEP && steps < 3){
      Input.update();
      if (Game.scene) Game.scene.update();
      acc -= STEP; steps++;
    }
    if (acc >= STEP) acc = 0; // 落后过多则丢弃
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 640, 360);
    if (Game.scene) Game.scene.draw(ctx);
  }
  requestAnimationFrame(loop);
})();
