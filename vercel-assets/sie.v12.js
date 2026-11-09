/* sie.v11.js — sie.market. No dependencies.
   v8 adds: the home title choreography (§1), the large in-place video player (§2),
   and the index-language corner nav. Every block tolerates its elements being absent,
   because Webflow serves one page per route while the local build ships both in one
   document. */
(function(){
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    var route=function(){ var h=(location.hash||'').replace(/^#/,'');
      if(h && h!=='sie' && h!=='home') return;        /* a video id: the wall handles it */
      var s=h==='sie'; home.hidden=s; sie.hidden=!s; window.scrollTo(0,0); };
    window.addEventListener('hashchange',route); route();
  }

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
  /* dots only: the caption is a static line in the markup now, so nothing fades */
  function sync(){ var i=index();
    [].forEach.call(dots.children,function(d,j){ d.setAttribute('aria-current', j===i?'true':'false'); }); }
  gal.addEventListener('scroll',function(){ requestAnimationFrame(sync); },{passive:true});
  sync();
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

  /* =====================================================================
     The two component instances, called through the component's own global. No
     alias, no rename, no tokens read out of it — it is loaded verbatim from
     site/vendor/myth-index/ and owns every pixel of these controls.
     ===================================================================== */
  var POSTER = 'assets/yt/W6n73KxSkn0.jpg';
  var CD = (document.querySelector('.slide img[src*="cd-front"]') || {}).src
           || 'assets/cd-front.webp';

  if(typeof window.mythIndex === 'function'){
    /* One instance, top-right, carrying the whole catalogue: a "shop" row then
       every entry in videos.json, each labelled from artist-map and linking to
       /videos#<id>. Rows are baked in at build time by build_video_grid.py.
       querySelectorAll, not getElementById: the local single-file build ships a
       mount inside each <main> and getElementById returns only the first. */
    var CAT=[{href:'/',title:'shop',thumb:CD}];
    var blob=document.getElementById('catalogue');
    if(blob){ try{ CAT=JSON.parse(blob.textContent); }catch(e){} }

    [].forEach.call(document.querySelectorAll('[id="corner-mount"]'),function(corner){
      var api = mythIndex({ mount:corner, label:'index', columns:2,
        ariaLabel:'index', columnLabels:['#','',''], items:CAT });

      /* Desktop: open on hover as well as click, through the component's own
         returned API — the vendored files are untouched. Touch keeps click only. */
      if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
        var shut=null;
        corner.addEventListener('mouseenter',function(){ clearTimeout(shut); api.open(); });
        corner.addEventListener('mouseleave',function(){
          clearTimeout(shut); shut=setTimeout(function(){ api.close(); },250); });
      }
    });
  }

  /* ---- the description: the only thing on the page that animates. 40ms per word,
     180ms fade each, once per session, then it stays. ---- */
  var descP=document.getElementById('desc-roll');
  if(descP){
    var done=false; try{ done=sessionStorage.getItem('sie-desc')==='1'; }catch(e){}
    var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!done && !reduce){
      try{ sessionStorage.setItem('sie-desc','1'); }catch(e){}
      var box=descP.parentNode;
      var words=(descP.textContent||'').trim().split(/\s+/);
      descP.textContent='';
      words.forEach(function(w,i){
        var s=document.createElement('span');
        s.className='w'; s.textContent=w;
        s.style.transitionDelay=(i*40)+'ms';
        descP.appendChild(s);
        if(i<words.length-1) descP.appendChild(document.createTextNode(' '));
      });
      box.classList.add('rolling');
      requestAnimationFrame(function(){ box.classList.add('in'); });
      /* drop the spans once it has settled, so the paragraph is plain text after */
      setTimeout(function(){
        descP.textContent=words.join(' ');
        box.classList.remove('rolling','in');
      }, (words.length-1)*40 + 180 + 60);
    }
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

    /* /videos#<id> opens that video large on load. Locally the single-file build is
       hash-routed, so a video-id hash also has to select the videos page. */
    function openFromHash(){
      var id=(location.hash||'').replace(/^#/,'');
      if(!id) return;
      var el=tiles.filter(function(t){ return t.getAttribute('data-yt')===id; })[0];
      if(el) openPlayer(el);
    }
    if(home&&sie){
      var ids=tiles.map(function(t){ return t.getAttribute('data-yt'); });
      if(ids.indexOf((location.hash||'').replace(/^#/,''))>=0){
        home.hidden=true; sie.hidden=false;
      }
    }
    openFromHash();

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
