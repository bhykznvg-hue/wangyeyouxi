// ============ battle.js : 战斗流程 (回合/组队/飞行道具/镜头/暂停) ============
'use strict';
class Battle {
  // cfg: { teams:[{ids:[..],ctrl:'p1'|'p2'|'cpu'},..], stageIdx, mode:'arcade'|'vs'|'vscpu'|'training', onEnd(result), diff }
  constructor(cfg){
    this.cfg = cfg;
    this.mode = cfg.mode;
    this.training = cfg.mode === 'training';
    this.stage = Stages.list[cfg.stageIdx % Stages.list.length];
    this.floorY = 320;
    this.stageW = this.stage.width;
    this.frame = 0;
    this.teams = [
      { ids: cfg.teams[0].ids.slice(), ctrl: cfg.teams[0].ctrl, lostCount: 0 },
      { ids: cfg.teams[1].ids.slice(), ctrl: cfg.teams[1].ctrl, lostCount: 0 },
    ];
    this.score = [0, 0];
    this.roundNum = 0;
    this.projectiles = [];
    this.cam = { x: 0 };
    this.announceList = [];
    this.freezeT = 0; this.freezeOwner = null;
    this.slowmo = 0;
    this.paused = false;
    this.pauseSel = 0;
    this.showMoveList = false; this.moveListSide = 0;
    this.koDone = false;
    this.inputLog = [];
    this.dummyMode = U.load('dummyMode', 0); // 0站立 1蹲下 2全防 3随机防 4跳跃 5CPU
    this.fighters = [null, null];
    this.matchOver = false;
    this.startRound(true);
    SND.music(this.stage.music);
  }

  get stageL(){ return 0; }
  get stageR(){ return this.stageW; }
  makeFighter(side, entering){
    const team = this.teams[side];
    const id = team.ids[team.lostCount];
    const alt = side === 1 && this.teams[0].ids.includes(id) || side === 1;
    const f = new Fighter(id, side, side === 1, this);
    f.x = side === 0 ? this.stageW / 2 - 130 : this.stageW / 2 + 130;
    f.facing = side === 0 ? 1 : -1;
    if (this.training){ f.power = 3000; }
    return f;
  }

  startRound(first){
    this.roundNum++;
    this.projectiles = [];
    FX.clear();
    this.time = this.training ? Infinity : (OPTS.roundTime === 0 ? Infinity : OPTS.roundTime);
    this.timeTick = 0;
    this.koDone = false;
    const keepWinner = this.lastWinner != null && !first;
    for (let s = 0; s < 2; s++){
      if (keepWinner && s === this.lastWinner && this.fighters[s] && this.teams[s].lostCount < this.teams[s].ids.length){
        // 胜者留场: 回复部分体力
        const f = this.fighters[s];
        f.health = Math.min(f.maxHealth, f.health + Math.round(f.maxHealth * 0.15));
        f.guardGauge = 100;
        f.x = s === 0 ? this.stageW / 2 - 130 : this.stageW / 2 + 130;
        f.y = 0; f.vx = 0; f.vy = 0;
        f.setState(ST.IDLE, 'idle');
        f.dispHealth = null;
      } else {
        this.fighters[s] = this.makeFighter(s);
      }
      const f = this.fighters[s];
      f.battle = this;
      f.setState(ST.ENTER, 'intro');
      // 控制器
      const ctrl = this.teams[s].ctrl;
      if (ctrl === 'cpu'){
        f.aiCtrl = new AIController(f, this.cfg.diff || OPTS.difficulty);
        f.pad = f.aiCtrl.pad;
      } else {
        f.pad = Input.pads[ctrl === 'p1' ? 0 : 1];
      }
    }
    if (this.training){
      this.fighters.forEach(f => { f.setState(ST.IDLE, 'idle'); });
      this.phase = 'fight';
      this.applyDummy();
    } else {
      this.phase = 'intro';
      this.phaseT = 0;
    }
    this.updateCamera(true);
  }

  applyDummy(){
    const dummy = this.fighters[1];
    if (this.teams[1].ctrl !== 'dummy') return;
    if (this.dummyMode === 5){
      dummy.aiCtrl = new AIController(dummy, OPTS.difficulty);
      dummy.pad = dummy.aiCtrl.pad;
    } else {
      dummy.aiCtrl = null;
      dummy.pad = { up:false,down:false,left:false,right:false,a:false,b:false,c:false,d:false,start:false,prev:{},press:{} };
    }
  }

