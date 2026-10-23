/* SampaPunk — boot, game-state machine, main loop and viewport scaling. */
(function () {
  'use strict';
  const SP = window.SP;
  const W = SP.W, H = SP.H, GY = SP.GROUND, PX = SP.PX, PPM = SP.PPM;
  const STEP = 1 / 120;

  let state = 'boot';       // title | howto | settings | briefing | playing | paused | over | complete
  let howtoFrom = 'title';
  let canvas, ctx, stage;
  let last = 0, acc = 0;
  let demo = { scroll: 610 * PPM, t: 0, anim: 0 };
  let audioStarted = false;

  // CRT scanlines are off by default. Settings saved before this default changed drop their
  // old scanline value once, so existing players also start without them.
  const savedSettings = SP.store.get('settings', {});
  if (!savedSettings.scanDefaultOff) { delete savedSettings.scan; savedSettings.scanDefaultOff = true; }
  SP.settings = Object.assign({ sfx: true, music: true, shake: true, scan: false }, savedSettings);
  function saveSettings() { SP.store.set('settings', SP.settings); }

  // ---------------------------------------------------------------- viewport
  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    let u = Math.min(vw / W, vh / H);
    // prefer whole-number scaling for crisp pixels when it costs little screen space
    const iu = Math.floor(u);
    if (iu >= 2 && iu / u > 0.88) u = iu;
    stage.style.setProperty('--u', u + 'px');
  }

  // ---------------------------------------------------------------- audio unlock
  function unlockAudio() {
    SP.audio.resume();
    SP.audio.setSfx(SP.settings.sfx);
    SP.audio.setMusic(SP.settings.music);
    if (!audioStarted && SP.audio.ready) { audioStarted = true; SP.audio.startMusic(); }
  }

  // ---------------------------------------------------------------- states
  function setState(s) { state = s; }
  function toTitle() {
    setState('title');
    SP.audio.setMuffled(false);
    SP.ui.showHUD(false);
    SP.ui.clearToasts();
    SP.ui.stopTyping();
    SP.audio.setEngine(false, 0, false);
    document.getElementById('title-best').textContent = SP.ui.pad(SP.store.get('best', 0), 6);
    demo.scroll = 610 * PPM;
    SP.world.reset(() => SP.zoneAtM(((demo.scroll + W) / PPM) % SP.TOTAL_M).theme);
    SP.ui.show('title');
  }
  function toHowto(from) {
    howtoFrom = from;
    setState('howto');
    document.getElementById('howto-continue').classList.toggle('hidden', from !== 'new');
    document.getElementById('howto-back').classList.toggle('hidden', from === 'new');
    SP.ui.show('howto');
  }
  function toBriefing() {
    setState('briefing');
    SP.ui.show('briefing');
    SP.ui.typeBriefing();
  }
  function startRun() {
    SP.audio.setMuffled(false);
    SP.ui.stopTyping();
    SP.ui.clearToasts();
    SP.input.clear();
    SP.G.reset();
    SP.ui.resetHUD();
    SP.ui.updateHUD(SP.G);
    SP.ui.show(null);
    SP.ui.showHUD(true);
    setState('playing');
    acc = 0;
    SP.ui.toast(SP.t('t.flagged'), 'danger', 2.6);
  }
  // ---------------------------------------------------------------- run-start transition
  // A cyberpunk "signal jack-in": the outgoing scene glitches, staggered neon scan bars sweep in,
  // a route banner holds for a beat while the run loads behind it, then the bars retract.
  const TRANS_DUR = 1.3, TRANS_SWAP = 0.5;
  let trans = null;
  function beginRun() {
    if (state === 'transition') return;
    trans = { t: 0, from: state === 'briefing' ? 'demo' : 'game', swapped: false };
    SP.ui.stopTyping();
    SP.ui.show(null);
    SP.ui.showHUD(false);
    SP.ui.clearToasts();
    SP.input.clear();
    SP.audio.setEngine(false, 0, false);
    SP.audio.play('glitch');
    setState('transition');
  }
  function drawTransition(ctx, dt) {
    const k = trans.t / TRANS_DUR;
    const ease = (v) => v * v * (3 - 2 * v);
    // coverage: 0 → 1 (sweep in), hold, 1 → 0 (sweep out)
    let cover;
    if (k < 0.4) cover = ease(k / 0.4);
    else if (k < 0.58) cover = 1;
    else cover = 1 - ease(Math.min(1, (k - 0.58) / 0.42));
    // glitch the outgoing frame: displaced slices + chromatic split
    if (k < 0.35) {
      const n = 3 + Math.floor(k * 30);
      for (let i = 0; i < n; i++) {
        const y = Math.floor(SP.hash(i * 7.1 + Math.floor(trans.t * 40)) * H), h = 2 + Math.floor(SP.hash(i * 3.3 + trans.t) * 8);
        const dx = Math.round((SP.hash(i + Math.floor(trans.t * 30)) - 0.5) * 40 * k * 3);
        ctx.drawImage(canvas, 0, y, W, h, dx, y, W, h);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.18 * (k / 0.35);
      ctx.drawImage(canvas, 3, 0); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // staggered scan bars (6px rows)
    const sweepingIn = k < 0.5;
    for (let y = 0, r = 0; y < H; y += 6, r++) {
      const lag = SP.hash(r * 13.7) * 0.45;
      const v = SP.clamp((cover * 1.45) - lag, 0, 1);
      const w = Math.round(v * (W + 8));
      if (w <= 0) continue;
      const x0 = sweepingIn ? 0 : W - w;
      ctx.fillStyle = '#04050d'; ctx.fillRect(x0, y, w, 6);
      ctx.fillStyle = 'rgba(62,240,255,0.06)'; ctx.fillRect(x0, y + 5, w, 1);
      const edge = sweepingIn ? x0 + w - 2 : x0;
      if (v < 1) { ctx.fillStyle = r % 3 === 0 ? '#ff3fa4' : r % 3 === 1 ? '#3ef0ff' : '#8a5cff'; ctx.fillRect(edge, y, 2, 6); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(edge, y + 2, 2, 1); }
    }
    // route banner while fully covered
    if (cover > 0.9) {
      const a = SP.clamp((cover - 0.9) / 0.1, 0, 1);
      ctx.globalAlpha = a;
      const l1 = SP.t('px.routeLocked'), l2 = SP.t('px.destination', { place: SP.t('zone.metro.label') });
      const jit = Math.floor(trans.t * 20) % 5 === 0 ? 1 : 0;
      const w1 = SP.gfx.textW(l1, 3), w2 = SP.gfx.textW(l2, 1);
      SP.gfx.text(ctx, l1, Math.round(W / 2 - w1 / 2) - 1 - jit, 112, '#ff3fa4', 3);
      SP.gfx.text(ctx, l1, Math.round(W / 2 - w1 / 2) + jit, 112, '#3ef0ff', 3);
      SP.gfx.text(ctx, l2, Math.round(W / 2 - w2 / 2), 136, '#c8d0f0', 1);
      const bw = 120, bx = Math.round(W / 2 - bw / 2), prog = SP.clamp((k - 0.38) / 0.2, 0, 1);
      ctx.fillStyle = '#1a1d30'; ctx.fillRect(bx, 148, bw, 3);
      ctx.fillStyle = '#3ef0ff'; ctx.fillRect(bx, 148, Math.round(bw * prog), 3);
      ctx.globalAlpha = 1;
    }
  }
  function renderTransition(dt) {
    trans.t += dt;
    const k = trans.t / TRANS_DUR;
    if (!trans.swapped && k >= TRANS_SWAP) {
      // build the new run behind the curtain
      trans.swapped = true;
      SP.G.reset();
      SP.audio.play('confirm');
    }
    if (trans.swapped) SP.G.render(ctx, dt);
    else if (trans.from === 'demo') renderDemo(dt);
    else { SP.G.time += dt; SP.G.render(ctx, dt); }
    drawTransition(ctx, dt);
    if (trans.t >= TRANS_DUR) { trans = null; startRun(); }
  }

  function pause() {
    if (state !== 'playing') return;
    setState('paused');
    SP.input.clear();
    SP.audio.setEngine(false, 0, false);
    SP.audio.setMuffled(true);
    SP.ui.syncSettings();
    SP.ui.show('pause');
  }
  function resume() {
    if (state !== 'paused') return;
    SP.input.clear();
    SP.audio.setMuffled(false);
    SP.ui.show(null);
    setState('playing');
    acc = 0;
    last = performance.now();
  }
  function toggleMute() {
    const on = !(SP.settings.sfx || SP.settings.music);
    SP.settings.sfx = on; SP.settings.music = on;
    saveSettings();
    SP.audio.setSfx(on); SP.audio.setMusic(on);
    SP.ui.syncSettings();
    SP.ui.toast(SP.t(on ? 't.audioOn' : 't.audioOff'), 'route', 1.2);
  }

  function endRun(kind) {
    const G = SP.G;
    SP.audio.setEngine(false, 0, false);
    const best = SP.store.get('best', 0);
    const isBest = G.score > best;
    if (isBest) SP.store.set('best', G.score);
    const bestNow = Math.max(best, G.score);
    const rows = [
      ['score', SP.ui.pad(G.score, 6), true],
      ['distance', Math.floor(G.dist) + ' M'],
      ['chips', String(G.chips)],
      ['delivered', G.cargoDelivered + ' · +' + G.cargoPoints],
      ...(G.cargoDropped ? [['lost', String(G.cargoDropped)]] : []),
      ['avoided', String(G.avoided)],
      ['best', SP.ui.pad(bestNow, 6)]
    ];
    SP.ui.showHUD(false);
    SP.ui.clearToasts();
    if (kind === 'over') {
      const zone = SP.zoneAtM(G.dist);
      let why = SP.t('cause.' + G.killer);
      if (why.startsWith('cause.')) why = SP.t('cause.default');   // unknown killer: no string for it
      document.getElementById('over-msg').textContent = SP.t('over.msg', { why, place: SP.t('zone.' + zone.theme + '.place') });
      rows.splice(4, 0, ['alert', SP.t('level.' + G.level)]);
      document.getElementById('over-stats').innerHTML = SP.ui.statRows(rows);
      document.getElementById('over-best').classList.toggle('hidden', !isBest);
      setState('over');
      SP.ui.show('over');
      SP.audio.play('over');
    } else {
      rows.splice(4, 0, ['bonus', '+' + (1000 + Math.round(G.integrity) * 10)]);
      if (G.cargo.length) rows.splice(5, 0, ['undelivered', String(G.cargo.length)]);
      document.getElementById('done-stats').innerHTML = SP.ui.statRows(rows);
      document.getElementById('done-best').classList.toggle('hidden', !isBest);
      setState('complete');
      SP.ui.show('complete');
    }
  }
  SP.main = { endRun };

  // ---------------------------------------------------------------- UI actions
  function act(a, btn) {
    unlockAudio();
    if (a !== 'mute') SP.audio.play('confirm');
    switch (a) {
      case 'new':
        if (!SP.store.get('seenHowTo', false)) toHowto('new'); else toBriefing();
        break;
      case 'howto': toHowto('title'); break;
      case 'howto-continue': SP.store.set('seenHowTo', true); toBriefing(); break;
      case 'settings': setState('settings'); SP.ui.syncSettings(); SP.ui.show('settings'); break;
      case 'back': toTitle(); break;
      case 'start': beginRun(); break;
      case 'resume': resume(); break;
      case 'retry': beginRun(); break;
      case 'menu': toTitle(); break;
      case 'mute': toggleMute(); break;
      case 'reset-best':
        SP.store.set('best', 0);
        SP.ui.syncSettings();
        SP.ui.toast(SP.t('t.bestReset'), 'warn', 1.4);
        break;
      case 'lang':
        if (btn && btn.dataset.lang) SP.i18n.set(btn.dataset.lang); else SP.i18n.toggle();
        SP.ui.buildRouteLabels();
        SP.ui.syncSettings();
        break;
    }
  }
  function toggleSetting(k) {
    unlockAudio();
    SP.settings[k] = !SP.settings[k];
    saveSettings();
    SP.audio.setSfx(SP.settings.sfx);
    SP.audio.setMusic(SP.settings.music);
    SP.ui.syncSettings();
    SP.audio.play('menu');
  }

  function onInput(a, e) {
    unlockAudio();
    if (a === 'pause') {
      if (state === 'playing') pause();
      else if (state === 'paused') resume();
      else if (state === 'howto' || state === 'settings') toTitle();
      return;
    }
    if (a === 'mute') { toggleMute(); return; }
    if (state === 'playing') return;
    if (a === 'confirm') {
      if (e) e.preventDefault();
      SP.ui.activateFocused();
      return;
    }
    if (a === 'key:ArrowLeft' || a === 'key:ArrowRight') {
      SP.ui.moveFocus(a === 'key:ArrowLeft' ? -1 : 1);
      return;
    }
    if (a === 'jump' && e && e.code === 'ArrowUp') { SP.ui.moveFocus(-1); return; }
    if (a === 'down' && e && e.code === 'ArrowDown') { SP.ui.moveFocus(1); return; }
  }

  // ---------------------------------------------------------------- demo (title background)
  function renderDemo(dt) {
    demo.t += dt;
    demo.scroll += 110 * dt;
    if (demo.scroll / PPM > SP.TOTAL_M - 40) { demo.scroll = 610 * PPM; SP.world.reset(() => SP.zoneAtM(((demo.scroll + W) / PPM) % SP.TOTAL_M).theme); }
    demo.anim += dt * 6;
    const S = SP.spr;
    SP.world.drawSky(ctx, 0.12, demo.t);
    SP.world.drawLayers(ctx, demo.scroll, demo.t);
    SP.world.drawGround(ctx, demo.scroll, demo.t);
    const mode = SP.segAtM((demo.scroll + PX + 230) / PPM).mode;
    const x = PX + 230;
    if (mode === 'bike') {
      const spr = S.bikeRide[Math.floor(demo.anim) % 3];
      ctx.fillStyle = 'rgba(255,224,138,0.08)';
      ctx.beginPath(); ctx.moveTo(x + 19, GY - 16); ctx.lineTo(x + 100, GY - 26); ctx.lineTo(x + 100, GY + 2); ctx.closePath(); ctx.fill();
      ctx.drawImage(spr, x - 22, GY - spr.height + 1);
    } else {
      const spr = S.run[Math.floor(demo.anim * 1.4) % 8];
      ctx.drawImage(spr, x - 11, GY - spr.height + 1);
    }
    for (let i = 0; i < 2; i++) {
      const dx = x - 70 + i * 50 + Math.sin(demo.t * 0.8 + i * 2) * 20;
      const dy = 60 + i * 14 + Math.sin(demo.t * 1.6 + i) * 6;
      ctx.fillStyle = 'rgba(255,90,110,0.06)';
      ctx.beginPath(); ctx.moveTo(dx + 9, dy + 10); ctx.lineTo(x - 26, GY); ctx.lineTo(x + 26, GY); ctx.closePath(); ctx.fill();
      ctx.drawImage(S.drone[Math.floor(demo.t * 15) % 2], Math.round(dx), Math.round(dy));
    }
    SP.world.drawRain(ctx, dt, 110, demo.scroll);
    SP.world.drawFore(ctx, demo.scroll, demo.t);
  }

  // ---------------------------------------------------------------- loop
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 0;
    dt = Math.min(dt, 0.1);
    ctx.imageSmoothingEnabled = false;
    if (state === 'playing') {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 16) {
        SP.G.update(STEP);
        acc -= STEP; n++;
        if (state !== 'playing') { acc = 0; break; }
      }
      SP.ui.updateHUD(SP.G);
      SP.G.render(ctx, dt);
    } else if (state === 'paused' || state === 'over' || state === 'complete') {
      if (state !== 'paused') {
        // let the final moment keep breathing (particles/rain) behind the results panel
        SP.G.time += dt;
      }
      SP.G.render(ctx, state === 'paused' ? 0 : dt);
    } else if (state === 'transition') {
      renderTransition(dt);
    } else if (state !== 'boot') {
      renderDemo(dt);
    }
  }

  // ---------------------------------------------------------------- boot
  function boot() {
    stage = document.getElementById('stage');
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', () => setTimeout(fit, 120));

    document.getElementById('version').textContent = SP.VERSION;
    SP.buildSprites();
    SP.world.prewarm();
    SP.ui.decorate();
    SP.i18n.apply();
    SP.ui.buildRouteLabels();
    SP.ui.syncSettings();
    SP.input.init(onInput);
    SP.touch.init();

    document.querySelectorAll('button[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act, b)));
    document.querySelectorAll('button[data-set]').forEach((b) => b.addEventListener('click', () => toggleSetting(b.dataset.set)));
    document.querySelectorAll('button').forEach((b) => b.addEventListener('mouseenter', () => { if (document.activeElement !== b) { b.focus({ preventScroll: true }); SP.audio.play('menu'); } }));
    stage.addEventListener('pointerdown', unlockAudio);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { pause(); SP.audio.suspend(); }
      else if (audioStarted) SP.audio.resume();
    });
    window.addEventListener('blur', () => pause());

    document.getElementById('loading').classList.add('hidden');
    toTitle();
    last = performance.now();
    requestAnimationFrame(frame);
  }

  window.SampaPunk = { get state() { return state; }, G: SP.G, startRun, pause, resume, toTitle };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
