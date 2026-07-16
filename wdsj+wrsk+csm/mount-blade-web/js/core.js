(function(){
const G = window.G = {};
G.VERSION = '1.0';
G.cfg = {
  world: 4000, hgRes: 1024, seaY: 0.0, gravity: 22,
  poolHumans: 360, poolHorses: 110, maxBattle: 280,
  treeCap: 26000, rockCap: 3500, bushCap: 4500, grassCap: 5000,
  shadowRes: 2048, drawDist: 950, dayLen: 600,
  shadows: true, quality: 1
};
G.seed = 20260716;
G.paused = false; G.started = false; G.timeScale = 1;

/* ---------- RNG / Noise ---------- */
G.mulberry = function(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };
G.srng = G.mulberry(G.seed);
function hash2(x,y,s){ var n=(x*374761393+y*668265263+(s||0)*69069)|0; n=Math.imul(n^(n>>>13),1274126177); n=n^(n>>>16); return (n>>>0)/4294967295; }
G.hash2 = hash2;
function sstep(t){ return t*t*(3-2*t); }
G.vnoise = function(x,y,s){
  var xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi;
  var a=hash2(xi,yi,s), b=hash2(xi+1,yi,s), c=hash2(xi,yi+1,s), d=hash2(xi+1,yi+1,s);
  var u=sstep(xf), v=sstep(yf);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
};
G.fbm = function(x,y,oct,s){
  var v=0, amp=0.5, f=1, tot=0;
  for(var i=0;i<oct;i++){ v+=amp*G.vnoise(x*f,y*f,(s||0)+i*131); tot+=amp; amp*=0.5; f*=2.03; }
  return v/tot;
};

/* ---------- Math ---------- */
G.clamp=function(v,a,b){return v<a?a:(v>b?b:v);};
G.lerp=function(a,b,t){return a+(b-a)*t;};
G.smooth=function(a,b,t){ t=G.clamp((t-a)/(b-a),0,1); return t*t*(3-2*t); };
G.angDiff=function(a,b){ var d=(b-a)%(Math.PI*2); if(d>Math.PI)d-=Math.PI*2; if(d<-Math.PI)d+=Math.PI*2; return d; };
G.angLerp=function(a,b,t){ return a+G.angDiff(a,b)*G.clamp(t,0,1); };
G.dist2=function(ax,az,bx,bz){ var dx=ax-bx,dz=az-bz; return dx*dx+dz*dz; };
G.track=function(t,pts){
  if(t<=pts[0][0]) return pts[0][1];
  for(var i=1;i<pts.length;i++){ if(t<=pts[i][0]){ var p0=pts[i-1],p1=pts[i]; return G.lerp(p0[1],p1[1],(t-p0[0])/(p1[0]-p0[0])); } }
  return pts[pts.length-1][1];
};
G.pick=function(arr,rng){ return arr[Math.floor((rng||Math.random)()*arr.length)]; };

/* ---------- Geometry helpers ---------- */
G.geo = {
  box:function(w,h,d,x,y,z,rx,ry,rz,col){
    var g=new THREE.BoxGeometry(w,h,d);
    if(rx||ry||rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx||0,ry||0,rz||0)));
    g.translate(x||0,y||0,z||0);
    if(col!==undefined) G.geo.paint(g,col);
    return g;
  },
  cyl:function(rt,rb,h,seg,x,y,z,col){
    var g=new THREE.CylinderGeometry(rt,rb,h,seg||6);
    g.translate(x||0,y||0,z||0);
    if(col!==undefined) G.geo.paint(g,col);
    return g;
  },
  cone:function(r,h,seg,x,y,z,col){
    var g=new THREE.ConeGeometry(r,h,seg||6);
    g.translate(x||0,y||0,z||0);
    if(col!==undefined) G.geo.paint(g,col);
    return g;
  },
  sph:function(r,ws,hs,x,y,z,col){
    var g=new THREE.SphereGeometry(r,ws||6,hs||5);
    g.translate(x||0,y||0,z||0);
    if(col!==undefined) G.geo.paint(g,col);
    return g;
  },
  paint:function(g,hex){
    var c=new THREE.Color(hex), n=g.attributes.position.count, arr=new Float32Array(n*3);
    for(var i=0;i<n;i++){ arr[i*3]=c.r; arr[i*3+1]=c.g; arr[i*3+2]=c.b; }
    g.setAttribute('color',new THREE.BufferAttribute(arr,3));
    return g;
  },
  merge:function(list){
    var total=0, idxTotal=0;
    list.forEach(function(g){ total+=g.attributes.position.count; idxTotal+=g.index?g.index.count:g.attributes.position.count; });
    var pos=new Float32Array(total*3), nor=new Float32Array(total*3), col=new Float32Array(total*3), idx=new Uint32Array(idxTotal);
    var vo=0, io=0;
    list.forEach(function(g){
      var p=g.attributes.position, n=g.attributes.normal, c=g.attributes.color;
      pos.set(p.array,vo*3); nor.set(n.array,vo*3);
      if(c) col.set(c.array,vo*3); else { for(var i=0;i<p.count*3;i++) col[vo*3+i]=1; }
      if(g.index){ var ia=g.index.array; for(var j=0;j<ia.length;j++) idx[io+j]=ia[j]+vo; io+=ia.length; }
      else { for(var k=0;k<p.count;k++) idx[io+k]=vo+k; io+=p.count; }
      vo+=p.count;
    });
    var out=new THREE.BufferGeometry();
    out.setAttribute('position',new THREE.BufferAttribute(pos,3));
    out.setAttribute('normal',new THREE.BufferAttribute(nor,3));
    out.setAttribute('color',new THREE.BufferAttribute(col,3));
    out.setIndex(new THREE.BufferAttribute(idx,1));
    return out;
  }
};

