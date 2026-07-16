// ============ 环境音效 (水声氛围) ============
const Sfx = (() => {
  let ctx = null, master = null;
  let inited = false;
  let loops = {};

  function init() {
    if (inited) return;
    inited = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  const now = () => ctx.currentTime;

  function noiseBuf(dur = 1) {
    const len = Math.max(1, (ctx.sampleRate * dur) | 0);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function env(g, t0, a, peak, d, r = 0.08) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d + r);
  }
  function playNoise(t0, dur, peak, type, f0, f1, q = 1, out = master) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(Math.min(dur + 0.3, 3));
    src.loop = dur > 2.5;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    if (f1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t0 + dur);
    const g = ctx.createGain();
    env(g, t0, Math.min(0.03, dur * 0.2), peak, dur * 0.7, dur * 0.3);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t0); src.stop(t0 + dur + 0.4);
  }

  // ---------- 大厅水声氛围 ----------
  function ambient() {
    if (!ctx || loops.amb) return;
    const t0 = now();
    // 低频空间共鸣
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 46;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 61;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.0001, t0);
    g1.gain.linearRampToValueAtTime(0.035, t0 + 4);
    o1.connect(g1); o2.connect(g1); g1.connect(master);
    // 水面轻涌 (滤波噪声 + 慢 LFO)
    const src = ctx.createBufferSource(); src.buffer = noiseBuf(3); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
    const lfoG = ctx.createGain(); lfoG.gain.value = 190;
    lfo.connect(lfoG); lfoG.connect(f.frequency);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.linearRampToValueAtTime(0.022, t0 + 5);
    src.connect(f); f.connect(g2); g2.connect(master);
    // 高频空气感
    const src2 = ctx.createBufferSource(); src2.buffer = noiseBuf(2.7); src2.loop = true;
    const f2 = ctx.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 5200;
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.0001, t0);
    g3.gain.linearRampToValueAtTime(0.006, t0 + 6);
    src2.connect(f2); f2.connect(g3); g3.connect(master);
    o1.start(); o2.start(); src.start(); lfo.start(); src2.start();
    loops.amb = { nodes: [o1, o2, src, lfo, src2] };
    scheduleDrips();
  }

  // 随机滴水回声
  let dripTimer = null;
  function scheduleDrips() {
    const fire = () => {
      if (!ctx) return;
      drip();
      dripTimer = setTimeout(fire, 2400 + Math.random() * 7000);
    };
    dripTimer = setTimeout(fire, 2000);
  }
  function drip() {
    const t0 = now();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const out = pan || master;
    if (pan) { pan.pan.value = (Math.random() - 0.5) * 1.6; pan.connect(master); }
    // 滴 (短促正弦滑音)
    const g = ctx.createGain();
    const vol = 0.03 + Math.random() * 0.05;
    env(g, t0, 0.002, vol, 0.09);
    g.connect(out);
    const o = ctx.createOscillator();
    o.type = 'sine';
    const f0 = 800 + Math.random() * 1400;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.7, t0 + 0.05);
    o.connect(g);
    o.start(t0); o.stop(t0 + 0.15);
    // 回声 (两次衰减重复)
    [0.25, 0.55].forEach((dt, i) => {
      const g2 = ctx.createGain();
      env(g2, t0 + dt, 0.004, vol * (0.4 - i * 0.15), 0.12);
      g2.connect(out);
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(f0 * 0.98, t0 + dt);
      o2.connect(g2);
      o2.start(t0 + dt); o2.stop(t0 + dt + 0.18);
    });
  }

  // ---------- 脚步 ----------
  let lastStep = 0;
  function footstep(mode = 'walk') {
    if (!ctx) return;
    const t = performance.now();
    const interval = mode === 'run' ? 340 : 520;
    if (t - lastStep < interval) return;
    lastStep = t;
    const t0 = now();
    const vol = mode === 'run' ? 0.09 : 0.05;
    // 瓷砖硬底脚步
    playNoise(t0, 0.05, vol, 'lowpass', 900, 200);
    const g = ctx.createGain();
    env(g, t0, 0.003, vol * 0.6, 0.05);
    g.connect(master);
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = 110 + Math.random() * 40;
    o.connect(g);
    o.start(t0); o.stop(t0 + 0.08);
  }

  // 涉水脚步
  function wadeStep(mode = 'walk') {
    if (!ctx) return;
    const t = performance.now();
    const interval = mode === 'run' ? 380 : 580;
    if (t - lastStep < interval) return;
    lastStep = t;
    const t0 = now();
    const vol = mode === 'run' ? 0.14 : 0.08;
    playNoise(t0, 0.22, vol, 'bandpass', 700 + Math.random() * 400, 300, 0.8);
    playNoise(t0 + 0.05, 0.15, vol * 0.5, 'highpass', 2000, 3500);
  }

  // ---------- 入水 / 出水 ----------
  function splash(big = false) {
    if (!ctx) return;
    const t0 = now();
    const vol = big ? 0.3 : 0.14;
    playNoise(t0, 0.5, vol, 'bandpass', 900, 250, 0.7);
    playNoise(t0 + 0.06, 0.6, vol * 0.6, 'highpass', 1800, 4000);
    const g = ctx.createGain();
    env(g, t0, 0.01, vol * 0.5, 0.3);
    g.connect(master);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(190, t0);
    o.frequency.exponentialRampToValueAtTime(60, t0 + 0.35);
    o.connect(g);
    o.start(t0); o.stop(t0 + 0.5);
  }

  // ---------- 水下状态 ----------
  function setUnderwater(on) {
    if (!ctx) return;
    if (on && !loops.uw) {
      const t0 = now();
      // 低沉水下轰鸣
      const src = ctx.createBufferSource(); src.buffer = noiseBuf(3); src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.09, t0 + 0.4);
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
      // 气泡
      const bubbleTimer = setInterval(() => {
        if (!ctx) return;
        const tb = now();
        const gb = ctx.createGain();
        env(gb, tb, 0.005, 0.02 + Math.random() * 0.02, 0.08);
        gb.connect(master);
        const ob = ctx.createOscillator();
        ob.type = 'sine';
        const fb = 300 + Math.random() * 500;
        ob.frequency.setValueAtTime(fb, tb);
        ob.frequency.exponentialRampToValueAtTime(fb * 2.2, tb + 0.09);
        ob.connect(gb);
        ob.start(tb); ob.stop(tb + 0.12);
      }, 700 + Math.random() * 600);
      // 主环境闷化
      if (loops.amb) master.gain.linearRampToValueAtTime(0.45, t0 + 0.3);
      loops.uw = { nodes: [src], timer: bubbleTimer };
    } else if (!on && loops.uw) {
      const l = loops.uw;
      clearInterval(l.timer);
      l.nodes.forEach(n => { try { n.stop(); } catch (e) {} });
      master.gain.linearRampToValueAtTime(0.7, now() + 0.3);
      delete loops.uw;
    }
  }

  // 游泳划水
  let lastStroke = 0;
  function swimStroke() {
    if (!ctx) return;
    const t = performance.now();
    if (t - lastStroke < 900) return;
    lastStroke = t;
    const t0 = now();
    playNoise(t0, 0.4, 0.07, 'bandpass', 600, 250, 0.8);
    playNoise(t0 + 0.1, 0.3, 0.04, 'highpass', 1500, 3000);
  }

  return {
    init, resume, ambient, footstep, wadeStep, splash, setUnderwater, swimStroke, drip,
  };
})();
