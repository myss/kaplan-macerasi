// Rescuing every crocodile brings out one giant of the world's own monster, in the middle of the
// island. It has three lives, like the tiger, and it starts over if the tiger loses them.
//
// A boss walks up, shows what it is about to do, does it, rests, and repeats:
//   throw - balls that can be dodged or put out by attacking
//   lunge - a fast dash; step aside
//   spin  - a low root, tail or arm sweeps around; jump over it
//   sting - strikes the spot marked on the ground; move off it
//   slam  - jumps and lands on its belly, sending a low ring outwards; jump over it

const BOSS_LIVES = 3;
const BOSS_HARD_LIVES = 5;
const BOSS_SURPRISE_TOP_LIVES = 8;
const BOSS_ARENA = { x: 0, z: -13 };
const BOSS_RECOVERY_SECONDS = 0.6;
const BOSS_LOW_REACH = 0.9; // a sweep or ring passes under a tiger whose feet are higher than this
const BOSS_REST_SECONDS = 1.1;
const BOSS_TELEGRAPH_SECONDS = { throw: 0.7, lunge: 0.7, spin: 1.1, sting: 1.1, slam: 0.8 };
const BOSS_LUNGE_SECONDS = 0.8;
const BOSS_LUNGE_REACH = 1.2; // beyond the body: the paw, claws or teeth at the end of the dash
const BOSS_SLAM_SECONDS = 0.8;
const BOSS_SLAM_HEIGHT = 7;
const BOSS_SHOCK_SPEED = 13;
const BOSS_SHOCK_REACH = 15;
const BOSS_STING_RADIUS = 2.2;
const GRAB_SECONDS = 1.5;
const GRAB_ORBIT_METRES = 3;
const FLING_SPEED = 13;
const FLING_SECONDS = 0.45;
const BOSS_TOP_REACH = 0.6; // how far above its head the tiger's feet can be and still touch a boss

// lives: more than BOSS_LIVES for a tougher boss; the hard level adds the same number on top.
// spin.grabs: caught and whirled around unharmed, then flung into a lost life. Otherwise it burns on touch.
const BOSS_KINDS = {
  walkingTree: {
    name: 'Dev Yürüyen Ağaç', scale: 3.4, speed: 1.2, moves: ['throw', 'spin'],
    ball: { count: 3, speed: 6.5, radius: 0.42, color: [1.2, 0.12, 0.1], burst: [0.9, 0.15, 0.1] },
    spin: { radius: 7, turnsPerSecond: 0.4, color: [0.42, 0.27, 0.14], grabs: true },
  },
  scorpion: { name: 'Dev Akrep', scale: 2.6, speed: 2.6, lungeSpeed: 11, moves: ['sting', 'lunge', 'slam'] },
  polarBear: {
    name: 'Dev Kutup Ayısı', scale: 2.8, speed: 2.4, lungeSpeed: 11, moves: ['throw', 'lunge'],
    ball: { count: 3, speed: 8, radius: 0.5, color: [1.1, 1.1, 1.15], burst: [0.95, 0.97, 1] },
  },
  pirateBear: {
    name: 'Dev Korsan Ayı', scale: 2.8, speed: 2.4, lungeSpeed: 11, moves: ['throw', 'lunge'],
    ball: { count: 3, speed: 8, radius: 0.5, color: [1.2, 0.72, 0.1], burst: [1, 0.7, 0.1], stick: HONEY_STICK },
  },
  rat: {
    name: 'Dev Fare', scale: 2.6, speed: 3.4, lungeSpeed: 13, moves: ['spin', 'lunge'],
    spin: { radius: 6.5, turnsPerSecond: 0.65, color: [0.92, 0.62, 0.65], grabs: true },
  },
  lavaMonster: {
    name: 'Dev Lav Canavarı', scale: 2.4, speed: 1.8, moves: ['throw', 'spin'], burnsOnLanding: true,
    ball: { count: 2, speed: 7, radius: 1, color: [1.5, 0.65, 0.08], burst: [0.85, 0.85, 0.88] },
    spin: { radius: 6.5, turnsPerSecond: 0.9, color: [1.4, 0.55, 0.08], grabs: false },
  },
  worm: {
    name: 'Dev Solucan', scale: 2.3, speed: 2.4, lungeSpeed: 12, moves: ['throw', 'lunge', 'slam'],
    ball: { count: 3, speed: 7, radius: 0.55, color: [0.42, 0.28, 0.16], burst: [0.42, 0.28, 0.16] },
  },
  earthCore: {
    name: 'Dünyanın Çekirdeği', scale: 6, speed: 1.6, lives: 6, moves: ['throw', 'slam', 'spin'], burnsOnLanding: true, color: [1.5, 0.55, 0.08],
    ball: { count: 4, speed: 7, radius: 0.9, color: [1.5, 0.6, 0.08], burst: [0.85, 0.85, 0.88] },
    spin: { radius: 10, turnsPerSecond: 0.7, color: [1.5, 0.9, 0.2], grabs: false },
  },
  squid: {
    name: 'Dev Kalamar', scale: 2.4, speed: 2.2, lungeSpeed: 11, moves: ['throw', 'spin', 'lunge'],
    ball: { count: 3, speed: 7, radius: 0.55, color: [0.05, 0.03, 0.12], burst: [0.1, 0.06, 0.2] },
    spin: { radius: 7, turnsPerSecond: 0.55, color: [0.84, 0.3, 0.36], grabs: true },
  },
};

