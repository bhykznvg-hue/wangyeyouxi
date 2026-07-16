const THREE=require('./lib/three.min.js');
global.THREE=THREE;
global.window=global;
global.performance=global.performance||{now:()=>Date.now()};
global.document={
  createElement:(t)=>({width:0,height:0,getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:()=>{},drawImage:()=>{},fillRect:()=>{},beginPath:()=>{},arc:()=>{},fill:()=>{},stroke:()=>{},moveTo:()=>{},lineTo:()=>{},save:()=>{},restore:()=>{},translate:()=>{},rotate:()=>{},fillText:()=>{},rect:()=>{}})}),
  getElementById:()=>null,
  addEventListener:()=>{},
  querySelectorAll:()=>[],
  exitPointerLock:()=>{}
};
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
global.addEventListener=()=>{};
global.setTimeout=setTimeout;

const files=['core','rpg','world','settlements','sky','characters','units','combat','ai','player','parties','battle'];
files.forEach(f=>{ require('./js/'+f+'.js'); });
const G=global.G;

/* stub ui */
G.ui={notify:()=>{},orderFx:()=>{},setHint:()=>{},battleBanner:()=>{},battleEnd:()=>{},flashDamage:()=>{},hitMarker:()=>{},anyModal:()=>false,openDialog:()=>{},confirmSiege:()=>{},showDeath:()=>{},hideDeath:()=>{},showLoot:()=>{},openPause:()=>{}};
G.cfg.shadows=false;
G.tmp.init();

const scene={add:()=>{},traverse:()=>{},children:[]};
G.world.scene=scene;
console.log('prepare...');
G.world.prepare(scene);
console.log('grid...');
G.world.buildGridRows(0,G.world.res);
console.log('getH(0,0)=',G.world.getH(0,0).toFixed(2));
console.log('chunks...');
G.world.initChunks();
console.log('vegetation...');
G.world.buildVegetation();
G.world.buildWater();
G.world.buildGrass();
console.log('settlements...');
G.settlements.buildAll();
G.settlements.initLights(scene);
console.log('chars/fx/arrows...');
G.chars.init(scene);
G.fx.init(scene);
G.combat.initArrows(scene);
console.log('sky...');
G.sky.init(scene);
console.log('npcs+parties...');
G.world.settlements.forEach(s=>{
  s.npcs.forEach(n=>{
    const key=n.role==='guard'?'infantry':(n.role==='lord'?'guard':'civilian');
    const u=G.units.spawn(key,'civ',n.x,n.z,{state:n.role==='guard'?'guard':'civilian',npcRole:n.role,name:n.name,home:{x:n.x,z:n.z}});
    if(u&&n.role==='guard') u.faction=s.faction;
  });
});
G.parties.initialSpawn();
const town=G.world.settlements.find(s=>s.type==='town');
G.player.init(town.gatePos.x+10,town.gatePos.z+10);
G.rpg.addTroop('recruit');G.rpg.addTroop('militia');G.rpg.addTroop('archer');G.rpg.addTroop('cavalry');G.rpg.addTroop('spearman');
console.log('sim world 20s...');
const cam={position:new THREE.Vector3(0,50,0),quaternion:new THREE.Quaternion(),fov:60,updateProjectionMatrix:()=>{},lookAt:()=>{}};
G.started=true;
G.input.locked=true;
for(let i=0;i<1200;i++){
  const dt=1/60;
  G.sky.update(dt,cam.position);
  G.parties.update(dt);
  G.units.update(dt,cam.position);
  G.combat.update(dt);
  G.battle.update(dt);
  G.player.update(dt,cam);
  G.world.updateLOD(dt,0,0);
  G.world.updateGrass(G.player.unit.pos.x,G.player.unit.pos.z);
  G.input.endFrame();
}
console.log('units alive:',G.units.all.length,'parties:',G.parties.list.length);
console.log('force battle...');
const bandit=G.parties.spawnBandits();
bandit.x=G.player.unit.pos.x+40; bandit.z=G.player.unit.pos.z+40;
G.parties.hookRoster(bandit);
G.battle.engagePlayer(bandit);
console.log('battle active:',G.battle.active,'enemy units:',G.units.all.filter(u=>u.faction==='bandit').length);
/* simulate combat: player attacks */
for(let i=0;i<3600;i++){
  const dt=1/60;
  G.input.keys['KeyW']=true;
  if(i%120===0){ G.input.mouse.lp=true; G.input.mouse.l=true; }
  if(i%120===30){ G.input.mouse.lr=true; G.input.mouse.l=false; }
  G.sky.update(dt,cam.position);
  G.parties.update(dt);
  G.units.update(dt,cam.position);
  G.combat.update(dt);
  G.battle.update(dt);
  G.player.update(dt,cam);
  G.input.endFrame();
}
console.log('after fight: battle active:',G.battle.active,'bandits:',G.units.all.filter(u=>u.faction==='bandit'&&!u.dead).length,'player hp:',Math.round(G.player.unit.hp),'kills:',G.player.kills,'gold:',G.player.gold);
/* siege test */
G.input.keys={};
const castle=G.world.settlements.find(s=>s.type==='castle');
G.rpg.rep[castle.faction]=-50;
G.player.unit.dead=false; G.player.unit.hp=G.player.unit.maxHp; G.player.respawnT=0;
G.player.unit.pos.set(castle.gatePos.x+15,0,castle.gatePos.z+15);
G.player.stats.skills.leadership=8;
for(let i=0;i<24;i++) G.rpg.addTroop('guard');
for(let i=0;i<10;i++) G.rpg.addTroop('sharpshooter');
G.parties.update(2);
G.battle.startSiege(castle);
let capT=-1;
G.player.unit.maxHp=1e6;
for(let i=0;i<7200;i++){
  const dt=1/60;
  G.player.unit.hp=G.player.unit.maxHp;
  if(G.player.unit.dead){ G.player.unit.dead=false; G.player.respawnT=0; G.ui.hideDeath&&G.ui.hideDeath(); }
  if(i===120){ ['inf','arc','cav'].forEach(k=>{ if(G.player.squads[k]) G.ai.setOrder(G.player.squads[k],'charge'); }); }
  if(i%600===0) console.log('  t='+(i/60)+'s gateHp='+(castle.gate?Math.round(castle.gate.hp):'-')+' open='+(castle.gate?castle.gate.open:'-')+' defenders='+(castle.siegeUnits?castle.siegeUnits.filter(u=>!u.dead).length:'-')+' myArmy='+G.rpg.playerParty.filter(r=>r.unit&&!r.unit.dead).length);
  G.sky.update(dt,cam.position);
  G.parties.update(dt);
  G.units.update(dt,cam.position);
  G.combat.update(dt);
  G.battle.update(dt);
  G.player.update(dt,cam);
  G.input.endFrame();
  if(capT<0&&castle.faction==='player') capT=i/60;
}
console.log('siege: castle faction:',castle.faction,'captured at t=',capT,'gate open:',castle.gate?castle.gate.open:'-','battleActive:',G.battle.active,'siegeS:',!!G.battle.siegeS);
console.log('player army alive:',G.rpg.playerParty.filter(r=>r.unit&&!r.unit.dead).length,'gold:',Math.round(G.player.gold));
console.log('ALL TESTS PASSED (no exceptions)');
