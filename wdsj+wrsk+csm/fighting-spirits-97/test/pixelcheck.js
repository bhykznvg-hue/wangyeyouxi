// 像素级验证: 不看图也能检查渲染质量
'use strict';
const { SoftCanvas } = require('./softcanvas');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function scCanvas(w, h){ return new SoftCanvas(w || 300, h || 150); }
const clean = (s) => s.replace(/^'use strict';\s*/m, '');
const jsdir = path.join(__dirname, '..', 'js');
const order = ['util.js','pixelfont.js','audio.js','input.js','poses.js','spritegen.js','characters.js','fx.js','stages.js','fighter.js','ai.js','ui.js','battle.js','scenes.js'];
let combined = '';
for (const f of order){
  let src = clean(fs.readFileSync(path.join(jsdir, f), 'utf8'));
  if (f === 'util.js'){
    src = src.replace(/makeCanvas\(w, h\)\{[\s\S]*?return cv;\s*\}/, 'makeCanvas(w, h){ return scCanvas(w, h); }');
  }
  combined += src + '\n';
}
global.window = { addEventListener:()=>{}, removeEventListener:()=>{}, innerWidth:1280, innerHeight:720 };
global.document = { createElement:()=>scCanvas(640,360), getElementById:(id)=> id==='game'?scCanvas(640,360):{style:{},className:''} };
global.localStorage = {_m:{}, getItem(k){return this._m[k]==null?null:this._m[k];}, setItem(k,v){this._m[k]=String(v);}, removeItem(){}};
Object.defineProperty(global,'navigator',{value:{getGamepads:()=>[]},configurable:true});
global.performance = {now:()=>Date.now()};
global.requestAnimationFrame = ()=>{};
global.scCanvas = scCanvas;
vm.runInThisContext(combined, { filename:'game.js' });

let fails = 0;
function check(cond, msg){ if (!cond){ fails++; console.log('  [FAIL] ' + msg); } }

// ---- 精灵结构分析 ----
function analyze(cv){
  const d = cv._data, w = cv.width, h = cv.height;
  let minX=1e9,maxX=-1,minY=1e9,maxY=-1,count=0;
  const colors = new Set();
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){
    const i=(y*w+x)*4;
    if (d[i+3]>100){
      count++;
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);
      minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      colors.add(((d[i]>>4)<<8)|((d[i+1]>>4)<<4)|(d[i+2]>>4));
    }
  }
  return { count, w: maxX-minX+1, h: maxY-minY+1, minX, maxX, minY, maxY, colors: colors.size };
}

console.log('== 角色精灵检查 ==');
const sigs = [];
for (const c of CHARS){
  const fr = SpriteGen.getFrame(c, 'idle', 0);
  const a = analyze(fr.cv);
  console.log(`${c.id}: 像素=${a.count} 宽=${a.w} 高=${a.h} 色数=${a.colors} 脚底=(${fr.ox},${fr.oy}) 顶=${a.minY}`);
  check(a.count > 800, c.id + ' 精灵太小/空');
  check(a.h > 60 && a.h < 130, c.id + ' 身高异常: ' + a.h);
  check(a.colors >= 6, c.id + ' 颜色太少: ' + a.colors);
  check(a.maxY >= fr.oy - 4 && a.maxY <= fr.oy + 6, c.id + ' 脚不在原点: maxY=' + a.maxY + ' oy=' + fr.oy);
  // 颜色签名(检查角色间差异)
  const cd = fr.cv._data; let rs=0,gs=0,bs=0,n=0;
  for (let i=0;i<cd.length;i+=4) if (cd[i+3]>100){ rs+=cd[i];gs+=cd[i+1];bs+=cd[i+2];n++; }
  sigs.push({ id:c.id, r:rs/n, g:gs/n, b:bs/n, px:a.count });
}
for (let i=0;i<sigs.length;i++) for (let j=i+1;j<sigs.length;j++){
  const a=sigs[i],b=sigs[j];
  const dist = Math.hypot(a.r-b.r,a.g-b.g,a.b-b.b) + Math.abs(a.px-b.px)/40;
  check(dist > 12, `角色外观太相似: ${a.id} vs ${b.id} dist=${dist.toFixed(1)}`);
}

