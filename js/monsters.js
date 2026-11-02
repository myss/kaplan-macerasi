// Each world has its own walking monsters, as many as it has birds. They stay on the ground, cannot
// pass through anything, and the lava monster throws fireballs the tiger can dodge or put out.

const MONSTER_KINDS = {
  walkingTree: { speed: 1.6, scale: 1.5, color: [0.16, 0.56, 0.22] },
  scorpion: { speed: 3.2, scale: 1.1, color: [0.72, 0.42, 0.14] },
  polarBear: { speed: 3.6, scale: 1.2, color: [0.93, 0.95, 0.98] },
  lavaMonster: { speed: 1.5, scale: 1.2, color: [1, 0.45, 0.08], throwsFire: true },
  rat: { speed: 5.2, scale: 0.9, color: [0.5, 0.45, 0.42] },
  pirateBear: { speed: 3.6, scale: 1.2, color: [0.42, 0.26, 0.14] },
  shark: { speed: 4, scale: 1.2, color: [0.42, 0.5, 0.58] },
  mole: { speed: 2.6, scale: 1, color: [0.3, 0.22, 0.2] },
  ant: { speed: 4.6, scale: 1.2, color: [0.5, 0.14, 0.08] },
};

const MONSTER_SEE_RADIUS = 14;
const MONSTER_ACTIVE_RADIUS = 80; // farther ones stand still, which keeps big levels cheap
const MONSTER_DRAW_DISTANCE = 75;
const MONSTER_WANDER_RADIUS = 6;
const MONSTER_CONTACT_RADIUS = 1.2;
const MONSTER_REST_SECONDS = 2.5;
const MONSTER_FALL_SPEED = 10;
const FIRE_THROW_RADIUS = 18;
const FIRE_THROW_SECONDS = 3.5;
const FIREBALL_SPEED = 5; // well below the tiger's walking speed
const FIREBALL_LIFE_SECONDS = 6;
const FIREBALL_HIT_RADIUS = 1;
const FIREBALL_RADIUS = 0.42;

let monsters = [];
let fireballs = [];

function createMonsters(homes) {
  const kinds = world.theme.monsters ?? (world.theme.monster ? [world.theme.monster] : []);
  const random = seededRandom(20261101 + world.level * 7919 + 4);
  const created = [];
  for (const home of homes) {
    const kind = kinds[created.length % kinds.length];
    for (let attempt = 0; attempt < 60; attempt++) {
      const a = random() * Math.PI * 2, reach = 3.5 + random() * (5 + attempt * 0.4);
      const x = home.x + Math.cos(a) * reach, z = home.z + Math.sin(a) * reach;
      const y = floorBelow(x, home.y + 0.5, z);
      const isFarFromStart = Math.hypot(x - SPAWN.x, z - SPAWN.z) > 14;
      if (Number.isFinite(y) && isFarFromStart && !isBlocked(x, y, z)) {
        created.push({
          kind, ...MONSTER_KINDS[kind],
          speed: Math.min(MONSTER_KINDS[kind].speed * game.speedFactor, ENEMY_TOP_SPEED),
          x, y, z, homeX: x, homeY: y, homeZ: z, yaw: a, stride: 0,
          state: 'wander', timer: 0, cooldown: 1 + random() * 3, fireCooldown: 1 + random() * FIRE_THROW_SECONDS,
          turnIn: 0, maxHits: 1, hitsLeft: 1, recovery: 0,
        });
        break;
      }
    }
  }
  return created;
}

function throwFireball(monster) {
  const y = monster.y + 1.7 * monster.scale;
  const toX = tiger.x - monster.x, toY = tiger.y + 0.9 - y, toZ = tiger.z - monster.z;
  const length = Math.hypot(toX, toY, toZ) || 1;
  fireballs.push({
    x: monster.x, y, z: monster.z,
    vx: (toX / length) * FIREBALL_SPEED, vy: (toY / length) * FIREBALL_SPEED, vz: (toZ / length) * FIREBALL_SPEED,
    life: FIREBALL_LIFE_SECONDS,
  });
}

