# Process overview

## What I built

Rolling: an interactive explainer where one small gear rolls around a fixed
24-tooth ring, a pen point on its rim deposits particles as it goes, and
those particles are the curve — an epicycloid traced live from the
parametric equation. One slider changes the rolling gear's tooth count; that
single number decides whether the result is a 3-petal figure that closes in
one lap or a 24-cusp web that takes seven. The point of view is that the
elaborate figure isn't complicated — it's one circle rolling, and the only
thing that changed was how many teeth it has.

## The moments that mattered

1. **Fixing the deploy path before writing any product code.** The starter
   ships with `pnpm check:evidence` red on a fresh checkout — no
   `reflections/assignment-1.md`, and `PROCESS.md` full of fake commit
   hashes that gate CI's deploy job. The obvious move is to leave that until
   the very end, once there's real content to put in it. Instead I fixed the
   gate first, with honest (if minimal) content, then flipped the repo
   public and dispatched CI to confirm the whole pipeline — build, evidence
   check, secret scans, Pages deploy, live-URL check — actually worked,
   before betting a day of work on it.
   [`2f57aa2`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-TarsWang02/commit/2f57aa2)

2. **Not trusting a "broken" animation without finding out why.** Once the
   particle system was wired up, the rolling gear appeared to crawl —
   barely moving after several real seconds, when the physics said it
   should have completed a full lap. The obvious fix would have been to
   guess: raise the angular velocity, or loosen the `dt` clamp CLAUDE.md's
   particle standards require (`dt = min(realDt, 1/30)`, specifically to
   stop a backgrounded tab from teleporting). I checked `document.hidden`
   in-page instead of guessing, and it was `true` — the browser automation
   tool reports its own tab as hidden regardless of clicking into it, which
   throttles `requestAnimationFrame` hard. The dt clamp was doing exactly
   its job on exactly the scenario it exists for; the bug hypothesis was
   wrong. To verify the frame-stepping and wraparound logic was actually
   correct despite not being able to watch it run at real speed, I wrote a
   standalone Node simulation of the same stepping code at a fixed 60fps,
   decoupled from wall-clock time — it confirmed deposits-per-lap matched
   capacity exactly across multiple wraps for both the 1-lap and 7-lap
   cases. Loosening the clamp to make testing more convenient would have
   shipped a real bug (background-tab teleporting) to fix a fake one.
   [`e32f729`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-TarsWang02/commit/e32f729)

3. **Cutting a claim rather than shipping it vague.** Writing the "not the
   same curve" section, the easy version was "this is like a Wankel
   engine's rotor" — punchier, and wrong: the Wankel housing is an
   epitrochoid (pen off the rolling circle's rim), and this page only ever
   renders the d=r case, a true epicycloid (pen on the rim). CLAUDE.md is
   explicit that an imprecise real-world claim costs more than a missing
   one, so I wrote the distinction instead of the loose analogy, and did
   the same for epicyclic (planetary) gear trains, which share a word root
   with this curve's tooth profile and nothing else.
   [`e3f627f`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-TarsWang02/commit/e3f627f)

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that the
current reflection entry is in `reflections/`, and that your `CLAUDE.md` is
there — before a marker ever opens the file. It checks that your map is
traceable, not that it is good: the marker judges whether your small,
deliberately chosen set of moments shows real judgement and reflection. A green
check is not a substitute for that curation.
