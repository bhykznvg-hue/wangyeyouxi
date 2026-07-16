(function(){
const G = window.G;
const SET = G.settlements = {};
const geo = G.geo;

function house(list,x,y,z,rot,w,d,h,wallC,roofC){
  var cos=Math.cos(rot),sin=Math.sin(rot);
  function put(g){ g.applyMatrix4(new THREE.Matrix4().makeRotationY(rot)); g.translate(x,y,z); list.push(g); }
  put(geo.box(w,h,d,0,h/2,0,0,0,0,wallC));
  var ang=0.62, rw=w*0.62;
  put(geo.box(rw,0.16,d+0.5,-w/4-0.05,h+rw*0.28,0,0,0,ang,roofC));
  put(geo.box(rw,0.16,d+0.5, w/4+0.05,h+rw*0.28,0,0,0,-ang,roofC));
  put(geo.box(0.9,1.5,0.1,0,0.75,d/2+0.03,0,0,0,0x3a2a18));
  put(geo.box(0.5,0.5,0.08,w*0.3,h*0.6,d/2+0.03,0,0,0,0x241a10));
  put(geo.box(0.5,0.5,0.08,-w*0.3,h*0.6,d/2+0.03,0,0,0,0x241a10));
  return {x:x,z:z,r:Math.max(w,d)*0.62};
}
function tower(list,x,y,z,r,h,col){
  list.push(geo.cyl(r,r*1.12,h,8,x,y+h/2,z,col));
  list.push(geo.cyl(r*1.18,r*1.18,1.1,8,x,y+h+0.4,z,col));
  list.push(geo.cone(r*1.15,r*1.6,8,x,y+h+1.6,z,0x5d4a3a));
  return {x:x,z:z,r:r*1.25};
}
function wallSeg(list,x0,z0,x1,z1,y,h,col){
  var dx=x1-x0,dz=z1-z0,len=Math.sqrt(dx*dx+dz*dz),ang=Math.atan2(dx,dz);
  var cx=(x0+x1)/2,cz=(z0+z1)/2;
  var g=geo.box(1.4,h,len+0.5,0,h/2,0,0,0,0,col);
  g.applyMatrix4(new THREE.Matrix4().makeRotationY(ang)); g.translate(cx,y,cz); list.push(g);
  var p=geo.box(0.4,0.9,len+0.5,-0.6,h+0.45,0,0,0,0,col);
  p.applyMatrix4(new THREE.Matrix4().makeRotationY(ang)); p.translate(cx,y,cz); list.push(p);
  var out=[];
  var n=Math.max(1,Math.round(len/2.6));
  for(var i=0;i<=n;i++){ var t=i/n; out.push({x:x0+dx*t,z:z0+dz*t,r:1.6}); }
  return out;
}
function banner(list,x,y,z,col){
  list.push(geo.cyl(0.07,0.09,5.5,5,x,y+2.75,z,0x4a3722));
  list.push(geo.box(1.5,1.0,0.06,x+0.8,y+4.8,z,0,0,0,col));
}
function torch(s,list,x,y,z){
  list.push(geo.cyl(0.05,0.07,1.6,4,x,y+0.8,z,0x4a3722));
  list.push(geo.sph(0.12,4,3,x,y+1.65,z,0xffc060));
  s.torches.push({x:x,y:y+1.7,z:z});
}
function well(list,x,y,z){
  list.push(geo.cyl(1.0,1.1,0.9,8,x,y+0.45,z,0x7d7a74));
  list.push(geo.box(0.12,2,0.12,x-0.8,y+1,z,0,0,0,0x4a3722));
  list.push(geo.box(0.12,2,0.12,x+0.8,y+1,z,0,0,0,0x4a3722));
  list.push(geo.box(2,0.12,1.4,x,y+2.1,z,0,0,0,0x5d4a3a));
  return {x:x,z:z,r:1.3};
}
function stall(list,x,y,z,rot,col){
  var m=new THREE.Matrix4().makeRotationY(rot);
  function put(g){ g.applyMatrix4(m); g.translate(x,y,z); list.push(g); }
  put(geo.box(2.4,0.9,1.4,0,0.45,0,0,0,0,0x6b4a2b));
  put(geo.box(0.1,2.2,0.1,-1.1,1.1,-0.6,0,0,0,0x4a3722));
  put(geo.box(0.1,2.2,0.1,1.1,1.1,-0.6,0,0,0,0x4a3722));
  put(geo.box(0.1,2.2,0.1,-1.1,1.1,0.6,0,0,0,0x4a3722));
  put(geo.box(0.1,2.2,0.1,1.1,1.1,0.6,0,0,0,0x4a3722));
  put(geo.box(2.8,0.08,1.9,0,2.3,0,0,0,0.12,col));
  return {x:x,z:z,r:1.6};
}
function hay(list,x,y,z){
  list.push(geo.cyl(1.1,1.2,1.4,7,x,y+0.7,z,0xb99a4a));
  return {x:x,z:z,r:1.2};
}

function gateMesh(s,gx,gz,gy,ang,width){
  var doors=new THREE.Group();
  var mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.85});
  var g=G.geo.merge([
    geo.box(width,5.2,0.5,0,2.6,0,0,0,0,0x5d4326),
    geo.box(width,0.3,0.55,0,1.4,0,0,0,0,0x3b3b3b),
    geo.box(width,0.3,0.55,0,3.6,0,0,0,0,0x3b3b3b)
  ]);
  var mesh=new THREE.Mesh(g,mat);
  mesh.castShadow=G.cfg.shadows;
  doors.add(mesh);
  doors.position.set(gx,gy,gz); doors.rotation.y=ang;
  s.gate={mesh:doors,x:gx,z:gz,hp:1200,maxHp:1200,open:true,width:width};
  return doors;
}

