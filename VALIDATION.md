# Integrated studio verification

All 79 Resources images have audited scanner output. The popup library shows
61 observations in three columns. The 18 standalone legends/basemaps remain
source assets and are excluded from its tiles. There are 43 associated legend
records, plus a combined scale line for the air-quality panels. Library captions
contain 3–5 words; the studio has longer listening guidance.

Every observation records a named measurement-layer policy applied before
256 × 128 colour pooling. Policies suppress physical terrain, base ocean fills,
polar ice and marginal annotations according to the product. Atmospheric fields
also retain registered neutral-continent exclusions. Blue ocean measurements
remain audible in temperature/current products. Unknown images continue through
the general detector. RGB masks cannot exactly recover faint overlays blended
with, or indistinguishable from, physical terrain. Legend text transcribes the
supplied keys and does not claim calibrated recovered values.

The full asset audit passes: source SHA-256 hashes, portable paths, unique IDs,
descriptions, grid dimensions, finite JSON, sparse coordinates, reference silence,
legend source availability and a policy on every observation. The Robinson fire
regression has no blue sheet. Both bundled engines match the scanner repository.
Published JSON totals 126,070,362 bytes before HTTP compression. Incremental
updates preserve each scan's build provenance.

Automated Chrome interaction passes all 16 combinations of two engines, two
tunings and four detail regions. Detail passes preserve row coordinates; the
detail engine uses its real AudioWorklet. Checks cover frozen-clock pause/resume,
image-click and slider seeking in both engines, rapid successive seeks, cancelled
asynchronous starts, colour solo and return to the full image. No scanner API
calls or JavaScript page errors occurred. Play began 357 ms after the click with
preparation complete; this is a local measurement, not a first-load guarantee.
Musical preparation takes a few seconds in a worker.

Desktop review at 1440 × 900 confirms a 680 × 340 source image, description on
the left and controls below it within the viewport. A separate popup regression
verifies readable images/captions, internal scrolling and three columns at both
1440 and 390 pixels. Mobile review finds no horizontal overflow. Escape closes
the modal. Home/Explore routing works. Popup rows use their content height so
they cannot collapse when the library contains many images. Screenshots were
visually reviewed after this correction.

Twelve JavaScript score/signal regressions pass, including PCM offsets and
chronological room/air envelopes near the end of a seek. Four measurement-mask
regressions pass. Workflow checks cover sampled-legend palette handoff and
preservation of upstream registered continent exclusions. This is targeted
engineering verification, not a blind-user recognition study.

Reproduce from the sibling Jukebox repository with Playwright in NODE_PATH and
the website running on port 8100:

```powershell
python tools/validate_studio_library.py
node --test tests/sonifier_score.test.js
python -m unittest tests.test_observation_layers tests.test_run_workflow -q
node tests/studio_website.browser.js
```

Screenshots and JSON audit reports are in ../Jukebox/output/sonifier/.
