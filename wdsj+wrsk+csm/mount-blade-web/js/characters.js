(function(){
const G = window.G;
const CH = G.chars = {};
const geo = G.geo;

const HIP=0.97, HORSE_Y=1.16, SADDLE=0.55;
CH.HIP=HIP; CH.HORSE_Y=HORSE_Y; CH.SADDLE=SADDLE;

const JOINTS=[
  ['pelvis',null,0,0,0],
  ['chest','pelvis',0,0.18,0],
  ['head','chest',0,0.46,0],
  ['helm','head',0,0,0],
  ['uaL','chest',0.26,0.38,0],
  ['uaR','chest',-0.26,0.38,0],
  ['faL','uaL',0,-0.32,0],
  ['faR','uaR',0,-0.32,0],
  ['thL','pelvis',0.13,-0.03,0],
  ['thR','pelvis',-0.13,-0.03,0],
  ['shL','thL',0,-0.42,0],
  ['shR','thR',0,-0.42,0],
  ['item','faR',0,-0.30,0.03],
  ['off','faL',0,-0.28,0.05],
  ['quiver','chest',-0.16,0.22,-0.19]
];
const HJOINTS=[
  ['hbody',null,0,0,0],
  ['neck','hbody',0,0.30,0.62],
  ['hhead','neck',0,0.46,0.14],
  ['legFL','hbody',0.22,-0.22,0.55],
  ['legFR','hbody',-0.22,-0.22,0.55],
  ['legBL','hbody',0.22,-0.22,-0.6],
  ['legBR','hbody',-0.22,-0.22,-0.6],
  ['tail','hbody',0,0.24,-0.85]
];

function humanGeos(){
  var g={};
  g.pelvis=geo.box(0.36,0.22,0.24,0,0.03,0,0,0,0,0xffffff);
  g.chest=geo.box(0.44,0.50,0.28,0,0.24,0,0,0,0,0xffffff);
  g.head=G.geo.merge([
    geo.box(0.26,0.28,0.26,0,0.13,0,0,0,0,0xd9ac88),
    geo.box(0.28,0.10,0.28,0,0.28,0,0,0,0,0x4a3320),
    geo.box(0.06,0.08,0.05,0,0.10,0.14,0,0,0,0xd1a181)
  ]);
  g.helm=G.geo.merge([
    geo.box(0.30,0.16,0.30,0,0.24,0,0,0,0,0xffffff),
    geo.box(0.32,0.12,0.32,0,0.13,0,0,0,0,0xf0f0f0),
    geo.box(0.05,0.17,0.04,0,0.05,0.15,0,0,0,0xe8e8e8)
  ]);
  g.ua=geo.box(0.14,0.34,0.14,0,-0.16,0,0,0,0,0xffffff);
  g.fa=geo.box(0.12,0.32,0.12,0,-0.16,0,0,0,0,0xffffff);
  g.th=geo.box(0.17,0.44,0.17,0,-0.20,0,0,0,0,0xffffff);
  g.sh=G.geo.merge([
    geo.box(0.14,0.42,0.15,0,-0.20,0,0,0,0,0xffffff),
    geo.box(0.14,0.09,0.27,0,-0.40,0.06,0,0,0,0xf2f2f2)
  ]);
  g.sword=G.geo.merge([
    geo.box(0.055,0.92,0.024,0,0.60,0,0,0,0,0xd4d9e0),
    geo.box(0.24,0.045,0.05,0,0.14,0,0,0,0,0x8a8f98),
    geo.cyl(0.03,0.035,0.22,5,0,0.02,0,0x3a2a18),
    geo.sph(0.045,5,4,0,-0.10,0,0x8a8f98)
  ]);
  g.spear=G.geo.merge([
    geo.cyl(0.028,0.032,2.5,5,0,0.85,0,0x6b4a2b),
    geo.cone(0.055,0.32,5,0,2.22,0,0xd4d9e0)
  ]);
  g.bow=G.geo.merge([
    geo.box(0.045,0.42,0.06,0,0,0.02,0,0,0,0x5d4326),
    geo.box(0.04,0.50,0.05,0,0.42,0.10,-0.45,0,0,0x5d4326),
    geo.box(0.04,0.50,0.05,0,-0.42,0.10,0.45,0,0,0x5d4326)
  ]);
  g.shield=G.geo.merge([
    geo.box(0.55,0.72,0.06,0,-0.08,0.16,0,0,0,0xffffff),
    geo.box(0.45,0.60,0.04,0,-0.08,0.11,0,0,0,0x6b4a2b),
    geo.sph(0.09,5,4,0,-0.08,0.20,0xb8bcc4)
  ]);
  g.quiver=G.geo.merge([
    geo.box(0.13,0.42,0.13,0,0.02,0,0,0,0.25,0x6b4a2b),
    geo.box(0.10,0.12,0.10,0.06,0.26,0,0,0,0.25,0xd9d2b8)
  ]);
  return g;
}
function horseGeos(){
  var g={};
  g.hbody=G.geo.merge([
    geo.box(0.56,0.70,1.75,0,0.02,0,0,0,0,0xffffff),
    geo.box(0.60,0.10,0.80,0,0.36,-0.08,0,0,0,0x8a2a2a),
    geo.box(0.50,0.16,0.62,0,0.46,-0.08,0,0,0,0x7a4020)
  ]);
  g.neck=geo.box(0.30,0.70,0.36,0,0.28,0.06,-0.35,0,0,0xffffff);
  g.hhead=G.geo.merge([
    geo.box(0.24,0.28,0.52,0,0.02,0.16,0,0,0,0xffffff),
    geo.box(0.06,0.14,0.05,0.08,0.20,-0.05,0,0,0,0xf0f0f0),
    geo.box(0.06,0.14,0.05,-0.08,0.20,-0.05,0,0,0,0xf0f0f0)
  ]);
  g.leg=G.geo.merge([
    geo.box(0.16,0.90,0.18,0,-0.40,0,0,0,0,0xffffff),
    geo.box(0.17,0.12,0.19,0,-0.83,0.01,0,0,0,0x2a2320)
  ]);
  g.tail=geo.box(0.13,0.68,0.15,0,-0.30,-0.04,0.35,0,0,0xe8e8e8);
  return g;
}

var P={}, PH={}, freeH=[], freeHo=[], ZERO=new THREE.Matrix4();
var colorDirty=false;
CH.init=function(scene){
  ZERO.set(0,0,0,0, 0,0,0,-100, 0,0,0,0, 0,0,0,1);
  var mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.82,metalness:0.08});
  var hg=humanGeos(), og=horseGeos();
  var N=G.cfg.poolHumans, NH=G.cfg.poolHorses;
  var map={pelvis:hg.pelvis,chest:hg.chest,head:hg.head,helm:hg.helm,uaL:hg.ua,uaR:hg.ua,faL:hg.fa,faR:hg.fa,
    thL:hg.th,thR:hg.th,shL:hg.sh,shR:hg.sh,sword:hg.sword,spear:hg.spear,bow:hg.bow,shield:hg.shield,quiver:hg.quiver};
  var white=new THREE.Color(1,1,1);
  Object.keys(map).forEach(function(k){
    var im=new THREE.InstancedMesh(map[k],mat,N);
    im.castShadow=G.cfg.shadows; im.frustumCulled=false; im.matrixAutoUpdate=false;
    for(var i=0;i<N;i++){ im.setMatrixAt(i,ZERO); im.setColorAt(i,white); }
    scene.add(im); P[k]=im;
  });
  var hmap={hbody:og.hbody,neck:og.neck,hhead:og.hhead,legFL:og.leg,legFR:og.leg,legBL:og.leg,legBR:og.leg,tail:og.tail};
  Object.keys(hmap).forEach(function(k){
    var im=new THREE.InstancedMesh(hmap[k],mat,NH);
    im.castShadow=G.cfg.shadows; im.frustumCulled=false; im.matrixAutoUpdate=false;
    for(var i=0;i<NH;i++){ im.setMatrixAt(i,ZERO); im.setColorAt(i,white); }
    scene.add(im); PH[k]=im;
  });
  for(var a=N-1;a>=0;a--) freeH.push(a);
  for(var b=NH-1;b>=0;b--) freeHo.push(b);
};
CH.allocHuman=function(){ return freeH.length?freeH.pop():-1; };
CH.freeHuman=function(slot){ if(slot<0)return; CH.hideHuman(slot); freeH.push(slot); };
CH.allocHorse=function(){ return freeHo.length?freeHo.pop():-1; };
CH.freeHorse=function(slot){ if(slot<0)return; CH.hideHorse(slot); freeHo.push(slot); };
CH.hideHuman=function(slot){ for(var k in P) P[k].setMatrixAt(slot,ZERO); };
CH.hideHorse=function(slot){ for(var k in PH) PH[k].setMatrixAt(slot,ZERO); };
CH.refreshSlots=function(u){
  ['sword','spear','bow','shield','quiver','helm'].forEach(function(k){ P[k].setMatrixAt(u.slot,ZERO); });
};
var _col=new THREE.Color();
function setC(pool,slot,hex,v){ _col.setHex(hex); if(v){ _col.r*=v;_col.g*=v;_col.b*=v; } pool.setColorAt(slot,_col); colorDirty=true; }
CH.setHumanColors=function(u,c){
  var s=u.slot;
  setC(P.pelvis,s,c.pants); setC(P.chest,s,c.chest);
  setC(P.head,s,0xffffff,0.85+G.hash2(s,1,7)*0.3);
  setC(P.helm,s,c.helm||0x9aa0a8);
  setC(P.uaL,s,c.chest,0.9); setC(P.uaR,s,c.chest,0.9);
  setC(P.faL,s,c.fore); setC(P.faR,s,c.fore);
  setC(P.thL,s,c.pants); setC(P.thR,s,c.pants);
  setC(P.shL,s,c.boots); setC(P.shR,s,c.boots);
  setC(P.shield,s,c.shield||0x888888);
  setC(P.sword,s,0xffffff); setC(P.spear,s,0xffffff); setC(P.bow,s,0xffffff); setC(P.quiver,s,0xffffff);
};
CH.setHorseColors=function(hslot,coat){
  for(var k in PH) setC(PH[k],hslot,coat);
};

