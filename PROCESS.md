# Process overview

## What I built

Rolling: an interactive explainer where one small gear rolls around a fixed
24-tooth ring and a pen point on its rim deposits particles as it goes — those
particles are the curve, an epicycloid traced live from the parametric
equation. One control changes the gear's tooth count, and that number alone
decides whether the result is a 3-petal figure closing in one lap or a 24-cusp
web taking thirteen. The elaborate figure isn't complicated: it's one circle
rolling.

## The moments that mattered

1. **Fixing the deploy path before writing any product code.** The starter
   ships with `pnpm check:evidence` red on a fresh checkout — no
   `reflections/assignment-1.md`, and a `PROCESS.md` of fake commit hashes
   that gate CI's deploy job. The obvious move is to leave it until the end,
   once there's real content for it. I fixed the gate first with honest if
   minimal content, made the repo public, and dispatched CI to confirm the
   whole pipeline — build, evidence, deploy, live-URL check — worked before
   betting a day of work on it.
   [`2f57aa2`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-TarsWang02/commit/2f57aa2)

2. **Not trusting a "broken" animation without finding out why.** With the
   particles wired up the gear appeared to crawl, barely moving after several
   seconds when the physics said it should have finished a lap. The
   obvious fixes were to raise the angular velocity or loosen the
   `dt = min(realDt, 1/30)` clamp CLAUDE.md's particle standards require. I
   checked `document.hidden` instead; it was `true`. The automation browser
   reports its own tab as hidden, throttling `requestAnimationFrame` hard —
   the clamp was doing its job on exactly the case it exists for. To test the
   stepping logic without watching it run, I wrote a standalone Node
   simulation at a fixed 60fps; deposits per lap matched capacity across
   multiple wraps. Loosening the clamp would have shipped a real bug to fix a
   fake one.
   [`e32f729`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-TarsWang02/commit/e32f729)

3. **Cutting a claim rather than shipping it vague.** For the "not the same
   curve" section the easy line was "like a Wankel engine's rotor" — punchier,
   and wrong: the Wankel housing is an epitrochoid, and this page renders only
   the `d = r` case, a true epicycloid. CLAUDE.md says an imprecise claim
   costs more than a missing one, so I wrote the distinction instead, and did
   the same for epicyclic gear trains.
   [`e3f627f`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-TarsWang02/commit/e3f627f)

4. **Surfacing a conflict instead of quietly resolving it.** A later request —
   progressive intro/interactive/info stages, and a more direct "turn the
   gear" control — ran into two invariants I had written into CLAUDE.md
   myself: "no multi-page site" is explicit out-of-scope, and
   "particles are never a transition" rules out using the particle field to
   move between stages. Rather than bend either quietly, I laid the conflict
   out and asked first, then built what fits inside both: three scroll-snap
   panels in one document — no router, no page load, one particle system
   throughout — joined by native scrolling, so a particle still means exactly
   one thing everywhere. The dial is additive; the real range input still
   drives the render, so tab-through survives. Both resolutions are now in
   CLAUDE.md, so the next change reads them, not the rules they appear to
   break.
   [`54cd69b`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-TarsWang02/commit/54cd69b)

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that the
current reflection entry is in `reflections/`, and that your `CLAUDE.md` is
there — before a marker ever opens the file. It checks that your map is
traceable, not that it is good: the marker judges whether your small,
deliberately chosen set of moments shows real judgement and reflection. A green
check is not a substitute for that curation.
