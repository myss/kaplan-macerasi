// Each world has its own walking monsters, as many as it has birds. They stay on the ground, cannot
// pass through anything, and each kind has one thing of its own, always with a way to dodge it.

const STUCK_SPEED_FACTOR = 0.35;
const HONEY_STICK = { seconds: 2.5, speedFactor: STUCK_SPEED_FACTOR, sound: 'honey', message: 'Mmm, bal! Ama yapış yapış oldun, yavaşladın!' };
const POISON_STICK = { seconds: 3, speedFactor: 0.5, sound: 'poison', message: 'Zehirlendin, yavaşladın!' };
const ROOT_STICK = { seconds: 1.2, speedFactor: 0, sound: 'root', message: 'Kökler seni yakaladı!' };

// What a monster can throw; a thrown thing is put out by a punch. A crawling one runs along the
// ground, so a jump clears it.
const FIRE_BALL = { every: 3.5 };
const POISON_BALL = { every: 5, speed: 6, radius: 0.3, color: [0.45, 1.1, 0.2], burst: [0.4, 0.8, 0.2], sound: 'fire', stick: POISON_STICK };
const HONEY_BALL = { every: 5, speed: 6.5, radius: 0.36, color: [1.2, 0.72, 0.1], burst: [1, 0.7, 0.1], sound: 'fire', stick: HONEY_STICK };
const ROOT_BALL = { every: 6, speed: 7, radius: 0.3, color: [0.42, 0.26, 0.12], burst: [0.42, 0.26, 0.12], sound: 'root', stick: ROOT_STICK, crawls: true };
const LIGHTNING_BALL = { every: 4, speed: 8, radius: 0.22, color: [1.7, 1.6, 0.45], burst: [1, 1, 0.6], sound: 'zap', sparks: true };

const MONSTER_KINDS = {
  walkingTree: { speed: 1.6, scale: 1.5, color: [0.16, 0.56, 0.22], ball: ROOT_BALL },
  scorpion: { speed: 3.2, scale: 1.1, color: [0.72, 0.42, 0.14], ball: POISON_BALL },
  polarBear: { speed: 3.6, scale: 1.2, color: [0.93, 0.95, 0.98], slides: true },
  lavaMonster: { speed: 1.5, scale: 1.2, color: [1, 0.45, 0.08], ball: FIRE_BALL, standsToThrow: true, burnsOnLanding: true },
  rat: { speed: 5.2, scale: 0.7, color: [0.5, 0.45, 0.42], swarms: true },
  pirateBear: { speed: 3.6, scale: 1.2, color: [0.42, 0.26, 0.14], ball: HONEY_BALL },
  shark: { speed: 4, scale: 1.2, color: [0.42, 0.5, 0.58], dives: true },
  mole: { speed: 2.6, scale: 1, color: [0.3, 0.22, 0.2], digs: true },
  ant: { speed: 4.6, scale: 1.2, color: [0.5, 0.14, 0.08], armored: true },
  // Sails under the rock with its periscope showing, throws fire from there and comes up to ram.
  drillShip: { speed: 3, scale: 1.2, color: [0.46, 0.44, 0.42], dives: true, ball: FIRE_BALL },
  // Floats above the ground. It shocks whatever touches it, landing on it included.
  stormCloud: {
    speed: 2.4, scale: 1.3, color: [0.52, 0.54, 0.6], ball: LIGHTNING_BALL, burnsOnLanding: true,
    landingMessage: 'Bzzt! Elektrikli buluta basma, uzaktan vur!',
  },
  // Crouches, then hops at the tiger in a long arc.
  grasshopper: { speed: 3.4, scale: 1.2, color: [0.36, 0.7, 0.2], slides: true, hops: true },
};