var R={}, MT={}, HR={}, HMT={};
JOINTS.forEach(function(j){ R[j[0]]=[0,0,0]; MT[j[0]]=new THREE.Matrix4(); });
HJOINTS.forEach(function(j){ HR[j[0]]=[0,0,0]; HMT[j[0]]=new THREE.Matrix4(); });
var _e=new THREE.Euler(0,0,0,'XYZ'), _eY=new THREE.Euler(0,0,0,'YXZ'), _m=new THREE.Matrix4();
function st(n,x,y,z){ var a=R[n]; a[0]=x; a[1]=y; a[2]=z; }
function ad(n,x,y,z){ var a=R[n]; a[0]+=x; a[1]+=y; a[2]+=z; }
function resetR(){ for(var k in R){ var a=R[k]; a[0]=0;a[1]=0;a[2]=0; } }
function resetHR(){ for(var k in HR){ var a=HR[k]; a[0]=0;a[1]=0;a[2]=0; } }
function tk(t){ var pts=[]; for(var i=1;i<arguments.length;i+=2) pts.push([arguments[i],arguments[i+1]]); return G.track(t,pts); }

function poseHuman(u){
  resetR();
  var sp=u.speed2d||0, py=HIP, act=u.act, mounted=u.mounted;
  if(mounted){
    st('thL',-1.2,0,-0.3); st('thR',-1.2,0,0.3);
    st('shL',1.35,0,0.1); st('shR',1.35,0,-0.1);
    st('chest',0.08+Math.min(sp/12,1)*0.15,0,0);
    st('uaL',-0.4,0,-0.15); st('faL',-0.6,0.3,0);
    st('uaR',-0.3,0,0.15); st('faR',-0.5,0,0);
  } else {
    var w=Math.min(sp/6.5,1.35);
    if(w>0.06){
      var s=Math.sin(u.animPhase), c=Math.cos(u.animPhase);
      st('thL',s*0.8*w,0,0); st('thR',-s*0.8*w,0,0);
      st('shL',Math.max(0,-s)*1.15*w+0.06,0,0); st('shR',Math.max(0,s)*1.15*w+0.06,0,0);
      st('uaL',-s*0.5*w,0,-0.12); st('uaR',s*0.5*w,0,0.12);
      st('faL',-0.2-Math.max(0,-s)*0.3*w,0,0); st('faR',-0.2-Math.max(0,s)*0.3*w,0,0);
      st('chest',0.13*w,0,0);
      py+=Math.abs(c)*0.055*w-0.02*w;
    } else {
      var t0=performance.now()*0.001+u.slot*1.7;
      st('uaL',0,0,-0.1+Math.sin(t0)*0.02); st('uaR',0,0,0.1-Math.sin(t0)*0.02);
      st('faL',-0.15,0,0); st('faR',-0.15,0,0);
      st('chest',0.02+Math.sin(t0*0.8)*0.015,0,0);
    }
  }
  var fighting=u.combatReady&&!u.dead;
  if(fighting&&u.weapon!=='bow'){
    st('uaR',-0.55,0,0.2); st('faR',-0.55,0,0); st('item',-0.9,0,0);
  }
  if(fighting&&u.hasShield&&u.weapon!=='bow'){
    st('uaL',-0.35,0,-0.25); st('faL',-0.85,0.3,0); st('off',0.1,-0.2,0);
  }
  if(u.shieldUp&&u.hasShield&&u.weapon!=='bow'){
    st('uaL',-1.02,0,-0.18); st('faL',-0.45,0.45,0); st('off',0.12,-0.3,0);
  }
  if(act){
    var tp=G.clamp(act.t/act.dur,0,1), n=act.n;
    if(n==='slash'){
      st('uaR',tk(tp,0,-0.5,0.32,-2.4,0.5,-2.5,0.66,0.35,1,-0.5),tk(tp,0,0,0.32,0.45,0.66,-0.5,1,0),0.15);
      st('faR',tk(tp,0,-0.5,0.32,-0.9,0.66,-0.1,1,-0.5),0,0);
      st('item',tk(tp,0,-0.9,0.32,-0.5,0.66,-1.6,1,-0.9),0,0);
      ad('chest',0,tk(tp,0,0,0.32,0.5,0.66,-0.55,1,0),0);
    } else if(n==='swingL'||n==='swingR'){
      var sg=n==='swingL'?1:-1;
      st('uaR',-1.35,tk(tp,0,0.9*sg,0.32,1.25*sg,0.62,-1.15*sg,1,0),0.1);
      st('faR',-0.35,0,0);
      st('item',-1.15,0,1.3);
      ad('chest',0,tk(tp,0,0.35*sg,0.32,0.55*sg,0.62,-0.55*sg,1,0),0);
    } else if(n==='thrust'){
      st('uaR',tk(tp,0,-0.5,0.35,-0.75,0.55,-1.5,1,-0.5),0,0.1);
      st('faR',tk(tp,0,-0.5,0.35,-1.35,0.55,-0.05,1,-0.5),0,0);
      st('item',tk(tp,0,-0.9,0.35,-1.0,0.55,-1.62,1,-0.9),0,0);
      ad('chest',0,tk(tp,0,0,0.35,-0.35,0.55,0.4,1,0),0);
    } else if(n==='block'){
      st('uaR',-1.15,0,0.5); st('faR',-0.7,0,0); st('item',-1.0,0,1.3);
      if(u.hasShield){ st('uaL',-1.02,0,-0.18); st('faL',-0.45,0.45,0); st('off',0.12,-0.3,0); }
    } else if(n==='shoot'){
      var draw=act.p&&act.p.draw!==undefined?act.p.draw:tp, pit=u.aimPitch||0;
      st('chest',0.05+pit*0.35,0,0); st('head',pit*0.3,0,0);
      st('uaL',-1.5+pit*0.5,0.12,0); st('faL',-0.08,0,0); st('off',1.35,0,0);
      st('uaR',-1.35+pit*0.4,-0.35-draw*0.5,0.3); st('faR',-1.35+draw*0.5,0,0);
    } else if(n==='couch'){
      st('uaR',-0.4,0,0.35); st('faR',-0.35,0,0); st('item',-1.62,0.1,0);
    } else if(n==='brace'){
      py-=0.22;
      st('chest',0.32,0,0);
      st('thL',0.55,0,-0.1); st('thR',-0.5,0,0.1); st('shL',0.15,0,0); st('shR',0.9,0,0);
      st('uaR',-0.85,0,0.3); st('faR',-0.3,0,0); st('item',-1.45,0,0);
      if(u.hasShield){ st('uaL',-0.95,0,-0.2); st('faL',-0.45,0.45,0); st('off',0.1,-0.3,0); }
    } else if(n==='roll'){
      ad('pelvis',-tp*6.28,0,0);
      py=HIP-0.5*Math.sin(tp*Math.PI);
      st('thL',-1.4,0,0); st('thR',-1.2,0,0); st('shL',1.8,0,0); st('shR',1.6,0,0);
      st('uaL',-0.8,0,-0.3); st('uaR',-0.8,0,0.3);
    } else if(n==='die'){
      var f=G.smooth(0,0.85,tp), dir=act.p&&act.p.side?act.p.side:1;
      ad('pelvis',-1.5*f*(act.p&&act.p.back?-1:1),0,0.25*f*dir);
      py=G.lerp(py,0.22,f);
      st('uaL',-0.4*f,0,-0.5*f); st('uaR',-0.3*f,0,0.5*f);
      st('thL',0.15*f,0,-0.15*f); st('thR',0.1*f,0,0.15*f);
      st('shL',0.3*f,0,0); st('shR',0.25*f,0,0);
      st('head',0.3*f,0,0);
    } else if(n==='cheer'){
      var cs=Math.sin(tp*12.5);
      st('uaL',-2.5,0,-0.25+cs*0.15); st('uaR',-2.5,0,0.25-cs*0.15);
    }
  }
  if(u.hitT>0){
    var hp2=u.hitT/0.25;
    ad('chest',-0.28*Math.sin(hp2*Math.PI),0,0);
    ad('head',-0.2*Math.sin(hp2*Math.PI),0,0);
  }
  if(u.dead&&(!act||act.n!=='die')){
    ad('pelvis',-1.5,0,0.2); py=0.22;
  }
  return py;
}

