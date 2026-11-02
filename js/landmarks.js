// Hand-designed levels: instead of keys and cages scattered on hills, each `build` lays out a big
// place and says what is where. Everything here works in voxels; 4 voxels make a metre.
//
// Each build receives the world under construction and returns
// { cages, keys, wings, mapShapes }, with positions already in metres, and optionally a bonusSpot.

function buildGiantHouse(api, hx, hz) {
  const { box, EMPTY } = api;
  const HALF_X = 64, HALF_Z = 80, ROOM_HEIGHT = 28;
  const ground = api.terrainAt(hx, hz);
  const upper = ground + ROOM_HEIGHT + 2;
  const top = upper + ROOM_HEIGHT;
  const { HOUSE_WALL: wall, ROOF: roof, WOOD_FLOOR: wood } = BLOCK;

  box(hx - HALF_X, ground, hz - HALF_Z, hx + HALF_X, ground, hz + HALF_Z, wood);
  box(hx - HALF_X, ground + 1, hz - HALF_Z, hx + HALF_X, top, hz - HALF_Z + 1, wall);
  box(hx - HALF_X, ground + 1, hz + HALF_Z - 1, hx + HALF_X, top, hz + HALF_Z, wall);
  box(hx - HALF_X, ground + 1, hz - HALF_Z, hx - HALF_X + 1, top, hz + HALF_Z, wall);
  box(hx + HALF_X - 1, ground + 1, hz - HALF_Z, hx + HALF_X, top, hz + HALF_Z, wall);
  box(hx - HALF_X, upper - 1, hz - HALF_Z, hx + HALF_X, upper, hz + HALF_Z, wood);

  // A hall behind the front door and two rooms behind it, on both floors.
  for (const floor of [ground, upper]) {
    const ceiling = floor + ROOM_HEIGHT;
    box(hx - HALF_X, floor + 1, hz, hx + HALF_X, ceiling, hz + 1, wall);
    box(hx, floor + 1, hz, hx + 1, ceiling, hz + HALF_Z, wall);
    box(hx - 42, floor + 1, hz, hx - 18, floor + 20, hz + 1, EMPTY);
    box(hx + 18, floor + 1, hz, hx + 42, floor + 20, hz + 1, EMPTY);
    box(hx, floor + 1, hz + 28, hx + 1, floor + 20, hz + 52, EMPTY);

    for (const side of [-1, 1]) {
      box(hx + side * 40 - 8, floor + 10, hz - HALF_Z, hx + side * 40 + 8, floor + 20, hz - HALF_Z + 1, EMPTY);
      box(hx + side * 40 - 8, floor + 10, hz + HALF_Z - 1, hx + side * 40 + 8, floor + 20, hz + HALF_Z, EMPTY);
      const wallX = side < 0 ? hx - HALF_X : hx + HALF_X - 1;
      for (const z of [hz - 40, hz + 40]) box(wallX, floor + 10, z - 10, wallX + 1, floor + 20, z + 10, EMPTY);
    }
  }
  box(hx - 12, ground + 1, hz - HALF_Z, hx + 12, ground + 20, hz - HALF_Z + 1, EMPTY); // front door
  box(hx - 30, upper - 1, hz - 60, hx + 30, upper, hz - 20, EMPTY); // the way up: a hole above the hall

  for (let layer = 0; layer <= 24; layer++) {
    const halfX = HALF_X + 4 - layer * 3;
    box(hx - halfX, top + 1 + layer, hz - HALF_Z - 4, hx + halfX, top + 1 + layer, hz + HALF_Z + 4, roof);
  }
  box(hx + 30, top + 1, hz + 40, hx + 40, top + 26, hz + 50, BLOCK.STONE);

  return { ground, upper };
}

// A table too tall to jump onto directly, with a chair as the step up. Returns the tabletop height.
function placeTable(api, x, z, floor) {
  const { box } = api;
  const wood = BLOCK.FURNITURE;
  const top = floor + 10;
  box(x - 9, top - 1, z - 7, x + 9, top, z + 7, wood);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) box(x + sx * 8, floor + 1, z + sz * 6, x + sx * 8 + 1, top - 2, z + sz * 6 + 1, wood);
  }
  box(x - 4, floor + 1, z - 16, x + 4, floor + 5, z - 9, wood);
  return top;
}

