/* SampaPunk — on-screen touch controls for tablets and phones.
   Buttons feed the existing input actions (jump / down / boost / pause) through SP.input.virtual,
   so touch and keyboard share one gameplay input path. Controls show automatically on
   touch-first devices and, on hybrids, as soon as the screen is actually touched. */
(function () {
  'use strict';
  const SP = window.SP;
  const ICON = {
    jump: '<path d="M8 2.5L3 8h3.2v5.5h3.6V8H13z" fill="currentColor"/>',
    down: '<path d="M8 13.5L3 8h3.2V2.5h3.6V8H13z" fill="currentColor"/>',
    boost: '<path d="M9.6 1L3 9.2h4.6L6.2 15l6.8-8.6H8.6z" fill="currentColor"/>',
    pause: '<rect x="4" y="3" width="3" height="10" fill="currentColor"/><rect x="9" y="3" width="3" height="10" fill="currentColor"/>'
  };
  const BUTTONS = [
    { id: 'tb-down', act: 'down', cls: 'tb tb-down', label: 'touch.slide' },
    { id: 'tb-jump', act: 'jump', cls: 'tb tb-jump', label: 'touch.jump' },
    { id: 'tb-boost', act: 'boost', cls: 'tb tb-boost', label: 'touch.boost' },
    { id: 'tb-pause', act: 'pause', cls: 'tb tb-pause', label: 'touch.pause' }
  ];
  const mq = (q) => window.matchMedia && window.matchMedia(q).matches;
  // touch-first: primary pointer is coarse (phones, tablets); hybrids wait for a real touch
  const touchCapable = () => (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
  const touchFirst = () => touchCapable() && (mq('(pointer: coarse)') || mq('(hover: none)'));

  let enabled = false;
  const active = new Map();   // pointerId -> button element

  function setEnabled(on) {
    if (enabled === on) return;
    enabled = on;
    SP.touchUI = on;
    document.body.classList.toggle('touch-ui', on);
    if (!on) releaseAll();
  }
  function release(pid) {
    const btn = active.get(pid);
    if (!btn) return;
    active.delete(pid);
    let still = false;
    for (const b of active.values()) if (b === btn) still = true;
    if (!still) btn.classList.remove('pressed');
    if (btn.dataset.act !== 'pause') SP.input.virtual(btn.dataset.act, false);
  }
  function releaseAll() { for (const pid of [...active.keys()]) release(pid); }

  function build() {
    const stage = document.getElementById('stage');
    const box = document.createElement('div');
    box.id = 'touch';
    box.setAttribute('aria-hidden', 'true');
    for (const b of BUTTONS) {
      const el = document.createElement('div');
      el.id = b.id; el.className = b.cls; el.dataset.act = b.act;
      el.setAttribute('role', 'button'); el.dataset.i18nAria = b.label; el.setAttribute('aria-label', SP.t(b.label));
      el.innerHTML = '<svg viewBox="0 0 16 16">' + ICON[b.act] + '</svg>';
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (active.has(e.pointerId)) return;              // no double activation
        if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
        active.set(e.pointerId, el);
        el.classList.add('pressed');
        SP.input.virtual(b.act, true);
      });
      const up = (e) => release(e.pointerId);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      box.appendChild(el);
    }
    // the HUD sits before #touch, so CSS can hide the controls whenever the HUD is hidden
    document.getElementById('hud').after(box);
  }

  function init() {
    build();
    setEnabled(touchFirst());
    // hybrids: a real touch anywhere on the game turns the controls on…
    window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') setEnabled(true); }, true);
    // …and going back to the keyboard on a fine-pointer device hides them again
    window.addEventListener('keydown', () => { if (enabled && !touchFirst()) setEnabled(false); }, true);
    // interruptions never leave a button stuck
    SP.input.onClear(releaseAll);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
    // keep gestures off the game area only (canvas + controls), not the whole page
    const stage = document.getElementById('stage');
    stage.addEventListener('touchmove', (e) => { if (enabled) e.preventDefault(); }, { passive: false });
  }

  SP.touch = { init, get enabled() { return enabled; }, setEnabled };
})();
