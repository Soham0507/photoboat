# Boat Booth

An interactive photo booth experience: pick a boat scene, snap a photo, and
get placed into it by AI. Built with React, Vite, Tailwind CSS v4, and
xAI's Grok Imagine image-edit API.

## Project structure

```
.
├── artifacts/boat-booth/   # The app (Vite + React frontend)
├── attached_assets/        # Scene photos used by the app
└── pnpm-workspace.yaml     # Workspace + dependency catalog
```

`artifacts/boat-booth` is a pnpm workspace package. There is no separate
backend service — `artifacts/boat-booth/vite.config.ts` runs a small
server-side proxy inside the Vite dev server itself, handling:

- `POST /api/generate-photo` — calls xAI's Grok Imagine API to place the
  captured photo into the chosen scene (keeps the API key server-side only).
- `GET /api/photos/:id.png` — serves a generated photo by a short id, used
  by the QR code on the result screen so guests can download it from their
  own phone.

`artifacts/boat-booth/src/stub-api-client.tsx` is a local in-memory
implementation of the `@workspace/api-client-react` package (aliased in
`vite.config.ts`), standing in for a real backend service.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) (the `preinstall` script enforces this)
- An [xAI API key](https://x.ai/) with access to the Grok Imagine models

## Setup

```bash
pnpm install
```

Then add your xAI API key:

```bash
# artifacts/boat-booth/.env
XAI_API_KEY=your-key-here
```

This file is gitignored and is only ever read by the dev server process —
the key is never sent to the browser.

## Running

```bash
pnpm --filter @workspace/boat-booth run dev
```

The dev server prints both a `Local` and a `Network` URL. Open the booth
screen via the **Network** address (not `localhost`) if you want the QR
code on the result screen to be scannable from a phone on the same Wi-Fi —
the download URL is built from that address.

## Notes

- Without `XAI_API_KEY` set, photo generation will fail with a clear error
  (shown in the UI with a retry option) rather than silently doing nothing.
- `attached_assets/` holds the three scene photos (pontoon sunset,
  wakesurfing, bass fishing) referenced via the `@assets` Vite alias.
