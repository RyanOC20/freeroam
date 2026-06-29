/* Procedural route heatmap engine.
   Generates clustered GPS-like routes around several city "hubs", with some
   routes sharing corridors so overlaps accumulate brightness (additive
   compositing) — exactly the density signal a real activity heatmap shows.
   Pure canvas, no deps. Coordinates are normalized [0..1] and scaled on draw,
   so resize re-renders without regenerating the data. */

type PaletteName = "classic" | "solar" | "ember" | "ion";

interface Palette {
  under: [number, number, number];
  mid:   [number, number, number];
  core:  [number, number, number];
}

interface HeatmapOptions {
  seed?:      number;
  palette?:   PaletteName;
  grid?:      boolean;
  intensity?: number;
  overscan?:  number;
}

interface Route {
  pts: [number, number][];
  hot: number;
}

const PALETTES: Record<PaletteName, Palette> = {
  classic: { under: [160, 8,   0], mid: [255, 107,  43], core: [255, 170,  70] },
  solar:   { under: [200, 40,  0], mid: [255, 140,  30], core: [255, 214, 110] },
  ember:   { under: [120, 6,   0], mid: [220,  60,  20], core: [255, 120,  60] },
  ion:     { under: [ 10, 70,130], mid: [ 40, 150, 200], core: [150, 230, 255] },
};

