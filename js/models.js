// Characters are built from much smaller spheres than the world, or they would be unrecognisable.
// A model faces +Z and stands on y = 0.

const SPACING = 0.09;
const SMALL_RADIUS = 0.07;

function addSphere(out, x, y, z, radius, color) {
  out.push(x, y, z, radius, color[0], color[1], color[2]);
}

// Evenly spreads spheres over an ellipsoid. Only the shell is filled: the inside is never seen.
function addShell(out, cx, cy, cz, rx, ry, rz, colorAt) {
  const p = 1.6;
  const area = 4 * Math.PI * Math.pow((Math.pow(rx * ry, p) + Math.pow(rx * rz, p) + Math.pow(ry * rz, p)) / 3, 1 / p);
  const count = Math.ceil(area / (SPACING * SPACING));
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const ny = 1 - ((i + 0.5) / count) * 2;
    const ring = Math.sqrt(1 - ny * ny);
    const nx = Math.cos(i * golden) * ring;
    const nz = Math.sin(i * golden) * ring;
    const color = typeof colorAt === 'function' ? colorAt(nx, ny, nz) : colorAt;
    addSphere(out, cx + nx * rx, cy + ny * ry, cz + nz * rz, SMALL_RADIUS, color);
  }
}

function part(spheres, pivot = [0, 0, 0], axis = null, poseKey = null, sign = 1) {
  return { spheres, pivot, axis, poseKey, sign };
}

function tigerModel() {
  const orange = [0.97, 0.56, 0.1], black = [0.09, 0.07, 0.06], white = [0.98, 0.95, 0.88];
  const pink = [0.95, 0.5, 0.55];

  const body = [];
  addShell(body, 0, 0.82, 0, 0.32, 0.46, 0.26, (nx, ny, nz) => {
    if (nz > 0.45) return white;
    return Math.sin(ny * 13) > 0.45 ? black : orange;
  });

  const head = [];
  addShell(head, 0, 1.52, 0.03, 0.33, 0.31, 0.3, (nx, ny, nz) => {
    if (nz > 0.5 && ny < 0.1) return white;
    return ny > 0.55 && Math.abs(Math.sin(nx * 9)) > 0.6 ? black : orange;
  });
  addShell(head, 0, 1.42, 0.31, 0.16, 0.11, 0.1, white);
  addShell(head, 0.23, 1.84, 0, 0.1, 0.11, 0.06, orange);
  addShell(head, -0.23, 1.84, 0, 0.1, 0.11, 0.06, orange);
  for (const side of [-1, 1]) {
    addSphere(head, side * 0.13, 1.61, 0.34, 0.08, white);
    addSphere(head, side * 0.13, 1.61, 0.4, 0.06, black);
  }
  addSphere(head, 0, 1.5, 0.41, 0.055, pink);

  const leg = (x) => {
    const spheres = [];
    addShell(spheres, x, 0.22, 0.03, 0.14, 0.24, 0.17, (nx, ny) => (ny < -0.6 ? white : orange));
    return spheres;
  };
  const arm = (x) => {
    const spheres = [];
    addShell(spheres, x, 0.78, 0.03, 0.1, 0.3, 0.1, (nx, ny) => (ny < -0.65 ? white : orange));
    return spheres;
  };

  const tail = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    addSphere(tail, 0, 0.5 + t * t * 0.55, -0.25 - t * 0.6, 0.075, i % 3 === 0 || i === 11 ? black : orange);
  }

  return {
    parts: [
      part(body),
      part(head),
      part(leg(0.16), [0.16, 0.44, 0.03], 'x', 'stride', 1),
      part(leg(-0.16), [-0.16, 0.44, 0.03], 'x', 'stride', -1),
      part(arm(0.4), [0.4, 1.05, 0.03], 'x', 'arms', -1),
      part(arm(-0.4), [-0.4, 1.05, 0.03], 'x', 'arms', 1),
      part(tail, [0, 0.5, -0.25], 'x', 'tail', 1),
    ],
  };
}

function crocodileModel() {
  const green = [0.28, 0.58, 0.24], dark = [0.15, 0.38, 0.16], belly = [0.82, 0.84, 0.55];
  const white = [0.98, 0.98, 0.92], black = [0.06, 0.06, 0.06];

  const skin = (nx, ny) => (ny < -0.3 ? belly : ny > 0.7 ? dark : green);
  const body = [];
  addShell(body, 0, 0.42, 0, 0.36, 0.27, 0.85, skin);
  addShell(body, 0, 0.42, 1.0, 0.25, 0.17, 0.52, skin);
  for (const side of [-1, 1]) {
    addSphere(body, side * 0.15, 0.66, 0.85, 0.09, white);
    addSphere(body, side * 0.15, 0.69, 0.92, 0.05, black);
  }
  for (let i = 0; i < 7; i++) {
    addSphere(body, 0.17, 0.33, 0.95 + i * 0.09, 0.03, white);
    addSphere(body, -0.17, 0.33, 0.95 + i * 0.09, 0.03, white);
  }

  const tail = [];
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    addShell(tail, 0, 0.4 - t * 0.12, -0.85 - t * 1.0, 0.2 * (1 - t) + 0.04, 0.15 * (1 - t) + 0.04, 0.12, dark);
  }

  const leg = (x, z) => {
    const spheres = [];
    addShell(spheres, x, 0.16, z, 0.13, 0.16, 0.16, green);
    return spheres;
  };

  return {
    parts: [
      part(body),
      part(tail, [0, 0.4, -0.85], 'x', 'tail', 1),
      part(leg(0.36, 0.5), [0.36, 0.3, 0.5], 'x', 'stride', 1),
      part(leg(-0.36, 0.5), [-0.36, 0.3, 0.5], 'x', 'stride', -1),
      part(leg(0.36, -0.5), [0.36, 0.3, -0.5], 'x', 'stride', -1),
      part(leg(-0.36, -0.5), [-0.36, 0.3, -0.5], 'x', 'stride', 1),
    ],
  };
}

