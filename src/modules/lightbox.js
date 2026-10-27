// Lightbox (based on Osmo's Lightbox Setup).
// Click an image and it flips from the page into a full-screen view with
// prev/next, a counter and close. One lightbox serves the whole page; each
// gallery (a [data-gallery] section, or a rich text field) is its own set, so
// prev/next stays inside the section you opened.
//
// Unlike Osmo's version, you don't duplicate the images inside the lightbox:
// the big copies are built from the gallery when it opens.
//
// Webflow attributes:
//   data-module="lightbox"          on the lightbox wrapper, once per page
//   data-lightbox="wrapper"         the same fixed wrapper (Osmo's markup)
//   data-lightbox="item"            one item inside the lightbox list, used as
//                                   the template for the big images
//   data-lightbox="nav"             each nav column (fades in)
//   data-lightbox="counter-current" / "counter-total"
//   data-lightbox="prev" / "next" / "close"
//   data-gallery                    optional: a section whose images belong
//                                   together (grids and rich text inside it)
//   data-lightbox="trigger"         a button around each grid image
//   data-lightbox="trigger-parent"  each grid item (fades out while open)
//
// Without data-gallery, each Collection List of triggers is its own gallery.
// Images inside rich text (.w-richtext) open the lightbox without any
// attributes. Inside a [data-gallery] they join that gallery; otherwise each
// rich text field is a gallery of its own.
//
// Videos play in Osmo's Custom Bunny HLS player (its [data-bunny-lightbox-init]
// markup anywhere on the page is used as the template):
//   - in rich text, link an image to a video url (.m3u8 such as Bunny
//     Stream's HLS playlist, or .mp4/.webm/.mov); it opens as a video in the
//     same gallery with the image as poster, gets a play badge, and plays a
//     silent looping preview while on screen (lib/preview.js)
//   - anywhere, Osmo's open button: data-bunny-lightbox-control="open" with
//     data-bunny-lightbox-src="<url>" and an optional
//     <img data-bunny-lightbox-placeholder> inside for the poster
//   - or any trigger with data-video="<url>"
//
// Needs GSAP Flip: Site settings → GSAP integration → tick Flip.
import { onDestroy, onMount } from "../lib/modules.js";
import {
  createNativePlayer,
  createPlayer,
  isVideoUrl,
  takePlayerTemplate,
} from "../lib/video.js";
import { addPreview, resumePreviews, suspendPreviews } from "../lib/preview.js";

// Motion settings in seconds. Tweak the feel here.
const MOTION = {
  flip: { duration: 0.6, ease: "power2.inOut" }, // image flying in
  backdrop: "rgba(0,0,0,0.75)",
  open: { duration: 0.6, navDelay: 0.2, navStagger: 0.05 },
  close: { duration: 0.4, fadeIn: 0.5, stagger: 0.03 },
  fadeOthers: { duration: 0.4, stagger: 0.02 },
};

// Fit an image inside its lightbox item (Osmo's "force containment" CSS).
// Also undoes any thumbnail crop (aspect-ratio, object-fit: cover) the grid
// image's class brings along, so the lightbox shows the whole image.
const FIT = {
  objectFit: "contain",
  objectPosition: "50% 50%",
  aspectRatio: "auto",
  width: "auto",
  height: "auto",
  minWidth: "auto",
  maxWidth: "100%",
  maxHeight: "100%",
};

const TRIGGERS =
  '[data-lightbox="trigger"], [data-bunny-lightbox-control="open"]';

