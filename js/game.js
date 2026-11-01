const GRAVITY = 20;
const JUMP_SPEED = 8;
const WALK_SPEED = 7.5;
const STEP_HEIGHT = 0.6; // anything taller has to be jumped onto
const TIGER_RADIUS = 0.4;
const TIGER_HEIGHT = 1.9;
const CAGE_BLOCK_RADIUS = 2.4;
const CAGE_OPEN_RADIUS = 3.6;
const KEY_PICKUP_RADIUS = 1.8;
const CROCODILE_SCALE = 0.8;
const MAX_HEARTS = 3;
const BIRD_HIT_RADIUS = 1.2;
const BIRD_RESPAWN_TIME = 30;
const DRAW_DISTANCE = 120; // moving things farther than this are lost in the fog
const ATTACK_DURATION = 0.35;
const ATTACK_COOLDOWN = 0.5; // counted from the start of the attack
const ATTACK_RADIUS = 3;

const canvas = document.getElementById('game');
const frameSpheres = new Float32Array(80000 * FLOATS_PER_SPHERE);
const renderer = createRenderer(canvas, frameSpheres);
const models = {
  tiger: tigerModel(),
  crocodile: crocodileModel(),
  bird: birdModel(),
  key: keyModel(),
  cage: cageModel(),
};

const hud = {
  level: document.getElementById('level'),
  hearts: document.getElementById('hearts'),
  keys: document.getElementById('keys'),
  rescued: document.getElementById('rescued'),
  message: document.getElementById('message'),
  stats: document.getElementById('stats'),
  start: document.getElementById('start'),
  win: document.getElementById('win'),
  loading: document.getElementById('loading'),
  map: document.getElementById('map').getContext('2d'),
};

const SPAWN = { x: 0, z: 0 };
const tiger = {
  x: SPAWN.x, y: 0, z: SPAWN.z,
  vy: 0, yaw: 0, stride: 0, grounded: true, airTime: 0, invulnerable: 0, attackTime: 0, attackCooldown: 0,
};
const camera = { yaw: Math.PI, pitch: 0.42, distance: 8 };
const game = {
  playing: false,
  levelDone: false,
  level: 1,
  hearts: MAX_HEARTS,
  keysHeld: 0,
  rescued: 0,
  messageTime: 0,
  noKeyHintTime: 0,
  time: 0,
  birdSpeed: 0,
  birdSeeRadius: 0,
  birdRestTime: 0,
};
let world;
let keys = [];
let cages = [];
let birds = [];
let mapBackground;
const followers = [];
const particles = [];

function loadLevel(level) {
  world = generateWorld(level);
  renderer.loadWorld(world);

  keys = world.keys.map((k) => ({ ...k, taken: false }));
  cages = world.cages.map((c) => ({ ...c, open: false }));
  birds = [...cages, ...keys].map((home, i) => {
    const altitude = home.y + 5;
    return {
      homeX: home.x, homeZ: home.z, altitude,
      x: home.x, y: altitude, z: home.z, yaw: 0,
      phase: i * 1.7, state: 'patrol', cooldown: 2 + i * 0.5, timer: 0,
    };
  });
  followers.length = 0;
  particles.length = 0;

  // Birds stay just slower than the tiger, so running away always remains possible.
  game.birdSpeed = Math.min(5 + (level - 1) * 0.35, 7.2);
  game.birdSeeRadius = Math.min(16 + (level - 1) * 1.5, 28);
  game.birdRestTime = Math.max(4 - (level - 1) * 0.3, 1.5);
  game.level = level;
  game.levelDone = false;
  game.hearts = MAX_HEARTS;
  game.keysHeld = 0;
  game.rescued = 0;

  tiger.x = SPAWN.x;
  tiger.z = SPAWN.z;
  tiger.y = world.terrainTop(SPAWN.x, SPAWN.z);
  tiger.vy = 0;
  tiger.yaw = 0;
  tiger.invulnerable = 0;
  camera.yaw = Math.PI;

  mapBackground = buildMapBackground();
  updateHud();
  showMessage(`${level}. Bölüm: ${world.theme.name}`, 3);
}

function showMessage(text, seconds = 2.5) {
  hud.message.textContent = text;
  hud.message.classList.add('visible');
  game.messageTime = seconds;
}

