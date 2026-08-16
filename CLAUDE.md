# Rolling — an interactive explainer about epicycloids and gear teeth

## What this is

A static, client-side interactive explainer. One small gear rolls around a
fixed ring; the pen point on its rim deposits particles as it goes; those
particles **are** the curve. One control changes the rolling gear's tooth
count, and the figure it traces changes completely.

The thesis, in one sentence:

> The elaborate figure is not complicated — it is one circle rolling, and the
> only thing you changed was how many teeth it has.

Three things this is arguing, in order of how much they matter:

1. **Simple rule, complex result.** The whole figure comes from one point on
   one rolling circle. Nothing else.
2. **One parameter is the whole world.** 8 teeth and 7 teeth differ by one
   tooth and produce entirely different objects — a 3-petal figure that closes
   in one lap, versus a 24-cusp web that takes seven laps to close.
3. **This is why clock gears look like that.** The curve isn't decorative
   maths; traditional clock gear teeth are cut to this profile because it
   meshes smoothly at low tooth counts.

## The concept invariants

These are what the prototype is _for_. Breaking one of these is not a bug to
fix later, it is the prototype no longer making its argument. If a change
would break one, don't make the change.

- **Particles are trajectory, never decoration and never a transition.** Every
  particle marks a position the pen actually occupied on its path. Particles
  never morph, fly, scatter, or tween between two unrelated shapes. If a
  particle is somewhere the pen never was, that is a bug.
- **The curve is generated, never drawn.** No preset `<path>`, no traced SVG,
  no hardcoded point list. It comes out of the parametric equation every time,
  at every parameter value. A reader who changes the slider must be watching
  real maths, not a lookup table of pretty pictures.
- **The slider is a tooth count, not a ratio.** The control says
  `8 teeth` against a `24-tooth` ring, never `R/r = 3`. Tying the parameter to
  a countable physical thing is the entire reason the gear framing works. Do
  not "simplify" this into an abstract ratio slider.
- **The rolling gear stays visible while it draws.** The cause (a small circle
  rolling) and the effect (a large curve) must be on screen together. Hiding
  the gear and showing only the finished curve removes the explanation.

## Domain facts (get these right)

The parametric curve, rolling on the **outside** of a fixed circle of radius
`R`, rolling circle radius `r`, pen at distance `d` from the rolling centre:

```
x = (R + r)·cos θ − d·cos(((R + r)/r)·θ)
y = (R + r)·sin θ − d·sin(((R + r)/r)·θ)
```

- `d = r` is a true **epicycloid** — the pen is on the rim, and the curve has
  sharp cusps touching the ring.
- `d ≠ r` is an **epitrochoid** — rounded loops (`d < r`) or self-crossing
  loops (`d > r`). Use the correct word for whichever you render.
- With integer tooth counts `R` and `r`, let `g = gcd(R, r)`:
  - cusps = `R / g`
  - laps to close = `r / g`
  - Verify: `R=24, r=8` → 3 cusps, closes in 1 lap. `R=24, r=7` → 24 cusps,
    closes in 7 laps.
- `R = r` (1:1) is a **cardioid**, and it is the **coin rotation paradox**: a
  coin rolled once around an identical coin turns twice, not once. This is a
  real, checkable claim — it is the strongest hook in the piece.

Three claims about the real world that must be stated precisely, because the
imprecise versions are wrong:

- **Clock gears — true.** Traditional clock and watch gearing uses a cycloidal
  tooth profile (epicycloidal face, hypocycloidal flank), not the involute
  profile used in most modern machinery. The reason is that it meshes better
  at the very low tooth counts clock pinions use.
- **Wankel rotor — say epitrochoid, not epicycloid.** The rotor housing is an
  epitrochoid. Calling it an epicycloid is wrong; don't write it.
- **Epicyclic (planetary) gear trains are a different thing.** That is gears
  whose _axes_ orbit, a mechanical layout. It shares a word root with cycloidal
  _tooth profiles_ and nothing else. Never imply they're the same idea.

If you cannot state a real-world claim precisely, cut it. An imprecise claim
in an explainer costs more than a missing one.

## Particle rendering standards

These are the rules that keep the particle layer fast enough to survive the
phone viewport. They are not stylistic preferences.

- **Sample the equation, never `getImageData`.** The canonical particle-shape
  technique (render target to an offscreen canvas, read pixels, threshold on
  alpha, use those as targets) exists because most shapes have no closed form.
  This one does. Sampling the parametric equation directly is exact,
  resolution-independent, and cheaper. Do not reach for the imageData habit.
