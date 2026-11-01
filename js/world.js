// The island is a voxel grid, like Minecraft, but each exposed voxel is drawn as a sphere.
// Collision reads the grid, so walking and jumping never have to reason about round shapes.

const VOXEL = 0.25; // metres; a quarter of a Minecraft block
const WORLD_SIZE = 400;
const WORLD_HEIGHT = 80;
const WATER_LEVEL = 12;
const CHUNK_SIZE = 64;
// Spheres overlap their neighbours just enough to leave no holes in a flat layer.
const SPHERE_RADIUS_FACTOR = 0.72;

const BLOCK = { EMPTY: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5, TRUNK: 6, LEAF: 7, ROCK: 8, RED_FLOWER: 9, YELLOW_FLOWER: 10 };
const BLOCK_COLORS = {
  [BLOCK.GRASS]: [0.36, 0.72, 0.28],
  [BLOCK.DIRT]: [0.5, 0.35, 0.2],
  [BLOCK.STONE]: [0.55, 0.55, 0.58],
  [BLOCK.SAND]: [0.93, 0.84, 0.58],
  [BLOCK.WATER]: [0.16, 0.5, 0.9],
  [BLOCK.TRUNK]: [0.42, 0.27, 0.14],
  [BLOCK.LEAF]: [0.16, 0.56, 0.22],
  [BLOCK.ROCK]: [0.62, 0.6, 0.6],
  [BLOCK.RED_FLOWER]: [0.92, 0.2, 0.25],
  [BLOCK.YELLOW_FLOWER]: [0.98, 0.84, 0.2],
};

const CAGE_COUNT = 5;

function makeNoise(random) {
  const table = new Float32Array(256 * 256);
  for (let i = 0; i < table.length; i++) table[i] = random();
  const at = (x, z) => table[(x & 255) + (z & 255) * 256];
  const smooth = (t) => t * t * (3 - 2 * t);
  const value = (x, z) => {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = smooth(x - ix), fz = smooth(z - iz);
    const top = at(ix, iz) * (1 - fx) + at(ix + 1, iz) * fx;
    const bottom = at(ix, iz + 1) * (1 - fx) + at(ix + 1, iz + 1) * fx;
    return top * (1 - fz) + bottom * fz;
  };
  return (x, z) => (value(x, z) * 4 + value(x * 2.1, z * 2.1) * 2 + value(x * 4.3, z * 4.3)) / 7;
}

function polar(angleDegrees, radius) {
  const a = (angleDegrees * Math.PI) / 180;
  return [Math.cos(a) * radius, Math.sin(a) * radius];
}

