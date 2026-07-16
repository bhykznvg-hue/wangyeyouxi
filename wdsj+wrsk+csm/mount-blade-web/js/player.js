(function(){
const G = window.G;
const P = G.player = {
  unit:null, gold:250, camYaw:0, camPitch:-0.25, camDist:5.2, camCur:5.2,
  stamina:100, maxStamina:100, rollT:0, shake:0, aiming:false, drawT:0,
  swingDx:0, swingDy:0, charging:false, chargeT:0, respawnT:0,
  stats:{level:1,xp:0,skillPoints:0,skills:{melee:1,archery:0,riding:1,leadership:1,trade:0}},
  equip:{melee:'sword1',bow:null,armor:'cloth',shield:'shield1',horse:'horse1'},
  inv:[], ammo:0, ammoMax:30, horseOut:null, horseInjured:false,
  squads:{inf:null,arc:null,cav:null}, selected:'all', kills:0
};

P.xpNext=function(){ return Math.floor(100*Math.pow(P.stats.level,1.5)); };
P.addXp=function(n){
  P.stats.xp+=n;
  while(P.stats.xp>=P.xpNext()){
    P.stats.xp-=P.xpNext(); P.stats.level++; P.stats.skillPoints+=2;
    G.audio.play('levelup',0.8);
    G.ui.notify('升级！等级 '+P.stats.level+'（获得2技能点，按 K 分配）','#ffd700');
    P.computeStats();
    if(P.unit) P.unit.hp=P.unit.maxHp;
  }
};
P.armyCap=function(){ return 5+P.stats.skills.leadership*6; };

P.computeStats=function(){
  var u=P.unit; if(!u) return;
  var it=G.rpg.items;
  var w=it[P.equip.melee], a=it[P.equip.armor];
  u.maxHp=110+P.stats.level*10+(a?a.hp||0:0);
  if(u.hp>u.maxHp) u.hp=u.maxHp;
  u.armor=(a?a.armor:0);
  P.meleeDmg=w.dmg*(1+P.stats.skills.melee*0.045);
  P.meleeType=w.wtype;
  P.bowDmg=P.equip.bow?it[P.equip.bow].dmg*(1+P.stats.skills.archery*0.045):0;
  P.moveSpeed=5.8-(a?a.weight*0.25:0);
  P.horseMax=P.equip.horse?it[P.equip.horse].speed*(1+P.stats.skills.riding*0.03):0;
  P.ammoMax=P.equip.bow?30+P.stats.skills.archery*2:0;
  if(u.weapon!=='bow'){ u.weapon=P.meleeType; u.dmg=P.meleeDmg; }
  else u.dmg=P.bowDmg;
  u.hasShield=!!P.equip.shield&&u.weapon!=='bow'&&u.weapon!=='spear';
  u.shieldHp=u.hasShield?it[P.equip.shield].hp:0;
  u.hasBow=!!P.equip.bow;
  u.hasHelm=a?!!a.helm:false;
  var colors={chest:a?a.color:0x3a5a7a,pants:0x3a3a44,fore:a?a.color:0x4a5a6a,boots:0x2a2a30,shield:0x2a4a7a,helm:0x9aa0a8};
  G.chars.setHumanColors(u,colors);
  G.chars.refreshSlots(u);
};

P.init=function(x,z){
  var u=G.units.spawn('hero','player',x,z,{});
  u.isPlayer=true; u.name='你'; u.state='player'; u.combatReady=true;
  P.unit=u;
  P.ammo=P.ammoMax;
  P.computeStats();
  P.spawnHorse(x+3,z+1);
};
P.spawnHorse=function(x,z){
  if(!P.equip.horse) return;
  var hslot=G.chars.allocHorse();
  if(hslot<0) return;
  G.chars.setHorseColors(hslot,0x7a5a38);
  P.horseOut={hslot:hslot,x:x,z:z,yaw:0,phase:0,speed:0,called:false};
};

P.onHit=function(dmg,attacker){ P.shake=Math.min(0.5,P.shake+dmg*0.01); };
P.onHorseDown=function(){ P.horseInjured=true; P.horseOut=null; };
P.onDeath=function(attacker){
  P.respawnT=4.5;
  G.ui.showDeath(attacker);
  if(P.unit.mounted){
    var u=P.unit;
    if(u.hslot>=0){ G.chars.freeHorse(u.hslot); u.hslot=-1; }
    u.mounted=false;
  }
};
function respawn(){
  var u=P.unit;
  var best=null,bd=1e18;
  G.world.settlements.forEach(function(s){
    if(G.rpg.hostile('player',s.faction)) return;
    var d=G.dist2(u.pos.x,u.pos.z,s.x,s.z);
    if(d<bd){bd=d;best=s;}
  });
  if(!best) best=G.world.settlements[0];
  u.dead=false; u.act=null; u.hp=u.maxHp*0.6; u.stun=0; u.sink=0; u.hitT=0;
  u.pos.set(best.x+20,0,best.z+20); u.pos.y=G.world.getH(u.pos.x,u.pos.z);
  u.vel.set(0,0,0);
  var lost=Math.floor(P.gold*0.12);
  P.gold-=lost;
  P.horseInjured=false;
  if(!P.horseOut&&P.equip.horse) P.spawnHorse(u.pos.x+3,u.pos.z+2);
  G.units.all.forEach(function(o){
    if(o.faction==='player'&&o!==u&&!o.dead){
      o.pos.set(u.pos.x+(Math.random()*2-1)*8,0,u.pos.z+(Math.random()*2-1)*8);
      o.pos.y=G.world.getH(o.pos.x,o.pos.z);
      o.target=null; o.fleeing=false; o.morale=o.baseMorale;
    }
  });
  G.ui.hideDeath();
  G.ui.notify('你在 '+best.name+' 附近苏醒，损失了 '+lost+' 金币','#ff9c5a');
}

function updateHorseFree(dt){
  var h=P.horseOut;
  if(!h) return;
  var u=P.unit;
  var d=Math.sqrt(G.dist2(h.x,h.z,u.pos.x,u.pos.z));
  if(h.called&&d>3){
    var sp=Math.min(9,d);
    h.speed=G.lerp(h.speed,sp,dt*3);
    var ang=Math.atan2(u.pos.x-h.x,u.pos.z-h.z);
    h.yaw=G.angLerp(h.yaw,ang,dt*3);
    h.x+=Math.sin(h.yaw)*h.speed*dt; h.z+=Math.cos(h.yaw)*h.speed*dt;
    h.phase+=dt*(2+h.speed*1.3);
  } else { h.speed=G.lerp(h.speed,0,dt*4); h.called=h.called&&d>3; h.phase+=dt*h.speed; }
  G.chars.writeHorseFree(h.hslot,h.x,G.world.getH(h.x,h.z),h.z,h.yaw,h.speed,h.phase);
}

function tryMount(){
  var u=P.unit;
  if(u.mounted){
    u.mounted=false;
    var hx=u.pos.x+Math.cos(u.horseYaw)*1.4, hz=u.pos.z-Math.sin(u.horseYaw)*1.4;
    P.horseOut={hslot:u.hslot,x:u.pos.x,z:u.pos.z,yaw:u.horseYaw,phase:0,speed:0,called:false};
    u.hslot=-1;
    u.pos.x=hx; u.pos.z=hz; u.pos.y=G.world.getH(hx,hz);
    u.couched=false;
    G.chars.writeHorseFree(P.horseOut.hslot,P.horseOut.x,G.world.getH(P.horseOut.x,P.horseOut.z),P.horseOut.z,P.horseOut.yaw,0,0);
    return;
  }
  if(P.horseOut){
    var d=G.dist2(u.pos.x,u.pos.z,P.horseOut.x,P.horseOut.z);
    if(d<4*4){
      u.mounted=true; u.hslot=P.horseOut.hslot;
      u.pos.x=P.horseOut.x; u.pos.z=P.horseOut.z;
      u.horseYaw=P.horseOut.yaw; u.horseSpeed=0;
      u.horseHp=u.horseHp>0?u.horseHp:160; u.horseMaxHp=160;
      P.horseOut=null;
      G.audio.play('horse',0.5);
    } else G.ui.notify('坐骑太远了（按 H 呼唤）','#aaa');
  }
};

function doOrders(){
  var inp=G.input, pr=inp.pressed;
  var sel=null;
  if(pr['Digit1']) sel='all';
  if(pr['Digit2']) sel='inf';
  if(pr['Digit3']) sel='arc';
  if(pr['Digit4']) sel='cav';
  if(sel){ P.selected=sel; G.ui.notify('已选择：'+({all:'全体部队',inf:'步兵',arc:'弓箭手',cav:'骑兵'})[sel],'#8fd0ff'); }
  var sqs=[];
  ['inf','arc','cav'].forEach(function(k){
    if(P.squads[k]&&(P.selected==='all'||P.selected===k)) sqs.push(P.squads[k]);
  });
  if(!sqs.length) return;
  var u=P.unit;
  if(pr['KeyF']){ sqs.forEach(function(sq){ G.ai.setOrder(sq,'follow'); }); G.ui.orderFx('跟随我！'); }
  if(pr['KeyG']){
    var fwd=8;
    sqs.forEach(function(sq){
      G.ai.setOrder(sq,'hold',u.pos.x+Math.sin(P.camYaw)*fwd,u.pos.z+Math.cos(P.camYaw)*fwd,P.camYaw);
      fwd+=6;
    });
    G.ui.orderFx('在此驻守！');
  }
  if(pr['KeyC']){ sqs.forEach(function(sq){ G.ai.setOrder(sq,'charge'); }); G.ui.orderFx('全力冲锋！'); G.audio.play('charge',0.6); }
  if(pr['KeyV']){
    var names={line:'横列阵',shield:'盾墙',wedge:'楔形阵',loose:'散阵',circle:'环形阵'};
    var f='';
    sqs.forEach(function(sq){ f=G.ai.cycleFormation(sq); });
    G.ui.orderFx('阵型：'+names[f]);
  }
}

function playerStrike(chargeMult){
  var u=P.unit;
  var hit=G.combat.meleeStrike(u);
  if(hit) P.addStaminaCost(4);
}
P.addStaminaCost=function(n){ P.stamina=Math.max(0,P.stamina-n); };

P.update=function(dt,camera){
  var u=P.unit;
  if(!u) return;
  var inp=G.input, m=inp.mouse;
  if(P.respawnT>0){
    P.respawnT-=dt;
    if(P.respawnT<=0) respawn();
  }
  updateHorseFree(dt);
  var uiBlock=G.ui.anyModal()||!inp.locked;
  /* camera orbit */
  if(!uiBlock){
    P.camYaw-=m.dx*0.0024;
    P.camPitch=G.clamp(P.camPitch-m.dy*0.0022,-1.15,0.55);
    if(m.wheel) P.camDist=G.clamp(P.camDist+m.wheel*0.8,2.4,10);
    P.swingDx=P.swingDx*0.8+m.dx;
    P.swingDy=P.swingDy*0.8+m.dy;
  }
  var dead=u.dead;
  if(dead&&u.act){
    u.act.t+=dt;
  }
  /* stamina */
  var regen=u.speed2d<0.5?15:8;
  P.stamina=Math.min(P.maxStamina,P.stamina+regen*dt);
  if(u.hitT>0) u.hitT-=dt;
  if(u.stun>0) u.stun-=dt;
  if(u.attackCd>0) u.attackCd-=dt;
  if(P.rollT>0) P.rollT-=dt;
  /* act progression */
  if(u.act&&!dead){
    var a=u.act;
    var freeze=P.charging&&(a.n==='slash'||a.n==='swingL'||a.n==='swingR'||a.n==='thrust')&&a.t>=a.dur*0.32;
    if(!freeze) a.t+=dt;
    else a.t=a.dur*0.32;
    if((a.n==='slash'||a.n==='thrust'||a.n==='swingL'||a.n==='swingR')&&!a.hitDone&&a.t/a.dur>=(a.n==='thrust'?0.55:0.5)){
      a.hitDone=true; playerStrike();
    }
    if(a.t>=a.dur&&a.n!=='shoot'&&a.n!=='block'&&a.n!=='couch') u.act=null;
  }
  if(dead){ G.chars.updateUnit(u); updateCamera(dt,camera,u); return; }

  var onFoot=!u.mounted;
  var ix=0,iz=0;
  if(!uiBlock){
    if(inp.keys['KeyW']) iz+=1;
    if(inp.keys['KeyS']) iz-=1;
    if(inp.keys['KeyA']) ix+=1;
    if(inp.keys['KeyD']) ix-=1;
  }
  var moving=ix!==0||iz!==0;
  var sprint=!uiBlock&&inp.keys['ShiftLeft']&&P.stamina>2;

  /* weapon switching */
  if(!uiBlock&&inp.pressed['KeyQ']){
    if(u.weapon!=='bow'&&P.equip.bow){ u.weapon='bow'; u.dmg=P.bowDmg; }
    else { u.weapon=P.meleeType; u.dmg=P.meleeDmg; }
    u.hasShield=!!P.equip.shield&&u.weapon===P.meleeType&&P.meleeType==='sword';
    u.act=null; P.aiming=false; P.charging=false;
    G.chars.refreshSlots(u);
    G.ui.notify('切换武器：'+(u.weapon==='bow'?'弓':(u.weapon==='spear'?'长枪':'剑')),'#8fd0ff');
  }
  if(!uiBlock&&inp.pressed['KeyR']) tryMount();
  if(!uiBlock&&inp.pressed['KeyH']&&P.horseOut){ P.horseOut.called=true; G.ui.notify('你吹响口哨呼唤坐骑…','#8fd0ff'); }
  if(!uiBlock) doOrders();

  /* combat inputs */
  var isBow=u.weapon==='bow';
  if(isBow){
    P.aiming=!uiBlock&&m.r;
    if(P.aiming&&m.l&&P.ammo>0){
      if(!u.act||u.act.n!=='shoot') { G.units.setAct(u,'shoot',99,{draw:0}); P.drawT=0; }
      P.drawT=Math.min(1,P.drawT+dt/(0.9-P.stats.skills.archery*0.03));
      u.act.p.draw=P.drawT;
    }
    if((m.lr||!P.aiming)&&u.act&&u.act.n==='shoot'){
      if(P.aiming&&P.drawT>0.25&&P.ammo>0){
        P.ammo--;
        var dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
        var tx=camera.position.x+dir.x*60, ty=camera.position.y+dir.y*60, tz=camera.position.z+dir.z*60;
        var acc=0.55+P.drawT*0.35+P.stats.skills.archery*0.02-(u.speed2d>0.5?0.15:0);
        G.combat.fireArrow(u,tx,ty,tz,acc,P.bowDmg*(0.5+P.drawT*0.6));
        P.addStaminaCost(5);
      }
      u.act=null; P.drawT=0;
    }
    u.aimPitch=G.clamp(-P.camPitch*0.8,-0.5,0.8);
    u.blocking=false;
  } else {
    P.aiming=false;
    u.blocking=!uiBlock&&m.r&&P.stamina>1&&!P.charging;
    if(u.blocking&&(!u.act||u.act.n!=='block')) G.units.setAct(u,'block',99);
    if(!u.blocking&&u.act&&u.act.n==='block') u.act=null;
    if(!uiBlock&&m.lp&&u.attackCd<=0&&P.stamina>6&&u.stun<=0&&P.rollT<=0){
      var n;
      var adx=P.swingDx, ady=P.swingDy;
      if(Math.abs(adx)>Math.abs(ady)*1.3) n=adx>0?'swingR':'swingL';
      else if(ady>2) n='thrust';
      else n='slash';
      if(u.weapon==='spear'&&Math.random()<0.7) n='thrust';
      P.charging=true; P.chargeT=0;
      G.units.setAct(u,n,0.55);
      u.blocking=false;
    }
    if(P.charging){
      P.chargeT+=dt;
      if(m.lr||!m.l){
        P.charging=false;
        P.addStaminaCost(7);
        u.attackCd=0.35;
      }
    }
    /* couch lance */
    if(!uiBlock&&inp.pressed['KeyX']&&u.mounted&&u.weapon==='spear'){
      u.couched=!u.couched;
      if(u.couched){ G.units.setAct(u,'couch',99); G.ui.notify('骑枪已夹持——冲锋！','#ffd700'); }
      else u.act=null;
    }
    if(u.couched&&u.horseSpeed<4){ u.couched=false; if(u.act&&u.act.n==='couch')u.act=null; }
  }

  /* movement */
  if(onFoot){
    if(!uiBlock&&inp.pressed['Space']&&moving&&P.stamina>22&&P.rollT<=0&&u.stun<=0){
      P.rollT=0.5;
      P.addStaminaCost(22);
      var ra=P.camYaw+Math.atan2(ix,iz);
      P.rollYaw=ra;
      G.units.setAct(u,'roll',0.5);
      G.audio.play('roll',0.7);
    }
    var spd=P.moveSpeed*(sprint?1.42:1);
    if(u.blocking) spd*=0.55;
    if(P.charging) spd*=0.75;
    if(u.stun>0) spd*=0.2;
    if(sprint&&moving) P.addStaminaCost(9*dt);
    var wx=0,wz=0;
    if(P.rollT>0){
      wx=Math.sin(P.rollYaw)*8.2; wz=Math.cos(P.rollYaw)*8.2;
    } else if(moving){
      var mAng=P.camYaw+Math.atan2(ix,iz);
      wx=Math.sin(mAng)*spd; wz=Math.cos(mAng)*spd;
    }
    var k=1-Math.pow(0.0005,dt);
    u.vel.x+=(wx-u.vel.x)*k; u.vel.z+=(wz-u.vel.z)*k;
    var fight=u.blocking||P.charging||P.aiming||u.act;
    if(fight||!moving) u.yaw=G.angLerp(u.yaw,P.camYaw,dt*10);
    else if(moving) u.yaw=G.angLerp(u.yaw,Math.atan2(u.vel.x,u.vel.z),dt*10);
  } else {
    var maxSp=P.horseMax*(sprint?1.12:1);
    if(P.horseInjured) maxSp*=0.6;
    var accel=0;
    if(iz>0) accel=maxSp;
    else if(iz<0) accel=-2.5;
    var turn=G.lerp(2.4,1.0,G.clamp(u.horseSpeed/12,0,1));
    if(ix!==0) u.horseYaw+=ix*turn*dt;
    if(!uiBlock&&inp.pressed['Space']&&P.stamina>10){ u.horseSpeed=Math.min(maxSp+3,u.horseSpeed+3.5); P.addStaminaCost(10); }
    var target=accel>0?Math.min(accel,maxSp):accel;
    if(iz===0) target=u.horseSpeed*0.985;
    u.horseSpeed+=G.clamp(target-u.horseSpeed,-8*dt,5*dt);
    if(u.horseSpeed<0) u.horseSpeed=Math.max(u.horseSpeed,-2.5);
    if(u.stun>0||u.horseRear>0) u.horseSpeed*=0.3;
    u.vel.x=Math.sin(u.horseYaw)*u.horseSpeed;
    u.vel.z=Math.cos(u.horseYaw)*u.horseSpeed;
    u.yaw=G.angLerp(u.yaw,P.camYaw,dt*10);
    if(u.horseRear>0) u.horseRear-=dt;
    if(sprint) P.addStaminaCost(4*dt);
  }
  u.combatReady=true;
  u.shieldUp=u.blocking&&u.hasShield;
  G.units.postMove(u,dt);
  G.chars.updateUnit(u);
  updateCamera(dt,camera,u);
  P.checkInteract();
};

var _cv=new THREE.Vector3(), _ct=new THREE.Vector3();
function updateCamera(dt,camera,u){
  var wantDist=P.aiming?2.1:P.camDist;
  P.camCur=G.lerp(P.camCur,wantDist,1-Math.pow(0.001,dt));
  var headY=u.pos.y+(u.mounted?2.4:1.6);
  var sideOff=P.aiming?0.55:0.25;
  var cy=P.camYaw, cp=P.camPitch;
  var ox=Math.sin(cy)*Math.cos(cp), oy=Math.sin(cp), oz=Math.cos(cy)*Math.cos(cp);
  var rx=-Math.cos(cy), rz=Math.sin(cy);
  _ct.set(u.pos.x+rx*sideOff,headY,u.pos.z+rz*sideOff);
  _cv.set(_ct.x-ox*P.camCur,_ct.y-oy*P.camCur+0.25*P.camCur*0.3,_ct.z-oz*P.camCur);
  var gh=G.world.getH(_cv.x,_cv.z)+0.4;
  if(_cv.y<gh) _cv.y=gh;
  if(P.shake>0){
    P.shake-=dt;
    _cv.x+=(Math.random()*2-1)*P.shake*0.3;
    _cv.y+=(Math.random()*2-1)*P.shake*0.3;
  }
  camera.position.copy(_cv);
  camera.lookAt(_ct);
  var wantFov=P.aiming?46:(u.mounted&&u.horseSpeed>9?68:60);
  camera.fov=G.lerp(camera.fov,wantFov,1-Math.pow(0.01,dt));
  camera.updateProjectionMatrix();
}

P.interactTarget=null;
P.checkInteract=function(){
  var u=P.unit;
  P.interactTarget=null;
  var txt='';
  var best=null,bd=9;
  G.units.all.forEach(function(o){
    if(o.dead||!o.npcRole||o.npcRole==='travel') return;
    if(o.npcRole==='villager'||o.npcRole==='guard') return;
    var d=G.dist2(u.pos.x,u.pos.z,o.pos.x,o.pos.z);
    if(d<bd){ bd=d; best={type:'npc',npc:o}; }
  });
  if(G.battle.lootChest){
    var lc=G.battle.lootChest;
    if(G.dist2(u.pos.x,u.pos.z,lc.x,lc.z)<9) best={type:'loot'};
  }
  if(!best){
    var s=G.settlements.nearest(u.pos.x,u.pos.z);
    if(s&&s.gatePos&&(s.type==='castle'||s.type==='town')&&G.rpg.hostile('player',s.faction)&&!s.siege){
      if(G.dist2(u.pos.x,u.pos.z,s.gatePos.x,s.gatePos.z)<20*20) best={type:'siege',s:s};
    }
  }
  P.interactTarget=best;
  if(best){
    if(best.type==='npc') txt='按 E 与 '+best.npc.name+' 交谈';
    if(best.type==='loot') txt='按 E 拾取战利品';
    if(best.type==='siege') txt='按 E 进攻 '+best.s.name+'（攻城战）';
  }
  G.ui.setHint(txt);
  if(txt&&G.input.pressed['KeyE']&&!G.ui.anyModal()){
    if(best.type==='npc') G.ui.openDialog(best.npc);
    if(best.type==='loot') G.battle.openLoot();
    if(best.type==='siege') G.ui.confirmSiege(best.s);
  }
};
})();
