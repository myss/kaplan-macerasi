// On-screen buttons for playing without a mouse. They press the same keys as the keyboard, and a
// finger dragged across the picture turns the camera. They show from the start when the device has
// no mouse and from the first real touch when it has one; the Home key switches them by hand.

const TOUCH_LOOK_SENSITIVITY = 0.006;
const PAD_DEAD_ZONE = 0.25; // of the pad's radius
const PAD_DIAGONAL = 0.414; // tan 22.5°: past this, the pad presses both of the neighbouring keys
const PAD_KEYS = ['KeyW', 'KeyS', 'KeyA', 'KeyD'];

let touchControls = !matchMedia('(any-pointer: fine)').matches;
let touchPaused = false;
document.body.classList.toggle('touch', touchControls);

function setTouchControls(on) {
  touchControls = on;
  touchPaused = false;
  document.body.classList.toggle('touch', on);
  held.clear();
  if (on) document.exitPointerLock?.();
}

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Home' || e.repeat) return;
  setTouchControls(!touchControls);
  e.preventDefault();
});
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' && !touchControls) setTouchControls(true);
}, { capture: true });
// A finger only counts as permission for sound when it lifts.
document.addEventListener('touchend', startAudio);
// A long press must not open the browser's menu or start selecting, wherever the finger is.
document.addEventListener('contextmenu', (e) => {
  if (touchControls) e.preventDefault();
});
document.addEventListener('selectstart', (e) => e.preventDefault());
const keepTouchFromBrowser = (e) => e.preventDefault();

const touchLayer = document.getElementById('touch-controls');
touchLayer.addEventListener('pointerdown', () => { touchPaused = false; });
touchLayer.addEventListener('touchstart', keepTouchFromBrowser, { passive: false });

for (const button of touchLayer.querySelectorAll('[data-key]')) {
  const release = () => {
    held.delete(button.dataset.key);
    button.classList.remove('pressed');
  };
  button.addEventListener('pointerdown', (e) => {
    button.setPointerCapture(e.pointerId);
    pressKey(button.dataset.key);
    button.classList.add('pressed');
  });
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
}

document.getElementById('touch-pause').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  touchPaused = !touchPaused;
});

// The pad is one surface rather than four buttons, so a thumb can slide round it and press diagonals.
const pad = document.getElementById('touch-pad');
const padArrows = Object.fromEntries(PAD_KEYS.map((key) => [key, pad.querySelector(`[data-arrow="${key}"]`)]));

function padKeysAt(dx, dy) {
  if (Math.hypot(dx, dy) < PAD_DEAD_ZONE) return [];
  const keys = [];
  if (Math.abs(dy) > PAD_DIAGONAL * Math.abs(dx)) keys.push(dy < 0 ? 'KeyW' : 'KeyS');
  if (Math.abs(dx) > PAD_DIAGONAL * Math.abs(dy)) keys.push(dx < 0 ? 'KeyA' : 'KeyD');
  return keys;
}
function holdPadKeys(keys) {
  for (const key of PAD_KEYS) {
    const wanted = keys.includes(key);
    if (wanted && !held.has(key)) pressKey(key);
    if (!wanted) held.delete(key);
    padArrows[key].classList.toggle('pressed', wanted);
  }
}
function followPadPointer(e) {
  const box = pad.getBoundingClientRect();
  const radius = box.width / 2;
  holdPadKeys(padKeysAt((e.clientX - box.left - radius) / radius, (e.clientY - box.top - radius) / radius));
}
pad.addEventListener('pointerdown', (e) => {
  pad.setPointerCapture(e.pointerId);
  followPadPointer(e);
});
pad.addEventListener('pointermove', (e) => {
  if (pad.hasPointerCapture(e.pointerId)) followPadPointer(e);
});
pad.addEventListener('pointerup', () => holdPadKeys([]));
pad.addEventListener('pointercancel', () => holdPadKeys([]));

const lookSurface = document.getElementById('game');
let lookPointer = null, lookX = 0, lookY = 0;
lookSurface.addEventListener('touchstart', keepTouchFromBrowser, { passive: false });
lookSurface.addEventListener('pointerdown', (e) => {
  if (!touchControls) return;
  touchPaused = false;
  lookSurface.setPointerCapture(e.pointerId);
  lookPointer = e.pointerId;
  lookX = e.clientX;
  lookY = e.clientY;
});
lookSurface.addEventListener('pointermove', (e) => {
  if (e.pointerId !== lookPointer) return;
  camera.yaw -= (e.clientX - lookX) * TOUCH_LOOK_SENSITIVITY;
  camera.pitch = clamp(camera.pitch + (e.clientY - lookY) * TOUCH_LOOK_SENSITIVITY, 0.08, 1.25);
  lookX = e.clientX;
  lookY = e.clientY;
});
const endLook = () => { lookPointer = null; };
lookSurface.addEventListener('pointerup', endLook);
lookSurface.addEventListener('pointercancel', endLook);
