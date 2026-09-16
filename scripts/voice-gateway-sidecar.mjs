/**
 * Optional sidecar: POST { "url": "..." } -> { "text": "..." }
 * Run on VPS with yt-dlp + ffmpeg. Point ANPOST_VOICE_GATEWAY_URL to this server.
 *
 *   node scripts/voice-gateway-sidecar.mjs
 *   ANPOST_VOICE_GATEWAY_URL=http://your-vps:8787/voice
 */
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const exec = promisify(execFile);
const PORT = Number(process.env.PORT || 8787);

async function pullText(url) {
  const dir = await mkdtemp(join(tmpdir(), "anpost-"));
  const out = join(dir, "clip.%(ext)s");
  try {
    await exec("yt-dlp", ["-f", "bestaudio/best", "-o", out, "--print", "description", url], {
      timeout: 120_000,
    });
    const { stdout } = await exec("yt-dlp", ["--get-url", "-f", "bestaudio/best", url], {
      timeout: 60_000,
    });
    const media = stdout.trim().split("\n")[0];
    if (!media) return "";
    const wav = join(dir, "audio.wav");
    await exec("ffmpeg", ["-y", "-i", media, "-ar", "16000", "-ac", "1", wav], { timeout: 120_000 });
    if (process.env.OPENAI_API_KEY) {
      const buf = await readFile(wav);
      const form = new FormData();
      form.append("file", new Blob([buf], { type: "audio/wav" }), "audio.wav");
      form.append("model", "whisper-1");
      form.append("language", "ru");
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: form,
      });
      if (res.ok) return (await res.text()).trim();
    }
    return "";
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/voice") {
    res.writeHead(404);
    res.end("POST /voice");
    return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  let url = "";
  try {
    url = JSON.parse(Buffer.concat(chunks).toString()).url || "";
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "bad json" }));
    return;
  }
  try {
    const text = await pullText(url);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ text, title: text.slice(0, 100) }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(error) }));
  }
}).listen(PORT, () => console.log(`ANPOST voice sidecar :${PORT}`));
