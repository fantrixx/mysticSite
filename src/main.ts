import "./style.css";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="scene" aria-hidden="true">
    <canvas id="fog"></canvas>
    <div class="grain"></div>
    <div class="vignette"></div>
  </div>
  <main class="brand">
    <h1>fantrixx</h1>
  </main>
`;

type Particle = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
};

const canvas = document.querySelector<HTMLCanvasElement>("#fog")!;
const ctx = canvas.getContext("2d")!;

let width = 0;
let height = 0;
let particles: Particle[] = [];
let dpr = Math.min(window.devicePixelRatio || 1, 2);

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  seedParticles();
}

function makeParticle(partial = false): Particle {
  return {
    x: Math.random() * width,
    y: partial ? Math.random() * height : height + Math.random() * 80,
    r: 40 + Math.random() * 140,
    vx: (Math.random() - 0.5) * 0.18,
    vy: -0.08 - Math.random() * 0.22,
    alpha: 0.015 + Math.random() * 0.04,
    life: 0.3 + Math.random() * 0.7,
  };
}

function seedParticles() {
  const count = Math.min(48, Math.floor((width * height) / 28000));
  particles = Array.from({ length: count }, () => makeParticle(true));
}

function tick() {
  ctx.clearRect(0, 0, width, height);

  // soft drifting haze bands
  const t = performance.now() * 0.00008;
  for (let i = 0; i < 3; i++) {
    const gx = width * (0.25 + 0.25 * i) + Math.sin(t + i) * width * 0.12;
    const gy = height * (0.35 + Math.cos(t * 0.7 + i) * 0.18);
    const gradient = ctx.createRadialGradient(gx, gy, 0, gx, gy, height * 0.55);
    gradient.addColorStop(0, "rgba(90, 110, 120, 0.07)");
    gradient.addColorStop(0.45, "rgba(50, 65, 75, 0.03)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  for (const p of particles) {
    p.x += p.vx + Math.sin(performance.now() * 0.0003 + p.y * 0.01) * 0.12;
    p.y += p.vy;
    p.life -= 0.0008;

    if (p.y + p.r < -20 || p.life <= 0 || p.x < -p.r || p.x > width + p.r) {
      Object.assign(p, makeParticle(false));
      continue;
    }

    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    g.addColorStop(0, `rgba(170, 185, 195, ${p.alpha * p.life})`);
    g.addColorStop(0.5, `rgba(90, 110, 120, ${p.alpha * 0.45 * p.life})`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(tick);
}

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(tick);
