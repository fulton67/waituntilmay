/* ---------------------------------------------------------------------------
   Index button + panel, portable.

   The original on /myth-collection scraped Webflow's CMS list for its rows.
   This version takes plain data instead, so it has no Webflow dependency:

     mythIndex({
       mount: document.querySelector('#here'),
       items: [ { href, title, price, thumb }, ... ],
     });

   Returns { el, open, close, toggle, destroy }.

   Differences from the live myth page, all deliberate:
   - rows come from `items`, not from `.w-dyn-item` (use fromDOM() below to
     keep the old behaviour)
   - Escape and outside-click close the panel; the original only closed it
     when the site nav opened, so on the myth page a stray click left it open
   - the hover preview is skipped on touch, same as the original
   --------------------------------------------------------------------------- */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.mythIndex = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  var PREVIEW_W = 180, PREVIEW_H = 220;
  var uid = 0;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function mythIndex(opts) {
    opts = opts || {};
    var items = opts.items || [];
    var mount = opts.mount || document.body;
    var label = opts.label || 'index';
    var heads = opts.columnLabels || ['#', 'Title', 'Price'];
    var columns = opts.columns == null ? 2 : Math.max(1, opts.columns);
    if (!items.length) return null;

    var panelId = 'myth-index-panel-' + (++uid);

    // split into N balanced columns, numbering continuous across them
    var perCol = Math.ceil(items.length / columns);
    var colsHtml = '';
    for (var c = 0; c < columns; c++) {
      var start = c * perCol;
      var subset = items.slice(start, start + perCol);
      if (!subset.length) continue;
      colsHtml += '<div class="myth-index__col">'
        + '<div class="myth-index__col-head">'
        +   '<span>' + esc(heads[0]) + '</span>'
        +   '<span>' + esc(heads[1]) + '</span>'
        +   '<span>' + esc(heads[2]) + '</span>'
        + '</div>'
        + subset.map(function (it, i) {
            var num = String(start + i + 1);
            while (num.length < 2) num = '0' + num;
            return '<a class="myth-index__row" href="' + esc(it.href || '#') + '"'
              + (it.thumb ? ' data-thumb="' + esc(it.thumb) + '"' : '') + '>'
              + '<span class="myth-index__num">' + num + '</span>'
              + '<span class="myth-index__title">' + esc(it.title) + '</span>'
              + '<span class="myth-index__price">' + esc(it.price) + '</span>'
              + '</a>';
          }).join('')
        + '</div>';
    }

    var section = document.createElement('section');
    section.className = 'myth-index';
    section.setAttribute('aria-label', opts.ariaLabel || 'collection index');
    section.innerHTML =
      '<div class="myth-index__bar">'
      +   '<button type="button" class="myth-index__toggle" aria-expanded="false"'
      +     ' aria-controls="' + panelId + '">'
      +     '<span>' + esc(label) + '</span>'
      +     '<span class="myth-index__chev" aria-hidden="true">▾</span>'
      +   '</button>'
      + '</div>'
      + '<div class="myth-index__panel" id="' + panelId + '" hidden>'
      +   '<div class="myth-index__cols">' + colsHtml + '</div>'
      + '</div>';
    mount.appendChild(section);

    var toggleBtn = section.querySelector('.myth-index__toggle');
    var panel = section.querySelector('.myth-index__panel');

    // ---------------------------------------------------------- hover preview
    var preview = null, previewImg = null;
    if (!IS_TOUCH) {
      preview = document.createElement('div');
      preview.className = 'myth-index__hover-preview';
      preview.setAttribute('aria-hidden', 'true');
      preview.innerHTML = '<img alt="" />';
      document.body.appendChild(preview);
      previewImg = preview.querySelector('img');
    }

    // Warm the thumbnails the first time the panel opens, one per idle tick, so
    // the first hover is not a blank box and the page load is not taxed.
    var warmed = false;
    function warm() {
      if (warmed || IS_TOUCH) return;
      warmed = true;
      var rows = Array.prototype.slice.call(panel.querySelectorAll('.myth-index__row'));
      var i = 0;
      var idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 250); };
      (function next() {
        if (i >= rows.length) return;
        var t = rows[i++].getAttribute('data-thumb');
        if (t) { var p = new Image(); p.src = t; }
        idle(next);
      })();
    }

    // ----------------------------------------------------------- open / close
    function isOpen() { return toggleBtn.getAttribute('aria-expanded') === 'true'; }
    function open() {
      if (isOpen()) return;
      toggleBtn.setAttribute('aria-expanded', 'true');
      panel.removeAttribute('hidden');
      warm();
    }
    function close() {
      if (!isOpen()) return;
      toggleBtn.setAttribute('aria-expanded', 'false');
      panel.setAttribute('hidden', '');
      if (preview) preview.classList.remove('is-visible');
    }
    function toggle() { isOpen() ? close() : open(); }

    toggleBtn.addEventListener('click', toggle);

    function onDocClick(e) { if (!section.contains(e.target)) close(); }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'Esc') close(); }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);

    // ----------------------------------------------------------- row previews
    if (!IS_TOUCH) {
      Array.prototype.forEach.call(panel.querySelectorAll('.myth-index__row'), function (row) {
        var thumb = row.getAttribute('data-thumb');
        if (!thumb) return;
        row.addEventListener('mouseenter', function () {
          previewImg.src = thumb;
          preview.style.background =
            getComputedStyle(document.documentElement).getPropertyValue('--myth-card-bg');
          preview.classList.add('is-visible');
        });
        row.addEventListener('mousemove', function (e) {
          var left = e.clientX + 24;
          var top = e.clientY - PREVIEW_H - 16;
          if (top < 8) top = e.clientY + 24;                                  // flip below
          if (left + PREVIEW_W > window.innerWidth - 8)                       // keep on screen
            left = window.innerWidth - PREVIEW_W - 8;
          preview.style.left = left + 'px';
          preview.style.top = top + 'px';
        });
        row.addEventListener('mouseleave', function () {
          preview.classList.remove('is-visible');
        });
      });
    }

    return {
      el: section,
      open: open, close: close, toggle: toggle,
      destroy: function () {
        document.removeEventListener('click', onDocClick);
        document.removeEventListener('keydown', onKey);
        if (preview) preview.remove();
        section.remove();
      },
    };
  }

  /* Scrape rows out of an existing card grid, the way the myth page does.
     Defaults match Webflow's CMS list markup; override any selector. */
  mythIndex.fromDOM = function (opts) {
    opts = opts || {};
    var wrapper = opts.wrapper || '.w-dyn-item';
    var link = opts.link || 'a[href]';
    var title = opts.title || '.text-weight-semibold';
    var price = opts.price || '.text-weight-regular';
    var image = opts.image || 'img';
    return Array.prototype.slice.call(document.querySelectorAll(wrapper))
      .map(function (w) {
        var a = w.querySelector(link);
        if (!a) return null;
        var t = w.querySelector(title);
        var p = w.querySelector(price);
        var img = w.querySelector(image);
        return {
          href: a.getAttribute('href'),
          title: t ? t.textContent.trim() : '',
          price: p ? p.textContent.trim() : '',
          thumb: img ? (img.getAttribute('data-hover-src') || img.src) : '',
        };
      })
      .filter(Boolean);
  };

  return mythIndex;
});
