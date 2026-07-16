(function(){
const G = window.G;
const UI = G.ui = { modal:null, hintText:'', deathShown:false };
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/</g,'&lt;'); }
function cssColor(hex){ return '#'+('000000'+hex.toString(16)).slice(-6); }

UI.init=function(){
  UI.root=$('ui');
  UI.minimapCv=$('minimap');
  UI.mapCtx=UI.minimapCv.getContext('2d');
  window.addEventListener('keydown',function(e){
    if(!G.started) return;
    if(e.code==='Escape'){ if(UI.modal) UI.closeModal(); }
  });
};
UI.anyModal=function(){ return !!UI.modal; };
UI.openModal=function(id){
  if(UI.modal) $(UI.modal).style.display='none';
  UI.modal=id;
  $(id).style.display='flex';
  G.paused=true;
  G.input.exitLock();
  G.audio.play('click',0.6);
};
UI.closeModal=function(){
  if(!UI.modal) return;
  $(UI.modal).style.display='none';
  UI.modal=null;
  G.paused=false;
  if(G.started) G.input.requestLock();
};
UI.openPause=function(){
  if(UI.modal||!G.started||UI.deathShown) return;
  $('pauseSave').style.display=G.rpg.hasSave()?'block':'block';
  UI.openModal('pauseM');
};

/* ---------- notifications ---------- */
var feed=[];
UI.notify=function(text,color){
  var el=document.createElement('div');
  el.className='note';
  el.style.color=color||'#e8e0d0';
  el.textContent=text;
  $('notes').appendChild(el);
  feed.push({el:el,t:7});
  if(feed.length>7){ var o=feed.shift(); o.el.remove(); }
};
UI.orderFx=function(text){
  var el=$('orderfx');
  el.textContent=text;
  el.style.opacity=1;
  clearTimeout(UI._ofx);
  UI._ofx=setTimeout(function(){ el.style.opacity=0; },1400);
};
UI.setHint=function(t){
  if(t===UI.hintText) return;
  UI.hintText=t;
  $('hint').textContent=t;
  $('hint').style.display=t?'block':'none';
};
UI.battleBanner=function(t){
  var el=$('banner');
  el.textContent=t;
  el.style.opacity=1;
  clearTimeout(UI._bt);
  UI._bt=setTimeout(function(){ el.style.opacity=0; },3200);
  $('battlebar').style.display='flex';
};
UI.battleEnd=function(){ $('battlebar').style.display='none'; };
UI.flashDamage=function(){
  var el=$('dmgflash');
  el.style.opacity=0.45;
  clearTimeout(UI._df);
  UI._df=setTimeout(function(){ el.style.opacity=0; },160);
};
UI.hitMarker=function(){
  var el=$('hitmark');
  el.style.opacity=1;
  clearTimeout(UI._hm);
  UI._hm=setTimeout(function(){ el.style.opacity=0; },120);
  G.audio.play('clang',0.25);
};

/* ---------- death ---------- */
UI.showDeath=function(){
  UI.deathShown=true;
  $('death').style.display='flex';
};
UI.hideDeath=function(){
  UI.deathShown=false;
  $('death').style.display='none';
};

