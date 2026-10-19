# rkoomera

Custom JavaScript for the rkoomera Webflow portfolio.
Source lives in `src/`, gets bundled into one file, `dist/main.js`, and Webflow loads that file from jsDelivr.

## Folder structure

```
src/
  main.js            entry point: starts everything
  lib/               the engine (you rarely touch this)
    gsap.js          registers GSAP plugins, global animation defaults
    modules.js       component system + lifecycle hooks (onMount, onDestroy, onView...)
    observe.js       shared IntersectionObserver behind onView()
    subs.js          shared Raf (every frame) and Resize buses
  modules/           components (one file each)
    registry.js      list of every component, keyed by data-module name
    global.js        site-wide code that runs on every page
    rive.js          Rive animations
  animations/        scroll and motion effects (registered the same way)
  utils/             small helpers (math, media queries)
dist/
  main.js            built bundle (commit it, jsDelivr serves it)
```

## How a component starts

1. In Webflow, give an element `data-module="rive"`
2. `main.js` finds every `[data-module]` element on the page
3. It looks up `rive` in `modules/registry.js` and calls `rive(element, element.dataset)`

An unknown name logs a warning, and a component that throws an error logs it without stopping the others.

## Add a new component

1. Create `src/modules/my-thing.js`:

   ```js
   // modules/my-thing.js
   // What it does, and which attributes it reads.
   import { onDestroy } from "../lib/modules.js";

   export default function myThing(el, data) {
     const tween = gsap.to(el, { rotate: 360, repeat: -1, duration: 4 });
     onDestroy(() => tween.kill());
   }
   ```

2. Register it in `src/modules/registry.js`:

   ```js
   import myThing from "./my-thing.js";

   export const registry = {
     rive,
     "my-thing": myThing,
   };
   ```

3. In Webflow, add `data-module="my-thing"` to the element.
4. Build and ship (below).

## Build and ship

```bash
npm install        # first time only
npm run dev        # serves a live bundle at http://localhost:3333/main.js
npm run build      # minified build before committing
```

Commit `src/` and `dist/` together, push, tag a release, then update `VERSION` in the footer loader (`webflow/footer.html`, copied into Site settings → Custom code → Footer).

## Dev mode

The footer loader picks where `main.js` comes from, so you can work on the live Webflow site without publishing:

1. `npm run dev`
2. Open the Webflow site (published or staging) with `?dev=1` on the URL. The browser remembers it.
3. Every save rebuilds the bundle and reloads the page.
4. `?dev=0` switches back to jsDelivr.

If dev mode is on but the server isn't running, the loader falls back to jsDelivr and logs a warning. `npm run dev` builds in memory and never touches `dist/`; `npm run watch` is the old rebuild-to-disk mode. Chrome and Firefox allow an `https` page to load from `http://localhost`; Safari may block it.

## Webflow setup

| Where | What |
|---|---|
| Site settings → GSAP integration | GSAP on, ScrollTrigger ticked (add other plugins here when needed) |
| Site settings → Custom code → Footer | contents of `webflow/footer.html` |
| Page settings → Custom code | leave empty, so nothing loads twice |

The footer loads the Rive runtime, then the loader, which adds `main.js` from jsDelivr (or localhost in dev mode). The Rive runtime must come before `main.js`. GSAP comes from Webflow, and `main.js` waits for the page to finish loading before it starts.

## Components

### rive

| Attribute | Required | Notes |
|---|---|---|
| `data-module="rive"` | yes | |
| `data-rive-src` | yes | URL of the `.riv` file |
| `data-rive-artboard` | no | defaults to the file's default artboard |
| `data-rive-state-machine` | no | defaults to the artboard's first state machine |
| `data-rive-fit` | no | `contain` (default), `cover`, `fill`... |

Status is written to `data-rive-status`: `loading`, `loaded` or `error`.

### project-slider

Stacked project slides with a rolling logo, fading text and prev/next arrows (based on Osmo's Logo Card Testimonials). Works with a CMS Collection List. Navigation wraps around: next on the last project goes to the first.

| Attribute | Where | Notes |
|---|---|---|
| `data-module="project-slider"` | wrapper | required |
| `data-project-slider-item` | each project (Collection Item) | |
| `data-project-slider-logo` | logo inside the logo slot | rolls up on next, down on previous |
| `data-project-slider-text` | text (title, description...) | fades in, one element after another |
| `data-project-slider-prev` | previous arrow | can sit inside each item; divs get button roles and keyboard support |
| `data-project-slider-next` | next arrow | same as above |

Status is written to `data-project-slider-status` (`active`, `leaving`, `inactive`) on items. The CSS that hides inactive items lives in Site settings → Custom code → Head.

### tabs

Tabs that open their details and swap a matching visual, with optional autoplay and a progress bar (based on Osmo's Tab System with Autoplay Option). Keeps Osmo's `data-tabs` attributes.

| Attribute | Where | Notes |
|---|---|---|
| `data-module="tabs"` | wrapper | required |
| `data-tabs="wrapper"` | wrapper | from Osmo's markup |
| `data-tabs-autoplay="true"` | wrapper | optional, remove to switch only on click |
| `data-tabs-autoplay-duration="5000"` | wrapper | milliseconds per tab, default 5000 |
| `data-tabs="content-item"` | each tab | |
| `data-tabs="item-details"` | inside a tab | opens and closes |
| `data-tabs="item-progress"` | inside a tab | autoplay progress bar |
| `data-tabs="visual-item"` | each visual | same order as the tabs |

The script toggles the `active` class on the current tab and visual. The CSS that fades inactive tabs and adds hover states lives in Site settings → Custom code → Head.
