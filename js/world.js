/* SampaPunk — São Paulo 2099 scenery: sky, parallax layers, ground, foreground, rain.
   Background layers are generated procedurally in 480px chunks (cached) per district theme. */
(function () {
  'use strict';
  const SP = window.SP;
  const g = SP.gfx;
  const W = SP.W, H = SP.H, GY = SP.GROUND, PPM = SP.PPM;
  const CH = 480;
  const VARIANTS = 3;

  const TH = {
    liberdade: {
      far: '#251a4e', farMin: 40, farMax: 110, farLit: 0.08,
      farWin: ['#7a3a5a', '#8a3040', '#4a4a8a'],
      mid: ['#17173a', '#1b1636', '#1e1834'], midMin: 50, midMax: 120,
      midWin: ['#ff8a5a', '#ffcf7a', '#ff4a6a', '#7ad8ff'], midLit: 0.22,
      near: ['#2d1f30', '#30233a', '#24263c', '#33262c', '#202b36'],
      signs: ['PASTELARIA', 'LAMEN', 'MERCADO', 'SUSHI BAR', 'FARMÁCIA', 'KARAOKÊ', 'YAKISOBA', 'LOJA 24H', 'CAFÉ'],
      signCols: ['#ff3fa4', '#ff4a5a', '#3ef0ff', '#ffb238'],
      awnings: [['#c8283c', '#e8d8c8'], ['#1f6f86', '#d8e8f0'], ['#e8a030', '#3a2a24']]
    },
    paulista: {
      far: '#22205a', farMin: 80, farMax: 175, farLit: 0.1,
      farWin: ['#3a6a9a', '#5a4a9a', '#2a8aa0'],
      mid: ['#141a3c', '#16203f', '#12183a'], midMin: 90, midMax: 165,
      midWin: ['#5ad8ff', '#a8f0ff', '#ff8ad0', '#ffcf7a'], midLit: 0.3,
      near: ['#18263f', '#1b2a48', '#1a2240'],
      signs: ['ARGOS', 'BANCO SP', 'COMPRE JÁ', 'CONECTA+', 'VIVA 2099', 'NEURAL+'],
      signCols: ['#3ef0ff', '#ff3fa4', '#8a5cff', '#ffb238'],
      awnings: []
    },
    centro: {
      far: '#2a1a46', farMin: 60, farMax: 150, farLit: 0.07,
      farWin: ['#8a5a3a', '#6a4a7a', '#4a5a7a'],
      mid: ['#1c1a34', '#1e1730', '#1a1c36'], midMin: 60, midMax: 140,
      midWin: ['#ffb070', '#ffd890', '#ff6a5a', '#80c8ff'], midLit: 0.2,
      near: ['#33292c', '#2c2a36', '#3a2c26', '#2a2e34', '#30263a'],
      signs: ['BAR DO ZÉ', 'PADARIA', 'LANCHONETE', 'OFICINA', 'ALUGA-SE', 'SAPATARIA', 'BILHAR', 'HOTEL', 'RELÓGIOS'],
      signCols: ['#ff3fa4', '#ffb238', '#3ef0ff', '#4dff9a'],
      awnings: [['#2a6a4a', '#e0d8c0'], ['#8a2a3a', '#e8d8c8'], ['#3a3a7a', '#d8d8f0']]
    },
    minhocao: {
      far: '#24184c', farMin: 50, farMax: 130, farLit: 0.09,
      farWin: ['#7a4a6a', '#4a5a8a', '#8a6a3a'],
      mid: ['#1a1838', '#1c1a3a', '#181c3a'], midMin: 70, midMax: 150,
      midWin: ['#ffcf7a', '#7ad8ff', '#ff8ad0', '#ffa860'], midLit: 0.32,
      near: ['#2b2a3c', '#302a36', '#28303c', '#33283a'],
      signs: ['BORRACHARIA', 'VENDE-SE', 'OFICINA', 'AÇAÍ', 'ACADEMIA', 'PIZZARIA', 'BAR'],
      signCols: ['#ff3fa4', '#ffb238', '#3ef0ff', '#4dff9a'],
      awnings: []
    }
  };

  // ------------------------------------------------------------ helpers
  function windows(x, r, bx, by, bw, bh, stepX, stepY, ww, wh, lit, cols, dark) {
    for (let yy = by + 4; yy < by + bh - 3; yy += stepY) {
      for (let xx = bx + 3; xx + ww < bx + bw - 2; xx += stepX) {
        if (r() < lit) g.rect(x, xx, yy, ww, wh, SP.pick(cols, r));
        else if (dark) g.rect(x, xx, yy, ww, wh, dark);
      }
    }
  }
  function pixacao(x, r, bx, by, bw) {
    // São Paulo's tall, runic "pixação" rooftop tags
    let px = bx + 3;
    const end = bx + bw - 4;
    while (px < end) {
      const h = 6 + Math.floor(r() * 3);
      g.rect(x, px, by, 1, h, '#05050b');
      if (r() < 0.6) g.rect(x, px - 1, by, 3, 1, '#05050b');
      if (r() < 0.4) g.rect(x, px, by + h - 1, 2, 1, '#05050b');
      px += 3;
    }
  }
  function signBoard(x, r, sx, sy, w, label, col, list, scale) {
    scale = scale || 1;
    const tw = g.textW(label, scale);
    g.rect(x, sx, sy, w, 7 * scale + 3, '#0b0c18');
    g.rect(x, sx, sy, w, 1, g.rgba(col, 0.5));
    g.text(x, label, sx + Math.round((w - tw) / 2), sy + 2 + (label.match(/[ÁÂÃÉÊÍÓÔÕÚ]/) ? 1 : 0), col, scale);
    list.push({ x: sx, y: sy, w: w, h: 7 * scale + 3, col: col, id: Math.floor(r() * 1e6) });
  }

  // ------------------------------------------------------------ FAR layer
  function genFar(theme, v, seed) {
    const T = TH[theme], r = SP.mkRng(seed);
    const c = g.canvas(CH, H), x = g.ctx(c);
    const signs = [];
    const base = 214;
    let px = -10;
    while (px < CH) {
      const w = 16 + Math.floor(r() * 34);
      const h = T.farMin + Math.floor(r() * (T.farMax - T.farMin));
      const top = base - h;
      g.rect(x, px, top, w, H - top, T.far);
      if (r() < 0.4) g.rect(x, px + 3, top - 5, w - 6, 5, T.far);
      if (r() < 0.35) {
        const ax = px + Math.floor(w / 2);
        g.rect(x, ax, top - 14, 1, 14, T.far);
        g.rect(x, ax, top - 15, 1, 1, '#ff3b5c');
      }
      for (let yy = top + 3; yy < base; yy += 3)
        for (let xx = px + 2; xx < px + w - 2; xx += 2) if (r() < T.farLit) g.rect(x, xx, yy, 1, 1, SP.pick(T.farWin, r));
      if ((theme === 'paulista' || theme === 'minhocao') && r() < 0.18 && w > 26) {
        // holographic advert panel
        const col = SP.pick(['#ff3fa4', '#3ef0ff', '#8a5cff'], r);
        const hy = top + 10;
        g.rect(x, px + 3, hy, w - 6, 16, g.rgba(col, 0.28));
        for (let yy = hy; yy < hy + 16; yy += 2) g.rect(x, px + 3, yy, w - 6, 1, g.rgba(col, 0.18));
        signs.push({ x: px + 3, y: hy, w: w - 6, h: 16, col: col, id: Math.floor(r() * 1e6), holo: true });
      }
      px += w + (r() < 0.3 ? Math.floor(r() * 6) : 0);
    }
    if (theme === 'paulista' && v === 0) {
      // Avenida Paulista's TV broadcast towers
      for (const tx of [90, 300]) {
        const top = 20 + Math.floor(r() * 20);
        for (let yy = top; yy < base; yy++) {
          const hw = Math.round(1 + (yy - top) * 0.06);
          g.rect(x, tx - hw, yy, 1, 1, T.far);
          g.rect(x, tx + hw, yy, 1, 1, T.far);
          if (yy % 6 === 0) g.rect(x, tx - hw, yy, hw * 2 + 1, 1, T.far);
        }
        g.rect(x, tx, top - 10, 1, 10, T.far);
        g.rect(x, tx, top - 11, 1, 1, '#ff3b5c');
        g.rect(x, tx - 1, top + 30, 3, 1, '#ff3b5c');
      }
    }
    if (theme === 'centro' && v === 0) {
      // Edifício Itália silhouette with its crown
      const ex = 260, top = 34;
      g.rect(x, ex, top, 30, base - top, T.far);
      g.rect(x, ex + 4, top - 6, 22, 6, T.far);
      g.rect(x, ex + 13, top - 16, 4, 10, T.far);
      g.rect(x, ex + 14, top - 17, 2, 1, '#ff3b5c');
      for (let yy = top + 3; yy < base; yy += 3) for (let xx = ex + 2; xx < ex + 28; xx += 2) if (r() < 0.12) g.rect(x, xx, yy, 1, 1, '#8a6a4a');
    }
    return { c, signs };
  }

  // ------------------------------------------------------------ MID layer
  function masp(x, r) {
    // MASP — the suspended museum box between two red portal frames
    const red = '#d8283a', redSh = '#8a1424';
    const x0 = 140, x1 = 340, topY = 132;
    g.rect(x, x0, topY, 10, GY - topY, red); g.rect(x, x0 + 7, topY, 3, GY - topY, redSh);
    g.rect(x, x1 - 10, topY, 10, GY - topY, red); g.rect(x, x1 - 3, topY, 3, GY - topY, redSh);
    g.rect(x, x0, topY, x1 - x0, 9, red); g.rect(x, x0, topY + 7, x1 - x0, 2, redSh);
    g.rect(x, x0 + 10, topY + 9, x1 - x0 - 20, 42, '#1a2036');
    for (let xx = x0 + 12; xx < x1 - 12; xx += 4) g.rect(x, xx, topY + 10, 1, 40, '#28304e');
    for (let yy = topY + 14; yy < topY + 50; yy += 6) g.rect(x, x0 + 10, yy, x1 - x0 - 20, 1, '#2a3354');
    for (let i = 0; i < 18; i++) g.rect(x, x0 + 14 + Math.floor(r() * 170), topY + 12 + Math.floor(r() * 34), 2, 3, '#ffcf7a');
    g.rect(x, x0 + 10, topY + 51, x1 - x0 - 20, 3, '#3a3f5c');
    g.text(x, 'MASP 2099', x0 + 100 - Math.round(g.textW('MASP 2099') / 2), topY + 2, '#ffe0e4', 1);
    // the open "vão livre" plaza underneath, with a crowd of tiny figures and lights
    for (let i = 0; i < 22; i++) {
      const fx = x0 + 14 + Math.floor(r() * 172);
      g.rect(x, fx, GY - 6, 1, 4, '#0c0d1c');
      g.rect(x, fx, GY - 7, 1, 1, '#2a2e48');
    }
    for (let xx = x0 + 20; xx < x1 - 20; xx += 22) g.rect(x, xx, topY + 54, 2, 1, '#ffe08a');
  }
  function copan(x, r) {
    // Edifício Copan — the wave-shaped residential slab
    const cx = 250, top = 70, w = 120;
    for (let yy = top; yy < GY; yy++) {
      const off = Math.round(Math.sin((yy - top) * 0.035) * 9);
      g.rect(x, cx - w / 2 + off, yy, w, 1, '#1d1a36');
      if ((yy - top) % 3 === 0) {
        g.rect(x, cx - w / 2 + off, yy, w, 1, '#2c2850');
        for (let k = 0; k < 6; k++) if (r() < 0.6) g.rect(x, cx - w / 2 + off + 4 + Math.floor(r() * (w - 8)), yy + 1, 2, 1, SP.pick(['#ffcf7a', '#7ad8ff', '#ffa860'], r));
      }
    }
    g.rect(x, cx - w / 2 + 2, top - 3, w - 4, 3, '#1d1a36');
    pixacao(x, r, cx - w / 2 + 6, top - 12, 50);
  }
  function genMid(theme, v, seed) {
    const T = TH[theme], r = SP.mkRng(seed);
    const c = g.canvas(CH, H), x = g.ctx(c);
    const signs = [];
    let skipA = -1, skipB = -1;
    if (v === 0 && theme === 'paulista') { skipA = 130; skipB = 350; }
    if (v === 0 && theme === 'centro') { skipA = 180; skipB = 320; }
    let px = -6;
    while (px < CH) {
      const w = 34 + Math.floor(r() * 46);
      if (px + w > skipA && px < skipB) { px = skipB + 2; continue; }
      const h = T.midMin + Math.floor(r() * (T.midMax - T.midMin));
      const top = GY - h;
      const col = SP.pick(T.mid, r);
      g.rect(x, px, top, w, H - top, col);
      g.rect(x, px, top, 1, GY - top, g.rgba('#8a7aff', 0.12));
      g.rect(x, px, top, w, 1, g.rgba('#ffffff', 0.08));
      if (theme === 'paulista') {
        // glass curtain-wall towers
        for (let xx = px + 3; xx < px + w - 2; xx += 3) g.rect(x, xx, top + 3, 1, GY - top - 3, '#1c2c52');
        for (let yy = top + 5; yy < GY; yy += 5) if (r() < 0.45) g.rect(x, px + 3, yy, w - 6, 1, g.rgba(SP.pick(T.midWin, r), 0.55));
      } else {
        windows(x, r, px, top, w, GY - top, 4, 5, 2, 2, T.midLit, T.midWin, '#0e1028');
      }
      // rooftop clutter: water tanks, antennas
      if (r() < 0.5) {
        const tx = px + 3 + Math.floor(r() * (w - 14));
        g.rect(x, tx, top - 6, 9, 6, '#262a46'); g.rect(x, tx - 1, top - 7, 11, 1, '#3a3f63');
      }
      if (r() < 0.3) { const ax = px + Math.floor(w * 0.7); g.rect(x, ax, top - 12, 1, 12, '#262a46'); g.rect(x, ax, top - 13, 1, 1, '#ff3b5c'); }
      if (theme === 'centro' && r() < 0.55) pixacao(x, r, px, top + 2, Math.min(w, 34));
      if (theme === 'minhocao' && r() < 0.35 && w > 40) {
        // giant painted murals on blind walls (empenas)
        const my = top + 8, mh = Math.min(40, GY - top - 20);
        const cs = ['#ff3fa4', '#3ef0ff', '#ffb238', '#8a5cff', '#4dff9a'];
        g.rect(x, px + 4, my, w - 8, mh, g.rgba(SP.pick(cs, r), 0.55));
        for (let k = 0; k < 5; k++) g.rect(x, px + 6 + Math.floor(r() * (w - 16)), my + 2 + Math.floor(r() * (mh - 8)), 6, 6, g.rgba(SP.pick(cs, r), 0.7));
        g.rect(x, px + Math.floor(w / 2) - 4, my + 6, 8, 10, g.rgba('#0a0a14', 0.6));
      }
      if (r() < 0.28 && w > 36) {
        const label = SP.pick(T.signs, r);
        const sw = Math.max(g.textW(label) + 6, 24);
        if (sw < w + 10) signBoard(x, r, px + Math.round((w - sw) / 2), top - 13, sw, label, SP.pick(T.signCols, r), signs);
      }
      px += w + Math.floor(r() * 4);
    }
    if (v === 0 && theme === 'paulista') masp(x, r);
    if (v === 0 && theme === 'centro') copan(x, r);
    return { c, signs };
  }

  // ------------------------------------------------------------ NEAR layer
  function suzuran(x, px) {
    // Liberdade's red "suzuran" street lamps
    g.rect(x, px, GY - 58, 2, 58, '#2a2e48');
    g.rect(x, px - 5, GY - 58, 12, 1, '#2a2e48');
    for (const dx of [-6, 0, 6]) {
      g.rect(x, px + dx - 1, GY - 57, 1, 2, '#2a2e48');
      g.rect(x, px + dx - 2, GY - 55, 4, 4, '#ff4a5a');
      g.rect(x, px + dx - 1, GY - 54, 1, 1, '#ffd0d4');
    }
  }
  function genNearStreet(theme, v, seed) {
    const T = TH[theme], r = SP.mkRng(seed);
    const c = g.canvas(CH, H), x = g.ctx(c);
    const signs = [];
    let px = 0;
    while (px < CH) {
      let w = 56 + Math.floor(r() * 44);
      if (CH - (px + w) < 40) w = CH - px;
      const h = 80 + Math.floor(r() * 44);
      const top = GY - h;
      const col = SP.pick(T.near, r);
      g.rect(x, px, top, w, h, col);
      g.rect(x, px, top, w, 3, g.rgba('#ffffff', 0.09));
      g.rect(x, px - 1, top + 3, w + 2, 1, '#0c0d1a');
      g.rect(x, px + w - 1, top, 1, h, g.rgba('#000000', 0.35));
      if (theme === 'centro') {
        g.rect(x, px, top + 8, w, 1, g.rgba('#ffffff', 0.06));
        g.rect(x, px, GY - 52, w, 2, g.rgba('#ffffff', 0.07));
      }
      // upper floors
      for (let yy = top + 9; yy < GY - 56; yy += 15) {
        for (let xx = px + 6; xx + 8 < px + w - 4; xx += 13) {
          const lit = r() < 0.35;
          g.rect(x, xx - 1, yy - 1, 9, 11, '#0c0d1a');
          g.rect(x, xx, yy, 7, 9, lit ? SP.pick(['#ffcf7a', '#ff9a5a', '#7ad8ff', '#d08aff'], r) : '#151830');
          if (lit) g.rect(x, xx, yy + 5, 7, 4, g.rgba('#000000', 0.25));
          if (theme === 'centro' && r() < 0.6) g.rect(x, xx - 1, yy - 3, 9, 2, g.rgba('#ffffff', 0.08));
          if (r() < 0.3) { g.rect(x, xx + 1, yy + 10, 5, 3, '#5a6080'); g.rect(x, xx + 1, yy + 10, 5, 1, '#7a80a0'); }
          if (r() < 0.2) { g.rect(x, xx - 2, yy + 8, 11, 1, '#454b70'); for (let b = 0; b < 11; b += 2) g.rect(x, xx - 2 + b, yy + 5, 1, 3, '#454b70'); }
        }
      }
      // ground floor shop
      const sx = px + 4, sw = w - 8;
      if (r() < 0.38) {
        // steel roll-up shutter with graffiti
        g.rect(x, sx, GY - 32, sw, 32, '#3a3f5c');
        for (let yy = GY - 32; yy < GY; yy += 2) g.rect(x, sx, yy, sw, 1, '#2c3048');
        const tc = SP.pick(['#ff3fa4', '#3ef0ff', '#ffb238', '#e8e8f2'], r);
        let gx = sx + 4, gy = GY - 20;
        for (let k = 0; k < 10 && gx < sx + sw - 4; k++) {
          const ny = GY - 26 + Math.floor(r() * 14);
          g.line(x, gx, gy, gx + 4, ny, tc, 1);
          gx += 4; gy = ny;
        }
      } else {
        const warm = r() < 0.6;
        g.rect(x, sx, GY - 32, sw, 32, warm ? '#4a3220' : '#143444');
        g.rect(x, sx, GY - 32, sw, 10, warm ? '#6a4a2a' : '#1e4a5e');
        for (let yy = GY - 22; yy < GY - 4; yy += 6) g.rect(x, sx + 3, yy, sw - 6, 1, warm ? '#2a1a10' : '#0a2030');
        for (let k = 0; k < 4; k++) g.rect(x, sx + 4 + Math.floor(r() * (sw - 10)), GY - 21 + Math.floor(r() * 12), 3, 3, SP.pick(['#ff6a5a', '#ffd890', '#5aff9a', '#8ad8ff'], r));
        g.rect(x, sx + Math.floor(sw / 2) - 4, GY - 26, 8, 26, warm ? '#2a1a10' : '#0a1a26');
        // tiny silhouettes inside
        if (r() < 0.5) { const fx = sx + 6 + Math.floor(r() * (sw - 16)); g.rect(x, fx, GY - 14, 3, 14, '#0c0a10'); g.rect(x, fx, GY - 17, 3, 3, '#0c0a10'); }
        if (T.awnings.length) {
          const aw = SP.pick(T.awnings, r);
          for (let xx = sx - 2; xx < sx + sw + 2; xx += 4) g.rect(x, xx, GY - 37, 4, 5, (xx / 4) % 2 ? aw[0] : aw[1]);
          g.rect(x, sx - 2, GY - 32, sw + 4, 1, '#0c0d1a');
        }
      }
      // shop sign
      const label = SP.pick(T.signs, r);
      const tw = g.textW(label);
      if (tw + 8 <= sw) signBoard(x, r, sx + Math.round((sw - (tw + 8)) / 2), GY - 50, tw + 8, label, SP.pick(T.signCols, r), signs);
      // cables between buildings
      g.line(x, px, top + 20, px + w, top + 26 + Math.floor(r() * 6), '#0a0a14', 1);
      if (theme === 'liberdade' && px > 0) suzuran(x, px);
      px += w;
    }
    if (theme === 'liberdade' && v === 0) {
      // Liberdade red portal
      const red = '#c8283c';
      g.rect(x, 214, GY - 98, 6, 98, red); g.rect(x, 300, GY - 98, 6, 98, red);
      g.rect(x, 218, GY - 98, 2, 98, '#8a1424'); g.rect(x, 304, GY - 98, 2, 98, '#8a1424');
      g.rect(x, 198, GY - 104, 124, 6, '#d8343f'); g.rect(x, 196, GY - 106, 128, 2, '#e8505a');
      g.rect(x, 208, GY - 88, 104, 4, red);
      g.rect(x, 236, GY - 100, 48, 12, '#140a10');
      g.text(x, 'LIBERDADE', 260 - Math.round(g.textW('LIBERDADE') / 2), GY - 97, '#ffd890', 1);
      signs.push({ x: 236, y: GY - 100, w: 48, h: 12, col: '#ffb238', id: 77 });
    }
    return { c, signs };
  }
  function genNearHigh(theme, v, seed) {
    // Elevated road: we see upper floors of buildings rising past the viaduct, billboards and lamps.
    const T = TH[theme], r = SP.mkRng(seed);
    const c = g.canvas(CH, H), x = g.ctx(c);
    const signs = [];
    let px = 0, lastBill = -999;
    while (px < CH) {
      let w = 60 + Math.floor(r() * 50);
      if (CH - (px + w) < 40) w = CH - px;
      const h = theme === 'paulista' ? 34 + Math.floor(r() * 46) : 54 + Math.floor(r() * 60);
      const top = GY - h;
      const col = SP.pick(T.near, r);
      if (theme === 'paulista') {
        g.rect(x, px, top, w, h, col);
        for (let xx = px + 2; xx < px + w - 1; xx += 5) g.rect(x, xx, top + 2, 1, h, '#26355a');
        for (let yy = top + 4; yy < GY; yy += 6) {
          g.rect(x, px, yy, w, 1, '#101830');
          if (r() < 0.4) g.rect(x, px + 2, yy + 2, w - 4, 2, g.rgba(SP.pick(T.midWin, r), 0.45));
        }
        g.rect(x, px, top, w, 2, '#3a4a7a');
      } else {
        // dense apartment blocks hugging the Minhocão
        g.rect(x, px, top, w, h, col);
        g.rect(x, px, top, w, 2, g.rgba('#ffffff', 0.1));
        for (let yy = top + 6; yy < GY - 4; yy += 11) {
          for (let xx = px + 4; xx + 7 < px + w - 3; xx += 10) {
            const lit = r() < 0.38;
            g.rect(x, xx, yy, 7, 7, lit ? SP.pick(['#ffcf7a', '#7ad8ff', '#ff8ad0', '#ffa860'], r) : '#14162c');
            if (lit && r() < 0.4) g.rect(x, xx + 1, yy + 2, 5, 5, g.rgba('#3ef0ff', 0.25));
            g.rect(x, xx - 1, yy + 7, 9, 1, '#454b70');
          }
          if (r() < 0.35) {
            // laundry line
            const ly = yy + 9;
            g.rect(x, px + 3, ly, w - 6, 1, '#0a0a14');
            for (let xx = px + 5; xx < px + w - 6; xx += 4) if (r() < 0.6) g.rect(x, xx, ly + 1, 2, 3, SP.pick(['#e8e8f2', '#ff3fa4', '#ffb238', '#3ef0ff', '#4dff9a'], r));
          }
        }
      }
      const label = SP.pick(T.signs, r);
      const bw = Math.max(48, g.textW(label, 2) + 10);
      const bx = px + Math.floor(w / 2);
      if (r() < 0.5 && bx - bw / 2 > lastBill + 8 && bx - bw / 2 > 2 && bx + bw / 2 < CH - 2) {
        // billboard on a pole
        lastBill = bx + bw / 2;
        const col2 = SP.pick(T.signCols, r);
        g.rect(x, bx - 1, GY - 70, 3, 70, '#1a1d30');
        g.rect(x, bx - Math.round(bw / 2), GY - 96, bw, 26, '#0b0c18');
        g.rect(x, bx - Math.round(bw / 2), GY - 96, bw, 1, '#3a3f63');
        g.text(x, label, bx - Math.round(g.textW(label, 2) / 2), GY - 92, col2, 2);
        g.text(x, theme === 'paulista' ? 'SEGURANÇA TOTAL' : 'SÃO PAULO 2099', bx - Math.round(g.textW(theme === 'paulista' ? 'SEGURANÇA TOTAL' : 'SÃO PAULO 2099') / 2), GY - 78, '#c8d0f0', 1);
        signs.push({ x: bx - Math.round(bw / 2), y: GY - 96, w: bw, h: 26, col: col2, id: Math.floor(r() * 1e6) });
      }
      px += w;
    }
    return { c, signs };
  }

  // ------------------------------------------------------------ pattern tiles
  let sidewalkTile = null, starField = null;
  function buildTiles() {
    // Portuguese-style wave mosaic sidewalk, inspired by São Paulo's patterned pavements
    sidewalkTile = g.canvas(32, 20);
    const x = g.ctx(sidewalkTile);
    g.rect(x, 0, 0, 32, 20, '#1b1e36');
    for (let i = 0; i < 32; i++) {
      const y0 = 4 + Math.round(Math.sin((i / 32) * Math.PI * 2) * 2.5);
      g.rect(x, i, y0, 1, 3, '#2a2f50');
      g.rect(x, i, y0 + 9, 1, 3, '#2a2f50');
    }
    for (let i = 0; i < 32; i += 2) for (let j = 1; j < 20; j += 3) if ((i * 7 + j * 3) % 5 === 0) g.rect(x, i, j, 1, 1, '#14162a');
    starField = [];
    const r = SP.mkRng(99);
    for (let i = 0; i < 70; i++) starField.push([Math.floor(r() * W), Math.floor(r() * 120), r()]);
  }

  // ------------------------------------------------------------ state
  const cache = {};
  const LAYERS = [
    { id: 'far', f: 0.08, gen: genFar },
    { id: 'mid', f: 0.25, gen: genMid },
    { id: 'near', f: 0.55, gen: null }
  ];
  let assigned = [new Map(), new Map(), new Map()];
  let lastTheme = [null, null, null];
  let themeProvider = () => 'liberdade';
  const EXTRA = {};   // district generators registered by districts.js
  let rain = [];
  let fore = [];

  function getChunk(li, i) {
    let a = assigned[li].get(i);
    if (!a) {
      const theme = themeProvider();
      let v;
      if (theme !== lastTheme[li]) v = 0;
      else v = 1 + Math.floor(SP.hash(i * 7 + li * 131) * (VARIANTS - 1));
      lastTheme[li] = theme;
      a = { theme, v };
      assigned[li].set(i, a);
    }
    const key = li + '-' + a.theme + '-' + a.v;
    if (!cache[key]) cache[key] = makeChunk(li, a.theme, a.v);
    return cache[key];
  }
  // Scenery recedes behind gameplay: mid and near layers are slightly desaturated and darkened.
  const GRADE = [null, [0.85, 0.88], [0.74, 0.8]];
  function makeChunk(li, th, v) {
    const seed = 1000 + li * 97 + v * 13 + th.length * 1009 + th.charCodeAt(0) * 17;
    const L = LAYERS[li];
    const ex = EXTRA[th] && EXTRA[th][L.id];
    const ch = ex ? ex(v, seed) : L.gen ? L.gen(th, v, seed) : (th === 'paulista' || th === 'minhocao') ? genNearHigh(th, v, seed) : genNearStreet(th, v, seed);
    if (!ch.props) ch.props = [];
    if (GRADE[li]) g.grade(ch.c, GRADE[li][0], GRADE[li][1], '#1a1440');
    return ch;
  }

  function reset(provider) {
    if (!sidewalkTile) buildTiles();
    themeProvider = provider || (() => 'liberdade');
    assigned = [new Map(), new Map(), new Map()];
    lastTheme = [null, null, null];
    rain = [];
    const r = SP.mkRng(5);
    for (let i = 0; i < 130; i++) rain.push({ x: r() * (W + 120), y: r() * H, s: 300 + r() * 160, l: 4 + Math.floor(r() * 4) });
  }
  function prewarm() {
    if (!sidewalkTile) buildTiles();
    for (const th of Object.keys(TH)) {
      for (let li = 0; li < 3; li++) {
        for (let v = 0; v < VARIANTS; v++) {
          const key = li + '-' + th + '-' + v;
          if (cache[key]) continue;
          cache[key] = makeChunk(li, th, v);
        }
      }
    }
  }

  // ------------------------------------------------------------ drawing
  const skyMemo = new Map();
  function toHex(rgb) {
    return '#' + rgb.replace(/rgb\(|\)/g, '').split(',').map((v) => ('0' + (+v).toString(16)).slice(-2)).join('');
  }
  function drawSky(ctx, p, t) {
    // banded (posterised) gradient that slowly shifts toward dawn as the route progresses
    const key = Math.round(SP.clamp(p, 0, 1) * 60);
    let bands = skyMemo.get(key);
    if (!bands) {
      bands = [];
      const pp = (key / 60) * (key / 60);
      const top = toHex(g.mix('#04050d', '#1d1740', pp));
      const mid = toHex(g.mix('#0d0f2a', '#4a2464', pp));
      const hor = toHex(g.mix('#2e1656', '#ff8a4a', pp));
      for (let y = 0; y < 220; y += 4) {
        const k = y / 220;
        bands.push(k < 0.55 ? g.mix(top, mid, k / 0.55) : g.mix(mid, hor, (k - 0.55) / 0.45));
      }
      skyMemo.set(key, bands);
    }
    for (let i = 0; i < bands.length; i++) { ctx.fillStyle = bands[i]; ctx.fillRect(0, i * 4, W, 4); }
    ctx.fillRect(0, bands.length * 4, W, H);
    const sa = Math.max(0, 1 - p * 1.4);
    if (sa > 0) {
      for (const s of starField) {
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + s[2] * 20);
        ctx.fillStyle = 'rgba(200,210,255,' + (sa * (0.25 + 0.5 * tw * s[2])).toFixed(3) + ')';
        ctx.fillRect(s[0], s[1], 1, 1);
      }
      ctx.fillStyle = 'rgba(232,224,255,' + (0.85 * sa).toFixed(3) + ')';
      ctx.fillRect(384, 30, 14, 14); ctx.fillRect(382, 32, 18, 10); ctx.fillRect(386, 28, 10, 18);
      ctx.fillStyle = 'rgba(160,150,210,' + (0.8 * sa).toFixed(3) + ')';
      ctx.fillRect(388, 33, 3, 3); ctx.fillRect(393, 39, 2, 2);
    }
    if (p > 0.6) {
      const a = (p - 0.6) / 0.4;
      ctx.fillStyle = 'rgba(255,170,90,' + (0.18 * a).toFixed(3) + ')';
      ctx.fillRect(0, 170, W, 50);
    }
    // drifting smog bands
    ctx.fillStyle = 'rgba(70,40,110,0.18)';
    const o = (t * 4) % 600;
    for (let i = 0; i < 4; i++) ctx.fillRect(Math.round((((i * 170 - o) % 600) + 600) % 600 - 120), 120 + i * 17, 160, 3);
  }

  function drawLayers(ctx, scroll, t) {
    for (let li = 0; li < LAYERS.length; li++) {
      const L = LAYERS[li];
      const ls = scroll * L.f;
      const i0 = Math.floor(ls / CH);
      for (let i = i0; i <= i0 + 1; i++) {
        const ch = getChunk(li, i);
        const ox = Math.round(i * CH - ls);
        ctx.drawImage(ch.c, ox, 0);
        if (ch.props.length && ox < W && ox + CH > 0) {
          // live animated details (holo screens, trains…) clipped to their chunk
          ctx.save(); ctx.beginPath(); ctx.rect(ox, 0, CH, H); ctx.clip();
          for (const pr of ch.props) pr(ctx, ox, t, i);
          ctx.restore();
        }
        for (const s of ch.signs) {
          const sx = ox + s.x;
          if (sx > W || sx + s.w < 0) continue;
          // neon flicker: brief random dropouts per sign
          const fl = SP.hash(s.id + Math.floor(t * 9));
          if (fl < (s.holo ? 0.12 : 0.035)) {
            ctx.fillStyle = 'rgba(5,6,15,0.65)';
            ctx.fillRect(sx, s.y, s.w, s.h);
          } else if (li === 2) {
            ctx.fillStyle = g.rgba(s.col, 0.05);
            ctx.fillRect(sx - 3, s.y - 3, s.w + 6, s.h + 6);
          }
        }
      }
      if (li === 1) {
        // atmospheric haze between mid and near layers
        ctx.fillStyle = 'rgba(20,12,48,0.22)';
        ctx.fillRect(0, 0, W, GY);
      }
      if (li === 2) {
        // street-level shade: the band where obstacles live sits darker than the facades above
        for (let k = 0; k < 16; k++) {
          ctx.fillStyle = 'rgba(4,5,14,' + (0.015 * (k + 1)).toFixed(3) + ')';
          ctx.fillRect(0, GY - 64 + k * 4, W, 4);
        }
      }
    }
  }
  function indoorSpans(scroll) {
    const out = [];
    const ls = scroll * LAYERS[2].f;
    const i0 = Math.floor(ls / CH);
    for (let i = i0; i <= i0 + 1; i++) {
      const a = assigned[2].get(i);
      if (a && EXTRA[a.theme] && EXTRA[a.theme].indoor) { const ox = Math.round(i * CH - ls); out.push([ox, ox + CH]); }
    }
    return out;
  }
  const inSpan = (sp, x) => { for (const s of sp) if (x >= s[0] && x < s[1]) return true; return false; };
  function nearSigns(scroll) {
    const out = [];
    const ls = scroll * LAYERS[2].f;
    const i0 = Math.floor(ls / CH);
    for (let i = i0; i <= i0 + 1; i++) {
      const a = assigned[2].get(i);
      if (!a) continue;
      const ch = cache[2 + '-' + a.theme + '-' + a.v];
      if (!ch) continue;
      const ox = Math.round(i * CH - ls);
      for (const s of ch.signs) out.push({ x: ox + s.x, w: s.w, col: s.col });
    }
    return out;
  }

  function groundFoot(ctx, scroll, a, b, t) {
    // curb + mosaic sidewalk + street
    ctx.fillStyle = '#4a5078'; ctx.fillRect(a, GY, b - a, 1);
    ctx.fillStyle = '#2e3354'; ctx.fillRect(a, GY + 1, b - a, 2);
    const off = Math.floor(scroll) % 32;
    for (let x = -off; x < W; x += 32) {
      if (x + 32 < a || x > b) continue;
      ctx.drawImage(sidewalkTile, x, GY + 3);
    }
    ctx.fillStyle = '#3a3f63'; ctx.fillRect(a, GY + 23, b - a, 2);
    ctx.fillStyle = '#121426'; ctx.fillRect(a, GY + 25, b - a, H - GY - 25);
    ctx.fillStyle = '#5a5430';
    const o2 = Math.floor(scroll) % 60;
    for (let x = -o2; x < W; x += 60) if (x + 26 > a && x < b) ctx.fillRect(Math.max(a, x), GY + 36, Math.min(26, b - x), 2);
    // wet reflections of near-layer neon
    for (const s of nearSigns(scroll)) {
      if (s.x + s.w < a || s.x > b) continue;
      ctx.fillStyle = g.rgba(s.col, 0.12 + 0.04 * Math.sin(t * 3 + s.x));
      for (let y = GY + 4; y < GY + 22; y += 2) ctx.fillRect(Math.max(a, s.x + ((y >> 1) % 3) - 1), y, Math.min(s.w, b - s.x), 1);
    }
  }
  function groundRoad(ctx, scroll, a, b, t) {
    // concrete guard wall behind the lane
    ctx.fillStyle = '#353a58'; ctx.fillRect(a, GY - 12, b - a, 12);
    ctx.fillStyle = '#4e5580'; ctx.fillRect(a, GY - 12, b - a, 2);
    ctx.fillStyle = '#262a44'; ctx.fillRect(a, GY - 2, b - a, 2);
    const o = Math.floor(scroll) % 48;
    for (let x = -o; x < W; x += 48) {
      if (x < a || x > b) continue;
      ctx.fillStyle = '#2a2e48'; ctx.fillRect(x, GY - 10, 1, 8);
      ctx.fillStyle = (Math.floor((scroll + x) / 48) % 2) ? '#3ef0ff' : '#ff3fa4';
      ctx.fillRect(x + 20, GY - 8, 2, 2);
    }
    // asphalt
    ctx.fillStyle = '#4a5078'; ctx.fillRect(a, GY, b - a, 1);
    ctx.fillStyle = '#17192e'; ctx.fillRect(a, GY + 1, b - a, 22);
    ctx.fillStyle = '#c8b060';
    const o2 = Math.floor(scroll) % 44;
    for (let x = -o2; x < W; x += 44) if (x + 22 > a && x < b) ctx.fillRect(Math.max(a, x), GY + 11, Math.min(22, b - x), 2);
    // viaduct slab edge (brutalist concrete)
    ctx.fillStyle = '#2f3352'; ctx.fillRect(a, GY + 23, b - a, H - GY - 23);
    ctx.fillStyle = '#41466a'; ctx.fillRect(a, GY + 23, b - a, 2);
    const o3 = Math.floor(scroll) % 64;
    for (let x = -o3; x < W; x += 64) {
      if (x < a || x > b) continue;
      ctx.fillStyle = '#23263e'; ctx.fillRect(x, GY + 25, 1, H - GY - 25);
      ctx.fillStyle = 'rgba(10,10,20,0.35)'; ctx.fillRect(x + 12, GY + 25, 3, 12 + ((x * 7) & 7));
    }
    ctx.fillStyle = '#1b1d30'; ctx.fillRect(a, H - 6, b - a, 6);
  }
  function drawGround(ctx, scroll, t) {
    for (const z of SP.ZONES) {
      let a = Math.round(z.start * PPM - scroll);
      let b = z.last ? W + 1 : Math.round(z.end * PPM - scroll);
      if (z.index === 0) a = Math.min(a, 0);
      if (b < 0 || a > W) continue;
      a = Math.max(0, a); b = Math.min(W, b);
      const mode = SP.segAtM(z.start + 0.01).mode;
      ctx.save();
      ctx.beginPath(); ctx.rect(a, 0, b - a, H); ctx.clip();
      const custom = EXTRA[z.theme] && EXTRA[z.theme].ground;
      if (custom) custom(ctx, scroll, a, b, t);
      else if (mode === 'foot') groundFoot(ctx, scroll, a, b, t); else groundRoad(ctx, scroll, a, b, t);
      ctx.restore();
    }
  }
  function drawFore(ctx, scroll, t) {
    // dark foreground lamp posts & cables passing close to the camera
    const f = 1.3, sp = 760;
    const ls = scroll * f;
    const i0 = Math.floor(ls / sp);
    const indoor = indoorSpans(scroll);
    for (let i = i0; i <= i0 + 1; i++) {
      const x = Math.round(i * sp - ls + 300);
      if (x < -40 || x > W + 40) continue;
      if (inSpan(indoor, x) || inSpan(indoor, x - 16)) continue;
      const m = SP.segAtM((scroll + x) / PPM).mode;
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = '#05060c';
      ctx.fillRect(x, 96, 5, H - 96);
      ctx.fillRect(x - 14, 96, 19, 3);
      ctx.fillRect(x - 16, 98, 6, 3);
      const lc = m === 'bike' ? '#ffcf7a' : '#3ef0ff';
      ctx.fillStyle = lc; ctx.fillRect(x - 15, 101, 4, 1);
      ctx.fillStyle = g.rgba(lc, 0.06);
      ctx.beginPath(); ctx.moveTo(x - 15, 102); ctx.lineTo(x - 50, GY); ctx.lineTo(x + 20, GY); ctx.closePath(); ctx.fill();
      if (m === 'foot') {
        // decorative overhead wires stay high and faint so they never read as obstacles
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#05060c';
        for (let k = 0; k < 2; k++) {
          for (let xx = 0; xx < sp * 0.6; xx += 3) {
            const yy = 98 + k * 3 + Math.round(Math.sin((xx / (sp * 0.6)) * Math.PI) * 8);
            ctx.fillRect(x + xx, yy, 3, 1);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  }
  function drawRain(ctx, dt, speed, scroll) {
    ctx.fillStyle = 'rgba(150,175,235,0.26)';
    const indoor = scroll === undefined ? [] : indoorSpans(scroll);
    for (const d of rain) {
      d.y += d.s * dt;
      d.x -= (d.s * 0.22 + speed * 0.5) * dt;
      if (d.y > GY + 30 || d.x < -10) { d.y = -10 - Math.random() * 40; d.x = Math.random() * (W + 160); }
      const x = Math.round(d.x), y = Math.round(d.y);
      if (indoor.length && inSpan(indoor, x)) continue;
      ctx.fillRect(x, y, 1, d.l);
      ctx.fillRect(x - 1, y + d.l, 1, 2);
    }
  }

  function registerTheme(name, base, gens) {
    TH[name] = TH[base];
    EXTRA[name] = gens;
  }
  function overrideTheme(name, gens) { EXTRA[name] = Object.assign(EXTRA[name] || {}, gens); }

  SP.world = { reset, prewarm, drawSky, drawLayers, drawGround, drawFore, drawRain, TH, registerTheme, overrideTheme,
    _h: { windows, pixacao, signBoard, genFar, genMid, genNearStreet, genNearHigh, groundFoot, groundRoad, CH } };
})();
