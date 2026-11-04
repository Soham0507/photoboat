# Boat Booth

An interactive photo booth experience: pick a boat scene, snap a photo, and
get placed into it. Built with React, Vite, and Tailwind CSS v4.

Generation runs **entirely offline, client-side** — the booth runs at venues
with no internet connection. `artifacts/boat-booth/src/lib/offline-compositor.ts`
segments the guest out of their photo with TensorFlow.js BodyPix (model
weights bundled locally under `public/models/bodypix/`, not fetched from a
CDN) and composites them onto the chosen scene's background image with a
`<canvas>`. No network request is made anywhere in that pipeline. (An earlier
version called xAI's Grok Imagine API for a photorealistic AI blend — that
needed internet and has been replaced by this cutout-and-overlay approach.)

## Project structure

```
.
├── artifacts/boat-booth/   # The app (Vite + React frontend)
├── attached_assets/        # Scene photos used by the app
└── pnpm-workspace.yaml     # Workspace + dependency catalog
```

`artifacts/boat-booth` is a pnpm workspace package with no backend service at
all — generation happens in the browser.

`artifacts/boat-booth/src/stub-api-client.tsx` is a local in-memory
implementation of the `@workspace/api-client-react` package (aliased in
`vite.config.ts`), standing in for scenes/stats/generation-history storage.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) (the `preinstall` script enforces this)

## Setup

```bash
pnpm install
```

## Running

```bash
pnpm --filter @workspace/boat-booth run dev
```

The dev server prints both a `Local` and a `Network` URL — open the booth
screen via the **Network** address if guests on the same local Wi-Fi need to
reach it from their phones. No internet uplink is required for any of this;
only the local network.

## Notes

- `attached_assets/` holds the three scene photos (pontoon sunset,
  wakesurfing, bass fishing) referenced via the `@assets` Vite alias.
- `public/models/bodypix/` holds the BodyPix segmentation model weights
  (~5.2MB, float weights — chosen over the smaller quantized model for
  cleaner mask edges), bundled into the build so the first photo doesn't fetch
  anything externally.
- The result screen's "scan to download" QR code only appears when a
  generation has a `downloadUrl` (i.e. a real backend hosting the photo at a
  short URL); since this offline build has none, guests instead get a
  "Download Photo" button that saves the composited image straight from the
  browser.