function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgba(c: [number, number, number], a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

export class Heatmap {
  intensity: number;
  progress:  number;

  private canvas:   HTMLCanvasElement;
  private ctx:      CanvasRenderingContext2D;
  private seed:     number;
  private palette:  Palette;
  private grid:     boolean;
  private overscan: number;
  private dpr:      number;
  private w:        number = 1;
  private h:        number = 1;
  private routes:   Route[] = [];
  private _raf:     number | null = null;

  constructor(canvas: HTMLCanvasElement, opts: HeatmapOptions = {}) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext("2d")!;
    this.seed     = opts.seed     ?? 7;
    this.palette  = PALETTES[opts.palette ?? "classic"];
    this.grid     = opts.grid     ?? true;
    this.intensity = opts.intensity ?? 1;
    this.overscan = opts.overscan ?? 0.14;
    this.progress = 1;
    this.dpr      = Math.min(window.devicePixelRatio || 1, 2);
    this._generate();
    this.resize();
  }

  setPalette(name: PaletteName): void { this.palette = PALETTES[name] ?? this.palette; this.render(); }
  setGrid(v: boolean):           void { this.grid = v; this.render(); }

  private _generate(): void {
    const rnd = mulberry32(this.seed);
    const hubs = [
      { x: 0.30, y: 0.42, w: 1.00 },
      { x: 0.62, y: 0.55, w: 0.85 },
      { x: 0.78, y: 0.30, w: 0.55 },
      { x: 0.45, y: 0.72, w: 0.60 },
      { x: 0.16, y: 0.66, w: 0.40 },
      { x: 0.86, y: 0.68, w: 0.35 },
    ];
    const routes: Route[] = [];

    const walk = (sx: number, sy: number, angle: number, steps: number, momentum: number, jitter: number, drift: number): [number, number][] => {
      const pts: [number, number][] = [[sx, sy]];
      let x = sx, y = sy, a = angle;
      for (let i = 0; i < steps; i++) {
        a += (rnd() - 0.5) * jitter + drift;
        const len = 0.012 + rnd() * 0.018;
        x += Math.cos(a) * len * momentum;
        y += Math.sin(a) * len * momentum;
        if (x < 0.04 || x > 0.96) { a = Math.PI - a; x = Math.max(0.04, Math.min(0.96, x)); }
        if (y < 0.06 || y > 0.94) { a = -a; y = Math.max(0.06, Math.min(0.94, y)); }
        pts.push([x, y]);
      }
      return pts;
    };

    hubs.forEach((hub) => {
      const n = Math.round(10 + hub.w * 26);
      const spines: number[] = [];
      const nSpines = 2 + Math.floor(hub.w * 3);
      for (let s = 0; s < nSpines; s++) spines.push(rnd() * Math.PI * 2);
      for (let i = 0; i < n; i++) {
        const useSpine = rnd() < 0.62;
        const base  = useSpine ? spines[Math.floor(rnd() * spines.length)] : rnd() * Math.PI * 2;
        const angle = base + (useSpine ? (rnd() - 0.5) * 0.28 : 0);
        const ox = (rnd() - 0.5) * 0.05, oy = (rnd() - 0.5) * 0.05;
        const steps = 16 + Math.floor(rnd() * 30);
        routes.push({
          pts: walk(hub.x + ox, hub.y + oy, angle, steps, 1, 0.6, (rnd() - 0.5) * 0.05),
          hot: useSpine ? 0.7 + rnd() * 0.3 : 0.25 + rnd() * 0.4,
        });
      }
    });

    for (let k = 0; k < 9; k++) {
      const a = hubs[Math.floor(rnd() * hubs.length)];
      const b = hubs[Math.floor(rnd() * hubs.length)];
      if (a === b) continue;
      routes.push({
        pts: walk(a.x, a.y, Math.atan2(b.y - a.y, b.x - a.x), 30 + Math.floor(rnd() * 18), 1.25, 0.22, 0),
        hot: 0.5 + rnd() * 0.4,
      });
    }

    this.routes = routes;
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width  = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.render();
  }

  private _strokePath(pts: [number, number][], frac: number): void {
    const ctx = this.ctx, W = this.w, H = this.h;
    const s = 1 + 2 * this.overscan, o = this.overscan;
    const X = (v: number) => (v * s - o) * W;
    const Y = (v: number) => (v * s - o) * H;
    const count = Math.max(2, Math.floor(pts.length * frac));
    ctx.beginPath();
    ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
    for (let i = 1; i < count; i++) {
      const p = pts[i], prev = pts[i - 1];
      ctx.quadraticCurveTo(X(prev[0]), Y(prev[1]), X((prev[0] + p[0]) / 2), Y((prev[1] + p[1]) / 2));
    }
  }

  render(): void {
    const ctx = this.ctx, W = this.w, H = this.h, P = this.palette;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#0a0b0c";
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(0.34 * W, 0.46 * H, 0, 0.34 * W, 0.46 * H, Math.max(W, H) * 0.7);
    g.addColorStop(0, rgba(P.under, 0.10 * this.intensity));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (this.grid) {
      ctx.strokeStyle = "rgba(255,255,255,0.022)";
      ctx.lineWidth = 1;
      const step = Math.max(46, Math.min(W, H) / 14);
      ctx.beginPath();
      for (let x = 0; x <= W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0; y <= H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
    }

    const I = this.intensity, fr = this.progress;
    ctx.lineCap  = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "lighter";

    ctx.strokeStyle = rgba(P.under, 0.05 * I);
    ctx.lineWidth = 11;
    for (const r of this.routes) { this._strokePath(r.pts, fr); ctx.stroke(); }

    ctx.lineWidth = 5;
    for (const r of this.routes) {
      ctx.strokeStyle = rgba(P.mid, (0.05 + r.hot * 0.10) * I);
      this._strokePath(r.pts, fr); ctx.stroke();
    }

    ctx.lineWidth = 1.4;
    for (const r of this.routes) {
      ctx.strokeStyle = rgba(P.core, (0.28 + r.hot * 0.5) * I);
      this._strokePath(r.pts, fr); ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  reveal(duration = 1800): void {
    if (this._raf) cancelAnimationFrame(this._raf);
    const start = performance.now();
    const ease  = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick  = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      this.progress = ease(t);
      this.render();
      this._raf = t < 1 ? requestAnimationFrame(tick) : null;
    };
    this.progress = 0;
    this._raf = requestAnimationFrame(tick);
  }
}
