import "./style.css";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="scene" aria-hidden="true">
    <canvas id="water"></canvas>
    <div class="grain"></div>
    <div class="vignette"></div>
  </div>
  <main class="brand">
    <h1 id="mark" aria-label="fantrixx"></h1>
  </main>
`;

type Ripple = {
  x: number;
  y: number;
  r: number;
  max: number;
  life: number;
  strength: number;
};

type Wake = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
};

const canvas = document.querySelector<HTMLCanvasElement>("#water")!;
const ctx = canvas.getContext("2d")!;
const mark = document.querySelector<HTMLHeadingElement>("#mark")!;

const letters = "fantrixx".split("").map((ch, i) => {
  const span = document.createElement("span");
  span.className = "letter";
  span.textContent = ch;
  span.style.setProperty("--i", String(i));
  mark.appendChild(span);
  return span;
});

type LetterMotion = {
  el: HTMLSpanElement;
  pushX: number;
  pushY: number;
  velX: number;
  velY: number;
  lastHit: number;
  touching: boolean;
};

const letterMotion: LetterMotion[] = letters.map((el) => ({
  el,
  pushX: 0,
  pushY: 0,
  velX: 0,
  velY: 0,
  lastHit: 0,
  touching: false,
}));

let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let floating = false;

const ripples: Ripple[] = [];
const wakes: Wake[] = [];

let pointerX = -9999;
let pointerY = -9999;
let prevX = -9999;
let prevY = -9999;
let pointerActive = false;
let lastSpawn = 0;

const RETURN_DELAY_MS = 650;
const HIT_PADDING = 18;

function interactLetters(now: number) {
  for (const m of letterMotion) {
    const rect = m.el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = cx - pointerX;
    const dy = cy - pointerY;
    const reachX = rect.width * 0.5 + HIT_PADDING;
    const reachY = rect.height * 0.5 + HIT_PADDING;
    const near =
      pointerActive &&
      Math.abs(dx) <= reachX &&
      Math.abs(dy) <= reachY;

    if (near) {
      // Push away from the side the pointer touches
      let nx = dx;
      let ny = dy;
      const dist = Math.hypot(nx, ny) || 1;
      nx /= dist;
      ny /= dist;

      // Prefer the stronger contact axis so corner hits feel directional
      const ax = Math.abs(dx) / reachX;
      const ay = Math.abs(dy) / reachY;
      if (ax > ay * 1.15) ny *= 0.35;
      else if (ay > ax * 1.15) nx *= 0.35;

      const force = 0.55 + (1 - Math.min(1, dist / Math.max(reachX, reachY))) * 0.9;
      m.velX += nx * force * 1.8;
      m.velY += ny * force * 1.8;
      m.lastHit = now;
      m.touching = true;
    } else {
      m.touching = false;
    }

    // Drift with current velocity
    m.pushX += m.velX;
    m.pushY += m.velY;
    m.velX *= 0.9;
    m.velY *= 0.9;

    // Cap how far a letter can wander
    const maxPush = 42;
    const pushDist = Math.hypot(m.pushX, m.pushY);
    if (pushDist > maxPush) {
      m.pushX = (m.pushX / pushDist) * maxPush;
      m.pushY = (m.pushY / pushDist) * maxPush;
    }

    // After a short pause, gently drift home
    if (!m.touching && now - m.lastHit > RETURN_DELAY_MS) {
      m.velX += -m.pushX * 0.045;
      m.velY += -m.pushY * 0.045;
      m.pushX *= 0.965;
      m.pushY *= 0.965;
      if (Math.abs(m.pushX) < 0.15) m.pushX = 0;
      if (Math.abs(m.pushY) < 0.15) m.pushY = 0;
    }
  }
}

function updateFloat(now: number) {
  interactLetters(now);

  const t = now * 0.001;
  const groupX = floating
    ? Math.sin(t * 0.22) * 6 + Math.sin(t * 0.41 + 0.8) * 3
    : 0;
  const groupY = floating
    ? Math.sin(t * 0.28 + 0.4) * 5 + Math.cos(t * 0.37) * 2.5
    : 0;

  mark.style.transform = `translate3d(${groupX.toFixed(2)}px, ${groupY.toFixed(2)}px, 0)`;

  letterMotion.forEach((m, i) => {
    const phase = i * 0.55;
    const driftX = floating
      ? Math.sin(t * 0.55 + phase) * 2.2 + Math.sin(t * 1.05 + phase * 1.3) * 1.1
      : 0;
    const driftY = floating
      ? Math.sin(t * 0.62 + phase * 0.9) * 5.5 +
        Math.sin(t * 1.15 + phase) * 2.4 +
        Math.cos(t * 0.48 + i * 0.35) * 1.6
      : 0;
    const driftRot = floating
      ? Math.sin(t * 0.5 + phase) * 2.4 + Math.sin(t * 0.9 + phase * 1.1) * 1.2
      : 0;

    const x = driftX + m.pushX;
    const y = driftY + m.pushY;
    const rot = driftRot + m.pushX * 0.08 - m.pushY * 0.05;
    const opacity = floating
      ? 0.78 + Math.sin(t * 0.45 + phase) * 0.08 + Math.sin(t * 0.9 + i) * 0.03
      : Number(m.el.style.opacity) || 0.88;

    if (floating || m.pushX !== 0 || m.pushY !== 0) {
      m.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`;
    }
    if (floating) m.el.style.opacity = opacity.toFixed(3);
  });
}

