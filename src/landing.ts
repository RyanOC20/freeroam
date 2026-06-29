import { Heatmap } from "./heatmap";

const ACCENT       = "#dc3c14";
const ACCENT_AMBER = "#ff7838";

function hx(h: string): string {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(",");
}

export function initLanding(): void {
  const canvas = document.getElementById("heat") as HTMLCanvasElement;
  const heat = new Heatmap(canvas, { palette: "ember", grid: true });
  heat.intensity = 0.62;

  const ro = new ResizeObserver(() => heat.resize());
  ro.observe(canvas.parentElement!);

  document.documentElement.style.setProperty("--accent",      ACCENT);
  document.documentElement.style.setProperty("--heat-amber",  ACCENT_AMBER);
  document.documentElement.style.setProperty("--accent-glow", `rgba(${hx(ACCENT)},0.40)`);
  document.documentElement.style.setProperty("--accent-soft", `rgba(${hx(ACCENT)},0.12)`);

  requestAnimationFrame(() => heat.resize());
  requestAnimationFrame(() => setTimeout(() => heat.reveal(2000), 120));

  const nav = document.getElementById("nav") as HTMLElement;
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}
