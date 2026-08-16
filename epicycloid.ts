// The maths behind the figure: a circle of radius r rolling on the outside of
// a fixed circle of radius R, pen at distance d from the rolling centre.
// d = r (pen on the rim) gives a true epicycloid — sharp cusps touching the
// ring. See CLAUDE.md "Domain facts" for the derivation and the worked
// R=24 examples this module is tested against.

export interface Point {
  x: number;
  y: number;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

// Number of cusps the curve has before it starts retracing itself.
export function cuspCount(R: number, r: number): number {
  return R / gcd(R, r);
}

// Number of laps the rolling gear makes around the ring before the curve closes.
export function lapCount(R: number, r: number): number {
  return r / gcd(R, r);
}

// The parameter range needed to draw one full closed curve.
export function totalTheta(R: number, r: number): number {
  return 2 * Math.PI * lapCount(R, r);
}

// The centre of the rolling gear, at angle theta around the fixed ring.
export function rollingCenter(R: number, r: number, theta: number): Point {
  return {
    x: (R + r) * Math.cos(theta),
    y: (R + r) * Math.sin(theta),
  };
}

// The pen point on the rolling gear's rim (d = r), at angle theta.
export function epicycloidPoint(R: number, r: number, theta: number): Point {
  const k = (R + r) / r;
  return {
    x: (R + r) * Math.cos(theta) - r * Math.cos(k * theta),
    y: (R + r) * Math.sin(theta) - r * Math.sin(k * theta),
  };
}

// The figure is radially bounded within a circle of this radius (d = r case),
// so a square canvas scaled to this always fits it without clipping.
export function maxRadius(R: number, r: number): number {
  return R + 2 * r;
}

// Full rotations the rolling gear makes relative to the fixed frame over one
// lap around the ring — the coin rotation paradox falls straight out of this:
// rotationCount(r, r) = 2, not 1, for two identical coins.
export function rotationCount(R: number, r: number): number {
  return (R + r) / r;
}