const MONSTER_SEE_RADIUS = 14;
const MONSTER_ACTIVE_RADIUS = 80; // farther ones stand still, which keeps big levels cheap
const MONSTER_DRAW_DISTANCE = 75;
const MONSTER_WANDER_RADIUS = 6;
const MONSTER_CONTACT_RADIUS = 1.2;
const MONSTER_REST_SECONDS = 2.5;
const MONSTER_FALL_SPEED = 10;
const FIRE_THROW_RADIUS = 18;
const THROW_MIN_RADIUS = 3;
const FIREBALL_SPEED = 5; // well below the tiger's walking speed
const FIREBALL_LIFE_SECONDS = 6;
const FIREBALL_HIT_RADIUS = 1;
const FIREBALL_RADIUS = 0.42;
const CRAWL_HEIGHT = 0.25;
const CRAWL_TRAIL_SECONDS = 0.07;
const SLIDE_WINDUP_SECONDS = 0.8;
const SLIDE_SECONDS = 1;
const SLIDE_SPEED = 11;
const SLIDE_COOLDOWN_SECONDS = 6;
const HOP_HEIGHT = 2.5;
const SWARM_SIZE = 3;
const SWARM_FLEE_SECONDS = 3;
const FIN_SHOWING = 0.55; // how much of the shark's model stays above the ground, before scale
const SINK_SPEED = 3;
const BITE_RADIUS = 4.5;
const BITE_SECONDS = 0.7;
const BITE_SPEED = 7;
const BITE_LIFT = 1.6;
const BITE_REACH_UP = 1; // a jump clears a bite
const BITE_REST_SECONDS = 2.5;
const BITE_COOLDOWN_SECONDS = 2;
const DIG_SPEED = 7;
const DIG_COME_UP_METRES = 1.2;
const MOUND_SECONDS = 1;
const MOUND_HURT_RADIUS = 1.6;
const DIG_COOLDOWN_SECONDS = 6;

let monsters = [];
let fireballs = [];

function createMonsters(homes) {
  const kinds = world.theme.monsters ?? (world.theme.monster ? [world.theme.monster] : []);
  const random = seededRandom(20261101 + world.level * 7919 + 4);
  const created = [];
  // Every other home of a swarming kind gets a whole swarm, so that there are not three times as many.
  let swarmTurn = 0;
  homes.forEach((home, homeIndex) => {
    const kind = kinds[homeIndex % kinds.length];
    if (kind === undefined) return;
    const count = MONSTER_KINDS[kind].swarms ? (swarmTurn++ % 2 === 0 ? SWARM_SIZE : 0) : 1;
    for (let n = 0; n < count; n++) {
      for (let attempt = 0; attempt < 60; attempt++) {
        const a = random() * Math.PI * 2, reach = 3.5 + random() * (5 + attempt * 0.4);
        const x = home.x + Math.cos(a) * reach, z = home.z + Math.sin(a) * reach;
        const y = floorBelow(x, home.y + 0.5, z);
        const isFarFromStart = Math.hypot(x - SPAWN.x, z - SPAWN.z) > 14;
        if (Number.isFinite(y) && isFarFromStart && !isBlocked(x, y, z)) {
          const traits = MONSTER_KINDS[kind];
          const maxHits = traits.armored ? 2 : 1;
          created.push({
            kind, ...traits,
            speed: Math.min(traits.speed * game.speedFactor, ENEMY_TOP_SPEED),
            x, y, z, homeX: x, homeY: y, homeZ: z, yaw: a, stride: 0,
            state: 'wander', timer: 0, cooldown: 1 + random() * 3,
            fireCooldown: 1 + random() * (traits.ball?.every ?? 1), abilityCooldown: 1 + random() * 3,
            turnIn: 0, maxHits, hitsLeft: maxHits, recovery: 0,
            swarm: traits.swarms ? homeIndex + 1 : 0, fleeTime: 0,
            hidden: Boolean(traits.dives), sink: traits.dives ? 1 : 0, lift: 0,
            sinkDepth: traits.dives ? (modelTop(models[kind]) - FIN_SHOWING) * traits.scale : 0,
          });
          break;
        }
      }
    }
  });
  return created;
}

function throwBall(monster) {
  const { ball } = monster;
  playSound(ball.sound ?? 'fire');
  const y = ball.crawls ? monster.y + CRAWL_HEIGHT : monster.y + 1.7 * monster.scale;
  const toX = tiger.x - monster.x, toY = ball.crawls ? 0 : tiger.y + 0.9 - y, toZ = tiger.z - monster.z;
  const length = Math.hypot(toX, toY, toZ) || 1;
  const speed = ball.speed ?? FIREBALL_SPEED;
  fireballs.push({
    ...ball,
    x: monster.x, y, z: monster.z,
    vx: (toX / length) * speed, vy: (toY / length) * speed, vz: (toZ / length) * speed,
    life: FIREBALL_LIFE_SECONDS, trailTime: 0,
  });
}

// When one of a swarm goes down, the rest of it run for it.
function scareSwarm(rat) {
  for (const monster of monsters) {
    if (monster !== rat && monster.swarm === rat.swarm && monster.state !== 'gone') monster.fleeTime = SWARM_FLEE_SECONDS;
  }
}

function turnMonster(monster, heading, dt) {
  let turn = heading - monster.yaw;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  monster.yaw += turn * Math.min(1, dt * 6);
}

