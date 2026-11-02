// The surf level plays differently from every other: the tiger rides forward on its own in three
// lanes, dodging rocks, buoys and dolphins until it has gone far enough. Then a whale's shadow
// hunts it. The whale cannot be hit: staying in the shadow for too long gets a blast of water, and
// the tiger only has to keep out of it until the whale gives up.
//
// The sea cannot go on forever, so the tiger's position loops over a stretch of sea whose waves
// repeat exactly, while everything else is placed by how far the tiger has really come.

const SURF_LANES = [-3, 0, 3];
const SURF_LANE_SPEED = 16;
const SURF_START_SPEED = 12;
const SURF_TOP_SPEED = 16;
const SURF_GOAL_METRES = 800;
const SURF_LOOP_METRES = 60; // a whole number of wave periods, or the waves would jump
const SURF_SEA_Y = (WATER_LEVEL + 1) * VOXEL;
const SURF_DRAW_METRES = 90;
const SURF_FIRST_OBSTACLE_METRES = 45;
const SURF_DOLPHIN_RUSH = 5; // it swims towards the tiger on top of the tiger's own speed
const SURF_DOLPHIN_LEAP_HEIGHT = 2.4;
const SURF_DOLPHIN_REACH = 1.5;
const SURF_DODGE_WIDTH = 1.3;
const SURF_BUOY_HEIGHT = 0.9;
const SURF_ROCK_HEIGHT = 3;
const SURF_RAMP_SPEED = 11;
const WHALE_ESCAPE_SECONDS = 25;
const WHALE_SHADOW_RADIUS = 2.8;
const WHALE_SHADOW_SPEED = 1.9;
const WHALE_BLAST_AFTER_SECONDS = 3;
const WHALE_BLAST_SECONDS = 2.2;
const WHALE_SCALE = 3.2;

let surf = null;

function buildSurfCourse() {
  const random = seededRandom(20261101 + world.level * 7919 + 5);
  const obstacles = [];
  for (let d = SURF_FIRST_OBSTACLE_METRES; d < SURF_GOAL_METRES - 15; d += 15 + random() * 11) {
    // Always leaves at least one lane open.
    const blocked = random() < 0.35 ? 2 : 1;
    const open = Math.floor(random() * SURF_LANES.length);
    for (let i = 1; i <= blocked; i++) {
      const roll = random();
      obstacles.push({
        kind: roll < 0.45 ? 'seaRock' : roll < 0.85 ? 'buoy' : 'ramp',
        lane: (open + i) % SURF_LANES.length, d, used: false,
      });
    }
  }
  return obstacles;
}

function startSurf(cameFromCrossing) {
  surf = {
    phase: 'ride', distance: 0, lane: 1, height: 0, vy: 0,
    obstacles: buildSurfCourse(), dolphins: [], nextDolphin: SURF_FIRST_OBSTACLE_METRES + 30,
    mistFade: cameFromCrossing ? 1 : 0,
    whale: null,
  };
  placeSurfTiger();
  updateSurfHud();
  showMessage('Sörf tahtanı aldın! A/D: şerit değiştir, Boşluk: zıpla, F: yunusa vur!', 5);
}

function placeSurfTiger() {
  tiger.x = SURF_LANES[surf.lane];
  tiger.y = SURF_SEA_Y;
  tiger.z = 0;
  tiger.vy = 0;
  tiger.yaw = 0;
  tiger.grounded = true;
  tiger.wingsOut = false;
}

function updateSurfHud() {
  hud.bossBar.classList.remove('hidden');
  if (surf.phase === 'ride') {
    hud.bossName.textContent = `Mesafe: ${Math.floor(surf.distance)} / ${SURF_GOAL_METRES} m`;
    hud.bossFill.style.width = `${(surf.distance / SURF_GOAL_METRES) * 100}%`;
  } else {
    hud.bossName.textContent = `Balinadan kaç: ${Math.ceil(surf.whale.timeLeft)} sn`;
    hud.bossFill.style.width = `${(surf.whale.timeLeft / WHALE_ESCAPE_SECONDS) * 100}%`;
  }
}

function startWhale() {
  surf.phase = 'whale';
  surf.obstacles = [];
  surf.dolphins = [];
  surf.whale = { timeLeft: WHALE_ESCAPE_SECONDS, shadowX: tiger.x + 6, inShadow: 0, blast: 0 };
  showMessage('Altından dev bir gölge geliyor! Gölgede kalma!', 4);
}

function finishSurf() {
  surf = null;
  hud.bossBar.classList.add('hidden');
  completeLevel();
}

