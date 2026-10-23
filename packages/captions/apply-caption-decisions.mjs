// Apply owner caption decisions: writes a NEW correction overlay bound to the RAW ASR tokens.
//
// Decisions come from the review page, which shows the DISPLAY transcript (with any --base overlay applied).
// Each accepted decision must name the exact displayed word at its time; it is mapped by word position to its RAW
// token (mapping verified in job-transcripts.mjs) and emitted with the RAW word and RAW time. Refused, with no file
// written: decisions without this job's source hash, a displayed word that does not match, a time that matches no
// word or several, two accepted decisions for the same word, or anything left broken / in English letters in range.
// A decision may intentionally revise a --base edit for the same word; accepting the original RAW word removes it.
//
// Usage:
//   node packages/captions/apply-caption-decisions.mjs --job <job dir>
//     --decisions <caption-spelling-decisions.json> --evidence "<who approved, when, how>"
//     --out <new corrections.json> [--base <existing RAW-bound corrections.json>] [--from s] [--to s]
import fs from "node:fs";
import { applySourceCorrections } from "./transcript-corrections.mjs";
import { scanTranscript } from "./telugu-caption-scan.mjs";
import { loadJobTranscripts, applyOverlayToDisplay, rawEdit } from "./job-transcripts.mjs";

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const job = arg("--job"), out = arg("--out"), evidence = arg("--evidence");
if (!job || !out || !arg("--decisions") || !evidence) { console.error("usage: --job <dir> --decisions <json> --evidence <text> --out <new json> [--base f] [--from s] [--to s]"); process.exit(2); }
const refuse = (m) => { console.error(`Refused: ${m}`); process.exit(1); };

let jt;
try { jt = loadJobTranscripts(job); } catch (e) { refuse(e.message); }
const base = arg("--base") ? JSON.parse(fs.readFileSync(arg("--base"), "utf8")) : null;
if (base && base.sourceSha256 !== jt.sha) refuse("base overlay belongs to a different source");
let shown;
try { shown = applyOverlayToDisplay(jt, base); } catch (e) { refuse(`base overlay does not apply to this job: ${e.message}`); }
const displayWords = shown.display.segments.flatMap((s) => s.words);

const decisions = JSON.parse(fs.readFileSync(arg("--decisions"), "utf8"));
if (decisions.sourceSha256 !== jt.sha) refuse("decisions are missing this job's sourceSha256 or belong to a different source");
if (!Array.isArray(decisions.decisions)) refuse("decisions.decisions must be a list");

const finalByIndex = new Map(shown.replacementByIndex), decided = new Set();
let changed = 0;
for (const [k, d] of decisions.decisions.entries()) {
  if (d.decision !== "accept") continue;
  const where = `decision ${k} at ${d.sourceSeconds}s`;
  if (typeof d.expected !== "string" || !d.expected.trim()) refuse(`${where}: expected (the displayed word) is required`);
  if (typeof d.replacement !== "string" || !/^\S+$/.test(d.replacement)) refuse(`${where}: replacement must be one word, got '${d.replacement}'`);
  const hits = displayWords.map((w, i) => i).filter((i) => Math.abs(displayWords[i].start - d.sourceSeconds) <= 0.01);
  if (hits.length !== 1) refuse(`${where}: matches ${hits.length} displayed words (need exactly one)`);
  const i = hits[0];
  if (displayWords[i].word.trim() !== d.expected.trim()) refuse(`${where}: expected '${d.expected}' but the displayed word is '${displayWords[i].word.trim()}' (stale decision)`);
  if (decided.has(i)) refuse(`${where}: a second accepted decision for the same word`);
  decided.add(i);
  if (d.replacement === displayWords[i].word.trim()) continue; // no change
  if (d.replacement === jt.rawWords[i].word.trim()) finalByIndex.delete(i); // revert an earlier base edit
  else finalByIndex.set(i, d.replacement);
  changed++;
}

const overlay = {
  sourceSha256: jt.sha,
  approvalEvidence: [base?.approvalEvidence, evidence].filter(Boolean).join(" | "),
  binding: "raw-asr-tokens",
  edits: [...finalByIndex].sort(([a], [b]) => a - b).map(([i, w]) => rawEdit(jt, i, w)),
};
if (!overlay.edits.length) refuse("no edits to write");
let corrected;
try {
  applySourceCorrections(jt.raw, overlay, jt.sha); // every edit binds to exactly one RAW token
  corrected = applyOverlayToDisplay(jt, overlay).display;
} catch (e) { refuse(e.message); }
const check = scanTranscript({ transcript: corrected, from: Number(arg("--from") ?? 0), to: Number(arg("--to") ?? Infinity) });
if (check.suspects.length) {
  console.error("Refused: words in range still broken or in English letters:");
  for (const s of check.suspects) console.error(`  ${s.sourceSeconds}s ${s.word} [${s.problems.join("; ")}]`);
  process.exit(1);
}
fs.writeFileSync(out, JSON.stringify(overlay, null, 1) + "\n", { flag: "wx" });
console.log(`Wrote ${out}: ${overlay.edits.length} RAW-bound edits (${changed} new/changed from decisions). Validated; ${check.wordCount} words in range are clean.`);