function buildVillage(s,list){
  var rng=G.mulberry(G.seed+s.x|0);
  var y=s.h;
  s.obstacles.push(well(list,s.x,y,s.z));
  var n=6+Math.floor(rng()*3);
  for(var i=0;i<n;i++){
    var ang=i/n*Math.PI*2+rng()*0.4, r=16+rng()*20;
    var hx=s.x+Math.cos(ang)*r, hz=s.z+Math.sin(ang)*r;
    var hy=G.world.getH(hx,hz);
    var w=4+rng()*2.5, d=5+rng()*2.5, hh=2.6+rng()*0.8;
    var wallC=[0xd8cbb0,0xcbb894,0xb59d78][Math.floor(rng()*3)], roofC=[0x8a5230,0x6d5b3a,0x99772e][Math.floor(rng()*3)];
    s.obstacles.push(house(list,hx,hy,hz,-ang+Math.PI/2,w,d,hh,wallC,roofC));
    if(rng()<0.4) s.obstacles.push(hay(list,hx+Math.cos(ang+1.3)*5,G.world.getH(hx+Math.cos(ang+1.3)*5,hz+Math.sin(ang+1.3)*5),hz+Math.sin(ang+1.3)*5));
    if(rng()<0.5) torch(s,list,hx+Math.cos(ang-1.3)*3.5,hy,hz+Math.sin(ang-1.3)*3.5);
  }
  banner(list,s.x+3,y,s.z+3,G.rpg.factionColor(s.faction));
  s.npcs.push({role:'elder',x:s.x+2,z:s.z-3,name:s.name+'长老'});
  s.npcs.push({role:'merchant',x:s.x-4,z:s.z+2,name:'乡村商贩'});
  for(var v=0;v<4;v++) s.npcs.push({role:'villager',x:s.x+(rng()*2-1)*25,z:s.z+(rng()*2-1)*25,name:'村民'});
  s.courtyard={x:s.x,z:s.z};
}

