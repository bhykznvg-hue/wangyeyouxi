// ============ fighter.js : 角色状态机/物理/判定/取消/投技 ============
'use strict';
const ST = {
  IDLE:'idle', WALKF:'walkF', WALKB:'walkB', RUN:'run', PREJUMP:'prejump', AIR:'air', LAND:'land',
  CROUCH:'crouch', BLOCK:'block', BLOCKSTUN:'blockstun', HITSTUN:'hitstun', LAUNCHED:'launched',
  KNOCKFALL:'knockfall', LIE:'lie', WAKEUP:'wakeup', ROLLF:'rollF', ROLLB:'rollB', BACKDASH:'backdash',
  ATTACK:'attack', THROWING:'throwing', THROWN:'thrown', RECOVER:'recover', WIN:'win', LOSE:'lose', KO:'ko',
  GUARDCRUSH:'guardcrush', ENTER:'enter',
};

class Fighter {
  constructor(charId, side, alt, battle){
    this.def = getCharDef(charId, alt);
    this.baseId = charId;
    this.side = side;            // 0=P1 1=P2
    this.battle = battle;
    this.reset(true);
  }
  reset(full){
    const s = this.def.stats;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.facing = this.side === 0 ? 1 : -1;
    this.state = ST.IDLE; this.stateT = 0;
    this.maxHealth = s.hp; 
    if (full) { this.health = s.hp; this.power = 0; this.maxMode = 0; }
    this.guardGauge = 100;
    this.hitstop = 0;
    this.curMove = null; this.moveFrame = 0; this.hitDone = []; this.moveHitConnected = false;
    this.chainCount = 0;
    this.animName = 'idle'; this.animT = 0;
    this.comboCount = 0; this.comboDmg = 0; this.comboTimer = 0;
    this.jugglePts = 0;
    this.blockStance = 'hi';
    this.stunT = 0;             // 硬直剩余
    this.hardKD = false;
    this.crouching = false;
    this.runHold = 0;
    this.cmd = new CommandBuffer();
    this.pad = null;
    this.flashT = 0;            // 受击白闪
    this.armorFlash = 0;
    this.ghosts = [];           // 残影
    this.throwScript = null;
    this.invulnT = 0;           // 起身无敌
    this.throwProtect = 0;      // 被摔保护
    this.dead = false;
    this.landMove = null;
    this.introT = 0;
    this.freezePose = false;
    this.aiCtrl = null;
    this.techWindow = 0;
    this.lastHitWasCounter = false;
  }
  get opp(){ return this.battle.fighters[1 - this.side]; }
  get grounded(){ return this.y <= 0.01 && this.state !== ST.AIR && this.state !== ST.PREJUMP; }
  get airborne(){ return this.y > 0.01 || this.state === ST.AIR || this.state === ST.LAUNCHED || this.state === ST.KNOCKFALL; }
  get stocks(){ return Math.floor(this.power / 1000); }
  get lowHealth(){ return this.health <= this.maxHealth * 0.25; }
  get inMax(){ return this.maxMode > 0; }
  get actionable(){
    return [ST.IDLE, ST.WALKF, ST.WALKB, ST.CROUCH, ST.RUN, ST.BLOCK].includes(this.state);
  }
  get throwable(){
    if (this.throwProtect > 0 || this.invulnT > 0) return false;
    if (!this.grounded) return false;
    return [ST.IDLE, ST.WALKF, ST.WALKB, ST.RUN, ST.CROUCH, ST.BLOCK, ST.ATTACK, ST.LAND, ST.ROLLF, ST.ROLLB, ST.BACKDASH].includes(this.state);
  }

  setState(st, anim){
    this.state = st; this.stateT = 0;
    if (anim) this.setAnim(anim);
  }
  setAnim(name){
    if (this.animName !== name){ this.animName = name; this.animT = 0; }
  }

  // ---------- 每帧 ----------
  update(){
    if (this.hitstop > 0){
      this.hitstop--;
      // 硬直中仍收集输入(缓冲手感)
      this.feedInput();
      return;
    }
    this.stateT++; this.animT++;
    if (this.flashT > 0) this.flashT--;
    if (this.armorFlash > 0) this.armorFlash--;
    if (this.invulnT > 0) this.invulnT--;
    if (this.throwProtect > 0) this.throwProtect--;
    if (this.techWindow > 0) this.techWindow--;
    if (this.maxMode > 0){
      this.maxMode--;
      if (this.maxMode === 0) SND.sfx('cancel');
      if (this.battle.frame % 5 === 0)
        FX.spawn('ember', this.x + U.rand(-16, 16), this.battle.floorY - U.rand(0, 130), { vy: -1.4, color: this.def.themeColor, life: 24 });
    }
    if (this.comboTimer > 0){ this.comboTimer--; if (this.comboTimer === 0){ this.comboCount = 0; this.comboDmg = 0; } }
    if (this.state !== ST.BLOCKSTUN && this.guardGauge < 100) this.guardGauge = Math.min(100, this.guardGauge + 0.18);

    this.feedInput();
    this.stateLogic();
    this.physics();
    this.updateGhosts();
  }

