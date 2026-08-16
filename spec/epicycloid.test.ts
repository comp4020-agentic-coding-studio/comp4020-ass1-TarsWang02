import { describe, expect, it } from "vitest";
import {
  cuspCount,
  epicycloidPoint,
  gcd,
  lapCount,
  maxRadius,
  rollingCenter,
  rotationCount,
  totalTheta,
} from "../epicycloid";

// The core interaction contract from CLAUDE.md: changing the tooth-count
// slider changes cusp count, which is R / gcd(R, r). Verified numerically
// against known pairs, not by eye — a curve can look plausible and be wrong.
describe("cusp and lap counts", () => {
  it("R=24, r=8 -> 3 cusps, closes in 1 lap", () => {
    expect(cuspCount(24, 8)).toBe(3);
    expect(lapCount(24, 8)).toBe(1);
  });

  it("R=24, r=7 -> 24 cusps, closes in 7 laps", () => {
    expect(cuspCount(24, 7)).toBe(24);
    expect(lapCount(24, 7)).toBe(7);
  });

  it("R=24, r=6 -> 4 cusps, closes in 1 lap", () => {
    expect(cuspCount(24, 6)).toBe(4);
    expect(lapCount(24, 6)).toBe(1);
  });

  it("R=24, r=9 -> 8 cusps, closes in 3 laps", () => {
    expect(cuspCount(24, 9)).toBe(8);
    expect(lapCount(24, 9)).toBe(3);
  });

  it("R=r (1:1) is the cardioid: 1 cusp, closes in 1 lap", () => {
    expect(cuspCount(12, 12)).toBe(1);
    expect(lapCount(12, 12)).toBe(1);
  });
});

describe("gcd", () => {
  it("handles coprime, shared-factor, and equal inputs", () => {
    expect(gcd(24, 7)).toBe(1);
    expect(gcd(24, 8)).toBe(8);
    expect(gcd(12, 12)).toBe(12);
  });
});

describe("the coin rotation paradox", () => {
  it("two identical coins: the rolling coin turns twice, not once", () => {
    expect(rotationCount(12, 12)).toBe(2);
  });

  it("a small gear on a big ring turns more per lap the smaller it is", () => {
    expect(rotationCount(24, 8)).toBe(4);
    expect(rotationCount(24, 6)).toBe(5);
  });
});

describe("epicycloidPoint", () => {
  it("starts on the ring at theta=0, touching a cusp", () => {
    // At theta=0 the pen sits at (R+r) - r = R on the x-axis, the classic cusp
    // touching the fixed ring.
    const p = epicycloidPoint(24, 8, 0);
    expect(p.x).toBeCloseTo(24, 10);
    expect(p.y).toBeCloseTo(0, 10);
  });

  it("stays within the radial bound R + 2r for every theta", () => {
    const R = 24;
    const r = 7;
    const bound = maxRadius(R, r);
    const steps = 2000;
    for (let i = 0; i <= steps; i++) {
      const theta = totalTheta(R, r) * (i / steps);
      const p = epicycloidPoint(R, r, theta);
      const radius = Math.hypot(p.x, p.y);
      expect(radius).toBeLessThanOrEqual(bound + 1e-9);
    }
  });

  it("closes exactly after totalTheta, retracing the start point", () => {
    const R = 24;
    const r = 7;
    const start = epicycloidPoint(R, r, 0);
    const end = epicycloidPoint(R, r, totalTheta(R, r));
    expect(end.x).toBeCloseTo(start.x, 6);
    expect(end.y).toBeCloseTo(start.y, 6);
  });
});

describe("rollingCenter", () => {
  it("is always at distance R + r from the origin", () => {
    const R = 24;
    const r = 8;
    for (const theta of [0, 0.7, 2.3, Math.PI, 5]) {
      const c = rollingCenter(R, r, theta);
      expect(Math.hypot(c.x, c.y)).toBeCloseTo(R + r, 10);
    }
  });
});
