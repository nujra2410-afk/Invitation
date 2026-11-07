/* =========================================================
   Valentine Movie Date Invitation – vanilla JS, no libraries
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Editable settings ---------- */
  const MOVIE = 'Ramayan movie';
  const FOOD_PHRASES = {                       // how each food reads in the final message
    Burger: 'sharing a delicious burger together',
    Pizza:  'sharing a delicious pizza together',
    KFC:    'enjoying some KFC together'
  };
  const TAUNTS = ['Nope! 😜', 'Too slow! 💨', "Can't catch me! 🙈", 'Try again 😘', 'Missed! 💕', 'Hehe 🏃'];

  /* ---------- State (selected values live here) ---------- */
  const state = { timing: null, food: null };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const rand = (min, max) => Math.random() * (max - min) + min;

  /* =========================================================
     1. Screen transitions
     ========================================================= */
  let activeId = 'screen1';
  let busy = false;

  function showScreen(id) {
    if (busy) return;
    busy = true;
    $('.screen.active')?.classList.remove('active');
    activeId = null;                            // disables escape logic during the fade
    setTimeout(() => {
      $('#' + id).classList.add('active');
      activeId = id;
      busy = false;
      if (id === 'screen4') celebrate();
    }, 450);
  }

  /* =========================================================
     2. Escaping buttons (mouse + touch + keyboard)
     ========================================================= */
  const escapers = [];
  const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  let tauntTimer;

  function distToRect(x, y, r) {
    const dx = Math.max(r.left - x, 0, x - r.right);
    const dy = Math.max(r.top - y, 0, y - r.bottom);
    return Math.hypot(dx, dy);
  }
  const overlaps = (a, b, pad) =>
    !(a.right + pad < b.left || a.left - pad > b.right || a.bottom + pad < b.top || a.top - pad > b.bottom);

  function showTaunt() {
    const el = $('#taunt');
    el.textContent = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
    el.classList.add('show');
    clearTimeout(tauntTimer);
    tauntTimer = setTimeout(() => el.classList.remove('show'), 1100);
  }

  function makeEscaper(btn) {
    const slot = btn.parentElement;
    const screen = btn.closest('.screen');
    const e = { btn, screen, fled: false };

    // Switch from normal layout to position:fixed, keeping a placeholder slot
    function lift() {
      if (e.fled) return;
      const r = btn.getBoundingClientRect();
      slot.style.width = r.width + 'px';
      slot.style.height = r.height + 'px';
      btn.style.left = r.left + 'px';
      btn.style.top = r.top + 'px';
      btn.classList.add('fled');
      e.fled = true;
      void btn.offsetWidth;                     // force reflow so the move animates
    }

    // Jump to a random spot: inside the viewport, away from the pointer,
    // and never overlapping any other button on the same screen.
    e.escape = (px = pointer.x, py = pointer.y, silent = false) => {
      lift();
      const vw = innerWidth, vh = innerHeight, m = 12;
      const w = btn.offsetWidth, h = btn.offsetHeight;
      const maxX = Math.max(m, vw - w - m), maxY = Math.max(m, vh - h - m);
      const avoid = $$('button', screen).filter(b => b !== btn).map(b => b.getBoundingClientRect());
      const title = $('.title', screen).getBoundingClientRect();
      const minDist = Math.min(240, Math.min(vw, vh) * 0.45);

      let best = null, bestD = -1;
      for (let pass = 0; pass < 2 && !best?.ok; pass++) {   // pass 0 also avoids the title; pass 1 relaxes that
        for (let i = 0; i < 60; i++) {
          const x = rand(m, maxX), y = rand(m, maxY);
          const box = { left: x, top: y, right: x + w, bottom: y + h };
          if (avoid.some(r => overlaps(box, r, 18))) continue;
          if (pass === 0 && overlaps(box, title, 6)) continue;
          const d = Math.hypot(x + w / 2 - px, y + h / 2 - py);
          if (d > bestD) { bestD = d; best = { x, y, ok: d >= minDist }; }
          if (d >= minDist) break;
        }
      }
      if (!best) best = { x: m, y: m };          // extreme fallback (tiny viewport)
      btn.style.left = best.x + 'px';
      btn.style.top = best.y + 'px';
      if (!silent) showTaunt();
    };

    // Everything that could "activate" the button just makes it run away.
    const flee = ev => {
      const t = ev.touches?.[0] || ev;
      if (ev.cancelable) ev.preventDefault();
      ev.stopPropagation();
      e.escape(t.clientX ?? pointer.x, t.clientY ?? pointer.y);
    };
    btn.addEventListener('pointerenter', flee);
    btn.addEventListener('pointerdown', flee);
    btn.addEventListener('mousedown', flee);
    btn.addEventListener('touchstart', flee, { passive: false });  // beats the 300ms click on phones
    btn.addEventListener('touchend', ev => ev.preventDefault(), { passive: false }); // blocks the synthetic click
    btn.addEventListener('click', flee);                           // also catches Enter/Space
    btn.addEventListener('focus', () => { btn.blur(); e.escape(); });
    btn.addEventListener('contextmenu', ev => ev.preventDefault());

    escapers.push(e);
  }

  $$('.escape').forEach(makeEscaper);

  // Proximity detection: run away before the cursor/finger even arrives
  document.addEventListener('pointermove', ev => {
    pointer.x = ev.clientX; pointer.y = ev.clientY;
    if (!activeId) return;
    const reach = ev.pointerType === 'touch' ? 50 : 90;
    escapers.forEach(e => {
      if (e.screen.id === activeId && distToRect(ev.clientX, ev.clientY, e.btn.getBoundingClientRect()) < reach) {
        e.escape(ev.clientX, ev.clientY);
      }
    });
  });
  // Fat-finger protection: a touch landing *near* an escaper also scares it away
  document.addEventListener('touchstart', ev => {
    if (!activeId) return;
    const t = ev.touches[0];
    pointer.x = t.clientX; pointer.y = t.clientY;
    escapers.forEach(e => {
      if (e.screen.id === activeId && distToRect(t.clientX, t.clientY, e.btn.getBoundingClientRect()) < 40) {
        e.escape(t.clientX, t.clientY);
      }
    });
  }, { passive: true });

  // Keep fled buttons on-screen after resize / rotation
  addEventListener('resize', () => escapers.forEach(e => e.fled && e.escape(innerWidth / 2, innerHeight / 2, true)));

  /* =========================================================
     3. Screen logic
     ========================================================= */
  // Screen 1: only YES proceeds
  $('#yesBtn').addEventListener('click', () => showScreen('screen2'));

  // Screen 2: only AFTERNOON proceeds (Morning/Evening are escapers)
  $('#afternoonBtn').addEventListener('click', () => {
    state.timing = 'Afternoon';
    showScreen('screen3');
  });

  // Screen 3: any food works
  $$('.food').forEach(btn => btn.addEventListener('click', () => {
    state.food = btn.dataset.food;
    btn.classList.add('selected');
    $('.foods').classList.add('locked');
    burstAt(btn, 10);
    setTimeout(() => { renderFinal(); showScreen('screen4'); }, 800);
  }));

  // Screen 4: build the message from stored choices
  function renderFinal() {
    const when = (state.timing || 'Afternoon').toLowerCase();
    const foodText = FOOD_PHRASES[state.food] || `enjoying some ${state.food} together`;
    $('#finalMain').innerHTML =
      `You and me, watching the ${MOVIE} together in the <span class="hl">${when}</span>, ` +
      `and <span class="hl">${foodText}</span>. 💕`;
  }

  /* =========================================================
     4. Decorations & celebration
     ========================================================= */
  function buildBackground() {
    const layer = $('#bgLayer');
    const hearts = ['❤️', '💗', '💕', '💖', '🩷'];
    for (let i = 0; i < 24; i++) {
      const h = document.createElement('span');
      h.className = 'heart';
      h.textContent = hearts[i % hearts.length];
      h.style.cssText = `left:${rand(0, 100)}%;font-size:${rand(14, 38)}px;` +
        `animation-duration:${rand(9, 18)}s;animation-delay:${rand(-18, 0)}s;--sway:${rand(-40, 40)}px`;
      layer.appendChild(h);
    }
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle';
      s.textContent = '✦';
      s.style.cssText = `left:${rand(0, 100)}%;top:${rand(0, 100)}%;font-size:${rand(10, 22)}px;` +
        `animation-duration:${rand(2, 5)}s;animation-delay:${rand(0, 4)}s`;
      layer.appendChild(s);
    }
  }

  function burstAt(el, count, cx, cy) {
    const fx = $('#fxLayer'), r = el?.getBoundingClientRect();
    const items = ['💖', '💕', '🌹', '✨', '💗'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      const a = rand(0, Math.PI * 2), d = rand(80, 260);
      p.className = 'burst';
      p.textContent = items[i % items.length];
      p.style.cssText = `left:${cx ?? r.left + r.width / 2}px;top:${cy ?? r.top + r.height / 2}px;` +
        `font-size:${rand(16, 34)}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--rot:${rand(-200, 200)}deg`;
      fx.appendChild(p);
      setTimeout(() => p.remove(), 2500);
    }
  }

  // Final-screen celebration: big burst + a gentle shower of petals
  function celebrate() {
    burstAt(null, 50, innerWidth / 2, innerHeight * 0.45);
    let n = 0;
    const rain = setInterval(() => {
      const p = document.createElement('span');
      p.className = 'petal';
      p.textContent = ['🌹', '💖', '🌸', '✨'][n % 4];
      p.style.cssText = `left:${rand(0, 100)}%;font-size:${rand(16, 30)}px;` +
        `animation-duration:${rand(3.5, 6)}s;--sway:${rand(-60, 60)}px`;
      $('#fxLayer').appendChild(p);
      setTimeout(() => p.remove(), 6500);
      if (++n > 30) clearInterval(rain);
    }, 200);
  }

  buildBackground();
})();