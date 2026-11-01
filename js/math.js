// Column-major 4x4 matrices, as WebGL expects them.

function perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

function normalize3(v) {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross3(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// Returns the view matrix and its inverse; the shader needs both to get world positions.
function lookAt(eye, target) {
  const z = normalize3([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  const x = normalize3(cross3([0, 1, 0], z));
  const y = cross3(z, x);
  return {
    view: new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -dot3(x, eye), -dot3(y, eye), -dot3(z, eye), 1,
    ]),
    invView: new Float32Array([
      x[0], x[1], x[2], 0,
      y[0], y[1], y[2], 0,
      z[0], z[1], z[2], 0,
      eye[0], eye[1], eye[2], 1,
    ]),
  };
}

function multiply4(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[row] * b[col * 4] + a[row + 4] * b[col * 4 + 1] + a[row + 8] * b[col * 4 + 2] + a[row + 12] * b[col * 4 + 3];
    }
  }
  return out;
}

function frustumPlanes(m) {
  const row = (i) => [m[i], m[i + 4], m[i + 8], m[i + 12]];
  const r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3);
  const combine = (a, sign) => {
    const p = [r3[0] + sign * a[0], r3[1] + sign * a[1], r3[2] + sign * a[2], r3[3] + sign * a[3]];
    const len = Math.hypot(p[0], p[1], p[2]);
    return [p[0] / len, p[1] / len, p[2] / len, p[3] / len];
  };
  return [combine(r0, 1), combine(r0, -1), combine(r1, 1), combine(r1, -1), combine(r2, 1), combine(r2, -1)];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Fixed seed: everyone gets the same world on every run.
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
