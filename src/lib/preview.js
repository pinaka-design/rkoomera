// Silent looping previews on video thumbnails.
// A thumbnail linked to a video plays a muted loop of that video while it's on
// screen. The thumbnail image stays underneath (as the poster, and for the
// lightbox flip) and the preview fades in once it's actually playing, so
// there's never a black frame.
//
// Previews load the first time they come near the screen, pause when they
// leave it and while the lightbox is open, and are skipped entirely for
// visitors who prefer reduced motion or have data saver on.
import { onView } from "./modules.js";
import { isHlsUrl, loadHls, prefersNativeHls } from "./video.js";

// Start loading a little before the thumbnail scrolls into view
const ROOT_MARGIN = "200px 0px";

const previews = new Set();
let suspended = false; // while the lightbox is open

const skipPreviews = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  navigator.connection?.saveData === true;

export function addPreview(trigger, url) {
  if (skipPreviews()) return;
  const img = trigger.querySelector("img");
  if (!img) return;

  const video = document.createElement("video");
  video.className = "rk-video-preview";
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";
  video.disablePictureInPicture = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("aria-hidden", "true");
  video.tabIndex = -1;
  video.addEventListener("playing", () => video.classList.add("is-playing"));
  trigger.appendChild(video);

  const preview = { video, img, url, inView: false, started: false };
  previews.add(preview);

  onView(trigger, {
    rootMargin: ROOT_MARGIN,
    callback: ({ isIn }) => {
      preview.inView = isIn;
      if (isIn) play(preview);
      else video.pause();
    },
  });
}

function play(preview) {
  if (suspended) return;
  if (!preview.started) start(preview);
  preview.ready.then(() => {
    if (preview.inView && !suspended) preview.video.play().catch(() => {});
  });
}

// First time on screen: match the thumbnail's look and attach the stream
function start(preview) {
  preview.started = true;
  const { video, img, url } = preview;
  const look = getComputedStyle(img);
  Object.assign(video.style, {
    objectPosition: look.objectPosition,
    borderRadius: look.borderRadius,
    outline: look.outline,
    outlineOffset: look.outlineOffset,
  });

  preview.ready = (async () => {
    if (!isHlsUrl(url) || prefersNativeHls(video)) {
      video.src = url;
      return;
    }
    const Hls = await loadHls();
    if (!Hls.isSupported()) {
      video.src = url;
      return;
    }
    // Pick the smallest rendition that fills the thumbnail, keep little buffer
    const hls = new Hls({
      capLevelToPlayerSize: true,
      maxBufferLength: 8,
      maxMaxBufferLength: 12,
    });
    hls.loadSource(url);
    hls.attachMedia(video);
  })().catch((error) => {
    console.error("[rkoomera] preview failed to start", url, error);
  });
}

// The lightbox pauses every preview while it's open
export function suspendPreviews() {
  suspended = true;
  previews.forEach(({ video }) => video.pause());
}

export function resumePreviews() {
  suspended = false;
  previews.forEach((preview) => {
    if (preview.inView) play(preview);
  });
}
