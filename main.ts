import {
  cuspCount,
  epicycloidPoint,
  lapCount,
  maxRadius,
  rollingCenter,
  rotationCount,
  totalTheta,
} from "./epicycloid";
import { ParticleField } from "./particles";

const RING_TEETH = 24;
const START_ROLLING_TEETH = 8;

// One full lap of the fixed ring takes this long, regardless of tooth count
// — a curve that takes seven laps to close genuinely takes seven times as
// long to draw as one that closes in one. That wait is part of the point.
const SECONDS_PER_LAP = 1.7;

// Samples per lap scale with viewport width, so a phone never renders the
// particle count a desktop does.
const SAMPLES_PER_LAP_MIN = 150;
const SAMPLES_PER_LAP_MAX = 500;

const MAX_DT = 1 / 30; // clamp so a backgrounded tab doesn't teleport the sim

const CURVE_COLOR = "#0b5fff";
const RING_COLOR = "#c7c7c7";
const GEAR_COLOR = "#e8590c";
const BG_FILL = "rgba(255, 255, 255, 0.06)";
const PARTICLE_SIZE = 1.6;

const canvas = document.querySelector<HTMLCanvasElement>("#curve");
const toothCountEl = document.querySelector<HTMLElement>("#tooth-count");
const cuspCountEl = document.querySelector<HTMLElement>("#cusp-count");
const lapCountEl = document.querySelector<HTMLElement>("#lap-count");
const lapUnitEl = document.querySelector<HTMLElement>("#lap-unit");
const rotationCountEl = document.querySelector<HTMLElement>("#rotation-count");
const teethSlider = document.querySelector<HTMLInputElement>("#teeth");

if (
  canvas &&
  toothCountEl &&
  cuspCountEl &&
  lapCountEl &&
  lapUnitEl &&
  rotationCountEl &&
  teethSlider
) {
  const ctx = canvas.getContext("2d");
  if (ctx) {
    init(canvas, ctx, toothCountEl, cuspCountEl, lapCountEl, lapUnitEl, rotationCountEl, teethSlider);
  }
}

function samplesPerLap(): number {
  return Math.round(
    Math.min(SAMPLES_PER_LAP_MAX, Math.max(SAMPLES_PER_LAP_MIN, window.innerWidth * 0.4)),
  );
}