// Losing all the lives starts the current stretch over, as it does with any boss.
function hurtSurfer(message) {
  if (tiger.invulnerable > 0) return;
  tiger.invulnerable = 2;
  game.hearts--;
  if (game.hearts > 0) {
    showMessage(message, 2);
  } else {
    game.hearts = MAX_HEARTS;
    if (surf.phase === 'ride') {
      surf.distance = 0;
      surf.obstacles.forEach((obstacle) => { obstacle.used = false; });
      surf.dolphins = [];
      surf.nextDolphin = SURF_FIRST_OBSTACLE_METRES + 30;
      showMessage('Düştün! Baştan başlıyoruz.', 3);
    } else {
      surf.whale.timeLeft = WHALE_ESCAPE_SECONDS;
      surf.whale.inShadow = 0;
      showMessage('Düştün! Balina da baştan başlıyor.', 3);
    }
  }
  updateHud();
}

function updateSurfDolphins(dt, speed) {
  if (surf.distance > surf.nextDolphin && surf.distance < SURF_GOAL_METRES - 50) {
    surf.nextDolphin = surf.distance + 45 + Math.random() * 35;
    // Leaps at the lane the tiger is in now, so standing still is no answer.
    surf.dolphins.push({ lane: surf.lane, ahead: 55, age: 0, gone: false });
  }
  for (const dolphin of surf.dolphins) {
    dolphin.ahead -= (speed + SURF_DOLPHIN_RUSH) * dt;
    dolphin.age += dt;
    if (dolphin.gone) continue;
    const x = SURF_LANES[dolphin.lane];
    const dolphinHeight = surfDolphinHeight(dolphin);
    const isAlongside = Math.abs(dolphin.ahead) < SURF_DOLPHIN_REACH && Math.abs(tiger.x - x) < SURF_DODGE_WIDTH;
    if (tiger.attackTime > 0 && Math.abs(dolphin.ahead) < ATTACK_RADIUS && Math.abs(tiger.x - x) < ATTACK_RADIUS) {
      dolphin.gone = true;
      burst(x, SURF_SEA_Y + dolphinHeight, tiger.z + dolphin.ahead, [0.45, 0.62, 0.78], 30);
    } else if (isAlongside && surf.height < dolphinHeight + 1.2) {
      dolphin.gone = true;
      hurtSurfer('Ah! Yunus seni düşürüyordu!');
    }
  }
  surf.dolphins = surf.dolphins.filter((dolphin) => dolphin.ahead > -10);
}

function surfDolphinHeight(dolphin) {
  return Math.max(0, Math.sin(dolphin.ahead * 0.35)) * SURF_DOLPHIN_LEAP_HEIGHT;
}

function updateSurfObstacles() {
  for (const obstacle of surf.obstacles) {
    if (obstacle.used) continue;
    const ahead = obstacle.d - surf.distance;
    if (Math.abs(ahead) > 1.1 || Math.abs(tiger.x - SURF_LANES[obstacle.lane]) > SURF_DODGE_WIDTH) continue;
    if (obstacle.kind === 'ramp') {
      if (surf.height < 0.5) {
        obstacle.used = true;
        surf.vy = SURF_RAMP_SPEED;
      }
    } else if (surf.height < (obstacle.kind === 'buoy' ? SURF_BUOY_HEIGHT : SURF_ROCK_HEIGHT)) {
      obstacle.used = true;
      burst(tiger.x, tiger.y + 0.6, tiger.z + ahead, [0.72, 0.9, 0.98], 25);
      hurtSurfer(obstacle.kind === 'buoy' ? 'Ah! Şamandıranın üstünden zıpla!' : 'Ah! Kayaya çarptın, şerit değiştir!');
    }
  }
}

function updateWhale(dt) {
  const { whale } = surf;
  whale.timeLeft -= dt;
  if (whale.timeLeft <= 0) {
    showMessage('Balinayı atlattın!', 3);
    finishSurf();
    return;
  }
  if (whale.blast > 0) {
    whale.blast -= dt;
    return;
  }
  const toTiger = tiger.x - whale.shadowX;
  const shadowSpeed = WHALE_SHADOW_SPEED * game.speedFactor;
  whale.shadowX += Math.sign(toTiger) * Math.min(Math.abs(toTiger), shadowSpeed * dt);
  if (Math.abs(tiger.x - whale.shadowX) < WHALE_SHADOW_RADIUS) {
    whale.inShadow += dt;
    if (whale.inShadow >= WHALE_BLAST_AFTER_SECONDS) {
      whale.inShadow = 0;
      whale.blast = WHALE_BLAST_SECONDS;
      whale.blastX = whale.shadowX;
      hurtSurfer('Balina su püskürttü! Gölgede kalma!');
    }
  } else {
    whale.inShadow = 0;
  }
}

