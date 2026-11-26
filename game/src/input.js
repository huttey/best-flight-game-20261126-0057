// Keyboard and mouse: arrows or WASD fly the plane, Enter confirms, R restarts,
// M goes back to the mission list, 1/2/3 pick a mission on the title screen.
export function makeInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const clicks = [];

  function norm(e) {
    const k = e.key.toLowerCase();
    if (k === ' ') return 'space';
    if (k.startsWith('arrow')) return k.slice(5);
    return k;
  }

  window.addEventListener('keydown', (e) => {
    const k = norm(e);
    if (['up', 'down', 'left', 'right', 'space'].includes(k)) e.preventDefault();
    if (!e.repeat) {
      keys.add(k);
      pressed.add(k);
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(norm(e)));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    clicks.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  });

  return {
    get pitch() {
      const up = keys.has('up') || keys.has('w');
      const down = keys.has('down') || keys.has('s');
      return (up ? 1 : 0) - (down ? 1 : 0);
    },
    get throttle() {
      const up = keys.has('right') || keys.has('d');
      const down = keys.has('left') || keys.has('a');
      return (up ? 1 : 0) - (down ? 1 : 0);
    },
    wasPressed(k) {
      if (pressed.has(k)) {
        pressed.delete(k);
        return true;
      }
      return false;
    },
    takeClick() {
      return clicks.shift() ?? null;
    },
  };
}
