// Project slider (based on Osmo's Logo Card Testimonials).
// Projects stack on top of each other; the new hero image slides in over the
// old one while settling from a slight zoom, and the text fades in element by
// element. Prev/next arrows move through the projects and wrap around.
//
// Webflow attributes:
//   data-module="project-slider"          on the wrapper, required
//   data-project-slider-item              each project (works on a CMS Collection Item)
//   data-project-slider-hero              the project image, inside a slot with overflow hidden
//   data-project-slider-text              text that fades in, one element after another
//   data-project-slider-prev              previous arrow (can live inside each item)
//   data-project-slider-next              next arrow (can live inside each item)
//
// Sets data-project-slider-status="active" | "leaving" | "inactive" on items.
import { onDestroy } from "../lib/modules.js";

// Motion settings in seconds (distance in px). Tweak the feel here.
const MOTION = {
  distance: 20, // how far text travels on the way out and in
  textOut: { duration: 0.4, stagger: 0.1 },
  textIn: { start: 0.4, duration: 1, stagger: 0.1 }, // start = gap after old text begins leaving
  // The old hero stays put; the new one slides over it and zooms out to 1
  // ease: slow start, fast middle, slow landing (expo is the most pronounced)
  heroIn: { start: 0, duration: 1.2, scale: 1.15, ease: "expo.inOut" },
};

export default function projectSlider(root) {
  const items = Array.from(root.querySelectorAll("[data-project-slider-item]"));
  if (!items.length) return;

  const slides = items.map((item) => ({
    item,
    // data-project-slider-logo is the old name, still read until Webflow is updated
    hero: item.querySelector(
      "[data-project-slider-hero], [data-project-slider-logo]"
    ),
    texts: Array.from(item.querySelectorAll("[data-project-slider-text]")),
  }));

  let activeIndex = 0;
  let transition = null;
  let reduceMotion = false;

  function setStatus(slide, status) {
    slide.item.setAttribute("data-project-slider-status", status);
    slide.item.setAttribute("aria-hidden", String(status !== "active"));
  }

  // direction: 1 = next (content moves up), -1 = previous (content moves down)
  function goTo(nextIndex, direction) {
    if (nextIndex === activeIndex) return;
    if (transition) transition.progress(1);

    const outgoing = slides[activeIndex];
    const incoming = slides[nextIndex];

    setStatus(outgoing, "leaving");
    setStatus(incoming, "active");
    activeIndex = nextIndex;

    // Items share one grid cell, so DOM order decides which paints on top.
    // Lift the incoming item so its hero covers the old one in both directions.
    gsap.set(outgoing.item, { zIndex: 1 });
    gsap.set(incoming.item, { zIndex: 2 });

    transition = gsap.timeline({
      onComplete: () => {
        setStatus(outgoing, "inactive");
        gsap.set(
          [
            ...outgoing.texts,
            ...incoming.texts,
            outgoing.hero,
            incoming.hero,
            outgoing.item,
            incoming.item,
          ].filter(Boolean),
          {
            clearProps: "transform,opacity,zIndex",
          }
        );
        transition = null;
      },
    });

    if (reduceMotion) {
      transition
        .to(
          outgoing.item,
          {
            opacity: 0,
            duration: 0.4,
            ease: "power2.out",
          },
          0
        )
        .fromTo(
          incoming.item,
          {
            opacity: 0,
          },
          {
            opacity: 1,
            duration: 0.4,
            ease: "power2.out",
          },
          0
        );
      return;
    }

    transition
      .to(
        outgoing.texts,
        {
          // Keep rising out of view as the new text rises in, in page order (left to right)
          opacity: 0,
          y: direction * -MOTION.distance,
          duration: MOTION.textOut.duration,
          ease: "power3.in",
          stagger: {
            amount: MOTION.textOut.stagger,
          },
        },
        0
      )
      .fromTo(
        incoming.texts,
        {
          opacity: 0,
          y: direction * MOTION.distance,
        },
        {
          opacity: 1,
          y: 0,
          duration: MOTION.textIn.duration,
          ease: "power3.out",
          stagger: {
            amount: MOTION.textIn.stagger,
          },
        },
        MOTION.textIn.start
      );

    if (incoming.hero) {
      transition.fromTo(
        incoming.hero,
        {
          yPercent: 110 * direction,
          scale: MOTION.heroIn.scale,
        },
        {
          yPercent: 0,
          scale: 1,
          duration: MOTION.heroIn.duration,
          ease: MOTION.heroIn.ease,
        },
        MOTION.heroIn.start
      );
    }
  }

  function next() {
    goTo((activeIndex + 1) % slides.length, 1);
  }

  function prev() {
    goTo((activeIndex - 1 + slides.length) % slides.length, -1);
  }

  // One listener for every arrow pair (each CMS item carries its own arrows)
  function onClick(event) {
    if (event.target.closest("[data-project-slider-next]")) next();
    else if (event.target.closest("[data-project-slider-prev]")) prev();
  }

  function onKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const arrow = event.target.closest(
      "[data-project-slider-next], [data-project-slider-prev]"
    );
    if (!arrow) return;
    event.preventDefault();
    arrow.click();
  }

  // Arrows may be plain divs in Webflow: make them keyboard and screen reader friendly
  root
    .querySelectorAll("[data-project-slider-prev], [data-project-slider-next]")
    .forEach((arrow) => {
      const isNext = arrow.hasAttribute("data-project-slider-next");
      if (arrow.tagName !== "BUTTON") {
        arrow.setAttribute("role", "button");
        arrow.setAttribute("tabindex", "0");
      }
      arrow.setAttribute(
        "aria-label",
        isNext ? "Next project" : "Previous project"
      );
    });

  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeydown);

  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: reduce)", () => {
    reduceMotion = true;
    return () => {
      reduceMotion = false;
    };
  });

  slides.forEach((slide, index) =>
    setStatus(slide, index === activeIndex ? "active" : "inactive")
  );

  onDestroy(() => {
    transition?.kill();
    mm.revert();
    root.removeEventListener("click", onClick);
    root.removeEventListener("keydown", onKeydown);
  });
}
