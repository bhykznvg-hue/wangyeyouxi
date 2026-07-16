// 视觉验证: 用软件光栅器生成截图PNG
'use strict';
// Patch 全局环境让游戏使用 SoftCanvas
const { SoftCanvas, savePNG } = require('./softcanvas');
const fs = require('fs');
const path = require('path');

function scCanvas(w, h){ return new SoftCanvas(w || 300, h || 150); }
// 替换 U.makeCanvas
const realUtil = fs.readFileSync(path.join(__dirname, '..', 'js', 'util.js'), 'utf8');
const patchedUtil = realUtil.replace(
  "makeCanvas(w, h){\n    let cv;\n    if (typeof document !== 'undefined') cv = document.createElement('canvas');\n    else cv = { width: 0, height: 0, getContext: () => null }; // headless stub\n    cv.width = w; cv.height = h;\n    return cv;\n  }",
  "makeCanvas(w, h){ const cv = scCanvas(w, h); return cv; }"
);
// 移除 'use strict' 冲突
const clean = (s) => s.replace(/^'use strict';\s*/m, '');
const scripts = [
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'util.js'), 'utf8')).replace(
    "makeCanvas(w, h){\n    let cv;\n    if (typeof document !== 'undefined') cv = document.createElement('canvas');\n    else cv = { width: 0, height: 0, getContext: () => null }; // headless stub\n    cv.width = w; cv.height = h;\n    return cv;\n  }",
    "makeCanvas(w, h){ return scCanvas(w, h); }"
  ),
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'pixelfont.js'), 'utf8')),
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'audio.js'), 'utf8')),
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'input.js'), 'utf8')),
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'poses.js'), 'utf8')),
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'spritegen.js'), 'utf8')),
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'characters.js'), 'utf8')),
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'fx.js'), 'utf8')),
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'stages.js'), 'utf8')),
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'fighter.js'), 'utf8')),
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'ai.js'), 'utf8')),
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'ui.js'), 'utf8')),
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'battle.js'), 'utf8')),
  clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'scenes.js'), 'utf8')),
];

