# Event-horison 
Earth Information Jukebox

## Run the integrated website

Double-click **Launch Website.cmd**, or run `python serve.py` in this folder.
Open `http://127.0.0.1:8100/#studio`. Any static HTTP host can also serve this
folder; the live scanner API and the sibling Resources junction are not needed.

The original home/explore design and sphere themes are retained. The studio
contains a bounded source image beside a brief description, with play/pause
and options underneath. Tunings are Musical and Pitch glide; sound modes are
Spatial chamber music and 128-row detail scan. Detail regions are Full image,
Upper third, Middle third and Lower third. Colour strips start collapsed.
Each strip can be played alone; Return to full image clears the solo. Pause
freezes the audio clock, so Resume continues from the same position. Clicking
the image seeks to that horizontal position and starts playback in either mode.
The keyboard-accessible position slider also seeks. The scan
lasts 36 seconds. No artificial drone or invented scientific readings are added.

`assets/data/manifest.json` indexes every Resources image, its name, a 3–5 word
description, thumbnail, full preview and prepared scanner JSON. Standalone
legends and basemaps remain as source assets and are excluded from the library.
The Image Library button opens a scrollable three-column modal. Available
legend scales are transcribed as text beneath the selected image. Prepared JSON is cached in the browser, with
the selected image and neighbouring images loaded first. Musical PCM is
prepared in a Web Worker before Play becomes available. The first selection
or a settings change can briefly show “Preparing sound”; Play then starts from
the prepared data. No runtime scan or external audio library is required.

The local `assets/js/scene_score.js` and `assets/js/sonification_engine.js` are
copies of the tested Jukebox engine. `sonifier.js` adds transport and region
selection; `app.js` connects routing, the manifest, the image and colour strips.
`studio.css` extends the site's existing visual language. Optional web fonts
load asynchronously, so unavailable font servers cannot block the application.

To rebuild the library from the sibling scanner repository:

```powershell
cd ../Jukebox
python tools/build_studio_library.py --workers 2
```

The builder scans all input images, reuses identical source scans across
folders, writes portable content-versioned assets, and publishes the manifest
after processing finishes. Original files are retained. Analysis is bounded to
2048 pixels on the longest side and encoded on the shared 256 × 128 sparse
grid. Original and analysis dimensions and source hashes are recorded in JSON.
Spiral detection is omitted because neither studio mode needs spiral objects.

The collection uses product-specific measurement masks before colour pooling:
terrain, ocean fills, polar ice, date badges and keys are suppressed where they
are context. Registered neutral continent masks are retained for atmospheric
fields. Real blue ocean observations remain audible in temperature and current
products. These are appearance masks, not physical calibration: faint smoke
mixed with terrain or a data colour identical to its base cannot be recovered
exactly from RGB. Legend text describes the supplied key, not recovered values.

An incremental rebuild can update selected products while retaining other scans:

```powershell
python tools/build_studio_library.py --only "atmosphere/near_surface_wind.jpg"
```

Incremental manifests record mixed scanner versions; each scan records its own
build provenance. A failed rebuild preserves the published manifest.

A realtime sonification engine that converts Earth Images captured by NASA into music which represents the data present in the image while being mesmerising and earthly.


Made for:
Blind or low vision users who want to explore the changes happening on the Earth.
Perceptive scientists or researchers who want to experience the existing data in another form.
Curious students or adults who want to explore Earth's data and its changing nature via music.

Team and members:
Team name - Event horison
1. Ishan Khatri
2. Nahar Kumar
3. Aneeka Karan