window.setTimeout(() => {
  floating = true;
  mark.classList.add("is-floating");
}, 3600);

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawnTrail(x: number, y: number, dx: number, dy: number, now: number) {
  const speed = Math.hypot(dx, dy);
  if (speed < 1.6) return;
  if (now - lastSpawn < 70) return;
  lastSpawn = now;

  const strength = Math.min(0.7, speed / 48);
  ripples.push({
    x,
    y,
    r: 4 + strength * 4,
    max: 36 + strength * 28,
    life: 1,
    strength,
  });

  if (Math.random() < 0.35) {
    const nx = -dy / (speed || 1);
    const ny = dx / (speed || 1);
    const side = Math.random() < 0.5 ? 1 : -1;
    wakes.push({
      x: x + nx * side * (4 + Math.random() * 8),
      y: y + ny * side * (4 + Math.random() * 8),
      vx: nx * side * (0.06 + Math.random() * 0.2) - dx * 0.006,
      vy: ny * side * (0.06 + Math.random() * 0.2) - dy * 0.006,
      life: 0.5 + Math.random() * 0.35,
      size: 0.8 + Math.random() * 1.2 * strength,
    });
  }

  if (ripples.length > 10) ripples.splice(0, ripples.length - 10);
  if (wakes.length > 18) wakes.splice(0, wakes.length - 18);
}

function onPointer(e: PointerEvent) {
  const x = e.clientX;
  const y = e.clientY;

  if (pointerActive) {
    spawnTrail(x, y, x - prevX, y - prevY, performance.now());
  }

  prevX = pointerX;
  prevY = pointerY;
  pointerX = x;
  pointerY = y;
  pointerActive = true;
}

function onPointerLeave() {
  pointerActive = false;
  pointerX = -9999;
  pointerY = -9999;
}

