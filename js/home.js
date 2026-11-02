// The home village. Walking into an entrance plays that world. A world already finished plays at
// its harder level, and the wooden sign beside its entrance says so.

const SIGN_DOT = 0.085;
const SIGN_LINE_ROWS = 10;
const SIGN_LETTER_COLUMNS = 6;
const SIGN_MAX_LINE_LETTERS = 9;
const SIGN_POST_HEIGHT = 1.4;
const SIGN_DRAW_METRES = 60;

// Five by seven dots. Turkish letters are these plus the marks below.
const SIGN_FONT = {
  A: '.###.,#...#,#...#,#####,#...#,#...#,#...#',
  B: '####.,#...#,#...#,####.,#...#,#...#,####.',
  C: '.####,#....,#....,#....,#....,#....,.####',
  D: '####.,#...#,#...#,#...#,#...#,#...#,####.',
  E: '#####,#....,#....,####.,#....,#....,#####',
  F: '#####,#....,#....,####.,#....,#....,#....',
  G: '.####,#....,#....,#.###,#...#,#...#,.####',
  H: '#...#,#...#,#...#,#####,#...#,#...#,#...#',
  I: '#####,..#..,..#..,..#..,..#..,..#..,#####',
  J: '..###,...#.,...#.,...#.,...#.,#..#.,.##..',
  K: '#...#,#..#.,#.#..,##...,#.#..,#..#.,#...#',
  L: '#....,#....,#....,#....,#....,#....,#####',
  M: '#...#,##.##,#.#.#,#.#.#,#...#,#...#,#...#',
  N: '#...#,##..#,#.#.#,#..##,#...#,#...#,#...#',
  O: '.###.,#...#,#...#,#...#,#...#,#...#,.###.',
  P: '####.,#...#,#...#,####.,#....,#....,#....',
  R: '####.,#...#,#...#,####.,#.#..,#..#.,#...#',
  S: '.####,#....,#....,.###.,....#,....#,####.',
  T: '#####,..#..,..#..,..#..,..#..,..#..,..#..',
  U: '#...#,#...#,#...#,#...#,#...#,#...#,.###.',
  V: '#...#,#...#,#...#,#...#,.#.#.,.#.#.,..#..',
  Y: '#...#,#...#,.#.#.,..#..,..#..,..#..,..#..',
  Z: '#####,....#,...#.,..#..,.#...,#....,#####',
};
const SIGN_LETTER_MARKS = {
  Ç: ['C', 'cedilla'], Ş: ['S', 'cedilla'], Ö: ['O', 'dots'], Ü: ['U', 'dots'], İ: ['I', 'dot'], Ğ: ['G', 'breve'],
};
const SIGN_MARK_DOTS = {
  cedilla: [[2, 7], [2, 8]],
  dots: [[1, -1], [3, -1]],
  dot: [[2, -1]],
  breve: [[1, -1], [2, -1], [3, -1]],
};

function signLines(text) {
  const lines = [];
  for (const word of text.toLocaleUpperCase('tr').split(' ')) {
    const last = lines[lines.length - 1];
    if (last !== undefined && last.length + 1 + word.length <= SIGN_MAX_LINE_LETTERS) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

// Which dots a letter lights, as [column, row] with row 0 at its top.
function signLetterDots(letter) {
  const [base, mark] = SIGN_LETTER_MARKS[letter] ?? [letter, null];
  const dots = [];
  (SIGN_FONT[base] ?? '').split(',').forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === '#') dots.push([x, y]);
    });
  });
  return mark ? [...dots, ...SIGN_MARK_DOTS[mark]] : dots;
}

