(() => {
 'use strict';
 const hero = document.querySelector('.hero');
 const title = document.getElementById('hero-title');
 if (!hero || !title) return;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const fine = matchMedia('(pointer: fine)');
 let pointerX = innerWidth / 2, pointerY = innerHeight / 2;
 let inside = false, visible = true, x = 0, y = 0;
 let frame = 0, last = 0, settleUntil = 0;
 const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
 const enabled = () => !reduced.matches && fine.matches;
 function wake() {
  if (!frame && visible && !document.hidden && enabled()) {
   last = performance.now();
   frame = requestAnimationFrame(tick);
  }
 }
 function tick(now) {
  frame = 0;
  const dt = Math.min(48, Math.max(1, now - last));
  last = now;
  // Only the rows move, so this parent measurement cannot feed back on itself.
  const rect = title.getBoundingClientRect();
  const tx = inside ? clamp((rect.left + rect.width / 2 - pointerX) / (innerWidth / 2) * 7, 9) : 0;
  const ty = inside ? clamp((rect.top + rect.height / 2 - pointerY) / (innerHeight / 2) * 5, 6) : 0;
  const ease = 1 - Math.exp(-dt / 180);
  x += (tx - x) * ease;
  y += (ty - y) * ease;
  const moving = Math.abs(tx - x) + Math.abs(ty - y) > .015;
  if (!moving) { x = tx; y = ty; }
  title.style.setProperty('--light-x', `${x.toFixed(3)}px`);
  title.style.setProperty('--light-y', `${y.toFixed(3)}px`);
  if (moving || now < settleUntil) frame = requestAnimationFrame(tick);
 }
 hero.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch') return;
  pointerX = event.clientX; pointerY = event.clientY;
  inside = true; wake();
 }, {passive:true});
 hero.addEventListener('pointerleave', () => { inside = false; wake(); });
 hero.addEventListener('pointercancel', () => { inside = false; wake(); });
 addEventListener('blur', () => { inside = false; wake(); });
 addEventListener('scroll', () => { settleUntil = performance.now() + 500; wake(); }, {passive:true});
 addEventListener('resize', wake, {passive:true});
 function reset() {
  cancelAnimationFrame(frame); frame = 0;
  x = y = 0;
  title.style.removeProperty('--light-x'); title.style.removeProperty('--light-y');
  wake();
 }
 new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting;
  if (visible) wake();
  else { cancelAnimationFrame(frame); frame = 0; }
 }).observe(hero);
 reduced.addEventListener('change', reset);
 fine.addEventListener('change', reset);
 document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
  else wake();
 });
 addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
 addEventListener('pageshow', reset);
})();
