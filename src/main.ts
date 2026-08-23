import "./style.css";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="scene" aria-hidden="true">
    <canvas id="water"></canvas>
    <div class="grain"></div>
    <div class="vignette"></div>
  </div>
  <main class="brand">
    <h1 id="mark">fantrixx</h1>
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

function updateFloat(now: number) {
  if (!floating) return;

  const t = now * 0.001;
  const x =
    Math.sin(t * 0.35) * 14 +
    Math.sin(t * 0.71 + 1.2) * 7 +
    Math.sin(t * 1.15 + 0.4) * 3;
  const y =
    Math.sin(t * 0.48 + 0.6) * 10 +
    Math.sin(t * 0.93 + 2.1) * 5 +
    Math.cos(t * 1.4) * 2.5;
  const rot = Math.sin(t * 0.42) * 1.6 + Math.sin(t * 0.88 + 1.7) * 0.9;
  const opacity =
    0.84 + Math.sin(t * 0.55) * 0.06 + Math.sin(t * 1.1 + 0.8) * 0.03;

  mark.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`;
  mark.style.opacity = opacity.toFixed(3);
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
  if (speed < 0.8) return;
  if (now - lastSpawn < 28) return;
  lastSpawn = now;

  const strength = Math.min(1, speed / 32);
  ripples.push({
    x,
    y,
    r: 6 + strength * 8,
    max: 55 + strength * 70,
    life: 1,
    strength,
  });

  const nx = -dy / (speed || 1);
  const ny = dx / (speed || 1);
  const count = 1 + Math.floor(strength * 2);

  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    wakes.push({
      x: x + nx * side * (6 + Math.random() * 12),
      y: y + ny * side * (6 + Math.random() * 12),
      vx: nx * side * (0.15 + Math.random() * 0.55) - dx * 0.015,
      vy: ny * side * (0.15 + Math.random() * 0.55) - dy * 0.015,
      life: 0.45 + Math.random() * 0.4,
      size: 1.4 + Math.random() * 2.2 * strength,
    });
  }

  if (ripples.length > 22) ripples.splice(0, ripples.length - 22);
  if (wakes.length > 70) wakes.splice(0, wakes.length - 70);
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
  // finger highlight under pointer
  if (pointerActive) {
    const glow = ctx.createRadialGradient(
      pointerX,
      pointerY,
      0,
      pointerX,
      pointerY,
      48,
    );
    glow.addColorStop(0, "rgba(190, 220, 235, 0.16)");
    glow.addColorStop(0.35, "rgba(90, 150, 170, 0.07)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pointerX, pointerY, 48, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.r += 1.2 + r.strength * 1.1;
    r.life -= 0.016 + r.strength * 0.006;

    if (r.life <= 0 || r.r > r.max) {
      ripples.splice(i, 1);
      continue;
    }

    const alpha = r.life * (0.14 + r.strength * 0.16);
    ctx.strokeStyle = `rgba(175, 210, 225, ${alpha})`;
    ctx.lineWidth = 1 + r.strength;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.r, r.r * 0.52, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = wakes.length - 1; i >= 0; i--) {
    const w = wakes[i];
    w.x += w.vx;
    w.y += w.vy;
    w.vx *= 0.97;
    w.vy *= 0.97;
    w.life -= 0.018;

    if (w.life <= 0) {
      wakes.splice(i, 1);
      continue;
    }

    const g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.size * 4);
    g.addColorStop(0, `rgba(200, 230, 240, ${0.22 * w.life})`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.size * 4, 0, Math.PI * 2);
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
