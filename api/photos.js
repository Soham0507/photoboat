// Vercel serverless function — proxies a download from xAI's temporary
// hosted image URL (returned by api/generate-photo.js), adding a
// Content-Disposition header so scanning the QR code on the result screen
// triggers an actual download instead of just opening the image.
//
// `src` is restricted to xAI's own image host so this can never be used as
// an open proxy for arbitrary URLs.
const ALLOWED_HOST = "imgen.x.ai";

export default async function handler(req, res) {
  const src = req.query?.src;

  if (typeof src !== "string") {
    res.status(400).send("Missing src");
    return;
  }

  let url;
  try {
    url = new URL(src);
  } catch {
    res.status(400).send("Invalid src");
    return;
  }

  if (url.hostname !== ALLOWED_HOST) {
    res.status(400).send("Invalid source host");
    return;
  }

  try {
    const upstream = await fetch(url.toString());
    if (!upstream.ok) {
      res.status(502).send("Upstream fetch failed");
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
    res.setHeader("Content-Disposition", 'attachment; filename="boat-booth-photo.jpg"');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).send(err instanceof Error ? err.message : "Unknown server error");
  }
}