function buildWalled(s,list){
  var rng=G.mulberry(G.seed+(s.z|0));
  var y=s.h, R=s.type==='town'?s.r*0.92:s.r*0.9;
  var gateAng=Math.atan2(-s.z,-s.x);
  var segs=s.type==='town'?26:14, wallH=s.type==='town'?6:7;
  var wallC=0x8f8b83;
  var gateHalf=Math.PI*2/segs*0.6;
  for(var i=0;i<segs;i++){
    var a0=i/segs*Math.PI*2, a1=(i+1)/segs*Math.PI*2;
    var mid=(a0+a1)/2;
    var dGate=Math.abs(G.angDiff(mid,gateAng));
    if(dGate<gateHalf) continue;
    var x0=s.x+Math.cos(a0)*R, z0=s.z+Math.sin(a0)*R;
    var x1=s.x+Math.cos(a1)*R, z1=s.z+Math.sin(a1)*R;
    var obs=wallSeg(list,x0,z0,x1,z1,y,wallH,wallC);
    for(var oi=0;oi<obs.length;oi++) s.obstacles.push(obs[oi]);
    if(i%Math.ceil(segs/6)===0) s.obstacles.push(tower(list,x0,y,z0,2.6,wallH+3.5,wallC));
    if(i%2===0) s.wallPosts.push({x:s.x+Math.cos(mid)*(R-1.8),z:s.z+Math.sin(mid)*(R-1.8),y:y+wallH+0.9});
  }
  var gx=s.x+Math.cos(gateAng)*R, gz=s.z+Math.sin(gateAng)*R;
  var perp=gateAng+Math.PI/2;
  s.obstacles.push(tower(list,gx+Math.cos(perp)*6,y,gz+Math.sin(perp)*6,2.4,wallH+3,wallC));
  s.obstacles.push(tower(list,gx-Math.cos(perp)*6,y,gz-Math.sin(perp)*6,2.4,wallH+3,wallC));
  torch(s,list,gx+Math.cos(perp)*3.4,y,gz+Math.sin(perp)*3.4);
  torch(s,list,gx-Math.cos(perp)*3.4,y,gz-Math.sin(perp)*3.4);
  s.gateObs=[{x:gx,z:gz,r:4.2,gate:true,open:true}];
  s.obstacles.push(s.gateObs[0]);
  G.world.scene.add(gateMesh(s,gx,gz,y,perp,9));
  s.gate.mesh.visible=false;
  s.wallPosts.push({x:gx+Math.cos(perp)*6,z:gz+Math.sin(perp)*6,y:y+wallH+2.4});
  s.wallPosts.push({x:gx-Math.cos(perp)*6,z:gz-Math.sin(perp)*6,y:y+wallH+2.4});
  var kx=s.x-Math.cos(gateAng)*R*0.45, kz=s.z-Math.sin(gateAng)*R*0.45;
  var ky=G.world.getH(kx,kz);
  if(s.type==='castle'){
    list.push(geo.box(12,11,12,0,5.5,0,0,0,0,0x84807a).translate(kx,ky,kz));
    list.push(geo.box(8,4,8,0,13,0,0,0,0,0x84807a).translate(kx,ky,kz));
    s.obstacles.push({x:kx,z:kz,r:8.5});
    banner(list,kx+7,ky,kz,G.rpg.factionColor(s.faction));
    list.push(geo.box(5,3.4,7,0,1.7,0,0,0,0,0x9a8b70).translate(kx+13,ky,kz+6));
    s.obstacles.push({x:kx+13,z:kz+6,r:4.5});
    s.npcs.push({role:'lord',x:kx+3,z:kz+8,name:s.name+'城主'});
    for(var gd=0;gd<3;gd++) s.npcs.push({role:'guard',x:gx-Math.cos(gateAng)*(6+gd*3),z:gz-Math.sin(gateAng)*(6+gd*3),name:'卫兵'});
  } else {
    list.push(geo.box(10,9,10,0,4.5,0,0,0,0,0x8a867e).translate(kx,ky,kz));
    list.push(geo.cone(7,4,4,0,11,0,0x5d4a3a).translate(kx,ky,kz));
    s.obstacles.push({x:kx,z:kz,r:7.5});
    banner(list,kx+6,ky,kz,G.rpg.factionColor(s.faction));
    var mx=s.x+Math.cos(gateAng)*R*0.45, mz=s.z+Math.sin(gateAng)*R*0.45;
    for(var st=0;st<3;st++){
      var sa=perp+st*2.1, sx=mx+Math.cos(sa)*6, sz=mz+Math.sin(sa)*6;
      s.obstacles.push(stall(list,sx,G.world.getH(sx,sz),sz,sa,[0xa03c2c,0x3c6ea0,0xb08a2c][st]));
    }
    torch(s,list,mx,G.world.getH(mx,mz),mz);
    var hn=9+Math.floor(rng()*5);
    for(var hi=0;hi<hn;hi++){
      var ha=rng()*Math.PI*2, hr=R*0.35+rng()*R*0.4;
      var hx=s.x+Math.cos(ha)*hr, hz=s.z+Math.sin(ha)*hr;
      if(G.dist2(hx,hz,kx,kz)<15*15) continue;
      if(G.dist2(hx,hz,mx,mz)<12*12) continue;
      if(G.dist2(hx,hz,gx,gz)<14*14) continue;
      var hy2=G.world.getH(hx,hz);
      var w=4.5+rng()*3, d=5+rng()*3, hh=2.8+rng()*1.6;
      var wc=[0xd8cbb0,0xcbb894,0xb59d78,0xc4a884][Math.floor(rng()*4)], rc=[0x8a5230,0x6d5b3a,0x7a4a3a][Math.floor(rng()*3)];
      s.obstacles.push(house(list,hx,hy2,hz,rng()*6.28,w,d,hh,wc,rc));
      if(rng()<0.35) torch(s,list,hx+3,hy2,hz+3);
    }
    s.npcs.push({role:'merchant',x:mx+2,z:mz-2,name:'城镇商人'});
    s.npcs.push({role:'lord',x:kx+2,z:kz+7,name:s.name+'领主'});
    s.npcs.push({role:'elder',x:mx-4,z:mz+3,name:'募兵官'});
    for(var gd2=0;gd2<2;gd2++) s.npcs.push({role:'guard',x:gx-Math.cos(gateAng)*(5+gd2*3),z:gz-Math.sin(gateAng)*(5+gd2*3),name:'卫兵'});
    for(var v=0;v<5;v++) s.npcs.push({role:'villager',x:s.x+(rng()*2-1)*R*0.5,z:s.z+(rng()*2-1)*R*0.5,name:'市民'});
  }
  s.courtyard={x:(kx+gx)/2,z:(kz+gz)/2};
  s.gatePos={x:gx,z:gz,ang:gateAng};
}