/* ---------- dialog ---------- */
UI.openDialog=function(npc){
  var s=G.settlements.nearest(npc.pos.x,npc.pos.z);
  UI.dialogNpc=npc; UI.dialogS=s;
  $('dlgTitle').textContent=npc.name+'　—　'+s.name+'（'+G.rpg.factionName(s.faction)+'）';
  var opts=[];
  if(npc.npcRole==='merchant'){
    opts.push(['交易货物',function(){ UI.openTrade(s); }]);
    if(G.rpg.quests.some(function(q){return q.type==='deliver'&&q.dest===s&&!q.done;}))
      opts.push(['交付货物（任务）',function(){ if(G.rpg.tryDeliver(s)) UI.closeModal(); }]);
    opts.push(['打听消息',function(){
      var p=G.parties.list.filter(function(x){return x.kind==='bandit';})[0];
      UI.notify(p?'商人：听说'+dirName(s,p)+'有强盗出没…':'商人：最近路上还算太平。','#d0c0a0');
    }]);
  }
  if(npc.npcRole==='elder'){
    opts.push(['招募士兵',function(){ UI.openRecruit(s); }]);
    opts.push(['寻求任务',function(){ UI.questDialog(npc,s); }]);
    if(s.type==='village') opts.push(['休息到清晨（恢复体力与生命）',function(){ rest(); }]);
  }
  if(npc.npcRole==='lord'){
    opts.push(['寻求任务',function(){ UI.questDialog(npc,s); }]);
    opts.push(['谈论关系',function(){
      UI.notify(G.rpg.factionName(s.faction)+' 对你的态度：'+Math.round(G.rpg.rep[s.faction]||0),'#d0c0a0');
    }]);
    opts.push(['休息到清晨',function(){ rest(); }]);
  }
  var done=G.rpg.quests.filter(function(q){return q.done&&q.s===s;});
  done.forEach(function(q){
    opts.push(['【交任务】'+q.title+'（'+q.rewardGold+'金）',function(){ G.rpg.turnIn(q); UI.closeModal(); }]);
  });
  opts.push(['离开',function(){ UI.closeModal(); }]);
  var host=$('dlgOpts');
  host.innerHTML='';
  opts.forEach(function(o){
    var b=document.createElement('div');
    b.className='opt';
    b.textContent=o[0];
    b.onclick=function(){ G.audio.play('click',0.5); o[1](); };
    host.appendChild(b);
  });
  UI.openModal('dialogM');
};
function dirName(s,p){
  var ang=Math.atan2(p.x-s.x,p.z-s.z)*180/Math.PI;
  var dirs=['北方','东北','东方','东南','南方','西南','西方','西北'];
  return dirs[Math.round(((ang+360)%360)/45)%8];
}
function rest(){
  var target=7;
  var h=G.sky.hour;
  var adv=h<target?target-h:24-h+target;
  G.sky.hour+=adv;
  if(G.sky.hour>=24){ G.sky.hour-=24; G.sky.day++; G.rpg.onNewDay(); }
  var u=G.player.unit;
  u.hp=u.maxHp; G.player.stamina=G.player.maxStamina;
  G.player.ammo=G.player.ammoMax;
  G.player.horseInjured=false;
  if(!G.player.horseOut&&!u.mounted&&G.player.equip.horse) G.player.spawnHorse(u.pos.x+3,u.pos.z+2);
  G.rpg.playerParty.forEach(function(r){ if(r.unit){ r.unit.hp=r.unit.maxHp; r.unit.ammo=28; } });
  UI.notify('你休息到了清晨，全军恢复。','#8fd08f');
  UI.closeModal();
}
UI.questDialog=function(npc,s){
  var mine=G.rpg.quests.filter(function(q){return q.s===s;});
  if(mine.length){ UI.notify('你已经接了这里的委托（按 J 查看任务）','#d0c0a0'); return; }
  if(G.rpg.quests.length>=3){ UI.notify('你的任务已满（最多3个）','#ff9c5a'); return; }
  var q=G.rpg.genQuest(npc,s);
  G.rpg.quests.push(q);
  UI.notify('接受任务：'+q.title+'（奖励 '+q.rewardGold+' 金币）','#ffd700');
  UI.closeModal();
};

/* ---------- recruit ---------- */
UI.openRecruit=function(s){
  UI.tradeS=s;
  var host=$('recList');
  host.innerHTML='';
  var opts=G.rpg.recruitOptions(s);
  opts.forEach(function(o){
    for(var i=0;i<o.n;i++){
      (function(key,cost){
        var d=G.troops[key];
        var b=document.createElement('div');
        b.className='opt';
        b.innerHTML=esc(d.name)+'　<span class="gold">'+cost+' 金</span>　<span class="dim">T'+d.tier+' '+(d.mounted?'骑':(d.weapon==='bow'?'弓':'步'))+'</span>';
        b.onclick=function(){
          if(G.player.gold<cost){ UI.notify('金币不足','#ff9c5a'); return; }
          if(G.rpg.playerParty.length>=G.player.armyCap()){ UI.notify('部队已满（提升统御技能可扩编）','#ff9c5a'); return; }
          G.player.gold-=cost;
          G.rpg.addTroop(key);
          G.audio.play('coin',0.8);
          b.style.opacity=0.3; b.onclick=null;
          UI.refreshGold();
        };
        host.appendChild(b);
      })(o.key,o.cost);
    }
  });
  $('recCap').textContent='部队：'+G.rpg.playerParty.length+' / '+G.player.armyCap();
  UI.openModal('recruitM');
};

