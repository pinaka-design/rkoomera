// Shared event buses, so components don't each add their own listeners.
//
//   Raf.add(({ time, deltaTime }) => { ... })   every animation frame (GSAP ticker)
//   Resize.add(({ width, height }) => { ... })  window resize, debounced
//
// add() returns an unsubscribe function. Call it inside onDestroy().

class Subscribable {
  subscribers = [];

  add(fn, priority = 0) {
    const entry = { fn, priority };
    const index = this.subscribers.findIndex((s) => s.priority > priority);
    if (index === -1) this.subscribers.push(entry);
    else this.subscribers.splice(index, 0, entry);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== entry);
    };
  }

  notify(data) {
    this.subscribers.forEach((s) => s.fn(data));
  }
}

class RafBus extends Subscribable {
  started = false;

  add(fn, priority) {
    // Only hook into the GSAP ticker once something actually needs it
    if (!this.started) {
      this.started = true;
      gsap.ticker.add((time, deltaTime) => this.notify({ time, deltaTime }));
    }
    return super.add(fn, priority);
  }
}

class ResizeBus extends Subscribable {
  width = window.innerWidth;
  height = window.innerHeight;
  timeout = null;

  constructor() {
    super();
    window.addEventListener("resize", () => {
      clearTimeout(this.timeout);
      this.timeout = setTimeout(() => this.update(), 100);
    });
  }

  update() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.notify({ width, height });
  }
}

export const Raf = new RafBus();
export const Resize = new ResizeBus();
