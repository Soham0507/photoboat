import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
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

// Same host xAI's hosted generated-image URLs come from — /api/photos below
// only ever proxies this host, never an arbitrary one, so it can't be used
// as an open proxy. Mirrors api/photos.js (the Vercel production version of
// this same endpoint) — keep the two in sync.
const XAI_IMAGE_HOST = "imgen.x.ai";

/**
 * Dev-only server-side proxy to xAI's Grok Imagine image-edit endpoint, so
 * the API key never reaches the browser. See .agents/memory/xai-grok-imagine.md
 * for the verified request/response shapes and a known intermittent 500
 * outage on xAI's side. Mirrors api/generate-photo.js + api/photos.js (the
 * Vercel production versions) — this exists separately because Vite's dev
 * server doesn't run Vercel's serverless functions.
 */
function xaiImageProxyPlugin(port: number): Plugin {
  return {
    name: "xai-image-proxy",
    configureServer(server) {
      // Proxies a download from xAI's temporary hosted image URL, adding a
      // Content-Disposition header so scanning the QR code on the result
      // screen triggers an actual download instead of opening the image.
      server.middlewares.use("/api/photos", async (req, res) => {
        const src = new URLSearchParams(req.url?.split("?")[1] || "").get("src");
        if (!src) {
          res.statusCode = 400;
          res.end("Missing src");
          return;
        }

        let url: URL;
        try {
          url = new URL(src);
        } catch {
          res.statusCode = 400;
          res.end("Invalid src");
          return;
        }

        if (url.hostname !== XAI_IMAGE_HOST) {
          res.statusCode = 400;
          res.end("Invalid source host");
          return;
        }

        try {
          const upstream = await fetch(url.toString());
          if (!upstream.ok) {
            res.statusCode = 502;
            res.end("Upstream fetch failed");
            return;
          }
          const buffer = Buffer.from(await upstream.arrayBuffer());
          res.statusCode = 200;
          res.setHeader("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
          res.setHeader("Content-Disposition", 'attachment; filename="boat-booth-photo.jpg"');
          res.end(buffer);
        } catch (err) {
          res.statusCode = 500;
          res.end(err instanceof Error ? err.message : "Unknown server error");
        }
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
              response_format: "url",
            }),
          });

          if (!xaiRes.ok) {
            const errText = await xaiRes.text();
            res.statusCode = 502;
            res.end(JSON.stringify({ error: `xAI image generation failed (${xaiRes.status}): ${errText}` }));
            return;
          }

          const json = await xaiRes.json();
          const xaiUrl: string | undefined = json?.data?.[0]?.url;

          if (!xaiUrl) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: "xAI response had no image URL." }));
            return;
          }

          // The /api/photos proxy above needs to be reachable from the
          // guest's phone, not just this machine — see getLanAddress().
          const lanAddress = getLanAddress();
          const host = lanAddress ? `${lanAddress}:${port}` : req.headers.host;
          const downloadUrl = `${req.headers["x-forwarded-proto"] || "http"}://${host}/api/photos?src=${encodeURIComponent(xaiUrl)}`;

          res.statusCode = 200;
          res.end(JSON.stringify({ photoUrl: xaiUrl, downloadUrl }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown server error" }));
        }
      });
    },
  };
}

export default defineConfig(async ({ command }) => {
  // PORT/BASE_PATH only matter for the dev server and `vite preview` — a
  // production build (e.g. on Vercel, which sets neither) doesn't bind a
  // port or need a non-root base, so only require them when actually
  // serving, instead of failing every build without them.
  const isServe = command === "serve";

  const rawPort = process.env.PORT;
  if (isServe && !rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }
  const port = Number(rawPort || 4000);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = process.env.BASE_PATH;
  if (isServe && !basePath) {
    throw new Error(
      "BASE_PATH environment variable is required but was not provided.",
    );
  }

  return {
    base: basePath || "/",
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      xaiImageProxyPlugin(port),
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
  };
});