/* ---------- trade ---------- */
UI.openTrade=function(s){
  UI.tradeS=s;
  UI.refreshTrade();
  UI.openModal('tradeM');
};
UI.refreshTrade=function(){
  var s=UI.tradeS;
  $('tradeTitle').textContent=s.name+' 的市场';
  var shop=$('shopList'), inv=$('invList');
  shop.innerHTML=''; inv.innerHTML='';
  G.rpg.shopStock(s).forEach(function(key){
    var it=G.rpg.items[key], price=G.rpg.priceAt(s,key,false);
    var b=document.createElement('div');
    b.className='opt';
    b.innerHTML=esc(it.name)+' <span class="dim">'+esc(it.desc||'')+'</span><span class="gold" style="float:right">'+price+'金</span>';
    b.onclick=function(){
      if(G.player.gold<price){ UI.notify('金币不足','#ff9c5a'); return; }
      G.player.gold-=price;
      G.player.inv.push(key);
      G.audio.play('coin',0.7);
      UI.refreshTrade();
    };
    shop.appendChild(b);
  });
  G.player.inv.forEach(function(key,idx){
    var it=G.rpg.items[key];
    if(!it) return;
    var price=G.rpg.priceAt(s,key,true);
    var b=document.createElement('div');
    b.className='opt';
    b.innerHTML=esc(it.name)+'<span class="gold" style="float:right">+'+price+'金</span>';
    b.onclick=function(){
      G.player.inv.splice(idx,1);
      G.player.gold+=price;
      G.audio.play('coin',0.7);
      UI.refreshTrade();
    };
    inv.appendChild(b);
  });
  UI.refreshGold();
};
UI.refreshGold=function(){
  $('goldlab').textContent=Math.floor(G.player.gold);
  var g2=$('tradeGold'); if(g2) g2.textContent='金币：'+Math.floor(G.player.gold);
};

/* ---------- inventory / equipment ---------- */
UI.openInv=function(){
  var host=$('equipList');
  host.innerHTML='';
  var slots=[['melee','近战武器'],['bow','弓'],['shield','盾牌'],['armor','护甲'],['horse','坐骑']];
  slots.forEach(function(sl){
    var cur=G.player.equip[sl[0]];
    var d=document.createElement('div');
    d.className='eqslot';
    d.innerHTML='<b>'+sl[1]+'</b>：'+(cur?esc(G.rpg.items[cur].name):'<span class="dim">无</span>');
    host.appendChild(d);
  });
  var inv=$('invList2');
  inv.innerHTML='';
  if(!G.player.inv.length) inv.innerHTML='<div class="dim" style="padding:8px">背包是空的</div>';
  G.player.inv.forEach(function(key,idx){
    var it=G.rpg.items[key];
    if(!it) return;
    var b=document.createElement('div');
    b.className='opt';
    var slot=null;
    if(it.type==='weapon') slot='melee';
    if(it.type==='bow') slot='bow';
    if(it.type==='shield') slot='shield';
    if(it.type==='armor') slot='armor';
    if(it.type==='horse') slot='horse';
    b.innerHTML=esc(it.name)+' <span class="dim">'+esc(it.desc||'')+'</span>'+(slot?'<span style="float:right;color:#8fd0ff">装备</span>':'');
    if(slot){
      b.onclick=function(){
        var old=G.player.equip[slot];
        G.player.equip[slot]=key;
        G.player.inv.splice(idx,1);
        if(old) G.player.inv.push(old);
        if(slot==='horse'&&!G.player.unit.mounted){
          if(G.player.horseOut){ G.chars.freeHorse(G.player.horseOut.hslot); G.player.horseOut=null; }
          G.player.spawnHorse(G.player.unit.pos.x+3,G.player.unit.pos.z+2);
        }
        G.player.computeStats();
        if(slot==='bow') G.player.ammo=G.player.ammoMax;
        G.audio.play('click',0.6);
        UI.openInv();
      };
    }
    inv.appendChild(b);
  });
  UI.openModal('invM');
};

