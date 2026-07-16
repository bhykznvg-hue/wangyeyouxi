// ============ audio.js : WebAudio合成音效 + 原创芯片音乐序列器 + 播报 ============
'use strict';
const SND = (() => {
  let ac = null, sfxGain = null, bgmGain = null, started = false;
  let musicTimer = null, curTrack = null;

  function init(){
    if (started) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      sfxGain = ac.createGain(); sfxGain.connect(ac.destination);
      bgmGain = ac.createGain(); bgmGain.connect(ac.destination);
      applyVol();
      started = true;
    } catch (e) { started = false; }
  }
  function applyVol(){
    if (!ac) return;
    sfxGain.gain.value = OPTS.sfxVol / 10 * 0.9;
    bgmGain.gain.value = OPTS.bgmVol / 10 * 0.34;
  }
  function now(){ return ac ? ac.currentTime : 0; }

  // ---------- 基础合成器 ----------
  function tone(freq, dur, type, vol, t0, slide, dest){
    if (!ac) return;
    t0 = t0 || now();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  let noiseBuf = null;
  function getNoise(){
    if (!ac) return null;
    if (!noiseBuf){
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function noise(dur, vol, t0, fLo, fHi, slideTo, dest){
    if (!ac) return;
    t0 = t0 || now();
    const s = ac.createBufferSource(); s.buffer = getNoise(); s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.setValueAtTime(fHi || 2000, t0);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    f.Q.value = 0.8;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxGain);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }
  function thump(freq, dur, vol, t0){ tone(freq, dur, 'sine', vol, t0, freq * 0.4); }

  // ---------- 打击音效库 (90s街机风) ----------
  const SFX = {
    hit_l(){ noise(0.09, 0.5, 0, 0, 2600, 900); thump(160, 0.09, 0.5); },
    hit_h(){ noise(0.16, 0.7, 0, 0, 1800, 500); thump(110, 0.16, 0.9); tone(70, 0.12, 'square', 0.25, 0, 40); },
    hit_hh(){ noise(0.24, 0.85, 0, 0, 1500, 300); thump(85, 0.24, 1.1); tone(55, 0.2, 'sawtooth', 0.3, 0, 30); },
    whiff_l(){ noise(0.07, 0.22, 0, 0, 3800, 1800); },
    whiff_h(){ noise(0.13, 0.3, 0, 0, 2600, 800); },
    block(){ tone(900, 0.05, 'square', 0.3); noise(0.06, 0.3, 0, 0, 4200, 3000); thump(200, 0.07, 0.35); },
    jump(){ noise(0.09, 0.14, 0, 0, 1600, 3200); },
    land(){ noise(0.07, 0.28, 0, 0, 700, 260); thump(120, 0.06, 0.4); },
    roll(){ noise(0.16, 0.2, 0, 0, 1100, 2200); },
    dash(){ noise(0.12, 0.22, 0, 0, 1800, 3600); },
    throwGrab(){ noise(0.1, 0.4, 0, 0, 1500, 700); tone(300, 0.08, 'square', 0.3, 0, 150); },
    slam(){ noise(0.3, 0.9, 0, 0, 900, 150); thump(70, 0.3, 1.2); },
    fireball(){ noise(0.35, 0.4, 0, 0, 900, 2400); tone(220, 0.3, 'sawtooth', 0.22, 0, 440); },
    fire_hit(){ noise(0.3, 0.7, 0, 0, 1300, 400); tone(150, 0.25, 'sawtooth', 0.35, 0, 60); },
    elec(){ if(!ac)return; for (let i = 0; i < 6; i++) tone(U.rand(1400, 3400), 0.04, 'square', 0.22, now() + i * 0.035); noise(0.25, 0.3, 0, 0, 4200, 4200); },
    ice(){ tone(1800, 0.15, 'triangle', 0.3, 0, 3400); tone(2600, 0.12, 'sine', 0.24, now()+0.05, 4200); noise(0.12, 0.2, 0, 0, 5200, 6600); },
    slash(){ noise(0.12, 0.5, 0, 0, 5200, 1400); tone(1200, 0.07, 'sawtooth', 0.2, 0, 300); },
    charge(){ tone(140, 0.35, 'sawtooth', 0.22, 0, 480); noise(0.35, 0.18, 0, 0, 800, 3000); },
    maxOn(){ tone(90, 0.4, 'sawtooth', 0.5, 0, 260); noise(0.45, 0.5, 0, 0, 500, 2600); tone(1400, 0.3, 'square', 0.2, now()+0.1, 2800); },
    superFlash(){ tone(60, 0.5, 'sawtooth', 0.6, 0, 200); noise(0.5, 0.45, 0, 0, 400, 3400); },
    superHit(){ noise(0.4, 1.0, 0, 0, 1100, 200); thump(60, 0.4, 1.3); tone(45, 0.35, 'sawtooth', 0.4, 0, 25); },
    explode(){ noise(0.55, 1.0, 0, 0, 700, 90); thump(55, 0.5, 1.4); },
    ko(){ noise(0.7, 1.0, 0, 0, 800, 60); thump(48, 0.7, 1.5); tone(38, 0.6, 'sawtooth', 0.5, 0, 20); },
    counter(){ tone(1000, 0.08, 'square', 0.4); tone(1500, 0.1, 'square', 0.4, now()+0.06); },
    timer(){ tone(1100, 0.07, 'square', 0.35); },
    timerLow(){ tone(1500, 0.09, 'square', 0.45); tone(750, 0.09, 'square', 0.3, now()+0.09); },
    cursor(){ tone(700, 0.05, 'square', 0.3); },
    confirm(){ tone(600, 0.06, 'square', 0.35); tone(900, 0.1, 'square', 0.35, now()+0.06); },
    cancel(){ tone(500, 0.06, 'square', 0.3); tone(320, 0.09, 'square', 0.3, now()+0.05); },
    coin(){ tone(1244, 0.07, 'square', 0.4); tone(1864, 0.25, 'square', 0.4, now()+0.08); },
    powerup(){ if(!ac)return; [440,554,659,880].forEach((f,i)=>tone(f,0.09,'square',0.3,now()+i*0.06)); },
    round(){ tone(392, 0.14, 'square', 0.4); tone(523, 0.2, 'square', 0.4, now()+0.14); },
    tech(){ tone(880, 0.06, 'square', 0.35); noise(0.1, 0.25, 0, 0, 2600, 3600); },
    guardCrush(){ noise(0.3, 0.8, 0, 0, 3000, 500); tone(180, 0.25, 'square', 0.4, 0, 60); },
    shout_m(){ noise(0.14, 0.4, 0, 0, 620, 300); tone(180, 0.13, 'sawtooth', 0.28, 0, 120); },
    shout_f(){ noise(0.12, 0.35, 0, 0, 1050, 600); tone(340, 0.12, 'sawtooth', 0.24, 0, 240); },
    shout_b(){ noise(0.2, 0.5, 0, 0, 420, 180); tone(110, 0.2, 'sawtooth', 0.35, 0, 60); },
  };
  function sfx(name){ if (!started || !ac) return; const f = SFX[name]; if (f) f(); }

  // ---------- 语音播报 (Web Speech, 可关闭) ----------
  function voice(text, rate, pitch){
    if (!OPTS.voice) return;
    try {
      if (typeof speechSynthesis === 'undefined') return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate || 0.95; u.pitch = pitch || 0.6; u.volume = 0.9; u.lang = 'en-US';
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ---------- 音乐序列器 (全部原创小曲) ----------
  // 音名转频率
  const NOTE_IDX = { C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11 };
  function nf(n){
    if (!n || n === '-') return 0;
    const m = /^([A-G]#?)(\d)$/.exec(n); if (!m) return 0;
    return 440 * Math.pow(2, (NOTE_IDX[m[1]] - 9 + (parseInt(m[2]) - 4) * 12) / 12);
  }
  // 曲目: {bpm, sub(每拍细分), bass[], lead[], arp[], drum[]}  drum: k=kick s=snare h=hat
  const TRACKS = {
    title: { bpm: 112, sub: 2,
      bass: 'A2 - A2 - C3 - A2 - F2 - F2 - G2 - G2 - A2 - A2 - C3 - A2 - D3 - D3 - E3 - E3 -'.split(' '),
      lead: 'A4 - C5 E5 - D5 C5 - A4 - - - C5 D5 E5 - G5 - E5 D5 C5 - A4 - - C5 - D5 - E5 - - -'.split(' '),
      arp:  'A3 C4 E4 C4 A3 C4 E4 C4 F3 A3 C4 A3 G3 B3 D4 B3 A3 C4 E4 C4 A3 C4 E4 C4 D3 F3 A3 F3 E3 G3 B3 G3'.split(' '),
      drum: 'k h s h k h s h k h s h k h s s k h s h k h s h k h s h k s s s'.split(' ') },
    select: { bpm: 132, sub: 2,
      bass: 'D3 D3 - D3 F3 - D3 - A2 A2 - A2 C3 - A2 - G2 G2 - G2 A#2 - G2 - A2 A2 - A2 C3 D3 E3 -'.split(' '),
      lead: 'D5 - F5 - A5 - G5 F5 E5 - - C5 - D5 E5 - F5 - - D5 - A#4 - C5 D5 - - - E5 - F5 -'.split(' '),
      arp:  'D4 F4 A4 F4 D4 F4 A4 F4 A3 C4 E4 C4 A3 C4 E4 C4 G3 A#3 D4 A#3 G3 A#3 D4 A#3 A3 C4 E4 C4 A3 C4 E4 C4'.split(' '),
      drum: 'k h h s k h h s k h h s k h s s k h h s k h h s k h h s k s k s'.split(' ') },
    stage1: { bpm: 150, sub: 2,
      bass: 'E3 E3 E3 - G3 - E3 - A2 A2 A2 - C3 - A2 - D3 D3 D3 - F3 - D3 - B2 B2 C3 C3 D3 D3 D#3 D#3'.split(' '),
      lead: 'E5 - G5 E5 B4 - E5 - A4 - C5 A4 E5 - C5 - D5 - F5 D5 A4 - D5 F5 G5 - F5 D5 B4 - G4 -'.split(' '),
      arp:  'E4 G4 B4 G4 E4 G4 B4 G4 A3 C4 E4 C4 A3 C4 E4 C4 D4 F4 A4 F4 D4 F4 A4 F4 B3 D4 G4 D4 B3 D4 G4 D4'.split(' '),
      drum: 'k h s h k k s h k h s h k k s h k h s h k k s h k h s s k k s s'.split(' ') },
    stage2: { bpm: 138, sub: 2,
      bass: 'G2 - G2 G2 A#2 - G2 - C3 - C3 C3 D#3 - C3 - F2 - F2 F2 G#2 - F2 - D3 D3 D#3 D#3 D3 D3 A#2 A#2'.split(' '),
      lead: 'G4 A#4 D5 - C5 A#4 G4 - C5 D#5 G5 - F5 D#5 C5 - F4 G#4 C5 - A#4 G#4 F4 - D5 - C5 A#4 A4 - D5 -'.split(' '),
      arp:  'G3 A#3 D4 A#3 G3 A#3 D4 A#3 C4 D#4 G4 D#4 C4 D#4 G4 D#4 F3 G#3 C4 G#3 F3 G#3 C4 G#3 D4 F4 A4 F4 D4 F4 A4 F4'.split(' '),
      drum: 'k h h s h h k s k h h s h h k s k h h s h h k s k h s h k s s s'.split(' ') },
    stage3: { bpm: 128, sub: 2,
      bass: 'A2 - E3 - A2 - E3 - F3 - C3 - F3 - C3 - G3 - D3 - G3 - D3 - E3 E3 - E3 G3 G3 A3 -'.split(' '),
      lead: 'A4 B4 C5 E5 - D5 C5 B4 A4 - F5 E5 D5 - C5 - B4 C5 D5 G5 - F5 E5 D5 E5 - - - A5 - E5 -'.split(' '),
      arp:  'A3 C4 E4 C4 A3 C4 E4 C4 F3 A3 C4 A3 F3 A3 C4 A3 G3 B3 D4 B3 G3 B3 D4 B3 E3 G3 B3 G3 E3 A3 C4 A3'.split(' '),
      drum: 'k h s h k h s h k h s h k h s h k h s h k h s h k h s h k s k s'.split(' ') },
    stage4: { bpm: 158, sub: 2,
      bass: 'C3 C3 - C3 D#3 - C3 - G#2 G#2 - G#2 C3 - G#2 - A#2 A#2 - A#2 D3 - A#2 - G2 G2 G#2 G#2 A#2 A#2 B2 B2'.split(' '),
      lead: 'C5 - D#5 G5 - F5 D#5 D5 C5 - G#4 - C5 D#5 - - A#4 - D5 F5 - D#5 D5 C5 D5 - - D#5 - F5 G5 -'.split(' '),
      arp:  'C4 D#4 G4 D#4 C4 D#4 G4 D#4 G#3 C4 D#4 C4 G#3 C4 D#4 C4 A#3 D4 F4 D4 A#3 D4 F4 D4 G3 A#3 D4 A#3 G3 B3 D4 B3'.split(' '),
      drum: 'k k s h k h s h k k s h k h s h k k s h k h s h k s k s k s s s'.split(' ') },
    boss: { bpm: 144, sub: 2,
      bass: 'D3 - D3 D3 - D3 C3 D3 A#2 - A#2 A#2 - A#2 A2 A#2 G2 - G2 G2 - G2 F2 G2 A2 A2 A#2 A#2 C3 C3 C#3 C#3'.split(' '),
      lead: 'D5 - - C#5 D5 - F5 - D5 - - C5 D5 - G5 - A#4 - D5 - F5 - D#5 D5 A4 - - - C#5 - D5 -'.split(' '),
      arp:  'D4 F4 A4 F4 D4 F4 G#4 F4 A#3 D4 F4 D4 A#3 D4 F4 D4 G3 A#3 D4 A#3 G3 A#3 D4 A#3 A3 C#4 E4 C#4 A3 C#4 E4 C#4'.split(' '),
      drum: 'k h s h k s s h k h s h k s s h k h s h k s s h k s k s k s s s'.split(' ') },
    victory: { bpm: 120, sub: 2,
      bass: 'C3 - G3 - C3 - G3 - F3 - C3 - G3 - C3 -'.split(' '),
      lead: 'C5 E5 G5 - E5 G5 C6 - A5 - G5 E5 F5 D5 C5 -'.split(' '),
      arp:  'C4 E4 G4 E4 C4 E4 G4 E4 F4 A4 C5 A4 G4 B4 D5 B4'.split(' '),
      drum: 'k h s h k h s h k h s h k s s s'.split(' ') },
  };

  function music(name){
    if (!started || !ac) { curTrack = name; return; }
    if (curTrack === name && musicTimer) return;
    stopMusic();
    curTrack = name;
    const tr = TRACKS[name]; if (!tr) return;
    const stepDur = 60 / tr.bpm / tr.sub;
    let step = 0, nextT = now() + 0.08;
    const len = Math.max(tr.bass.length, tr.lead.length, tr.arp.length, tr.drum.length);
    musicTimer = setInterval(() => {
      if (!ac) return;
      while (nextT < now() + 0.22){
        const i = step % len, t = nextT;
        const b = nf(tr.bass[i % tr.bass.length]);
        if (b) tone(b, stepDur * 1.7, 'triangle', 0.5, t, 0, bgmGain);
        const l = nf(tr.lead[i % tr.lead.length]);
        if (l){ tone(l, stepDur * 1.4, 'square', 0.3, t, 0, bgmGain); tone(l * 1.007, stepDur * 1.4, 'square', 0.13, t, 0, bgmGain); }
        const a = nf(tr.arp[i % tr.arp.length]);
        if (a) tone(a, stepDur * 0.85, 'sawtooth', 0.14, t, 0, bgmGain);
        const d = tr.drum[i % tr.drum.length];
        if (d === 'k'){ tone(120, 0.1, 'sine', 0.9, t, 45, bgmGain); }
        else if (d === 's'){ noise(0.1, 0.5, t, 0, 1800, 900, bgmGain); tone(190, 0.06, 'triangle', 0.4, t, 100, bgmGain); }
        else if (d === 'h'){ noise(0.03, 0.22, t, 0, 8000, 8000, bgmGain); }
        if (d !== 'h' && i % 2 === 0) noise(0.025, 0.12, t, 0, 9000, 9000, bgmGain);
        step++; nextT += stepDur;
      }
    }, 90);
  }
  function stopMusic(){
    if (musicTimer){ clearInterval(musicTimer); musicTimer = null; }
    curTrack = null;
  }

  return { init, sfx, voice, music, stopMusic, applyVol, get started(){ return started; } };
})();
