/* sie.v6.js — sie.market. No dependencies. */
(function(){
  // ---- intro: slam once per visit, then reveal the site. Tap to skip.
  var intro=document.getElementById('intro');
  if(intro){
    var seen=false; try{ seen=sessionStorage.getItem('sie-intro')==='1'; }catch(e){}
    var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var done=false;
    function finish(){ if(done) return; done=true; try{ sessionStorage.setItem('sie-intro','1'); }catch(e){}
      intro.classList.add('out'); document.body.classList.remove('intro');
      setTimeout(function(){ if(intro.parentNode) intro.parentNode.removeChild(intro); },600); }
    if(seen||reduce){ intro.parentNode.removeChild(intro); }
    else{
      document.body.classList.add('intro');
      var v=intro.querySelector('video'), im=intro.querySelector('img');
      intro.addEventListener('click',finish);
      function still(){ v.hidden=true; im.hidden=false; setTimeout(finish,1400); }
      v.addEventListener('ended',finish); v.addEventListener('error',still);
      var p=v.play(); if(p&&p.catch){ p.catch(still); }
      setTimeout(finish,4000);                                       /* safety net */
    }
  }

  // ---- routing: #sie shows the videos/links page, anything else shows the cd
  var home=document.getElementById('home'), sie=document.getElementById('sie');
  function route(){ var s=location.hash==='#sie'; home.hidden=s; sie.hidden=!s; window.scrollTo(0,0); }
  window.addEventListener('hashchange',route); route();

  // ---- gallery: dots, caption-free, keyboard arrows on desktop
  var gal=document.getElementById('gal'), n=gal.children.length, dots=document.getElementById('dots');
  function go(i){ gal.scrollTo({left:i*gal.clientWidth,behavior:'smooth'}); }
  for(var i=0;i<n;i++){ (function(i){ var b=document.createElement('button'); b.type='button';
    b.setAttribute('aria-label','view '+(i+1)); b.addEventListener('click',function(){ go(i); }); dots.appendChild(b); })(i); }
  /* clientWidth is 0 while #home is display:none (landing straight on #sie), and
     scrollLeft/0 is NaN -> gal.children[NaN] is undefined. Guard, or the whole IIFE throws
     here and every listener below this line never attaches. */
  function index(){ var w=gal.clientWidth; if(!w) return 0;
    return Math.max(0,Math.min(n-1,Math.round(gal.scrollLeft/w))); }
  var capT=document.getElementById('cap-title'), capC=document.getElementById('cap-copy'), lastIdx=-1;
  function caption(i){
    var s=gal.children[i], t=s.getAttribute('data-title')||'', c=s.getAttribute('data-copy')||'';
    capC.classList.add('fade');
    setTimeout(function(){ capT.textContent=t; capT.hidden=!t; capC.textContent=c; var al=s.getAttribute('data-align'); if(al) capC.setAttribute('data-align',al); else capC.removeAttribute('data-align'); capC.classList.remove('fade'); },250);
  }
  function sync(){ var i=index(); [].forEach.call(dots.children,function(d,j){ d.setAttribute('aria-current', j===i?'true':'false'); });
    if(i!==lastIdx){ lastIdx=i; caption(i); } }
  gal.addEventListener('scroll',function(){ requestAnimationFrame(sync); },{passive:true});
  capT.textContent=gal.children[0].getAttribute('data-title')||''; capT.hidden=!capT.textContent; capC.textContent=gal.children[0].getAttribute('data-copy')||''; lastIdx=0; sync();
  document.addEventListener('keydown',function(e){ if(home.hidden) return;
    if(e.key==='ArrowRight') go(Math.min(n-1,index()+1)); if(e.key==='ArrowLeft') go(Math.max(0,index()-1)); });

  // ---- disc: turns on its own; drag scrubs it; release resumes from where you left it
  var disc=document.getElementById('disc');
  if(disc){
    var dragging=false, angle=0, lastX=0, PERIOD=12, reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function current(){ var t=getComputedStyle(disc).transform; if(!t||t==='none') return 0;
      var m=t.match(/matrix\(([^)]+)\)/); if(!m) return 0; var p=m[1].split(',').map(Number); return Math.atan2(p[1],p[0])*180/Math.PI; }
    disc.addEventListener('pointerdown',function(e){ dragging=true; angle=current(); lastX=e.clientX;
      disc.style.animation='none'; disc.style.transform='rotate('+angle+'deg)'; disc.setPointerCapture(e.pointerId); e.preventDefault(); });
    disc.addEventListener('pointermove',function(e){ if(!dragging) return; angle+=(e.clientX-lastX)*0.7; lastX=e.clientX; disc.style.transform='rotate('+angle+'deg)'; });
    function release(){ if(!dragging) return; dragging=false; if(reduce) return;
      var norm=((angle%360)+360)%360; disc.style.transform=''; disc.style.animation=''; void disc.offsetWidth; disc.style.animationDelay='-'+(norm/360*PERIOD)+'s'; }
    disc.addEventListener('pointerup',release); disc.addEventListener('pointercancel',release);
  }

  // ---- the wall: thumbnails at rest, exactly one player alive at any moment.
  //      fine pointer  -> hover previews muted after a beat; click pins it and unmutes.
  //      coarse pointer-> tap plays with sound. Either way the previous player is destroyed first,
  //      so the page never holds more than one YouTube iframe.
  var tiles=[].slice.call(document.querySelectorAll('.vid[data-yt]'));
  if(tiles.length){
    var live=null, hoverTimer=null;
    var fine=window.matchMedia('(hover:hover) and (pointer:fine)').matches;

    function kill(){
      if(!live) return;
      var f=live.querySelector('iframe'); if(f&&f.parentNode) f.parentNode.removeChild(f);
      live.classList.remove('playing'); live.classList.remove('held'); live=null;
    }
    function play(el,muted){
      if(live===el) return;
      kill();
      var box=el.querySelector('.vid-thumb'); if(!box) return;
      var f=document.createElement('iframe');
      f.src='https://www.youtube-nocookie.com/embed/'+el.getAttribute('data-yt')+
            '?autoplay=1&mute='+(muted?1:0)+'&rel=0&modestbranding=1&playsinline=1';
      f.allow='autoplay; encrypted-media; picture-in-picture';
      f.allowFullscreen=true;
      f.loading='lazy';
      f.title=el.getAttribute('aria-label')||'video';
      box.appendChild(f);
      el.classList.add('playing'); live=el;
    }

    tiles.forEach(function(el){
      if(fine){
        el.addEventListener('mouseenter',function(){
          clearTimeout(hoverTimer);
          hoverTimer=setTimeout(function(){ play(el,true); },180);   /* ignore a pass-through */
        });
        el.addEventListener('mouseleave',function(){
          clearTimeout(hoverTimer);
          if(live===el && !el.classList.contains('held')) kill();    /* a pinned tile keeps going */
        });
      }
      el.addEventListener('click',function(e){
        if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;  /* let new-tab through */
        e.preventDefault();
        clearTimeout(hoverTimer);
        if(live===el && el.classList.contains('held')){ kill(); return; }     /* second tap stops it */
        play(el,false); el.classList.add('held');
      });
    });

    document.addEventListener('keydown',function(e){ if(e.key==='Escape') kill(); });
    window.addEventListener('hashchange',kill);                      /* leaving /sie stops playback */
  }
})();
