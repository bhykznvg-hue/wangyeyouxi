(function(){
const G = window.G;
const AI = G.ai = { squads:[] };

AI.makeSquad=function(units,faction,kind,leader){
  var sq={id:Math.random(),faction:faction,kind:kind,units:units.slice(),order:{type:'follow',x:0,z:0,facing:0},
    formation:kind==='arc'?'loose':'line',leader:leader||null,slotT:0,isPlayer:faction==='player'};
  units.forEach(function(u){ u.squad=sq; });
  AI.squads.push(sq);
  return sq;
};
AI.removeSquad=function(sq){
  var i=AI.squads.indexOf(sq);
  if(i>=0) AI.squads.splice(i,1);
  sq.units.forEach(function(u){ u.squad=null; });
};

function computeSlots(sq){
  var n=sq.units.length;
  if(!n) return;
  var spacing=sq.formation==='shield'?1.15:(sq.formation==='loose'?2.6:1.55);
  var f=sq.order.facing||0;
  var fx=Math.sin(f), fz=Math.cos(f), rx=Math.cos(f), rz=-Math.sin(f);
  var i;
  if(sq.formation==='wedge'){
    var k=0,row=0;
    while(k<n){
      var inRow=row+1;
      for(var c=0;c<inRow&&k<n;c++,k++){
        var ox=(c-row/2)*spacing*1.4, oz=-row*spacing*1.3;
        setSlot(sq.units[k],ox,oz,rx,rz,fx,fz);
      }
      row++;
    }
  } else if(sq.formation==='circle'){
    var rad=Math.max(1.5,n*spacing/(Math.PI*2));
    for(i=0;i<n;i++){
      var a=i/n*Math.PI*2;
      setSlot(sq.units[i],Math.cos(a)*rad,Math.sin(a)*rad,rx,rz,fx,fz);
      sq.units[i].slotFace=f+a;
    }
    return;
  } else {
    var cols=Math.min(n,Math.max(4,Math.round(Math.sqrt(n*3.2))));
    for(i=0;i<n;i++){
      var col=i%cols, r2=Math.floor(i/cols);
      var ox2=(col-(cols-1)/2)*spacing, oz2=-r2*spacing*1.25;
      setSlot(sq.units[i],ox2,oz2,rx,rz,fx,fz);
    }
  }
  for(i=0;i<n;i++) sq.units[i].slotFace=f;
}
function setSlot(u,ox,oz,rx,rz,fx,fz){
  if(!u.slotOff) u.slotOff={x:0,z:0};
  u.slotOff.x=rx*ox+fx*oz;
  u.slotOff.z=rz*ox+fz*oz;
}

AI.setOrder=function(sq,type,x,z,facing){
  sq.order.type=type;
  if(x!==undefined){ sq.order.x=x; sq.order.z=z; }
  if(facing!==undefined) sq.order.facing=facing;
  computeSlots(sq);
  sq.units.forEach(function(u){ u.braced=false; });
};
AI.cycleFormation=function(sq){
  var order=['line','shield','wedge','loose','circle'];
  sq.formation=order[(order.indexOf(sq.formation)+1)%order.length];
  computeSlots(sq);
  return sq.formation;
};

function anchorOf(sq){
  if(sq.order.type==='follow'){
    var L=sq.leader&&!sq.leader.dead?sq.leader:(G.player.unit&&sq.isPlayer?G.player.unit:null);
    if(L){ sq.order.facing=L.yaw; return L.pos; }
  }
  return sq.order;
}

/* ---------- steering helpers ---------- */
function footMove(u,dt,gx,gz,speedMul){
  var dx=gx-u.pos.x, dz=gz-u.pos.z, d=Math.sqrt(dx*dx+dz*dz);
  var sp=u.def.speed*(speedMul||1)*u.speedMul;
  if(u.squad&&u.squad.formation==='shield'&&u.shieldUp) sp*=0.6;
  if(u.stun>0) sp*=0.15;
  if(d<0.25){ u.vel.x*=0.7; u.vel.z*=0.7; return true; }
  if(d<2) sp*=Math.max(0.35,d/2);
  var wx=dx/d*sp, wz=dz/d*sp;
  var k=1-Math.pow(0.002,dt);
  u.vel.x+=(wx-u.vel.x)*k; u.vel.z+=(wz-u.vel.z)*k;
  if(!u.faceLock) u.yaw=G.angLerp(u.yaw,Math.atan2(u.vel.x,u.vel.z),dt*8);
  return d<1;
}
function horseMove(u,dt,gx,gz,wantSpeed){
  var dx=gx-u.pos.x, dz=gz-u.pos.z, d=Math.sqrt(dx*dx+dz*dz);
  var desired=Math.atan2(dx,dz);
  var diff=G.angDiff(u.horseYaw,desired);
  var turnRate=G.lerp(2.6,1.1,G.clamp(u.horseSpeed/11,0,1));
  u.horseYaw+=G.clamp(diff,-turnRate*dt,turnRate*dt);
  var maxSp=wantSpeed!==undefined?wantSpeed:11;
  if(Math.abs(diff)>1.2) maxSp=Math.min(maxSp,3.5);
  if(d<6) maxSp=Math.min(maxSp,d*1.4);
  if(u.stun>0||u.horseRear>0) maxSp=0;
  var acc=maxSp>u.horseSpeed?5.5:9;
  u.horseSpeed+=G.clamp(maxSp-u.horseSpeed,-acc*dt,acc*dt);
  u.horseSpeed=Math.max(0,u.horseSpeed);
  u.vel.x=Math.sin(u.horseYaw)*u.horseSpeed;
  u.vel.z=Math.cos(u.horseYaw)*u.horseSpeed;
  u.yaw=u.horseYaw;
  return d<3;
}
function stop(u,dt){
  u.vel.x*=Math.pow(0.001,dt); u.vel.z*=Math.pow(0.001,dt);
  if(u.mounted) u.horseSpeed*=Math.pow(0.001,dt);
}

/* ---------- combat micro ---------- */
function tryAttack(u,target,dt){
  var reach=G.combat.reach(u);
  var d=Math.sqrt(G.dist2(u.pos.x,u.pos.z,target.pos.x,target.pos.z));
  var ang=Math.atan2(target.pos.x-u.pos.x,target.pos.z-u.pos.z);
  u.faceLock=true;
  u.yaw=G.angLerp(u.yaw,ang,dt*10);
  if(d<reach+(target.mounted?0.9:0.1)&&u.attackCd<=0&&u.stun<=0&&(!u.act||u.act.n==='block')){
    var names=u.weapon==='spear'?['thrust','thrust','slash']:['slash','swingL','swingR','thrust'];
    var atk=names[Math.floor(Math.random()*names.length)];
    var dur=0.62-u.def.tier*0.02+(u.weapon==='spear'?0.08:0);
    G.units.setAct(u,atk,dur);
    u.attackCd=1.15+Math.random()*0.8-u.def.tier*0.06;
    u.blocking=false; u.shieldUp=false;
    return;
  }
  if(!u.act&&u.stun<=0){
    var threat=target.act&&(target.act.n==='slash'||target.act.n==='thrust'||target.act.n==='swingL'||target.act.n==='swingR')&&d<reach+1.5;
    if(threat&&Math.random()<0.28+u.def.tier*0.09){
      G.units.setAct(u,'block',0.5);
    }
  }
}
function meleeEngage(u,dt){
  var t=u.target;
  var reach=G.combat.reach(u);
  var d=Math.sqrt(G.dist2(u.pos.x,u.pos.z,t.pos.x,t.pos.z));
  u.combatReady=true;
  if(u.mounted){
    if(u.weapon==='spear'&&!u.couched&&u.horseSpeed>7.5&&d<28&&d>8){
      u.couched=true; G.units.setAct(u,'couch',9);
    }
    if(u.couched&&(u.horseSpeed<5||d<2.5)){ u.couched=false; u.act=null; }
    if(u.cavWheel){
      if(horseMove(u,dt,u.cavWheel.x,u.cavWheel.z,11)||u.horseSpeed<2) u.cavWheel=null;
      return;
    }
    var lead=G.clamp(d*0.1,0,1.2);
    horseMove(u,dt,t.pos.x+t.vel.x*lead,t.pos.z+t.vel.z*lead,d>16?11.5:9);
    if(d<reach+1.2){
      tryAttack(u,t,dt);
      u.faceLock=false;
      if(d<3.2&&u.horseSpeed>6){
        var fx=Math.sin(u.horseYaw), fz=Math.cos(u.horseYaw);
        u.cavWheel={x:u.pos.x+fx*22+(Math.random()*2-1)*10,z:u.pos.z+fz*22+(Math.random()*2-1)*10};
      }
    }
    return;
  }
  u.braced=false;
  if(u.weapon==='spear'&&!u.mounted){
    var th=threatHorse(u);
    if(th){
      u.braced=true;
      u.faceLock=true;
      u.yaw=G.angLerp(u.yaw,Math.atan2(th.pos.x-u.pos.x,th.pos.z-u.pos.z),dt*9);
      if(!u.act||u.act.n!=='brace') G.units.setAct(u,'brace',9);
      stop(u,dt);
      return;
    } else if(u.act&&u.act.n==='brace') u.act=null;
  }
  if(d>reach-0.25){
    var sx=0,sz=0;
    if(d<6){
      if(u.strafeT===undefined||u.strafeT<=0){ u.strafeT=1+Math.random()*1.5; u.strafeDir=Math.random()<0.5?-1:1; }
      u.strafeT-=dt;
      var pang=Math.atan2(t.pos.x-u.pos.x,t.pos.z-u.pos.z)+Math.PI/2*u.strafeDir;
      sx=Math.sin(pang)*0.9; sz=Math.cos(pang)*0.9;
    }
    footMove(u,dt,t.pos.x+sx,t.pos.z+sz,d<8?1.12:1);
    u.faceLock=d<5;
    if(u.faceLock) u.yaw=G.angLerp(u.yaw,Math.atan2(t.pos.x-u.pos.x,t.pos.z-u.pos.z),dt*9);
  } else stop(u,dt);
  tryAttack(u,t,dt);
}
function threatHorse(u){
  var ns=G.units.near(u.pos.x,u.pos.z,26);
  for(var i=0;i<ns.length;i++){
    var o=ns[i];
    if(o.dead||!o.mounted||o.faction===u.faction) continue;
    if(!G.rpg.hostile(u.faction,o.faction)) continue;
    if(o.speed2d<5) continue;
    var dx=u.pos.x-o.pos.x, dz=u.pos.z-o.pos.z, d=Math.sqrt(dx*dx+dz*dz);
    if(d<1) return o;
    var dot=(o.vel.x*dx+o.vel.z*dz)/(o.speed2d*d);
    if(dot>0.75) return o;
  }
  return null;
}
function archerLogic(u,dt,holdPos){
  var t=u.target;
  u.combatReady=true;
  var d=t?Math.sqrt(G.dist2(u.pos.x,u.pos.z,t.pos.x,t.pos.z)):999;
  if(t&&(d<9||u.ammo<=0)){
    if(u.weapon==='bow'){ u.weapon='sword'; u.dmg=u.def.dmg*0.65; G.chars.refreshSlots(u); u.act=null; }
    meleeEngage(u,dt);
    return;
  }
  if(u.weapon!=='bow'&&u.ammo>0&&(!t||d>14)){ u.weapon='bow'; u.dmg=u.def.dmg; G.chars.refreshSlots(u); u.act=null; }
  if(!t){ if(holdPos) footMove(u,dt,holdPos.x,holdPos.z); else stop(u,dt); u.faceLock=false; return; }
  var maxR=52;
  if(d>maxR&&!holdPos){ footMove(u,dt,t.pos.x,t.pos.z); u.faceLock=false; return; }
  if(holdPos&&G.dist2(u.pos.x,u.pos.z,holdPos.x,holdPos.z)>9){ footMove(u,dt,holdPos.x,holdPos.z); u.faceLock=false; return; }
  stop(u,dt);
  u.faceLock=true;
  var ang=Math.atan2(t.pos.x-u.pos.x,t.pos.z-u.pos.z);
  u.yaw=G.angLerp(u.yaw,ang,dt*6);
  u.aimPitch=G.clamp((d-10)*0.008,0,0.35);
  if(d>maxR){ if(u.act&&u.act.n==='shoot') u.act=null; return; }
  if(!u.act&&u.attackCd<=0&&u.stun<=0){
    var mx=(u.pos.x+t.pos.x)/2, mz=(u.pos.z+t.pos.z)/2;
    var mid=G.units.near(mx,mz,2);
    for(var i=0;i<mid.length;i++){ if(!mid[i].dead&&mid[i].faction===u.faction&&mid[i]!==u){ u.attackCd=0.5; return; } }
    G.units.setAct(u,'shoot',1.05,{draw:0});
  }
  if(u.act&&u.act.n==='shoot'){
    u.act.p.draw=G.clamp(u.act.t/0.9,0,1);
    if(u.act.t>=1.0){
      u.act=null;
      u.ammo--;
      var lead=G.clamp(d/44,0,1.5)*0.85;
      G.combat.fireArrow(u,t.pos.x+t.vel.x*lead,t.pos.y+1.2+(t.mounted?0.8:0),t.pos.z+t.vel.z*lead,0.45+u.def.tier*0.13,u.dmg);
      u.attackCd=1.3+Math.random()*1.4-u.def.tier*0.1;
    }
  }
}

/* ---------- per-unit AI ---------- */
AI.updateUnit=function(u,dt){
  if(u.stun>0){ stop(u,dt); return; }
  u.thinkT-=dt;
  var think=u.thinkT<=0;
  if(think) u.thinkT=0.22+Math.random()*0.12;
  u.moraleT-=dt;
  if(u.moraleT<=0){
    u.moraleT=0.6;
    if(!u.fleeing){
      var e=u.target&&!u.target.dead?1:0;
      if(!e) u.morale=Math.min(u.baseMorale,u.morale+1.2);
      if(u.morale<=18&&u.faction!=='civ'&&!u.isPlayer&&u.state==='soldier'){
        u.fleeing=true; u.target=null; u.couched=false; u.braced=false; u.act=null;
        if(u.squad){ var si=u.squad.units.indexOf(u); if(si>=0)u.squad.units.splice(si,1); u.squad=null; }
      }
    } else if(u.morale>45) u.fleeing=false;
    if(u.fleeing) u.morale=Math.min(u.baseMorale,u.morale+0.8);
  }
  if(u.fleeing){
    u.combatReady=false;
    var en=G.units.nearestEnemy(u,80);
    var fx2,fz2;
    if(en){ var dd=Math.max(1,Math.sqrt(G.dist2(u.pos.x,u.pos.z,en.pos.x,en.pos.z))); fx2=u.pos.x+(u.pos.x-en.pos.x)/dd*40; fz2=u.pos.z+(u.pos.z-en.pos.z)/dd*40; }
    else { fx2=u.pos.x*1.2; fz2=u.pos.z*1.2; }
    if(u.mounted) horseMove(u,dt,fx2,fz2,11.5); else footMove(u,dt,fx2,fz2,1.1);
    if(u.party&&u.party.battle&&G.dist2(u.pos.x,u.pos.z,u.party.battle.cx,u.party.battle.cz)>230*230){
      u.party.onUnitFled(u);
    }
    return;
  }
  switch(u.state){
    case 'civilian': civLogic(u,dt,think); return;
    case 'guard': guardLogic(u,dt,think); return;
    case 'travel': travelLogic(u,dt,think); return;
    case 'wallpost': wallLogic(u,dt,think); return;
    case 'idle': stop(u,dt); u.combatReady=false; return;
  }
  /* soldier */
  var sq=u.squad;
  var order=sq?sq.order.type:'charge';
  if(think){
    if(u.target&&(u.target.dead||u.target.fleeGone)) u.target=null;
    var range=order==='charge'?260:(order==='follow'?38:(u.weapon==='bow'?60:26));
    if(!u.target||Math.random()<0.15){
      var cand=G.units.nearestEnemy(u,range);
      if(cand) u.target=cand;
      else if(order!=='charge') u.target=null;
    }
  }
  if(sq){
    sq.slotT-=dt;
    if(sq.slotT<=0){ sq.slotT=1.2; computeSlots(sq); }
  }
  u.shieldUp=false;
  if(u.gateTarget&&u.gateTarget.gate&&!u.gateTarget.gate.open&&order==='charge'&&u.weapon!=='bow'){
    var tOk=false;
    if(u.target){
      var tdy=Math.abs(u.target.pos.y-u.pos.y);
      tOk=tdy<2.4&&G.dist2(u.pos.x,u.pos.z,u.target.pos.x,u.target.pos.z)<14*14;
    }
    if(!tOk){
      var gt=u.gateTarget.gate;
      var gd=G.dist2(u.pos.x,u.pos.z,gt.x,gt.z);
      u.combatReady=true;
      if(gd>5.2*5.2){
        if(u.mounted) horseMove(u,dt,gt.x,gt.z,8);
        else footMove(u,dt,gt.x,gt.z,1);
      } else {
        stop(u,dt);
        u.faceLock=true;
        u.yaw=G.angLerp(u.yaw,Math.atan2(gt.x-u.pos.x,gt.z-u.pos.z),dt*8);
        if(u.attackCd<=0&&!u.act){ G.units.setAct(u,'slash',0.6); u.attackCd=1.2+Math.random()*0.5; }
      }
      return;
    }
  }
  if(u.target){
    var d=Math.sqrt(G.dist2(u.pos.x,u.pos.z,u.target.pos.x,u.target.pos.z));
    var engage=order==='charge'||d<(order==='hold'?(u.weapon==='bow'?55:10):16);
    if(engage){
      var holdPos=null;
      if(order==='hold'&&u.weapon==='bow'&&u.slotOff){
        holdPos={x:sq.order.x+u.slotOff.x,z:sq.order.z+u.slotOff.z};
      }
      if(u.weapon==='bow'||(u.hasBow&&u.ammo>0&&d>14)) archerLogic(u,dt,holdPos);
      else meleeEngage(u,dt);
      return;
    }
  }
  u.combatReady=!!(u.target)||order!=='follow';
  u.faceLock=false;
  var anchor=anchorOf(sq||{order:{type:'hold',x:u.pos.x,z:u.pos.z,facing:u.yaw}});
  var gx=anchor.x+(u.slotOff?u.slotOff.x:0), gz=anchor.z+(u.slotOff?u.slotOff.z:0);
  var arrived;
  if(u.mounted){
    var dHome=Math.sqrt(G.dist2(u.pos.x,u.pos.z,gx,gz));
    arrived=horseMove(u,dt,gx,gz,dHome>25?11:(dHome>8?7:4));
  } else {
    var dHome2=G.dist2(u.pos.x,u.pos.z,gx,gz);
    arrived=footMove(u,dt,gx,gz,dHome2>400?1.25:1);
  }
  if(arrived){
    stop(u,dt);
    if(u.slotFace!==undefined) u.yaw=G.angLerp(u.yaw,u.slotFace,dt*4);
    if(sq&&sq.formation==='shield'&&u.hasShield&&!u.act) u.shieldUp=true;
    if(sq&&order==='hold'&&u.weapon==='spear'&&!u.mounted){
      var th=threatHorse(u);
      if(th){ u.braced=true; if(!u.act||u.act.n!=='brace')G.units.setAct(u,'brace',9); u.faceLock=true;
        u.yaw=G.angLerp(u.yaw,Math.atan2(th.pos.x-u.pos.x,th.pos.z-u.pos.z),dt*9); }
      else { u.braced=false; if(u.act&&u.act.n==='brace')u.act=null; }
    }
  } else if(sq&&sq.formation==='shield'&&u.hasShield) u.shieldUp=true;
};

function civLogic(u,dt,think){
  u.combatReady=false;
  var danger=null;
  if(think) danger=G.units.nearestEnemy(u,20);
  if(danger){
    var d=Math.max(1,Math.sqrt(G.dist2(u.pos.x,u.pos.z,danger.pos.x,danger.pos.z)));
    footMove(u,dt,u.pos.x+(u.pos.x-danger.pos.x)/d*25,u.pos.z+(u.pos.z-danger.pos.z)/d*25,1.15);
    return;
  }
  u.wanderT-=dt;
  if(u.wanderT<=0){
    u.wanderT=3+Math.random()*6;
    if(Math.random()<0.6&&u.home){
      u.wanderX=u.home.x+(Math.random()*2-1)*14;
      u.wanderZ=u.home.z+(Math.random()*2-1)*14;
    } else { u.wanderX=null; }
  }
  if(u.wanderX!==null&&u.wanderX!==undefined) footMove(u,dt,u.wanderX,u.wanderZ,0.42);
  else stop(u,dt);
}
function guardLogic(u,dt,think){
  var t=u.target;
  if(think&&(!t||t.dead)) u.target=t=G.units.nearestEnemy(u,28);
  if(t&&!t.dead){
    u.combatReady=true;
    meleeEngage(u,dt);
    if(u.home&&G.dist2(u.pos.x,u.pos.z,u.home.x,u.home.z)>60*60) u.target=null;
    return;
  }
  u.combatReady=false;
  if(u.home&&G.dist2(u.pos.x,u.pos.z,u.home.x,u.home.z)>4){ footMove(u,dt,u.home.x,u.home.z,0.6); }
  else { stop(u,dt); if(u.homeFace!==undefined) u.yaw=G.angLerp(u.yaw,u.homeFace,dt*3); }
}
function travelLogic(u,dt,think){
  u.combatReady=false;
  var p=u.party;
  if(!p){ stop(u,dt); return; }
  var idx=p.visUnits.indexOf(u);
  var a=(idx/Math.max(1,p.visUnits.length))*Math.PI*2;
  var gx=p.x+Math.cos(a)*2.2, gz=p.z+Math.sin(a)*2.2;
  if(u.mounted){ horseMove(u,dt,gx,gz,Math.min(10,p.speed*1.6+G.dist2(u.pos.x,u.pos.z,gx,gz)*0.02)); }
  else footMove(u,dt,gx,gz,Math.min(1.3,p.speed/u.def.speed+0.2));
}
function wallLogic(u,dt,think){
  u.vel.set(0,0,0);
  u.pos.x=u.wallPost.x; u.pos.z=u.wallPost.z; u.pos.y=u.wallPost.y-1.0;
  u.combatReady=true;
  var t=u.target;
  if(think&&(!t||t.dead)) u.target=t=G.units.nearestEnemy(u,60);
  if(!t) { u.act=null; return; }
  var d=Math.sqrt(G.dist2(u.pos.x,u.pos.z,t.pos.x,t.pos.z));
  u.faceLock=true;
  u.yaw=G.angLerp(u.yaw,Math.atan2(t.pos.x-u.pos.x,t.pos.z-u.pos.z),dt*6);
  u.aimPitch=G.clamp(-Math.atan2(u.pos.y+1.4-t.pos.y-1.2,d)*0.8,-0.6,0.4);
  if(u.ammo<=0) return;
  if(!u.act&&u.attackCd<=0){
    G.units.setAct(u,'shoot',1.05,{draw:0});
  }
  if(u.act&&u.act.n==='shoot'){
    u.act.p.draw=G.clamp(u.act.t/0.9,0,1);
    if(u.act.t>=1.0){
      u.act=null; u.ammo--;
      var lead=G.clamp(d/44,0,1.5)*0.85;
      G.combat.fireArrow(u,t.pos.x+t.vel.x*lead,t.pos.y+1.3,t.pos.z+t.vel.z*lead,0.6,u.dmg);
      u.attackCd=1.5+Math.random()*1.2;
    }
  }
}

/* ---------- enemy general ---------- */
AI.newGeneral=function(party){
  return {party:party,state:'form',t:0,cavSent:false};
};
AI.updateGeneral=function(gen,dt){
  gen.t+=dt;
  var party=gen.party, squads=party.squads;
  if(!squads||!squads.length) return;
  var foe=G.player.unit;
  var foes=[];
  G.units.all.forEach(function(o){
    if(!o.dead&&G.rpg.hostile(party.faction,o.faction)&&o.state!=='civilian') foes.push(o);
  });
  if(!foes.length) return;
  var fcx=0,fcz=0;
  foes.forEach(function(o){ fcx+=o.pos.x; fcz+=o.pos.z; });
  fcx/=foes.length; fcz/=foes.length;
  var alive=0;
  squads.forEach(function(sq){ alive+=sq.units.length; });
  var mcx=0,mcz=0,mn=0;
  squads.forEach(function(sq){ sq.units.forEach(function(u2){ mcx+=u2.pos.x; mcz+=u2.pos.z; mn++; }); });
  if(!mn) return;
  mcx/=mn; mcz/=mn;
  var dist=Math.sqrt(G.dist2(mcx,mcz,fcx,fcz));
  var facing=Math.atan2(fcx-mcx,fcz-mcz);
  if(alive<=Math.max(2,party.initialCount*0.28)&&party.initialCount>6){
    squads.forEach(function(sq){ sq.units.forEach(function(u3){ u3.morale-=dt*6; }); });
  }
  if(gen.state==='form'){
    if(gen.t>6||dist<75) { gen.state='advance'; G.audio.play('charge',0.5); }
    squads.forEach(function(sq){ AI.setOrder(sq,'hold',sq.order.x||mcx,sq.order.z||mcz,facing); });
    return;
  }
  if(gen.state==='advance'){
    if(dist<42) gen.state='engage';
    squads.forEach(function(sq){
      if(sq.kind==='arc'){
        var ax=fcx-Math.sin(facing)*48, az=fcz-Math.cos(facing)*48;
        AI.setOrder(sq,'hold',ax,az,facing);
      } else if(sq.kind==='cav'&&!gen.cavSent&&dist<95){
        gen.cavSent=true;
        var side=Math.random()<0.5?1:-1;
        var px2=Math.cos(facing)*side, pz2=-Math.sin(facing)*side;
        AI.setOrder(sq,'advance_flank',fcx+px2*55,fcz+pz2*55,facing);
        sq.flankT=6;
      } else if(sq.order.type!=='advance_flank'){
        var gx=fcx-Math.sin(facing)*30, gz=fcz-Math.cos(facing)*30;
        AI.setOrder(sq,'hold',G.lerp(mcx,gx,0.35),G.lerp(mcz,gz,0.35),facing);
        if(dist<60&&sq.kind==='inf'&&sq.formation!=='shield'&&Math.random()<0.4) sq.formation='shield';
      }
    });
  }
  if(gen.state==='engage'){
    squads.forEach(function(sq){
      if(sq.kind==='arc'&&dist>25) return;
      if(sq.order.type!=='charge') AI.setOrder(sq,'charge');
    });
  }
  squads.forEach(function(sq){
    if(sq.order.type==='advance_flank'){
      sq.flankT-=dt;
      var arrivedAll=sq.flankT<=0;
      if(!arrivedAll){
        var arr=0;
        sq.units.forEach(function(u4){ if(G.dist2(u4.pos.x,u4.pos.z,sq.order.x,sq.order.z)<15*15) arr++; });
        if(arr>=sq.units.length*0.6) arrivedAll=true;
      }
      if(arrivedAll){ AI.setOrder(sq,'charge'); G.audio.play('charge',0.4); }
    }
  });
};
})();
