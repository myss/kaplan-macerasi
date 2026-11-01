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
const MOUSE_SENSITIVITY = 0.003;
const WING_PICKUP_RADIUS = 1.8;
const SECONDS_PER_WING = 10;
const WING_LIFT = 32; // m/s², on top of cancelling gravity
const MAX_CLIMB_SPEED = 6;
const FLIGHT_START_SPEED = 2; // holding jump starts flying once the jump has slowed to this
const MAX_FLIGHT_HEIGHT = 45;
const SAVE_KEY = 'kaplan-macerasi-kayit';
const SAVE_INTERVAL = 2; // seconds
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
  wings: wingsModel(),
};

const hud = {
  level: document.getElementById('level'),
  hearts: document.getElementById('hearts'),
  keys: document.getElementById('keys'),
  rescued: document.getElementById('rescued'),
  flight: document.getElementById('flight'),
  message: document.getElementById('message'),
  paused: document.getElementById('paused'),
  stats: document.getElementById('stats'),
  start: document.getElementById('start'),
  win: document.getElementById('win'),
  loading: document.getElementById('loading'),
  mist: document.getElementById('mist'),
  map: document.getElementById('map').getContext('2d'),
};

const SPAWN = { x: 0, z: 0 };
const tiger = {
  x: SPAWN.x, y: 0, z: SPAWN.z,
  vy: 0, yaw: 0, stride: 0, grounded: true, airTime: 0, invulnerable: 0, attackTime: 0, attackCooldown: 0,
  flightSeconds: 0, wingsOut: false,
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
let wingPickups = [];
let mapBackground;
const followers = [];
const particles = [];

function loadLevel(level, generatedWorld = generateWorld(level)) {
  world = generatedWorld;
  renderer.loadWorld(world);

  keys = world.keys.map((k) => ({ ...k, taken: false }));
  cages = world.cages.map((c) => ({ ...c, open: false }));
  wingPickups = world.wings.map((w) => ({ ...w, taken: false }));
  birds =[...cages, ...keys].map((home, i) => {
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
  tiger.flightSeconds = 0;
  tiger.wingsOut = false;
  camera.yaw = Math.PI;

  mapBackground = buildMapBackground();
  updateHud();
  showMessage(`${level}. Bölüm: ${world.theme.name}`, 3);
}

// --- Saving ---

// A level is rebuilt from its number, so only what the player changed needs storing. Birds start
// over. A finished level saves as the start of the next one.
function writeSave() {
  if (!game.playing) return;
  const save = game.levelDone ? { level: game.level + 1 } : {
    level: game.level,
    hearts: game.hearts,
    keysHeld: game.keysHeld,
    takenKeys: keys.flatMap((key, i) => (key.taken ? [i] : [])),
    openCages: cages.flatMap((cage, i) => (cage.open ? [i] : [])),
    takenWings: wingPickups.flatMap((wing, i) => (wing.taken ? [i] : [])),
    flightSeconds: tiger.flightSeconds,
    tiger: { x: tiger.x, y: tiger.y, z: tiger.z, yaw: tiger.yaw },
    camera: { yaw: camera.yaw, pitch: camera.pitch, distance: camera.distance },
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Without storage the game still plays; it just starts over next time.
  }
}

function readSave() {
  try {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY));
    return Number.isInteger(save?.level) && save.level >= 1 ? save : null;
  } catch {
    return null;
  }
}

function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing was stored, then.
  }
}

function restoreSave(save) {
  if (!save.tiger) return;
  for (const i of save.takenKeys) if (keys[i]) keys[i].taken = true;
  for (const i of save.openCages) {
    if (!cages[i]) continue;
    cages[i].open = true;
    followers.push({ x: save.tiger.x, z: save.tiger.z, yaw: 0, stride: 0 });
  }
  // Saves from before wings existed have neither of these.
  for (const i of save.takenWings ?? []) if (wingPickups[i]) wingPickups[i].taken = true;
  tiger.flightSeconds = save.flightSeconds ?? 0;
  game.hearts = save.hearts;
  game.keysHeld = save.keysHeld;
  game.rescued = followers.length;
  Object.assign(camera, save.camera);
  // If the world came out differently since this save, the old spot may be inside something.
  if (!isBlocked(save.tiger.x, save.tiger.y, save.tiger.z)) Object.assign(tiger, save.tiger);
  updateHud();
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
  updateFlightHud();
}