// The polar bear shakes, then throws itself down and slides at the tiger in a straight line. The
// grasshopper does the same in the air, hopping over whatever is in its way.
function updateSlide(monster, dt, seesTiger, flatDistance, toX, toZ) {
  if (monster.state === 'windup') {
    turnMonster(monster, Math.atan2(toX, toZ), dt);
    monster.stride += dt * 24;
    monster.timer -= dt;
    if (monster.timer <= 0) {
      monster.state = 'slide';
      monster.timer = SLIDE_SECONDS;
      playSound(monster.hops ? 'jump' : 'slide');
    }
    return true;
  }
  if (monster.state === 'slide') {
    const x = monster.x + Math.sin(monster.yaw) * SLIDE_SPEED * dt, z = monster.z + Math.cos(monster.yaw) * SLIDE_SPEED * dt;
    monster.timer -= dt;
    if (monster.timer <= 0 || isBlocked(x, monster.y + monster.lift, z)) {
      monster.state = 'wander';
      monster.abilityCooldown = SLIDE_COOLDOWN_SECONDS;
      monster.cooldown = MONSTER_REST_SECONDS;
      monster.lift = 0;
    } else {
      monster.x = x;
      monster.z = z;
      if (monster.hops) monster.lift = Math.sin((1 - monster.timer / SLIDE_SECONDS) * Math.PI) * HOP_HEIGHT;
      else burst(x, monster.y + 0.1, z, [0.93, 0.95, 0.98], 2);
    }
    return true;
  }
  if (seesTiger && monster.abilityCooldown <= 0 && flatDistance > THROW_MIN_RADIUS && flatDistance < MONSTER_SEE_RADIUS) {
    monster.state = 'windup';
    monster.timer = SLIDE_WINDUP_SECONDS;
    playSound('warn');
    return true;
  }
  return false;
}

// The shark swims hidden in the ground with only its fin showing, comes up to bite when it is close,
// and rests up top for a moment, which is the time to hit it.
function updateDive(monster, dt, seesTiger, flatDistance, toX, toZ) {
  monster.sink += clamp((monster.hidden ? 1 : 0) - monster.sink, -dt * SINK_SPEED, dt * SINK_SPEED);
  if (monster.state === 'bite') {
    monster.timer -= dt;
    const x = monster.x + Math.sin(monster.yaw) * BITE_SPEED * dt, z = monster.z + Math.cos(monster.yaw) * BITE_SPEED * dt;
    if (!isBlocked(x, monster.y, z)) {
      monster.x = x;
      monster.z = z;
    }
    monster.lift = Math.sin(clamp(1 - monster.timer / BITE_SECONDS, 0, 1) * Math.PI) * BITE_LIFT;
    if (monster.timer <= 0) {
      monster.state = 'rest';
      monster.timer = BITE_REST_SECONDS;
      monster.lift = 0;
    }
    return true;
  }
  if (monster.state === 'rest') {
    monster.timer -= dt;
    if (monster.timer <= 0) {
      monster.state = 'wander';
      monster.hidden = true;
      monster.abilityCooldown = BITE_COOLDOWN_SECONDS;
    }
    return true;
  }
  if (seesTiger && monster.abilityCooldown <= 0 && flatDistance < BITE_RADIUS && Math.abs(tiger.y - monster.y) < 2) {
    monster.state = 'bite';
    monster.timer = BITE_SECONDS;
    monster.hidden = false;
    monster.sink = 0;
    monster.yaw = Math.atan2(toX, toZ);
    playSound('bite');
    burst(monster.x, monster.y + 0.3, monster.z, [0.72, 0.9, 0.98], 15);
    return true;
  }
  return false;
}

