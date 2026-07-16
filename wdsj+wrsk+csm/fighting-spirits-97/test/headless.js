// 无头冒烟测试: 模拟DOM/Canvas, 加载全部脚本, 驱动战斗与场景
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---------- Canvas / DOM stubs ----------
function makeCtx(canvas){
  const noop = () => {};
  return {
    canvas,
    fillStyle:'#000', strokeStyle:'#000', lineWidth:1, lineCap:'butt', lineJoin:'miter',
    globalAlpha:1, globalCompositeOperation:'source-over', imageSmoothingEnabled:false,
    font:'', textBaseline:'top',
    fillRect:noop, strokeRect:noop, clearRect:noop, fillText:noop,
    beginPath:noop, moveTo:noop, lineTo:noop, closePath:noop, stroke:noop, fill:noop,
    arc:noop, ellipse:noop, rect:noop,
    save:noop, restore:noop, translate:noop, scale:noop, rotate:noop,
    drawImage:noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(0, w * h * 4)), width: w, height: h }),
    putImageData: noop,
    measureText: () => ({ width: 10 }),
  };
}
function makeCanvas(){
  const cv = { width: 300, height: 150, style: {}, className: '' };
  cv.getContext = () => { if (!cv._ctx) cv._ctx = makeCtx(cv); return cv._ctx; };
  return cv;
}
const listeners = {};
global.window = {
  addEventListener: (n, f) => { (listeners[n] = listeners[n] || []).push(f); },
  removeEventListener: () => {},
  innerWidth: 1280, innerHeight: 720,
};
global.document = {
  createElement: (tag) => makeCanvas(),
  getElementById: (id) => makeCanvas(),
};
global.localStorage = { _m:{}, getItem(k){ return this._m[k] == null ? null : this._m[k]; }, setItem(k,v){ this._m[k] = String(v); }, removeItem(k){ delete this._m[k]; } };
Object.defineProperty(global, 'navigator', { value: { getGamepads: () => [] }, configurable: true });
global.performance = { now: () => Date.now() };
let rafCb = null;
global.requestAnimationFrame = (cb) => { rafCb = cb; };

// ---------- 加载脚本 ----------
const files = ['util.js','pixelfont.js','audio.js','input.js','poses.js','spritegen.js','characters.js','fx.js','stages.js','fighter.js','ai.js','ui.js','battle.js','scenes.js','main.js'];
const jsdir = path.join(__dirname, '..', 'js');
let combined = '';
const offsets = [];
for (const f of files){
  const src = fs.readFileSync(path.join(jsdir, f), 'utf8');
  offsets.push({ file: f, start: combined.split('\n').length });
  combined += src + '\n';
}

