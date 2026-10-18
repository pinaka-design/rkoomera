// Rive animation (based on Osmo's Rive Setup).
// Loads the .riv file just before it scrolls into view, pauses it off-screen.
//
// Webflow attributes:
//   data-module="rive"                      required
//   data-rive-src="https://.../file.riv"    required
//   data-rive-artboard="Playful Button"     optional, defaults to the default artboard
//   data-rive-state-machine="State Machine 1"  optional, defaults to the first one
//   data-rive-fit="contain"                 optional (contain, cover, fill, ...)
//
// Sets data-rive-status="loading" | "loaded" | "error" on the element.
import { onDestroy, onView } from "../lib/modules.js";
import { reduced } from "../lib/gsap.js";

export default function riveModule(el) {
  if (typeof rive === "undefined") {
    console.error(
      "[rkoomera] Rive runtime is missing. Load @rive-app/canvas before dist/main.js."
    );
    return;
  }

  const source = el.dataset.riveSrc;
  if (!source) return;

  const artboardName = el.dataset.riveArtboard || undefined;
  const fit = el.dataset.riveFit || "contain";
  let stateMachineName = el.dataset.riveStateMachine || undefined;
  let canvas = null;
  let riveFile = null;
  let riveInstance = null;
  let resizeObserver = null;

  if (getComputedStyle(el).position === "static") {
    el.style.position = "relative";
  }

  // Start loading half a screen early, keep playing a quarter screen past the top
  const view = onView(el, {
    rootMargin: "25% 0px 50% 0px",
    callback: ({ isIn }) => (isIn ? handleEnter() : handleLeave()),
  });

  function handleEnter() {
    if (!riveFile) loadFile();
    else if (riveInstance && !reduced) riveInstance.play();
  }

  function handleLeave() {
    if (riveInstance && !reduced) riveInstance.pause();
  }

  function loadFile() {
    el.setAttribute("data-rive-status", "loading");
    canvas = document.createElement("canvas");
    canvas.classList.add("rive__canvas");
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;";
    el.appendChild(canvas);

    riveFile = new rive.RiveFile({
      src: source,
      onLoad: createInstance,
      onLoadError: handleError,
    });
    riveFile.init();
  }

  function createInstance() {
    const file = riveFile.getInstance();
    if (!stateMachineName) {
      const artboard = artboardName
        ? file.artboardByName(artboardName)
        : file.defaultArtboard();
      if (artboard) {
        if (artboard.stateMachineCount() > 0) {
          stateMachineName = artboard.stateMachineByIndex(0).name;
        }
        artboard.delete();
      }
    }

    riveInstance = new rive.Rive({
      riveFile,
      canvas,
      artboard: artboardName,
      stateMachines: stateMachineName,
      autoplay: !reduced,
      autoBind: true, // needed for files that use data binding / view models
      isTouchScrollEnabled: true,
      layout: new rive.Layout({ fit }),
      onLoad: handleLoad,
      onLoadError: handleError,
    });
  }

  function handleLoad() {
    const bounds = riveInstance.bounds;
    if (el.clientHeight === 0 && bounds) {
      el.style.aspectRatio = `${bounds.maxX - bounds.minX} / ${bounds.maxY - bounds.minY}`;
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
    }
    riveInstance.resizeDrawingSurfaceToCanvas();
    resizeObserver = new ResizeObserver(() =>
      riveInstance.resizeDrawingSurfaceToCanvas()
    );
    resizeObserver.observe(el);
    el.setAttribute("data-rive-status", "loaded");
    if (!view.inView && !reduced) riveInstance.pause();
  }

  function handleError() {
    el.setAttribute("data-rive-status", "error");
  }

  onDestroy(() => {
    resizeObserver?.disconnect();
    riveInstance?.cleanup();
    riveFile?.cleanup();
    canvas?.remove();
    el.removeAttribute("data-rive-status");
  });
}
