// GSAP and ScrollTrigger are loaded from the CDN in Webflow (before dist/main.js).
// This file registers plugins and is the one place to set animation defaults.

if (typeof gsap === "undefined") {
  console.error("[rkoomera] GSAP is missing. Load it before dist/main.js.");
} else if (typeof ScrollTrigger !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Site-wide defaults. Uncomment to apply to every tween.
// gsap.defaults({ ease: "power3.out", duration: 0.8 });

export const reduced = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