- **Typed arrays, not object arrays.** Particle state lives in
  `Float32Array`s (`px`, `py`, and any velocity/phase channels), allocated
  once at setup. No `{x, y}` object per particle, no per-frame allocation —
  that is what makes a particle field stutter under GC.
- **`fillRect`, not `arc`.** `beginPath` + `arc` + `fill` per particle is the
  classic particle-canvas performance mistake. A 1–2px `fillRect` is several
  times faster and visually indistinguishable at this size. Batch by setting
  `fillStyle` once outside the loop.
- **Trails come from a low-alpha fill, not from `clearRect`.** Painting the
  background at low alpha each frame (rather than clearing it) leaves a decay
  trail for free, and that decay is exactly the "the path is being laid down
  and slowly settling" feel this piece wants. Tune the alpha; don't build a
  per-particle history buffer.
- **Device pixel ratio, capped.** `canvas.width = cssWidth * min(dpr, 2)` and
  scale the context. Uncapped DPR on a phone is a silent 3× fill-rate cost.
- **Particle count scales with viewport width**, resolved once at setup and
  again on resize. The desktop count must never be what a 390px phone runs.
- **Clamp the frame delta.** `dt = min(realDt, 1/30)` so a backgrounded tab
  resuming doesn't teleport the simulation.
- **Respect `prefers-reduced-motion`.** When set, skip the animated deposition
  and render the completed curve immediately. The piece must still explain
  itself with no motion at all.

## Interaction contract

The marker opens the live URL, uses the core interaction for a minute, resizes
mid-use, and tabs through it. Design for exactly that.

- **The core interaction, stated so it can be tested:** changing the tooth
  count slider changes the rendered curve — specifically its cusp count, which
  is `R / gcd(R, r)` and is displayed as a number on screen. A test can assert
  that function directly, and that the displayed value matches it.
- **Motion is allowed to take its time.** The slider does not have to snap to
  a finished figure. Let the gear roll and the particles accumulate at a pace
  that is legible — the deposition is the explanation, so rushing it to look
  responsive would trade away the point. Changing the slider mid-roll should
  re-target smoothly rather than hard-cutting.
- **A range input gives keyboard access for free.** Use a real
  `<input type="range">`. Do not replace it with a custom canvas-drag control;
  drag-only interaction fails the tab-through check outright. A pointer-driven
  control layered _on top_ is allowed, and is what shipped (the ring dial),
  but only on these terms: the range input stays in the DOM, stays focusable
  (`sr-only`, never `display:none`), and remains the single source of truth —
  the dial sets `.value` on that same element and dispatches a real `input`
  event. If a gesture ever becomes the only way to reach a value, it has
  broken this rule.
- **Pointer controls must respond to a plain click, not only a drag.** The
  dial first shipped accumulating relative rotation, which meant clicking it
  did nothing at all and the only grab target was a handful of pixels. Map
  pointer angle absolutely onto the control's sweep instead, and snap the
  dead zone to the nearer end.
- **Everything readable must be DOM text, not canvas text.** Cusp count, lap
  count, tooth count: real elements, so they are selectable, zoomable, and
  reachable by a screen reader. Canvas-rendered numbers are invisible to all
  three.

## Viewport contract

Both 1920×1080 and 390×844 are full marking environments.

- **The figure is radially bounded** — it always fits inside a circle of
  radius `R + 2r`, so the canvas is **square** and scales to fit. There is no
  wide-versus-tall layout problem to solve; do not invent one.
- Compute the scale factor from `R + 2r` every time the parameters or the
  canvas size change, so the figure always fills its box without clipping.
- Controls and readouts sit **inside the fixed ring's hole**, centred on the
  canvas, at both sizes — the same single arrangement, not two layouts. (This
  replaces an earlier "controls sit below the canvas" rule; the ring's
  interior is dead space the rolling gear can never enter, and putting the
  cause and the numbers in one focal point beats stacking them apart.)
- **The ring's hole is not a fixed size.** Its on-screen radius is
  `R · scale` where `scale = (cssSize/2) / (R + 2r)`, so it shrinks sharply as
  tooth count rises — at `r=24` it is roughly half its `r=8` size. Size the
  HUD and its font from that measured value on every parameter and resize
  change, never from a constant.
- **Below a legibility floor, drop the secondary readouts rather than shrink
  them.** Everything in the HUD scales from one font size, so it never
  overflows — but it does become unreadable. Under ~105px of ring diameter the
  stat row and preset chips are hidden, leaving the cusp number and the dial.
- Re-resolve canvas size, DPR and particle count on resize; the marker resizes
  mid-interaction and a stale backing store shows up immediately.