let boss = null;

function bossLivesForLevel(kind) {
  if (game.level >= FIRST_SURPRISE_LEVEL) {
    return Math.min(BOSS_LIVES + Math.floor((game.level - FIRST_SURPRISE_LEVEL) / 2), BOSS_SURPRISE_TOP_LIVES);
  }
  const lives = BOSS_KINDS[kind].lives ?? BOSS_LIVES;
  return game.hard ? lives + BOSS_HARD_LIVES - BOSS_LIVES : lives;
}

function startBossFight() {
  // Nothing but the boss from here on.
  for (const enemy of [...birds, ...monsters]) {
    enemy.state = 'gone';
    enemy.timer = Infinity;
  }
  fireballs.length = 0;

  tiger.x = SPAWN.x;
  tiger.z = SPAWN.z;
  tiger.y = world.terrainTop(SPAWN.x, SPAWN.z);
  tiger.vy = 0;
  tiger.wingsOut = false;
  camera.yaw = 0; // looking towards the arena
  for (const follower of followers) {
    follower.x = SPAWN.x;
    follower.z = SPAWN.z + 6;
  }
  hud.mist.style.opacity = 1;

  const kind = world.theme.boss ?? world.theme.monster;
  const maxLives = bossLivesForLevel(kind);
  const { speed, lungeSpeed } = BOSS_KINDS[kind];
  boss = {
    kind, ...BOSS_KINDS[kind], speed: speed * game.speedFactor, lungeSpeed: lungeSpeed * game.speedFactor, maxLives, lives: maxLives, mistFade: 1,
    height: modelTop(models[kind]) * BOSS_KINDS[kind].scale,
  };
  placeBoss();
  updateBossHud();
  playSound('bossArrive');
  showMessage(`${boss.name} geldi! ${maxLives} kez vur!`, 3.5);
}

function placeBoss() {
  Object.assign(boss, {
    x: BOSS_ARENA.x, z: BOSS_ARENA.z, y: world.terrainTop(BOSS_ARENA.x, BOSS_ARENA.z),
    yaw: 0, stride: 0, recovery: 0, state: 'approach', timer: 2, nextMove: 0,
    move: null, armAngle: 0, mark: null, shock: null, grab: null,
    lungeX: 0, lungeZ: 0, slamFromX: 0, slamFromZ: 0, slamToX: 0, slamToZ: 0,
  });
}

function updateBossHud() {
  hud.bossBar.classList.toggle('hidden', !boss);
  if (!boss) return;
  hud.bossName.textContent = `${boss.name}: ${boss.lives}`;
  hud.bossFill.style.width = `${(boss.lives / boss.maxLives) * 100}%`;
}

function endBossFight() {
  boss = null;
  updateBossHud();
}

// The tiger lost all its lives, so this boss goes back to the start too.
function restartBossFight() {
  boss.lives = boss.maxLives;
  placeBoss();
  fireballs.length = 0;
  camera.yaw = 0;
  updateBossHud();
  showMessage('Yakalandın! Boss da baştan başlıyor.', 3.5);
}

function defeatBoss() {
  burst(boss.x, boss.y + boss.scale, boss.z, boss.color ?? [1, 0.8, 0.2], 90);
  fireballs.length = 0;
  endBossFight();
  completeLevel();
}

