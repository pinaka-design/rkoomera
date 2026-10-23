// Video playback for the lightbox, using Osmo's Custom Bunny HLS player
// (the [data-bunny-lightbox-init] markup and its data-player-* attributes).
//
// The player markup placed in Webflow is used as a template: every video item
// gets its own copy, wired up by createPlayer(). Osmo's own lightbox parts
// (open/close, overlay, ESC, closing at the end) are handled by our lightbox
// instead, so a gallery can mix images and videos.
//
// Plays HLS streams (.m3u8, Bunny Stream's "HLS Playlist URL") and, unlike
// Osmo's version, plain video files too (.mp4, .webm, .mov). Safari plays HLS
// on its own; other browsers load hls.js the first time a stream is opened.

const HLS_SCRIPT = "https://cdn.jsdelivr.net/npm/hls.js@1.6.11";

const VIDEO_FILE = /\.(m3u8|mp4|webm|mov)(\?|#|$)/i;
const HLS_FILE = /\.m3u8(\?|#|$)/i;

export const isVideoUrl = (url) => VIDEO_FILE.test(url || "");
export const isHlsUrl = (url) => HLS_FILE.test(url || "");

// Play HLS natively only where it's reliable (Safari, which also has
// ManagedMediaSource); Chrome can answer "maybe" for HLS yet fail to play it,
// so everywhere else hls.js is used. Browsers with neither (older iOS) still
// fall back to the native player because hls.js reports it's unsupported.
export const prefersNativeHls = (video) =>
  !!video.canPlayType("application/vnd.apple.mpegurl") &&
  "ManagedMediaSource" in window;

// Osmo's player state CSS ("Webflow Custom CSS"), so the player works without
// that embed on the page
const PLAYER_CSS = `
[data-bunny-lightbox-init] :is(.bunny-lightbox-player__placeholder, .bunny-lightbox-player__dark, .bunny-lightbox-player__playpause, .bunny-lightbox-player__loading) { transition: opacity 0.3s linear, visibility 0.3s linear; }
[data-bunny-lightbox-init][data-player-status="playing"] .bunny-lightbox-player__placeholder,
[data-bunny-lightbox-init][data-player-status="paused"] .bunny-lightbox-player__placeholder,
[data-bunny-lightbox-init][data-player-activated="true"][data-player-status="ready"] .bunny-lightbox-player__placeholder { opacity: 0; visibility: hidden; }
[data-bunny-lightbox-init][data-player-status="paused"] .bunny-lightbox-player__dark,
[data-bunny-lightbox-init][data-player-status="playing"][data-player-hover="active"] .bunny-lightbox-player__dark { opacity: 0.3; }
[data-bunny-lightbox-init][data-player-status="playing"] .bunny-lightbox-player__dark { opacity: 0; }
[data-bunny-lightbox-init][data-player-status="playing"] .bunny-lightbox-player__playpause,
[data-bunny-lightbox-init][data-player-status="loading"] .bunny-lightbox-player__playpause { opacity: 0; }
[data-bunny-lightbox-init][data-player-status="playing"][data-player-hover="active"] .bunny-lightbox-player__playpause { opacity: 1; }
[data-bunny-lightbox-init][data-player-status="playing"] .bunny-lightbox-player__play-svg,
[data-bunny-lightbox-init][data-player-status="loading"] .bunny-lightbox-player__play-svg { display: none; }
[data-bunny-lightbox-init][data-player-status="playing"] .bunny-lightbox-player__pause-svg,
[data-bunny-lightbox-init][data-player-status="loading"] .bunny-lightbox-player__pause-svg { display: block; }
[data-bunny-lightbox-init][data-player-status="loading"] .bunny-lightbox-player__loading { opacity: 1; visibility: visible; }
.bunny-lightbox-player__interface { transition: all 0.6s cubic-bezier(0.625, 0.05, 0, 1); }
[data-bunny-lightbox-init][data-player-status="playing"] .bunny-lightbox-player__interface,
[data-bunny-lightbox-init][data-player-status="loading"] .bunny-lightbox-player__interface { opacity: 0; transform: translateY(1em) rotate(0.001deg); }
[data-bunny-lightbox-init][data-player-status="playing"][data-player-hover="active"] .bunny-lightbox-player__interface,
[data-bunny-lightbox-init][data-player-status="loading"][data-player-hover="active"] .bunny-lightbox-player__interface { opacity: 1; transform: translateY(0em) rotate(0.001deg); }
[data-bunny-lightbox-init][data-player-status="idle"][data-player-activated="false"] .bunny-lightbox-player__timeline,
[data-bunny-lightbox-init][data-player-status="ready"][data-player-activated="false"] .bunny-lightbox-player__timeline { pointer-events: none; }
[data-bunny-lightbox-init] .bunny-lightbox-player__timeline-handle { transition: transform 0.15s ease-in-out; }
[data-bunny-lightbox-init][data-timeline-drag="true"] .bunny-lightbox-player__timeline-handle { transform: translate(-50%, -50%) scale(1); }
[data-bunny-lightbox-init][data-player-fullscreen="true"] .bunny-lightbox-player__fullscreen-shrink-svg { display: block; }
[data-bunny-lightbox-init][data-player-fullscreen="true"] .bunny-lightbox-player__fullscreen-scale-svg { display: none; }
[data-bunny-lightbox-init][data-player-muted="true"] .bunny-lightbox-player__volume-mute-svg { display: block; }
[data-bunny-lightbox-init][data-player-muted="true"] .bunny-lightbox-player__volume-up-svg { display: none; }
`;

function addPlayerStyles() {
  if (document.getElementById("rk-player-styles")) return;
  const style = document.createElement("style");
  style.id = "rk-player-styles";
  style.textContent = PLAYER_CSS;
  document.head.appendChild(style);
}

let hlsLoading = null;
export function loadHls() {
  if (window.Hls) return Promise.resolve(window.Hls);
  hlsLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = HLS_SCRIPT;
    script.onload = () => resolve(window.Hls);
    script.onerror = () => {
      hlsLoading = null;
      reject(new Error("hls.js failed to load"));
    };
    document.head.appendChild(script);
  });
  return hlsLoading;
}

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "00:00";
  const pad = (n) => (n < 10 ? "0" : "") + n;
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}

