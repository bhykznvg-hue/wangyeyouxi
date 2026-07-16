(function(){
const G = window.G;
const B = G.battle = { active:false, enemies:[], cx:0, cz:0, lootChest:null, lootData:null, siegeS:null, banner:0, killsThisBattle:0 };

B.canStart=function(count){
  var used=G.units.all.length;
  return used+count<G.cfg.poolHumans-20;
};

B.engagePlayer=function(party){
  var pu=G.player.unit;
  if(party.expanded){
    if(B.enemies.indexOf(party)<0){
      B.active=true;
      party.battle=party.battle||{cx:party.x,cz:party.z};
      B.enemies.push(party);
      if(!B.cx){ B.cx=party.x; B.cz=party.z; }
      G.ui.battleBanner('战斗：'+party.name);
    }
    return;
  }
  party.battle={cx:party.x,cz:party.z};
  var n=PTexpand(party,pu.pos.x,pu.pos.z);
  if(n===0){ party.battle=null; return; }
  if(!B.active){
    B.active=true; B.enemies=[]; B.killsThisBattle=0;
    B.cx=(party.x+pu.pos.x)/2; B.cz=(party.z+pu.pos.z)/2;
    G.ui.battleBanner('遭遇战：'+party.name+'（'+n+'人）');
    G.audio.play('charge',0.7);
  }
  if(B.enemies.indexOf(party)<0) B.enemies.push(party);
  party.battle.cx=B.cx; party.battle.cz=B.cz;
};
function PTexpand(p,x,z){ return G.parties.expand(p,x,z); }

B.engageParties=function(pa,pb){
  var a=G.parties.expand(pa,pb.x,pb.z);
  var b=G.parties.expand(pb,pa.x,pa.z);
  pa.battle={cx:(pa.x+pb.x)/2,cz:(pa.z+pb.z)/2};
  pb.battle=pa.battle;
  if(a===0||b===0){ G.parties.autoResolve(pa,pb); return; }
  G.ui.notify('附近爆发战斗：'+pa.name+' 对 '+pb.name,'#d0b060');
};

B.startSiege=function(s){
  if(!B.canStart(26)) { G.ui.notify('战场人数已满，稍后再试','#ff7a5a'); return; }
  s.siege=true;
  s.wallsDropped=false;
  B.siegeS=s;
  G.settlements.setGateClosed(s,true);
  var tint=G.rpg.factionColor(s.faction);
  var garrison=[];
  var wallArch=Math.min(s.wallPosts.length,s.type==='town'?8:10);
  for(var i=0;i<wallArch;i++){
    var wp=s.wallPosts[i];
    var u=G.units.spawn(i%3===0?'sharpshooter':'archer',s.faction,wp.x,wp.z,{state:'wallpost',wallPost:wp,teamTint:tint});
    if(u){ u.ammo=40; garrison.push(u); u.siegeUnit=true; }
  }
  var melee=[];
  var mn=s.type==='town'?10:14;
  for(var j=0;j<mn;j++){
    var key=j<4?'veteran':(j<8?'infantry':'spearman');
    var a=Math.random()*6.28;
    var u2=G.units.spawn(key,s.faction,s.courtyard.x+Math.cos(a)*8,s.courtyard.z+Math.sin(a)*8,{state:'soldier',teamTint:tint});
    if(u2){ melee.push(u2); u2.siegeUnit=true; }
  }
  G.units.all.forEach(function(o){
    if(o.npcRole==='guard'&&!o.dead){
      var os=G.settlements.nearest(o.pos.x,o.pos.z);
      if(os===s){ o.state='soldier'; o.siegeUnit=true; melee.push(o); }
    }
  });
  if(melee.length){
    var sq=G.ai.makeSquad(melee,s.faction,'inf');
    G.ai.setOrder(sq,'hold',s.courtyard.x,s.courtyard.z,Math.atan2(s.gatePos.x-s.courtyard.x,s.gatePos.z-s.courtyard.z));
    sq.formation='shield';
    s.siegeSquad=sq;
  }
  s.siegeUnits=garrison.concat(melee);
  B.active=true;
  B.cx=s.gatePos.x; B.cz=s.gatePos.z;
  G.ui.battleBanner('攻城战：'+s.name);
  G.ui.notify('城门已关闭！选中部队按 C 冲锋，士兵会砍破城门。小心城墙上的弓手！','#ffd080');
  G.audio.play('charge',0.8);
  G.units.all.forEach(function(o){
    if(o.faction==='player'&&!o.isPlayer) o.gateTarget=s;
  });
  G.player.unit.gateTarget=s;
};

function siegeUpdate(dt){
  var s=B.siegeS;
  if(!s) return false;
  if(s.gate&&s.gate.open&&!s.wallsDropped){
    s.wallsDropped=true;
    s.siegeUnits.forEach(function(u){
      if(u.wallPost&&!u.dead){
        u.wallPost=null; u.state='soldier'; u.target=null;
        u.pos.set(s.courtyard.x+(Math.random()*2-1)*7,0,s.courtyard.z+(Math.random()*2-1)*7);
        u.pos.y=G.world.getH(u.pos.x,u.pos.z);
        if(s.siegeSquad){ s.siegeSquad.units.push(u); u.squad=s.siegeSquad; }
      }
    });
    G.ui.notify('守军撤下城墙，准备白刃战！','#ffd080');
  }
  if(s.gate&&s.gate.open&&s.siegeSquad&&s.siegeSquad.order.type!=='charge'){
    G.ai.setOrder(s.siegeSquad,'charge');
  }
  var alive=0;
  s.siegeUnits=s.siegeUnits.filter(function(u){ return !u.dead&&!u.fleeGone; });
  alive=s.siegeUnits.length;
  if(alive===0){
    captureSettlement(s);
    return true;
  }
  if(G.player.unit.dead){
    endSiegeFail(s);
    return true;
  }
  var pu=G.player.unit;
  if(G.dist2(pu.pos.x,pu.pos.z,s.x,s.z)>320*320){
    endSiegeFail(s);
    G.ui.notify('你撤离了攻城战。','#ff9c5a');
    return true;
  }
  return false;
}
function endSiegeFail(s){
  s.siege=false;
  G.settlements.setGateClosed(s,false);
  s.siegeUnits.forEach(function(u){ if(!u.dead) G.units.remove(u); });
  s.siegeUnits=[];
  if(s.siegeSquad){ G.ai.removeSquad(s.siegeSquad); s.siegeSquad=null; }
  clearGateTargets();
  B.siegeS=null;
  B.checkEnd(true);
}
function captureSettlement(s){
  s.siege=false;
  G.settlements.setGateClosed(s,false);
  if(s.siegeSquad){ G.ai.removeSquad(s.siegeSquad); s.siegeSquad=null; }
  var old=s.faction;
  s.faction='player';
  s.captured=true;
  clearGateTargets();
  B.siegeS=null;
  G.rpg.changeRep(old,-30);
  G.rpg.factions.forEach(function(f){
    if(f.id!==old&&f.id!=='bandit'&&f.id!=='player'&&G.rpg.hostile(f.id,old)) G.rpg.changeRep(f.id,10);
  });
  var gold=400+Math.floor(Math.random()*300);
  G.player.gold+=gold;
  G.player.addXp(300);
  G.rpg.armyXp(200);
  G.audio.play('levelup',1);
  G.ui.notify('你攻占了 '+s.name+'！获得 '+gold+' 金币。此地现在属于你。','#ffd700');
  B.checkEnd(true);
}
function clearGateTargets(){
  G.units.all.forEach(function(o){ o.gateTarget=null; });
}

B.update=function(dt){
  if(B.siegeS){ if(siegeUpdate(dt)) return; }
  if(!B.active) return;
  if(!B.enemies.length){
    if(!B.siegeS) B.checkEnd(false);
    return;
  }
  var anyAlive=false, allDist=1e18;
  var pu=G.player.unit;
  for(var i=B.enemies.length-1;i>=0;i--){
    var p=B.enemies[i];
    var alive=0;
    p.roster.forEach(function(r){ if(r.unit&&!r.unit.dead) alive++; });
    if(alive===0&&p.expanded){
      var stillHasRoster=p.roster.some(function(r){return r.fled;});
      B.onPartyDefeated(p,!stillHasRoster);
      B.enemies.splice(i,1);
      continue;
    }
    anyAlive=anyAlive||alive>0;
    p.roster.forEach(function(r){
      if(r.unit&&!r.unit.dead){
        var d=G.dist2(pu.pos.x,pu.pos.z,r.unit.pos.x,r.unit.pos.z);
        if(d<allDist) allDist=d;
      }
    });
  }
  if(B.siegeS) return;
  if(!B.enemies.length){
    B.checkEnd(false);
    return;
  }
  if(allDist>240*240&&!pu.dead){
    B.enemies.forEach(function(p){ G.parties.collapse(p); });
    B.enemies=[];
    B.active=false;
    G.ui.notify('你脱离了战斗。','#9db4c8');
    G.ui.battleEnd();
  }
};

B.onPartyDefeated=function(p,total){
  var gold=0, xp=0;
  var tiers=0;
  p.initialRoster=p.initialRoster||[];
  gold=30+Math.floor(p.initialCount*(12+Math.random()*10));
  xp=p.initialCount*14;
  if(p.kind==='caravan') gold+=Math.floor(p.gold||0);
  if(p.kind==='lord'){ gold+=200; xp+=150; }
  B.pendingLoot=B.pendingLoot||{gold:0,xp:0,items:[]};
  B.pendingLoot.gold+=gold;
  B.pendingLoot.xp+=xp;
  var itemPool=['sword2','bow1','armor_leather','shield2','goods_iron','goods_furs','goods_salt','goods_wine','spear1'];
  var drops=1+Math.floor(Math.random()*2)+(p.kind==='lord'?2:0);
  for(var i=0;i<drops;i++){
    if(Math.random()<0.55) B.pendingLoot.items.push(G.pick(itemPool,Math.random));
  }
  G.rpg.onPartyDefeated(p);
  G.parties.destroy(p);
};

B.checkEnd=function(quiet){
  if(B.enemies.length) return;
  B.active=false;
  G.ui.battleEnd();
  if(B.pendingLoot&&(B.pendingLoot.gold>0||B.pendingLoot.items.length)){
    var pu=G.player.unit;
    B.lootData=B.pendingLoot;
    B.pendingLoot=null;
    B.spawnChest(pu.pos.x+Math.sin(pu.yaw)*3,pu.pos.z+Math.cos(pu.yaw)*3);
    if(!quiet) G.ui.notify('战斗胜利！战利品箱已放置在附近（按 E 拾取）','#ffd700');
    G.rpg.armyXp(B.lootData.xp*0.6);
    G.rpg.armyMoraleBoost();
  } else if(!quiet) G.ui.notify('战斗结束。','#9db4c8');
};

var chestMesh=null;
B.spawnChest=function(x,z){
  if(!chestMesh){
    var g=G.geo.merge([
      G.geo.box(1.1,0.6,0.7,0,0.3,0,0,0,0,0x7a5230),
      G.geo.box(1.14,0.18,0.74,0,0.68,0,0,0,0,0x8a6240),
      G.geo.box(0.16,0.3,0.74,0,0.5,0,0,0,0,0xc8a850)
    ]);
    chestMesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.8}));
    chestMesh.castShadow=G.cfg.shadows;
    G.world.scene.add(chestMesh);
  }
  chestMesh.visible=true;
  chestMesh.position.set(x,G.world.getH(x,z),z);
  B.lootChest={x:x,z:z};
};
B.openLoot=function(){
  if(!B.lootData) return;
  var d=B.lootData;
  G.player.gold+=d.gold;
  G.player.addXp(d.xp);
  d.items.forEach(function(it){ G.rpg.addItem(it); });
  G.audio.play('coin',1);
  G.ui.showLoot(d);
  B.lootData=null;
  B.lootChest=null;
  if(chestMesh) chestMesh.visible=false;
};
})();
