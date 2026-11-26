// The Kestrel Courier herself: a small single-prop mail plane, her physics, and
// the way she looks in the air, on the ground, and in a heap.
export function makePlane(mission) {
  return {
    x: mission.start.x,
    alt: mission.start.alt,
    speed: mission.start.speed,
    pitch: 0,
    throttle: 0.55,
    fuel: mission.fuel,
    damage: 0,
    vspeed: 0,
    gearDown: false,
    onGround: false,
    fuelWarned: false,
    ringsHit: 0,
    score: 0,
    time: 0,
    message: '',
    messageT: 0,
    landed: false,
    crashed: false,
    cause: '',
    done: false,
  };
}

const KT_TO_FPS = 1.6878;
const STALL_KT = 62;
const MAX_SPEED_KT = 210;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// One simulation step. input: { pitch: -1|0|1, throttle: -1|0|1 }.
// gust: vertical wind in ft/s, positive up. Returns event names for sound.
export function stepPlane(P, input, mission, terrain, dt, gust) {
  if (P.done) return [];
  const events = [];
  P.time += dt;
  // Throttle: Left/Right move it; it stays where you leave it.
  P.throttle = clamp(P.throttle + input.throttle * 0.55 * dt, 0, 1);
  if (P.fuel <= 0) P.throttle = 0;
  // Pitch: Up/Down steer; hands off and she levels herself.
  const pitchTarget = input.pitch * 24;
  P.pitch += clamp(pitchTarget - P.pitch, -38 * dt, 38 * dt);
  if (input.pitch === 0) P.pitch += (0 - P.pitch) * Math.min(1, 1.4 * dt);
  // Speed chases the throttle.
  const targetSpeed = 55 + P.throttle * 155;
  P.speed += (targetSpeed - P.speed) * Math.min(1, 0.55 * dt);
  P.speed = clamp(P.speed, 0, MAX_SPEED_KT);
  // Lift and sink.
  const pitchRad = (P.pitch * Math.PI) / 180;
  let vs = P.speed * KT_TO_FPS * Math.sin(pitchRad);
  const stalled = P.speed < STALL_KT;
  if (stalled) {
    vs -= (STALL_KT - P.speed) * 1.1;
    P.pitch += (-14 - P.pitch) * Math.min(1, 1.2 * dt);
    if (P.messageT <= 0) {
      P.message = 'STALL — NOSE DOWN, ADD POWER';
      P.messageT = 1.6;
    }
    events.push('stall');
  }
  vs += gust;
  P.vspeed = vs;
  P.x += P.speed * KT_TO_FPS * Math.cos(pitchRad) * dt;
  P.alt += vs * dt;
  // Fuel burns with throttle.
  P.fuel = Math.max(0, P.fuel - (0.35 + P.throttle * 0.9) * dt);
  if (P.fuel <= 0 && !P.fuelWarned) {
    P.fuelWarned = true;
    P.message = 'FUEL EMPTY — GLIDE HER IN';
    P.messageT = 2.5;
    events.push('fuel');
  }
  // Gear comes down by itself when slow and low.
  const ground = terrain.groundAt(P.x);
  const clearance = P.alt - ground;
  P.gearDown = P.speed < 98 && clearance < 140;
  // Rings.
  for (const ring of mission.rings) {
    if (ring.hit) continue;
    const dx = P.x - ring.x;
    const dy = P.alt - ring.alt;
    if (dx * dx + dy * dy < ring.r * ring.r) {
      ring.hit = true;
      P.ringsHit++;
      P.score += 250;
      P.message = `RING ${P.ringsHit} OF ${mission.rings.length} — +250`;
      P.messageT = 1.8;
      events.push('ring');
    }
  }
  if (P.messageT > 0) P.messageT -= dt;
  // The ground decides the ending.
  if (clearance <= 0) {
    P.alt = ground;
    const onStrip = P.x >= mission.runway.x && P.x <= mission.runway.x + mission.runway.len;
    const gentle = Math.abs(vs) < 13 && P.speed < 155 && P.speed > 50;
    if (onStrip && gentle && !stalled) {
      P.landed = true;
      P.done = true;
      P.onGround = true;
      const soft = Math.max(0, 300 - Math.abs(vs) * 14);
      P.score += Math.round(soft + P.fuel * 2 + Math.max(0, 400 - P.time * 2));
      P.message = 'TOUCHDOWN — MAIL DELIVERED';
      P.messageT = 99;
      events.push('landed');
    } else {
      P.crashed = true;
      P.done = true;
      P.damage = 100;
      P.cause = onStrip ? 'TOO HARD ON THE STRIP' : 'TERRAIN STRIKE';
      P.message = P.cause;
      P.messageT = 99;
      events.push('crashed');
    }
  }
  if (P.time > mission.timeLimit && !P.done) {
    P.done = true;
    P.cause = 'OUT OF TIME';
    P.message = 'OUT OF TIME — THE MAIL IS LATE';
    P.messageT = 99;
    events.push('crashed');
  }
  return events;
}

