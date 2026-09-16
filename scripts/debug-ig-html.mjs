const code = process.argv[2] || "DbsWcfSuLck";
const html = await fetch(`https://www.instagram.com/reel/${code}/`, {
  headers: { "User-Agent": "facebookexternalhit/1.1" },
}).then((r) => r.text());
const patterns = [
  /og:video[^>]+content="([^"]+)"/i,
  /"video_versions"[^[]*\[[^\]]{0,2000}/,
  /cdninstagram[^"\\]{0,120}\.mp4/,
  /fbcdn[^"\\]{0,120}\.mp4/,
];
for (const p of patterns) {
  const m = html.match(p);
  console.log(p.toString().slice(0, 40), m ? String(m[0] || m[1]).slice(0, 160) : "none");
}
console.log("mp4 count", (html.match(/\.mp4/gi) || []).length);
