(function(){
const G = window.G;
const U = G.units = { all:[], grid:new Map(), nextId:1 };

G.troops = {
  recruit:   {name:'新兵',tier:1,hp:52,armor:2, dmg:16,weapon:'sword',shield:false,mounted:false,speed:5.6,morale:46,wage:1,cost:15, xpNext:60, next:['militia','hunter','rider'],colors:{chest:0x8a7a5a,pants:0x6b5a40,fore:0xd9ac88,boots:0x4a3a28},helm:false},
  militia:   {name:'民兵',tier:2,hp:68,armor:8, dmg:20,weapon:'sword',shield:true, mounted:false,speed:5.5,morale:54,wage:2,cost:0,  xpNext:120,next:['infantry','spearman'],colors:{chest:0x7a6a4a,pants:0x5a4a35,fore:0x8a7a5a,boots:0x4a3a28,shield:0x9a6a3a},helm:false},
  infantry:  {name:'步兵',tier:3,hp:88,armor:16,dmg:26,weapon:'sword',shield:true, mounted:false,speed:5.4,morale:62,wage:4,cost:0,  xpNext:220,next:['veteran'],colors:{chest:0x6a6a72,pants:0x4a4438,fore:0x5a5a62,boots:0x3a3230,shield:0x7a3a2a},helm:true},
  veteran:   {name:'老兵',tier:4,hp:112,armor:26,dmg:33,weapon:'sword',shield:true,mounted:false,speed:5.3,morale:72,wage:7,cost:0, xpNext:400,next:['guard'],colors:{chest:0x5a5a66,pants:0x3a3a44,fore:0x4a4a56,boots:0x2a2a30,shield:0x8a2a2a},helm:true},
  guard:     {name:'卫士',tier:5,hp:140,armor:36,dmg:40,weapon:'sword',shield:true,mounted:false,speed:5.2,morale:82,wage:11,cost:0,xpNext:0,next:[],colors:{chest:0x8a8a96,pants:0x3a3a44,fore:0x6a6a76,boots:0x2a2a30,shield:0x2a3a6a},helm:true},
  spearman:  {name:'长枪兵',tier:3,hp:82,armor:14,dmg:27,weapon:'spear',shield:false,mounted:false,speed:5.4,morale:60,wage:4,cost:0,xpNext:240,next:['pikeman'],colors:{chest:0x6a5a44,pants:0x4a4438,fore:0x5a4a38,boots:0x3a3230},helm:true},
  pikeman:   {name:'重枪兵',tier:4,hp:108,armor:26,dmg:36,weapon:'spear',shield:false,mounted:false,speed:5.2,morale:72,wage:8,cost:0,xpNext:0,next:[],colors:{chest:0x5a5a66,pants:0x3a3a44,fore:0x4a4a56,boots:0x2a2a30},helm:true},
  hunter:    {name:'猎手',tier:2,hp:56,armor:4, dmg:22,weapon:'bow',shield:false,mounted:false,speed:5.6,morale:48,wage:2,cost:0,xpNext:150,next:['archer'],colors:{chest:0x5a6a44,pants:0x4a4a35,fore:0x6a5a44,boots:0x3a3228},helm:false},
  archer:    {name:'弓箭手',tier:3,hp:70,armor:10,dmg:28,weapon:'bow',shield:false,mounted:false,speed:5.5,morale:56,wage:5,cost:0,xpNext:300,next:['sharpshooter'],colors:{chest:0x4a5a3a,pants:0x3a3a2c,fore:0x5a4a38,boots:0x2a2a20},helm:true},
  sharpshooter:{name:'神射手',tier:4,hp:88,armor:16,dmg:36,weapon:'bow',shield:false,mounted:false,speed:5.5,morale:68,wage:9,cost:0,xpNext:0,next:[],colors:{chest:0x3a4a30,pants:0x2c2c22,fore:0x4a3a2c,boots:0x22221a},helm:true},
  rider:     {name:'骑手',tier:2,hp:64,armor:8, dmg:22,weapon:'sword',shield:false,mounted:true,speed:5.5,morale:52,wage:3,cost:0,xpNext:200,next:['cavalry'],colors:{chest:0x7a6a4a,pants:0x5a4a35,fore:0x8a7a5a,boots:0x4a3a28},helm:false,coat:0x6b4a2b},
  cavalry:   {name:'骑兵',tier:3,hp:92,armor:18,dmg:30,weapon:'sword',shield:true,mounted:true,speed:5.4,morale:64,wage:7,cost:0,xpNext:360,next:['lancer','knight'],colors:{chest:0x6a6a72,pants:0x4a4438,fore:0x5a5a62,boots:0x3a3230,shield:0x3a5a8a},helm:true,coat:0x4a3120},
  lancer:    {name:'枪骑兵',tier:4,hp:104,armor:24,dmg:38,weapon:'spear',shield:false,mounted:true,speed:5.4,morale:72,wage:10,cost:0,xpNext:0,next:[],colors:{chest:0x5a5a66,pants:0x3a3a44,fore:0x4a4a56,boots:0x2a2a30},helm:true,coat:0x2a2320},
  knight:    {name:'骑士',tier:5,hp:135,armor:38,dmg:42,weapon:'sword',shield:true,mounted:true,speed:5.3,morale:85,wage:14,cost:0,xpNext:0,next:[],colors:{chest:0x9a9aa8,pants:0x4a4a56,fore:0x8a8a98,boots:0x3a3a44,shield:0x8a8a2a},helm:true,coat:0xe8e2d8},
  bandit:    {name:'强盗',tier:2,hp:62,armor:5, dmg:20,weapon:'sword',shield:false,mounted:false,speed:5.7,morale:44,wage:0,cost:0,xpNext:0,next:[],colors:{chest:0x4a4038,pants:0x3a332c,fore:0x5a4a3a,boots:0x2a2420},helm:false},
  banditArcher:{name:'盗匪弓手',tier:2,hp:56,armor:3,dmg:22,weapon:'bow',shield:false,mounted:false,speed:5.6,morale:42,wage:0,cost:0,xpNext:0,next:[],colors:{chest:0x44403a,pants:0x34302a,fore:0x54483a,boots:0x24201c},helm:false},
  raider:    {name:'马贼',tier:3,hp:76,armor:10,dmg:26,weapon:'sword',shield:false,mounted:true,speed:5.6,morale:50,wage:0,cost:0,xpNext:0,next:[],colors:{chest:0x4a4038,pants:0x3a332c,fore:0x5a4a3a,boots:0x2a2420},helm:false,coat:0x3a2f26},
  banditBoss:{name:'强盗头目',tier:4,hp:130,armor:22,dmg:34,weapon:'sword',shield:true,mounted:false,speed:5.6,morale:75,wage:0,cost:0,xpNext:0,next:[],colors:{chest:0x5a3a3a,pants:0x3a332c,fore:0x5a4a3a,boots:0x2a2420,shield:0x3a3a3a},helm:true},
  civilian:  {name:'平民',tier:0,hp:30,armor:0,dmg:6,weapon:'sword',shield:false,mounted:false,speed:4.5,morale:20,wage:0,cost:0,xpNext:0,next:[],colors:{chest:0x9a8a6a,pants:0x6b5a40,fore:0xd9ac88,boots:0x4a3a28},helm:false},
  hero:      {name:'战团领袖',tier:5,hp:150,armor:20,dmg:30,weapon:'sword',shield:true,mounted:false,speed:5.8,morale:100,wage:0,cost:0,xpNext:0,next:[],colors:{chest:0x3a5a7a,pants:0x3a3a44,fore:0x4a5a6a,boots:0x2a2a30,shield:0x2a4a7a},helm:false}
};
G.troopClass=function(def){ return def.mounted?'cav':(def.weapon==='bow'?'arc':'inf'); };

U.spawn=function(key,faction,x,z,opts){
  opts=opts||{};
  var def=G.troops[key];
  var slot=G.chars.allocHuman();
  if(slot<0) return null;
  var hslot=-1;
  var mounted=opts.mounted!==undefined?opts.mounted:def.mounted;
  if(mounted){ hslot=G.chars.allocHorse(); if(hslot<0) mounted=false; }
  var u={
    id:U.nextId++, key:key, def:def, faction:faction, party:opts.party||null,
    pos:new THREE.Vector3(x,G.world.getH(x,z),z), vel:new THREE.Vector3(),
    yaw:opts.yaw||0, horseYaw:opts.yaw||0, speed2d:0, animPhase:Math.random()*6.28, horsePhase:Math.random()*6.28,
    hp:def.hp*(opts.hpMul||1), maxHp:def.hp*(opts.hpMul||1), armor:def.armor,
    dmg:def.dmg, weapon:def.weapon, hasShield:def.shield, hasBow:def.weapon==='bow',
    shieldHp:def.shield?120+def.tier*40:0, ammo:def.weapon==='bow'?28:0,
    mounted:mounted, hslot:hslot, horseHp:mounted?110+def.tier*15:0, horseMaxHp:mounted?110+def.tier*15:0,
    horseSpeed:0, horseRear:0, horseDead:false,
    morale:def.morale+(opts.moraleBonus||0), baseMorale:def.morale+(opts.moraleBonus||0),
    state:opts.state||'idle', target:null, squad:null, slotPos:null,
    act:null, attackCd:0.5+Math.random(), blocking:false, shieldUp:false, braced:false, couched:false,
    combatReady:false, aimPitch:0, hitT:0, stun:0, dead:false, deadT:0, sink:0,
    slot:slot, radius:0.42, height:1.85, isPlayer:false, npcRole:opts.npcRole||null, name:opts.name||def.name,
    xp:opts.xp||0, thinkT:Math.random()*0.3, moraleT:Math.random(), fleeing:false, lodSkip:0, lodC:0,
    wanderT:0, home:opts.home||null, wallPost:opts.wallPost||null, speedMul:opts.speedMul||1
  };
  var colors=Object.assign({},def.colors);
  if(opts.teamTint!==undefined){
    var c=new THREE.Color(colors.chest), t=new THREE.Color(opts.teamTint);
    c.lerp(t,0.42); colors.chest=c.getHex();
    if(colors.shield){ var sc=new THREE.Color(colors.shield); sc.lerp(t,0.5); colors.shield=sc.getHex(); }
  }
  u.hasHelm=def.helm;
  G.chars.setHumanColors(u,colors);
  if(mounted) G.chars.setHorseColors(hslot,def.coat||0x6b4a2b);
  U.all.push(u);
  return u;
};

U.remove=function(u){
  var i=U.all.indexOf(u);
  if(i>=0) U.all.splice(i,1);
  if(u.squad){ var si=u.squad.units.indexOf(u); if(si>=0) u.squad.units.splice(si,1); }
  G.chars.freeHuman(u.slot); u.slot=-1;
  if(u.hslot>=0){ G.chars.freeHorse(u.hslot); u.hslot=-1; }
};

U.rebuildGrid=function(){
  U.grid.clear();
  for(var i=0;i<U.all.length;i++){
    var u=U.all[i];
    if(u.dead) continue;
    var key=(Math.floor(u.pos.x/8)+2048)*8192+(Math.floor(u.pos.z/8)+2048);
    var arr=U.grid.get(key);
    if(!arr){ arr=[]; U.grid.set(key,arr); }
    arr.push(u);
  }
};
var _nearPool=[[],[],[],[],[],[],[],[]], _nearIdx=0;
U.near=function(x,z,r){
  var out=_nearPool[_nearIdx]; _nearIdx=(_nearIdx+1)%8;
  out.length=0;
  var c=Math.ceil(r/8);
  var cx=Math.floor(x/8), cz=Math.floor(z/8);
  for(var i=-c;i<=c;i++) for(var j=-c;j<=c;j++){
    var arr=U.grid.get((cx+i+2048)*8192+(cz+j+2048));
    if(arr) for(var k=0;k<arr.length;k++){
      var u=arr[k];
      if(G.dist2(x,z,u.pos.x,u.pos.z)<=r*r) out.push(u);
    }
  }
  return out;
};
U.nearestEnemy=function(u,range){
  var best=null,bd=range*range;
  for(var i=0;i<U.all.length;i++){
    var o=U.all[i];
    if(o===u||o.dead||o.faction==='civ') continue;
    if(o.npcRole==='travel') continue;
    if(!G.rpg.hostile(u.faction,o.faction)) continue;
    var d=G.dist2(u.pos.x,u.pos.z,o.pos.x,o.pos.z);
    if(d<bd){bd=d;best=o;}
  }
  return best;
};

U.setAct=function(u,n,dur,p){
  u.act={n:n,t:0,dur:dur,p:p||null,hitDone:false};
};

U.damage=function(u,dmg,attacker,opts){
  if(u.dead) return 0;
  opts=opts||{};
  if(u.isPlayer&&G.player.rollT>0) return 0;
  var blocked=false;
  if(attacker&&!opts.noBlock){
    var adir=Math.atan2(attacker.pos.x-u.pos.x,attacker.pos.z-u.pos.z);
    var facing=Math.abs(G.angDiff(u.yaw,adir))<1.15;
    if(facing){
      if(u.blocking||(u.act&&u.act.n==='block')) blocked=true;
      else if(u.shieldUp&&u.hasShield&&!opts.pierceShield) blocked=true;
      else if(u.hasShield&&opts.ranged&&(u.shieldUp||u.braced||(u.squad&&u.squad.formation==='shield'))) blocked=true;
    }
  }
  if(blocked&&u.hasShield&&u.shieldHp>0){
    u.shieldHp-=dmg;
    G.audio.play3d('shield',u.pos,1);
    if(u.shieldHp<=0){ u.hasShield=false; u.shieldUp=false; G.chars.refreshSlots(u); if(u.isPlayer) G.ui.notify('盾牌被打碎了！','#ff7a5a'); }
    G.fx.sparks(u.pos.x,u.pos.y+1.3,u.pos.z,0xc8b060,4);
    return 0;
  }
  if(blocked){
    G.audio.play3d('clang',u.pos,1);
    G.fx.sparks(u.pos.x,u.pos.y+1.4,u.pos.z,0xffd080,6);
    if(attacker&&!opts.ranged) attacker.attackCd=Math.max(attacker.attackCd,0.7);
    return 0;
  }
  var red=G.clamp(u.armor/(u.armor+55),0,0.7);
  var final=Math.max(1,dmg*(1-red)*(0.85+Math.random()*0.3));
  u.hp-=final;
  u.hitT=0.25;
  u.morale-=final*0.25;
  if(!opts.ranged) G.audio.play3d('hit',u.pos,0.9);
  G.fx.blood(u.pos.x,u.pos.y+1.2+Math.random()*0.4,u.pos.z);
  if(opts.knock&&!u.dead){ u.stun=Math.max(u.stun,opts.knock); }
  if(u.isPlayer){ G.ui.flashDamage(); G.player.onHit(final,attacker); }
  if(u.hp<=0) U.kill(u,attacker);
  else if(attacker&&!u.target&&!u.isPlayer&&u.faction!=='civ'&&G.rpg.hostile(u.faction,attacker.faction)) u.target=attacker;
  return final;
};

U.kill=function(u,attacker){
  if(u.dead) return;
  u.dead=true; u.deadT=0; u.blocking=false; u.shieldUp=false; u.braced=false; u.couched=false;
  u.vel.set(0,0,0); u.speed2d=0;
  if(u.mounted&&u.hslot>=0){
    G.chars.writeHorseCorpse(u.hslot,u.pos.x,u.pos.y,u.pos.z,u.horseYaw,0);
    U.corpseHorses.push({slot:u.hslot,x:u.pos.x,y:u.pos.y,z:u.pos.z,yaw:u.horseYaw,t:0});
    u.hslot=-1; u.mounted=false;
    u.pos.y=G.world.getH(u.pos.x,u.pos.z);
  }
  U.setAct(u,'die',0.7,{side:Math.random()<0.5?1:-1,back:attacker?Math.abs(G.angDiff(u.yaw,Math.atan2(attacker.pos.x-u.pos.x,attacker.pos.z-u.pos.z)))<1.5:false});
  G.audio.play3d('die',u.pos,0.9);
  if(u.isPlayer){ G.player.onDeath(attacker); return; }
  var ns=U.near(u.pos.x,u.pos.z,14);
  for(var i=0;i<ns.length;i++){
    var o=ns[i];
    if(o.dead||o===u) continue;
    if(o.faction===u.faction) o.morale-=7;
    else if(G.rpg.hostile(o.faction,u.faction)) o.morale=Math.min(o.morale+2.5,o.baseMorale+15);
  }
  if(attacker&&attacker.isPlayer) G.rpg.onPlayerKill(u);
  else if(attacker&&attacker.faction==='player') G.rpg.onArmyKill(u);
  if(u.party) u.party.onUnitDead(u);
  if(u.squad){ var si=u.squad.units.indexOf(u); if(si>=0) u.squad.units.splice(si,1); u.squad=null; }
};

U.killHorse=function(u,attacker){
  if(!u.mounted||u.horseDead) return;
  u.horseDead=true;
  G.audio.play3d('horse',u.pos,1);
  var hslot=u.hslot, hx=u.pos.x, hy=u.pos.y, hz=u.pos.z, hyaw=u.horseYaw;
  G.chars.writeHorseCorpse(hslot,hx,hy,hz,hyaw,0);
  U.corpseHorses.push({slot:hslot,x:hx,y:hy,z:hz,yaw:hyaw,t:0});
  u.hslot=-1; u.mounted=false; u.horseDead=false; u.couched=false;
  u.stun=Math.max(u.stun,1.6);
  u.pos.y=G.world.getH(u.pos.x,u.pos.z);
  if(u.isPlayer){ G.player.onHorseDown(); G.ui.notify('你的坐骑倒下了！','#ff7a5a'); }
  U.damage(u,8,null,{noBlock:true});
};
U.corpseHorses=[];

U.update=function(dt,camPos){
  U.rebuildGrid();
  var all=U.all;
  for(var i=all.length-1;i>=0;i--){
    var u=all[i];
    if(u.isPlayer){ U.postMove(u,dt); continue; }
    if(u.dead){
      u.deadT+=dt;
      if(u.act&&u.act.t<u.act.dur){ u.act.t+=dt; G.chars.updateUnit(u); }
      else if(u.deadT>22){
        u.sink+=dt*0.25;
        G.chars.updateUnit(u);
        if(u.sink>1.2) U.remove(u);
      }
      continue;
    }
    if(u.hitT>0) u.hitT-=dt;
    if(u.stun>0) u.stun-=dt;
    if(u.attackCd>0) u.attackCd-=dt;
    if(u.act){
      u.act.t+=dt;
      if(u.act.n==='slash'||u.act.n==='thrust'||u.act.n==='swingL'||u.act.n==='swingR'){
        var hitFrac=u.act.n==='thrust'?0.55:0.5;
        if(!u.act.hitDone&&u.act.t/u.act.dur>=hitFrac){ u.act.hitDone=true; G.combat.meleeStrike(u); }
      }
      if(u.act.t>=u.act.dur&&u.act.n!=='shoot'&&u.act.n!=='brace'&&u.act.n!=='couch') u.act=null;
    }
    G.ai.updateUnit(u,dt);
    U.postMove(u,dt);
  }
  for(var c=U.corpseHorses.length-1;c>=0;c--){
    var ch=U.corpseHorses[c];
    ch.t+=dt;
    if(ch.t>20){
      var sink=(ch.t-20)*0.25;
      G.chars.writeHorseCorpse(ch.slot,ch.x,ch.y,ch.z,ch.yaw,sink);
      if(sink>1.4){ G.chars.freeHorse(ch.slot); U.corpseHorses.splice(c,1); }
    }
  }
  var camX=camPos.x, camZ=camPos.z;
  for(var j=0;j<all.length;j++){
    var u2=all[j];
    if(u2.dead) continue;
    var d2=G.dist2(u2.pos.x,u2.pos.z,camX,camZ);
    var skip=d2<10000?0:(d2<40000?1:(d2<90000?3:7));
    u2.lodC++;
    if(u2.lodC>skip){ u2.lodC=0; G.chars.updateUnit(u2); }
  }
  G.chars.flush();
};

U.postMove=function(u,dt){
  if(u.dead) return;
  u.pos.x+=u.vel.x*dt; u.pos.z+=u.vel.z*dt;
  var half=G.world.half-30;
  u.pos.x=G.clamp(u.pos.x,-half,half); u.pos.z=G.clamp(u.pos.z,-half,half);
  u.speed2d=Math.sqrt(u.vel.x*u.vel.x+u.vel.z*u.vel.z);
  if(u.mounted){ u.horsePhase+=dt*(2.5+u.speed2d*1.35); }
  u.animPhase+=dt*u.speed2d*1.55;
  if(u.wallPost) return;
  G.world.resolveCollision(u.pos,u.radius);
  u.pos.y=G.world.getH(u.pos.x,u.pos.z);
  var sep=U.near(u.pos.x,u.pos.z,2.2);
  for(var i=0;i<sep.length;i++){
    var o=sep[i];
    if(o===u||o.dead||o.wallPost) continue;
    var rr=u.radius+o.radius+(u.mounted?0.5:0)+(o.mounted?0.5:0);
    var dx=u.pos.x-o.pos.x, dz=u.pos.z-o.pos.z, dd=dx*dx+dz*dz;
    if(dd<rr*rr&&dd>1e-5){
      var d=Math.sqrt(dd), push=(rr-d)*0.5/d;
      var w=o.isPlayer?0.15:(u.mounted&&!o.mounted?0.25:1);
      u.pos.x+=dx*push*w; u.pos.z+=dz*push*w;
    }
  }
};

U.countSide=function(pred){
  var n=0;
  for(var i=0;i<U.all.length;i++){ var u=U.all[i]; if(!u.dead&&pred(u)) n++; }
  return n;
};
})();
