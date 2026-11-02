// Each level is an island generated from its level number: the same level always comes out the
// same, and there is no last level. The island is a voxel grid, like Minecraft, but each exposed
// voxel is drawn as a sphere. Collision reads the grid, so walking and jumping never have to
// reason about round shapes.

const VOXEL = 0.25; // metres; a quarter of a Minecraft block
const WORLD_SIZE = 800;
const WORLD_HEIGHT = 120;
const WATER_LEVEL = 12;
const MOUNTAIN_HEIGHT = 48;
const MOUNTAIN_LEDGE = 5; // 1.25 m: too tall to walk up, low enough to jump
const PEAK_LEVEL = 70;
const MAX_PAD_HEIGHT = 60; // keeps the tallest climbing structure inside the grid
const CHUNK_SIZE = 80;
const ISLAND_RADIUS = 94; // metres
// Everything the player must reach stays inside this radius, where the ground is always above
// the liquid, so it can always be walked to in a straight line from the middle of the island.
const OBJECTIVE_RADIUS = ISLAND_RADIUS * 0.62;
const OBJECTIVE_SEPARATION = 22;
const MAX_CAGES = 10;
const MAX_WINGS = 12;
const KEY_CLIMBS = ['tower', 'stairs', 'stones'];
const HOME_LEVEL = 0;
const SURF_WAVE_PERIOD = 40;
const BONUS_PLATFORM_TOP = 100; // 25 m up
const BONUS_SPIRAL_RADIUS = 20;
const BONUS_STONE_DEGREES = 50;
// Spheres overlap their neighbours just enough to leave no holes in a flat layer.
const SPHERE_RADIUS_FACTOR = 0.72;

const BLOCK = {
  EMPTY: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5, TRUNK: 6, LEAF: 7, ROCK: 8, RED_FLOWER: 9, YELLOW_FLOWER: 10,
  RED_SAND: 11, CACTUS: 12, SNOW: 13, ICE: 14, PINE: 15, ASH: 16, BASALT: 17, LAVA: 18, EMBER: 19, DEAD_WOOD: 20,
  // These get their colours from the generated theme of each level.
  GEN_SURFACE: 21, GEN_SOIL: 22, GEN_PEAK: 23, GEN_SHORE: 24, GEN_LIQUID: 25, GEN_ROCK: 26,
  GEN_ACCENT_A: 27, GEN_ACCENT_B: 28, GEN_TRUNK: 29, GEN_CROWN: 30,
  HOUSE_WALL: 31, ROOF: 32, WOOD_FLOOR: 33, FURNITURE: 34, DECK: 35, HULL: 36, SAIL: 37, FLAG: 38,
  SEABED: 39, ABYSS: 40, KELP: 41, CORAL_PINK: 42, CORAL_ORANGE: 43, SHELL: 44, FOAM: 45,
  EARTH: 46, TUNNEL_FLOOR: 47, GLOW: 48, SCORPION: 49,
};
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
  [BLOCK.RED_SAND]: [0.82, 0.5, 0.28],
  [BLOCK.CACTUS]: [0.2, 0.55, 0.3],
  [BLOCK.SNOW]: [0.93, 0.96, 1],
  [BLOCK.ICE]: [0.6, 0.85, 0.98],
  [BLOCK.PINE]: [0.1, 0.38, 0.28],
  [BLOCK.ASH]: [0.3, 0.27, 0.27],
  [BLOCK.BASALT]: [0.17, 0.15, 0.16],
  [BLOCK.LAVA]: [1, 0.38, 0.05],
  [BLOCK.EMBER]: [1, 0.55, 0.12],
  [BLOCK.DEAD_WOOD]: [0.22, 0.17, 0.14],
  [BLOCK.HOUSE_WALL]: [0.96, 0.9, 0.74],
  [BLOCK.ROOF]: [0.74, 0.27, 0.22],
  [BLOCK.WOOD_FLOOR]: [0.66, 0.46, 0.27],
  [BLOCK.FURNITURE]: [0.5, 0.3, 0.16],
  [BLOCK.DECK]: [0.72, 0.53, 0.32],
  [BLOCK.HULL]: [0.36, 0.2, 0.11],
  [BLOCK.SAIL]: [0.97, 0.95, 0.88],
  [BLOCK.FLAG]: [0.08, 0.08, 0.09],
  [BLOCK.SEABED]: [0.76, 0.72, 0.52],
  [BLOCK.ABYSS]: [0.03, 0.12, 0.28],
  [BLOCK.KELP]: [0.14, 0.52, 0.3],
  [BLOCK.CORAL_PINK]: [0.98, 0.42, 0.56],
  [BLOCK.CORAL_ORANGE]: [0.98, 0.56, 0.2],
  [BLOCK.SHELL]: [0.98, 0.93, 0.82],
  [BLOCK.FOAM]: [0.72, 0.9, 0.98],
  [BLOCK.EARTH]: [0.36, 0.25, 0.16],
  [BLOCK.TUNNEL_FLOOR]: [0.62, 0.48, 0.3],
  [BLOCK.GLOW]: [1.5, 1.25, 0.5],
  [BLOCK.SCORPION]: [0.72, 0.42, 0.14],
};