function init(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  toothCountEl: HTMLElement,
  cuspCountEl: HTMLElement,
  lapCountEl: HTMLElement,
  lapUnitEl: HTMLElement,
  rotationCountEl: HTMLElement,
  teethSlider: HTMLInputElement,
): void {
  const R = RING_TEETH;
  let r = START_ROLLING_TEETH;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const angularVelocity = (2 * Math.PI) / SECONDS_PER_LAP; // one ring-lap per SECONDS_PER_LAP, always

  let cssSize = 320;
  let field = new ParticleField(1);
  let theta = 0;
  let nextSampleTheta = 0;

  function updateReadouts(): void {
    const laps = lapCount(R, r);
    toothCountEl.textContent = String(r);
    cuspCountEl.textContent = String(cuspCount(R, r));
    lapCountEl.textContent = String(laps);
    lapUnitEl.textContent = laps === 1 ? "lap" : "laps";
    rotationCountEl.textContent = String(rotationCount(R, r));
  }

  function toCanvas(x: number, y: number, scale: number): [number, number] {
    return [cssSize / 2 + x * scale, cssSize / 2 + y * scale];
  }

  function drawRing(scale: number): void {
    ctx.beginPath();
    ctx.arc(cssSize / 2, cssSize / 2, R * scale, 0, 2 * Math.PI);
    ctx.strokeStyle = RING_COLOR;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    for (let i = 0; i < R; i++) {
      const a = (i / R) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(...toCanvas((R - 0.6) * Math.cos(a), (R - 0.6) * Math.sin(a), scale));
      ctx.lineTo(...toCanvas((R + 0.6) * Math.cos(a), (R + 0.6) * Math.sin(a), scale));
      ctx.strokeStyle = RING_COLOR;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawGear(scale: number, atTheta: number): void {
    const c = rollingCenter(R, r, atTheta);
    const [cx, cy] = toCanvas(c.x, c.y, scale);
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, 2 * Math.PI);
    ctx.strokeStyle = GEAR_COLOR;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // teeth ticks, rotating with the gear as it spins
    const spin = ((R + r) / r) * atTheta;
    for (let i = 0; i < r; i++) {
      const a = spin + (i / r) * 2 * Math.PI;
      const [ix, iy] = toCanvas(c.x + (r - 0.6) * Math.cos(a), c.y + (r - 0.6) * Math.sin(a), scale);
      const [ox, oy] = toCanvas(c.x + (r + 0.6) * Math.cos(a), c.y + (r + 0.6) * Math.sin(a), scale);
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(ox, oy);
      ctx.strokeStyle = GEAR_COLOR;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // the pen point itself
    const p = epicycloidPoint(R, r, atTheta);
    const [px, py] = toCanvas(p.x, p.y, scale);
    ctx.beginPath();
    ctx.arc(px, py, 2.2, 0, 2 * Math.PI);
    ctx.fillStyle = GEAR_COLOR;
    ctx.fill();
  }

  // Rebuilds particle storage for the current (R, r) and viewport. Called on
  // every tooth-count change and every resize, since both change how many
  // samples one full curve needs. The old curve isn't erased directly — it
  // just stops being redrawn, and BG_FILL fades it out over the next few
  // frames while the new one builds up: the re-target the slider needs, for
  // free, from the same trail-decay mechanism used for the gear's motion.
  function retarget(): void {
    const capacity = Math.max(1, Math.round(samplesPerLap() * lapCount(R, r)));
    field = new ParticleField(capacity);
    theta = 0;
    nextSampleTheta = 0;
    updateReadouts();
  }

  function resize(): void {
    cssSize = canvas.clientWidth || canvas.parentElement?.clientWidth || 320;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssSize, cssSize);
    retarget();
  }

  // No motion: deposit every sample of the closed curve at once and draw the
  // finished figure directly, so the page still explains itself.
  function drawComplete(): void {
    const scale = cssSize / 2 / maxRadius(R, r);
    const end = totalTheta(R, r);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssSize, cssSize);
    for (let i = 0; i < field.capacity; i++) {
      const t = end * (i / field.capacity);
      const p = epicycloidPoint(R, r, t);
      const [x, y] = toCanvas(p.x, p.y, scale);
      field.deposit(x, y);
    }
    drawRing(scale);
    ctx.fillStyle = CURVE_COLOR;
    field.draw(ctx, PARTICLE_SIZE * 1.2);
    drawGear(scale, end);
  }

  function frame(now: number, last: number): void {
    const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    const scale = cssSize / 2 / maxRadius(R, r);
    const end = totalTheta(R, r);

    theta += angularVelocity * dt;
    if (theta >= end) {
      theta -= end;
      nextSampleTheta -= end;
    }

    const sampleStep = end / field.capacity;
    while (nextSampleTheta <= theta) {
      const p = epicycloidPoint(R, r, nextSampleTheta);
      const [x, y] = toCanvas(p.x, p.y, scale);
      field.deposit(x, y);
      nextSampleTheta += sampleStep;
    }

    ctx.fillStyle = BG_FILL;
    ctx.fillRect(0, 0, cssSize, cssSize);
    drawRing(scale);
    ctx.fillStyle = CURVE_COLOR;
    field.draw(ctx, PARTICLE_SIZE);
    drawGear(scale, theta);

    requestAnimationFrame((t) => frame(t, now));
  }

  teethSlider.addEventListener("input", () => {
    r = Number(teethSlider.value);
    retarget();
    if (reduceMotion) drawComplete();
  });

  window.addEventListener("resize", () => {
    resize();
    if (reduceMotion) drawComplete();
  });

  resize();
  if (reduceMotion) {
    drawComplete();
  } else {
    requestAnimationFrame((t) => frame(t, t));
  }
}
