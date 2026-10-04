# Index button + panel

The `index` pill and dropdown from `/myth-collection`, extracted as a
dependency-free component. Two files:

| file | what |
|---|---|
| `myth-index.css` | all the styling — pill, glass panel, rows, hover preview |
| `myth-index.js` | builds the markup and wires the behaviour (UMD, no deps) |

`index-demo.html` is a runnable example; open it directly in a browser.

## Use

```html
<link rel="stylesheet" href="myth-index.css">
<script src="myth-index.js"></script>
<script>
  mythIndex({
    mount: document.querySelector('#somewhere'),
    items: [
      { href: '/product/house-blouse', title: 'house-blouse', price: '$180', thumb: '/img/hb.avif' },
      // ...
    ],
  });
</script>
```

Returns `{ el, open, close, toggle, destroy }`.

### Options

| option | default | notes |
|---|---|---|
| `items` | — | `{ href, title, price, thumb }[]`. `thumb` is optional; without it that row just has no preview. |
| `mount` | `document.body` | The component appends itself here. The panel is absolutely positioned against it, so give it `position: relative` or let it be a block in normal flow. |
| `columns` | `2` | Numbering stays continuous across columns. Collapses to one column under 768px regardless. |
| `label` | `'index'` | Pill text. |
| `columnLabels` | `['#','Title','Price']` | Sticky column header. |
| `ariaLabel` | `'collection index'` | On the `<section>`. |

### Pulling rows out of an existing grid

The original scraped the Webflow CMS list rather than taking data. That path is
still there:

```js
mythIndex({
  mount: host,
  items: mythIndex.fromDOM({
    wrapper: '.card',
    link:    'a[href]',
    title:   '.card__name',
    price:   '.card__price',
    image:   'img',
  }),
});
```

Defaults match Webflow (`.w-dyn-item`, `.text-weight-semibold`,
`.text-weight-regular`, and `data-hover-src` in preference to `src`).

## Structure it generates

```
section.myth-index
├─ div.myth-index__bar
│  └─ button.myth-index__toggle[aria-expanded][aria-controls]
│     ├─ span            "index"
│     └─ span.myth-index__chev   ▾   (rotates 180° when open)
└─ div.myth-index__panel[hidden][id]
   └─ div.myth-index__cols
      └─ div.myth-index__col            (×columns)
         ├─ div.myth-index__col-head    (sticky)
         └─ a.myth-index__row[data-thumb]   (×n)
            ├─ span.myth-index__num     01
            ├─ span.myth-index__title
            └─ span.myth-index__price

div.myth-index__hover-preview   → appended to <body>, position:fixed
```

Open/closed state is the `hidden` attribute plus `aria-expanded` — there is no
state class, so CSS keys off `[hidden]` and `[aria-expanded="true"]`.

## Theming

Four variables on `:root`:

```css
--myth-card-bg: #D3E1E9;          /* hover preview backdrop */
--myth-index-font: Instrumentsans, Arial, sans-serif;
--myth-index-gutter: 28px;        /* horizontal inset, ≥768px */
--myth-index-gutter-sm: 12px;     /* below 768px */
```

The panel is `721 × 472px` on desktop (`max-width: calc(100% - gutter*2)`), and
below 768px it goes edge-to-edge with `max-height: 70vh` and scrolls.

The glass look is `backdrop-filter: blur(16px) saturate(1.25)` over
`rgba(250,250,250,0.55)`. In a browser without `backdrop-filter` it degrades to
a flat translucent panel, which is still readable.

## Behaviour notes

- **Hover preview** — 180×220 card that follows the cursor, flipping below the
  pointer when there's no room above and clamping to the right edge. Skipped
  entirely on touch (`ontouchstart` / `maxTouchPoints`).
- **Thumbnail warming** — on first open, preloads each row's thumb one per
  `requestIdleCallback` tick, so the first hover isn't a blank box and page
  load isn't taxed.
- **Closing** — Escape, or a click outside. *This is the one change from the
  live myth page*, which only closed the panel when the site nav opened; a
  stray click there leaves it open.

## Renaming

The `myth-` prefix is only in class names:

```
sed -i 's/myth-index/your-name/g; s/--myth-card-bg/--your-bg/g' myth-index.css myth-index.js
```
