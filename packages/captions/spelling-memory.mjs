// Telugu spelling memory: learn from owner-approved caption corrections, propose them on new episodes.
//
// Learn (after an episode's corrections are final; merges into the memory file):
//   node packages/captions/spelling-memory.mjs learn --raw <job>/transcript_raw.json
//     --overlay <approved overlay bound to the raw tokens> --episode "<name>" --memory docs/automation/TELUGU_SPELLING_MEMORY.json
// Propose (new episode, before the review page):
//   node packages/captions/spelling-memory.mjs propose --job <job dir> --memory <memory.json> --out proposals.json
//
// "always": every occurrence of the native word in an episode was corrected the same way -> confidence
// "memory" (still shown to the owner). "sometimes": only some occurrences were changed -> confidence
// "check" with the contexts it was changed in. Nothing is applied without the owner's decision.
import fs from "node:fs";
import path from "node:path";
import { applySourceCorrections } from "./transcript-corrections.mjs";

const [cmd] = process.argv.slice(2);
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
// Only well-attested whole words are "memory": corrected every time, 3+ letters, and seen twice or 4+ letters long.
const vlen = (t) => t.replace(/[ఀ-ఃా-్ౕౖ‌‍]/g, "").length;
const strong = (token, m) => m.kind === "always" && vlen(token) >= 3 && (m.seen >= 2 || vlen(token) >= 4);
const words = (t) => t.segments.flatMap((s) => s.words.map((w) => ({ ...w, word: w.word.trim() })));

if (cmd === "learn") {
  const rawPath = arg("--raw"), rawDoc = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  const raw = words(rawDoc);
  const overlay = JSON.parse(fs.readFileSync(arg("--overlay"), "utf8"));
  // Validate with the editor's own contract (Codex review 21 Oct, P2): the overlay must belong to this
  // job's source and every edit must bind to exactly one raw token (stale/ambiguous/duplicate -> refused).
  const job = JSON.parse(fs.readFileSync(path.join(path.dirname(rawPath), "job.json"), "utf8"));
  if (overlay.sourceSha256 !== job.source.sha256) throw new Error("overlay belongs to a different source recording");
  const applied = applySourceCorrections(rawDoc, overlay, job.source.sha256).corrections.applied;
  if (applied.length !== overlay.edits.length) throw new Error("not every overlay edit applied exactly once");
  const memPath = arg("--memory"), episode = arg("--episode");
  if (!memPath || !episode) throw new Error("learn needs --memory and --episode");
  const mem = fs.existsSync(memPath) ? JSON.parse(fs.readFileSync(memPath, "utf8")) : { schema: "bapi.telugu-spelling-memory/1", note: "Learned from owner-approved, source-bound caption corrections. Proposals only; the owner approves each change.", episodes: [], words: {} };
  if (mem.episodes.includes(episode)) throw new Error(`episode '${episode}' already learned`);
  const changed = new Map(); // raw index -> replacement
  for (const a of applied) {
    if (/^[?？]+$/.test(a.replacement.trim())) continue; // unclear-audio marker, not a spelling
    if (changed.has(a.wordIndex)) throw new Error(`two edits for the same word at ${a.sourceSeconds}s`);
    changed.set(a.wordIndex, a.replacement);
  }
  const byToken = new Map();
  raw.forEach((w, i) => { const s = byToken.get(w.word) ?? { total: 0, to: {}, contexts: [] }; s.total++; if (changed.has(i)) { const r = changed.get(i); s.to[r] = (s.to[r] ?? 0) + 1; if (s.contexts.length < 3) s.contexts.push(`${raw[i - 1]?.word ?? ""} [${w.word}→${r}] ${raw[i + 1]?.word ?? ""}`.trim()); } byToken.set(w.word, s); });
  let added = 0;
  for (const [token, s] of byToken) {
    const fixes = Object.values(s.to).reduce((a, b) => a + b, 0); if (!fixes) continue;
    const m = mem.words[token] ?? { seen: 0, corrected: {}, contexts: [], episodes: [] };
    m.seen += s.total; for (const [r, n] of Object.entries(s.to)) m.corrected[r] = (m.corrected[r] ?? 0) + n;
    m.contexts = [...m.contexts, ...s.contexts].slice(-6); m.episodes.push(episode);
    const total = Object.values(m.corrected).reduce((a, b) => a + b, 0), reps = Object.keys(m.corrected);
    m.kind = total === m.seen && reps.length === 1 ? "always" : "sometimes";
    mem.words[token] = m; added++;
  }
  mem.episodes.push(episode);
  fs.writeFileSync(memPath, JSON.stringify(mem, null, 1) + "\n");
  const kinds = Object.values(mem.words).reduce((a, w) => ((a[w.kind] = (a[w.kind] ?? 0) + 1), a), {});
  console.log(JSON.stringify({ episode, edits: overlay.edits.length, tokensLearned: added, memoryWords: Object.keys(mem.words).length, kinds }));
} else if (cmd === "propose") {
  const job = arg("--job"), mem = JSON.parse(fs.readFileSync(arg("--memory"), "utf8")), out = arg("--out");
  if (!job || !out) throw new Error("propose needs --job and --out");
  const ws = words(JSON.parse(fs.readFileSync(path.join(job, "transcript.json"), "utf8")));
  const proposals = [];
  for (const w of ws) {
    const m = mem.words[w.word]; if (!m) continue;
    const [best] = Object.entries(m.corrected).sort((a, b) => b[1] - a[1]);
    proposals.push({ sourceSeconds: w.start, expected: w.word, replacement: best[0], confidence: strong(w.word, m) ? "memory" : "check",
      reason: strong(w.word, m) ? `approved before every time (${m.seen}× in ${m.episodes.join(", ")})` : `changed ${Object.values(m.corrected).reduce((a, b) => a + b, 0)} of ${m.seen} times before; e.g. ${m.contexts[0]}` });
  }
  fs.writeFileSync(out, JSON.stringify(proposals, null, 1) + "\n", { flag: "wx" });
  const c = proposals.reduce((a, p) => ((a[p.confidence] = (a[p.confidence] ?? 0) + 1), a), {});
  console.log(JSON.stringify({ words: ws.length, proposals: proposals.length, ...c }));
} else {
  console.error("usage: spelling-memory.mjs learn|propose …"); process.exit(2);
}
