/* sie stock.v2 — "n of 30 left" above the title, live from the Shopify admin; sold out strikes the price.
   v2: the count comes from assets.sie.market/api/stock (the admin's own number)
   instead of the Storefront API, whose count lagged real sales (it said 20 with
   16 left). No Shopify key is in this file any more. */
/* Stock counter. Reads what is left straight from Shopify, so every sale counts
   down for everyone. At zero the counter goes, the price is struck through and
   "sold out" sits under it. ?left=N on the URL forces a number (preview/testing). */
(function(){
  var CFG = {endpoint:"https://assets.sie.market/api/stock",total:30};
  function apply(left, sold){
    var el = document.getElementById('stock'), prod = document.querySelector('.product');
    if(!el || !prod) return;
    var total = CFG.total;
    if(sold || left <= 0){
      el.hidden = true;
      prod.classList.add('is-sold');
      [].forEach.call(prod.querySelectorAll('.price,.sie-buy'), function(a){
        a.removeAttribute('href'); a.setAttribute('aria-disabled','true'); });
      var price = prod.querySelector('.price');
      if(price){ price.setAttribute('aria-label','sold out, was $80 usd');
        if(!prod.querySelector('.sold-out')){
          var p = document.createElement('p'); p.className = 'sold-out'; p.textContent = 'sold out';
          price.insertAdjacentElement('afterend', p); } }
      return;
    }
    left = Math.min(left, total);
    el.querySelector('.stock__t').textContent = total;
    el.classList.toggle('low', left / total <= 0.2);
    el.hidden = false;
    var n = el.querySelector('.stock__n');
    if(!animate()){                                    /* came over from videos: just show it */
      n.textContent = left;
      el.querySelector('.stock__fill').style.transition = 'none';
      el.style.setProperty('--stock-pct', (left / total * 100).toFixed(1) + '%');
      return;
    }
    var start = performance.now(), dur = 1100;
    el.style.setProperty('--stock-pct', '100%');
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      el.style.setProperty('--stock-pct', (left / total * 100).toFixed(1) + '%'); }); });
    (function tick(t){ var k = Math.min(1, (t - start) / dur); k = 1 - Math.pow(1 - k, 3);
      n.textContent = Math.round(total - (total - left) * k);
      if(k < 1) requestAnimationFrame(tick); })(start);
  }
  /* The countdown plays when the site is opened or refreshed, not when someone
     arrives from another page of the site (videos -> shop) or goes back. */
  function animate(){
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    var type = nav ? nav.type : 'navigate';
    if(type === 'reload') return true;
    if(type === 'back_forward') return false;
    var ref = document.referrer;
    try { if(ref && new URL(ref).host === location.host) return false; } catch(e){}
    return true;
  }
  var CSS="/* ---- stock: \"n of 30 left\" above the title; sold out strikes the price ---- */\n.stock{ width:min(240px,64vw); margin:0 auto calc(var(--base,16px)*1.1); text-align:center; }\n.stock[hidden]{ display:none; }\n.stock__text{ margin:0 0 9px; font-size:12px; letter-spacing:.02em; text-transform:lowercase; color:var(--fg-2,#9a9a9a); }\n.stock__n{ color:#fff; font-weight:500; font-variant-numeric:tabular-nums; }\n.stock__bar{ height:3px; border-radius:3px; background:rgba(255,255,255,.14); overflow:hidden; }\n.stock__fill{ display:block; height:100%; width:var(--stock-pct,100%); background:#fff; border-radius:3px;\n  transition:width 1.2s cubic-bezier(.2,.8,.2,1); }\n.stock.low .stock__fill{ background:#e3262b; }\n.stock.low .stock__n{ color:#e3262b; }\n\n/* sold out: the price stays, struck through in red, \"sold out\" under it; buy goes */\n.product.is-sold .price{ position:relative; pointer-events:none; cursor:default; }\n.product.is-sold .price::after{ content:\"\"; position:absolute; left:10%; right:10%; top:50%;\n  height:2px; background:#e3262b; transform:rotate(-8deg); border-radius:2px; }\n.product.is-sold .sie-buy{ display:none; }\n.sold-out{ margin:10px 0 0; text-align:center; font:500 12px/1 var(--type-family,inherit);\n  letter-spacing:.06em; text-transform:lowercase; color:#e3262b; }";

  function mount(){
    if(!document.getElementById('sie-stock-css')){
      var s=document.createElement('style'); s.id='sie-stock-css'; s.textContent=CSS; document.head.appendChild(s); }
    if(document.getElementById('stock')) return;
    var h=document.querySelector('.product .title'); if(!h) return;
    var d=document.createElement('div'); d.className='stock'; d.id='stock'; d.hidden=true; d.setAttribute('aria-live','polite');
    d.innerHTML='<p class="stock__text"><span class="stock__n">30</span> of <span class="stock__t">30</span> left</p><div class="stock__bar"><span class="stock__fill"></span></div>';
    h.parentNode.insertBefore(d,h);
  }
  function load(){
    mount();
    var force = new URLSearchParams(location.search).get('left');
    if(force !== null){ apply(+force, +force <= 0); return; }
    fetch(CFG.endpoint, { cache:'no-store' }).then(function(r){
      if(!r.ok) throw 0; return r.json();
    }).then(function(j){
      if(j && typeof j.total === 'number') CFG.total = j.total;
      if(j && j.sold === true){ apply(0, true); return; }
      if(j && typeof j.left === 'number'){ apply(j.left, false); return; }
      /* no number: leave the counter hidden rather than guess */
    }).catch(function(){});
  }
  if(document.readyState !== 'loading') load(); else document.addEventListener('DOMContentLoaded', load);
})();