function placeBed(api, x, z, floor) {
  const { box } = api;
  box(x - 9, floor + 1, z - 14, x + 9, floor + 5, z + 14, BLOCK.FURNITURE);
  box(x - 9, floor + 6, z - 14, x + 9, floor + 6, z + 14, BLOCK.SAIL);
  box(x - 7, floor + 7, z + 8, x + 7, floor + 8, z + 13, BLOCK.HOUSE_WALL);
  return floor + 6;
}

// A grid of rooms joined by tunnels. A random spanning tree connects all of them, so nothing can be
// out of reach, and a few extra tunnels make loops. The map shows them, as they are lower than the
// solid earth around them.
function buildTunnels(api) {
  const { toVoxel, toMetres, floorY, setFloor } = api;
  const FLOOR = WATER_LEVEL + 1;
  const SPACING = 128, GRID = 5, MIDDLE = 2;
  const random = seededRandom(20261101 + api.level * 7919 + 6);
  const nodeX = (i) => toVoxel(0) + (i - MIDDLE) * SPACING;
  const nodeZ = (j) => toVoxel(0) + (j - MIDDLE) * SPACING;

  const carveDisc = (cx, cz, radius, height) => {
    for (let z = -radius; z <= radius; z++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + z * z <= radius * radius) setFloor(cx + x, cz + z, FLOOR, height);
      }
    }
  };
  const carveTunnel = (x0, z0, x1, z1) => {
    const halfWidth = 12, height = 20;
    for (let z = Math.min(z0, z1) - halfWidth * (x0 === x1 ? 0 : 1); z <= Math.max(z0, z1) + halfWidth * (x0 === x1 ? 0 : 1); z++) {
      for (let x = Math.min(x0, x1) - halfWidth * (z0 === z1 ? 0 : 1); x <= Math.max(x0, x1) + halfWidth * (z0 === z1 ? 0 : 1); x++) {
        setFloor(x, z, FLOOR, height);
      }
    }
    // Lamps along the ceiling, so that a tunnel can be seen in the dark.
    const lamps = Math.abs(x1 - x0 + z1 - z0) / 32;
    for (let i = 1; i < lamps; i++) {
      const t = i / lamps;
      api.stampBlob(Math.round(x0 + (x1 - x0) * t), FLOOR + height, Math.round(z0 + (z1 - z0) * t), 1, 1, 1, BLOCK.GLOW);
    }
  };

  const seen = new Set([`${MIDDLE},${MIDDLE}`]);
  const stack = [[MIDDLE, MIDDLE]];
  const joined = new Set();
  const join = (i, j, ni, nj) => {
    const id = [i, j, ni, nj].join();
    if (joined.has(id) || joined.has([ni, nj, i, j].join())) return;
    joined.add(id);
    carveTunnel(nodeX(i), nodeZ(j), nodeX(ni), nodeZ(nj));
  };
  const neighbours = (i, j) => [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && a < GRID && b >= 0 && b < GRID);
  while (stack.length > 0) {
    const [i, j] = stack[stack.length - 1];
    const fresh = neighbours(i, j).filter(([a, b]) => !seen.has(`${a},${b}`));
    if (fresh.length === 0) {
      stack.pop();
      continue;
    }
    const [ni, nj] = fresh[Math.floor(random() * fresh.length)];
    seen.add(`${ni},${nj}`);
    join(i, j, ni, nj);
    stack.push([ni, nj]);
  }
  for (let extra = 0; extra < 7; extra++) {
    const i = Math.floor(random() * GRID), j = Math.floor(random() * GRID);
    const options = neighbours(i, j);
    const [ni, nj] = options[Math.floor(random() * options.length)];
    join(i, j, ni, nj);
  }

  const out = { cages: [], keys: [], wings: [], mapShapes: [] };
  const rooms = [];
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      if (i !== MIDDLE || j !== MIDDLE) rooms.push([i, j]);
    }
  }
  for (let i = rooms.length - 1; i > 0; i--) {
    const k = Math.floor(random() * (i + 1));
    [rooms[i], rooms[k]] = [rooms[k], rooms[i]];
  }

  // The middle room is wide enough for the boss, and one far corner rises high enough for the bonus.
  carveDisc(nodeX(MIDDLE), nodeZ(MIDDLE), 72, 30);
  const corner = rooms.find(([i, j]) => Math.abs(i - MIDDLE) === MIDDLE && Math.abs(j - MIDDLE) === MIDDLE);
  rooms.splice(rooms.indexOf(corner), 1);
  carveDisc(nodeX(corner[0]), nodeZ(corner[1]), 44, WORLD_HEIGHT - FLOOR - 3);
  out.bonusSpot = { vx: nodeX(corner[0]), vz: nodeZ(corner[1]) };

  const CAGES = 8;
  rooms.forEach(([i, j], n) => {
    const x = nodeX(i), z = nodeZ(j);
    carveDisc(x, z, 36, 26);
    for (const [ox, oz] of [[24, 0], [-24, 0], [0, 24], [0, -24]]) api.stampBlob(x + ox, FLOOR + 26, z + oz, 1, 1, 1, BLOCK.GLOW);
    if (n < CAGES) {
      out.cages.push({ x: toMetres(x), z: toMetres(z), y: floorY(FLOOR), indoors: true });
    } else if (n < CAGES * 2) {
      // Every other key sits on a rock that takes a jump.
      const onRock = n % 2 === 0;
      if (onRock) api.box(x - 8, FLOOR + 1, z - 8, x + 8, FLOOR + 4, z + 8, BLOCK.ROCK);
      out.keys.push({ x: toMetres(x), z: toMetres(z), y: floorY(onRock ? FLOOR + 4 : FLOOR) + 1, climb: 'none', indoors: true });
    }
  });
  return out;
}

