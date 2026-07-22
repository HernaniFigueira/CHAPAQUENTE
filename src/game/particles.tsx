import { useEffect, useRef } from "react";

/* Single-canvas particle engine — cheap enough for 60fps on mobile. */

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  size: number;
  grow: number;
  color: string;
  shape: 0 | 1 | 2; // 0 circle crumb, 1 confetti rect, 2 soft puff (steam)
  rot: number;
  vr: number;
}

const list: P[] = [];
const MAX = 320;

interface BurstOpts {
  count?: number;
  colors: string[];
  speed?: number;
  spread?: number;
  angle?: number;
  g?: number;
  size?: [number, number];
  life?: [number, number];
  shape?: 0 | 1 | 2;
  grow?: number;
  vyBoost?: number;
}

function spawnBurst(x: number, y: number, o: BurstOpts) {
  const {
    count = 14,
    colors,
    speed = 230,
    spread = Math.PI * 2,
    angle = -Math.PI / 2,
    g = 760,
    size = [3, 7],
    life = [0.45, 0.85],
    shape = 0,
    grow = 0,
    vyBoost = 0,
  } = o;
  for (let i = 0; i < count && list.length < MAX; i++) {
    const a = angle + (Math.random() - 0.5) * spread;
    const sp = speed * (0.35 + Math.random() * 0.75);
    const lf = life[0] + Math.random() * (life[1] - life[0]);
    list.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp + vyBoost,
      g,
      life: lf,
      max: lf,
      size: size[0] + Math.random() * (size[1] - size[0]),
      grow,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 9,
    });
  }
}

export const fx = {
  crumbs(x: number, y: number, colors: string[]) {
    spawnBurst(x, y, { count: 12, colors, speed: 200, size: [2.5, 6], life: [0.35, 0.7] });
  },
  sparks(x: number, y: number) {
    spawnBurst(x, y, {
      count: 10,
      colors: ["#ffe08a", "#ffb703", "#fff3d6"],
      speed: 150,
      g: 60,
      size: [2, 4],
      life: [0.3, 0.55],
    });
  },
  confetti(x: number, y: number) {
    spawnBurst(x, y, {
      count: 26,
      colors: ["#ffb703", "#c62f21", "#43a047", "#4fc3f7", "#fff3d6", "#ff7043"],
      speed: 330,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.1,
      g: 620,
      size: [4, 8],
      life: [0.7, 1.25],
      shape: 1,
    });
  },
  steam(x: number, y: number) {
    spawnBurst(x, y, {
      count: 5,
      colors: ["#e8e2d5", "#d8d2c5", "#cfc9bd"],
      speed: 42,
      angle: -Math.PI / 2,
      spread: 0.9,
      g: -55,
      size: [7, 13],
      life: [0.8, 1.4],
      shape: 2,
      grow: 14,
      vyBoost: -26,
    });
  },
  angryExplode(x: number, y: number) {
    spawnBurst(x, y, {
      count: 22,
      colors: ["#c62f21", "#ff7043", "#8e1b12", "#ffb703"],
      speed: 300,
      size: [3, 8],
      life: [0.5, 0.9],
    });
  },
};

export function ParticleLayer() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;

    let dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life -= dt;
        if (p.life <= 0) {
          list.splice(i, 1);
          continue;
        }
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.size += p.grow * dt;

        const k = p.life / p.max;
        if (p.shape === 2) {
          c.globalAlpha = k * 0.42;
          c.fillStyle = p.color;
          c.beginPath();
          c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          c.fill();
        } else if (p.shape === 1) {
          c.globalAlpha = k;
          c.fillStyle = p.color;
          c.save();
          c.translate(p.x, p.y);
          c.rotate(p.rot);
          c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          c.restore();
        } else {
          c.globalAlpha = k;
          c.fillStyle = p.color;
          c.beginPath();
          c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 z-[70] h-full w-full"
      aria-hidden
    />
  );
}