/* ---------- Temp objects ---------- */
G.tmp = {
  v1:null,v2:null,v3:null,m1:null,m2:null,q1:null,e1:null,
  init:function(){
    this.v1=new THREE.Vector3(); this.v2=new THREE.Vector3(); this.v3=new THREE.Vector3();
    this.m1=new THREE.Matrix4(); this.m2=new THREE.Matrix4();
    this.q1=new THREE.Quaternion(); this.e1=new THREE.Euler();
  }
};

/* ---------- Input ---------- */
G.input = {
  keys:{}, pressed:{}, mouse:{dx:0,dy:0,wheel:0,l:false,r:false,lp:false,rp:false,lr:false,rr:false},
  locked:false, wantLock:false, canvas:null,
  init:function(canvas){
    var self=this; this.canvas=canvas;
    window.addEventListener('keydown',function(e){
      if(e.repeat) return;
      self.keys[e.code]=true; self.pressed[e.code]=true;
      if(['Tab','F1','F2','F3','F4','Space','AltLeft'].indexOf(e.code)>=0) e.preventDefault();
      if(e.code==='KeyW'&&e.ctrlKey) e.preventDefault();
    });
    window.addEventListener('keyup',function(e){ self.keys[e.code]=false; });
    window.addEventListener('blur',function(){ self.keys={}; self.mouse.l=false; self.mouse.r=false; });
    canvas.addEventListener('mousedown',function(e){
      if(!self.locked && G.started && !G.ui.anyModal()){ self.requestLock(); return; }
      if(e.button===0){ self.mouse.l=true; self.mouse.lp=true; }
      if(e.button===2){ self.mouse.r=true; self.mouse.rp=true; }
    });
    window.addEventListener('mouseup',function(e){
      if(e.button===0){ if(self.mouse.l) self.mouse.lr=true; self.mouse.l=false; }
      if(e.button===2){ if(self.mouse.r) self.mouse.rr=true; self.mouse.r=false; }
    });
    window.addEventListener('mousemove',function(e){
      if(self.locked){ self.mouse.dx+=e.movementX; self.mouse.dy+=e.movementY; }
    });
    window.addEventListener('wheel',function(e){ self.mouse.wheel+=Math.sign(e.deltaY); },{passive:true});
    window.addEventListener('contextmenu',function(e){ e.preventDefault(); });
    document.addEventListener('pointerlockchange',function(){
      self.locked = document.pointerLockElement===canvas;
      if(!self.locked && G.started && !G.ui.anyModal()) G.ui.openPause();
    });
  },
  requestLock:function(){ try{ this.canvas.requestPointerLock(); }catch(e){} },
  exitLock:function(){ if(this.locked) document.exitPointerLock(); },
  endFrame:function(){
    this.pressed={}; this.mouse.dx=0; this.mouse.dy=0; this.mouse.wheel=0;
    this.mouse.lp=false; this.mouse.rp=false; this.mouse.lr=false; this.mouse.rr=false;
  }
};

