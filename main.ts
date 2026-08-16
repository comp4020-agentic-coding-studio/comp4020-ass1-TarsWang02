import { cuspCount, epicycloidPoint, lapCount, maxRadius, totalTheta } from "./epicycloid";

const RING_TEETH = 24;
const START_ROLLING_TEETH = 8;

const canvas = document.querySelector<HTMLCanvasElement>("#curve");
const toothCountEl = document.querySelector<HTMLElement>("#tooth-count");
const cuspCountEl = document.querySelector<HTMLElement>("#cusp-count");
const lapCountEl = document.querySelector<HTMLElement>("#lap-count");

if (canvas && toothCountEl && cuspCountEl && lapCountEl) {
  const ctx = canvas.getContext("2d");
  if (ctx) {
    init(canvas, ctx, toothCountEl, cuspCountEl, lapCountEl);
  }
}

function init(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  toothCountEl: HTMLElement,
  cuspCountEl: HTMLElement,
  lapCountEl: HTMLElement,
): void {
  const r = START_ROLLING_TEETH;
  const R = RING_TEETH;

  function resize(): void {
    const cssSize = canvas.clientWidth || canvas.parentElement?.clientWidth || 320;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(cssSize);
  }

  function draw(cssSize: number): void {
    const bound = maxRadius(R, r);
    const scale = cssSize / 2 / bound;
    const cx = cssSize / 2;
    const cy = cssSize / 2;

    ctx.clearRect(0, 0, cssSize, cssSize);

    // the fixed ring
    ctx.beginPath();
    ctx.arc(cx, cy, R * scale, 0, 2 * Math.PI);
    ctx.strokeStyle = "#c7c7c7";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // the curve, sampled from the parametric equation
    const end = totalTheta(R, r);
    const steps = Math.max(600, Math.round(end * 120));
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const theta = end * (i / steps);
      const p = epicycloidPoint(R, r, theta);
      const x = cx + p.x * scale;
      const y = cy + p.y * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#0b5fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    toothCountEl.textContent = String(r);
    cuspCountEl.textContent = String(cuspCount(R, r));
    lapCountEl.textContent = String(lapCount(R, r));
  }

  window.addEventListener("resize", resize);
  resize();
}