// Play badge on video thumbnails in rich text (Osmo's big play button look)
const BADGE_CSS = `
/* Rounded corners in the lightbox too (Webflow variable Radius/large) */
[data-lightbox="item"] > img {
  border-radius: var(--_radius---radius--large, 1rem);
}
.rk-video-thumb { position: relative; display: block; }
/* Silent preview over the thumbnail; fades in once it's playing */
.rk-video-thumb .rk-video-preview {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.4s linear;
  pointer-events: none;
}
.rk-video-thumb .rk-video-preview.is-playing { opacity: 1; }
.rk-video-thumb::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  /* rem, not em: Webflow sets font-size 0 inside rich text figures */
  width: 4rem;
  height: 4rem;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(100, 100, 100, 0.2) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M6 12V5.01109C6 4.05131 7.03685 3.4496 7.87017 3.92579L14 7.42855L20.1007 10.9147C20.9405 11.3945 20.9405 12.6054 20.1007 13.0853L14 16.5714L7.87017 20.0742C7.03685 20.5503 6 19.9486 6 18.9889V12Z'/%3E%3C/svg%3E") 55% 50% / 40% no-repeat;
  -webkit-backdrop-filter: blur(1rem);
  backdrop-filter: blur(1rem);
  pointer-events: none;
}
`;

function addBadgeStyles() {
  if (document.getElementById("rk-lightbox-styles")) return;
  const style = document.createElement("style");
  style.id = "rk-lightbox-styles";
  style.textContent = BADGE_CSS;
  document.head.appendChild(style);
}

const q = (root, name) => root.querySelector(`[data-lightbox="${name}"]`);
const qa = (root, name) =>
  Array.from(root.querySelectorAll(`[data-lightbox="${name}"]`));

// Only one lightbox runs per page, even if the wrapper gets duplicated
let active = false;