function updateMonster(monster, dt) {
  monster.recovery = Math.max(0, monster.recovery - dt);
  monster.cooldown -= dt;
  monster.fireCooldown -= dt;

  if (monster.state === 'gone') {
    monster.timer -= dt;
    if (monster.timer <= 0) {
      Object.assign(monster, { state: 'wander', x: monster.homeX, y: monster.homeY, z: monster.homeZ, hitsLeft: monster.maxHits, cooldown: 3 });
    }
    return;
  }

  const toX = tiger.x - monster.x, toZ = tiger.z - monster.z;
  const flatDistance = Math.hypot(toX, toZ);
  if (flatDistance > MONSTER_ACTIVE_RADIUS) return;

  const canFight = game.playing && !game.levelDone && !crossing;
  const eyeY = monster.y + monster.scale;
  const seesTiger = canFight && flatDistance < FIRE_THROW_RADIUS && hasLineOfSight(monster.x, eyeY, monster.z, tiger.x, tiger.y + 0.9, tiger.z);

  // The lava monster keeps its distance and throws; the others come closer.
  let heading = monster.yaw;
  let speed = monster.speed;
  const chasing = seesTiger && flatDistance < MONSTER_SEE_RADIUS && monster.cooldown <= 0 && !monster.throwsFire;
  if (chasing) {
    heading = Math.atan2(toX, toZ);
  } else if (monster.throwsFire && seesTiger) {
    heading = Math.atan2(toX, toZ);
    speed = 0;
    if (monster.fireCooldown <= 0) {
      monster.fireCooldown = FIRE_THROW_SECONDS;
      throwFireball(monster);
    }
  } else {
    speed *= 0.5;
    monster.turnIn -= dt;
    const fromHome = Math.hypot(monster.x - monster.homeX, monster.z - monster.homeZ);
    if (fromHome > MONSTER_WANDER_RADIUS) heading = Math.atan2(monster.homeX - monster.x, monster.homeZ - monster.z);
    else if (monster.turnIn <= 0) {
      monster.turnIn = 2 + Math.random() * 3;
      heading = Math.random() * Math.PI * 2;
    }
  }

  let turn = heading - monster.yaw;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  monster.yaw += turn * Math.min(1, dt * 6);

  if (speed > 0) {
    const x = monster.x + Math.sin(monster.yaw) * speed * dt, z = monster.z + Math.cos(monster.yaw) * speed * dt;
    if (!isBlocked(x, monster.y, z)) {
      monster.x = x;
      monster.z = z;
      monster.stride += dt * speed * 3.5;
    } else if (!chasing) {
      monster.turnIn = 0.5;
      monster.yaw += 1.2 + Math.random();
    }
  }
  const floor = floorBelow(monster.x, monster.y, monster.z);
  if (Number.isFinite(floor)) monster.y = floor < monster.y ? Math.max(floor, monster.y - MONSTER_FALL_SPEED * dt) : floor;

  if (!canFight) return;
  const dy = tiger.y - monster.y;
  const distance = Math.hypot(toX, dy, toZ);
  if (distance >= ATTACK_RADIUS + 0.5 || !hasLineOfSight(monster.x, eyeY, monster.z, tiger.x, tiger.y + 0.9, tiger.z)) return;
  if (tiger.attackTime > 0 && distance < ATTACK_RADIUS + 0.5) {
    hitEnemy(monster);
  } else if (tiger.vy < -1 && flatDistance < 1.5 && dy > monster.scale) {
    // A lava monster is too hot to land on: it burns the tiger instead of going down.
    if (!monster.throwsFire) hitEnemy(monster);
    else if (tiger.invulnerable <= 0) hurtTiger(monster.x, monster.z, 'Ay, çok sıcak! Lav canavarına basma, uzaktan vur!');
    tiger.vy = JUMP_SPEED * 0.9;
  } else if (tiger.invulnerable <= 0 && flatDistance < MONSTER_CONTACT_RADIUS && Math.abs(dy) < 2) {
    hurtTiger(monster.x, monster.z);
    monster.cooldown = MONSTER_REST_SECONDS;
  }
}

function updateFireballs(dt) {
  for (let i = fireballs.length - 1; i >= 0; i--) {
    const ball = fireballs[i];
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.z += ball.vz * dt;
    ball.life -= dt;
    const distance = Math.hypot(ball.x - tiger.x, ball.y - (tiger.y + 0.9), ball.z - tiger.z);

    let isOut = ball.life <= 0 || world.isSolid(ball.x, ball.y, ball.z);
    if (!isOut && tiger.attackTime > 0 && distance < ATTACK_RADIUS) {
      isOut = true;
      burst(ball.x, ball.y, ball.z, ball.burst ?? [0.85, 0.85, 0.88], 20);
    } else if (!isOut && distance < (ball.hitRadius ?? FIREBALL_HIT_RADIUS) && !crossing && !game.levelDone) {
      isOut = true;
      if (ball.sticky) {
        // Honey does not hurt: the tiger eats it, and is left sticky and slow.
        tiger.stuckTime = HONEY_STUCK_SECONDS;
        showMessage('Mmm, bal! Ama yapış yapış oldun, yavaşladın!', 2.5);
      } else if (tiger.invulnerable <= 0) {
        hurtTiger(ball.x, ball.z);
      }
    }
    if (isOut) fireballs.splice(i, 1);
  }
}

// Writes monsters and fireballs into the frame's sphere array and returns the new sphere count.
function drawMonsters(count) {
  for (const monster of monsters) {
    if (monster.state === 'gone' || Math.hypot(monster.x - tiger.x, monster.z - tiger.z) > MONSTER_DRAW_DISTANCE) continue;
    count = drawModel(frameSpheres, count, models[monster.kind], monster.x, monster.y, monster.z, monster.yaw, {
      stride: Math.sin(monster.stride) * 0.6,
    }, monster.scale);
  }
  for (const ball of fireballs) {
    const at = count * FLOATS_PER_SPHERE;
    if (at + FLOATS_PER_SPHERE > frameSpheres.length) break;
    const glow = 1.4 + Math.sin(game.time * 12) * 0.2;
    const color = ball.color ?? [glow, glow * 0.45, 0.08];
    frameSpheres.set([ball.x, ball.y, ball.z, ball.radius ?? FIREBALL_RADIUS, color[0], color[1], color[2]], at);
    count++;
  }
  return count;
}
