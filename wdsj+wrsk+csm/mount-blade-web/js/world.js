(function(){
const G = window.G;
const W = G.world = {
  size:0, half:0, res:0, cell:0, hg:null, rf:null,
  settlements:[], roads:[], roadSegs:[], treeGrid:new Map(),
  chunks:[], chunkN:20, chunkSize:0, group:null, scene:null,
  grassMesh:null, grassAnchor:{x:1e9,z:1e9}, mapImg:null
};
const S = G.cfg;

function rawH(x,z){
  var d=Math.max(Math.abs(x),Math.abs(z))/W.half;
  var h = 3.5 + (G.fbm(x*0.0025,z*0.0025,4,11)*2-1)*5.5;
  var m = G.smooth(0.56,0.74,G.fbm(x*0.00055+7.3,z*0.00055+2.1,3,23));
  h += m*(10+G.fbm(x*0.004,z*0.004,4,37)*52);
  var l = G.smooth(0.64,0.74,G.fbm(x*0.0012+31,z*0.0012+11,3,53))*(1-m);
  h -= l*10;
  h = G.lerp(h,-12,G.smooth(0.84,1.0,d));
  return h;
}
W.mountain=function(x,z){ return G.smooth(0.56,0.74,G.fbm(x*0.00055+7.3,z*0.00055+2.1,3,23)); };
W.forest=function(x,z){
  var m=W.mountain(x,z);
  return G.smooth(0.53,0.62,G.fbm(x*0.0011+100,z*0.0011+50,3,71))*(1-G.smooth(0.5,0.8,m));
};

W.getH=function(x,z){
  var gx=(x+W.half)/W.cell, gz=(z+W.half)/W.cell;
  if(gx<0||gz<0||gx>=W.res-1||gz>=W.res-1) return -12;
  var xi=gx|0, zi=gz|0, xf=gx-xi, zf=gz-zi, r=W.res, hg=W.hg;
  var a=hg[zi*r+xi], b=hg[zi*r+xi+1], c=hg[(zi+1)*r+xi], d=hg[(zi+1)*r+xi+1];
  return a+(b-a)*xf+(c-a)*zf+(a-b-c+d)*xf*zf;
};
W.roadF=function(x,z){
  var gx=Math.round((x+W.half)/W.cell), gz=Math.round((z+W.half)/W.cell);
  if(gx<0||gz<0||gx>=W.res||gz>=W.res) return 0;
  return W.rf[gz*W.res+gx]/255;
};
W.getN=function(x,z,out){
  var e=2.0;
  var hx=W.getH(x+e,z)-W.getH(x-e,z), hz=W.getH(x,z+e)-W.getH(x,z-e);
  out.set(-hx,2*e*2,-hz).normalize(); return out;
};
W.slope=function(x,z){
  var e=2.0;
  var hx=(W.getH(x+e,z)-W.getH(x-e,z))/(2*e), hz=(W.getH(x,z+e)-W.getH(x,z-e))/(2*e);
  return Math.sqrt(hx*hx+hz*hz);
};

/* ---------- settlements placement ---------- */
function placeSettlements(){
  var rng=G.mulberry(G.seed+77);
  var defs=[
    {type:'town',name:'灰风城',faction:'nord'},{type:'town',name:'金川城',faction:'emp'},{type:'town',name:'河湾镇',faction:'khan'},
    {type:'castle',name:'鹰喙堡',faction:'nord'},{type:'castle',name:'黑岩要塞',faction:'emp'},{type:'castle',name:'白塔堡',faction:'khan'},
    {type:'village',name:'柳溪村',faction:'nord'},{type:'village',name:'榆林村',faction:'nord'},
    {type:'village',name:'石泉村',faction:'emp'},{type:'village',name:'麦田村',faction:'emp'},
    {type:'village',name:'苍松村',faction:'khan'},{type:'village',name:'湖畔村',faction:'khan'}
  ];
  var placed=[];
  defs.forEach(function(def){
    var best=null, tries=0;
    while(tries++<600){
      var x=(rng()*2-1)*(W.half-450), z=(rng()*2-1)*(W.half-450);
      var h=rawH(x,z);
      if(h<2.5||h>15) continue;
      var sl=Math.abs(rawH(x+15,z)-rawH(x-15,z))+Math.abs(rawH(x,z+15)-rawH(x,z-15));
      if(sl>6) continue;
      var ok=true, minD=def.type==='town'?750:520;
      for(var i=0;i<placed.length;i++){ if(G.dist2(x,z,placed[i].x,placed[i].z)<minD*minD){ ok=false; break; } }
      if(!ok) continue;
      best={x:x,z:z,h:h}; break;
    }
    if(!best) best={x:(rng()*2-1)*1200,z:(rng()*2-1)*1200,h:5};
    var s={type:def.type,name:def.name,faction:def.faction,x:best.x,z:best.z,h:best.h,
      r:def.type==='town'?95:(def.type==='castle'?62:70),
      flatR:def.type==='town'?170:(def.type==='castle'?130:130),
      obstacles:[],torches:[],npcs:[],prosperity:0.8+rng()*0.6,gate:null,gateHp:0,captured:false,
      wallPosts:[],courtyard:null,priceMul:{}};
    placed.push(s); W.settlements.push(s);
  });
}
function buildRoads(){
  var rng=G.mulberry(G.seed+99);
  var towns=W.settlements.filter(function(s){return s.type==='town';});
  var edges=[];
  W.settlements.forEach(function(s){
    if(s.type==='town') return;
    var best=null,bd=1e18;
    towns.forEach(function(t){ var d=G.dist2(s.x,s.z,t.x,t.z); if(d<bd){bd=d;best=t;} });
    if(best) edges.push([s,best]);
  });
  for(var i=0;i<towns.length-1;i++) edges.push([towns[i],towns[i+1]]);
  edges.forEach(function(e){
    var a=e[0],b=e[1], dx=b.x-a.x, dz=b.z-a.z, len=Math.sqrt(dx*dx+dz*dz);
    var n=Math.max(2,Math.round(len/70)), pts=[];
    var px=-dz/len, pz=dx/len;
    for(var i2=0;i2<=n;i2++){
      var t=i2/n, ox=0;
      if(i2>0&&i2<n) ox=(G.vnoise(t*6+a.x*0.01, a.z*0.01, 5)*2-1)*32*Math.sin(t*Math.PI);
      pts.push([a.x+dx*t+px*ox, a.z+dz*t+pz*ox]);
    }
    W.roads.push(pts);
    for(var j=0;j<pts.length-1;j++){
      var s0=pts[j],s1=pts[j+1];
      W.roadSegs.push({x0:s0[0],z0:s0[1],x1:s1[0],z1:s1[1],
        bx0:Math.min(s0[0],s1[0])-16,bx1:Math.max(s0[0],s1[0])+16,
        bz0:Math.min(s0[1],s1[1])-16,bz1:Math.max(s0[1],s1[1])+16});
    }
  });
}
function roadDist(x,z){
  var best=1e9, segs=W.roadSegs;
  for(var i=0;i<segs.length;i++){
    var s=segs[i];
    if(x<s.bx0||x>s.bx1||z<s.bz0||z>s.bz1) continue;
    var dx=s.x1-s.x0, dz=s.z1-s.z0, l2=dx*dx+dz*dz;
    var t=l2>0?G.clamp(((x-s.x0)*dx+(z-s.z0)*dz)/l2,0,1):0;
    var qx=s.x0+dx*t-x, qz=s.z0+dz*t-z, d=qx*qx+qz*qz;
    if(d<best) best=d;
  }
  return Math.sqrt(best);
}

/* ---------- height grid ---------- */
W.buildGridRows=function(z0,z1){
  var r=W.res, half=W.half, cell=W.cell;
  for(var zi=z0;zi<z1;zi++){
    var z=zi*cell-half;
    for(var xi=0;xi<r;xi++){
      var x=xi*cell-half;
      var h=rawH(x,z);
      for(var si=0;si<W.settlements.length;si++){
        var s=W.settlements[si];
        var dx=x-s.x, dz=z-s.z;
        if(Math.abs(dx)>s.flatR||Math.abs(dz)>s.flatR) continue;
        var d=Math.sqrt(dx*dx+dz*dz);
        if(d<s.flatR) h=G.lerp(s.h,h,G.smooth(s.flatR*0.5,s.flatR,d));
      }
      var rd=roadDist(x,z), rfv=0;
      if(rd<14){
        rfv=1-G.smooth(3.5,11,rd);
        var ah=(rawH(x+8,z)+rawH(x-8,z)+rawH(x,z+8)+rawH(x,z-8)+h)/5;
        h=G.lerp(h,ah,rfv*0.8);
        if(h<0.8) h=G.lerp(h,1.0,rfv);
      }
      W.hg[zi*r+xi]=h;
      W.rf[zi*r+xi]=Math.round(rfv*255);
    }
  }
};

/* ---------- terrain color ---------- */
var _c={r:0,g:0,b:0};
function colorAt(x,z,h,sl){
  var n1=G.vnoise(x*0.02,z*0.02,301), n2=G.vnoise(x*0.15,z*0.15,302);
  var r=0.30+0.13*n1, g=0.43+0.09*n1, b=0.15+0.05*n1;
  var f=W.forest(x,z);
  if(f>0.1){ r=G.lerp(r,0.15,f*0.8); g=G.lerp(g,0.30,f*0.8); b=G.lerp(b,0.10,f*0.8); }
  if(h<1.4){ var t=G.smooth(1.4,0.3,h); r=G.lerp(r,0.62,t); g=G.lerp(g,0.57,t); b=G.lerp(b,0.40,t); }
  var rockT=Math.max(G.smooth(0.45,0.75,sl),G.smooth(30,40,h));
  if(rockT>0){ var rg=0.40+0.08*n2; r=G.lerp(r,rg,rockT); g=G.lerp(g,rg*0.97,rockT); b=G.lerp(b,rg*0.93,rockT); }
  var snowT=G.smooth(46,54+6*n2,h);
  if(snowT>0){ r=G.lerp(r,0.88,snowT); g=G.lerp(g,0.90,snowT); b=G.lerp(b,0.95,snowT); }
  var rfv=W.roadF(x,z);
  if(rfv>0.03){ r=G.lerp(r,0.46+0.06*n2,rfv*0.9); g=G.lerp(g,0.39+0.05*n2,rfv*0.9); b=G.lerp(b,0.29,rfv*0.9); }
  for(var i=0;i<W.settlements.length;i++){
    var s=W.settlements[i], d2=G.dist2(x,z,s.x,s.z), rr=s.r*0.95;
    if(d2<rr*rr){ var t2=1-G.smooth(rr*0.5,rr,Math.sqrt(d2)); r=G.lerp(r,0.47,t2*0.7); g=G.lerp(g,0.40,t2*0.7); b=G.lerp(b,0.30,t2*0.7); }
  }
  _c.r=r;_c.g=g;_c.b=b; return _c;
}
W.colorAt=colorAt;

/* ---------- chunks ---------- */
function buildChunkGeo(cx,cz,res){
  var size=W.chunkSize, ox=cx*size-W.half, oz=cz*size-W.half;
  var n=res+1, pos=new Float32Array(n*n*3), col=new Float32Array(n*n*3), nor=new Float32Array(n*n*3);
  var idx=new Uint32Array(res*res*6), step=size/res;
  for(var zi=0;zi<n;zi++) for(var xi=0;xi<n;xi++){
    var x=ox+xi*step, z=oz+zi*step, h=W.getH(x,z), i=(zi*n+xi)*3;
    pos[i]=x; pos[i+1]=h; pos[i+2]=z;
    var e=step;
    var hx=(W.getH(x+e,z)-W.getH(x-e,z))/(2*e), hz=(W.getH(x,z+e)-W.getH(x,z-e))/(2*e);
    var nl=1/Math.sqrt(hx*hx+hz*hz+1);
    nor[i]=-hx*nl; nor[i+1]=nl; nor[i+2]=-hz*nl;
    var sl=Math.sqrt(hx*hx+hz*hz);
    var c=colorAt(x,z,h,sl);
    col[i]=c.r; col[i+1]=c.g; col[i+2]=c.b;
  }
  var k=0;
  for(var zi2=0;zi2<res;zi2++) for(var xi2=0;xi2<res;xi2++){
    var a=zi2*n+xi2, b=a+1, c2=a+n, d=c2+1;
    idx[k++]=a; idx[k++]=c2; idx[k++]=b; idx[k++]=b; idx[k++]=c2; idx[k++]=d;
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  g.setIndex(new THREE.BufferAttribute(idx,1));
  return g;
}
var terrainMat;
W.initChunks=function(){
  terrainMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.96,metalness:0.0});
  W.chunkSize=W.size/W.chunkN;
  for(var cz=0;cz<W.chunkN;cz++) for(var cx=0;cx<W.chunkN;cx++){
    var mesh=new THREE.Mesh(buildChunkGeo(cx,cz,8),terrainMat);
    mesh.receiveShadow=true; mesh.frustumCulled=true; mesh.matrixAutoUpdate=false;
    W.group.add(mesh);
    W.chunks.push({cx:cx,cz:cz,mesh:mesh,res:8});
  }
};
var lodTimer=0;
W.updateLOD=function(dt,px,pz){
  lodTimer-=dt; if(lodTimer>0) return; lodTimer=0.4;
  var budget=3;
  for(var i=0;i<W.chunks.length&&budget>0;i++){
    var c=W.chunks[i];
    var cxw=(c.cx+0.5)*W.chunkSize-W.half, czw=(c.cz+0.5)*W.chunkSize-W.half;
    var d=Math.sqrt(G.dist2(px,pz,cxw,czw));
    var want=d<340?40:(d<680?20:8);
    if(want!==c.res){
      c.mesh.geometry.dispose();
      c.mesh.geometry=buildChunkGeo(c.cx,c.cz,want);
      c.res=want; budget--;
    }
  }
};

/* ---------- vegetation ---------- */
function treeGeos(){
  var pine=G.geo.merge([
    G.geo.cyl(0.14,0.26,2.4,5,0,1.2,0,0x5b4128),
    G.geo.cone(1.5,2.6,7,0,3.2,0,0x2a4d20),
    G.geo.cone(1.15,2.2,7,0,4.6,0,0x315826),
    G.geo.cone(0.8,1.8,6,0,5.9,0,0x3a6329)
  ]);
  var oak=G.geo.merge([
    G.geo.cyl(0.2,0.34,2.6,5,0,1.3,0,0x6b4a2b),
    G.geo.sph(1.7,7,5,0,3.6,0,0x3f6a24),
    G.geo.sph(1.2,6,5,0.9,3.0,0.5,0x477431),
    G.geo.sph(1.1,6,5,-0.8,3.1,-0.4,0x38601f)
  ]);
  return {pine:pine,oak:oak};
}
function addTreeCol(x,z,r){
  var cx=Math.floor((x+W.half)/24), cz=Math.floor((z+W.half)/24), key=cx*4096+cz;
  var arr=W.treeGrid.get(key); if(!arr){ arr=[]; W.treeGrid.set(key,arr); }
  arr.push([x,z,r]);
}
W.treesNear=function(x,z,out){
  out.length=0;
  var cx=Math.floor((x+W.half)/24), cz=Math.floor((z+W.half)/24);
  for(var i=-1;i<=1;i++) for(var j=-1;j<=1;j++){
    var arr=W.treeGrid.get((cx+i)*4096+(cz+j));
    if(arr) for(var k=0;k<arr.length;k++) out.push(arr[k]);
  }
  return out;
};
function nearSettlement(x,z,extra){
  for(var i=0;i<W.settlements.length;i++){
    var s=W.settlements[i];
    if(G.dist2(x,z,s.x,s.z)<(s.r+extra)*(s.r+extra)) return true;
  }
  return false;
}
W.buildVegetation=function(){
  var geos=treeGeos();
  var mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.95});
  var pines=[], oaks=[], rng=G.mulberry(G.seed+301);
  var step=12;
  for(var z=-W.half+40;z<W.half-40;z+=step){
    for(var x=-W.half+40;x<W.half-40;x+=step){
      if(pines.length+oaks.length>=S.treeCap) break;
      var hsh=G.hash2(x|0,z|0,401);
      var f=W.forest(x,z);
      var dens=f>0.15?f*0.75:0.012;
      if(hsh>dens) continue;
      var jx=x+(G.hash2(x|0,z|0,402)-0.5)*step*1.6, jz=z+(G.hash2(x|0,z|0,403)-0.5)*step*1.6;
      var h=W.getH(jx,jz);
      if(h<1.2||h>44) continue;
      if(W.slope(jx,jz)>0.7) continue;
      if(W.roadF(jx,jz)>0.12) continue;
      if(nearSettlement(jx,jz,25)) continue;
      var isPine=h>16||G.hash2(x|0,z|0,404)<0.4;
      var sc=0.8+G.hash2(x|0,z|0,405)*0.7;
      (isPine?pines:oaks).push([jx,h,jz,G.hash2(x|0,z|0,406)*6.28,sc]);
      addTreeCol(jx,jz,0.55*sc);
    }
  }
  var m4=new THREE.Matrix4(), q=new THREE.Quaternion(), up=new THREE.Vector3(0,1,0), sv=new THREE.Vector3(), col=new THREE.Color();
  [[geos.pine,pines],[geos.oak,oaks]].forEach(function(pair){
    var geo=pair[0], list=pair[1];
    if(!list.length) return;
    var im=new THREE.InstancedMesh(geo,mat,list.length);
    im.castShadow=S.shadows; im.frustumCulled=false; im.matrixAutoUpdate=false;
    for(var i=0;i<list.length;i++){
      var t=list[i];
      q.setFromAxisAngle(up,t[3]); sv.set(t[4],t[4]*(0.9+G.hash2(i,7,9)*0.3),t[4]);
      m4.compose(new THREE.Vector3(t[0],t[1]-0.2,t[2]),q,sv);
      im.setMatrixAt(i,m4);
      var v=0.85+G.hash2(i,3,408)*0.3; col.setRGB(v,v,v);
      im.setColorAt(i,col);
    }
    im.instanceMatrix.needsUpdate=true;
    if(im.instanceColor) im.instanceColor.needsUpdate=true;
    W.group.add(im);
  });
  var rockGeo=G.geo.merge([G.geo.sph(1,5,4,0,0.3,0,0x6f6b66),G.geo.sph(0.7,5,4,0.6,0.15,0.3,0x625e59)]);
  var rocks=[];
  for(var i2=0;i2<S.rockCap*3&&rocks.length<S.rockCap;i2++){
    var rx=(rng()*2-1)*(W.half-60), rz=(rng()*2-1)*(W.half-60);
    var rh=W.getH(rx,rz);
    if(W.mountain(rx,rz)<0.3&&rng()<0.85) continue;
    if(rh<1||nearSettlement(rx,rz,15)) continue;
    rocks.push([rx,rh,rz,rng()*6.28,0.4+rng()*1.6]);
    if(rocks[rocks.length-1][4]>1.1) addTreeCol(rx,rz,rocks[rocks.length-1][4]);
  }
  var rm=new THREE.InstancedMesh(rockGeo,mat,rocks.length);
  rm.frustumCulled=false; rm.castShadow=S.shadows;
  for(var i3=0;i3<rocks.length;i3++){
    var rk=rocks[i3];
    q.setFromAxisAngle(up,rk[3]); sv.set(rk[4],rk[4]*(0.6+G.hash2(i3,1,9)*0.6),rk[4]);
    m4.compose(new THREE.Vector3(rk[0],rk[1],rk[2]),q,sv);
    rm.setMatrixAt(i3,m4);
  }
  rm.instanceMatrix.needsUpdate=true;
  W.group.add(rm);
  var bushGeo=G.geo.sph(0.7,6,4,0,0.35,0,0x40631f);
  var bushes=[];
  for(var i4=0;i4<S.bushCap*3&&bushes.length<S.bushCap;i4++){
    var bx=(rng()*2-1)*(W.half-60), bz=(rng()*2-1)*(W.half-60);
    var bh=W.getH(bx,bz);
    if(bh<1.2||bh>30||W.slope(bx,bz)>0.4) continue;
    if(W.roadF(bx,bz)>0.1||nearSettlement(bx,bz,12)) continue;
    bushes.push([bx,bh,bz,rng()*6.28,0.6+rng()*1.1]);
  }
  var bm=new THREE.InstancedMesh(bushGeo,mat,bushes.length);
  bm.frustumCulled=false;
  for(var i5=0;i5<bushes.length;i5++){
    var bu=bushes[i5];
    q.setFromAxisAngle(up,bu[3]); sv.set(bu[4],bu[4]*0.8,bu[4]);
    m4.compose(new THREE.Vector3(bu[0],bu[1],bu[2]),q,sv);
    bm.setMatrixAt(i5,m4);
  }
  bm.instanceMatrix.needsUpdate=true;
  W.group.add(bm);
};

