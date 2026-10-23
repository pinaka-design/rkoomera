// GSAP and its plugins come from Webflow (Site settings → GSAP integration).
// This file registers plugins and is the one place to set animation defaults.
// setupGsap() runs from main.js once the page has loaded, so it never races
// Webflow's own script tags.

export function setupGsap() {
  if (typeof gsap === "undefined") {
    console.error(
      "[rkoomera] GSAP is missing. Enable it in Site settings → GSAP integration."
    );
    return;
  }
  // Register whichever plugins are ticked in Webflow
  const plugins = [window.ScrollTrigger, window.SplitText, window.Flip].filter(
    Boolean
  );
  if (plugins.length) gsap.registerPlugin(...plugins);

  // Site-wide defaults. Uncomment to apply to every tween.
  // gsap.defaults({ ease: "power3.out", duration: 0.8 });
}

export const reduced = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