  feedInput(){
    if (!this.pad) return;
    const p = this.pad;
    // 相对朝向的数字方向
    let h = 0, v = 0;
    if (p.left) h = -1; else if (p.right) h = 1;
    if (p.up) v = 1; else if (p.down) v = -1;
    const fh = h * this.facing; // 1=前
    let dir = 5;
    if (v === 1) dir = fh === 1 ? 9 : (fh === -1 ? 7 : 8);
    else if (v === -1) dir = fh === 1 ? 3 : (fh === -1 ? 1 : 2);
    else dir = fh === 1 ? 6 : (fh === -1 ? 4 : 5);
    this.relDir = dir;
    this.cmd.feed(dir, p);
  }

  // ---------- 状态逻辑 ----------
  stateLogic(){
    const p = this.pad;
    switch (this.state){
      case ST.ENTER: {
        this.setAnim('intro');
        if (this.stateT > 56) this.setState(ST.IDLE, 'idle');
        return; }
      case ST.WIN: this.setAnim(this.animName === 'win' ? 'win' : 'win'); return;
      case ST.LOSE: this.setAnim('lose'); return;
      case ST.KO: this.updateKO(); return;
      case ST.THROWING: this.updateThrowing(); return;
      case ST.THROWN: return; // 由对方脚本控制
      case ST.ATTACK: this.updateAttack(); return;
      case ST.HITSTUN: case ST.GUARDCRUSH: {
        this.vx *= 0.86;
        if (this.stateT >= this.stunT){
          this.setState(this.crouching ? ST.CROUCH : ST.IDLE, this.crouching ? 'crouch' : 'idle');
        }
        return; }
      case ST.BLOCKSTUN: {
        this.vx *= 0.85;
        this.setAnim(this.blockStance === 'lo' ? 'crouchBlock' : 'standBlock');
        // 防御取消翻滚 (消耗1气)
        if (p && this.power >= 1000 && this.pressedTogether('a', 'b')){
          this.power -= 1000;
          SND.sfx('roll');
          this.battle.announce('GC ROLL', 30);
          this.startRoll(this.relDir === 4 || this.relDir === 1 ? -1 : 1, true);
          return;
        }
        if (this.stateT >= this.stunT){
          this.setState(this.blockStance === 'lo' ? ST.CROUCH : ST.IDLE);
        }
        return; }
      case ST.LAUNCHED: {
        this.setAnim('launch');
        return; } // 落地在physics处理
      case ST.KNOCKFALL: {
        this.setAnim('fallB');
        return; }
      case ST.LIE: {
        this.vx *= 0.7;
        this.setAnim('lie');
        const wakeT = this.hardKD ? 46 : 30;
        if (this.stateT >= wakeT){
          this.setState(ST.WAKEUP, 'wakeup');
          this.invulnT = 22;
        }
        return; }
      case ST.WAKEUP: {
        if (this.stateT >= 19) this.setState(ST.IDLE, 'idle');
        return; }
      case ST.RECOVER: {
        if (this.stateT >= 16){ this.setState(ST.IDLE, 'idle'); }
        return; }
      case ST.ROLLF: case ST.ROLLB: {
        if (this.stateT >= 24){ this.vx = 0; this.setState(ST.IDLE, 'idle'); }
        return; }
      case ST.BACKDASH: {
        if (this.stateT >= 17){ this.vx = 0; this.setState(ST.IDLE, 'idle'); }
        return; }
      case ST.PREJUMP: {
        if (this.stateT >= 4){
          const s = this.def.stats;
          this.vy = -s.jumpVY;     // jumpVY为负值(屏幕向上) => vy正=上升
          this.vx = this.jumpDir * (this.jumpRun ? s.jumpVX * 1.35 : s.jumpVX);
          if (this.jumpDir === 0) this.vx = 0;
          this.y = 0.02;
          this.setState(ST.AIR, this.jumpDir === 0 ? 'jumpU' : 'jumpF');
          SND.sfx('jump');
        }
        return; }
      case ST.AIR: {
        if (this.vy < -1.5) this.setAnim('fall');
        this.airActions();
        return; }
      case ST.LAND: {
        if (this.stateT >= (this.landLag || 6)){ this.landLag = 0; this.setState(ST.IDLE, 'idle'); }
        return; }
    }
    if (!p) { this.neutralPose(); return; }
    // ===== 可行动状态 =====
    this.groundActions();
  }

  neutralPose(){
    if (this.state === ST.IDLE) this.setAnim('idle');
  }

  pressedTogether(b1, b2){
    const p = this.pad;
    return (p.press[b1] && (p[b2] || p.press[b2])) || (p.press[b2] && (p[b1] || p.press[b1]));
  }
  pressedTriple(){
    const p = this.pad;
    const pr = p.press.a || p.press.b || p.press.c;
    return pr && p.a && p.b && p.c;
  }

