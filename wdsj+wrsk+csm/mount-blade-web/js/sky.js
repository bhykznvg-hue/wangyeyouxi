(function(){
const G = window.G;
const SKY = G.sky = { hour:9, day:1, isNight:false, rainAmt:0, cloudAmt:0, windAmt:0.3, weather:'clear' };
var sun, moonLight, hemi, skyMesh, stars, moonMesh, sunMesh, fog, scene;
var clouds=[], rainPts, rainVel, rainGeo;
var wTimer=40, wTarget={sun:1,fogF:1,cloud:0.15,rain:0}, wCur={sun:1,fogF:1,cloud:0.15,rain:0};
var flashT=0, boltT=10;

SKY.init=function(sc){
  scene=sc;
  fog=new THREE.Fog(0x9db4c8,120,G.cfg.drawDist); scene.fog=fog;
  sun=new THREE.DirectionalLight(0xffffff,1.2);
  sun.castShadow=G.cfg.shadows;
  sun.shadow.mapSize.set(G.cfg.shadowRes,G.cfg.shadowRes);
  var sc2=sun.shadow.camera;
  sc2.near=20; sc2.far=420; sc2.left=-110; sc2.right=110; sc2.top=110; sc2.bottom=-110;
  sun.shadow.bias=-0.0018; sun.shadow.normalBias=0.5;
  scene.add(sun); scene.add(sun.target);
  hemi=new THREE.HemisphereLight(0xbdd3e8,0x4a4636,0.55); scene.add(hemi);
  moonLight=new THREE.DirectionalLight(0x8fa8cc,0); scene.add(moonLight); scene.add(moonLight.target);
  var skyGeo=new THREE.SphereGeometry(3200,24,14);
  var skyMat=new THREE.ShaderMaterial({
    side:THREE.BackSide, depthWrite:false, fog:false,
    uniforms:{
      topC:{value:new THREE.Color(0x3f6fb5)}, horC:{value:new THREE.Color(0xa8c4dd)},
      sunDir:{value:new THREE.Vector3(0,1,0)}, sunC:{value:new THREE.Color(0xfff2cc)}, glow:{value:1}
    },
    vertexShader:'varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'varying vec3 vDir; uniform vec3 topC,horC,sunDir,sunC; uniform float glow;'+
      'void main(){ float t=pow(max(vDir.y,0.0),0.55); vec3 c=mix(horC,topC,t);'+
      'float s=max(dot(vDir,sunDir),0.0); c+=sunC*pow(s,220.0)*3.0*glow; c+=sunC*pow(s,8.0)*0.22*glow;'+
      'gl_FragColor=vec4(c,1.0); }'
  });
  skyMesh=new THREE.Mesh(skyGeo,skyMat); skyMesh.frustumCulled=false; scene.add(skyMesh);
  var starPos=new Float32Array(900*3), rng=G.mulberry(42);
  for(var i=0;i<900;i++){
    var a=rng()*Math.PI*2, e=Math.acos(rng()*0.95);
    starPos[i*3]=Math.cos(a)*Math.sin(e)*3000;
    starPos[i*3+1]=Math.cos(e)*3000;
    starPos[i*3+2]=Math.sin(a)*Math.sin(e)*3000;
  }
  var sg=new THREE.BufferGeometry(); sg.setAttribute('position',new THREE.BufferAttribute(starPos,3));
  stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0xcfe0ff,size:3.2,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));
  stars.frustumCulled=false; scene.add(stars);
  moonMesh=new THREE.Mesh(new THREE.SphereGeometry(60,12,10),new THREE.MeshBasicMaterial({color:0xdde6f5,fog:false}));
  scene.add(moonMesh);
  var cGeo=G.geo.merge([G.geo.sph(1,7,5,0,0,0,0xffffff),G.geo.sph(0.8,6,4,1.2,0.1,0.3,0xffffff),G.geo.sph(0.7,6,4,-1.1,0.05,-0.2,0xffffff),G.geo.sph(0.6,5,4,0.3,0.15,0.9,0xffffff)]);
  for(var c=0;c<16;c++){
    var cm=new THREE.Mesh(cGeo,new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0.75,fog:false,depthWrite:false}));
    cm.position.set((rng()*2-1)*1600,230+rng()*90,(rng()*2-1)*1600);
    cm.scale.set(60+rng()*90,10+rng()*10,40+rng()*60);
    cm.userData.speed=4+rng()*5;
    scene.add(cm); clouds.push(cm);
  }
  rainGeo=new THREE.BufferGeometry();
  var rp=new Float32Array(1500*3); rainVel=new Float32Array(1500);
  for(var r=0;r<1500;r++){ rp[r*3]=(rng()*2-1)*45; rp[r*3+1]=rng()*40; rp[r*3+2]=(rng()*2-1)*45; rainVel[r]=30+rng()*14; }
  rainGeo.setAttribute('position',new THREE.BufferAttribute(rp,3));
  rainPts=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0x9fb4c8,size:0.14,transparent:true,opacity:0,depthWrite:false}));
  rainPts.frustumCulled=false; scene.add(rainPts);
};