function updateSurf(dt) {
  if (surf.mistFade > 0) {
    surf.mistFade -= dt * 2;
    hud.mist.style.opacity = Math.max(0, surf.mistFade);
  }

  if (surfLaneQueue !== 0) {
    surf.lane = clamp(surf.lane + surfLaneQueue, 0, SURF_LANES.length - 1);
    surfLaneQueue = 0;
  }
  const toLane = SURF_LANES[surf.lane] - tiger.x;
  tiger.x += Math.sign(toLane) * Math.min(Math.abs(toLane), SURF_LANE_SPEED * dt);

  if (jumpQueued && surf.height === 0) surf.vy = JUMP_SPEED;
  jumpQueued = false;
  surf.vy -= GRAVITY * dt;
  surf.height = Math.max(0, surf.height + surf.vy * dt);
  if (surf.height === 0) surf.vy = 0;
  tiger.grounded = surf.height === 0;
  tiger.y = SURF_SEA_Y + surf.height;

  tiger.attackTime = Math.max(0, tiger.attackTime - dt);
  tiger.attackCooldown = Math.max(0, tiger.attackCooldown - dt);
  if (attackQueued && tiger.attackCooldown <= 0) {
    tiger.attackTime = ATTACK_DURATION;
    tiger.attackCooldown = ATTACK_COOLDOWN;
  }
  attackQueued = false;
  tiger.invulnerable = Math.max(0, tiger.invulnerable - dt);

  const progress = surf.distance / SURF_GOAL_METRES;
  const speed = (SURF_START_SPEED + (SURF_TOP_SPEED - SURF_START_SPEED) * progress) * game.speedFactor;
  surf.distance += speed * dt;
  tiger.z = (surf.distance % SURF_LOOP_METRES) - SURF_LOOP_METRES / 2;
  camera.yaw = Math.PI;
  camera.pitch = 0.32;
  camera.distance = 8;

  const skipping = bossCheatQueued;
  bossCheatQueued = false;
  cheatQueued = false;
  if (surf.phase === 'ride') {
    updateSurfObstacles();
    updateSurfDolphins(dt, speed);
    if (surf.distance >= SURF_GOAL_METRES || skipping) startWhale();
  } else if (skipping) {
    finishSurf();
    return;
  } else {
    updateWhale(dt);
  }
  if (surf) updateSurfHud();
}

function drawSurf(count) {
  if (!surf) return count;
  const addSphere = (x, y, z, radius, color) => {
    const at = count * FLOATS_PER_SPHERE;
    if (at + FLOATS_PER_SPHERE > frameSpheres.length) return;
    frameSpheres.set([x, y, z, radius, color[0], color[1], color[2]], at);
    count++;
  };
  count = drawModel(frameSpheres, count, models.surfboard, tiger.x, tiger.y - 0.05, tiger.z, 0);
  for (const obstacle of surf.obstacles) {
    const ahead = obstacle.d - surf.distance;
    if (obstacle.used && obstacle.kind !== 'ramp') continue;
    if (ahead < -8 || ahead > SURF_DRAW_METRES) continue;
    count = drawModel(frameSpheres, count, models[obstacle.kind], SURF_LANES[obstacle.lane], SURF_SEA_Y, tiger.z + ahead, 0, {}, 1.4);
  }
  for (const dolphin of surf.dolphins) {
    if (dolphin.gone) continue;
    const height = surfDolphinHeight(dolphin);
    count = drawModel(frameSpheres, count, models.dolphin, SURF_LANES[dolphin.lane], SURF_SEA_Y + height + 0.1, tiger.z + dolphin.ahead, Math.PI, {}, 1.3);
  }
  if (surf.whale) {
    const { whale } = surf;
    const danger = whale.inShadow / WHALE_BLAST_AFTER_SECONDS;
    const shade = [0.04, 0.1 - danger * 0.08, 0.26 - danger * 0.2];
    for (let ring = 0; ring < 6; ring++) {
      const r = (ring / 5) * WHALE_SHADOW_RADIUS;
      const around = Math.max(1, ring * 9);
      for (let i = 0; i < around; i++) {
        const a = (i / around) * Math.PI * 2;
        addSphere(whale.shadowX + Math.cos(a) * r, SURF_SEA_Y + 0.04, tiger.z + Math.sin(a) * r * 1.8, 0.34, shade);
      }
    }
    if (whale.blast > 0) {
      const t = 1 - whale.blast / WHALE_BLAST_SECONDS;
      const rise = Math.sin(t * Math.PI);
      count = drawModel(frameSpheres, count, models.whale, whale.blastX, SURF_SEA_Y - 3 + rise * 3.6, tiger.z - 1, Math.PI, {}, WHALE_SCALE);
      for (let i = 0; i < 40; i++) {
        const lift = ((game.time * 7 + i * 0.37) % 7) * rise;
        const a = i * 2.4;
        addSphere(whale.blastX + Math.cos(a) * lift * 0.18, SURF_SEA_Y + 2 + lift, tiger.z - 1 + Math.sin(a) * lift * 0.18, 0.2, [0.75, 0.92, 1.05]);
      }
    }
  }
  return count;
}