var hbob=0;
function poseHorse(u){
  resetHR();
  var sp=u.speed2d||0, w=G.clamp(sp/10,0,1.2), ph=u.horsePhase||0;
  hbob=Math.abs(Math.sin(ph))*0.09*w;
  if(u.horseDead||u.dead){
    HR.hbody[2]=1.45; HR.neck[0]=0.4; HR.hhead[0]=0.3;
    HR.legFL[0]=0.4; HR.legFR[0]=0.5; HR.legBL[0]=-0.4; HR.legBR[0]=-0.5;
    hbob=-0.62;
    return;
  }
  HR.hbody[0]=Math.sin(ph)*0.05*w;
  HR.legFL[0]=Math.sin(ph)*0.85*w;
  HR.legFR[0]=Math.sin(ph+0.5)*0.85*w;
  HR.legBL[0]=Math.sin(ph+Math.PI)*0.8*w;
  HR.legBR[0]=Math.sin(ph+Math.PI+0.5)*0.8*w;
  HR.neck[0]=w*0.18+Math.sin(ph)*0.06*w;
  HR.hhead[0]=-w*0.1;
  HR.tail[0]=Math.sin(ph*0.7)*0.2*w+0.1;
  if(u.horseRear>0){
    var rt=Math.sin(G.clamp(u.horseRear,0,1)*Math.PI);
    HR.hbody[0]-=rt*0.55;
    HR.legFL[0]-=rt*1.2; HR.legFR[0]-=rt*1.4;
    hbob+=rt*0.3;
  }
}

