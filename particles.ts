// A fixed-capacity ring buffer of particle positions. Every particle is a
// point the pen actually occupied on the curve (see epicycloid.ts) — nothing
// here is decorative. Typed arrays, allocated once, no per-particle objects:
// see CLAUDE.md "Particle rendering standards".
export class ParticleField {
  readonly px: Float32Array;
  readonly py: Float32Array;
  readonly capacity: number;
  count = 0;
  private cursor = 0;

  constructor(capacity: number) {
    this.capacity = Math.max(1, Math.floor(capacity));
    this.px = new Float32Array(this.capacity);
    this.py = new Float32Array(this.capacity);
  }

  deposit(x: number, y: number): void {
    this.px[this.cursor] = x;
    this.py[this.cursor] = y;
    this.cursor = (this.cursor + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  draw(ctx: CanvasRenderingContext2D, particleSize: number): void {
    const half = particleSize / 2;
    for (let i = 0; i < this.count; i++) {
      ctx.fillRect(this.px[i] - half, this.py[i] - half, particleSize, particleSize);
    }
  }
}
