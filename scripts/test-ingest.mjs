/** One-off ingest smoke test — run: node scripts/test-ingest.mjs */
const APP = process.env.ANPOST_URL || "http://localhost:3000";

const urls = [
  "https://www.youtube.com/shorts/PDNilxkbW5E",
  "https://www.instagram.com/reels/DcV3SeaRGCe/",
];

for (const url of urls) {
  const res = await fetch(`${APP}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, niche: "news" }),
  });
  const body = await res.json();
  if (!res.ok) {
    console.log("FAIL", url, body.error);
    continue;
  }
  console.log("OK", url);
  console.log("  platform:", body.platform);
  console.log("  title:", (body.title || "").slice(0, 90));
  console.log("  cues:", body.transcript?.length ?? 0);
  console.log("  text len:", (body.transcriptText || "").length);
  console.log("  sample:", (body.transcriptText || "").slice(0, 180));
  console.log("  method:", (body.method || []).join(" | "));
}