console.log('== 动作姿势差异检查 ==');
for (const c of ['kai','bull','mika']){
  const cd = CHARS_BY_ID[c];
  const idle = analyze(SpriteGen.getFrame(cd, 'idle', 0).cv);
  const punch = analyze(SpriteGen.getFrame(cd, 'c', 1).cv);
  const kick = analyze(SpriteGen.getFrame(cd, 'd', 1).cv);
  const crouch = analyze(SpriteGen.getFrame(cd, 'crouch', 0).cv);
  const lie = analyze(SpriteGen.getFrame(cd, 'lie', 0).cv);
  console.log(`${c}: idle高${idle.h} 蹲高${crouch.h} 躺高${lie.h} 拳前沿${punch.maxX} idle前沿${idle.maxX}`);
  check(crouch.h < idle.h - 10, c + ' 下蹲不明显');
  check(lie.h < idle.h * 0.5, c + ' 倒地不明显');
  check(punch.maxX > idle.maxX + 5, c + ' 出拳无前伸');
}

console.log('== 场景渲染检查 ==');
{
  const cv = scCanvas(640, 360);
  const c = cv.getContext('2d');
  for (let si = 0; si < Stages.list.length; si++){
    c.fillStyle = '#000'; // 清空
    cv._data.fill(0);
    Stages.draw(c, Stages.list[si], { x: 100 }, 120);
    const a = analyze(cv);
    const cov = a.count / (640*360);
    console.log(`${Stages.list[si].id}: 覆盖率=${(cov*100).toFixed(1)}% 色数=${a.colors}`);
    check(cov > 0.95, Stages.list[si].id + ' 场景未覆盖全屏');
    check(a.colors > 24, Stages.list[si].id + ' 场景颜色太少');
  }
}

console.log('== 战斗画面元素检查 ==');
{
  OPTS.roundTime = 60;
  const cfg = { mode:'vscpu', stageIdx:0, diff:3,
    teams:[{ids:['kai','ren','mika'],ctrl:'p1'},{ids:['bull','ryuji','yuki'],ctrl:'cpu'}], onEnd(){} };
  const b = new Battle(cfg);
  for (let i = 0; i < 140; i++){ Input.update(); b.update(); }
  const screen = scCanvas(640, 360);
  const sc = screen.getContext('2d');
  b.draw(sc);
  // 检查血条区域是否有黄色像素
  const d = screen._data;
  function regionHas(x0,y0,x1,y1, test){
    for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++){
      const i=(y*640+x)*4;
      if (test(d[i],d[i+1],d[i+2],d[i+3])) return true;
    }
    return false;
  }
  check(regionHas(14,14,264,30,(r,g,b2)=>r>200&&g>170&&b2<120), 'P1血条(黄)未绘制');
  check(regionHas(376,14,626,30,(r,g,b2)=>r>200&&g>170&&b2<120), 'P2血条未绘制');
  check(regionHas(294,8,346,44,(r,g,b2)=>r>180&&g>150), '计时器未绘制');
  check(regionHas(12,318,216,336,(r,g,b2,a)=>a>0), 'P1气槽未绘制');
  // 角色皮肤色在场中
  check(regionHas(0,140,640,330,(r,g,b2)=>r>190&&g>140&&g<200&&b2>90&&b2<160), '画面中找不到角色皮肤色');
  console.log('战斗画面元素OK');
}

console.log('== 特效渲染检查 ==');
{
  const cv = scCanvas(640, 360);
  const c = cv.getContext('2d');
  FX.clear();
  FX.spawn('hitB', 320, 180); FX.spawn('fire', 200, 180); FX.spawn('ice', 440, 180);
  FX.update();
  FX.draw(c, { x: 0 });
  const a = analyze(cv);
  check(a.count > 40, '特效未渲染: ' + a.count);
  console.log('特效像素=' + a.count);
}

console.log(fails === 0 ? '\nALL VISUAL CHECKS PASSED' : `\n${fails} VISUAL FAILURES`);
process.exit(fails === 0 ? 0 : 1);
