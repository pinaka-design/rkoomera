// Media query helpers. Breakpoints match Webflow's defaults.

const matches = (query) => window.matchMedia(query).matches;

export const prefersReducedMotion = () =>
  matches("(prefers-reduced-motion: reduce)");

export const canHover = () => matches("(hover: hover)");

/** Webflow "Tablet" and below */
export const isTablet = () => matches("(max-width: 991px)");

/** Webflow "Mobile landscape" and below */
export const isMobile = () => matches("(max-width: 767px)");