function updateHud() {
  hud.level.textContent = `🌍 ${game.level}. Bölüm`;
  hud.hearts.textContent = '❤️'.repeat(game.hearts) + '🖤'.repeat(MAX_HEARTS - game.hearts);
  hud.keys.textContent = `🔑 ${game.keysHeld}`;
  hud.rescued.textContent = `🐊 ${game.rescued} / ${cages.length}`;
}

function burst(x, y, z, color, amount) {
  for (let i = 0; i < amount; i++) {
    particles.push({
      x, y, z,
      vx: (Math.random() - 0.5) * 7, vy: Math.random() * 6 + 1, vz: (Math.random() - 0.5) * 7,
      life: 0.6 + Math.random() * 0.5, radius: 0.08 + Math.random() * 0.1, color,
    });
  }
}

// --- Input ---

const held = new Set();
let jumpQueued = false;
let attackQueued = false;
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (!e.repeat) jumpQueued = true;
    e.preventDefault();
  }
  if (e.code === 'KeyF' && !e.repeat) attackQueued = true;
  if (e.code.startsWith('Arrow')) e.preventDefault();
  held.add(e.code);
});
window.addEventListener('keyup', (e) => held.delete(e.code));
window.addEventListener('blur', () => held.clear());

let dragging = false;
let dragDistance = 0;
canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  dragDistance = 0;
  canvas.setPointerCapture(e.pointerId);
});
// A press that barely moved is a click, which attacks; a longer one only turned the camera.
canvas.addEventListener('pointerup', () => {
  dragging = false;
  if (dragDistance < 6) attackQueued = true;
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  dragDistance += Math.abs(e.movementX) + Math.abs(e.movementY);
  camera.yaw -= e.movementX * 0.006;
  camera.pitch = clamp(camera.pitch + e.movementY * 0.005, 0.08, 1.25);
});
canvas.addEventListener('wheel', (e) => {
  camera.distance = clamp(camera.distance + e.deltaY * 0.008, 4, 14);
  e.preventDefault();
}, { passive: false });

document.getElementById('start-button').addEventListener('click', () => {
  hud.start.classList.add('hidden');
  game.playing = true;
});
document.getElementById('next-button').addEventListener('click', () => {
  hud.win.classList.add('hidden');
  hud.loading.classList.remove('hidden');
  // Generating blocks the page, so give the browser a moment to show the loading panel first.
  setTimeout(() => {
    loadLevel(game.level + 1);
    hud.loading.classList.add('hidden');
  }, 50);
});

// --- Tiger ---

const FOOT_OFFSETS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];

function isBlocked(x, y, z) {
  if (world.isLiquid(x, z)) return true;
  for (const cage of cages) {
    if (!cage.open && Math.hypot(x - cage.x, z - cage.z) < CAGE_BLOCK_RADIUS) return true;
  }
  for (const [ox, oz] of FOOT_OFFSETS) {
    const sx = x + ox * TIGER_RADIUS, sz = z + oz * TIGER_RADIUS;
    for (let height = STEP_HEIGHT; height < TIGER_HEIGHT; height += VOXEL) {
      if (world.isSolid(sx, y + height, sz)) return true;
    }
  }
  return false;
}

// The highest ground the tiger could stand on from its current height.
function floorBelow(x, y, z) {
  let floor = -Infinity;
  for (const [ox, oz] of FOOT_OFFSETS) {
    const sx = x + ox * TIGER_RADIUS, sz = z + oz * TIGER_RADIUS;
    for (let height = y + STEP_HEIGHT; height > y - 40 && height > 0; height -= VOXEL) {
      if (world.isSolid(sx, height, sz)) {
        floor = Math.max(floor, (Math.floor(height / VOXEL) + 1) * VOXEL);
        break;
      }
    }
  }
  return floor;
}