  announce(text, dur, big){
    this.announceList.push({ text, t: 0, dur: dur || 40, big });
  }

  superFreeze(owner, frames){
    this.freezeT = frames;
    this.freezeOwner = owner;
    SND.sfx('superFlash');
    FX.flash(6, '#fff', 0.5);
  }

  onDamage(attacker, victim, dmg, isHit){
    this.score[attacker.side] += dmg;
    if (this.training){
      this.lastDmg = dmg;
      this.lastDmgT = 60;
    }
  }

  spawnProjectile(owner, spec){
    const dir = owner.facing;
    this.projectiles.push({
      owner, dir, type: spec.type,
      x: owner.x + spec.x * dir,
      y: this.floorY - owner.y + spec.y,
      vx: (spec.vx || 0) * dir,
      vy: spec.vy || 0,
      w: spec.w || 30, h: spec.h || 30,
      life: spec.life || 120, t: 0,
      warn: spec.delay || 0,
      data: spec, hitFlag: false,
    });
  }

  // ---------- 主更新 ----------
  update(){
    // 暂停
    if (this.handlePause()) return;
    this.frame++;
    // 慢动作(KO)
    if (this.slowmo > 0){
      this.slowmo--;
      if (this.frame % 2 === 0){ FX.update(); return; }
    }
    // 超必杀停帧
    if (this.freezeT > 0){
      this.freezeT--;
      FX.update();
      if (this.freezeT === 0) this.freezeOwner = null;
      return;
    }
    FX.update();
    switch (this.phase){
      case 'intro': this.updateIntro(); break;
      case 'round': this.updateRoundCall(); break;
      case 'fight': this.updateFight(); break;
      case 'ko': this.updateKOPhase(); break;
      case 'roundend': this.updateRoundEnd(); break;
      case 'timeup': this.updateTimeUp(); break;
      case 'matchend': this.updateMatchEnd(); break;
    }
    // 公告计时
    for (let i = this.announceList.length - 1; i >= 0; i--){
      const a = this.announceList[i];
      a.t++;
      if (a.t > a.dur) this.announceList.splice(i, 1);
    }
    this.updateCamera();
  }

  updateIntro(){
    this.phaseT++;
    this.fighters.forEach(f => { f.stateT++; f.animT++; f.stateLogic(); });
    if (this.phaseT === 1){
      this.announce(this.stage.name, 70);
    }
    if (this.phaseT > 66){
      this.phase = 'round'; this.phaseT = 0;
      const r = Math.min(this.roundNum, 9);
      this.announce('ROUND ' + r, 60, true);
      SND.sfx('round');
      SND.voice('Round ' + r);
    }
  }
  updateRoundCall(){
    this.phaseT++;
    this.fighters.forEach(f => { f.setState(ST.IDLE, 'idle'); f.animT++; });
    if (this.phaseT === 55){
      this.announce('FIGHT!', 40, true);
      SND.voice('Fight!');
      SND.sfx('powerup');
    }
    if (this.phaseT >= 60){
      this.phase = 'fight';
    }
  }

  updateFight(){
    // 计时
    if (this.time !== Infinity){
      this.timeTick++;
      if (this.timeTick >= 60){
        this.timeTick = 0;
        this.time--;
        if (this.time <= 10 && this.time > 0) SND.sfx(this.time <= 5 ? 'timerLow' : 'timer');
        if (this.time <= 0){ this.phase = 'timeup'; this.phaseT = 0; return; }
      }
    }
    // AI
    for (const f of this.fighters) if (f.aiCtrl) f.aiCtrl.update();
    // 训练木桩
    if (this.training && this.teams[1].ctrl === 'dummy' && !this.fighters[1].aiCtrl){
      this.updateDummyPad();
    }
    // 朝向
    for (const f of this.fighters){
      if (f.actionable && f.grounded){
        const want = f.opp.x > f.x ? 1 : -1;
        if (want !== f.facing && Math.abs(f.opp.x - f.x) > 6) f.facing = want;
      }
    }
    // 更新
    for (const f of this.fighters) f.update();
    this.pushCollision();
    this.updateProjectiles();
    this.resolveHits();
    this.recordInputs();
    // 训练回血
    if (this.training){
      for (const f of this.fighters){
        if (f.comboTimer === 0 && f.actionable){
          if (f.health < f.maxHealth) f.health = Math.min(f.maxHealth, f.health + 6);
        }
        if (f.power < 3000 && this.frame % 4 === 0) f.power = Math.min(3000, f.power + 40);
      }
    }
    // KO检测
    if (!this.training){
      const dead = this.fighters.filter(f => f.health <= 0);
      if (dead.length > 0 && !this.koDone){
        this.koDone = true;
        this.phase = 'ko'; this.phaseT = 0;
        this.slowmo = 50;
        this.announce('K.O.', 80, true);
        SND.sfx('ko'); SND.voice('K.O.!', 0.8, 0.5);
        FX.flash(10, '#fff', 0.7);
        FX.shake(16, 6);
        for (const f of dead){
          FX.spawn('kolight', f.x, 0);
          if (f.state !== ST.LAUNCHED && f.state !== ST.KNOCKFALL && f.state !== ST.KO){
            f.setState(ST.KNOCKFALL, 'fallB');
            f.vx = -f.facing * 4; f.vy = 6; f.y = Math.max(f.y, 0.02); f.hardKD = true;
          }
        }
      }
    }
  }

