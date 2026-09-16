import { analyzeVideo } from "../src/lib/video";
import { fetchInstagramPost } from "../src/lib/instagram";
import { ingestSignal } from "../src/lib/ingest";

async function run() {
  const y = await analyzeVideo("https://www.youtube.com/shorts/PDNilxkbW5E");
  console.log("YT cues", y.transcript.length);
  console.log("YT text", y.transcriptText.slice(0, 200));
  console.log("YT method", y.method.join(" | "));

  try {
    const ig = await fetchInstagramPost("https://www.instagram.com/reels/DcV3SeaRGCe/");
    console.log("IG caption", ig.caption.length, ig.caption.slice(0, 200));
  } catch (e) {
    console.log("IG fail", e instanceof Error ? e.message : e);
  }

  const full = await ingestSignal({ url: "https://www.youtube.com/shorts/PDNilxkbW5E" });
  console.log("ingest TG words", full.telegramWords, "threads", full.threadsWords);
}

run().catch(console.error);
