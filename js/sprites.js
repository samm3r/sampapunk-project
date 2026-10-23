/* SampaPunk — code-generated pixel-art sprites.
   Every sprite is drawn at 1:1 pixel scale, hard-edged and outlined so all assets share
   the same pixel density, outline weight and lighting direction (light from upper-left). */
(function () {
  'use strict';
  const SP = window.SP;
  const g = SP.gfx;

  const C = {
    ol: '#07070f',
    skin: '#b9784c',
    helm: '#232a4d', helmHi: '#4f5a96', visor: '#3ef0ff', visorHi: '#d6ffff',
    jacket: '#25b4c8', jacketSh: '#167488', jacketHi: '#8ff3ff',
    pants: '#2e3150', pantsSh: '#1d1f36',
    shoe: '#e8e8f2', shoeSh: '#9a9cb8', glove: '#14162a',
    box: '#1a1d30', boxEdge: '#3ef0ff', boxSide: '#2b3050', boxMark: '#ff3fa4',
    bike: '#ff3fa4', bikeSh: '#a8206a', bikeDark: '#1b1d30', metal: '#7d84a8', metalHi: '#b8bed8',
    amber: '#ffb238', amberSh: '#b8701a', red: '#ff2d4a', redSh: '#a01830',
    steel: '#2a2e48', steelHi: '#454b70', cyan: '#3ef0ff', white: '#e8e8f2'
  };
  SP.COL = C;

  // ---------------------------------------------------------------- courier
  function shoe(x, f, col) {
    g.rect(x, f[0] - 1, f[1] - 1, 4, 2, col);
  }
  function headAt(x, h) {
    const cx = Math.round(h[0]), cy = Math.round(h[1]);
    g.rect(x, cx - 2, cy - 3, 5, 1, C.helm);
    g.rect(x, cx - 3, cy - 2, 6, 4, C.helm);
    g.rect(x, cx - 2, cy + 2, 4, 1, C.helm);
    g.rect(x, cx - 1, cy - 3, 2, 1, C.helmHi);
    g.rect(x, cx - 2, cy - 2, 1, 1, C.helmHi);
    g.rect(x, cx, cy - 1, 3, 2, C.visor);
    g.rect(x, cx + 2, cy - 1, 1, 1, C.visorHi);
    g.rect(x, cx + 1, cy + 2, 2, 1, C.skin);
  }
  function courier(P) {
    const c = g.canvas(28, 32), x = g.ctx(c);
    const L = P.legs, A = P.arms;
    // far limbs
    g.line(x, P.hip[0], P.hip[1], L[1].k[0], L[1].k[1], C.pantsSh, 2);
    g.line(x, L[1].k[0], L[1].k[1], L[1].f[0], L[1].f[1], C.pantsSh, 2);
    shoe(x, L[1].f, C.shoeSh);
    g.line(x, P.sh[0], P.sh[1], A[1].e[0], A[1].e[1], C.jacketSh, 2);
    g.line(x, A[1].e[0], A[1].e[1], A[1].h[0], A[1].h[1], C.glove, 2);
    // delivery box on the back (the iconic motoboy thermal box)
    if (!P.noBox) {
      const bx = P.box ? P.box[0] : Math.round((P.hip[0] + P.sh[0]) / 2 - 8);
      const by = P.box ? P.box[1] : Math.round(P.sh[1] - 1);
      g.rect(x, bx, by, 7, 8, C.box);
      g.rect(x, bx + 6, by, 1, 8, C.boxSide);
      g.rect(x, bx, by, 7, 1, C.boxEdge);
      g.rect(x, bx, by, 1, 8, C.boxEdge);
      g.rect(x, bx + 2, by + 3, 3, 2, C.boxMark);
      c._pack = [bx, by];   // backpack top-left: anchor for the visible cargo stack
    }
    // torso
    g.line(x, P.hip[0], P.hip[1], P.sh[0], P.sh[1], C.jacket, 4);
    g.line(x, P.hip[0] + 1, P.hip[1] - 1, P.sh[0] + 1, P.sh[1] + 1, C.jacketHi, 1);
    g.rect(x, P.hip[0] - 1, P.hip[1] - 1, 4, 1, C.pantsSh);
    headAt(x, P.head);
    // near limbs
    g.line(x, P.hip[0], P.hip[1], L[0].k[0], L[0].k[1], C.pants, 2);
    g.line(x, L[0].k[0], L[0].k[1], L[0].f[0], L[0].f[1], C.pants, 2);
    shoe(x, L[0].f, C.shoe);
    g.line(x, P.sh[0], P.sh[1], A[0].e[0], A[0].e[1], C.jacket, 2);
    g.line(x, A[0].e[0], A[0].e[1], A[0].h[0], A[0].h[1], C.glove, 2);
    return g.finish(c, C.ol);
  }
  function runPose(a) {
    const bob = Math.round(Math.abs(Math.sin(a)) * 1.4);
    const hip = [11, 18 + bob], sh = [14, 10 + bob], head = [16, 5 + bob];
    function legAt(ph) {
      const th = Math.sin(ph) * 0.85;
      const k = [hip[0] + Math.sin(th) * 6, hip[1] + Math.cos(th) * 6];
      const bend = 0.15 + Math.max(0, Math.cos(ph)) * 1.4;
      const phi = th - bend;
      const f = [k[0] + Math.sin(phi) * 6, Math.min(30, k[1] + Math.cos(phi) * 6)];
      return { k, f };
    }
    function armAt(ph) {
      const th = Math.sin(ph) * 0.9;
      const e = [sh[0] + Math.sin(th) * 4, sh[1] + Math.cos(th) * 4];
      const fo = th + 1.5;
      return { e, h: [e[0] + Math.sin(fo) * 4, e[1] + Math.cos(fo) * 4] };
    }
    return { hip, sh, head, legs: [legAt(a), legAt(a + Math.PI)], arms: [armAt(a + Math.PI), armAt(a)] };
  }
  const POSES = {
    jump: { hip: [11, 16], sh: [13, 8], head: [15, 3],
      legs: [{ k: [16, 20], f: [14, 26] }, { k: [9, 21], f: [6, 26] }],
      arms: [{ e: [16, 9], h: [19, 7] }, { e: [9, 11], h: [6, 13] }] },
    fall: { hip: [11, 17], sh: [13, 9], head: [15, 4],
      legs: [{ k: [14, 23], f: [15, 29] }, { k: [9, 23], f: [8, 29] }],
      arms: [{ e: [16, 7], h: [18, 4] }, { e: [10, 7], h: [8, 4] }] },
    slide: { hip: [12, 25], sh: [6, 21], head: [5, 17], box: [0, 18],
      legs: [{ k: [17, 28], f: [23, 29] }, { k: [16, 25], f: [20, 29] }],
      arms: [{ e: [6, 25], h: [4, 29] }, { e: [9, 22], h: [12, 21] }] },
    hit: { hip: [10, 18], sh: [8, 10], head: [6, 5], box: [1, 10],
      legs: [{ k: [13, 24], f: [14, 30] }, { k: [8, 24], f: [7, 30] }],
      arms: [{ e: [11, 6], h: [14, 3] }, { e: [5, 8], h: [3, 5] }] },
    down: { hip: [15, 28], sh: [8, 28], head: [5, 27], box: [7, 22],
      legs: [{ k: [20, 27], f: [24, 29] }, { k: [19, 29], f: [23, 30] }],
      arms: [{ e: [11, 26], h: [14, 27] }, { e: [6, 30], h: [10, 30] }] }
  };

  // ---------------------------------------------------------------- motorcycle
  function wheel(x, cx, cy, fr) {
    g.circle(x, cx, cy, 5.6, '#14162a');
    g.circle(x, cx, cy, 3.6, '#2f3556');
    const a0 = fr * Math.PI / 3;
    for (let i = 0; i < 3; i++) {
      const a = a0 + i * Math.PI * 2 / 3;
      g.line(x, cx, cy, cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, C.metal, 1);
    }
    g.rect(x, cx, cy, 1, 1, C.cyan);
    // neon rim ticks
    for (let i = 0; i < 4; i++) {
      const a = a0 * 0.5 + i * Math.PI / 2;
      g.rect(x, cx + Math.round(Math.cos(a) * 4.5), cy + Math.round(Math.sin(a) * 4.5), 1, 1, C.cyan);
    }
  }
  function bike(fr, rider) {
    const c = g.canvas(46, 32), x = g.ctx(c);
    // rear rack + delivery box
    g.rect(x, 2, 18, 12, 1, C.metal);
    g.rect(x, 2, 10, 10, 8, C.box);
    g.rect(x, 2, 10, 10, 1, C.boxEdge);
    g.rect(x, 11, 10, 1, 8, C.boxSide);
    g.text(x, '09', 3, 12, C.boxMark, 1);
    c._pack = [2, 10];      // rear rack box: anchor for the visible cargo stack
    // wheels
    wheel(x, 9, 25, fr);
    wheel(x, 36, 25, fr + 1);
    // exhaust
    g.rect(x, 2, 23, 12, 2, '#565c7a');
    g.rect(x, 2, 23, 2, 2, C.amber);
    // front fork
    g.line(x, 35, 13, 36, 25, C.metal, 2);
    // body fairing
    g.poly(x, [[7, 19], [13, 16], [29, 16], [34, 12], [40, 13], [39, 19], [32, 22], [14, 22]], C.bike);
    g.poly(x, [[14, 20], [31, 20], [32, 22], [14, 22]], C.bikeSh);
    g.rect(x, 15, 18, 15, 1, C.cyan);
    g.rect(x, 30, 14, 4, 1, '#ff9fd0');
    // seat
    g.rect(x, 13, 15, 12, 2, '#101222');
    // handlebar
    g.line(x, 33, 12, 35, 9, '#20233a', 1);
    // headlight
    g.rect(x, 39, 14, 2, 2, '#ffe08a');
    // rider
    if (rider) {
      const duck = rider === 'duck';
      const hip = duck ? [19, 15] : [18, 14];
      const sh = duck ? [27, 13] : [23, 8];
      const head = duck ? [31, 11] : [26, 4];
      const knee = [25, 18], foot = [24, 22];
      const elbow = duck ? [29, 16] : [27, 11];
      const hand = [33, 11];
      g.line(x, hip[0], hip[1], knee[0] - 1, knee[1], C.pantsSh, 2);
      g.line(x, hip[0], hip[1], sh[0], sh[1], C.jacket, 4);
      g.line(x, hip[0] + 1, hip[1] - 1, sh[0] + 1, sh[1] + 1, C.jacketHi, 1);
      headAt(x, head);
      g.line(x, hip[0], hip[1], knee[0], knee[1], C.pants, 2);
      g.line(x, knee[0], knee[1], foot[0], foot[1], C.pants, 2);
      shoe(x, foot, C.shoe);
      g.line(x, sh[0], sh[1], elbow[0], elbow[1], C.jacket, 2);
      g.line(x, elbow[0], elbow[1], hand[0], hand[1], C.glove, 2);
    }
    return g.finish(c, C.ol);
  }

  // ---------------------------------------------------------------- enemies
  function drone(fr) {
    const c = g.canvas(24, 14), x = g.ctx(c);
    g.rect(x, 3, 4, 18, 1, '#1b1d2e');
    if (fr === 0) { g.rect(x, 0, 2, 8, 1, C.metalHi); g.rect(x, 16, 2, 8, 1, C.metalHi); }
    else { g.rect(x, 2, 2, 4, 1, C.metalHi); g.rect(x, 18, 2, 4, 1, C.metalHi); }
    g.rect(x, 3, 3, 1, 2, C.metal); g.rect(x, 20, 3, 1, 2, C.metal);
    g.poly(x, [[6, 6], [18, 6], [20, 9], [16, 12], [8, 12], [4, 9]], '#2a2e48');
    g.rect(x, 8, 5, 8, 2, '#454b70');
    g.rect(x, 9, 5, 3, 1, '#6a72a0');
    g.rect(x, 14, 9, 3, 2, C.red);
    g.rect(x, 15, 9, 1, 1, '#ffb0bc');
    g.rect(x, 7, 10, 2, 1, C.amber);
    g.rect(x, 12, 1, 1, 3, C.metal);
    return g.finish(c, C.ol);
  }
  function interceptor(fr) {
    const c = g.canvas(52, 20), x = g.ctx(c);
    g.poly(x, [[2, 12], [8, 8], [16, 7], [22, 3], [36, 3], [42, 8], [49, 9], [50, 14], [47, 17], [4, 17], [1, 15]], '#d8dcef');
    g.poly(x, [[1, 14], [50, 14], [47, 17], [4, 17]], '#20243a');
    g.poly(x, [[21, 8], [24, 4], [35, 4], [39, 8]], '#1e5d73');
    g.rect(x, 29, 4, 1, 4, '#d8dcef');
    g.rect(x, 3, 12, 46, 1, C.red);
    g.text(x, 'ARGOS', 12, 8, '#20243a', 1);
    g.rect(x, 26, 1, 3, 2, fr ? C.red : '#3a6bff');
    g.rect(x, 29, 1, 3, 2, fr ? '#3a6bff' : C.red);
    g.rect(x, 47, 10, 2, 2, '#ffe08a');
    g.rect(x, 1, 11, 2, 2, C.red);
    g.rect(x, 8, 17, 8, 1, C.cyan); g.rect(x, 36, 17, 8, 1, C.cyan);
    return g.finish(c, C.ol);
  }
  function taxi(fr) {
    const c = g.canvas(56, 24), x = g.ctx(c);
    g.poly(x, [[2, 13], [10, 10], [17, 4], [37, 4], [45, 10], [53, 11], [54, 18], [2, 18]], '#e6e0cf');
    g.poly(x, [[2, 16], [54, 16], [54, 19], [2, 19]], '#9d9682');
    g.poly(x, [[19, 10], [22, 6], [36, 6], [41, 10]], '#1e4a63');
    g.rect(x, 29, 6, 1, 4, '#e6e0cf');
    g.rect(x, 3, 13, 50, 1, '#16a0b4');
    g.rect(x, 24, 1, 9, 3, C.amber);
    g.rect(x, 26, 2, 5, 1, '#fff2c0');
    g.rect(x, 52, 12, 2, 2, '#ffe08a');
    g.rect(x, 2, 12, 2, 2, C.red);
    wheel(x, 12, 19, fr); wheel(x, 44, 19, fr + 1);
    return g.finish(c, C.ol);
  }
  function kombi(wreck) {
    const c = g.canvas(56, 30), x = g.ctx(c);
    const top = wreck ? '#8a6a4a' : '#ece5d2';
    const bot = wreck ? '#6b3a22' : '#c8463c';
    // body
    g.poly(x, [[3, 6], [6, 3], [46, 3], [51, 6], [53, 12], [53, 24], [3, 24]], top);
    g.poly(x, [[3, 15], [53, 15], [53, 24], [3, 24]], bot);
    // V front panel
    g.poly(x, [[44, 15], [53, 12], [53, 15]], bot);
    // windows
    for (let i = 0; i < 4; i++) g.rect(x, 7 + i * 9, 6, 7, 6, wreck ? '#0d0e18' : '#1e4a63');
    g.rect(x, 44, 6, 7, 6, wreck ? '#0d0e18' : '#1e4a63');
    if (wreck) {
      // broken glass, rust, graffiti tag
      g.rect(x, 9, 8, 2, 1, '#5a7a8a'); g.rect(x, 26, 7, 1, 2, '#5a7a8a');
      for (let i = 0; i < 18; i++) g.rect(x, 4 + ((i * 37) % 48), 16 + ((i * 11) % 7), 2, 1, '#4a2414');
      g.text(x, 'ZN', 18, 17, C.bike, 1);
      g.line(x, 28, 21, 40, 17, C.cyan, 1);
      g.rect(x, 8, 24, 8, 4, '#3a3a48'); g.rect(x, 38, 24, 8, 4, '#3a3a48');
    } else {
      g.rect(x, 3, 14, 50, 1, '#f5efe0');
      wheel(x, 12, 24, 0); wheel(x, 44, 24, 1);
      g.rect(x, 51, 17, 2, 2, '#ffe08a');
    }
    return g.finish(c, C.ol);
  }

  // ---------------------------------------------------------------- obstacles
  function barrier() {
    const c = g.canvas(22, 20), x = g.ctx(c);
    g.line(x, 4, 10, 2, 19, C.steelHi, 2); g.line(x, 17, 10, 19, 19, C.steelHi, 2);
    g.rect(x, 1, 4, 20, 7, C.amber);
    for (let i = -6; i < 22; i += 5) g.poly(x, [[i, 11], [i + 3, 11], [i + 8, 4], [i + 5, 4]], '#141420');
    g.rect(x, 1, 4, 20, 1, '#ffd890');
    g.rect(x, 9, 1, 4, 3, C.red);
    return g.finish(c, C.ol);
  }
  function crates() {
    const c = g.canvas(24, 24), x = g.ctx(c);
    function crate(a, b, w, h) {
      g.rect(x, a, b, w, h, '#7a5534');
      g.rect(x, a, b, w, 1, '#a07448');
      g.rect(x, a, b, 1, h, '#a07448');
      for (let yy = b + 3; yy < b + h; yy += 3) g.rect(x, a + 1, yy, w - 2, 1, '#5a3c22');
      g.line(x, a + 1, b + 1, a + w - 2, b + h - 2, '#5a3c22', 1);
    }
    crate(1, 11, 22, 12);
    crate(5, 2, 14, 9);
    g.text(x, 'SP', 8, 4, '#2a1a0e', 1);
    return g.finish(c, C.ol);
  }
  function bin() {
    const c = g.canvas(18, 22), x = g.ctx(c);
    g.rect(x, 1, 5, 16, 14, '#2f6b45');
    g.rect(x, 1, 5, 16, 1, '#4f9a68');
    g.rect(x, 0, 2, 18, 3, '#24563a');
    g.text(x, 'LIXO', 2, 9, '#d8f0d8', 1);
    g.rect(x, 3, 19, 3, 3, '#14162a'); g.rect(x, 12, 19, 3, 3, '#14162a');
    g.rect(x, 13, 0, 4, 2, '#8a8a6a');
    return g.finish(c, C.ol);
  }
  function obras() {
    const c = g.canvas(28, 18), x = g.ctx(c);
    g.line(x, 4, 7, 2, 17, C.metal, 2); g.line(x, 23, 7, 25, 17, C.metal, 2);
    g.rect(x, 1, 3, 26, 6, '#e8e8f2');
    for (let i = 0; i < 26; i += 6) g.rect(x, 1 + i, 3, 3, 6, C.red);
    g.text(x, 'OBRAS', 4, 4, '#14162a', 1);
    g.rect(x, 1, 3, 26, 1, '#ffffff');
    g.rect(x, 12, 0, 3, 3, C.amber);
    return g.finish(c, C.ol);
  }
  function cone() {
    const c = g.canvas(10, 13), x = g.ctx(c);
    g.poly(x, [[4, 0], [6, 0], [9, 11], [1, 11]], C.amber);
    g.rect(x, 3, 5, 4, 2, '#f5f5ff');
    g.rect(x, 0, 11, 10, 2, '#3a2a14');
    return g.finish(c, C.ol);
  }
  function roadblock(fr) {
    const c = g.canvas(26, 28), x = g.ctx(c);
    g.rect(x, 1, 6, 24, 20, '#2a2e48');
    g.rect(x, 1, 6, 24, 1, '#5a6290');
    g.rect(x, 1, 13, 24, 5, C.red);
    for (let i = 0; i < 24; i += 6) g.rect(x, 1 + i, 13, 3, 5, '#e8e8f2');
    g.text(x, 'PARE', 5, 8, '#e8e8f2', 1);
    g.text(x, 'ARGOS', 3, 20, C.cyan, 1);
    g.rect(x, 3, 26, 4, 2, '#14162a'); g.rect(x, 19, 26, 4, 2, '#14162a');
    g.rect(x, 4, 2, 6, 4, fr ? C.red : '#55141f');
    g.rect(x, 16, 2, 6, 4, fr ? '#1a2a6a' : '#3a6bff');
    return g.finish(c, C.ol);
  }
  function endWall(broken) {
    const c = g.canvas(44, 64), x = g.ctx(c);
    if (broken) {
      for (let i = 0; i < 14; i++) {
        const a = (i * 29) % 40, h = 3 + ((i * 7) % 7);
        g.rect(x, a, 63 - h, 4 + (i % 3) * 2, h, i % 2 ? '#2a2e48' : '#3a3f63');
      }
      g.rect(x, 6, 58, 3, 2, C.red); g.rect(x, 30, 59, 4, 2, C.amber);
      return g.finish(c, C.ol);
    }
    g.rect(x, 2, 6, 40, 58, '#262a44');
    for (let yy = 6; yy < 64; yy += 8) g.rect(x, 2, yy, 40, 1, '#1a1d30');
    for (let i = 0; i < 40; i += 8) g.rect(x, 2 + i, 6, 1, 58, '#1a1d30');
    g.rect(x, 2, 6, 40, 1, '#5a6290');
    g.rect(x, 2, 26, 40, 7, C.red);
    for (let i = 0; i < 40; i += 8) g.rect(x, 2 + i, 26, 4, 7, '#e8e8f2');
    g.text(x, 'BLOQUEIO', 6, 14, C.amber, 1);
    g.text(x, 'ARGOS', 12, 40, C.cyan, 1);
    g.rect(x, 6, 1, 8, 5, C.red); g.rect(x, 30, 1, 8, 5, '#3a6bff');
    return g.finish(c, C.ol);
  }
  function ramp() {
    const c = g.canvas(44, 18), x = g.ctx(c);
    g.poly(x, [[1, 17], [43, 2], [43, 17]], '#3a3f63');
    g.poly(x, [[1, 17], [43, 2], [43, 4], [5, 17]], C.amber);
    for (let i = 10; i < 42; i += 8) g.rect(x, i, 17 - Math.round(i * 15 / 42) + 2, 2, 2, '#141420');
    g.rect(x, 40, 2, 3, 15, '#262a44');
    return g.finish(c, C.ol);
  }
  function gantry(label) {
    const c = g.canvas(66, 22), x = g.ctx(c);
    g.rect(x, 1, 1, 64, 20, '#1d6b48');
    g.rect(x, 2, 2, 62, 18, '#1d6b48');
    g.rect(x, 2, 2, 62, 1, '#e8f5ee'); g.rect(x, 2, 19, 62, 1, '#e8f5ee');
    g.rect(x, 2, 2, 1, 18, '#e8f5ee'); g.rect(x, 63, 2, 1, 18, '#e8f5ee');
    const t = label[0], s = label[1];
    g.text(x, t, 33 - Math.round(g.textW(t) / 2), 5, '#f5fff8', 1);
    g.text(x, s, 33 - Math.round(g.textW(s) / 2), 12, '#c8ffe0', 1);
    g.poly(x, [[57, 12], [61, 12], [61, 10], [63, 14], [61, 18], [61, 16], [57, 16]], '#f5fff8');
    return g.finish(c, C.ol);
  }
  function hangSign(label, col) {
    const w = Math.max(30, g.textW(label) + 8);
    const c = g.canvas(w + 2, 14), x = g.ctx(c);
    g.rect(x, 1, 1, w, 12, '#0d0e1c');
    g.rect(x, 1, 1, w, 1, '#3a3f63');
    g.text(x, label, 1 + Math.round((w - g.textW(label)) / 2), 5, col, 1);
    g.rect(x, 3, 3, 1, 1, col); g.rect(x, w - 2, 3, 1, 1, col);
    return g.finish(c, C.ol);
  }
  function chip(fr) {
    const c = g.canvas(11, 11), x = g.ctx(c);
    const hw = [4, 3, 1, 3][fr];
    for (let yy = 0; yy < 9; yy++) {
      const w = Math.round(hw * (1 - Math.abs(yy - 4) / 4.5));
      if (w <= 0 && hw > 1) continue;
      const ww = Math.max(1, w);
      g.rect(x, 5 - ww, yy + 1, ww * 2 + (hw === 1 ? 0 : 1), 1, yy < 4 ? '#7ff8ff' : '#2ad0e8');
    }
    if (hw > 1) g.rect(x, 4, 3, 2, 2, '#ffffff');
    return g.finish(c, '#04202a');
  }
  function dropPoint() {
    const c = g.canvas(150, 150), x = g.ctx(c);
    // workshop building
    g.rect(x, 0, 30, 150, 120, '#262238');
    g.rect(x, 0, 30, 150, 3, '#4a4466');
    for (let yy = 40; yy < 90; yy += 14) for (let xx = 8; xx < 140; xx += 16) {
      g.rect(x, xx, yy, 9, 9, '#0f1020');
      if ((xx + yy) % 3 === 0) g.rect(x, xx + 1, yy + 1, 7, 7, '#5a3a2a');
    }
    // garage door (open, lit)
    g.rect(x, 40, 100, 70, 50, '#ffcf7a');
    g.rect(x, 40, 100, 70, 6, '#3a3f5c');
    for (let i = 0; i < 6; i++) g.rect(x, 40, 100 + i, 70, 1, i % 2 ? '#2a2e48' : '#3a3f5c');
    g.rect(x, 48, 120, 18, 30, '#c8963a'); g.rect(x, 90, 116, 12, 34, '#b8863a');
    // sign
    g.rect(x, 22, 6, 106, 22, '#0d0e1c');
    g.rect(x, 22, 6, 106, 1, '#3ef0ff');
    g.text(x, 'PONTO DE ENTREGA', 75 - Math.round(g.textW('PONTO DE ENTREGA') / 2), 10, '#3ef0ff', 1);
    g.text(x, 'OFICINA DO BETO', 75 - Math.round(g.textW('OFICINA DO BETO') / 2), 19, '#ffb238', 1);
    // antenna
    g.rect(x, 120, 0, 2, 30, '#454b70'); g.rect(x, 119, 0, 4, 2, C.red);
    return g.finish(c, C.ol);
  }

  // ---------------------------------------------------------------- cargo
  const CARGO_KINDS = [
    { body: '#d8903a', top: '#f6c070', side: '#a0621f', tape: '#6a3c14', mark: '#3ef0ff' },   // cardboard
    { body: '#6a7296', top: '#a4aacc', side: '#474d6c', tape: '#2a2e48', mark: '#3ef0ff' },   // industrial
    { body: '#e2703a', top: '#ffa070', side: '#a8481c', tape: '#5a2410', mark: '#ff3fa4' }    // courier orange
  ];
  function cargoBox(k, w, h) {
    const K = CARGO_KINDS[k];
    const c = g.canvas(w + 2, h + 2), x = g.ctx(c);
    g.rect(x, 1, 1, w, h, K.body);
    g.rect(x, 1, 1, w, Math.max(1, Math.round(h / 4)), K.top);
    g.rect(x, w, 1, 1, h, K.side);
    g.rect(x, 1 + Math.floor(w / 2) - 1, 1, w > 8 ? 2 : 1, h, K.tape);
    g.rect(x, w - 2, h - 1, 2, 1, K.mark);
    if (w > 8) { g.rect(x, 3, h - 3, 3, 2, '#e8e8f2'); g.rect(x, 4, h - 2, 1, 1, K.mark); }
    return g.finish(c, C.ol);
  }
  function terminal() {
    // courier drop-off kiosk ("entregas" terminal)
    const c = g.canvas(22, 46), x = g.ctx(c);
    g.rect(x, 3, 8, 16, 37, '#1a1f36');
    g.rect(x, 3, 8, 16, 1, '#3a4470');
    g.rect(x, 3, 8, 1, 37, '#2a3050');
    g.rect(x, 2, 6, 18, 3, '#2a3050');
    g.rect(x, 10, 1, 2, 5, '#454b70'); g.rect(x, 10, 0, 2, 1, C.cyan);
    g.rect(x, 5, 12, 12, 12, '#0c3442');
    g.rect(x, 8, 15, 6, 5, C.amber); g.rect(x, 8, 15, 6, 1, '#ffd890'); g.rect(x, 10, 15, 2, 5, '#a0621f');
    g.rect(x, 10, 21, 2, 1, C.cyan); g.rect(x, 9, 20, 4, 1, C.cyan);
    g.rect(x, 6, 28, 10, 4, '#06080f'); g.rect(x, 6, 27, 10, 1, C.amber);
    g.rect(x, 6, 35, 3, 2, C.cyan); g.rect(x, 11, 35, 5, 2, '#2a3050');
    g.rect(x, 1, 44, 20, 2, '#2a3050');
    return g.finish(c, C.ol);
  }

  // ---------------------------------------------------------------- overhead hardware (no lettering)
  // Every piece carries an amber/black hazard edge on its underside: that edge is the clearance line.
  function hazardEdge(x, w, y) {
    g.rect(x, 1, y, w, 2, C.amber);
    for (let i = 1; i < w; i += 4) g.rect(x, i, y, 2, 2, '#141420');
  }
  function hangScanner() {
    // ARGOS surveillance scanner bar with a camera dome
    const c = g.canvas(38, 15), x = g.ctx(c);
    g.rect(x, 1, 1, 36, 9, '#232842'); g.rect(x, 1, 1, 36, 1, '#4a5280'); g.rect(x, 1, 9, 36, 1, '#141728');
    for (let i = 0; i < 5; i++) g.rect(x, 4 + i * 7, 4, 3, 2, i % 2 ? '#ff2d4a' : '#7a1424');
    g.circle(x, 19, 10, 3.5, '#141728'); g.rect(x, 18, 10, 3, 2, '#ff2d4a'); g.rect(x, 18, 10, 1, 1, '#ffb0bc');
    hazardEdge(x, 36, 12);
    return g.finish(c, C.ol);
  }
  function hangHolo() {
    // broken holo-projector housing leaking a glitch of cyan light
    const c = g.canvas(34, 15), x = g.ctx(c);
    g.poly(x, [[3, 1], [31, 1], [33, 10], [1, 10]], '#2a2e48');
    g.rect(x, 3, 1, 28, 1, '#4a5280');
    for (let i = 6; i < 28; i += 4) g.rect(x, i, 3, 2, 4, '#1a1d30');
    g.rect(x, 12, 8, 10, 2, C.cyan); g.rect(x, 14, 8, 2, 2, '#d6ffff');
    g.rect(x, 25, 4, 3, 1, C.bike); g.rect(x, 6, 8, 2, 1, C.bike);
    hazardEdge(x, 32, 12);
    return g.finish(c, C.ol);
  }
  function hangRack() {
    // dangling power-cell rack with status LEDs and cooling fins
    const c = g.canvas(30, 17), x = g.ctx(c);
    g.rect(x, 1, 1, 28, 12, '#1c2036'); g.rect(x, 1, 1, 28, 1, '#3a4066');
    for (let i = 4; i < 26; i += 3) g.rect(x, i, 3, 1, 8, '#2a3050');
    for (let i = 0; i < 4; i++) { g.rect(x, 5 + i * 6, 5, 2, 2, i % 2 ? '#4dff9a' : C.cyan); g.rect(x, 5 + i * 6, 9, 2, 1, C.amber); }
    hazardEdge(x, 28, 14);
    return g.finish(c, C.ol);
  }
  function hangNeon() {
    // broken neon tube frame, sparking where the glass snapped
    const c = g.canvas(38, 15), x = g.ctx(c);
    g.rect(x, 1, 2, 36, 8, '#120c1c'); g.rect(x, 1, 2, 36, 1, '#3a2a48');
    g.line(x, 4, 7, 10, 4, C.bike, 1); g.line(x, 10, 4, 16, 7, C.bike, 1);
    g.line(x, 20, 7, 26, 4, C.bike, 1); g.line(x, 26, 4, 33, 7, C.bike, 1);
    g.rect(x, 17, 6, 2, 1, '#ffd0ec'); g.rect(x, 19, 7, 1, 1, '#ffffff');
    hazardEdge(x, 36, 12);
    return g.finish(c, C.ol);
  }
  function argosGantry(v) {
    // overhead security gantry: scanner housing, drone dock, warning lights
    const c = g.canvas(66, 21), x = g.ctx(c);
    g.rect(x, 1, 1, 64, 15, '#20253e'); g.rect(x, 1, 1, 64, 1, '#4a5280'); g.rect(x, 1, 15, 64, 1, '#141728');
    for (let i = 4; i < 62; i += 6) g.rect(x, i, 4, 4, 4, '#2a3050');
    const lc = v ? C.amber : C.red;
    for (let i = 0; i < 6; i++) g.rect(x, 6 + i * 10, 10, 4, 2, i % 2 ? lc : '#3a1a24');
    g.rect(x, 28, 3, 10, 6, '#141728'); g.rect(x, 31, 5, 4, 2, C.cyan);
    hazardEdge(x, 64, 17);
    return g.finish(c, C.ol);
  }
  function pizza() {
    const c = g.canvas(17, 15), x = g.ctx(c);
    g.poly(x, [[1, 3], [16, 3], [8.5, 14]], '#ffcf4a');
    g.rect(x, 1, 1, 15, 3, '#c8803a'); g.rect(x, 1, 1, 15, 1, '#eaa860');
    g.rect(x, 5, 5, 2, 2, '#d8283c'); g.rect(x, 10, 5, 2, 2, '#d8283c'); g.rect(x, 7, 8, 2, 2, '#d8283c');
    g.rect(x, 3, 4, 2, 1, '#fff0a0'); g.rect(x, 12, 8, 1, 2, '#ffcf4a');
    return g.finish(c, C.ol);
  }
  function guarana() {
    const c = g.canvas(10, 15), x = g.ctx(c);
    g.rect(x, 1, 2, 8, 12, '#2a9a4a'); g.rect(x, 1, 1, 8, 1, '#b8c0d0'); g.rect(x, 2, 0, 6, 1, '#8a90a8');
    g.rect(x, 1, 6, 8, 3, '#d8283c'); g.rect(x, 4, 7, 2, 1, '#ffffff');
    g.rect(x, 2, 2, 1, 11, '#5ad87a'); g.rect(x, 1, 13, 8, 1, '#8a90a8');
    return g.finish(c, C.ol);
  }

  SP.buildSprites = function () {
    const S = {};
    S.run = [];
    for (let i = 0; i < 8; i++) S.run.push(courier(runPose((i / 8) * Math.PI * 2)));
    S.jump = courier(POSES.jump);
    S.fall = courier(POSES.fall);
    S.slide = courier(POSES.slide);
    S.hit = courier(POSES.hit);
    S.down = courier(POSES.down);
    S.bikeRide = [0, 1, 2].map((f) => bike(f, 'ride'));
    S.bikeDuck = [0, 1, 2].map((f) => bike(f, 'duck'));
    S.bikeEmpty = [0, 1, 2].map((f) => bike(f, null));
    S.drone = [drone(0), drone(1)];
    S.interceptor = [interceptor(0), interceptor(1)];
    S.taxi = [0, 1, 2].map((f) => taxi(f));
    S.kombi = kombi(false);
    S.kombiWreck = kombi(true);
    S.barrier = barrier();
    S.crates = crates();
    S.bin = bin();
    S.obras = obras();
    S.cone = cone();
    S.roadblock = [roadblock(0), roadblock(1)];
    S.endWall = endWall(false);
    S.endWallBroken = endWall(true);
    S.ramp = ramp();
    S.gantries = [argosGantry(0), argosGantry(1)];
    S.hangSigns = [hangScanner(), hangHolo(), hangRack(), hangNeon()];
    S.hangGlow = ['rgba(255,45,74,0.07)', 'rgba(62,240,255,0.08)', 'rgba(77,255,154,0.06)', 'rgba(255,63,164,0.08)'];
    S.heal = [pizza(), guarana()];
    S.chip = [0, 1, 2, 1].map((f) => chip(f));
    S.dropPoint = dropPoint();
    S.cargoPickup = [0, 1, 2].map((k) => cargoBox(k, 12, 9));
    S.cargoStack = [0, 1, 2].map((k) => cargoBox(k, 7, 5));
    S.terminal = terminal();
    // white silhouettes for hit flashes
    S.flash = new Map();
    S.flashOf = function (src) {
      if (!S.flash.has(src)) S.flash.set(src, g.tint(src, '#ffffff'));
      return S.flash.get(src);
    };
    S.ghostOf = (function () {
      const m = new Map();
      return function (src) {
        if (!m.has(src)) m.set(src, g.tint(src, '#3ef0ff'));
        return m.get(src);
      };
    })();
    // gameplay-critical readability treatments (cached per sprite frame)
    const haloM = new Map(), rimM = new Map();
    const boostM = new Map();
    S.boostHaloOf = (src) => { if (!boostM.has(src)) boostM.set(src, g.tint(g.halo(src, '#020208'), '#3ef0ff')); return boostM.get(src); };
    S.haloOf = (src) => { if (!haloM.has(src)) haloM.set(src, g.halo(src, '#020208')); return haloM.get(src); };
    S.rimOf = (src) => { if (!rimM.has(src)) rimM.set(src, g.rim(src, '#a8f7ff')); return rimM.get(src); };
    SP.spr = S;
    return S;
  };
})();
