(function(){
const G = window.G;
const C = G.combat = {};
const U = ()=>G.units;

/* ---------- particles ---------- */
const FXN=700;
var fxGeo, fxPts, fxPos, fxCol, fxVel, fxLife, fxIdx=0;
G.fx = {
  init:function(scene){
    fxPos=new Float32Array(FXN*3); fxCol=new Float32Array(FXN*3);
    fxVel=new Float32Array(FXN*3); fxLife=new Float32Array(FXN);
    for(var i=0;i<FXN;i++) fxPos[i*3+1]=-1000;
    fxGeo=new THREE.BufferGeometry();
    fxGeo.setAttribute('position',new THREE.BufferAttribute(fxPos,3));
    fxGeo.setAttribute('color',new THREE.BufferAttribute(fxCol,3));
    fxPts=new THREE.Points(fxGeo,new THREE.PointsMaterial({size:0.16,vertexColors:true,transparent:true,opacity:0.95,depthWrite:false}));
    fxPts.frustumCulled=false; scene.add(fxPts);
  },
  spawn:function(x,y,z,hex,n,spread,up){
    var c=new THREE.Color(hex);
    for(var i=0;i<n;i++){
      var k=fxIdx; fxIdx=(fxIdx+1)%FXN;
      fxPos[k*3]=x; fxPos[k*3+1]=y; fxPos[k*3+2]=z;
      fxVel[k*3]=(Math.random()*2-1)*spread;
      fxVel[k*3+1]=Math.random()*up+0.5;
      fxVel[k*3+2]=(Math.random()*2-1)*spread;
      fxCol[k*3]=c.r*(0.7+Math.random()*0.3); fxCol[k*3+1]=c.g*(0.7+Math.random()*0.3); fxCol[k*3+2]=c.b*(0.7+Math.random()*0.3);
      fxLife[k]=0.5+Math.random()*0.4;
    }
  },
  blood:function(x,y,z){ this.spawn(x,y,z,0x8a1515,6,2.2,1.8); },
  sparks:function(x,y,z,hex,n){ this.spawn(x,y,z,hex||0xffd080,n||5,3,2); },
  update:function(dt){
    for(var i=0;i<FXN;i++){
      if(fxLife[i]<=0) continue;
      fxLife[i]-=dt;
      if(fxLife[i]<=0){ fxPos[i*3+1]=-1000; continue; }
      fxVel[i*3+1]-=9*dt;
      fxPos[i*3]+=fxVel[i*3]*dt; fxPos[i*3+1]+=fxVel[i*3+1]*dt; fxPos[i*3+2]+=fxVel[i*3+2]*dt;
    }
    fxGeo.attributes.position.needsUpdate=true;
    fxGeo.attributes.color.needsUpdate=true;
  }
};

/* ---------- arrows ---------- */
const ARN=260;
var arrows=[], arrowMesh, _am=new THREE.Matrix4(), _av=new THREE.Vector3(), _au=new THREE.Vector3(0,1,0), _az=new THREE.Vector3();
C.initArrows=function(scene){
  var g=G.geo.merge([
    G.geo.box(0.022,0.022,0.72,0,0,-0.30,0,0,0,0x8a6a40),
    G.geo.cone(0.045,0.15,4,0,0,0,0,0,0,0xb8bcc4).applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI/2)).translate(0,0,-0.70),
    G.geo.box(0.09,0.012,0.12,0,0,0.02,0,0,0,0xd8d2c0)
  ]);
  var mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.8});
  arrowMesh=new THREE.InstancedMesh(g,mat,ARN);
  arrowMesh.frustumCulled=false; arrowMesh.castShadow=false;
  var zero=new THREE.Matrix4(); zero.makeScale(0,0,0);
  for(var i=0;i<ARN;i++){ arrowMesh.setMatrixAt(i,zero); arrows.push({active:false,stick:0}); }
  scene.add(arrowMesh);
};
C.fireArrow=function(owner,tx,ty,tz,acc,dmg){
  var idx=-1;
  for(var i=0;i<ARN;i++){ if(!arrows[i].active&&arrows[i].stick<=0){ idx=i; break; } }
  if(idx<0) return;
  var a=arrows[idx];
  var ox=owner.pos.x, oy=owner.pos.y+(owner.mounted?2.2:1.45), oz=owner.pos.z;
  var dx=tx-ox, dy=ty-oy, dz=tz-oz;
  var d=Math.sqrt(dx*dx+dz*dz);
  var v=44;
  var spread=(1-G.clamp(acc,0,1))*0.09+G.sky.rainAmt*0.03+0.008;
  var t=d/v;
  var vy=dy/t+0.5*12*t;
  a.x=ox; a.y=oy; a.z=oz;
  a.vx=dx/t+(Math.random()*2-1)*spread*v;
  a.vy=vy+(Math.random()*2-1)*spread*v*0.6;
  a.vz=dz/t+(Math.random()*2-1)*spread*v;
  a.dmg=dmg; a.owner=owner; a.active=true; a.t=0; a.idx=idx;
  G.audio.play3d('bow',owner.pos,0.9);
};
function writeArrow(a){
  _av.set(a.vx,a.vy,a.vz).normalize();
  _az.set(a.x,a.y,a.z);
  _am.lookAt(_az,_av.add(_az),_au);
  _am.setPosition(a.x,a.y,a.z);
  arrowMesh.setMatrixAt(a.idx,_am);
}
function updateArrows(dt){
  var dirty=false;
  for(var i=0;i<ARN;i++){
    var a=arrows[i];
    if(a.stick>0){
      a.stick-=dt;
      if(a.stick<=0){ _am.makeScale(0,0,0); arrowMesh.setMatrixAt(i,_am); dirty=true; }
      continue;
    }
    if(!a.active) continue;
    a.t+=dt;
    if(a.t>6){ a.active=false; _am.makeScale(0,0,0); arrowMesh.setMatrixAt(i,_am); dirty=true; continue; }
    a.vy-=12*dt;
    var steps=2;
    for(var s=0;s<steps&&a.active;s++){
      a.x+=a.vx*dt/steps; a.y+=a.vy*dt/steps; a.z+=a.vz*dt/steps;
      var gh=G.world.getH(a.x,a.z);
      if(a.y<=gh+0.05){ a.y=gh+0.08; a.active=false; a.stick=9; break; }
      var ns=G.units.near(a.x,a.z,1.4);
      for(var k=0;k<ns.length;k++){
        var u=ns[k];
        if(u===a.owner||u.dead) continue;
        if(a.owner&&u.faction===a.owner.faction) continue;
        if(a.owner&&!G.rpg.hostile(a.owner.faction,u.faction)&&!u.isPlayer) continue;
        var dy=a.y-u.pos.y;
        var top=u.mounted?2.75:1.95;
        var rr=u.radius+0.35+(u.mounted?0.45:0);
        if(dy>0&&dy<top&&G.dist2(a.x,a.z,u.pos.x,u.pos.z)<rr*rr){
          a.active=false; a.stick=0.01;
          if(u.mounted&&dy<1.6){
            u.horseHp-=a.dmg*1.1;
            G.fx.blood(a.x,a.y,a.z);
            if(u.horseHp<=0) G.units.killHorse(u,a.owner);
          } else {
            G.units.damage(u,a.dmg,a.owner,{ranged:true});
          }
          G.audio.play3d('arrowhit',u.pos,0.8);
          break;
        }
      }
    }
    writeArrow(a); dirty=true;
  }
  if(dirty) arrowMesh.instanceMatrix.needsUpdate=true;
}

