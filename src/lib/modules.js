// The component system.
//
// Every element with data-module="name" gets the matching function from
// modules/registry.js, called once as: componentFn(element, element.dataset)
//
// Lifecycle hooks a component can use:
//   onMount(fn)          run after every component has been created
//   onPageIn(fn)         page enter animations (can return a Promise)
//   onPageOut(fn)        page leave animations (for future page transitions)
//   onDestroy(fn)        cleanup (remove listeners, kill tweens, etc.)
//   onView(el, config)   know when an element enters/leaves the viewport
import { Observe } from "./observe.js";
import { registry } from "../modules/registry.js";

const mountFns = [];
const destroyFns = [];
const pageInFns = [];
const pageOutFns = [];

export function onMount(fn) {
  mountFns.push(fn);
}

export function onDestroy(fn) {
  destroyFns.push(fn);
}

export function onPageIn(fn) {
  pageInFns.push(fn);
}

export function onPageOut(fn) {
  pageOutFns.push(fn);
}

/**
 * Watch when an element enters or exits the viewport.
 * Cleaned up automatically on destroy.
 *
 *   onView(el, {
 *     rootMargin: "0px",          // grow/shrink the viewport box
 *     once: false,                // stop watching after the first enter
 *     callback: ({ isIn, direction }) => { ... },
 *   });
 */
export function onView(element, config = {}) {
  const observer = new Observe(element, config);
  onDestroy(() => observer.destroy());
  return observer;
}

export function runMount() {
  mountFns.forEach((fn) => fn());
  mountFns.length = 0;
}

export function runDestroy() {
  destroyFns.forEach((fn) => fn());
  destroyFns.length = 0;
}

export async function runPageIn() {
  await Promise.allSettled(pageInFns.map((fn) => fn()));
  pageInFns.length = 0;
}

export async function runPageOut() {
  await Promise.allSettled(pageOutFns.map((fn) => fn()));
  pageOutFns.length = 0;
}

export function createModules(scope = document) {
  scope.querySelectorAll("[data-module]").forEach((el) => {
    if (el._moduleInit) return;
    const name = el.dataset.module;
    const moduleFn = registry[name];
    if (!moduleFn) {
      console.warn(
        `[rkoomera] No component registered for data-module="${name}"`
      );
      return;
    }
    el._moduleInit = true;
    try {
      moduleFn(el, el.dataset);
    } catch (error) {
      // One broken component should never take down the rest of the page
      console.error(`[rkoomera] data-module="${name}" failed to start`, error);
    }
  });
}
