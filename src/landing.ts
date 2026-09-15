import { Heatmap } from "./heatmap";

export function initLanding(): void {
  // Optional hero heatmap canvas (absent in the stacked-bands design).
  const canvas = document.getElementById("heat") as HTMLCanvasElement | null;
  if (canvas && canvas.parentElement) {
    const heat = new Heatmap(canvas, { palette: "ember", grid: true });
    heat.intensity = 0.62;
    const ro = new ResizeObserver(() => heat.resize());
    ro.observe(canvas.parentElement);
    requestAnimationFrame(() => heat.resize());
    requestAnimationFrame(() => setTimeout(() => heat.reveal(2000), 120));
  }

  // Optional sticky nav (absent in the stacked-bands design).
  const nav = document.getElementById("nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
}