  groundActions(){
    const p = this.pad;
    const dir = this.relDir;
    const down = dir <= 3;
    this.crouching = down;

    // --- 爆气 MAX (A+B+C) ---
    if (this.pressedTriple() && this.power >= 1000 && !this.inMax){
      this.power -= 1000;
      this.maxMode = 480;
      SND.sfx('maxOn'); SND.sfx(this.def.shout);
      FX.spawn('ring', this.x, this.battle.floorY - 70, { color: this.def.themeColor });
      FX.shake(8, 3);
      this.battle.announce('MAX MODE!', 40);
      this.setState(ST.IDLE, 'idle');
      return;
    }
    // --- 翻滚 (A+B) ---
    if (this.pressedTogether('a', 'b')){
      this.startRoll(down ? 0 : (dir === 4 || dir === 1 || dir === 7 ? -1 : 1), false);
      if (this.state === ST.ROLLF || this.state === ST.ROLLB) return;
    }
    // --- CD吹飞 ---
    if (this.pressedTogether('c', 'd')){
      this.startMove(this.def.normals.cd);
      return;
    }
    // --- 必杀/超必杀 (按键触发) ---
    for (const b of ['a','b','c','d']){
      if (p.press[b]){
        if (this.trySpecial(b)) return;
      }
    }
    // --- 投技 (近身 方向+C/D) ---
    if ((p.press.c || p.press.d) && (dir === 4 || dir === 6)){
      if (this.tryThrow(dir === 6 ? 1 : -1, p.press.c ? 'c' : 'd')) return;
    }
    // --- 普通技 ---
    for (const b of ['a','b','c','d']){
      if (p.press[b]){
        const n = down ? this.def.normals['cr' + b] : this.def.normals[b];
        if (n){ this.startMove(n); return; }
      }
    }
    // --- 跳跃 ---
    if (dir >= 7){
      this.jumpDir = dir === 9 ? 1 : (dir === 7 ? -1 : 0);
      this.jumpDir *= this.facing;
      this.jumpRun = this.state === ST.RUN ? 1 : 0;
      if (this.state === ST.RUN && this.jumpDir === 0) this.jumpDir = this.facing;
      this.vx = 0;
      this.setState(ST.PREJUMP, 'prejump');
      return;
    }
    // --- 跑步/后撤步 ---
    if (this.cmd.doubleTapF() && this.grounded && this.state !== ST.RUN){
      this.setState(ST.RUN, 'run');
      SND.sfx('dash');
      return;
    }
    if (this.cmd.doubleTapB() && this.grounded){
      this.setState(ST.BACKDASH, 'backdash');
      this.vx = -this.facing * 5.0;
      this.invulnT = 8;
      SND.sfx('roll');
      return;
    }
    if (this.state === ST.RUN){
      if (dir === 6 || dir === 3 || dir === 9){
        this.vx = this.facing * this.def.stats.run;
        if (this.battle.frame % 6 === 0) FX.spawn('runDust', this.x - this.facing * 14, this.battle.floorY, { dir: this.facing });
        return;
      }
      this.vx = 0; this.setState(ST.IDLE, 'idle');
      return;
    }
    // --- 防御姿态(被攻击接近时按后) ---
    const oppAttacking = this.opp && this.opp.threatening() && Math.abs(this.opp.x - this.x) < 190;
    if ((dir === 4 || dir === 1) && oppAttacking){
      this.blockStance = dir === 1 ? 'lo' : 'hi';
      this.vx = 0;
      this.setState(ST.BLOCK, dir === 1 ? 'crouchBlock' : 'standBlock');
      return;
    }
    if (this.state === ST.BLOCK && !oppAttacking) this.setState(ST.IDLE, 'idle');
    // --- 蹲/走 ---
    if (down){
      this.vx = 0;
      this.setState(ST.CROUCH, 'crouch');
      return;
    }
    if (dir === 6){ this.vx = this.facing * this.def.stats.walkF; this.setState(ST.WALKF, 'walkF'); return; }
    if (dir === 4){ this.vx = -this.facing * this.def.stats.walkB; this.setState(ST.WALKB, 'walkB'); return; }
    this.vx = 0;
    if (this.state !== ST.BLOCK) this.setState(ST.IDLE, 'idle');
  }

  airActions(){
    const p = this.pad;
    if (!p) return;
    for (const b of ['a','b','c','d']){
      if (p.press[b]){
        const n = this.def.normals['j' + b];
        if (n && this.state === ST.AIR){
          this.startMove(n, true);
          return;
        }
      }
    }
  }

  threatening(){
    return this.state === ST.ATTACK || (this.battle.projectiles || []).some(pr => pr.owner === this && Math.abs(pr.x - this.opp.x) < 200);
  }

  startRoll(dir, guardCancel){
    if (dir === 0) dir = 1;
    const fwd = dir > 0;
    this.setState(fwd ? ST.ROLLF : ST.ROLLB, fwd ? 'rollF' : 'rollB');
    this.vx = dir * this.facing * 4.3;
    this.invulnT = guardCancel ? 18 : 15;
    SND.sfx('roll');
    FX.spawn('dust', this.x, this.battle.floorY);
  }

  // ---------- 必杀技检测 ----------
  trySpecial(btn){
    const def = this.def;
    // 超必杀(优先, MAX版优先判定)
    const supers = (def.supers || []).slice().sort((a, b) => (b.max ? 1 : 0) - (a.max ? 1 : 0));
    for (const sp of supers){
      if (sp.btn !== btn && sp.alsoBtn !== btn) continue;
      if (!this.cmd.motion(sp.motion)) continue;
      const isMax = !!sp.max;
      if (isMax){
        const can = this.inMax || (this.lowHealth && this.power >= 1000);
        if (!can) continue;
        if (this.inMax) this.maxMode = 0; else this.power -= 1000;
        this.startMove(sp.move);
        return true;
      } else {
        if (this.power < sp.cost) continue;
        this.power -= sp.cost;
        this.startMove(sp.move);
        return true;
      }
    }
    for (const sp of (def.specials || [])){
      if (sp.btn !== btn && sp.alsoBtn !== btn) continue;
      if (!this.cmd.motion(sp.motion)) continue;
      this.startMove(sp.move);
      return true;
    }
    return false;
  }