// A board on two posts, readable from -z, the side the village's middle is on.
function signModel(text, isHard) {
  const wood = [0.55, 0.36, 0.18], dark = [0.32, 0.2, 0.1], ink = [0.98, 0.95, 0.8], red = [0.95, 0.3, 0.2];
  const lines = signLines(text);
  if (isHard) lines.push('ZOR');
  const letters = Math.max(...lines.map((line) => line.length));
  const width = (letters * SIGN_LETTER_COLUMNS + 2) * SIGN_DOT;
  const height = (lines.length * SIGN_LINE_ROWS + 1) * SIGN_DOT;
  const bottom = SIGN_POST_HEIGHT;
  const spheres = [];

  for (const side of [-1, 1]) {
    for (let y = 0; y < bottom + height * 0.8; y += 0.13) addSphere(spheres, side * (width / 2 - 0.2), y, 0.1, 0.1, dark);
  }
  for (let y = 0; y <= height; y += 0.14) {
    for (let x = -width / 2; x <= width / 2; x += 0.14) addSphere(spheres, x, bottom + y, 0, 0.1, wood);
  }
  lines.forEach((line, lineIndex) => {
    const isHardLine = isHard && lineIndex === lines.length - 1;
    const lineWidth = line.length * SIGN_LETTER_COLUMNS * SIGN_DOT;
    [...line].forEach((letter, letterIndex) => {
      for (const [column, row] of signLetterDots(letter)) {
        // Seen from -z, +x is to the left, so the text runs towards -x.
        const x = lineWidth / 2 - (letterIndex * SIGN_LETTER_COLUMNS + column + 0.5) * SIGN_DOT;
        const y = bottom + height - (lineIndex * SIGN_LINE_ROWS + row + 2) * SIGN_DOT;
        addSphere(spheres, x, y, -0.1, SIGN_DOT * 0.62, isHardLine ? red : ink);
      }
    });
  });
  return { parts: [part(spheres)] };
}

let homeSigns = [];

function createHomeSigns() {
  homeSigns = world.entrances.map((entrance) => ({
    x: entrance.signX,
    z: entrance.signZ,
    y: world.terrainTop(entrance.signX, entrance.signZ),
    model: signModel(themeForLevel(entrance.level).name, game.completed.includes(entrance.level)),
  }));
}

// Generating blocks the page, so the browser first gets a moment to show the loading panel.
function goToLevel(level) {
  game.leaving = true;
  hud.loading.classList.remove('hidden');
  hud.win.classList.add('hidden');
  setTimeout(() => {
    loadLevel(level);
    hud.loading.classList.add('hidden');
  }, 50);
}

function updateHome() {
  if (game.leaving) return;
  for (const entrance of world.entrances) {
    if (Math.hypot(tiger.x - entrance.x, tiger.z - entrance.z) < entrance.radius && tiger.y < entrance.maxY) {
      goToLevel(entrance.level);
      return;
    }
  }
}

// Each way in glows, so that it is clear where to go.
function drawHome(count) {
  for (const sign of homeSigns) {
    if (Math.hypot(sign.x - tiger.x, sign.z - tiger.z) < SIGN_DRAW_METRES) {
      count = drawModel(frameSpheres, count, sign.model, sign.x, sign.y, sign.z, 0);
    }
  }
  for (const { x, y, z, portal, build } of world.entrances) {
    if (Math.hypot(x - tiger.x, z - tiger.z) > DRAW_DISTANCE) continue;
    const addGlow = (sx, sy, sz, radius) => {
      const at = count * FLOATS_PER_SPHERE;
      if (at + FLOATS_PER_SPHERE > frameSpheres.length) return;
      frameSpheres.set([sx, sy, sz, radius, portal[0], portal[1], portal[2]], at);
      count++;
    };
    addGlow(x, y + Math.sin(game.time * 3) * 0.12, z, build === 'volcano' || build === 'waterWell' || build === 'moleHole' ? 0.9 : 0.55);
    for (let i = 0; i < 10; i++) {
      const a = game.time * 2.5 + (i / 10) * Math.PI * 2;
      const rise = build === 'volcano' ? ((game.time * 2 + i * 0.37) % 3) : Math.sin(a * 1.5) * 0.3;
      addGlow(x + Math.cos(a) * 0.95, y + rise, z + Math.sin(a) * 0.95, 0.08);
    }
  }
  return count;
}