/* ---------- grass ---------- */
W.buildGrass=function(){
  var blade=G.geo.merge([
    G.geo.box(0.5,0.55,0.02,0,0.27,0,0,0,0,0x4a7526),
    G.geo.box(0.5,0.55,0.02,0,0.27,0,0,1.57,0,0x557f2b)
  ]);
  var mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});
  var im=new THREE.InstancedMesh(blade,mat,S.grassCap);
  im.frustumCulled=false; im.matrixAutoUpdate=false;
  var zero=new THREE.Matrix4(); zero.makeScale(0,0,0);
  for(var i=0;i<S.grassCap;i++) im.setMatrixAt(i,zero);
  im.instanceMatrix.needsUpdate=true;
  W.grassMesh=im; W.group.add(im);
};
W.updateGrass=function(px,pz){
  var dx=px-W.grassAnchor.x, dz=pz-W.grassAnchor.z;
  if(dx*dx+dz*dz<144) return;
  W.grassAnchor.x=px; W.grassAnchor.z=pz;
  var im=W.grassMesh, m4=G.tmp.m1, q=G.tmp.q1, sv=G.tmp.v1, p=G.tmp.v2;
  var n=0, R=58, cellG=1.9;
  var x0=Math.floor((px-R)/cellG), x1=Math.floor((px+R)/cellG);
  var z0=Math.floor((pz-R)/cellG), z1=Math.floor((pz+R)/cellG);
  outer:
  for(var zi=z0;zi<=z1;zi++) for(var xi=x0;xi<=x1;xi++){
    if(n>=S.grassCap) break outer;
    var hsh=G.hash2(xi,zi,501);
    if(hsh>0.5) continue;
    var gx=xi*cellG+(G.hash2(xi,zi,502)-0.5)*cellG, gz=zi*cellG+(G.hash2(xi,zi,503)-0.5)*cellG;
    if(G.dist2(gx,gz,px,pz)>R*R) continue;
    var h=W.getH(gx,gz);
    if(h<1||h>32||W.slope(gx,gz)>0.45) continue;
    if(W.roadF(gx,gz)>0.08) continue;
    if(W.forest(gx,gz)>0.5) continue;
    if(nearSettlement(gx,gz,-8)) continue;
    q.setFromAxisAngle(G.tmp.v3.set(0,1,0),hsh*12);
    var sc=0.7+G.hash2(xi,zi,504)*0.8;
    sv.set(sc,sc,sc); p.set(gx,h,gz);
    m4.compose(p,q,sv); im.setMatrixAt(n,m4); n++;
  }
  sv.set(0,0,0); p.set(0,-100,0); q.identity(); m4.compose(p,q,sv);
  for(var i=n;i<S.grassCap;i++) im.setMatrixAt(i,m4);
  im.instanceMatrix.needsUpdate=true;
};

