// Kestrel Courier: the game itself — title, briefing, flight, landings and
// crashes — plus the deterministic screenshot scenes (?shot=<name>&seed=<n>).
import { MISSIONS, missionById } from './missions.js';
import { makeTerrain } from './terrain.js';
import { makePlane, stepPlane, drawPlane } from './plane.js';
import { drawHud, fmtTime } from './hud.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { shotParams, sceneFor } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W = 0;
let H = 0;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const input = makeInput(canvas);
const audio = makeAudio();
const params = shotParams();

const game = {
  phase: 'title', // title | brief | fly | landed | crashed
  missionIndex: 0,
  mission: null,
  terrain: null,
  plane: null,
  cam: { x0: 0, y0: 0, scale: 1 },
  time: 0,
  lastBeep: 0,
  ui: [],
};

function startMission(index, flyNow) {
  game.missionIndex = index % MISSIONS.length;
  game.mission = JSON.parse(JSON.stringify(MISSIONS[game.missionIndex]));
  game.terrain = makeTerrain(game.mission);
  game.plane = makePlane(game.mission);
  game.cam.scale = H / 900;
  game.cam.x0 = game.plane.x - (0.3 * W) / game.cam.scale;
  game.cam.y0 = 0;
  game.time = 0;
  game.lastBeep = 0;
  game.phase = flyNow ? 'fly' : 'brief';
  if (flyNow) audio.unlock();
}

function toTitle() {
  game.mission = JSON.parse(JSON.stringify(MISSIONS[game.missionIndex]));
  game.terrain = makeTerrain(game.mission);
  game.plane = null;
  game.cam.scale = H / 900;
  game.cam.x0 = 0;
  game.cam.y0 = 0;
  game.phase = 'title';
  audio.engine(0, false);
}

function setupShot() {
  const scene = sceneFor(params.shot);
  if (!scene) return false;
  if (scene.title) {
    game.mission = JSON.parse(JSON.stringify(missionById('mail')));
    game.terrain = makeTerrain(game.mission);
    game.missionIndex = 0;
    game.cam.scale = H / 900;
    game.cam.x0 = 0;
    game.cam.y0 = 0;
    game.time = 0;
    game.phase = 'title';
    return true;
  }
  const def = missionById(scene.mission);
  game.mission = JSON.parse(JSON.stringify(def));
  game.terrain = makeTerrain(game.mission);
  game.plane = makePlane(game.mission);
  Object.assign(game.plane, scene.plane);
  game.plane.time = scene.time;
  game.plane.vspeed = game.plane.speed * 1.6878 * Math.sin((game.plane.pitch * Math.PI) / 180);
  game.plane.message = scene.message || '';
  game.plane.messageT = scene.messageT || 0;
  game.plane.gearDown = scene.plane.alt - game.terrain.groundAt(scene.plane.x) < 140;
  game.mission.rings.forEach((ring, i) => {
    ring.hit = i < scene.plane.ringsHit;
  });
  game.time = scene.time;
  game.cam.scale = H / 900;
  game.cam.x0 = game.plane.x - (0.3 * W) / game.cam.scale;
  game.cam.y0 = Math.max(0, Math.min(420, game.plane.alt - 520));
  game.phase = scene.phase || 'fly';
  if (scene.phase === 'landed') {
    game.plane.landed = true;
    game.plane.done = true;
    game.plane.onGround = true;
    game.plane.gearDown = true;
  }
  return true;
}

function wrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawTitle() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(8, 20, 32, 0.55)';
  ctx.fillRect(0, H * 0.08, W, 150);
  ctx.fillStyle = '#ffd98a';
  ctx.font = '700 62px system-ui, sans-serif';
  ctx.fillText('KESTREL COURIER', W / 2, H * 0.16 + 20);
  ctx.fillStyle = '#e8f2f7';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('A mail plane, three valleys, one strip at the end of each.', W / 2, H * 0.16 + 56);
  const cw = (W - 160 - 48) / 3;
  const ch = 168;
  const cy = H * 0.42;
  MISSIONS.forEach((m, i) => {
    const x = 80 + i * (cw + 24);
    const selected = i === game.missionIndex;
    ctx.fillStyle = selected ? 'rgba(255, 216, 138, 0.92)' : 'rgba(8, 20, 32, 0.78)';
    ctx.fillRect(x, cy, cw, ch);
    ctx.strokeStyle = selected ? '#ffd98a' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.strokeRect(x, cy, cw, ch);
    ctx.fillStyle = selected ? '#1a2a38' : '#ffd98a';
    ctx.font = '700 21px system-ui, sans-serif';
    ctx.fillText(m.name, x + cw / 2, cy + 36);
    ctx.fillStyle = selected ? '#1a2a38' : '#dbe9f2';
    ctx.font = '13px system-ui, sans-serif';
    const lines = wrapText(m.tagline, cw - 32);
    lines.forEach((ln, li) => ctx.fillText(ln, x + cw / 2, cy + 66 + li * 19));
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillStyle = selected ? '#1a2a38' : '#9fb8c8';
    ctx.fillText(`PRESS ${i + 1}  ·  ${m.rings.length} RINGS  ·  FUEL ${m.fuel}`, x + cw / 2, cy + ch - 18);
    game.ui.push({ x, y: cy, w: cw, h: ch, action: 'mission', index: i });
  });
  ctx.fillStyle = '#e8f2f7';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('↑ ↓ choose  ·  ENTER fly  ·  1 / 2 / 3 quick pick', W / 2, H - 42);
  ctx.fillStyle = '#9fb8c8';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Keyboard and mouse · No network, no downloads — the whole game is in these files', W / 2, H - 20);
}

function drawBrief() {
  const m = game.mission;
  const w = 560;
  const h = 300;
  const x = (W - w) / 2;
  const y = (H - h) / 2;
  ctx.fillStyle = 'rgba(8, 20, 32, 0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffd98a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd98a';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText(m.name.toUpperCase(), W / 2, y + 44);
  ctx.fillStyle = '#e8f2f7';
  ctx.font = '15px system-ui, sans-serif';
  const lines = wrapText(m.brief, w - 64);
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, y + 82 + i * 22));
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#9fb8c8';
  ctx.fillText(
    `${m.rings.length} RINGS  ·  FUEL ${m.fuel}  ·  ${m.runway.name} ${m.runway.len} FT  ·  LIMIT ${fmtTime(m.timeLimit)}`,
    W / 2,
    y + h - 78,
  );
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.fillText('ENTER or click to fly', W / 2, y + h - 44);
  ctx.fillStyle = '#9fb8c8';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('M — back to missions', W / 2, y + h - 22);
  game.ui.push({ x, y, w, h, action: 'fly' });
}

function drawEnd() {
  const P = game.plane;
  const m = game.mission;
  const w = 520;
  const h = 290;
  const x = (W - w) / 2;
  const y = (H - h) / 2;
  ctx.fillStyle = 'rgba(8, 20, 32, 0.9)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = P.landed ? '#7ec87e' : '#e05252';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = P.landed ? '#7ec87e' : '#e05252';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.fillText(P.landed ? 'MAIL DELIVERED' : `DOWN — ${P.cause}`, W / 2, y + 48);
  ctx.fillStyle = '#e8f2f7';
  ctx.font = '15px system-ui, sans-serif';
  const rows = [
    `RINGS  ${P.ringsHit} / ${m.rings.length}  (+${P.ringsHit * 250})`,
    `TIME  ${fmtTime(P.time)}`,
    `FUEL LEFT  ${Math.round(P.fuel)}`,
    `SCORE  ${P.score}`,
  ];
  rows.forEach((row, i) => ctx.fillText(row, W / 2, y + 92 + i * 26));
  const bw = 200;
  const bh = 44;
  const by = y + h - 62;
  ctx.fillStyle = '#ffd98a';
  ctx.fillRect(W / 2 - bw - 12, by, bw, bh);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(W / 2 + 12, by, bw, bh);
  ctx.strokeStyle = '#ffd98a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(W / 2 + 12, by, bw, bh);
  ctx.fillStyle = '#1a2a38';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText('FLY AGAIN (R)', W / 2 - bw / 2 - 12, by + 28);
  ctx.fillStyle = '#e8f2f7';
  ctx.fillText('MISSIONS (M)', W / 2 + bw / 2 + 12, by + 28);
  game.ui.push({ x: W / 2 - bw - 12, y: by, w: bw, h: bh, action: 'again' });
  game.ui.push({ x: W / 2 + 12, y: by, w: bw, h: bh, action: 'missions' });
}

