/* SampaPunk — keyboard input. Tracks held keys and one-shot presses (edge triggered,
   auto-repeat ignored) so holding a key never re-triggers an action. */
(function () {
  'use strict';
  const SP = window.SP;

  const MAP = {
    Space: 'jump', ArrowUp: 'jump', KeyW: 'jump',
    ArrowDown: 'down', KeyS: 'down',
    ShiftLeft: 'boost', ShiftRight: 'boost',
    Escape: 'pause', KeyP: 'pause',
    Enter: 'confirm', NumpadEnter: 'confirm',
    KeyM: 'mute'
  };
  const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

  const held = { jump: false, down: false, boost: false };
  const pressed = {};
  const keysDown = new Set();
  const vHeld = { jump: 0, down: 0, boost: 0 };   // active virtual (touch) holds per action
  const clearHooks = [];
  let listener = null; // immediate callback for menu-level actions

  function onDown(e) {
    if (PREVENT.has(e.code)) e.preventDefault();
    const act = MAP[e.code];
    if (e.repeat || keysDown.has(e.code)) return;
    keysDown.add(e.code);
    if (!act) { if (listener) listener('key:' + e.code, e); return; }
    if (act in held) held[act] = true;
    pressed[act] = true;
    if (listener) listener(act, e);
  }
  function onUp(e) {
    if (PREVENT.has(e.code)) e.preventDefault();
    keysDown.delete(e.code);
    const act = MAP[e.code];
    if (!act || !(act in held)) return;
    // a held action stays held while any of its keys is still down
    let still = false;
    for (const k of keysDown) if (MAP[k] === act) still = true;
    held[act] = still || vHeld[act] > 0;
  }
  // On-screen controls call this with the same action names the keyboard produces.
  function virtual(act, down) {
    if (down) {
      if (act in held) { vHeld[act]++; if (held[act] && vHeld[act] > 1) return; held[act] = true; }
      pressed[act] = true;
      if (listener) listener(act, null);
    } else if (act in held) {
      vHeld[act] = Math.max(0, vHeld[act] - 1);
      let still = vHeld[act] > 0;
      for (const k of keysDown) if (MAP[k] === act) still = true;
      held[act] = still;
    }
  }
  function onClear(fn) { clearHooks.push(fn); }
  function clear() {
    keysDown.clear();
    for (const k in vHeld) vHeld[k] = 0;
    for (const fn of clearHooks) fn();
    for (const k in held) held[k] = false;
    for (const k in pressed) delete pressed[k];
  }
  function take(act) {
    if (pressed[act]) { delete pressed[act]; return true; }
    return false;
  }
  function flush() { for (const k in pressed) delete pressed[k]; }

  function init(cb) {
    listener = cb;
    window.addEventListener('keydown', onDown, { passive: false });
    window.addEventListener('keyup', onUp, { passive: false });
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  }

  // programmatic press (used by automated play-tests)
  function press(act) { pressed[act] = true; }

  SP.input = { init, held, take, flush, clear, press, virtual, onClear };
})();