/* ---------- character ---------- */
UI.openChar=function(){
  var st=G.player.stats;
  $('charStats').innerHTML=
    '<div>等级 <b>'+st.level+'</b>　经验 '+Math.floor(st.xp)+' / '+G.player.xpNext()+'</div>'+
    '<div>生命 '+Math.ceil(G.player.unit.hp)+' / '+G.player.unit.maxHp+'　护甲 '+G.player.unit.armor+'</div>'+
    '<div>击杀 '+G.player.kills+'　金币 '+Math.floor(G.player.gold)+'</div>'+
    '<div style="margin-top:6px">可用技能点：<b style="color:#ffd700">'+st.skillPoints+'</b></div>';
  var host=$('skillList');
  host.innerHTML='';
  var defs=[['melee','近战','近战伤害 +4.5%/级'],['archery','箭术','弓伤害/拉弓速度提升'],['riding','骑术','骑乘速度 +3%/级'],['leadership','统御','部队上限 +6/级'],['trade','交易','买卖价格优惠 3%/级']];
  defs.forEach(function(d){
    var row=document.createElement('div');
    row.className='eqslot';
    row.innerHTML='<b>'+d[1]+'</b> Lv.'+st.skills[d[0]]+' <span class="dim">'+d[2]+'</span>';
    if(st.skillPoints>0){
      var btn=document.createElement('span');
      btn.textContent=' [ + ]';
      btn.style.cssText='color:#8fd0ff;cursor:pointer;float:right';
      btn.onclick=function(){
        st.skillPoints--; st.skills[d[0]]++;
        G.player.computeStats();
        G.audio.play('click',0.7);
        UI.openChar();
      };
      row.appendChild(btn);
    }
    host.appendChild(row);
  });
  UI.openModal('charM');
};

/* ---------- party ---------- */
UI.openParty=function(){
  var host=$('partyList');
  host.innerHTML='';
  var roster=G.rpg.playerParty;
  $('partyCap').textContent='部队：'+roster.length+' / '+G.player.armyCap()+'　每日军饷：'+G.rpg.wagesDue()+' 金';
  if(!roster.length) host.innerHTML='<div class="dim" style="padding:10px">你还没有士兵。到村庄或城镇找长老/募兵官招募。</div>';
  var groups={};
  roster.forEach(function(r){ (groups[r.key]=groups[r.key]||[]).push(r); });
  Object.keys(groups).forEach(function(key){
    var list=groups[key], d=G.troops[key];
    var row=document.createElement('div');
    row.className='eqslot';
    var avgXp=0;
    list.forEach(function(r){ avgXp+=r.xp; });
    avgXp/=list.length;
    var pct=d.xpNext>0?Math.min(100,Math.round(avgXp/d.xpNext*100)):100;
    row.innerHTML='<b>'+esc(d.name)+'</b> ×'+list.length+'　<span class="dim">T'+d.tier+' 经验 '+pct+'%</span>';
    if(d.xpNext>0&&d.next.length){
      d.next.forEach(function(nk){
        var ready=list.filter(function(r){return G.rpg.canUpgrade(r);});
        if(!ready.length) return;
        var nd=G.troops[nk];
        var btn=document.createElement('div');
        btn.className='opt';
        btn.style.marginLeft='18px';
        btn.textContent='升级 1 名为「'+nd.name+'」（'+G.rpg.upgradeCost(nk)+'金）— 可升级 '+ready.length+' 名';
        btn.onclick=function(){
          if(G.rpg.upgrade(ready[0],nk)) UI.openParty();
          else UI.notify('金币不足','#ff9c5a');
        };
        row.appendChild(btn);
      });
    }
    var dis=document.createElement('span');
    dis.textContent=' [遣散]';
    dis.style.cssText='color:#ff9c5a;cursor:pointer;float:right';
    dis.onclick=function(){
      var r=list[0];
      if(r.unit) G.units.remove(r.unit);
      roster.splice(roster.indexOf(r),1);
      UI.openParty();
    };
    row.appendChild(dis);
    host.appendChild(row);
  });
  UI.openModal('partyM');
};

/* ---------- quests ---------- */
UI.openQuests=function(){
  var host=$('questList');
  host.innerHTML='';
  if(!G.rpg.quests.length) host.innerHTML='<div class="dim" style="padding:10px">暂无任务。到村庄长老、城镇领主处接取。</div>';
  G.rpg.quests.forEach(function(q){
    var d=document.createElement('div');
    d.className='eqslot';
    var status=q.done?'<span style="color:#ffd700">【可交付】回 '+esc(q.s.name)+' 找 '+esc(q.giver)+'</span>':
      (q.type==='hunt'?'进度 '+q.progress+'/'+q.count:'进行中');
    d.innerHTML='<b>'+esc(q.title)+'</b><br><span class="dim">'+esc(q.desc)+'</span><br>'+status+'　<span class="gold">奖励 '+q.rewardGold+'金</span>';
    host.appendChild(d);
  });
  UI.openModal('questM');
};

