/* SampaPunk — shared configuration, tuning values and small utilities. */
(function () {
  'use strict';
  const SP = (window.SP = window.SP || {});

  SP.VERSION = 'v1.0';

  // Logical resolution. Everything is simulated and drawn at this size and scaled up.
  SP.W = 480;
  SP.H = 270;
  SP.GROUND = 228;   // y of the street / road surface
  SP.PX = 110;       // fixed screen x of the courier (centre of hitbox)
  SP.PPM = 16;       // world pixels per metre

  // Physics
  SP.GRAV = 1500;
  SP.JUMP_V = { foot: 470, bike: 455 };
  SP.RAMP_V = 600;
  SP.SPEED = { foot: 165, bike: 275 };
  SP.BOOST_MULT = 1.45;
  SP.BOOST_TIME = 2.6;

  // Corporate pursuit levels
  SP.LEVELS = [
    { name: 'SURVEILLANCE', color: '#3ef0ff', mult: 1.0, gap: 1.05, warn: 1.0, floor: 0 },
    { name: 'INTERCEPTION', color: '#ffb238', mult: 1.08, gap: 0.85, warn: 0.9, floor: 34 },
    { name: 'LOCKDOWN', color: '#ff2d4a', mult: 1.16, gap: 0.68, warn: 0.8, floor: 67 }
  ];

  // The delivery route: on foot → motorcycle → on foot → motorcycle → drop point.
  SP.ROUTE = [
    { mode: 'foot', start: 0, end: 550, theme: 'liberdade', label: 'LIBERDADE DISTRICT', short: 'LIBERDADE' },
    { mode: 'bike', start: 550, end: 1400, theme: 'paulista', label: 'AVENIDA PAULISTA', short: 'PAULISTA' },
    { mode: 'foot', start: 1400, end: 1900, theme: 'centro', label: 'CENTRO — OLD TOWN', short: 'CENTRO' },
    { mode: 'bike', start: 1900, end: 2800, theme: 'minhocao', label: 'MINHOCÃO ELEVATED', short: 'MINHOCÃO' }
  ];
  SP.ROUTE.forEach((s, i) => { s.index = i; s.last = i === SP.ROUTE.length - 1; });
  SP.TOTAL_M = SP.ROUTE[SP.ROUTE.length - 1].end;

  // Scenery districts layered over the route (backdrop only — gameplay follows SP.ROUTE).
  SP.ZONES = [
    { start: 0, end: 170, theme: 'metro', sign: 'METRÔ LIBERDADE', label: 'LIBERDADE METRO STATION', place: 'the Liberdade metro station' },
    { start: 170, end: 550, theme: 'liberdade', sign: 'LIBERDADE', label: 'LIBERDADE DISTRICT', place: 'Liberdade' },
    { start: 550, end: 1000, theme: 'paulista', sign: 'AV. PAULISTA', label: 'AVENIDA PAULISTA', place: 'Avenida Paulista' },
    { start: 1000, end: 1400, theme: 'marginal', sign: 'MARG. PINHEIROS', label: 'MARGINAL PINHEIROS', place: 'the Marginal Pinheiros' },
    { start: 1400, end: 1900, theme: 'centro', sign: 'CENTRO', label: 'HISTORIC CENTRO', place: 'the historic Centro' },
    { start: 1900, end: 2400, theme: 'minhocao', sign: 'MINHOCÃO', label: 'MINHOCÃO ELEVATED', place: 'the Minhocão' },
    { start: 2400, end: 2800, theme: 'periferia', sign: 'PERIFERIA', label: 'PERIFERIA — SOUTH ZONE', place: 'the periferia' }
  ];
  SP.ZONES.forEach((z, i) => { z.index = i; z.last = i === SP.ZONES.length - 1; });
  SP.zoneAtM = function (m) {
    for (const z of SP.ZONES) if (m < z.end) return z;
    return SP.ZONES[SP.ZONES.length - 1];
  };

  // Secondary objective: optional cargo collected along the route and delivered at checkpoints.
  // All values are in metres / points and safe to rebalance.
  SP.CARGO = {
    capacity: 5,          // packages the backpack can hold
    points: 100,          // per delivered package
    multiBonus: 0,        // extra points per package beyond the first in one delivery (off for now)
    checkpoints: [540, 1000, 1375, 1890, 2400, 2720],
    pickups: [
      60, 130, 200, 270, 340, 410, 480,          // Metro + Liberdade (on foot)
      620, 700, 780, 860, 940,                    // Avenida Paulista (bike)
      1060, 1140, 1220, 1300,                     // Marginal Pinheiros (bike)
      1450, 1520, 1590, 1660, 1730, 1800, 1860,   // Centro (on foot)
      1970, 2060, 2150, 2240, 2330,               // Minhocão (bike)
      2470, 2550, 2630, 2700                      // Periferia (bike)
    ]
  };

  // Repair items that restore integrity, at fixed spots on the route (kind 0 = pizza slice, 1 = guaraná can).
  SP.HEALS = {
    amount: [20, 10],
    spots: [
      { m: 230, kind: 1 }, { m: 445, kind: 0 },     // Liberdade
      { m: 740, kind: 1 }, { m: 1180, kind: 0 },    // Paulista / Marginal
      { m: 1555, kind: 1 }, { m: 1765, kind: 0 },   // Centro
      { m: 2105, kind: 1 }, { m: 2510, kind: 0 }    // Minhocão / Periferia
    ]
  };

  SP.segAtM = function (m) {
    for (const s of SP.ROUTE) if (m < s.end) return s;
    return SP.ROUTE[SP.ROUTE.length - 1];
  };

  // Persistent storage (guarded — private mode or blocked storage must never break the game)
  SP.store = {
    get(k, d) {
      try {
        const v = localStorage.getItem('sampapunk.' + k);
        return v === null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('sampapunk.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ }
    }
  };

  // Seeded RNG for deterministic scenery generation
  SP.mkRng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  SP.hash = function (n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  SP.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  SP.lerp = (a, b, t) => a + (b - a) * t;
  SP.pick = (arr, r) => arr[Math.floor((r ? r() : Math.random()) * arr.length)];
})();