/* ---------- collision ---------- */
var _tOut=[];
W.resolveCollision=function(pos,radius){
  W.treesNear(pos.x,pos.z,_tOut);
  for(var i=0;i<_tOut.length;i++){
    var t=_tOut[i], dx=pos.x-t[0], dz=pos.z-t[1], rr=radius+t[2];
    var d2=dx*dx+dz*dz;
    if(d2<rr*rr&&d2>1e-6){
      var d=Math.sqrt(d2), push=(rr-d)/d;
      pos.x+=dx*push; pos.z+=dz*push;
    }
  }
  for(var si=0;si<W.settlements.length;si++){
    var s=W.settlements[si];
    if(G.dist2(pos.x,pos.z,s.x,s.z)>(s.flatR+20)*(s.flatR+20)) continue;
    var obs=s.obstacles;
    for(var j=0;j<obs.length;j++){
      var o=obs[j];
      if(o.gate&&o.open) continue;
      var ddx=pos.x-o.x, ddz=pos.z-o.z, orr=radius+o.r, od2=ddx*ddx+ddz*ddz;
      if(od2<orr*orr&&od2>1e-6){
        var od=Math.sqrt(od2), opush=(orr-od)/od;
        pos.x+=ddx*opush; pos.z+=ddz*opush;
      }
    }
  }
};

