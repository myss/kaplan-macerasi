// The trip between two levels, played by itself: the tiger runs to the shore, crosses the liquid
// into thickening fog, and arrives at the next island. How it crosses is up to the world's theme:
// it swims, slides, flies with its wings out, or dives along above the dark deep. Underground there
// is no shore: it just walks off into the fog. On lava it hops into a stone boat and sails out until
// a lava whale comes up under the boat and spouts the tiger up into the sky.
//
// The next world is generated before the trip starts, because generating freezes the page for a
// moment. So both worlds exist during the trip, and a white mist hides the swap between them.

const CROSSING_RUN_SPEED = 9;
const CROSSING_SEA_SPEED = 5;
const CROSSING_OUT_SECONDS = 5;
const CROSSING_LAND_SECONDS = 1.2;
const CROSSING_GIVE_UP_SECONDS = 6; // on land, in case something stands where the trip should end
const CROSSING_LEAP_SPEED = 7;
const CROSSING_APPROACH_METRES = 18;
const WORLD_EDGE_METRES = 97; // the grid ends at 100 m
const MIST_SECONDS = 0.7;
const FOG_CLEAR_SECONDS = 3;
const BOAT_HOP_SPEED = 4;
const BOAT_HOP_METRES = 2.5; // from the shore to the boat waiting beside it
const BOAT_DECK_HEIGHT = 0.35;
const BOAT_SAIL_SECONDS = 4;
const LAVA_WHALE_SCALE = 3.2;
const LAVA_WHALE_HALF_HEIGHT = 0.6; // of its model, before scale
const LAVA_WHALE_RISE_SECONDS = 1.8;
const SPOUT_SECONDS = 3;
const SPOUT_SPEED = 10;

let crossing = null;

// Fewer trees and rocks in the way count for more than a slightly shorter run.
function pickCrossingDirection() {
  let best = null;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dirX = Math.sin(a), dirZ = Math.cos(a);
    let distance = 0, obstacles = 0;
    while (distance < 200 && !world.isLiquid(tiger.x + dirX * distance, tiger.z + dirZ * distance)) {
      const x = tiger.x + dirX * distance, z = tiger.z + dirZ * distance;
      if (world.isSolid(x, world.terrainTop(x, z) + 1, z)) obstacles++;
      distance += 1;
    }
    const score = distance + obstacles * 6;
    if (!best || score < best.score) best = { score, dirX, dirZ };
  }
  return best;
}

function startCrossing(nextWorld) {
  const { dirX, dirZ } = pickCrossingDirection();
  crossing = { phase: world.theme.underground ? 'out' : 'run', time: 0, dirX, dirZ, nextWorld, vy: 0, leapSpeed: CROSSING_RUN_SPEED, boat: null, whale: null };
  tiger.vy = 0;
  tiger.grounded = true;
  tiger.wingsOut = false;
  tiger.attackTime = 0;
  for (const bird of birds) {
    if (bird.state === 'swoop') bird.state = 'patrol';
  }
}

function crossingHeight() {
  const surface = (WATER_LEVEL + 1) * VOXEL;
  if (world.theme.crossing === 'fly') return surface + 2.2 + Math.sin(game.time * 2.5) * 0.2;
  if (world.theme.crossing === 'slide') return surface;
  if (world.theme.crossing === 'dig') return world.terrainTop(0, 0);
  if (world.theme.crossing === 'dive') return surface + 1.2 + Math.sin(game.time * 2) * 0.25;
  if (world.theme.crossing === 'boat') return surface + BOAT_DECK_HEIGHT + Math.sin(game.time * 2) * 0.05;
  return surface - 0.75 + Math.sin(game.time * 5) * 0.06;
}

function moveAlongCrossing(speed, dt) {
  const x = tiger.x + crossing.dirX * speed * dt, z = tiger.z + crossing.dirZ * speed * dt;
  if (Math.hypot(x, z) > WORLD_EDGE_METRES) return;
  tiger.x = x;
  tiger.z = z;
}

function easeHeight(target, dt) {
  tiger.y += (target - tiger.y) * Math.min(1, dt * 10);
}

function worldFogDensity() {
  return world.theme.fogDensity ?? BASE_FOG_DENSITY;
}

function setMist(opacity) {
  hud.mist.style.opacity = clamp(opacity, 0, 1);
}

function arriveAtNextWorld() {
  loadLevel(crossing.nextWorld.level, crossing.nextWorld);
  crossing.nextWorld = null;

  // Keep heading the same way, so the new island comes from the side opposite the old shore.
  let shore = 110;
  while (shore > 0 && world.isLiquid(-crossing.dirX * shore, -crossing.dirZ * shore)) shore -= 1;
  const start = Math.min(shore + CROSSING_APPROACH_METRES, WORLD_EDGE_METRES);
  tiger.x = -crossing.dirX * start;
  tiger.z = -crossing.dirZ * start;
  tiger.y = crossingHeight();
  tiger.wingsOut = world.theme.crossing === 'fly';
}