// The first levels, in order. `crossing` is how the tiger gets across the liquid: see crossing.js.
const WORLD_THEMES = [
  {
    name: 'Canlı Ağaçlar Ormanı', sky: [0.56, 0.8, 0.96], hills: 26, plant: 'leafyTree', crossing: 'swim', monster: 'walkingTree',
    surface: BLOCK.GRASS, soil: BLOCK.DIRT, peak: BLOCK.STONE, shore: BLOCK.SAND, liquid: BLOCK.WATER, rock: BLOCK.ROCK,
    accents: [BLOCK.RED_FLOWER, BLOCK.YELLOW_FLOWER], trunk: BLOCK.TRUNK, crown: BLOCK.LEAF,
  },
  {
    name: 'Akrepler Çölü', sky: [0.96, 0.84, 0.62], hills: 20, plant: 'cactus', crossing: 'swim', monster: 'scorpion',
    surface: BLOCK.SAND, soil: BLOCK.RED_SAND, peak: BLOCK.RED_SAND, shore: BLOCK.SAND, liquid: BLOCK.WATER, rock: BLOCK.RED_SAND,
    accents: [BLOCK.RED_SAND, BLOCK.ROCK], trunk: BLOCK.CACTUS, crown: BLOCK.CACTUS,
  },
  {
    name: 'Kar Vadisi', sky: [0.78, 0.87, 0.95], hills: 30, plant: 'pine', crossing: 'slide', monster: 'polarBear',
    surface: BLOCK.SNOW, soil: BLOCK.STONE, peak: BLOCK.ICE, shore: BLOCK.SNOW, liquid: BLOCK.ICE, rock: BLOCK.STONE,
    accents: [BLOCK.ICE, BLOCK.STONE], trunk: BLOCK.TRUNK, crown: BLOCK.PINE,
  },
  {
    name: 'Cehennem Köyü', sky: [0.42, 0.24, 0.2], hills: 32, plant: 'deadTree', crossing: 'fly', monster: 'lavaMonster',
    surface: BLOCK.ASH, soil: BLOCK.BASALT, peak: BLOCK.BASALT, shore: BLOCK.BASALT, liquid: BLOCK.LAVA, rock: BLOCK.BASALT,
    accents: [BLOCK.EMBER, BLOCK.EMBER], trunk: BLOCK.DEAD_WOOD, crown: BLOCK.DEAD_WOOD,
  },
  {
    name: 'Dev ev', sky: [0.6, 0.82, 0.95], hills: 10, mountains: 0, plant: 'leafyTree', crossing: 'swim', monster: 'rat', layout: 'giantHouse',
    surface: BLOCK.GRASS, soil: BLOCK.DIRT, peak: BLOCK.STONE, shore: BLOCK.SAND, liquid: BLOCK.WATER, rock: BLOCK.ROCK,
    accents: [BLOCK.RED_FLOWER, BLOCK.YELLOW_FLOWER], trunk: BLOCK.TRUNK, crown: BLOCK.LEAF,
  },
  {
    name: 'Korsanlar gemisi', sky: [0.62, 0.84, 0.96], hills: 0, crossing: 'swim', monster: 'pirateBear', layout: 'pirateShip', openSea: true, pirateBirds: true,
    surface: BLOCK.DECK, soil: BLOCK.HULL, peak: BLOCK.DECK, shore: BLOCK.DECK, liquid: BLOCK.WATER, rock: BLOCK.HULL,
    accents: [BLOCK.DECK, BLOCK.DECK],
  },
  {
    name: 'Deniz dibi zindanı', sky: [0.08, 0.36, 0.58], fogDensity: 0.0011, hills: 22, plant: 'seaPlant', crossing: 'dive', underwater: true,
    monster: 'shark', boss: 'squid', birdModel: 'jellyfish', birdColor: [0.95, 0.5, 0.8], birdDefeatMessage: 'Süper! Denizanasını yendin!',
    birdSpeedFactor: 0.5,
    surface: BLOCK.SEABED, soil: BLOCK.SEABED, peak: BLOCK.ROCK, shore: BLOCK.SEABED, liquid: BLOCK.ABYSS, rock: BLOCK.ROCK,
    accents: [BLOCK.SHELL, BLOCK.CORAL_PINK], trunk: BLOCK.KELP, crown: BLOCK.KELP,
  },
  {
    name: 'Zorlu Sörf', sky: [0.55, 0.82, 0.98], fogDensity: 0.0005, hills: 0, crossing: 'swim', openSea: true, surf: true,
    surface: BLOCK.WATER, soil: BLOCK.WATER, peak: BLOCK.WATER, shore: BLOCK.WATER, liquid: BLOCK.WATER, rock: BLOCK.WATER,
    accents: [BLOCK.WATER, BLOCK.WATER],
  },
  {
    name: 'Yer Dibi Şehri', sky: [0.06, 0.04, 0.03], fogDensity: 0.0009, hills: 0, crossing: 'dig', layout: 'tunnels', underground: true, noBirds: true, noMap: true,
    monsters: ['mole', 'ant'], boss: 'worm', walledBoss: true,
    surface: BLOCK.EARTH, soil: BLOCK.EARTH, deep: BLOCK.EARTH, peak: BLOCK.EARTH, shore: BLOCK.TUNNEL_FLOOR, liquid: BLOCK.WATER, rock: BLOCK.ROCK,
    accents: [BLOCK.EARTH, BLOCK.EARTH], trunk: BLOCK.DIRT,
  },
];

