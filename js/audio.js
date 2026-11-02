// Every sound and tune is made here from oscillators and noise, so the game needs no sound files and
// still runs from a double click. The browser allows sound only after a click, so startAudio waits
// for the start button. Each world has its own song and every boss shares one.

const MUTE_KEY = 'kaplan-macerasi-ses-kapali';
const AUDIO_TICK_MS = 50;
const AUDIO_LOOKAHEAD_SECONDS = 0.25;
const MUSIC_VOLUME = 0.5;
const SOUND_VOLUME = 0.9;

const NOTE_OFFSETS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midiFrequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

function noteToMidi(name) {
  const [, letter, accidental, octave] = name.match(/^([A-G])([#b]?)(\d)$/);
  return 12 * (Number(octave) + 1) + NOTE_OFFSETS[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
}

// A part is written one token per eighth note: a note name, `-` for a rest, `=` to hold the note
// before it, or `x` for a tick of noise. Parts may differ in length, and each loops on its own.
function parsePart({ wave, volume, notes }) {
  const tokens = notes.trim().split(/\s+/);
  const slots = tokens.map(() => null);
  let last = null;
  tokens.forEach((token, i) => {
    if (token === '=') {
      if (last) last.steps++;
    } else if (token === '-') last = null;
    else if (token === 'x') last = slots[i] = { noise: true, steps: 1 };
    else last = slots[i] = { frequency: midiFrequency(noteToMidi(token)), steps: 1 };
  });
  return { wave, volume, slots };
}

const SONGS = {
  home: {
    bpm: 126,
    parts: [
      { wave: 'triangle', volume: 0.3, notes: 'C5 = E5 G5 A5 G5 E5 = F5 = A5 = G5 = E5 C5 D5 = F5 A5 G5 F5 E5 D5 C5 = E5 D5 C5 = - -' },
      { wave: 'sine', volume: 0.35, notes: 'C3 - G3 - C3 - G3 - F3 - C4 - C3 - G3 - D3 - A3 - G3 - B3 - C3 - G3 - C3 - - -' },
    ],
  },
  forest: {
    bpm: 108,
    parts: [
      { wave: 'triangle', volume: 0.3, notes: 'G4 = B4 D5 E5 = D5 B4 C5 = E5 D5 B4 = G4 = A4 = C5 B4 A4 = G4 E4 D4 = G4 A4 G4 = - -' },
      { wave: 'sine', volume: 0.35, notes: 'G2 - D3 - G2 - D3 - C3 - G3 - G2 - D3 - D3 - A3 - C3 - D3 - G2 - D3 - G2 - - -' },
    ],
  },
  desert: {
    bpm: 116,
    parts: [
      { wave: 'square', volume: 0.14, notes: 'A4 Bb4 C#5 = D5 C#5 Bb4 A4 E5 = F5 E5 D5 C#5 Bb4 = A4 Bb4 C#5 D5 E5 = D5 C#5 Bb4 A4 G4 = A4 Bb4 A4 =' },
      { wave: 'triangle', volume: 0.35, notes: 'A2 - A2 E3 A2 - A2 E3 A2 - A2 E3 A2 - A2 E3 A2 - A2 E3 A2 - A2 E3 A2 - A2 E3 A2 - A2 E3' },
      { wave: 'noise', volume: 0.05, notes: 'x - - x - - x -' },
    ],
  },
  snow: {
    bpm: 84,
    parts: [
      { wave: 'sine', volume: 0.3, notes: 'C6 - A5 - F5 - A5 - C6 - D6 - C6 = - - Bb5 - G5 - E5 - G5 - Bb5 - A5 - F5 = - -' },
      { wave: 'sine', volume: 0.2, notes: 'F3 = = = C4 = = = F3 = = = A3 = = = C3 = = = G3 = = = F3 = = = C4 = = =' },
    ],
  },
  lava: {
    bpm: 132,
    parts: [
      { wave: 'sawtooth', volume: 0.1, notes: 'E4 E4 G4 E4 B4 = A4 G4 F#4 F#4 A4 F#4 C5 = B4 A4 E4 E4 G4 E4 B4 = D5 C5 B4 A4 G4 F#4 E4 = - -' },
      { wave: 'triangle', volume: 0.4, notes: 'E2 E2 - E2 E2 - E2 G2 D2 D2 - D2 D2 - D2 F#2 E2 E2 - E2 E2 - E2 G2 E2 E2 - E2 E2 - E2 B2' },
      { wave: 'noise', volume: 0.05, notes: 'x - x -' },
    ],
  },
  giantHouse: {
    bpm: 116,
    parts: [
      { wave: 'square', volume: 0.13, notes: 'F5 - D5 - Bb4 - D5 - F5 = G5 F5 D5 = - - Eb5 - C5 - A4 - C5 - Eb5 = F5 Eb5 C5 = - -' },
      { wave: 'triangle', volume: 0.4, notes: 'Bb2 - F3 - Bb2 - F3 - Bb2 - F3 - Bb2 - F3 - F2 - C3 - F2 - C3 - F2 - C3 - Bb2 - F3 -' },
    ],
  },
  pirate: {
    bpm: 168,
    parts: [
      { wave: 'square', volume: 0.13, notes: 'A4 D5 D5 F5 D5 F5 A5 G5 F5 E5 D5 C5 A4 C5 C5 E5 C5 E5 G5 F5 E5 D5 C5 A4' },
      { wave: 'triangle', volume: 0.4, notes: 'D3 - A3 D3 - A3 D3 - A3 D3 - A3 C3 - G3 C3 - G3 C3 - G3 A2 - E3' },
    ],
  },
  deep: {
    bpm: 72,
    parts: [
      { wave: 'sine', volume: 0.28, notes: 'E5 = = A4 = = C5 = B4 = = E4 = = = - D5 = = G4 = = B4 = A4 = = E4 = = = -' },
      { wave: 'sine', volume: 0.3, notes: 'A2 = = = = = = = E2 = = = = = = = G2 = = = = = = = A2 = = = = = = =' },
    ],
  },
  surf: {
    bpm: 150,
    parts: [
      { wave: 'square', volume: 0.13, notes: 'D5 F#5 A5 F#5 D5 F#5 A5 B5 A5 F#5 D5 E5 F#5 = E5 D5 G5 B5 D6 B5 A5 F#5 D5 F#5 E5 C#5 A4 C#5 D5 = - -' },
      { wave: 'triangle', volume: 0.38, notes: 'D3 D3 A3 D3 D3 D3 A3 D3 D3 D3 A3 D3 A2 A2 E3 A2 G2 G2 D3 G2 D3 D3 A3 D3 A2 A2 E3 A2 D3 D3 A2 -' },
      { wave: 'noise', volume: 0.05, notes: 'x - x x' },
    ],
  },
  underground: {
    bpm: 96,
    parts: [
      { wave: 'triangle', volume: 0.3, notes: 'C4 - - Eb4 - - G4 - F4 - Eb4 - D4 = - - C4 - - Eb4 - - Ab4 - G4 - F4 - Eb4 D4 C4 =' },
      { wave: 'sine', volume: 0.4, notes: 'C2 = = - G2 = = - Ab2 = = - G2 = = - C2 = = - G2 = = - Ab2 = = - G2 = = -' },
    ],
  },
  boss: {
    bpm: 168,
    parts: [
      { wave: 'sawtooth', volume: 0.1, notes: 'A4 A4 C5 A4 E5 A4 D5 C5 A4 A4 C5 A4 F5 E5 D5 C5 G4 G4 B4 G4 D5 G4 C5 B4 E4 E4 G#4 E4 B4 = G#4 =' },
      { wave: 'triangle', volume: 0.4, notes: 'A2 A2 A3 A2 A2 A2 A3 A2 A2 A2 A3 A2 F2 F2 F3 F2 G2 G2 G3 G2 G2 G2 G3 G2 E2 E2 E3 E2 E2 E2 E3 E2' },
      { wave: 'noise', volume: 0.06, notes: 'x - x -' },
    ],
  },
};

// By level number, starting from the home village.
const WORLD_SONGS = ['home', 'forest', 'desert', 'snow', 'lava', 'giantHouse', 'pirate', 'deep', 'surf', 'underground'];

const MIDI_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const midiToNote = (midi) => `${MIDI_NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

// A generated world gets a generated tune, and later ones play it faster.
function generateSong(level) {
  const random = seededRandom(20261101 + level * 7919 + 7);
  const scale = random() < 0.5 ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10];
  const root = 57 + Math.floor(random() * 7);
  const melody = [];
  let degree = 5;
  for (let step = 0; step < 32; step++) {
    if (step % 8 !== 7 && random() < 0.2) {
      melody.push(step === 0 ? '-' : random() < 0.5 ? '=' : '-');
      continue;
    }
    degree = clamp(degree + Math.floor(random() * 5) - 2, 0, 9);
    melody.push(midiToNote(root + scale[degree % 5] + 12 * Math.floor(degree / 5)));
  }
  const bass = [];
  for (let bar = 0; bar < 4; bar++) {
    const barRoot = root - 24 + scale[[0, 3, 2, 0][bar]];
    bass.push(midiToNote(barRoot), '-', midiToNote(barRoot + 7), '-', midiToNote(barRoot), '-', midiToNote(barRoot + 7), '-');
  }
  return {
    bpm: 110 + Math.min(level - FIRST_SURPRISE_LEVEL, 10) * 4,
    parts: [
      { wave: 'square', volume: 0.13, notes: melody.join(' ') },
      { wave: 'triangle', volume: 0.4, notes: bass.join(' ') },
      { wave: 'noise', volume: 0.05, notes: 'x - x -' },
    ],
  };
}

const tone = (from, to, seconds, wave = 'square', volume = 0.3, at = 0) => ({ from, to, seconds, wave, volume, at });
const hiss = (filter, seconds, volume = 0.3, at = 0) => ({ filter, seconds, volume, at });
const notes = (frequencies, each, wave, volume) => frequencies.map((f, i) => tone(f, f, each * 1.6, wave, volume, i * each));

const SOUNDS = {
  jump: [tone(300, 620, 0.13, 'square', 0.14)],
  swing: [hiss(1800, 0.12, 0.22)],
  enemyDown: [tone(620, 110, 0.22, 'square', 0.2), hiss(2500, 0.1, 0.18)],
  enemyHit: [tone(240, 180, 0.1, 'square', 0.25), hiss(3500, 0.08, 0.2)],
  hurt: [tone(420, 110, 0.32, 'sawtooth', 0.28)],
  key: notes([880, 1175, 1760], 0.07, 'triangle', 0.3),
  wing: [tone(400, 1500, 0.35, 'sine', 0.3)],
  cage: [hiss(900, 0.12, 0.3), ...notes([523, 659, 784, 1047], 0.09, 'triangle', 0.3)],
  bonus: notes([523, 659, 784, 1047, 1319, 1568, 2093], 0.07, 'triangle', 0.3),
  groundPunch: [tone(130, 35, 0.7, 'sine', 0.8), hiss(400, 0.5, 0.5)],
  fire: [hiss(700, 0.25, 0.14), tone(200, 90, 0.2, 'sawtooth', 0.08)],
  putOut: [hiss(5000, 0.3, 0.2)],
  honey: [tone(500, 220, 0.14, 'sine', 0.3), tone(280, 180, 0.2, 'sine', 0.3, 0.12)],
  bossArrive: [tone(110, 45, 1.3, 'sawtooth', 0.35), tone(82, 55, 1.3, 'square', 0.15), hiss(250, 1, 0.3)],
  bossHit: [tone(260, 70, 0.25, 'square', 0.32), hiss(1500, 0.14, 0.3)],
  warn: [tone(880, 880, 0.08, 'square', 0.12), tone(880, 880, 0.08, 'square', 0.12, 0.13)],
  portal: [tone(250, 1300, 0.45, 'sine', 0.3), tone(375, 1950, 0.45, 'triangle', 0.14)],
  win: notes([523, 523, 523, 659, 784, 659, 784, 1047], 0.13, 'square', 0.17),
};

const audio = {
  context: null,
  master: null,
  musicBus: null,
  soundBus: null,
  noise: null,
  muted: false,
  gamePaused: false,
  songKey: null,
  song: null,
  step: 0,
  nextStepTime: 0,
};
const builtSongs = new Map();

try {
  audio.muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  // Without storage the sound simply starts on each time.
}

// Must be called from a click, as browsers keep sound off until then.
function startAudio() {
  if (audio.context) return;
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  audio.context = context;
  const compressor = context.createDynamicsCompressor();
  compressor.connect(context.destination);
  audio.master = context.createGain();
  audio.master.gain.value = audio.muted ? 0 : 1;
  audio.master.connect(compressor);
  audio.musicBus = context.createGain();
  audio.musicBus.gain.value = MUSIC_VOLUME;
  audio.musicBus.connect(audio.master);
  audio.soundBus = context.createGain();
  audio.soundBus.gain.value = SOUND_VOLUME;
  audio.soundBus.connect(audio.master);

  audio.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = audio.noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  setInterval(scheduleMusic, AUDIO_TICK_MS);
  document.addEventListener('visibilitychange', applyAudioRunning);
  context.resume();
}

function toggleMute() {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 1;
  try {
    localStorage.setItem(MUTE_KEY, audio.muted ? '1' : '0');
  } catch {
    // It still holds until the page closes.
  }
  return audio.muted;
}

// The sound stops with the game and whenever the tab is out of sight.
function applyAudioRunning() {
  if (!audio.context) return;
  if (audio.gamePaused || document.hidden) audio.context.suspend();
  else audio.context.resume();
}

function setAudioPaused(paused) {
  if (paused === audio.gamePaused) return;
  audio.gamePaused = paused;
  applyAudioRunning();
}

function envelope(volume, start, seconds, bus) {
  const gain = audio.context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.01, seconds / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  gain.connect(bus);
  return gain;
}

function playTone(wave, from, to, seconds, volume, start, bus) {
  const oscillator = audio.context.createOscillator();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(from, start);
  if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(to, start + seconds);
  oscillator.connect(envelope(volume, start, seconds, bus));
  oscillator.start(start);
  oscillator.stop(start + seconds + 0.02);
}

function playNoise(filterFrequency, seconds, volume, start, bus) {
  const source = audio.context.createBufferSource();
  source.buffer = audio.noise;
  source.loop = true;
  const filter = audio.context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFrequency;
  source.connect(filter);
  filter.connect(envelope(volume, start, seconds, bus));
  source.start(start, Math.random() * 0.5);
  source.stop(start + seconds + 0.02);
}

function playSound(name) {
  if (!audio.context || audio.context.state !== 'running') return;
  const now = audio.context.currentTime;
  for (const layer of SOUNDS[name]) {
    if (layer.filter) playNoise(layer.filter, layer.seconds, layer.volume, now + layer.at, audio.soundBus);
    else playTone(layer.wave, layer.from, layer.to, layer.seconds, layer.volume, now + layer.at, audio.soundBus);
  }
}

function buildSong(key, level) {
  if (!builtSongs.has(key)) {
    const song = SONGS[key] ?? generateSong(level);
    builtSongs.set(key, { stepSeconds: 30 / song.bpm, parts: song.parts.map(parsePart) });
  }
  return builtSongs.get(key);
}

// Called every frame; only a change of song does anything.
function updateMusic() {
  if (!audio.context) return;
  const inBossFight = boss || surf?.phase === 'whale';
  const key = game.levelDone ? null
    : inBossFight ? 'boss'
    : game.level >= FIRST_SURPRISE_LEVEL ? `surprise${game.level}`
    : WORLD_SONGS[game.level];
  if (key === audio.songKey) return;
  audio.songKey = key;
  audio.song = key ? buildSong(key, game.level) : null;
  audio.step = 0;
  audio.nextStepTime = audio.context.currentTime + 0.05;
}

function scheduleMusic() {
  const { context, song } = audio;
  if (!song || context.state !== 'running') return;
  audio.nextStepTime = Math.max(audio.nextStepTime, context.currentTime);
  while (audio.nextStepTime < context.currentTime + AUDIO_LOOKAHEAD_SECONDS) {
    for (const { wave, volume, slots } of song.parts) {
      const note = slots[audio.step % slots.length];
      if (!note) continue;
      const seconds = note.steps * song.stepSeconds * 0.95;
      if (note.noise) playNoise(6000, 0.05, volume, audio.nextStepTime, audio.musicBus);
      else playTone(wave, note.frequency, note.frequency, seconds, volume, audio.nextStepTime, audio.musicBus);
    }
    audio.step++;
    audio.nextStepTime += song.stepSeconds;
  }
}
