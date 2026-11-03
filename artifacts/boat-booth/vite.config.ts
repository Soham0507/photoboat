import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { randomUUID } from "node:crypto";
import { networkInterfaces } from "node:os";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// "localhost" (what req.headers.host is when the booth screen itself opens
// the app via localhost) means nothing to a guest's phone — it resolves to
// the phone, not this machine, which is exactly the "site can't be reached"
// a QR scan hits. Use this machine's actual LAN IP instead, the same
// address Vite's own "Network:" startup banner already advertises, so a
// phone on the same Wi-Fi can actually reach it.
function getLanAddress(): string | null {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }
  return null;
}

// Loads XAI_API_KEY (and anything else) from .env into process.env for this
// dev-server process only — never exposed to client code or the bundle.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, ".env"));
} catch {
  // .env missing is fine; the /api/generate-photo proxy below reports a
  // clear error if XAI_API_KEY ends up unset.
}

// In-memory store for generated photos, keyed by a random id, so each one
// gets its own short, scannable download URL instead of embedding the whole
// (multi-MB base64) image in a QR code. Lives only for this dev-server
// process's lifetime — fine for a booth preview, not meant to persist.
const photoStore = new Map<string, Buffer>();

/**
 * Dev-only server-side proxy to xAI's Grok Imagine image-edit endpoint, so
 * the API key never reaches the browser. See .agents/memory/xai-grok-imagine.md
 * for the verified request/response shapes and a known intermittent 500
 * outage on xAI's side.
 */
function xaiImageProxyPlugin(): Plugin {
  return {
    name: "xai-image-proxy",
    configureServer(server) {
      // Serves a previously generated photo by id — this is the URL a
      // guest's QR scan resolves to, so it must work from another device on
      // the same network, not just this one. Vite's dev server already
      // listens on 0.0.0.0 (see server.host below); the URL itself is built
      // with getLanAddress() in /api/generate-photo below, not req.headers.host,
      // since that's "localhost" whenever the booth screen opens the app via
      // localhost — meaningless to a guest's phone.
      server.middlewares.use("/api/photos/", (req, res) => {
        const id = (req.url || "").replace(/^\//, "").replace(/\.png$/, "");
        const buffer = photoStore.get(id);
        if (!buffer) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Content-Disposition", 'attachment; filename="boat-booth-photo.png"');
        res.end(buffer);
      });

      server.middlewares.use("/api/generate-photo", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }

        res.setHeader("Content-Type", "application/json");

        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "XAI_API_KEY is not set. Add it to artifacts/boat-booth/.env and restart the dev server." }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const { photoBase64, sceneDescription } = JSON.parse(Buffer.concat(chunks).toString("utf-8"));

          if (!photoBase64) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Missing photoBase64." }));
            return;
          }

          const prompt = `Photorealistically place the person from the attached photo into this scene: ${sceneDescription}. Preserve their face, identity, and body pose exactly. Natural lighting, high quality, cinematic.`;

          const xaiRes = await fetch("https://api.x.ai/v1/images/edits", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            // NOTE: `image` must be the struct { type, image_url } — a bare
            // string 422s. See .agents/memory/xai-grok-imagine.md.
            body: JSON.stringify({
              model: "grok-imagine-image",
              prompt,
              image: { type: "image_url", image_url: photoBase64 },
              n: 1,
              response_format: "b64_json",
            }),
          });

          if (!xaiRes.ok) {
            const errText = await xaiRes.text();
            res.statusCode = 502;
            res.end(JSON.stringify({ error: `xAI image generation failed (${xaiRes.status}): ${errText}` }));
            return;
          }

          const json = await xaiRes.json();
          const b64 = json?.data?.[0]?.b64_json;
          const url = json?.data?.[0]?.url;
          const photoUrl = b64 ? `data:image/png;base64,${b64}` : url;

          if (!photoUrl) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: "xAI response had no image data." }));
            return;
          }

          // Also store the bytes under a short id so the result screen can
          // show a QR code pointing at a small URL (/api/photos/<id>.png)
          // instead of trying to encode the whole image into the QR itself.
          let downloadUrl: string | undefined;
          if (b64) {
            const photoId = randomUUID();
            photoStore.set(photoId, Buffer.from(b64, "base64"));
            const lanAddress = getLanAddress();
            const host = lanAddress ? `${lanAddress}:${port}` : req.headers.host;
            downloadUrl = `${req.headers["x-forwarded-proto"] || "http"}://${host}/api/photos/${photoId}.png`;
          }

          res.statusCode = 200;
          res.end(JSON.stringify({ photoUrl, downloadUrl }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown server error" }));
        }
      });
    },
  };
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    xaiImageProxyPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      // Stub: the real "@workspace/api-client-react" workspace package isn't
      // present in this copied project. See src/stub-api-client.tsx.
      "@workspace/api-client-react": path.resolve(import.meta.dirname, "src/stub-api-client.tsx"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