const FIRST_SURPRISE_LEVEL = WORLD_THEMES.length + 1;
const SURPRISE_MONSTER_KINDS = ['walkingTree', 'scorpion', 'polarBear', 'lavaMonster', 'rat', 'pirateBear', 'shark', 'mole', 'ant'];
const SURPRISE_BOSS_KINDS = ['walkingTree', 'scorpion', 'polarBear', 'lavaMonster', 'rat', 'pirateBear', 'worm', 'squid'];
const SURPRISE_MIN_MONSTER_KINDS = 2;
const SURPRISE_MAX_MONSTER_KINDS = 6;

const HOME_THEME = {
  name: 'Ana Sayfa', sky: [0.56, 0.8, 0.96], hills: 10, mountains: 0, plant: 'leafyTree', crossing: 'swim', layout: 'homeVillage', noBirds: true, home: true,
  surface: BLOCK.GRASS, soil: BLOCK.DIRT, peak: BLOCK.STONE, shore: BLOCK.SAND, liquid: BLOCK.WATER, rock: BLOCK.ROCK,
  accents: [BLOCK.RED_FLOWER, BLOCK.YELLOW_FLOWER], trunk: BLOCK.TRUNK, crown: BLOCK.LEAF,
};

const PLANT_PLACE_NAMES = {
  leafyTree: 'Orman', cactus: 'Çöl', pine: 'Çam Tepeleri', deadTree: 'Bozkır',
  mushroom: 'Mantar Diyarı', crystal: 'Kristal Vadisi', lollipop: 'Şeker Adası',
};
const HUE_NAMES = ['Kırmızı', 'Turuncu', 'Sarı', 'Yeşil', 'Turkuaz', 'Mavi', 'Mor', 'Pembe'];
const HUE_NAME_STARTS = [0, 0.05, 0.11, 0.2, 0.44, 0.53, 0.72, 0.86];

// Every level after the fixed ones invents its own colours, plants and liquid. The hues keep their
// distance, so the ground, the liquid and the plants can always be told apart.
function generateTheme(level) {
  const random = seededRandom(20261101 + level * 7919 + 2);
  const between = (min, max) => min + random() * (max - min);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const hue = random();
  const plant = pick(Object.keys(PLANT_PLACE_NAMES));
  const hueName = HUE_NAMES[HUE_NAME_STARTS.findLastIndex((start) => hue >= start)];
  return {
    name: `${hueName} ${PLANT_PLACE_NAMES[plant]}`,
    sky: hslColor(hue + between(0.45, 0.65), 0.5, 0.82),
    hills: Math.round(between(20, 32)),
    plant,
    crossing: pick(['swim', 'swim', 'slide', 'fly']),
    surface: BLOCK.GEN_SURFACE, soil: BLOCK.GEN_SOIL, peak: BLOCK.GEN_PEAK, shore: BLOCK.GEN_SHORE,
    liquid: BLOCK.GEN_LIQUID, rock: BLOCK.GEN_ROCK, accents: [BLOCK.GEN_ACCENT_A, BLOCK.GEN_ACCENT_B],
    trunk: BLOCK.GEN_TRUNK, crown: BLOCK.GEN_CROWN,
    colors: {
      [BLOCK.GEN_SURFACE]: hslColor(hue, between(0.45, 0.7), between(0.55, 0.72)),
      [BLOCK.GEN_SOIL]: hslColor(hue, 0.35, 0.35),
      [BLOCK.GEN_PEAK]: hslColor(hue, 0.25, 0.85),
      [BLOCK.GEN_SHORE]: hslColor(hue + 0.08, 0.4, 0.75),
      [BLOCK.GEN_LIQUID]: hslColor(hue + between(0.33, 0.67), 0.75, 0.52),
      [BLOCK.GEN_ROCK]: hslColor(hue + 0.5, 0.12, 0.55),
      [BLOCK.GEN_ACCENT_A]: hslColor(random(), 0.85, 0.6),
      [BLOCK.GEN_ACCENT_B]: hslColor(random(), 0.85, 0.6),
      [BLOCK.GEN_TRUNK]: hslColor(hue + between(0.6, 0.8), 0.4, 0.38),
      [BLOCK.GEN_CROWN]: hslColor(hue + between(0.25, 0.75), 0.65, 0.52),
    },
    boss: pick(SURPRISE_BOSS_KINDS),
    // One more kind of monster for every other world, as they get harder.
    monsters: shuffled(SURPRISE_MONSTER_KINDS, random).slice(0, Math.min(
      SURPRISE_MIN_MONSTER_KINDS + Math.floor((level - FIRST_SURPRISE_LEVEL) / 2),
      SURPRISE_MAX_MONSTER_KINDS,
    )),
  };
}