function handleClick() {
  const c = input.takeClick();
  if (!c) return;
  audio.unlock();
  for (const u of game.ui) {
    if (c.x >= u.x && c.x <= u.x + u.w && c.y >= u.y && c.y <= u.y + u.h) {
      if (u.action === 'mission') startMission(u.index, false);
      else if (u.action === 'fly') game.phase = 'fly';
      else if (u.action === 'again') startMission(game.missionIndex, true);
      else if (u.action === 'missions') toTitle();
      return;
    }
  }
  if (game.phase === 'brief') game.phase = 'fly';
}

function draw() {
  const m = game.mission;
  const pal = m.palette;
  const night = m.id === 'beacon';
  game.ui = [];
  game.terrain.drawSky(ctx, W, H, pal, game.time, night);
  game.terrain.drawRidges(ctx, game.cam, W, H, pal);
  game.terrain.drawGround(ctx, game.cam, W, H, pal, game.time, night);
  game.terrain.drawRings(ctx, game.cam, W, H, m.rings);
  if (game.plane) {
    game.terrain.drawPlaneShadow(ctx, game.cam, H, game.plane);
    drawPlane(ctx, game.plane, game.cam, H, game.time, night);
  }
  if (game.phase === 'fly' || game.phase === 'landed' || game.phase === 'crashed') {
    drawHud(ctx, game.plane, m, W, H, game.time);
  }
  if (game.phase === 'title') drawTitle();
  else if (game.phase === 'brief') drawBrief();
  else if (game.phase === 'landed' || game.phase === 'crashed') drawEnd();
}

function tick(dt) {
  audio.unlock();
  if (game.phase === 'title' || game.phase === 'brief') game.time += dt;
  if (game.phase === 'title') {
    if (input.wasPressed('1')) startMission(0, false);
    else if (input.wasPressed('2')) startMission(1, false);
    else if (input.wasPressed('3')) startMission(2, false);
    else if (input.wasPressed('up')) game.missionIndex = Math.max(0, game.missionIndex - 1);
    else if (input.wasPressed('down')) game.missionIndex = Math.min(MISSIONS.length - 1, game.missionIndex + 1);
    else if (input.wasPressed('enter') || input.wasPressed('space')) startMission(game.missionIndex, false);
    handleClick();
    return;
  }
  if (game.phase === 'brief') {
    if (input.wasPressed('enter') || input.wasPressed('space')) game.phase = 'fly';
    else if (input.wasPressed('m')) toTitle();
    handleClick();
    return;
  }
  if (game.phase === 'fly') {
    const P = game.plane;
    const w = game.mission.wind;
    const gust = Math.sin(game.time * 0.9) * w.gust * 0.5 + Math.sin(game.time * 2.7 + 1.3) * w.gust * 0.45;
    game.time += dt;
    const events = stepPlane(P, input, game.mission, game.terrain, dt, gust);
    for (const ev of events) {
      if (ev === 'ring') audio.chime();
      else if (ev === 'landed' || ev === 'crashed') audio.thud();
      else if (ev === 'fuel') audio.beep();
      else if (ev === 'stall' && game.time - game.lastBeep > 1) {
        game.lastBeep = game.time;
        audio.beep();
      }
    }
    audio.engine(P.throttle, true);
    const targetX = P.x - (0.3 * W) / game.cam.scale;
    const targetY = Math.max(0, Math.min(420, P.alt - 520));
    const k = Math.min(1, 5 * dt);
    game.cam.x0 += (targetX - game.cam.x0) * k;
    game.cam.y0 += (targetY - game.cam.y0) * k;
    if (P.done) game.phase = P.landed ? 'landed' : 'crashed';
    if (input.wasPressed('r')) startMission(game.missionIndex, true);
    else if (input.wasPressed('m')) toTitle();
    return;
  }
  // landed / crashed
  if (input.wasPressed('r') || input.wasPressed('enter')) startMission(game.missionIndex, true);
  else if (input.wasPressed('m')) toTitle();
  audio.engine(0, false);
  handleClick();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(dt);
  draw();
  requestAnimationFrame(frame);
}

if (params.shot && setupShot()) {
  // A screenshot scene: one frozen frame, no loop.
  draw();
} else {
  game.mission = JSON.parse(JSON.stringify(MISSIONS[0]));
  game.terrain = makeTerrain(game.mission);
  game.cam.scale = H / 900;
  game.cam.x0 = 0;
  game.cam.y0 = 0;
  requestAnimationFrame(frame);
}