function hitBoss() {
  if (boss.recovery > 0) return;
  boss.recovery = BOSS_RECOVERY_SECONDS;
  boss.lives--;
  burst(boss.x, boss.y + boss.scale, boss.z, [1, 0.85, 0.3], 20);
  playSound('bossHit');
  updateBossHud();
  if (boss.lives <= 0) defeatBoss();
}

function tigerIsLow() {
  return tiger.y - world.terrainTop(tiger.x, tiger.z) < BOSS_LOW_REACH;
}

function bossHurtsTiger(message) {
  if (tiger.invulnerable <= 0) hurtTiger(boss.x, boss.z, message);
}

function moveBoss(x, z) {
  if (world.isLiquid(x, z)) return;
  if (world.theme.walledBoss && world.isSolid(x, boss.y + 1, z)) return;
  boss.x = x;
  boss.z = z;
  boss.y = world.terrainTop(x, z);
}

function turnBossToTiger(dt) {
  let turn = Math.atan2(tiger.x - boss.x, tiger.z - boss.z) - boss.yaw;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  boss.yaw += turn * Math.min(1, dt * 6);
}

function throwBossBalls() {
  const { ball } = boss;
  playSound('fire');
  const y = boss.y + boss.scale * 1.4;
  const ahead = Math.atan2(tiger.x - boss.x, tiger.z - boss.z);
  const flat = Math.hypot(tiger.x - boss.x, tiger.z - boss.z) || 1;
  const rise = (tiger.y + 0.9 - y) / flat;
  for (let i = 0; i < ball.count; i++) {
    const a = ahead + (i - (ball.count - 1) / 2) * 0.28;
    fireballs.push({
      x: boss.x, y, z: boss.z, life: FIREBALL_LIFE_SECONDS,
      vx: Math.sin(a) * ball.speed, vy: rise * ball.speed, vz: Math.cos(a) * ball.speed,
      radius: ball.radius, color: ball.color, hitRadius: ball.radius + 0.7,
      burst: ball.burst, stick: ball.stick,
    });
  }
}

function startBossMove() {
  boss.move = boss.moves[boss.nextMove++ % boss.moves.length];
  boss.state = 'telegraph';
  boss.timer = BOSS_TELEGRAPH_SECONDS[boss.move];
  playSound('warn');
  if (boss.move === 'sting') boss.mark = { x: tiger.x, z: tiger.z };
  if (boss.move === 'spin' || boss.move === 'slam') showMessage('Zıpla!', 1.5);
}

function finishBossTelegraph() {
  if (boss.move === 'throw') {
    throwBossBalls();
    boss.state = 'rest';
    boss.timer = BOSS_REST_SECONDS;
  } else if (boss.move === 'lunge') {
    const length = Math.hypot(tiger.x - boss.x, tiger.z - boss.z) || 1;
    boss.lungeX = (tiger.x - boss.x) / length;
    boss.lungeZ = (tiger.z - boss.z) / length;
    boss.state = 'lunge';
    // Up to where the tiger was: stepping aside in time is what avoids it.
    boss.timer = Math.min(BOSS_LUNGE_SECONDS, length / boss.lungeSpeed);
  } else if (boss.move === 'spin') {
    boss.state = 'spin';
    boss.armAngle = boss.yaw;
    boss.timer = 2 / boss.spin.turnsPerSecond; // two full turns
  } else if (boss.move === 'sting') {
    if (Math.hypot(tiger.x - boss.mark.x, tiger.z - boss.mark.z) < BOSS_STING_RADIUS) bossHurtsTiger('Ah! İşaretli yerden kaç!');
    burst(boss.mark.x, boss.y + 0.5, boss.mark.z, [0.05, 0.05, 0.06], 30);
    boss.mark = null;
    boss.state = 'rest';
    boss.timer = BOSS_REST_SECONDS;
  } else if (boss.move === 'slam') {
    Object.assign(boss, { slamFromX: boss.x, slamFromZ: boss.z, slamToX: tiger.x, slamToZ: tiger.z, state: 'slam', timer: BOSS_SLAM_SECONDS });
  }
}

