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
npm run dev        # rebuilds dist/main.js on every save while you work
npm run build      # minified build before committing
```

Commit `src/` and `dist/` together, push, then update the hash in Site settings → Custom code → Footer:

```html
<script src="https://cdn.jsdelivr.net/gh/pinaka-design/rkoomera@<commit-hash>/dist/main.js"></script>
```

## Webflow setup

| Where | What |
|---|---|
| Site settings → GSAP integration | GSAP on, ScrollTrigger ticked (add other plugins here when needed) |
| Site settings → Custom code → Footer | the two scripts below |
| Page settings → Custom code | leave empty, so nothing loads twice |

```html
<script src="https://cdn.jsdelivr.net/npm/@rive-app/canvas@2.45.0"></script>
<script src="https://cdn.jsdelivr.net/gh/pinaka-design/rkoomera@<commit-hash>/dist/main.js"></script>
```

The Rive runtime must come before `main.js`. GSAP comes from Webflow, and `main.js` waits for the page to finish loading before it starts.

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

Stacked project slides with a rolling logo, line-by-line text and progress dots (based on Osmo's Logo Card Testimonials). Works with a CMS Collection List.
Needs **SplitText** ticked in Site settings → GSAP integration.

| Attribute | Where | Notes |
|---|---|---|
| `data-module="project-slider"` | wrapper | required |
| `data-project-slider-autoplay="6"` | wrapper | seconds per project, `0` or missing = click only |
| `data-project-slider-item` | each project (Collection Item) | |
| `data-project-slider-logo` | logo inside the logo slot | rolls up/down on change |
| `data-project-slider-split` | text (title, description...) | fades in line by line |
| `data-project-slider-dots` | dots wrapper | holds one dot as the blueprint |
| `data-project-slider-dot` | the blueprint dot | cloned per project |
| `data-project-slider-dot-fill` | inside the dot | autoplay progress |

Status is written to `data-project-slider-status` (`active`, `leaving`, `inactive`) on items and dots. The CSS that hides inactive items and widens the active dot lives in Site settings → Custom code → Head.
