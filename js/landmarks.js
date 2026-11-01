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

const LAYOUTS = {
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