function updateBossSpin(dt) {
  const { spin } = boss;
  const turn = spin.turnsPerSecond * Math.PI * 2 * dt;
  boss.armAngle += turn;
  boss.yaw = boss.armAngle;
  const distance = Math.hypot(tiger.x - boss.x, tiger.z - boss.z);
  let apart = Math.atan2(tiger.x - boss.x, tiger.z - boss.z) - boss.armAngle;
  apart = Math.atan2(Math.sin(apart), Math.cos(apart));
  const armReaches = distance < spin.radius && Math.abs(apart) < turn + 0.1;
  if (armReaches && tigerIsLow() && tiger.invulnerable <= 0) {
    if (spin.grabs) {
      boss.grab = { time: 0, angle: Math.atan2(tiger.x - boss.x, tiger.z - boss.z) };
      boss.state = 'grab';
      showMessage('Yakalandın!', GRAB_SECONDS);
    } else {
      bossHurtsTiger('Ah! Kolları çok sıcak! Dönerken zıpla!');
    }
  }
}

// Whirls the tiger around faster and faster without hurting it. Letting go is what hurts.
function updateBossGrab(dt) {
  const { grab } = boss;
  grab.time += dt;
  grab.angle += (3 + (grab.time / GRAB_SECONDS) * 14) * dt;
  boss.yaw = grab.angle;
  tiger.x = boss.x + Math.sin(grab.angle) * GRAB_ORBIT_METRES;
  tiger.z = boss.z + Math.cos(grab.angle) * GRAB_ORBIT_METRES;
  tiger.y = boss.y + 0.5;
  tiger.yaw = grab.angle + Math.PI / 2;
  tiger.vy = 0;
  if (grab.time >= GRAB_SECONDS) {
    tiger.flingX = Math.sin(grab.angle) * FLING_SPEED;
    tiger.flingZ = Math.cos(grab.angle) * FLING_SPEED;
    tiger.flingTime = FLING_SECONDS;
    boss.grab = null;
    boss.state = 'rest';
    boss.timer = BOSS_REST_SECONDS;
    tiger.vy = 5;
    tiger.grounded = false;
    hurtTiger(boss.x, boss.z, 'Ah! Dönerken zıplarsan yakalayamaz!');
  }
}