function updateTiger(dt) {
  let right = 0, forward = 0;
  if (held.has('KeyW') || held.has('ArrowUp')) forward += 1;
  if (held.has('KeyS') || held.has('ArrowDown')) forward -= 1;
  if (held.has('KeyD') || held.has('ArrowRight')) right += 1;
  if (held.has('KeyA') || held.has('ArrowLeft')) right -= 1;
  if (held.has('KeyQ')) camera.yaw += dt * 1.8;
  if (held.has('KeyE')) camera.yaw -= dt * 1.8;

  const moving = right !== 0 || forward !== 0;
  if (moving) {
    const sin = Math.sin(camera.yaw), cos = Math.cos(camera.yaw);
    const dirX = -sin * forward + cos * right;
    const dirZ = -cos * forward - sin * right;
    const length = Math.hypot(dirX, dirZ);
    const stepX = (dirX / length) * WALK_SPEED * dt;
    const stepZ = (dirZ / length) * WALK_SPEED * dt;
    if (!isBlocked(tiger.x + stepX, tiger.y, tiger.z)) tiger.x += stepX;
    if (!isBlocked(tiger.x, tiger.y, tiger.z + stepZ)) tiger.z += stepZ;

    const targetYaw = Math.atan2(dirX, dirZ);
    let turn = targetYaw - tiger.yaw;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    tiger.yaw += turn * Math.min(1, dt * 12);
    tiger.stride += dt * 12;
  }

  tiger.airTime = tiger.grounded ? 0 : tiger.airTime + dt;
  if (jumpQueued && tiger.airTime < 0.12) {
    tiger.vy = JUMP_SPEED;
    tiger.grounded = false;
    tiger.airTime = 1;
  }
  jumpQueued = false;

  tiger.attackTime = Math.max(0, tiger.attackTime - dt);
  tiger.attackCooldown = Math.max(0, tiger.attackCooldown - dt);
  if (attackQueued && tiger.attackCooldown <= 0) {
    tiger.attackTime = ATTACK_DURATION;
    tiger.attackCooldown = ATTACK_COOLDOWN;
  }
  attackQueued = false;

  const wasGrounded = tiger.grounded;
  tiger.vy -= GRAVITY * dt;
  tiger.y += tiger.vy * dt;
  tiger.grounded = false;
  if (tiger.vy <= 0) {
    const floor = floorBelow(tiger.x, tiger.y, tiger.z);
    // Walking downhill stays glued to the ground instead of hopping from step to step.
    if (tiger.y <= floor || (wasGrounded && tiger.y - floor < 0.35)) {
      tiger.y = floor;
      tiger.vy = 0;
      tiger.grounded = true;
    }
  } else if (world.isSolid(tiger.x, tiger.y + TIGER_HEIGHT, tiger.z)) {
    tiger.vy = 0;
  }

  tiger.invulnerable = Math.max(0, tiger.invulnerable - dt);
  return moving;
}

function hurtTiger(fromX, fromZ) {
  game.hearts--;
  tiger.invulnerable = 2;
  tiger.vy = 6;
  tiger.grounded = false;
  const away = Math.atan2(tiger.x - fromX, tiger.z - fromZ);
  const pushX = Math.sin(away) * 1.5, pushZ = Math.cos(away) * 1.5;
  if (!isBlocked(tiger.x + pushX, tiger.y, tiger.z + pushZ)) {
    tiger.x += pushX;
    tiger.z += pushZ;
  }
  if (game.hearts <= 0) {
    showMessage('Kuşlar seni yakaladı! Başlangıca dönüyoruz.', 3);
    game.hearts = MAX_HEARTS;
    tiger.x = SPAWN.x;
    tiger.z = SPAWN.z;
    tiger.y = world.terrainTop(SPAWN.x, SPAWN.z) + 0.5;
    tiger.vy = 0;
    for (const f of followers) {
      f.x = tiger.x;
      f.z = tiger.z;
    }
  } else {
    showMessage('Ah! Kuş yaklaşınca F tuşuyla ya da tıklayarak vur!');
  }
  updateHud();
}

// --- Birds ---

function defeatBird(bird) {
  burst(bird.x, bird.y, bird.z, [0.46, 0.15, 0.55], 40);
  bird.state = 'gone';
  bird.timer = BIRD_RESPAWN_TIME;
  showMessage('Süper! Kuşu yendin!', 1.5);
}

