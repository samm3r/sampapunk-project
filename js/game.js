/* SampaPunk — gameplay: run state, physics, obstacle patterns, collisions, pursuit system,
   mode transitions, scoring and rendering of the play field. */
(function () {
  'use strict';
  const SP = window.SP;
  const g = SP.gfx;
  const W = SP.W, H = SP.H, GY = SP.GROUND, PX = SP.PX, PPM = SP.PPM;

  const G = (SP.G = {});
  let S = null;

  // ---------------------------------------------------------------- helpers
  function overlap(a, b) { return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0; }
  function msg(text, kind) { if (SP.ui) SP.ui.toast(text, kind); }
  function sfx(n) { SP.audio.play(n); }
  function lvl() { return SP.LEVELS[G.level]; }
  function burst(x, y, n, cols, spd, life, grav, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random() * 0.7);
      G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.3, life: life * (0.5 + Math.random() * 0.5),
        max: life, col: cols[i % cols.length], sz: size || 1, g: grav == null ? 600 : grav });
    }
  }
  function playerWX() { return G.scroll + G.p.x; }
  function pbox() {
    const p = G.p, wx = playerWX();
    if (G.mode === 'bike') {
      const h = p.slide ? 18 : 26;
      return { x0: wx - 14, x1: wx + 14, y0: p.y - h, y1: p.y };
    }
    if (p.slide) return { x0: wx - 8, x1: wx + 8, y0: p.y - 13, y1: p.y };
    return { x0: wx - 5, x1: wx + 5, y0: p.y - 26, y1: p.y };
  }
  function overheadAbove() {
    const wx = playerWX();
    for (const e of G.ents) {
      if (!e.overhead || e.dead || e.hit) continue;
      const b = T[e.type].hb(e);
      if (b && b.x0 < wx + 16 && b.x1 > wx - 16) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- entity types
  // Ground-anchored hitbox from a spec {dx, w, h}
  function gbox(e, dx, w, h) { return { x0: e.x + dx, x1: e.x + dx + w, y0: GY - h, y1: GY }; }
  // Readability treatment for gameplay-critical objects: dark separation halo behind,
  // the sprite, then a thin cool rim light on its top/left silhouette.
  function drawCrit(ctx, spr, x, y, grounded) {
    x = Math.round(x); y = Math.round(y);
    if (grounded) {
      // small light pool on the pavement marks the footprint
      const w = spr.width;
      ctx.fillStyle = 'rgba(168,247,255,0.10)';
      ctx.fillRect(x - 3, GY + 1, w + 6, 1);
      ctx.fillRect(x, GY + 2, w, 1);
      ctx.fillStyle = 'rgba(168,247,255,0.05)';
      ctx.fillRect(x + 3, GY + 3, w - 6, 1);
    }
    ctx.drawImage(S.haloOf(spr), x - 2, y - 2);
    ctx.drawImage(spr, x, y);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(S.rimOf(spr), x, y);
    ctx.globalAlpha = 1;
  }
  function drawSpr(ctx, spr, e, yOff) {
    drawCrit(ctx, spr, e.x - G.scroll, GY - spr.height + 1 + (yOff || 0), true);
  }
  // Physical cable: dark 2px core, a 1px backlit rim on the lit side (up/left) and a
  // faint 1px separation glow on the shadow side — single-pixel passes, so alpha never stacks.
  function cablePass(ctx, pts, pass, col, a) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const steep = Math.abs(by - ay) > Math.abs(bx - ax);
      const ox = steep ? 1 : 0, oy = steep ? 0 : 1;
      if (pass === 'body') g.line(ctx, ax, ay, bx, by, col, 2);
      else if (pass === 'rim') g.line(ctx, ax - ox, ay - oy, bx - ox, by - oy, 'rgba(143,226,245,' + a + ')', 1);
      else g.line(ctx, ax + 2 * ox, ay + 2 * oy, bx + 2 * ox, by + 2 * oy, 'rgba(62,240,255,' + a + ')', 1);
    }
  }
  function damage(amount, cause) {
    const p = G.p;
    if (p.invT > 0 || G.phase !== 'run' || G.god) return false;
    G.integrity = Math.max(0, G.integrity - amount);
    G.lastCause = cause;
    p.invT = 1.15; p.hitT = 0.35; G.hitSlow = 0.45;
    G.shake = Math.max(G.shake, 5);
    G.heat = Math.min(100, G.heat + 6);
    G.hits++;
    dropCargo();
    const b = pbox();
    burst((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 14, ['#ffb238', '#ff2d4a', '#ffffff'], 160, 0.5);
    sfx('hit');
    if (SP.ui) SP.ui.flashDamage();
    if (G.integrity <= 0) die(cause);
    else if (G.integrity <= 40 && !G.flags.lowInt) { G.flags.lowInt = true; msg(SP.t('t.intCritical'), 'danger'); }
    return true;
  }
  function smash(e) {
    e.hit = true; e.dead = true;
    G.smashed++;
    const b = T[e.type].hb(e);
    if (b) burst((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 18, ['#3ef0ff', '#ffffff', '#ff3fa4', '#7d84a8'], 220, 0.6);
    G.shake = Math.max(G.shake, 3);
    sfx('smash');
  }
  function obstacleHit(e) {
    if (G.boostT > 0) { smash(e); return; }
    if (damage(e.dmg || 25, e.cause || e.type)) e.hit = true;
  }

  const SPR = {
    barrier: () => S.barrier, crates: () => S.crates, bin: () => S.bin, obras: () => S.obras,
    kombiWreck: () => S.kombiWreck, cone: () => S.cone
  };
  const HB = {
    barrier: [2, 18, 16], crates: [2, 20, 21], bin: [1, 16, 19], obras: [2, 24, 15],
    kombiWreck: [3, 50, 26], cone: [2, 6, 11]
  };
  const T = {};
  // static ground obstacles share one handler
  for (const k of Object.keys(HB)) {
    T[k] = {
      hb: (e) => gbox(e, HB[k][0], HB[k][1], HB[k][2]),
      collide: obstacleHit,
      draw: (ctx, e) => drawSpr(ctx, SPR[k](), e)
    };
  }
  T.roadblock = {
    hb: (e) => gbox(e, 2, 22, 25),
    collide: obstacleHit,
    draw: (ctx, e) => drawSpr(ctx, S.roadblock[Math.floor(G.time * 4) % 2], e)
  };
  T.cables = {
    overhead: true,
    hb: (e) => ({ x0: e.x, x1: e.x + 26, y0: 0, y1: GY - 16 }),
    collide: obstacleHit,
    draw(ctx, e) {
      const x = Math.round(e.x - G.scroll);
      const by = GY - 16;
      // sagging bundle of improvised wiring ("gambiarra") hanging from above
      const cables = [];
      for (let k = 0; k < 5; k++) {
        const x0 = x - 40 + k * 6, x1 = x + 60 - k * 5;
        const pts = [[x0, 40 + k * 3]];
        for (let i = 1; i <= 12; i++) {
          const t = i / 12;
          pts.push([Math.round(SP.lerp(x0, x1, t)), Math.round(40 + k * 3 + Math.sin(t * Math.PI) * (by - 46 - k * 4))]);
        }
        cables.push(pts);
      }
      // the bundle reads as one dark mass: only its outer silhouette edges are backlit
      const outer = [cables[0], cables[cables.length - 1]];
      for (const pts of outer) cablePass(ctx, pts, 'glow', null, 0.1);
      cables.forEach((pts, k) => cablePass(ctx, pts, 'body', k % 2 ? '#191c30' : '#242840'));
      cablePass(ctx, cables[0], 'rim', null, 0.6);
      cablePass(ctx, cables[cables.length - 1], 'rim', null, 0.45);
      // sparse specular glints on the inner wires keep them physical
      ctx.fillStyle = 'rgba(143,226,245,0.45)';
      for (let k = 1; k < cables.length - 1; k++) for (let i = 2 + k; i < 12; i += 4) { const [cx, cy] = cables[k][i]; ctx.fillRect(cx - 1, cy - 1, 2, 1); }
      // clamps / attachment points with small steady status LEDs
      cables.forEach((pts, k) => {
        if (k % 2) return;
        for (const i of [3, 9]) {
          const [cx, cy] = pts[i];
          ctx.fillStyle = '#454b70'; ctx.fillRect(cx - 1, cy - 1, 3, 3);
          ctx.fillStyle = (i + k) % 3 ? '#3ef0ff' : '#ffb238'; ctx.fillRect(cx, cy - 1, 1, 1);
        }
      });
      // junction box — its bottom edge is the clearance line, marked with hazard stripes
      ctx.fillStyle = 'rgba(2,2,8,0.6)'; ctx.fillRect(x + 4, by - 11, 18, 13);
      ctx.fillStyle = '#1f2338'; ctx.fillRect(x + 6, by - 9, 14, 9);
      ctx.fillStyle = '#a8f7ff'; ctx.fillRect(x + 6, by - 9, 14, 1);
      ctx.fillStyle = '#5a6290'; ctx.fillRect(x + 6, by - 8, 1, 6);
      for (let i = 0; i < 14; i += 4) { ctx.fillStyle = '#ffb238'; ctx.fillRect(x + 6 + i, by - 2, 2, 2); ctx.fillStyle = '#141420'; ctx.fillRect(x + 8 + i, by - 2, 2, 2); }
      ctx.fillStyle = '#ffb238'; ctx.fillRect(x + 8, by - 6, 2, 2);
      ctx.fillStyle = '#ff2d4a'; ctx.fillRect(x + 15, by - 6, 2, 2);
      // faint cyan spill on the pavement below shows where to slide
      ctx.fillStyle = 'rgba(62,240,255,0.10)';
      ctx.fillRect(x - 2, GY + 1, 30, 1); ctx.fillRect(x + 2, GY + 2, 22, 1);
      if (Math.random() < 0.25) burst(e.x + 13 + (Math.random() * 10 - 5), by, 2, ['#ffe08a', '#ffffff'], 70, 0.3, 500);
    }
  };
  // soft elliptical light spill — fades to nothing at the edges, so no visible box
  function softGlow(ctx, cx, cy, rx, ry, col) {
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
    ctx.save(); ctx.translate(cx, cy); ctx.scale(rx, ry);
    ctx.fillStyle = gr; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  }
  T.sign = {
    overhead: true,
    hb: (e) => ({ x0: e.x, x1: e.x + S.hangSigns[e.k].width - 2, y0: 0, y1: GY - 16 }),
    collide: obstacleHit,
    draw(ctx, e) {
      const spr = S.hangSigns[e.k];
      const x = Math.round(e.x - G.scroll);
      const top = GY - 16 - spr.height + 1;
      for (const cx of [x + 4, x + spr.width - 6]) {
        ctx.fillStyle = 'rgba(2,2,8,0.55)'; ctx.fillRect(cx - 1, 0, 3, top + 1);
        ctx.fillStyle = '#3a3f63'; ctx.fillRect(cx, 0, 1, top + 1);
        ctx.fillStyle = 'rgba(127,236,255,0.4)'; ctx.fillRect(cx - 1, 0, 1, top + 1);
      }
      softGlow(ctx, x + spr.width / 2, top + spr.height / 2, spr.width / 2 + 6, spr.height / 2 + 6, S.hangGlow[e.k] || 'rgba(255,63,164,0.06)');
      drawCrit(ctx, spr, x, top, false);
      if (e.k === 3 && Math.random() < 0.18) burst(e.x + 18, top + 7, 2, ['#ffd0ec', '#ffffff'], 60, 0.3, 500);
      ctx.fillStyle = 'rgba(255,63,164,0.10)'; ctx.fillRect(x, GY + 1, spr.width, 1);
    }
  };
  T.gantry = {
    overhead: true,
    hb: (e) => ({ x0: e.x + 1, x1: e.x + 65, y0: 0, y1: GY - 21 }),
    collide: obstacleHit,
    draw(ctx, e) {
      const spr = S.gantries[e.k];
      const x = Math.round(e.x - G.scroll);
      const top = GY - 21 - spr.height + 1;
      ctx.fillStyle = '#2f3352';
      ctx.fillRect(x - 20, 0, spr.width + 40, 12);
      ctx.fillStyle = '#41466a'; ctx.fillRect(x - 20, 11, spr.width + 40, 1);
      for (const cx of [x + 8, x + spr.width - 10]) {
        ctx.fillStyle = 'rgba(2,2,8,0.55)'; ctx.fillRect(cx - 1, 12, 4, top - 11);
        ctx.fillStyle = '#5a6088'; ctx.fillRect(cx, 12, 2, top - 11);
        ctx.fillStyle = 'rgba(127,236,255,0.3)'; ctx.fillRect(cx, 12, 1, top - 11);
      }
      drawCrit(ctx, spr, x, top, false);
      ctx.fillStyle = 'rgba(77,255,154,0.10)'; ctx.fillRect(x, GY + 1, spr.width, 1); ctx.fillRect(x + 4, GY + 2, spr.width - 8, 1);
    }
  };
  T.sentry = {
    hb: (e) => e.high ? { x0: e.x + 3, x1: e.x + 21, y0: GY - 34, y1: GY - 16 } : { x0: e.x + 3, x1: e.x + 21, y0: GY - 13, y1: GY - 2 },
    collide: obstacleHit,
    draw(ctx, e) {
      const x = Math.round(e.x - G.scroll);
      const cy = e.high ? GY - 31 : GY - 13;
      const bob = Math.round(Math.sin(G.time * 6 + e.x) * 1);
      drawCrit(ctx, S.drone[Math.floor(G.time * 14) % 2], x, cy + bob, false);
      // crackling electric field — telegraphs the danger zone
      ctx.fillStyle = Math.floor(G.time * 12) % 2 ? 'rgba(62,240,255,0.55)' : 'rgba(255,45,74,0.5)';
      const fy = e.high ? GY - 18 : GY - 2;
      for (let i = 0; i < 6; i++) ctx.fillRect(x + 3 + ((i * 7 + Math.floor(G.time * 30)) % 18), fy + ((i * 3) % 3) - 1, 2, 1);
    }
  };
  T.gap = {
    ground: true,
    hb: () => null,
    update(e) {
      const p = G.p, wx = playerWX();
      if (e.hit || G.phase !== 'run' || !p.onGround) return;
      if (wx > e.x + 5 && wx < e.x + e.w - 5) {
        e.hit = true;
        if (G.boostT <= 0 && !G.god) damage(20, 'gap');
        p.vy = -420; p.onGround = false; p.slide = false;
        burst(wx, GY, 10, ['#5a6088', '#2a2e48'], 120, 0.5);
      }
    },
    draw(ctx, e) {
      const x = Math.round(e.x - G.scroll);
      ctx.fillStyle = '#04040a'; ctx.fillRect(x, GY, e.w, H - GY);
      ctx.fillStyle = '#2a2e48';
      for (let i = 0; i < e.w; i += 5) ctx.fillRect(x + i, GY + 1 + ((i * 7) % 4), 3, 2);
      ctx.fillStyle = '#ffb238'; ctx.fillRect(x - 2, GY - 1, 3, 1); ctx.fillRect(x + e.w - 1, GY - 1, 3, 1);
      ctx.fillStyle = '#6a4a2a';
      for (let i = 4; i < e.w - 2; i += 9) ctx.fillRect(x + i, GY + 4, 1, 8);
    }
  };
  T.ramp = {
    hb: () => null,
    update(e) {
      const p = G.p, wx = playerWX();
      if (e.used || G.mode !== 'bike' || G.phase !== 'run' || !p.onGround) return;
      if (wx > e.x + 4 && wx < e.x + 44) {
        e.used = true;
        p.vy = -SP.RAMP_V; p.onGround = false; p.ramp = true; p.slide = false;
        sfx('ramp');
        burst(wx, GY, 8, ['#ffb238', '#ffe08a'], 120, 0.4);
      }
    },
    draw: (ctx, e) => drawSpr(ctx, S.ramp, e)
  };
  T.chip = {
    hb: (e) => ({ x0: e.x - 5, x1: e.x + 5, y0: e.y - 5, y1: e.y + 5 }),
    collide(e) {
      e.dead = true;
      G.chips++;
      G.boost = Math.min(100, G.boost + 8);
      sfx('chip');
      burst(e.x, e.y, 6, ['#3ef0ff', '#ffffff'], 80, 0.35, 0);
    },
    draw(ctx, e) {
      const fr = Math.floor(G.time * 10 + e.x * 0.05) % 4;
      const bob = Math.round(Math.sin(G.time * 4 + e.x * 0.1) * 1.5);
      ctx.drawImage(S.chip[fr], Math.round(e.x - G.scroll) - 5, Math.round(e.y) - 5 + bob);
    }
  };
  T.traffic = {
    hb: (e) => gbox(e, 3, 50, e.kombi ? 26 : 20),
    collide: obstacleHit,
    update(e, dt) { e.x += e.vx * dt; },
    draw(ctx, e) {
      const spr = e.kombi ? S.kombi : S.taxi[Math.floor(G.time * 12) % 3];
      drawSpr(ctx, spr, e);
      ctx.fillStyle = 'rgba(255,224,138,0.08)';
      const x = Math.round(e.x - G.scroll) + 54;
      ctx.beginPath(); ctx.moveTo(x, GY - 10); ctx.lineTo(x + 40, GY - 18); ctx.lineTo(x + 40, GY); ctx.closePath(); ctx.fill();
    }
  };
  // Telegraphed drone beam attack (low → jump, high → slide/duck)
  T.beam = {
    persist: true,
    hb: () => null,
    laneY(e) {
      if (e.lane === 'low') return G.mode === 'bike' ? GY - 7 : GY - 6;
      return G.mode === 'bike' ? GY - 23 : GY - 21;
    },
    update(e, dt) {
      if (e.st === 'idle') {
        const ahead = e.x - playerWX();
        if (ahead < G.speed * e.warn + 4) {
          if (G.phase !== 'run' || G.boostT > 0) { e.dead = true; return; }
          e.st = 'warn'; e.t = 0; e.beeps = 0;
          sfx('warn');
        }
        return;
      }
      e.t += dt;
      if (e.st === 'warn') {
        if (G.boostT > 0 || G.phase !== 'run') { e.st = 'leave'; e.t = 0; e.jammed = true; return; }
        if (e.t > (e.beeps + 1) * 0.25 && e.t < e.warn - 0.1) { e.beeps++; sfx('warn'); }
        if (e.t >= e.warn) { e.st = 'fire'; e.t = 0; sfx('laser'); G.shake = Math.max(G.shake, 2); }
      } else if (e.st === 'fire') {
        if (!e.hit && G.phase === 'run') {
          const y = T.beam.laneY(e);
          const band = { x0: G.scroll, x1: G.scroll + W, y0: y - 2, y1: y + 2 };
          if (overlap(band, pbox())) { e.hit = true; if (G.boostT <= 0) damage(25, 'beam'); }
        }
        if (e.t >= 0.22) { e.st = 'leave'; e.t = 0; }
      } else if (e.st === 'leave') {
        if (e.t > 0.9) e.dead = true;
      }
    },
    dronePos(e) {
      const y = T.beam.laneY(e) - 7;
      if (e.st === 'warn') {
        const k = Math.min(1, e.t / 0.35), ease = 1 - (1 - k) * (1 - k);
        return [SP.lerp(500, 430, ease), SP.lerp(10, y, ease)];
      }
      if (e.st === 'fire') return [430 + Math.random() * 2, y];
      const k = Math.min(1, e.t / 0.6);
      return [430 + k * 80, SP.lerp(y, -20, k)];
    },
    drawTop(ctx, e) {
      if (e.st === 'idle') return;
      const [dx, dy] = T.beam.dronePos(e);
      const y = T.beam.laneY(e);
      if (e.st === 'warn') {
        const on = Math.floor(e.t * 10) % 2 === 0;
        ctx.fillStyle = on ? 'rgba(255,178,56,0.85)' : 'rgba(255,178,56,0.35)';
        for (let x = Math.round(dx) - 4; x > 0; x -= 6) ctx.fillRect(x - 3, y - 1, 3, 1);
        ctx.fillStyle = 'rgba(255,178,56,0.12)'; ctx.fillRect(0, y - 2, dx, 5);
        ctx.fillStyle = on ? '#ffb238' : 'rgba(255,178,56,0.6)';
        for (let x = Math.round(dx) - 4; x > 0; x -= 6) ctx.fillRect(x - 3, y, 3, 1);
        // action hint above the courier
        const hint = e.lane === 'low' ? 'JUMP' : G.mode === 'bike' ? 'DUCK' : 'SLIDE';
        const hw = g.textW(hint, 1);
        const hx = PX - Math.round(hw / 2), hy = GY - 58;
        ctx.fillStyle = 'rgba(6,8,22,0.8)'; ctx.fillRect(hx - 3, hy - 3, hw + 6, 11);
        g.text(ctx, hint, hx, hy, on ? '#ffb238' : '#ffe0a0', 1);
        ctx.fillStyle = '#ffb238';
        if (e.lane === 'low') { ctx.fillRect(PX - 1, hy - 7, 3, 1); ctx.fillRect(PX - 2, hy - 6, 5, 1); }
        else { ctx.fillRect(PX - 2, hy + 9, 5, 1); ctx.fillRect(PX - 1, hy + 10, 3, 1); }
        // pulsing warning marker at the drone
        if (on) { ctx.fillStyle = '#ffb238'; ctx.fillRect(Math.round(dx) - 10, y - 9, 3, 5); ctx.fillRect(Math.round(dx) - 10, y - 3, 3, 2); }
      } else if (e.st === 'fire') {
        ctx.fillStyle = 'rgba(255,45,74,0.35)'; ctx.fillRect(0, y - 4, dx, 9);
        ctx.fillStyle = '#ff2d4a'; ctx.fillRect(0, y - 2, dx, 5);
        ctx.fillStyle = '#ffd0d8'; ctx.fillRect(0, y - 1, dx, 2);
      }
      ctx.drawImage(S.drone[Math.floor(G.time * 16) % 2], Math.round(dx) - 4, Math.round(dy));
      if (e.jammed && e.t < 0.6) { ctx.fillStyle = '#3ef0ff'; g.text(ctx, 'JAMMED', Math.round(dx) - 10, Math.round(dy) - 8, '#3ef0ff', 1); }
    }
  };
  // Automated police interceptor arriving from behind (jump when it passes)
  T.interceptor = {
    persist: true,
    hb: (e) => e.st === 'drive' ? { x0: e.x + 2, x1: e.x + 50, y0: GY - 16, y1: GY } : null,
    collide(e) {
      if (G.boostT > 0) { smash(e); return; }
      if (damage(25, 'interceptor')) e.hit = true;
    },
    update(e, dt) {
      if (e.st === 'idle') {
        const ahead = e.x - playerWX();
        if (ahead < G.speed * (1.2 + 0.57)) {
          if (G.phase !== 'run' || G.boostT > 0) { e.dead = true; return; }
          e.st = 'warn'; e.t = 0; sfx('siren');
        }
        return;
      }
      e.t += dt;
      if (e.st === 'warn') {
        if (G.boostT > 0) { e.dead = true; msg(SP.t('t.interceptorJammed'), 'info'); return; }
        if (e.t >= 1.2) { e.st = 'drive'; e.x = G.scroll - 60; }
      } else if (e.st === 'drive') {
        e.x += (G.speed + 300) * dt;
        if (e.x - G.scroll > W + 30) e.dead = true;
      }
    },
    draw(ctx, e) {
      if (e.st === 'warn') {
        const on = Math.floor(e.t * 8) % 2 === 0;
        ctx.fillStyle = on ? 'rgba(255,45,74,0.28)' : 'rgba(58,107,255,0.28)';
        ctx.fillRect(0, GY - 34, 40, 34);
        ctx.fillStyle = on ? '#ff2d4a' : '#ff8090';
        const sh = Math.floor(e.t * 12) % 3;
        for (let i = 0; i < 3; i++) {
          const x = 6 + i * 8 + sh;
          ctx.fillRect(x, GY - 18, 2, 2); ctx.fillRect(x + 2, GY - 16, 2, 2); ctx.fillRect(x + 4, GY - 14, 2, 2);
          ctx.fillRect(x + 2, GY - 12, 2, 2); ctx.fillRect(x, GY - 10, 2, 2);
        }
        const tag = SP.t('px.interceptor');
        ctx.fillStyle = 'rgba(6,8,22,0.8)'; ctx.fillRect(2, GY - 31, g.textW(tag) + 6, 10);
        g.text(ctx, tag, 5, GY - 28, on ? '#ff2d4a' : '#ffd0d8', 1);
        const hx = PX - 8, hy = GY - 58;
        ctx.fillStyle = 'rgba(6,8,22,0.8)'; ctx.fillRect(hx - 3, hy - 3, g.textW('JUMP') + 6, 11);
        g.text(ctx, 'JUMP', hx, hy, on ? '#ff2d4a' : '#ffd0d8', 1);
      } else if (e.st === 'drive') {
        const x = Math.round(e.x - G.scroll);
        drawCrit(ctx, S.interceptor[Math.floor(G.time * 8) % 2], x, GY - 19, false);
        ctx.fillStyle = 'rgba(62,240,255,0.25)'; ctx.fillRect(x + 6, GY - 1, 40, 1);
      }
    }
  };
  // --- scripted transition entities
  T.parkedBike = {
    hb: () => null,
    update(e) {
      if (G.phase === 'run' && G.mode === 'foot' && playerWX() >= e.x) startMount(e);
    },
    draw(ctx, e) {
      if (e.attached) return;
      const x = Math.round(e.x - G.scroll);
      drawCrit(ctx, S.bikeEmpty[0], x - 22, GY - 31, true);
      if (Math.floor(G.time * 3) % 2) { ctx.fillStyle = '#3ef0ff'; g.text(ctx, 'RIDE', x - 7, GY - 44, '#3ef0ff', 1); ctx.fillRect(x - 1, GY - 37, 3, 2); }
      softGlow(ctx, x, GY - 17, 28, 20, 'rgba(62,240,255,0.08)');
    }
  };
  T.endWall = {
    hb: (e) => e.broken ? null : gbox(e, 2, 40, 58),
    collide(e) { damage(25, 'roadblock'); },
    update(e) {
      if (!e.broken && G.mode === 'bike' && G.phase === 'run' && e.x - playerWX() < 230) startBail(e);
    },
    draw(ctx, e) {
      drawSpr(ctx, e.broken ? S.endWallBroken : S.endWall, e);
      if (!e.broken) {
        const x = Math.round(e.x - G.scroll);
        ctx.fillStyle = Math.floor(G.time * 6) % 2 ? 'rgba(255,45,74,0.16)' : 'rgba(58,107,255,0.16)';
        ctx.fillRect(x - 10, GY - 74, 64, 74);
      }
    }
  };
  T.loseBike = {
    persist: true,
    hb: () => null,
    update(e, dt) {
      e.x += e.vx * dt;
      e.rot = (e.rot || 0) + dt * 3;
      if (e.wall && !e.wall.broken && e.x + 20 >= e.wall.x) {
        e.wall.broken = true; e.dead = true;
        burst(e.wall.x + 20, GY - 30, 50, ['#ffb238', '#ff2d4a', '#ffe08a', '#ffffff', '#454b70'], 280, 0.9);
        G.shake = 9; sfx('explode');
        msg(SP.t('t.roadblockBreached'), 'warn');
      }
      if (!e.wall) { e.vx = Math.max(0, e.vx - 260 * dt); if (Math.random() < 0.5) burst(e.x, GY, 1, ['#ffb238'], 60, 0.3); }
    },
    draw(ctx, e) {
      const x = Math.round(e.x - G.scroll);
      ctx.save();
      ctx.translate(x, GY - 10);
      ctx.rotate(Math.sin(e.rot) * 0.15 - 0.1);
      ctx.drawImage(S.bikeEmpty[Math.floor(G.time * 20) % 3], -22, -21);
      ctx.restore();
      if (Math.random() < 0.6) burst(e.x - 18, GY - 2, 1, ['#ffe08a', '#ffb238'], 80, 0.25, 300);
    }
  };
  T.drop = {
    hb: () => null,
    update(e) {
      if (G.phase === 'run' && playerWX() >= e.x - 30) startDelivery(e);
    },
    draw(ctx, e) {
      const x = Math.round(e.x - G.scroll);
      if (x > W + 10 || x < -170) return;
      ctx.drawImage(S.dropPoint, x - 10, GY - 149);
      ctx.fillStyle = 'rgba(255,207,122,0.12)';
      ctx.beginPath(); ctx.moveTo(x + 30, GY - 50); ctx.lineTo(x + 100, GY - 50); ctx.lineTo(x + 140, GY); ctx.lineTo(x - 10, GY); ctx.closePath(); ctx.fill();
      softGlow(ctx, x + 64, GY - 134, 58, 16, 'rgba(62,240,255,0.10)');
    }
  };

  // ---------------------------------------------------------------- cargo (secondary objective)
  // Optional cargo is separate from the encrypted package (the primary mission, finished at T.drop).
  // G.cargo is the carried inventory (one entry per package); the backpack stack is drawn from it.
  function floatText(x, y, text, col) { G.floats.push({ x, y, text, col, t: 0 }); }
  T.cargo = {
    hb: (e) => ({ x0: e.x - 8, x1: e.x + 8, y0: GY - 22, y1: GY }),
    update(e) {
      if (!G.flags.cargoSeen && G.phase === 'run') {
        const ahead = e.x - playerWX();
        if (ahead > 0 && ahead < G.speed * 1.9) {
          G.flags.cargoSeen = true;
          msg(SP.t(G.mode === 'bike' ? 't.cargoSeenBike' : 't.cargoSeenFoot'), 'route');
        }
      }
    },
    collide(e) {
      const cap = SP.CARGO.capacity;
      if (G.cargo.length >= cap) {
        // backpack full: the package stays in the street
        if (!e.fullWarned) {
          e.fullWarned = true;
          sfx('deny');
          floatText(e.x, GY - 34, SP.t('px.full'), '#ffb238');
          if (!G.flags.capWarned) { G.flags.capWarned = true; msg(SP.t('t.cargoCap'), 'warn'); }
        }
        return;
      }
      e.hit = true; e.dead = true;
      G.cargo.push(e.kind);
      G.cargoCollected++;
      burst(e.x, GY - 12, 12, ['#ffb238', '#f6c070', '#3ef0ff'], 120, 0.45, 300);
      sfx('cargo');
      floatText(e.x, GY - 34, SP.t('px.cargo', { n: G.cargo.length, cap }), '#ffd890');
      if (!G.flags.cargoFirst) { G.flags.cargoFirst = true; msg(SP.t('t.cargoFirst'), 'info'); }
      if (G.cargo.length >= cap && !G.flags.fullNotice) { G.flags.fullNotice = true; msg(SP.t('t.cargoFull'), 'warn'); }
    },
    draw(ctx, e) {
      const x = Math.round(e.x - G.scroll);
      const bob = Math.round(Math.sin(G.time * 4 + e.x * 0.07) * 1.5);
      const spr = S.cargoPickup[e.kind];
      // hover light + beacon: reads as a pickup, never as an obstacle
      ctx.fillStyle = 'rgba(255,178,56,0.16)'; ctx.fillRect(x - 9, GY + 1, 18, 1); ctx.fillRect(x - 6, GY + 2, 12, 1);
      ctx.fillStyle = 'rgba(62,240,255,0.10)'; ctx.fillRect(x - 1, GY - 40, 2, 26);
      const by = GY - 38 + Math.round(Math.sin(G.time * 5 + e.x) * 2);
      ctx.fillStyle = '#3ef0ff';
      ctx.fillRect(x - 1, by, 3, 1); ctx.fillRect(x - 2, by + 1, 5, 1); ctx.fillRect(x - 1, by + 2, 3, 1); ctx.fillRect(x, by + 3, 1, 1);
      drawCrit(ctx, spr, x - 7, GY - 16 + bob, false);
    }
  };
  // ---------------------------------------------------------------- repair items (integrity)
  T.heal = {
    hb: (e) => ({ x0: e.x - 8, x1: e.x + 8, y0: GY - 22, y1: GY }),
    update(e) {
      if (!G.flags.healSeen && G.phase === 'run') {
        const ahead = e.x - playerWX();
        if (ahead > 0 && ahead < G.speed * 1.9) { G.flags.healSeen = true; msg(SP.t('t.healAhead'), 'route'); }
      }
    },
    collide(e) {
      e.hit = true; e.dead = true;
      const before = G.integrity;
      G.integrity = Math.min(100, G.integrity + SP.HEALS.amount[e.kind]);
      const got = Math.round(G.integrity - before);
      if (got > 0) floatText(e.x, GY - 34, SP.t('px.integrity', { n: got }), '#4dff9a');
      else { G.bonus += 50; floatText(e.x, GY - 34, SP.t('px.fullBonus'), '#4dff9a'); }
      if (G.integrity > 40) G.flags.lowInt = false;
      G.heals++;
      sfx('heal');
      burst(e.x, GY - 12, 12, ['#4dff9a', '#ffffff', e.kind ? '#2a9a4a' : '#ffcf4a'], 110, 0.45, 200);
      if (!G.flags.healFirst) { G.flags.healFirst = true; msg(SP.t('t.healed', { item: e.kind ? 'GUARANÁ!' : 'PIZZA!' }), 'info'); }
    },
    draw(ctx, e) {
      const x = Math.round(e.x - G.scroll);
      const spr = S.heal[e.kind];
      const bob = Math.round(Math.sin(G.time * 4 + e.x * 0.05) * 1.5);
      ctx.fillStyle = 'rgba(77,255,154,0.16)'; ctx.fillRect(x - 9, GY + 1, 18, 1); ctx.fillRect(x - 6, GY + 2, 12, 1);
      ctx.fillStyle = 'rgba(77,255,154,0.10)'; ctx.fillRect(x - 1, GY - 40, 2, 24);
      const py = GY - 40 + Math.round(Math.sin(G.time * 5 + e.x) * 2);
      ctx.fillStyle = '#4dff9a'; ctx.fillRect(x - 1, py - 2, 3, 7); ctx.fillRect(x - 3, py, 7, 3);
      ctx.fillStyle = '#d8ffe8'; ctx.fillRect(x, py - 1, 1, 5); ctx.fillRect(x - 2, py + 1, 5, 1);
      drawCrit(ctx, spr, x - Math.round(spr.width / 2), GY - 18 + bob, false);
    }
  };

  // A hit knocks the top package off the backpack stack; it tumbles away and is lost.
  function dropCargo() {
    if (!G.cargo.length) return;
    const n = G.cargo.length;
    const kind = G.cargo.pop();
    G.cargoDropped++;
    G.flags.fullNotice = false; G.flags.capWarned = false;
    const topY = G.p.y - (G.mode === 'bike' ? 22 : 24) - 6 * n;
    G.ents.push({ type: 'droppedCargo', x: playerWX() - 4, y: topY, vx: G.speed * 0.55, vy: -230, rot: 0, spin: -9, kind, bounced: false });
    floatText(playerWX(), topY - 10, SP.t('px.lost'), '#ff6a5a');
    if (!G.flags.dropTip) { G.flags.dropTip = true; msg(SP.t('t.dropTip'), 'warn'); }
  }
  T.droppedCargo = {
    hb: () => null,
    update(e, dt) {
      e.vy += SP.GRAV * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.rot += e.spin * dt;
      if (e.y >= GY - 4) {
        e.y = GY - 4;
        if (!e.bounced) { e.bounced = true; e.vy = -110; e.vx *= 0.4; e.spin *= 0.4; burst(e.x, GY, 5, ['#d8903a', '#f6c070'], 70, 0.3); }
        else { e.vy = 0; e.vx = 0; e.spin = 0; e.rot = Math.round(e.rot / (Math.PI / 2)) * (Math.PI / 2); }
      }
    },
    draw(ctx, e) {
      const spr = S.cargoStack[e.kind];
      ctx.save();
      ctx.translate(Math.round(e.x - G.scroll), Math.round(e.y));
      ctx.rotate(e.rot);
      ctx.drawImage(spr, -Math.round(spr.width / 2), -Math.round(spr.height / 2));
      ctx.restore();
    }
  };
  function deliverCargo(cp) {
    const n = G.cargo.length;
    if (!n) return;                      // empty visit: no points, no interruption
    const C = SP.CARGO;
    const pts = n * C.points + Math.max(0, n - 1) * C.multiBonus;
    G.cargoPoints += pts;
    G.cargoDelivered += n;
    G.deliveries++;
    G.cargo = [];
    G.flags.fullNotice = false; G.flags.capWarned = false;
    cp.pulse = G.time; cp.delivered = n;
    sfx('cargoDeliver');
    msg(SP.t(n > 1 ? 't.deliveredN' : 't.delivered1', { n, pts }), 'info');
    if (!G.flags.firstDelivery) { G.flags.firstDelivery = true; msg(SP.t('t.firstDelivery'), 'route'); }
    floatText(cp.x, GY - 74, '+' + pts, '#ffb238');
    burst(cp.x, GY - 40, 24, ['#3ef0ff', '#ffffff', '#ffb238'], 160, 0.6, 0);
  }
  T.checkpoint = {
    ground: true,
    hb: () => null,
    update(e) {
      const ahead = e.x - playerWX();
      if (!e.announced && ahead > 0 && ahead < G.speed * 2.3 && G.phase !== 'dying' && (G.cargo.length > 0 || !G.flags.cpSeen)) {
        e.announced = true; G.flags.cpSeen = true;
        msg(SP.t('t.checkpointAhead'), 'route');
      }
      // one delivery opportunity per checkpoint
      if (!e.done && ahead <= 0 && G.phase !== 'dying' && G.phase !== 'delivering') { e.done = true; deliverCargo(e); }
    },
    draw(ctx, e) {
      const x = Math.round(e.x - G.scroll);
      if (x < -80 || x > W + 80) return;
      const used = e.done;
      const a = used ? 0.35 : 1;
      // tall light column: visible as soon as it scrolls in
      ctx.fillStyle = 'rgba(62,240,255,' + (0.05 * a).toFixed(3) + ')'; ctx.fillRect(x - 12, 0, 24, GY);
      ctx.fillStyle = 'rgba(62,240,255,' + (0.06 * a).toFixed(3) + ')'; ctx.fillRect(x - 3, 0, 6, GY);
      // kiosk behind the arch
      ctx.globalAlpha = used ? 0.7 : 1;
      ctx.drawImage(S.terminal, x + 22, GY - 45);
      ctx.globalAlpha = 1;
      // holographic arch with scanline gaps
      const flick = Math.floor(G.time * 12) % 7 === 0 ? 0.6 : 1;
      ctx.fillStyle = 'rgba(62,240,255,' + (0.55 * a * flick).toFixed(3) + ')';
      for (let y = GY - 56; y < GY; y++) if (y % 3) { ctx.fillRect(x - 26, y, 2, 1); ctx.fillRect(x + 24, y, 2, 1); }
      ctx.fillStyle = 'rgba(62,240,255,' + (0.8 * a).toFixed(3) + ')'; ctx.fillRect(x - 27, GY - 65, 54, 9);
      const label = SP.t(used ? 'px.delivered' : 'px.dropoff');
      g.text(ctx, label, x - Math.round(g.textW(label) / 2), GY - 63, '#04101a', 1);
      if (!used) {
        const iy = GY - 50 + Math.round(Math.sin(G.time * 3) * 2);
        ctx.drawImage(S.cargoStack[0], x - 4, iy);
        ctx.fillStyle = '#3ef0ff'; ctx.fillRect(x - 1, iy + 9, 3, 1); ctx.fillRect(x, iy + 10, 1, 1);
      }
      // delivery zone on the ground
      ctx.fillStyle = 'rgba(62,240,255,' + (0.7 * a).toFixed(3) + ')';
      for (let i = -26; i < 26; i += 6) ctx.fillRect(x + i, GY + 1, 4, 1);
      ctx.fillStyle = 'rgba(62,240,255,' + (0.12 * a).toFixed(3) + ')'; ctx.fillRect(x - 26, GY + 2, 52, 3);
      if (e.pulse) {
        const k = (G.time - e.pulse) / 0.8;
        if (k < 1) {
          const r = Math.round(10 + k * 40);
          ctx.fillStyle = 'rgba(62,240,255,' + (0.8 * (1 - k)).toFixed(3) + ')';
          ctx.fillRect(x - r, GY - 36 - r / 2, r * 2, 1); ctx.fillRect(x - r, GY - 36 + r / 2, r * 2, 1);
          ctx.fillRect(x - r, GY - 36 - r / 2, 1, r); ctx.fillRect(x + r, GY - 36 - r / 2, 1, r);
        }
      }
    }
  };
  // Visible backpack stack, anchored to the current sprite's backpack/rack position
  function drawCargoStack(ctx, ps, sx, sy) {
    const n = G.cargo.length;
    const pk = ps.spr._pack;
    if (!n || !pk || G.phase === 'dying') return;
    const p = G.p;
    const low = p.slide && p.onGround;   // sliding / ducking: the stack tips back to stay low
    const lean = ps.bike ? 0.7 : 0.45;
    for (let i = 0; i < n; i++) {
      const spr = S.cargoStack[G.cargo[i]];
      let x, y;
      if (low) { x = sx + pk[0] - 7 - i * 8; y = sy + pk[1] + 1 - Math.round(i * 0.5); }
      else {
        const sway = p.onGround ? 0 : Math.round(SP.clamp(p.vy / 400, -1, 1) * i * 0.5);
        x = sx + pk[0] + (ps.bike ? 1 : 0) - Math.round(i * lean);
        y = sy + pk[1] - 6 * (i + 1) + 1 + sway;
        if (ps.bike) x -= 1;
      }
      ctx.drawImage(spr, x, y);
    }
  }
  function reservedEnd(a, b) {
    for (const r of G.reserved) if (r[0] < b && r[1] > a) return r[1];
    return null;
  }

  // ---------------------------------------------------------------- patterns
  // Offsets are in seconds of travel at the current base speed, so spacing scales fairly with speed.
  function builder(X0, spd, mode) {
    const add = (e) => { G.ents.push(e); return e; };
    const at = (t) => X0 + t * spd;
    const jv = SP.JUMP_V[mode];
    return {
      ob(type, t) { add({ type, x: at(t) }); },
      ov(type, t) {
        const k = type === 'gantry' ? Math.floor(Math.random() * S.gantries.length) : Math.floor(Math.random() * S.hangSigns.length);
        add({ type, x: at(t), overhead: true, k });
      },
      gap(t, w) { add({ type: 'gap', x: at(t), w }); },
      ramp(t) { add({ type: 'ramp', x: at(t) }); },
      sentry(t, high) { add({ type: 'sentry', x: at(t), high }); },
      beam(t, lane) { add({ type: 'beam', x: at(t), lane, st: 'idle', t: 0, warn: lvl().warn }); },
      interceptor(t) { add({ type: 'interceptor', x: at(t), st: 'idle', t: 0 }); },
      traffic(t, kombi) {
        // place the moving car so the player meets it at the same moment as a static obstacle at t
        const xs = at(t), vx = 50;
        const tau = (xs - playerWX()) / spd;
        add({ type: 'traffic', x: xs - vx * tau, vx, kombi });
      },
      chip(x, y) { add({ type: 'chip', x, y }); },
      arc(t, width, launchV) {
        // chips along the ideal jump arc over an obstacle centred at t
        const v = launchV || jv;
        const Tair = (2 * v) / SP.GRAV;
        const xc = at(t) + (width || 10) / 2;
        const take = launchV ? at(t) : xc - (spd * Tair) / 2;
        const hy = mode === 'bike' ? 16 : 14;
        for (let k = 1; k <= 5; k++) {
          const tt = (Tair * k) / 6;
          this.chip(take + spd * tt, GY - (v * tt - 0.5 * SP.GRAV * tt * tt) - hy);
        }
      },
      line(t0, t1, n, y) {
        for (let i = 0; i < n; i++) this.chip(at(t0 + ((t1 - t0) * i) / Math.max(1, n - 1)), y);
      }
    };
  }

  const PAT = {
    foot: [
      { id: 'barrier', min: 0, w: 3, dur: 0.35, b: (b) => { b.ob('barrier', 0); b.arc(0, 18); } },
      { id: 'crates', min: 0, w: 2, dur: 0.4, b: (b) => { b.ob('crates', 0); b.arc(0, 20); } },
      { id: 'bin2', min: 0, w: 2, dur: 1.15, b: (b) => { b.ob('bin', 0); b.ob('bin', 0.95); } },
      { id: 'cables', min: 0, w: 3, dur: 0.45, b: (b) => { b.ov('cables', 0); b.line(-0.15, 0.3, 4, GY - 7); } },
      { id: 'sign', min: 0, w: 2, dur: 0.45, b: (b) => { b.ov('sign', 0); } },
      { id: 'gap', min: 0, w: 2, dur: 0.4, b: (b) => { b.gap(0, 34); b.arc(0, 34); } },
      { id: 'obras', min: 0, w: 2, dur: 0.4, b: (b) => { b.ob('obras', 0); } },
      { id: 'chipsRun', min: 0, w: 1, dur: 0.9, b: (b) => { b.line(0, 0.8, 6, GY - 12); } },
      { id: 'beamLow', min: 0, w: 1.6, dur: 1.3, b: (b) => { b.beam(0.65, 'low'); } },
      { id: 'sentryHigh', min: 0, w: 1.4, dur: 0.4, b: (b) => { b.sentry(0, true); } },
      { id: 'kombi', min: 1, w: 2, dur: 0.6, b: (b) => { b.ob('kombiWreck', 0); b.arc(0, 50); } },
      { id: 'beamHigh', min: 1, w: 1.6, dur: 1.3, b: (b) => { b.beam(0.65, 'high'); } },
      { id: 'jumpSlide', min: 1, w: 2, dur: 1.35, b: (b) => { b.ob('barrier', 0); b.ov('cables', 1.05); } },
      { id: 'slideJump', min: 1, w: 2, dur: 1.3, b: (b) => { b.ov('sign', 0); b.ob('crates', 0.95); } },
      { id: 'sentryLow', min: 1, w: 1.4, dur: 0.4, b: (b) => { b.sentry(0, false); b.arc(0, 24); } },
      { id: 'beamDouble', min: 2, w: 1.6, dur: 2.2, b: (b) => { b.beam(0.6, 'low'); b.beam(1.6, 'high'); } },
      { id: 'triple', min: 2, w: 1.5, dur: 2.1, b: (b) => { b.ob('bin', 0); b.ov('cables', 0.95); b.gap(1.85, 34); } }
    ],
    bike: [
      { id: 'roadblock', min: 0, w: 3, dur: 0.35, b: (b) => { b.ob('roadblock', 0); b.arc(0, 22); } },
      { id: 'traffic', min: 0, w: 3, dur: 0.6, b: (b) => { b.traffic(0, Math.random() < 0.35); } },
      { id: 'gantry', min: 0, w: 2.5, dur: 0.5, b: (b) => { b.ov('gantry', 0); b.line(-0.1, 0.3, 4, GY - 10); } },
      { id: 'cones', min: 0, w: 2, dur: 0.6, b: (b) => { b.ob('cone', 0); b.ob('cone', 0.12); b.arc(0.06, 10); } },
      { id: 'ramp', min: 0, w: 2, dur: 1.0, b: (b) => { b.ramp(0); b.gap(0.22, 0.42 * b._spd); b.arc(0.16, 0, SP.RAMP_V); } },
      { id: 'chipsRun', min: 0, w: 1, dur: 0.9, b: (b) => { b.line(0, 0.8, 6, GY - 12); } },
      { id: 'beamLow', min: 1, w: 1.5, dur: 1.3, b: (b) => { b.beam(0.65, 'low'); } },
      { id: 'beamHigh', min: 1, w: 1.5, dur: 1.3, b: (b) => { b.beam(0.65, 'high'); } },
      { id: 'interceptor', min: 1, w: 1.8, dur: 1.7, b: (b) => { b.interceptor(0.85); } },
      { id: 'gantryBlock', min: 1, w: 2, dur: 1.35, b: (b) => { b.ov('gantry', 0); b.ob('roadblock', 1.05); } },
      { id: 'trafficGantry', min: 2, w: 1.5, dur: 1.5, b: (b) => { b.traffic(0, false); b.ov('gantry', 1.15); } },
      { id: 'beamDouble', min: 2, w: 1.5, dur: 2.2, b: (b) => { b.beam(0.6, 'low'); b.beam(1.6, 'high'); } }
    ]
  };

  function choosePattern(mode) {
    const list = PAT[mode].filter((p) => p.min <= G.level && p.id !== G.lastPat);
    let tot = 0;
    for (const p of list) tot += p.w;
    let r = Math.random() * tot;
    for (const p of list) { r -= p.w; if (r <= 0) return p; }
    return list[list.length - 1];
  }

  function spawn() {
    const horizon = G.scroll + W + 160;
    let guard = 0;
    while (G.nextSpawn < horizon && guard++ < 20) {
      const seg = SP.segAtM(G.nextSpawn / PPM);
      const segStart = seg.start * PPM, segEnd = seg.end * PPM;
      if (G.nextSpawn >= SP.TOTAL_M * PPM) { G.nextSpawn = Infinity; return; }
      const spd = SP.SPEED[seg.mode] * lvl().mult;
      const minStart = seg.index === 0 ? PX + 3.0 * spd : segStart + 1.8 * spd;
      if (G.nextSpawn < minStart) { G.nextSpawn = minStart; continue; }
      const endClear = segEnd - (seg.last ? 3.0 : 2.6) * spd;
      const pat = choosePattern(seg.mode);
      const len = pat.dur * spd;
      const rEnd = reservedEnd(G.nextSpawn - 0.35 * spd, G.nextSpawn + len + 0.35 * spd);
      if (rEnd !== null) { G.nextSpawn = rEnd + 0.6 * spd; continue; }
      if (G.nextSpawn + len > endClear) {
        // fill the remaining safe space with a few chips, then skip to the next segment
        if (G.nextSpawn + 0.5 * spd < endClear) builder(G.nextSpawn, spd, seg.mode).line(0, 0.6, 4, GY - 12);
        G.nextSpawn = segEnd + 1;
        continue;
      }
      const b = builder(G.nextSpawn, spd, seg.mode);
      b._spd = spd;
      pat.b(b);
      G.lastPat = pat.id;
      G.nextSpawn += len + (lvl().gap + Math.random() * 0.35) * spd;
    }
  }

  // ---------------------------------------------------------------- transitions
  function startMount(e) {
    const p = G.p;
    G.phase = 'mounting'; G.phaseT = 0;
    e.attached = true; G.mountBike = e;
    p.my0 = p.y; p.slide = false; p.vy = 0; p.onGround = false; p.jumpBuf = 0;
    sfx('mount');
    msg(SP.t('t.bike'), 'info');
  }
  function endMount() {
    const p = G.p;
    G.mode = 'bike'; G.phase = 'run';
    if (G.mountBike) G.mountBike.dead = true;
    p.y = GY; p.vy = 0; p.onGround = true;
    p.slide = !!SP.input.held.down;
    G.heat = Math.max(G.heat, 34);
    burst(playerWX() - 20, GY, 12, ['#3ef0ff', '#ff3fa4'], 140, 0.5);
  }
  function startBail(wall) {
    const p = G.p;
    G.phase = 'bailing'; G.phaseT = 0;
    G.mode = 'foot';
    p.vy = -430; p.onGround = false; p.slide = false; p.ramp = false; p.jumpBuf = 0;
    G.ents.push({ type: 'loseBike', x: playerWX(), vx: G.speed + 20, wall });
    sfx('jump');
    msg(SP.t('t.bailOut'), 'danger');
  }
  function startDelivery() {
    G.phase = 'delivering'; G.phaseT = 0;
    G.bonus += 1000 + Math.round(G.integrity) * 10;
    sfx('deliver');
    msg(SP.t('t.packageDelivered'), 'info');
  }
  function die(cause) {
    const p = G.p;
    if (G.cargo.length) {
      burst(playerWX() - 6, p.y - 30, 10 * G.cargo.length, ['#d8903a', '#f6c070', '#6a7296', '#e2703a'], 180, 0.9, 700, 2);
      G.cargoLost = G.cargo.length;
      G.cargo = [];
    }
    G.phase = 'dying'; G.phaseT = 0; G.killer = cause;
    if (G.mode === 'bike') {
      G.ents.push({ type: 'loseBike', x: playerWX(), vx: G.speed * 0.8, wall: null });
      G.mode = 'foot';
    }
    p.vy = -260; p.onGround = false; p.slide = false;
    G.shake = 8;
    sfx('explode');
    msg(SP.t('t.detained'), 'danger');
  }

  // ---------------------------------------------------------------- pursuit
  function updateLevel() {
    const L = G.heat >= 67 ? 2 : G.heat >= 34 ? 1 : 0;
    if (L > G.level) {
      G.level = L;
      sfx('level');
      msg(SP.t('t.alertLevel', { n: L + 1, name: SP.t('level.' + L) }), L === 2 ? 'danger' : 'warn');
      while (G.trackers.length < L + 1) G.trackers.push({ ph: Math.random() * 6, x: W + 30, y: 30 });
    }
    G.heat = Math.max(G.heat, SP.LEVELS[G.level].floor);
  }
  function tryBoost() {
    if (G.boost >= 100 && G.boostT <= 0) {
      G.boostT = SP.BOOST_TIME; G.boost = 0;
      G.heat = Math.max(SP.LEVELS[G.level].floor, G.heat - 10);
      G.boosts++;
      sfx('boost');
      msg(SP.t('t.overdrive'), 'info');
      G.shake = Math.max(G.shake, 2);
    } else sfx('deny');
  }

  // ---------------------------------------------------------------- reset / update
  G.reset = function () {
    S = SP.spr;
    Object.assign(G, {
      scroll: 0, dist: 0, time: 0, mode: 'foot', speed: SP.SPEED.foot, level: 0, heat: 0,
      integrity: 100, boost: 40, boostT: 0, chips: 0, avoided: 0, smashed: 0, hits: 0, boosts: 0, bonus: 0, score: 0,
      ents: [], parts: [], lines: [], phase: 'run', phaseT: 0, shake: 0, hitSlow: 0, flags: {},
      nextSpawn: 0, lastPat: null, killer: '', mountBike: null, ended: null, god: !!G.god,
      heals: 0, cargo: [], cargoLost: 0, cargoDropped: 0, cargoCollected: 0, cargoDelivered: 0, cargoPoints: 0, deliveries: 0, floats: [], reserved: []
    });
    G.p = { x: PX, y: GY, vy: 0, onGround: true, slide: false, slideT: 0, invT: 0, hitT: 0, anim: 0,
      jumpBuf: 0, fastFall: false, ramp: false, my0: GY };
    G.trackers = [{ ph: 0, x: W + 30, y: 30 }];
    for (const s of SP.ROUTE) {
      if (s.last) G.ents.push({ type: 'drop', x: s.end * PPM });
      else if (s.mode === 'foot') G.ents.push({ type: 'parkedBike', x: s.end * PPM });
      else G.ents.push({ type: 'endWall', x: s.end * PPM });
    }
    // secondary objective: predefined pickups and delivery checkpoints (fresh every run)
    const maxSpd = (m) => SP.SPEED[SP.segAtM(m).mode] * SP.LEVELS[2].mult;
    SP.CARGO.pickups.forEach((m, i) => {
      G.ents.push({ type: 'cargo', x: m * PPM, kind: i % 3 });
      G.reserved.push([m * PPM - 10, m * PPM + 10]);
    });
    for (const h of SP.HEALS.spots) {
      G.ents.push({ type: 'heal', x: h.m * PPM, kind: h.kind });
      G.reserved.push([h.m * PPM - 10, h.m * PPM + 10]);
    }
    for (const m of SP.CARGO.checkpoints) {
      G.ents.push({ type: 'checkpoint', x: m * PPM, done: false });
      G.reserved.push([m * PPM - 1.1 * maxSpd(m), m * PPM + 0.6 * maxSpd(m)]);
    }
    SP.world.reset(() => SP.zoneAtM((G.scroll + W) / PPM).theme);
    SP.input.flush();
  };

  G.update = function (dt) {
    const p = G.p, inp = SP.input;
    G.time += dt; G.phaseT += dt;
    const ctrl = G.phase === 'run';
    if (ctrl) {
      if (inp.take('jump')) p.jumpBuf = 0.13;
      if (inp.take('boost')) tryBoost();
    } else { inp.take('jump'); inp.take('boost'); }
    const down = ctrl && inp.held.down;

    // pursuit pressure rises with time
    if (G.phase === 'run') G.heat = Math.min(100, G.heat + dt * 0.62);
    updateLevel();

    // speed
    let target = SP.SPEED[G.mode] * lvl().mult;
    if (G.boostT > 0) target *= SP.BOOST_MULT;
    if (G.hitSlow > 0) target *= 0.6;
    if (G.phase === 'dying' || G.phase === 'delivering') target = 0;
    if (G.phase === 'mounting') target = SP.SPEED.foot * 1.1;
    const acc = G.boostT > 0 ? 700 : target > G.speed ? 240 : 420;
    G.speed += SP.clamp(target - G.speed, -acc * dt, acc * dt);
    G.scroll += G.speed * dt;
    G.dist = Math.min(SP.TOTAL_M, G.scroll / PPM);

    // timers
    if (G.boostT > 0) G.boostT -= dt;
    if (G.hitSlow > 0) G.hitSlow -= dt;
    if (p.invT > 0) p.invT -= dt;
    if (p.hitT > 0) p.hitT -= dt;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 18);
    if (ctrl && G.boostT <= 0) {
      const before = G.boost;
      G.boost = Math.min(100, G.boost + dt * 1.2);
      if (before < 100 && G.boost >= 100 && !G.flags.boostTip) { G.flags.boostTip = true; msg(SP.t(SP.touchUI ? 't.boostTouch' : 't.boostKeys'), 'info'); }
    }
    if (G.boost >= 100 && !G.flags.boostTip) { G.flags.boostTip = true; msg(SP.t(SP.touchUI ? 't.boostTouch' : 't.boostKeys'), 'info'); }

    // route messages
    const zone = SP.zoneAtM(G.dist);
    if (zone.index > 0 && !G.flags['zone' + zone.index] && G.dist >= zone.start) {
      G.flags['zone' + zone.index] = true;
      // location changes are shown by the HUD street sign (no toast)
    }
    if (!G.flags.tip1 && G.time > 3.2) { G.flags.tip1 = true; msg(SP.t(SP.touchUI ? 't.tip1Touch' : 't.tip1Keys'), 'route'); }
    if (!G.flags.tip2 && G.mode === 'bike' && G.phase === 'run') { G.flags.tip2 = true; msg(SP.t(SP.touchUI ? 't.tip2Touch' : 't.tip2Keys'), 'route'); }
    if (!G.flags.near && G.dist > SP.TOTAL_M - 300) { G.flags.near = true; msg(SP.t('t.near'), 'route'); }

    spawn();
    updatePlayer(dt, down);

    // entities & collisions
    const pb = pbox();
    const wx = playerWX();
    for (const e of G.ents) {
      if (e.dead) continue;
      const t = T[e.type];
      if (t.update) t.update(e, dt);
      if (e.dead) continue;
      if (G.phase === 'run' && !e.hit && t.collide) {
        const b = t.hb(e);
        if (b && overlap(b, pb)) t.collide(e);
      }
      if (!e.counted && !e.hit && t.collide && e.type !== 'chip' && e.type !== 'endWall' && e.type !== 'cargo' && e.type !== 'heal') {
        const b = t.hb(e);
        if (b && b.x1 < wx - 20) { e.counted = true; G.avoided++; }
      }
      if (!t.persist && e.type !== 'drop') {
        const right = e.x + (e.w || 160);
        if (right < G.scroll - 120) e.dead = true;
      }
    }
    if (G.ents.length > 60 || (G.time * 10 | 0) % 10 === 0) G.ents = G.ents.filter((e) => !e.dead);

    // particles
    for (const q of G.parts) { q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    if (G.parts.length) G.parts = G.parts.filter((q) => q.life > 0);
    if (G.mode === 'bike' || G.boostT > 0) {
      if (Math.random() < (G.boostT > 0 ? 0.9 : 0.35)) G.lines.push({ x: W + 10, y: 40 + Math.random() * (GY - 40), l: 10 + Math.random() * 30, v: 600 + Math.random() * 300 });
    }
    for (const l of G.lines) l.x -= l.v * dt;
    if (G.lines.length) G.lines = G.lines.filter((l) => l.x + l.l > 0);

    // tracker drones
    for (let i = 0; i < G.trackers.length; i++) {
      const d = G.trackers[i];
      let tx = PX + 60 + i * 80 + Math.sin(G.time * 0.6 + d.ph) * 30;
      let ty = 42 + i * 9 + Math.sin(G.time * 1.4 + d.ph) * 6;
      if (G.phase === 'dying') { tx = PX - 20 + i * 22; ty = GY - 52 - i * 6; }
      if (G.phase === 'delivering') { tx = PX + 200 + i * 60; ty = -40; }
      d.x += (tx - d.x) * Math.min(1, dt * 1.8);
      d.y += (ty - d.y) * Math.min(1, dt * 1.8);
    }

    G.score = Math.floor(G.dist) + G.chips * 50 + G.avoided * 10 + G.smashed * 25 + G.bonus + G.cargoPoints;
    for (const f of G.floats) { f.t += dt; f.y -= 16 * dt; }
    if (G.floats.length) G.floats = G.floats.filter((f) => f.t < 1.3);

    // engine sound
    SP.audio.setEngine(G.mode === 'bike' && G.phase !== 'dying', G.speed, G.boostT > 0);

    // end states
    if (G.phase === 'dying' && G.phaseT > 1.8 && !G.ended) { G.ended = 'over'; SP.main.endRun('over'); }
    if (G.phase === 'delivering' && G.phaseT > 2.2 && !G.ended) { G.ended = 'complete'; SP.main.endRun('complete'); }
  };

  function updatePlayer(dt, down) {
    const p = G.p;
    const jumpHeld = SP.input.held.jump;
    if (G.phase === 'mounting') {
      const k = Math.min(1, G.phaseT / 0.5);
      p.y = SP.lerp(p.my0, GY, k) - Math.sin(k * Math.PI) * 22;
      if (G.mountBike) G.mountBike.x = playerWX();
      if (k >= 1) endMount();
      return;
    }
    p.jumpBuf -= dt;
    if (G.phase === 'run') {
      if (p.jumpBuf > 0 && p.onGround && !(p.slide && overheadAbove())) {
        p.vy = -SP.JUMP_V[G.mode]; p.onGround = false; p.jumpBuf = 0; p.slide = false; p.fastFall = false; p.ramp = false;
        sfx('jump');
        burst(playerWX() - 4, GY, 5, ['#5a6088', '#8a90b0'], 60, 0.3);
      }
      // variable jump height: releasing early shortens the jump
      if (!p.onGround && !jumpHeld && !p.ramp && p.vy < -300) p.vy = -300;
      // fast-fall when pressing down in the air
      if (down && !p.onGround && !p.fastFall && p.vy > -260) { p.vy = Math.max(p.vy, 420); p.fastFall = true; }
      if (p.onGround) {
        if (down && !p.slide) { p.slide = true; p.slideT = 0; sfx('slide'); }
        if (p.slide) {
          p.slideT += dt;
          if (!down && p.slideT > 0.3 && !overheadAbove()) p.slide = false;
          if (G.mode === 'foot' && Math.random() < 0.4) burst(playerWX() + 6, GY, 1, ['#8a90b0'], 50, 0.25);
        }
      }
    }
    if (!p.onGround) {
      p.vy += SP.GRAV * dt;
      p.y += p.vy * dt;
      if (p.y >= GY) {
        p.y = GY; p.vy = 0; p.onGround = true; p.fastFall = false; p.ramp = false;
        if (G.phase === 'bailing') { G.phase = 'run'; G.heat = Math.max(G.heat, 67); }
        if (G.phase !== 'dying') { sfx('land'); burst(playerWX(), GY, 6, ['#5a6088', '#8a90b0'], 70, 0.3); }
        if (down && G.phase === 'run') { p.slide = true; p.slideT = 0; }
      }
    }
    p.anim += dt * (G.speed / (G.mode === 'bike' ? 30 : 21));
  }

  // ---------------------------------------------------------------- render
  function playerSprite() {
    const p = G.p;
    if (G.phase === 'dying') return { spr: p.onGround ? S.down : S.hit, ox: 11, bike: false };
    if (G.phase === 'mounting' || G.phase === 'bailing') return { spr: S.jump, ox: 11, bike: false };
    if (G.mode === 'bike') {
      const fr = Math.floor(p.anim) % 3;
      return { spr: (p.slide ? S.bikeDuck : S.bikeRide)[fr], ox: 22, bike: true };
    }
    if (p.hitT > 0) return { spr: S.hit, ox: 11 };
    if (!p.onGround) return { spr: p.vy < 60 ? S.jump : S.fall, ox: 11 };
    if (p.slide) return { spr: S.slide, ox: 11 };
    if (G.phase === 'delivering' && G.speed < 20) return { spr: S.run[0], ox: 11 };
    return { spr: S.run[Math.floor(p.anim) % 8], ox: 11 };
  }

  G.render = function (ctx, rdt) {
    const p = G.p;
    ctx.save();
    if (G.shake > 0 && SP.settings.shake) ctx.translate(Math.round((Math.random() - 0.5) * G.shake), Math.round((Math.random() - 0.5) * G.shake));
    const prog = SP.clamp(G.dist / SP.TOTAL_M, 0, 1);
    SP.world.drawSky(ctx, prog, G.time);
    SP.world.drawLayers(ctx, G.scroll, G.time);

    // tracker drone searchlights
    for (const d of G.trackers) {
      const sx = PX + Math.sin(G.time * 1.1 + d.ph) * 10;
      ctx.fillStyle = G.level >= 2 ? 'rgba(255,45,74,0.09)' : 'rgba(255,90,110,0.06)';
      ctx.beginPath(); ctx.moveTo(d.x + 9, d.y + 10); ctx.lineTo(sx - 22, GY); ctx.lineTo(sx + 26, GY); ctx.closePath(); ctx.fill();
    }

    SP.world.drawGround(ctx, G.scroll, G.time);

    // entities (ground decals first, then the rest)
    for (const e of G.ents) if (!e.dead && T[e.type].ground) T[e.type].draw(ctx, e);
    for (const e of G.ents) {
      if (e.dead || T[e.type].ground || !T[e.type].draw) continue;
      const x = e.x - G.scroll;
      if (!T[e.type].persist && (x > W + 80 || x < -200)) continue;
      T[e.type].draw(ctx, e);
    }

    // player
    if (G.phase === 'mounting' && G.mountBike) {
      ctx.drawImage(S.bikeEmpty[0], PX - 22, GY - 31);
    }
    const ps = playerSprite();
    const sx = Math.round(p.x - ps.ox), sy = Math.round(p.y) - ps.spr.height + 1;
    if (G.boostT > 0) {
      const gh = S.ghostOf(ps.spr);
      ctx.globalAlpha = 0.35; ctx.drawImage(gh, sx - 8, sy);
      ctx.globalAlpha = 0.18; ctx.drawImage(gh, sx - 16, sy);
      ctx.globalAlpha = 1;
    }
    if (ps.bike) {
      // headlight beam
      ctx.fillStyle = 'rgba(255,224,138,0.08)';
      ctx.beginPath(); ctx.moveTo(sx + 41, sy + 14); ctx.lineTo(sx + 120, sy + 4); ctx.lineTo(sx + 120, GY + 2); ctx.closePath(); ctx.fill();
    }
    const blink = p.invT > 0 && Math.floor(p.invT * 14) % 2 === 0 && G.phase === 'run';
    if (!blink) drawCargoStack(ctx, ps, sx, sy);
    if (G.boostT > 0) {
      // soft cyan bloom behind the courier, fading to nothing at its edges
      const pulse = 0.16 + 0.05 * Math.sin(G.time * 18);
      softGlow(ctx, sx + ps.spr.width / 2, sy + ps.spr.height / 2, ps.spr.width * 0.9, ps.spr.height * 0.75, 'rgba(62,240,255,' + pulse.toFixed(3) + ')');
    }
    if (!blink) {
      ctx.drawImage(S.haloOf(ps.spr), sx - 2, sy - 2);
      ctx.drawImage(p.hitT > 0.22 ? S.flashOf(ps.spr) : ps.spr, sx, sy);
    }
    if (G.boostT > 0) {
      // boost aura hugs the courier's silhouette instead of a box
      ctx.globalAlpha = 0.22 + 0.08 * Math.sin(G.time * 18);
      ctx.drawImage(S.boostHaloOf(ps.spr), sx - 2, sy - 2);
      ctx.globalAlpha = 1;
    }

    // drones & beams on top
    for (const e of G.ents) if (!e.dead && T[e.type].drawTop) T[e.type].drawTop(ctx, e);
    for (const d of G.trackers) {
      ctx.drawImage(S.drone[Math.floor(G.time * 15) % 2], Math.round(d.x), Math.round(d.y));
      if (Math.floor(G.time * 3 + d.ph) % 2) { ctx.fillStyle = '#ff2d4a'; ctx.fillRect(Math.round(d.x) + 11, Math.round(d.y) + 13, 2, 1); }
    }

    // particles
    for (const q of G.parts) {
      ctx.globalAlpha = SP.clamp(q.life / q.max, 0, 1);
      ctx.fillStyle = q.col;
      ctx.fillRect(Math.round(q.x - G.scroll), Math.round(q.y), q.sz, q.sz);
    }
    ctx.globalAlpha = 1;

    // floating feedback labels (cargo count, delivery points)
    for (const f of G.floats) {
      const tw = g.textW(f.text);
      const fx = Math.round(f.x - G.scroll - tw / 2), fy = Math.round(f.y);
      ctx.globalAlpha = SP.clamp(1.6 - f.t * 1.4, 0, 1);
      ctx.fillStyle = 'rgba(6,8,22,0.75)'; ctx.fillRect(fx - 2, fy - 2, tw + 4, 9);
      g.text(ctx, f.text, fx, fy, f.col, 1);
    }
    ctx.globalAlpha = 1;

    SP.world.drawRain(ctx, rdt, G.speed, G.scroll);
    SP.world.drawFore(ctx, G.scroll, G.time);

    // speed lines
    ctx.fillStyle = G.boostT > 0 ? 'rgba(62,240,255,0.45)' : 'rgba(200,210,255,0.18)';
    for (const l of G.lines) ctx.fillRect(Math.round(l.x), Math.round(l.y), Math.round(l.l), 1);

    ctx.restore();
  };

  G.T = T;
  G.PAT = PAT;
})();
