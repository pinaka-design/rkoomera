// Tab system with optional autoplay (based on Osmo's Tab System with Autoplay Option).
// Clicking a tab opens its details and swaps the matching visual. With autoplay,
// a progress bar fills and moves on to the next tab when full.
//
// Webflow attributes:
//   data-module="tabs"                       on the wrapper, required
//   data-tabs="wrapper"                      on the wrapper (from Osmo's markup)
//   data-tabs-autoplay="true"                optional, remove to switch only on click
//   data-tabs-autoplay-duration="5000"       optional, milliseconds per tab
//   data-tabs="content-item"                 each clickable tab
//   data-tabs="item-details"                 the part that opens inside a tab
//   data-tabs="item-progress"                the autoplay progress bar inside a tab
//   data-tabs="visual-item"                  each visual, in the same order as the tabs
//
// Adds the "active" class to the current tab and visual.
import { onDestroy } from "../lib/modules.js";

export default function tabs(wrapper) {
  const contentItems = wrapper.querySelectorAll('[data-tabs="content-item"]');
  const visualItems = wrapper.querySelectorAll('[data-tabs="visual-item"]');
  if (!contentItems.length) return;

  const autoplay = wrapper.dataset.tabsAutoplay === "true";
  const autoplayDuration =
    parseInt(wrapper.dataset.tabsAutoplayDuration) || 5000;

  let activeContent = null; // keep track of active item/link
  let progressBarTween = null; // to stop/start the progress bar
  let timeline = null;

  const detailsOf = (item) => item.querySelector('[data-tabs="item-details"]');
  const barOf = (item) => item.querySelector('[data-tabs="item-progress"]');

  function startProgressBar(index) {
    if (progressBarTween) progressBarTween.kill();
    const bar = barOf(contentItems[index]);
    if (!bar) return;

    // Anything that should happen while a tab is active can go here
    gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
    progressBarTween = gsap.to(bar, {
      scaleX: 1,
      duration: autoplayDuration / 1000,
      ease: "power1.inOut",
      onComplete: () => {
        const nextIndex = (index + 1) % contentItems.length;
        switchTab(nextIndex); // once the bar is full, activate the next tab
      },
    });
  }

  function switchTab(index) {
    const incomingContent = contentItems[index];
    if (incomingContent === activeContent) return;

    // A new click interrupts any running switch and animates on from
    // wherever everything is right now, so fast clicking is never ignored
    if (progressBarTween) progressBarTween.kill();
    if (timeline) timeline.kill();

    const isFirstRun = !activeContent;
    const incomingVisual = visualItems[index];
    activeContent = incomingContent;

    contentItems.forEach((item) =>
      item.classList.toggle("active", item === incomingContent)
    );
    visualItems.forEach((visual) =>
      visual.classList.toggle("active", visual === incomingVisual)
    );

    timeline = gsap.timeline({
      defaults: { duration: 0.65, ease: "power3" },
      onComplete: () => {
        if (autoplay) startProgressBar(index); // start the autoplay bar
      },
    });

    // Close every other tab (no outgoing tab on the very first run)
    if (!isFirstRun) {
      contentItems.forEach((item, i) => {
        if (i === index) return;
        const bar = barOf(item);
        if (bar) {
          timeline
            .set(bar, { transformOrigin: "right center" }, 0)
            .to(bar, { scaleX: 0, duration: 0.3 }, 0);
        }
        timeline.to(detailsOf(item), { height: 0 }, 0);
        if (visualItems[i]) {
          timeline.to(visualItems[i], { autoAlpha: 0, xPercent: 3 }, 0);
        }
      });
    }

    // Start the incoming visual off to the side unless it is already partly in view
    if (incomingVisual) {
      const opacity = parseFloat(incomingVisual.style.opacity);
      if (isFirstRun || !(opacity > 0)) {
        gsap.set(incomingVisual, { autoAlpha: 0, xPercent: 3 });
      }
      timeline.to(incomingVisual, { autoAlpha: 1, xPercent: 0 }, 0.3);
    }

    timeline
      .to(detailsOf(incomingContent), { height: "auto" }, 0)
      .set(
        barOf(incomingContent),
        { scaleX: 0, transformOrigin: "left center" },
        0
      );
  }

  // On page load, set the first tab active
  switchTab(0);

  // Switch tabs on click
  const handlers = Array.from(contentItems).map((item, i) => {
    const handler = (event) => {
      event.preventDefault(); // tabs are links with href="#", don't jump to the top
      if (item === activeContent) return; // already active
      switchTab(i);
    };
    item.addEventListener("click", handler);
    return handler;
  });

  onDestroy(() => {
    progressBarTween?.kill();
    timeline?.kill();
    contentItems.forEach((item, i) =>
      item.removeEventListener("click", handlers[i])
    );
  });
}