// The mole goes under wherever it is and comes up beside the tiger. The ground swells for a moment
// before it does, which is the time to get away.
function updateDig(monster, dt, seesTiger, flatDistance) {
  if (monster.state === 'dig') {
    const step = Math.min(DIG_SPEED * dt, Math.hypot(monster.digX - monster.x, monster.digZ - monster.z));
    const heading = Math.atan2(monster.digX - monster.x, monster.digZ - monster.z);
    monster.x += Math.sin(heading) * step;
    monster.z += Math.cos(heading) * step;
    if (Math.hypot(monster.digX - monster.x, monster.digZ - monster.z) < 0.05) {
      monster.state = 'mound';
      monster.timer = MOUND_SECONDS;
      monster.y = monster.digY;
      playSound('warn');
    }
    return true;
  }
  if (monster.state === 'mound') {
    monster.timer -= dt;
    if (monster.timer > 0) return true;
    monster.state = 'wander';
    monster.hidden = false;
    monster.homeX = monster.x;
    monster.homeY = monster.y;
    monster.homeZ = monster.z;
    monster.abilityCooldown = DIG_COOLDOWN_SECONDS;
    monster.cooldown = MONSTER_REST_SECONDS;
    playSound('pop');
    burst(monster.x, monster.y + 0.3, monster.z, monster.color, 30);
    const reached = Math.hypot(tiger.x - monster.x, tiger.z - monster.z) < MOUND_HURT_RADIUS && Math.abs(tiger.y - monster.y) < 1;
    if (reached && tiger.invulnerable <= 0) hurtTiger(monster.x, monster.z, 'Ah! Toprak kabarınca oradan kaç!');
    return true;
  }
  if (seesTiger && monster.abilityCooldown <= 0 && flatDistance < MONSTER_SEE_RADIUS) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const a = Math.random() * Math.PI * 2;
      const x = tiger.x + Math.sin(a) * DIG_COME_UP_METRES, z = tiger.z + Math.cos(a) * DIG_COME_UP_METRES;
      const y = floorBelow(x, tiger.y + 0.5, z);
      if (Number.isFinite(y) && Math.abs(y - tiger.y) < 1 && !isBlocked(x, y, z)) {
        Object.assign(monster, { state: 'dig', hidden: true, digX: x, digY: y, digZ: z });
        burst(monster.x, monster.y + 0.3, monster.z, monster.color, 25);
        return true;
      }
    }
    monster.abilityCooldown = 1;
  }
  return false;
}