// Out of the fog of one world into the next.
function crossIntoNextWorld() {
  const c = crossing;
  arriveAtNextWorld();
  c.phase = 'in';
  c.time = 0;
  c.boat = null;
  c.whale = null;
  if (world.theme.surf) {
    finishCrossing(); // no shore to reach: it rides off at once
    placeSurfTiger();
  } else if (world.theme.underground || world.theme.home) {
    finishCrossing(); // both start in their middle, not at the shore
    tiger.x = SPAWN.x;
    tiger.z = SPAWN.z;
    tiger.y = world.terrainTop(SPAWN.x, SPAWN.z);
  }
}

function thickenFog(progress) {
  renderer.setFogDensity(worldFogDensity() + (THICK_FOG_DENSITY - worldFogDensity()) * progress * progress);
}

function finishCrossing() {
  crossing = null;
  setMist(0);
  renderer.setFogDensity(worldFogDensity());
  tiger.y = Math.max(tiger.y, world.terrainTop(tiger.x, tiger.z)); // the easing can lag on a slope
  tiger.vy = 0;
  tiger.wingsOut = false;
  attackQueued = false;
  jumpQueued = false;
  cheatQueued = false;
  bossCheatQueued = false;
  writeSave();
}

// Writes the boat, the whale and its spout into the frame's sphere array and returns the new count.
function drawCrossing(count) {
  if (!crossing?.boat) return count;
  const { boat, whale, dirX, dirZ } = crossing;
  const heading = Math.atan2(dirX, dirZ);
  count = drawModel(frameSpheres, count, models.lavaBoat, boat.x, boat.y, boat.z, heading);
  if (whale) count = drawModel(frameSpheres, count, models.lavaWhale, whale.x, whale.y, whale.z, heading, {}, LAVA_WHALE_SCALE);
  if (crossing.phase === 'spout') {
    for (let y = boat.y; y < tiger.y; y += 0.35) {
      const at = count * FLOATS_PER_SPHERE;
      if (at + FLOATS_PER_SPHERE > frameSpheres.length) break;
      const a = y * 3 + game.time * 9, spread = 0.25 + Math.random() * 0.25;
      const hot = Math.random() < 0.3;
      frameSpheres.set([tiger.x + Math.cos(a) * spread, y, tiger.z + Math.sin(a) * spread, 0.32, hot ? 1.5 : 1, hot ? 0.6 : 0.95, hot ? 0.1 : 0.9], at);
      count++;
    }
  }
  return count;
}