/* ---------- map ---------- */
UI.openMap=function(){
  UI.openModal('mapM');
  UI.drawBigMap();
};
UI.drawBigMap=function(){
  var cv=$('bigmap'), ctx=cv.getContext('2d');
  var S=cv.width;
  ctx.drawImage(G.world.mapImg,0,0,S,S);
  function toPx(x,z){ return [(x+G.world.half)/G.world.size*S,(z+G.world.half)/G.world.size*S]; }
  ctx.lineWidth=1;
  G.world.settlements.forEach(function(s){
    var p=toPx(s.x,s.z);
    ctx.fillStyle=cssColor(G.rpg.factionColor(s.faction));
    var r=s.type==='town'?7:(s.type==='castle'?6:4);
    ctx.beginPath();
    if(s.type==='castle'){ ctx.rect(p[0]-r/1.4,p[1]-r/1.4,r*1.4,r*1.4); }
    else ctx.arc(p[0],p[1],r,0,6.28);
    ctx.fill();
    ctx.strokeStyle='#000'; ctx.stroke();
    ctx.fillStyle='#f0e8d8';
    ctx.font='12px sans-serif';
    ctx.fillText(s.name,p[0]+9,p[1]+4);
  });
  G.parties.list.forEach(function(p){
    var px=toPx(p.x,p.z);
    ctx.fillStyle=cssColor(G.rpg.factionColor(p.faction));
    ctx.beginPath(); ctx.arc(px[0],px[1],3,0,6.28); ctx.fill();
    var isTarget=G.rpg.quests.some(function(q){return q.type==='destroy'&&q.targetParty===p&&!q.done;});
    if(isTarget){
      ctx.strokeStyle='#ffd700'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(px[0],px[1],7,0,6.28); ctx.stroke();
      ctx.lineWidth=1;
    }
  });
  var u=G.player.unit;
  var pp=toPx(u.pos.x,u.pos.z);
  ctx.fillStyle='#fff';
  ctx.beginPath();
  ctx.moveTo(pp[0],pp[1]-6);
  ctx.lineTo(pp[0]-4,pp[1]+4);
  ctx.lineTo(pp[0]+4,pp[1]+4);
  ctx.fill();
};

/* ---------- loot ---------- */
UI.showLoot=function(d){
  var host=$('lootList');
  var html='<div class="eqslot">金币 <span class="gold">+'+d.gold+'</span></div>';
  html+='<div class="eqslot">经验 +'+d.xp+'</div>';
  d.items.forEach(function(k){
    var it=G.rpg.items[k];
    if(it) html+='<div class="eqslot">获得物品：<b>'+esc(it.name)+'</b></div>';
  });
  host.innerHTML=html;
  UI.openModal('lootM');
};

/* ---------- siege confirm ---------- */
UI.confirmSiege=function(s){
  UI.siegeTarget=s;
  $('siegeText').textContent='对 '+s.name+'（'+G.rpg.factionName(s.faction)+'）发动攻城战？守军将关闭城门并放箭。你需要砍破城门并消灭守军。';
  UI.openModal('siegeM');
};

