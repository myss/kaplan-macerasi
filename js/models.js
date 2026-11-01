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
function birdModel({ eyePatch = false, captainHat = false } = {}) {
  const feathers = [0.46, 0.15, 0.55], dark = [0.28, 0.08, 0.36], beak = [0.98, 0.62, 0.1];
  const white = [0.98, 0.98, 0.95], red = [0.9, 0.08, 0.08], black = [0.05, 0.05, 0.06];

  const body = [];
  addShell(body, 0, 0, 0, 0.32, 0.32, 0.5, feathers);
  addShell(body, 0, 0.22, 0.5, 0.25, 0.25, 0.25, feathers);
  addShell(body, 0, 0.17, 0.82, 0.1, 0.08, 0.18, beak);
  for (const side of [-1, 1]) {
    addSphere(body, side * 0.13, 0.32, 0.7, 0.08, white);
    addSphere(body, side * 0.13, 0.32, 0.76, 0.045, red);
  }
  if (eyePatch) {
    addSphere(body, 0.13, 0.32, 0.78, 0.11, black);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      addSphere(body, Math.cos(a) * 0.27, 0.32 + Math.sin(a) * 0.05, 0.5 + Math.sin(a) * 0.27, 0.035, black);
    }
  }
  if (captainHat) {
    addShell(body, 0, 0.52, 0.5, 0.42, 0.05, 0.3, black);
    addShell(body, 0, 0.64, 0.5, 0.24, 0.14, 0.2, black);
    addSphere(body, 0, 0.66, 0.72, 0.065, white);
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

// A standing animal with a face: the bears and the rat are this with different fur and features.
function uprightAnimalModel({ fur, belly, nose, earSize = 0.12, snoutLength = 0.1, eyePatch = false, tail = null }) {
  const white = [0.98, 0.97, 0.92], black = [0.05, 0.05, 0.06];
  const body = [];
  addShell(body, 0, 0.84, 0, 0.36, 0.48, 0.3, (nx, ny, nz) => (nz > 0.5 ? belly : fur));
  addShell(body, 0, 1.52, 0.03, 0.33, 0.31, 0.3, fur);
  addShell(body, 0, 1.43, 0.31 + snoutLength / 2, 0.15, 0.11, 0.08 + snoutLength, belly);
  for (const side of [-1, 1]) {
    addShell(body, side * 0.25, 1.82, 0, earSize, earSize, 0.06, fur);
    addSphere(body, side * 0.13, 1.6, 0.31, 0.08, white);
    addSphere(body, side * 0.13, 1.6, 0.37, 0.05, black);
  }
  addSphere(body, 0, 1.47, 0.42 + snoutLength * 1.6, 0.06, nose);
  if (eyePatch) {
    addSphere(body, 0.13, 1.6, 0.36, 0.11, black);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      addSphere(body, Math.cos(a) * 0.34, 1.6 + Math.sin(a) * 0.08, 0.03 + Math.sin(a) * 0.31, 0.035, black);
    }
  }
  const limb = (x, y, ry) => {
    const spheres = [];
    addShell(spheres, x, y, 0.03, 0.14, ry, 0.15, fur);
    return spheres;
  };
  const parts = [
    part(body),
    part(limb(0.17, 0.22, 0.24), [0.17, 0.44, 0.03], 'x', 'stride', 1),
    part(limb(-0.17, 0.22, 0.24), [-0.17, 0.44, 0.03], 'x', 'stride', -1),
    part(limb(0.42, 0.8, 0.3), [0.42, 1.05, 0.03], 'x', 'stride', -1),
    part(limb(-0.42, 0.8, 0.3), [-0.42, 1.05, 0.03], 'x', 'stride', 1),
  ];
  if (tail) {
    const spheres = [];
    for (let i = 0; i < 16; i++) addSphere(spheres, 0, 0.5 - i * 0.012, -0.28 - i * 0.09, 0.05, tail);
    parts.push(part(spheres));
  }
  return { parts };
}