  // ---------- 出招 ----------
  startMove(move, isAir){
    this.curMove = move;
    this.moveFrame = 0;
    this.hitDone = new Array((move.hits || []).length).fill(false);
    this.moveHitConnected = false;
    this.grabDone = false;
    this.setState(ST.ATTACK, move.anim);
    this.animT = 0;
    if (!move.air){ this.vx = 0; }
    if (move.freeze){
      this.battle.superFreeze(this, move.freeze);
    }
    if (move.sfxStart) SND.sfx(move.sfxStart);
    if (move.cost > 0 || move.freeze) SND.sfx(this.def.shout);
    else if (move.id.length > 3 && U.chance(0.4)) SND.sfx(this.def.shout); // 必杀技吆喝
    this.projSpawned = {};
  }

  updateAttack(){
    const mv = this.curMove;
    if (!mv){ this.setState(ST.IDLE, 'idle'); return; }
    this.moveFrame++;
    const f = this.moveFrame;
    // 速度控制
    let velApplied = false;
    for (const v of (mv.vel || [])){
      if (f >= v.from && f <= v.to){
        this.vx = (v.vx || 0) * this.facing;
        if (v.vy != null) this.vy = -v.vy; // 招式数据vy负=向上 => 转为vy正=上升
        velApplied = true;
      }
    }
    if (!velApplied && !mv.air && this.grounded) this.vx *= 0.8;
    // 升空判断
    if (mv.gravityFrom && f >= mv.gravityFrom){
      // 交给physics重力
    } else if (mv.vel && mv.vel.some(v => v.vy != null && f >= v.from && f <= v.to)){
      this.y = Math.max(this.y, 0.02);
    }
    // 飞行道具
    for (const pj of (mv.proj || [])){
      const key = pj.frame + '_' + pj.x;
      if (f === pj.frame && !this.projSpawned[key]){
        this.projSpawned[key] = true;
        this.battle.spawnProjectile(this, pj);
      }
    }
    // 特殊帧回调
    if (mv.onFrame && mv.onFrame[f] === 'pillarFx'){
      FX.shake(10, 4); SND.sfx('explode');
      FX.spawn('fireB', this.x + this.facing * 60, this.battle.floorY - 80);
    }
    // 残影
    if (mv.afterimage && f >= mv.afterimage[0] && f <= mv.afterimage[1] && f % 3 === 0){
      this.addGhost();
    }
    // 指令投
    if (mv.grab && !this.grabDone){
      const gf = mv.grab.frame, gFrom = mv.grab.frameFrom, gTo = mv.grab.frameTo;
      const inWindow = gf ? f === gf : (f >= gFrom && f <= gTo);
      if (inWindow) this.tryCommandGrab(mv.grab);
    }
    // 派生(連牙)
    if (mv.next && this.pad && this.moveHitConnected){
      const w = mv.next.window;
      if (f >= w[0] && f <= w[1]){
        for (const b of mv.next.btns){
          if (this.pad.press[b] && this.cmd.motion(mv.next.motion)){
            const nm = findExtraMove(this.def, mv.next.move);
            if (nm){ this.startMove(nm); return; }
          }
        }
      }
    }
    // 取消: 普通技 -> 必杀/超必杀
    if (mv.cancel && this.moveHitConnected && this.pad){
      if (f >= mv.cancel[0] && f <= mv.cancel[1] + 4){
        for (const b of ['a','b','c','d']){
          if (this.pad.press[b]){
            if (this.trySpecial(b)) return;
            // 连打取消(轻攻击链)
            if (mv.chain && this.chainCount < 3){
              const target = this.crouching || this.relDir <= 3 ? this.def.normals['cr' + b] : this.def.normals[b];
              if (target && target.chain){
                this.chainCount++;
                this.startMove(target);
                return;
              }
            }
          }
        }
      }
    }
    // 空中普通技: 落地即结束
    if (mv.air && this.grounded && f > 2){
      this.curMove = null; this.chainCount = 0;
      this.setState(ST.LAND, 'land');
      this.landLag = 5;
      SND.sfx('land');
      return;
    }
    // 结束
    if (f >= mv.total && !(mv.air)){
      if (mv.gravityFrom && this.y > 0.01){
        // 仍在空中(升龙下落) 等待落地
        return;
      }
      this.curMove = null; this.chainCount = 0;
      this.setState(this.crouching ? ST.CROUCH : ST.IDLE, this.crouching ? 'crouch' : 'idle');
    }
  }