function generateWorld() {
  const random = seededRandom(20261101);
  const noise = makeNoise(random);
  const voxels = new Uint8Array(WORLD_SIZE * WORLD_SIZE * WORLD_HEIGHT);
  const terrain = new Int16Array(WORLD_SIZE * WORLD_SIZE);
  const index = (x, y, z) => x + z * WORLD_SIZE + y * WORLD_SIZE * WORLD_SIZE;
  const toVoxel = (metres) => Math.floor(metres / VOXEL + WORLD_SIZE / 2);
  const toWorld = (voxel) => (voxel + 0.5 - WORLD_SIZE / 2) * VOXEL;

  const rawHeight = (x, z) => {
    const distance = Math.hypot(x, z) * VOXEL;
    const t = clamp((47 - distance) / 17, 0, 1);
    const mask = t * t * (3 - 2 * t);
    return 6 + mask * (8 + noise(x * 0.012 + 40, z * 0.012 + 70) * 26);
  };

  const cages = [];
  const keys = [];
  // Flat ground under everything the player has to reach.
  const pads = [{ x: 0, z: 0, inner: 4, outer: 8 }];
  for (let i = 0; i < CAGE_COUNT; i++) {
    const [x, z] = polar(20 + i * 72, 32);
    cages.push({ x, z });
    pads.push({ x, z, inner: 3.5, outer: 7 });

    const onTower = i % 2 === 1;
    const [keyX, keyZ] = polar(56 + i * 72, onTower ? 25 : 14 + i * 4);
    keys.push({ x: keyX, z: keyZ, onTower });
    if (onTower) pads.push({ x: keyX, z: keyZ, inner: 4, outer: 8 });
  }
  for (const pad of pads) {
    pad.height = Math.max(Math.round(rawHeight(pad.x / VOXEL, pad.z / VOXEL)), WATER_LEVEL + 3);
  }

  for (let vz = 0; vz < WORLD_SIZE; vz++) {
    for (let vx = 0; vx < WORLD_SIZE; vx++) {
      const x = vx - WORLD_SIZE / 2, z = vz - WORLD_SIZE / 2;
      let height = rawHeight(x, z);
      for (const pad of pads) {
        const t = clamp((Math.hypot(x * VOXEL - pad.x, z * VOXEL - pad.z) - pad.inner) / (pad.outer - pad.inner), 0, 1);
        const weight = 1 - t * t * (3 - 2 * t);
        height = height * (1 - weight) + pad.height * weight;
      }
      const top = Math.round(height);
      terrain[vx + vz * WORLD_SIZE] = top;

      let surface = BLOCK.GRASS;
      if (top <= WATER_LEVEL + 1) surface = BLOCK.SAND;
      else if (top > 34) surface = BLOCK.STONE;
      else if (random() < 0.012) surface = random() < 0.5 ? BLOCK.RED_FLOWER : BLOCK.YELLOW_FLOWER;

      for (let y = 0; y <= top; y++) {
        voxels[index(vx, y, vz)] = y === top ? surface : y > top - 4 && surface !== BLOCK.STONE ? BLOCK.DIRT : BLOCK.STONE;
      }
      for (let y = top + 1; y <= WATER_LEVEL; y++) voxels[index(vx, y, vz)] = BLOCK.WATER;
    }
  }

  const stamp = (x, y, z, block) => {
    if (x >= 0 && x < WORLD_SIZE && z >= 0 && z < WORLD_SIZE && y >= 0 && y < WORLD_HEIGHT) voxels[index(x, y, z)] = block;
  };
  const stampBlob = (cx, cy, cz, rx, ry, rz, block) => {
    for (let y = -ry; y <= ry; y++) {
      for (let z = -rz; z <= rz; z++) {
        for (let x = -rx; x <= rx; x++) {
          if ((x * x) / (rx * rx) + (y * y) / (ry * ry) + (z * z) / (rz * rz) <= 1) stamp(cx + x, cy + y, cz + z, block);
        }
      }
    }
  };
  const isClearOfPads = (x, z) => pads.every((pad) => Math.hypot(x - pad.x, z - pad.z) > pad.outer);

  const scatter = (count, place) => {
    for (let i = 0; i < count; i++) {
      const [x, z] = polar(random() * 360, 4 + Math.sqrt(random()) * 40);
      const vx = toVoxel(x), vz = toVoxel(z);
      const top = terrain[vx + vz * WORLD_SIZE];
      if (top > WATER_LEVEL + 2 && isClearOfPads(x, z)) place(vx, top, vz);
    }
  };
  scatter(70, (vx, top, vz) => {
    const trunkHeight = 16 + Math.floor(random() * 10);
    for (let y = 1; y <= trunkHeight; y++) stampBlob(vx, top + y, vz, 2, 1, 2, BLOCK.TRUNK);
    const crown = 8 + Math.floor(random() * 5);
    stampBlob(vx, top + trunkHeight + crown - 3, vz, crown, crown, crown, BLOCK.LEAF);
  });
  scatter(45, (vx, top, vz) => {
    const size = 3 + Math.floor(random() * 5);
    stampBlob(vx, top, vz, size, size, size, BLOCK.ROCK);
  });

  // Each step of a tower is too tall to walk up, so reaching its key takes jumping.
  for (const key of keys) {
    const vx = toVoxel(key.x), vz = toVoxel(key.z);
    let top = terrain[vx + vz * WORLD_SIZE];
    if (key.onTower) {
      for (let step = 0; step < 3; step++) {
        const half = 12 - step * 4;
        for (let y = 1; y <= 3; y++) {
          for (let z = -half; z <= half; z++) {
            for (let x = -half; x <= half; x++) stamp(vx + x, top + y, vz + z, BLOCK.STONE);
          }
        }
        top += 3;
      }
    }
    key.y = (top + 1) * VOXEL + 1;
  }

  const terrainTop = (x, z) => {
    const vx = clamp(toVoxel(x), 0, WORLD_SIZE - 1), vz = clamp(toVoxel(z), 0, WORLD_SIZE - 1);
    return (terrain[vx + vz * WORLD_SIZE] + 1) * VOXEL;
  };
  for (const cage of cages) cage.y = terrainTop(cage.x, cage.z);

  const isSolid = (x, y, z) => {
    const vx = toVoxel(x), vz = toVoxel(z), vy = Math.floor(y / VOXEL);
    if (vx < 0 || vx >= WORLD_SIZE || vz < 0 || vz >= WORLD_SIZE || vy < 0 || vy >= WORLD_HEIGHT) return false;
    const block = voxels[index(vx, vy, vz)];
    return block !== BLOCK.EMPTY && block !== BLOCK.WATER;
  };
  const isWater = (x, z) => {
    const vx = clamp(toVoxel(x), 0, WORLD_SIZE - 1), vz = clamp(toVoxel(z), 0, WORLD_SIZE - 1);
    return terrain[vx + vz * WORLD_SIZE] < WATER_LEVEL;
  };

  // A half-resolution copy for far-away chunks: four times fewer spheres, and less shimmer.
  const coarseSize = WORLD_SIZE / 2, coarseHeight = WORLD_HEIGHT / 2;
  const coarse = new Uint8Array(coarseSize * coarseSize * coarseHeight);
  const coarseIndex = (x, y, z) => x + z * coarseSize + y * coarseSize * coarseSize;
  for (let y = 0; y < coarseHeight; y++) {
    for (let z = 0; z < coarseSize; z++) {
      for (let x = 0; x < coarseSize; x++) {
        let block = BLOCK.EMPTY;
        for (let dy = 1; dy >= 0 && block === BLOCK.EMPTY; dy--) {
          for (let dz = 0; dz < 2 && block === BLOCK.EMPTY; dz++) {
            for (let dx = 0; dx < 2 && block === BLOCK.EMPTY; dx++) {
              block = voxels[index(x * 2 + dx, y * 2 + dy, z * 2 + dz)];
            }
          }
        }
        coarse[coarseIndex(x, y, z)] = block;
      }
    }
  }

  const data = [];
  const emit = (grid, gridIndex, size, height, scale, fromX, fromZ, chunkSize) => {
    const first = data.length / FLOATS_PER_SPHERE;
    const voxelSize = VOXEL * scale;
    const radius = voxelSize * SPHERE_RADIUS_FACTOR;
    const isEmpty = (x, y, z) => {
      if (y >= height) return true;
      if (x < 0 || x >= size || z < 0 || z >= size || y < 0) return false;
      return grid[gridIndex(x, y, z)] === BLOCK.EMPTY;
    };
    for (let y = 0; y < height; y++) {
      for (let z = fromZ; z < fromZ + chunkSize; z++) {
        for (let x = fromX; x < fromX + chunkSize; x++) {
          const block = grid[gridIndex(x, y, z)];
          if (block === BLOCK.EMPTY) continue;
          if (!isEmpty(x + 1, y, z) && !isEmpty(x - 1, y, z) && !isEmpty(x, y + 1, z) &&
              !isEmpty(x, y - 1, z) && !isEmpty(x, y, z + 1) && !isEmpty(x, y, z - 1)) continue;
          const color = BLOCK_COLORS[block];
          const shade = 0.93 + random() * 0.14;
          data.push(
            (x + 0.5 - size / 2) * voxelSize, (y + 0.5) * voxelSize, (z + 0.5 - size / 2) * voxelSize, radius,
            color[0] * shade, color[1] * shade, color[2] * shade,
          );
        }
      }
    }
    return { first, count: data.length / FLOATS_PER_SPHERE - first };
  };

  const chunks = [];
  const worldExtent = WORLD_HEIGHT * VOXEL;
  const chunkExtent = CHUNK_SIZE * VOXEL;
  for (let cz = 0; cz < WORLD_SIZE; cz += CHUNK_SIZE) {
    for (let cx = 0; cx < WORLD_SIZE; cx += CHUNK_SIZE) {
      const widthX = Math.min(CHUNK_SIZE, WORLD_SIZE - cx);
      const widthZ = Math.min(CHUNK_SIZE, WORLD_SIZE - cz);
      const size = Math.max(widthX, widthZ);
      chunks.push({
        center: [toWorld(cx + widthX / 2), worldExtent / 2, toWorld(cz + widthZ / 2)],
        radius: Math.hypot(chunkExtent, worldExtent, chunkExtent) / 2,
        fine: emit(voxels, index, WORLD_SIZE, WORLD_HEIGHT, 1, cx, cz, Math.min(size, WORLD_SIZE - Math.max(cx, cz))),
        coarse: emit(coarse, coarseIndex, coarseSize, coarseHeight, 2, cx / 2, cz / 2, Math.min(size, WORLD_SIZE - Math.max(cx, cz)) / 2),
      });
    }
  }

  return {
    sphereData: new Float32Array(data),
    chunks,
    cages,
    keys,
    terrain,
    terrainTop,
    isSolid,
    isWater,
    fineSphereCount: chunks.reduce((sum, c) => sum + c.fine.count, 0),
  };
}
