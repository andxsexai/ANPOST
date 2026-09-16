import { analyzeVideo } from "../src/lib/video";
import { fetchInstagramPost } from "../src/lib/instagram";
import { ingestSignal } from "../src/lib/ingest";

async function run() {
  const igUrl = process.argv[2] || "https://www.instagram.com/reels/DbsWcfSuLck/";
  try {
    const ig = await fetchInstagramPost(igUrl);
    console.log("IG caption", ig.caption.length, ig.caption.slice(0, 120));
    console.log("IG voiceover len", ig.voiceover.length);
    console.log("IG voiceover sample", ig.voiceover.slice(0, 280));
    console.log("IG method", ig.method.join(" | "));
  } catch (e) {
    console.log("IG fail", e instanceof Error ? e.message : e);
  }

  const full = await ingestSignal({ url: igUrl });
  console.log("ingest text len", full.transcriptText.length);
  console.log("ingest method", full.method.join(" | "));
}

run().catch(console.error);