  // ---------- 投技 ----------
  tryThrow(dirSign, btn){
    const opp = this.opp;
    if (!this.grounded || !opp) return false;
    const dist = Math.abs(opp.x - this.x);
    if (dist > 58 || !opp.throwable || opp.airborne) return false;
    // 拆投判定
    if (opp.pad && opp.cmd.btnWithin(btn, 10) && (opp.relDir === 4 || opp.relDir === 6) && opp.actionable){
      // TECH!
      SND.sfx('tech');
      this.battle.announce('拆投!', 30);
      this.vx = -this.facing * 5; opp.vx = -opp.facing * 5;
      this.setState(ST.RECOVER, 'recover'); opp.setState(ST.RECOVER, 'recover');
      this.throwProtect = 30; opp.throwProtect = 30;
      return true;
    }
    this.beginThrow({ type: 'basic', dmg: 105, dirSign, btn });
    return true;
  }
  tryCommandGrab(grab){
    const opp = this.opp;
    const dist = Math.abs(opp.x - this.x);
    const facingOk = (opp.x - this.x) * this.facing > -10;
    if (dist <= grab.range + 24 && facingOk && opp.throwable && !opp.airborne){
      this.grabDone = true;
      this.beginThrow({ type: grab.type, dmg: grab.dmg, dirSign: 1 });
    }
  }
  beginThrow(info){
    const opp = this.opp;
    SND.sfx('throwGrab');
    this.setState(ST.THROWING);
    this.setAnim(info.type === 'basic' ? 'throwF' : (this.curMove ? this.curMove.anim : 'throwF'));
    this.curMove = null;
    opp.setState(ST.THROWN, 'hitHi');
    opp.vx = 0; opp.vy = 0;
    opp.comboTimer = 60;
    this.throwScript = Object.assign({ t: 0 }, info);
  }
  updateThrowing(){
    const s = this.throwScript;
    const opp = this.opp;
    if (!s){ this.setState(ST.IDLE, 'idle'); return; }
    s.t++;
    const fl = this.battle.floorY;
    const dir = this.facing * (s.dirSign || 1);
    switch (s.type){
      case 'basic': {
        if (s.t < 10){ opp.x = this.x + this.facing * 40; opp.setAnim('hitHi'); }
        else if (s.t < 20){ opp.x = this.x + this.facing * 20; opp.y = 30 + (s.t - 10) * 4; opp.setAnim('launch'); }
        else if (s.t === 20){
          this.dealThrowDamage(s.dmg, opp);
          opp.setState(ST.LAUNCHED, 'launch');
          opp.vx = dir * 6.5; opp.vy = 6.5;
          opp.hardKD = true; opp.jugglePts = 0;
          FX.spawn('hitB', opp.x, fl - 90); FX.shake(6, 3); SND.sfx('slam');
          this.setState(ST.ATTACK, 'throwF');
          this.curMove = { id:'_throwEnd', anim:'throwF', total: 16, hits: [] };
          this.moveFrame = 24; this.hitDone = [];
          this.curMove.total = 40;
        }
        break; }
      case 'spin': { // 铁牛旋转炸弹
        if (s.t < 30){
          const a = s.t * 0.5;
          opp.x = this.x + Math.cos(a) * 30 * this.facing;
          opp.y = 40 + Math.sin(a * 0.7) * 20 + s.t;
          opp.setAnim('launch');
          if (s.t % 8 === 0) SND.sfx('whiff_h');
        } else if (s.t === 30){
          opp.x = this.x + this.facing * 30; opp.y = 0;
          this.dealThrowDamage(s.dmg, opp);
          opp.setState(ST.LAUNCHED, 'fallB');
          opp.vx = this.facing * 3; opp.vy = 4; opp.hardKD = true; opp.jugglePts = 0;
          FX.spawn('hitB', opp.x, fl - 30); FX.shake(14, 5); SND.sfx('slam'); SND.sfx('explode');
          FX.spawn('dust', opp.x, fl);
        } else if (s.t > 44){ this.setState(ST.IDLE, 'idle'); this.throwScript = null; }
        break; }
      case 'run': { // 蛮牛突进
        if (s.t < 16){
          this.x += this.facing * 5; opp.x = this.x + this.facing * 34; opp.y = 20; opp.setAnim('launch');
        } else if (s.t === 16){
          this.dealThrowDamage(s.dmg, opp);
          opp.setState(ST.LAUNCHED, 'fallB');
          opp.vx = this.facing * 2; opp.vy = 7; opp.hardKD = true; opp.jugglePts = 0;
          FX.spawn('hitB', opp.x, fl - 60); FX.shake(10, 4); SND.sfx('slam');
        } else if (s.t > 34){ this.setState(ST.IDLE, 'idle'); this.throwScript = null; }
        break; }
      case 'super': { // 极限炸弹: 三连摔
        const seq = [26, 52, 84];
        if (s.t < seq[0]){
          const a = s.t * 0.45;
          opp.x = this.x + Math.cos(a) * 26 * this.facing;
          opp.y = 50 + s.t * 1.4; opp.setAnim('launch');
        } else if (s.t === seq[0] || s.t === seq[1]){
          opp.x = this.x + this.facing * 34; opp.y = 0;
          this.dealThrowDamage(Math.round(s.dmg * 0.3), opp);
          opp.setAnim('fallB');
          FX.spawn('hitB', opp.x, fl - 20); FX.shake(10, 5); SND.sfx('slam');
          FX.spawn('dust', opp.x, fl);
        } else if (s.t > seq[0] && s.t < seq[1]){
          const tt = s.t - seq[0];
          opp.x = this.x + this.facing * 30; opp.y = Math.max(0, 60 - Math.abs(tt - 13) * 5); opp.setAnim('launch');
        } else if (s.t > seq[1] && s.t < seq[2]){
          const tt = s.t - seq[1];
          opp.x = this.x + this.facing * 26; opp.y = Math.min(110, tt * 5); opp.setAnim('launch');
          if (s.t === seq[1] + 14) SND.sfx('shout_b');
        } else if (s.t === seq[2]){
          opp.x = this.x + this.facing * 36; opp.y = 0;
          this.dealThrowDamage(Math.round(s.dmg * 0.4), opp);
          opp.setState(ST.LAUNCHED, 'fallB');
          opp.vx = this.facing * 4; opp.vy = 8; opp.hardKD = true; opp.jugglePts = 0;
          FX.spawn('fireB', opp.x, fl - 30); FX.shake(18, 7); SND.sfx('explode'); SND.sfx('ko');
          FX.flash(8, '#fff', 0.6);
        } else if (s.t > seq[2] + 16){ this.setState(ST.IDLE, 'idle'); this.throwScript = null; }
        break; }
    }
    if (s.type === 'basic' && s.t >= 21){ this.throwScript = null; }
  }
  dealThrowDamage(dmg, opp){
    const finalDmg = Math.round(dmg * (this.inMax ? 1.15 : 1));
    opp.health = Math.max(0, opp.health - finalDmg);
    opp.flashT = 6;
    this.power = Math.min(3000, this.power + 40);
    opp.power = Math.min(3000, opp.power + 30);
    this.battle.onDamage(this, opp, finalDmg, true);
  }