export function drawPlane(ctx, P, cam, H, time, night) {
  const sx = (P.x - cam.x0) * cam.scale;
  const sy = H - (P.alt - cam.y0) * cam.scale;
  const s = cam.scale * 0.85;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate((-P.pitch * Math.PI) / 180);
  ctx.scale(s, s);
  // Landing light cone at night, or when the gear is down.
  if (night || P.gearDown) {
    const grad = ctx.createLinearGradient(70, 0, 260, 0);
    grad.addColorStop(0, 'rgba(255, 240, 190, 0.35)');
    grad.addColorStop(1, 'rgba(255, 240, 190, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(70, -4);
    ctx.lineTo(260, -52);
    ctx.lineTo(260, 52);
    ctx.lineTo(70, 4);
    ctx.closePath();
    ctx.fill();
  }
  // Tail: fin and stabiliser.
  ctx.fillStyle = '#2e7f86';
  ctx.beginPath();
  ctx.moveTo(-58, -6);
  ctx.lineTo(-72, -42);
  ctx.lineTo(-52, -42);
  ctx.lineTo(-38, -8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#256a70';
  ctx.beginPath();
  ctx.moveTo(-56, 2);
  ctx.lineTo(-78, 12);
  ctx.lineTo(-58, 16);
  ctx.lineTo(-42, 6);
  ctx.closePath();
  ctx.fill();
  // Main wing, swept back under the fuselage.
  ctx.fillStyle = '#2e7f86';
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.lineTo(18, 2);
  ctx.lineTo(-6, 34);
  ctx.lineTo(-30, 34);
  ctx.closePath();
  ctx.fill();
  // Fuselage: cream body, teal belly stripe.
  ctx.fillStyle = '#f4ead2';
  ctx.beginPath();
  ctx.moveTo(78, -2);
  ctx.quadraticCurveTo(72, -16, 46, -17);
  ctx.lineTo(-30, -14);
  ctx.quadraticCurveTo(-62, -12, -66, -4);
  ctx.lineTo(-66, 4);
  ctx.quadraticCurveTo(-40, 14, 10, 14);
  ctx.quadraticCurveTo(58, 12, 78, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2e7f86';
  ctx.beginPath();
  ctx.moveTo(-64, 4);
  ctx.lineTo(74, 2);
  ctx.lineTo(72, 8);
  ctx.lineTo(-40, 13);
  ctx.closePath();
  ctx.fill();
  // Cockpit windows, lit amber.
  ctx.fillStyle = '#ffb84d';
  ctx.beginPath();
  ctx.moveTo(52, -13);
  ctx.lineTo(62, -13);
  ctx.lineTo(58, -4);
  ctx.lineTo(48, -4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(36, -14);
  ctx.lineTo(46, -14);
  ctx.lineTo(43, -4);
  ctx.lineTo(32, -4);
  ctx.closePath();
  ctx.fill();
  // KESTREL on the fuselage.
  ctx.fillStyle = '#1f4d52';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KESTREL', 6, 10);
  // Landing gear.
  if (P.gearDown) {
    ctx.strokeStyle = '#2a2f36';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-28, 12);
    ctx.lineTo(-28, 26);
    ctx.moveTo(34, 12);
    ctx.lineTo(34, 26);
    ctx.stroke();
    ctx.fillStyle = '#1a1d20';
    ctx.beginPath();
    ctx.arc(-28, 30, 6, 0, 6.2832);
    ctx.arc(34, 30, 6, 0, 6.2832);
    ctx.fill();
  }
  // Propeller: spinning blades over a blurred disc.
  ctx.fillStyle = 'rgba(220, 230, 235, 0.22)';
  ctx.beginPath();
  ctx.ellipse(80, -2, 7, 30, 0, 0, 6.2832);
  ctx.fill();
  const ang = time * 26;
  ctx.strokeStyle = '#2a2f36';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(80 - Math.sin(ang) * 28, -2 - Math.cos(ang) * 28);
  ctx.lineTo(80 + Math.sin(ang) * 28, -2 + Math.cos(ang) * 28);
  ctx.stroke();
  ctx.fillStyle = '#d8d8d8';
  ctx.beginPath();
  ctx.arc(80, -2, 5, 0, 6.2832);
  ctx.fill();
  // Navigation lights: red tail, white strobe.
  ctx.fillStyle = '#e05252';
  ctx.beginPath();
  ctx.arc(-66, -4, 3, 0, 6.2832);
  ctx.fill();
  if (Math.sin(time * 6) > 0.2) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-60, -40, 3.5, 0, 6.2832);
    ctx.fill();
  }
  ctx.restore();
}
