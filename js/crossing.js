// The trip between two levels, played by itself: the tiger runs to the shore, crosses the liquid
// into thickening fog, and arrives at the next island. How it crosses depends on the liquid: it
// swims through water, slides on ice and flies over lava.
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
  crossing = { phase: 'run', time: 0, dirX, dirZ, nextWorld, vy: 0 };
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
  const liquid = world.theme.liquid;
  if (liquid === BLOCK.LAVA) return surface + 2.2 + Math.sin(game.time * 2.5) * 0.2;
  if (liquid === BLOCK.ICE) return surface;
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
  tiger.wingsOut = world.theme.liquid === BLOCK.LAVA;
}

function finishCrossing() {
  crossing = null;
  setMist(0);
  renderer.setFogDensity(BASE_FOG_DENSITY);
  tiger.y = Math.max(tiger.y, world.terrainTop(tiger.x, tiger.z)); // the easing can lag on a slope
  tiger.vy = 0;
  tiger.wingsOut = false;
  attackQueued = false;
  jumpQueued = false;
  cheatQueued = false;
  writeSave();
}

function updateCrossing(dt) {
  const c = crossing;
  c.time += dt;

  const heading = Math.atan2(c.dirX, c.dirZ);
  const tigerTurn = heading - tiger.yaw;
  tiger.yaw += Math.atan2(Math.sin(tigerTurn), Math.cos(tigerTurn)) * Math.min(1, dt * 8);
  const cameraTurn = heading + Math.PI - camera.yaw;
  camera.yaw += Math.atan2(Math.sin(cameraTurn), Math.cos(cameraTurn)) * Math.min(1, dt * 2.5);
  camera.pitch += (0.3 - camera.pitch) * Math.min(1, dt * 2.5);

  const isSliding = world.theme.liquid === BLOCK.ICE;
  if (c.phase !== 'leap' && !(isSliding && (c.phase === 'out' || c.phase === 'in'))) {
    tiger.stride += dt * (c.phase === 'run' || c.phase === 'land' ? 16 : 9);
  }

  if (c.phase === 'run') {
    moveAlongCrossing(CROSSING_RUN_SPEED, dt);
    easeHeight(world.terrainTop(tiger.x, tiger.z), dt);
    if (world.isLiquid(tiger.x + c.dirX, tiger.z + c.dirZ)) {
      c.phase = 'leap';
      c.vy = CROSSING_LEAP_SPEED;
      tiger.grounded = false;
      tiger.wingsOut = world.theme.liquid === BLOCK.LAVA;
    }
  } else if (c.phase === 'leap') {
    moveAlongCrossing(CROSSING_RUN_SPEED, dt);
    c.vy -= GRAVITY * dt;
    tiger.y += c.vy * dt;
    if (c.vy < 0 && tiger.y <= crossingHeight()) {
      if (world.theme.liquid === BLOCK.WATER) burst(tiger.x, tiger.y + 0.6, tiger.z, BLOCK_COLORS[BLOCK.WATER], 40);
      c.phase = 'out';
      c.time = 0;
      tiger.grounded = true;
    }
  } else if (c.phase === 'out') {
    moveAlongCrossing(CROSSING_SEA_SPEED, dt);
    easeHeight(crossingHeight(), dt);
    const progress = c.time / CROSSING_OUT_SECONDS;
    renderer.setFogDensity(BASE_FOG_DENSITY + (THICK_FOG_DENSITY - BASE_FOG_DENSITY) * progress * progress);
    setMist((c.time - (CROSSING_OUT_SECONDS - MIST_SECONDS)) / MIST_SECONDS);
    if (c.time >= CROSSING_OUT_SECONDS) {
      arriveAtNextWorld();
      c.phase = 'in';
      c.time = 0;
    }
  } else if (c.phase === 'in') {
    moveAlongCrossing(CROSSING_SEA_SPEED, dt);
    easeHeight(crossingHeight(), dt);
    const progress = clamp(c.time / FOG_CLEAR_SECONDS, 0, 1);
    renderer.setFogDensity(THICK_FOG_DENSITY + (BASE_FOG_DENSITY - THICK_FOG_DENSITY) * progress);
    setMist(1 - c.time / MIST_SECONDS);
    if (!world.isLiquid(tiger.x + c.dirX, tiger.z + c.dirZ)) {
      c.phase = 'land';
      c.time = 0;
      tiger.wingsOut = false;
      renderer.setFogDensity(BASE_FOG_DENSITY);
      setMist(0);
    }
  } else if (c.phase === 'land') {
    moveAlongCrossing(CROSSING_RUN_SPEED, dt);
    easeHeight(world.terrainTop(tiger.x, tiger.z), dt);
    const canStopHere = !isBlocked(tiger.x, tiger.y, tiger.z);
    if ((c.time >= CROSSING_LAND_SECONDS && canStopHere) || c.time >= CROSSING_GIVE_UP_SECONDS) finishCrossing();
  }
}
