/* sie.v9.js — sie.market. No dependencies.
   v8 adds: the home title choreography (§1), the large in-place video player (§2),
   and the index-language corner nav. Every block tolerates its elements being absent,
   because Webflow serves one page per route while the local build ships both in one
   document. */
(function(){
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mark = function(n){ try{ performance.mark(n); }catch(e){} };

  // ---- intro: slam once per visit, then reveal the site. Tap to skip.
  var intro=document.getElementById('intro');
  var introDone = Promise.resolve();
  if(intro){
    var seen=false; try{ seen=sessionStorage.getItem('sie-intro')==='1'; }catch(e){}
    var done=false, resolveIntro;
    introDone = new Promise(function(r){ resolveIntro=r; });
    function finish(){ if(done) return; done=true; try{ sessionStorage.setItem('sie-intro','1'); }catch(e){}
      intro.classList.add('out'); document.body.classList.remove('intro');
      setTimeout(function(){ if(intro.parentNode) intro.parentNode.removeChild(intro); resolveIntro(); },600); }
    if(seen||REDUCE){ intro.parentNode.removeChild(intro); resolveIntro(); }
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

  // ---- routing: only the single-file local build ships both pages in one document.
  //      On Webflow each page is a real route, so #home/#sie are absent.
  var home=document.getElementById('home'), sie=document.getElementById('sie');
  if(home&&sie){
    var route=function(){ var s=location.hash==='#sie'; home.hidden=s; sie.hidden=!s; window.scrollTo(0,0); };
    window.addEventListener('hashchange',route); route();
  }

  /* =====================================================================
     §1  HOME CHOREOGRAPHY — once per session, after the intro.
     t0      title in word by word, 2.4x base, centred    (90ms stagger, 220ms each)
     t+900   hold
     t+1500  title scales to body size and settles into place (600ms)
             gallery fades in above it, simultaneously       (600ms)
     Total 2100ms. The buy control is visible from the first frame and never animates.
     Reduced motion, or a session that has already seen it: static final state.
     ===================================================================== */
  var titleEl = document.getElementById('title');
  var stageEl = document.querySelector('.stage');

  function playSequence(){
    if(!titleEl || !stageEl) return;
    var already=false; try{ already=sessionStorage.getItem('sie-seq')==='1'; }catch(e){}
    if(already || REDUCE){ document.body.classList.add('seq-done'); return; }
    try{ sessionStorage.setItem('sie-seq','1'); }catch(e){}

    // split into words, each its own span so they can stagger
    var words = (titleEl.textContent||'').trim().split(/\s+/);
    titleEl.textContent='';
    words.forEach(function(w,i){
      var s=document.createElement('span');
      s.className='w'; s.textContent=w;
      s.style.transitionDelay=(i*90)+'ms';
      titleEl.appendChild(s);
      if(i<words.length-1) titleEl.appendChild(document.createTextNode(' '));
    });

    document.body.classList.add('seq');          /* gallery held at 0, title at 2.4em */

    // The size change is font-size, not scale — scaling text up and back down
    // resamples it and it lands soft. So measure AFTER .seq has applied the 2.4em,
    // and move it with translateY only: .product is centred, so x is already right.
    // The gallery keeps its box (opacity only), so the resting slot is already final
    // and there is no layout shift to correct for.
    var r = titleEl.getBoundingClientRect();
    var dy = (window.innerHeight/2) - (r.top + r.height/2);
    titleEl.style.transition='none';
    titleEl.style.transform='translateY('+dy.toFixed(1)+'px)';
    void titleEl.offsetWidth;                    /* commit before transitioning back */

    mark('sie:seq:start');
    requestAnimationFrame(function(){
      titleEl.classList.add('in');               /* words fade+rise, staggered */
    });

    var wordsDone = (words.length-1)*90 + 220;
    setTimeout(function(){ mark('sie:seq:words-done'); }, wordsDone);
    setTimeout(function(){ mark('sie:seq:hold'); }, 900);

    setTimeout(function(){
      mark('sie:seq:settle-start');
      /* one inline transition covering both: an inline `transition` would otherwise
         override the stylesheet's, and the font-size would snap instead of easing. */
      titleEl.style.transition='transform 600ms cubic-bezier(.2,.8,.2,1),'+
                               'font-size 600ms cubic-bezier(.2,.8,.2,1)';
      titleEl.style.transform='none';
      document.body.classList.add('seq-settling');   /* gallery fades in, 600ms */
      setTimeout(function(){
        mark('sie:seq:settle-end');
        document.body.classList.remove('seq','seq-settling');
        document.body.classList.add('seq-done');
        titleEl.style.transition=''; titleEl.style.transform='';
        try{ performance.measure('sie:seq:total','sie:seq:start','sie:seq:settle-end'); }catch(e){}
      },600);
    },1500);
  }
  if(titleEl && stageEl){ introDone.then(function(){ setTimeout(playSequence,40); }); }

  // ---- gallery: dots + per-slide caption line
  var gal=document.getElementById('gal'), dots=document.getElementById('dots');
  if(gal&&dots){
  var n=gal.children.length;
  function go(i){ gal.scrollTo({left:i*gal.clientWidth,behavior:'smooth'}); }
  for(var i=0;i<n;i++){ (function(i){ var b=document.createElement('button'); b.type='button';
    b.setAttribute('aria-label','view '+(i+1)); b.addEventListener('click',function(){ go(i); }); dots.appendChild(b); })(i); }
  /* clientWidth is 0 while #home is display:none (landing straight on #sie), and
     scrollLeft/0 is NaN -> gal.children[NaN] is undefined. Guard, or the whole IIFE
     throws here and every listener below this line never attaches. */
  function index(){ var w=gal.clientWidth; if(!w) return 0;
    return Math.max(0,Math.min(n-1,Math.round(gal.scrollLeft/w))); }
  var cap=document.getElementById('cap'), lastIdx=-1;
  function caption(i){
    var s=gal.children[i], c=s.getAttribute('data-copy')||'';
    if(!cap) return;
    cap.classList.add('fade');
    setTimeout(function(){ cap.textContent=c; cap.classList.remove('fade'); },250);
  }
  function sync(){ var i=index(); [].forEach.call(dots.children,function(d,j){ d.setAttribute('aria-current', j===i?'true':'false'); });
    if(i!==lastIdx){ lastIdx=i; caption(i); } }
  gal.addEventListener('scroll',function(){ requestAnimationFrame(sync); },{passive:true});
  if(cap) cap.textContent=gal.children[0].getAttribute('data-copy')||'';
  lastIdx=0; sync();
  document.addEventListener('keydown',function(e){ if(home&&home.hidden) return;
    if(e.key==='ArrowRight') go(Math.min(n-1,index()+1)); if(e.key==='ArrowLeft') go(Math.max(0,index()-1)); });
  }

  // ---- disc: turns on its own; drag scrubs it; release resumes from where you left it
  var disc=document.getElementById('disc');
  if(disc){
    var dragging=false, angle=0, lastX=0, PERIOD=12;
    function current(){ var t=getComputedStyle(disc).transform; if(!t||t==='none') return 0;
      var m=t.match(/matrix\(([^)]+)\)/); if(!m) return 0; var p=m[1].split(',').map(Number); return Math.atan2(p[1],p[0])*180/Math.PI; }
    disc.addEventListener('pointerdown',function(e){ dragging=true; angle=current(); lastX=e.clientX;
      disc.style.animation='none'; disc.style.transform='rotate('+angle+'deg)'; disc.setPointerCapture(e.pointerId); e.preventDefault(); });
    disc.addEventListener('pointermove',function(e){ if(!dragging) return; angle+=(e.clientX-lastX)*0.7; lastX=e.clientX; disc.style.transform='rotate('+angle+'deg)'; });
    function release(){ if(!dragging) return; dragging=false; if(REDUCE) return;
      var norm=((angle%360)+360)%360; disc.style.transform=''; disc.style.animation=''; void disc.offsetWidth; disc.style.animationDelay='-'+(norm/360*PERIOD)+'s'; }
    disc.addEventListener('pointerup',release); disc.addEventListener('pointercancel',release);
  }

  // ---- details: the long paragraph lives behind a lowercase text toggle
  var dToggle=document.getElementById('details-toggle'), dBody=document.getElementById('details');
  if(dToggle&&dBody){
    dToggle.addEventListener('click',function(){
      var open=dBody.hasAttribute('hidden');
      if(open){ dBody.removeAttribute('hidden'); dBody.style.maxHeight='0px'; void dBody.offsetHeight;
                dBody.style.maxHeight=dBody.scrollHeight+'px'; }
      else{ dBody.style.maxHeight='0px';
            setTimeout(function(){ dBody.setAttribute('hidden',''); },250); }
      dToggle.setAttribute('aria-expanded', open?'true':'false');
      dToggle.textContent = open ? 'less' : 'details';
    });
  }

  /* =====================================================================
     §2  THE WALL AND THE LARGE PLAYER
     Tiles rest as poster thumbnails. A muted preview plays on hover (fine pointer)
     or while a tile is centred in view (coarse pointer, IntersectionObserver, at
     most 4 at once). Tapping a tile opens it large in a black overlay holding
     exactly ONE youtube-nocookie iframe, destroyed on close.
     ===================================================================== */
  var tiles=[].slice.call(document.querySelectorAll('.vid[data-yt]'));
  if(tiles.length){
    var FINE = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    var MAX_PREVIEW = 4;
    var previews = [];               /* tiles currently holding a muted preview */
    var hoverTimer = null;
    var overlay = null, overlayTile = null, pushed = false;

    function embed(id, muted){
      var f=document.createElement('iframe');
      f.src='https://www.youtube-nocookie.com/embed/'+id+
            '?autoplay=1&mute='+(muted?1:0)+'&rel=0&modestbranding=1&playsinline=1'+
            (muted?'&controls=0&loop=1&playlist='+id:'');
      f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen=true; f.loading='lazy';
      f.setAttribute('frameborder','0');
      return f;
    }

    // ---------- previews ----------
    function stopPreview(el){
      var f=el.querySelector('.vid-thumb iframe');
      if(f&&f.parentNode) f.parentNode.removeChild(f);
      el.classList.remove('previewing');
      var k=previews.indexOf(el); if(k>=0) previews.splice(k,1);
    }
    function stopAllPreviews(){ previews.slice().forEach(stopPreview); }
    function startPreview(el){
      if(overlay) return;                        /* the large player owns playback */
      if(el.classList.contains('previewing')) return;
      while(previews.length>=MAX_PREVIEW) stopPreview(previews[0]);
      var box=el.querySelector('.vid-thumb'); if(!box) return;
      var f=embed(el.getAttribute('data-yt'), true);
      f.setAttribute('tabindex','-1');
      f.title=(el.getAttribute('aria-label')||'video')+' (preview)';
      box.appendChild(f);
      el.classList.add('previewing'); previews.push(el);
    }

    if(FINE){
      tiles.forEach(function(el){
        el.addEventListener('mouseenter',function(){
          clearTimeout(hoverTimer);
          hoverTimer=setTimeout(function(){ stopAllPreviews(); startPreview(el); },180);
        });
        el.addEventListener('mouseleave',function(){
          clearTimeout(hoverTimer); stopPreview(el);
        });
      });
    } else if('IntersectionObserver' in window && !REDUCE){
      // coarse pointer: preview whatever is near the middle of the screen
      var io=new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting) startPreview(e.target);
          else stopPreview(e.target);
        });
      },{ root:null, rootMargin:'-35% 0px -35% 0px', threshold:0 });
      tiles.forEach(function(el){ io.observe(el); });
    }

    // ---------- the large player ----------
    function closePlayer(fromPop){
      if(!overlay) return;
      var f=overlay.querySelector('iframe'); if(f&&f.parentNode) f.parentNode.removeChild(f);
      if(document.fullscreenElement){ try{ document.exitFullscreen(); }catch(e){} }
      overlay.parentNode.removeChild(overlay);
      overlay=null; overlayTile=null;
      document.body.classList.remove('playing-large');
      if(pushed && !fromPop){ pushed=false; try{ history.back(); }catch(e){} }
      if(fromPop) pushed=false;
    }

    function openPlayer(el){
      stopAllPreviews();
      if(overlay) closePlayer(false);
      overlayTile=el;
      overlay=document.createElement('div');
      overlay.className='player';
      overlay.setAttribute('role','dialog');
      overlay.setAttribute('aria-modal','true');
      overlay.setAttribute('aria-label',el.getAttribute('aria-label')||'video');

      var close=document.createElement('button');
      close.type='button'; close.className='player-x';
      close.setAttribute('aria-label','close');
      /* index-language close: two 1px hairlines crossed, no box, no radius */
      close.innerHTML='<span></span><span></span>';

      var frame=document.createElement('div');
      frame.className='player-frame';
      frame.appendChild(embed(el.getAttribute('data-yt'), false));

      overlay.appendChild(close);
      overlay.appendChild(frame);
      document.body.appendChild(overlay);
      document.body.classList.add('playing-large');

      close.addEventListener('click',function(e){ e.stopPropagation(); closePlayer(false); });
      overlay.addEventListener('click',function(e){
        if(e.target===overlay) closePlayer(false);      /* tap outside the 16:9 box */
      });
      frame.addEventListener('click',function(e){ e.stopPropagation(); });

      if(!pushed){ try{ history.pushState({siePlayer:1},'',location.href); pushed=true; }catch(e){} }

      // landscape: ask for real fullscreen; if refused, the CSS orientation query handles it
      if(window.matchMedia('(orientation:landscape)').matches && overlay.requestFullscreen){
        var fp=overlay.requestFullscreen(); if(fp&&fp.catch) fp.catch(function(){});
      }
      close.focus();
    }

    tiles.forEach(function(el){
      el.addEventListener('click',function(e){
        if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;  /* let new-tab through */
        e.preventDefault();
        clearTimeout(hoverTimer);
        openPlayer(el);
      });
    });

    document.addEventListener('keydown',function(e){ if(e.key==='Escape') closePlayer(false); });
    window.addEventListener('popstate',function(){ if(overlay) closePlayer(true); });
    window.addEventListener('hashchange',function(){ closePlayer(false); stopAllPreviews(); });
    // rotating into landscape while open: try fullscreen, and let CSS resize either way
    window.addEventListener('orientationchange',function(){
      if(overlay && window.matchMedia('(orientation:landscape)').matches && overlay.requestFullscreen
         && !document.fullscreenElement){
        var fp=overlay.requestFullscreen(); if(fp&&fp.catch) fp.catch(function(){});
      }
    });
  }
})();