  updateDummyPad(){
    const d = this.fighters[1], p = d.pad;
    for (const k of ['up','down','left','right','a','b','c','d']){ p.prev[k] = p[k]; p[k] = false; }
    switch (this.dummyMode){
      case 1: p.down = true; break;
      case 2: { // 全防
        const back = d.facing === 1 ? 'left' : 'right';
        p[back] = true;
        if (this.fighters[0].curMove && (this.fighters[0].curMove.hits || []).some(h => h.guard === 'low')) p.down = true;
        break; }
      case 3: if ((this.frame >> 5) % 2){ p[d.facing === 1 ? 'left' : 'right'] = true; if ((this.frame >> 6) % 2) p.down = true; } break;
      case 4: if (d.grounded && this.frame % 50 === 0) p.up = true; break;
    }
    for (const k of ['up','down','left','right','a','b','c','d']) p.press[k] = p[k] && !p.prev[k];
  }

  updateKOPhase(){
    this.phaseT++;
    for (const f of this.fighters) f.update();
    this.pushCollision();
    this.updateProjectiles();
    // 等双方落定 (带保险)
    const settled = this.fighters.every(f => f.health > 0 ? true : (f.state === ST.KO && f.grounded && Math.abs(f.vx) < 0.6));
    if ((this.phaseT > 70 && settled) || this.phaseT > 420){
      this.phase = 'roundend'; this.phaseT = 0;
      const alive = this.fighters.filter(f => f.health > 0);
      if (alive.length === 1){
        const w = alive[0];
        this.lastWinner = w.side;
        w.setState(ST.WIN, 'win');
        const perfect = w.health >= w.maxHealth;
        if (perfect){ this.announce('PERFECT!', 70, true); SND.voice('Perfect!'); }
        this.score[w.side] += 1000 + Math.round(w.health);
        this.teams[1 - w.side].lostCount++;
        SND.sfx('powerup');
      } else {
        // 双KO
        this.lastWinner = null;
        this.announce('DOUBLE K.O.', 70, true);
        this.teams[0].lostCount++;
        this.teams[1].lostCount++;
      }
    }
  }
  updateRoundEnd(){
    this.phaseT++;
    for (const f of this.fighters){ f.stateT++; f.animT++; if (f.state === ST.WIN) f.setAnim('win'); }
    if (this.phaseT >= 110){
      // 检查队伍
      const out0 = this.teams[0].lostCount >= this.teams[0].ids.length;
      const out1 = this.teams[1].lostCount >= this.teams[1].ids.length;
      if (out0 || out1){
        this.phase = 'matchend'; this.phaseT = 0;
        this.winnerSide = out0 && out1 ? -1 : (out0 ? 1 : 0);
        this.announce(this.winnerSide === -1 ? 'DRAW GAME' : (this.winnerSide === 0 ? 'PLAYER 1 WINS!' : (this.teams[1].ctrl === 'cpu' ? 'CPU WINS!' : 'PLAYER 2 WINS!')), 100, true);
        SND.voice('Winner!');
        SND.music('victory');
      } else {
        this.startRound(false);
      }
    }
  }
  updateTimeUp(){
    this.phaseT++;
    if (this.phaseT === 1){
      this.announce('TIME UP', 70, true);
      SND.voice('Time up');
      const [f1, f2] = this.fighters;
      const p1 = f1.health / f1.maxHealth, p2 = f2.health / f2.maxHealth;
      if (Math.abs(p1 - p2) < 0.001){
        this.teams[0].lostCount++; this.teams[1].lostCount++;
        this.lastWinner = null;
        f1.setState(ST.LOSE, 'lose'); f2.setState(ST.LOSE, 'lose');
      } else {
        const w = p1 > p2 ? f1 : f2;
        const l = p1 > p2 ? f2 : f1;
        this.lastWinner = w.side;
        this.teams[l.side].lostCount++;
        w.setState(ST.WIN, 'win');
        l.setState(ST.LOSE, 'lose');
      }
    }
    for (const f of this.fighters){ f.stateT++; f.animT++; }
    if (this.phaseT >= 90){
      this.phase = 'roundend';
      this.phaseT = 100; // 直接走队伍判定
    }
  }
  updateMatchEnd(){
    this.phaseT++;
    for (const f of this.fighters){ f.stateT++; f.animT++; if (f.state === ST.WIN) f.setAnim('win'); }
    if (this.phaseT > 150){
      this.matchOver = true;
      if (this.cfg.onEnd) this.cfg.onEnd({ winnerSide: this.winnerSide, score: this.score, teams: this.teams });
    }
  }

