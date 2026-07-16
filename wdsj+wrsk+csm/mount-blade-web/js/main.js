(function(){
const G = window.G;
var renderer, scene, camera, clock;

function setLoad(pct,text){
  document.getElementById('loadbar').style.width=pct+'%';
  document.getElementById('loadtext').textContent=text;
}
function step(fn){ return new Promise(function(res){ setTimeout(function(){ fn(); res(); },16); }); }

async function boot(){
  var canvas=document.getElementById('c');
  renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=G.cfg.shadows;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,0.3,3600);
  camera.position.set(0,50,0);
  G.scene=scene; G.camera=camera; G.renderer=renderer;
  G.tmp.init();
  G.input.init(canvas);
  window.addEventListener('resize',function(){
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
  });

  setLoad(4,'构建大陆板块…');
  await step(function(){ G.world.prepare(scene); });
  var slices=8;
  for(var i=0;i<slices;i++){
    (function(i){ setLoad(6+i*5,'生成地形高度场…（'+(i+1)+'/'+slices+'）'); })(i);
    var z0=Math.floor(G.world.res*i/slices), z1=Math.floor(G.world.res*(i+1)/slices);
    await step(G.world.buildGridRows.bind(G.world,z0,z1));
  }
  setLoad(48,'铺设地表与道路…');
  await step(function(){ G.world.initChunks(); });
  setLoad(56,'种植森林与植被…');
  await step(function(){ G.world.buildVegetation(); });
  setLoad(66,'注入湖泊与河流…');
  await step(function(){ G.world.buildWater(); G.world.buildGrass(); });
  setLoad(70,'测绘世界地图…');
  await step(function(){ G.world.bakeMap(512); });
  setLoad(76,'修建村庄、城镇与城堡…');
  await step(function(){ G.settlements.buildAll(); G.settlements.initLights(scene); });
  setLoad(84,'召唤天空与天气…');
  await step(function(){ G.sky.init(scene); });
  setLoad(88,'铸造军团（实例化渲染池）…');
  await step(function(){ G.chars.init(scene); G.fx.init(scene); G.combat.initArrows(scene); });
  setLoad(93,'集结各方势力…');
  await step(function(){
    spawnSettlementNpcs();
    G.parties.initialSpawn();
    var town=G.world.settlements.filter(function(s){return s.type==='town';})[0];
    var gx=town.gatePos?town.gatePos.x:town.x, gz=town.gatePos?town.gatePos.z:town.z;
    var ox=gx+(gx-town.x)*0.35, oz=gz+(gz-town.z)*0.35;
    G.player.init(ox,oz);
    G.rpg.addTroop('recruit'); G.rpg.addTroop('recruit'); G.rpg.addTroop('militia');
    G.player.inv.push('goods_grain');
    G.ui.init();
    wireButtons();
  });
  setLoad(100,'完成！');
  await step(function(){
    document.getElementById('loading').style.display='none';
    document.getElementById('introLoad').style.display=G.rpg.hasSave()?'inline-block':'none';
    document.getElementById('introM').style.display='flex';
  });
  clock=new THREE.Clock();
  renderer.setAnimationLoop(loop);
}

function spawnSettlementNpcs(){
  G.world.settlements.forEach(function(s){
    s.npcs.forEach(function(n){
      var key=n.role==='guard'?'infantry':(n.role==='lord'?'guard':'civilian');
      var u=G.units.spawn(key,'civ',n.x,n.z,{
        state:n.role==='guard'?'guard':'civilian',
        npcRole:n.role,name:n.name,home:{x:n.x,z:n.z}
      });
      if(!u) return;
      u.homeFace=Math.atan2(s.x-n.x,s.z-n.z);
      if(n.role==='merchant'){ G.chars.setHumanColors(u,{chest:0x7a4a8a,pants:0x4a3a28,fore:0x9a7a5a,boots:0x3a2a18}); }
      if(n.role==='lord'){ u.name=n.name; G.chars.setHumanColors(u,{chest:G.rpg.factionColor(s.faction),pants:0x3a3a44,fore:0x6a5a45,boots:0x2a2a30,shield:G.rpg.factionColor(s.faction)}); }
      if(n.role==='elder'){ G.chars.setHumanColors(u,{chest:0x8a8a6a,pants:0x5a5a45,fore:0xd9ac88,boots:0x4a3a28}); }
      if(n.role==='guard'){
        u.faction=s.faction;
        var tint=G.rpg.factionColor(s.faction);
        var colors=Object.assign({},u.def.colors);
        var c=new THREE.Color(colors.chest); c.lerp(new THREE.Color(tint),0.42);
        colors.chest=c.getHex();
        G.chars.setHumanColors(u,colors);
      }
    });
  });
}

function wireButtons(){
  function on(id,fn){ var el=document.getElementById(id); if(el) el.onclick=fn; }
  document.querySelectorAll('[data-close]').forEach(function(el){
    el.addEventListener('click',function(){ G.ui.closeModal(); });
  });
  on('pauseResume',function(){ G.ui.closeModal(); });
  on('pauseSave',function(){ G.rpg.save(); });
  on('pauseLoad',function(){ if(G.rpg.load()) G.ui.closeModal(); });
  on('pauseHelp',function(){ G.ui.openModal('helpM'); });
  on('pauseShadow',function(){
    G.cfg.shadows=!G.cfg.shadows;
    renderer.shadowMap.enabled=G.cfg.shadows;
    scene.traverse(function(o){ if(o.material) o.material.needsUpdate=true; });
    G.ui.notify('阴影：'+(G.cfg.shadows?'开':'关'),'#9db4c8');
  });
  on('siegeYes',function(){
    G.ui.closeModal();
    if(G.ui.siegeTarget) G.battle.startSiege(G.ui.siegeTarget);
  });
  on('introStart',function(){
    document.getElementById('introM').style.display='none';
    startGame(false);
  });
  on('introLoad',function(){
    document.getElementById('introM').style.display='none';
    startGame(true);
  });
  on('introHelp',function(){
    G.started=true;
    G.ui.openModal('helpM');
    G.started=false;
  });
}
function startGame(load){
  G.started=true;
  G.paused=false;
  G.audio.init();
  if(load) G.rpg.load();
  G.input.requestLock();
  G.ui.notify('欢迎来到卡拉德大陆！按 Esc 打开菜单查看操作说明。','#e8d5a0');
  G.ui.notify('先去村庄找长老招募士兵，小心路上的强盗。','#9db4c8');
}

var perfT=0;
function loop(){
  var dt=Math.min(clock.getDelta(),0.05);
  if(G.started&&!G.paused){
    var camP=camera.position;
    G.sky.update(dt,camP);
    G.parties.update(dt);
    G.units.update(dt,camP);
    G.combat.update(dt);
    G.battle.update(dt);
    G.player.update(dt,camera);
    G.world.updateLOD(dt,camP.x,camP.z);
    G.world.updateGrass(G.player.unit.pos.x,G.player.unit.pos.z);
  } else if(G.started&&G.paused){
    G.player.update(0,camera);
  } else {
    G.sky.update(dt,camera.position);
    camera.position.set(Math.sin(performance.now()*0.00005)*300,120,Math.cos(performance.now()*0.00005)*300);
    camera.lookAt(0,20,0);
  }
  if(G.started) G.ui.update(dt);
  G.input.endFrame();
  renderer.render(scene,camera);
}

boot();
})();