function drawOcean(now: number) {
  const t = now * 0.001;

  // deep night sea base
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#041018");
  base.addColorStop(0.35, "#061820");
  base.addColorStop(0.7, "#030b12");
  base.addColorStop(1, "#010507");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // distant moon path / soft sky glow
  const moon = ctx.createRadialGradient(
    width * 0.62,
    height * 0.12,
    0,
    width * 0.62,
    height * 0.12,
    height * 0.42,
  );
  moon.addColorStop(0, "rgba(150, 175, 190, 0.14)");
  moon.addColorStop(0.35, "rgba(70, 100, 120, 0.06)");
  moon.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, width, height);

  // rolling dark swell bands
  for (let band = 0; band < 8; band++) {
    const yBase = height * (0.14 + band * 0.11);
    const amp = 14 + band * 4.5;
    const speed = 0.16 + band * 0.045;
    const phase = band * 1.3;

    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 10) {
      const y =
        yBase +
        Math.sin(x * 0.0042 + t * speed + phase) * amp +
        Math.sin(x * 0.01 + t * speed * 1.35 + phase) * (amp * 0.4);
      if (x === 0) ctx.lineTo(0, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();

    const depth = 0.055 + band * 0.022;
    ctx.fillStyle = `rgba(${6 + band * 2}, ${24 + band * 5}, ${34 + band * 6}, ${depth})`;
    ctx.fill();

    // crest highlight
    ctx.beginPath();
    for (let x = 0; x <= width; x += 14) {
      const y =
        yBase +
        Math.sin(x * 0.0042 + t * speed + phase) * amp +
        Math.sin(x * 0.01 + t * speed * 1.35 + phase) * (amp * 0.4);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(140, 180, 200, ${0.025 + band * 0.004})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // surface shimmer / caustics
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const cx = ((Math.sin(t * 0.15 + i * 1.7) * 0.5 + 0.5) * width);
    const cy = height * (0.35 + i * 0.1) + Math.cos(t * 0.22 + i) * 28;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90 + i * 30);
    g.addColorStop(0, `rgba(120, 170, 190, ${0.035 + i * 0.004})`);
    g.addColorStop(0.45, `rgba(50, 100, 120, ${0.015})`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  // faint horizontal light streaks on water
  for (let i = 0; i < 18; i++) {
    const y =
      ((i / 18) * height + Math.sin(t * 0.3 + i) * 18 + height) % height;
    const alpha = 0.012 + (Math.sin(t * 0.8 + i * 0.7) * 0.5 + 0.5) * 0.02;
    ctx.strokeStyle = `rgba(170, 205, 220, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const x0 = ((Math.sin(t * 0.2 + i) * 0.5 + 0.5) * width * 0.7);
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + 40 + (i % 5) * 18, y + Math.sin(t + i) * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawInteraction() {
  // very soft finger pressure on the surface
  if (pointerActive) {
    const glow = ctx.createRadialGradient(
      pointerX,
      pointerY,
      0,
      pointerX,
      pointerY,
      36,
    );
    glow.addColorStop(0, "rgba(160, 190, 205, 0.035)");
    glow.addColorStop(0.5, "rgba(70, 110, 130, 0.015)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pointerX, pointerY, 36, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.r += 0.35 + r.strength * 0.25;
    r.life -= 0.008 + r.strength * 0.003;

    if (r.life <= 0 || r.r > r.max) {
      ripples.splice(i, 1);
      continue;
    }

    const alpha = r.life * (0.035 + r.strength * 0.04);
    ctx.strokeStyle = `rgba(160, 195, 210, ${alpha})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.r, r.r * 0.48, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = wakes.length - 1; i >= 0; i--) {
    const w = wakes[i];
    w.x += w.vx;
    w.y += w.vy;
    w.vx *= 0.985;
    w.vy *= 0.985;
    w.life -= 0.01;

    if (w.life <= 0) {
      wakes.splice(i, 1);
      continue;
    }

    const g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.size * 5);
    g.addColorStop(0, `rgba(170, 200, 215, ${0.05 * w.life})`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.size * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function tick(now: number) {
  updateFloat(now);
  drawOcean(now);
  drawInteraction();
  requestAnimationFrame(tick);
}

window.addEventListener("pointermove", onPointer, { passive: true });
window.addEventListener("pointerdown", onPointer, { passive: true });
window.addEventListener("pointerleave", onPointerLeave);
window.addEventListener("blur", onPointerLeave);
window.addEventListener("resize", resize);

resize();
requestAnimationFrame(tick);
