// Viewport detection using IntersectionObserver.
//
// Elements with the same rootMargin share one IntersectionObserver instead of
// creating one each. You don't need to think about it: use onView() from
// lib/modules.js.

const groups = new Map(); // rootMargin -> { observer, entries: Map<element, Observe> }

function getGroup(rootMargin) {
  if (!groups.has(rootMargin)) {
    const entries = new Map();
    const observer = new IntersectionObserver(
      (records) => {
        records.forEach((record) => entries.get(record.target)?.handle(record));
      },
      { rootMargin, threshold: 0 }
    );
    groups.set(rootMargin, { observer, entries });
  }
  return groups.get(rootMargin);
}

export class Observe {
  inView = false;

  constructor(element, { rootMargin = "0px", once = false, callback } = {}) {
    this.element = element;
    this.rootMargin = rootMargin;
    this.once = once;
    this.callback = callback;

    const group = getGroup(rootMargin);
    group.entries.set(element, this);
    group.observer.observe(element);
  }

  handle(record) {
    this.inView = record.isIntersecting;
    const direction = record.boundingClientRect.top > 0 ? 1 : -1;
    this.callback?.({ isIn: this.inView, direction, entry: record });
    if (this.inView && this.once) this.destroy();
  }

  destroy() {
    const group = groups.get(this.rootMargin);
    if (!group) return;
    group.observer.unobserve(this.element);
    group.entries.delete(this.element);
    if (group.entries.size === 0) {
      group.observer.disconnect();
      groups.delete(this.rootMargin);
    }
  }
}