function writeJoints(joints,Rmap,Mmap,rootX,rootY,rootZ,yaw){
  for(var i=0;i<joints.length;i++){
    var j=joints[i], name=j[0], r=Rmap[name], m=Mmap[name];
    if(!j[1]){
      _eY.set(r[0],yaw+r[1],r[2]);
      m.makeRotationFromEuler(_eY);
      m.setPosition(rootX,rootY,rootZ);
    } else {
      _e.set(r[0],r[1],r[2]);
      _m.makeRotationFromEuler(_e);
      _m.setPosition(j[2],j[3],j[4]);
      m.multiplyMatrices(Mmap[j[1]],_m);
    }
  }
}

CH.updateUnit=function(u){
  var s=u.slot;
  var rx=u.pos.x, ry, rz=u.pos.z, yaw=u.yaw;
  if(u.mounted&&u.hslot>=0){
    poseHorse(u);
    var hyaw=u.horseYaw;
    var hy=u.pos.y+HORSE_Y+hbob-(u.sink||0);
    writeJoints(HJOINTS,HR,HMT,rx,hy,rz,hyaw);
    for(var k in PH) PH[k].setMatrixAt(u.hslot,HMT[k]);
    var py2=poseHuman(u);
    var fx=Math.sin(hyaw), fz=Math.cos(hyaw);
    writeJoints(JOINTS,R,MT,rx-fx*0.06,hy+SADDLE,rz-fz*0.06,yaw);
  } else {
    var py=poseHuman(u);
    ry=u.pos.y+py-(u.sink||0);
    writeJoints(JOINTS,R,MT,rx,ry,rz,yaw);
  }
  P.pelvis.setMatrixAt(s,MT.pelvis); P.chest.setMatrixAt(s,MT.chest); P.head.setMatrixAt(s,MT.head);
  P.uaL.setMatrixAt(s,MT.uaL); P.uaR.setMatrixAt(s,MT.uaR);
  P.faL.setMatrixAt(s,MT.faL); P.faR.setMatrixAt(s,MT.faR);
  P.thL.setMatrixAt(s,MT.thL); P.thR.setMatrixAt(s,MT.thR);
  P.shL.setMatrixAt(s,MT.shL); P.shR.setMatrixAt(s,MT.shR);
  if(u.hasHelm) P.helm.setMatrixAt(s,MT.helm);
  if(u.weapon==='sword') P.sword.setMatrixAt(s,MT.item);
  else if(u.weapon==='spear') P.spear.setMatrixAt(s,MT.item);
  if(u.weapon==='bow') P.bow.setMatrixAt(s,MT.off);
  else if(u.hasShield) P.shield.setMatrixAt(s,MT.off);
  if(u.hasBow) P.quiver.setMatrixAt(s,MT.quiver);
};

