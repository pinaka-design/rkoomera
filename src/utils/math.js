// Common math helpers for animation work.

/** Blend from a to b. t = 0 gives a, t = 1 gives b. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Keep value between min and max. */
export function clamp(min, max, value) {
  return Math.min(Math.max(value, min), max);
}

/** Remap value from one range to another, like Houdini's fit(). */
export function map(value, inLow, inHigh, outLow, outHigh) {
  return outLow + ((value - inLow) * (outHigh - outLow)) / (inHigh - inLow);
}

/** Frame-rate independent lerp for smooth following. */
export function damp(current, target, lambda, deltaTime) {
  return lerp(current, target, 1 - Math.exp(-lambda * deltaTime));
}
