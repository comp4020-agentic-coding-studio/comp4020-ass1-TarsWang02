// A fixed-capacity ring buffer of particle positions. Every particle is a
// point the pen actually occupied on the curve (see epicycloid.ts) — nothing
// here is decorative. Typed arrays, allocated once, no per-particle objects:
// see CLAUDE.md "Particle rendering standards".
export class ParticleField {
  readonly px: Float32Array;
  readonly py: Float32Array;
  // Per-particle random phase for the twinkle in drawTwinkle — brightness
  // oscillates over time, the position never does, so this doesn't touch
  // where the pen actually was.
  readonly phase: Float32Array;
  readonly capacity: number;
  count = 0;
  // Public so the renderer can find the most-recently-deposited particles
  // (the "comet head") without duplicating ring-buffer bookkeeping.
  cursor = 0;

  constructor(capacity: number) {
    this.capacity = Math.max(1, Math.floor(capacity));
    this.px = new Float32Array(this.capacity);
    this.py = new Float32Array(this.capacity);
    this.phase = new Float32Array(this.capacity);
  }

  deposit(x: number, y: number): void {
    this.px[this.cursor] = x;
    this.py[this.cursor] = y;
    this.phase[this.cursor] = Math.random() * Math.PI * 2;
    this.cursor = (this.cursor + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  // Two fillRects per particle — a larger, dim "halo" and a crisp core —
  // both additive ("lighter") and both scaled by a per-particle sine
  // twinkle. Still just fillRect, still no per-shape filter; the shimmer is
  // the only thing that moves, never the point itself.
  drawTwinkle(
    ctx: CanvasRenderingContext2D,
    baseSize: number,
    haloScale: number,
    haloAlpha: number,
    alpha: number,
    now: number,
    speed: number,
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const haloSize = baseSize * haloScale;
    const haloHalf = haloSize / 2;
    const coreHalf = baseSize / 2;
    for (let i = 0; i < this.count; i++) {
      const tw = 0.65 + 0.35 * Math.sin(now * speed + this.phase[i]);
      const x = this.px[i];
      const y = this.py[i];
      ctx.globalAlpha = haloAlpha * tw * alpha;
      ctx.fillRect(x - haloHalf, y - haloHalf, haloSize, haloSize);
      ctx.globalAlpha = tw * alpha;
      ctx.fillRect(x - coreHalf, y - coreHalf, baseSize, baseSize);
    }
    ctx.restore();
  }
}
