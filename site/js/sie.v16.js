/* sie.v16.js — sie.market. No dependencies.
   v8 added the home title choreography, the large in-place video player and the
   index-language corner nav. v16 adds §3, the video rail: /videos is one vertical
   looping column whose tiles scale with their distance from the centre of the
   viewport, and which owns muted playback (at most MAX_PLAY at once).
   Every block tolerates its elements being absent, because Webflow serves one page
   per route while the local build ships both in one document. */
(function(){
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var railAPI = null;                 /* §3 sets this once the rail is built */

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
         is 0), so it re-measures every time the page is actually shown */
      if(s && railAPI) railAPI.refresh(); };
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
      var api = mythIndex({ mount:corner, label:'videos', columns:1,
        ariaLabel:'videos', items:[{ href:'/videos', title:'videos', thumb:CD }] });
      if(!api) return;

      /* the same black glossy surface as buy — the class only, so radius,
         padding, type and letter-spacing still come from the component. */
      var tgl = corner.querySelector('.myth-index__toggle');
      if(tgl) tgl.classList.add('sie-buy');

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

      /* Desktop: hovering the pill opens the panel, through the component's own
         returned API. Touch keeps tap-to-open. */
      if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
        var shut=null;
        corner.addEventListener('mouseenter',function(){ clearTimeout(shut); api.open(); });
        corner.addEventListener('mouseleave',function(){
          clearTimeout(shut);
          shut=setTimeout(function(){ if(stop) stop(); api.close(); },250); });
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
     §3  THE VIDEO RAIL
     One vertical, endlessly looping column. Every frame, each on-screen tile's
     thumbnail is scaled by

         scale = clamp(1, 1 + 0.5 * (1 - d / R), MAX)

     where d is the distance from the tile's centre to the centre of the viewport,
     R is vh/5 on fine pointers and vh/4 on coarse, and MAX is 1.5 and 1.4.

     Technique studied on ninepointsixthree.co; see the long note in §2 of
     sie.v16.css for what we did differently and why. The two that matter here:
     the scroll is the platform's own, and `d` is read from a cached LAYOUT
     position rather than a live rect, so a transform we wrote can never move the
     thing we measure. Their version re-reads displaced positions every pass and
     only converges once the scroll stops.
     ===================================================================== */
  var rail = document.getElementById('vid-rail');
  var railList = document.getElementById('vids');
  if(rail && railList && rail.classList.contains('vid-rail')){
    railAPI = (function(){
      var MAX_PLAY = 6;                /* muted tiles allowed to play at once */
      var REPEAT = 3;                  /* copies of the feed in the DOM */

      var base = [].slice.call(railList.querySelectorAll('.vid[data-yt]'));
      var N = base.length;
      if(!N) return null;

      /* The loop needs more content than the viewport on both sides of the middle
         copy. The extra copies are decoration for the eye only: they are hidden
         from assistive tech and taken out of the tab order, so the page still
         exposes exactly N videos. */
      for(var r=1; r<REPEAT; r++){
        base.forEach(function(el){
          var c = el.cloneNode(true);
          c.setAttribute('data-clone','1');
          c.setAttribute('aria-hidden','true');
          c.setAttribute('tabindex','-1');
          railList.appendChild(c);
        });
      }

      var all = [].slice.call(railList.querySelectorAll('.vid[data-yt]'));
      var thumbs = all.map(function(el){ return el.querySelector('.vid-thumb'); });
      var centres = [];                /* layout centre of each thumb, rail coords */
      var vh = 0, R = 0, MAX = 1.5, blockH = 0, lo = 0, hi = 0;
      var started = false, lastCentre = null;
      var playing = [];

      /* ---- measurement. Transforms are cleared on every thumb FIRST, then every
         rect is read, then they are put back: two layout flushes for the whole
         rail instead of two per tile. ---- */
      function measure(){
        vh = rail.clientHeight;
        if(!vh) return false;                  /* #sie is hidden; nothing to do */
        var coarse = window.matchMedia('(hover:none) and (pointer:coarse)').matches
                  || window.innerWidth < 700;
        R   = coarse ? vh/4 : vh/5;
        MAX = coarse ? 1.4  : 1.5;

        var saved = thumbs.map(function(t){ return t.style.transform; });
        thumbs.forEach(function(t){ t.style.transition='none'; t.style.transform='none'; });
        var top = rail.getBoundingClientRect().top, sc = rail.scrollTop;
        centres = thumbs.map(function(t){
          var b = t.getBoundingClientRect();
          return b.top + b.height/2 - top + sc;
        });
        thumbs.forEach(function(t,i){ t.style.transform = saved[i]; });
        /* give the restore one frame before transitions come back, or every tile
           animates from 1 to its old scale */
        requestAnimationFrame(function(){
          thumbs.forEach(function(t){ t.style.transition=''; });
        });

        blockH = centres[N] - centres[0];      /* one full copy of the feed */
        lo = centres[0] - vh/2 + blockH;       /* scrollTop that centres tile N */
        hi = lo + blockH;
        return blockH > 0;
      }

      /* ---- the loop. Keep scrollTop inside one copy's worth of travel, with a
         whole copy of content above and below, so a jump is never visible. ---- */
      function loop(){
        if(!blockH) return false;
        var sc = rail.scrollTop;
        if(sc >= hi){ rail.scrollTop = sc - blockH; return true; }
        if(sc <  lo){ rail.scrollTop = sc + blockH; return true; }
        return false;
      }

      /* ---- the scale pass. Transform writes only: no reads, no layout.
         Measured at 390px, DPR 2, six muted embeds playing: 58.7 fps median over
         three fresh runs (58.2-59.1), p95 frame 16.8ms. Layer promotion via
         will-change was tried here and removed: it changed nothing measurable
         (58.2-58.7 without it) and 7 promoted layers is not free. ---- */
      function pass(){
        if(!vh || !centres.length) return;
        var sc = rail.scrollTop, mid = vh/2;
        var best = Infinity, bi = -1;
        for(var i=0;i<all.length;i++){
          var c = centres[i] - sc;                      /* viewport-relative */
          if(c < -vh*0.6 || c > vh*1.6){                /* far off-screen: park */
            if(thumbs[i].style.transform !== 'scale(1)'){
              thumbs[i].style.transform='scale(1)';
            }
            continue;
          }
          var d = Math.abs(c - mid);
          var s = Math.max(1, Math.min(MAX, 1 + 0.5*(1 - d/R)));
          thumbs[i].style.transform = 'scale(' + (Math.round(s*1e4)/1e4) + ')';
          if(d < best){ best = d; bi = i; }
        }
        if(bi !== lastCentre){
          if(lastCentre !== null && all[lastCentre]) all[lastCentre].classList.remove('is-centre');
          if(bi >= 0) all[bi].classList.add('is-centre');
          lastCentre = bi;
        }
      }

      /* ---- muted playback, at most MAX_PLAY, always the ones nearest centre.
         Reconciled on settle rather than per frame: adding or removing an iframe
         is the single most expensive thing here and must never ride the scroll. */
      function stopOne(el){
        var f = el.querySelector('.vid-thumb iframe');
        if(f && f.parentNode) f.parentNode.removeChild(f);
        el.classList.remove('previewing');
        var k = playing.indexOf(el); if(k>=0) playing.splice(k,1);
      }
      function stopAll(){ playing.slice().forEach(stopOne); }
      function startOne(el){
        if(el.classList.contains('previewing')) return;
        var box = el.querySelector('.vid-thumb'); if(!box) return;
        var f = ytEmbed(el.getAttribute('data-yt'), true);
        f.setAttribute('tabindex','-1');
        f.title = (el.getAttribute('aria-label') || 'video') + ' (muted)';
        box.appendChild(f);
        el.classList.add('previewing'); playing.push(el);
      }
      function reconcile(){
        if(REDUCE || !vh) return;
        if(document.body.classList.contains('playing-large')) return;  /* the big player owns sound */
        var sc = rail.scrollTop, mid = vh/2, near = [];
        for(var i=0;i<all.length;i++){
          var c = centres[i] - sc;
          if(c < -vh*0.15 || c > vh*1.15) continue;     /* on screen only */
          near.push({ el:all[i], d:Math.abs(c - mid) });
        }
        near.sort(function(a,b){ return a.d - b.d; });
        var want = near.slice(0, MAX_PLAY).map(function(x){ return x.el; });
        playing.slice().forEach(function(el){ if(want.indexOf(el) < 0) stopOne(el); });
        want.forEach(startOne);
      }

      var raf = 0, settle = null;
      function soon(){ clearTimeout(settle); settle = setTimeout(reconcile, 160); }
      function onScroll(){
        if(!raf) raf = requestAnimationFrame(function(){ raf = 0; loop(); pass(); });
        soon();
      }
      rail.addEventListener('scroll', onScroll, { passive:true });
      window.addEventListener('resize', function(){ if(measure()){ pass(); soon(); } });
      window.addEventListener('orientationchange', function(){
        setTimeout(function(){ if(measure()){ pass(); soon(); } }, 120);
      });

      function refresh(){
        if(!measure()) return;
        if(!started){ rail.scrollTop = lo; started = true; }
        pass(); soon();
      }

      /* posters carry width/height and .vid-thumb has an aspect-ratio, so the
         layout is final before the images decode — but re-measure on load anyway,
         because the webfont changes the label's height. */
      if(document.readyState === 'complete') setTimeout(refresh, 0);
      else window.addEventListener('load', refresh);

      var api = { refresh:refresh, stopAll:stopAll, loop:loop,
        /* MAX_PLAY is a knob so the cost of simultaneous playback can be measured
           against the cost of the rail itself. Six muted YouTube embeds are six
           video decoders; the scale pass is seven transform writes. */
        maxPlay:function(n){ if(typeof n === 'number'){ MAX_PLAY = n;
            playing.slice(n).forEach(stopOne); reconcile(); } return MAX_PLAY; },
        playing:function(){ return playing.length; },
        playingIds:function(){ return playing.map(function(e){ return e.getAttribute('data-yt'); }); },
        params:function(){ return { vh:vh, R:R, MAX:MAX, blockH:blockH, lo:lo, hi:hi,
                                    tiles:all.length, feed:N, scrollTop:rail.scrollTop }; },
        scales:function(){ var out=[], sc=rail.scrollTop, mid=vh/2;
          for(var i=0;i<all.length;i++){ var c=centres[i]-sc;
            if(c < -vh*0.2 || c > vh*1.2) continue;
            var m=/scale\(([\d.]+)\)/.exec(thumbs[i].style.transform||'');
            out.push({ i:i, d:Math.round((Math.abs(c-mid))*100)/100,
                       scale:m?+m[1]:1,
                       rect:Math.round(thumbs[i].getBoundingClientRect().width*100)/100,
                       centre:all[i].classList.contains('is-centre'),
                       playing:all[i].classList.contains('previewing') }); }
          return out; },
        pass:pass, reconcile:reconcile };
      window.__rail = api;
      return api;
    })();
  }

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

    /* On /videos the rail owns playback: it already keeps the MAX_PLAY tiles
       nearest the centre playing, and a second system on the same tiles would
       both double the iframe count and fight it for which tile is live. The
       hover and IntersectionObserver paths below are only for a wall without a
       rail (the index panel's mini grid has its own, in wireMiniPreviews). */
    if(railAPI){
      /* nothing: §3 is already running */
    } else if(FINE){
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
      if(railAPI) railAPI.reconcile();      /* bring the rail's muted tiles back */
      if(pushed && !fromPop){ pushed=false; try{ history.back(); }catch(e){} }
      if(fromPop) pushed=false;
    }

    function openPlayer(el){
      stopAllPreviews();
      if(railAPI) railAPI.stopAll();        /* the overlay is the only sound source */
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
      if(home&&sie){ home.hidden=true; sie.hidden=false; window.scrollTo(0,0);
        if(railAPI) railAPI.refresh(); }
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