// Stands around its own centre, because a bird has no ground to stand on.
function birdModel() {
  const feathers = [0.46, 0.15, 0.55], dark = [0.28, 0.08, 0.36], beak = [0.98, 0.62, 0.1];
  const white = [0.98, 0.98, 0.95], red = [0.9, 0.08, 0.08];

  const body = [];
  addShell(body, 0, 0, 0, 0.32, 0.32, 0.5, feathers);
  addShell(body, 0, 0.22, 0.5, 0.25, 0.25, 0.25, feathers);
  addShell(body, 0, 0.17, 0.82, 0.1, 0.08, 0.18, beak);
  for (const side of [-1, 1]) {
    addSphere(body, side * 0.13, 0.32, 0.7, 0.08, white);
    addSphere(body, side * 0.13, 0.32, 0.76, 0.045, red);
  }

  const wing = (side) => {
    const spheres = [];
    addShell(spheres, side * 0.8, 0.05, -0.05, 0.55, 0.05, 0.3, (nx) => (Math.abs(nx) > 0.6 ? dark : feathers));
    return spheres;
  };

  const tail = [];
  addShell(tail, 0, 0.05, -0.68, 0.2, 0.05, 0.28, dark);

  return {
    parts: [
      part(body),
      part(tail),
      part(wing(1), [0.25, 0.05, 0], 'z', 'wings', 1),
      part(wing(-1), [-0.25, 0.05, 0], 'z', 'wings', -1),
    ],
  };
}

// A pair of wings placed to sit on the tiger's back when drawn at the tiger's position.
function wingsModel() {
  const white = [1, 1, 1];
  const wing = (side) => {
    const spheres = [];
    addShell(spheres, side * 0.85, 1.25, -0.36, 0.62, 0.3, 0.06, white);
    addShell(spheres, side * 0.55, 1.0, -0.36, 0.34, 0.26, 0.05, white);
    return spheres;
  };
  return {
    parts: [
      part(wing(1), [0.2, 1.15, -0.36], 'z', 'flap', 1),
      part(wing(-1), [-0.2, 1.15, -0.36], 'z', 'flap', -1),
    ],
  };
}

function keyModel() {
  const gold = [1, 0.8, 0.12];
  const spheres = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    addSphere(spheres, Math.cos(a) * 0.28, 0.42 + Math.sin(a) * 0.28, 0, 0.09, gold);
  }
  for (let i = 0; i < 9; i++) addSphere(spheres, 0, 0.12 - i * 0.09, 0, 0.09, gold);
  addSphere(spheres, 0.14, -0.55, 0, 0.08, gold);
  addSphere(spheres, 0.14, -0.38, 0, 0.08, gold);
  return { parts: [part(spheres)] };
}

function cageModel() {
  const iron = [0.32, 0.33, 0.38], gold = [1, 0.8, 0.12];
  const spheres = [];
  const radius = 1.9, height = 2.4, bars = 18;
  for (let b = 0; b < bars; b++) {
    const a = (b / bars) * Math.PI * 2;
    for (let y = 0; y <= height; y += 0.13) addSphere(spheres, Math.cos(a) * radius, y, Math.sin(a) * radius, 0.08, iron);
  }
  for (const y of [0.05, height]) {
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      addSphere(spheres, Math.cos(a) * radius, y, Math.sin(a) * radius, 0.09, iron);
    }
  }
  addSphere(spheres, 0, height + 0.15, 0, 0.3, gold);
  return { parts: [part(spheres)] };
}

// Writes the posed model into the frame's sphere array and returns the new sphere count.
function drawModel(out, count, model, x, y, z, yaw, pose = {}, scale = 1) {
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  for (const { spheres, pivot, axis, poseKey, sign } of model.parts) {
    const angle = poseKey ? (pose[poseKey] || 0) * sign : 0;
    const c = Math.cos(angle), s = Math.sin(angle);
    for (let i = 0; i < spheres.length; i += FLOATS_PER_SPHERE) {
      let lx = spheres[i], ly = spheres[i + 1], lz = spheres[i + 2];
      if (axis === 'x') {
        const dy = ly - pivot[1], dz = lz - pivot[2];
        ly = pivot[1] + dy * c - dz * s;
        lz = pivot[2] + dy * s + dz * c;
      } else if (axis === 'z') {
        const dx = lx - pivot[0], dy = ly - pivot[1];
        lx = pivot[0] + dx * c - dy * s;
        ly = pivot[1] + dx * s + dy * c;
      }
      const at = count * FLOATS_PER_SPHERE;
      if (at + FLOATS_PER_SPHERE > out.length) return count;
      out[at] = x + (lx * cosY + lz * sinY) * scale;
      out[at + 1] = y + ly * scale;
      out[at + 2] = z + (-lx * sinY + lz * cosY) * scale;
      out[at + 3] = spheres[i + 3] * scale;
      out[at + 4] = spheres[i + 4];
      out[at + 5] = spheres[i + 5];
      out[at + 6] = spheres[i + 6];
      count++;
    }
  }
  return count;
}
