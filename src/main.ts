import "./style.css";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="scene" aria-hidden="true">
    <canvas id="water"></canvas>
    <div class="grain"></div>
    <div class="vignette"></div>
    <div class="shock" id="shock"></div>
  </div>
  <main class="brand">
    <div class="brand-stack">
      <h1 id="mark" aria-label="fantrixx"></h1>
      <a
        class="github"
        href="https://github.com/fantrixx"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub"
      >
        <svg viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            fill="currentColor"
            d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.125 7.523 5.125 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
          />
        </svg>
      </a>
    </div>
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
const scene = document.querySelector<HTMLDivElement>(".scene")!;
const shockEl = document.querySelector<HTMLDivElement>("#shock")!;

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
  glitchUntil: number;
  glitchSeed: number;
};

const letterMotion: LetterMotion[] = letters.map((el) => ({
  el,
  glitchUntil: 0,
  glitchSeed: Math.random() * 1000,
}));

let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let floating = false;
let nextGlitchAt = 0;
let nextShockAt = 0;
let shockUntil = 0;
let shockSeed = 0;

const ripples: Ripple[] = [];
const wakes: Wake[] = [];

let pointerX = -9999;
let pointerY = -9999;
let prevX = -9999;
let prevY = -9999;
let pointerActive = false;
let lastSpawn = 0;

function scheduleNextGlitch(now: number) {
  // Sparse bursts — sometimes soon, sometimes a longer quiet stretch
  nextGlitchAt = now + 1800 + Math.random() * 6500;
}

function triggerGlitchBurst(now: number) {
  const count =
    Math.random() < 0.45
      ? 1
      : 1 + Math.floor(Math.random() * letterMotion.length);
  const indices = letterMotion.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const duration = 90 + Math.random() * 280;
  for (let n = 0; n < count; n++) {
    const m = letterMotion[indices[n]];
    m.glitchUntil = now + duration * (0.55 + Math.random() * 0.7);
    m.glitchSeed = Math.random() * 1000;
    m.el.classList.add("is-glitching");
  }
}

function clearGlitch(m: LetterMotion) {
  m.glitchUntil = 0;
  m.el.classList.remove("is-glitching");
  m.el.style.removeProperty("--gx");
  m.el.style.removeProperty("--gy");
  m.el.style.removeProperty("--gclip");
  m.el.style.filter = "";
}

function updateGlitch(m: LetterMotion, now: number, baseOpacity: number) {
  if (now >= m.glitchUntil) {
    clearGlitch(m);
    m.el.style.opacity = baseOpacity.toFixed(3);
    return { x: 0, y: 0, rot: 0, skew: 0, opacity: baseOpacity };
  }

  // Broken-tape stutter: hold a frame, then jump
  const tick = Math.floor(now / (28 + (m.glitchSeed % 17)));
  const rnd = Math.sin(tick * 12.9898 + m.glitchSeed) * 43758.5453;
  const n = rnd - Math.floor(rnd);
  const hardCut = n > 0.72;
  const tear = n > 0.88;

  const gx = hardCut ? (n - 0.5) * 14 : (n - 0.5) * 3.5;
  const gy = tear ? Math.sin(tick * 3.1 + m.glitchSeed) * 5 : (n - 0.5) * 1.2;
  const skew = hardCut ? (n - 0.5) * 9 : (n - 0.5) * 1.5;
  const clip = tear ? 35 + n * 45 : 100;
  const opacity = hardCut
    ? n > 0.92
      ? 0.08
      : 0.35 + n * 0.55
    : baseOpacity * (0.55 + n * 0.5);

  m.el.style.setProperty("--gx", `${gx.toFixed(2)}px`);
  m.el.style.setProperty("--gy", `${gy.toFixed(2)}px`);
  m.el.style.setProperty("--gclip", `${clip.toFixed(1)}%`);
  m.el.style.filter = hardCut
    ? `contrast(${1.2 + n * 0.9}) brightness(${0.75 + n * 0.7}) saturate(${1.4 + n})`
    : "";

  return {
    x: gx * 0.35,
    y: gy * 0.25,
    rot: skew * 0.15,
    skew,
    opacity,
  };
}

function scheduleNextShock(now: number) {
  nextShockAt = now + 4500 + Math.random() * 11000;
}

function triggerShock(now: number) {
  shockSeed = Math.random() * 1000;
  const double = Math.random() < 0.35;
  shockUntil = now + (double ? 220 + Math.random() * 180 : 90 + Math.random() * 120);
  scene.classList.add("is-shocking");
  shockEl.classList.add("is-on");
}

function updateShock(now: number) {
  if (shockUntil <= 0) {
    scene.style.removeProperty("--sx");
    scene.style.removeProperty("--sy");
    scene.style.removeProperty("--srot");
    return;
  }

  if (now >= shockUntil) {
    shockUntil = 0;
    scene.classList.remove("is-shocking");
    shockEl.classList.remove("is-on");
    shockEl.style.opacity = "0";
    scene.style.removeProperty("--sx");
    scene.style.removeProperty("--sy");
    scene.style.removeProperty("--srot");
    return;
  }

  const left = shockUntil - now;
  const tick = Math.floor(now / 28);
  const rnd = Math.sin(tick * 19.3 + shockSeed) * 43758.5453;
  const n = rnd - Math.floor(rnd);
  const hard = n > 0.55;

  const sx = (n - 0.5) * (hard ? 18 : 6);
  const sy = (Math.sin(tick * 4.2 + shockSeed) - 0.5) * (hard ? 12 : 4);
  const srot = (n - 0.5) * (hard ? 1.2 : 0.35);
  scene.style.setProperty("--sx", `${sx.toFixed(2)}px`);
  scene.style.setProperty("--sy", `${sy.toFixed(2)}px`);
  scene.style.setProperty("--srot", `${srot.toFixed(3)}deg`);

  let flash = 0;
  if (hard && left > 40) flash = 0.08 + n * 0.22;
  if (n > 0.9) flash = 0.35 + n * 0.25;
  if (n > 0.97) flash = 0.7;
  shockEl.style.opacity = flash.toFixed(3);
}