const TEST = `
// ================= TEST BODY =================
const ctx = makeCtxGlobal();
let failures = 0;
function assert(cond, msg){ if (!cond){ failures++; console.log('ASSERT FAIL: ' + msg); } }
function report(name){ console.log('[ok] ' + name); }

// ---- 1. 全角色全动画帧渲染 ----
{
  let frames = 0;
  for (const c of CHARS){
    for (const an of Object.keys(ANIMS)){
      const anim = getAnim(c, an);
      for (let i = 0; i < anim.frames.length; i++){ SpriteGen.getFrame(c, an, i); frames++; }
    }
    for (const an of Object.keys(c.anims || {})){
      const anim = c.anims[an];
      for (let i = 0; i < anim.frames.length; i++){ SpriteGen.getFrame(c, an, i); frames++; }
    }
    SpriteGen.getFrame(c, 'idle', 0, 'w');
    SpriteGen.getFrame(c, 'idle', 0, 't#ff0000');
    SpriteGen.portrait(c, 36); SpriteGen.portrait(c, 64);
    SpriteGen.getFrame(CHAR_ALTS[c.id], 'idle', 0);
  }
  report('sprite render x' + frames);
}

// ---- 2. CPU vs CPU 完整比赛 ----
{
  let ended = null;
  OPTS.roundTime = 30;
  const cfg = { mode:'vscpu', stageIdx:0, diff:5,
    teams:[{ids:['kai','mika','bull'],ctrl:'cpu'},{ids:['ren','yuki','ryuji'],ctrl:'cpu'}],
    onEnd(r){ ended = r; } };
  const b = new Battle(cfg);
  let i = 0;
  let dmgSeen = false;
  for (; i < 60 * 60 * 12 && !b.matchOver; i++){
    Input.update();
    b.update();
    b.draw(ctx);
    if (b.fighters[0].health < b.fighters[0].maxHealth || b.fighters[1].health < b.fighters[1].maxHealth) dmgSeen = true;
  }
  assert(b.matchOver, 'cpu match should end, frames=' + i);
  assert(dmgSeen, 'AI should deal damage');
  assert(ended && (ended.winnerSide === 0 || ended.winnerSide === 1 || ended.winnerSide === -1), 'result valid');
  report('cpu-vs-cpu match ended in ' + i + ' frames, winner=' + (ended && ended.winnerSide));
}

// ---- 3. 每个角色每个招式强制执行 ----
{
  for (const c of CHARS){
    const cfg = { mode:'training', stageIdx:1,
      teams:[{ids:[c.id],ctrl:'p1'},{ids:['kai'],ctrl:'dummy'}], onEnd(){} };
    const b = new Battle(cfg);
    const f = b.fighters[0], dummy = b.fighters[1];
    const runMove = (mv, label) => {
      f.x = b.stageW/2 - 40; f.y = 0; f.vx = 0; f.vy = 0; f.setState(ST.IDLE, 'idle');
      dummy.x = b.stageW/2 + 30; dummy.y = 0; dummy.setState(ST.IDLE, 'idle'); dummy.health = dummy.maxHealth;
      f.power = 3000;
      f.startMove(mv);
      for (let k = 0; k < 260 && (f.state === ST.ATTACK || f.state === ST.THROWING || b.freezeT > 0 || f.state === ST.LAND || f.airborne); k++){
        b.update(); b.draw(ctx);
      }
      assert(f.state !== ST.ATTACK, c.id + ' move stuck: ' + label + ' state=' + f.state);
    };
    for (const k of Object.keys(c.normals)) runMove(c.normals[k], 'normal ' + k);
    for (const sp of c.specials) runMove(sp.move, sp.id);
    for (const sp of c.supers) runMove(sp.move, sp.id);
    for (const k of Object.keys(c.extraMoves || {})) runMove(c.extraMoves[k], 'extra ' + k);
    // 投技脚本
    for (const ty of ['basic','spin','run','super']){
      f.x = 400; dummy.x = 430; f.y = dummy.y = 0;
      f.setState(ST.IDLE,'idle'); dummy.setState(ST.IDLE,'idle'); dummy.health = dummy.maxHealth;
      f.beginThrow({ type: ty, dmg: 100, dirSign: 1 });
      for (let k = 0; k < 200 && (f.state === ST.THROWING || dummy.airborne || dummy.state === ST.THROWN); k++){ b.update(); b.draw(ctx); }
      assert(f.state !== ST.THROWING, c.id + ' throw stuck: ' + ty);
      assert(dummy.health < dummy.maxHealth, c.id + ' throw no dmg: ' + ty);
    }
    // 受击路径
    dummy.setState(ST.IDLE,'idle'); dummy.health = dummy.maxHealth; dummy.y = 0;
    dummy.applyHit(f, { dmg:50, hs:20, bs:14, stop:8, guard:'mid', kbx:4, x:20, y:-110, w:40, h:30, spark:'hit', sfx:'hit_l' }, false);
    dummy.applyHit(f, { dmg:70, hs:24, bs:16, stop:10, guard:'mid', kbx:4, kby:-8, launch:true, knockdown:true, x:20, y:-110, w:40, h:30, spark:'fire', sfx:'hit_h' }, false);
    for (let k = 0; k < 200 && dummy.state !== ST.IDLE; k++){ b.update(); b.draw(ctx); }
  }
  report('all moves executed');
}

// ---- 4. 人机实战: 玩家侧随机输入 ----
{
  let ended = null;
  const cfg = { mode:'vscpu', stageIdx:2, diff:3,
    teams:[{ids:['ryuji','yuki','ren'],ctrl:'p1'},{ids:['bull','kai','mika'],ctrl:'cpu'}],
    onEnd(r){ ended = r; } };
  const b = new Battle(cfg);
  const keys = ['up','down','left','right','a','b','c','d'];
  let ov = {};
  for (let i = 0; i < 60 * 60 * 12 && !b.matchOver; i++){
    if (i % 5 === 0){
      ov = {};
      for (const k of keys) ov[k] = Math.random() < 0.25;
    }
    Input.setOverride(0, ov);
    Input.update();
    b.update();
    b.draw(ctx);
  }
  Input.setOverride(0, null);
  assert(b.matchOver, 'p1-random vs cpu match should end');
  report('random-input match ok');
}

// ---- 5. 场景猴子测试 ----
{
  Game.setScene(new TitleScene());
  const keys = ['up','down','left','right','a','b','c','d','start'];
  let sceneNames = new Set();
  for (let i = 0; i < 60 * 240; i++){
    const ov = {};
    if (i % 7 === 0){
      const k = keys[Math.floor(Math.random() * keys.length)];
      ov[k] = true;
      if (Math.random() < 0.4) ov.a = true;
      if (Math.random() < 0.15) ov.start = true;
    }
    Input.setOverride(0, ov);
    Input.setOverride(1, i % 11 === 0 ? { a: true } : {});
    Input.update();
    Game.scene.update();
    Game.scene.draw(ctx);
    sceneNames.add(Game.scene.constructor.name);
  }
  Input.setOverride(0, null); Input.setOverride(1, null);
  report('monkey visited: ' + Array.from(sceneNames).join(','));
}

// ---- 6. 街机流程直通 ----
{
  Game.arcade = { stage: 0, score: 0, continues: 0 };
  Game.arcadeTeam = ['kai','ren','mika'];
  startArcadeBattle();
  // VsScene -> battle
  for (let i = 0; i < 200; i++){ Input.update(); Game.scene.update(); Game.scene.draw(ctx); }
  assert(Game.scene instanceof BattleScene, 'arcade should reach battle, got ' + Game.scene.constructor.name);
  // 直接判定玩家获胜推进
  let guard = 0;
  while (Game.arcade.stage < ARCADE_LADDER.length && guard++ < 14){
    if (Game.scene instanceof BattleScene){
      const b = Game.scene.battle;
      b.teams[1].lostCount = b.teams[1].ids.length - 1;
      let n = 0;
      while (!b.matchOver && n++ < 30000){
        if (b.phase === 'fight' && b.fighters[1].health > 0) b.fighters[1].health = 0;
        if (b.fighters[0].health < b.fighters[0].maxHealth) b.fighters[0].health = b.fighters[0].maxHealth;
        Input.update(); Game.scene.update(); Game.scene.draw(ctx);
      }
    } else {
      for (let i = 0; i < 400 && !(Game.scene instanceof BattleScene) && !(Game.scene instanceof EndingScene); i++){
        Input.setOverride(0, i % 2 ? { start: true } : {});
        Input.update(); Game.scene.update(); Game.scene.draw(ctx);
      }
    }
  }
  Input.setOverride(0, null);
  assert(Game.scene instanceof EndingScene || Game.arcade.stage >= ARCADE_LADDER.length, 'arcade ladder completes, stage=' + Game.arcade.stage + ' scene=' + Game.scene.constructor.name);
  for (let i = 0; i < 60; i++){ Input.update(); Game.scene.update(); Game.scene.draw(ctx); }
  report('arcade ladder completed');
}

console.log(failures === 0 ? 'ALL TESTS PASSED' : failures + ' FAILURES');
`;

// makeCtxGlobal 提供给测试体
global.makeCtxGlobal = () => makeCtx(makeCanvas());

const script = combined + TEST;
try {
  vm.runInThisContext(script, { filename: 'combined.js' });
} catch (e) {
  // 映射行号到源文件
  const m = /combined\.js:(\d+)/.exec(e.stack || '');
  if (m){
    const line = parseInt(m[1]);
    let loc = 'test-body';
    for (const o of offsets){ if (line >= o.start) loc = o.file + ':' + (line - o.start + 1); }
    console.log('ERROR at ' + loc);
  }
  console.log(e.stack);
  process.exit(1);
}
