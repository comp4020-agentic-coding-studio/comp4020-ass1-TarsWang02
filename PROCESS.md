# Process overview

Work in progress — this file is updated at every green check as the build
moves through S0→S4. The final version will hold 3–4 curated moments; this is
the running draft.

## What I built

Rolling: an interactive explainer where one small gear rolls around a fixed
ring, a pen point on its rim deposits particles as it goes, and those
particles are the curve — an epicycloid/epitrochoid traced live from the
parametric equation, controlled by a single tooth-count slider.

## The moments that mattered

1. **Setting up the harness before writing any prototype code.** The starter
   ships with a generic `CLAUDE.md`; before touching the canvas I wrote the
   project's own harness — the concept invariants, the parametric equation and
   the three real-world claims that are easy to state imprecisely, the
   particle-rendering performance rules, and the S0→S4 build order — so later
   work (and later agent turns) has a fixed contract to build against rather
   than re-deriving scope each time.
   [`45e8b30`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-TarsWang02/commit/45e8b30)

_(more moments added here as the build proceeds — see commit history for the
full trail.)_

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that the
current reflection entry is in `reflections/`, and that your `CLAUDE.md` is
there — before a marker ever opens the file. It checks that your map is
traceable, not that it is good: the marker judges whether your small,
deliberately chosen set of moments shows real judgement and reflection. A green
check is not a substitute for that curation.
