// The instruments: what the pilot sees — altitude, speed, heading, vertical
// speed, fuel, damage, rings, time and score, plus an attitude ball and an
// altimeter dial that glow amber like flown instruments.

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function bigNumber(ctx, label, value, unit, x, y) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9fb8c8';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(label, x, y - 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText(value, x, y + 8);
  ctx.fillStyle = '#9fb8c8';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(unit, x, y + 24);
}

function bar(ctx, label, frac, x, y, w, color) {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#cfe3ee';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(label, x, y + 11);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 44, y, w, 12);
  ctx.fillStyle = color;
  ctx.fillRect(x + 44, y, Math.max(0, w * clamp(frac, 0, 1)), 12);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 44, y, w, 12);
}

function drawAttitude(ctx, P, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(8, 20, 32, 0.72)';
  ctx.beginPath();
  ctx.arc(0, 0, r + 6, 0, 6.2832);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 6.2832);
  ctx.clip();
  ctx.rotate((-P.pitch * Math.PI) / 180);
  ctx.fillStyle = '#7fb2d9';
  ctx.fillRect(-r, -r, r * 2, r);
  ctx.fillStyle = '#8a6a42';
  ctx.fillRect(-r, 0, r * 2, r);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-r, -1.5, r * 2, 3);
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#ffd98a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 6.2832);
  ctx.stroke();
  ctx.strokeStyle = '#ffd98a';
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(14, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 8);
  ctx.stroke();
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cfe3ee';
  ctx.fillText('ATT', 0, r + 20);
  ctx.restore();
}

function drawAltimeter(ctx, P, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(8, 20, 32, 0.72)';
  ctx.beginPath();
  ctx.arc(0, 0, r + 6, 0, 6.2832);
  ctx.fill();
  ctx.fillStyle = '#101c26';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 6.2832);
  ctx.fill();
  ctx.strokeStyle = '#ffd98a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 6.2832);
  ctx.stroke();
  for (let a = 0; a < 1000; a += 100) {
    const ang = (a / 1000) * 6.2832 - Math.PI / 2;
    const x1 = Math.cos(ang) * (r - 6);
    const y1 = Math.sin(ang) * (r - 6);
    const x2 = Math.cos(ang) * (r - 13);
    const y2 = Math.sin(ang) * (r - 13);
    ctx.strokeStyle = '#cfe3ee';
    ctx.lineWidth = a % 500 === 0 ? 2.5 : 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  const needle = ((P.alt % 1000) / 1000) * 6.2832 - Math.PI / 2;
  ctx.strokeStyle = '#ffb84d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(needle) * (r - 10), Math.sin(needle) * (r - 10));
  ctx.stroke();
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, 6.2832);
  ctx.fill();
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cfe3ee';
  ctx.fillText('ALT', 0, r + 20);
  ctx.restore();
}

export function drawHud(ctx, P, mission, W, H, time) {
  const pad = 16;
  ctx.save();
  // Top strip.
  ctx.fillStyle = '#0a1826';
  ctx.fillRect(0, 0, W, 66);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffd98a';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.fillText('KESTREL COURIER', pad, 24);
  ctx.fillStyle = '#cfe3ee';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(mission.name.toUpperCase(), pad, 44);
  // Centre numbers.
  const cx = W / 2;
  bigNumber(ctx, 'ALT', String(Math.round(P.alt)), 'FT', cx - 195, 34);
  bigNumber(ctx, 'SPD', String(Math.round(P.speed)), 'KT', cx - 65, 34);
  bigNumber(ctx, 'HDG', '090°', 'E', cx + 65, 34);
  bigNumber(ctx, 'V/S', `${P.vspeed >= 0 ? '+' : ''}${Math.round(P.vspeed * 60)}`, 'FPM', cx + 195, 34);
  // Right: rings, time, score.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd98a';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText(`RINGS ${P.ringsHit}/${mission.rings.length}`, W - pad, 27);
  ctx.fillStyle = '#cfe3ee';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`${fmtTime(P.time)}  ·  SCORE ${P.score}`, W - pad, 47);
  // Bottom-left: fuel and damage bars, throttle lever.
  const bx = pad;
  const by = H - 96;
  bar(ctx, 'FUEL', P.fuel / 100, bx, by, 170, P.fuel < 25 ? '#e05252' : '#ffb84d');
  bar(ctx, 'DMG', P.damage / 100, bx, by + 26, 170, P.damage > 50 ? '#e05252' : '#7ec87e');
  const tx = bx + 200;
  const ty = by - 6;
  ctx.fillStyle = 'rgba(8, 20, 32, 0.72)';
  ctx.fillRect(tx - 14, ty - 8, 30, 76);
  ctx.strokeStyle = '#cfe3ee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tx, ty + 60);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  const handleY = ty + 60 - P.throttle * 60;
  ctx.fillStyle = '#ffd98a';
  ctx.fillRect(tx - 9, handleY - 4, 18, 8);
  ctx.fillStyle = '#cfe3ee';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THR', tx, ty + 84);
  // Bottom-right: attitude ball and altimeter dial.
  drawAttitude(ctx, P, W - 66, H - 66, 46);
  drawAltimeter(ctx, P, W - 176, H - 66, 46);
  // Centre message.
  if (P.message && P.messageT > 0) {
    const a = Math.min(1, P.messageT);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(8, 20, 32, 0.8)';
    ctx.lineWidth = 6;
    ctx.strokeText(P.message, W / 2, 132);
    ctx.fillText(P.message, W / 2, 132);
    ctx.globalAlpha = 1;
  }
  // Controls hint early on.
  if (P.time < 7 && !P.done) {
    ctx.globalAlpha = 0.8;
    ctx.textAlign = 'center';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#e8f2f7';
    ctx.fillText('↑ ↓ pitch  ·  ← → throttle  ·  R restart  ·  M missions', W / 2, H - 18);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  void time;
}
