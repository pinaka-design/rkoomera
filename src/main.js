// Entry point. This is the only file Webflow loads (as dist/main.js).
//
// Order matters:
//   1. modules/global.js runs site-wide code straight away
//   2. once the page has loaded, setupGsap() registers GSAP plugins
//   3. createModules() finds every [data-module] element and starts its component
import "./modules/global.js";
import { setupGsap } from "./lib/gsap.js";
import { createModules, runMount, runPageIn } from "./lib/modules.js";

function init() {
  setupGsap();
  createModules();
  runMount();
  runPageIn();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
