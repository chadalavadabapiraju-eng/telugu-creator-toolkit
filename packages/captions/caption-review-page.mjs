// Caption spelling review page (360 Life reel finishing, step 2).
//
// Turns reviewer-written spelling proposals into one self-contained HTML page:
// per suspect word, the caption now, the proposed spelling (editable), a
// 3-second audio clip cut from the job's normalized source (1 s before the
// word) and an Accept / Keep decision. Export downloads (and shows) the
// decisions; nothing is applied by the page.
//
// proposals.json: [{ sourceSeconds, expected, replacement, confidence:
//   "certain"|"likely"|"check", reason }]  - one native word -> one word
//   (no spaces; join multi-word fixes with '-' or split them across tokens).
//
// Usage:
//   node packages/captions/caption-review-page.mjs --job <job dir>
//     --proposals <proposals.json> --out <new folder> [--overlay <existing corrections>]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadJobTranscripts, applyOverlayToDisplay } from "./job-transcripts.mjs";

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const job = arg("--job"), out = arg("--out"), proposalsPath = arg("--proposals");
if (!job || !out || !proposalsPath) { console.error("usage: --job <dir> --proposals <json> --out <new folder> [--overlay f]"); process.exit(2); }
fs.mkdirSync(out); // a new folder only; never overwrites a previous review

const jobJson = JSON.parse(fs.readFileSync(path.join(job, "job.json"), "utf8"));
// Shows the display transcript; a RAW-bound --overlay is applied through the verified RAW mapping.
const jt = loadJobTranscripts(job);
const transcript = applyOverlayToDisplay(jt, arg("--overlay") ? JSON.parse(fs.readFileSync(arg("--overlay"), "utf8")) : null).display;
const words = transcript.segments.flatMap((s) => s.words);
const source = [path.join(job, "work/bundle/public/source.mp4"), jobJson.normalizedSource?.path].find((p) => p && fs.existsSync(p));
if (!source) throw new Error("normalized source not found in the job folder");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const badge = { certain: "#1f7a3a", likely: "#9a6b00", check: "#a12b2b" };
const proposals = JSON.parse(fs.readFileSync(proposalsPath, "utf8"));
const rows = proposals.map((p, k) => {
  const i = words.findIndex((w) => w.word === p.expected && Math.abs(w.start - p.sourceSeconds) <= 0.05);
  if (i < 0) throw new Error(`proposal ${k}: '${p.expected}' not found at ${p.sourceSeconds}s`);
  if (/\s/.test(p.replacement)) throw new Error(`proposal ${k}: replacement must be one word (no spaces)`);
  const clip = execFileSync("ffmpeg", ["-v", "error", "-ss", Math.max(0, words[i].start - 1).toFixed(3), "-i", source, "-t", "3", "-vn", "-ac", "1", "-b:a", "64k", "-f", "mp3", "-"], { maxBuffer: 1 << 24 });
  return { ...p, id: `c${String(k).padStart(3, "0")}`, sourceSeconds: words[i].start, context: words.slice(Math.max(0, i - 4), i + 5).map((w) => w.word).join(" "), audio: clip.toString("base64") };
}).sort((a, b) => ["certain", "likely", "check"].indexOf(a.confidence) - ["certain", "likely", "check"].indexOf(b.confidence) || a.sourceSeconds - b.sourceSeconds);

const trs = rows.map((r) => `<tr data-id="${r.id}" data-seconds="${r.sourceSeconds}" data-expected="${esc(r.expected)}"><td>${r.sourceSeconds.toFixed(2)}s</td><td><span class=b style="background:${badge[r.confidence] ?? "#555"}">${esc(r.confidence)}</span></td><td class=te>${esc(r.expected)}</td><td><input class=te value="${esc(r.replacement === "?" ? "" : r.replacement)}" placeholder="type the correct spelling"></td><td><audio controls preload=none src="data:audio/mpeg;base64,${r.audio}"></audio><div class=ctx>${esc(r.context)}</div><small>${esc(r.reason ?? "")}</small></td><td><select><option value=pending>—</option><option value=accept>Accept</option><option value=keep>Keep original</option></select></td></tr>`).join("");
const html = `<!doctype html><meta charset=utf-8><title>Telugu caption spelling review</title><style>body{font-family:'Nirmala UI','Segoe UI',sans-serif;margin:20px;background:#fafafa;color:#222}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:8px;vertical-align:top;text-align:left}.te{font-size:20px}input.te{width:220px;padding:4px}.b{color:#fff;padding:2px 8px;border-radius:10px;font-size:12px}.ctx{color:#555;font-size:15px;margin:4px 0}audio{height:32px;width:260px}button{font-size:16px;padding:8px 16px}</style>
<h1>Telugu caption spelling review</h1><p>Source ${esc(jobJson.source.sha256.slice(0, 12))} · ${rows.length} words. <b>certain</b> = broken letters / English letters; <b>likely</b> = misspelling; <b>check</b> = listen. Rule: every caption word in correct Telugu script. Clips start 1 s before the word. Nothing changes until the exported decisions are applied.</p>
<button id=all>Accept all</button> <button id=cert>Accept all 'certain'</button> <button id=exp>Export decisions</button>
<table><tr><th>Time (source)</th><th>Confidence</th><th>Caption now</th><th>Correct spelling</th><th>Listen / context</th><th>Decision</th></tr>${trs}</table><pre id=out style="white-space:pre-wrap;background:#fff;border:1px solid #ccc;padding:10px;display:none"></pre>
<script>const rows=[...document.querySelectorAll('tr[data-id]')];const set=f=>rows.forEach(r=>{if(f(r))r.querySelector('select').value='accept'});
document.getElementById('all').onclick=()=>set(r=>r.querySelector('input').value.trim()!=='');document.getElementById('cert').onclick=()=>set(r=>r.querySelector('.b').textContent==='certain');
document.getElementById('exp').onclick=()=>{const d={schema:'bapi.caption-spelling-decisions/1',sourceSha256:${JSON.stringify(jobJson.source.sha256)},decisions:rows.map(r=>({sourceSeconds:+r.dataset.seconds,expected:r.dataset.expected,replacement:r.querySelector('input').value.trim(),decision:r.querySelector('select').value}))};const s=JSON.stringify(d,null,1);const o=document.getElementById('out');o.style.display='block';o.textContent=s;try{navigator.clipboard.writeText(s)}catch(e){}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([s],{type:'application/json'}));a.download='caption-spelling-decisions.json';a.click();};</script>`;
fs.writeFileSync(path.join(out, "index.html"), html, { flag: "wx" });
console.log(`Wrote ${path.join(out, "index.html")} (${rows.length} words). Serve it on loopback, e.g.: python -m http.server <port> --bind 127.0.0.1 --directory "${out}"`);