const combined = scripts.join('\n') + '\n' + clean(fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8'));

const vm = require('vm');
// 全局环境
global.window = { addEventListener:()=>{}, removeEventListener:()=>{}, innerWidth:1280, innerHeight:720 };
global.document = { createElement:()=>scCanvas(640,360), getElementById:(id)=> id === 'game' ? scCanvas(640,360) : {style:{},className:''} };
global.localStorage = {_m:{}, getItem(k){return this._m[k]==null?null:this._m[k];}, setItem(k,v){this._m[k]=String(v);}, removeItem(k){delete this._m[k];}};
Object.defineProperty(global,'navigator',{value:{getGamepads:()=>[]},configurable:true});
global.performance = {now:()=>Date.now()};
global.requestAnimationFrame = ()=>{};
global.scCanvas = scCanvas;

vm.runInThisContext(combined, { filename:'game.js' });

// 输出目录
const outDir = path.join(__dirname, 'screens');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

// ====== 1. 全角色精灵集锦 ======
console.log('Rendering sprite sheet...');
{
  const ROW = 5, GAP = 2, FW = SpriteGen.CW + GAP, FH = SpriteGen.CH + GAP;
  const COLS = 7;
  const cv = scCanvas(COLS * FW + 10, CHARS.length * 2 * FH + 30);
  const c = cv.getContext('2d');
  c.fillStyle = '#181020'; c.fillRect(0, 0, cv.width, cv.height);
  for (let ci = 0; ci < CHARS.length; ci++){
    const cd = CHARS[ci];
    const states = ['idle','walkF','a','c','d','crd','win'];
    for (let si = 0; si < states.length; si++){
      const anim = getAnim(cd, states[si]);
      const f1 = SpriteGen.getFrame(cd, states[si], si < 2 ? Math.min(anim.frames.length-1, 2) : si < 4 ? Math.min(anim.frames.length-1, 2) : 2);
      c.drawImage(f1.cv, 5 + ci * FW, 5 + ci * 2 * FH + si * (FH/2) + 5, Math.round(FW*0.9), Math.round(FH*0.9 * 0.55));
      Font.draw(c, cd.ename, 5 + ci * FW, 5 + ci * 2 * FH, { size:1, color:'#ffe040' });
    }
    const port = SpriteGen.portrait(cd, 36);
    c.drawImage(port, 5 + ci * FW + FW * 0.3, 5 + ci * 2 * FH + 2, 36, 36);
  }
  savePNG(cv, path.join(outDir, 'sprites.png'));
  console.log('  -> sprites.png');
}

// ====== 2. 战斗场景截图 ======
console.log('Rendering battle screens...');
{
  OPTS.roundTime = 30;
  const cfg = { mode:'vscpu', stageIdx:0, diff:5,
    teams:[{ids:['kai','ren','mika'],ctrl:'p1'},{ids:['bull','ryuji','yuki'],ctrl:'cpu'}],
    onEnd(){}};
  const b = new Battle(cfg);
  // 跑50帧让intro过完
  for (let i = 0; i < 80; i++){ Input.update(); b.update(); }
  const screen = scCanvas(640, 360);
  const sc = screen.getContext('2d');
  const seq = [
    { name:'1_intro', action(){ b.draw(sc); } },
    { name:'2_idle', action(){ b.draw(sc); Input.setOverride(0,{}); Input.setOverride(1,{}); for(let i=0;i<10;i++){Input.update();b.update();} b.draw(sc); Input.setOverride(0,null); Input.setOverride(1,null); } },
    { name:'3_attack', action(){ const f = b.fighters[0]; f.x=350; f.opp.x=400; f.power=3000; f.opp.power=3000; f.startMove(f.def.normals.c); for(let i=0;i<12;i++){Input.update();b.update();} b.draw(sc); } },
    { name:'4_special', action(){ const f = b.fighters[0]; f.x=350; f.opp.x=400; f.power=3000; f.opp.power=3000; f.startMove(f.def.specials[0].move); for(let i=0;i<18;i++){Input.update();b.update();} b.draw(sc); } },
    { name:'5_super', action(){ const f = b.fighters[0]; f.x=350; f.opp.x=400; f.power=3000; f.opp.power=3000; f.startMove(f.def.supers[0].move); for(let i=0;i<24;i++){Input.update();b.update();} b.draw(sc); } },
    { name:'6_hit', action(){ const f=b.fighters[0],o=b.fighters[1]; o.x=380; o.health=o.maxHealth; o.applyHit(f,{dmg:80,hs:24,bs:16,stop:10,guard:'mid',kbx:5,kby:-5,knockdown:true,x:20,y:-110,w:40,h:30,spark:'hitB',sfx:'hit_h'},false); for(let i=0;i<16;i++){Input.update();b.update();} b.draw(sc); } },
  ];
  for (const s of seq){
    s.action();
    savePNG(screen, path.join(outDir, s.name + '.png'));
    console.log('  -> ' + s.name + '.png');
  }
}

// ====== 3. 头像汇总 ======
console.log('Rendering portraits...');
{
  const cv = scCanvas(160, 280);
  const c = cv.getContext('2d');
  c.fillStyle = '#100820'; c.fillRect(0, 0, 160, 280);
  for (let i = 0; i < CHARS.length; i++){
    const port = SpriteGen.portrait(CHARS[i], 64);
    c.drawImage(port, 8 + (i%2)*80, 5 + Math.floor(i/2)*72, 64, 64);
    Font.draw(cv.getContext('2d'), CHARS[i].ename, 8+(i%2)*80+20, 5+Math.floor(i/2)*72+62, {size:1,color:'#ffe040',align:'center'});
  }
  savePNG(cv, path.join(outDir, 'portraits.png'));
  console.log('  -> portraits.png');
}

console.log('Done! Check test/screens/');