  // ---------- 推挤 ----------
  pushCollision(){
    const [a, b] = this.fighters;
    const pa = a.pushbox(), pb = b.pushbox();
    if (!pa || !pb || !U.boxHit(pa, pb)) return;
    const overlap = Math.min(pa.x + pa.w, pb.x + pb.w) - Math.max(pa.x, pb.x);
    const half = overlap / 2 + 0.5;
    const leftF = a.x <= b.x ? a : b;
    const rightF = a.x <= b.x ? b : a;
    leftF.x -= half; rightF.x += half;
    leftF.x = U.clamp(leftF.x, 18, this.stageW - 18);
    rightF.x = U.clamp(rightF.x, 18, this.stageW - 18);
    // 角落: 把另一方顶开
    if (rightF.x >= this.stageW - 18.5) leftF.x = rightF.x - overlap - 30 + half;
    if (leftF.x <= 18.5) rightF.x = leftF.x + overlap + 30 - half;
  }

  // ---------- 飞行道具 ----------
  updateProjectiles(){
    for (let i = this.projectiles.length - 1; i >= 0; i--){
      const pr = this.projectiles[i];
      if (pr.warn > 0){ pr.warn--; pr.t++; continue; }
      pr.t++;
      pr.x += pr.vx; pr.y += pr.vy || 0;
      if (pr.t > pr.life || pr.x < -80 || pr.x > this.stageW + 80){ this.projectiles.splice(i, 1); continue; }
      // 道具互消
      for (let j = this.projectiles.length - 1; j > i; j--){
        const o = this.projectiles[j];
        if (o.owner !== pr.owner && o.warn <= 0 && !pr.data.big && !o.data.big &&
            Math.abs(o.x - pr.x) < (o.w + pr.w) / 2 && Math.abs(o.y - pr.y) < (o.h + pr.h) / 2){
          FX.spawn('fireB', (o.x + pr.x) / 2, (o.y + pr.y) / 2);
          SND.sfx('fire_hit');
          if (!o.data.big) this.projectiles.splice(j, 1);
          if (!pr.data.big){ this.projectiles.splice(i, 1); }
          break;
        }
      }
    }
  }

