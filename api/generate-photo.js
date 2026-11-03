// Vercel serverless function — the production equivalent of the
// /api/generate-photo dev-server middleware in
// artifacts/boat-booth/vite.config.ts. Keep the two in sync; see that file
// for the verified xAI request shape (.agents/memory/xai-grok-imagine.md).
//
// Unlike the dev middleware, this does NOT store the generated image itself
// anywhere — Vercel functions are stateless and ephemeral, so an in-memory
// store wouldn't reliably survive between this call and a later request to
// download it. Instead this asks xAI for a hosted URL (response_format:
// "url") and returns that directly; api/photos.js proxies downloads from it
// with a forced Content-Disposition rather than us hosting the bytes.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "XAI_API_KEY is not set on the server." });
    return;
  }

  try {
    const { photoBase64, sceneDescription } = req.body || {};

    if (!photoBase64) {
      res.status(400).json({ error: "Missing photoBase64." });
      return;
    }

    const prompt = `Photorealistically place the person from the attached photo into this scene: ${sceneDescription || "a beautiful day out on the water"}. Preserve their face, identity, and body pose exactly. Natural lighting, high quality, cinematic.`;

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
      res.status(502).json({ error: `xAI image generation failed (${xaiRes.status}): ${errText}` });
      return;
    }

    const json = await xaiRes.json();
    const xaiUrl = json?.data?.[0]?.url;

    if (!xaiUrl) {
      res.status(502).json({ error: "xAI response had no image URL." });
      return;
    }

    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const downloadUrl = `${proto}://${host}/api/photos?src=${encodeURIComponent(xaiUrl)}`;

    res.status(200).json({ photoUrl: xaiUrl, downloadUrl });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown server error" });
  }
}