  // ---------- 物理 ----------
  physics(){
    const fl = 0;
    this.x += this.vx;
    if (this.airborne || this.y > 0){
      this.y += this.vy;
      this.vy -= this.def.stats.gravity;
      if (this.y <= fl){
        this.y = 0; 
        this.onLand();
      }
    }
    // 场地边界
    const b = this.battle;
    this.x = U.clamp(this.x, b.stageL + 18, b.stageR - 18);
  }
  onLand(){
    const wasVy = this.vy;
    this.vy = 0;
    switch (this.state){
      case ST.AIR: {
        this.vx = 0;
        this.setState(ST.LAND, 'land');
        this.landLag = 5; SND.sfx('land');
        FX.spawn('dust', this.x, this.battle.floorY);
        break; }
      case ST.ATTACK: {
        const mv = this.curMove;
        if (mv && mv.air){
          this.curMove = null;
          this.setState(ST.LAND, 'land'); this.landLag = 6; SND.sfx('land');
        } else if (mv && mv.landLag){
          this.vx = 0;
          this.curMove = null;
          this.setState(ST.LAND, 'land'); this.landLag = mv.landLag; SND.sfx('land');
          FX.spawn('dust', this.x, this.battle.floorY);
        }
        break; }
      case ST.LAUNCHED: case ST.KNOCKFALL: {
        // 受身判定
        if (!this.hardKD && this.pad && this.cmd.btnWithin('a', 8) && this.cmd.btnWithin('b', 8)){
          this.setState(ST.RECOVER, 'recover');
          this.vx = -this.facing * 3;
          this.invulnT = 20;
          SND.sfx('tech');
          this.battle.announce('受身!', 26);
          FX.spawn('dust', this.x, this.battle.floorY);
          break;
        }
        if (Math.abs(wasVy) > 4 && !this.bounced){
          this.bounced = true;
          this.vy = Math.abs(wasVy) * 0.28;
          this.vx *= 0.5;
          this.y = 0.02;
          SND.sfx('land');
          FX.spawn('dust', this.x, this.battle.floorY);
          if (this.health <= 0){ this.setState(ST.KO); this.setAnim('lie'); }
          break;
        }
        this.bounced = false;
        this.vx = 0;
        if (this.health <= 0){ this.setState(ST.KO); this.setAnim('lie'); }
        else this.setState(ST.LIE, 'lie');
        FX.spawn('dust', this.x, this.battle.floorY);
        break; }
      case ST.KO: {
        this.vx *= 0.4;
        if (Math.abs(wasVy) > 3){ this.vy = Math.abs(wasVy) * 0.25; this.y = 0.02; SND.sfx('land'); }
        break; }
    }
  }
  updateKO(){
    if (this.grounded) this.vx *= 0.7;
    this.setAnim('lie');
  }

