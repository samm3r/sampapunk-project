/* SampaPunk — DOM interface: screens, HUD, toasts, settings. */
(function () {
  'use strict';
  const SP = window.SP;
  const $ = (id) => document.getElementById(id);

  const screens = ['title', 'howto', 'settings', 'briefing', 'pause', 'over', 'complete'];
  let current = null;
  const hudCache = {};

  function show(name) {
    for (const s of screens) $('scr-' + s).classList.toggle('hidden', s !== name);
    current = name;
    const scr = name ? $('scr-' + name) : null;
    if (scr) {
      const first = scr.querySelector('[data-primary]') || scr.querySelector('button');
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 0);
    } else if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  }
  function showHUD(on) { $('hud').classList.toggle('hidden', !on); }

  function setText(id, v) {
    if (hudCache[id] === v) return;
    hudCache[id] = v;
    $(id).textContent = v;
  }
  function setStyle(id, prop, v) {
    const k = id + ':' + prop;
    if (hudCache[k] === v) return;
    hudCache[k] = v;
    $(id).style[prop] = v;
  }
  function setClass(el, cls, on) {
    const k = (el.id || '') + '.' + cls;
    if (hudCache[k] === on) return;
    hudCache[k] = on;
    el.classList.toggle(cls, on);
  }
  const pad = (n, l) => String(Math.max(0, Math.floor(n))).padStart(l, '0');

  function buildRouteLabels() {
    const box = $('hud-route-labels');
    box.innerHTML = '';
    for (const s of SP.ROUTE) {
      const sp = document.createElement('span');
      sp.style.left = (s.start / SP.TOTAL_M) * 100 + '%';
      sp.textContent = s.short + ' · ' + SP.t(s.mode === 'bike' ? 'hud.bike' : 'hud.foot');
      sp.dataset.i = s.index;
      box.appendChild(sp);
    }
    const end = document.createElement('span');
    end.className = 'end';
    end.style.left = '100%';
    end.textContent = SP.t('hud.drop');
    box.appendChild(end);
  }

  function updateHUD(G) {
    const integ = Math.round(G.integrity);
    setStyle('hud-int', 'width', integ + '%');
    setText('hud-int-val', String(integ));
    setClass($('hud-int').parentNode, 'low', integ <= 40);
    const boosting = G.boostT > 0;
    const bv = boosting ? (G.boostT / SP.BOOST_TIME) * 100 : G.boost;
    setStyle('hud-boost', 'width', Math.round(bv) + '%');
    setText('hud-boost-val', boosting ? SP.t('hud.active') : G.boost >= 100 ? SP.t('hud.ready') : Math.floor(G.boost) + '%');
    const bb = $('hud-boost').parentNode;
    setClass(bb, 'ready', !boosting && G.boost >= 100);
    setClass(bb, 'active', boosting);
    const bike = G.mode === 'bike';
    setClass($('hud-mode-box'), 'bike', bike);
    const tb = $('tb-boost');
    if (tb) { setClass(tb, 'ready', !boosting && G.boost >= 100); setClass(tb, 'active', boosting); setClass(tb, 'disabled', !boosting && G.boost < 100); }
    updateLocation(G);
    const al = $('hud-alert');
    if (hudCache.level !== G.level) {
      al.className = 'alert lvl-' + G.level;
      void al.offsetWidth;
      if (hudCache.level !== undefined) al.classList.add('bump');
      hudCache.level = G.level;
    }
    setText('hud-alert-n', String(G.level + 1));
    setText('hud-alert-name', SP.t('level.' + G.level));
    setStyle('hud-heat', 'width', Math.round(G.heat) + '%');
    setText('hud-score', pad(G.score, 6));
    setText('hud-dist', pad(G.dist, 4));
    setText('hud-chips', pad(G.chips, 3));
    // carried cargo (inventory) vs delivered cargo (banked)
    const cap = SP.CARGO.capacity, carried = G.cargo.length;
    setText('hud-cargo', carried + '/' + cap);
    setText('hud-delivered', pad(G.cargoDelivered, 2));
    const cr = $('hud-cargo-row');
    setClass(cr, 'full', carried >= cap);
    setClass(cr, 'has', carried > 0 && carried < cap);
    if (hudCache.carried !== undefined && carried !== hudCache.carried) { cr.classList.remove('bump'); void cr.offsetWidth; cr.classList.add('bump'); }
    hudCache.carried = carried;
    const pr = (G.dist / SP.TOTAL_M) * 100;
    setStyle('hud-route', 'width', pr.toFixed(1) + '%');
    setStyle('hud-route-dot', 'left', pr.toFixed(1) + '%');
    const seg = SP.segAtM(G.dist).index;
    if (hudCache.seg !== seg) {
      hudCache.seg = seg;
      for (const sp of $('hud-route-labels').children) sp.classList.toggle('on', sp.dataset.i !== undefined && +sp.dataset.i <= seg);
    }
  }
  // ---------------------------------------------------------------- location street sign
  // Reuses the route's district zones; slides one sign out to the left while the next enters
  // from the right, only when the district actually changes.
  const LOC_MS = 320;
  let locZone = -1, locAnim = null;
  function signText(z) { return z.sign || z.label; }
  function setLocationNow(z) {
    const view = $('hud-loc-view');
    if (locAnim) { locAnim.forEach((a) => a.cancel()); locAnim = null; }
    view.querySelectorAll('.loc-sign').forEach((el, i) => { if (i) el.remove(); });
    const sign = view.querySelector('.loc-sign');
    sign.textContent = signText(z);
    sign.style.transform = '';
    // HUD may still be hidden (nothing to measure yet): retry on the next frame
    if (!sign.offsetWidth) { locZone = -1; return; }
    view.style.width = sign.offsetWidth + 'px';
    locZone = z.index;
  }
  function updateLocation(G) {
    const z = SP.zoneAtM(G.dist);
    if (z.index === locZone) return;
    const view = $('hud-loc-view');
    const old = view.querySelector('.loc-sign:last-child');
    if (locZone < 0 || !old || !view.animate) { setLocationNow(z); return; }
    locZone = z.index;
    if (locAnim) { locAnim.forEach((a) => a.finish()); }
    const cur = view.querySelector('.loc-sign:last-child');
    const next = cur.cloneNode(false);
    next.textContent = signText(z);
    next.classList.add('incoming');
    view.appendChild(next);
    const gap = parseFloat(getComputedStyle(view).getPropertyValue('--loc-gap')) || 8;
    const shift = cur.offsetWidth + gap;
    const ease = 'cubic-bezier(0.65, 0, 0.35, 1)';
    view.style.width = Math.max(cur.offsetWidth, next.offsetWidth) + 'px';
    const a1 = cur.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + -shift + 'px)' }], { duration: LOC_MS, easing: ease, fill: 'forwards' });
    const a2 = next.animate([{ transform: 'translateX(' + shift + 'px)' }, { transform: 'translateX(0)' }], { duration: LOC_MS, easing: ease, fill: 'forwards' });
    locAnim = [a1, a2];
    a2.onfinish = () => {
      if (cur.parentNode) cur.remove();
      next.classList.remove('incoming');
      a2.cancel(); next.style.transform = '';
      view.style.width = next.offsetWidth + 'px';
      locAnim = null;
    };
  }

  function resetHUD() {
    locZone = -1; for (const k in hudCache) delete hudCache[k]; }

  const TOAST_ICONS = {
    box: '<path d="M2 5l6-3 6 3v7l-6 3-6-3z" fill="#d8903a" stroke="none"/><path d="M2 5l6 3 6-3M8 8v7" stroke="#6a3c14"/>',
    check: '<path d="M2 5l6-3 6 3v7l-6 3-6-3z"/><path d="M5.2 8.4l2 2 3.6-4"/>',
    warn: '<path d="M8 1.8L15 14H1z"/><path d="M8 6v4M8 11.6v1"/>',
    pin: '<path d="M8 15s-5-5.2-5-8.6A5 5 0 0 1 13 6.4C13 9.8 8 15 8 15z" fill="currentColor" stroke="none"/><circle cx="8" cy="6.4" r="1.8" fill="#070a1a" stroke="none"/>',
    bolt: '<path d="M9.6 1L3 9.2h4.6L6.2 15l6.8-8.6H8.6z" fill="currentColor" stroke="none"/>',
    plus: '<rect x="1.5" y="1.5" width="13" height="13"/><path d="M8 4.5v7M4.5 8h7"/>'
  };
  function toastIcon(text, kind) {
    const t = String(text);
    if (/DELIVERED|BONUS|ENTREGUE|BÔNUS/.test(t)) return TOAST_ICONS.check;
    if (/CARGO|PACKAGE|BACKPACK|DELIVERY POINT|CARGA|PACOTE|MOCHILA|POSTO DE ENTREGA/.test(t)) return TOAST_ICONS.box;
    if (/INTEGRITY RESTORED|REPAIR|INTEGRIDADE RECUPERADA|REPARO/.test(t)) return TOAST_ICONS.plus;
    if (/BOOST|OVERDRIVE|TURBO/.test(t)) return TOAST_ICONS.bolt;
    if (/ENTERING|DROP POINT|PONTO DE ENTREGA/.test(t)) return TOAST_ICONS.pin;
    if (kind === 'danger' || kind === 'alert' || kind === 'warn') return TOAST_ICONS.warn;
    return null;
  }
  function toast(text, kind, life) {
    const box = $('toasts');
    while (box.children.length >= 3) box.removeChild(box.firstChild);
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    const icon = toastIcon(text, kind);
    if (icon) el.insertAdjacentHTML('beforeend', '<svg class="ti" viewBox="0 0 16 16" aria-hidden="true">' + icon + '</svg>');
    // key names become key caps; " · " separators become thin dividers
    String(text).split(/(\bSPACE\b|ESPAÇO|\bSHIFT\b| · )/).forEach((part) => {
      if (!part) return;
      const sp = document.createElement('span');
      if (part === ' · ') { sp.className = 'tsep'; sp.textContent = '|'; }
      else if (part === 'SPACE' || part === 'ESPAÇO' || part === 'SHIFT') { sp.className = 'tkey'; sp.textContent = part; }
      else sp.textContent = part;
      el.appendChild(sp);
    });
    const l = life || 2.2;
    el.style.setProperty('--life', l + 's');
    box.appendChild(el);
    setTimeout(() => el.remove(), (l + 0.5) * 1000);
  }
  function clearToasts() { $('toasts').innerHTML = ''; }

  let dmgTimer = null;
  function flashDamage() {
    const el = $('fx-damage');
    el.classList.add('on');
    clearTimeout(dmgTimer);
    dmgTimer = setTimeout(() => el.classList.remove('on'), 60);
  }

  // Results layout: framed FINAL SCORE badge, then two ruled columns of icon rows.
  // Rows are [key, value, big?]; keys pick the icon and column, labels come from the language table.
  const STAT_ICONS = {
    distance: ['c-cyan', '<circle cx="3" cy="4" r="1.8"/><circle cx="13" cy="4" r="1.8"/><circle cx="3" cy="12" r="1.8"/><circle cx="13" cy="12" r="1.8"/><path d="M4.8 4h6.4M11.6 5.4L4.4 10.6M4.8 12h6.4"/>'],
    delivered: ['c-cyan', '<path d="M2 5l6-3 6 3v7l-6 3-6-3z" fill="currentColor" fill-opacity="0.25"/><path d="M2 5l6 3 6-3M8 8v7"/>'],
    lost: ['c-red', '<path d="M8 1v3M8 12v3M1 8h3M12 8h3M3 3l2 2M11 11l2 2M3 13l2-2M11 5l2-2"/><circle cx="8" cy="8" r="2.4" fill="currentColor"/>'],
    undelivered: ['c-amber', '<path d="M2 5l6-3 6 3v7l-6 3-6-3z"/><path d="M8 6v3.5M8 11.2v.8"/>'],
    best: ['c-amber', '<path d="M4.5 2h7v3.5a3.5 3.5 0 0 1-7 0z" fill="currentColor"/><path d="M4.5 3.2H2v1.3A2.5 2.5 0 0 0 4.6 7M11.5 3.2H14v1.3A2.5 2.5 0 0 1 11.4 7M8 9v3M5 14h6M6.2 12h3.6"/>'],
    chips: ['c-cyan', '<rect x="4" y="4" width="8" height="8"/><rect x="6.2" y="6.2" width="3.6" height="3.6" fill="currentColor"/><path d="M6 1.5v2.5M10 1.5v2.5M6 12v2.5M10 12v2.5M1.5 6H4M1.5 10H4M12 6h2.5M12 10h2.5"/>'],
    bonus: ['c-cyan', '<path d="M8 1.5l1.9 4.2 4.6.5-3.4 3.1 1 4.5L8 11.5l-4.1 2.3 1-4.5L1.5 6.2l4.6-.5z"/>'],
    alert: ['c-red', '<path d="M8 1.8L15 14H1z"/><path d="M8 6v4M8 11.6v1"/>'],
    avoided: ['c-red', '<circle cx="8" cy="8" r="6.2"/><path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6"/>']
  };
  const LEFT_COL = ['distance', 'delivered', 'lost', 'undelivered', 'best'];
  function statValue(key, v) {
    v = String(v);
    const m = v.match(/^(.*) · (\+.*)$/);
    if (m) return m[1] + '<i class="dot">·</i><em class="gold">' + m[2] + '</em>';
    if (key === 'undelivered') return '<i class="tag">' + SP.t('stat.noPts') + '</i>' + v;
    if (key === 'alert') return '<span class="word">' + v + '</span>';
    if (/^\+/.test(v) || key === 'best') return '<em class="gold">' + v + '</em>';
    return v;
  }
  function statRow(r) {
    const ic = STAT_ICONS[r[0]] || ['c-cyan', '<rect x="3" y="3" width="10" height="10"/>'];
    return '<div class="srow"><svg class="sico ' + ic[0] + '" viewBox="0 0 16 16" aria-hidden="true">' + ic[1] + '</svg><span class="slbl">' + SP.t('stat.' + r[0]) + '</span><b class="sval">' + statValue(r[0], r[1]) + '</b></div>';
  }
  function statRows(rows) {
    const big = rows.find((r) => r[2]);
    const rest = rows.filter((r) => !r[2]);
    const left = rest.filter((r) => LEFT_COL.includes(r[0])), right = rest.filter((r) => !LEFT_COL.includes(r[0]));
    return (big ? '<div class="score-head"><span class="sh-lbl">' + SP.t('stat.' + big[0]) + '</span><span class="sh-hatch">//</span><span class="sh-box"><b>' + big[1] + '</b></span></div>' : '') +
      '<div class="scols"><div class="scol">' + left.map(statRow).join('') + '</div><div class="scol">' + right.map(statRow).join('') + '</div></div>';
  }

  function syncSettings() {
    const s = SP.settings;
    document.querySelectorAll('.toggle[data-set]').forEach((b) => {
      const on = !!s[b.dataset.set];
      b.classList.toggle('off', !on);
      b.querySelector('em').textContent = SP.t(on ? 'set.on' : 'set.off');
    });
    $('reset-best-val').textContent = pad(SP.store.get('best', 0), 6);
    const pm = $('pause-mute');
    (pm.querySelector('.b-label') || pm).textContent = SP.t(s.sfx || s.music ? 'btn.mute' : 'btn.unmute');
    document.body.classList.toggle('no-scan', !s.scan);
  }

  // Briefing typewriter
  let typeTimer = null;
  function typeBriefing() {
    const el = $('brief-msg');
    const full = SP.t('brief.msg');
    clearInterval(typeTimer);
    let i = 0;
    el.innerHTML = '<span class="cursor"></span>';
    typeTimer = setInterval(() => {
      i += 2;
      el.innerHTML = '';
      el.textContent = full.slice(0, i);
      const c = document.createElement('span'); c.className = 'cursor'; el.appendChild(c);
      if (i % 8 === 0) SP.audio.play('menu');
      if (i >= full.length) { clearInterval(typeTimer); }
    }, 28);
  }
  function stopTyping() { clearInterval(typeTimer); }

  // keyboard navigation between visible buttons
  function moveFocus(dir) {
    if (!current) return;
    const btns = Array.from($('scr-' + current).querySelectorAll('button')).filter((b) => b.offsetParent !== null);
    if (!btns.length) return;
    const i = btns.indexOf(document.activeElement);
    const n = i < 0 ? 0 : (i + dir + btns.length) % btns.length;
    btns[n].focus({ preventScroll: true });
    SP.audio.play('menu');
  }
  function activateFocused() {
    if (!current) return false;
    const scr = $('scr-' + current);
    let el = document.activeElement;
    if (!el || !scr.contains(el) || el.tagName !== 'BUTTON') el = scr.querySelector('[data-primary]');
    if (el) { el.click(); return true; }
    return false;
  }

  // ---------------------------------------------------------------- button / panel chrome
  // Builds the cyberpunk frame layers (cut-corner fill, offset outline, magenta accents, hatch marks)
  // and line icons once at boot, so the HTML stays plain text.
  const ICONS = {
    play: '<path d="M5 3l8 5-8 5z" fill="currentColor" stroke="none"/>',
    book: '<path d="M2 3.5c2-1 4-1 6 .6 2-1.6 4-1.6 6-.6v9c-2-1-4-1-6 .6-2-1.6-4-1.6-6-.6z"/><path d="M8 4.1v9"/>',
    gear: '<circle cx="8" cy="8" r="2"/><circle cx="8" cy="8" r="4.4"/><path d="M8 1.6v1.9M8 12.5v1.9M1.6 8h1.9M12.5 8h1.9M3.5 3.5l1.3 1.3M11.2 11.2l1.3 1.3M3.5 12.5l1.3-1.3M11.2 4.8l1.3-1.3"/>',
    back: '<path d="M10 3L5 8l5 5"/>',
    home: '<path d="M2.5 8.2L8 3l5.5 5.2"/><path d="M4.2 7v6h7.6V7"/>',
    sound: '<path d="M2.5 6h3l3.5-3v10l-3.5-3h-3z"/><path d="M11 5.5c1.1 1.5 1.1 3.5 0 5"/>',
    retry: '<path d="M12.6 8a4.6 4.6 0 1 1-1.4-3.3"/><path d="M12.6 2.4v3h-3"/>'
  };
  const ACT_ICON = { new: 'play', start: 'play', resume: 'play', 'howto-continue': 'play', howto: 'book', settings: 'gear', back: 'back', menu: 'home', mute: 'sound', retry: 'retry' };
  function decorate() {
    document.querySelectorAll('button.btn').forEach((b) => {
      if (b.querySelector('.b-label')) return;
      const label = document.createElement('span');
      label.className = 'b-label';
      label.textContent = b.textContent.trim();
      b.textContent = '';
      const ico = ACT_ICON[b.dataset.act];
      b.insertAdjacentHTML('beforeend', '<span class="b-frame"></span><span class="b-bg"></span><span class="b-tick"></span>' +
        (ico ? '<svg class="b-ico" viewBox="0 0 16 16" aria-hidden="true">' + ICONS[ico] + '</svg>' : '') + '<span class="b-hatch"></span>');
      b.insertBefore(label, b.querySelector('.b-hatch'));
    });
    document.querySelectorAll('button.toggle').forEach((b) => {
      if (b.querySelector('.b-bg')) return;
      b.insertAdjacentHTML('afterbegin', '<span class="b-bg"></span><span class="b-tick"></span>');
    });
    document.querySelectorAll('.panel').forEach((p) => {
      if (p.querySelector('.p-bg')) return;
      p.insertAdjacentHTML('afterbegin', '<span class="p-bg"></span><span class="p-bracket"></span><span class="p-hatch"></span>');
    });
  }

  SP.ui = { decorate,
    show, showHUD, updateHUD, resetHUD, toast, clearToasts, flashDamage, statRows, syncSettings, buildRouteLabels,
    typeBriefing, stopTyping, moveFocus, activateFocused, pad,
    get current() { return current; }
  };
})();
