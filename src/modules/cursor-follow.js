// Cursor follow: a button that follows the mouse around an area.
// The button rests in its place (e.g. the top-right corner of a project
// image). While the pointer moves over the area the button glides after it,
// staying inside the area, and when the pointer leaves it glides back.
//
// Desktop only: on touch screens, small screens and with reduced motion the
// button just stays where it is.
//
// Webflow attributes:
//   data-module="cursor-follow"        on the area (needs position relative)
//   data-cursor-follow="target"        the element that follows, inside the area
import { onDestroy } from "../lib/modules.js";
import { clamp } from "../utils/math.js";

// Motion settings in seconds. Tweak the feel here.
const MOTION = {
  follow: 0.6, // how long the button takes to catch up with the pointer
  ease: "power3.out",
};

const DESKTOP =
  "(hover: hover) and (pointer: fine) and (min-width: 992px) and (prefers-reduced-motion: no-preference)";

export default function cursorFollow(root) {
  const target = root.querySelector('[data-cursor-follow="target"]');
  if (!target) return;

  const mm = gsap.matchMedia();
  mm.add(DESKTOP, () => {
    const xTo = gsap.quickTo(target, "x", {
      duration: MOTION.follow,
      ease: MOTION.ease,
    });
    const yTo = gsap.quickTo(target, "y", {
      duration: MOTION.follow,
      ease: MOTION.ease,
    });

    // Where the button's centre sits at rest, relative to the area
    let rest = null;
    function measure() {
      const area = root.getBoundingClientRect();
      const box = target.getBoundingClientRect();
      const x = gsap.getProperty(target, "x");
      const y = gsap.getProperty(target, "y");
      rest = {
        x: box.left - area.left - x + box.width / 2,
        y: box.top - area.top - y + box.height / 2,
        halfW: box.width / 2,
        halfH: box.height / 2,
      };
    }

    function onMove(event) {
      if (!rest) measure();
      const area = root.getBoundingClientRect();
      // Centre the button on the pointer, but keep it inside the area
      const cx = clamp(
        rest.halfW,
        area.width - rest.halfW,
        event.clientX - area.left
      );
      const cy = clamp(
        rest.halfH,
        area.height - rest.halfH,
        event.clientY - area.top
      );
      xTo(cx - rest.x);
      yTo(cy - rest.y);
    }

    function onLeave() {
      xTo(0);
      yTo(0);
      rest = null; // measure again next time, in case the layout changed
    }

    root.addEventListener("pointerenter", measure);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);

    return () => {
      root.removeEventListener("pointerenter", measure);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      gsap.set(target, { clearProps: "transform" });
    };
  });

  onDestroy(() => mm.revert());
}
