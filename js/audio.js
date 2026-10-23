/* SampaPunk — audio (Web Audio API). Sound effects are synthesized; the soundtrack is
   audio/soundtrack.mp3 ("Pixel Loop"), played once through its intro and then looped
   sample-accurately between two phrase downbeats (the file's last beat is pre-crossfaded
   into the loop start, so the jump is seamless). Failures are silent so audio can never
   prevent the game from running; if the track can't load, a small synth loop plays instead. */
(function () {
  'use strict';
  const SP = window.SP;

  let ac = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let sfxOn = true, musicOn = true;
  let engine = null;
  let seq = null;
  const lastPlay = {};
  let musicDuck = null, musicTone = null, track = null, trackSrc = null, trackState = 'idle';
  const TRACK_URL = 'audio/soundtrack.mp3';
  const LOOP_START = 1968672 / 48000; // 0:41.014 — downbeat after the intro phrases
  const LOOP_END = 8169504 / 48000;   // 2:50.198 — end of the file (crossfaded into LOOP_START)
  // Mix: the track is mastered loud (~-14 LUFS); TRACK_LEVEL sits its body roughly 7 dB under
  // the gameplay cues (measured on the master output in the browser).
  const SFX_LEVEL = 0.9, TRACK_LEVEL = 0.13, SYNTH_LEVEL = 0.2;
  let musicLevel = TRACK_LEVEL;
  // Start downloading the track right away; decoding waits for the audio context.
  let trackBytes = null;
  try {
    trackBytes = fetch(TRACK_URL).then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); });
    trackBytes.catch(() => {});
  } catch (e) { trackBytes = null; }

  function init() {
    if (ac) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ac = new AC();
      master = ac.createGain(); master.gain.value = 1;
      // safety limiter so stacked effects + music never clip
      const lim = ac.createDynamicsCompressor();
      lim.threshold.value = -6; lim.knee.value = 4; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.15;
      master.connect(lim); lim.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? SFX_LEVEL : 0; sfxBus.connect(master);
      // music chain: on/off level → ducking (under key effects) → tone (muffled while paused)
      musicBus = ac.createGain(); musicBus.gain.value = musicOn ? musicLevel : 0;
      musicDuck = ac.createGain(); musicDuck.gain.value = 1;
      musicTone = ac.createBiquadFilter(); musicTone.type = 'lowpass'; musicTone.frequency.value = 20000; musicTone.Q.value = 0.5;
      musicBus.connect(musicDuck); musicDuck.connect(musicTone); musicTone.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { ac = null; return false; }
  }
  function resume() {
    if (!init()) return;
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    if (trackEl && trackEl.paused && trackState === 'element') trackEl.play().catch(() => {});
  }
  function suspend() {
    if (ac && ac.state === 'running') ac.suspend().catch(() => {});
    if (trackEl) trackEl.pause();
  }

  function osc(type, f0, f1, dur, vol, when, bus) {
    const t = (when || ac.currentTime);
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(gn); gn.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, fType, f0, f1, when, bus) {
    const t = (when || ac.currentTime);
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = fType || 'lowpass';
    f.frequency.setValueAtTime(f0 || 1200, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const gn = ac.createGain();
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(gn); gn.connect(bus || sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  const SFX = {
    jump() { osc('square', 220, 560, 0.13, 0.12); },
    land() { noise(0.07, 0.18, 'lowpass', 500, 120); },
    slide() { noise(0.18, 0.08, 'bandpass', 1800, 600); },
    chip() { osc('triangle', 990, 990, 0.05, 0.22); osc('triangle', 1480, 1480, 0.08, 0.19, ac.currentTime + 0.05); },
    boost() { osc('sawtooth', 110, 880, 0.45, 0.12); noise(0.5, 0.16, 'bandpass', 400, 4000); },
    deny() { osc('square', 160, 120, 0.1, 0.07); },
    warn() { osc('square', 880, 880, 0.06, 0.13); },
    laser() { osc('sawtooth', 1400, 200, 0.22, 0.12); noise(0.15, 0.1, 'highpass', 3000); },
    siren() { const t = ac.currentTime; for (let i = 0; i < 4; i++) osc('square', i % 2 ? 950 : 700, i % 2 ? 950 : 700, 0.14, 0.1, t + i * 0.15); },
    hit() { noise(0.22, 0.32, 'lowpass', 2400, 200); osc('square', 140, 60, 0.18, 0.14); },
    smash() { noise(0.25, 0.28, 'lowpass', 3000, 300); osc('triangle', 300, 80, 0.15, 0.12); },
    explode() { noise(0.9, 0.42, 'lowpass', 1800, 60); osc('sine', 90, 30, 0.6, 0.3); },
    ramp() { osc('square', 300, 900, 0.2, 0.08); },
    mount() { osc('sawtooth', 80, 220, 0.5, 0.1); osc('square', 440, 660, 0.12, 0.06); },
    level() { const t = ac.currentTime; for (let i = 0; i < 3; i++) { osc('sawtooth', 330, 220, 0.22, 0.09, t + i * 0.26); } },
    menu() { osc('square', 660, 660, 0.04, 0.06); },
    confirm() { osc('square', 520, 520, 0.06, 0.07); osc('square', 780, 780, 0.09, 0.07, ac.currentTime + 0.06); },
    deliver() { const t = ac.currentTime; [523, 659, 784, 1046].forEach((f, i) => osc('triangle', f, f, 0.3, 0.12, t + i * 0.12)); },
    heal() { const t = ac.currentTime; [523, 784, 1046].forEach((f, i) => osc('square', f, f, 0.09, 0.07, t + i * 0.06)); },
    glitch() { noise(0.5, 0.14, 'bandpass', 300, 5000); const t = ac.currentTime; for (let i = 0; i < 5; i++) osc('square', 200 + i * 340, 120, 0.04, 0.05, t + i * 0.07); },
    cargo() { osc('square', 330, 660, 0.07, 0.09); osc('triangle', 990, 990, 0.06, 0.1, ac.currentTime + 0.06); },
    cargoDeliver() { const t = ac.currentTime; [659, 880, 1175, 1568].forEach((f, i) => osc('triangle', f, f, 0.18, 0.12, t + i * 0.07)); noise(0.3, 0.05, 'highpass', 6000, 0, t + 0.2); },
    over() { const t = ac.currentTime; [330, 262, 196, 131].forEach((f, i) => osc('sawtooth', f, f * 0.98, 0.32, 0.09, t + i * 0.18)); }
  };

  // gameplay-critical cues briefly dip the music so they always cut through
  const DUCK = { cargoDeliver: 0.7, warn: 0.62, laser: 0.55, siren: 0.6, hit: 0.5, explode: 0.45, level: 0.6, boost: 0.7, over: 0.5, deliver: 0.6 };
  function duck(amount) {
    if (!musicDuck) return;
    const t = ac.currentTime, gp = musicDuck.gain;
    gp.cancelScheduledValues(t);
    gp.setTargetAtTime(Math.min(gp.value, amount), t, 0.015);
    gp.setTargetAtTime(1, t + 0.25, 0.25);
  }
  function play(name) {
    if (!ac || !sfxOn || ac.state !== 'running') return;
    const now = performance.now();
    if (lastPlay[name] && now - lastPlay[name] < 35) return;
    lastPlay[name] = now;
    try { SFX[name] && SFX[name](); if (DUCK[name] && musicOn) duck(DUCK[name]); } catch (e) { /* ignore */ }
  }

  // ---- motorcycle engine drone
  function setEngine(on, speed, boost) {
    if (!ac) return;
    try {
      if (on && !engine) {
        const o = ac.createOscillator(), o2 = ac.createOscillator();
        const f = ac.createBiquadFilter(), gn = ac.createGain();
        o.type = 'sawtooth'; o2.type = 'square';
        f.type = 'lowpass'; f.frequency.value = 500;
        gn.gain.value = 0;
        o.connect(f); o2.connect(f); f.connect(gn); gn.connect(sfxBus);
        o.start(); o2.start();
        engine = { o, o2, f, gn };
      }
      if (!engine) return;
      const t = ac.currentTime;
      const target = on ? 0.05 : 0;
      engine.gn.gain.setTargetAtTime(target, t, 0.08);
      const base = 48 + (speed || 0) * 0.12 + (boost ? 30 : 0);
      engine.o.frequency.setTargetAtTime(base, t, 0.1);
      engine.o2.frequency.setTargetAtTime(base * 0.5, t, 0.1);
      engine.f.frequency.setTargetAtTime(boost ? 1400 : 600, t, 0.1);
    } catch (e) { /* ignore */ }
  }

  // ---- music: a small dark synthwave loop scheduled ahead of time
  const BPM = 100;
  const STEP = 60 / BPM / 4;
  const ROOTS = [45, 45, 41, 43]; // A, A, F, G (MIDI)
  const BASS = [0, -1, 0, 12, -1, 0, 7, -1, 0, -1, 0, 12, -1, 10, 7, -1];
  const ARP = [0, 3, 7, 12, 7, 3, 10, 7];
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function startSynth() {
    if (!ac || seq) return;
    musicLevel = SYNTH_LEVEL;
    if (musicBus) musicBus.gain.setTargetAtTime(musicOn ? musicLevel : 0, ac.currentTime, 0.05);
    seq = { step: 0, next: ac.currentTime + 0.1, timer: null };
    seq.timer = setInterval(tick, 25);
  }
  function playTrack() {
    if (trackSrc || !track) return;
    const src = ac.createBufferSource();
    src.buffer = track;
    src.loop = true;
    src.loopEnd = Math.min(LOOP_END, track.duration);
    src.loopStart = Math.min(LOOP_START, src.loopEnd - 1);
    src.connect(musicBus);
    src.start(ac.currentTime + 0.05);
    trackSrc = src;
  }
  function startMusic() {
    if (!ac) return;
    if (track) { playTrack(); return; }
    if (trackState === 'element') { playTrackElement(); return; }
    if (trackState !== 'idle') return;
    if (!trackBytes) { trackState = 'failed'; startSynth(); return; }
    trackState = 'loading';
    trackBytes
      .then((bytes) => new Promise((ok, bad) => ac.decodeAudioData(bytes.slice(0), ok, bad)))
      .then((buf) => { track = buf; trackState = 'ready'; musicLevel = TRACK_LEVEL; if (musicBus) musicBus.gain.value = musicOn ? musicLevel : 0; playTrack(); })
      .catch(playTrackElement);
  }
  // Fallback for a downloaded copy opened straight from disk (file://), where the browser blocks
  // fetching the track: stream it through a plain <audio> element instead, with the same loop points.
  let trackEl = null;
  function playTrackElement() {
    if (trackEl) { trackEl.play().catch(() => {}); return; }
    trackState = 'element';
    trackEl = new Audio(TRACK_URL);
    trackEl.volume = 0.35;
    trackEl.muted = !musicOn;
    trackEl.addEventListener('timeupdate', () => { if (trackEl.currentTime >= LOOP_END - 0.1) trackEl.currentTime = LOOP_START; });
    trackEl.addEventListener('ended', () => { trackEl.currentTime = LOOP_START; trackEl.play().catch(() => {}); });
    trackEl.addEventListener('error', () => { trackEl = null; trackState = 'failed'; startSynth(); });
    trackEl.play().catch(() => { if (trackEl && trackEl.error) { trackEl = null; trackState = 'failed'; startSynth(); } });
  }
  function stopMusic() {
    if (seq) { clearInterval(seq.timer); seq = null; }
    if (trackSrc) { try { trackSrc.stop(); } catch (e) { /* ignore */ } trackSrc = null; }
    if (trackEl) { trackEl.pause(); trackEl.currentTime = 0; }
  }
  // Muffle the soundtrack while the game is paused (and open it back up on resume)
  function setMuffled(on) {
    if (!musicTone) return;
    musicTone.frequency.setTargetAtTime(on ? 700 : 20000, ac.currentTime, 0.08);
  }
  function tick() {
    if (!ac || !seq) return;
    if (ac.state !== 'running') { seq.next = ac.currentTime + 0.1; return; }
    while (seq.next < ac.currentTime + 0.12) {
      const s = seq.step;
      const bar = Math.floor(s / 16) % 4;
      const root = ROOTS[bar];
      const i = s % 16;
      const t = seq.next;
      if (BASS[i] >= 0) {
        const o = ac.createOscillator(), f = ac.createBiquadFilter(), gn = ac.createGain();
        o.type = 'sawtooth'; o.frequency.value = mtof(root - 12 + BASS[i]);
        f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + STEP * 1.6);
        gn.gain.setValueAtTime(0.22, t); gn.gain.exponentialRampToValueAtTime(0.001, t + STEP * 1.8);
        o.connect(f); f.connect(gn); gn.connect(musicBus); o.start(t); o.stop(t + STEP * 2);
      }
      if (i % 2 === 0) {
        const n = root + 12 + ARP[(s / 2) % 8 | 0];
        osc('triangle', mtof(n), mtof(n), STEP * 1.5, 0.05, t, musicBus);
      }
      if (i === 0 || i === 8) { osc('sine', 120, 40, 0.18, 0.4, t, musicBus); }
      if (i === 4 || i === 12) { noise(0.12, 0.12, 'bandpass', 1800, 900, t, musicBus); }
      if (i % 2 === 1) { noise(0.03, 0.05, 'highpass', 7000, 0, t, musicBus); }
      seq.next += STEP;
      seq.step++;
    }
  }

  function setSfx(on) {
    sfxOn = !!on;
    if (sfxBus) sfxBus.gain.setTargetAtTime(sfxOn ? SFX_LEVEL : 0, ac.currentTime, 0.02);
  }
  function setMusic(on) {
    musicOn = !!on;
    if (trackEl) trackEl.muted = !musicOn;
    if (musicBus) musicBus.gain.setTargetAtTime(musicOn ? musicLevel : 0, ac.currentTime, 0.05);
  }

  // test hook: an analyser on the master output (only created when asked for)
  function tap() {
    if (!ac) return null;
    if (!master._tap) { master._tap = ac.createAnalyser(); master._tap.fftSize = 2048; master.connect(master._tap); }
    return master._tap;
  }

  SP.audio = { init, resume, suspend, play, setEngine, startMusic, stopMusic, setSfx, setMusic, setMuffled, tap,
    get ready() { return !!ac; },
    get musicSource() { return trackSrc ? 'track' : (trackEl && !trackEl.paused) ? 'element' : seq ? 'synth' : trackState; },
    get loop() { return trackSrc ? { start: trackSrc.loopStart, end: trackSrc.loopEnd, duration: track.duration } : null; } };
})();
