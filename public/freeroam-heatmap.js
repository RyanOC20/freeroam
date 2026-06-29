/* Freeroam — procedural route heatmap engine.
   Generates clustered GPS-like routes around several city "hubs", with some
   routes sharing corridors so overlaps accumulate brightness (additive
   compositing) — exactly the density signal a real activity heatmap shows.
   Pure canvas, no deps. Coordinates are normalized [0..1] and scaled on draw,
   so resize re-renders without regenerating the data. */
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const PALETTES = {
    classic: { under: [160, 8, 0], mid: [255, 107, 43], core: [255, 170, 70] },
    solar:   { under: [200, 40, 0], mid: [255, 140, 30], core: [255, 214, 110] },
    ember:   { under: [120, 6, 0], mid: [220, 60, 20], core: [255, 120, 60] },
    ion:     { under: [10, 70, 130], mid: [40, 150, 200], core: [150, 230, 255] },
  };

  function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

  class Heatmap {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.seed = opts.seed || 7;
      this.palette = PALETTES[opts.palette] || PALETTES.classic;
      this.grid = opts.grid !== false;
      this.intensity = opts.intensity != null ? opts.intensity : 1;
      this.progress = 1;
      this.overscan = opts.overscan != null ? opts.overscan : 0.14;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this._raf = null;
      this._generate();
      this.resize();
    }

    setPalette(name) { this.palette = PALETTES[name] || this.palette; this.render(); }
    setGrid(v) { this.grid = v; this.render(); }
    setIntensity(v) { this.intensity = v; this.render(); }

    _generate() {
      const rnd = mulberry32(this.seed);
      // City hubs across the field — weighted so a couple are dominant.
      const hubs = [
        { x: 0.30, y: 0.42, w: 1.0 },
        { x: 0.62, y: 0.55, w: 0.85 },
        { x: 0.78, y: 0.30, w: 0.55 },
        { x: 0.45, y: 0.72, w: 0.6 },
        { x: 0.16, y: 0.66, w: 0.4 },
        { x: 0.86, y: 0.68, w: 0.35 },
      ];
      const routes = [];
      const W = 1, H = 1;

      function walk(sx, sy, angle, steps, momentum, jitter, drift) {
        const pts = [[sx, sy]];
        let x = sx, y = sy, a = angle;
        for (let i = 0; i < steps; i++) {
          a += (rnd() - 0.5) * jitter + drift;
          const len = 0.012 + rnd() * 0.018;
          x += Math.cos(a) * len * momentum;
          y += Math.sin(a) * len * momentum;
          // gentle bounce off edges
          if (x < 0.04 || x > 0.96) { a = Math.PI - a; x = Math.max(0.04, Math.min(0.96, x)); }
          if (y < 0.06 || y > 0.94) { a = -a; y = Math.max(0.06, Math.min(0.94, y)); }
          pts.push([x, y]);
        }
        return pts;
      }

      hubs.forEach((hub, hi) => {
        const n = Math.round(10 + hub.w * 26);
        // A few "spine" corridors that several routes hug → hot lines.
        const spines = [];
        const nSpines = 2 + Math.floor(hub.w * 3);
        for (let s = 0; s < nSpines; s++) spines.push(rnd() * Math.PI * 2);
        for (let i = 0; i < n; i++) {
          const useSpine = rnd() < 0.62;
          const base = useSpine ? spines[Math.floor(rnd() * spines.length)] : rnd() * Math.PI * 2;
          const angle = base + (useSpine ? (rnd() - 0.5) * 0.28 : 0);
          const ox = (rnd() - 0.5) * 0.05, oy = (rnd() - 0.5) * 0.05;
          const steps = 16 + Math.floor(rnd() * 30);
          const drift = (rnd() - 0.5) * 0.05;
          routes.push({
            pts: walk(hub.x + ox, hub.y + oy, angle, steps, 1, 0.6, drift),
            hot: useSpine ? 0.7 + rnd() * 0.3 : 0.25 + rnd() * 0.4,
          });
        }
      });

      // A handful of long inter-city journeys connecting hubs.
      for (let k = 0; k < 9; k++) {
        const a = hubs[Math.floor(rnd() * hubs.length)];
        const b = hubs[Math.floor(rnd() * hubs.length)];
        if (a === b) continue;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        routes.push({ pts: walk(a.x, a.y, ang, 30 + Math.floor(rnd() * 18), 1.25, 0.22, 0), hot: 0.5 + rnd() * 0.4 });
      }

      this.routes = routes;
      this.hubs = hubs;
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.w = Math.max(1, r.width);
      this.h = Math.max(1, r.height);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.render();
    }

    _strokePath(pts, frac) {
      const ctx = this.ctx, W = this.w, H = this.h;
      // overscan: map normalized [0,1] to a slightly larger box so routes bleed
      // off every edge instead of fading to a dark frame.
      const s = 1 + 2 * this.overscan, o = this.overscan;
      const X = (v) => (v * s - o) * W, Y = (v) => (v * s - o) * H;
      const count = Math.max(2, Math.floor(pts.length * frac));
      ctx.beginPath();
      ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
      for (let i = 1; i < count; i++) {
        const p = pts[i], prev = pts[i - 1];
        const mx = X((prev[0] + p[0]) / 2), my = Y((prev[1] + p[1]) / 2);
        ctx.quadraticCurveTo(X(prev[0]), Y(prev[1]), mx, my);
      }
    }

    render() {
      const ctx = this.ctx, W = this.w, H = this.h, P = this.palette;
      ctx.save();
      ctx.scale(this.dpr, this.dpr);
      ctx.clearRect(0, 0, W, H);

      // Base void with a faint warm bloom toward the dense hub.
      ctx.fillStyle = "#0a0b0c";
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(0.34 * W, 0.46 * H, 0, 0.34 * W, 0.46 * H, Math.max(W, H) * 0.7);
      g.addColorStop(0, rgba(P.under, 0.10 * this.intensity));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Faint graticule grid.
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
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "lighter";

      // Pass 1 — wide deep-red underglow (sparse areas read red).
      ctx.strokeStyle = rgba(P.under, 0.05 * I);
      ctx.lineWidth = 11;
      for (const r of this.routes) { this._strokePath(r.pts, fr); ctx.stroke(); }

      // Pass 2 — medium orange glow, hotter routes brighter.
      ctx.lineWidth = 5;
      for (const r of this.routes) {
        ctx.strokeStyle = rgba(P.mid, (0.05 + r.hot * 0.10) * I);
        this._strokePath(r.pts, fr); ctx.stroke();
      }

      // Pass 3 — crisp amber core; overlaps blow out to white-hot.
      ctx.lineWidth = 1.4;
      for (const r of this.routes) {
        ctx.strokeStyle = rgba(P.core, (0.28 + r.hot * 0.5) * I);
        this._strokePath(r.pts, fr); ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }

    reveal(duration = 1800) {
      if (this._raf) cancelAnimationFrame(this._raf);
      const start = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        this.progress = ease(t);
        this.render();
        if (t < 1) this._raf = requestAnimationFrame(tick);
        else this._raf = null;
      };
      this.progress = 0;
      this._raf = requestAnimationFrame(tick);
    }
  }

  window.FreeroamHeatmap = Heatmap;
  window.FreeroamPalettes = PALETTES;
})();
