// Register every component here.
//
// The key must match the data-module value in Webflow:
//   data-module="rive"  ->  rive
// Use quotes for hyphenated names:  "nav-offset": navOffset
//
// Components live in /modules, scroll/motion effects in /animations.
// Both are registered the same way.
import rive from "./rive.js";
import projectSlider from "./project-slider.js";
import tabs from "./tabs.js";

export const registry = {
  rive,
  "project-slider": projectSlider,
  tabs,
};
