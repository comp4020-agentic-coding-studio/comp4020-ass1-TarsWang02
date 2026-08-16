import { cuspCount, epicycloidPoint, lapCount, maxRadius, totalTheta } from "./epicycloid";

const RING_TEETH = 24;
const START_ROLLING_TEETH = 8;

const canvas = document.querySelector<HTMLCanvasElement>("#curve");
const toothCountEl = document.querySelector<HTMLElement>("#tooth-count");
const cuspCountEl = document.querySelector<HTMLElement>("#cusp-count");
const lapCountEl = document.querySelector<HTMLElement>("#lap-count");
const lapUnitEl = document.querySelector<HTMLElement>("#lap-unit");
const teethSlider = document.querySelector<HTMLInputElement>("#teeth");

if (canvas && toothCountEl && cuspCountEl && lapCountEl && lapUnitEl && teethSlider) {
  const ctx = canvas.getContext("2d");
  if (ctx) {
    init(canvas, ctx, toothCountEl, cuspCountEl, lapCountEl, lapUnitEl, teethSlider);
  }
}

function init(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  toothCountEl: HTMLElement,
  cuspCountEl: HTMLElement,
  lapCountEl: HTMLElement,
  lapUnitEl: HTMLElement,
  teethSlider: HTMLInputElement,
): void {
  const R = RING_TEETH;
  let r = START_ROLLING_TEETH;

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

    const laps = lapCount(R, r);
    toothCountEl.textContent = String(r);
    cuspCountEl.textContent = String(cuspCount(R, r));
    lapCountEl.textContent = String(laps);
    lapUnitEl.textContent = laps === 1 ? "lap" : "laps";
  }

  function redrawAtCurrentSize(): void {
    draw(canvas.clientWidth || canvas.parentElement?.clientWidth || 320);
  }

  teethSlider.addEventListener("input", () => {
    r = Number(teethSlider.value);
    redrawAtCurrentSize();
  });

  window.addEventListener("resize", resize);
  resize();
}