// The home village: every world has its own way in, all facing the middle of the village, where the
// tiger starts. Doors face -z. An entrance takes the tiger once it is within `radius` of its middle
// and lower than `maxY`, which for the pits means having dropped in.
const HOME_ENTRANCES = [
  { level: 1, build: 'treeHollow', x: -24, z: 16 },
  { level: 2, build: 'giantScorpion', x: 0, z: 16 },
  { level: 3, build: 'iceCave', x: 24, z: 16 },
  { level: 4, build: 'volcano', x: -24, z: 38 },
  { level: 5, build: 'tinyHouse', x: 0, z: 38 },
  { level: 6, build: 'shoreBoat', x: 30, z: 38, onShore: true }, // moored at the first water east of x
  { surprise: true, build: 'surpriseDoor', x: 24, z: 38 }, // leads to whichever generated world is next
  { level: 7, build: 'waterWell', x: -24, z: 60 },
  { level: 8, build: 'surfCave', x: 0, z: 60 },
  { level: 9, build: 'moleHole', x: 24, z: 60 },
];

function buildHomeVillage(api) {
  const { box, stampBlob, toVoxel, floorY, terrainAt, EMPTY } = api;

  // The upper half of a ball: unlike a whole ball, carving it out leaves the ground in place.
  const dome = (cx, floor, cz, radius, block) => {
    for (let y = 0; y <= radius; y++) {
      for (let z = -radius; z <= radius; z++) {
        for (let x = -radius; x <= radius; x++) {
          if (x * x + y * y + z * z <= radius * radius) box(cx + x, floor + 1 + y, cz + z, cx + x, floor + 1 + y, cz + z, block);
        }
      }
    }
  };
  const disc = (cx, y, cz, radius, block) => {
    for (let z = -radius; z <= radius; z++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + z * z <= radius * radius) box(cx + x, y, cz + z, cx + x, y, cz + z, block);
      }
    }
  };
  const cave = (cx, floor, cz, block) => {
    dome(cx, floor, cz, 15, block);
    dome(cx, floor, cz, 13, EMPTY);
    box(cx - 4, floor + 1, cz - 16, cx + 4, floor + 10, cz - 11, EMPTY);
  };

  const BUILDERS = {
    treeHollow(cx, floor, cz) {
      for (let y = 1; y <= 34; y++) disc(cx, floor + y, cz, 11, BLOCK.TRUNK);
      stampBlob(cx, floor + 46, cz, 24, 18, 24, BLOCK.LEAF);
      for (let y = 1; y <= 12; y++) disc(cx, floor + y, cz, 8, EMPTY);
      box(cx - 4, floor + 1, cz - 12, cx + 4, floor + 10, cz - 7, EMPTY);
      return { radius: 1.8, portal: [0.2, 1, 0.45] };
    },
    // Facing the village with its mouth open, wide enough to walk into.
    giantScorpion(cx, floor, cz) {
      const shell = BLOCK.SCORPION, dark = BLOCK.RED_SAND;
      stampBlob(cx, floor + 8, cz + 3, 15, 11, 21, shell);
      stampBlob(cx, floor + 8, cz - 16, 11, 9, 8, shell);
      stampBlob(cx, floor + 7, cz + 3, 12, 7, 17, EMPTY);
      box(cx - 12, floor, cz - 14, cx + 12, floor, cz + 20, BLOCK.SAND);
      box(cx - 5, floor + 1, cz - 26, cx + 5, floor + 10, cz - 8, EMPTY);
      for (let x = -5; x <= 5; x += 2) {
        box(cx + x, floor + 9, cz - 24, cx + x, floor + 10, cz - 24, BLOCK.SHELL);
        if (Math.abs(x) > 2) box(cx + x, floor + 1, cz - 24, cx + x, floor + 2, cz - 24, BLOCK.SHELL);
      }
      for (const side of [-1, 1]) {
        stampBlob(cx + side * 6, floor + 14, cz - 20, 3, 3, 3, BLOCK.SHELL);
        stampBlob(cx + side * 6, floor + 14, cz - 23, 1, 1, 1, BLOCK.FLAG);
        // A claw held out on each side of the mouth.
        for (let i = 0; i <= 10; i++) stampBlob(cx + side * Math.round(12 + i * 0.6), floor + 5, cz - 8 - Math.round(i * 1.5), 2, 2, 2, shell);
        stampBlob(cx + side * 20, floor + 6, cz - 28, 5, 3, 7, dark);
        stampBlob(cx + side * 17, floor + 6, cz - 34, 1, 2, 4, dark);
        stampBlob(cx + side * 23, floor + 6, cz - 34, 1, 2, 4, dark);
        for (const z of [-4, 6, 16]) {
          for (let i = 0; i <= 8; i++) stampBlob(cx + side * (14 + i), floor + 7 - i, cz + z, 1, 1, 1, dark);
        }
      }
      // The tail curls up over the back, ending in the sting.
      for (let i = 0; i <= 22; i++) {
        const t = i / 22;
        const radius = Math.round(5 - t * 3);
        stampBlob(cx, floor + 14 + Math.round(Math.sin(t * 2.6) * 22), cz + 25 - Math.round(t * t * 22) + Math.round(Math.sin(t * 2.6) * 10), radius, radius, radius, i % 3 === 0 ? dark : shell);
      }
      stampBlob(cx, floor + 25, cz + 6, 2, 4, 2, BLOCK.FLAG);
      return { radius: 1.8, portal: [1.4, 0.8, 0.25] };
    },
    iceCave(cx, floor, cz) {
      cave(cx, floor, cz, BLOCK.ICE);
      return { radius: 1.8, portal: [0.6, 1, 1.4] };
    },
    volcano(cx, floor, cz) {
      for (let i = 0; i < 12; i++) disc(cx, floor + 1 + i, cz, 26 - Math.round(i * 1.5), i % 3 === 2 ? BLOCK.BASALT : BLOCK.ASH);
      for (let y = 0; y <= 13; y++) disc(cx, floor + y, cz, 6, EMPTY);
      disc(cx, floor - 1, cz, 6, BLOCK.LAVA);
      return { radius: 1.3, portal: [1.5, 0.55, 0.1], maxY: floorY(floor) + 0.2, offsetY: -0.1 };
    },
    tinyHouse(cx, floor, cz) {
      box(cx - 13, floor + 1, cz - 13, cx + 13, floor + 16, cz + 13, BLOCK.HOUSE_WALL);
      box(cx - 11, floor + 1, cz - 11, cx + 11, floor + 15, cz + 11, EMPTY);
      box(cx - 4, floor + 1, cz - 14, cx + 4, floor + 11, cz - 11, EMPTY);
      box(cx - 12, floor, cz - 12, cx + 12, floor, cz + 12, BLOCK.WOOD_FLOOR);
      for (let layer = 0; layer < 15; layer++) box(cx - 16 + layer, floor + 17 + layer, cz - 15, cx + 16 - layer, floor + 17 + layer, cz + 15, BLOCK.ROOF);
      box(cx + 6, floor + 18, cz + 6, cx + 9, floor + 34, cz + 9, BLOCK.STONE);
      return { radius: 1.8, portal: [1.3, 0.9, 0.5] };
    },
    // A free-standing door in every colour, to go through.
    surpriseDoor(cx, floor, cz) {
      const colors = [BLOCK.RED_FLOWER, BLOCK.CORAL_ORANGE, BLOCK.YELLOW_FLOWER, BLOCK.GRASS, BLOCK.WATER, BLOCK.CORAL_PINK];
      const frame = (y, x) => colors[Math.floor((y + Math.abs(x)) / 3) % colors.length];
      for (let y = 1; y <= 18; y++) {
        for (const side of [-1, 1]) box(cx + side * 8, floor + y, cz - 2, cx + side * 6, floor + y, cz + 2, frame(y, 7));
      }
      for (let x = -8; x <= 8; x++) box(cx + x, floor + 19, cz - 2, cx + x, floor + 21, cz + 2, frame(19, x));
      return { radius: 1.6, portal: [1.4, 0.5, 1.3] };
    },
    // Afloat by the shore, with a gangway up from the beach. `cx` is where the land ends.
    shoreBoat(cx, floor, cz) {
      const DECK = WATER_LEVEL + 5;
      const bowX = cx + 3, sternX = bowX + 44, middleX = bowX + 22;
      for (let x = cx - 1; x < bowX; x++) {
        for (let z = -4; z <= 4; z++) api.setColumn(x, cz + z, floor, BLOCK.WOOD_FLOOR, BLOCK.HULL);
      }
      for (let x = bowX; x <= sternX; x++) {
        const halfWidth = Math.round(11 * Math.sqrt(Math.max(0, 1 - ((x - middleX) / 25) ** 2)));
        for (let z = -halfWidth; z <= halfWidth; z++) {
          api.setColumn(x, cz + z, DECK, BLOCK.DECK, BLOCK.HULL);
          if (Math.abs(z) >= halfWidth - 1) box(x, DECK + 1, cz + z, x, DECK + 2, cz + z, BLOCK.HULL);
        }
      }
      // A gap in the rail at the bow, where the gangway comes up in steps low enough to walk.
      box(bowX, DECK + 1, cz - 4, bowX + 4, DECK + 2, cz + 4, EMPTY);
      const steps = Math.ceil((DECK - floor) / 2);
      for (let step = 0; step < steps; step++) {
        const x = cx - 2 + step * 2;
        box(x, floor + 1, cz - 4, x + 1, floor + (step + 1) * 2, cz + 4, BLOCK.WOOD_FLOOR);
      }
      box(middleX + 8, DECK + 1, cz - 1, middleX + 10, DECK + 40, cz + 1, BLOCK.HULL);
      box(middleX + 10, DECK + 14, cz - 9, middleX + 10, DECK + 30, cz + 9, BLOCK.SAIL);
      box(middleX + 4, DECK + 34, cz, middleX + 8, DECK + 40, cz, BLOCK.FLAG);
      return { radius: 1.8, portal: [0.2, 0.6, 1.3], portalVx: middleX, floorAt: DECK };
    },
    waterWell(cx, floor, cz) {
      for (let y = 1; y <= 4; y++) {
        disc(cx, floor + y, cz, 9, BLOCK.STONE);
        disc(cx, floor + y, cz, 6, EMPTY);
      }
      for (let y = 0; y >= -6; y--) disc(cx, floor + y, cz, 6, y === 0 ? BLOCK.WATER : EMPTY);
      return { radius: 1.4, portal: [0.2, 0.75, 1.4], maxY: floorY(floor) - 0.2, offsetY: -0.9 };
    },
    surfCave(cx, floor, cz) {
      box(cx - 9, floor + 1, cz - 20, cx + 9, floor + 13, cz + 20, BLOCK.ROCK);
      box(cx - 6, floor + 1, cz - 21, cx + 6, floor + 11, cz + 17, EMPTY);
      box(cx - 6, floor, cz + 3, cx + 6, floor, cz + 17, BLOCK.WATER);
      box(cx - 6, floor - 1, cz + 3, cx + 6, floor - 1, cz + 17, BLOCK.FLAG);
      return { radius: 1.8, portal: [0.45, 0.9, 1.3], portalAt: 2.5 };
    },
    moleHole(cx, floor, cz) {
      for (let y = 1; y <= 3; y++) disc(cx, floor + y, cz, 12 - y, BLOCK.DIRT);
      for (let y = 3; y >= -7; y--) disc(cx, floor + y, cz, 6, EMPTY);
      disc(cx, floor - 8, cz, 6, BLOCK.FLAG);
      return { radius: 1.4, portal: [0.75, 0.5, 0.25], maxY: floorY(floor) - 0.5, offsetY: -1.2 };
    },
  };

  const out = { cages: [], keys: [], wings: [], mapShapes: [], entrances: [] };
  for (const { level, build, x, z, onShore, surprise } of HOME_ENTRANCES) {
    let vx = toVoxel(x);
    const vz = toVoxel(z);
    if (onShore) {
      while (terrainAt(vx, vz) >= WATER_LEVEL) vx++;
    }
    const floor = terrainAt(onShore ? vx - 1 : vx, vz);
    const { radius, portal, maxY = Infinity, offsetY = 0.9, portalAt = 0, portalVx = vx, floorAt = floor } = BUILDERS[build](vx, floor, vz);
    const signX = onShore ? api.toMetres(vx - 6) : x + 6;
    out.entrances.push({
      level, surprise, build, x: api.toMetres(portalVx), z: z + portalAt, y: floorY(floorAt) + offsetY, radius, portal, maxY,
      signX, signZ: onShore ? z - 4 : z - 8.5,
    });
  }
  return out;
}