/* ---------- melee ---------- */
C.reach=function(u){
  var r=u.weapon==='spear'?3.0:2.0;
  if(u.mounted) r+=0.7;
  return r;
};
C.meleeStrike=function(u){
  var reach=C.reach(u)+0.4;
  var fx=Math.sin(u.yaw), fz=Math.cos(u.yaw);
  var cx=u.pos.x+fx*reach*0.5, cz=u.pos.z+fz*reach*0.5;
  var ns=G.units.near(cx,cz,reach+1.5);
  var best=null,bd=1e9;
  for(var i=0;i<ns.length;i++){
    var o=ns[i];
    if(o===u||o.dead) continue;
    if(o.faction===u.faction) continue;
    if(!u.isPlayer&&!G.rpg.hostile(u.faction,o.faction)) continue;
    if(u.isPlayer&&o.faction==='civ') continue;
    var d=Math.sqrt(G.dist2(u.pos.x,u.pos.z,o.pos.x,o.pos.z));
    if(d>reach+(o.mounted?0.8:0)) continue;
    if(Math.abs(o.pos.y-u.pos.y)>2.4) continue;
    var ang=Math.atan2(o.pos.x-u.pos.x,o.pos.z-u.pos.z);
    if(Math.abs(G.angDiff(u.yaw,ang))>1.25) continue;
    if(d<bd){bd=d;best=o;}
  }
  G.audio.play3d('swing',u.pos,0.7);
  if(best){
    var rel=u.speed2d+(best.speed2d*0.3);
    var mult=1+G.clamp(rel*0.045,0,0.6);
    if(u.mounted) mult+=0.15;
    if(u.act&&u.act.n==='thrust'&&u.weapon==='spear') mult+=0.15;
    if(best.mounted&&Math.random()<0.3){
      best.horseHp-=u.dmg*mult;
      G.fx.blood(best.pos.x,best.pos.y+1.4,best.pos.z);
      G.audio.play3d('hit',best.pos,0.9);
      if(best.horseHp<=0) G.units.killHorse(best,u);
    } else {
      G.units.damage(best,u.dmg*mult,u);
    }
    if(u.isPlayer) G.ui.hitMarker();
    return true;
  }
  if(u.gateTarget){
    var gset=u.gateTarget;
    if(gset.gate&&!gset.gate.open){
      var gd=G.dist2(u.pos.x,u.pos.z,gset.gate.x,gset.gate.z);
      if(gd<(reach+3.5)*(reach+3.5)){ G.settlements.damageGate(gset,u.dmg*0.8+8); if(u.isPlayer)G.ui.hitMarker(); }
    }
  }
  return false;
};

