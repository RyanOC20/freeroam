# Freeroam — landing revamp brief

## Intent
Revamp the UI. Right now it falls victim to looking like typical AI UI (dark charcoal
`#0a0b0c`, monospace eyebrow labels, glassmorphism dropzone, hairline rgba borders,
orange glow accents). And the amber→orange→red heat palette on dark leans hard on
Strava's design language, which is doing most of the heavy lifting. Want it to feel
modern and distinctly its own, without depending on Strava's look.

## Product truth (do not change)
- **Freeroam** — "Your routes, all of them."
- Drop your Strava bulk-export ZIP onto the page → every GPS route you've ever recorded
  renders as a full-screen, pannable, zoomable heatmap. Corridors travelled most glow hottest.
- **No account, no login, no server.** The ZIP is unzipped and parsed entirely in the
  browser tab. GPS data never leaves the device.
- Formats inside the archive: GPX, TCX, FIT (some gzip-compressed).

## Surface
The landing page: nav, hero (with live heatmap canvas behind), the dropzone (idle /
parsing / done states), and the explainer sections (privacy-by-architecture, 3 steps).
Plus the in-map chrome later (filter dropdown, status bar) as a secondary surface.

## Mode (impeccable)
**Persuade** — a marketing landing whose job is the emotional hook + get the user to drop
their archive. Note: the map view itself is Experience; the reveal is the payoff.

## Real content / states
- Nav CTA: "Import your data" · dropzone CTA "Browse files"
- Dropzone states: idle (drop prompt), parsing (N / M activities, progress bar),
  done (stats: tracks, total distance, hottest place; "load a different archive")
- Steps: 1) Export from Strava (Settings → My Account → request archive) 2) Drop the ZIP
  3) Watch it light up
- Privacy line: "No login · No upload · No server ever sees your routes"

## Must-haves
- Live GPS heatmap presence in the hero (it is the product).
- The privacy/no-server story must stay legible and prominent.
- Real drop-target affordance.

## Anti-references
- Generic dark "AI startup" landing (glass cards, mono eyebrows, glow gradients).
- Leaning on Strava's orange-on-dark heat identity.