  // ---------- 判定盒 ----------
  hurtbox(){
    if (this.invulnT > 0) return null;
    if (this.state === ST.LIE || this.state === ST.WAKEUP && this.stateT < 10) return null;
    if (this.state === ST.KO || this.state === ST.WIN || this.state === ST.LOSE || this.state === ST.ENTER) return null;
    if ((this.state === ST.ROLLF || this.state === ST.ROLLB) && this.stateT < 16) return null;
    // 必杀技无敌帧
    const mv = this.curMove;
    if (mv && this.state === ST.ATTACK){
      for (const iv of (mv.inv || [])){
        if (this.moveFrame >= iv.from && this.moveFrame <= iv.to){
          if (iv.type === 'full') return null;
          if (iv.type === 'upper') return this.boxRel(-17, -70, 34, 70);
        }
      }
      if (mv.passThrough && this.moveFrame >= mv.passThrough[0] && this.moveFrame <= mv.passThrough[1]) return null;
    }
    const sc = this.def.body.scale || 1;
    if (this.airborne) return this.boxRel(-16 * sc, -120 * sc - this.y * 0 , 32 * sc, 92 * sc, true);
    if (this.crouching || this.state === ST.CROUCH || (mv && mv.stance === 'crouch'))
      return this.boxRel(-17 * sc, -100 * sc, 34 * sc, 100 * sc);
    return this.boxRel(-17 * sc, -142 * sc, 34 * sc, 142 * sc);
  }
  boxRel(x, y, w, h, air){
    const fl = this.battle.floorY;
    const bx = this.facing === 1 ? this.x + x : this.x - x - w;
    return { x: bx, y: fl - this.y + y, w, h };
  }
  pushbox(){
    const sc = this.def.body.scale || 1;
    if (this.state === ST.LIE || this.state === ST.KO) return null;
    return this.boxRel(-15 * sc, this.airborne ? -110 * sc : -140 * sc, 30 * sc, this.airborne ? 80 * sc : 140 * sc);
  }
  activeHits(){
    const out = [];
    if (this.state !== ST.ATTACK || !this.curMove) return out;
    const mv = this.curMove;
    const f = this.moveFrame;
    (mv.hits || []).forEach((h, i) => {
      if (this.hitDone[i]) return;
      if (f >= h.from && f <= h.to){
        const fl = this.battle.floorY;
        const bx = this.facing === 1 ? this.x + h.x : this.x - h.x - h.w;
        out.push({ box: { x: bx, y: fl - this.y + h.y, w: h.w, h: h.h }, data: h, idx: i, move: mv });
      }
    });
    return out;
  }
  hasArmor(){
    const mv = this.curMove;
    if (!mv || this.state !== ST.ATTACK) return false;
    return (mv.armor || []).some(a => this.moveFrame >= a.from && this.moveFrame <= a.to);
  }

  // ---------- 受击 ----------
  applyHit(attacker, hd, isProjectile){
    const b = this.battle;
    // 防御判定
    const holdingBack = this.relDir === 4 || this.relDir === 1 || this.relDir === 7;
    const canBlock = (this.actionable || this.state === ST.BLOCK || this.state === ST.BLOCKSTUN) && this.grounded && holdingBack && this.pad;
    let blocked = false;
    if (canBlock){
      const lo = this.relDir === 1;
      if (hd.guard === 'mid') blocked = true;
      else if (hd.guard === 'low') blocked = lo;
      else if (hd.guard === 'high') blocked = !lo;
    }
    // 霸体
    if (!blocked && this.hasArmor()){
      this.armorFlash = 8;
      const dmg = Math.round(hd.dmg * 0.25);
      this.health = Math.max(0, this.health - dmg);
      SND.sfx('block'); FX.spawn('guard', this.x + this.facing * 20, b.floorY - 100, { dir: this.facing });
      b.onDamage(attacker, this, dmg, false);
      return { blocked: false, armor: true };
    }
    if (blocked){
      const chip = hd.chip ? Math.round(hd.dmg * (hd.chipBig ? 0.25 : 0.15)) : 0;
      if (chip > 0){ this.health = Math.max(0, this.health - chip); b.onDamage(attacker, this, chip, false); }
      this.blockStance = this.relDir === 1 ? 'lo' : 'hi';
      this.stunT = hd.bs;
      this.setState(ST.BLOCKSTUN, this.blockStance === 'lo' ? 'crouchBlock' : 'standBlock');
      this.vx = -this.facing * (hd.kbx || 3) * 0.8;
      this.hitstop = Math.max(4, (hd.stop || 6) - 2);
      attacker.hitstop = Math.max(4, (hd.stop || 6) - 2);
      if (!isProjectile) attacker.moveHitConnected = true;
      SND.sfx('block');
      FX.spawn('guard', this.x + this.facing * 22, b.floorY - this.y - 100, { dir: this.facing });
      // 防御槽
      this.guardGauge -= hd.bs * 1.1;
      attacker.power = Math.min(3000, attacker.power + 15);
      if (this.guardGauge <= 0){
        this.guardGauge = 100;
        this.stunT = 44;
        this.setState(ST.GUARDCRUSH, 'hitHi');
        SND.sfx('guardCrush');
        b.announce('GUARD CRUSH!', 40);
        FX.shake(8, 4);
      }
      return { blocked: true };
    }
    // ===== 命中 =====
    const counter = this.state === ST.ATTACK && !this.moveHitConnected;
    let dmg = hd.dmg;
    // 连击补正
    const comboIdx = this.comboCount;
    dmg = Math.round(dmg * Math.max(0.35, 1 - comboIdx * 0.07));
    if (counter) dmg = Math.round(dmg * 1.25);
    if (attacker.inMax) dmg = Math.round(dmg * 1.15);
    this.health = Math.max(0, this.health - dmg);
    this.flashT = 5;
    this.comboCount++;
    this.comboDmg += dmg;
    this.comboTimer = 50;
    // 气力
    attacker.power = Math.min(3000, attacker.power + Math.min(60, dmg * 0.55));
    this.power = Math.min(3000, this.power + Math.min(45, dmg * 0.35));
    // 中断当前动作
    this.curMove = null; this.chainCount = 0;
    if (!isProjectile) attacker.moveHitConnected = true;
    // 硬直/浮空
    const stop = hd.stop || 6;
    this.hitstop = stop; attacker.hitstop = stop;
    const launched = hd.launch || this.airborne;
    if (launched){
      if (this.airborne && this.jugglePts <= 0 && !hd.launch){
        // 落地保护
      }
      this.jugglePts = this.airborne ? this.jugglePts - 1 : 2;
      this.setState(ST.LAUNCHED, 'launch');
      this.vx = -this.facing * Math.max(2, (hd.kbx || 3));
      this.vy = Math.abs(hd.kby || 6);
      if (this.y <= 0) this.y = 0.02;
      this.hardKD = !!hd.hard;
      this.bounced = false;
    } else if (hd.knockdown){
      this.setState(ST.KNOCKFALL, 'fallB');
      this.vx = -this.facing * (hd.kbx || 5);
      this.vy = Math.abs(hd.kby || 4.5);
      this.y = Math.max(this.y, 0.02);
      this.hardKD = !!hd.hard;
      this.bounced = false;
    } else {
      this.stunT = hd.hs + (counter ? 6 : 0);
      const low = hd.guard === 'low' || (this.crouching && this.grounded);
      this.setState(ST.HITSTUN, this.crouching ? 'hitCr' : (hd.y < -100 ? 'hitHi' : 'hitLo'));
      this.vx = -this.facing * (hd.kbx || 3);
    }
    // 特效
    const fl = b.floorY;
    const hitY = fl - this.y + (hd.y || -100) + (hd.h || 30) / 2;
    FX.spawn(hd.spark || 'hit', this.x + this.facing * -10 + (attacker.x - this.x) * 0.3, hitY, { dir: attacker.facing });
    SND.sfx(hd.sfx || 'hit_l');
    if (counter){ SND.sfx('counter'); b.announce('COUNTER!', 26); }
    if (dmg >= 60 || hd.knockdown) FX.shake(Math.min(12, 4 + dmg * 0.06), Math.min(6, 2 + dmg * 0.04));
    if (hd.hard) FX.flash(5, '#fff', 0.4);
    b.onDamage(attacker, this, dmg, true);
    return { blocked: false, dmg };
  }

