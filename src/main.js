// Entry point. This is the only file Webflow loads (as dist/main.js).
//
// Order matters:
//   1. lib/gsap.js registers GSAP plugins before any module uses them
//   2. modules/global.js runs site-wide code
//   3. createModules() finds every [data-module] element and starts its component
import "./lib/gsap.js";
import "./modules/global.js";
import { createModules, runMount, runPageIn } from "./lib/modules.js";

function init() {
  createModules();
  runMount();
  runPageIn();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
