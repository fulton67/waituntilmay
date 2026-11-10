/* sie.v35.js — sie.market. No dependencies of our own; the video half
   loads YouTube's IFrame API, for the reasons in §2.

   v35 is the gesture round. The wall is a ladder of column counts now: a
   pinch walks it, the last rung in is the film itself, and pinching back out
   of a film opened that way puts it back on the shelf. Past the film there is
   one more step, where the 16:9 band gives way and the picture fills the
   screen. See §1b and §1c.

   v34 is the player round. The large player is built once and kept instead
   of once per open, which is what lets a tap arrive at a player that already
   exists and therefore start with sound; the picture inside it zooms with the
   usual two-finger gesture; and the close is the two hairlines the comment
   beside it has always claimed, with no glass ring around them.

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
    /* v34: a warm player is built before anybody has asked to watch anything,
       so it must not start anything. It loads, answers, and waits -- a cued
       player holds no decoder -- until the tap that opens it hands it a video
       with loadVideoById. See §2. */
    if(o.warm) vars.autoplay = 0;
    /* NOT loop=1&playlist=id. That is how you loop a src-string embed, but it
       puts the player in playlist mode, and a playlist player paints its own
       transport -- previous, pause, next, the channel avatar, the title and a
       YouTube button -- over the picture whenever it is not cleanly playing.
       Measured on the wall: two tiles in twelve wearing it at any moment. The
       loop is done in onStateChange instead, where ENDED never survives long
       enough to be drawn. */
    if(o.start) vars.start = Math.max(0, Math.floor(o.start));
    /* v30: ask for the film at its real quality. YouTube chooses a stream
       from the size of the frame and the connection, and on a phone-sized
       frame that is often 360p of a video shot in 4K. Neither of these is a
       promise -- YouTube treats them as a preference -- but both are honoured
       often enough to be worth saying. Only the large player says it. */
    if(o.hd) vars.vq = 'hd1080';

    YTAPI(function(YT){
      if(h.dead) return;
      h.api = new YT.Player(host, {
        host:'https://www.youtube-nocookie.com', videoId:id, playerVars:vars,
        events:{
          onReady:function(e){
            noCaptions(e.target);
            try{ o.muted ? e.target.mute() : e.target.unMute(); }catch(x){}
            if(o.hd){ try{ e.target.setPlaybackQuality('hd1080'); }catch(x){} }
            if(o.start){ try{ e.target.seekTo(o.start, true); }catch(x){} }
            if(!o.warm){ try{ e.target.playVideo(); }catch(x){} }
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
        if(onVideos){
          /* v31: on the videos page the pill says "shop", so what it opens is
             the shop -- the CD, its name and its price, one tap from the page
             that sells it. v30 opened a small grid of videos here: videos on
             top of the videos you were already looking at. */
          /* v33: not a picture of the case -- the case. The same model the
             shop page opens on, floating and turning in the panel, and the
             whole panel is the way back to it. No words: the pill above it
             already says "shop". case.v11.js finds this mount by its
             data-case-mini attribute and only starts drawing once the panel
             is actually open. */
          var card = document.createElement('a');
          card.className = 'sie-shopcard'; card.href = dest;
          card.setAttribute('aria-label', 'the cd \u2014 go to the shop');
          var mini = document.createElement('div');
          mini.className = 'case3d-mini';
          mini.setAttribute('data-case-mini', '');
          card.appendChild(mini);
          cols.appendChild(card);
        }else{
          var grid = document.createElement('div');
          grid.className = 'sie-mini';
          FEED.forEach(function(v){ grid.appendChild(miniTile(v)); });
          cols.appendChild(grid);
          stop = wireMiniPreviews(grid);
        }
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
     §1b  PINCH, PAN, DOUBLE TAP -- inside the open player

     The picture is a cross-origin iframe. Nothing inside it can be zoomed and
     nothing inside it can be asked to, so this does what the photo viewers do:
     it leaves the picture alone and moves the layer the picture sits in. Two
     fingers scale it about the point between them, one finger slides it once
     it is bigger than its frame, a double tap toggles 1x and 2.5x about the
     tap. The transport and the close are outside the zoomed layer and do not
     move with it.

     Two things sit at the ends of that range, and both are v35:

     OUT. A player opened by pinching off the wall can be pinched shut again:
     below 1x it keeps going, with resistance, and letting go small enough
     closes it. A player opened by TAPPING a tile cannot -- it stops dead at
     1x, because "if you click on a video you shouldn't be able to zoom out,
     you would have to press the X".

     IN. The frame is a 16:9 box, which on a phone held upright is a 219px
     band in the middle of an 844px screen, and no amount of scaling inside
     that band fills the screen. So at the scale where the picture WOULD cover
     the viewport, the band goes: the frame becomes the viewport, the stage
     becomes the smallest 16:9 box that covers it, and the scale is divided by
     exactly that cover factor so the picture is the same size on screen on
     both sides of the switch. Coming back out multiplies it back. On a 16:9
     window the cover factor is 1 and the whole step is a no-op, correctly --
     there is no letterbox there to remove.
     ===================================================================== */
  function pinchZoom(frame, layer, o){
    o = o || {};
    var MIN = 1, MAX = 4, SNAP = 2.5;
    var SHUT = 0.84, FLOOR = 0.5, RUBBER = 0.55;
    var s = MIN, tx = 0, ty = 0, bleed = false;
    var g = null, drag = null, tapAt = 0, tapXY = null;

    /* How much the 16:9 fit box has to grow before it covers the viewport.
       Computed from the viewport rather than measured, because once we are in
       bleed the frame IS the viewport and the fit box is no longer on screen
       to measure. */
    function cover(){
      var vw = window.innerWidth, vh = window.innerHeight;
      var fw = Math.min(vw, vh * 16 / 9), fh = fw * 9 / 16;
      if(!(fw > 0 && fh > 0)) return 1;
      return Math.max(vw / fw, vh / fh);
    }
    function canBleed(){ return cover() > 1.001; }
    /* In the band the ceiling has to sit ABOVE the cover factor or the switch
       is unreachable: a 390x932 phone needs 4.25x to cover, which is past MAX,
       so capping normal mode at MAX would mean the band never goes. */
    function ceiling(){
      if(bleed) return MAX;
      return canBleed() ? cover() * 1.25 : MAX;
    }
    function floor(){
      if(bleed) return 1;
      return (o.dismissable && o.dismissable()) ? FLOOR : MIN;
    }
    function box(){
      var r = frame.getBoundingClientRect();
      return { fw:r.width, fh:r.height, cx:r.left + r.width / 2,
               cy:r.top + r.height / 2,
               lw:layer.offsetWidth || r.width,
               lh:layer.offsetHeight || r.height };
    }
    /* The pan budget is the layer's own size against the frame's, not the
       frame's against itself: in bleed the layer is already larger than the
       frame at scale 1, and the old formula would have pinned it dead centre. */
    function clamp(){
      var b = box();
      if(s > MAX) s = MAX;
      if(s <= MIN && !bleed && !(o.dismissable && o.dismissable())){
        s = MIN; tx = 0; ty = 0; return;
      }
      var mx = Math.max(0, (b.lw * s - b.fw) / 2);
      var my = Math.max(0, (b.lh * s - b.fh) / 2);
      tx = Math.max(-mx, Math.min(mx, tx));
      ty = Math.max(-my, Math.min(my, ty));
    }
    function setBleed(on){
      if(on === bleed) return;
      var c = cover(); if(!(c > 0)) return;
      bleed = on;
      s = on ? s / c : s * c;        /* same size on screen across the switch */
      if(o.onBleed) o.onBleed(on);
      tx = 0; ty = 0;
    }
    function apply(ms){
      layer.style.transition = ms
        ? 'transform ' + ms + 'ms cubic-bezier(.2,.8,.2,1)' : 'none';
      layer.style.transform = 'translate3d(' + tx.toFixed(2) + 'px,'
        + ty.toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
      frame.classList.toggle('zoomed', bleed || s > MIN + 0.01);
      if(o.onScale) o.onScale(s, bleed);
    }
    /* Past either end the gesture keeps moving, with resistance, so a pinch
       that overshoots does not feel like a wall. */
    function band(v){
      var lo = floor(), hi = ceiling();
      if(v < lo){ var u = (lo - v) / lo; return lo - lo * (1 - Math.pow(1 + u, -RUBBER)); }
      if(v > hi){ var d = (v - hi) / hi; return hi + hi * (1 - Math.pow(1 + d, -RUBBER)); }
      return v;
    }
    /* Scale to ns while whatever is under (ax,ay) stays under (ax,ay). A point
       c of the picture is drawn at t + c*s from the centre, so c is (p-t)/s,
       and holding it still across a change of scale is the line below. Same
       arithmetic for a pinch, a double tap and a wheel. */
    function to(ns, ax, ay, ms){
      var b = box();
      var px = ax - b.cx, py = ay - b.cy;
      ns = Math.max(0.01, Math.min(MAX, ns));
      tx = px - (px - tx) * (ns / s);
      ty = py - (py - ty) * (ns / s);
      s = ns;
      cross();
      clamp(); apply(ms);
    }
    /* The band goes at the scale where the picture would cover the viewport,
       and comes back at scale 1 in bleed units -- which are the same point.
       The two tests therefore need to straddle it rather than meet at it, or a
       scale sitting exactly on the boundary switches every frame: going in
       divides by the cover factor and lands just above 1, coming back
       multiplies by it and lands just on cover again. 4% apart is enough. */
    function cross(){
      if(!bleed && canBleed() && s > cover() * 1.04){ setBleed(true); }
      else if(bleed && s < 0.96){ setBleed(false); }
    }
    function ours(e){
      var t = e.target;
      return !(t && t.closest && t.closest('.pbar-btn,.pbar-rail,.player-x'));
    }
    function dist(t){
      var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function mid(t){
      return t.length > 1
        ? { x:(t[0].clientX + t[1].clientX) / 2, y:(t[0].clientY + t[1].clientY) / 2 }
        : { x:t[0].clientX, y:t[0].clientY };
    }
    function base(t){
      return { n:t.length, d:(t.length > 1 ? dist(t) : 0), m:mid(t),
               s:s, tx:tx, ty:ty, bleed:bleed, moved:false };
    }
    function grabbing(){ return !!g && (g.n > 1 || bleed || s > MIN + 0.01); }

    frame.addEventListener('touchstart', function(e){
      if(!ours(e)){ g = null; return; }
      g = base(e.touches);
      if(g.n > 1) e.preventDefault();
    }, { passive:false });

    frame.addEventListener('touchmove', function(e){
      if(!g) return;
      var t = e.touches, m = mid(t);
      if(Math.abs(m.x - g.m.x) > 6 || Math.abs(m.y - g.m.y) > 6) g.moved = true;
      if(!grabbing()) return;
      e.preventDefault();
      var b = box();
      if(t.length > 1 && g.d){
        /* Re-derive the anchor every frame from the baseline, so the pinch is
           measured from where it started even after a bleed switch has
           renormalised the scale underneath it. */
        var want = g.s * dist(t) / g.d;
        if(g.bleed !== bleed){ var c = cover();
          want = bleed ? g.s * dist(t) / g.d / c : g.s * dist(t) / g.d * c; }
        var ns = band(want);
        var ax = (g.m.x - b.cx - g.tx) / g.s, ay = (g.m.y - b.cy - g.ty) / g.s;
        s = ns; tx = (m.x - b.cx) - ax * ns; ty = (m.y - b.cy) - ay * ns;
        cross();
      }else{
        tx = g.tx + (m.x - g.m.x); ty = g.ty + (m.y - g.m.y);
      }
      clamp(); apply(0);
    }, { passive:false });

    function end(e){
      if(!g) return;
      if(e.touches && e.touches.length){ g = base(e.touches); return; }
      var was = g; g = null;
      /* small enough, and allowed to: the player goes back on the shelf */
      if(!bleed && s < SHUT && o.dismissable && o.dismissable()){
        if(o.onDismiss){ o.onDismiss(); return; }
      }
      if(!bleed && s <= MIN + 0.01){ s = MIN; tx = 0; ty = 0; apply(220); }
      else { clamp(); apply(180); }
      if(was.moved || was.n > 1) return;
      var ct = e.changedTouches && e.changedTouches[0]; if(!ct) return;
      var now = Date.now();
      if(now - tapAt < 330 && tapXY
         && Math.abs(ct.clientX - tapXY.x) < 36
         && Math.abs(ct.clientY - tapXY.y) < 36){
        tapAt = 0; tapXY = null;
        e.preventDefault();
        to((bleed || s > MIN + 0.01) ? MIN : SNAP, ct.clientX, ct.clientY, 260);
      }else{
        tapAt = now; tapXY = { x:ct.clientX, y:ct.clientY };
      }
    }
    frame.addEventListener('touchend', end, { passive:false });
    frame.addEventListener('touchcancel', end, { passive:false });

    /* Safari takes a pinch through its own gesture events whatever
       touch-action says, and a page zoomed inside a fixed black overlay is a
       state there is no obvious way out of. */
    ['gesturestart','gesturechange','gestureend'].forEach(function(n){
      frame.addEventListener(n, function(e){ e.preventDefault(); }, { passive:false });
    });

    frame.addEventListener('wheel', function(e){
      if(!e.ctrlKey || !ours(e)) return;
      e.preventDefault();
      to(band(s * Math.exp(-e.deltaY / 160)), e.clientX, e.clientY, 0);
    }, { passive:false });
    frame.addEventListener('dblclick', function(e){
      if(!ours(e)) return;
      e.preventDefault();
      to((bleed || s > MIN + 0.01) ? MIN : SNAP, e.clientX, e.clientY, 260);
    });
    frame.addEventListener('mousedown', function(e){
      if(e.button !== 0 || !(bleed || s > MIN + 0.01) || !ours(e)) return;
      e.preventDefault();
      drag = { x:e.clientX, y:e.clientY, tx:tx, ty:ty };
    });
    window.addEventListener('mousemove', function(e){
      if(!drag) return;
      tx = drag.tx + (e.clientX - drag.x); ty = drag.ty + (e.clientY - drag.y);
      clamp(); apply(0);
    });
    window.addEventListener('mouseup', function(){ drag = null; });

    return {
      reset: function(){
        if(bleed) setBleed(false);
        s = MIN; tx = 0; ty = 0; g = null; drag = null; apply(0);
      },
      scale: function(){ return Math.round(s * 1000) / 1000; },
      pan:   function(){ return [Math.round(tx), Math.round(ty)]; },
      bleed: function(){ return bleed; },
      to:    to
    };
  }

  /* =====================================================================
     §1c  THE WALL ZOOMS

     Pinching the wall changes how many videos are across, the way a photo
     grid does, and the last rung in is one video -- which here is not a layout
     state but the player, opened on whichever tile was under the fingers.

     ONE IDEA, and everything else follows from it: during the gesture the
     layout never changes. The whole grid takes a single transform with
     transform-origin 0 0, which runs on the compositor with no reflow and no
     per-tile work. On release the column count changes ONCE, and each tile is
     animated from where it was being drawn to where it now belongs -- read its
     position, set the new layout, read the new position, put it back with a
     transform, then let it go. A column change moves tiles between rows, and
     one container transform cannot express that, so the settle has to be per
     tile or it reads as a jump.

     Two details are worth keeping in mind, because both are easy to get wrong
     and neither is obvious:

     - the focal tile is the NEAREST CENTRE to the fingers, never the tile
       the midpoint is inside. The midpoint of two fingers usually lands in a
       gap, and a containment test then has nothing to return.
     - the "before" position is COMPUTED from the live transform, not measured.
       Measuring reads a layout that is not what is on screen.
     ===================================================================== */
  function railZoom(grid, o){
    o = o || {};
    /* Eighteen films. The dense end is one row of them; the sparse end is two
       across, with the film itself one step further. The steps are close
       enough together that the settle lands near where the fingers stopped. */
    var LADDER = { wide:   { cols:[18,14,12,10,9,8,7,6,5,4,3,2], def:7 },
                   narrow: { cols:[9,7,6,5,4,3,2],               def:5 } };
    var DUR_MIN = 300, DUR_MAX = 550, RATE_FAST = 0.012, STAGGER = 70;
    var EASE = 'cubic-bezier(.25,.1,.25,1)';
    var RUBBER = 0.55, WHEEL_K = 0.01;
    var VEL_MS = 80, VEL_TRIP = 0.0022, AIM_TRIP = 0.0008;
    var KEY = 'sie-wall-rung', WHEEL_END = 140;

    var pts = {}, nPts = 0, gesture = null, raf = null;
    var flipped = null, flipTimer = null, wheelTimer = null;
    var target = null, focus = 0;
    var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

    function narrow(){ return !window.matchMedia('(min-width:900px)').matches; }
    function lad(){ return narrow() ? LADDER.narrow : LADDER.wide; }
    function rungs(){ return lad().cols.length + 1; }
    function single(){ return lad().cols.length; }
    function colsAt(i){ return i === single() ? 1 : lad().cols[i]; }
    function tiles(){ return grid.querySelectorAll('.vid[data-yt]'); }
    var level = lad().def;
    try{
      var saved = parseInt(window.localStorage.getItem(KEY), 10);
      if(saved >= 0 && saved < rungs() && saved !== single()) level = saved;
    }catch(e){}

    function gap(){
      return parseFloat(window.getComputedStyle(grid).columnGap) || 8;
    }
    /* What one tile is WIDE at a rung. This is the axis the whole gesture is
       measured on -- scale is a ratio of tile widths, never of column counts,
       which is why the rungs do not need to be evenly spaced. */
    function tileW(i){
      if(i === single()){
        return Math.max(1, Math.min(window.innerWidth,
                                    window.innerHeight * 16 / 9));
      }
      var cw = grid.clientWidth || 1, n = colsAt(i);
      return Math.max(1, (cw - (n - 1) * gap()) / n);
    }
    function ratio(a, b){ return tileW(b) / tileW(a); }
    function band(v){
      var lo = ratio(level, 0), hi = ratio(level, rungs() - 1);
      if(v < lo){ var u = (lo - v) / lo; return lo - lo * (1 - Math.pow(1 + u, -RUBBER)); }
      if(v > hi){ var d = (v - hi) / hi; return hi + hi * (1 - Math.pow(1 + d, -RUBBER)); }
      return v;
    }

    function paintLevel(){
      grid.style.setProperty('--cols', colsAt(level));
      /* the row gap was sized around a label that is display:none; past the
         default rung the tiles are small and that gap is most of the screen */
      if(colsAt(level) > colsAt(lad().def)) grid.style.setProperty('--row-gap', gap() + 'px');
      else grid.style.removeProperty('--row-gap');
      try{ window.localStorage.setItem(KEY, String(level)); }catch(e){}
      if(o.onLevel) o.onLevel(level, colsAt(level));
    }

    function mark(i){
      var all = tiles(), el = i >= 0 ? all[i] : null;
      if(el === target) return;
      if(target) target.classList.remove('is-target');
      target = el;
      if(el) el.classList.add('is-target');
      grid.classList.toggle('is-aiming', !!el);
    }
    function nearest(list, x, y){
      var best = 0, bd = Infinity;
      for(var i = 0; i < list.length; i++){
        var r = list[i];
        var dx = r.x + r.w / 2 - x, dy = r.y + r.h / 2 - y;
        var d = dx * dx + dy * dy;
        if(d < bd){ bd = d; best = i; }
      }
      return best;
    }

    /* A settle that is still running is baked into inline transforms, so a new
       gesture starts from what is ON SCREEN rather than from wherever the
       animation was heading. */
    function freeze(){
      if(!flipped) return;
      clearTimeout(flipTimer); flipTimer = null;
      flipped.forEach(function(el){
        var t = window.getComputedStyle(el).transform;
        el.style.transition = 'none';
        el.style.transform = (t && t !== 'none') ? t : '';
      });
      grid.classList.remove('is-flipping');
    }
    function clearTiles(){
      var a = flipped || tiles();
      for(var i = 0; i < a.length; i++){
        a[i].style.transition = ''; a[i].style.transform = '';
        a[i].style.transformOrigin = '';
      }
    }
    function endFlip(){
      clearTimeout(flipTimer); flipTimer = null;
      clearTiles(); flipped = null;
      grid.classList.remove('is-flipping');
    }

    function begin(px, py, d0){
      freeze();
      var gr = grid.getBoundingClientRect(), all = tiles();
      var cells = new Array(all.length);
      for(var i = 0; i < all.length; i++){
        var r = all[i].getBoundingClientRect();
        cells[i] = { el:all[i], x:r.left - gr.left, y:r.top - gr.top,
                     w:r.width, h:r.height };
      }
      var lx = px - gr.left, ly = py - gr.top;
      focus = nearest(cells, lx, ly);
      gesture = { d0:d0 || 1, anchor:{ x:lx, y:ly }, cells:cells,
                  gr0:{ left:gr.left, top:gr.top }, s:1, t:{ x:0, y:0 },
                  samples:[] };
      grid.classList.add('is-zooming');
      grid.style.transformOrigin = '0 0';
    }
    function rate(){
      var v = gesture.samples; if(v.length < 2) return 0;
      var a = v[0], b = v[v.length - 1], dt = b.t - a.t;
      return dt > 0 ? (Math.log(b.s) - Math.log(a.s)) / dt : 0;
    }
    function velocity(){
      var v = gesture.samples; if(v.length < 2) return 0;
      var a = v[0], b = v[v.length - 1], dt = b.t - a.t;
      return dt > 0 ? (b.s - a.s) / dt : 0;
    }
    /* p is the point under the fingers, in grid-local coordinates. */
    function move(p, s){
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      gesture.samples.push({ t:now, s:s });
      while(gesture.samples.length > 1 && now - gesture.samples[0].t > VEL_MS){
        gesture.samples.shift();
      }
      /* Zooming IN hard means choosing a film rather than a density: the grid
         stops following the fingers and the anchor is re-derived every frame,
         so you can slide across the wall to pick one while what is under your
         fingers stays put. */
      var aiming = rate() > AIM_TRIP;
      if(aiming){
        var tp = gesture.t, sp = gesture.s || 1;
        gesture.anchor = { x:(p.x - tp.x) / sp, y:(p.y - tp.y) / sp };
      }
      var t = { x:p.x - s * gesture.anchor.x, y:p.y - s * gesture.anchor.y };
      focus = nearest(gesture.cells, gesture.anchor.x, gesture.anchor.y);
      mark(aiming ? focus : -1);
      gesture.s = s; gesture.t = t;
      grid.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px) scale(' + s + ')';
    }
    /* Nearest rung in LOG space: the axis is a ratio, so the distance that
       matters is a ratio too. On a linear axis the sparse end crowds together
       and every release snaps back to the same rung. */
    function pick(s, v){
      var best = level, bd = Infinity;
      for(var i = 0; i < rungs(); i++){
        var r = ratio(level, i); if(!(r > 0)) continue;
        var d = Math.abs(Math.log(r) - Math.log(s));
        if(d < bd){ bd = d; best = i; }
      }
      if(Math.abs(v) > VEL_TRIP){
        var n = best + (v > 0 ? 1 : -1);
        if(n >= 0 && n < rungs()) best = n;
      }
      return best;
    }

    function commit(){
      try{ settle(); }
      catch(err){
        gesture = null;
        grid.classList.remove('is-zooming', 'is-aiming', 'is-flipping');
        grid.style.transform = ''; grid.style.transformOrigin = '';
        clearTiles(); flipped = null; mark(-1); paintLevel();
      }
    }
    function settle(){
      if(!gesture) return;
      if(raf !== null){ cancelAnimationFrame(raf); raf = null; }
      var G = gesture, s = G.s, t = G.t, cells = G.cells;
      var to = pick(s, velocity());
      var dur = Math.round(DUR_MAX - Math.min(Math.abs(rate()) / RATE_FAST, 1)
                           * (DUR_MAX - DUR_MIN));
      gesture = null;

      /* BEFORE, computed from the transform that is on screen. */
      var first = cells.map(function(c){
        return { x:G.gr0.left + c.x * s + t.x, y:G.gr0.top + c.y * s + t.y,
                 w:c.w * s, h:c.h * s };
      });
      var el = cells[focus] ? cells[focus].el : null;
      grid.classList.remove('is-zooming');
      grid.style.transform = ''; grid.style.transformOrigin = '';
      mark(-1);

      /* The last rung is the film. The wall keeps the density it had, so
         closing the player puts it back exactly as it was. */
      if(to === single()){
        clearTiles();
        if(el && o.onSingle) o.onSingle(el);
        return;
      }

      var anchorY = first[focus] ? first[focus].y + first[focus].h / 2 : null;
      level = to;
      paintLevel();                       /* the one reflow */
      clearTiles();

      /* A column change changes the page height, so the browser re-clamps the
         scroll offset and the wall slides out from under the tile that was
         being aimed at. Put it back before anything is measured. */
      if(anchorY !== null && el){
        var fr = el.getBoundingClientRect();
        var dy = fr.top + fr.height / 2 - anchorY;
        if(Math.abs(dy) > 0.5) window.scrollBy(0, dy);
      }
      if(REDUCED.matches) return;

      var last = cells.map(function(c){
        var q = c.el.getBoundingClientRect();
        return { x:q.left, y:q.top, w:q.width };
      });
      flipped = cells.map(function(c){ return c.el; });   /* at INVERT, not PLAY */
      grid.classList.add('is-flipping');
      var fx = last[focus].x, fy = last[focus].y, far = 1;
      var away = last.map(function(l){
        var d = Math.sqrt((l.x - fx) * (l.x - fx) + (l.y - fy) * (l.y - fy));
        if(d > far) far = d;
        return d;
      });
      cells.forEach(function(c, i){
        var sc = last[i].w > 0 ? first[i].w / last[i].w : 1;
        c.el.style.transition = 'none';
        c.el.style.transformOrigin = '0 0';
        c.el.style.transform = 'translate(' + (first[i].x - last[i].x) + 'px,'
          + (first[i].y - last[i].y) + 'px) scale(' + sc + ')';
        c.el.__sieDelay = Math.round(away[i] / far * STAGGER);
      });
      requestAnimationFrame(function(){ requestAnimationFrame(function(){
        cells.forEach(function(c){
          c.el.style.transition = 'transform ' + dur + 'ms ' + EASE + ' '
            + c.el.__sieDelay + 'ms';
          c.el.style.transform = 'none';
        });
        clearTimeout(flipTimer);
        flipTimer = setTimeout(endFlip, dur + STAGGER + 60);
      }); });
    }

    /* ---- the pinch itself -------------------------------------------------
       On the DOCUMENT, not the grid: the second finger regularly lands outside
       the wall, and a pointer we never see is a pointer the browser keeps --
       at which point it zooms the page instead. */
    function blocked(){ return !!(o.blocked && o.blocked()); }
    function lock(on){
      document.documentElement.classList.toggle('sie-pinch', !!on);
    }
    function pair(){
      var a = []; for(var k in pts) if(pts.hasOwnProperty(k)) a.push(pts[k]);
      return a;
    }
    document.addEventListener('pointerdown', function(e){
      if(e.pointerType === 'mouse' || blocked()) return;
      if(!pts[e.pointerId]) nPts++;
      pts[e.pointerId] = { x:e.clientX, y:e.clientY };
      if(nPts === 2){
        lock(true);
        var p = pair();
        begin((p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2,
              Math.sqrt(Math.pow(p[0].x - p[1].x, 2) + Math.pow(p[0].y - p[1].y, 2)));
      }
    }, { passive:false });
    document.addEventListener('pointermove', function(e){
      if(!pts[e.pointerId]) return;
      pts[e.pointerId] = { x:e.clientX, y:e.clientY };
      if(!gesture) return;
      e.preventDefault();
      if(raf !== null) return;
      raf = requestAnimationFrame(function(){
        raf = null;
        if(!gesture || nPts < 2) return;
        var p = pair();
        var d = Math.sqrt(Math.pow(p[0].x - p[1].x, 2)
                          + Math.pow(p[0].y - p[1].y, 2)) || 1;
        move({ x:(p[0].x + p[1].x) / 2 - gesture.gr0.left,
               y:(p[0].y + p[1].y) / 2 - gesture.gr0.top },
             band(d / gesture.d0));
      });
    }, { passive:false });
    function release(e){
      if(pts[e.pointerId]){ delete pts[e.pointerId]; nPts--; }
      if(nPts < 2){ lock(false); if(gesture) commit(); }
      if(nPts < 0) nPts = 0;
    }
    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);
    document.addEventListener('touchmove', function(e){
      if(e.touches.length >= 2 && !blocked()) e.preventDefault();
    }, { passive:false });
    ['gesturestart','gesturechange','gestureend'].forEach(function(n){
      document.addEventListener(n, function(e){
        if(!blocked()) e.preventDefault();
      }, { passive:false });
    });

    /* A trackpad pinch arrives as a wheel event with ctrlKey. A plain wheel is
       the page scrolling and is left alone. */
    grid.addEventListener('wheel', function(e){
      if(!e.ctrlKey || blocked()) return;
      e.preventDefault();
      if(!gesture) begin(e.clientX, e.clientY, 1);
      move({ x:e.clientX - gesture.gr0.left, y:e.clientY - gesture.gr0.top },
           band(gesture.s * Math.exp(-e.deltaY * WHEEL_K)));
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(commit, WHEEL_END);
    }, { passive:false });

    /* Crossing the breakpoint swaps the ladder under us; keep the column count
       the viewer was actually looking at rather than snapping to the default. */
    var wasNarrow = narrow();
    window.addEventListener('resize', function(){
      if(narrow() === wasNarrow) return;
      wasNarrow = narrow();
      var want = colsAt(Math.min(level, rungs() - 1));
      var best = lad().def, bd = Infinity;
      for(var i = 0; i < rungs(); i++){
        var d = Math.abs(colsAt(i) - want);
        if(d < bd){ bd = d; best = i; }
      }
      level = best; paintLevel();
    });

    paintLevel();
    return {
      level: function(){ return level; },
      cols:  function(){ return colsAt(level); },
      rungs: function(){ return rungs(); },
      focus: function(){ return focus; },
      set:   function(i){ level = Math.max(0, Math.min(single() - 1, i)); paintLevel(); }
    };
  }

  /* =====================================================================
     §2  THE WALL AND THE LARGE PLAYER
     Every tile in view plays, muted and looping, on every pointer type — the
     wall is already running when you arrive. Tiles out of view give their
     iframes back. Tapping a tile opens it large in a black overlay holding
     exactly ONE youtube-nocookie iframe, built on the visit's first touch and
     kept, paused and parked, between opens; while that is up the wall stops,
     so there is never a second soundless copy behind it.
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
    /* v34 builds ONE player and keeps it, where v28-v33 built one per open and
       destroyed it on close.

       "when you open a video / click on it it should auto unmute". It has been
       asking for sound all along -- mountPlayer is called with muted:false --
       and the ask was being refused for a reason that is about timing, not
       about policy. A phone gives sound to a player it can see the tap land
       on. Until now there was no player when the tap landed: the tap built an
       iframe, the iframe fetched YouTube's script, the script answered onReady
       two or three hundred milliseconds later, and only then did anything ask
       to play. By then the gesture was long over, the phone refused, YouTube
       paused, and the v29 fallback restarted it muted -- which is correct
       behaviour, and silent.

       So the frame is built on the first touch ANYWHERE on the page, which on
       a wall of videos is a scroll, seconds before any tile is tapped, and is
       then kept for the rest of the visit. unMute() and loadVideoById() are
       called inside the tap handler itself, synchronously, on a player that is
       already loaded and listening. A visitor whose very first touch of the
       visit is the tile itself still gets the old cold path, and every
       fallback below still covers it.

       Keeping it has a second payoff: the transport, the gesture and the
       handlers are built and bound once rather than on every open. Closed, the
       player is paused, muted, inert, and parked behind the page -- .player.off
       -- rather than removed, because an iframe taken out of the document is
       an iframe that has to load all over again. */
    /* How the open player was entered, which is the only thing that decides
       whether it can be pinched shut again. */
    var fromPinch = false, rail = null;
    var shell = null, frame = null, stage = null, zoomBox = null, hint = null;
    var closeBtn = null, ppBtn = null, sndBtn = null;
    var railEl = null, fillEl = null, clockEl = null, zoom = null;

    function clk(t){
      t = Math.max(0, Math.floor(t || 0));
      var m = Math.floor(t / 60), ss = t % 60;
      return m + ':' + (ss < 10 ? '0' : '') + ss;
    }
    function muted(){
      try{ return big && big.api ? !!big.api.isMuted() : true; }
      catch(e){ return true; }
    }
    /* The sound button and the prompt are read off the player rather than set
       from whatever was last asked for, because asking is exactly the thing
       that does not always work. */
    function soundUI(){
      var m = muted();
      if(sndBtn){
        sndBtn.classList.toggle('is-muted', m);
        sndBtn.setAttribute('aria-label', m ? 'unmute' : 'mute');
      }
      if(!m && hint) hint.hidden = true;
      return m;
    }
    function askSound(){
      if(!big || !big.api) return;
      big.wantMute = false;
      try{ big.api.unMute(); big.api.setVolume(100); }catch(e){}
      soundUI();
    }
    /* Only ever up while the player is really silent, and never when the
       silence was asked for: somebody who has just pressed mute does not need
       to be told where the sound is. */
    function showHint(){
      if(!hint || !overlay || !muted()) return;
      if(big && big.wantMute) return;
      hint.hidden = false;
      openTimers.push(setTimeout(function(){ if(hint) hint.hidden = true; }, 4600));
    }
    function paint(){
      if(!big || !big.api) return;
      var d = 0, t = 0;
      try{ d = big.api.getDuration() || 0; t = big.api.getCurrentTime() || 0; }
      catch(e){ return; }
      fillEl.style.width = d ? (Math.min(1, t / d) * 100).toFixed(2) + '%' : '0%';
      clockEl.textContent = clk(t) + (d ? ' / ' + clk(d) : '');
      railEl.setAttribute('aria-valuetext', clk(t));
      soundUI();
    }
    function seekFrom(ev){
      if(!big || !big.api) return;
      var r = railEl.getBoundingClientRect(); if(!r.width) return;
      var x = (ev.clientX != null ? ev.clientX
                                  : (ev.touches && ev.touches[0].clientX));
      if(x == null) return;
      var f = Math.max(0, Math.min(1, (x - r.left) / r.width)), d = 0;
      try{ d = big.api.getDuration() || 0; if(d) big.api.seekTo(f * d, true); }catch(e){}
      paint();
    }
    /* Parked: no pointer, no tab stop, no screen reader, and behind the page.
       inert is what keeps the buttons out of the tab order; aria-hidden alone
       would hide them from a reader and leave them focusable, which is the
       worse of the two halves on its own. */
    function park(on){
      if(!shell) return;
      shell.classList.toggle('off', on);
      if(on) shell.setAttribute('aria-hidden', 'true');
      else   shell.removeAttribute('aria-hidden');
      try{ shell.inert = on; }catch(e){}
    }

    function onBigState(d, api, h){
      if(!overlay) return;
      if(d === 1){
        /* v32: "there's like a weird circle". When a video starts, YouTube
           draws its own loading ring and then a round play/pause badge in the
           middle of the picture for most of a second. It cannot be switched
           off, so the poster simply stays over the picture until it has gone:
           sound starts now, picture 0.8 s later. */
        if(!shell.classList.contains('live') && !h.revealing){
          h.revealing = true;
          openTimers.push(setTimeout(function(){
            if(overlay && big){ shell.classList.add('live'); big.revealing = false; }
          }, 800));
        }
        /* It is playing. If it started muted anyway, ask once more now that
           there is a running player to ask -- a device that refused a cold
           player will sometimes allow this one. The ones that do not get the
           prompt instead, and the prompt is a real touch, which always works.
           h.wantMute is the viewer having muted it on purpose: not ours to
           undo. */
        if(!h.wantMute && muted()){ try{ api.unMute(); }catch(x){} soundUI(); }
        return;
      }
      /* v29: PAUSED that nobody asked for is the phone refusing sound from a
         player it did not see the tap land on. YouTube answers a pause by
         painting its title, a centre button and a "More videos" strip over the
         picture -- which is the mess the player was opening into. So: the
         poster goes back over it, and the video is started again MUTED, which
         a phone always allows. */
      if(d === 2 && !h.wantPause){
        shell.classList.remove('live');
        if(!h.mutedStart){
          h.mutedStart = true;
          try{ api.mute(); api.playVideo(); }catch(x){}
          soundUI(); showHint();
        }
      }
    }

    function buildShell(){
      if(shell) return shell;
      shell = document.createElement('div');
      shell.className = 'player off';
      shell.setAttribute('role', 'dialog');
      shell.setAttribute('aria-modal', 'true');
      park(true);

      closeBtn = document.createElement('button');
      closeBtn.type = 'button'; closeBtn.className = 'player-x';
      closeBtn.setAttribute('aria-label', 'close');
      /* index-language close: two 1px hairlines crossed, no box, no radius.
         v34 is where the stylesheet finally agrees -- see .player-x. */
      closeBtn.innerHTML = '<span></span><span></span>';

      frame = document.createElement('div'); frame.className = 'player-frame';
      stage = document.createElement('div'); stage.className = 'player-stage';
      /* the stage fades, the layer inside it zooms: one element cannot do both
         without the inline transform transition eating the opacity one */
      zoomBox = document.createElement('div'); zoomBox.className = 'player-zoom';
      stage.appendChild(zoomBox);
      frame.appendChild(stage);

      /* Our own transport, because YouTube's is YouTube's branding. */
      var bar = document.createElement('div'); bar.className = 'pbar';
      ppBtn = document.createElement('button'); ppBtn.type = 'button';
      ppBtn.className = 'pbar-btn pbar-pp'; ppBtn.setAttribute('aria-label', 'pause');
      railEl = document.createElement('div'); railEl.className = 'pbar-rail';
      railEl.setAttribute('role', 'slider'); railEl.setAttribute('aria-label', 'seek');
      fillEl = document.createElement('div'); fillEl.className = 'pbar-fill';
      railEl.appendChild(fillEl);
      clockEl = document.createElement('span'); clockEl.className = 'pbar-time';
      clockEl.textContent = '0:00';
      sndBtn = document.createElement('button'); sndBtn.type = 'button';
      sndBtn.className = 'pbar-btn pbar-snd'; sndBtn.setAttribute('aria-label', 'mute');
      bar.appendChild(ppBtn); bar.appendChild(railEl);
      bar.appendChild(clockEl); bar.appendChild(sndBtn);
      frame.appendChild(bar);

      hint = document.createElement('button');
      hint.type = 'button'; hint.className = 'player-hint'; hint.hidden = true;
      hint.textContent = 'tap for sound';
      frame.appendChild(hint);

      shell.appendChild(closeBtn); shell.appendChild(frame);
      document.body.appendChild(shell);

      /* The player's own gesture. dismissable is the whole of "if you click
         on a video you shouldn't be able to zoom out": a player that was
         pinched open off the wall can be pinched shut, and one that was
         tapped open cannot. */
      zoom = pinchZoom(frame, zoomBox, {
        dismissable: function(){ return !!(overlay && fromPinch); },
        onDismiss: function(){ closePlayer(false); },
        onBleed: function(on){ if(shell) shell.classList.toggle('bleed', on); },
        onScale: function(sc){
          /* on the way out the black goes with it, so the wall is visibly
             underneath rather than behind a curtain */
          if(!shell) return;
          if(sc < 1 && fromPinch){
            shell.style.backgroundColor = 'rgba(0,0,0,'
              + Math.max(0, Math.min(1, (sc - 0.5) / 0.5)).toFixed(3) + ')';
            shell.classList.add('shutting');
          }else if(shell.classList.contains('shutting')){
            shell.style.backgroundColor = '';
            shell.classList.remove('shutting');
          }
        }
      });

      railEl.addEventListener('click', function(e){ e.stopPropagation(); seekFrom(e); });
      ppBtn.addEventListener('click', function(e){
        e.stopPropagation(); if(!big || !big.api) return;
        var playing = false;
        try{ playing = big.api.getPlayerState() === 1; }catch(x){}
        if(playing){ big.wantPause = true; try{ big.api.pauseVideo(); }catch(x){}
                     ppBtn.classList.add('is-paused'); ppBtn.setAttribute('aria-label', 'play'); }
        else       { big.wantPause = false; try{ big.api.playVideo(); }catch(x){}
                     ppBtn.classList.remove('is-paused'); ppBtn.setAttribute('aria-label', 'pause'); }
      });
      sndBtn.addEventListener('click', function(e){
        e.stopPropagation(); if(!big || !big.api) return;
        if(muted()){ askSound(); }
        else { big.wantMute = true; try{ big.api.mute(); }catch(x){} soundUI(); }
      });
      closeBtn.addEventListener('click', function(e){ e.stopPropagation(); closePlayer(false); });
      hint.addEventListener('click', function(e){ e.stopPropagation(); askSound(); hint.hidden = true; });

      /* v32: ONLY the X closes it. Tapping the black around the picture used
         to close too, and on a phone the sound button sits right at the edge
         of the picture: reach for unmute, land a few pixels low, and the video
         was gone. (Escape and the browser's back still close.)
         v34: and a touch on the picture itself is the unmute, so when a device
         does refuse the automatic one there is a target the size of the video
         rather than a 34px speaker to find. */
      frame.addEventListener('click', function(e){
        e.stopPropagation();
        if(!overlay || !big || !big.api) return;
        if(e.target.closest && e.target.closest('.pbar-btn,.pbar-rail,.player-hint')) return;
        if(muted()){
          askSound();
          if(!big.wantPause){ try{ big.api.playVideo(); }catch(x){} }
        }
        if(hint) hint.hidden = true;
      });
      return shell;
    }

    /* The frame, loaded and listening, before any tile is tapped. Mounted
       muted and NOT playing: a cued player decodes nothing, so the wall below
       still spends exactly one hardware decoder on nineteen moving tiles. */
    function warmUp(){
      buildShell();
      if(big) return;
      big = mountPlayer(zoomBox, tiles[0].getAttribute('data-yt'),
                        { muted:true, warm:true, hd:true, onState:onBigState });
    }
    /* On the first touch of the visit, whatever it was for. A visitor who
       never touches the page never pays for the iframe. */
    var armed = false;
    function arm(){ if(armed) return; armed = true; warmUp(); }
    ['pointerdown','touchstart','keydown','wheel','scroll'].forEach(function(n){
      document.addEventListener(n, arm, { once:true, passive:true, capture:true });
    });

    function closePlayer(fromPop){
      if(!overlay) return;
      if(barTick){ clearInterval(barTick); barTick = null; }
      openTimers.forEach(clearTimeout); openTimers = [];
      /* paused and silenced rather than destroyed. wantPause also stops §0's
         decoder retry from starting it again behind the page. */
      if(big && big.api){
        big.wantPause = true;
        /* mute BEFORE pause: both are messages into the frame and they arrive
           in the order they were sent, so muting first is the difference
           between a silent close and half a second of sound behind the page
           while the pause makes the trip. */
        try{ big.api.mute(); big.api.pauseVideo(); }catch(e){}
      }
      if(document.fullscreenElement){ try{ document.exitFullscreen(); }catch(e){} }
      shell.classList.remove('live', 'manual', 'bleed', 'shutting');
      shell.style.backgroundColor = '';
      park(true);
      if(hint) hint.hidden = true;
      if(zoom) zoom.reset();
      fromPinch = false;
      overlay = null; overlayTile = null;
      document.body.classList.remove('playing-large');   /* the wall's tiles come back */
      if(pushed && !fromPop){ pushed = false; try{ history.back(); }catch(e){} }
      if(fromPop) pushed = false;
      wall.resume();            /* the wall was stopped for the overlay's sake */
    }

    function openPlayer(el, byPinch){
      var at = tileTime(el);    /* read the playhead BEFORE the tile is torn down */
      fromPinch = !!byPinch;
      var id = el.getAttribute('data-yt');
      buildShell();
      openTimers.forEach(clearTimeout); openTimers = [];
      overlayTile = el; overlay = shell;
      park(false);
      shell.classList.remove('live', 'manual', 'bleed', 'shutting');
      shell.style.backgroundColor = '';
      shell.setAttribute('aria-label', el.getAttribute('aria-label') || 'video');
      if(zoom) zoom.reset();
      if(hint) hint.hidden = true;
      fillEl.style.width = '0%'; clockEl.textContent = '0:00';
      ppBtn.classList.remove('is-paused'); ppBtn.setAttribute('aria-label', 'pause');

      /* v29: the tile's own poster fills the frame while the player loads.
         v28 opened onto an empty black screen with a transport bar floating in
         the middle of it, for however long YouTube took. */
      var posterImg = el.querySelector('.vid-thumb img');
      frame.style.backgroundImage =
        (posterImg && (posterImg.currentSrc || posterImg.src))
          ? 'url("' + (posterImg.currentSrc || posterImg.src) + '")' : '';

      stopAllPreviews();        /* the overlay is the only sound source */
      document.body.classList.add('playing-large');
      if(big){ big.wantPause = false; big.wantMute = false;
               big.mutedStart = false; big.revealing = false; }

      /* THE GESTURE. This is still inside the tap -- no await, no timer, no
         onReady between the touch and the ask -- which is the entire reason
         the player is kept alive between opens. The tile was already playing,
         so the large one picks the playhead up rather than starting again. */
      if(big && big.api && big.api.loadVideoById){
        try{
          big.api.unMute(); big.api.setVolume(100);
          big.api.loadVideoById({ videoId:id,
                                  startSeconds:Math.max(0, Math.floor(at)) });
          big.api.playVideo();     /* loadVideoById plays; say so anyway */
          if(big.api.setPlaybackQuality) big.api.setPlaybackQuality('hd1080');
        }catch(e){}
      }else{
        /* Nothing warm to talk to, because the first touch of this visit was
           this tap. Build one the old way: the v33 path, fallbacks and all. */
        if(big){ big.destroy(); big = null; }
        big = mountPlayer(zoomBox, id,
                          { muted:false, loop:true, start:at, hd:true,
                            onReady:function(){ paint(); },
                            onState:onBigState });
      }
      soundUI();
      if(barTick) clearInterval(barTick);
      barTick = setInterval(paint, 250);

      /* v29: IT ALWAYS ENDS UP PLAYABLE. A phone may refuse to start a video
         with sound from a player that was built a moment AFTER the tap, and
         v28 then sat on a black screen for good -- the stage only appears on
         PLAYING. Three fallbacks, in order:
           2.2s  REFUSED: start it muted (always allowed), and show the sound
                 button as muted so one tap brings the sound back
           3.0s  playing but silent: say where the sound is, since a muted
                 start is now the exception rather than the rule
           4.5s  still not playing: show the player anyway and let touches
                 through to it, so YouTube's own play button can be pressed

         "Refused" is the point. v33 could read any not-yet-playing player as a
         refusal, because a cold player that has not started by now never will.
         A kept player is handed its video mid-visit and spends a moment in
         BUFFERING first, and muting a video that is merely loading is how a
         second open ends up silent for no reason -- measured, on exactly that.
         So only the states that mean the device said no count: UNSTARTED,
         PAUSED and CUED. BUFFERING is the player working, and is left alone. */
      /* Before any of that: a message into the frame can simply be dropped,
         and a player that has not even begun to load after 700ms has not been
         refused, it has not been asked. Asking again costs nothing. */
      openTimers.push(setTimeout(function(){
        if(!overlay || !big || !big.api) return;
        var st = -2; try{ st = big.api.getPlayerState(); }catch(x){}
        if(st === -1 || st === 5){ try{ big.api.playVideo(); }catch(x){} }
      }, 700));
      openTimers.push(setTimeout(function(){
        if(!overlay || shell.classList.contains('live') || !big || !big.api) return;
        var st = -2; try{ st = big.api.getPlayerState(); }catch(x){}
        if(st !== -1 && st !== 2 && st !== 5) return;      /* 3 is BUFFERING */
        try{ big.api.mute(); big.api.playVideo(); }catch(x){}
        soundUI(); showHint();
      }, 2200));
      openTimers.push(setTimeout(showHint, 3000));
      openTimers.push(setTimeout(function(){
        if(!overlay || shell.classList.contains('live')) return;
        shell.classList.add('live'); shell.classList.add('manual');
      }, 4500));

      if(!pushed){ try{ history.pushState({siePlayer:1},'',location.href); pushed=true; }catch(e){} }

      // landscape: ask for real fullscreen; if refused, the CSS orientation query handles it
      if(window.matchMedia('(orientation:landscape)').matches && shell.requestFullscreen){
        var fp = shell.requestFullscreen(); if(fp && fp.catch) fp.catch(function(){});
      }
      closeBtn.focus();
    }

    /* What the player is actually doing, so "it opens with sound" and "it
       zooms" are things that get checked rather than claimed. */
    window.siePlayer = function(){
      var st = -1, vol = null;
      try{ if(big && big.api){ st = big.api.getPlayerState();
                               vol = big.api.getVolume(); } }catch(e){}
      return { open: !!overlay, warm: !!(big && big.api),
               video: overlayTile ? overlayTile.getAttribute('data-yt') : null,
               state: st, muted: muted(), volume: vol,
               hint: !!(hint && !hint.hidden),
               zoom: zoom ? zoom.scale() : 1,
               pan: zoom ? zoom.pan() : [0, 0],
               iframes: document.querySelectorAll('.player iframe').length,
               live: !!(shell && shell.classList.contains('live')) };
    };

    tiles.forEach(function(el){
      el.addEventListener('click',function(e){
        if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;  /* let new-tab through */
        e.preventDefault();
        openPlayer(el, false);        /* tapped: the X is the only way out */
      });
    });

    /* The wall's own ladder. Its last rung is the player, opened on whichever
       tile the fingers were nearest -- and opened as a pinch, so it can be
       pinched shut again straight back onto the wall it came from. While it is
       open the wall ignores pointers entirely: the player is in front, and its
       own gesture owns them. */
    var wallGrid = document.getElementById('vids')
                   || (tiles[0] && tiles[0].parentNode);
    if(wallGrid){
      rail = railZoom(wallGrid, {
        blocked: function(){ return !!overlay; },
        onSingle: function(el){ openPlayer(el, true); }
      });
    }

    /* What the wall is doing, so the ladder is something that gets checked
       rather than claimed. */
    window.sieWall = function(){
      if(!rail) return null;
      return { level: rail.level(), cols: rail.cols(), rungs: rail.rungs(),
               single: rail.level() === rail.rungs() - 1,
               focus: rail.focus(),
               tiles: tiles.length,
               open: !!overlay, byPinch: fromPinch,
               zoom: zoom ? zoom.scale() : 1,
               bleed: zoom ? zoom.bleed() : false };
    };

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