function pickWeather(){
  var r=Math.random();
  if(r<0.42) return 'clear';
  if(r<0.68) return 'cloud';
  if(r<0.82) return 'rain';
  if(r<0.90) return 'storm';
  return 'fog';
}
function applyWeather(w){
  SKY.weather=w;
  if(w==='clear'){ wTarget={sun:1,fogF:1,cloud:0.12,rain:0}; }
  if(w==='cloud'){ wTarget={sun:0.72,fogF:0.85,cloud:0.65,rain:0}; }
  if(w==='rain'){ wTarget={sun:0.45,fogF:0.55,cloud:0.9,rain:0.7}; }
  if(w==='storm'){ wTarget={sun:0.3,fogF:0.4,cloud:1,rain:1}; }
  if(w==='fog'){ wTarget={sun:0.55,fogF:0.22,cloud:0.5,rain:0}; }
}

var _sunDir=new THREE.Vector3(), _cTop=new THREE.Color(), _cHor=new THREE.Color(), _cA=new THREE.Color(), _cB=new THREE.Color();
SKY.update=function(dt,cam){
  SKY.hour+=dt*24/G.cfg.dayLen;
  if(SKY.hour>=24){ SKY.hour-=24; SKY.day++; if(G.rpg) G.rpg.onNewDay(); }
  wTimer-=dt;
  if(wTimer<=0){ wTimer=120+Math.random()*180; applyWeather(pickWeather()); if(G.ui) G.ui.notify('天气变化：'+SKY.weatherName(),'#9db4c8'); }
  var wk=1-Math.pow(0.5,dt/6);
  wCur.sun+=(wTarget.sun-wCur.sun)*wk; wCur.fogF+=(wTarget.fogF-wCur.fogF)*wk;
  wCur.cloud+=(wTarget.cloud-wCur.cloud)*wk; wCur.rain+=(wTarget.rain-wCur.rain)*wk;
  SKY.rainAmt=wCur.rain; SKY.cloudAmt=wCur.cloud;

  var sunAng=(SKY.hour-6)/12*Math.PI;
  var elev=Math.sin(sunAng), az=Math.cos(sunAng);
  _sunDir.set(az*0.72,elev,0.42).normalize();
  var dayT=G.clamp(elev*2.2,-1,1);
  var dawn=G.clamp(1-Math.abs(elev)*4,0,1)*(elev>-0.12?1:0);
  SKY.isNight=elev<0.0;

  var sunI=G.clamp(dayT,0,1)*1.35*wCur.sun;
  sun.intensity=sunI;
  _cA.setHSL(0.09,0.9,0.62); _cB.setRGB(1,0.98,0.92);
  sun.color.copy(_cB).lerp(_cA,dawn);
  sun.position.set(cam.x+_sunDir.x*220,Math.max(30,cam.y+_sunDir.y*220),cam.z+_sunDir.z*220);
  sun.target.position.set(cam.x,cam.y,cam.z);
  sun.castShadow=G.cfg.shadows&&sunI>0.05;

  moonLight.intensity=SKY.isNight?0.22*wCur.sun:0;
  moonLight.position.set(cam.x-_sunDir.x*200,Math.max(40,cam.y-_sunDir.y*200+80),cam.z-_sunDir.z*200);
  moonLight.target.position.set(cam.x,cam.y,cam.z);
  moonMesh.position.set(cam.x-_sunDir.x*2600,Math.max(-300,-_sunDir.y*2600+300),cam.z-_sunDir.z*2600);
  moonMesh.visible=SKY.isNight;

  var nightT=G.clamp(-dayT,0,1);
  hemi.intensity=G.lerp(0.55,0.09,nightT)*G.lerp(1,0.75,wCur.cloud);
  hemi.color.setRGB(G.lerp(0.74,0.16,nightT),G.lerp(0.82,0.2,nightT),G.lerp(0.92,0.34,nightT));
  hemi.groundColor.setRGB(G.lerp(0.32,0.05,nightT),G.lerp(0.3,0.05,nightT),G.lerp(0.24,0.07,nightT));

  _cTop.setRGB(G.lerp(0.24,0.012,nightT),G.lerp(0.42,0.02,nightT),G.lerp(0.72,0.06,nightT));
  _cHor.setRGB(G.lerp(0.66,0.05,nightT),G.lerp(0.77,0.06,nightT),G.lerp(0.87,0.1,nightT));
  if(dawn>0){ _cHor.lerp(_cA,dawn*0.55); }
  _cTop.lerp(_cB.setRGB(0.5,0.53,0.58),wCur.cloud*0.6*(1-nightT));
  _cHor.lerp(_cB,wCur.cloud*0.4*(1-nightT));
  var sm=skyMesh.material.uniforms;
  sm.topC.value.copy(_cTop); sm.horC.value.copy(_cHor);
  sm.sunDir.value.copy(_sunDir); sm.glow.value=G.clamp(dayT,0,1)*wCur.sun;
  skyMesh.position.set(cam.x,0,cam.z);

  fog.color.copy(_cHor);
  fog.far=G.lerp(160,G.cfg.drawDist,wCur.fogF*G.lerp(1,0.55,nightT*0.6));
  fog.near=fog.far*0.14;

  stars.material.opacity=nightT*(1-wCur.cloud*0.85);
  stars.position.set(cam.x,0,cam.z);

  clouds.forEach(function(c){
    c.position.x+=c.userData.speed*dt;
    if(c.position.x>cam.x+1800) c.position.x=cam.x-1800;
    c.material.opacity=wCur.cloud*0.8;
    var l=G.lerp(1,0.35,nightT);
    c.material.color.setRGB(l*G.lerp(1,0.5,wCur.rain),l*G.lerp(1,0.52,wCur.rain),l*G.lerp(1,0.56,wCur.rain));
    c.visible=wCur.cloud>0.05;
  });

  rainPts.visible=wCur.rain>0.02;
  rainPts.material.opacity=wCur.rain*0.7;
  if(rainPts.visible){
    rainPts.position.set(cam.x,cam.y,cam.z);
    var pa=rainGeo.attributes.position.array;
    for(var i=0;i<1500;i++){
      pa[i*3+1]-=rainVel[i]*dt;
      if(pa[i*3+1]<-18){ pa[i*3+1]=22+Math.random()*10; pa[i*3]=(Math.random()*2-1)*45; pa[i*3+2]=(Math.random()*2-1)*45; }
    }
    rainGeo.attributes.position.needsUpdate=true;
  }

  if(SKY.weather==='storm'){
    boltT-=dt;
    if(boltT<=0){ boltT=6+Math.random()*14; flashT=0.18; setTimeout(function(){ G.audio.play('thunder',0.8); },400+Math.random()*1200); }
  }
  if(flashT>0){ flashT-=dt; hemi.intensity+=2.2*G.clamp(flashT/0.18,0,1); }

  if(G.audio.started) G.audio.setAmbience(0.02+SKY.windAmt*0.03+wCur.rain*0.01,wCur.rain*0.05);
  if(G.settlements) G.settlements.updateLights(cam.x,cam.z,SKY.isNight);
};
SKY.weatherName=function(){
  return {clear:'晴朗',cloud:'多云',rain:'降雨',storm:'暴风雨',fog:'大雾'}[SKY.weather]||SKY.weather;
};
SKY.timeStr=function(){
  var h=Math.floor(SKY.hour), m=Math.floor((SKY.hour-h)*60);
  return '第'+SKY.day+'天 '+(h<10?'0':'')+h+':'+(m<10?'0':'')+m;
};
})();