## Structural invariants (from `spec/invariants.test.ts`)

The starter's own checks fail the build if these slip, and they are easy to
lose while focused on the canvas:

- one `<h1>`, exactly — not zero, not two
- a `<nav>` landmark on the page
- `lang` on `<html>`, a non-empty `<title>`, a viewport meta tag
- `alt` on every `<img>`

The canvas needs a text alternative too. Give it an `aria-label` describing
what it shows, and keep the live cusp/lap readouts as DOM text next to it.

## Build order, and what to cut

The deadline is **12:00, Monday 17 August 2026**. Ship stages in this order
and be willing to stop after any one of them — each stage is a complete,
submittable piece on its own.

- **S0 — a page that ships.** Vite starter builds, `pnpm check` green, page
  deployed and live at the Pages URL with the structural invariants met. Do
  this first, not last: a deployed empty-ish page beats an undeployed good one,
  and the deploy path is where surprises live.
- **S1 — the static figure, generated.** Canvas draws the curve from the
  parametric equation for a fixed tooth count. Correct maths, correct scale,
  square and fitting at both viewports. No animation yet. **If time runs out,
  ship here** — this already answers the brief.
- **S2 — the slider.** Tooth count control wired to the render, cusp and lap
  counts shown as DOM text, `R / gcd(R, r)` unit-tested. This is the core
  interaction; the assignment requires it, so treat S2 as the real floor and
  S1 as the emergency floor.
- **S3 — the particle deposition.** The rolling gear draws, particles
  accumulate along the path, trails decay. This is the visual payload and it
  is where the remaining budget goes — the standards above exist so this stage
  can be generous without becoming a phone-killer.
- **S4 — the framing.** The 1:1 coin paradox called out explicitly, and the
  clock-gear payoff at the end. Cheap in code, high value for the "response to
  the brief" criterion.

Anything not in this list is out of scope: no multi-page site, no hypocycloid
(inside-rolling) mode, no Fourier/Lissajous side quests, no audio, no WebGL,
no library dependency. One idea, carried all the way.

What "no multi-page site" rules out is routing and page loads, not a sense of
progression. The three stages above ship as three full-viewport scroll-snap
panels inside the **one** `index.html`: no router, no navigation, no second
document, and one particle system running continuously across all of them.
The panels are joined by native scrolling — deliberately not by the particle
field, which would break "particles are never a transition".

## Evidence, which is 45% of the mark

Larger than the artefact criterion. Build the record as you go — it cannot be
reconstructed afterwards.

- **Commit at every green check**, with a message saying what changed and why.
  A trail that grew with the work is the evidence; one dump at the end is not.
- **`PROCESS.md`: 400–600 words, three or four moments — not more.** Each
  moment needs room to say what you did _instead of_ the obvious thing, and
  how you knew the result was right. Cite commits in the required format;
  `pnpm check:evidence` verifies the citations resolve.
- **The strongest moments are corrections that landed in this file.** A rule
  added to CLAUDE.md, a check wired up, an attempt thrown away. Retrying until
  it passes is routine; changing what the work runs against is the skilled
  case, and the rubric says so explicitly. When something goes wrong here,
  fix it in this file first and cite that.
- **`reflections/assignment-1.md` must exist and be named exactly that.**
  `pnpm check:evidence` checks the name against the course API, and evidence
  gates the deploy. It is also what the week 4 retro reads.
- **The repo is currently private.** It must be public with Pages deployed and
  the live URL loading before the deadline. Do not leave this to the last
  minute — CI has to finish too.

## Working rules

- Keep `pnpm dev` running; check the rendered page rather than reasoning about
  it. The rendered page is the truth.
- Run `pnpm check` before every push. Never commit a red state.
- Verify the maths numerically, not by eye: assert `R / gcd(R, r)` against
  known pairs in a test. A curve can look plausible and be wrong.
- When a check fails, read the failure before changing anything.
- **Never let a JS-gated hidden state be able to render the page blank.** The
  scroll entrance animations start at `opacity: 0`, so a script that failed to
  load would have shown a reader nothing at all. Every hidden state is gated
  behind a `js-reveal` class that JS adds at startup: if the script dies, the
  page degrades to "no animation", never to "no page". Any future
  reveal-on-scroll effect goes behind the same gate.
- **`document.hidden` before blaming the animation.** A backgrounded or
  occluded tab stops `requestAnimationFrame` *and* IntersectionObserver
  delivery, so a stalled figure or a section stuck at `opacity: 0` is usually
  the window being behind another one, not a bug. Check it first; it has
  already cost time twice.
