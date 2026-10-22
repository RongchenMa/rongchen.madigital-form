(() => {
 'use strict';
 const data = window.SHADOW_BOOK;
 const book = document.querySelector('.flat-book');
 if (!book || !data) return;
 const narrow = matchMedia('(max-width: 640px)');
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const spread = book.querySelector('.book-spread');
 const papers = [...spread.querySelectorAll('.paper-page')];
 const previous = [...document.querySelectorAll('.hit-previous,.previous-page')];
 const next = [...document.querySelectorAll('.hit-next,.next-page')];
 const editions = [...document.querySelectorAll('[data-edition]')];
 const status = document.querySelector('.page-status');
 const error = document.querySelector('.reader-error');
 const loader = book.querySelector('.book-loader');
 const fine = matchMedia('(pointer: fine)');
 const ringCursor = document.createElement('div');ringCursor.className='book-ring-pointer';ringCursor.innerHTML='<span class="book-ring"></span>';ringCursor.setAttribute('aria-hidden','true');ringCursor.hidden=true;document.body.append(ringCursor);
 let loading=false, pointerInside=false;
 function syncLoading(){loader.hidden=!(loading&&(!pointerInside||!fine.matches));ringCursor.hidden=!(busy&&pointerInside&&fine.matches);book.classList.toggle('is-busy',busy);}
 book.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;pointerInside=true;ringCursor.style.transform=`translate3d(${event.clientX-14}px,${event.clientY-14}px,0)`;syncLoading();},{passive:true});
 book.addEventListener('pointerleave',()=>{pointerInside=false;syncLoading();});
 fine.addEventListener('change',syncLoading);
 let edition = 'pages', step = 0, mobile = narrow.matches, busy = false;
 let animations = [];
 const count = () => data[edition].length;
 const last = () => mobile ? count() - 1 : Math.ceil((count() - 1) / 2);
 const indices = (value = step, single = mobile) => single ? [-1, value] : value === 0 ? [-1, 0] : [value * 2 - 1, value * 2];
 const pad = n => String(n).padStart(2, '0');
 function syncControls() {
  previous.forEach(button => { button.disabled = busy || step === 0; button.setAttribute('aria-disabled', String(busy || step === 0)); });
  next.forEach(button => { button.disabled = busy || step === last(); button.setAttribute('aria-disabled', String(busy || step === last())); });
  editions.forEach(button => {
   button.disabled = busy;button.setAttribute('aria-disabled', String(busy));
   button.setAttribute('aria-pressed', String(button.dataset.edition === edition));
  });
  book.setAttribute('aria-busy', String(busy));syncLoading();
 }
 function paint() {
  const visible = [];
  indices().forEach((index, side) => {
   const item = data[edition][index];
   const img = papers[side].querySelector('img');
   papers[side].classList.toggle('is-empty', !item);
   img.hidden = !item;
   if (item) {
    img.src = item.src; img.alt = item.alt; img.width = item.width; img.height = item.height;
    visible.push(index + 1);
   } else { img.removeAttribute('src'); img.alt = ''; }
  });
  book.classList.toggle('is-cover', !mobile && step === 0);
  const range = visible.length > 1 ? `${pad(visible[0])}–${pad(visible[1])}` : pad(visible[0]);
  status.textContent = `${edition === 'layers' ? 'Colour layers · ' : ''}${range} / ${pad(count())}`;
  syncControls();
 }
 async function preload(value, key = edition, single = mobile) {
  await Promise.all(indices(value, single).map(async index => {
   const item = data[key][index];
   if (!item) return;
   const img = new Image(); img.src = item.src;
   await img.decode();
  }));
 }
 function warmAdjacent() {
  if (step < last()) preload(step + 1).catch(() => {});
  if (step > 0) preload(step - 1).catch(() => {});
 }
 async function turn(direction, newEdition) {
  if (busy) return;
  const targetEdition = newEdition || edition;
  const target = newEdition ? 0 : Math.max(0, Math.min(last(), step + direction));
  if (target === step && targetEdition === edition) return;
  busy = true; loading = true; error.hidden = true; syncControls();
  let old, shade;
  try {
   await preload(target, targetEdition);
   loading=false;syncLoading();
   old = spread.cloneNode(true);
   old.classList.add('turn-layer'); old.setAttribute('aria-hidden', 'true');
   // Readers encounter the current spread only; the temporary old sheet is decorative.
   old.querySelectorAll('img').forEach(img => { img.alt = ''; });
   const forward = newEdition ? true : direction > 0;
   edition = targetEdition; step = target;
   paint();
   if (!reduced.matches && typeof book.animate === 'function') {
    book.append(old);
    shade = document.createElement('div'); shade.className = 'turn-shadow'; shade.setAttribute('aria-hidden', 'true'); book.append(shade);
    book.classList.add('is-turning');
    const timing = {duration:780, easing:'cubic-bezier(.25,.65,.2,1)', fill:'forwards'};
    const paperAnimation = old.animate([
     {clipPath:'inset(0 0 0 0)'},
     {clipPath:forward ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)'}
    ], timing);
    const shadowAnimation = shade.animate([
     {transform:`translateX(${forward ? 1050 : 0}%)`, opacity:0, offset:0},
     {opacity:.9, offset:.16},
     {opacity:.65, offset:.8},
     {transform:`translateX(${forward ? 0 : 1050}%)`, opacity:0, offset:1}
    ], timing);
    animations = [paperAnimation, shadowAnimation];
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
   }
  } catch {
   error.hidden = false;
  } finally {
   animations.forEach(animation => animation.cancel()); animations = [];
   old?.remove(); shade?.remove(); book.classList.remove('is-turning');
   busy = false;loading=false;
   // Resolve responsive changes after the current sheet finishes.
   if (mobile !== narrow.matches) updateLayout();
   syncControls(); warmAdjacent();
  }
 }
 function updateLayout() {
  if (busy) { animations.forEach(animation => animation.finish()); return; }
  const current = indices().filter(index => index >= 0 && index < count());
  const page = mobile ? step : current[0];
  mobile = narrow.matches;
  step = mobile ? page : Math.ceil(page / 2);
  paint(); warmAdjacent();
 }
 previous.forEach(button => button.addEventListener('click', () => turn(-1)));
 next.forEach(button => button.addEventListener('click', () => turn(1)));
 editions.forEach(button => button.addEventListener('click', () => turn(1, button.dataset.edition)));
 document.querySelector('.book-reader').addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  if (event.target.matches('input,textarea,select')) return;
  event.preventDefault();
  if (event.key === 'Home') turn(-step);
  else if (event.key === 'End') turn(last() - step);
  else turn(event.key === 'ArrowRight' ? 1 : -1);
 });
 narrow.addEventListener('change', updateLayout);
 reduced.addEventListener('change', () => { if (reduced.matches) animations.forEach(animation => animation.finish()); });
 paint(); warmAdjacent();
})();