function updateFlightHud() {
  const text = `🪶 ${Math.ceil(tiger.flightSeconds)} sn`;
  if (hud.flight.textContent !== text) hud.flight.textContent = text;
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
let cheatQueued = false;
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC' && !e.repeat && game.playing) cheatQueued = true;
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

const isMouseLocked = () => document.pointerLockElement === canvas;
const lockMouse = () => {
  canvas.requestPointerLock()?.catch((error) => console.warn('Fare kilidi alınamadı:', error.name, error.message));
};

// Until the lock has worked once, a refusal may mean this host never allows it, so the game runs
// with the cursor free and every click asks again. After that, a refusal is the browser's wait of
// about a second after Esc, and the game stays paused until a click gets the lock back.
let hasHeldMouseLock = false;
let mouseLockRefused = false;
document.addEventListener('pointerlockchange', () => {
  if (!isMouseLocked()) return;
  hasHeldMouseLock = true;
  mouseLockRefused = false;
});
document.addEventListener('pointerlockerror', () => {
  if (!hasHeldMouseLock) mouseLockRefused = true;
});
const mouseControlsGame = () => isMouseLocked() || mouseLockRefused;

canvas.addEventListener('mousedown', () => {
  if (mouseControlsGame()) attackQueued = true;
  if (!isMouseLocked() && game.playing && !game.levelDone) lockMouse();
});
document.addEventListener('mousemove', (e) => {
  if (!mouseControlsGame()) return;
  camera.yaw -= e.movementX * MOUSE_SENSITIVITY;
  camera.pitch = clamp(camera.pitch + e.movementY * MOUSE_SENSITIVITY, 0.08, 1.25);
});
canvas.addEventListener('wheel', (e) => {
  camera.distance = clamp(camera.distance + e.deltaY * 0.008, 4, 14);
  e.preventDefault();
}, { passive: false });

document.getElementById('start-button').addEventListener('click', () => {
  hud.start.classList.add('hidden');
  game.playing = true;
  lockMouse();
});
function startOver() {
  if (!confirm('Emin misin? Kayıtlı oyunun silinecek ve 1. bölümden başlayacaksın.')) return;
  game.playing = false; // or a save in the meantime would bring the old game back
  clearSave();
  hud.start.classList.add('hidden');
  hud.loading.classList.remove('hidden');
  lockMouse();
  setTimeout(() => {
    loadLevel(1);
    hud.loading.classList.add('hidden');
    game.playing = true;
  }, 50);
}
for (const button of document.querySelectorAll('.start-over')) button.addEventListener('click', startOver);
window.addEventListener('pagehide', writeSave);
document.getElementById('next-button').addEventListener('click', () => {
  hud.win.classList.add('hidden');
  hud.loading.classList.remove('hidden');
  lockMouse();
  // Generating blocks the page, so give the browser a moment to show the loading panel first.
  setTimeout(() => {
    startCrossing(generateWorld(game.level + 1));
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
  // Like a jetpack: lift only while jump is held, and only that time uses up the wings.
  if (!wasGrounded && held.has('Space') && tiger.flightSeconds > 0 && (tiger.wingsOut || tiger.vy <= FLIGHT_START_SPEED)) {
    tiger.wingsOut = true;
    tiger.flightSeconds = Math.max(0, tiger.flightSeconds - dt);
    tiger.vy = Math.min(tiger.vy + (GRAVITY + WING_LIFT) * dt, MAX_CLIMB_SPEED);
    updateFlightHud();
  }
  tiger.y += tiger.vy * dt;
  if (tiger.y > MAX_FLIGHT_HEIGHT) {
    tiger.y = MAX_FLIGHT_HEIGHT;
    tiger.vy = Math.min(tiger.vy, 0);
  }
  tiger.grounded = false;
  if (tiger.vy <= 0) {
    const floor = floorBelow(tiger.x, tiger.y, tiger.z);
    // Walking downhill stays glued to the ground instead of hopping from step to step.
    if (tiger.y <= floor || (wasGrounded && tiger.y - floor < 0.35)) {
      tiger.y = floor;
      tiger.vy = 0;
      tiger.grounded = true;
      tiger.wingsOut = false;
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
    if (game.playing && !game.levelDone && !crossing && bird.cooldown <= 0 && Math.hypot(toTigerX, toTigerZ) < game.birdSeeRadius) {
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
    } else if (tiger.invulnerable <= 0 && distance < BIRD_HIT_RADIUS && !game.levelDone && !crossing) {
      hurtTiger(bird.x, bird.z);
      bird.state = 'patrol';
      bird.cooldown = game.birdRestTime;
    }
  }
}

// --- Keys, cages, rescued crocodiles ---

function collectWing(wing) {
  wing.taken = true;
  tiger.flightSeconds += SECONDS_PER_WING;
  burst(wing.x, wing.y, wing.z, [1, 1, 1], 30);
  showMessage('Kanat buldun! Zıpla ve Boşluk tuşunu basılı tut, uç!', 3.5);
  updateHud();
}

function collectKey(key) {
  key.taken = true;
  game.keysHeld++;
  burst(key.x, key.y, key.z, [1, 0.8, 0.12], 25);
  showMessage('Anahtarı buldun! Şimdi bir kafese git.');
  updateHud();
}

function openCage(cage) {
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
    document.exitPointerLock();
    writeSave();
  } else {
    showMessage('Timsahı kurtardın! Artık seninle geliyor.');
  }
}

// The cheat key: takes whatever is nearest, wherever it is. A cage only counts with a key in hand.
function collectNearest() {
  const candidates = [
    ...wingPickups.filter((wing) => !wing.taken).map((target) => ({ target, collect: collectWing })),
    ...keys.filter((key) => !key.taken).map((target) => ({ target, collect: collectKey })),
    ...(game.keysHeld > 0 ? cages.filter((cage) => !cage.open) : []).map((target) => ({ target, collect: openCage })),
  ];
  const distance = ({ target }) => Math.hypot(target.x - tiger.x, target.z - tiger.z);
  const nearest = candidates.reduce((best, c) => (!best || distance(c) < distance(best) ? c : best), null);
  if (nearest) nearest.collect(nearest.target);
}

function updateObjectives(dt) {
  game.noKeyHintTime -= dt;
  if (cheatQueued) collectNearest();
  cheatQueued = false;
  for (const wing of wingPickups) {
    if (!wing.taken && Math.hypot(tiger.x - wing.x, tiger.y + 0.8 - wing.y, tiger.z - wing.z) < WING_PICKUP_RADIUS) collectWing(wing);
  }
  for (const key of keys) {
    if (!key.taken && Math.hypot(tiger.x - key.x, tiger.y + 0.8 - key.y, tiger.z - key.z) < KEY_PICKUP_RADIUS) collectKey(key);
  }
  for (const cage of cages) {
    if (cage.open || Math.hypot(tiger.x - cage.x, tiger.z - cage.z) > CAGE_OPEN_RADIUS) continue;
    if (game.keysHeld > 0) {
      openCage(cage);
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
      const x = f.x + (dx / distance) * step, z = f.z + (dz / distance) * step;
      // Rescued crocodiles stay on the island and watch the tiger go.
      if (!world.isLiquid(x, z)) {
        f.x = x;
        f.z = z;
        f.stride += dt * 10;
        f.yaw = Math.atan2(dx, dz);
      }
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
    if (tiger.wingsOut) {
      count = drawModel(frameSpheres, count, models.wings, tiger.x, tiger.y, tiger.z, tiger.yaw + attackProgress * Math.PI * 2, {
        flap: Math.sin(game.time * 16) * 0.5,
      });
    }
  }
  for (const wing of wingPickups) {
    if (wing.taken || !isNear(wing)) continue;
    const bob = Math.sin(game.time * 2.5) * 0.15;
    count = drawModel(frameSpheres, count, models.wings, wing.x, wing.y + bob - 1.2, wing.z, game.time * 1.5, {
      flap: Math.sin(game.time * 4) * 0.3,
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
  for (const wing of wingPickups) {
    if (wing.taken) continue;
    dot(wing.x, wing.z, 4.5, '#333842'); // an outline, or white would vanish on the snow theme
    dot(wing.x, wing.z, 3, '#ffffff');
  }
  for (const key of keys) if (!key.taken) dot(key.x, key.z, 4, '#ffd21f');
  for (const cage of cages) if (!cage.open) dot(cage.x, cage.z, 5, '#333842');
  for (const bird of birds) if (bird.state !== 'gone') dot(bird.x, bird.z, 2.5, '#8a2aa0');
  map.save();
  map.translate(toMap(tiger.x), toMap(tiger.z));
  map.rotate(-tiger.yaw); // at yaw 0 the tiger faces +z, which is down on the map
  map.beginPath();
  map.moveTo(0, 13);
  map.lineTo(9, -9);
  map.lineTo(0, -4);
  map.lineTo(-9, -9);
  map.closePath();
  map.fillStyle = '#ff7a00';
  map.fill();
  map.strokeStyle = '#ffffff';
  map.lineWidth = 2;
  map.stroke();
  map.restore();
}

// --- Main loop ---

let lastTime = performance.now();
let statsTime = 0, statsFrames = 0;
let timeSinceSave = 0;

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  statsTime += (now - lastTime) / 1000;
  statsFrames++;
  lastTime = now;

  // Giving the mouse back with Esc also stops the game, so the birds wait.
  const paused = game.playing && !game.levelDone && !crossing && !mouseControlsGame();
  hud.paused.classList.toggle('visible', paused);
  if (!paused) {
    game.time += dt;
    if (crossing) {
      updateCrossing(dt);
    } else if (game.playing && !game.levelDone) {
      updateTiger(dt);
      updateObjectives(dt);
    } else {
      camera.yaw += dt * (game.playing ? 0.3 : 0.15);
    }
    for (const bird of birds) updateBird(bird, dt);
    updateFollowers(dt);
    updateParticles(dt);

    timeSinceSave += dt;
    if (timeSinceSave >= SAVE_INTERVAL) {
      timeSinceSave = 0;
      writeSave();
    }
  }

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

const savedGame = readSave();
loadLevel(savedGame ? savedGame.level : 1);
if (savedGame) {
  restoreSave(savedGame);
  document.getElementById('start-button').textContent = `Devam et (${savedGame.level}. Bölüm)`;
  document.getElementById('new-game-button').hidden = false;
}
requestAnimationFrame(frame);
