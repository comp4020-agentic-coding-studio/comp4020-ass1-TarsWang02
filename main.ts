import {
  cuspCount,
  epicycloidPoint,
  lapCount,
  maxRadius,
  rollingCenter,
  totalRotations,
  totalTheta,
} from "./epicycloid";
import { ParticleField } from "./particles";

const RING_TEETH = 24;
// Opens on 13, which is coprime with the 24-tooth ring: the busiest figure
// the piece can draw (24 cusps, 13 laps to close) and the clearest argument
// that one number changes everything. Must stay in step with the range
// input's value attribute in index.html.
const START_ROLLING_TEETH = 13;

// One full lap of the fixed ring takes this long, regardless of tooth count
// — a curve that takes seven laps to close genuinely takes seven times as
// long to draw as one that closes in one. That wait is part of the point.
const SECONDS_PER_LAP = 1.7;

// Samples per lap scale with viewport width, so a phone never renders the
// particle count a desktop does.
const SAMPLES_PER_LAP_MIN = 150;
const SAMPLES_PER_LAP_MAX = 500;

const MAX_DT = 1 / 30; // clamp so a backgrounded tab doesn't teleport the sim

const RING_COLOR = "#2a3446";
const GEAR_COLOR = "#ff8a3d";
const GEAR_GLOW = "rgba(255, 138, 61, 0.85)";
const PARTICLE_SIZE = 1.6;

// Settled particles: a crisp core plus a dim, small "lighter"-blended halo
// (ParticleField.drawTwinkle), both modulated by a per-particle sine
// twinkle — no canvas-wide blur, so particles stay legible as discrete dots
// even where the curve overlaps itself densely.
const PARTICLE_COLOR = "rgba(140, 245, 255, 1)";
const HALO_SCALE = 2.2;
const HALO_ALPHA = 0.18;
const SETTLE_ALPHA = 0.4;
const TWINKLE_SPEED = 0.0022;

// A freshly-deposited particle is drawn hot and oversized (additive blend,
// no per-shape filter), then dissipates toward the settled brightness above
// over COMET_LENGTH samples. This is CLAUDE.md's "the path is being laid
// down and slowly settling" feel: the point never disappears or moves, only
// its paint intensity decays as it ages.
const COMET_LENGTH = 130;
const COMET_COLOR = "#eafeff";

// Ghost gear snapshots: a small fixed number of past gear positions, redrawn
// each frame from an explicit history buffer rather than left behind by
// incomplete clearing — a deliberate stop-motion trail, not a smear.
const GHOST_COUNT = 4;
const GHOST_STEP_DEG = 360 / RING_TEETH; // one ring-tooth of rotation apart
const GHOST_STEP_RAD = (GHOST_STEP_DEG * Math.PI) / 180;
const GHOST_BASE_ALPHA = 0.3;

// The dial's value sweep leaves a 60° gap at the bottom (like a volume
// knob) so the two ends of the 1..24 range read as distinct, not an
// ambiguous full wrap.
const DIAL_START_DEG = -150;
const DIAL_SWEEP_DEG = 300;

// Below this on-screen ring diameter, the stat row and chips are dropped so
// the HUD never overflows the ring's hole (which shrinks a lot as tooth
// count rises -- see updateHudGeometry).
const HUD_COMPACT_PX = 105;

const canvas = document.querySelector<HTMLCanvasElement>("#curve");
const ringHudEl = document.querySelector<HTMLElement>("#ring-hud");
const dialEl = document.querySelector<HTMLElement>("#dial");
const toothCountEl = document.querySelector<HTMLElement>("#tooth-count");
const cuspCountEl = document.querySelector<HTMLElement>("#cusp-count");
const heroStatEl = document.querySelector<HTMLElement>("#hero-stat");
const lapCountEl = document.querySelector<HTMLElement>("#lap-count");
const lapUnitEl = document.querySelector<HTMLElement>("#lap-unit");
const rotationCountEl = document.querySelector<HTMLElement>("#rotation-count");
const rotationCountStatEl = document.querySelector<HTMLElement>("#rotation-count-stat");
const thetaReadoutEl = document.querySelector<HTMLElement>("#theta-readout");
const teethSlider = document.querySelector<HTMLInputElement>("#teeth");
const chips = document.querySelectorAll<HTMLButtonElement>(".chip");