const LAYOUTS = {
  homeVillage: {
    pads: HOME_ENTRANCES.filter(({ onShore }) => !onShore).map(({ x, z }) => ({ x, z, inner: 7, outer: 10 })),
    outsidePairs: 0,
    randomWings: 0,
    build: buildHomeVillage,
  },

  tunnels: {
    pads: [],
    outsidePairs: 0,
    randomWings: 0,
    solidEarth: true,
    build: buildTunnels,
  },

  giantHouse: {
    pads: [
      { x: -26, z: 24, inner: 28, outer: 36 },
      { x: 26, z: 24, inner: 28, outer: 36 },
    ],
    outsidePairs: 2,
    randomWings: 3,
    build(api) {
      const { toMetres, floorY } = api;
      const out = { cages: [], keys: [], wings: [], mapShapes: [] };
      const cage = (vx, vz, floor) => out.cages.push({ x: toMetres(vx), z: toMetres(vz), y: floorY(floor), indoors: true });
      const key = (vx, vz, surface) => out.keys.push({ x: toMetres(vx), z: toMetres(vz), y: floorY(surface) + 1, climb: 'none', indoors: true });

      for (const pad of this.pads) {
        const hx = api.toVoxel(pad.x), hz = api.toVoxel(pad.z);
        const { ground, upper } = buildGiantHouse(api, hx, hz);
        const mirror = pad.x < 0 ? 1 : -1;

        key(hx + mirror * 32, hz + 40, placeTable(api, hx + mirror * 32, hz + 40, ground));
        cage(hx - mirror * 32, hz + 40, ground);
        cage(hx + mirror * 32, hz + 40, upper);
        key(hx - mirror * 32, hz + 40, placeBed(api, hx - mirror * 32, hz + 40, upper));

        // Refills so the upstairs can always be reached, however the wings before it were spent.
        out.wings.push({ x: toMetres(hx), z: toMetres(hz - 40), y: floorY(ground) + 1.2, refills: true });
        out.mapShapes.push({ x: pad.x - 16, z: pad.z - 20, width: 32, depth: 40, color: '#b8504a' });
      }
      return out;
    },
  },

  pirateShip: {
    pads: [],
    outsidePairs: 0,
    randomWings: 0,
    build(api) {
      const { box, stampDisc, stampBlob, setColumn, toMetres, floorY, EMPTY } = api;
      const cx = api.toVoxel(0), cz = api.toVoxel(0);
      const DECK = 40;
      const HOLD_FLOOR = DECK - 21;
      const { HULL: hull, DECK: deck, SAIL: sail, FURNITURE: wood, WOOD_FLOOR: planks } = BLOCK;
      const halfWidth = (dz) => {
        if (dz > 240 || dz < -240) return -1;
        if (dz > 140) return 60 * (1 - ((dz - 140) / 100) ** 2);
        if (dz < -200) return 60 * (1 - 0.5 * ((-dz - 200) / 40) ** 2);
        return 60;
      };

      for (let dz = -240; dz <= 240; dz++) {
        const width = halfWidth(dz);
        for (let dx = -60; dx <= 60; dx++) {
          if (Math.abs(dx) > width) continue;
          setColumn(cx + dx, cz + dz, DECK, deck, hull);
          if (Math.abs(dx) > width - 3) box(cx + dx, DECK + 1, cz + dz, cx + dx, DECK + 4, cz + dz, hull);
        }
      }

      // Below deck: three rooms, reached by the stairs under the hatch.
      box(cx - 50, HOLD_FLOOR + 1, cz - 120, cx + 50, DECK - 2, cz + 120, EMPTY);
      box(cx - 50, HOLD_FLOOR, cz - 120, cx + 50, HOLD_FLOOR, cz + 120, planks);
      for (const z of [cz + 60, cz - 90]) {
        box(cx - 50, HOLD_FLOOR + 1, z, cx + 50, DECK - 2, z + 1, hull);
        box(cx - 14, HOLD_FLOOR + 1, z, cx + 14, DECK - 3, z + 1, EMPTY);
      }
      box(cx - 8, DECK - 1, cz - 47, cx + 8, DECK, cz - 18, EMPTY);
      for (let step = 0; step < 10; step++) {
        const z = cz - 18 - step * 3;
        box(cx - 8, HOLD_FLOOR + 1, z - 2, cx + 8, HOLD_FLOOR + 2 * (step + 1), z, planks);
      }

      // The captain's cabin at the stern, with stairs up to its roof.
      const CABIN_TOP = DECK + 24;
      box(cx - 44, DECK + 1, cz - 200, cx + 44, CABIN_TOP, cz - 160, hull);
      box(cx - 42, DECK + 1, cz - 198, cx + 42, CABIN_TOP - 2, cz - 162, EMPTY);
      box(cx - 10, DECK + 1, cz - 161, cx + 10, DECK + 16, cz - 160, EMPTY);
      for (const x of [cx - 32, cx + 32]) box(x - 6, DECK + 10, cz - 161, x + 6, DECK + 18, cz - 160, EMPTY);
      box(cx - 44, CABIN_TOP, cz - 200, cx + 44, CABIN_TOP, cz - 160, deck);
      for (let step = 0; step < 12; step++) {
        const z = cz - 122 - step * 3;
        box(cx + 16, DECK + 1, z - 2, cx + 40, DECK + 2 * (step + 1), z, planks);
      }

      // The raised bow takes two jumps.
      box(cx - 14, DECK + 1, cz + 165, cx + 14, DECK + 5, cz + 205, planks);
      box(cx - 8, DECK + 6, cz + 175, cx + 8, DECK + 10, cz + 200, planks);

      // Masts, sails and the crow's nest, which only wings can reach.
      const MAIN_MAST = 40; // clear of the tiger's starting spot in the middle of the deck
      const masts = [{ dz: 120, height: 92, sails: [DECK + 22] }, { dz: MAIN_MAST, height: 116, sails: [DECK + 22, DECK + 46] }, { dz: -110, height: 92, sails: [DECK + 22] }];
      for (const { dz, height, sails } of masts) {
        box(cx - 3, DECK + 1, cz + dz - 3, cx + 3, height, cz + dz + 3, hull);
        for (const bottom of sails) {
          box(cx - 38, bottom + 18, cz + dz + 4, cx + 38, bottom + 19, cz + dz + 5, wood);
          box(cx - 34, bottom, cz + dz + 5, cx + 34, bottom + 17, cz + dz + 5, sail);
        }
      }
      const NEST = DECK + 64;
      stampDisc(cx, NEST, cz + MAIN_MAST, 10, wood);
      box(cx + 4, 106, cz + MAIN_MAST, cx + 22, 115, cz + MAIN_MAST, BLOCK.FLAG);
      stampBlob(cx + 13, 110, cz + MAIN_MAST, 2, 2, 1, sail);

      // Cannons along both sides, and crates and barrels to climb.
      for (const dz of [-60, -20, 30, 80, 120]) {
        for (const side of [-1, 1]) {
          box(cx + side * 47, DECK + 1, cz + dz - 4, cx + side * 52, DECK + 3, cz + dz + 4, wood);
          box(cx + Math.min(side * 45, side * 56), DECK + 4, cz + dz - 2, cx + Math.max(side * 45, side * 56), DECK + 6, cz + dz + 2, BLOCK.FLAG);
        }
      }
      const crates = (x, z, floor) => {
        box(x - 8, floor + 1, z - 8, x + 8, floor + 5, z + 8, wood);
        box(x - 5, floor + 6, z - 5, x + 5, floor + 10, z + 5, wood);
        return floor + 10;
      };

      const cage = (dx, dz, floor, indoors = false) => out.cages.push({ x: toMetres(cx + dx), z: toMetres(cz + dz), y: floorY(floor), indoors });
      const key = (dx, dz, surface, indoors = false) => out.keys.push({ x: toMetres(cx + dx), z: toMetres(cz + dz), y: floorY(surface) + 1, climb: 'none', indoors });
      const wing = (dx, dz, refills) => out.wings.push({ x: toMetres(cx + dx), z: toMetres(cz + dz), y: floorY(DECK) + 1.2, refills });
      const out = { cages: [], keys: [], wings: [], mapShapes: [] };

      cage(-30, 135, DECK);
      cage(28, -72, DECK);
      cage(-25, 15, HOLD_FLOOR, true);
      cage(0, 95, HOLD_FLOOR, true);
      cage(-22, -182, DECK, true);
      cage(20, -182, CABIN_TOP);

      key(5, MAIN_MAST + 5, NEST);
      key(0, 188, DECK + 10);
      key(30, 30, crates(cx + 30, cz + 30, HOLD_FLOOR), true);
      key(20, -182, placeTable(api, cx + 20, cz - 182, DECK), true);
      key(-34, -30, crates(cx - 34, cz - 30, DECK));
      key(34, 100, crates(cx + 34, cz + 100, DECK));

      wing(14, MAIN_MAST, true);
      wing(-25, 40, false);
      wing(30, 10, false);
      // Over the deck, as the tiger cannot leave the ship; far enough from the crow's nest that its
      // no-wings zone leaves the nest reachable.
      out.bonusSpot = { vx: cx - 28, vz: cz - 72 };
      return out;
    },
  },
};
