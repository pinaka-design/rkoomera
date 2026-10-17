// Rive Setup (Osmo Supply)
// Requires GSAP + ScrollTrigger and the Rive canvas runtime to be loaded before this file.

gsap.registerPlugin(ScrollTrigger);

function initRiveSetup() {
  const targets = document.querySelectorAll("[data-rive-init]");
  if (!targets.length) return () => {};

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const instances = [];

  targets.forEach((target) => {
    const source = target.getAttribute("data-rive-src");
    if (!source) return;

    const artboardName = target.getAttribute("data-rive-artboard") || undefined;
    const fit = target.getAttribute("data-rive-fit") || "contain";
    let stateMachineName = target.getAttribute("data-rive-state-machine") || undefined;
    let canvas = null;
    let riveFile = null;
    let riveInstance = null;
    let resizeObserver = null;

    if (getComputedStyle(target).position === "static") {
      target.style.position = "relative";
    }

    const scrollTrigger = ScrollTrigger.create({
      trigger: target,
      start: "top bottom+=50%",
      end: "bottom top-=25%",
      onEnter: handleEnter,
      onEnterBack: handleEnter,
      onLeave: handleLeave,
      onLeaveBack: handleLeave,
    });

    function handleEnter() {
      if (!riveFile) {
        loadFile();
      } else if (riveInstance && !reduceMotion) {
        riveInstance.play();
      }
    }

    function handleLeave() {
      if (riveInstance && !reduceMotion) {
        riveInstance.pause();
      }
    }

    function loadFile() {
      target.setAttribute("data-rive-status", "loading");
      canvas = document.createElement("canvas");
      canvas.classList.add("rive__canvas");
      target.appendChild(canvas);

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
        const artboard = artboardName ? file.artboardByName(artboardName) : file.defaultArtboard();
        if (artboard) {
          if (artboard.stateMachineCount() > 0) {
            stateMachineName = artboard.stateMachineByIndex(0).name;
          }
          artboard.delete();
        }
      }

      riveInstance = new rive.Rive({
        riveFile: riveFile,
        canvas: canvas,
        artboard: artboardName,
        stateMachine: stateMachineName,
        autoplay: !reduceMotion,
        isTouchScrollEnabled: true,
        layout: new rive.Layout({ fit: fit }),
        onLoad: handleLoad,
        onLoadError: handleError,
      });
    }

    function handleLoad() {
      const bounds = riveInstance.bounds;
      if (target.clientHeight === 0 && bounds) {
        target.style.aspectRatio = `${bounds.maxX - bounds.minX} / ${bounds.maxY - bounds.minY}`;
        ScrollTrigger.refresh();
      }
      riveInstance.resizeDrawingSurfaceToCanvas();
      resizeObserver = new ResizeObserver(() => riveInstance.resizeDrawingSurfaceToCanvas());
      resizeObserver.observe(target);
      target.setAttribute("data-rive-status", "loaded");
      if (!scrollTrigger.isActive && !reduceMotion) {
        riveInstance.pause();
      }
    }

    function handleError() {
      target.setAttribute("data-rive-status", "error");
    }

    instances.push({
      destroy() {
        scrollTrigger.kill();
        if (resizeObserver) resizeObserver.disconnect();
        if (riveInstance) riveInstance.cleanup();
        if (riveFile) riveFile.cleanup();
        if (canvas) canvas.remove();
        target.removeAttribute("data-rive-status");
      },
    });
  });

  return () => {
    instances.forEach((instance) => instance.destroy());
  };
}

// Initialize Rive Setup
document.addEventListener("DOMContentLoaded", () => {
  initRiveSetup();
});
