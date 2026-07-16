// ============ scenes.js : 标题/菜单/选人/VS/街机梯队/结算/设置/键位 ============
'use strict';

// ---------- 通用背景 ----------
function drawMenuBG(ctx, t, hue){
  ctx.fillStyle = '#0a0814'; ctx.fillRect(0, 0, 640, 360);
  // 流动斜纹
  for (let i = 0; i < 14; i++){
    const y = ((i * 34 + t * 0.4) % 420) - 30;
    ctx.fillStyle = i % 2 ? 'rgba(40,20,50,0.5)' : 'rgba(30,14,36,0.5)';
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(640, y - 60); ctx.lineTo(640, y - 40); ctx.lineTo(0, y + 20);
    ctx.fill();
  }
  // 火星
  for (let i = 0; i < 20; i++){
    const x = (i * 137 + t * (0.4 + i % 3 * 0.3)) % 660 - 10;
    const y = 360 - ((i * 61 + t * (0.8 + i % 4 * 0.4)) % 380);
    ctx.fillStyle = U.rgba(i % 3 ? (hue || '#ff7020') : '#ffd040', 0.5);
    ctx.fillRect(x, y, 2, 2);
  }
}

// ---------- 标题 ----------
class TitleScene {
  constructor(){ this.t = 0; SND.music('title'); }
  update(){
    this.t++;
    if (Input.anyStart() || Input.anyBtn()){
      SND.sfx('coin');
      Game.setScene(new MenuScene());
    }
  }
  draw(ctx){
    drawMenuBG(ctx, this.t);
    // 火焰底纹
    for (let i = 0; i < 30; i++){
      const x = 90 + i * 16;
      const h = 26 + Math.sin(this.t * 0.14 + i * 1.3) * 12 + Math.sin(this.t * 0.07 + i) * 8;
      ctx.fillStyle = U.rgba(i % 2 ? '#c03010' : '#ff7020', 0.5);
      ctx.fillRect(x, 148 - h * 0.4, 8, h);
    }
    // LOGO
    const bob = Math.sin(this.t * 0.05) * 3;
    Font.draw(ctx, '拳 魂', 320, 60 + bob, { size: 7, color: '#ffd040', outline: '#8a1010', align: 'center' });
    Font.draw(ctx, "FIGHTING SPIRITS '97", 320, 132 + bob, { size: 3, color: '#ff8030', outline: '#401010', align: 'center' });
    ctx.fillStyle = '#e8c34a';
    ctx.fillRect(140, 170, 360, 3);
    Font.draw(ctx, '经 典 街 机 格 斗', 320, 186, { size: 2, color: '#c0c0d8', align: 'center' });
    if ((this.t >> 5) % 2 === 0)
      Font.draw(ctx, 'PRESS START', 320, 250, { size: 3, color: '#fff', outline: '#a02020', align: 'center' });
    Font.draw(ctx, 'P1: WASD移动 J轻拳 K轻脚 U重拳 I重脚 ENTER开始', 320, 310, { size: 1, color: '#8090a8', align: 'center' });
    Font.draw(ctx, '© 2026 原创致敬作品 · 支持手柄', 320, 332, { size: 1, color: '#606880', align: 'center' });
  }
}

