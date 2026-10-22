(() => {
 'use strict';
 // A fresh browsing session starts pink, even if an older visit was saved locally.
 const key='shadow-chapters-session-visited';
 let visited=false;
 const colors={pink:'#e5006e',green:'#313f2e',hoverPink:'#c06b8d'};
 function seen(){try{return sessionStorage.getItem(key)==='1';}catch{return visited;}}
 function mark(){visited=true;try{sessionStorage.setItem(key,'1');}catch{}}
 function nextTone(explicitGreen=false){return explicitGreen?'green':!seen()?'pink':Math.random()<.5?'green':'pink';}
 window.SHADOW_PALETTE={colors,nextTone};
 if(!/\/chapters(?:-green)?\.html$/.test(location.pathname))return;
 const explicitGreen=location.pathname.endsWith('/chapters-green.html');
 let pending;try{pending=sessionStorage.getItem('shadow-next-chapters-tone');sessionStorage.removeItem('shadow-next-chapters-tone');}catch{}
 const tone=explicitGreen?'green':!seen()?'pink':['pink','green'].includes(pending)?pending:nextTone();
 function applyTone(value){
  document.documentElement.dataset.chapterTone=value;
  document.documentElement.style.setProperty('--rose',colors[value]);
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=colors[value];
 }
 applyTone(tone);
 document.addEventListener('DOMContentLoaded',()=>{
  const control=document.querySelector('.site-header nav a[aria-current="page"]');
  if(!control)return;
  control.setAttribute('aria-description','Switch the background between pink and green.');
  control.addEventListener('click',event=>{
   if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   event.preventDefault();
   applyTone(document.documentElement.dataset.chapterTone==='pink'?'green':'pink');
  });
 },{once:true});
 if(!explicitGreen)mark();
})();
