// The valley Kestrel Courier flies over: seeded ground, a river, trees, a town
// by the strip, and the runway itself, all drawn from one seeded terrain.
import { mulberry32, range } from './rng.js';

function hashLattice(seed, i) {
  let h = (seed ^ Math.imul(i, 374761393)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function noise1(seed, x) {
  const i = Math.floor(x);
  const f = x - i;
  const a = hashLattice(seed, i);
  const b = hashLattice(seed, i + 1);
  return a + (b - a) * smooth(f);
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// World feet to screen pixels: x grows east, altitude grows up.
export function project(cam, x, alt, H) {
  return { x: (x - cam.x0) * cam.scale, y: H - (alt - cam.y0) * cam.scale };
}

export function makeTerrain(mission) {
  const seed = mission.seed;
  const runway = mission.runway;
  const runwayMid = runway.x + runway.len / 2;
  const riverX = 3250;
  const riverHalf = 260;

  function groundAt(x) {
    // Rolling valley floor: two octaves of value noise over a gentle rise.
    const n = noise1(seed, x / 1400) * 0.65 + noise1(seed + 77, x / 520) * 0.35;
    let h = 120 + n * 260;
    // A dip the river runs through.
    const dip = Math.exp(-((x - riverX) * (x - riverX)) / (2 * 260 * 260));
    h -= dip * 70;
    // Force the river channel low so water always shows.
    const dc = Math.abs(x - riverX);
    if (dc < riverHalf + 180) {
      const t = smooth(clamp((dc - riverHalf) / 180, 0, 1));
      h = 110 + (h - 110) * t;
    }
    // Flatten the runway strip so landings are fair.
    const d = Math.abs(x - runwayMid);
    const half = runway.len / 2 + 260;
    if (d < half) {
      const t = smooth(clamp((d - runway.len / 2) / 260, 0, 1));
      h = 150 + (h - 150) * t;
    }
    return h;
  }

  const rng = mulberry32(seed * 31 + 7);
  const trees = [];
  for (let x = 300; x < runway.x + runway.len + 1200; x += 90) {
    if (Math.abs(x - runwayMid) < runway.len / 2 + 120) continue;
    if (Math.abs(x - riverX) < riverHalf + 60) continue;
    if (rng() < 0.75) trees.push({ x, s: range(rng, 0.9, 1.9), lean: range(rng, -0.08, 0.08) });
  }
  const houses = [];
  for (let i = 0; i < 7; i++) {
    houses.push({
      x: runway.x - 1050 + i * 130,
      w: range(rng, 46, 78),
      h: range(rng, 30, 52),
      lit: rng() < 0.7,
    });
  }
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    clouds.push({ fx: rng(), fy: range(rng, 0.04, 0.38), s: range(rng, 0.7, 1.9), v: range(rng, 4, 11) });
  }
  const stars = [];
  for (let i = 0; i < 90; i++) {
    stars.push({ x: rng(), y: rng() * 0.55, r: range(rng, 0.6, 1.8), tw: range(rng, 0, 6.28) });
  }

  function drawSky(ctx, W, H, pal, time, night) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal.skyTop);
    g.addColorStop(0.55, pal.skyMid);
    g.addColorStop(1, pal.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (night) {
      ctx.fillStyle = '#ffffff';
      for (const s of stars) {
        ctx.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(time * 0.7 + s.tw));
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const sx = pal.sunX * W;
    const sy = pal.sunY * H;
    const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 130);
    glow.addColorStop(0, pal.sun);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 140, sy - 140, 280, 280);
    ctx.fillStyle = pal.sun;
    ctx.beginPath();
    ctx.arc(sx, sy, night ? 26 : 34, 0, 6.2832);
    ctx.fill();
    if (night) {
      ctx.fillStyle = pal.skyTop;
      ctx.beginPath();
      ctx.arc(sx + 12, sy - 8, 24, 0, 6.2832);
      ctx.fill();
    }
    ctx.fillStyle = pal.cloud;
    for (const c of clouds) {
      const cx = (((c.fx * (W + 400) + time * c.v) % (W + 400)) + (W + 400)) % (W + 400) - 200;
      const cy = c.fy * H;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 90 * c.s, 20 * c.s, 0, 0, 6.2832);
      ctx.ellipse(cx + 55 * c.s, cy + 8 * c.s, 60 * c.s, 15 * c.s, 0, 0, 6.2832);
      ctx.ellipse(cx - 55 * c.s, cy + 9 * c.s, 55 * c.s, 14 * c.s, 0, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRidge(ctx, cam, W, H, baseAlt, amp, wave, seedOff, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-4, H + 4);
    for (let sx = 0; sx <= W; sx += 24) {
      const wx = cam.x0 + sx / cam.scale;
      const alt = baseAlt + noise1(seed + seedOff, wx / wave) * amp;
      const p = project(cam, wx, alt, H);
      ctx.lineTo(sx, p.y);
    }
    ctx.lineTo(W + 4, H + 4);
    ctx.closePath();
    ctx.fill();
  }

  function drawRidges(ctx, cam, W, H, pal) {
    ctx.globalAlpha = 0.8;
    drawRidge(ctx, cam, W, H, 560, 190, 2600, 5, pal.far);
    ctx.globalAlpha = 0.95;
    drawRidge(ctx, cam, W, H, 380, 150, 1700, 9, pal.near);
    ctx.globalAlpha = 1;
  }

  function drawGround(ctx, cam, W, H, pal, time, night) {
    // Ground profile.
    ctx.fillStyle = pal.ground;
    ctx.beginPath();
    ctx.moveTo(-4, H + 4);
    for (let sx = 0; sx <= W; sx += 10) {
      const wx = cam.x0 + sx / cam.scale;
      const p = project(cam, wx, groundAt(wx), H);
      ctx.lineTo(sx, p.y);
    }
    ctx.lineTo(W + 4, H + 4);
    ctx.closePath();
    ctx.fill();
    // Grass lip along the top edge.
    ctx.strokeStyle = pal.grass;
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let sx = 0; sx <= W; sx += 10) {
      const wx = cam.x0 + sx / cam.scale;
      const p = project(cam, wx, groundAt(wx), H);
      if (sx === 0) ctx.moveTo(sx, p.y);
      else ctx.lineTo(sx, p.y);
    }
    ctx.stroke();
    // The river: water where the dip drops below the waterline.
    const waterAlt = 150;
    const topPts = [];
    const botPts = [];
    for (let sx = 0; sx <= W; sx += 10) {
      const wx = cam.x0 + sx / cam.scale;
      if (Math.abs(wx - riverX) > riverHalf) continue;
      const g = groundAt(wx);
      if (g >= waterAlt - 2) continue;
      topPts.push([sx, project(cam, wx, waterAlt, H).y]);
      botPts.push([sx, project(cam, wx, g, H).y]);
    }
    if (topPts.length > 1) {
      ctx.fillStyle = pal.river;
      ctx.beginPath();
      ctx.moveTo(topPts[0][0], topPts[0][1]);
      for (const [x, y] of topPts) ctx.lineTo(x, y);
      for (let i = botPts.length - 1; i >= 0; i--) ctx.lineTo(botPts[i][0], botPts[i][1]);
      ctx.closePath();
      ctx.fill();
      // A glint on the water.
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      const topY = project(cam, riverX, waterAlt, H).y;
      ctx.beginPath();
      ctx.moveTo(project(cam, riverX - riverHalf, waterAlt, H).x, topY);
      ctx.lineTo(project(cam, riverX + riverHalf, waterAlt, H).x, topY);
      ctx.stroke();
    }
    // Trees.
    for (const t of trees) {
      const p = project(cam, t.x, groundAt(t.x), H);
      if (p.x < -40 || p.x > W + 40) continue;
      const h = 44 * t.s * cam.scale;
      const w = 20 * t.s * cam.scale;
      ctx.fillStyle = pal.groundDark;
      ctx.fillRect(p.x - 2, p.y - h * 0.35, 4, h * 0.35);
      ctx.fillStyle = pal.grass;
      ctx.beginPath();
      ctx.moveTo(p.x - w / 2 + t.lean * h, p.y - h * 0.3);
      ctx.lineTo(p.x + t.lean * h, p.y - h);
      ctx.lineTo(p.x + w / 2 + t.lean * h, p.y - h * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    // The town by the strip.
    for (const hs of houses) {
      const p = project(cam, hs.x, groundAt(hs.x), H);
      if (p.x < -100 || p.x > W + 100) continue;
      const w = hs.w * cam.scale;
      const h = hs.h * cam.scale;
      ctx.fillStyle = '#3a2f28';
      ctx.fillRect(p.x, p.y - h, w, h);
      ctx.fillStyle = '#5a3a28';
      ctx.beginPath();
      ctx.moveTo(p.x - 3, p.y - h);
      ctx.lineTo(p.x + w / 2, p.y - h - h * 0.45);
      ctx.lineTo(p.x + w + 3, p.y - h);
      ctx.closePath();
      ctx.fill();
      if (hs.lit) {
        ctx.fillStyle = night ? '#ffd98a' : '#ffe9b0';
        ctx.fillRect(p.x + w * 0.2, p.y - h * 0.62, w * 0.2, h * 0.3);
        ctx.fillRect(p.x + w * 0.6, p.y - h * 0.62, w * 0.2, h * 0.3);
      }
    }
    // The runway.
    const r0 = project(cam, runway.x, 150, H);
    const r1 = project(cam, runway.x + runway.len, 150, H);
    ctx.fillStyle = '#23282e';
    ctx.fillRect(r0.x, r0.y - 5, r1.x - r0.x, 10);
    ctx.fillStyle = '#f2f2f2';
    for (let x = r0.x + 18; x < r1.x - 18; x += 46) {
      ctx.fillRect(x, r0.y - 1, 24, 2);
    }
    for (const bx of [r0.x + 8, r1.x - 14]) {
      ctx.fillRect(bx, r0.y - 5, 6, 10);
    }
    ctx.textAlign = 'center';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(8, 20, 32, 0.85)';
    ctx.lineWidth = 4;
    const midX = (r0.x + r1.x) / 2;
    ctx.strokeText(runway.name, midX, r0.y - 18);
    ctx.fillText(runway.name, midX, r0.y - 18);
    // Edge lights and a windsock.
    for (let x = r0.x + 30; x < r1.x - 10; x += 70) {
      ctx.fillStyle = night ? '#ffb84d' : '#e8c87a';
      ctx.beginPath();
      ctx.arc(x, r0.y - 8, night ? 3.5 : 2.5, 0, 6.2832);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, r0.y + 4, night ? 3.5 : 2.5, 0, 6.2832);
      ctx.fill();
    }
    const sock = project(cam, runway.x - 60, 150, H);
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sock.x, sock.y);
    ctx.lineTo(sock.x, sock.y - 34);
    ctx.stroke();
    ctx.fillStyle = '#e0703a';
    ctx.beginPath();
    ctx.moveTo(sock.x, sock.y - 34);
    ctx.lineTo(sock.x + 22, sock.y - 28);
    ctx.lineTo(sock.x, sock.y - 22);
    ctx.closePath();
    ctx.fill();
    void time;
  }

  function drawRings(ctx, cam, W, H, rings) {
    const next = rings.find((r) => !r.hit);
    rings.forEach((ring, i) => {
      const p = project(cam, ring.x, ring.alt, H);
      const r = ring.r * cam.scale;
      if (p.x < -r - 60 || p.x > W + r + 60) {
        // Off-screen rings are skipped, except the next one gets an edge marker.
        if (next === ring && p.x > W) {
          const y = Math.max(90, Math.min(H - 90, p.y));
          ctx.fillStyle = '#ffb84d';
          ctx.beginPath();
          ctx.moveTo(W - 26, y - 12);
          ctx.lineTo(W - 26, y + 12);
          ctx.lineTo(W - 6, y);
          ctx.closePath();
          ctx.fill();
          ctx.font = '700 13px system-ui, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`RING ${i + 1}`, W - 30, y + 30);
        }
        return;
      }
      ctx.save();
      ctx.shadowColor = ring.hit ? '#7ec87e' : '#ffb84d';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = ring.hit ? '#7ec87e' : '#ffb84d';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 6.2832);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r - 8, 0, 6.2832);
      ctx.stroke();
      ctx.restore();
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = ring.hit ? '#7ec87e' : '#ffffff';
      ctx.strokeStyle = 'rgba(8, 20, 32, 0.85)';
      ctx.lineWidth = 4;
      ctx.strokeText(String(i + 1), p.x, p.y - r - 10);
      ctx.fillText(String(i + 1), p.x, p.y - r - 10);
      if (ring.hit) {
        ctx.font = '700 26px system-ui, sans-serif';
        ctx.fillStyle = '#7ec87e';
        ctx.fillText('✓', p.x, p.y + 9);
      }
    });
  }

  function drawPlaneShadow(ctx, cam, H, plane) {
    const g = groundAt(plane.x);
    const clearance = plane.alt - g;
    if (clearance > 320 || clearance < 0) return;
    const p = project(cam, plane.x, g, H);
    ctx.fillStyle = `rgba(8, 20, 32, ${0.32 * (1 - clearance / 320)})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 4, 46 * cam.scale * 0.85, 7 * cam.scale * 0.85, 0, 0, 6.2832);
    ctx.fill();
  }

  return { groundAt, drawSky, drawRidges, drawGround, drawRings, drawPlaneShadow };
}