  // ---------- 残影 ----------
  addGhost(){
    this.ghosts.push({ x: this.x, y: this.y, anim: this.animName, idx: this.currentAnimIdx(), facing: this.facing, t: 0 });
    if (this.ghosts.length > 5) this.ghosts.shift();
  }
  updateGhosts(){
    for (let i = this.ghosts.length - 1; i >= 0; i--){
      this.ghosts[i].t++;
      if (this.ghosts[i].t > 14) this.ghosts.splice(i, 1);
    }
    if (this.state === ST.RUN && this.battle.frame % 4 === 0) this.addGhost();
  }
  currentAnimIdx(){
    const anim = getAnim(this.def, this.animName);
    return animFrameAt(anim, this.animT);
  }

  // ---------- 绘制 ----------
  draw(ctx, cam){
    const fl = this.battle.floorY;
    // 阴影
    const shw = 46 * (1 - Math.min(0.5, this.y / 300));
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - cam.x), fl + 6, shw / 2, 6, 0, 0, U.TAU);
    ctx.fill();
    // 残影
    for (const g of this.ghosts){
      const fr = SpriteGen.getFrame(this.def, g.anim, g.idx, 't' + this.def.themeColor);
      ctx.globalAlpha = 0.25 * (1 - g.t / 14);
      this.blit(ctx, fr, g.x - cam.x, fl - g.y, g.facing);
      ctx.globalAlpha = 1;
    }
    // MAX光环
    if (this.inMax){
      const t = this.battle.frame;
      ctx.fillStyle = U.rgba(this.def.themeColor, 0.25 + 0.1 * Math.sin(t * 0.3));
      const px2 = Math.round(this.x - cam.x);
      for (let i = 0; i < 6; i++){
        const a = t * 0.2 + i;
        const hh = 20 + Math.sin(a * 1.7) * 10;
        ctx.fillRect(px2 - 24 + i * 8, fl - this.y - 150 - Math.sin(a) * 8 + (i%2)*130 - hh, 6, hh);
      }
    }
    // 本体
    let variant = null;
    if (this.flashT > 0 && this.flashT % 2 === 0) variant = 'w';
    if (this.armorFlash > 0 && this.armorFlash % 2 === 0) variant = 't#ffd040';
    const idx = this.currentAnimIdx();
    const fr = SpriteGen.getFrame(this.def, this.animName, idx, variant);
    this.blit(ctx, fr, this.x - cam.x, fl - this.y, this.facing);
  }
  blit(ctx, fr, sx, sy, facing){
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const w = fr.cv.width * 2, h = fr.cv.height * 2;
    sx = Math.round(sx / 2) * 2; sy = Math.round(sy / 2) * 2;
    if (facing === 1){
      ctx.drawImage(fr.cv, sx - fr.ox * 2, sy - fr.oy * 2, w, h);
    } else {
      ctx.translate(sx, sy);
      ctx.scale(-1, 1);
      ctx.drawImage(fr.cv, -fr.ox * 2, -fr.oy * 2, w, h);
    }
    ctx.restore();
  }
}
