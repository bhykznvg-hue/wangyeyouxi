// ============ 3D 空间音效引擎 (Web Audio + HRTF) ============
const Sfx = (() => {
  let ctx = null, master = null;
  let inited = false;
  let loops = {};

  function init() {
    if (inited) return;
    inited = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createDynamicsCompressor();
    master.threshold.value = -18;
    master.connect(ctx.destination);
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  const now = () => ctx.currentTime;

  // ---------- 监听者同步 (每帧) ----------
  function updateListener(pos, dir) {
    if (!ctx) return;
    const l = ctx.listener;
    if (l.positionX) {
      l.positionX.value = pos.x; l.positionY.value = pos.y; l.positionZ.value = pos.z;
      l.forwardX.value = dir.x; l.forwardY.value = dir.y; l.forwardZ.value = dir.z;
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else {
      l.setPosition(pos.x, pos.y, pos.z);
      l.setOrientation(dir.x, dir.y, dir.z, 0, 1, 0);
    }
  }

  function makePanner(x, y, z, refDist = 2, maxDist = 40) {
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = refDist;
    p.maxDistance = maxDist;
    p.rolloffFactor = 1.4;
    p.setPosition(x, y, z);
    return p;
  }

  // ---------- 基础工具 ----------
  function env(g, t0, a, peak, d, r = 0.08) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d + r);
  }
  function osc(type, freq, t0, dur, out) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    o.connect(out);
    o.start(t0); o.stop(t0 + dur + 0.15);
    return o;
  }
  function noiseBuf(dur = 1) {
    const len = Math.max(1, (ctx.sampleRate * dur) | 0);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function playNoise(t0, dur, peak, fType, f0, f1, q = 1, out = master) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(Math.min(dur + 0.3, 3));
    src.loop = dur > 2.5;
    const f = ctx.createBiquadFilter();
    f.type = fType; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    if (f1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t0 + dur);
    const g = ctx.createGain();
    env(g, t0, Math.min(0.02, dur * 0.2), peak, dur * 0.7, dur * 0.3);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t0); src.stop(t0 + dur + 0.4);
  }

  // ---------- 荧光灯嗡鸣 (全局底噪 + 空间源) ----------
  function ambientLoop() {
    if (!ctx || loops.amb) return;
    const t0 = now();
    // 60Hz 电流嗡鸣 (主体)
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 120;
    const f1 = ctx.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = 420;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.0001, t0);
    g1.gain.linearRampToValueAtTime(0.028, t0 + 3);
    o1.connect(f1); f1.connect(g1); g1.connect(master);
    // 高频镇流器啸叫
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 7860;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.linearRampToValueAtTime(0.006, t0 + 4);
    o2.connect(g2); g2.connect(master);
    // 空调低鸣
    const src = ctx.createBufferSource(); src.buffer = noiseBuf(3); src.loop = true;
    const f3 = ctx.createBiquadFilter(); f3.type = 'lowpass'; f3.frequency.value = 130;
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.0001, t0);
    g3.gain.linearRampToValueAtTime(0.05, t0 + 5);
    src.connect(f3); f3.connect(g3); g3.connect(master);
    o1.start(); o2.start(); src.start();
    loops.amb = { nodes: [o1, o2, src] };
    scheduleAmbient();
  }

  // 随机远处声响 (空间化)
  let ambTimer = null;
  function scheduleAmbient() {
    const fire = () => {
      if (!ctx) return;
      const r = Math.random();
      const a = Math.random() * Math.PI * 2;
      const d = 15 + Math.random() * 25;
      const px = listenerPos.x + Math.cos(a) * d;
      const pz = listenerPos.z + Math.sin(a) * d;
      if (r < 0.35) distantThump(px, pz);
      else if (r < 0.55) lightBuzzPop(px, pz);
      else if (r < 0.7) hvacRumble();
      ambTimer = setTimeout(fire, 12000 + Math.random() * 25000);
    };
    ambTimer = setTimeout(fire, 10000);
  }
  const listenerPos = { x: 0, z: 0 };
  function setListenerPos(x, z) { listenerPos.x = x; listenerPos.z = z; }

  function distantThump(x, z) {
    const t0 = now();
    const p = makePanner(x, 2, z, 4, 60);
    p.connect(master);
    const g = ctx.createGain();
    env(g, t0, 0.02, 0.5, 0.5);
    g.connect(p);
    osc('sine', 48 + Math.random() * 20, t0, 0.6, g);
    playNoise(t0, 0.4, 0.3, 'lowpass', 200, 60, 1, p);
  }
  function lightBuzzPop(x, z) {
    const t0 = now();
    const p = makePanner(x, 4.5, z, 3, 40);
    p.connect(master);
    playNoise(t0, 0.3, 0.4, 'highpass', 3000, 5000, 2, p);
  }
  function hvacRumble() {
    const t0 = now();
    playNoise(t0, 3, 0.04, 'lowpass', 90, 50);
  }

  // ---------- 脚步 (地毯) ----------
  let lastStep = 0;
  function footstep(mode = 'walk') {
    if (!ctx) return;
    const t = performance.now();
    const interval = mode === 'run' ? 320 : mode === 'crouch' ? 750 : 500;
    if (t - lastStep < interval) return;
    lastStep = t;
    const t0 = now();
    const vol = mode === 'run' ? 0.16 : mode === 'crouch' ? 0.025 : 0.07;
    playNoise(t0, 0.08, vol, 'lowpass', 260 + Math.random() * 100, 90);
    const g = ctx.createGain();
    env(g, t0, 0.006, vol * 0.4, 0.07);
    g.connect(master);
    osc('sine', 62 + Math.random() * 20, t0, 0.09, g);
  }

  // 怪物脚步 (空间化, 沉重)
  function entityStep(x, z, running) {
    if (!ctx) return;
    const t0 = now();
    const p = makePanner(x, 0.3, z, 2.5, 45);
    p.connect(master);
    const g = ctx.createGain();
    env(g, t0, 0.008, running ? 0.85 : 0.5, 0.16);
    g.connect(p);
    osc('sine', 52 + Math.random() * 14, t0, 0.2, g);
    playNoise(t0, 0.1, running ? 0.5 : 0.3, 'lowpass', 300, 80, 1, p);
  }

  // 怪物叫声 (空间化)
  function entityVocal(x, z, aggro = false) {
    if (!ctx) return;
    const t0 = now();
    const p = makePanner(x, 1.6, z, 3, 55);
    p.connect(master);
    const g = ctx.createGain();
    const dur = aggro ? 1.1 : 1.8;
    env(g, t0, 0.2, aggro ? 0.7 : 0.35, dur * 0.7);
    g.connect(p);
    const base = aggro ? 130 : 75;
    const o = osc('sawtooth', base, t0, dur, g);
    o.frequency.linearRampToValueAtTime(base * (aggro ? 1.8 : 0.7), t0 + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = aggro ? 900 : 350;
    o.disconnect(); o.connect(f); f.connect(g);
    const lfo = ctx.createOscillator(); lfo.frequency.value = aggro ? 19 : 9;
    const lg = ctx.createGain(); lg.gain.value = 22;
    lfo.connect(lg); lg.connect(o.frequency);
    lfo.start(t0); lfo.stop(t0 + dur);
  }

  // ---------- 电闸 ----------
  let breakerHums = [];
  function breakerHum(x, z) {
    if (!ctx) return null;
    const p = makePanner(x, 1.4, z, 1.5, 26);
    p.connect(master);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 92;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = 3;
    const g = ctx.createGain(); g.gain.value = 0.5;
    o.connect(f); f.connect(g); g.connect(p);
    o.start();
    const h = { o, g };
    breakerHums.push(h);
    return h;
  }
  function breakerPull() {
    const t0 = now();
    // 沉重的机械咔哒
    const g = ctx.createGain();
    env(g, t0, 0.004, 0.5, 0.12);
    g.connect(master);
    osc('square', 160, t0, 0.1, g);
    playNoise(t0, 0.15, 0.4, 'lowpass', 800, 200);
    // 电力涌入
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t0 + 0.2);
    g2.gain.linearRampToValueAtTime(0.14, t0 + 1.2);
    g2.gain.linearRampToValueAtTime(0.0001, t0 + 2.2);
    g2.connect(master);
    const o = osc('sawtooth', 40, t0 + 0.2, 2.2, g2);
    o.frequency.linearRampToValueAtTime(120, t0 + 2.2);
  }

  // ---------- 提示音 ----------
  function uiSelect() {
    if (!ctx) return;
    const t0 = now(), g = ctx.createGain();
    env(g, t0, 0.005, 0.1, 0.1);
    g.connect(master);
    osc('triangle', 520, t0, 0.14, g);
  }
  function paperRustle() {
    if (!ctx) return;
    const t0 = now();
    for (let i = 0; i < 3; i++) {
      playNoise(t0 + i * 0.06, 0.08, 0.06, 'highpass', 2400 + Math.random() * 800, 3600, 0.6);
    }
  }
  // 喝杏仁水: 开瓶嘶声 + 三声吞咽
  function drink() {
    if (!ctx) return;
    const t0 = now();
    playNoise(t0, 0.12, 0.05, 'highpass', 2800, 4200, 0.8);
    for (let i = 0; i < 3; i++) {
      const tt = t0 + 0.25 + i * 0.28;
      const g = ctx.createGain();
      env(g, tt, 0.02, 0.1, 0.1);
      g.connect(master);
      const o = osc('sine', 220 - i * 25, tt, 0.14, g);
      o.frequency.exponentialRampToValueAtTime(90, tt + 0.13);
      playNoise(tt, 0.07, 0.03, 'bandpass', 700, 400, 1.5);
    }
  }
  function stinger(intensity = 1) {
    if (!ctx) return;
    const t0 = now();
    [180, 190.5, 381, 571].forEach(fr => {
      const g = ctx.createGain();
      env(g, t0, 0.02, 0.08 * intensity, 1.2);
      g.connect(master);
      const o = osc('sawtooth', fr * (0.99 + Math.random() * 0.02), t0, 1.4, g);
      o.frequency.linearRampToValueAtTime(fr * 1.05, t0 + 1.3);
    });
    playNoise(t0, 0.6, 0.09 * intensity, 'highpass', 1600, 4000);
  }

  // ---------- 心跳 / 追逐 ----------
  function heartbeat(rate = 1) {
    stopHeartbeat();
    const beat = () => {
      if (!ctx) return;
      const t0 = now();
      [0, 0.3 / rate].forEach((dtt, i) => {
        const g = ctx.createGain();
        env(g, t0 + dtt, 0.012, i === 0 ? 0.16 : 0.11, 0.15);
        g.connect(master);
        osc('sine', i === 0 ? 56 : 46, t0 + dtt, 0.2, g);
      });
    };
    beat();
    loops.heart = setInterval(beat, 850 / rate);
  }
  function stopHeartbeat() {
    if (loops.heart) { clearInterval(loops.heart); delete loops.heart; }
  }

  function chaseLoop(on) {
    if (on && !loops.chase) {
      const t0 = now();
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55;
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 55.7;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.11, t0 + 1.5);
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(master);
      // 打击脉冲
      const pulse = setInterval(() => {
        if (!ctx) return;
        const tt = now();
        const pg = ctx.createGain();
        env(pg, tt, 0.005, 0.14, 0.1);
        pg.connect(master);
        osc('sine', 70, tt, 0.14, pg);
        playNoise(tt, 0.05, 0.08, 'highpass', 2000, 3000);
      }, 430);
      o1.start(); o2.start();
      loops.chase = { nodes: [o1, o2], g, pulse };
    } else if (!on && loops.chase) {
      const l = loops.chase;
      const t0 = now();
      l.g.gain.cancelScheduledValues(t0);
      l.g.gain.setValueAtTime(l.g.gain.value, t0);
      l.g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
      clearInterval(l.pulse);
      setTimeout(() => l.nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 1400);
      delete loops.chase;
    }
  }

  function breathing(on) {
    if (on && !loops.breath) {
      loops.breath = setInterval(() => {
        if (!ctx) return;
        const t0 = now();
        playNoise(t0, 0.5, 0.05, 'bandpass', 700, 500, 1.5);
      }, 900);
    } else if (!on && loops.breath) {
      clearInterval(loops.breath);
      delete loops.breath;
    }
  }

  function caught() {
    if (!ctx) return;
    const t0 = now();
    [700, 741, 990, 1480].forEach(fr => {
      const g = ctx.createGain();
      env(g, t0, 0.01, 0.13, 1);
      g.connect(master);
      const o = osc('sawtooth', fr, t0, 1.1, g);
      o.frequency.linearRampToValueAtTime(fr * 0.5, t0 + 1);
    });
    playNoise(t0, 1.6, 0.3, 'highpass', 500, 250);
    const g2 = ctx.createGain();
    env(g2, t0, 0.01, 0.24, 1.4);
    g2.connect(master);
    osc('sine', 44, t0, 1.5, g2);
  }

  function exitHum() {
    if (!ctx) return;
    const t0 = now();
    [261, 329, 392].forEach((fr, i) => {
      const g = ctx.createGain();
      env(g, t0 + i * 0.15, 0.4, 0.06, 2.4);
      g.connect(master);
      osc('sine', fr, t0 + i * 0.15, 3, g);
    });
  }

  return {
    init, resume, updateListener, setListenerPos,
    ambientLoop, footstep, entityStep, entityVocal,
    breakerHum, breakerPull, uiSelect, paperRustle, stinger, drink,
    heartbeat, stopHeartbeat, chaseLoop, breathing, caught, exitHum,
    distantThump,
  };
})();
