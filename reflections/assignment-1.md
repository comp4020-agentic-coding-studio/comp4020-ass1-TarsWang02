# Assignment 1 reflection

## What was the breakthrough that moved the work forward?

Setting the harness before touching the canvas. I spent the first stretch
writing CLAUDE.md's concept invariants and domain facts — the exact
parametric equation, the cusp/lap formulas, which real-world claims are true
and which are almost-true-but-wrong (a Wankel rotor is an epitrochoid, not
an epicycloid) — before generating a single pixel. That paid off directly
the moment the particle animation appeared to be crawling: with the
invariants already written down, I knew the `dt` clamp was required
behaviour, not a suspect, so instead of loosening it to "fix" the symptom I
checked `document.hidden` and found the real cause was the browser
automation tab being throttled, not my code. A harness written before the
problem shows up is one that can later tell you which surprises are bugs
and which are the rules working as intended.

## What did this work change about who I want to be as a software developer?

It sharpened a distinction between fixing a symptom and confirming a cause.
The instinct when something looks wrong is to change the thing you're
staring at — turn up the speed, loosen the clamp, tweak the number until
the screen looks right. That instinct is fast and usually wrong in a way
you don't discover until later. What actually worked was treating "it looks
broken" as a question rather than a diagnosis: check what the runtime
actually thinks is happening before changing code that was written
deliberately, for a documented reason. I'd rather be the developer who
spends five extra minutes finding out *why* something looks wrong, because
that five minutes is usually the difference between fixing the real bug and
quietly introducing a worse one to paper over a fake one.