/* ---------- Audio (procedural) ---------- */
G.audio = {
  ctx:null, master:null, noiseBuf:null, started:false, lastT:{},
  init:function(){
    if(this.started) return;
    try{
      var AC=window.AudioContext||window.webkitAudioContext;
      this.ctx=new AC(); this.master=this.ctx.createGain(); this.master.gain.value=0.5;
      this.master.connect(this.ctx.destination);
      var len=this.ctx.sampleRate*1.5, buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate), d=buf.getChannelData(0);
      for(var i=0;i<len;i++) d[i]=Math.random()*2-1;
      this.noiseBuf=buf; this.started=true;
      this.startWind();
    }catch(e){}
  },
  resume:function(){ if(this.ctx&&this.ctx.state==='suspended') this.ctx.resume(); },
  env:function(g,t0,a,peak,dec){
    g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(peak,t0+a);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+a+dec);
  },
  noise:function(t0,dur,f0,f1,peak,type,pan){
    var c=this.ctx, src=c.createBufferSource(); src.buffer=this.noiseBuf; src.loop=true;
    var flt=c.createBiquadFilter(); flt.type=type||'bandpass'; flt.frequency.setValueAtTime(f0,t0);
    if(f1) flt.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
    flt.Q.value=1.2;
    var g=c.createGain(); this.env(g,t0,0.005,peak,dur);
    var p=c.createStereoPanner?c.createStereoPanner():null;
    src.connect(flt); flt.connect(g);
    if(p){ p.pan.value=pan||0; g.connect(p); p.connect(this.master);} else g.connect(this.master);
    src.start(t0); src.stop(t0+dur+0.1);
  },
  tone:function(t0,dur,f0,f1,peak,type,pan){
    var c=this.ctx, o=c.createOscillator(); o.type=type||'sine';
    o.frequency.setValueAtTime(f0,t0); if(f1) o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
    var g=c.createGain(); this.env(g,t0,0.004,peak,dur);
    var p=c.createStereoPanner?c.createStereoPanner():null;
    o.connect(g); if(p){ p.pan.value=pan||0; g.connect(p); p.connect(this.master);} else g.connect(this.master);
    o.start(t0); o.stop(t0+dur+0.1);
  },
  play:function(name,vol,pan){
    if(!this.started) return; this.resume();
    vol=vol===undefined?1:vol; pan=pan||0;
    var now=this.ctx.currentTime;
    if(this.lastT[name] && now-this.lastT[name]<0.03) return;
    this.lastT[name]=now;
    switch(name){
      case 'swing': this.noise(now,0.16,500,1600,0.22*vol,'bandpass',pan); break;
      case 'clang':
        this.tone(now,0.22,1750+Math.random()*300,900,0.16*vol,'triangle',pan);
        this.tone(now,0.16,2600+Math.random()*400,1400,0.10*vol,'sine',pan);
        this.noise(now,0.06,3000,1500,0.12*vol,'highpass',pan); break;
      case 'hit':
        this.noise(now,0.13,320,120,0.30*vol,'lowpass',pan);
        this.tone(now,0.09,110,60,0.25*vol,'sine',pan); break;
      case 'shield': this.noise(now,0.12,600,250,0.26*vol,'bandpass',pan); break;
      case 'bow': this.tone(now,0.12,180,70,0.22*vol,'triangle',pan); this.noise(now,0.05,2000,900,0.1*vol,'highpass',pan); break;
      case 'arrowhit': this.noise(now,0.08,900,300,0.2*vol,'bandpass',pan); break;
      case 'die': this.noise(now,0.4,300,70,0.22*vol,'lowpass',pan); break;
      case 'horse': this.noise(now,0.3,200,60,0.2*vol,'lowpass',pan); break;
      case 'coin': this.tone(now,0.09,1900,1900,0.14*vol,'sine',pan); this.tone(now+0.07,0.12,2450,2450,0.12*vol,'sine',pan); break;
      case 'click': this.tone(now,0.05,850,700,0.10*vol,'square',pan); break;
      case 'gate': this.noise(now,0.7,250,50,0.5*vol,'lowpass',pan); break;
      case 'thunder': this.noise(now,1.4,180,40,0.5*vol,'lowpass',pan); break;
      case 'levelup':
        this.tone(now,0.12,660,660,0.14,'triangle'); this.tone(now+0.1,0.12,880,880,0.14,'triangle');
        this.tone(now+0.2,0.2,1320,1320,0.14,'triangle'); break;
      case 'roll': this.noise(now,0.2,400,150,0.15*vol,'lowpass',pan); break;
      case 'charge':
        this.tone(now,0.3,392,392,0.13,'sawtooth'); this.tone(now+0.25,0.3,523,523,0.13,'sawtooth');
        this.tone(now+0.5,0.5,659,659,0.15,'sawtooth'); break;
    }
  },
  play3d:function(name,pos,vol){
    if(!this.started||!G.player||!G.player.unit) return;
    var p=G.player.unit.pos, dx=pos.x-p.x, dz=pos.z-p.z, d=Math.sqrt(dx*dx+dz*dz);
    if(d>70) return;
    var v=(vol===undefined?1:vol)*G.clamp(1-d/70,0,1);
    var yaw=G.player.camYaw||0;
    var pan=G.clamp((Math.cos(yaw)*dx - Math.sin(yaw)*dz)/25,-1,1)*0.8;
    this.play(name,v,pan);
  },
  windGain:null, rainGain:null,
  startWind:function(){
    var c=this.ctx;
    var src=c.createBufferSource(); src.buffer=this.noiseBuf; src.loop=true;
    var f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=320; f.Q.value=0.4;
    this.windGain=c.createGain(); this.windGain.gain.value=0.03;
    src.connect(f); f.connect(this.windGain); this.windGain.connect(this.master); src.start();
    var src2=c.createBufferSource(); src2.buffer=this.noiseBuf; src2.loop=true; src2.playbackRate.value=1.7;
    var f2=c.createBiquadFilter(); f2.type='highpass'; f2.frequency.value=1500;
    this.rainGain=c.createGain(); this.rainGain.gain.value=0.0;
    src2.connect(f2); f2.connect(this.rainGain); this.rainGain.connect(this.master); src2.start();
  },
  setAmbience:function(wind,rain){
    if(!this.started) return;
    this.windGain.gain.setTargetAtTime(wind,this.ctx.currentTime,1.5);
    this.rainGain.gain.setTargetAtTime(rain,this.ctx.currentTime,1.5);
  }
};
})();
