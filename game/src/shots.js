// Deterministic screenshot scenes: ?shot=<name>&seed=<n> freezes the game at
// one composed moment so every screenshot is the same render every time.
export function shotParams() {
  const q = new URLSearchParams(window.location.search);
  return { shot: q.get('shot') || '', seed: Number(q.get('seed') || 1) };
}

export const SHOT_SCENES = {
  flight: {
    mission: 'mail',
    time: 42,
    plane: { x: 2900, alt: 600, speed: 135, pitch: 4, throttle: 0.7, fuel: 78, ringsHit: 2, score: 500 },
    message: 'RING 2 OF 6 — +250',
    messageT: 99,
  },
  title: {
    mission: 'mail',
    title: true,
  },
  ridge: {
    mission: 'ridge',
    time: 55,
    plane: { x: 3900, alt: 470, speed: 150, pitch: -3, throttle: 0.8, fuel: 61, ringsHit: 3, score: 750 },
    message: 'RING 3 OF 5 — +250',
    messageT: 99,
  },
  landing: {
    mission: 'mail',
    time: 88,
    plane: { x: 8660, alt: 152, speed: 78, pitch: 2, throttle: 0.25, fuel: 34, ringsHit: 6, score: 2150 },
    message: 'TOUCHDOWN — MAIL DELIVERED',
    messageT: 99,
    phase: 'landed',
  },
};

export function sceneFor(shot) {
  return SHOT_SCENES[shot] ?? null;
}