function updateMonster(monster, dt) {
  monster.recovery = Math.max(0, monster.recovery - dt);
  monster.cooldown -= dt;
  monster.fireCooldown -= dt;
  monster.abilityCooldown -= dt;
  monster.fleeTime = Math.max(0, monster.fleeTime - dt);

  if (monster.state === 'gone') {
    monster.timer -= dt;
    if (monster.timer <= 0) {
      Object.assign(monster, {
        state: 'wander', x: monster.homeX, y: monster.homeY, z: monster.homeZ, hitsLeft: monster.maxHits, cooldown: 3,
        hidden: Boolean(monster.dives), sink: monster.dives ? 1 : 0, lift: 0, fleeTime: 0, abilityCooldown: 3,
      });
    }
    return;
  }

  const toX = tiger.x - monster.x, toZ = tiger.z - monster.z;
  const flatDistance = Math.hypot(toX, toZ);
  if (flatDistance > MONSTER_ACTIVE_RADIUS) return;

  const canFight = game.playing && !game.levelDone && !crossing;
  const eyeY = monster.y + monster.scale;
  const seesTiger = canFight && flatDistance < FIRE_THROW_RADIUS && hasLineOfSight(monster.x, eyeY, monster.z, tiger.x, tiger.y + 0.9, tiger.z);

  if (monster.ball && seesTiger && monster.fireCooldown <= 0 && (monster.standsToThrow || flatDistance > THROW_MIN_RADIUS)) {
    monster.fireCooldown = monster.ball.every;
    throwBall(monster);
  }

  const isBusy = (monster.slides && updateSlide(monster, dt, seesTiger, flatDistance, toX, toZ))
    || (monster.dives && updateDive(monster, dt, seesTiger, flatDistance, toX, toZ))
    || (monster.digs && updateDig(monster, dt, seesTiger, flatDistance));
  // Under the ground, walls and floors mean nothing, and nothing can touch it either.
  if (monster.digs && monster.hidden) return;

  if (!isBusy) {
    // The lava monster keeps its distance and throws; a frightened one runs; the others come closer.
    let heading = monster.yaw;
    let speed = monster.speed;
    const chasing = seesTiger && flatDistance < MONSTER_SEE_RADIUS && monster.cooldown <= 0 && !monster.standsToThrow;
    if (monster.fleeTime > 0) {
      heading = Math.atan2(-toX, -toZ);
    } else if (chasing) {
      heading = Math.atan2(toX, toZ);
    } else if (monster.standsToThrow && seesTiger) {
      heading = Math.atan2(toX, toZ);
      speed = 0;
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

    turnMonster(monster, heading, dt);

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
  }
  const floor = floorBelow(monster.x, monster.y, monster.z);
  if (Number.isFinite(floor)) monster.y = floor < monster.y ? Math.max(floor, monster.y - MONSTER_FALL_SPEED * dt) : floor;

  if (!canFight || monster.hidden) return;
  const dy = tiger.y - monster.y;
  const distance = Math.hypot(toX, dy, toZ);
  if (distance >= ATTACK_RADIUS + 0.5 || !hasLineOfSight(monster.x, eyeY, monster.z, tiger.x, tiger.y + 0.9, tiger.z)) return;
  if (tiger.attackTime > 0 && distance < ATTACK_RADIUS + 0.5) {
    hitEnemy(monster);
  } else if (tiger.vy < -1 && flatDistance < 1.5 && dy > monster.scale) {
    // A lava monster is too hot to land on: it burns the tiger instead of going down.
    if (!monster.burnsOnLanding) hitEnemy(monster);
    else if (tiger.invulnerable <= 0) hurtTiger(monster.x, monster.z, monster.landingMessage ?? 'Ay, çok sıcak! Lav canavarına basma, uzaktan vur!');
    tiger.vy = JUMP_SPEED * 0.9;
  } else if (tiger.invulnerable <= 0 && monster.fleeTime <= 0 && flatDistance < MONSTER_CONTACT_RADIUS && Math.abs(dy) < (monster.dives ? BITE_REACH_UP : 2)) {
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

    let isOut = ball.life <= 0;
    if (ball.crawls) {
      const floor = floorBelow(ball.x, ball.y + 1, ball.z);
      if (!Number.isFinite(floor) || floor > ball.y + 0.8) isOut = true;
      else ball.y = floor + CRAWL_HEIGHT;
    }
    // A crawling one leaves a trail along the ground, and lightning gives off sparks.
    if (ball.crawls || ball.sparks) {
      ball.trailTime -= dt;
      if (ball.trailTime <= 0) {
        ball.trailTime = CRAWL_TRAIL_SECONDS;
        burst(ball.x, ball.y, ball.z, ball.color, 2);
      }
    }
    const distance = Math.hypot(ball.x - tiger.x, ball.y - (tiger.y + 0.9), ball.z - tiger.z);

    isOut ||= world.isSolid(ball.x, ball.y, ball.z);
    if (!isOut && tiger.attackTime > 0 && distance < ATTACK_RADIUS) {
      isOut = true;
      burst(ball.x, ball.y, ball.z, ball.burst ?? [0.85, 0.85, 0.88], 20);
      playSound('putOut');
    } else if (!isOut && distance < (ball.hitRadius ?? FIREBALL_HIT_RADIUS) && !crossing && !game.levelDone) {
      isOut = true;
      if (ball.stick) {
        // These do not hurt: they only leave the tiger slow, or held for a moment.
        tiger.stuckTime = ball.stick.seconds;
        tiger.stuckSpeedFactor = ball.stick.speedFactor;
        playSound(ball.stick.sound);
        showMessage(ball.stick.message, 2.5);
      } else if (tiger.invulnerable <= 0) {
        hurtTiger(ball.x, ball.z);
      }
    }
    if (isOut) fireballs.splice(i, 1);
  }
}

// Writes monsters and fireballs into the frame's sphere array and returns the new sphere count.
function drawMonsters(count) {
  const addSphere = (x, y, z, radius, color) => {
    const at = count * FLOATS_PER_SPHERE;
    if (at + FLOATS_PER_SPHERE > frameSpheres.length) return;
    frameSpheres.set([x, y, z, radius, color[0], color[1], color[2]], at);
    count++;
  };
  for (const monster of monsters) {
    if (monster.state === 'gone' || Math.hypot(monster.x - tiger.x, monster.z - tiger.z) > MONSTER_DRAW_DISTANCE) continue;
    if (monster.state === 'mound') {
      // The ground swelling where the mole is about to come up.
      const grown = 1 - monster.timer / MOUND_SECONDS;
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4, reach = 0.15 + (i / 14) * 0.75;
        addSphere(monster.x + Math.cos(a) * reach, monster.y + (0.08 + grown * 0.4) * (1 - i / 14), monster.z + Math.sin(a) * reach, 0.2, monster.color);
      }
      continue;
    }
    if (monster.digs && monster.hidden) continue;
    const y = monster.y + monster.lift - monster.sink * monster.sinkDepth;
    const pose = { stride: Math.sin(monster.stride) * 0.6 };
    count = drawModel(frameSpheres, count, models[monster.kind], monster.x, y, monster.z, monster.yaw, pose, monster.scale);
    if (monster.armored && monster.hitsLeft > 1) count = drawModel(frameSpheres, count, models.antArmor, monster.x, y, monster.z, monster.yaw, pose, monster.scale);
  }
  for (const ball of fireballs) {
    const glow = 1.4 + Math.sin(game.time * 12) * 0.2;
    addSphere(ball.x, ball.y, ball.z, ball.radius ?? FIREBALL_RADIUS, ball.color ?? [glow, glow * 0.45, 0.08]);
  }
  return count;
}