function updateBossFight(dt) {
  if (!boss) return;
  boss.recovery = Math.max(0, boss.recovery - dt);
  if (boss.mistFade > 0) {
    boss.mistFade -= dt * 2;
    hud.mist.style.opacity = Math.max(0, boss.mistFade);
  }

  if (boss.state === 'grab') {
    updateBossGrab(dt);
    return;
  }

  if (boss.state === 'approach') {
    turnBossToTiger(dt);
    const distance = Math.hypot(tiger.x - boss.x, tiger.z - boss.z);
    if (distance > boss.scale * 1.3) {
      moveBoss(boss.x + Math.sin(boss.yaw) * boss.speed * dt, boss.z + Math.cos(boss.yaw) * boss.speed * dt);
      boss.stride += dt * boss.speed * 2;
    }
    boss.timer -= dt;
    if (boss.timer <= 0) startBossMove();
  } else if (boss.state === 'telegraph') {
    if (boss.move !== 'spin') turnBossToTiger(dt);
    else boss.yaw += dt * 2;
    boss.stride += dt * 12; // arms and legs shake as a warning
    boss.timer -= dt;
    if (boss.timer <= 0) finishBossTelegraph();
  } else if (boss.state === 'lunge') {
    moveBoss(boss.x + boss.lungeX * boss.lungeSpeed * dt, boss.z + boss.lungeZ * boss.lungeSpeed * dt);
    boss.stride += dt * 22;
    boss.timer -= dt;
    if (Math.hypot(tiger.x - boss.x, tiger.z - boss.z) < boss.scale * 0.45 + BOSS_LUNGE_REACH && tiger.y - boss.y < boss.scale) {
      bossHurtsTiger('Ah! Atılınca kenara kaç!');
    }
    if (boss.timer <= 0) {
      boss.state = 'rest';
      boss.timer = BOSS_REST_SECONDS;
    }
  } else if (boss.state === 'spin') {
    updateBossSpin(dt);
    if (boss.state === 'spin') {
      boss.timer -= dt;
      if (boss.timer <= 0) {
        boss.state = 'rest';
        boss.timer = BOSS_REST_SECONDS;
      }
    }
  } else if (boss.state === 'slam') {
    boss.timer -= dt;
    const progress = 1 - boss.timer / BOSS_SLAM_SECONDS;
    moveBoss(boss.slamFromX + (boss.slamToX - boss.slamFromX) * progress, boss.slamFromZ + (boss.slamToZ - boss.slamFromZ) * progress);
    boss.y += Math.sin(Math.min(progress, 1) * Math.PI) * BOSS_SLAM_HEIGHT;
    if (boss.timer <= 0) {
      boss.y = world.terrainTop(boss.x, boss.z);
      if (Math.hypot(tiger.x - boss.x, tiger.z - boss.z) < boss.scale * 0.6) bossHurtsTiger('Ah! Üstüne düştü! Kenara kaç!');
      boss.shock = { radius: 1 };
      boss.state = 'rest';
      boss.timer = BOSS_REST_SECONDS + 0.6;
      burst(boss.x, boss.y + 0.4, boss.z, [0.72, 0.42, 0.14], 40);
    }
  } else if (boss.state === 'rest') {
    boss.timer -= dt;
    if (boss.timer <= 0) {
      boss.state = 'approach';
      boss.timer = 1.5 + Math.random() * 1.5;
    }
  }

  if (boss.shock) {
    boss.shock.radius += BOSS_SHOCK_SPEED * dt;
    const distance = Math.hypot(tiger.x - boss.x, tiger.z - boss.z);
    if (Math.abs(distance - boss.shock.radius) < 0.9 && tigerIsLow()) bossHurtsTiger('Ah! Halka gelirken zıpla!');
    if (boss.shock.radius > BOSS_SHOCK_REACH) boss.shock = null;
  }

  // Fighting back. The body's reach grows with the boss.
  const flatDistance = Math.hypot(tiger.x - boss.x, tiger.z - boss.z);
  const dy = tiger.y - boss.y;
  const bodyRadius = boss.scale * 0.45;
  const isAboveHead = dy > boss.height + BOSS_TOP_REACH;
  if (tiger.attackTime > 0 && flatDistance < ATTACK_RADIUS + bodyRadius && dy > -boss.scale * 2.2 && !isAboveHead) {
    hitBoss();
  } else if (tiger.vy < -1 && flatDistance < bodyRadius + 0.8 && dy > boss.scale && !isAboveHead) {
    if (!boss.burnsOnLanding) hitBoss();
    else bossHurtsTiger('Ay, çok sıcak! Üstüne basma, vur!');
    if (boss) tiger.vy = JUMP_SPEED * 0.9;
  } else if (flatDistance < bodyRadius && dy < boss.scale && boss.state !== 'slam') {
    bossHurtsTiger('Ah! Çok yaklaştın!');
  }
}

function drawBoss(count) {
  if (!boss) return count;
  const addSphere = (x, y, z, radius, color) => {
    const at = count * FLOATS_PER_SPHERE;
    if (at + FLOATS_PER_SPHERE > frameSpheres.length) return;
    frameSpheres.set([x, y, z, radius, color[0], color[1], color[2]], at);
    count++;
  };
  count = drawModel(frameSpheres, count, models[boss.kind], boss.x, boss.y, boss.z, boss.yaw, {
    stride: Math.sin(boss.stride) * 0.7,
  }, boss.scale);
  if (boss.state === 'spin' || boss.state === 'grab') {
    const { radius, color } = boss.spin;
    const angle = boss.state === 'spin' ? boss.armAngle : boss.grab.angle;
    const reach = boss.state === 'spin' ? radius : GRAB_ORBIT_METRES;
    for (let r = boss.scale * 0.2; r < reach; r += 0.3) {
      addSphere(boss.x + Math.sin(angle) * r, boss.y + 0.5, boss.z + Math.cos(angle) * r, 0.28, color);
    }
  }
  if (boss.mark) {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      addSphere(boss.mark.x + Math.cos(a) * BOSS_STING_RADIUS, world.terrainTop(boss.mark.x, boss.mark.z) + 0.2, boss.mark.z + Math.sin(a) * BOSS_STING_RADIUS, 0.16, [1.4, 0.1, 0.08]);
    }
  }
  if (boss.shock) {
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      addSphere(boss.x + Math.cos(a) * boss.shock.radius, boss.y + 0.45, boss.z + Math.sin(a) * boss.shock.radius, 0.3, [1.3, 0.9, 0.3]);
    }
  }
  return count;
}
