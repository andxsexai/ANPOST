const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function youtubeTest() {
  const videoId = "PDNilxkbW5E";
  const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({
      context: { client: { clientName: "ANDROID", clientVersion: "20.10.38", hl: "ru", gl: "RU" } },
      videoId,
    }),
  });
  const data = await res.json();
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  console.log("YT title:", data?.videoDetails?.title);
  console.log("YT tracks:", tracks.length, tracks.map((t) => t.languageCode).join(","));
  if (tracks[0]?.baseUrl) {
    const cap = await fetch(tracks[0].baseUrl.replace(/\\u0026/g, "&") + "&fmt=json3", {
      headers: { "User-Agent": UA },
    });
    const text = await cap.text();
    console.log("cap sample:", text.slice(0, 200));
    console.log("cap len:", text.length);
  }
}

async function igTest() {
  const url = "https://www.instagram.com/reel/DcV3SeaRGCe/";
  const ua = "facebookexternalhit/1.1";
  const res = await fetch(url, { headers: { "User-Agent": ua }, redirect: "follow" });
  const html = await res.text();
  const og = html.match(/property="og:description" content="([^"]+)"/i)?.[1] || "";
  console.log("IG status:", res.status, "html len:", html.length);
  console.log("IG og:desc:", og.slice(0, 200));
  console.log("login wall:", /Log In|Sign Up|зарегистрируйтесь/i.test(html.slice(0, 5000)));
}

await youtubeTest();
await igTest();
