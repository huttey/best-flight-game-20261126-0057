// The three sorties of Kestrel Courier: different skies, winds, rings and
// strips. Every number here is a design choice, not a copy of anything.
export const MISSIONS = [
  {
    id: 'mail',
    name: 'Dawn Mail Run',
    tagline: 'Six rings over the river valley, then put her down on the home strip.',
    palette: {
      skyTop: '#2e4a7a', skyMid: '#e8907c', skyBot: '#f7c98b',
      sun: '#ffd98a', sunX: 0.78, sunY: 0.3,
      far: '#8a7ba8', near: '#5d6b52', ground: '#4a6b3a', groundDark: '#33502c',
      grass: '#6d8f4e', river: '#5fa8c9', cloud: '#ffffff',
    },
    wind: { base: 0, gust: 0 },
    fuel: 100,
    seed: 101,
    rings: [
      { x: 1400, alt: 520, r: 90 },
      { x: 2600, alt: 640, r: 90 },
      { x: 3800, alt: 480, r: 90 },
      { x: 5000, alt: 700, r: 90 },
      { x: 6200, alt: 540, r: 90 },
      { x: 7400, alt: 620, r: 90 },
    ],
    runway: { x: 8600, len: 900, name: 'KESTREL FIELD' },
    start: { x: 200, alt: 500, speed: 120 },
    timeLimit: 240,
    brief: 'Fly the mail through six rings, mind the fuel, and land on Kestrel Field.',
  },
  {
    id: 'ridge',
    name: 'Storm Ridge',
    tagline: 'Five rings down a gusting valley. The wind wants the plane more than you do.',
    palette: {
      skyTop: '#232c3d', skyMid: '#4d5a6e', skyBot: '#8b93a0',
      sun: '#d8dde2', sunX: 0.22, sunY: 0.22,
      far: '#5a6474', near: '#3e4a3a', ground: '#37452e', groundDark: '#26301f',
      grass: '#4d5e3c', river: '#4d7a8c', cloud: '#c9ced6',
    },
    wind: { base: 0, gust: 26 },
    fuel: 90,
    seed: 207,
    rings: [
      { x: 1500, alt: 420, r: 85 },
      { x: 2700, alt: 580, r: 85 },
      { x: 3900, alt: 380, r: 85 },
      { x: 5100, alt: 560, r: 85 },
      { x: 6300, alt: 460, r: 85 },
    ],
    runway: { x: 7400, len: 650, name: 'RIDGE STRIP' },
    start: { x: 200, alt: 460, speed: 125 },
    timeLimit: 210,
    brief: 'Thread five rings through the ridge gusts and stop on a short strip.',
  },
  {
    id: 'beacon',
    name: 'Night Beacon',
    tagline: 'Four rings by lantern light. The beacon strip is the only lit ground for miles.',
    palette: {
      skyTop: '#0b1026', skyMid: '#1d2b52', skyBot: '#4a3f6e',
      sun: '#f2e3b3', sunX: 0.8, sunY: 0.24,
      far: '#2c3350', near: '#232a42', ground: '#1d2b22', groundDark: '#141d17',
      grass: '#2c4634', river: '#2f5a72', cloud: '#8a90b8',
    },
    wind: { base: 0, gust: 8 },
    fuel: 95,
    seed: 313,
    rings: [
      { x: 1600, alt: 540, r: 95 },
      { x: 3000, alt: 660, r: 95 },
      { x: 4400, alt: 500, r: 95 },
      { x: 5800, alt: 620, r: 95 },
    ],
    runway: { x: 7000, len: 800, name: 'BEACON FIELD' },
    start: { x: 200, alt: 520, speed: 120 },
    timeLimit: 220,
    brief: 'Follow the lanterns through four rings and land by the beacon.',
  },
];

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) ?? MISSIONS[0];
}