/* ---------- water & map ---------- */
W.buildWater=function(){
  var g=new THREE.PlaneGeometry(W.size*1.05,W.size*1.05,1,1);
  g.rotateX(-Math.PI/2);
  var m=new THREE.MeshStandardMaterial({color:0x2b5d80,transparent:true,opacity:0.85,roughness:0.25,metalness:0.1});
  var mesh=new THREE.Mesh(g,m);
  mesh.position.y=S.seaY+0.05;
  mesh.receiveShadow=false;
  W.group.add(mesh);
};
W.bakeMap=function(res){
  var cv=document.createElement('canvas'); cv.width=res; cv.height=res;
  var ctx=cv.getContext('2d'), img=ctx.createImageData(res,res);
  for(var zi=0;zi<res;zi++) for(var xi=0;xi<res;xi++){
    var x=(xi/(res-1))*W.size-W.half, z=(zi/(res-1))*W.size-W.half;
    var h=W.getH(x,z), i=(zi*res+xi)*4;
    if(h<S.seaY+0.1){ img.data[i]=38; img.data[i+1]=70; img.data[i+2]=105; }
    else{
      var sl=W.slope(x,z), c=colorAt(x,z,h,sl);
      var shade=G.clamp(0.75+h*0.01,0.7,1.15);
      img.data[i]=c.r*255*shade; img.data[i+1]=c.g*255*shade; img.data[i+2]=c.b*255*shade;
    }
    img.data[i+3]=255;
  }
  ctx.putImageData(img,0,0);
  W.mapImg=cv;
};

W.prepare=function(scene){
  W.scene=scene;
  W.size=S.world; W.half=W.size/2; W.res=S.hgRes; W.cell=W.size/(W.res-1);
  W.hg=new Float32Array(W.res*W.res); W.rf=new Uint8Array(W.res*W.res);
  W.group=new THREE.Group(); scene.add(W.group);
  placeSettlements(); buildRoads();
};
})();
