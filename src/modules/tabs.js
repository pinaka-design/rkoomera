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
  let activeVisual = null;
  let isAnimating = false;
  let progressBarTween = null; // to stop/start the progress bar
  let timeline = null;

  function startProgressBar(index) {
    if (progressBarTween) progressBarTween.kill();
    const bar = contentItems[index].querySelector(
      '[data-tabs="item-progress"]'
    );
    if (!bar) return;

    // Anything that should happen while a tab is active can go here
    gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
    progressBarTween = gsap.to(bar, {
      scaleX: 1,
      duration: autoplayDuration / 1000,
      ease: "power1.inOut",
      onComplete: () => {
        if (!isAnimating) {
          const nextIndex = (index + 1) % contentItems.length;
          switchTab(nextIndex); // once the bar is full, activate the next tab
        }
      },
    });
  }

  function switchTab(index) {
    if (isAnimating || contentItems[index] === activeContent) return;

    isAnimating = true;
    if (progressBarTween) progressBarTween.kill(); // stop any running progress bar

    const outgoingContent = activeContent;
    const outgoingVisual = activeVisual;
    const outgoingBar = outgoingContent?.querySelector(
      '[data-tabs="item-progress"]'
    );

    const incomingContent = contentItems[index];
    const incomingVisual = visualItems[index];
    const incomingBar = incomingContent.querySelector(
      '[data-tabs="item-progress"]'
    );

    outgoingContent?.classList.remove("active");
    outgoingVisual?.classList.remove("active");
    incomingContent.classList.add("active");
    incomingVisual?.classList.add("active");

    timeline = gsap.timeline({
      defaults: { duration: 0.65, ease: "power3" },
      onComplete: () => {
        activeContent = incomingContent;
        activeVisual = incomingVisual;
        isAnimating = false;
        if (autoplay) startProgressBar(index); // start the autoplay bar
      },
    });

    // No outgoing tab on the very first run (page load)
    if (outgoingContent) {
      timeline
        .set(outgoingBar, { transformOrigin: "right center" })
        .to(outgoingBar, { scaleX: 0, duration: 0.3 }, 0)
        .to(outgoingVisual, { autoAlpha: 0, xPercent: 3 }, 0)
        .to(
          outgoingContent.querySelector('[data-tabs="item-details"]'),
          { height: 0 },
          0
        );
    }

    timeline
      .fromTo(
        incomingVisual,
        { autoAlpha: 0, xPercent: 3 },
        { autoAlpha: 1, xPercent: 0 },
        0.3
      )
      .fromTo(
        incomingContent.querySelector('[data-tabs="item-details"]'),
        { height: 0 },
        { height: "auto" },
        0
      )
      .set(incomingBar, { scaleX: 0, transformOrigin: "left center" }, 0);
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