export default function lightbox(root) {
  if (active) {
    console.warn(
      "[rkoomera] lightbox: more than one lightbox on this page, ignoring the extra one"
    );
    return;
  }

  const wrapper = root.matches('[data-lightbox="wrapper"]')
    ? root
    : q(root, "wrapper");
  if (!wrapper) {
    console.warn('[rkoomera] lightbox: no [data-lightbox="wrapper"] found');
    return;
  }

  const templateItem = q(wrapper, "item");
  const list = templateItem?.parentElement;
  if (!list) {
    console.warn(
      '[rkoomera] lightbox: add one [data-lightbox="item"] inside the lightbox list'
    );
    return;
  }
  // Keep a bare copy of the item (classes only) and clear the list: the big
  // images are built from whichever gallery is opened
  const itemShell = templateItem.cloneNode(false);
  itemShell.classList.remove("is-active");
  list.replaceChildren();
  active = true;

  // Osmo's player markup, copied for each video; without it videos fall back
  // to the browser's own player
  const playerTemplate = takePlayerTemplate();
  addBadgeStyles();

  const nav = qa(wrapper, "nav");
  const counter = {
    current: q(wrapper, "counter-current"),
    total: q(wrapper, "counter-total"),
  };
  const buttons = {
    prev: q(wrapper, "prev"),
    next: q(wrapper, "next"),
    close: q(wrapper, "close"),
  };
  const hasFlip = typeof window.Flip !== "undefined";
  if (!hasFlip) {
    console.warn(
      "[rkoomera] lightbox: GSAP Flip is missing, opening without the flip animation. Tick Flip in Site settings → GSAP integration."
    );
  }

  // ————— Collect galleries and their triggers ————— //
  const galleries = [];

  // candidates: what to look at, by default everything inside groupEl
  function addGallery(
    groupEl,
    candidates = groupEl.querySelectorAll(`${TRIGGERS}, .w-richtext img`)
  ) {
    const triggers = [];
    candidates.forEach((el) => {
      // Images in a [data-gallery] nested inside this one belong to that one
      const owner = el.closest("[data-gallery]");
      if (owner && owner !== groupEl) return;
      // Rich text images become triggers; skip ones already inside a trigger
      if (el.tagName === "IMG") {
        if (el.closest(TRIGGERS)) return;
        if (el.closest('[data-lightbox="wrapper"]')) return;
        // Webflow wraps rich text images as figure > div > img; skip
        // anything outside a figure
        if (!el.closest("figure")) return;
        // An <a> without a url is just a wrapper; treat the image normally
        const link = el.closest("a[href]:not([href=''])");
        if (link) {
          // An image linked to a video opens that video; other links stay
          // ordinary links
          if (!isVideoUrl(link.href)) return;
          link.setAttribute("data-lightbox", "trigger");
          link.setAttribute("data-video", link.href);
          link.classList.add("rk-video-thumb");
          // A silent loop of the video plays on the thumbnail while on screen
          addPreview(link, link.href);
          link.setAttribute("aria-label", el.alt || "Play video");
          triggers.push(link);
          return;
        }
        const trigger = el.parentElement;
        trigger.setAttribute("data-lightbox", "trigger");
        trigger.setAttribute("role", "button");
        trigger.setAttribute("tabindex", "0");
        trigger.setAttribute("aria-label", el.alt || "Open image");
        trigger.style.cursor = "zoom-in";
        triggers.push(trigger);
      } else {
        triggers.push(el);
      }
    });

    const entries = triggers
      .map((trigger) => {
        const img =
          trigger.querySelector("[data-bunny-lightbox-placeholder]") ||
          trigger.querySelector("img");
        // A trigger that links to a video opens it (e.g. a button bound to
        // a CMS link field); one that links anywhere else stays a link
        const href = trigger.tagName === "A" ? trigger.getAttribute("href") : "";
        const video =
          trigger.getAttribute("data-video") ||
          trigger.getAttribute("data-bunny-lightbox-src") ||
          (isVideoUrl(href) ? trigger.href : null);
        if (href && !href.startsWith("#") && !video) return null;
        // Images need a picture; videos can open without a poster
        if (!img && !video) return null;
        const parent =
          trigger.closest('[data-lightbox="trigger-parent"]') ||
          trigger.closest("figure") ||
          trigger;
        return { trigger, img, parent, video };
      })
      .filter(Boolean);

    if (entries.length) galleries.push({ el: groupEl, entries });
  }

  // Collected once every module has started, so galleries other modules build
  // (like richtext-grid) are in place whatever their order on the page
  onMount(() => {
    document.querySelectorAll("[data-gallery]").forEach((g) => addGallery(g));
    // Without a [data-gallery] around them, each Collection List of triggers
    // and each rich text field is a gallery of its own
    const seen = new Set();
    document.querySelectorAll(TRIGGERS).forEach((trigger) => {
      if (trigger.closest("[data-gallery]")) return;
      const list = trigger.closest(".w-dyn-list");
      if (list && !seen.has(list)) {
        seen.add(list);
        addGallery(list);
      }
    });
    document.querySelectorAll(".w-richtext").forEach((rt) => {
      if (!rt.closest("[data-gallery]")) addGallery(rt);
    });
    // Anything left (e.g. a video button on its own) is a gallery of one
    const claimed = new Set(
      galleries.flatMap((g) => g.entries.map((e) => e.trigger))
    );
    document.querySelectorAll(TRIGGERS).forEach((trigger) => {
      if (!claimed.has(trigger)) addGallery(trigger, [trigger]);
    });
  });

  // ————— State ————— //
  // { gallery, index, entry, items, players, flipped, placeholder, imgStyle }
  let current = null;
  const mainTimeline = gsap.timeline();

  // The is-active class matches Osmo's CSS; the inline visibility means the
  // lightbox works even when that CSS isn't on the site
  function setActive(index, { media = true } = {}) {
    current.items.forEach((item, i) => {
      item.classList.toggle("is-active", i === index);
      item.style.visibility = i === index ? "visible" : "hidden";
    });
    current.index = index;
    if (counter.current) counter.current.textContent = index + 1;
    if (media) activateMedia(index);
  }

  // Pause every other video; if this item is a video, start its player (built
  // the first time it's shown, in place of the poster image)
  function activateMedia(index) {
    if (!current) return;
    current.players.forEach((player, i) => {
      if (i !== index) player.pause();
    });
    const entry = current.gallery.entries[index];
    if (!entry.video) return;
    let player = current.players.get(index);
    if (!player) {
      const poster = entry.img ? entry.img.currentSrc || entry.img.src : "";
      player = playerTemplate
        ? createPlayer(playerTemplate, entry.video, { poster })
        : createNativePlayer(entry.video, { poster });
      const item = current.items[index];
      item.querySelectorAll(":scope > img").forEach((img) => {
        img.style.display = "none";
      });
      item.appendChild(player.el);
      player.fit(item);
      current.players.set(index, player);
    }
    player.play();
  }

  // Big copies of every image in the gallery, built fresh on each open
  function buildItems(gallery) {
    const items = gallery.entries.map(({ img }) => {
      const item = itemShell.cloneNode(false);
      item.setAttribute("data-lightbox", "item");
      // A video without a poster starts with an empty item
      if (!img) return item;
      const big = img.cloneNode(false);
      big.removeAttribute("data-lightbox");
      big.removeAttribute("style");
      Object.assign(big.style, FIT);
      big.loading = "eager";
      // Ask for a large source from srcset, since it fills the screen
      if (big.srcset) big.sizes = "90vw";
      item.appendChild(big);
      return item;
    });
    list.replaceChildren(...items);
    return items;
  }

  // ————— Open ————— //
  function open(gallery, index) {
    if (current) return;
    mainTimeline.clear();
    gsap.killTweensOf([wrapper, nav]);

    const entry = gallery.entries[index];
    const items = buildItems(gallery);
    current = {
      gallery,
      index,
      entry,
      items,
      players: new Map(),
      flipped: false,
      placeholder: null,
    };
    if (counter.total) counter.total.textContent = gallery.entries.length;
    // Nothing to step through in a gallery of one
    const solo = gallery.entries.length < 2;
    [buttons.prev, buttons.next].forEach((button) => {
      if (button) button.style.visibility = solo ? "hidden" : "";
    });
    // Videos start once the image has landed (see the end of the timeline)
    setActive(index, { media: false });
    suspendPreviews();

    wrapper.classList.add("is-active");
    wrapper.style.display = "flex";
    document.addEventListener("keydown", onKeydown);

    const tl = gsap.timeline();
    const targetItem = items[index];

    // Fade out the rest of this gallery
    gallery.entries.forEach(({ parent }, i) => {
      if (i === index) return;
      gsap.to(parent, {
        autoAlpha: 0,
        duration: MOTION.fadeOthers.duration,
        stagger: MOTION.fadeOthers.stagger,
        overwrite: true,
      });
    });

    // Flip only from an image that's actually on screen (a video button's
    // placeholder image may be hidden)
    const canFlip = hasFlip && entry.img && entry.img.getClientRects().length;
    if (canFlip) {
      current.flipped = true;
      // Fly the real image into the lightbox; keep its space on the page
      const { trigger, img } = entry;
      const state = Flip.getState(img);
      trigger.style.height = `${trigger.getBoundingClientRect().height}px`;
      current.placeholder = img.nextSibling;
      // Remember the image's own inline styles so close can put them back
      current.imgStyle = img.getAttribute("style");
      targetItem.querySelector("img").style.display = "none";
      targetItem.appendChild(img);
      Object.assign(img.style, FIT);
      tl.add(
        Flip.from(state, {
          targets: img,
          absolute: true,
          duration: MOTION.flip.duration,
          ease: MOTION.flip.ease,
        }),
        0
      );
    } else {
      tl.fromTo(
        targetItem,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: MOTION.open.duration },
        0
      );
    }

    tl.to(
      wrapper,
      {
        backgroundColor: MOTION.backdrop,
        duration: MOTION.open.duration,
        ease: "power4.inOut",
      },
      0
    ).fromTo(
      nav,
      { autoAlpha: 0, y: "1rem" },
      {
        autoAlpha: 1,
        y: "0rem",
        duration: MOTION.open.duration,
        ease: "power4.inOut",
        stagger: { each: MOTION.open.navStagger, from: "center" },
      },
      MOTION.open.navDelay
    );
    // Move focus into the lightbox once the nav is visible (hidden elements
    // can't take focus)
    tl.call(
      () => buttons.close?.focus({ preventScroll: true }),
      null,
      MOTION.open.navDelay + 0.01
    );
    // Start the video (if this is one) when the poster has landed
    tl.call(
      () => current && activateMedia(current.index),
      null,
      MOTION.flip.duration
    );
    mainTimeline.add(tl);
  }

  // ————— Close ————— //
  function close() {
    if (!current) return;
    const { gallery, entry, items, players, flipped, placeholder, imgStyle } =
      current;
    const active = items[current.index];
    current = null;
    // Stop and unload every video straight away
    players.forEach((player) => player.destroy());
    resumePreviews();
    document.removeEventListener("keydown", onKeydown);

    mainTimeline.clear();
    gsap.killTweensOf([wrapper, nav, ...items, entry.img].filter(Boolean));
    gallery.entries.forEach(({ parent }) => gsap.killTweensOf(parent));

    // Put the real image back where it came from
    if (flipped && entry.img.parentElement !== entry.trigger) {
      if (imgStyle === null) entry.img.removeAttribute("style");
      else entry.img.setAttribute("style", imgStyle);
      entry.trigger.insertBefore(
        entry.img,
        placeholder?.parentElement === entry.trigger ? placeholder : null
      );
    }

    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => {
        wrapper.classList.remove("is-active");
        list.replaceChildren();
        entry.trigger.style.removeProperty("height");
        // Clear only what the lightbox set, so other inline styles survive
        gsap.set(wrapper, { clearProps: "backgroundColor,display" });
        gsap.set(nav, { clearProps: "opacity,visibility,transform" });
        gsap.set(
          gallery.entries.map((e) => e.parent),
          { clearProps: "opacity,visibility" }
        );
      },
    });

    tl.to(
      gallery.entries.map((e) => e.parent),
      {
        autoAlpha: 1,
        duration: MOTION.close.fadeIn,
        stagger: MOTION.close.stagger,
        overwrite: true,
      }
    )
      .to(
        nav,
        { autoAlpha: 0, y: "1rem", duration: MOTION.close.duration },
        "<"
      )
      .to(
        wrapper,
        { backgroundColor: "rgba(0,0,0,0)", duration: MOTION.close.duration },
        "<"
      )
      .to(active, { autoAlpha: 0, duration: MOTION.close.duration }, "<");
    mainTimeline.add(tl);

    entry.trigger.focus?.({ preventScroll: true });
  }

  function step(delta) {
    if (!current) return;
    const total = current.items.length;
    setActive((current.index + delta + total) % total);
  }

  // ————— Events ————— //
  function onPageClick(event) {
    const trigger = event.target.closest(TRIGGERS);
    if (!trigger || current) return;
    for (const gallery of galleries) {
      const index = gallery.entries.findIndex((e) => e.trigger === trigger);
      if (index > -1) {
        event.preventDefault();
        open(gallery, index);
        return;
      }
    }
  }

  function onTriggerKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const trigger = event.target.closest(TRIGGERS);
    if (!trigger || trigger.tagName === "BUTTON") return;
    event.preventDefault();
    trigger.click();
  }

  function onWrapperClick(event) {
    if (!current) return;
    // Keyboard "clicks" on buttons report detail 0; those are handled below
    if (event.detail === 0) return;
    const inside = event.target.closest(
      '[data-lightbox="item"].is-active img, [data-lightbox="item"].is-active [data-bunny-lightbox-init], [data-lightbox="item"].is-active video, [data-lightbox="nav"]'
    );
    if (!inside) close();
  }

  function onKeydown(event) {
    if (event.key === "Escape") close();
    else if (event.key === "ArrowRight") step(1);
    else if (event.key === "ArrowLeft") step(-1);
  }

  const onPrev = () => step(-1);
  const onNext = () => step(1);

  document.addEventListener("click", onPageClick);
  document.addEventListener("keydown", onTriggerKeydown);
  wrapper.addEventListener("click", onWrapperClick);
  buttons.prev?.addEventListener("click", onPrev);
  buttons.next?.addEventListener("click", onNext);
  buttons.close?.addEventListener("click", close);

  onDestroy(() => {
    active = false;
    mainTimeline.kill();
    document.removeEventListener("click", onPageClick);
    document.removeEventListener("keydown", onTriggerKeydown);
    document.removeEventListener("keydown", onKeydown);
    wrapper.removeEventListener("click", onWrapperClick);
    buttons.prev?.removeEventListener("click", onPrev);
    buttons.next?.removeEventListener("click", onNext);
    buttons.close?.removeEventListener("click", close);
  });
}