function updateFloat(now: number) {
  if (floating) {
    if (nextGlitchAt === 0) scheduleNextGlitch(now + 1200);
    if (now >= nextGlitchAt) {
      triggerGlitchBurst(now);
      scheduleNextGlitch(now);
    }
    if (nextShockAt === 0) scheduleNextShock(now + 2500);
    if (now >= nextShockAt) {
      triggerShock(now);
      scheduleNextShock(now);
    }
  }

  updateShock(now);

  letterMotion.forEach((m) => {
    const baseOpacity = floating ? 0.88 : Number(m.el.style.opacity) || 0.88;

    const glitch =
      m.glitchUntil > 0
        ? updateGlitch(m, now, baseOpacity)
        : { x: 0, y: 0, rot: 0, skew: 0, opacity: baseOpacity };

    if (m.glitchUntil > 0) {
      m.el.style.transform = `translate3d(${glitch.x.toFixed(2)}px, ${glitch.y.toFixed(2)}px, 0) rotate(${glitch.rot.toFixed(3)}deg) skewX(${glitch.skew.toFixed(2)}deg)`;
    } else if (floating) {
      m.el.style.transform = "translate3d(0, 0, 0) rotate(0deg) skewX(0deg)";
    }

    if (floating || m.glitchUntil > 0) {
      m.el.style.opacity = glitch.opacity.toFixed(3);
    }
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
    const dx = x - prevX;
    const dy = y - prevY;
    spawnTrail(x, y, dx, dy, performance.now());
  }

  prevX = pointerX === -9999 ? x : pointerX;
  prevY = pointerY === -9999 ? y : pointerY;
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

  // near-void black
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#010203");
  base.addColorStop(0.35, "#010302");
  base.addColorStop(0.7, "#000100");
  base.addColorStop(1, "#000000");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // almost invisible cold breath
  const mist = ctx.createRadialGradient(
    width * 0.5,
    height * 0.1,
    0,
    width * 0.5,
    height * 0.1,
    height * 0.45,
  );
  mist.addColorStop(0, "rgba(35, 48, 44, 0.04)");
  mist.addColorStop(0.5, "rgba(18, 28, 26, 0.018)");
  mist.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, width, height);

  // heavy black swells — barely readable
  for (let band = 0; band < 9; band++) {
    const yBase = height * (0.1 + band * 0.105);
    const amp = 11 + band * 4.8;
    const speed = 0.07 + band * 0.022;
    const phase = band * 1.45;

    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 12) {
      const y =
        yBase +
        Math.sin(x * 0.0034 + t * speed + phase) * amp +
        Math.sin(x * 0.0085 + t * speed * 1.15 + phase) * (amp * 0.35);
      if (x === 0) ctx.lineTo(0, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();

    const depth = 0.09 + band * 0.035;
    ctx.fillStyle = `rgba(${1 + band}, ${4 + band}, ${5 + band}, ${depth})`;
    ctx.fill();

    ctx.beginPath();
    for (let x = 0; x <= width; x += 18) {
      const y =
        yBase +
        Math.sin(x * 0.0034 + t * speed + phase) * amp +
        Math.sin(x * 0.0085 + t * speed * 1.15 + phase) * (amp * 0.35);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(50, 70, 65, ${0.006 + band * 0.0015})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // rare murky caustics
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const cx = (Math.sin(t * 0.08 + i * 2.1) * 0.5 + 0.5) * width;
    const cy = height * (0.42 + i * 0.12) + Math.cos(t * 0.11 + i) * 18;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 + i * 24);
    g.addColorStop(0, `rgba(40, 65, 60, ${0.008 + i * 0.002})`);
    g.addColorStop(0.55, `rgba(18, 32, 30, 0.003)`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();

  // crush the frame into darkness
  const fog = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    height * 0.08,
    width * 0.5,
    height * 0.45,
    height * 0.82,
  );
  fog.addColorStop(0, "rgba(0, 0, 0, 0)");
  fog.addColorStop(0.45, "rgba(0, 0, 0, 0.4)");
  fog.addColorStop(1, "rgba(0, 0, 0, 0.88)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, width, height);

  // during shock: brief cold invert flash washed into the abyss
  if (shockUntil > now) {
    const tick = Math.floor(now / 28);
    const rnd = Math.sin(tick * 19.3 + shockSeed) * 43758.5453;
    const n = rnd - Math.floor(rnd);
    if (n > 0.82) {
      ctx.fillStyle = `rgba(140, 170, 160, ${0.04 + n * 0.08})`;
      ctx.fillRect(0, 0, width, height);
    }
  }
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
