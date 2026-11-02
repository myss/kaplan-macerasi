function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// All three inputs run from 0 to 1, and hue wraps around. Returns [r, g, b].
function hslColor(hue, saturation, lightness) {
  const channel = (n) => {
    const k = (n + hue * 12) % 12;
    const a = saturation * Math.min(lightness, 1 - lightness);
    return lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)];
}

// Fixed seed: everyone gets the same world on every run.
function seededRandom(seed) {
  seed *= 10001;
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