var _cu={pos:null,yaw:0,horseYaw:0,speed2d:0,horsePhase:0,horseDead:true,dead:true,sink:0,horseRear:0};
CH.writeHorseCorpse=function(hslot,x,y,z,yaw,sink){
  _cu.pos=_cu.pos||new THREE.Vector3();
  _cu.pos.set(x,y,z); _cu.horseYaw=yaw; _cu.sink=sink; _cu.horseDead=true; _cu.dead=true; _cu.speed2d=0;
  poseHorse(_cu);
  writeJoints(HJOINTS,HR,HMT,x,y+HORSE_Y+hbob-sink,z,yaw);
  for(var k in PH) PH[k].setMatrixAt(hslot,HMT[k]);
};
CH.writeHorseFree=function(hslot,x,y,z,yaw,speed,phase){
  _cu.pos=_cu.pos||new THREE.Vector3();
  _cu.pos.set(x,y,z); _cu.horseYaw=yaw; _cu.sink=0; _cu.speed2d=speed; _cu.horsePhase=phase;
  _cu.horseDead=false; _cu.dead=false; _cu.horseRear=0;
  poseHorse(_cu);
  writeJoints(HJOINTS,HR,HMT,x,y+HORSE_Y+hbob,z,yaw);
  for(var k in PH) PH[k].setMatrixAt(hslot,HMT[k]);
  PH.hbody.instanceMatrix.needsUpdate=true;
};

CH.itemTip=function(u,len,out){
  out.setFromMatrixPosition(MT.item);
  return out;
};
CH.flush=function(){
  for(var k in P){ P[k].instanceMatrix.needsUpdate=true; if(colorDirty&&P[k].instanceColor) P[k].instanceColor.needsUpdate=true; }
  for(var k2 in PH){ PH[k2].instanceMatrix.needsUpdate=true; if(colorDirty&&PH[k2].instanceColor) PH[k2].instanceColor.needsUpdate=true; }
  colorDirty=false;
};
})();