function themeForLevel(level) {
  if (level === HOME_LEVEL) return HOME_THEME;
  return level <= WORLD_THEMES.length ? WORLD_THEMES[level - 1] : generateTheme(level);
}

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

// Every world comes out the same each time except for its maze, which only tunnels use. A save keeps
// `mazeSeed` so that a reload finds the same maze.
function generateWorld(level, mazeSeed = Math.floor(Math.random() * 2 ** 31)) {
  const random = seededRandom(20261101 + level * 7919);
  const noise = makeNoise(random);
  const theme = themeForLevel(level);
  const blockColor = (block) => theme.colors?.[block] ?? BLOCK_COLORS[block];
  const voxels = new Uint8Array(WORLD_SIZE * WORLD_SIZE * WORLD_HEIGHT);
  const terrain = new Int16Array(WORLD_SIZE * WORLD_SIZE);
  const index = (x, y, z) => x + z * WORLD_SIZE + y * WORLD_SIZE * WORLD_SIZE;
  const toVoxel = (metres) => Math.floor(metres / VOXEL + WORLD_SIZE / 2);

  const layout = theme.layout ? LAYOUTS[theme.layout] : null;

  const rawHeight = (x, z) => {
    if (theme.openSea) return 6;
    if (layout?.solidEarth) return WORLD_HEIGHT - 1;
    // The noise wobbles the coast by up to 15%, so no two islands have the same outline.
    const wobble = 1 + (noise(x * 0.004 + 11, z * 0.004 + 23) - 0.5) * 0.3;
    const distance = Math.hypot(x, z) * VOXEL * wobble;
    const t = clamp((ISLAND_RADIUS - distance) / (ISLAND_RADIUS * 0.36), 0, 1);
    const mask = t * t * (3 - 2 * t);
    const rolling = 6 + mask * (8 + noise(x * 0.012 + 40, z * 0.012 + 70) * theme.hills);
    const m = clamp((noise(x * 0.006 + 90, z * 0.006 + 15) - 0.42) / 0.25, 0, 1);
    const mountain = m * m * (3 - 2 * m) * mask * MOUNTAIN_HEIGHT * (theme.mountains ?? 1);
    return rolling + Math.floor(mountain / MOUNTAIN_LEDGE) * MOUNTAIN_LEDGE;
  };

  // Flat ground under everything the player has to reach.
  const pads = theme.surf ? [] : [{ x: 0, z: 0, inner: 4, outer: 8 }, ...(layout ? layout.pads : [])];
  const placeObjective = () => {
    for (let attempt = 0; ; attempt++) {
      const [x, z] = polar(random() * 360, OBJECTIVE_RADIUS * (0.2 + Math.sqrt(random()) * 0.8));
      const isApart = (pad) => Math.hypot(x - pad.x, z - pad.z) > Math.max(OBJECTIVE_SEPARATION, pad.outer + 8);
      if (attempt > 500 || pads.every(isApart)) return [x, z];
    }
  };
  const cages = [];
  const keys = [];
  const cageCount = theme.surf ? 0 : layout ? layout.outsidePairs : Math.min(4 + level, MAX_CAGES);
  for (let i = 0; i < cageCount; i++) {
    const [x, z] = placeObjective();
    cages.push({ x, z });
    pads.push({ x, z, inner: 3.5, outer: 7 });

    const [keyX, keyZ] = placeObjective();
    keys.push({ x: keyX, z: keyZ, climb: KEY_CLIMBS[i % KEY_CLIMBS.length] });
    pads.push({ x: keyX, z: keyZ, inner: 7, outer: 11 });
  }
  for (const pad of pads) {
    pad.height = clamp(Math.round(rawHeight(pad.x / VOXEL, pad.z / VOXEL)), WATER_LEVEL + 3, MAX_PAD_HEIGHT);
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

      let surface = theme.surface;
      if (top <= WATER_LEVEL + 1) surface = theme.shore;
      else if (top > PEAK_LEVEL) surface = theme.peak;
      else if (random() < 0.012) surface = theme.accents[random() < 0.5 ? 0 : 1];

      for (let y = 0; y <= top; y++) {
        voxels[index(vx, y, vz)] = y === top ? surface : y > top - 4 ? theme.soil : theme.deep ?? BLOCK.STONE;
      }
      for (let y = top + 1; y <= WATER_LEVEL; y++) voxels[index(vx, y, vz)] = theme.liquid;
      // Waves to surf past. They repeat exactly, because the surf level loops its stretch of sea.
      if (theme.surf && vz % SURF_WAVE_PERIOD < 3) voxels[index(vx, WATER_LEVEL, vz)] = BLOCK.FOAM;
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
  const stampColumn = (x, fromY, toY, block) => {
    for (let y = fromY; y <= toY; y++) stampBlob(x[0], y, x[1], 2, 1, 2, block);
  };

  const PLANTS = {
    leafyTree(vx, top, vz) {
      const trunkHeight = 16 + Math.floor(random() * 10);
      stampColumn([vx, vz], top + 1, top + trunkHeight, theme.trunk);
      const crown = 8 + Math.floor(random() * 5);
      stampBlob(vx, top + trunkHeight + crown - 3, vz, crown, crown, crown, theme.crown);
    },
    cactus(vx, top, vz) {
      const height = 10 + Math.floor(random() * 10);
      stampColumn([vx, vz], top + 1, top + height, theme.crown);
      const side = random() < 0.5 ? 1 : -1;
      const armY = top + 5 + Math.floor(random() * 4);
      for (let i = 1; i <= 5; i++) stampBlob(vx + side * i, armY, vz, 1, 1, 1, theme.crown);
      for (let y = 0; y <= 4; y++) stampBlob(vx + side * 5, armY + y, vz, 1, 1, 1, theme.crown);
    },
    pine(vx, top, vz) {
      const trunkHeight = 12 + Math.floor(random() * 6);
      stampColumn([vx, vz], top + 1, top + trunkHeight + 12, theme.trunk);
      for (let layer = 0; layer < 3; layer++) {
        const radius = 9 - layer * 3;
        stampBlob(vx, top + trunkHeight + layer * 6, vz, radius, 4, radius, theme.crown);
      }
    },
    deadTree(vx, top, vz) {
      const height = 12 + Math.floor(random() * 10);
      stampColumn([vx, vz], top + 1, top + height, theme.trunk);
      for (const side of [-1, 1]) {
        const y = top + height - 4 - Math.floor(random() * 3);
        for (let i = 1; i <= 5; i++) stampBlob(vx + side * i, y + i, vz, 1, 1, 1, theme.trunk);
      }
    },
    seaPlant(vx, top, vz) {
      if (random() < 0.45) {
        const coral = random() < 0.5 ? BLOCK.CORAL_PINK : BLOCK.CORAL_ORANGE;
        for (let branch = 0; branch < 5; branch++) {
          const [x, z] = polar(random() * 360, 1 + random() * 5);
          const height = 4 + Math.floor(random() * 8);
          for (let y = 1; y <= height; y++) stampBlob(vx + Math.round(x * y / height), top + y, vz + Math.round(z * y / height), 1, 1, 1, coral);
        }
      } else {
        const height = 14 + Math.floor(random() * 22);
        const bend = random() * 6;
        for (let y = 1; y <= height; y++) {
          const sway = Math.round(Math.sin(y * 0.3 + bend) * 2);
          stampBlob(vx + sway, top + y, vz, 1, 1, 2, theme.crown);
        }
      }
    },
    mushroom(vx, top, vz) {
      const height = 8 + Math.floor(random() * 8);
      stampColumn([vx, vz], top + 1, top + height, theme.trunk);
      const cap = 7 + Math.floor(random() * 5);
      stampBlob(vx, top + height + 2, vz, cap, 4, cap, theme.crown);
    },
    crystal(vx, top, vz) {
      const height = 14 + Math.floor(random() * 12);
      for (let y = 0; y < height; y++) {
        const radius = Math.max(1, Math.round(4 * (1 - y / height)));
        stampBlob(vx, top + y, vz, radius, 1, radius, theme.crown);
      }
    },
    lollipop(vx, top, vz) {
      const height = 12 + Math.floor(random() * 10);
      for (let y = 1; y <= height; y++) stampBlob(vx, top + y, vz, 1, 1, 1, theme.trunk);
      const radius = 5 + Math.floor(random() * 4);
      stampBlob(vx, top + height + radius - 1, vz, radius, radius, radius, theme.crown);
    },
  };

  const isClearOfPads = (x, z) => pads.every((pad) => Math.hypot(x - pad.x, z - pad.z) > pad.outer);
  const scatter = (count, place) => {
    for (let i = 0; i < count; i++) {
      const [x, z] = polar(random() * 360, 4 + Math.sqrt(random()) * (ISLAND_RADIUS - 7));
      const vx = toVoxel(x), vz = toVoxel(z);
      const top = terrain[vx + vz * WORLD_SIZE];
      if (top > WATER_LEVEL + 2 && isClearOfPads(x, z)) place(vx, top, vz);
    }
  };
  if (!theme.openSea && !layout?.solidEarth) {
    scatter(280, PLANTS[theme.plant]);
    scatter(180, (vx, top, vz) => {
      const size = 3 + Math.floor(random() * 5);
      stampBlob(vx, top, vz, size, size, size, theme.rock);
    });
  }

  const stampDisc = (cx, y, cz, radius, block) => {
    for (let layer = 0; layer < 2; layer++) {
      for (let z = -radius; z <= radius; z++) {
        for (let x = -radius; x <= radius; x++) {
          if (x * x + z * z <= radius * radius) stamp(cx + x, y - layer, cz + z, block);
        }
      }
    }
  };
  // Each climb returns the height of the platform that holds the key.
  const CLIMBS = {
    // Every step is too tall to walk up, so it takes one jump per step.
    tower(vx, top, vz) {
      for (let step = 0; step < 4; step++) {
        const half = 14 - step * 3;
        for (let y = 1; y <= 4; y++) {
          for (let z = -half; z <= half; z++) {
            for (let x = -half; x <= half; x++) stamp(vx + x, top + step * 4 + y, vz + z, theme.rock);
          }
        }
      }
      return top + 16;
    },
    // A spiral low enough to walk up around a central pillar.
    stairs(vx, top, vz) {
      for (let y = 1; y <= 48; y++) stampBlob(vx, top + y, vz, 3, 1, 3, theme.rock);
      for (let i = 0; i < 24; i++) {
        const [x, z] = polar(i * 22.5, 9);
        stampDisc(vx + Math.round(x), top + (i + 1) * 2, vz + Math.round(z), 2, BLOCK.STONE);
      }
      stampDisc(vx, top + 50, vz, 5, theme.rock);
      return top + 50;
    },
    // Floating stones circling up, each a jump away from the last.
    stones(vx, top, vz) {
      for (let i = 0; i < 8; i++) {
        const [x, z] = polar(i * 55, 20);
        stampDisc(vx + Math.round(x), top + (i + 1) * 4, vz + Math.round(z), 5, BLOCK.STONE);
      }
      stampDisc(vx, top + 36, vz, 8, theme.rock);
      return top + 36;
    },
  };
  for (const key of keys) {
    const vx = toVoxel(key.x), vz = toVoxel(key.z);
    const platform = CLIMBS[key.climb](vx, terrain[vx + vz * WORLD_SIZE], vz);
    key.y = (platform + 1) * VOXEL + 1;
  }

  const stampBox = (x0, y0, z0, x1, y1, z1, block) => {
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) stamp(x, y, z, block);
      }
    }
  };
  const builtLayout = layout?.build({
    EMPTY: BLOCK.EMPTY,
    box: stampBox,
    stampBlob,
    stampDisc,
    terrainAt: (vx, vz) => terrain[vx + vz * WORLD_SIZE],
    // Makes a column solid up to `top`, and land as far as walking is concerned.
    setColumn(vx, vz, top, surface, body) {
      terrain[vx + vz * WORLD_SIZE] = top;
      for (let y = 0; y <= top; y++) voxels[index(vx, y, vz)] = y === top ? surface : body;
    },
    toVoxel,
    toMetres: (voxel) => (voxel + 0.5 - WORLD_SIZE / 2) * VOXEL,
    floorY: (voxelY) => (voxelY + 1) * VOXEL,
    mazeSeed,
    // Hollows out a column of solid earth above a new floor.
    setFloor(vx, vz, floor, height) {
      terrain[vx + vz * WORLD_SIZE] = floor;
      voxels[index(vx, floor, vz)] = theme.shore;
      for (let y = floor + 1; y <= floor + height; y++) voxels[index(vx, y, vz)] = BLOCK.EMPTY;
    },
  });
  if (builtLayout) {
    cages.push(...builtLayout.cages);
    keys.push(...builtLayout.keys);
  }

  const terrainTop = (x, z) => {
    const vx = clamp(toVoxel(x), 0, WORLD_SIZE - 1), vz = clamp(toVoxel(z), 0, WORLD_SIZE - 1);
    return (terrain[vx + vz * WORLD_SIZE] + 1) * VOXEL;
  };
  for (const cage of cages) cage.y ??= terrainTop(cage.x, cage.z);

  const isSolid = (x, y, z) => {
    const vx = toVoxel(x), vz = toVoxel(z), vy = Math.floor(y / VOXEL);
    if (vx < 0 || vx >= WORLD_SIZE || vz < 0 || vz >= WORLD_SIZE || vy < 0 || vy >= WORLD_HEIGHT) return false;
    const block = voxels[index(vx, vy, vz)];
    return block !== BLOCK.EMPTY && block !== theme.liquid;
  };
  const isLiquid = (x, z) => {
    const vx = clamp(toVoxel(x), 0, WORLD_SIZE - 1), vz = clamp(toVoxel(z), 0, WORLD_SIZE - 1);
    return terrain[vx + vz * WORLD_SIZE] < WATER_LEVEL;
  };

  // The hidden bonus: a spiral of floating stones up to a tiny shed. Its own random sequence, for
  // the same reason as the wings below. Its spot is far from the middle and clear of everything.
  // Whatever a clearing cut off from the ground would hang in the air, so it goes too. Anything
  // that reaches the edge of the area counts as attached: it may well be held up from outside.
  const removeFloatingPieces = (cx, cz, reach) => {
    const attached = new Set();
    const stack = [];
    const visit = (x, y, z) => {
      if (y < 0 || y >= WORLD_HEIGHT) return;
      const key = index(x, y, z);
      if (attached.has(key) || voxels[key] === BLOCK.EMPTY || voxels[key] === theme.liquid) return;
      attached.add(key);
      stack.push([x, y, z]);
    };
    for (let z = cz - reach; z <= cz + reach; z++) {
      for (let x = cx - reach; x <= cx + reach; x++) {
        const isEdge = Math.abs(x - cx) === reach || Math.abs(z - cz) === reach;
        visit(x, terrain[x + z * WORLD_SIZE], z);
        for (let y = isEdge ? 0 : WORLD_HEIGHT; y < WORLD_HEIGHT; y++) visit(x, y, z);
      }
    }
    while (stack.length > 0) {
      const [x, y, z] = stack.pop();
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        if (Math.abs(x + dx - cx) <= reach && Math.abs(z + dz - cz) <= reach) visit(x + dx, y + dy, z + dz);
      }
    }
    for (let z = cz - reach; z <= cz + reach; z++) {
      for (let x = cx - reach; x <= cx + reach; x++) {
        for (let y = terrain[x + z * WORLD_SIZE] + 1; y < WORLD_HEIGHT; y++) {
          const key = index(x, y, z);
          if (voxels[key] !== theme.liquid && !attached.has(key)) voxels[key] = BLOCK.EMPTY;
        }
      }
    }
  };

  const placeBonus = () => {
    const bonusRandom = seededRandom(20261101 + level * 7919 + 3);
    const isGoodBonusSpot = (x, z, maxSlope) => {
      if (pads.some((pad) => Math.hypot(x - pad.x, z - pad.z) < pad.outer + 8)) return false;
      // Level ground: a ledge cutting through the spiral would block the jumps.
      const ground = terrainTop(x, z);
      for (let a = 0; a < 8; a++) {
        for (const radius of [0, 3, 6, 8]) {
          const [ox, oz] = polar(a * 45, radius);
          if (isLiquid(x + ox, z + oz) || Math.abs(terrainTop(x + ox, z + oz) - ground) > maxSlope) return false;
        }
      }
      return true;
    };
    let bonusSpot = builtLayout?.bonusSpot;
    for (let attempt = 0; !bonusSpot && attempt < 800; attempt++) {
      const [x, z] = polar(bonusRandom() * 360, OBJECTIVE_RADIUS * (0.78 + bonusRandom() * 0.22));
      if (isGoodBonusSpot(x, z, attempt < 400 ? 1 : 3) || attempt === 799) bonusSpot = { vx: toVoxel(x), vz: toVoxel(z) };
    }
    const { vx: bonusX, vz: bonusZ } = bonusSpot;
    if (!builtLayout?.bonusSpot) {
      // Fell the trees and rocks in the spiral's way. A layout's spot is clear by design.
      const reach = BONUS_SPIRAL_RADIUS + 12;
      for (let vz = bonusZ - reach; vz <= bonusZ + reach; vz++) {
        for (let vx = bonusX - reach; vx <= bonusX + reach; vx++) {
          if ((vx - bonusX) ** 2 + (vz - bonusZ) ** 2 > reach * reach) continue;
          stampBox(vx, terrain[vx + vz * WORLD_SIZE] + 1, vz, vx, WORLD_HEIGHT - 1, vz, BLOCK.EMPTY);
        }
      }
      removeFloatingPieces(bonusX, bonusZ, reach + 24);
    }
    let stoneTop = terrain[bonusX + BONUS_SPIRAL_RADIUS + bonusZ * WORLD_SIZE];
    for (let i = 0; stoneTop + 4 < BONUS_PLATFORM_TOP; i++) {
      stoneTop += 4;
      const [x, z] = polar(i * BONUS_STONE_DEGREES, BONUS_SPIRAL_RADIUS);
      stampDisc(bonusX + Math.round(x), stoneTop, bonusZ + Math.round(z), 3, BLOCK.STONE);
    }
    stoneTop += 4;
    stampBox(bonusX - 8, stoneTop - 1, bonusZ - 8, bonusX + 8, stoneTop, bonusZ + 8, BLOCK.STONE);
    stampBox(bonusX - 4, stoneTop + 1, bonusZ - 4, bonusX + 4, stoneTop + 11, bonusZ + 4, theme.trunk ?? BLOCK.HULL);
    stampBox(bonusX - 3, stoneTop + 1, bonusZ - 3, bonusX + 3, stoneTop + 10, bonusZ + 3, BLOCK.EMPTY);
    stampBox(bonusX - 2, stoneTop + 1, bonusZ - 4, bonusX + 2, stoneTop + 9, bonusZ - 4, BLOCK.EMPTY);
    const metresOf = (voxel) => (voxel + 0.5 - WORLD_SIZE / 2) * VOXEL;
    return {
      x: metresOf(bonusX), z: metresOf(bonusZ), y: (stoneTop + 1) * VOXEL + 0.5,
      doorX: metresOf(bonusX - 2) - VOXEL / 2, doorZ: metresOf(bonusZ - 4), doorY: (stoneTop + 1) * VOXEL,
      stoneTop,
    };
  };
  const bonus = theme.surf || theme.home ? null : placeBonus();

  // Their own random sequence, so that adding them leaves the rest of each level unchanged.
  const wingRandom = seededRandom(20261101 + level * 7919 + 1);
  const wings = [...(builtLayout ? builtLayout.wings : [])];
  const randomWings = theme.underwater || theme.surf ? 0 : layout ? layout.randomWings : Math.min(5 + level, MAX_WINGS);
  const wingCount = wings.length + randomWings;
  for (let attempt = 0; attempt < 500 && wings.length < wingCount; attempt++) {
    const [x, z] = polar(wingRandom() * 360, 8 + Math.sqrt(wingRandom()) * ISLAND_RADIUS * 0.7);
    const y = terrainTop(x, z);
    const isFree = !isLiquid(x, z) && !isSolid(x, y + 0.5, z) && !isSolid(x, y + 1.5, z) && !isSolid(x, y + 2.5, z);
    const isClear = [...cages, ...wings].every((other) => Math.hypot(x - other.x, z - other.z) > 6) &&
      Math.hypot(x - bonus.x, z - bonus.z) > 20;
    if (isFree && isClear) wings.push({ x, y: y + 1.2, z });
  }

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

  let sphereData = new Float32Array(FLOATS_PER_SPHERE * 1000000);
  let sphereCount = 0;
  const emit = (grid, gridIndex, size, height, scale, fromX, fromZ, chunkSize) => {
    const first = sphereCount;
    const voxelSize = VOXEL * scale;
    const radius = voxelSize * SPHERE_RADIUS_FACTOR;
    const isEmpty = (x, y, z) => {
      if (y >= height) return !layout?.solidEarth; // nobody sees the top of the earth from inside it
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
          if ((sphereCount + 1) * FLOATS_PER_SPHERE > sphereData.length) {
            const larger = new Float32Array(sphereData.length * 2);
            larger.set(sphereData);
            sphereData = larger;
          }
          const color = blockColor(block);
          const speckle = 0.93 + random() * 0.14;
          const shade = theme.surf ? 1 : speckle; // the looping sea must look the same at every point
          sphereData.set([
            (x + 0.5 - size / 2) * voxelSize, (y + 0.5) * voxelSize, (z + 0.5 - size / 2) * voxelSize, radius,
            color[0] * shade, color[1] * shade, color[2] * shade,
          ], sphereCount * FLOATS_PER_SPHERE);
          sphereCount++;
        }
      }
    }
    return { first, count: sphereCount - first };
  };

  const chunks = [];
  const chunkMetres = CHUNK_SIZE * VOXEL;
  const heightMetres = WORLD_HEIGHT * VOXEL;
  for (let cz = 0; cz < WORLD_SIZE; cz += CHUNK_SIZE) {
    for (let cx = 0; cx < WORLD_SIZE; cx += CHUNK_SIZE) {
      chunks.push({
        center: [(cx + CHUNK_SIZE / 2 - WORLD_SIZE / 2) * VOXEL, heightMetres / 2, (cz + CHUNK_SIZE / 2 - WORLD_SIZE / 2) * VOXEL],
        radius: Math.hypot(chunkMetres, heightMetres, chunkMetres) / 2,
        fine: emit(voxels, index, WORLD_SIZE, WORLD_HEIGHT, 1, cx, cz, CHUNK_SIZE),
        coarse: emit(coarse, coarseIndex, coarseSize, coarseHeight, 2, cx / 2, cz / 2, CHUNK_SIZE / 2),
      });
    }
  }

  return {
    level,
    mazeSeed,
    theme,
    blockColor,
    sphereData: sphereData.subarray(0, sphereCount * FLOATS_PER_SPHERE),
    chunks,
    cages,
    keys,
    wings,
    bonus,
    mapShapes: builtLayout ? builtLayout.mapShapes : [],
    entrances: builtLayout?.entrances ?? [],
    terrain,
    terrainTop,
    isSolid,
    isLiquid,
  };
}
