/* sie.v16.js — sie.market. No dependencies.
   v8 added the home title choreography, the large in-place video player and the
   index-language corner nav.

   v18 drops the vertical video rail. /videos is a three-up grid now, the same
   shape as the panel the nav pill opens, and the wall in the next section
   drives it: poster thumbnails, a muted preview on hover, the large player on
   click. The rail's lines went with it rather than being left switched off.

   v17 changes two things. The corner pill is no longer one button: the word is
   an <a href> that navigates on any click or tap, and a separate caret button
   beside it is the only thing that opens the preview. And the price is measured
   against buy so it can sit 12% wider than it.

   v16 adds §3, the video rail: /videos is one vertical
   looping column whose tiles scale with their distance from the centre of the
   viewport, and which owns muted playback (at most MAX_PLAY at once).
   Every block tolerates its elements being absent, because Webflow serves one page
   per route while the local build ships both in one document. */
(function(){
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* One youtube-nocookie embed builder, shared by the index panel's hover
     previews and by the wall's previews and large player. */
  function ytEmbed(id, muted){
    var f=document.createElement('iframe');
    f.src='https://www.youtube-nocookie.com/embed/'+id+
          '?autoplay=1&mute='+(muted?1:0)+'&rel=0&modestbranding=1&playsinline=1'+
          (muted?'&controls=0&loop=1&playlist='+id:'');
    f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen=true; f.loading='lazy';
    f.setAttribute('frameborder','0');
    return f;
  }

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
      var s=h==='sie'; home.hidden=s; sie.hidden=!s; window.scrollTo(0,0);
      /* the rail measures nothing useful while #sie is display:none (clientHeight
         is 0), so it re-measures every time the page is actually shown */ };
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
     THE INDEX. The component is loaded verbatim from site/vendor/myth-index/ and
     owns the pill, the glass panel and the panel's scrolling. What goes INSIDE
     the panel is ours: a live mini copy of the videos page — the same tile
     markup, the same labels, the same local posters, three columns wide. No
     screenshot. The data is #videos-data, written by build_video_grid.py from
     videos.json x artist-map.json, so a new upload reaches the panel with no
     hand edit.
     ===================================================================== */
  var CD = (document.querySelector('.slide img[src*="cd-front"]') || {}).src
           || 'assets/cd-front.webp';

  var FEED = [];
  var feedBlob = document.getElementById('videos-data');
  if(feedBlob){ try{ FEED = JSON.parse(feedBlob.textContent) || []; }catch(e){} }

  /* The local single-file build hash-routes both pages in one document, so
     /videos#<id> has to become #<id> here. On Webflow /videos is a real route. */
  var SINGLE = !!(home && sie);
  function videoHref(id){ return SINGLE ? '#' + id : '/videos#' + id; }

  function miniTile(v){
    var a=document.createElement('a');
    a.className='vid'; a.href=videoHref(v.id);
    a.setAttribute('data-yt', v.id);
    a.setAttribute('aria-label', v.label);
    var th=document.createElement('span'); th.className='vid-thumb';
    var im=document.createElement('img');
    /* relative locally; the Webflow footer sets window.SIE_ASSETS first */
    im.src=(window.SIE_ASSETS||'assets/yt/')+v.id+'.jpg'; im.alt=''; im.loading='lazy';
    im.width=480; im.height=360;
    th.appendChild(im);
    var lb=document.createElement('span'); lb.className='vid-label';
    lb.textContent=v.label;
    a.appendChild(th); a.appendChild(lb);
    return a;
  }

  /* Hover a tile and its poster becomes a muted embed — exactly one at a time,
     destroyed on mouseleave and when the panel closes. Fine pointers only. */
  function wireMiniPreviews(grid){
    if(!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return null;
    var live=null, t=null;
    function stop(){
      if(!live) return;
      var f=live.querySelector('iframe');
      if(f&&f.parentNode) f.parentNode.removeChild(f);
      live.classList.remove('previewing'); live=null;
    }
    [].forEach.call(grid.querySelectorAll('.vid[data-yt]'),function(el){
      el.addEventListener('mouseenter',function(){
        clearTimeout(t);
        t=setTimeout(function(){
          stop();
          var box=el.querySelector('.vid-thumb'); if(!box) return;
          var f=ytEmbed(el.getAttribute('data-yt'), true);
          f.setAttribute('tabindex','-1');
          f.title=(el.getAttribute('aria-label')||'video')+' (preview)';
          box.appendChild(f); el.classList.add('previewing'); live=el;
        },140);
      });
      el.addEventListener('mouseleave',function(){ clearTimeout(t); if(live===el) stop(); });
    });
    grid.addEventListener('mouseleave',function(){ clearTimeout(t); stop(); });
    return stop;
  }

  if(typeof window.mythIndex === 'function' && FEED.length){
    /* querySelectorAll, not getElementById: the local single-file build ships a
       mount inside each <main> and getElementById returns only the first. */
    [].forEach.call(document.querySelectorAll('[id="corner-mount"]'),function(corner){
      /* The component needs at least one item to render at all; the rows it
         builds are then replaced wholesale by the mini grid. Nothing vendored
         is edited, and no token is copied out of it. */
      /* Which page this mount is on decides where its link points. The local
         single-file build hash-routes; on Webflow these are real routes, and
         the paste bundle rewrites #home -> / and #sie -> /videos.

         The page is identified from the <main> that owns the mount, by three
         marks in turn, because no single one survives both builds: the local
         build gives it id="sie", the paste bundle replaces that with
         data-route="/videos", and either way the videos page is the only one
         carrying the rail. Keying on id alone shipped a /videos page whose
         pill still said "videos" and pointed at itself. */
      var main = corner.closest ? corner.closest('main') : null;
      var onVideos = !!(main && (main.getAttribute('data-route') === '/videos'
                                 || main.id === 'sie'
                                 || main.querySelector('#vid-rail')));
      var label = onVideos ? 'shop' : 'videos';
      var dest  = onVideos ? (SINGLE ? '#home' : '/')
                           : (SINGLE ? '#sie'  : '/videos');

      var api = mythIndex({ mount:corner, label:label, columns:1,
        ariaLabel:label, items:[{ href:dest, title:label, thumb:CD }] });
      if(!api) return;

      /* ---- the pill is a link and a caret, not one button -----------------
         The component's own toggle is the only thing that can drive its panel,
         so it stays in the DOM and is taken out of the flow by CSS; the caret
         forwards to the API instead. Nothing here touches a vendored file, and
         nothing calls preventDefault on the link: a click on the word is an
         ordinary navigation. */
      var tgl = corner.querySelector('.myth-index__toggle');
      var panel = corner.querySelector('.myth-index__panel');

      var pill = document.createElement('div');
      pill.className = 'sie-nav';

      var link = document.createElement('a');
      link.className = 'sie-nav__link';
      link.href = dest;
      link.textContent = label;

      var caret = document.createElement('button');
      caret.type = 'button';
      caret.className = 'sie-nav__caret';
      caret.setAttribute('aria-expanded','false');
      caret.setAttribute('aria-label', onVideos ? 'preview the shop'
                                                : 'preview the videos');
      if(panel && panel.id) caret.setAttribute('aria-controls', panel.id);
      var chev = document.createElement('span');
      chev.textContent = '\u25be';
      chev.setAttribute('aria-hidden','true');
      caret.appendChild(chev);

      pill.appendChild(link); pill.appendChild(caret);
      if(tgl && tgl.parentNode) tgl.parentNode.insertBefore(pill, tgl);
      else corner.insertBefore(pill, corner.firstChild);

      caret.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation(); api.toggle();
      });
      /* the component owns aria-expanded on its own toggle; mirror it, so the
         caret rotates and announces correctly however the panel was opened */
      if(tgl && 'MutationObserver' in window){
        new MutationObserver(function(){
          caret.setAttribute('aria-expanded',
            tgl.getAttribute('aria-expanded') || 'false');
        }).observe(tgl, { attributes:true, attributeFilter:['aria-expanded'] });
      }

      var stop = null;
      var cols = corner.querySelector('.myth-index__cols');
      if(cols){
        cols.innerHTML = '';
        var grid = document.createElement('div');
        grid.className = 'sie-mini';
        FEED.forEach(function(v){ grid.appendChild(miniTile(v)); });
        cols.appendChild(grid);
        stop = wireMiniPreviews(grid);
      }

      /* Desktop: hovering the pill opens the panel; leaving closes it after
         250 ms, so crossing the gap between pill and panel does not shut it.
         Touch keeps tap-the-caret-to-open. */
      if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
        var shut=null;
        corner.addEventListener('mouseenter',function(){ clearTimeout(shut); api.open(); });
        corner.addEventListener('mouseleave',function(){
          clearTimeout(shut);
          shut=setTimeout(function(){ if(stop) stop(); api.close(); },250); });
      }
    });
  }

  /* ---- the price pill is sized from buy ---------------------------------
     "12% wider than buy" is a width relative to another element's intrinsic
     width, which CSS cannot express, so it is measured here and published as a
     custom property. Buy is left at its own size and label; only its surface
     changed. Re-measured on resize because buy's padding is in px but the page
     type scales with the viewport. ---- */
  (function(){
    var products = document.querySelectorAll('.product');
    if(!products.length) return;
    function size(){
      [].forEach.call(products, function(p){
        var buy = p.querySelector('.sie-buy'), price = p.querySelector('.price');
        if(!buy || !price) return;
        /* measure buy unconstrained: reading offsetWidth while the price pill
           is already stretching the column would feed the last answer back in */
        var prev = price.style.width;
        price.style.width = '0px';
        var w = buy.getBoundingClientRect().width;
        price.style.width = prev;
        if(w > 0) p.style.setProperty('--price-w', (w * 1.12).toFixed(2) + 'px');
      });
    }
    size();
    window.addEventListener('resize', function(){
      clearTimeout(size._t); size._t = setTimeout(size, 120);
    });
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(size);
  })();

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

  /* ---- scroll reveal. One IntersectionObserver, fire once, short stagger.
     The description is excluded — it already has the word roll, and two animations
     on one block is one too many. The video tiles are excluded too as of v16:
     the rail gives them a transform of its own, and .rv's translateY would be
     overwritten by it on the very next frame. ---- */
  (function(){
    if(REDUCE || !('IntersectionObserver' in window)) return;
    var targets=[].slice.call(
      document.querySelectorAll('.product > *:not(.desc)'));
    if(!targets.length) return;
    targets.forEach(function(el){ el.classList.add('rv'); });
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        var i=targets.indexOf(e.target);
        e.target.style.transitionDelay=((i % 8) * 55)+'ms';
        e.target.classList.add('rv-in');
        io.unobserve(e.target);
      });
    },{ rootMargin:'0px 0px -8% 0px', threshold:0.05 });
    targets.forEach(function(el){ io.observe(el); });
  })();

  /* =====================================================================
     §2  THE WALL AND THE LARGE PLAYER
     Tiles rest as poster thumbnails. A muted preview plays on hover (fine pointer)
     or while a tile is centred in view (coarse pointer, IntersectionObserver, at
     most 4 at once). Tapping a tile opens it large in a black overlay holding
     exactly ONE youtube-nocookie iframe, destroyed on close.
     ===================================================================== */
  /* '.vids .vid', NOT '.vid': the index panel's mini grid uses the same tile
     markup, and an unscoped selector had the coarse-pointer observer starting
     four muted embeds inside the panel the moment it opened on a phone. */
  var tiles=[].slice.call(document.querySelectorAll('.vids .vid[data-yt]'));
  if(tiles.length){
    var FINE = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    var MAX_PREVIEW = 4;
    var previews = [];               /* tiles currently holding a muted preview */
    var hoverTimer = null;
    var overlay = null, overlayTile = null, pushed = false;

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
      var f=ytEmbed(el.getAttribute('data-yt'), true);
      f.setAttribute('tabindex','-1');
      f.title=(el.getAttribute('aria-label')||'video')+' (preview)';
      box.appendChild(f);
      el.classList.add('previewing'); previews.push(el);
    }

    /* Fine pointer: a muted preview on hover, after 180ms so running the cursor
       across the grid does not start nineteen of them. Coarse: whichever tiles
       are centred in view, at most MAX_PREVIEW. The index panel's mini grid has
       its own, in wireMiniPreviews, and is deliberately not wired here. */
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
      document.body.classList.remove('playing-large');      /* bring the rail's muted tiles back */
      if(pushed && !fromPop){ pushed=false; try{ history.back(); }catch(e){} }
      if(fromPop) pushed=false;
    }

    function openPlayer(el){
      stopAllPreviews();        /* the overlay is the only sound source */
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
      frame.appendChild(ytEmbed(el.getAttribute('data-yt'), false));

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
    var ids=tiles.map(function(t){ return t.getAttribute('data-yt'); });
    function routeToVideo(){
      var id=(location.hash||'').replace(/^#/,'');
      if(ids.indexOf(id)<0) return false;
      if(home&&sie){ home.hidden=true; sie.hidden=false; window.scrollTo(0,0); }
      return true;
    }
    routeToVideo();
    openFromHash();

    document.addEventListener('keydown',function(e){ if(e.key==='Escape') closePlayer(false); });
    window.addEventListener('popstate',function(){ if(overlay) closePlayer(true); });
    window.addEventListener('hashchange',function(){
      closePlayer(false); stopAllPreviews();
      /* a mini-grid tile in the index panel navigates to #<id> on the local
         single-file build; open it the same way a /videos#<id> load would */
      if(routeToVideo()) openFromHash();
    });
    // rotating into landscape while open: try fullscreen, and let CSS resize either way
    window.addEventListener('orientationchange',function(){
      if(overlay && window.matchMedia('(orientation:landscape)').matches && overlay.requestFullscreen
         && !document.fullscreenElement){
        var fp=overlay.requestFullscreen(); if(fp&&fp.catch) fp.catch(function(){});
      }
    });
  }
})();
