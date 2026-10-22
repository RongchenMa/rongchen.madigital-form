(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const links=[...document.querySelectorAll('header nav a')];
 function activate(link,kind='page') {
  links.forEach(item=>{if(item!==link)item.removeAttribute('aria-current');});
  link.setAttribute('aria-current',kind);
 }
 const selected=links.find(link=>link.hasAttribute('aria-current'));
 if(selected&&!reduced.matches)selected.animate([{fontWeight:500,webkitTextStrokeWidth:'0px'},{fontWeight:1000,webkitTextStrokeWidth:'.9px'}],{duration:420,easing:'ease-out'});
 links.forEach(link=>link.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const url=new URL(link.href,location.href);
  activate(link,url.hash?'location':'page');
 }));
 function syncHash(){const found=links.find(link=>new URL(link.href,location.href).hash===location.hash&&location.hash);if(found)activate(found,'location');}
 addEventListener('hashchange',syncHash);syncHash();
})();