// ---------- 主菜单 ----------
class MenuScene {
  constructor(){
    this.t = 0; this.sel = 0;
    this.items = [
      { id:'arcade', label:'街机模式', desc:'组队闯关 挑战最终BOSS' },
      { id:'vs2p', label:'双人对战', desc:'本地2P 3v3组队对决' },
      { id:'vscpu', label:'人机对战', desc:'与CPU进行3v3组队战' },
      { id:'training', label:'训练模式', desc:'自由练习 连段研究' },
      { id:'movelist', label:'出招表', desc:'查看全角色招式指令' },
      { id:'options', label:'系统设置', desc:'难度/时间/音量/画面' },
      { id:'keys', label:'按键设置', desc:'自定义键盘按键' },
    ];
  }
  update(){
    this.t++;
    const p1 = Input.pads[0], p2 = Input.pads[1];
    const up = p1.press.up || p2.press.up, down = p1.press.down || p2.press.down;
    const ok = p1.press.a || p1.press.start || p2.press.a || p2.press.start;
    if (up){ this.sel = (this.sel + this.items.length - 1) % this.items.length; SND.sfx('cursor'); }
    if (down){ this.sel = (this.sel + 1) % this.items.length; SND.sfx('cursor'); }
    if (ok){
      SND.sfx('confirm');
      const id = this.items[this.sel].id;
      switch (id){
        case 'arcade': Game.arcade = { stage: 0, score: 0, continues: 0 }; Game.setScene(new SelectScene({ mode:'arcade' })); break;
        case 'vs2p': Game.setScene(new SelectScene({ mode:'vs2p' })); break;
        case 'vscpu': Game.setScene(new SelectScene({ mode:'vscpu' })); break;
        case 'training': Game.setScene(new SelectScene({ mode:'training' })); break;
        case 'movelist': Game.setScene(new MoveListScene()); break;
        case 'options': Game.setScene(new OptionScene()); break;
        case 'keys': Game.setScene(new KeyConfigScene()); break;
      }
    }
  }
  draw(ctx){
    drawMenuBG(ctx, this.t);
    Font.draw(ctx, "拳魂 '97", 320, 30, { size: 4, color: '#ffd040', outline: '#8a1010', align: 'center' });
    Font.draw(ctx, 'MODE SELECT', 320, 72, { size: 2, color: '#ff8030', align: 'center' });
    this.items.forEach((it, i) => {
      const sel = i === this.sel;
      const x = 320 + (sel ? Math.sin(this.t * 0.2) * 3 : 0);
      if (sel){
        ctx.fillStyle = 'rgba(255,120,20,0.18)';
        ctx.fillRect(160, 96 + i * 30 - 3, 320, 24);
      }
      Font.draw(ctx, it.label, x, 96 + i * 30, { size: 2, color: sel ? '#ffe040' : '#9098b0', align: 'center' });
    });
    Font.draw(ctx, this.items[this.sel].desc, 320, 322, { size: 1, color: '#80b0d0', align: 'center' });
  }
}