// Find and detach the player markup, so it can be copied for each video
export function takePlayerTemplate(scope = document) {
  const player = scope.querySelector("[data-bunny-lightbox-init]");
  if (!player) return null;
  const template = player.cloneNode(true);
  // Osmo's own lightbox wrapper around it isn't used
  (player.closest("[data-bunny-lightbox-status]") || player).remove();
  return template;
}

// One playable copy of the template for `url`. fit(box) sizes it inside an
// element (keeping the video's aspect ratio); destroy() stops all loading.
export function createPlayer(template, url, { poster = "" } = {}) {
  addPlayerStyles();
  const player = template.cloneNode(true);
  const video = player.querySelector("video");
  const placeholder = player.querySelector("[data-bunny-lightbox-placeholder]");
  const before = player.querySelector("[data-player-before]");
  const timeline = player.querySelector("[data-player-timeline]");
  const progressBar = player.querySelector("[data-player-progress]");
  const bufferedBar = player.querySelector("[data-player-buffered]");
  const handle = player.querySelector("[data-player-timeline-handle]");
  const durationEls = player.querySelectorAll("[data-player-time-duration]");
  const progressEls = player.querySelectorAll("[data-player-time-progress]");

  const listeners = new AbortController();
  const { signal } = listeners;
  let hls = null;
  let rafId = 0;
  let pendingPlay = false;
  let destroyed = false;
  let fitBox = null;
  let resizeObserver = null;

  const setAttr = (name, val) => {
    const str = typeof val === "boolean" ? String(val) : String(val);
    if (player.getAttribute(name) !== str) player.setAttribute(name, str);
  };
  const setStatus = (s) => setAttr("data-player-status", s);
  const setActivated = (v) => setAttr("data-player-activated", !!v);
  const setMuted = (v) => {
    video.muted = !!v;
    setAttr("data-player-muted", video.muted);
  };
  const setText = (nodes, text) =>
    nodes.forEach((n) => {
      n.textContent = text;
    });

  setStatus("idle");
  setActivated(false);
  setAttr("data-player-hover", "idle");
  setAttr("data-player-src", url);
  setMuted(player.getAttribute("data-player-muted") === "true");
  if (placeholder && poster) placeholder.setAttribute("src", poster);

  video.loop = false;
  video.autoplay = false;
  video.preload = "auto";
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  if ("disableRemotePlayback" in video) video.disableRemotePlayback = true;

  // ————— Sizing: keep the video's ratio inside the box ————— //
  let ratio = 16 / 10;
  function setRatio(w, h) {
    if (!w || !h) return;
    ratio = w / h;
    if (before) before.style.paddingTop = `${(h / w) * 100}%`;
    applyFit();
  }
  function applyFit() {
    if (!fitBox) return;
    const { width, height } = fitBox.getBoundingClientRect();
    if (!width || !height) return;
    player.style.width = `${Math.min(width, height * ratio)}px`;
  }
  function updateRatio() {
    if (video.videoWidth && video.videoHeight) {
      setRatio(video.videoWidth, video.videoHeight);
      return;
    }
    const levels = hls?.levels;
    if (levels?.length) {
      const best = levels.reduce((a, b) =>
        (b.width || 0) > (a.width || 0) ? b : a
      );
      if (best.width && best.height) setRatio(best.width, best.height);
    }
  }
  // Before the video loads, the poster's shape is the best guess
  if (placeholder && poster) {
    placeholder.addEventListener(
      "load",
      () => setRatio(placeholder.naturalWidth, placeholder.naturalHeight),
      { signal, once: true }
    );
  }

  // ————— Loading ————— //
  const ready = (async () => {
    if (!HLS_FILE.test(url) || prefersNativeHls(video)) {
      video.src = url;
      return;
    }
    const Hls = await loadHls();
    if (destroyed) return;
    if (!Hls.isSupported()) {
      video.src = url;
      return;
    }
    hls = new Hls({ maxBufferLength: 10 });
    hls.attachMedia(video);
    hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));
    hls.on(Hls.Events.MANIFEST_PARSED, updateRatio);
    hls.on(Hls.Events.LEVEL_LOADED, (e, data) => {
      const total = data?.details?.totalduration;
      if (isFinite(total)) setText(durationEls, formatTime(total));
    });
  })().catch((error) => {
    console.error("[rkoomera] video failed to start", url, error);
  });

  function safePlay() {
    const p = video.play();
    if (p?.catch) p.catch(() => {});
  }

  function play() {
    pendingPlay = true;
    setStatus("loading");
    ready.then(() => !destroyed && safePlay());
  }

  function pause() {
    try {
      if (!video.paused && !video.ended) video.pause();
    } catch (_) {}
  }

  function togglePlay() {
    if (video.paused || video.ended) play();
    else video.pause();
  }

  // ————— Controls ————— //
  player.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("[data-player-control]");
      if (!btn || !player.contains(btn)) return;
      const type = btn.getAttribute("data-player-control");
      if (type === "play" || type === "pause" || type === "playpause")
        togglePlay();
      else if (type === "mute") setMuted(!video.muted);
      else if (type === "fullscreen") toggleFullscreen();
    },
    { signal }
  );

  const isFs = () =>
    !!(document.fullscreenElement || document.webkitFullscreenElement);
  function toggleFullscreen() {
    if (isFs() || video.webkitDisplayingFullscreen) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (video.webkitExitFullscreen) video.webkitExitFullscreen();
    } else if (player.requestFullscreen) player.requestFullscreen();
    else if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  }
  const onFsChange = () => setAttr("data-player-fullscreen", isFs());
  document.addEventListener("fullscreenchange", onFsChange, { signal });
  document.addEventListener("webkitfullscreenchange", onFsChange, { signal });
  video.addEventListener(
    "webkitbeginfullscreen",
    () => setAttr("data-player-fullscreen", true),
    { signal }
  );
  video.addEventListener(
    "webkitendfullscreen",
    () => setAttr("data-player-fullscreen", false),
    { signal }
  );

  // ————— Time, progress and buffered ————— //
  function updateTimeTexts() {
    setText(durationEls, formatTime(video.duration));
    setText(progressEls, formatTime(video.currentTime));
  }
  const clamp = (p) => Math.min(100, Math.max(0, p));
  function updateProgress() {
    if (!video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    if (progressBar) progressBar.style.transform = `translateX(${-100 + pct}%)`;
    if (handle) handle.style.left = `${clamp(pct)}%`;
  }
  function loop() {
    updateProgress();
    if (!video.paused && !video.ended) rafId = requestAnimationFrame(loop);
  }
  function updateBuffered() {
    if (!bufferedBar || !video.duration || !video.buffered.length) return;
    const end = video.buffered.end(video.buffered.length - 1);
    bufferedBar.style.transform = `translateX(${-100 + (end / video.duration) * 100}%)`;
  }

  const on = (type, fn) => video.addEventListener(type, fn, { signal });
  on("timeupdate", updateTimeTexts);
  on("durationchange", () => {
    updateTimeTexts();
    updateBuffered();
  });
  on("loadedmetadata", () => {
    updateTimeTexts();
    updateBuffered();
    updateRatio();
  });
  on("loadeddata", updateRatio);
  on("progress", updateBuffered);
  on("play", () => {
    setActivated(true);
    cancelAnimationFrame(rafId);
    loop();
    setStatus("playing");
  });
  on("playing", () => {
    pendingPlay = false;
    setStatus("playing");
    updateRatio();
  });
  on("pause", () => {
    pendingPlay = false;
    cancelAnimationFrame(rafId);
    updateProgress();
    setStatus("paused");
  });
  on("waiting", () => setStatus("loading"));
  on("canplay", () => {
    if (
      !pendingPlay &&
      player.getAttribute("data-player-activated") !== "true" &&
      player.getAttribute("data-player-status") === "idle"
    ) {
      setStatus("ready");
    }
  });
  // At the end, go back to the start and show the play button; the lightbox
  // stays open so the rest of the gallery is still there
  on("ended", () => {
    pendingPlay = false;
    cancelAnimationFrame(rafId);
    updateProgress();
    setActivated(false);
    video.currentTime = 0;
    if (isFs()) toggleFullscreen();
    setStatus("paused");
  });

  // ————— Scrubbing ————— //
  if (timeline) {
    let dragging = false;
    let wasPlaying = false;
    let targetTime = 0;
    let lastSeek = 0;
    let rect = null;
    const fractionAt = (x) => {
      rect ??= timeline.getBoundingClientRect();
      return Math.min(1, Math.max(0, (x - rect.left) / rect.width));
    };
    const preview = (f) => {
      if (!video.duration) return;
      if (progressBar)
        progressBar.style.transform = `translateX(${-100 + f * 100}%)`;
      if (handle) handle.style.left = `${f * 100}%`;
      setText(progressEls, formatTime(f * video.duration));
    };
    const maybeSeek = (now) => {
      if (!video.duration || now - lastSeek < 180) return;
      lastSeek = now;
      video.currentTime = targetTime;
    };
    const onMove = (e) => {
      if (!dragging) return;
      const f = fractionAt(e.clientX);
      targetTime = f * video.duration;
      preview(f);
      maybeSeek(performance.now());
      e.preventDefault();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      player.setAttribute("data-timeline-drag", "false");
      rect = null;
      video.currentTime = targetTime;
      if (wasPlaying) safePlay();
      else {
        updateProgress();
        updateTimeTexts();
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    const onDown = (e) => {
      if (!video.duration) return;
      dragging = true;
      wasPlaying = !video.paused && !video.ended;
      if (wasPlaying) video.pause();
      player.setAttribute("data-timeline-drag", "true");
      rect = timeline.getBoundingClientRect();
      const f = fractionAt(e.clientX);
      targetTime = f * video.duration;
      preview(f);
      maybeSeek(performance.now());
      timeline.setPointerCapture?.(e.pointerId);
      window.addEventListener("pointermove", onMove, {
        passive: false,
        signal,
      });
      window.addEventListener("pointerup", onUp, { passive: true, signal });
      e.preventDefault();
    };
    timeline.addEventListener("pointerdown", onDown, {
      passive: false,
      signal,
    });
    handle?.addEventListener("pointerdown", onDown, { passive: false, signal });
  }

  // ————— Hover / idle: controls fade out after 3s without movement ————— //
  let hoverTimer = 0;
  const setHover = (state) => setAttr("data-player-hover", state);
  const wake = () => {
    setHover("active");
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => setHover("idle"), 3000);
  };
  const onGlobalMove = (e) => {
    const r = player.getBoundingClientRect();
    if (
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom
    ) {
      wake();
    }
  };
  player.addEventListener("pointerdown", wake, { signal });
  player.addEventListener(
    "pointerenter",
    () => {
      wake();
      window.addEventListener("pointermove", onGlobalMove, {
        passive: true,
        signal,
      });
    },
    { signal }
  );
  player.addEventListener(
    "pointerleave",
    () => {
      setHover("idle");
      clearTimeout(hoverTimer);
      window.removeEventListener("pointermove", onGlobalMove);
    },
    { signal }
  );
  document.addEventListener("fullscreenchange", wake, { signal });

  return {
    el: player,
    play,
    pause,
    fit(box) {
      fitBox = box;
      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(applyFit);
      resizeObserver.observe(box);
      applyFit();
    },
    destroy() {
      destroyed = true;
      pause();
      cancelAnimationFrame(rafId);
      clearTimeout(hoverTimer);
      listeners.abort();
      resizeObserver?.disconnect();
      try {
        hls?.destroy();
      } catch (_) {}
      video.removeAttribute("src");
      video.load();
      player.remove();
    },
  };
}

// Without the Osmo player markup on the page, fall back to a plain <video>
export function createNativePlayer(url, { poster = "" } = {}) {
  const video = document.createElement("video");
  video.controls = true;
  video.playsInline = true;
  video.preload = "auto";
  if (poster) video.poster = poster;
  Object.assign(video.style, { maxWidth: "100%", maxHeight: "100%" });
  let hls = null;
  let destroyed = false;
  const ready = (async () => {
    if (!HLS_FILE.test(url) || prefersNativeHls(video)) {
      video.src = url;
      return;
    }
    const Hls = await loadHls();
    if (destroyed) return;
    if (!Hls.isSupported()) {
      video.src = url;
      return;
    }
    hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
  })().catch((error) => {
    console.error("[rkoomera] video failed to start", url, error);
  });
  return {
    el: video,
    play: () => ready.then(() => !destroyed && video.play()).catch(() => {}),
    pause: () => video.pause(),
    fit() {},
    destroy() {
      destroyed = true;
      video.pause();
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
      video.remove();
    },
  };
}
