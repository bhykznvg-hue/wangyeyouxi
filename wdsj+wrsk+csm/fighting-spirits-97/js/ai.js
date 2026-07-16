// ============ ai.js : CPU对手 (风格化行为/难度分级/搓招宏) ============
'use strict';
class AIController {
  constructor(fighter, difficulty){
    this.f = fighter;
    this.diff = difficulty; // 1..5
    this.pad = { up:false,down:false,left:false,right:false,a:false,b:false,c:false,d:false,start:false, prev:{}, press:{} };
    this.macro = [];      // 指令宏队列 [{d:数字方向或0, b:[按键], t:帧}]
    this.macroT = 0;
    this.thinkT = 0;
    this.holdDir = 5;
    this.blockHold = 0;
    this.style = fighter.def.aiStyle || 'rush';
    this.aggression = 0.35 + difficulty * 0.11;
    this.reaction = Math.max(2, 16 - difficulty * 2.6);
    this.comboSkill = difficulty / 5;
  }
  // 数字方向 -> 按键(考虑朝向)
  dirToKeys(d, facing){
    const k = { up:false, down:false, left:false, right:false };
    if (d === 0 || d === 5) return k;
    if (d >= 7) k.up = true;
    if (d <= 3) k.down = true;
    const col = (d - 1) % 3; // 0=左列 1=中 2=右列 (相对面向)
    if (col === 0) { if (facing === 1) k.left = true; else k.right = true; }
    if (col === 2) { if (facing === 1) k.right = true; else k.left = true; }
    return k;
  }
  pushMacro(steps){ this.macro = steps.slice(); this.macroT = 0; }
  clearPad(){
    const p = this.pad;
    p.up = p.down = p.left = p.right = p.a = p.b = p.c = p.d = false;
  }
  setPress(){
    const p = this.pad;
    for (const k of ['up','down','left','right','a','b','c','d','start']){
      p.press[k] = p[k] && !p.prev[k];
      p.prev[k] = p[k];
    }
  }

  update(){
    const f = this.f, o = f.opp, b = f.battle;
    this.clearPad();
    if (!o || b.phase !== 'fight'){ this.setPress(); return; }
    // ---- 执行宏 ----
    if (this.macro.length > 0){
      const step = this.macro[0];
      const keys = this.dirToKeys(step.d, f.facing);
      Object.assign(this.pad, keys);
      if (this.macroT === 0 && step.b) for (const btn of step.b) this.pad[btn] = true;
      else if (step.b && step.hold) for (const btn of step.b) this.pad[btn] = true;
      this.macroT++;
      if (this.macroT >= step.t){ this.macro.shift(); this.macroT = 0; }
      this.setPress();
      return;
    }
    // ---- 持续防御 ----
    if (this.blockHold > 0){
      this.blockHold--;
      const back = f.facing === 1 ? 'left' : 'right';
      this.pad[back] = true;
      if (this.blockLow) this.pad.down = true;
      this.setPress();
      return;
    }
    if (!f.actionable && f.state !== ST.AIR){ this.setPress(); return; }

    const dist = Math.abs(o.x - f.x);
    const oppAir = o.airborne;
    const oppAttack = o.state === ST.ATTACK;
    const oppDown = o.state === ST.LIE || o.state === ST.KNOCKFALL || o.state === ST.LAUNCHED;
    const meAir = f.state === ST.AIR;

    // ---- 空中: 打跳跃攻击 ----
    if (meAir){
      if (dist < 120 && U.chance(0.3)) this.pad[U.chance(0.5) ? 'c' : 'd'] = true;
      this.setPress(); return;
    }
    this.thinkT++;
    if (this.thinkT < this.reaction){ this.holdApproach(dist); this.setPress(); return; }
    this.thinkT = 0;

    // ---- 反应防御 ----
    if (oppAttack && dist < 180 && U.chance(0.25 + this.diff * 0.13)){
      this.blockHold = U.irand(14, 30);
      this.blockLow = U.chance(0.5);
      this.setPress(); return;
    }
    // ---- 飞行道具反应: 跳跃或前滚 ----
    const incoming = (b.projectiles || []).find(pr => pr.owner !== f && Math.abs(pr.x - f.x) < 220 && Math.sign(pr.vx || 1) === Math.sign(f.x - pr.x + 0.1));
    if (incoming && U.chance(0.2 + this.diff * 0.12)){
      if (U.chance(0.5)) this.pushMacro([{ d: 9, t: 4 }]); // 前跳
      else this.pushMacro([{ d: 6, b: ['a','b'], t: 3 }]); // 前滚
      this.setPress(); return;
    }
    // ---- 对空 ----
    if (oppAir && dist < 150 && o.y > 40 && U.chance(0.25 + this.diff * 0.12)){
      this.doAntiAir();
      this.setPress(); return;
    }
    // ---- 倒地追击/压制 ----
    if (oppDown){
      if (dist > 90) this.holdApproach(dist);
      this.setPress(); return;
    }
    // ---- 爆气 ----
    if (f.power >= 2000 && !f.inMax && U.chance(0.04 * this.diff)){
      this.pushMacro([{ d: 0, b: ['a','b','c'], t: 3 }]);
      this.setPress(); return;
    }
    // ---- 超必杀 ----
    if (f.power >= 1000 && dist < 200 && U.chance(0.035 * this.diff * (f.lowHealth ? 2.2 : 1))){
      this.doSuper();
      this.setPress(); return;
    }
    // ---- 距离决策 ----
    if (dist < 60){
      const r = Math.random();
      if (r < 0.16 * this.aggression && o.throwable){ // 投技
        this.pushMacro([{ d: 6, b: ['c'], t: 3 }]);
      } else if (r < 0.55){
        this.doCombo();
      } else if (r < 0.7){
        this.doSpecial('close');
      } else if (r < 0.82){
        this.blockHold = U.irand(10, 22); this.blockLow = U.chance(0.6);
      } else {
        this.pushMacro([{ d: 4, t: 10 }]); // 后退
      }
    } else if (dist < 150){
      const r = Math.random();
      if (r < 0.3 * this.aggression){
        // 突进
        if (this.style === 'grapple') this.doSpecial('mid');
        else this.pushMacro([{ d: 6, t: 2 }, { d: 5, t: 2 }, { d: 6, t: U.irand(8, 16) }]); // 跑
      } else if (r < 0.45){
        this.pushMacro([{ d: 9, t: 4 }]); // 前跳进攻
      } else if (r < 0.62){
        this.doPoke();
      } else if (r < 0.75){
        this.doSpecial('mid');
      } else {
        this.holdApproach(dist);
      }
    } else {
      const r = Math.random();
      if (this.style === 'zone' || this.style === 'boss'){
        if (r < 0.5){ this.doSpecial('far'); }
        else if (r < 0.7) this.holdApproach(dist);
        else this.pushMacro([{ d: 9, t: 4 }]);
      } else {
        if (r < 0.5) this.pushMacro([{ d: 6, t: 2 }, { d: 5, t: 2 }, { d: 6, t: U.irand(14, 26) }]);
        else if (r < 0.7) this.pushMacro([{ d: 9, t: 4 }]);
        else if (r < 0.85) this.doSpecial('far');
        else this.holdApproach(dist);
      }
    }
    this.setPress();
  }

