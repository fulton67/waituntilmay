/* sie.v1.js — sie.market. No dependencies. */
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
      var isSafari=/^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
      var canAlpha=!isSafari && v.canPlayType('video/webm; codecs="vp9"');
      intro.addEventListener('click',finish);
      if(canAlpha){
        v.hidden=false; v.addEventListener('ended',finish); v.addEventListener('error',function(){ v.hidden=true; im.hidden=false; setTimeout(finish,1400); });
        var p=v.play(); if(p&&p.catch){ p.catch(function(){ v.hidden=true; im.hidden=false; setTimeout(finish,1400); }); }
        setTimeout(finish,4000);                                   /* safety net */
      } else { im.hidden=false; setTimeout(finish,1400); }
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
  function index(){ return Math.max(0,Math.min(n-1,Math.round(gal.scrollLeft/gal.clientWidth))); }
  function sync(){ var i=index(); [].forEach.call(dots.children,function(d,j){ d.setAttribute('aria-current', j===i?'true':'false'); }); }
  gal.addEventListener('scroll',function(){ requestAnimationFrame(sync); },{passive:true}); sync();
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

  // ---- videos: facades. data-yt="<id>"; on tap swap in a privacy-enhanced embed. thumbnails (data-thumb) are optional local files.
  [].forEach.call(document.querySelectorAll('.vid[data-yt]'),function(el){
    var id=el.getAttribute('data-yt'), thumb=el.getAttribute('data-thumb');
    if(thumb){ var im=document.createElement('img'); im.src=thumb; im.alt=''; im.loading='lazy'; el.insertBefore(im, el.firstChild); }
    el.addEventListener('click',function(e){
      if(el.getAttribute('data-embed')!=='true'){ return; }              /* embeds off: the link just opens youtube */
      e.preventDefault(); if(el.querySelector('iframe')) return;
      var f=document.createElement('iframe');
      f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&modestbranding=1';
      f.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'; f.allowFullscreen=true; f.title=el.getAttribute('aria-label')||'video';
      el.appendChild(f);
    });
  });
})();