  // ---------- 命中判定 ----------
  resolveHits(){
    const [a, b] = this.fighters;
    this.checkFighterHits(a, b);
    this.checkFighterHits(b, a);
    // 飞行道具
    for (let i = this.projectiles.length - 1; i >= 0; i--){
      const pr = this.projectiles[i];
      if (pr.warn > 0 || pr.hitFlag) continue;
      const target = pr.owner.opp;
      const hb = target.hurtbox();
      if (!hb) continue;
      const box = { x: pr.x - pr.w / 2, y: pr.y - pr.h / 2, w: pr.w, h: pr.h };
      if (U.boxHit(box, hb)){
        const d = pr.data;
        const hd = { dmg: d.dmg, hs: d.hs, bs: d.bs, stop: d.stop || 8, guard: d.guard || 'mid',
                     kbx: d.kbx || 4, kby: d.kby, launch: d.launch, knockdown: d.knockdown, hard: d.hard,
                     spark: d.spark || 'fireP', sfx: d.sfx || 'fire_hit', chip: true, chipBig: d.chipBig,
                     x: 20, y: -(this.floorY - pr.y), w: pr.w, h: pr.h };
        target.applyHit(pr.owner, hd, true);
        if (d.big){ pr.hitFlag = true; } // 大波: 只命中一次, 继续飞行
        else { this.projectiles.splice(i, 1); }
      }
    }
  }
  checkFighterHits(att, def){
    const hits = att.activeHits();
    if (hits.length === 0) return;
    const hb = def.hurtbox();
    if (!hb) return;
    for (const h of hits){
      if (U.boxHit(h.box, hb)){
        // 浮空追击限制
        if (def.airborne && (def.state === ST.LAUNCHED || def.state === ST.KNOCKFALL) && def.jugglePts <= 0) { att.hitDone[h.idx] = true; continue; }
        att.hitDone[h.idx] = true;
        def.applyHit(att, h.data, false);
        return;
      }
    }
  }

  recordInputs(){
    if (!this.training) return;
    const f = this.fighters[0];
    if (!f.pad) return;
    const last = this.inputLog[this.inputLog.length - 1];
    const dir = f.relDir || 5;
    const btns = ['a','b','c','d'].filter(bt => f.pad.press[bt]);
    if (btns.length > 0 || (last && last.dir !== dir && dir !== 5) || (!last && dir !== 5)){
      if (last && last.dir === dir && btns.length === 0) {} 
      else {
        this.inputLog.push({ dir, btns, f: this.frame });
        if (this.inputLog.length > 14) this.inputLog.shift();
      }
    }
  }

  // ---------- 镜头 ----------
  updateCamera(snap){
    const [a, b] = this.fighters;
    if (!a || !b) return;
    const mid = (a.x + b.x) / 2;
    let target = U.clamp(mid - 320, 0, this.stageW - 640);
    if (snap) this.cam.x = target;
    else this.cam.x += (target - this.cam.x) * 0.12;
    // 双方保持在屏内
    for (const f of this.fighters){
      f.x = U.clamp(f.x, this.cam.x + 24, this.cam.x + 616);
    }
  }

  // ---------- 暂停 ----------
  handlePause(){
    const startP = Input.pads[0].press.start || Input.pads[1].press.start;
    if (!this.paused){
      if (startP && (this.phase === 'fight' || this.training)){
        this.paused = true; this.pauseSel = 0; this.showMoveList = false;
        SND.sfx('confirm');
      }
      return false;
    }
    // 暂停中
    const p1 = Input.pads[0], p2 = Input.pads[1];
    const nav = (p) => ({ up: p.press.up, down: p.press.down, left: p.press.left, right: p.press.right, ok: p.press.a || p.press.start, back: p.press.b });
    const n1 = nav(p1), n2 = nav(p2);
    const n = { up: n1.up || n2.up, down: n1.down || n2.down, left: n1.left || n2.left, right: n1.right || n2.right, ok: n1.ok || n2.ok, back: n1.back || n2.back };
    if (this.showMoveList){
      if (n.left || n.right){ this.moveListSide = 1 - this.moveListSide; SND.sfx('cursor'); }
      if (n.back || n.ok){ this.showMoveList = false; SND.sfx('cancel'); }
      return true;
    }
    const items = this.pauseItems();
    if (n.up){ this.pauseSel = (this.pauseSel + items.length - 1) % items.length; SND.sfx('cursor'); }
    if (n.down){ this.pauseSel = (this.pauseSel + 1) % items.length; SND.sfx('cursor'); }
    if (this.training && items[this.pauseSel].id === 'dummy' && (n.left || n.right)){
      this.dummyMode = (this.dummyMode + (n.right ? 1 : 5)) % 6;
      this.applyDummy();
      SND.sfx('cursor');
    }
    if (n.ok){
      const it = items[this.pauseSel];
      SND.sfx('confirm');
      switch (it.id){
        case 'resume': this.paused = false; break;
        case 'movelist': this.showMoveList = true; break;
        case 'dummy': this.dummyMode = (this.dummyMode + 1) % 6; this.applyDummy(); break;
        case 'reset': 
          this.fighters.forEach((f, s) => {
            f.health = f.maxHealth; f.power = this.training ? 3000 : f.power;
            f.x = s === 0 ? this.stageW / 2 - 130 : this.stageW / 2 + 130;
            f.y = 0; f.vx = 0; f.vy = 0; f.setState(ST.IDLE, 'idle');
            f.comboCount = 0; f.dispHealth = null;
          });
          this.projectiles = [];
          this.paused = false;
          break;
        case 'restart': this.matchOver = true; if (this.cfg.onEnd) this.cfg.onEnd({ restart: true, score: this.score }); break;
        case 'reselect': this.matchOver = true; if (this.cfg.onEnd) this.cfg.onEnd({ reselect: true, score: this.score }); break;
        case 'quit': this.matchOver = true; if (this.cfg.onEnd) this.cfg.onEnd({ quit: true, score: this.score }); break;
      }
    }
    return true;
  }
  pauseItems(){
    const items = [ { id:'resume', label:'继续战斗' }, { id:'movelist', label:'出招表' } ];
    if (this.training){
      items.push({ id:'dummy', label:'木桩行为: ' + ['站立','蹲下','全部防御','随机防御','跳跃','CPU对战'][this.dummyMode] });
      items.push({ id:'reset', label:'重置位置' });
    }
    items.push({ id:'restart', label:'重新开始本场' });
    items.push({ id:'reselect', label:'重新选人' });
    items.push({ id:'quit', label:'返回主菜单' });
    return items;
  }