// Built small, so that drawing it larger makes its spheres larger too and keeps their number down.
function walkingTreeModel() {
  const bark = [0.42, 0.27, 0.14], leaves = [0.16, 0.56, 0.22], white = [0.98, 0.97, 0.92], black = [0.05, 0.05, 0.06];
  const body = [];
  addShell(body, 0, 0.72, 0, 0.3, 0.68, 0.3, bark);
  addShell(body, 0, 1.7, 0, 0.72, 0.58, 0.72, leaves);
  for (const side of [-1, 1]) {
    addSphere(body, side * 0.13, 0.98, 0.26, 0.1, white);
    addSphere(body, side * 0.12, 0.96, 0.33, 0.055, black);
    for (let i = 0; i < 4; i++) addSphere(body, side * (0.08 + i * 0.05), 1.07 + i * 0.022, 0.31, 0.03, black); // angry brows
    for (let i = 0; i < 5; i++) addSphere(body, side * i * 0.05, 0.62 - i * 0.012, 0.32, 0.035, black);
  }
  const branch = (side) => {
    const spheres = [];
    for (let i = 0; i < 7; i++) addSphere(spheres, side * (0.3 + i * 0.09), 1 + i * 0.05, 0, 0.07, bark);
    return spheres;
  };
  const root = (x) => {
    const spheres = [];
    addShell(spheres, x, 0.14, 0.05, 0.13, 0.16, 0.2, bark);
    return spheres;
  };
  return {
    parts: [
      part(body),
      part(branch(1), [0.3, 1, 0], 'x', 'stride', -1),
      part(branch(-1), [-0.3, 1, 0], 'x', 'stride', 1),
      part(root(0.16), [0.16, 0.32, 0.05], 'x', 'stride', 1),
      part(root(-0.16), [-0.16, 0.32, 0.05], 'x', 'stride', -1),
    ],
  };
}

function scorpionModel() {
  const shell = [0.72, 0.42, 0.14], dark = [0.4, 0.2, 0.07], black = [0.05, 0.05, 0.06], white = [0.98, 0.97, 0.92];
  const body = [];
  addShell(body, 0, 0.32, 0, 0.36, 0.2, 0.56, shell);
  addShell(body, 0, 0.36, 0.55, 0.26, 0.17, 0.2, shell);
  for (const side of [-1, 1]) {
    addSphere(body, side * 0.12, 0.5, 0.68, 0.08, white);
    addSphere(body, side * 0.12, 0.51, 0.74, 0.05, black);
    for (let i = 0; i < 6; i++) addSphere(body, side * (0.25 + i * 0.05), 0.32, 0.6 + i * 0.05, 0.06, dark);
    addShell(body, side * 0.58, 0.32, 1.02, 0.17, 0.09, 0.22, dark);
  }
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    addSphere(body, 0, 0.36 + Math.sin(t * 2.6) * 0.95, -0.5 - Math.sin(t * 1.8) * 0.5 + t * 0.55, 0.11 - t * 0.04, i === 13 ? black : shell);
  }
  const legs = (side, sign) => {
    const spheres = [];
    for (const z of [-0.3, 0, 0.3]) {
      for (let i = 0; i < 5; i++) addSphere(spheres, side * (0.32 + i * 0.09), 0.26 - i * 0.05, z, 0.05, dark);
    }
    return part(spheres, [side * 0.32, 0.26, 0], 'x', 'stride', sign);
  };
  return { parts: [part(body), legs(1, 1), legs(-1, -1)] };
}

function lavaMonsterModel() {
  const rock = [0.16, 0.13, 0.13], lava = [1.3, 0.5, 0.08], glow = [1.6, 1.3, 0.3];
  const cracked = (nx, ny, nz) => (Math.sin(nx * 9 + ny * 7) * Math.sin(ny * 8 - nz * 6) > 0.35 ? lava : rock);
  const body = [];
  addShell(body, 0, 0.92, 0, 0.56, 0.72, 0.46, cracked);
  addShell(body, 0, 1.7, 0.03, 0.34, 0.3, 0.32, cracked);
  for (const side of [-1, 1]) addSphere(body, side * 0.14, 1.76, 0.33, 0.085, glow);
  for (let i = -3; i <= 3; i++) addSphere(body, i * 0.05, 1.56, 0.35, 0.04, lava);
  const limb = (x, y, ry) => {
    const spheres = [];
    addShell(spheres, x, y, 0.03, 0.17, ry, 0.17, cracked);
    return spheres;
  };
  return {
    parts: [
      part(body),
      part(limb(0.26, 0.22, 0.26), [0.26, 0.46, 0.03], 'x', 'stride', 1),
      part(limb(-0.26, 0.22, 0.26), [-0.26, 0.46, 0.03], 'x', 'stride', -1),
      part(limb(0.72, 0.95, 0.42), [0.72, 1.3, 0.03], 'x', 'stride', -1),
      part(limb(-0.72, 0.95, 0.42), [-0.72, 1.3, 0.03], 'x', 'stride', 1),
    ],
  };
}

// A door hanging from its hinge at x = 0, drawn at the hinge's position.
function bonusDoorModel() {
  const wood = [0.55, 0.32, 0.16], gold = [1, 0.8, 0.12];
  const spheres = [];
  for (let x = 0; x <= 1.25; x += 0.1) {
    for (let y = 0.05; y <= 2.2; y += 0.1) addSphere(spheres, x, y, 0, 0.08, wood);
  }
  addSphere(spheres, 1.1, 1, -0.08, 0.08, gold);
  return { parts: [part(spheres)] };
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