SET.buildAll=function(){
  var mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.9,metalness:0.02});
  G.world.settlements.forEach(function(s){
    var list=[];
    if(s.type==='village') buildVillage(s,list);
    else buildWalled(s,list);
    var mesh=new THREE.Mesh(G.geo.merge(list),mat);
    mesh.castShadow=G.cfg.shadows; mesh.receiveShadow=true;
    mesh.matrixAutoUpdate=false;
    G.world.scene.add(mesh);
    s.mesh=mesh;
  });
};

SET.setGateClosed=function(s,closed){
  if(!s.gate) return;
  s.gate.mesh.visible=closed;
  s.gate.open=!closed;
  s.gateObs.forEach(function(o){ o.open=!closed; });
  if(closed){ s.gate.hp=s.gate.maxHp; }
};
SET.damageGate=function(s,dmg){
  if(!s.gate||s.gate.open) return;
  s.gate.hp-=dmg;
  G.audio.play3d('shield',{x:s.gate.x,z:s.gate.z},1);
  if(s.gate.hp<=0){
    SET.setGateClosed(s,false);
    G.audio.play3d('gate',{x:s.gate.x,z:s.gate.z},1);
    G.ui.notify('城门被攻破了！','#ff9c5a');
  }
};
SET.nearest=function(x,z,type){
  var best=null,bd=1e18;
  G.world.settlements.forEach(function(s){
    if(type&&s.type!==type) return;
    var d=G.dist2(x,z,s.x,s.z);
    if(d<bd){bd=d;best=s;}
  });
  return best;
};

/* torch lights pool */
var lights=[];
SET.initLights=function(scene){
  for(var i=0;i<6;i++){
    var l=new THREE.PointLight(0xff9c50,0,26,2);
    l.castShadow=false; scene.add(l); lights.push(l);
  }
};
SET.updateLights=function(px,pz,night){
  var cands=[];
  if(night){
    G.world.settlements.forEach(function(s){
      if(G.dist2(px,pz,s.x,s.z)>260*260) return;
      s.torches.forEach(function(t){ cands.push({t:t,d:G.dist2(px,pz,t.x,t.z)}); });
    });
    cands.sort(function(a,b){return a.d-b.d;});
  }
  for(var i=0;i<lights.length;i++){
    if(i<cands.length&&cands[i].d<180*180){
      lights[i].position.set(cands[i].t.x,cands[i].t.y+0.3,cands[i].t.z);
      lights[i].intensity=1.6+Math.sin(performance.now()*0.006+i*2.1)*0.35;
    } else lights[i].intensity=0;
  }
};
})();