/* ---------- cavalry physics ---------- */
function cavalryPass(dt){
  var all=G.units.all;
  for(var i=0;i<all.length;i++){
    var u=all[i];
    if(u.dead||!u.mounted) continue;
    if(u.horseRear>0){ u.horseRear-=dt; continue; }
    var sp=u.speed2d;
    if(sp<5.5) { u.trampleCd=0; continue; }
    if(u.trampleCd>0){ u.trampleCd-=dt; }
    var fx=Math.sin(u.horseYaw), fz=Math.cos(u.horseYaw);
    var px=u.pos.x+fx*1.6, pz=u.pos.z+fz*1.6;
    var ns=G.units.near(px,pz,1.6);
    for(var k=0;k<ns.length;k++){
      var o=ns[k];
      if(o===u||o.dead||o.mounted) continue;
      if(o.faction===u.faction) continue;
      if(!G.rpg.hostile(u.faction,o.faction)&&!o.isPlayer&&!u.isPlayer) continue;
      if(o.braced&&o.weapon==='spear'){
        var ang=Math.atan2(u.pos.x-o.pos.x,u.pos.z-o.pos.z);
        if(Math.abs(G.angDiff(o.yaw,ang))<0.9){
          var spearDmg=30+sp*7;
          u.horseHp-=spearDmg;
          u.horseRear=1.0;
          u.horseSpeed=0; u.vel.set(0,0,0);
          G.fx.blood(u.pos.x+fx,u.pos.y+1.5,u.pos.z+fz);
          G.audio.play3d('horse',u.pos,1);
          G.units.damage(u,10,o,{noBlock:true});
          if(u.horseHp<=0) G.units.killHorse(u,o);
          o.attackCd=0.8;
          break;
        }
      }
      if(u.trampleCd>0) continue;
      var dmg2=sp*3.2;
      G.units.damage(o,dmg2,u,{knock:1.4,noBlock:sp>9});
      o.stun=Math.max(o.stun,1.2);
      o.morale-=10;
      u.trampleCd=0.7;
      u.horseSpeed*=0.72;
      G.audio.play3d('hit',o.pos,1);
      break;
    }
    if(u.couched&&sp>7&&(!u.couchCd||u.couchCd<=0)){
      var cx=u.pos.x+fx*2.8, cz=u.pos.z+fz*2.8;
      var ns2=G.units.near(cx,cz,1.7);
      for(var k2=0;k2<ns2.length;k2++){
        var o2=ns2[k2];
        if(o2===u||o2.dead||o2.faction===u.faction) continue;
        if(!G.rpg.hostile(u.faction,o2.faction)&&!o2.isPlayer&&!u.isPlayer) continue;
        var lance=55+sp*4.5;
        if(o2.mounted&&Math.random()<0.35){
          o2.horseHp-=lance; if(o2.horseHp<=0) G.units.killHorse(o2,u);
        } else {
          G.units.damage(o2,lance,u,{knock:1.5,pierceShield:Math.random()<0.4});
        }
        u.couchCd=1.6;
        if(u.isPlayer) G.ui.hitMarker();
        G.audio.play3d('hit',o2.pos,1);
        break;
      }
    }
    if(u.couchCd>0) u.couchCd-=dt;
  }
}

C.update=function(dt){
  updateArrows(dt);
  cavalryPass(dt);
  G.fx.update(dt);
};
})();