function updateBird(bird, dt) {
  bird.phase += dt;
  bird.cooldown -= dt;
  const toTigerX = tiger.x - bird.x, toTigerY = tiger.y + 0.9 - bird.y, toTigerZ = tiger.z - bird.z;
  const distance = Math.hypot(toTigerX, toTigerY, toTigerZ);

  if (bird.state === 'gone') {
    bird.timer -= dt;
    if (bird.timer <= 0) {
      bird.state = 'patrol';
      bird.cooldown = 3;
      bird.x = bird.homeX;
      bird.y = bird.altitude;
      bird.z = bird.homeZ;
    }
    return;
  }

  let moveX, moveY, moveZ, speed;
  if (bird.state === 'swoop') {
    bird.timer -= dt;
    moveX = toTigerX; moveY = toTigerY; moveZ = toTigerZ;
    speed = game.birdSpeed;
    if (bird.timer <= 0) {
      bird.state = 'patrol';
      bird.cooldown = game.birdRestTime;
    }
  } else {
    const a = bird.phase * 0.35;
    moveX = bird.homeX + Math.cos(a) * 7 - bird.x;
    moveY = bird.altitude + Math.sin(bird.phase * 1.3) * 0.6 - bird.y;
    moveZ = bird.homeZ + Math.sin(a) * 7 - bird.z;
    speed = 5;
    if (game.playing && bird.cooldown <= 0 && Math.hypot(toTigerX, toTigerZ) < game.birdSeeRadius) {
      bird.state = 'swoop';
      bird.timer = 3.5;
    }
  }
  const length = Math.hypot(moveX, moveY, moveZ) || 1;
  const step = Math.min(length, speed * dt);
  bird.x += (moveX / length) * step;
  bird.y += (moveY / length) * step;
  bird.z += (moveZ / length) * step;
  if (Math.hypot(moveX, moveZ) > 0.05) {
    let turn = Math.atan2(moveX, moveZ) - bird.yaw;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    bird.yaw += turn * Math.min(1, dt * 6);
  }

  if (tiger.attackTime > 0 && distance < ATTACK_RADIUS) {
    defeatBird(bird);
  } else if (distance < BIRD_HIT_RADIUS + 0.4) {
    const landingOnIt = tiger.vy < -1 && tiger.y + 0.3 > bird.y - 0.2;
    if (landingOnIt) {
      defeatBird(bird);
      tiger.vy = JUMP_SPEED * 0.9;
    } else if (tiger.invulnerable <= 0 && distance < BIRD_HIT_RADIUS && !game.levelDone) {
      hurtTiger(bird.x, bird.z);
      bird.state = 'patrol';
      bird.cooldown = game.birdRestTime;
    }
  }
}

// --- Keys, cages, rescued crocodiles ---

function updateObjectives(dt) {
  game.noKeyHintTime -= dt;
  for (const key of keys) {
    if (key.taken) continue;
    if (Math.hypot(tiger.x - key.x, tiger.y + 0.8 - key.y, tiger.z - key.z) < KEY_PICKUP_RADIUS) {
      key.taken = true;
      game.keysHeld++;
      burst(key.x, key.y, key.z, [1, 0.8, 0.12], 25);
      showMessage('Anahtarı buldun! Şimdi bir kafese git.');
      updateHud();
    }
  }
  for (const cage of cages) {
    if (cage.open || Math.hypot(tiger.x - cage.x, tiger.z - cage.z) > CAGE_OPEN_RADIUS) continue;
    if (game.keysHeld > 0) {
      game.keysHeld--;
      game.rescued++;
      cage.open = true;
      burst(cage.x, cage.y + 1.5, cage.z, [0.32, 0.33, 0.38], 60);
      burst(cage.x, cage.y + 1.5, cage.z, [0.28, 0.58, 0.24], 30);
      followers.push({ x: cage.x, z: cage.z, yaw: 0, stride: 0 });
      updateHud();
      if (game.rescued === cages.length) {
        game.levelDone = true;
        hud.win.classList.remove('hidden');
      } else {
        showMessage('Timsahı kurtardın! Artık seninle geliyor.');
      }
    } else if (game.noKeyHintTime <= 0) {
      showMessage('Bu kafes kilitli. Önce bir anahtar bul!');
      game.noKeyHintTime = 4;
    }
  }
}

