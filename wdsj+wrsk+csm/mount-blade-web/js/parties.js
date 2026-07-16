(function(){
const G = window.G;
const PT = G.parties = { list:[], nextId:1, spawnT:20 };

const LORD_NAMES={nord:'霜狼伯爵',emp:'金鹰公爵',khan:'苍隼可汗'};

PT.newParty=function(kind,faction,x,z,roster,name){
  var p={
    id:PT.nextId++, kind:kind, faction:faction, name:name||kind,
    x:x, z:z, tx:x, tz:z, speed:kind==='caravan'?2.6:(kind==='bandit'?3.4:3.0),
    roster:roster, visUnits:[], expanded:false, battle:null, squads:null, general:null,
    initialCount:roster.length, thinkT:Math.random()*2, gold:kind==='caravan'?150+Math.random()*250:0,
    ignorePlayerT:0, fled:false
  };
  PT.list.push(p);
  return p;
};

function mkRoster(comp){
  var r=[];
  comp.forEach(function(c){
    for(var i=0;i<c[1];i++) r.push({key:c[0],xp:0,unit:null,fled:false});
  });
  return r;
}
PT.spawnBandits=function(){
  var rng=Math.random;
  var x,z,tries=0;
  do{
    x=(rng()*2-1)*(G.world.half-250); z=(rng()*2-1)*(G.world.half-250);
    tries++;
  } while(tries<40&&(G.world.getH(x,z)<2||nearAnySettlement(x,z,300)||(G.player.unit&&G.dist2(x,z,G.player.unit.pos.x,G.player.unit.pos.z)<350*350)));
  var size=Math.random();
  var comp;
  if(size<0.5) comp=[['bandit',3+Math.floor(rng()*4)],['banditArcher',1+Math.floor(rng()*3)]];
  else if(size<0.85) comp=[['bandit',5+Math.floor(rng()*4)],['banditArcher',2+Math.floor(rng()*3)],['raider',1+Math.floor(rng()*2)]];
  else comp=[['bandit',6+Math.floor(rng()*5)],['banditArcher',3+Math.floor(rng()*3)],['raider',2+Math.floor(rng()*3)],['banditBoss',1]];
  return PT.newParty('bandit','bandit',x,z,mkRoster(comp),'强盗团伙');
};
PT.spawnPatrol=function(faction){
  var homes=G.world.settlements.filter(function(s){return s.faction===faction;});
  if(!homes.length) return null;
  var h=G.pick(homes,Math.random);
  var comp=[['militia',3+Math.floor(Math.random()*3)],['infantry',2+Math.floor(Math.random()*3)],['archer',2+Math.floor(Math.random()*2)],['cavalry',1+Math.floor(Math.random()*2)]];
  return PT.newParty('patrol',faction,h.x+60,h.z+60,mkRoster(comp),G.rpg.factionName(faction)+'巡逻队');
};
PT.spawnLord=function(faction){
  var homes=G.world.settlements.filter(function(s){return s.faction===faction&&s.type!=='village';});
  if(!homes.length) return null;
  var h=homes[0];
  var comp=[['infantry',6],['veteran',3],['spearman',4],['archer',5],['cavalry',3],['knight',2]];
  return PT.newParty('lord',faction,h.x+80,h.z+40,mkRoster(comp),LORD_NAMES[faction]+'的战团');
};
PT.spawnCaravan=function(){
  var towns=G.world.settlements.filter(function(s){return s.type==='town';});
  if(towns.length<2) return null;
  var a=G.pick(towns,Math.random);
  var p=PT.newParty('caravan',a.faction,a.x+70,a.z,mkRoster([['militia',3],['archer',2]]),'商队');
  p.destTown=G.pick(towns.filter(function(t){return t!==a;}),Math.random);
  return p;
};
function nearAnySettlement(x,z,r){
  for(var i=0;i<G.world.settlements.length;i++){
    if(G.dist2(x,z,G.world.settlements[i].x,G.world.settlements[i].z)<r*r) return true;
  }
  return false;
}

PT.initialSpawn=function(){
  for(var i=0;i<6;i++) PT.spawnBandits();
  ['nord','emp','khan'].forEach(function(f){
    PT.spawnPatrol(f); PT.spawnPatrol(f); PT.spawnLord(f);
  });
  for(var c=0;c<3;c++) PT.spawnCaravan();
};

function pickWaypoint(p){
  var s;
  if(p.kind==='caravan'){
    if(!p.destTown||G.dist2(p.x,p.z,p.destTown.x,p.destTown.z)<80*80){
      var towns=G.world.settlements.filter(function(t){return t.type==='town'&&t!==p.destTown;});
      p.destTown=G.pick(towns,Math.random);
      if(p.gold!==undefined) p.gold+=60;
    }
    p.tx=p.destTown.x+50; p.tz=p.destTown.z+50;
    return;
  }
  if(p.kind==='bandit'){
    if(Math.random()<0.5){
      s=G.pick(G.world.settlements.filter(function(t){return t.type==='village';}),Math.random);
      var a=Math.random()*6.28;
      p.tx=s.x+Math.cos(a)*180; p.tz=s.z+Math.sin(a)*180;
    } else {
      p.tx=G.clamp(p.x+(Math.random()*2-1)*400,-G.world.half+200,G.world.half-200);
      p.tz=G.clamp(p.z+(Math.random()*2-1)*400,-G.world.half+200,G.world.half-200);
    }
    return;
  }
  var own=G.world.settlements.filter(function(t){return t.faction===p.faction;});
  s=own.length?G.pick(own,Math.random):G.pick(G.world.settlements,Math.random);
  var a2=Math.random()*6.28;
  p.tx=s.x+Math.cos(a2)*(100+Math.random()*150); p.tz=s.z+Math.sin(a2)*(100+Math.random()*150);
}

function partyStrength(p){
  var s=0;
  p.roster.forEach(function(r){ if(!r.fled) s+=G.troops[r.key].tier+1; });
  return s;
}
PT.autoResolve=function(pa,pb){
  var sa=partyStrength(pa)*(0.8+Math.random()*0.4), sb=partyStrength(pb)*(0.8+Math.random()*0.4);
  var winner=sa>=sb?pa:pb, loser=sa>=sb?pb:pa;
  var lossFrac=0.25+Math.random()*0.3;
  winner.roster=winner.roster.filter(function(){ return Math.random()>lossFrac*0.5; });
  PT.destroy(loser);
  if(winner.roster.length===0) PT.destroy(winner);
};
PT.destroy=function(p){
  p.visUnits.forEach(function(u){ G.units.remove(u); });
  p.visUnits.length=0;
  if(p.squads){ p.squads.forEach(function(sq){ G.ai.removeSquad(sq); }); p.squads=null; }
  var i=PT.list.indexOf(p);
  if(i>=0) PT.list.splice(i,1);
};

/* collapse expanded party back to roam mode */
PT.collapse=function(p){
  p.roster.forEach(function(r){
    if(r.unit){ G.units.remove(r.unit); r.unit=null; }
    r.fled=false;
  });
  if(p.squads){ p.squads.forEach(function(sq){ G.ai.removeSquad(sq); }); p.squads=null; }
  p.expanded=false; p.battle=null; p.general=null;
  p.ignorePlayerT=25;
};

PT.expand=function(p,facingX,facingZ){
  p.visUnits.forEach(function(u){ G.units.remove(u); });
  p.visUnits.length=0;
  var yaw=Math.atan2(facingX-p.x,facingZ-p.z);
  var tint=G.rpg.factionColor(p.faction);
  var spawned=[];
  var idx=0;
  p.roster.forEach(function(r){
    if(r.unit||r.fled) return;
    var row=Math.floor(idx/8), col=idx%8;
    var rx=Math.cos(yaw), rz=-Math.sin(yaw);
    var ox=(col-3.5)*2.2, oz=-row*2.5;
    var x=p.x+rx*ox-Math.sin(yaw)*oz, z=p.z+rz*ox-Math.cos(yaw)*oz;
    var u=G.units.spawn(r.key,p.faction,x,z,{yaw:yaw,party:p,state:'soldier',teamTint:tint});
    if(u){ r.unit=u; u.rosterRef=r; spawned.push(u); idx++; }
  });
  var inf=[],arc=[],cav=[];
  spawned.forEach(function(u){
    var c=G.troopClass(u.def);
    (c==='inf'?inf:(c==='arc'?arc:cav)).push(u);
  });
  p.squads=[];
  if(inf.length) p.squads.push(G.ai.makeSquad(inf,p.faction,'inf'));
  if(arc.length) p.squads.push(G.ai.makeSquad(arc,p.faction,'arc'));
  if(cav.length) p.squads.push(G.ai.makeSquad(cav,p.faction,'cav'));
  p.squads.forEach(function(sq){ G.ai.setOrder(sq,'hold',p.x,p.z,yaw); });
  p.general=G.ai.newGeneral(p);
  p.expanded=true;
  p.initialCount=spawned.length;
  return spawned.length;
};

/* roster callbacks */
function partyProto(){}
PT.hookRoster=function(p){
  p.onUnitDead=function(u){
    if(u.rosterRef){
      var i=p.roster.indexOf(u.rosterRef);
      if(i>=0) p.roster.splice(i,1);
      u.rosterRef.unit=null;
    }
  };
  p.onUnitFled=function(u){
    if(u.rosterRef){ u.rosterRef.fled=true; u.rosterRef.unit=null; u.fleeGone=true; }
    G.units.remove(u);
  };
};

/* visuals for roaming parties */
function syncVisuals(p,playerPos){
  var d2=G.dist2(p.x,p.z,playerPos.x,playerPos.z);
  if(!p.expanded){
    if(d2<420*420&&p.visUnits.length===0&&p.roster.length>0){
      var n=Math.min(4,p.roster.length);
      var tint=G.rpg.factionColor(p.faction);
      for(var i=0;i<n;i++){
        var r=p.roster[i];
        var u=G.units.spawn(r.key,p.faction,p.x+i*1.5,p.z+i,{party:p,state:'travel',npcRole:'travel',teamTint:tint});
        if(u) p.visUnits.push(u);
      }
    } else if((d2>480*480||p.roster.length===0)&&p.visUnits.length>0){
      p.visUnits.forEach(function(u){ G.units.remove(u); });
      p.visUnits.length=0;
    }
  }
}

PT.update=function(dt){
  var pu=G.player.unit;
  if(!pu) return;
  PT.spawnT-=dt;
  if(PT.spawnT<=0){
    PT.spawnT=45;
    var bandits=PT.list.filter(function(p){return p.kind==='bandit';}).length;
    if(bandits<6) PT.spawnBandits();
    ['nord','emp','khan'].forEach(function(f){
      var pats=PT.list.filter(function(p){return p.faction===f&&p.kind==='patrol';}).length;
      if(pats<2&&Math.random()<0.5) PT.spawnPatrol(f);
      var lords=PT.list.filter(function(p){return p.faction===f&&p.kind==='lord';}).length;
      if(lords<1&&Math.random()<0.3) PT.spawnLord(f);
    });
    if(PT.list.filter(function(p){return p.kind==='caravan';}).length<3) PT.spawnCaravan();
  }
  for(var i=PT.list.length-1;i>=0;i--){
    var p=PT.list[i];
    if(!p.onUnitDead) PT.hookRoster(p);
    if(p.roster.length===0&&!p.expanded){ PT.destroy(p); continue; }
    if(p.expanded){
      /* follow centroid */
      var cx=0,cz=0,n=0;
      p.roster.forEach(function(r){ if(r.unit&&!r.unit.dead){ cx+=r.unit.pos.x; cz+=r.unit.pos.z; n++; } });
      if(n>0){ p.x=cx/n; p.z=cz/n; }
      if(p.general) G.ai.updateGeneral(p.general,dt);
      p.thinkT-=dt;
      if(p.thinkT<=0){
        p.thinkT=1.0;
        if(n===0){
          if(G.battle.enemies.indexOf(p)<0){
            var anyFled=p.roster.some(function(r){return r.fled;});
            if(anyFled){ PT.collapse(p); }
            else PT.destroy(p);
          }
        } else if(G.battle.enemies.indexOf(p)<0){
          if(G.rpg.hostile(p.faction,'player')&&!pu.dead&&G.dist2(p.x,p.z,pu.pos.x,pu.pos.z)<85*85){
            G.battle.engagePlayer(p);
          } else {
            var probe=null;
            for(var ri=0;ri<p.roster.length;ri++){ if(p.roster[ri].unit&&!p.roster[ri].unit.dead){ probe=p.roster[ri].unit; break; } }
            if(probe&&!G.units.nearestEnemy(probe,150)) PT.collapse(p);
          }
        }
      }
      continue;
    }
    if(p.ignorePlayerT>0) p.ignorePlayerT-=dt;
    /* movement */
    var dx=p.tx-p.x, dz=p.tz-p.z, d=Math.sqrt(dx*dx+dz*dz);
    if(d<25){ pickWaypoint(p); }
    else { p.x+=dx/d*p.speed*dt; p.z+=dz/d*p.speed*dt; }
    syncVisuals(p,pu.pos);
    p.thinkT-=dt;
    if(p.thinkT>0) continue;
    p.thinkT=0.6;
    /* encounter with player */
    var pd2=G.dist2(p.x,p.z,pu.pos.x,pu.pos.z);
    if(p.ignorePlayerT<=0&&pd2<60*60&&G.rpg.hostile(p.faction,'player')&&!pu.dead){
      G.battle.engagePlayer(p);
      continue;
    }
    /* AI vs AI */
    for(var j=0;j<PT.list.length;j++){
      var q=PT.list[j];
      if(q===p||q.expanded) continue;
      if(!G.rpg.hostile(p.faction,q.faction)) continue;
      var dd=G.dist2(p.x,p.z,q.x,q.z);
      if(dd<50*50){
        var pdist=G.dist2(p.x,p.z,pu.pos.x,pu.pos.z);
        if(pdist<280*280&&G.battle.canStart(p.roster.length+q.roster.length)){
          G.battle.engageParties(p,q);
        } else {
          PT.autoResolve(p,q);
        }
        break;
      }
    }
  }
  syncPlayerArmy(dt);
};

/* ---------- player army ---------- */
var armyT=0;
function syncPlayerArmy(dt){
  armyT-=dt;
  if(armyT>0) return;
  armyT=1.5;
  var pu=G.player.unit;
  if(!pu||pu.dead) return;
  var roster=G.rpg.playerParty;
  for(var i=roster.length-1;i>=0;i--){
    var r=roster[i];
    if(r.unit&&r.unit.dead){ roster.splice(i,1); continue; }
    if(r.unit&&r.unit.fleeGone){ r.unit=null; }
  }
  roster.forEach(function(r){
    if(r.unit) return;
    var a=Math.random()*6.28, dist=4+Math.random()*6;
    var x=pu.pos.x+Math.cos(a)*dist, z=pu.pos.z+Math.sin(a)*dist;
    var u=G.units.spawn(r.key,'player',x,z,{state:'soldier',teamTint:0x4a8adf,xp:r.xp,moraleBonus:G.player.stats.skills.leadership*2});
    if(!u) return;
    r.unit=u; u.rosterRef=r;
    if(G.battle.siegeS) u.gateTarget=G.battle.siegeS;
    var c=G.troopClass(u.def);
    var sq=G.player.squads[c];
    if(!sq){
      sq=G.ai.makeSquad([u],'player',c,pu);
      sq.order.type='follow';
      G.player.squads[c]=sq;
    } else {
      sq.units.push(u); u.squad=sq;
    }
  });
  ['inf','arc','cav'].forEach(function(k){
    var sq=G.player.squads[k];
    if(sq){
      sq.units=sq.units.filter(function(u){return !u.dead&&u.faction==='player';});
      if(!sq.units.length){ G.ai.removeSquad(sq); G.player.squads[k]=null; }
    }
  });
}
PT.playerArmyAlive=function(){
  var n=0;
  G.rpg.playerParty.forEach(function(r){ if(r.unit&&!r.unit.dead) n++; });
  return n;
};
})();