  holdApproach(dist){
    if (dist > 70){
      Object.assign(this.pad, this.dirToKeys(6, this.f.facing));
    } else if (dist < 45){
      Object.assign(this.pad, this.dirToKeys(4, this.f.facing));
    }
  }

  // 连段脚本 (按难度选择)
  doCombo(){
    const id = this.f.baseId;
    const easy = [ { d: 2, b: ['b'], t: 3 }, { d: 2, t: 8 }, { d: 2, b: ['a'], t: 3 }, { d: 0, t: 8 } ];
    if (this.comboSkill < 0.5 || U.chance(0.4)){ this.pushMacro(easy); return; }
    // 轻攻击 -> 必杀取消
    const qcfA = [ { d: 2, b: ['b'], t: 3 }, { d: 2, t: 5 }, { d: 2, b: ['a'], t: 3 }, { d: 2, t: 2 }, { d: 3, t: 2 }, { d: 6, b: ['c'], t: 3 }, { d: 0, t: 10 } ];
    const dpC  = [ { d: 0, b: ['a'], t: 3 }, { d: 0, t: 4 }, { d: 6, t: 2 }, { d: 2, t: 2 }, { d: 3, b: ['c'], t: 3 }, { d: 0, t: 10 } ];
    const grab = [ { d: 6, t: 2 }, { d: 3, t: 2 }, { d: 2, t: 2 }, { d: 1, t: 2 }, { d: 4, b: ['c'], t: 3 }, { d: 0, t: 10 } ];
    const charge = [ { d: 1, t: 46, }, { d: 6, b: ['d'], t: 3 }, { d: 0, t: 10 } ];
    switch (this.f.def.aiStyle){
      case 'grapple': this.pushMacro(U.chance(0.6) ? grab : dpC); break;
      case 'charge': this.pushMacro(U.chance(0.5) ? charge : qcfA); break;
      default: this.pushMacro(U.chance(0.55) ? qcfA : dpC);
    }
  }
  doPoke(){
    const pokes = [
      [{ d: 0, b: ['c'], t: 3 }, { d: 0, t: 10 }],
      [{ d: 2, b: ['d'], t: 3 }, { d: 0, t: 12 }],
      [{ d: 0, b: ['d'], t: 3 }, { d: 0, t: 12 }],
      [{ d: 0, b: ['c','d'], t: 3 }, { d: 0, t: 14 }],
    ];
    this.pushMacro(U.pick(pokes));
  }
  doAntiAir(){
    const dp = [ { d: 6, t: 2 }, { d: 2, t: 2 }, { d: 3, b: ['c'], t: 3 }, { d: 0, t: 8 } ];
    const crc = [ { d: 2, b: ['c'], t: 3 }, { d: 0, t: 8 } ];
    const flash = [ { d: 2, t: 44 }, { d: 8, b: ['d'], t: 3 }, { d: 0, t: 8 } ];
    if (this.f.def.aiStyle === 'charge') this.pushMacro(U.chance(0.5) ? flash : crc);
    else this.pushMacro(U.chance(0.55 + this.diff * 0.06) ? dp : crc);
  }
  doSpecial(range){
    const style = this.f.def.aiStyle;
    const qcfP = [ { d: 2, t: 2 }, { d: 3, t: 2 }, { d: 6, b: [U.chance(0.5)?'a':'c'], t: 3 }, { d: 0, t: 8 } ];
    const qcbP = [ { d: 2, t: 2 }, { d: 1, t: 2 }, { d: 4, b: [U.chance(0.5)?'a':'c'], t: 3 }, { d: 0, t: 8 } ];
    const qcbK = [ { d: 2, t: 2 }, { d: 1, t: 2 }, { d: 4, b: [U.chance(0.5)?'b':'d'], t: 3 }, { d: 0, t: 8 } ];
    const hcbK = [ { d: 6, t: 2 }, { d: 3, t: 2 }, { d: 2, t: 2 }, { d: 1, t: 2 }, { d: 4, b: ['d'], t: 3 }, { d: 0, t: 8 } ];
    const hcfK = [ { d: 4, t: 2 }, { d: 1, t: 2 }, { d: 2, t: 2 }, { d: 3, t: 2 }, { d: 6, b: ['d'], t: 3 }, { d: 0, t: 8 } ];
    const hcbP = [ { d: 6, t: 2 }, { d: 3, t: 2 }, { d: 2, t: 2 }, { d: 1, t: 2 }, { d: 4, b: ['c'], t: 3 }, { d: 0, t: 8 } ];
    const chgBF = [ { d: 4, t: 46 }, { d: 6, b: [U.chance(0.5)?'b':'d'], t: 3 }, { d: 0, t: 8 } ];
    const chgBFP = [ { d: 4, t: 46 }, { d: 6, b: ['c'], t: 3 }, { d: 0, t: 8 } ];
    switch (this.f.baseId){
      case 'kai': this.pushMacro(range === 'far' ? U.pick([qcfP, qcbK]) : U.pick([qcfP, qcbP, qcbK])); break;
      case 'ren': this.pushMacro(range === 'far' ? U.pick([qcbP, qcfP]) : U.pick([qcfP, hcbK])); break;
      case 'mika': this.pushMacro(range === 'far' ? U.pick([qcfP, hcfK, qcbK]) : U.pick([qcbK, hcfK])); break;
      case 'bull': this.pushMacro(range === 'far' ? hcfK : U.pick([hcbP, qcbP])); break;
      case 'ryuji': this.pushMacro(range === 'far' ? qcfP : U.pick([qcbK, hcbK])); break;
      case 'yuki': this.pushMacro(range === 'far' ? chgBFP : U.pick([chgBF, chgBFP])); break;
      case 'ouga': this.pushMacro(range === 'far' ? U.pick([qcfP, hcbP]) : U.pick([qcbP, hcbP, qcfP])); break;
      default: this.pushMacro(qcfP);
    }
  }
  doSuper(){
    const qq = [ { d: 2, t: 2 }, { d: 3, t: 2 }, { d: 6, t: 2 }, { d: 2, t: 2 }, { d: 3, t: 2 }, { d: 6, b: [U.chance(0.5)?'a':'b'], t: 3 }, { d: 0, t: 8 } ];
    const qqK = [ { d: 2, t: 2 }, { d: 3, t: 2 }, { d: 6, t: 2 }, { d: 2, t: 2 }, { d: 3, t: 2 }, { d: 6, b: ['d'], t: 3 }, { d: 0, t: 8 } ];
    const dq = [ { d: 2, t: 2 }, { d: 1, t: 2 }, { d: 4, t: 2 }, { d: 1, t: 2 }, { d: 2, t: 2 }, { d: 3, t: 2 }, { d: 6, b: ['c'], t: 3 }, { d: 0, t: 8 } ];
    const hh = [ { d: 6, t: 2 }, { d: 3, t: 2 }, { d: 2, t: 2 }, { d: 1, t: 2 }, { d: 4, t: 2 }, { d: 6, t: 2 }, { d: 3, t: 2 }, { d: 2, t: 2 }, { d: 1, t: 2 }, { d: 4, b: ['c'], t: 3 }, { d: 0, t: 8 } ];
    switch (this.f.baseId){
      case 'ren': this.pushMacro(dq); break;
      case 'bull': this.pushMacro(hh); break;
      case 'mika': case 'yuki': this.pushMacro(qqK); break;
      default: this.pushMacro(qq);
    }
  }
}