// ---------- 选人 ----------
class SelectScene {
  // cfg.mode: arcade / vs2p / vscpu / training
  constructor(cfg){
    this.cfg = cfg; this.t = 0;
    this.mode = cfg.mode;
    this.teamSize = this.mode === 'training' ? 1 : 3;
    this.grid = CHARS.map(c => c.id);
    this.cursor = [0, Math.min(4, this.grid.length - 1)];
    this.picks = [[], []];
    this.phase = 0; // 0=P1选 1=P2/CPU/木桩选 2=场地
    this.stageSel = 5; // 5=随机
    this.doneT = 0;
    SND.music('select');
  }
  activeSide(){ return this.phase; }
  padFor(side){
    if (this.mode === 'vs2p') return Input.pads[side];
    return Input.pads[0]; // 其余模式全由P1操作
  }
  cpuPicks(){
    // CPU随机组队(不重复)
    const pool = CHARS.filter(c => !c.boss).map(c => c.id);
    const t = [];
    while (t.length < 3){
      const id = U.pick(pool);
      if (!t.includes(id)) t.push(id);
    }
    return t;
  }
  update(){
    this.t++;
    if (this.phase === 3){ // 完成动画后进入战斗
      this.doneT++;
      if (this.doneT > 40) this.launch();
      return;
    }
    const side = this.phase === 2 ? 0 : this.phase;
    const p = this.padFor(this.mode === 'vs2p' && this.phase === 1 ? 1 : 0);
    if (this.phase === 2){
      // 场地选择
      if (p.press.left){ this.stageSel = (this.stageSel + 5) % 6; SND.sfx('cursor'); }
      if (p.press.right){ this.stageSel = (this.stageSel + 1) % 6; SND.sfx('cursor'); }
      if (p.press.a || p.press.start){ SND.sfx('confirm'); this.phase = 3; }
      if (p.press.b){ SND.sfx('cancel'); this.undo(); }
      return;
    }
    const cols = 4;
    if (p.press.left){ this.cursor[side] = (this.cursor[side] + this.grid.length - 1) % this.grid.length; SND.sfx('cursor'); }
    if (p.press.right){ this.cursor[side] = (this.cursor[side] + 1) % this.grid.length; SND.sfx('cursor'); }
    if (p.press.up || p.press.down){
      const cur = this.cursor[side];
      const next = cur >= cols ? cur - cols : cur + cols;
      if (next < this.grid.length) this.cursor[side] = next;
      SND.sfx('cursor');
    }
    if (p.press.d){ // 随机
      this.cursor[side] = U.irand(0, this.grid.length - 1);
      SND.sfx('cursor');
    }
    if (p.press.a || p.press.c){
      const id = this.grid[this.cursor[side]];
      if (this.picks[side].length >= this.teamSize){ return; }
      if (this.picks[side].includes(id)){ SND.sfx('cancel'); return; }
      this.picks[side].push(id);
      SND.sfx('confirm');
      SND.voice(CHARS_BY_ID[id].ename, 1.0, 0.7);
      if (this.picks[side].length >= this.teamSize) this.advance();
      return;
    }
    if (p.press.b) this.undo();
  }
  advance(){
    if (this.phase === 0){
      if (this.mode === 'arcade'){ this.phase = 3; }
      else if (this.mode === 'vscpu'){ this.picks[1] = this.cpuPicks(); this.phase = 2; }
      else if (this.mode === 'training'){ this.phase = 1; }
      else this.phase = 1;
    } else if (this.phase === 1){
      this.phase = 2;
    }
    if (this.phase === 3) this.doneT = 0;
  }
  undo(){
    SND.sfx('cancel');
    if (this.phase >= 3) return;
    if (this.phase === 2){
      this.phase = this.mode === 'vs2p' || this.mode === 'training' ? 1 : 0;
      if (this.mode === 'vscpu') this.picks[1] = [];
      return;
    }
    const side = this.phase;
    if (!this.picks[side]) return;
    if (this.picks[side].length > 0) this.picks[side].pop();
    else if (this.phase === 1){ this.phase = 0; if (this.picks[0].length > 0) this.picks[0].pop(); }
    else Game.setScene(new MenuScene());
  }
  launch(){
    const stageIdx = this.stageSel === 5 ? U.irand(0, 3) : this.stageSel;
    if (this.mode === 'arcade'){
      Game.arcadeTeam = this.picks[0].slice();
      startArcadeBattle();
    } else if (this.mode === 'training'){
      const cfg = {
        mode: 'training', stageIdx,
        teams: [ { ids: this.picks[0], ctrl: 'p1' }, { ids: this.picks[1], ctrl: 'dummy' } ],
        onEnd: (r) => {
          if (r.reselect) Game.setScene(new SelectScene({ mode: 'training' }));
          else Game.setScene(new MenuScene());
        },
      };
      Game.setScene(new BattleScene(cfg, null));
    } else {
      const cfg = {
        mode: this.mode, stageIdx,
        teams: [ { ids: this.picks[0], ctrl: 'p1' }, { ids: this.picks[1], ctrl: this.mode === 'vs2p' ? 'p2' : 'cpu' } ],
        onEnd: (r) => {
          if (r.quit){ Game.setScene(new MenuScene()); return; }
          if (r.reselect){ Game.setScene(new SelectScene(this.cfg)); return; }
          Game.setScene(new ResultScene(r, this.cfg, { stageIdx }));
        },
      };
      Game.setScene(new VsScene([
        { ids: this.picks[0], label: 'P1' },
        { ids: this.picks[1], label: this.mode === 'vs2p' ? 'P2' : 'CPU' },
      ], () => Game.setScene(new BattleScene(cfg, null))));
    }
  }
  draw(ctx){
    drawMenuBG(ctx, this.t, '#3060c0');
    Font.draw(ctx, this.mode === 'training' ? '选择角色与木桩' : '组建你的队伍', 320, 16, { size: 2, color: '#ffe040', align: 'center' });
    // 头像网格
    const cols = 4, cw = 74, ch = 74;
    const gx = 320 - cols * cw / 2, gy = 52;
    this.grid.forEach((id, i) => {
      const c = CHARS_BY_ID[id];
      const x = gx + (i % cols) * cw, y = gy + Math.floor(i / cols) * ch;
      const port = SpriteGen.portrait(c, 64);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(port, x + 4, y + 4, 64, 64);
      ctx.strokeStyle = '#404058'; ctx.lineWidth = 2; ctx.strokeRect(x + 4, y + 4, 64, 64);
      if (c.boss) Font.draw(ctx, 'BOSS', x + 36, y + 58, { size: 1, color: '#ff5050', align: 'center' });
      // 选择光标
      for (let s = 0; s < 2; s++){
        const active = this.phase === s || (this.phase >= 2 && false);
        if (this.phase === s && this.cursor[s] === i){
          const col = s === 0 ? '#ff4040' : '#4080ff';
          const blink = (this.t >> 3) % 2 === 0;
          ctx.strokeStyle = blink ? col : '#fff';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 2, y + 2, 68, 68);
          Font.draw(ctx, s === 0 ? '1P' : '2P', x + 8, y + 8, { size: 1, color: col });
        }
      }
      // 已选标记
      for (let s = 0; s < 2; s++){
        this.picks[s].forEach((pid, order) => {
          if (pid === id){
            const col = s === 0 ? '#ff4040' : '#4080ff';
            ctx.fillStyle = col;
            ctx.fillRect(x + 4 + s * 52, y + 56, 12, 12);
            Font.draw(ctx, String(order + 1), x + 7 + s * 52, y + 58, { size: 1, color: '#fff' });
          }
        });
      }
    });
    // 两侧立绘预览
    this.drawPreview(ctx, 0, 80);
    this.drawPreview(ctx, 1, 560);
    // 队伍槽
    this.drawTeamSlots(ctx, 0, 30, 300);
    this.drawTeamSlots(ctx, 1, 640 - 30 - 3 * 40, 300);
    // 场地选择
    if (this.phase === 2){
      ctx.fillStyle = 'rgba(0,0,10,0.75)'; ctx.fillRect(120, 130, 400, 100);
      ctx.strokeStyle = '#e8c34a'; ctx.strokeRect(120, 130, 400, 100);
      Font.draw(ctx, '选择战斗舞台', 320, 146, { size: 2, color: '#ffe040', align: 'center' });
      const nm = this.stageSel === 5 ? '? 随机舞台 ?' : Stages.list[this.stageSel].name;
      Font.draw(ctx, '< ' + nm + ' >', 320, 186, { size: 2, color: '#fff', align: 'center' });
    }
    if (this.phase === 3){
      Font.draw(ctx, 'READY...', 320, 180, { size: 4, color: '#ffe040', outline: '#802020', align: 'center' });
    }
    const tips = this.phase === 0 ? (this.mode === 'vs2p' ? 'P1 选择 (确认=轻拳 取消=轻脚 随机=重脚)' : '选择角色 (确认=轻拳 取消=轻脚 随机=重脚)')
      : this.phase === 1 ? (this.mode === 'vs2p' ? 'P2 选择' : '选择木桩角色')
      : '出场顺序=选择顺序';
    Font.draw(ctx, tips, 320, 344, { size: 1, color: '#80a0c0', align: 'center' });
  }
  drawPreview(ctx, side, x){
    const picks = this.picks[side];
    let id = null;
    if (this.phase === side) id = this.grid[this.cursor[side]];
    else if (picks.length > 0) id = picks[picks.length - 1];
    if (!id) return;
    const def = side === 0 ? CHARS_BY_ID[id] : CHAR_ALTS[id];
    const anim = getAnim(def, 'idle');
    const idx = animFrameAt(anim, this.t);
    const fr = SpriteGen.getFrame(def, 'idle', idx);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const flip = side === 1;
    const sy = 285;
    if (flip){ ctx.translate(x, sy); ctx.scale(-1, 1); ctx.drawImage(fr.cv, -fr.ox * 2, -fr.oy * 2, fr.cv.width * 2, fr.cv.height * 2); }
    else { ctx.drawImage(fr.cv, x - fr.ox * 2, sy - fr.oy * 2, fr.cv.width * 2, fr.cv.height * 2); }
    ctx.restore();
    const c = CHARS_BY_ID[id];
    Font.draw(ctx, c.ename, x, 300, { size: 2, color: side === 0 ? '#ff8080' : '#80a0ff', align: 'center' });
    Font.draw(ctx, c.title, x, 320, { size: 1, color: '#c0c0d8', align: 'center' });
  }
  drawTeamSlots(ctx, side, x, y){
    for (let i = 0; i < this.teamSize; i++){
      const id = this.picks[side][i];
      ctx.fillStyle = '#181824'; ctx.fillRect(x + i * 40, y, 36, 36);
      ctx.strokeStyle = side === 0 ? '#a04040' : '#4060a0'; ctx.strokeRect(x + i * 40, y, 36, 36);
      if (id){
        const port = SpriteGen.portrait(CHARS_BY_ID[id], 36);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(port, x + i * 40, y, 36, 36);
      } else {
        Font.draw(ctx, String(i + 1), x + i * 40 + 14, y + 12, { size: 2, color: '#404050' });
      }
    }
  }
}