if (
  canvas &&
  ringHudEl &&
  dialEl &&
  toothCountEl &&
  cuspCountEl &&
  heroStatEl &&
  lapCountEl &&
  lapUnitEl &&
  rotationCountEl &&
  rotationCountStatEl &&
  thetaReadoutEl &&
  teethSlider
) {
  const ctx = canvas.getContext("2d");
  if (ctx) {
    init(
      canvas,
      ctx,
      ringHudEl,
      dialEl,
      toothCountEl,
      cuspCountEl,
      heroStatEl,
      lapCountEl,
      lapUnitEl,
      rotationCountEl,
      rotationCountStatEl,
      thetaReadoutEl,
      teethSlider,
    );
  }
}

setupScrollReveal();

function setupScrollReveal(): void {
  // Panels lift their own content in as the section arrives; .reveal blocks
  // stagger the three columns inside the info panel. Both ride the same
  // one-shot observer -- once something has been seen it stays put, so
  // scrolling back up doesn't replay the entrance.
  const targets = document.querySelectorAll<HTMLElement>(".panel, .reveal");
  if (targets.length === 0) return;
  // Only allow the stylesheet to hide anything once JS is live and able to
  // reveal it again. The entrance states start at opacity 0, so without this
  // a script error or a blocked module would render the page permanently
  // blank -- a far worse outcome than simply having no animation.
  document.documentElement.classList.add("js-reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15 },
  );
  for (const target of targets) observer.observe(target);
}

function samplesPerLap(): number {
  return Math.round(
    Math.min(SAMPLES_PER_LAP_MAX, Math.max(SAMPLES_PER_LAP_MIN, window.innerWidth * 0.4)),
  );
}

