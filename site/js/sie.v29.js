/* sie.v28.js — sie.market. No dependencies of our own; the video half
   loads YouTube's IFrame API, for the reasons in §2.

   v21 is the video round. Every embed is built through the IFrame API now
   instead of by hand, because the things being complained about — the YouTube
   button and title painted over a tile, the caption track, the stall before a
   tile starts, the wait when one is opened large — all live inside the frame
   and none of them can be reached from a src string. See §0.

   sie.v16.js — the history below is kept because the shapes it explains are
   still here.
   v8 added the home title choreography, the large in-place video player and the
   index-language corner nav.

   v18 drops the vertical video rail. /videos is a three-up grid now, the same
   shape as the panel the nav pill opens, and the wall in the next section
   drives it: tiles that play by themselves while in view, the large player on
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

  /* =====================================================================
     §0  PLAYERS

     Up to v19 an embed was an <iframe> with a query string, which means
     everything inside it was YouTube's to decide. Three of those decisions
     were visible on the site:

       - a throttled, paused or finished tile gets YouTube's own interstitial
         painted over it: the video title, the channel name, a share glyph and
         a YouTube button. With nineteen tiles competing for the browser's
         media pipeline this was most of the wall at once.
       - the caption track comes up by itself. cc_load_policy=0 asks for it to
         stay down and does not bind auto-generated tracks, which is what these
         videos have.
       - a tile could do nothing but restart from zero when it was opened large.

     A src string cannot answer any of that from outside the frame. The IFrame
     API can, so players are built through it and held: captions are unloaded
     on ready and again on every state change, PAUSED and ENDED are refused
     before YouTube has a frame to draw an overlay in, and a live player can be
     asked where its playhead is so the large one can start there.

     Burnt-in lyrics are part of the picture, not a caption track, and are left
     exactly as they are.
     ===================================================================== */

  /* The API script, fetched once, callers queued until it answers. */
  var YTAPI = (function(){
    var waiting = null;
    return function(cb){
      if(window.YT && window.YT.Player) return cb(window.YT);
      if(waiting) return waiting.push(cb);
      waiting = [cb];
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function(){
        if(typeof prev === 'function'){ try{ prev(); }catch(e){} }
        var q = waiting; waiting = null;
        q.forEach(function(f){ try{ f(window.YT); }catch(e){} });
      };
      var sc = document.createElement('script');
      sc.src = 'https://www.youtube.com/iframe_api'; sc.async = true;
      (document.head || document.documentElement).appendChild(sc);
    };
  })();

  /* controls:0 everywhere — the wall has no controls at all and the large
     player wears ours. rel=0 keeps the end screen to this channel, and
     iv_load_policy=3 drops annotation cards. */
  var PVARS = { autoplay:1, controls:0, rel:0, modestbranding:1, playsinline:1,
                iv_load_policy:3, disablekb:1, cc_load_policy:0, fs:0 };

  function noCaptions(p){
    /* unloadModule is the only one of these that binds an auto-generated
       track; the other two are cheap and cover the named module both ways. */
    try{ p.unloadModule('captions'); }catch(e){}
    try{ p.unloadModule('cc'); }catch(e){}
    try{ p.setOption('captions','track',{}); }catch(e){}
  }

  /* Build a player inside `box`. Returns a handle, not the API object: the API
     object does not exist yet when this returns, and a tile can be scrolled
     away before it does. */
  function mountPlayer(box, id, o){
    o = o || {};
    var host = document.createElement('div');
    host.className = 'yt'; host.setAttribute('tabindex','-1');
    box.appendChild(host);

    var h = { api:null, dead:false, wantPause:false, resumes:0, played:false,
              retry:null };
    h.destroy = function(){
      h.dead = true;
      if(h.retry){ clearTimeout(h.retry); h.retry = null; }
      try{ h.api && h.api.destroy(); }catch(e){}
      if(host.parentNode) host.parentNode.removeChild(host);
      h.api = null;
    };
    h.time = function(){
      try{ return (h.api && h.api.getCurrentTime && h.api.getCurrentTime()) || 0; }
      catch(e){ return 0; }
    };

    var vars = {}; for(var k in PVARS) vars[k] = PVARS[k];
    vars.mute = o.muted ? 1 : 0;
    vars.origin = location.origin;
    /* NOT loop=1&playlist=id. That is how you loop a src-string embed, but it
       puts the player in playlist mode, and a playlist player paints its own
       transport -- previous, pause, next, the channel avatar, the title and a
       YouTube button -- over the picture whenever it is not cleanly playing.
       Measured on the wall: two tiles in twelve wearing it at any moment. The
       loop is done in onStateChange instead, where ENDED never survives long
       enough to be drawn. */
    if(o.start) vars.start = Math.max(0, Math.floor(o.start));

    YTAPI(function(YT){
      if(h.dead) return;
      h.api = new YT.Player(host, {
        host:'https://www.youtube-nocookie.com', videoId:id, playerVars:vars,
        events:{
          onReady:function(e){
            noCaptions(e.target);
            try{ o.muted ? e.target.mute() : e.target.unMute(); }catch(x){}
            if(o.start){ try{ e.target.seekTo(o.start, true); }catch(x){} }
            try{ e.target.playVideo(); }catch(x){}
            if(o.onReady) o.onReady(e.target, h);
          },
          onStateChange:function(e){
            noCaptions(e.target);
            /* Neither state is allowed to persist, so neither overlay is ever
               painted. The wantPause flag is how our own pause button gets to
               pause without this fighting it. */
            if(e.data === YT.PlayerState.ENDED){
              try{ e.target.seekTo(0, true); e.target.playVideo(); }catch(x){}
            }else if(e.data === YT.PlayerState.PLAYING){
              h.resumes = 0; h.played = true;
            }else if(e.data === YT.PlayerState.PAUSED && !h.wantPause){
              /* A device hands out a small, fixed number of video decoders and
                 pauses the players it cannot serve. v25 asked three times and
                 then let the poster stand, on the reasoning that asking
                 forever is a fight the device always wins.

                 It is not quite a fight it always wins, though: the supply of
                 decoders CHANGES. Closing the large player gives one back,
                 so does another tab going away, so does the user leaving the
                 page alone for a moment. v25 had already stopped asking by
                 then, so a tile pre-empted in the first seconds after load
                 stayed dead for the rest of the session even once there was
                 room for it.

                 So it keeps asking -- fast three times, then once every three
                 seconds for as long as the tile is on the page. Three seconds
                 is cheap (a no-op call on a player the device still will not
                 serve) and it means every freed decoder gets claimed. The
                 poster covers whatever is not playing in the meantime, so a
                 refused attempt never shows as YouTube chrome. */
              h.resumes++;
              if(h.retry) clearTimeout(h.retry);
              h.retry = setTimeout(function(){
                h.retry = null;
                if(h.dead || h.wantPause) return;
                try{ e.target.playVideo(); }catch(x){}
              }, h.resumes <= 3 ? 250 : 3000);
            }
            if(o.onState) o.onState(e.data, e.target, h);
          },
          onError:function(){ if(o.onError) o.onError(); }
        }
      });
    });
    return h;
  }

  /* Where a tile's own picture has got to, so the large one can start
     there. A grid tile answers from the grid video's clock; the YouTube path
     is kept for anything the grid does not carry. */
  function tileTime(el){
    if(el.__sieGridTime) return el.__sieGridTime();
    return el.__siePlayer ? el.__siePlayer.time() : 0;
  }

  /* ---- THE GRID: one decoder, nineteen pictures -----------------------

     "I want all 19 playing in full, silently, at once, on iPhone too."

     Nineteen YouTube embeds cannot do that and no embed parameter reaches
     it. A phone hands out a small, fixed number of hardware video decoders;
     nineteen players contend for roughly eight of them and the losers sit
     paused. v27 took our own caps off, which is as far as iframes go --
     measured on an iPhone, nine playing and ten posters.

     The way through is that the wall is SILENT. Sound only ever arrives when
     someone clicks a tile and the real player opens. And nineteen silent
     pictures do not need nineteen decoders -- they need nineteen RECTANGLES
     of one picture. scripts/build_grid_video.py scales every video to a
     320x180 cell, loops the short ones to the length of the longest, and
     tiles them into a single silent 1280x900 MP4. This plays that one file,
     hidden, and hands each tile a <canvas> that blits its own rectangle out
     of it on every presented frame.

     One decoder. Every tile. Including on the phone.

     Nothing about the markup, the layout or the posters changes: the canvas
     occupies the slot the iframe used, under the same .live rule, so the
     poster still shows until the picture is actually running. */

  var GRID_ROOT = (function(){
    try{
      return new URL('../', new URL(window.SIE_ASSETS || 'assets/yt/',
                                    document.baseURI)).href;
    }catch(e){ return ''; }
  })();
  var GRID_URL = window.SIE_GRID || (GRID_ROOT + 'grid/latest.json');

  function gridWall(){
    var cfg=null, vid=null, paint=[], on=false, rafId=0, queued=[], io=null;
    var t0=(window.performance&&performance.now)?performance.now():Date.now();
    var firstMs=0, fpsFrames=0, fpsFrom=0, fpsNow=0, blockedFn=null;
    /* v29: whether the tiles are currently wearing .live. v28 only ever put
       it on ONCE (guarded by firstMs), and stop() takes it off -- so after
       the large player closed, the grid video was running again underneath
       nineteen posters. Measured on the live page: playing, 0 tiles live.
       It looked frozen because every picture on screen was a still. */
    var shown=false, shownAt=-1;
    function now(){ return (window.performance&&performance.now)?performance.now():Date.now(); }
    function blocked(){ return blockedFn ? blockedFn() : false; }

    /* Only blit what is on screen. The one video keeps playing either way --
       nothing is paused and nothing falls behind -- so a tile scrolled into
       view is correct on the next presented frame. */
    if('IntersectionObserver' in window){
      io = new IntersectionObserver(function(es){
        es.forEach(function(e){ if(e.target.__siePainter)
                                  e.target.__siePainter.vis = e.isIntersecting; });
      }, { root:null, rootMargin:'200px 0px', threshold:0 });
    }

    /* Attach a set of tiles. The wall calls it, and so does the nav panel's
       mini grid when it is built -- which can happen before or after the map
       has arrived, hence the queue. */
    function attach(tiles){
      if(!cfg){ queued.push(tiles); return 0; }
      var n=0;
      [].forEach.call(tiles, function(el){
        if(el.__siePainter) return;
        var r = cfg.tiles[el.getAttribute('data-yt')];
        if(!r) return;              /* not in the grid: its poster stands */
        var box = el.querySelector('.vid-thumb'); if(!box) return;
        var cv = document.createElement('canvas');
        cv.width = r.w; cv.height = r.h;
        cv.setAttribute('aria-hidden','true');
        box.appendChild(cv);
        var p = { el:el, r:r, cx:cv.getContext('2d', { alpha:false }), vis:true };
        el.__siePainter = p;
        /* A short video loops several times inside one grid pass, so where
           this tile is showing is currentTime % its own length. That is the
           offset the large player opens at, so the sound picks up the picture
           that was already running. */
        el.__sieGridTime = function(){
          var d = r.dur || 0;
          return (d && vid) ? (vid.currentTime % d) : 0;
        };
        paint.push(p);
        if(io) io.observe(el);
        n++;
      });
      return n;
    }

    function draw(){
      if(!on) return;
      if(vid.readyState >= 2){
        for(var i=0;i<paint.length;i++){
          var p = paint[i];
          if(!p.vis) continue;
          try{ p.cx.drawImage(vid, p.r.x, p.r.y, p.r.w, p.r.h,
                              0, 0, p.r.w, p.r.h); }catch(e){}
        }
        /* a resumed video hands back its last frame first; wait for the clock
           to actually move before the posters come off */
        if(!shown && vid.currentTime > 0 && vid.currentTime !== shownAt){
          shown = true;
          if(!firstMs) firstMs = Math.round(now() - t0);
          for(var j=0;j<paint.length;j++) paint[j].el.classList.add('live');
        }
        fpsFrames++;
        var t = now();
        if(!fpsFrom) fpsFrom = t;
        else if(t - fpsFrom >= 1000){
          fpsNow = Math.round(fpsFrames * 1000 / (t - fpsFrom) * 10) / 10;
          fpsFrames = 0; fpsFrom = t;
        }
      }
      sched();
    }
    function sched(){
      if(!on) return;
      /* requestVideoFrameCallback fires once per PRESENTED frame, which is
         exactly the cadence a blit wants: never the same frame twice, never a
         torn one, and it idles when the video does. rAF is the fallback. */
      if(vid.requestVideoFrameCallback) vid.requestVideoFrameCallback(draw);
      else rafId = requestAnimationFrame(draw);
    }

    function start(){
      if(!vid || on || blocked()) return;
      on = true;
      var pr = vid.play();
      if(pr && pr.catch) pr.catch(function(){});   /* the gesture kick below */
      sched();
    }
    function stop(){
      on = false; shown = false;
      if(rafId){ cancelAnimationFrame(rafId); rafId = 0; }
      if(vid){ try{ vid.pause(); }catch(e){} shownAt = vid.currentTime; }
      /* the posters come back behind the overlay, as they always did */
      for(var i=0;i<paint.length;i++) paint[i].el.classList.remove('live');
    }

    function boot(payload){
      cfg = payload;
      vid = document.createElement('video');
      vid.muted = true; vid.defaultMuted = true; vid.loop = true;
      vid.autoplay = true; vid.playsInline = true; vid.preload = 'auto';
      vid.setAttribute('muted',''); vid.setAttribute('loop','');
      vid.setAttribute('playsinline',''); vid.setAttribute('autoplay','');
      vid.setAttribute('webkit-playsinline','');
      /* assets.sie.market sends Access-Control-Allow-Origin: *, so the canvas
         stays untainted and its pixels can still be read back -- which is how
         the measurement hook proves a tile is really the right rectangle. */
      vid.crossOrigin = 'anonymous';
      /* NOT display:none, NOT hidden, NOT width 0: Safari declines to decode
         a video it believes is not being displayed. Two pixels off the edge
         of the page counts as displayed. */
      vid.style.cssText = 'position:fixed;left:-9px;top:0;width:2px;height:2px;'
                        + 'opacity:0.01;pointer-events:none;z-index:-1;';
      /* resolved against the MAP's url, not the asset root: the mp4 always
         sits beside its map, which keeps the pair working both at
         site/build/grid/ locally and at /grid/ on assets.sie.market. */
      vid.src = new URL(payload.mp4, new URL(GRID_URL, document.baseURI)).href;
      document.body.appendChild(vid);

      var q = queued; queued = [];
      q.forEach(attach);
      start();

      /* iOS Low Power Mode refuses autoplay even for a muted inline video.
         The first touch anywhere on the page starts it instead. */
      var kick = function(){
        if(vid.paused && !blocked()){ on = false; start(); }
        if(!vid.paused){
          document.removeEventListener('pointerdown', kick, true);
          document.removeEventListener('touchstart', kick, true);
        }
      };
      document.addEventListener('pointerdown', kick, true);
      document.addEventListener('touchstart', kick, true);

      /* v29: coming BACK to the page. A phone pauses a background tab's video
         and Safari restores a page from its back/forward cache with the video
         paused and this code still believing it is running. Either way: if
         the wall should be playing and is not, start it again. */
      var revive = function(){
        if(document.hidden || blocked()) return;
        if(vid.paused || !on){ on = false; shown = false; shownAt = -1; start(); }
      };
      window.addEventListener('pageshow', revive);
      document.addEventListener('visibilitychange', revive);
      window.addEventListener('focus', revive);
    }

    /* The map is small enough that one fetch brings the rectangles with it.
       Under prefers-reduced-motion nothing is fetched and every tile simply
       keeps its poster. */
    if(!REDUCE && window.fetch){
      /* assets.sie.market sends Cache-Control: immutable, max-age=31536000 on
         everything, which is right for a hashed MP4 and wrong for the pointer
         that names it -- an edge that cached latest.json for a year would
         never show a rebuilt grid. cache:'no-cache' only speaks to the
         browser, so the minute bucket is what gets past the edge: a fresh URL
         every 60s, and the same URL for everyone inside that minute. */
      fetch(GRID_URL + (GRID_URL.indexOf('?') < 0 ? '?' : '&')
                     + 't=' + Math.floor(Date.now() / 60000), { cache:'no-cache' })
        .then(function(r){ if(!r.ok) throw 0; return r.json(); })
        .then(boot)
        .catch(function(){});
    }

    /* The numbers this is judged on, read off the live page rather than
       claimed: decoders in use must be 1, fps at the wall, and how long until
       the first frame was actually on screen. */
    window.sieGrid = function(){
      var live = [].slice.call(document.querySelectorAll('video'))
                   .filter(function(v){ return !v.paused && v.readyState >= 2; });
      return {
        version: cfg && cfg.version,
        src: vid && vid.currentSrc,
        bytes: cfg && cfg.bytes,
        canvas: cfg && cfg.canvas,
        duration: cfg && cfg.duration,
        tiles_total: document.querySelectorAll('.vid[data-yt]').length,
        tiles_painted: paint.length,
        tiles_visible: paint.filter(function(p){ return p.vis; }).length,
        missing: cfg ? cfg.missing : null,
        decoders_video: live.length,
        decoders_iframe: document.querySelectorAll('.vid-thumb iframe').length,
        playing: !!(vid && !vid.paused),
        current_time: vid ? Math.round(vid.currentTime * 100) / 100 : null,
        fps: fpsNow,
        first_frame_ms: firstMs
      };
    };

    return { stop:stop, resume:start, startTile:function(){}, attach:attach,
             setBlocked:function(f){ blockedFn = f; },
             count:function(){ return paint.length; } };
  }

  /* Built immediately, so the map and the first bytes of the grid are in
     flight before the wall or the panel has asked for anything. */
  var WALL = gridWall();


  /* How many are actually playing, rather than how many were asked to. .live
     is toggled on PLAYING and off everything else, so it is the honest count;
     mounted is how many players exist. This is the hook the "all of them at
     once" claim gets checked with instead of asserted. */
  window.sieVid = function(){
    var t = [].slice.call(document.querySelectorAll('.vid[data-yt]'));
    var r = { tiles:t.length, mounted:0, playing:0, frames:0, stalled:[] };
    r.frames = document.querySelectorAll('.vid-thumb iframe').length;
    t.forEach(function(el){
      if(el.__siePlayer) r.mounted++;
      if(el.classList.contains('live')) r.playing++;
      else if(el.__siePlayer) r.stalled.push(el.getAttribute('data-yt'));
    });
    return r;
  };


  /* ---- one autoplay driver, shared by the wall and the panel's mini grid ----
     A tile in view holds a muted looping embed; a tile out of view gives it
     back. rootMargin is generous so tiles are already running by the time they
     are scrolled to, and MAX is a ceiling against a very tall grid rather than
     a policy — at 19 videos nothing on this site reaches it.
     `blocked` lets the large player claim playback while it is open. ---- */
  /* No ceiling. v25 capped this at 6 on a phone and 12 otherwise, because
     asking a phone for more streams than it can decode does not get you more
     video, it gets you more stalled players. That reasoning is still true --
     but it was our call to make, and the call is made: "I need to embed all
     the YouTube videos like this so they can play at the same time."

     What a device genuinely cannot serve is handled downstream rather than by
     refusing to try: the poster covers any tile that is not PLAYING, so a
     stalled player is an album cover and never YouTube's chrome, and the
     retry above keeps claiming decoders as they free up. */
  var PLAY_MAX = Infinity;

  function autoplay(tiles, opts){
    opts = opts || {};
    var MAX = opts.max || Infinity, live = [];
    function stopTile(el){
      if(el.__siePlayer){ el.__siePlayer.destroy(); el.__siePlayer = null; }
      el.classList.remove('previewing','live');
      var k = live.indexOf(el); if(k >= 0) live.splice(k, 1);
    }
    function stopAll(){ live.slice().forEach(stopTile); }
    function startTile(el){
      if(opts.blocked && opts.blocked()) return;
      if(el.classList.contains('previewing')) return;
      while(live.length >= MAX) stopTile(live[0]);
      var box = el.querySelector('.vid-thumb'); if(!box) return;
      /* The frame is transparent unless the player is PLAYING, so anything
         that is not playing shows our own poster instead of YouTube's -- whose
         loading AND paused states are both a title bar, a channel avatar, a
         centre glyph and a YouTube button.

         v22 added .live and never took it away, on the reasoning that a
         mid-play rebuffer should not flash the poster back. That was wrong on
         a phone. iOS runs out of video decoders somewhere around half this
         wall, pauses the players it cannot serve, and refuses to restart them
         -- so a tile that had played once sat there wearing YouTube's pause
         overlay for good. Measured on an iPhone: eleven of nineteen tiles
         showing the logo. A rebuffer is a few hundred milliseconds of poster;
         this was permanent. Toggle, not add. */
      el.__siePlayer = mountPlayer(box, el.getAttribute('data-yt'),
                                   { muted:true, loop:true,
                                     onState:function(d){
                                       /* PLAYING, or a rebuffer on a player
                                          that has already played. Dropping it
                                          on BUFFERING too would flash the
                                          poster every time the stream caught
                                          its breath -- measured on the live
                                          wall, a resume dips through state 3
                                          and the frame fell to opacity 0 for
                                          most of a second. Before the first
                                          play, BUFFERING is still YouTube's
                                          loading chrome, so the poster holds. */
                                       var p = el.__siePlayer;
                                       el.classList.toggle('live',
                                         d === 1 || (d === 3 && p && p.played));
                                     } });
      el.classList.add('previewing'); live.push(el);
    }
    /* ALL AT ONCE. The observer is the other half of why the wall never had
       nineteen players: a tile scrolled out of view was not paused, it was
       DESTROYED, and only what sat within 300px of the viewport existed at
       all. On a phone that is about six tiles.

       opts.all mounts every tile on load and never takes one away. stop() and
       resume() stay, because the large player still needs the wall to let go
       of the pipeline while it is open. */
    if(opts.all){
      tiles.forEach(function(el){ startTile(el); });
      return { stop: stopAll, startTile: startTile,
               resume: function(){ tiles.forEach(function(el){ startTile(el); }); },
               count: function(){ return live.length; } };
    }
    if(REDUCE || !('IntersectionObserver' in window))
      return { stop: stopAll, startTile: startTile, resume: function(){},
               count: function(){ return live.length; } };
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting) startTile(e.target); else stopTile(e.target);
      });
    }, { root: null, rootMargin: opts.rootMargin || '400px 0px', threshold: 0 });
    tiles.forEach(function(el){ io.observe(el); });
    /* An observer only speaks when an intersection CHANGES, so after playback
       has been taken away for some other reason nothing would bring it back.
       Re-observing a target makes the observer re-deliver its current state. */
    function resume(){
      tiles.forEach(function(el){ io.unobserve(el); io.observe(el); });
    }
    return { stop: stopAll, startTile: startTile, io: io, resume: resume,
             count: function(){ return live.length; } };
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
  var stage=gal.parentNode;
  /* which slide the 3D case is, found rather than hard-coded, because it has
     just moved to the front of the strip and will move again */
  var caseAt=[].indexOf.call(gal.children, gal.querySelector('.case-slide'));
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
    [].forEach.call(dots.children,function(d,j){ d.setAttribute('aria-current', j===i?'true':'false'); });
    /* the tilt button belongs to the 3D slide and to no other; the CSS hides
       it unless the stage is carrying this class */
    if(stage&&stage.classList) stage.classList.toggle('on-case', i===caseAt); }
  gal.addEventListener('scroll',function(){ requestAnimationFrame(sync); },{passive:true});
  sync();
  /* WRAPPING. "If you go past the last one it should go right back to the
     beginning. ... and then it swipes back all around."

     A scroll-snap strip physically cannot be scrolled past its own end, so
     there is no scroll event to react to -- the GESTURE has to be caught
     instead. A swipe, a trackpad flick or an arrow key that pushes against an
     end jumps to the other one.

     A drag that began inside the 3D canvas is excluded: that is someone
     turning the case, and it would otherwise throw the gallery to the far end
     of the strip every time they spun it. */
  function wrap(dir){ var i=index(); if(dir>0) go(i>=n-1?0:i+1); else go(i<=0?n-1:i-1); }
  function atEnd(){ return gal.scrollLeft >= gal.scrollWidth - gal.clientWidth - 2; }
  function atStart(){ return gal.scrollLeft <= 2; }

  var tx0=0, ty0=0, tid=null, fromCase=false;
  gal.addEventListener('pointerdown',function(e){
    tid=e.pointerId; tx0=e.clientX; ty0=e.clientY;
    fromCase=!!(e.target&&e.target.closest&&e.target.closest('.case3d'));
  },{passive:true});
  gal.addEventListener('pointerup',function(e){
    if(e.pointerId!==tid) return; tid=null;
    if(fromCase) return;
    var dx=e.clientX-tx0, dy=e.clientY-ty0;
    if(Math.abs(dx)<40 || Math.abs(dx)<Math.abs(dy)*1.5) return;
    if(dx<0 && atEnd()) go(0); else if(dx>0 && atStart()) go(n-1);
  },{passive:true});

  var wheelAt=0;
  gal.addEventListener('wheel',function(e){
    if(Math.abs(e.deltaX)<8 || Math.abs(e.deltaX)<Math.abs(e.deltaY)) return;
    var t=Date.now(); if(t-wheelAt<700) return;
    if(e.deltaX>0 && atEnd()){ wheelAt=t; go(0); }
    else if(e.deltaX<0 && atStart()){ wheelAt=t; go(n-1); }
  },{passive:true});

  document.addEventListener('keydown',function(e){ if(home&&home.hidden) return;
    if(e.key==='ArrowRight') wrap(1); if(e.key==='ArrowLeft') wrap(-1); });
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

  /* The panel's mini grid plays on the same terms as the wall: everything in it
     runs while the panel is open. No hover wiring and no pointer-type gate —
     v18 required the cursor to settle on one tile for 140ms and played only
     that tile, which is why hovering the caret showed a panel with 0 iframes.
     A closed panel is display:none, so its tiles are 0x0, do not intersect and
     stop themselves; stop() stays for the moment the panel is dismissed. */
  function wireMiniPreviews(grid){
    /* The panel samples the same one video as the wall, so its tiles cost
       nothing beyond a blit each: no second decoder, no iframes, and the
       panel's own non-intersection while it is display:none is what keeps
       even that blit from running. */
    WALL.attach([].slice.call(grid.querySelectorAll('.vid[data-yt]')));
    var a = { stop: function(){} };
    grid.addEventListener('mouseleave', function(){ /* kept: panel owns closing */ });
    return a.stop;
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
     Every tile in view plays, muted and looping, on every pointer type — the
     wall is already running when you arrive. Tiles out of view give their
     iframes back. Tapping a tile opens it large in a black overlay holding
     exactly ONE youtube-nocookie iframe, destroyed on close; while that is up
     the wall stops, so there is never a second soundless copy behind it.
     ===================================================================== */
  /* '.vids .vid', NOT '.vid': the index panel's mini grid uses the same tile
     markup, and an unscoped selector had the coarse-pointer observer starting
     four muted embeds inside the panel the moment it opened on a phone. */
  var tiles=[].slice.call(document.querySelectorAll('.vids .vid[data-yt]'));
  if(tiles.length){
    var overlay = null, overlayTile = null, pushed = false;
    var big = null, barTick = null;    /* the one large player, and its clock */
    var openTimers = [];               /* v29: the fallbacks armed by openPlayer */

    /* The whole wall, playing. `blocked` is read on every start, so while the
       large player is open the observer may fire as much as it likes and no
       tile behind it will come back to life. */
    /* v27 mounted nineteen YouTube players. v28 mounts none: the wall is
       nineteen canvases over one hidden video. The interface is deliberately
       the same -- stop/resume/startTile -- so the overlay below is untouched
       and still owns playback while it is open. */
    WALL.setBlocked(function(){ return !!overlay; });
    WALL.attach(tiles);
    var wall = WALL;
    function stopAllPreviews(){ wall.stop(); }
    function startPreview(el){ wall.startTile(el); }

    // ---------- the large player ----------
    function closePlayer(fromPop){
      if(!overlay) return;
      if(barTick){ clearInterval(barTick); barTick=null; }
      openTimers.forEach(clearTimeout); openTimers=[];
      if(big){ big.destroy(); big=null; }
      if(document.fullscreenElement){ try{ document.exitFullscreen(); }catch(e){} }
      overlay.parentNode.removeChild(overlay);
      overlay=null; overlayTile=null;
      document.body.classList.remove('playing-large');      /* bring the rail's muted tiles back */
      if(pushed && !fromPop){ pushed=false; try{ history.back(); }catch(e){} }
      if(fromPop) pushed=false;
      wall.resume();            /* the wall was stopped for the overlay's sake */
    }

    function openPlayer(el){
      var at = tileTime(el);    /* read the playhead BEFORE the tile is torn down */
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
      /* v29: the tile's own poster fills the frame while the player loads.
         v28 opened onto an empty black screen with a transport bar floating in
         the middle of it, for however long YouTube took. */
      var posterImg = el.querySelector('.vid-thumb img');
      if(posterImg && (posterImg.currentSrc || posterImg.src)){
        frame.style.backgroundImage = 'url("' + (posterImg.currentSrc || posterImg.src) + '")';
      }
      var stage=document.createElement('div');
      stage.className='player-stage';
      frame.appendChild(stage);

      /* Our own transport, because YouTube's is YouTube's branding. */
      var bar=document.createElement('div'); bar.className='pbar';
      var pp=document.createElement('button'); pp.type='button';
      pp.className='pbar-btn pbar-pp'; pp.setAttribute('aria-label','pause');
      var rail=document.createElement('div'); rail.className='pbar-rail';
      rail.setAttribute('role','slider'); rail.setAttribute('aria-label','seek');
      var fill=document.createElement('div'); fill.className='pbar-fill';
      rail.appendChild(fill);
      var clock=document.createElement('span'); clock.className='pbar-time';
      clock.textContent='0:00';
      var snd=document.createElement('button'); snd.type='button';
      snd.className='pbar-btn pbar-snd'; snd.setAttribute('aria-label','mute');
      bar.appendChild(pp); bar.appendChild(rail);
      bar.appendChild(clock); bar.appendChild(snd);
      frame.appendChild(bar);

      overlay.appendChild(close);
      overlay.appendChild(frame);
      document.body.appendChild(overlay);
      document.body.classList.add('playing-large');

      function clk(t){
        t=Math.max(0,Math.floor(t||0));
        var m=Math.floor(t/60), ss=t%60;
        return m+':'+(ss<10?'0':'')+ss;
      }
      function paint(){
        if(!big||!big.api) return;
        var d=0,t=0;
        try{ d=big.api.getDuration()||0; t=big.api.getCurrentTime()||0; }catch(e){ return; }
        fill.style.width = d ? (Math.min(1,t/d)*100).toFixed(2)+'%' : '0%';
        clock.textContent = clk(t) + (d?' / '+clk(d):'');
        rail.setAttribute('aria-valuetext', clk(t));
      }
      function seekFrom(ev){
        if(!big||!big.api) return;
        var r=rail.getBoundingClientRect(); if(!r.width) return;
        var x=(ev.clientX!=null?ev.clientX:(ev.touches&&ev.touches[0].clientX));
        if(x==null) return;
        var f=Math.max(0,Math.min(1,(x-r.left)/r.width)), d=0;
        try{ d=big.api.getDuration()||0; if(d) big.api.seekTo(f*d,true); }catch(e){}
        paint();
      }
      rail.addEventListener('click',function(e){ e.stopPropagation(); seekFrom(e); });
      pp.addEventListener('click',function(e){
        e.stopPropagation(); if(!big||!big.api) return;
        var playing=false;
        try{ playing = big.api.getPlayerState()===1; }catch(x){}
        if(playing){ big.wantPause=true; try{ big.api.pauseVideo(); }catch(x){}
                     pp.classList.add('is-paused'); pp.setAttribute('aria-label','play'); }
        else       { big.wantPause=false; try{ big.api.playVideo(); }catch(x){}
                     pp.classList.remove('is-paused'); pp.setAttribute('aria-label','pause'); }
      });
      snd.addEventListener('click',function(e){
        e.stopPropagation(); if(!big||!big.api) return;
        var m=false; try{ m=big.api.isMuted(); }catch(x){}
        try{ m ? big.api.unMute() : big.api.mute(); }catch(x){}
        snd.classList.toggle('is-muted', !m);
        snd.setAttribute('aria-label', m ? 'mute' : 'unmute');
      });

      /* The tile was already playing; the large one picks the playhead up
         rather than starting the video again from the top. */
      big = mountPlayer(stage, el.getAttribute('data-yt'),
                        { muted:false, loop:true, start:at,
                          onReady:function(){ paint(); },
                          /* same rule as a tile: black ground until it is
                             really playing, never YouTube's loading state */
                          onState:function(d){
                            if(!overlay) return;
                            if(d === 1){ overlay.classList.add('live'); return; }
                            /* v29: PAUSED that nobody asked for is the phone
                               refusing sound from a player it did not see the
                               tap land on. YouTube answers a pause by painting
                               its title, a centre button and a "More videos"
                               strip over the picture -- which is the mess the
                               player was opening into. So: the poster goes
                               back over it, and the video is started again
                               MUTED, which a phone always allows. The sound
                               button shows muted; one tap on it is a gesture
                               the phone accepts. */
                            if(d === 2 && big && !big.wantPause){
                              overlay.classList.remove('live');
                              if(!big.mutedStart){
                                big.mutedStart = true;
                                try{ big.api.mute(); big.api.playVideo(); }catch(x){}
                                snd.classList.add('is-muted');
                                snd.setAttribute('aria-label','unmute');
                              }
                            }
                          } });
      barTick = setInterval(paint, 250);

      /* v29: IT ALWAYS ENDS UP PLAYABLE. A phone may refuse to start a video
         with sound from a player that was built a moment AFTER the tap, and
         v28 then sat on a black screen for good -- the stage only appears on
         PLAYING. Two fallbacks, in order:
           1.6s  still not playing: start it muted (always allowed), and show
                 the sound button as muted so one tap brings the sound back
           4.5s  still not playing: show the player anyway and let touches
                 through to it, so YouTube's own play button can be pressed */
      openTimers.push(setTimeout(function(){
        if(!overlay || overlay.classList.contains('live') || !big || !big.api) return;
        try{ big.api.mute(); big.api.playVideo(); }catch(x){}
        snd.classList.add('is-muted'); snd.setAttribute('aria-label','unmute');
      }, 1600));
      openTimers.push(setTimeout(function(){
        if(!overlay || overlay.classList.contains('live')) return;
        overlay.classList.add('live'); overlay.classList.add('manual');
      }, 4500));

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
      if(!overlay) wall.resume();
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