// ---------- VS 过场 ----------
class VsScene {
  constructor(teams, next){ this.teams = teams; this.next = next; this.t = 0; SND.sfx('round'); }
  update(){
    this.t++;
    if (this.t > 130 || Input.anyStart()) this.next();
  }
  draw(ctx){
    drawMenuBG(ctx, this.t, '#c03030');
    const slide = Math.min(1, this.t / 20);
    for (let s = 0; s < 2; s++){
      const team = this.teams[s];
      const bx = s === 0 ? -160 + slide * 220 : 640 + 160 - slide * 220 - 100;
      team.ids.forEach((id, i) => {
        const def = s === 0 ? CHARS_BY_ID[id] : CHAR_ALTS[id];
        const port = SpriteGen.portrait(CHARS_BY_ID[id], 64);
        const y = 70 + i * 80;
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        if (s === 1){ ctx.translate(bx + 100, 0); ctx.scale(-1, 1); ctx.drawImage(port, 0, y, 72, 72); }
        else ctx.drawImage(port, bx, y, 72, 72);
        ctx.restore();
        const px2 = s === 0 ? bx + 80 : bx - 8;
        Font.draw(ctx, CHARS_BY_ID[id].ename, s === 0 ? bx + 80 : bx + 20, y + 26, { size: 2, color: '#ffe0a0', align: s === 0 ? 'left' : 'right' });
      });
      Font.draw(ctx, team.label, s === 0 ? 60 : 580, 34, { size: 3, color: s === 0 ? '#ff6060' : '#6090ff', align: 'center' });
    }
    const vsScale = this.t < 26 ? 9 - this.t * 0.2 : 4;
    Font.draw(ctx, 'VS', 320, 150, { size: Math.max(4, Math.round(vsScale)), color: '#ffe040', outline: '#a02020', align: 'center' });
    if (this.t > 60) Font.draw(ctx, 'PRESS START', 320, 320, { size: 1, color: '#8090b0', align: 'center' });
  }
}