function init(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  ringHudEl: HTMLElement,
  dialEl: HTMLElement,
  toothCountEl: HTMLElement,
  cuspCountEl: HTMLElement,
  heroStatEl: HTMLElement,
  lapCountEl: HTMLElement,
  lapUnitEl: HTMLElement,
  rotationCountEl: HTMLElement,
  rotationCountStatEl: HTMLElement,
  thetaReadoutEl: HTMLElement,
  teethSlider: HTMLInputElement,
): void {
  const R = RING_TEETH;
  let r = START_ROLLING_TEETH;
  let lastCusps = -1;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const angularVelocity = (2 * Math.PI) / SECONDS_PER_LAP; // one ring-lap per SECONDS_PER_LAP, always

  let cssSize = 320;
  let field = new ParticleField(1);
  let theta = 0;
  let nextSampleTheta = 0;

  // History of past gear angles, one ring-tooth apart, for the discrete
  // ghost-gear trail — see drawGhostGear.
  let ghostThetas: number[] = [];
  let nextGhostTheta = 0;

  // Re-stamps the most recently deposited samples hot and oversized, additive
  // and decaying toward zero over COMET_LENGTH samples — crisp, no per-shape
  // filter. Every position here is one `field` sample already recorded; only
  // how brightly it's repainted changes with age, so nothing here is
  // decorative motion.
  function drawComet(): void {
    const n = Math.min(COMET_LENGTH, field.count);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = COMET_COLOR;
    for (let k = 0; k < n; k++) {
      const i = (field.cursor - 1 - k + field.capacity) % field.capacity;
      const age = k / Math.max(1, n - 1); // 0 = freshest, 1 = fully dissipated
      const decay = (1 - age) ** 1.5;
      const size = PARTICLE_SIZE * (1 + 3.5 * decay);
      const half = size / 2;
      const haloSize = size * HALO_SCALE;
      const haloHalf = haloSize / 2;
      ctx.globalAlpha = HALO_ALPHA * decay;
      ctx.fillRect(field.px[i] - haloHalf, field.py[i] - haloHalf, haloSize, haloSize);
      ctx.globalAlpha = decay;
      ctx.fillRect(field.px[i] - half, field.py[i] - half, size, size);
    }
    ctx.restore();
  }

  function updateDialAngle(): void {
    const min = Number(teethSlider.min);
    const max = Number(teethSlider.max);
    const pct = (r - min) / (max - min);
    const deg = DIAL_START_DEG + pct * DIAL_SWEEP_DEG;
    ringHudEl.style.setProperty("--progress-deg", `${deg}deg`);
    ringHudEl.style.setProperty("--handle-deg", `${deg}deg`);
  }

  // The ring's on-screen hole shrinks a lot as r rises (see maxRadius in
  // epicycloid.ts): scale the HUD's own box and font to match it exactly,
  // and drop the secondary readouts once there's no room for them.
  function updateHudGeometry(): void {
    const scale = cssSize / 2 / maxRadius(R, r);
    const ringPx = 2 * R * scale * 0.52;
    ringHudEl.style.setProperty("--ring-px", `${ringPx}px`);
    // 0.10 keeps the stacked readouts' total height inside the dial ring's
    // radius, so the ring never crosses the cusp number or the chips.
    ringHudEl.style.fontSize = `${ringPx * 0.1}px`;
    ringHudEl.classList.toggle("hud-compact", ringPx < HUD_COMPACT_PX);
  }

  function updateReadouts(): void {
    const laps = lapCount(R, r);
    const cusps = cuspCount(R, r);
    const rotations = totalRotations(R, r);
    toothCountEl.textContent = String(r);
    cuspCountEl.textContent = String(cusps);
    lapCountEl.textContent = String(laps);
    lapUnitEl.textContent = laps === 1 ? "lap" : "laps";
    rotationCountEl.textContent = String(rotations);
    rotationCountStatEl.textContent = String(rotations);

    if (lastCusps !== -1 && lastCusps !== cusps) {
      heroStatEl.classList.remove("pulse");
      // force reflow so the animation can restart on repeated changes
      void heroStatEl.offsetWidth;
      heroStatEl.classList.add("pulse");
    }
    lastCusps = cusps;

    for (const chip of chips) {
      chip.setAttribute("aria-pressed", String(Number(chip.dataset.teeth) === r));
    }

    updateDialAngle();
    updateHudGeometry();
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
    ctx.shadowBlur = 8;
    ctx.shadowColor = GEAR_GLOW;

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

    ctx.shadowBlur = 0;
  }

  // One past gear position: same outline + tooth-tick geometry as drawGear,
  // but no glow and no pen dot — a dim, dashed, deliberately "technical
  // drawing" stamp rather than a smeared afterimage.
  function drawGhostGear(scale: number, atTheta: number, alpha: number): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = GEAR_COLOR;

    const c = rollingCenter(R, r, atTheta);
    const [cx, cy] = toCanvas(c.x, c.y, scale);
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, 2 * Math.PI);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const spin = ((R + r) / r) * atTheta;
    for (let i = 0; i < r; i++) {
      const a = spin + (i / r) * 2 * Math.PI;
      const [ix, iy] = toCanvas(c.x + (r - 0.6) * Math.cos(a), c.y + (r - 0.6) * Math.sin(a), scale);
      const [ox, oy] = toCanvas(c.x + (r + 0.6) * Math.cos(a), c.y + (r + 0.6) * Math.sin(a), scale);
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(ox, oy);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  // Rebuilds particle storage for the current (R, r) and viewport. Called on
  // every tooth-count change and every resize, since both change how many
  // samples one full curve needs.
  function retarget(): void {
    const capacity = Math.max(1, Math.round(samplesPerLap() * lapCount(R, r)));
    field = new ParticleField(capacity);
    theta = 0;
    nextSampleTheta = 0;
    ghostThetas = [];
    nextGhostTheta = 0;
    updateReadouts();
  }

  function resize(): void {
    cssSize = canvas.clientWidth || canvas.parentElement?.clientWidth || 320;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssSize, cssSize);
    retarget();
  }

  // No motion: deposit every sample of the closed curve at once and draw the
  // finished figure directly, so the page still explains itself.
  function drawComplete(): void {
    const scale = cssSize / 2 / maxRadius(R, r);
    const end = totalTheta(R, r);
    ctx.clearRect(0, 0, cssSize, cssSize);
    for (let i = 0; i < field.capacity; i++) {
      const t = end * (i / field.capacity);
      const p = epicycloidPoint(R, r, t);
      const [x, y] = toCanvas(p.x, p.y, scale);
      field.deposit(x, y);
    }
    drawRing(scale);
    ctx.fillStyle = PARTICLE_COLOR;
    field.drawTwinkle(ctx, PARTICLE_SIZE * 1.2, HALO_SCALE, HALO_ALPHA, 1, 0, TWINKLE_SPEED);
    drawGear(scale, end);
    thetaReadoutEl.textContent = ((end * 180) / Math.PI).toFixed(1);
  }

  function frame(now: number, last: number): void {
    const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    const scale = cssSize / 2 / maxRadius(R, r);
    const end = totalTheta(R, r);

    theta += angularVelocity * dt;
    if (theta >= end) {
      theta -= end;
      nextSampleTheta -= end;
      nextGhostTheta -= end;
      ghostThetas = ghostThetas.map((t) => t - end);
    }

    const sampleStep = end / field.capacity;
    while (nextSampleTheta <= theta) {
      const p = epicycloidPoint(R, r, nextSampleTheta);
      const [x, y] = toCanvas(p.x, p.y, scale);
      field.deposit(x, y);
      nextSampleTheta += sampleStep;
    }

    while (nextGhostTheta <= theta) {
      ghostThetas.push(nextGhostTheta);
      if (ghostThetas.length > GHOST_COUNT) ghostThetas.shift();
      nextGhostTheta += GHOST_STEP_RAD;
    }

    ctx.clearRect(0, 0, cssSize, cssSize);
    drawRing(scale);
    for (let g = 0; g < ghostThetas.length; g++) {
      const alpha = GHOST_BASE_ALPHA * ((g + 1) / GHOST_COUNT);
      drawGhostGear(scale, ghostThetas[g], alpha);
    }
    ctx.fillStyle = PARTICLE_COLOR;
    field.drawTwinkle(ctx, PARTICLE_SIZE, HALO_SCALE, HALO_ALPHA, SETTLE_ALPHA, now, TWINKLE_SPEED);
    drawComet();
    drawGear(scale, theta);
    thetaReadoutEl.textContent = ((theta * 180) / Math.PI).toFixed(1);

    requestAnimationFrame((t) => frame(t, now));
  }

  teethSlider.addEventListener("input", () => {
    r = Number(teethSlider.value);
    retarget();
    if (reduceMotion) drawComplete();
  });

  for (const chip of chips) {
    chip.addEventListener("click", () => {
      const value = chip.dataset.teeth;
      if (!value) return;
      teethSlider.value = value;
      teethSlider.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  // Grab the dial and turn it, instead of only dragging a linear slider.
  // This drives the *same* range input the slider does (a dispatched real
  // "input" event), so keyboard access and the single source of truth for
  // tooth count are untouched -- it's an additional way to move the one
  // real control, not a replacement for it.
  // The mapping is absolute rather than accumulated: pressing anywhere on
  // the dial jumps straight to the tooth count for that angle. Accumulated
  // rotation meant a plain click did nothing at all and you had to catch a
  // handle dot a few pixels wide before anything moved.
  let dragging = false;
  let dragCenter = { x: 0, y: 0 };

  function valueFromPointer(clientX: number, clientY: number): number {
    const min = Number(teethSlider.min);
    const max = Number(teethSlider.max);
    // Degrees clockwise from 12 o'clock -- the same frame CSS uses for
    // conic-gradient's `from` angle and for rotate() on the handle.
    const deg =
      (Math.atan2(clientX - dragCenter.x, dragCenter.y - clientY) * 180) / Math.PI;
    let t = deg - DIAL_START_DEG;
    if (t < 0) t += 360;
    if (t > DIAL_SWEEP_DEG) {
      // Inside the 60 degree dead zone at the bottom: snap to whichever end
      // of the range is nearer instead of leaping across the whole sweep.
      t = t - DIAL_SWEEP_DEG < 360 - t ? DIAL_SWEEP_DEG : 0;
    }
    return Math.round(min + (t / DIAL_SWEEP_DEG) * (max - min));
  }

  function setTeethFromPointer(clientX: number, clientY: number): void {
    const next = valueFromPointer(clientX, clientY);
    if (next === r) return;
    teethSlider.value = String(next);
    teethSlider.dispatchEvent(new Event("input", { bubbles: true }));
  }

  dialEl.addEventListener("pointerdown", (e) => {
    const rect = dialEl.getBoundingClientRect();
    dragCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    // Ignore presses at the pivot itself, where the angle is undefined and a
    // pixel of travel would swing the value across the entire range.
    const dist = Math.hypot(e.clientX - dragCenter.x, e.clientY - dragCenter.y);
    if (dist < rect.width * 0.12) return;
    dragging = true;
    dialEl.setPointerCapture(e.pointerId);
    setTeethFromPointer(e.clientX, e.clientY);
  });

  dialEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    setTeethFromPointer(e.clientX, e.clientY);
  });

  function endDrag(e: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    if (dialEl.hasPointerCapture(e.pointerId)) dialEl.releasePointerCapture(e.pointerId);
  }

  dialEl.addEventListener("pointerup", endDrag);
  dialEl.addEventListener("pointercancel", endDrag);

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