/* ---------- HUD update ---------- */
var mmT=0, bcT=0;
UI.update=function(dt){
  var u=G.player.unit;
  if(!u) return;
  var pr=G.input.pressed;
  if(G.started&&!UI.deathShown){
    if(pr['KeyI']){ UI.modal==='invM'?UI.closeModal():UI.openInv(); }
    if(pr['KeyK']){ UI.modal==='charM'?UI.closeModal():UI.openChar(); }
    if(pr['KeyJ']){ UI.modal==='questM'?UI.closeModal():UI.openQuests(); }
    if(pr['KeyM']){ UI.modal==='mapM'?UI.closeModal():UI.openMap(); }
    if(pr['Tab']){ UI.modal==='partyM'?UI.closeModal():UI.openParty(); }
  }
  $('hpbar').style.width=Math.max(0,u.hp/u.maxHp*100)+'%';
  $('stbar').style.width=Math.max(0,G.player.stamina/G.player.maxStamina*100)+'%';
  var hb=$('horsebarwrap');
  if(u.mounted){ hb.style.display='block'; $('horsebar').style.width=Math.max(0,u.horseHp/u.horseMaxHp*100)+'%'; }
  else hb.style.display='none';
  var am=$('ammolab');
  if(u.weapon==='bow'){ am.style.display='block'; am.textContent='箭：'+G.player.ammo; }
  else am.style.display='none';
  $('timelab').textContent=G.sky.timeStr()+'　'+G.sky.weatherName();
  UI.refreshGold();
  $('xpbar').style.width=Math.min(100,G.player.stats.xp/G.player.xpNext()*100)+'%';
  $('levellab').textContent='Lv.'+G.player.stats.level;
  $('crosshair').style.display=G.player.aiming?'block':'none';
  $('selLab').textContent='指挥['+({all:'全体',inf:'步兵',arc:'弓兵',cav:'骑兵'})[G.player.selected]+']　1-4选择 F跟随 G驻守 C冲锋 V阵型';
  for(var i=feed.length-1;i>=0;i--){
    feed[i].t-=dt;
    if(feed[i].t<1.2) feed[i].el.style.opacity=Math.max(0,feed[i].t/1.2);
    if(feed[i].t<=0){ feed[i].el.remove(); feed.splice(i,1); }
  }
  bcT-=dt;
  if(G.battle.active&&bcT<=0){
    bcT=0.5;
    var mine=0, foes=0, mMor=0, fMor=0;
    G.units.all.forEach(function(o){
      if(o.dead) return;
      if(o.faction==='player'){ mine++; mMor+=o.morale; }
      else if((o.state==='soldier'||o.state==='wallpost')&&G.rpg.hostile('player',o.faction)){ foes++; fMor+=o.morale; }
    });
    $('bcount').innerHTML='我方 <b style="color:#8fd0ff">'+mine+'</b>　敌方 <b style="color:#ff8f7a">'+foes+'</b>';
    $('bmorale').textContent='士气 '+(mine?Math.round(mMor/mine):0)+' : '+(foes?Math.round(fMor/foes):0);
  }
  mmT-=dt;
  if(mmT<=0){ mmT=0.25; drawMinimap(); }
};

function drawMinimap(){
  var ctx=UI.mapCtx, S=UI.minimapCv.width;
  var u=G.player.unit;
  var range=420;
  var img=G.world.mapImg;
  var scale=img.width/G.world.size;
  var sw=range*2*scale;
  var sx=G.clamp((u.pos.x+G.world.half-range)*scale,0,img.width-sw);
  var sz=G.clamp((u.pos.z+G.world.half-range)*scale,0,img.width-sw);
  ctx.fillStyle='#1a2028';
  ctx.fillRect(0,0,S,S);
  ctx.drawImage(img,sx,sz,sw,sw,0,0,S,S);
  function toPx(x,z){ return [(x-u.pos.x+range)/(range*2)*S,(z-u.pos.z+range)/(range*2)*S]; }
  G.world.settlements.forEach(function(s){
    if(Math.abs(s.x-u.pos.x)>range||Math.abs(s.z-u.pos.z)>range) return;
    var p=toPx(s.x,s.z);
    ctx.fillStyle=cssColor(G.rpg.factionColor(s.faction));
    ctx.beginPath(); ctx.arc(p[0],p[1],4,0,6.28); ctx.fill();
  });
  G.parties.list.forEach(function(pt){
    if(Math.abs(pt.x-u.pos.x)>range||Math.abs(pt.z-u.pos.z)>range) return;
    var p=toPx(pt.x,pt.z);
    ctx.fillStyle=G.rpg.hostile('player',pt.faction)?'#ff5a4a':cssColor(G.rpg.factionColor(pt.faction));
    ctx.fillRect(p[0]-2,p[1]-2,4,4);
  });
  if(G.battle.active){
    G.units.all.forEach(function(o){
      if(o.dead||o===u) return;
      if(Math.abs(o.pos.x-u.pos.x)>range||Math.abs(o.pos.z-u.pos.z)>range) return;
      var p=toPx(o.pos.x,o.pos.z);
      ctx.fillStyle=o.faction==='player'?'#7ab8ff':(G.rpg.hostile('player',o.faction)?'#ff6a5a':'#cccccc');
      ctx.fillRect(p[0]-1,p[1]-1,2,2);
    });
  }
  var c=S/2;
  ctx.save();
  ctx.translate(c,c);
  ctx.rotate(Math.PI-G.player.camYaw);
  ctx.fillStyle='#ffffff';
  ctx.beginPath();
  ctx.moveTo(0,-6); ctx.lineTo(-4,4); ctx.lineTo(4,4);
  ctx.fill();
  ctx.restore();
}
})();