  // ---------- 绘制 ----------
  draw(ctx){
    const shake = FX.shakeOffset();
    const cam = { x: this.cam.x + shake[0], y: 0 };
    ctx.save();
    ctx.translate(0, shake[1]);
    Stages.draw(ctx, this.stage, cam, this.frame);
    // 超必杀暗转
    const darken = this.freezeT > 0;
    if (darken){
      ctx.fillStyle = 'rgba(0,0,20,0.62)';
      ctx.fillRect(0, -20, 640, 400);
    }
    // 角色 (被冻结时施放者高亮)
    const order = this.fighters.slice().sort((x, y) => (x.state === ST.LIE ? -1 : 0) - (y.state === ST.LIE ? -1 : 0));
    for (const f of order){
      if (darken && f === this.freezeOwner){
        // 放光
        ctx.save();
        const px2 = Math.round(f.x - cam.x);
        const grd = ctx.createRadialGradient(px2, this.floorY - f.y - 70, 10, px2, this.floorY - f.y - 70, 130);
        grd.addColorStop(0, U.rgba(f.def.themeColor, 0.5));
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(px2 - 130, this.floorY - f.y - 200, 260, 260);
        ctx.restore();
      }
      f.draw(ctx, cam);
    }
    // 飞行道具
    for (const pr of this.projectiles){
      FX.drawProjectile(ctx, pr, cam, this.frame);
    }
    FX.draw(ctx, cam);
    ctx.restore();
    // 超必杀放射线
    if (darken && this.freezeOwner){
      const f = this.freezeOwner;
      const cx = Math.round(f.x - cam.x), cy = this.floorY - f.y - 80;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = f.def.themeColor;
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++){
        const a = (i / 12) * U.TAU + this.frame * 0.1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60);
        ctx.lineTo(cx + Math.cos(a) * 400, cy + Math.sin(a) * 400);
        ctx.stroke();
      }
      ctx.restore();
      // 招式名
      const mv = f.curMove;
      if (mv){
        const spName = this.findMoveName(f, mv.id);
        if (spName){
          Font.draw(ctx, spName, f.side === 0 ? 30 : 610, 250, { size: 3, color: '#ffe040', outline: '#802020', align: f.side === 0 ? 'left' : 'right' });
        }
      }
      // 头像切入
      const port = SpriteGen.portrait(f.def, 36);
      const t = Math.min(1, (42 - this.freezeT) / 8);
      ctx.imageSmoothingEnabled = false;
      const px3 = f.side === 0 ? -80 + t * 110 : 640 + 80 - t * 110 - 72;
      ctx.drawImage(port, px3, 180, 72, 72);
      ctx.strokeStyle = '#ffe040'; ctx.lineWidth = 3; ctx.strokeRect(px3, 180, 72, 72);
    }
    FX.drawScreenFlash(ctx);
    // HUD
    HUD.draw(ctx, this);
    // 公告
    this.drawAnnounce(ctx);
    // 训练信息
    if (this.training) this.drawTrainingInfo(ctx);
    // 暂停菜单
    if (this.paused) this.drawPause(ctx);
  }
  findMoveName(f, moveId){
    const base = CHARS_BY_ID[f.baseId];
    for (const s of (base.supers || [])) if (s.move.id === moveId) return s.name;
    for (const s of (base.specials || [])) if (s.move.id === moveId) return s.name;
    return null;
  }

  drawAnnounce(ctx){
    let y = 130;
    for (const a of this.announceList){
      const scale = a.big ? (a.t < 6 ? 7 - a.t * 0.5 : 4) : 2;
      const alpha = a.t > a.dur - 10 ? (a.dur - a.t) / 10 : 1;
      ctx.globalAlpha = alpha;
      Font.draw(ctx, a.text, 320, y, { size: Math.round(scale), color: a.big ? '#ffe040' : '#fff', outline: a.big ? '#a02020' : '#202040', align: 'center' });
      ctx.globalAlpha = 1;
      y += a.big ? 50 : 26;
    }
  }

  drawTrainingInfo(ctx){
    // 输入历史
    let y = 120;
    Font.draw(ctx, 'INPUT', 16, y - 16, { size: 1, color: '#80c0ff' });
    const DIRCH = { 1:'↙', 2:'↓', 3:'↘', 4:'←', 6:'→', 7:'↖', 8:'↑', 9:'↗', 5:'' };
    for (let i = this.inputLog.length - 1; i >= 0; i--){
      const e = this.inputLog[i];
      let s = DIRCH[e.dir] || '';
      if (e.btns.length) s += (s ? '+' : '') + e.btns.map(b => b.toUpperCase()).join('+');
      if (!s) continue;
      Font.draw(ctx, s, 16, y, { size: 2, color: i === this.inputLog.length - 1 ? '#ffe040' : '#c0c0d0' });
      y += 16;
      if (y > 280) break;
    }
    if (this.lastDmgT > 0){
      this.lastDmgT--;
      Font.draw(ctx, 'DMG ' + this.lastDmg, 550, 120, { size: 2, color: '#ff9040' });
    }
    Font.draw(ctx, '按 START 打开训练菜单', 320, 344, { size: 1, color: '#607090', align: 'center' });
  }

  drawPause(ctx){
    ctx.fillStyle = 'rgba(4,4,16,0.82)';
    ctx.fillRect(0, 0, 640, 360);
    if (this.showMoveList){ this.drawMoveList(ctx); return; }
    Font.draw(ctx, 'PAUSE', 320, 70, { size: 4, color: '#ffe040', outline: '#802020', align: 'center' });
    const items = this.pauseItems();
    items.forEach((it, i) => {
      const sel = i === this.pauseSel;
      Font.draw(ctx, (sel ? '> ' : '  ') + it.label, 320, 140 + i * 26, { size: 2, color: sel ? '#ffe040' : '#a0a0b8', align: 'center' });
    });
  }
  drawMoveList(ctx){
    const f = this.fighters[this.moveListSide];
    const base = CHARS_BY_ID[f.baseId];
    Font.draw(ctx, base.name + ' 出招表', 320, 34, { size: 3, color: '#ffe040', outline: '#802020', align: 'center' });
    Font.draw(ctx, '< 左右切换角色 >', 320, 66, { size: 1, color: '#8090b0', align: 'center' });
    let y = 92;
    const common = [ ['投技', '近身 ←/→ + 重拳'], ['前冲/后撤', '→→ / ←←'], ['紧急回避', '轻拳+轻脚'], ['吹飞攻击', '重拳+重脚'], ['爆气MAX', '轻拳+轻脚+重拳'], ['受身', '落地瞬间 轻拳+轻脚'] ];
    for (const [nm, cmd] of common){
      Font.draw(ctx, nm, 140, y, { size: 1, color: '#80c0ff' });
      Font.draw(ctx, cmd, 320, y, { size: 1, color: '#d0d0e0' });
      y += 16;
    }
    y += 8;
    for (const [nm, cmd] of base.movelist){
      Font.draw(ctx, nm, 140, y, { size: 1, color: '#ffd080' });
      Font.draw(ctx, cmd, 320, y, { size: 1, color: '#fff' });
      y += 17;
    }
    Font.draw(ctx, '按 轻脚 返回', 320, 330, { size: 1, color: '#8090b0', align: 'center' });
  }
}
