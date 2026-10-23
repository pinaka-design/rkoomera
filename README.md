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
| Site settings → GSAP integration | GSAP on, ScrollTrigger and Flip ticked (add other plugins here when needed) |
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

Stacked project slides with a hero image that slides in over the previous one (with a slight zoom out), fading text and prev/next arrows (based on Osmo's Logo Card Testimonials). Works with a CMS Collection List. Navigation wraps around: next on the last project goes to the first.

| Attribute | Where | Notes |
|---|---|---|
| `data-module="project-slider"` | wrapper | required |
| `data-project-slider-item` | each project (Collection Item) | |
| `data-project-slider-hero` | project image inside its slot | slides in from below on next, from above on previous; the slot needs overflow hidden. The old name `data-project-slider-logo` still works |
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

### lightbox

Click an image and it flies from the page into a full-screen view with a counter and prev/next/close (based on Osmo's Lightbox Setup). One lightbox serves the whole page. Each `data-gallery` section is its own set, so prev/next stays inside the section you opened. Needs Flip ticked in the GSAP integration.

Unlike Osmo's version, you don't add the images a second time inside the lightbox: the big copies are built from the gallery when it opens.

| Attribute | Where | Notes |
|---|---|---|
| `data-module="lightbox"` | the lightbox wrapper | required, once per page (extra copies are ignored) |
| `data-lightbox="wrapper"` | the same fixed wrapper | from Osmo's markup |
| `data-lightbox="item"` | one item inside the lightbox list | used as the template for the big images; any others are replaced |
| `data-lightbox="nav"` | each nav column | fades in |
| `data-lightbox="counter-current"` / `"counter-total"` | counter numbers | |
| `data-lightbox="prev"` / `"next"` / `"close"` | nav buttons | arrow keys and Escape work too |
| `data-gallery` | a section (e.g. Design) | optional: groups grids and rich text inside it into one gallery; without it, each Collection List is its own gallery |
| `data-lightbox="trigger"` | a button around each grid image | on a Collection List bound to a multi-image field |
| `data-lightbox="trigger-parent"` | each grid item (Collection Item) | fades out while the lightbox is open |

In Webflow the lightbox is the **Lightbox** component: drop one instance anywhere on a CMS template. To add a gallery, copy an existing gallery Collection List, paste it where you want it, then change its source (Collection List settings → Source) and the image binding to the new multi-image field. A gallery can't be a component itself: Webflow doesn't let a component's Collection List read a multi-image field from the page's CMS item.

Images inside rich text open the lightbox with no attributes. Inside a `data-gallery` they join that gallery; otherwise each rich text field is a gallery of its own. Linked images are skipped.

No custom CSS is needed: the script shows the wrapper and the active item itself. Avoid overflow hidden on triggers, trigger parents and lightbox items, or the flip animation clips.

#### Videos in the lightbox

Videos open in the same lightbox as images, in Osmo's Custom Bunny HLS player, so a group can mix both: prev/next, the counter and the flip work across them. A video starts when it becomes the active item, pauses when you step away, and is unloaded when the lightbox closes. When it ends it shows the play button again instead of closing.

- **In rich text:** add the video's thumbnail as an image, then link the image to the video url. Use Bunny Stream's **HLS Playlist URL** (`https://vz-….b-cdn.net/<video-id>/playlist.m3u8`); `.mp4`, `.webm` and `.mov` links work too. The thumbnail joins the image grid, gets a play badge, and plays a silent looping preview of the video while it's on screen (it loads only when it first comes into view, pauses off screen and while the lightbox is open, and is skipped for visitors with reduced motion or data saver on). Images linked to anything else stay normal links. Previews use the smallest stream rendition that fills the thumbnail, so enabling lower resolutions (e.g. 360p, 480p) in Bunny Stream makes them lighter.
- **Anywhere else:** Osmo's open button, `data-bunny-lightbox-control="open"` with `data-bunny-lightbox-src="<HLS url>"`, and optionally an `<img data-bunny-lightbox-placeholder>` inside for the poster (it can be hidden). Any trigger with `data-video="<url>"` works as well.

The player markup comes from the **Video Player** component, which sits inside the **Lightbox** component, so one Lightbox instance per page brings both. The script uses it as a template and removes Osmo's own wrapper; don't add Osmo's JavaScript or the hls.js script tag, the script loads hls.js itself the first time a stream opens. Osmo's state CSS is included in the script too. Bunny's allowed domains (if set) must include the site's domains, including `rkoomera-portfolio.webflow.io`.

### richtext-grid

Lays out two or more images in a row of a rich text field (only empty lines between them) as a 2-column grid of 4:3 thumbnails. The grid brings its own styles, so it doesn't need any Webflow classes and a Style Manager clean-up can't break it. Columns, gaps, crop ratio, crop position, corner radius (your Radius/large variable), outline and spacing are set at the top of `src/modules/richtext-grid.js`. A single image between paragraphs stays as it is. Each group, and each single image, is its own lightbox gallery: prev/next stays inside the group you opened, and a single image opens without prev/next.

| Attribute | Where | Notes |
|---|---|---|
| `data-module="richtext-grid"` | the Rich Text element | turns it on for that field only |