// ---------- 战斗场景包装 ----------
class BattleScene {
  constructor(cfg, meta){
    this.cfg = cfg;
    const origEnd = cfg.onEnd;
    cfg.onEnd = (r) => {
      if (r && r.restart){ this.battle = new Battle(this.cfg); return; }
      if (origEnd) origEnd(r);
    };
    this.battle = new Battle(cfg);
    this.meta = meta;
  }
  update(){ if (!this.battle.matchOver) this.battle.update(); }
  draw(ctx){ this.battle.draw(ctx); }
}

// ---------- 街机模式管理 ----------
const ARCADE_LADDER = [
  { teams: ['mika', 'yuki', 'ryuji'], stage: 2, name:'挑战者·壹' },
  { teams: ['bull', 'ryuji', 'kai'], stage: 1, name:'挑战者·贰' },
  { teams: ['yuki', 'ren', 'mika'], stage: 0, name:'挑战者·叁' },
  { teams: ['kai', 'ren', 'bull'], stage: 3, name:'四天王' },
  { teams: ['ouga'], stage: 4, name:'最终决战', boss: true },
];
function startArcadeBattle(){
  const idx = Game.arcade.stage;
  const rung = ARCADE_LADDER[idx];
  // 避免与玩家队伍完全一致
  let enemyIds = rung.teams.slice();
  const cfg = {
    mode: 'arcade', stageIdx: rung.stage,
    diff: Math.min(5, (OPTS.difficulty) + idx * 0.5 + (rung.boss ? 1 : 0)),
    teams: [ { ids: Game.arcadeTeam, ctrl: 'p1' }, { ids: enemyIds, ctrl: 'cpu' } ],
    onEnd: (r) => {
      if (r.quit){ Game.setScene(new MenuScene()); return; }
      if (r.reselect){ Game.setScene(new SelectScene({ mode: 'arcade' })); return; }
      if (r.winnerSide === 0){
        Game.arcade.score += r.score[0] + 5000;
        Game.arcade.stage++;
        if (Game.arcade.stage >= ARCADE_LADDER.length){
          Game.setScene(new EndingScene());
        } else {
          Game.setScene(new LadderScene());
        }
      } else {
        Game.setScene(new ContinueScene());
      }
    },
  };
  Game.setScene(new VsScene([
    { ids: Game.arcadeTeam, label: 'P1' },
    { ids: enemyIds, label: rung.name },
  ], () => Game.setScene(new BattleScene(cfg, null))));
}
class LadderScene {
  constructor(){ this.t = 0; SND.music('victory'); }
  update(){
    this.t++;
    if (this.t > 60 && (Input.anyStart() || Input.anyBtn())){ SND.sfx('confirm'); startArcadeBattle(); }
  }
  draw(ctx){
    drawMenuBG(ctx, this.t, '#40a060');
    Font.draw(ctx, 'STAGE CLEAR!', 320, 80, { size: 4, color: '#ffe040', outline: '#206020', align: 'center' });
    Font.draw(ctx, 'SCORE: ' + Game.arcade.score, 320, 150, { size: 3, color: '#fff', align: 'center' });
    const next = ARCADE_LADDER[Game.arcade.stage];
    Font.draw(ctx, '下一战: ' + next.name, 320, 210, { size: 2, color: next.boss ? '#ff5050' : '#c0d0e0', align: 'center' });
    next.teams.forEach((id, i) => {
      const port = SpriteGen.portrait(CHARS_BY_ID[id], 48);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(port, 320 - next.teams.length * 28 + i * 56, 236, 48, 48);
    });
    if ((this.t >> 4) % 2) Font.draw(ctx, 'PRESS START', 320, 316, { size: 2, color: '#ffe040', align: 'center' });
  }
}
class ContinueScene {
  constructor(){ this.t = 0; this.count = 9; SND.stopMusic(); SND.voice('Continue?'); }
  update(){
    this.t++;
    if (this.t % 60 === 0){
      this.count--;
      SND.sfx(this.count <= 3 ? 'timerLow' : 'timer');
      if (this.count < 0){ Game.setScene(new TitleScene()); return; }
    }
    if (Input.anyStart() || Input.pads[0].press.a){
      SND.sfx('coin');
      Game.arcade.continues++;
      startArcadeBattle();
    }
  }
  draw(ctx){
    ctx.fillStyle = '#080410'; ctx.fillRect(0, 0, 640, 360);
    // 倒数大字
    Font.draw(ctx, 'CONTINUE?', 320, 70, { size: 4, color: '#ff5050', outline: '#400808', align: 'center' });
    Font.draw(ctx, String(Math.max(0, this.count)), 320, 140, { size: 8, color: (this.t >> 3) % 2 ? '#ffe040' : '#ff8030', outline: '#802020', align: 'center' });
    Font.draw(ctx, 'PRESS START / 轻拳 投币续关', 320, 260, { size: 2, color: '#c0c0d8', align: 'center' });
    Font.draw(ctx, 'SCORE: ' + Game.arcade.score, 320, 300, { size: 1, color: '#8090a8', align: 'center' });
  }
}
// ---------- 通关结算 ----------
class EndingScene {
  constructor(){ this.t = 0; SND.music('victory'); }
  update(){
    this.t++;
    if (this.t > 240 && (Input.anyStart() || Input.anyBtn())) Game.setScene(new TitleScene());
  }
  draw(ctx){
    drawMenuBG(ctx, this.t, '#e8c34a');
    const team = Game.arcadeTeam || [];
    Font.draw(ctx, 'CONGRATULATIONS!', 320, 40, { size: 3, color: '#ffe040', outline: '#802020', align: 'center' });
    Font.draw(ctx, '终焉之王已被击败', 320, 80, { size: 2, color: '#fff', align: 'center' });
    // 胜利队伍站姿
    team.forEach((id, i) => {
      const def = CHARS_BY_ID[id];
      const anim = getAnim(def, 'win');
      const fr = SpriteGen.getFrame(def, 'win', 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(fr.cv, 190 + i * 120 - fr.ox * 2, 260 - fr.oy * 2, fr.cv.width * 2, fr.cv.height * 2);
      Font.draw(ctx, def.ename, 190 + i * 120, 270, { size: 1, color: '#ffd080', align: 'center' });
    });
    Font.draw(ctx, 'SCORE: ' + Game.arcade.score, 320, 296, { size: 2, color: '#ffe040', align: 'center' });
    const rank = Game.arcade.continues === 0 ? 'S' : Game.arcade.continues <= 2 ? 'A' : 'B';
    Font.draw(ctx, 'RANK: ' + rank + '   续关: ' + Game.arcade.continues, 320, 320, { size: 1, color: '#c0c0d8', align: 'center' });
    if (this.t > 240 && (this.t >> 4) % 2) Font.draw(ctx, 'PRESS START', 320, 342, { size: 1, color: '#8090a8', align: 'center' });
  }
}

// ---------- VS结算 ----------
class ResultScene {
  constructor(result, selCfg, meta){
    this.r = result; this.selCfg = selCfg; this.meta = meta; this.t = 0; this.sel = 0;
    SND.music('victory');
  }
  update(){
    this.t++;
    const p = Input.pads[0], p2 = Input.pads[1];
    const up = p.press.up || p2.press.up, down = p.press.down || p2.press.down;
    if (up || down){ this.sel = 1 - this.sel; SND.sfx('cursor'); }
    if (p.press.a || p.press.start || p2.press.a || p2.press.start){
      SND.sfx('confirm');
      if (this.sel === 0) Game.setScene(new SelectScene(this.selCfg));
      else Game.setScene(new MenuScene());
    }
  }
  draw(ctx){
    drawMenuBG(ctx, this.t, '#40a0c0');
    const w = this.r.winnerSide;
    Font.draw(ctx, w === -1 ? 'DRAW GAME' : (w === 0 ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!'), 320, 70, { size: 4, color: '#ffe040', outline: '#204060', align: 'center' });
    Font.draw(ctx, 'P1 SCORE: ' + this.r.score[0], 200, 150, { size: 2, color: '#ff9090', align: 'center' });
    Font.draw(ctx, 'P2 SCORE: ' + this.r.score[1], 440, 150, { size: 2, color: '#90b0ff', align: 'center' });
    ['再来一局(重新选人)', '返回主菜单'].forEach((s, i) => {
      const sel = this.sel === i;
      Font.draw(ctx, (sel ? '> ' : '  ') + s, 320, 220 + i * 34, { size: 2, color: sel ? '#ffe040' : '#9098b0', align: 'center' });
    });
  }
}

// ---------- 出招表 ----------
class MoveListScene {
  constructor(){ this.idx = 0; this.t = 0; }
  update(){
    this.t++;
    const p = Input.pads[0];
    if (p.press.left){ this.idx = (this.idx + CHARS.length - 1) % CHARS.length; SND.sfx('cursor'); }
    if (p.press.right){ this.idx = (this.idx + 1) % CHARS.length; SND.sfx('cursor'); }
    if (p.press.b || p.press.start){ SND.sfx('cancel'); Game.setScene(new MenuScene()); }
  }
  draw(ctx){
    drawMenuBG(ctx, this.t, '#8040c0');
    const c = CHARS[this.idx];
    Font.draw(ctx, '< ' + c.name + ' / ' + c.ename + ' >', 320, 24, { size: 2, color: '#ffe040', align: 'center' });
    Font.draw(ctx, c.title, 320, 50, { size: 1, color: '#c0a0e0', align: 'center' });
    // 立绘
    const anim = getAnim(c, 'idle');
    const fr = SpriteGen.getFrame(c, 'idle', animFrameAt(anim, this.t));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(fr.cv, 90 - fr.ox * 2, 300 - fr.oy * 2, fr.cv.width * 2, fr.cv.height * 2);
    let y = 84;
    const common = [ ['投技', '近身 ←/→ + 重拳'], ['前冲', '→→ (可跑动)'], ['后撤步', '←←'], ['紧急回避', '轻拳+轻脚'], ['吹飞攻击', '重拳+重脚'], ['爆气MAX', '轻拳+轻脚+重拳'], ['防御取消回避', '防御中 轻拳+轻脚 (1气)'] ];
    for (const [nm, cmd] of common){
      Font.draw(ctx, nm, 200, y, { size: 1, color: '#80c0ff' });
      Font.draw(ctx, cmd, 360, y, { size: 1, color: '#d0d0e0' });
      y += 17;
    }
    y += 6;
    for (const [nm, cmd] of c.movelist){
      Font.draw(ctx, nm, 200, y, { size: 1, color: '#ffd080' });
      Font.draw(ctx, cmd, 360, y, { size: 1, color: '#fff' });
      y += 18;
    }
    Font.draw(ctx, '轻脚/START 返回', 320, 340, { size: 1, color: '#8090b0', align: 'center' });
  }
}

// ---------- 系统设置 ----------
class OptionScene {
  constructor(){ this.sel = 0; this.t = 0; }
  items(){
    return [
      { label: '难度', val: '★'.repeat(OPTS.difficulty) + '☆'.repeat(5 - OPTS.difficulty), adj: d => OPTS.difficulty = U.clamp(OPTS.difficulty + d, 1, 5) },
      { label: '回合时间', val: OPTS.roundTime === 0 ? '∞' : OPTS.roundTime + '秒', adj: d => { const arr = [30, 60, 90, 0]; let i = arr.indexOf(OPTS.roundTime); OPTS.roundTime = arr[(i + d + arr.length) % arr.length]; } },
      { label: '音乐音量', val: OPTS.bgmVol + '/10', adj: d => { OPTS.bgmVol = U.clamp(OPTS.bgmVol + d, 0, 10); SND.applyVol(); } },
      { label: '音效音量', val: OPTS.sfxVol + '/10', adj: d => { OPTS.sfxVol = U.clamp(OPTS.sfxVol + d, 0, 10); SND.applyVol(); } },
      { label: '语音播报', val: OPTS.voice ? '开' : '关', adj: () => OPTS.voice = !OPTS.voice },
      { label: '扫描线滤镜', val: OPTS.scanline ? '开' : '关', adj: () => { OPTS.scanline = !OPTS.scanline; applyScanline(); } },
      { label: '返回', val: '', adj: null },
    ];
  }
  update(){
    this.t++;
    const p = Input.pads[0];
    const items = this.items();
    if (p.press.up){ this.sel = (this.sel + items.length - 1) % items.length; SND.sfx('cursor'); }
    if (p.press.down){ this.sel = (this.sel + 1) % items.length; SND.sfx('cursor'); }
    const it = items[this.sel];
    if (it.adj && (p.press.left || p.press.right || p.press.a)){
      it.adj(p.press.left ? -1 : 1);
      OPTS.save();
      SND.sfx('cursor');
    }
    if ((!it.adj && (p.press.a || p.press.start)) || p.press.b){
      SND.sfx('cancel'); OPTS.save();
      Game.setScene(new MenuScene());
    }
  }
  draw(ctx){
    drawMenuBG(ctx, this.t, '#40c080');
    Font.draw(ctx, '系统设置', 320, 40, { size: 3, color: '#ffe040', outline: '#204020', align: 'center' });
    this.items().forEach((it, i) => {
      const sel = i === this.sel;
      Font.draw(ctx, it.label, 220, 100 + i * 30, { size: 2, color: sel ? '#ffe040' : '#9098b0' });
      Font.draw(ctx, it.val, 430, 100 + i * 30, { size: 2, color: sel ? '#fff' : '#788098' });
      if (sel) Font.draw(ctx, '>', 196, 100 + i * 30, { size: 2, color: '#ffe040' });
    });
    Font.draw(ctx, '←→ 调整  轻脚 返回', 320, 330, { size: 1, color: '#80a0c0', align: 'center' });
  }
}

// ---------- 按键设置 ----------
class KeyConfigScene {
  constructor(){
    this.sel = 0; this.player = 0; this.binding = false; this.t = 0;
    this.actions = [ ['up','上'], ['down','下'], ['left','左'], ['right','右'], ['a','轻拳 A'], ['b','轻脚 B'], ['c','重拳 C'], ['d','重脚 D'], ['start','开始'] ];
    Input.consumeKey();
  }
  update(){
    this.t++;
    if (this.binding){
      const code = Input.consumeKey();
      if (code && code !== 'Escape'){
        Input.setKey(this.player, this.actions[this.sel][0], code);
        this.binding = false;
        SND.sfx('confirm');
      } else if (code === 'Escape'){ this.binding = false; SND.sfx('cancel'); }
      return;
    }
    const p = Input.pads[0];
    const total = this.actions.length + 2; // + 重置 + 返回
    if (p.press.up){ this.sel = (this.sel + total - 1) % total; SND.sfx('cursor'); }
    if (p.press.down){ this.sel = (this.sel + 1) % total; SND.sfx('cursor'); }
    if (p.press.left || p.press.right){ this.player = 1 - this.player; SND.sfx('cursor'); }
    if (p.press.a || p.press.start){
      if (this.sel < this.actions.length){
        this.binding = true;
        Input.consumeKey();
        SND.sfx('cursor');
      } else if (this.sel === this.actions.length){
        Input.resetKeys(); SND.sfx('confirm');
      } else {
        SND.sfx('cancel'); Game.setScene(new MenuScene());
      }
    }
    if (p.press.b){ SND.sfx('cancel'); Game.setScene(new MenuScene()); }
  }
  draw(ctx){
    drawMenuBG(ctx, this.t, '#c0a040');
    Font.draw(ctx, '按键设置', 320, 26, { size: 3, color: '#ffe040', outline: '#403010', align: 'center' });
    Font.draw(ctx, '< 玩家 ' + (this.player + 1) + ' >', 320, 60, { size: 2, color: this.player === 0 ? '#ff9090' : '#90b0ff', align: 'center' });
    this.actions.forEach(([key, label], i) => {
      const sel = i === this.sel;
      Font.draw(ctx, label, 220, 88 + i * 22, { size: 1, color: sel ? '#ffe040' : '#9098b0' });
      const kn = Input.keyName(Input.keymap[this.player][key]);
      const txt = this.binding && sel ? '请按键...' : kn;
      Font.draw(ctx, txt, 400, 88 + i * 22, { size: 1, color: sel ? '#fff' : '#788098' });
      if (sel) Font.draw(ctx, '>', 200, 88 + i * 22, { size: 1, color: '#ffe040' });
    });
    const extraSel = this.sel === this.actions.length;
    Font.draw(ctx, (extraSel ? '> ' : '') + '恢复默认', 320, 96 + this.actions.length * 22, { size: 1, color: extraSel ? '#ffe040' : '#9098b0', align: 'center' });
    const backSel = this.sel === this.actions.length + 1;
    Font.draw(ctx, (backSel ? '> ' : '') + '返回', 320, 118 + this.actions.length * 22, { size: 1, color: backSel ? '#ffe040' : '#9098b0', align: 'center' });
  }
}
