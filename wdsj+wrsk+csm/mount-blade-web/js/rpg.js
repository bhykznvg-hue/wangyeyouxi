(function(){
const G = window.G;
const R = G.rpg = { playerParty:[], rep:{nord:0,emp:0,khan:0,bandit:-100}, quests:[], questSeq:1 };

R.factions=[
  {id:'player',name:'你的战团',color:0x4a8adf},
  {id:'nord',name:'北境王国',color:0x3a6ea5},
  {id:'emp',name:'苍金帝国',color:0xa53a3a},
  {id:'khan',name:'风原汗国',color:0x3a8a4a},
  {id:'bandit',name:'荒野强盗',color:0x3a3a3a},
  {id:'civ',name:'平民',color:0x9a8a6a}
];
R.factionName=function(id){ var f=R.factions.find(function(x){return x.id===id;}); return f?f.name:id; };
R.factionColor=function(id){ var f=R.factions.find(function(x){return x.id===id;}); return f?f.color:0x888888; };

R.wars={ 'nord|emp':true };
function warKey(a,b){ return a<b?a+'|'+b:b+'|'+a; }
R.atWar=function(a,b){ return !!R.wars[warKey(a,b)]; };
R.hostile=function(a,b){
  if(a===b) return false;
  if(a==='civ'||b==='civ') return false;
  if(a==='bandit'||b==='bandit') return true;
  if(a==='player') return R.rep[b]!==undefined&&R.rep[b]<=-20;
  if(b==='player') return R.rep[a]!==undefined&&R.rep[a]<=-20;
  return R.atWar(a,b);
};
R.changeRep=function(f,amt){
  if(R.rep[f]===undefined) return;
  var old=R.rep[f];
  R.rep[f]=G.clamp(R.rep[f]+amt,-100,100);
  if(amt!==0) G.ui.notify(R.factionName(f)+' 声望 '+(amt>0?'+':'')+Math.round(amt)+'（'+Math.round(R.rep[f])+'）',amt>0?'#8fd08f':'#ff9c5a');
  if(old>-20&&R.rep[f]<=-20) G.ui.notify('你与 '+R.factionName(f)+' 进入敌对状态！','#ff5a5a');
  if(old<=-20&&R.rep[f]>-20) G.ui.notify('你与 '+R.factionName(f)+' 不再敌对。','#8fd08f');
};

/* ---------- items ---------- */
R.items={
  sword1:{name:'铁剑',type:'weapon',wtype:'sword',dmg:26,price:80,desc:'可靠的单手剑'},
  sword2:{name:'精钢剑',type:'weapon',wtype:'sword',dmg:34,price:260,desc:'锋利的精钢武器'},
  sword3:{name:'大马士革剑',type:'weapon',wtype:'sword',dmg:44,price:750,desc:'大师锻造的利刃'},
  spear1:{name:'长枪',type:'weapon',wtype:'spear',dmg:30,price:150,desc:'可夹枪冲锋，可拒马'},
  spear2:{name:'骑士长枪',type:'weapon',wtype:'spear',dmg:40,price:520,desc:'冲锋利器'},
  bow1:{name:'猎弓',type:'bow',dmg:26,price:120,desc:'轻便的猎弓'},
  bow2:{name:'战弓',type:'bow',dmg:36,price:420,desc:'强劲的复合弓'},
  shield1:{name:'圆盾',type:'shield',hp:180,price:60,desc:'轻便木盾'},
  shield2:{name:'鸢盾',type:'shield',hp:340,price:220,desc:'覆铁大盾'},
  armor_cloth:{name:'布衣',type:'armor',armor:4,hp:0,weight:0,helm:false,color:0x8a7a5a,price:30,desc:''},
  armor_leather:{name:'皮甲',type:'armor',armor:14,hp:10,weight:1,helm:false,color:0x6b4a2b,price:180,desc:''},
  armor_mail:{name:'锁子甲',type:'armor',armor:28,hp:25,weight:2.2,helm:true,color:0x6a6a76,price:620,desc:''},
  armor_plate:{name:'板甲',type:'armor',armor:44,hp:45,weight:3.4,helm:true,color:0x9a9aa8,price:1600,desc:''},
  horse1:{name:'驮马',type:'horse',speed:10.5,price:220,desc:''},
  horse2:{name:'战马',type:'horse',speed:12.5,price:800,desc:''},
  goods_salt:{name:'盐',type:'goods',price:35,desc:'贸易货物'},
  goods_iron:{name:'铁锭',type:'goods',price:55,desc:'贸易货物'},
  goods_cloth:{name:'亚麻布',type:'goods',price:45,desc:'贸易货物'},
  goods_furs:{name:'毛皮',type:'goods',price:60,desc:'贸易货物'},
  goods_spice:{name:'香料',type:'goods',price:95,desc:'贵重货物'},
  goods_wine:{name:'葡萄酒',type:'goods',price:50,desc:'贸易货物'},
  goods_grain:{name:'谷物',type:'goods',price:18,desc:'贸易货物'},
  goods_tools:{name:'工具',type:'goods',price:70,desc:'贸易货物'}
};
if(R.items.armor_cloth){ R.items.cloth=R.items.armor_cloth; }

R.addItem=function(key){
  if(key==='armor_leather') key='armor_leather';
  G.player.inv.push(key);
};
R.priceAt=function(s,key,selling){
  var it=R.items[key];
  var mul=1;
  if(it.type==='goods'){
    if(!s.priceMul[key]) s.priceMul[key]=0.7+G.hash2(Math.round(s.x),R.items[key].price,13)*0.8;
    mul=s.priceMul[key];
  }
  var trade=1-G.player.stats.skills.trade*0.03;
  var p=it.price*mul;
  return Math.max(1,Math.round(selling?p*0.6/(trade):p*trade));
};
R.shopStock=function(s){
  var stock=['goods_salt','goods_iron','goods_cloth','goods_furs','goods_wine','goods_grain'];
  if(s.type==='town'){
    stock=stock.concat(['goods_spice','goods_tools','sword1','sword2','spear1','bow1','shield1','shield2','armor_leather','armor_mail','horse1','horse2']);
    if(s.prosperity>1.1) stock.push('sword3','bow2','armor_plate','spear2');
  } else {
    stock.push('sword1','shield1','armor_leather','bow1');
  }
  return stock;
};

/* ---------- recruiting / party ---------- */
R.recruitCost=function(key){ return G.troops[key].cost||15; };
R.recruitOptions=function(s){
  if(s.type==='village') return [{key:'recruit',n:4+Math.floor(Math.random()*3),cost:15}];
  if(s.type==='town') return [{key:'recruit',n:3,cost:15},{key:'militia',n:2,cost:45},{key:'hunter',n:2,cost:40}];
  return [{key:'militia',n:2,cost:45},{key:'infantry',n:1,cost:90}];
};
R.addTroop=function(key,xp){
  if(G.rpg.playerParty.length>=G.player.armyCap()) return false;
  R.playerParty.push({key:key,xp:xp||0,unit:null});
  return true;
};
R.wagesDue=function(){
  var w=0;
  R.playerParty.forEach(function(r){ w+=G.troops[r.key].wage; });
  return w;
};
R.armyXp=function(amt){
  var alive=R.playerParty.filter(function(r){return r.unit&&!r.unit.dead;});
  var per=alive.length?amt/alive.length:0;
  R.playerParty.forEach(function(r){ r.xp+=per; });
};
R.armyMoraleBoost=function(){
  R.playerParty.forEach(function(r){
    if(r.unit&&!r.unit.dead){
      r.unit.morale=Math.min(r.unit.baseMorale+20,r.unit.morale+25);
      r.unit.fleeing=false;
      if(Math.random()<0.4&&!r.unit.target) G.units.setAct(r.unit,'cheer',1.4);
    }
  });
};
R.canUpgrade=function(r){
  var def=G.troops[r.key];
  return def.xpNext>0&&r.xp>=def.xpNext&&def.next.length>0;
};
R.upgradeCost=function(key){ return G.troops[key].tier*35; };
R.upgrade=function(r,nextKey){
  var cost=R.upgradeCost(nextKey);
  if(G.player.gold<cost) return false;
  G.player.gold-=cost;
  if(r.unit){ G.units.remove(r.unit); r.unit=null; }
  r.key=nextKey; r.xp=0;
  G.audio.play('levelup',0.5);
  return true;
};

/* ---------- kill hooks ---------- */
R.onPlayerKill=function(u){
  var xp=10+u.def.tier*14;
  G.player.addXp(xp);
  G.player.kills++;
  if(u.faction!=='bandit'&&u.faction!=='player'&&u.faction!=='civ') R.changeRep(u.faction,-2);
  R.quests.forEach(function(q){
    if(q.type==='hunt'&&u.faction==='bandit'&&!q.done){
      q.progress++;
      if(q.progress>=q.count){ q.done=true; G.ui.notify('任务目标完成：'+q.title+'（回去交任务）','#ffd700'); }
      else G.ui.notify('任务进度：'+q.progress+'/'+q.count,'#d0d0a0');
    }
  });
};
R.onArmyKill=function(u){
  if(u.faction!=='bandit'&&u.faction!=='player'&&u.faction!=='civ') R.changeRep(u.faction,-1);
  R.quests.forEach(function(q){
    if(q.type==='hunt'&&u.faction==='bandit'&&!q.done){
      q.progress++;
      if(q.progress>=q.count){ q.done=true; G.ui.notify('任务目标完成：'+q.title,'#ffd700'); }
    }
  });
};
R.onPartyDefeated=function(p){
  if(p.faction!=='bandit'&&p.faction!=='player') R.changeRep(p.faction,-8);
  else if(p.faction==='bandit'){
    ['nord','emp','khan'].forEach(function(f){ R.changeRep(f,1); });
  }
  R.quests.forEach(function(q){
    if(q.type==='destroy'&&q.targetParty===p&&!q.done){
      q.done=true;
      G.ui.notify('任务目标完成：'+q.title,'#ffd700');
    }
  });
};

/* ---------- quests ---------- */
R.genQuest=function(giver,s){
  var types=['hunt','deliver','destroy'];
  var t=G.pick(types,Math.random);
  var q={id:R.questSeq++,type:t,giver:giver.name,giverRole:giver.npcRole,s:s,done:false,progress:0,rewardGold:0,rewardRep:0,faction:s.faction};
  if(t==='hunt'){
    q.count=4+Math.floor(Math.random()*5);
    q.title='剿灭强盗 ×'+q.count;
    q.desc='消灭 '+q.count+' 名强盗（你或部下击杀均可）。';
    q.rewardGold=q.count*22; q.rewardRep=6; q.rewardXp=q.count*15;
  } else if(t==='deliver'){
    var towns=G.world.settlements.filter(function(x){return x.type==='town'&&x!==s;});
    q.dest=G.pick(towns,Math.random);
    q.cargo=G.pick(['goods_grain','goods_cloth','goods_tools','goods_wine'],Math.random);
    q.title='运送'+R.items[q.cargo].name+'到'+q.dest.name;
    q.desc='将货物送到 '+q.dest.name+' 的商人处（对话选择交付）。';
    q.rewardGold=90+Math.floor(Math.random()*60); q.rewardRep=5; q.rewardXp=60;
    G.player.inv.push(q.cargo);
  } else {
    var cands=G.parties.list.filter(function(p){return p.kind==='bandit';});
    if(!cands.length){ return R.genQuestFallback(giver,s); }
    q.targetParty=G.pick(cands,Math.random);
    q.title='讨伐强盗团伙';
    q.desc='找到并消灭地图上的一伙强盗（地图 M 上有标记）。';
    q.rewardGold=160+Math.floor(Math.random()*80); q.rewardRep=8; q.rewardXp=120;
  }
  return q;
};
R.genQuestFallback=function(giver,s){
  var q={id:R.questSeq++,type:'hunt',giver:giver.name,s:s,done:false,progress:0,count:5,faction:s.faction,
    title:'剿灭强盗 ×5',desc:'消灭 5 名强盗。',rewardGold:110,rewardRep:6,rewardXp:75};
  return q;
};
R.turnIn=function(q){
  G.player.gold+=q.rewardGold;
  R.changeRep(q.faction,q.rewardRep);
  G.player.addXp(q.rewardXp||50);
  G.audio.play('coin',1);
  var i=R.quests.indexOf(q);
  if(i>=0) R.quests.splice(i,1);
  G.ui.notify('任务完成！获得 '+q.rewardGold+' 金币','#ffd700');
};
R.tryDeliver=function(s){
  for(var i=0;i<R.quests.length;i++){
    var q=R.quests[i];
    if(q.type==='deliver'&&q.dest===s&&!q.done){
      var ii=G.player.inv.indexOf(q.cargo);
      if(ii>=0){
        G.player.inv.splice(ii,1);
        q.done=true;
        R.turnIn(q);
        return true;
      }
    }
  }
  return false;
};

/* ---------- daily tick ---------- */
R.onNewDay=function(){
  var w=R.wagesDue();
  if(w>0){
    if(G.player.gold>=w){
      G.player.gold-=w;
      G.ui.notify('发放军饷：-'+w+' 金币','#d0b060');
    } else {
      G.ui.notify('金币不足以发饷！部分士兵离开了队伍','#ff5a5a');
      var lose=Math.ceil(R.playerParty.length*0.2);
      for(var i=0;i<lose&&R.playerParty.length;i++){
        var idx=Math.floor(Math.random()*R.playerParty.length);
        var r=R.playerParty[idx];
        if(r.unit) G.units.remove(r.unit);
        R.playerParty.splice(idx,1);
      }
    }
  }
  ['nord','emp','khan'].forEach(function(f){
    if(R.rep[f]<0&&R.rep[f]>-20) R.rep[f]=Math.min(0,R.rep[f]+1);
  });
  if(Math.random()<0.15){
    var pairs=[['nord','emp'],['nord','khan'],['emp','khan']];
    var pr=G.pick(pairs,Math.random);
    var k=warKey(pr[0],pr[1]);
    R.wars[k]=!R.wars[k];
    G.ui.notify(R.factionName(pr[0])+' 与 '+R.factionName(pr[1])+(R.wars[k]?' 开战了！':' 停战了。'),'#d0b060');
  }
  G.world.settlements.forEach(function(s){ s.priceMul={}; });
};

/* ---------- save / load ---------- */
R.save=function(){
  try{
    var u=G.player.unit;
    var data={
      v:1, gold:G.player.gold, stats:G.player.stats, equip:G.player.equip, inv:G.player.inv,
      party:R.playerParty.map(function(r){return {key:r.key,xp:r.xp};}),
      rep:R.rep, wars:R.wars, day:G.sky.day, hour:G.sky.hour,
      pos:[u.pos.x,u.pos.z], kills:G.player.kills,
      captured:G.world.settlements.map(function(s){return s.faction;})
    };
    localStorage.setItem('mbw_save',JSON.stringify(data));
    G.ui.notify('游戏已保存','#8fd08f');
  }catch(e){ G.ui.notify('保存失败','#ff5a5a'); }
};
R.load=function(){
  try{
    var raw=localStorage.getItem('mbw_save');
    if(!raw){ G.ui.notify('没有存档','#ff9c5a'); return false; }
    var d=JSON.parse(raw);
    G.player.gold=d.gold;
    G.player.stats=d.stats;
    G.player.equip=d.equip;
    G.player.inv=d.inv||[];
    G.player.kills=d.kills||0;
    R.playerParty.forEach(function(r){ if(r.unit) G.units.remove(r.unit); });
    R.playerParty.length=0;
    d.party.forEach(function(r){ R.playerParty.push({key:r.key,xp:r.xp,unit:null}); });
    R.rep=d.rep; R.wars=d.wars;
    G.sky.day=d.day; G.sky.hour=d.hour;
    if(d.captured) G.world.settlements.forEach(function(s,i){ s.faction=d.captured[i]||s.faction; });
    var u=G.player.unit;
    u.pos.set(d.pos[0],0,d.pos[1]); u.pos.y=G.world.getH(u.pos.x,u.pos.z);
    u.dead=false; u.hp=u.maxHp;
    G.player.computeStats();
    G.ui.notify('读取存档成功','#8fd08f');
    return true;
  }catch(e){ G.ui.notify('读取失败','#ff5a5a'); return false; }
};
R.hasSave=function(){ try{ return !!localStorage.getItem('mbw_save'); }catch(e){ return false; } };
})();
