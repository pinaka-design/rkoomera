// Project slider (based on Osmo's Logo Card Testimonials).
// Projects stack on top of each other; the logo rolls and the text fades in
// element by element. Dots show progress and jump to a project on click.
//
// Webflow attributes:
//   data-module="project-slider"          on the wrapper, required
//   data-project-slider-autoplay="6"      seconds per project, 0 or missing = click only
//   data-project-slider-item              each project (works on a CMS Collection Item)
//   data-project-slider-logo              the logo, inside a slot with overflow hidden
//   data-project-slider-text              text that fades in, one element after another
//   data-project-slider-dots              dots wrapper, holding one dot as the blueprint
//   data-project-slider-dot               the dot blueprint (cloned per project)
//   data-project-slider-dot-fill          progress fill inside the dot
//
// Sets data-project-slider-status="active" | "leaving" | "inactive" on items and dots.
import { onDestroy, onView } from "../lib/modules.js";

export default function projectSlider(root) {
  const items = Array.from(root.querySelectorAll("[data-project-slider-item]"));
  if (!items.length) return;

  const dotsWrap = root.querySelector("[data-project-slider-dots]");
  const dotTemplate = dotsWrap.querySelector("[data-project-slider-dot]");
  const autoplaySeconds =
    parseFloat(root.getAttribute("data-project-slider-autoplay")) || 0;

  dotTemplate.remove();

  const slides = items.map((item, index) => {
    const dot = dotTemplate.cloneNode(true);
    dot.setAttribute("aria-label", `Show project ${index + 1}`);
    dot.addEventListener("click", () => goTo(index));
    dotsWrap.appendChild(dot);

    return {
      item,
      dot,
      fill: dot.querySelector("[data-project-slider-dot-fill]"),
      logo: item.querySelector("[data-project-slider-logo]"),
      texts: Array.from(item.querySelectorAll("[data-project-slider-text]")),
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
    slide.item.setAttribute("data-project-slider-status", status);
    slide.item.setAttribute("aria-hidden", String(!isActive));
    slide.dot.setAttribute(
      "data-project-slider-status",
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
    const outgoingTexts = outgoing.texts;
    const incomingTexts = incoming.texts;

    setStatus(outgoing, "leaving");
    setStatus(incoming, "active");
    activeIndex = nextIndex;
    startTimer();

    transition = gsap.timeline({
      onComplete: () => {
        setStatus(outgoing, "inactive");
        gsap.set(
          [
            ...outgoingTexts,
            ...incomingTexts,
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
        outgoingTexts,
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
        incomingTexts,
        {
          opacity: 0,
          y: "0.75em",
        },
        {
          opacity: 1,
          y: 0,
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
    root.removeEventListener("pointerenter", onHold);
    root.removeEventListener("pointerleave", onRelease);
    root.removeEventListener("focusin", onHold);
    root.removeEventListener("focusout", onRelease);
  });
}
