/* SampaPunk — low-level pixel drawing helpers and a tiny 3x5 bitmap font. */
(function () {
  'use strict';
  const SP = window.SP;

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function ctx(c) {
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingEnabled = false;
    return x;
  }
  function rect(x, a, b, w, h, col) {
    if (col) x.fillStyle = col;
    x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h));
  }
  // Bresenham line drawn with a square brush of thickness t
  function line(x, x0, y0, x1, y1, col, t) {
    t = t || 1;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    x.fillStyle = col;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const o = Math.floor((t - 1) / 2);
    for (let guard = 0; guard < 2000; guard++) {
      x.fillRect(x0 - o, y0 - o, t, t);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function poly(x, pts, col) {
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.closePath();
    x.fill();
  }
  function circle(x, cx, cy, r, col) {
    x.fillStyle = col;
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    x.fill();
  }
  function hexRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(h, a) {
    const [r, g, b] = hexRgb(h);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function mix(a, b, t) {
    const A = hexRgb(a), B = hexRgb(b);
    const r = Math.round(A[0] + (B[0] - A[0]) * t);
    const g = Math.round(A[1] + (B[1] - A[1]) * t);
    const bl = Math.round(A[2] + (B[2] - A[2]) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  // Hard-edge the alpha channel (removes canvas anti-aliasing) and add a 1px outline.
  function finish(c, ol) {
    const x = c.getContext('2d', { willReadFrequently: true });
    const w = c.width, h = c.height;
    const im = x.getImageData(0, 0, w, h);
    const d = im.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0;
    if (ol) {
      const [r, g, b] = hexRgb(ol);
      const src = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) src[i] = d[i * 4 + 3] ? 1 : 0;
      for (let y = 0; y < h; y++) {
        for (let xx = 0; xx < w; xx++) {
          const i = y * w + xx;
          if (src[i]) continue;
          if ((xx > 0 && src[i - 1]) || (xx < w - 1 && src[i + 1]) || (y > 0 && src[i - w]) || (y < h - 1 && src[i + w])) {
            const j = i * 4;
            d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = 255;
          }
        }
      }
    }
    x.putImageData(im, 0, 0);
    return c;
  }

  // Tinted silhouette copy of a sprite (used for damage flashes and boost afterimages)
  function tint(src, col) {
    const c = canvas(src.width, src.height), x = ctx(c);
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = col;
    x.fillRect(0, 0, c.width, c.height);
    // drop near-transparent pixels so faint sprite residue doesn't tint into a visible box
    const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 48) d[i] = 0;
    x.putImageData(im, 0, 0);
    return c;
  }

  // ---- 3x5 pixel font (environmental lettering: storefronts, signs, graffiti) ----
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
    8: '111101111101111', 9: '111101111001110',
    '-': '000000111000000', '.': '000000000000010', '!': '010010010000010', '/': '001001010100100',
    ':': '000010000010000', '+': '000010111010000', "'": '010010000000000', ' ': '000000000000000',
    '>': '100010001010100', '<': '001010100010001', '#': '101111101111101', '%': '101001010100101'
  };
  const MARKS = {
    'Á': ['A', 'acute'], 'Â': ['A', 'circ'], 'Ã': ['A', 'tilde'], 'À': ['A', 'grave'],
    'É': ['E', 'acute'], 'Ê': ['E', 'circ'], 'Í': ['I', 'acute'], 'Ó': ['O', 'acute'],
    'Ô': ['O', 'circ'], 'Õ': ['O', 'tilde'], 'Ú': ['U', 'acute'], 'Ç': ['C', 'ced']
  };
  const MARKPIX = {
    acute: [[2, -3], [1, -2]], grave: [[0, -3], [1, -2]], circ: [[1, -3], [0, -2], [2, -2]],
    tilde: [[1, -3], [2, -3], [0, -2], [1, -2]], ced: [[1, 5], [0, 6]]
  };

  function text(x, str, px, py, col, s) {
    s = s || 1;
    x.fillStyle = col;
    let cx = Math.round(px);
    py = Math.round(py);
    for (const raw of String(str).toUpperCase()) {
      let base = raw, mark = null;
      if (MARKS[raw]) { base = MARKS[raw][0]; mark = MARKS[raw][1]; }
      const gl = FONT[base];
      if (gl) {
        for (let i = 0; i < 15; i++) {
          if (gl[i] === '1') x.fillRect(cx + (i % 3) * s, py + Math.floor(i / 3) * s, s, s);
        }
        if (mark) for (const [mx, my] of MARKPIX[mark]) x.fillRect(cx + mx * s, py + my * s, s, s);
      }
      cx += 4 * s;
    }
  }
  function textW(str, s) {
    s = s || 1;
    return Math.max(0, [...String(str)].length * 4 * s - s);
  }

  // Soft 2px separation halo (dilated silhouette): 1px ring strong, 2px ring faint.
  function halo(src, col) {
    const w = src.width + 4, h = src.height + 4;
    const sx = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, src.width, src.height).data;
    const op = (x, y) => x >= 0 && y >= 0 && x < src.width && y < src.height && sx[(y * src.width + x) * 4 + 3] >= 48;
    const c = canvas(w, h), x = ctx(c);
    const im = x.createImageData(w, h), d = im.data;
    const [r, g, b] = hexRgb(col);
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
      const ox = xx - 2, oy = y - 2;
      if (op(ox, oy)) continue;
      let a = 0;
      if (op(ox - 1, oy) || op(ox + 1, oy) || op(ox, oy - 1) || op(ox, oy + 1)) a = 150;
      else if (op(ox - 2, oy) || op(ox + 2, oy) || op(ox, oy - 2) || op(ox, oy + 2) || op(ox - 1, oy - 1) || op(ox + 1, oy - 1) || op(ox - 1, oy + 1) || op(ox + 1, oy + 1)) a = 70;
      if (a) { const j = (y * w + xx) * 4; d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = a; }
    }
    x.putImageData(im, 0, 0);
    return c;
  }
  // Thin rim light on silhouette edges facing the light (top strong, left soft).
  function rim(src, col) {
    const w = src.width, h = src.height;
    const sd = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && sd[(y * w + x) * 4 + 3] > 0;
    const c = canvas(w, h), x = ctx(c);
    const im = x.createImageData(w, h), d = im.data;
    const [r, g, b] = hexRgb(col);
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
      if (!op(xx, y)) continue;
      let a = 0;
      if (!op(xx, y - 1)) a = 235;
      else if (!op(xx - 1, y)) a = 110;
      if (a) { const j = (y * w + xx) * 4; d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = a; }
    }
    x.putImageData(im, 0, 0);
    return c;
  }
  // Colour-grade a scenery canvas in place: desaturate and darken (keeps alpha).
  function grade(c, sat, bright, tint) {
    const x = c.getContext('2d', { willReadFrequently: true });
    const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
    const t = tint ? hexRgb(tint) : null;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      for (let k = 0; k < 3; k++) {
        let v = (l + (d[i + k] - l) * sat) * bright;
        if (t) v = v * 0.9 + t[k] * 0.1;
        d[i + k] = v;
      }
    }
    x.putImageData(im, 0, 0);
    return c;
  }

  SP.gfx = { halo, rim, grade, canvas, ctx, rect, line, poly, circle, finish, tint, rgba, mix, hexRgb, text, textW };
})();