function updateFollowers(dt) {
  let leader = tiger;
  for (const f of followers) {
    const dx = leader.x - f.x, dz = leader.z - f.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 3) {
      const step = Math.min(distance - 3, WALK_SPEED * 1.1 * dt);
      f.x += (dx / distance) * step;
      f.z += (dz / distance) * step;
      f.stride += dt * 10;
      f.yaw = Math.atan2(dx, dz);
    }
    leader = f;
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.vy -= GRAVITY * 0.6 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
  }
}

// --- Drawing ---

function buildFrameSpheres() {
  let count = 0;
  const swing = (t) => Math.sin(t) * 0.7;
  const isNear = ({ x, z }) => Math.hypot(x - tiger.x, z - tiger.z) < DRAW_DISTANCE;

  const blink = tiger.invulnerable > 0 && Math.floor(game.time * 10) % 2 === 0;
  const attackProgress = tiger.attackTime > 0 ? 1 - tiger.attackTime / ATTACK_DURATION : 0;
  if (!blink) {
    const stride = tiger.grounded ? swing(tiger.stride) : 0.6;
    count = drawModel(frameSpheres, count, models.tiger, tiger.x, tiger.y, tiger.z, tiger.yaw + attackProgress * Math.PI * 2, {
      stride,
      arms: tiger.attackTime > 0 ? 1.5 : stride * 0.7,
      tail: Math.sin(game.time * 3) * 0.2,
    });
  }
  if (tiger.attackTime > 0) {
    const ringRadius = ATTACK_RADIUS * (0.4 + 0.6 * attackProgress);
    for (let i = 0; i < 28; i++) {
      const at = count * FLOATS_PER_SPHERE;
      if (at + FLOATS_PER_SPHERE > frameSpheres.length) break;
      const a = (i / 28) * Math.PI * 2;
      frameSpheres.set([tiger.x + Math.cos(a) * ringRadius, tiger.y + 0.9, tiger.z + Math.sin(a) * ringRadius, 0.14, 1, 0.85, 0.3], at);
      count++;
    }
  }
  for (const bird of birds) {
    if (bird.state === 'gone' || !isNear(bird)) continue;
    count = drawModel(frameSpheres, count, models.bird, bird.x, bird.y, bird.z, bird.yaw, {
      wings: Math.sin(bird.phase * (bird.state === 'swoop' ? 22 : 11)) * 0.55,
    }, 1.2);
  }
  for (const key of keys) {
    if (key.taken || !isNear(key)) continue;
    const bob = Math.sin(game.time * 2.5) * 0.15;
    count = drawModel(frameSpheres, count, models.key, key.x, key.y + bob, key.z, game.time * 1.5, {}, 1.4);
  }
  for (const cage of cages) {
    if (cage.open || !isNear(cage)) continue;
    count = drawModel(frameSpheres, count, models.cage, cage.x, cage.y, cage.z, 0);
    count = drawModel(frameSpheres, count, models.crocodile, cage.x, cage.y, cage.z, game.time * 0.2, {
      tail: Math.sin(game.time * 2) * 0.15,
    }, CROCODILE_SCALE);
  }
  for (const f of followers) {
    count = drawModel(frameSpheres, count, models.crocodile, f.x, world.terrainTop(f.x, f.z), f.z, f.yaw, {
      stride: swing(f.stride),
      tail: Math.sin(game.time * 4) * 0.15,
    }, CROCODILE_SCALE);
  }
  for (const p of particles) {
    const at = count * FLOATS_PER_SPHERE;
    if (at + FLOATS_PER_SPHERE > frameSpheres.length) break;
    frameSpheres.set([p.x, p.y, p.z, p.radius, p.color[0], p.color[1], p.color[2]], at);
    count++;
  }
  return count;
}

function buildShadows() {
  const nearestBirds = birds
    .filter((bird) => bird.state !== 'gone')
    .sort((a, b) => Math.hypot(a.x - tiger.x, a.z - tiger.z) - Math.hypot(b.x - tiger.x, b.z - tiger.z))
    .slice(0, MAX_SHADOWS - 1);
  return [
    [tiger.x, tiger.y + 0.05, tiger.z, 1.0],
    ...nearestBirds.map((bird) => [bird.x, bird.y - 0.6, bird.z, 1.1]),
  ];
}

