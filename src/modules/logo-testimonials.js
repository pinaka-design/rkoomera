// Logo Card Testimonials (based on Osmo's Logo Card Testimonials).
// Testimonials stack on top of each other; the logo rolls and the text fades in
// line by line. Dots show progress and jump to a testimonial on click.
//
// Webflow attributes:
//   data-module="logo-testimonials"          on the wrapper, required
//   data-logo-testimonials-autoplay="6"      seconds per slide, 0 or missing = click only
//   data-logo-testimonials-item              each testimonial (works on a CMS Collection Item)
//   data-logo-testimonials-logo              the logo inside .logo-testimonials__logo-slot
//   data-logo-testimonials-split             text that fades in line by line
//   data-logo-testimonials-dots              dots wrapper, holding one dot as the blueprint
//   data-logo-testimonials-dot               the dot blueprint (cloned per testimonial)
//   data-logo-testimonials-dot-fill          progress fill inside the dot
//
// Sets data-logo-testimonials-status="active" | "leaving" | "inactive" on items and dots.
// Needs SplitText enabled in Site settings → GSAP integration.
import { onDestroy, onView } from "../lib/modules.js";

export default function logoTestimonials(root) {
  if (typeof SplitText === "undefined") {
    console.error(
      "[rkoomera] SplitText is missing. Tick it in Site settings → GSAP integration."
    );
    return;
  }

  const items = Array.from(
    root.querySelectorAll("[data-logo-testimonials-item]")
  );
  if (!items.length) return;

  const dotsWrap = root.querySelector("[data-logo-testimonials-dots]");
  const dotTemplate = dotsWrap.querySelector("[data-logo-testimonials-dot]");
  const autoplaySeconds =
    parseFloat(root.getAttribute("data-logo-testimonials-autoplay")) || 0;

  dotTemplate.remove();

  const slides = items.map((item, index) => {
    const dot = dotTemplate.cloneNode(true);
    dot.setAttribute("aria-label", `Show testimonial ${index + 1}`);
    dot.addEventListener("click", () => goTo(index));
    dotsWrap.appendChild(dot);

    return {
      item,
      dot,
      fill: dot.querySelector("[data-logo-testimonials-dot-fill]"),
      logo: item.querySelector("[data-logo-testimonials-logo]"),
      splits: Array.from(
        item.querySelectorAll("[data-logo-testimonials-split]")
      ).map((element) =>
        SplitText.create(element, {
          type: "lines",
          autoSplit: true,
        })
      ),
      getLines() {
        return this.splits.flatMap((split) => split.lines);
      },
    };
  });

  let activeIndex = 0;
  let transition = null;
  let timer = null;
  let isInView = false;
  let isHeld = false;
  let reduceMotion = false;

  function setStatus(slide, status) {
    const isActive = status === "active";
    slide.item.setAttribute("data-logo-testimonials-status", status);
    slide.item.setAttribute("aria-hidden", String(!isActive));
    slide.dot.setAttribute(
      "data-logo-testimonials-status",
      isActive ? "active" : "inactive"
    );
    slide.dot.setAttribute("aria-current", String(isActive));
  }

  function startTimer() {
    if (timer) timer.kill();

    const activeFill = slides[activeIndex].fill;

    gsap.set(
      slides.map((slide) => slide.fill),
      {
        scaleX: 0,
      }
    );

    if (!autoplaySeconds) {
      gsap.set(activeFill, {
        scaleX: 1,
      });
      return;
    }

    timer = gsap.fromTo(
      activeFill,
      {
        scaleX: 0,
      },
      {
        scaleX: 1,
        duration: autoplaySeconds,
        ease: "none",
        onComplete: () => goTo((activeIndex + 1) % slides.length),
      }
    );
    updateTimer();
  }

  function updateTimer() {
    if (!timer) return;
    if (isInView && !isHeld) timer.resume();
    else timer.pause();
  }

  function goTo(nextIndex) {
    if (nextIndex === activeIndex) return;
    if (transition) transition.progress(1);

    const outgoing = slides[activeIndex];
    const incoming = slides[nextIndex];
    const outgoingLines = outgoing.getLines();
    const incomingLines = incoming.getLines();

    setStatus(outgoing, "leaving");
    setStatus(incoming, "active");
    activeIndex = nextIndex;
    startTimer();

    transition = gsap.timeline({
      onComplete: () => {
        setStatus(outgoing, "inactive");
        gsap.set(
          [
            ...outgoingLines,
            ...incomingLines,
            outgoing.logo,
            incoming.logo,
            outgoing.item,
            incoming.item,
          ].filter(Boolean),
          {
            clearProps: "transform,opacity",
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
        outgoingLines,
        {
          opacity: 0,
          duration: 0.4,
          ease: "power2.out",
          stagger: {
            amount: 0.1,
          },
        },
        0
      )
      .fromTo(
        incomingLines,
        {
          opacity: 0,
          yPercent: 40,
        },
        {
          opacity: 1,
          yPercent: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: {
            amount: 0.3,
          },
        },
        0.35
      );

    if (outgoing.logo && incoming.logo) {
      transition
        .to(
          outgoing.logo,
          {
            yPercent: -110,
            duration: 0.6,
            ease: "power4.inOut",
          },
          0
        )
        .fromTo(
          incoming.logo,
          {
            yPercent: 110,
          },
          {
            yPercent: 0,
            duration: 0.7,
            ease: "power4.inOut",
          },
          0.15
        );
    }
  }

  function onHold() {
    isHeld = true;
    updateTimer();
  }

  function onRelease(event) {
    if (event.type === "focusout" && root.contains(event.relatedTarget)) return;
    isHeld = false;
    updateTimer();
  }

  root.addEventListener("pointerenter", onHold);
  root.addEventListener("pointerleave", onRelease);
  root.addEventListener("focusin", onHold);
  root.addEventListener("focusout", onRelease);

  onView(root, {
    callback: ({ isIn }) => {
      isInView = isIn;
      updateTimer();
    },
  });

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
  startTimer();

  onDestroy(() => {
    timer?.kill();
    transition?.kill();
    mm.revert();
    slides.forEach((slide) => slide.splits.forEach((split) => split.revert()));
    root.removeEventListener("pointerenter", onHold);
    root.removeEventListener("pointerleave", onRelease);
    root.removeEventListener("focusin", onHold);
    root.removeEventListener("focusout", onRelease);
  });
}