function updateCrossing(dt) {
  const c = crossing;
  c.time += dt;

  const heading = Math.atan2(c.dirX, c.dirZ);
  const tigerTurn = heading - tiger.yaw;
  tiger.yaw += Math.atan2(Math.sin(tigerTurn), Math.cos(tigerTurn)) * Math.min(1, dt * 8);
  const cameraTurn = heading + Math.PI - camera.yaw;
  camera.yaw += Math.atan2(Math.sin(cameraTurn), Math.cos(cameraTurn)) * Math.min(1, dt * 2.5);
  const pitch = c.phase === 'spout' ? 0.75 : 0.3; // up in the spout, looking down at the whale falling away
  camera.pitch += (pitch - camera.pitch) * Math.min(1, dt * 2.5);

  const isSliding = world.theme.crossing === 'slide';
  const isStanding = (isSliding && (c.phase === 'out' || c.phase === 'in')) || c.phase === 'sail' || c.phase === 'whale';
  if (c.phase !== 'leap' && !isStanding) {
    tiger.stride += dt * (c.phase === 'run' || c.phase === 'land' ? 16 : 9);
  }

  if (c.phase === 'run') {
    moveAlongCrossing(CROSSING_RUN_SPEED, dt);
    easeHeight(world.terrainTop(tiger.x, tiger.z), dt);
    if (world.isLiquid(tiger.x + c.dirX, tiger.z + c.dirZ)) {
      c.phase = 'leap';
      tiger.grounded = false;
      tiger.wingsOut = world.theme.crossing === 'fly';
      if (world.theme.crossing === 'boat') {
        // A small hop, timed to come down on the boat.
        c.vy = BOAT_HOP_SPEED;
        c.leapSpeed = BOAT_HOP_METRES / ((2 * BOAT_HOP_SPEED) / GRAVITY);
        c.boat = { x: tiger.x + c.dirX * BOAT_HOP_METRES, y: crossingHeight() - BOAT_DECK_HEIGHT, z: tiger.z + c.dirZ * BOAT_HOP_METRES };
      } else {
        c.vy = CROSSING_LEAP_SPEED;
      }
    }
  } else if (c.phase === 'leap') {
    moveAlongCrossing(c.leapSpeed, dt);
    c.vy -= GRAVITY * dt;
    tiger.y += c.vy * dt;
    if (c.vy < 0 && tiger.y <= crossingHeight()) {
      if (world.theme.crossing === 'swim') burst(tiger.x, tiger.y + 0.6, tiger.z, world.blockColor(world.theme.liquid), 40);
      c.phase = c.boat ? 'sail' : 'out';
      c.time = 0;
      tiger.grounded = true;
    }
  } else if (c.phase === 'out') {
    moveAlongCrossing(CROSSING_SEA_SPEED, dt);
    easeHeight(crossingHeight(), dt);
    thickenFog(c.time / CROSSING_OUT_SECONDS);
    setMist((c.time - (CROSSING_OUT_SECONDS - MIST_SECONDS)) / MIST_SECONDS);
    if (c.time >= CROSSING_OUT_SECONDS) crossIntoNextWorld();
  } else if (c.phase === 'sail') {
    moveAlongCrossing(CROSSING_SEA_SPEED, dt);
    easeHeight(crossingHeight(), dt);
    // The hop may come down a little short of the boat, which then slides under the tiger.
    const catchUp = Math.min(1, dt * 6);
    c.boat.x += (tiger.x - c.boat.x) * catchUp;
    c.boat.z += (tiger.z - c.boat.z) * catchUp;
    c.boat.y = tiger.y - BOAT_DECK_HEIGHT;
    if (c.time >= BOAT_SAIL_SECONDS) {
      c.phase = 'whale';
      c.time = 0;
      // Under the boat, with its head just past it.
      c.whale = { x: tiger.x - c.dirX * 1.5, z: tiger.z - c.dirZ * 1.5, y: 0 };
      playSound('warn');
    }
  } else if (c.phase === 'whale') {
    const surface = (WATER_LEVEL + 1) * VOXEL;
    const halfHeight = LAVA_WHALE_HALF_HEIGHT * LAVA_WHALE_SCALE;
    const rise = clamp(c.time / LAVA_WHALE_RISE_SECONDS, 0, 1);
    const eased = rise * rise * (3 - 2 * rise);
    c.whale.y = surface - 0.5 - halfHeight + eased * (halfHeight + 0.7);
    c.boat.y = Math.max(surface + Math.sin(game.time * 2) * 0.05, c.whale.y + halfHeight);
    tiger.y = c.boat.y + BOAT_DECK_HEIGHT;
    if (Math.random() < dt * 30) burst(c.whale.x + (Math.random() - 0.5) * 6, surface, c.whale.z + (Math.random() - 0.5) * 6, world.blockColor(world.theme.liquid), 3);
    if (c.time >= LAVA_WHALE_RISE_SECONDS) {
      c.phase = 'spout';
      c.time = 0;
      tiger.grounded = false;
      playSound('spout');
    }
  } else if (c.phase === 'spout') {
    tiger.y += SPOUT_SPEED * dt;
    thickenFog(c.time / SPOUT_SECONDS);
    setMist((c.time - (SPOUT_SECONDS - MIST_SECONDS)) / MIST_SECONDS);
    if (c.time >= SPOUT_SECONDS) crossIntoNextWorld();
  } else if (c.phase === 'in') {
    moveAlongCrossing(CROSSING_SEA_SPEED, dt);
    easeHeight(crossingHeight(), dt);
    const progress = clamp(c.time / FOG_CLEAR_SECONDS, 0, 1);
    renderer.setFogDensity(THICK_FOG_DENSITY + (worldFogDensity() - THICK_FOG_DENSITY) * progress);
    setMist(1 - c.time / MIST_SECONDS);
    if (!world.isLiquid(tiger.x + c.dirX, tiger.z + c.dirZ)) {
      c.phase = 'land';
      c.time = 0;
      tiger.wingsOut = false;
      renderer.setFogDensity(worldFogDensity());
      setMist(0);
    }
  } else if (c.phase === 'land') {
    moveAlongCrossing(CROSSING_RUN_SPEED, dt);
    easeHeight(world.terrainTop(tiger.x, tiger.z), dt);
    const canStopHere = !isBlocked(tiger.x, tiger.y, tiger.z);
    if ((c.time >= CROSSING_LAND_SECONDS && canStopHere) || c.time >= CROSSING_GIVE_UP_SECONDS) finishCrossing();
  }
}