function cameraPosition() {
  const target = [tiger.x, tiger.y + 1.2, tiger.z];
  const dir = [
    Math.sin(camera.yaw) * Math.cos(camera.pitch),
    Math.sin(camera.pitch),
    Math.cos(camera.yaw) * Math.cos(camera.pitch),
  ];
  // Walk out from the tiger so that hills and trees never hide it.
  let distance = 0.5;
  while (distance < camera.distance) {
    const next = distance + 0.25;
    if (world.isSolid(target[0] + dir[0] * next, target[1] + dir[1] * next, target[2] + dir[2] * next)) break;
    distance = next;
  }
  distance = Math.max(0.5, distance - 0.3);
  return { eye: [target[0] + dir[0] * distance, target[1] + dir[1] * distance, target[2] + dir[2] * distance], target };
}

const MAP_SIZE = 180;
function buildMapBackground() {
  const toPixels = (block) => BLOCK_COLORS[block].map((c) => c * 255);
  const liquid = toPixels(world.theme.liquid), shore = toPixels(world.theme.shore), land = toPixels(world.theme.surface);
  const image = document.createElement('canvas');
  image.width = image.height = MAP_SIZE;
  const context = image.getContext('2d');
  const pixels = context.createImageData(MAP_SIZE, MAP_SIZE);
  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const vx = Math.floor((x / MAP_SIZE) * WORLD_SIZE), vz = Math.floor((z / MAP_SIZE) * WORLD_SIZE);
      const top = world.terrain[vx + vz * WORLD_SIZE];
      const color = top < WATER_LEVEL ? liquid : top <= WATER_LEVEL + 1 ? shore : land;
      const light = top < WATER_LEVEL ? 1 : 0.85 + (top - WATER_LEVEL) * 0.012;
      const at = (x + z * MAP_SIZE) * 4;
      pixels.data[at] = color[0] * light;
      pixels.data[at + 1] = color[1] * light;
      pixels.data[at + 2] = color[2] * light;
      pixels.data[at + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  return image;
}

function drawMap() {
  const map = hud.map;
  const toMap = (metres) => (metres / (WORLD_SIZE * VOXEL) + 0.5) * MAP_SIZE;
  const dot = (x, z, radius, color) => {
    map.fillStyle = color;
    map.beginPath();
    map.arc(toMap(x), toMap(z), radius, 0, Math.PI * 2);
    map.fill();
  };
  map.drawImage(mapBackground, 0, 0);
  for (const key of keys) if (!key.taken) dot(key.x, key.z, 4, '#ffd21f');
  for (const cage of cages) if (!cage.open) dot(cage.x, cage.z, 5, '#333842');
  for (const bird of birds) if (bird.state !== 'gone') dot(bird.x, bird.z, 2.5, '#8a2aa0');
  dot(tiger.x, tiger.z, 5, '#ff7a00');
  map.strokeStyle = '#ff7a00';
  map.lineWidth = 2;
  map.beginPath();
  map.moveTo(toMap(tiger.x), toMap(tiger.z));
  map.lineTo(toMap(tiger.x + Math.sin(tiger.yaw) * 6), toMap(tiger.z + Math.cos(tiger.yaw) * 6));
  map.stroke();
}

// --- Main loop ---

let lastTime = performance.now();
let statsTime = 0, statsFrames = 0;

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  statsTime += (now - lastTime) / 1000;
  statsFrames++;
  lastTime = now;
  game.time += dt;

  if (game.playing && !game.levelDone) {
    updateTiger(dt);
    updateObjectives(dt);
  } else {
    camera.yaw += dt * (game.playing ? 0.3 : 0.15);
  }
  for (const bird of birds) updateBird(bird, dt);
  updateFollowers(dt);
  updateParticles(dt);

  if (game.messageTime > 0) {
    game.messageTime -= dt;
    if (game.messageTime <= 0) hud.message.classList.remove('visible');
  }

  const { eye, target } = cameraPosition();
  const dynamicCount = buildFrameSpheres();
  const drawn = renderer.render(eye, target, buildShadows(), dynamicCount);
  drawMap();

  if (statsTime >= 0.5) {
    hud.stats.textContent = `${Math.round(statsFrames / statsTime)} FPS · ${Math.round(drawn / 1000)} bin küre`;
    statsTime = 0;
    statsFrames = 0;
  }
  requestAnimationFrame(frame);
}

loadLevel(1);
requestAnimationFrame(frame);
