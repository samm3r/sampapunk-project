/* SampaPunk — São Paulo 2099 districts inspired by the reference board:
   Liberdade metro station, Avenida Paulista (MASP + holo towers), Marginal Pinheiros (Ponte Estaiada),
   Centro Histórico (Sé cathedral, train on arches, murals), Minhocão (sodium haze) and the Periferia.
   Each district plugs generators into the scenery engine; live props animate holo screens and trains. */
(function () {
  'use strict';
  const SP = window.SP;
  const g = SP.gfx;
  const WD = SP.world, hp = WD._h;
  const GY = SP.GROUND, H = SP.H, CH = hp.CH, PPM = SP.PPM;

  // ------------------------------------------------------------ shared pixel helpers
  function ell(x, cx, cy, rx, ry, col) {
    x.fillStyle = col;
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      x.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
    }
  }
  function blank() {
    const c = g.canvas(CH, H);
    return { c, x: g.ctx(c), signs: [], props: [] };
  }
  const PAL_HOLO = { dark: '#2a0a48', mid: '#8a2ad0', light: '#ff8ae8', hi: '#ffe0ff', lip: '#ff3fa4' };
  const PAL_MURAL = { dark: '#24222c', mid: '#4a4656', light: '#7a7488', hi: '#aaa2b8', lip: '#6a4a5a' };
  // A stylised pixel portrait (the "São Paulo 2099" holo face / street mural)
  function portrait(x, cx, cy, P) {
    cx = Math.round(cx); cy = Math.round(cy);
    ell(x, cx, cy + 21, 13, 5, P.mid);
    ell(x, cx, cy + 1, 11, 14, P.dark);
    g.rect(x, cx - 11, cy + 1, 22, 17, P.dark);
    for (let i = -9; i <= 9; i += 3) g.rect(x, cx + i, cy - 8 + Math.abs(i) / 2, 1, 22 - Math.abs(i), P.mid);
    g.rect(x, cx - 3, cy + 8, 6, 7, P.mid);
    ell(x, cx, cy, 7, 9, P.light);
    g.rect(x, cx + 4, cy - 4, 2, 10, P.mid);
    g.rect(x, cx - 7, cy - 9, 14, 3, P.dark);
    g.rect(x, cx - 5, cy - 6, 3, 1, P.dark); g.rect(x, cx + 3, cy - 6, 2, 1, P.dark);
    g.rect(x, cx - 4, cy - 3, 3, 1, P.mid); g.rect(x, cx + 1, cy - 3, 3, 1, P.mid);
    g.rect(x, cx - 4, cy - 1, 3, 1, P.dark); g.rect(x, cx + 1, cy - 1, 3, 1, P.dark);
    g.rect(x, cx - 3, cy - 1, 1, 1, P.hi); g.rect(x, cx + 2, cy - 1, 1, 1, P.hi);
    g.rect(x, cx, cy + 1, 1, 2, P.mid);
    g.rect(x, cx - 2, cy + 5, 5, 1, P.lip);
    g.rect(x, cx - 1, cy + 6, 3, 1, P.mid);
  }
  function outlinedText(x, str, tx, ty, col, s, ol) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) g.text(x, str, tx + dx, ty + dy, ol, s);
    g.text(x, str, tx, ty, col, s);
  }
  const centerText = (x, str, cx, y, col, s) => g.text(x, str, Math.round(cx - g.textW(str, s || 1) / 2), y, col, s || 1);

  // ------------------------------------------------------------ METRÔ (Liberdade station, Linha 1-Azul)
  function metroLogo(x, cx, cy, col) {
    // SP Metrô-style mark: a diamond with a vertical bar
    for (let i = 0; i < 6; i++) { g.rect(x, cx - i, cy - 6 + i, 1, 1, col); g.rect(x, cx + i, cy - 6 + i, 1, 1, col); g.rect(x, cx - i, cy + 6 - i, 1, 1, col); g.rect(x, cx + i, cy + 6 - i, 1, 1, col); }
    g.rect(x, cx, cy - 3, 1, 7, col);
  }
  function nearMetro(v, seed) {
    const r = SP.mkRng(seed), ch = blank(), x = ch.x;
    // ceiling and beams
    g.rect(x, 0, 0, CH, 40, '#10131f');
    for (let bx = 0; bx < CH; bx += 120) { g.rect(x, bx, 0, 12, 44, '#191d2e'); g.rect(x, bx, 43, 12, 1, '#2a3048'); }
    // back wall: tiled, with the blue line-colour band
    g.rect(x, 0, 40, CH, GY - 40, '#1c2236');
    for (let yy = 46; yy < 108; yy += 6) g.rect(x, 0, yy, CH, 1, '#171c2d');
    for (let yy = 40; yy < 108; yy += 6) for (let xx = ((yy / 6) % 2) * 4; xx < CH; xx += 8) g.rect(x, xx, yy, 1, 6, '#171c2d');
    g.rect(x, 0, 108, CH, 6, '#2a5bd7'); g.rect(x, 0, 114, CH, 1, '#16307a');
    g.rect(x, 0, 115, CH, 31, '#161a2a');
    // train waiting at the platform
    for (let cx = 0; cx < CH; cx += 160) {
      g.rect(x, cx + 2, 146, 156, 76, '#7a8298');
      g.rect(x, cx + 2, 144, 156, 2, '#a0a8c0');
      g.rect(x, cx + 2, 198, 156, 4, '#2a5bd7');
      g.rect(x, cx, 146, 2, 76, '#0a0c18');
      for (const wx of [10, 60, 104]) {
        g.rect(x, cx + wx, 156, 28, 22, '#ffd890');
        g.rect(x, cx + wx, 172, 28, 6, '#d8a860');
        for (let k = 0; k < 3; k++) if (r() < 0.6) { const px = cx + wx + 3 + Math.floor(r() * 22); g.rect(x, px, 164, 3, 14, '#3a2a20'); g.rect(x, px, 161, 3, 3, '#3a2a20'); }
      }
      for (const dx of [42, 90, 136]) {
        g.rect(x, cx + dx, 152, 14, 70, '#5a6280');
        g.rect(x, cx + dx + 2, 158, 10, 16, '#e8c070');
        g.rect(x, cx + dx + 7, 152, 1, 70, '#3a4060');
      }
    }
    // fluorescent tubes + light spill
    for (let lx = 30; lx < CH; lx += 120) {
      g.rect(x, lx - 1, 35, 36, 1, '#5a6a8a');
      g.rect(x, lx, 36, 34, 2, '#d8f4ff');
      g.poly(x, [[lx, 38], [lx + 34, 38], [lx + 64, 146], [lx - 30, 146]], 'rgba(200,240,255,0.05)');
    }
    // platform columns in front of the train
    for (const px of [100, 340]) {
      g.rect(x, px, 40, 18, GY - 40, '#252c44');
      g.rect(x, px, 40, 2, GY - 40, '#3a4466');
      g.rect(x, px + 16, 40, 2, GY - 40, '#161a2a');
      g.rect(x, px, 108, 18, 6, '#2a5bd7');
    }
    if (v === 0) {
      // hanging station sign
      g.rect(x, 180, 44, 1, 6, '#3a4060'); g.rect(x, 290, 44, 1, 6, '#3a4060');
      g.rect(x, 172, 50, 128, 26, '#121624');
      g.rect(x, 172, 74, 128, 2, '#d8b23a');
      metroLogo(x, 186, 62, '#e8e8f2');
      g.text(x, 'METRÔ', 198, 54, '#ffffff', 1);
      g.text(x, 'LIBERDADE', 222, 54, '#d8b23a', 1);
      g.text(x, 'LINHA 1 - AZUL', 198, 64, '#6a9aff', 1);
      ch.signs.push({ x: 172, y: 50, w: 128, h: 26, col: '#d8b23a', id: 501 });
    } else if (v === 1) {
      // "another tomorrow is possible" holo poster + network map
      g.rect(x, 230, 52, 90, 50, '#1a0a34'); g.rect(x, 230, 52, 90, 1, '#c8a0ff');
      portrait(x, 252, 72, PAL_HOLO);
      g.text(x, 'UM OUTRO', 270, 60, '#e0c8ff', 1);
      g.text(x, 'AMANHÃ', 270, 69, '#e0c8ff', 1);
      g.text(x, 'É POSSÍVEL', 270, 79, '#ff8ae8', 1);
      ch.signs.push({ x: 230, y: 52, w: 90, h: 50, col: '#c8a0ff', id: 502 });
      g.rect(x, 20, 56, 60, 36, '#b8bccb'); g.rect(x, 20, 56, 60, 1, '#e8eaf2');
      const lines = [['#2a5bd7', 62], ['#2aa060', 70], ['#d8283a', 78], ['#e8c030', 86]];
      for (const [c, y] of lines) { g.rect(x, 24, y, 52, 1, c); g.rect(x, 24 + Math.floor(r() * 40), y - 3, 1, 6, c); }
      for (let i = 0; i < 8; i++) g.rect(x, 26 + i * 6, 62 + (i % 4) * 8, 2, 2, '#ffffff');
    } else {
      // exit sign, arrival board, bench
      g.rect(x, 200, 48, 64, 14, '#0e5a3a'); g.rect(x, 200, 48, 64, 1, '#8affc0');
      g.text(x, 'SAÍDA >', 210, 53, '#e8fff0', 1);
      ch.signs.push({ x: 200, y: 48, w: 64, h: 14, col: '#4dff9a', id: 503 });
      g.rect(x, 250, 70, 70, 16, '#0a0c14'); g.rect(x, 250, 70, 70, 1, '#3a4060');
      g.text(x, 'PRÓXIMO 2 MIN', 254, 76, '#ffb238', 1);
      ch.signs.push({ x: 250, y: 70, w: 70, h: 16, col: '#ffb238', id: 504 });
    }
    return ch;
  }
  function groundMetro(ctx, scroll, a, b) {
    ctx.fillStyle = '#5a6080'; ctx.fillRect(a, GY, b - a, 1);
    ctx.fillStyle = '#2a2f45'; ctx.fillRect(a, GY + 1, b - a, H - GY - 1);
    // tactile safety strip
    ctx.fillStyle = '#b8902a'; ctx.fillRect(a, GY + 2, b - a, 5);
    ctx.fillStyle = '#7a5e1a';
    const o = Math.floor(scroll) % 4;
    for (let xx = -o; xx < 480; xx += 4) if (xx >= a && xx < b) { ctx.fillRect(xx, GY + 3, 1, 1); ctx.fillRect(xx + 2, GY + 5, 1, 1); }
    // polished floor tiles with faint ceiling-light reflections
    ctx.fillStyle = '#232838';
    const o2 = Math.floor(scroll) % 24;
    for (let xx = -o2; xx < 480; xx += 24) if (xx >= a && xx < b) ctx.fillRect(xx, GY + 8, 1, H - GY - 8);
    ctx.fillRect(a, GY + 20, b - a, 1);
    ctx.fillStyle = 'rgba(200,240,255,0.06)';
    const o3 = Math.floor(scroll * 0.55) % 120;
    for (let xx = 30 - o3; xx < 480; xx += 120) if (xx + 34 > a && xx < b) ctx.fillRect(Math.max(a, xx), GY + 10, 34, 2);
  }
  // Liberdade's first street chunk opens with the station exit
  function nearLiberdade(v, seed) {
    const ch = hp.genNearStreet('liberdade', v, seed);
    if (v === 0) {
      const x = g.ctx(ch.c);
      g.rect(x, 0, GY - 120, 70, 120, '#262c44');
      g.rect(x, 0, GY - 120, 70, 3, '#3a4466');
      g.rect(x, 0, GY - 92, 70, 6, '#2a5bd7');
      g.rect(x, 8, GY - 52, 54, 52, '#ffd890');
      g.rect(x, 8, GY - 52, 54, 4, '#e8b060');
      for (let i = 0; i < 6; i++) g.rect(x, 10 + i * 9, GY - 12 + (i % 2), 8, 2, '#c89a50');
      g.rect(x, 12, GY - 80, 46, 18, '#121624');
      metroLogo(x, 21, GY - 71, '#e8e8f2');
      g.text(x, 'METRÔ', 30, GY - 76, '#ffffff', 1);
      g.text(x, 'SAÍDA', 30, GY - 68, '#d8b23a', 1);
      ch.signs.push({ x: 12, y: GY - 80, w: 46, h: 18, col: '#d8b23a', id: 505 });
    }
    return ch;
  }

  // ------------------------------------------------------------ AVENIDA PAULISTA
  function holoTower(ch, r, bx, w, top, kind) {
    const x = ch.x || g.ctx(ch.c);
    g.rect(x, bx, top, w, GY - top, '#12102a');
    g.rect(x, bx, top, 1, GY - top, '#2a2450');
    hp.windows(x, r, bx, top + 64, w, GY - top - 64, 4, 5, 2, 2, 0.2, ['#5a4a9a', '#ff8ad0', '#7ad8ff'], '#0c0a1e');
    g.rect(x, bx + w / 2, top - 14, 1, 14, '#2a2450'); g.rect(x, bx + w / 2, top - 15, 1, 1, '#ff3b5c');
    const sx = bx + 3, sy = top + 4, sw = w - 6, sh = 56;
    if (kind === 'portrait') {
      g.rect(x, sx, sy, sw, sh, '#1c0a34');
      portrait(x, sx + sw / 2, sy + 18, PAL_HOLO);
      centerText(x, 'SÃO PAULO', sx + sw / 2, sy + sh - 15, '#ffd0f8');
      centerText(x, '2099', sx + sw / 2, sy + sh - 7, '#ff8ae8');
    } else {
      g.rect(x, sx, sy, sw, sh, '#0a1a4a');
      for (let i = 0; i < 6; i++) { const yy = sy + 6 + Math.floor(r() * 18); g.rect(x, sx + 2, yy, sw - 4, 1, '#14306a'); }
      centerText(x, 'TECNOLOGIA', sx + sw / 2, sy + 28, '#7ae0ff');
      centerText(x, 'PARA', sx + sw / 2, sy + 37, '#7ae0ff');
      centerText(x, 'TODOS', sx + sw / 2, sy + 46, '#ffffff');
    }
    for (let yy = sy; yy < sy + sh; yy += 2) g.rect(x, sx, yy, sw, 1, 'rgba(0,0,0,0.22)');
    g.rect(x, sx - 1, sy - 1, sw + 2, 1, kind === 'portrait' ? '#ff8ae8' : '#7ae0ff');
    ch.signs.push({ x: sx, y: sy, w: sw, h: sh, col: kind === 'portrait' ? '#ff3fa4' : '#3ef0ff', id: bx * 7 + top });
    const scanCol = kind === 'portrait' ? 'rgba(255,170,255,0.22)' : 'rgba(140,230,255,0.22)';
    ch.props.push((ctx, ox, t) => {
      // slow scan line + rare horizontal glitch slice
      ctx.fillStyle = scanCol;
      ctx.fillRect(ox + sx, sy + Math.floor((t * 16) % sh), sw, 1);
      if (SP.hash(Math.floor(t * 3) + bx) < 0.06) {
        const k = sy + Math.floor(SP.hash(Math.floor(t * 20) + bx) * (sh - 4));
        ctx.drawImage(ch.c, sx, k, sw, 3, ox + sx + 2, k, sw, 3);
      }
    });
  }
  function midPaulista(v, seed) {
    const ch = hp.genMid('paulista', v, seed);
    ch.props = [];
    const x = g.ctx(ch.c), r = SP.mkRng(seed + 5);
    if (v === 0) {
      // MASP banner: "arte, cultura, futuro"
      g.rect(x, 160, 141, 36, 42, '#c8283a'); g.rect(x, 160, 141, 36, 1, '#ff6a7a');
      centerText(x, 'MASP', 178, 145, '#ffe0e4');
      centerText(x, 'ARTE', 178, 155, '#ffd0d4');
      centerText(x, 'CULTURA', 178, 163, '#ffd0d4');
      centerText(x, 'FUTURO', 178, 171, '#ffd0d4');
      holoTower(ch, r, 372, 46, 56, 'portrait');
    } else if (v === 1) {
      holoTower(ch, r, 70, 46, 50, 'portrait');
      holoTower(ch, r, 300, 52, 62, 'tech');
    } else {
      holoTower(ch, r, 200, 52, 56, 'tech');
    }
    return ch;
  }
  function tree(x, cx, r) {
    g.rect(x, cx - 1, GY - 28, 3, 28, '#1a1410');
    ell(x, cx, GY - 36, 14, 10, '#0f2e22');
    ell(x, cx - 9, GY - 30, 9, 7, '#0f2e22');
    ell(x, cx + 10, GY - 31, 10, 7, '#0f2e22');
    ell(x, cx - 4, GY - 40, 7, 4, '#1a4632');
    for (let i = 0; i < 14; i++) g.rect(x, cx - 14 + Math.floor(r() * 28), GY - 44 + Math.floor(r() * 18), 1, 1, r() < 0.3 ? '#c89a50' : '#2a6a48');
  }
  function busStop(x, bx) {
    g.rect(x, bx, GY - 38, 44, 3, '#3a3f63');
    g.rect(x, bx + 1, GY - 35, 2, 23, '#3a3f63'); g.rect(x, bx + 41, GY - 35, 2, 23, '#3a3f63');
    g.rect(x, bx + 3, GY - 35, 38, 23, 'rgba(255,190,110,0.26)');
    g.rect(x, bx + 30, GY - 34, 10, 20, '#ff8a5a'); g.text(x, 'SP', bx + 31, GY - 29, '#3a1a10', 1);
    g.rect(x, bx + 12, GY - 29, 3, 15, '#140c10'); g.rect(x, bx + 12, GY - 32, 3, 3, '#140c10');
    g.rect(x, bx + 5, GY - 20, 18, 2, '#2a2e48');
  }
  function nearPaulista(v, seed) {
    const ch = hp.genNearHigh('paulista', v, seed);
    const x = g.ctx(ch.c), r = SP.mkRng(seed + 9);
    for (let tx = 20 + Math.floor(r() * 30); tx < CH - 20; tx += 70 + Math.floor(r() * 50)) tree(x, tx, r);
    if (v !== 2) busStop(x, 150 + v * 170);
    return ch;
  }

  // ------------------------------------------------------------ MARGINAL PINHEIROS
  function ponteEstaiada(x, cx) {
    // cable-stayed bridge with its X-shaped pylon and amber-lit cable fans
    for (let k = 0; k < 14; k++) {
      const ty = 58 + k * 4;
      g.line(x, cx - 2, ty, cx - 26 - k * 12, 176, 'rgba(255,178,56,0.7)', 1);
      g.line(x, cx + 2, ty, cx + 26 + k * 12, 176, 'rgba(255,178,56,0.7)', 1);
    }
    g.line(x, cx - 16, 184, cx + 10, 50, '#343a5c', 3);
    g.line(x, cx + 16, 184, cx - 10, 50, '#343a5c', 3);
    g.line(x, cx - 15, 183, cx + 11, 49, '#5a6290', 1);
    g.rect(x, cx - 1, 46, 2, 2, '#ff3b5c');
    g.rect(x, cx - 200, 175, 400, 3, '#262a46');
    for (let xx = cx - 196; xx < cx + 200; xx += 6) g.rect(x, xx, 178, 1, 1, '#ffcf7a');
  }
  function midMarginal(v, seed) {
    const r = SP.mkRng(seed), ch = blank(), x = ch.x;
    let px = -4;
    while (px < CH) {
      const w = 14 + Math.floor(r() * 30), hgt = 50 + Math.floor(r() * 110), top = 184 - hgt;
      g.rect(x, px, top, w, 184 - top, SP.pick(['#161a3c', '#1a1838', '#141c3e'], r));
      g.rect(x, px, top, 1, 184 - top, 'rgba(138,122,255,0.12)');
      hp.windows(x, r, px, top, w, 184 - top, 3, 4, 1, 2, 0.2, ['#ffcf7a', '#7ad8ff', '#ff8ad0', '#ffa860'], null);
      if (r() < 0.22 && w > 20) g.rect(x, px + 3, top + 6, w - 6, 10, g.rgba(SP.pick(['#ff3fa4', '#3ef0ff', '#8a5cff'], r), 0.45));
      if (r() < 0.3) { g.rect(x, px + (w >> 1), top - 10, 1, 10, '#161a3c'); g.rect(x, px + (w >> 1), top - 11, 1, 1, '#ff3b5c'); }
      px += w + Math.floor(r() * 3);
    }
    if (v === 0) ponteEstaiada(x, 240);
    // Pinheiros river with rippled reflections of the skyline
    g.rect(x, 0, 184, CH, GY - 184, '#0a0d22');
    const im = x.getImageData(0, 0, CH, H), d = im.data;
    for (let y = 186; y < GY; y++) {
      const sy = Math.round(184 - (y - 184) * 1.7);
      if (sy < 0) break;
      const f = 0.42 * (1 - (y - 186) / (GY - 186));
      for (let xx = 0; xx < CH; xx++) {
        const off = Math.round(Math.sin(y * 0.9 + xx * 0.05) * 2);
        const si = (sy * CH + Math.min(CH - 1, Math.max(0, xx + off))) * 4, di = (y * CH + xx) * 4;
        if (!d[si + 3]) continue;
        for (let k = 0; k < 3; k++) d[di + k] = d[di + k] * (1 - f) + d[si + k] * f;
      }
    }
    x.putImageData(im, 0, 0);
    g.rect(x, 0, 183, CH, 2, '#2a2e48');
    return ch;
  }
  function dirSign(x, sx, lines, arrow) {
    const w = Math.max(...lines.map((l) => g.textW(l))) + 18;
    g.rect(x, sx + 6, 70, 3, GY - 104, '#2a2e48'); g.rect(x, sx + w - 9, 70, 3, GY - 104, '#2a2e48');
    g.rect(x, sx, 42, w, 28, '#1a5a3c');
    g.rect(x, sx + 1, 43, w - 2, 1, '#cfe8d8'); g.rect(x, sx + 1, 68, w - 2, 1, '#cfe8d8');
    lines.forEach((l, i) => g.text(x, l, sx + 12, 46 + i * 7, '#e8f5ee', 1));
    g.text(x, arrow, arrow === '<' ? sx + 4 : sx + w - 7, 53, '#ffffff', 1);
  }
  function nearMarginal(v, seed) {
    const r = SP.mkRng(seed), ch = blank(), x = ch.x;
    // river embankment wall
    g.rect(x, 0, GY - 20, CH, 20, '#262a44');
    g.rect(x, 0, GY - 20, CH, 2, '#3a4066');
    for (let xx = 0; xx < CH; xx += 40) g.rect(x, xx, GY - 18, 1, 18, '#1c2036');
    if (v === 0) {
      // graffiti wall section by the river
      g.rect(x, 170, GY - 40, 140, 40, '#2a2e48'); g.rect(x, 170, GY - 40, 140, 2, '#3a4066');
      g.rect(x, 170, GY - 40, 1, 40, '#1c2036'); g.rect(x, 309, GY - 40, 1, 40, '#1c2036');
      outlinedText(x, 'SAMPA', 200, GY - 35, '#e8a030', 4, '#140c08');
      hp.pixacao(x, r, 176, GY - 39, 40);
    } else {
      g.rect(x, 200, GY - 32, 70, 32, '#2a2e48'); g.rect(x, 200, GY - 32, 70, 2, '#3a4066');
      hp.pixacao(x, r, 204, GY - 30, 60);
      outlinedText(x, 'ZL', 222, GY - 21, '#3ef0ff', 2, '#06101a');
    }
    for (const xx of [40, 420]) { g.rect(x, xx, GY - 32, 18, 12, '#141420'); g.rect(x, xx + 8, GY - 20, 2, 8, '#2a2e48'); g.text(x, '>>', xx + 3, GY - 29, '#ffb238', 1); }
    // amber highway lamps
    for (let lx = 80; lx < CH; lx += 160) {
      g.rect(x, lx, GY - 112, 2, 92, '#1a1d30');
      g.rect(x, lx - 10, GY - 112, 12, 2, '#1a1d30');
      g.rect(x, lx - 11, GY - 110, 5, 2, '#ffcf7a');
      g.poly(x, [[lx - 11, GY - 108], [lx - 6, GY - 108], [lx + 14, GY - 20], [lx - 32, GY - 20]], 'rgba(255,207,122,0.07)');
    }
    if (v === 0) dirSign(x, 40, ['MARG. PINHEIROS', 'C. UNIVERSITÁRIA', 'INTERLAGOS'], '<');
    if (v === 1) dirSign(x, 300, ['ZONA SUL', 'MORUMBI', 'ITAIM'], '>');
    return ch;
  }

  // ------------------------------------------------------------ CENTRO HISTÓRICO
  function catedralSe(x, cx) {
    const c = '#2a2238', hi = '#3a3050';
    g.rect(x, cx - 50, 160, 100, GY - 160, '#241e34');
    for (const tx of [cx - 46, cx + 32]) {
      g.rect(x, tx, 98, 14, GY - 98, c); g.rect(x, tx, 98, 1, GY - 98, hi);
      g.poly(x, [[tx, 99], [tx + 7, 30], [tx + 14, 99]], c);
      g.rect(x, tx + 6, 24, 2, 8, c); g.rect(x, tx + 5, 27, 4, 1, c);
      g.rect(x, tx - 2, 96, 18, 3, hi);
      for (let k = 0; k < 4; k++) { g.rect(x, tx + 4, 108 + k * 24, 6, 12, '#ffb070'); g.rect(x, tx + 5, 107 + k * 24, 4, 1, '#ffb070'); }
    }
    ell(x, cx, 150, 20, 16, c);
    g.rect(x, cx - 20, 150, 41, 12, c);
    ell(x, cx - 6, 142, 6, 4, hi);
    g.rect(x, cx - 2, 126, 4, 10, c); g.rect(x, cx - 1, 118, 2, 8, c); g.rect(x, cx - 3, 120, 6, 1, c);
    ell(x, cx, 180, 8, 8, '#ffa860'); ell(x, cx, 180, 4, 4, '#ff6a5a');
    for (let a = 0; a < 8; a++) g.rect(x, cx + Math.round(Math.cos(a * Math.PI / 4) * 6), 180 + Math.round(Math.sin(a * Math.PI / 4) * 6), 1, 1, '#241e34');
    g.rect(x, cx - 7, 200, 14, GY - 200, '#ffcf7a'); g.rect(x, cx - 5, 198, 10, 2, '#ffcf7a');
    g.rect(x, cx - 50, 204, 100, GY - 204, 'rgba(255,170,90,0.10)');
  }
  const VD = 120; // viaduct deck height (above the storefront rooftops)
  function arches(x) {
    g.rect(x, 0, VD, CH, 6, '#2c2838');
    g.rect(x, 0, VD, CH, 1, '#4a4460');
    for (let ax = 0; ax < CH; ax += 32) {
      g.rect(x, ax, VD + 6, 6, GY - VD - 6, '#2c2838');
      g.rect(x, ax + 6, VD + 14, 26, 30, '#120e1c');
      g.rect(x, ax + 6, VD + 6, 26, 8, '#2c2838');
      g.rect(x, ax + 9, VD + 12, 20, 2, '#120e1c'); g.rect(x, ax + 13, VD + 10, 12, 2, '#120e1c');
      g.rect(x, ax + 11, VD + 17, 16, 20, 'rgba(255,160,80,0.14)');
      g.rect(x, ax + 18, VD + 16, 2, 2, '#ffb060');
      g.rect(x, ax + 6, VD + 44, 26, 3, '#2c2838');
    }
  }
  // CPTM-style train crossing the arches — positioned in layer space so it flows across chunks
  function trainProp(ctx, ox, t, i) {
    const P = 1440, L = 174, pos = (t * 26) % P;
    const c0 = i * CH;
    for (let s = Math.floor((c0 - L - pos) / P) * P + pos; s < c0 + CH; s += P) {
      const sx = Math.round(ox + (s - c0));
      const ty = VD - 14;
      for (let c = 0; c < 3; c++) {
        const cx = sx + c * 58;
        ctx.fillStyle = '#8a8aa0'; ctx.fillRect(cx, ty + 1, 56, 13);
        ctx.fillStyle = '#6a6a80'; ctx.fillRect(cx + 2, ty, 52, 1);
        ctx.fillStyle = '#a02a3a'; ctx.fillRect(cx, ty + 9, 56, 2);
        ctx.fillStyle = '#d8b070';
        for (let w = 4; w < 52; w += 7) ctx.fillRect(cx + w, ty + 3, 4, 4);
        ctx.fillStyle = '#14101c'; ctx.fillRect(cx + 4, ty + 13, 10, 1); ctx.fillRect(cx + 42, ty + 13, 10, 1);
      }
      ctx.fillStyle = '#ffe8a0'; ctx.fillRect(sx + 3 * 58 - 3, ty + 5, 2, 2);
      ctx.fillStyle = 'rgba(255,232,160,0.08)'; ctx.fillRect(sx + 3 * 58, ty + 2, 40, 10);
    }
  }
  function midCentro(v, seed) {
    const ch = hp.genMid('centro', v, seed);
    ch.props = [trainProp];
    const x = g.ctx(ch.c);
    arches(x);
    if (v === 1) catedralSe(x, 250);
    return ch;
  }
  function nearCentro(v, seed) {
    const ch = hp.genNearStreet('centro', v, seed);
    if (v === 1) {
      // grey street-art portrait on a blind wall
      const x = g.ctx(ch.c), mx = 300;
      g.rect(x, mx, GY - 124, 78, 124, '#363238');
      g.rect(x, mx, GY - 124, 78, 2, '#4a4650');
      for (let i = 0; i < 30; i++) g.rect(x, mx + ((i * 37) % 76), GY - 120 + ((i * 53) % 110), 2, 1, '#2e2a30');
      const tmp = g.canvas(30, 40), tx = g.ctx(tmp);
      portrait(tx, 15, 16, PAL_MURAL);
      x.imageSmoothingEnabled = false;
      x.drawImage(tmp, mx + 9, GY - 116, 60, 80);
      g.text(x, 'ARTE É VIDA', mx + 18, GY - 30, '#8a8494', 1);
      g.rect(x, mx + 36, GY - 126, 6, 2, '#ffcf7a');
      g.poly(x, [[mx + 36, GY - 124], [mx + 42, GY - 124], [mx + 60, GY - 70], [mx + 18, GY - 70]], 'rgba(255,207,122,0.06)');
    }
    return ch;
  }

  // ------------------------------------------------------------ MINHOCÃO
  function midMinhocao(v, seed) {
    const ch = hp.genMid('minhocao', v, seed);
    const x = g.ctx(ch.c);
    for (let k = 0; k < 20; k++) g.rect(x, 0, 148 + k * 4, CH, 4, 'rgba(255,63,164,' + (0.006 * k).toFixed(3) + ')');
    return ch;
  }
  function nearMinhocao(v, seed) {
    const ch = hp.genNearHigh('minhocao', v, seed);
    const x = g.ctx(ch.c);
    for (let lx = 60 + v * 30; lx < CH; lx += 130) {
      g.rect(x, lx, GY - 100, 2, 88, '#1a1d30');
      g.rect(x, lx - 12, GY - 100, 14, 2, '#1a1d30');
      g.rect(x, lx - 14, GY - 98, 6, 2, '#ffb060');
      g.poly(x, [[lx - 14, GY - 96], [lx - 8, GY - 96], [lx + 12, GY - 12], [lx - 38, GY - 12]], 'rgba(255,160,80,0.09)');
    }
    return ch;
  }

  // ------------------------------------------------------------ PERIFERIA
  const HOUSE = ['#4a2a22', '#5a3424', '#3a3a5a', '#2a4a4a', '#5a2a36', '#46365a', '#6a4a2a'];
  function midPeriferia(v, seed) {
    const r = SP.mkRng(seed), ch = blank(), x = ch.x;
    const ph = v * 1.7;
    const hy = (xx) => Math.round(112 + Math.sin((xx / 480) * Math.PI * 1.2 + ph) * 26 + Math.sin(xx * 0.05 + ph) * 4);
    for (let xx = 0; xx < CH; xx++) g.rect(x, xx, hy(xx), 1, GY - hy(xx), '#14101e');
    let px = 0;
    while (px < CH) {
      const w = 10 + Math.floor(r() * 10);
      let yy = hy(px + w / 2) - 3, first = true;
      while (yy < GY) {
        const hh = 9 + Math.floor(r() * 6);
        const col = SP.pick(HOUSE, r);
        g.rect(x, px, yy, w - 1, hh, col);
        g.rect(x, px, yy, w - 1, 1, 'rgba(255,255,255,0.10)');
        if (r() < 0.5) g.rect(x, px + 2 + Math.floor(r() * Math.max(1, w - 6)), yy + 3, 3, 3, SP.pick(['#ffb060', '#ffcf7a', '#ff9a5a', '#7ad8ff'], r));
        else g.rect(x, px + 2, yy + 3, 3, 3, '#120e18');
        if (first && r() < 0.4) { g.rect(x, px + 2, yy - 4, 5, 4, '#2a5ad0'); g.rect(x, px + 2, yy - 4, 5, 1, '#5a8aff'); }
        if (first && r() < 0.3) for (let k = 0; k < w - 2; k += 3) g.rect(x, px + 1 + k, yy - 3, 1, 3, '#5a5048');
        first = false;
        yy += hh;
      }
      px += w;
    }
    // stairway and electric poles climbing the hill
    for (let k = 0; k < 3; k++) {
      const lx = 60 + k * 160 + v * 20;
      g.rect(x, lx, hy(lx) - 28, 1, 30, '#0c0a12');
      g.line(x, lx, hy(lx) - 26, lx + 160, hy(lx + 160) - 26, 'rgba(10,8,16,0.8)', 1);
    }
    return ch;
  }
  function barDoZe(x, ch, bx) {
    g.rect(x, bx, GY - 64, 96, 64, '#4a2a2a');
    g.rect(x, bx, GY - 64, 96, 2, '#6a3a3a');
    g.rect(x, bx + 13, GY - 62, 70, 11, '#140a0a');
    centerText(x, 'BAR DO ZÉ', bx + 48, GY - 59, '#ff4a4a');
    ch.signs.push({ x: bx + 13, y: GY - 62, w: 70, h: 11, col: '#ff2d4a', id: 601 });
    for (let xx = bx; xx < bx + 96; xx += 4) g.rect(x, xx, GY - 48, 4, 6, (xx / 4) % 2 ? '#c8283c' : '#e8d8c8');
    g.rect(x, bx + 4, GY - 42, 88, 30, '#6a3a1a');
    for (let k = 0; k < 12; k++) g.rect(x, bx + 8 + k * 7, GY - 38, 2, 5, SP.pick(['#5aff9a', '#ffcf7a', '#ff6a5a', '#8ad8ff']));
    g.rect(x, bx + 6, GY - 32, 84, 1, '#3a1a0a');
    for (let k = 0; k < 4; k++) { const tx = bx + 10 + k * 20; g.rect(x, tx, GY - 20, 10, 2, '#d8283c'); g.rect(x, tx + 4, GY - 18, 2, 6, '#a01830'); }
    // string lights
    for (let xx = 0; xx < 96; xx += 5) g.rect(x, bx + xx, GY - 50 + Math.round(Math.sin((xx / 96) * Math.PI) * 3), 1, 1, ['#ffcf7a', '#ff3fa4', '#3ef0ff'][(xx / 5) % 3]);
  }
  function nearPeriferia(v, seed) {
    const r = SP.mkRng(seed), ch = blank(), x = ch.x;
    let px = 0;
    while (px < CH) {
      let w = 40 + Math.floor(r() * 36);
      if (CH - (px + w) < 30) w = CH - px;
      const hh = 46 + Math.floor(r() * 34), top = GY - hh;
      g.rect(x, px, top, w, hh, SP.pick(['#5a3a4a', '#3a5a5a', '#5a4a2a', '#4a3a6a', '#6a3a2a', '#2f4a5a'], r));
      g.rect(x, px, top, w, 2, 'rgba(255,255,255,0.10)');
      g.rect(x, px + w - 1, top, 1, hh, 'rgba(0,0,0,0.35)');
      for (let k = 3; k < w - 2; k += 6) g.rect(x, px + k, top - 4, 1, 4, '#5a5048');
      for (let wx = px + 6; wx + 8 < px + w - 4; wx += 16) {
        const lit = r() < 0.55;
        g.rect(x, wx, top + 8, 8, 7, lit ? SP.pick(['#ffb060', '#ffcf7a', '#7ad8ff'], r) : '#14101c');
        for (let b = 0; b < 8; b += 2) g.rect(x, wx + b, top + 8, 1, 7, 'rgba(10,8,14,0.6)');
      }
      if (r() < 0.5) { g.rect(x, px + 6, GY - 32, 16, 20, '#3a3f5c'); for (let yy = GY - 32; yy < GY - 12; yy += 2) g.rect(x, px + 6, yy, 16, 1, '#2c3048'); }
      else { g.rect(x, px + 6, GY - 32, 10, 20, '#ffb060'); g.rect(x, px + 6, GY - 32, 10, 3, '#c88040'); }
      px += w;
    }
    if (v === 0) barDoZe(x, ch, 160);
    if (v === 1) {
      g.rect(x, 60, GY - 70, 124, 70, '#2a2e3a');
      g.rect(x, 60, GY - 70, 124, 2, '#3a4050');
      outlinedText(x, 'SONHO TAMBÉM', 66, GY - 60, '#3ad8c0', 2, '#06141a');
      outlinedText(x, 'É TECNOLOGIA', 66, GY - 42, '#3ad8c0', 2, '#06141a');
      ch.signs.push({ x: 64, y: GY - 66, w: 116, h: 36, col: '#3ad8c0', id: 602 });
    }
    // poles with high, faint wiring (decor — kept well above the gameplay band)
    for (let lx = 30 + v * 20; lx < CH; lx += 140) {
      g.rect(x, lx, GY - 118, 2, 106, '#1a1410');
      g.rect(x, lx - 6, GY - 116, 14, 1, '#1a1410');
      g.rect(x, lx + 3, GY - 110, 5, 6, '#2a2e48');
      for (let xx = 0; xx < 140; xx += 2) g.rect(x, lx + xx, GY - 116 + Math.round(Math.sin((xx / 140) * Math.PI) * 6), 2, 1, 'rgba(10,8,14,0.45)');
    }
    tree(x, 120 + v * 140, r);
    return ch;
  }

  // ------------------------------------------------------------ registration
  WD.registerTheme('metro', 'liberdade', {
    indoor: true,
    far: (v, s) => hp.genFar('liberdade', v, s),
    mid: (v, s) => hp.genMid('liberdade', v, s),
    near: nearMetro,
    ground: groundMetro
  });
  WD.overrideTheme('liberdade', { near: nearLiberdade });
  WD.overrideTheme('paulista', { mid: midPaulista, near: nearPaulista });
  WD.registerTheme('marginal', 'paulista', {
    far: (v, s) => hp.genFar('paulista', v === 0 ? 1 : v, s),
    mid: midMarginal,
    near: nearMarginal
  });
  WD.overrideTheme('centro', { mid: midCentro, near: nearCentro });
  WD.overrideTheme('minhocao', { mid: midMinhocao, near: nearMinhocao });
  WD.registerTheme('periferia', 'minhocao', {
    far: (v, s) => hp.genFar('minhocao', v, s),
    mid: midPeriferia,
    near: nearPeriferia
  });
})();
