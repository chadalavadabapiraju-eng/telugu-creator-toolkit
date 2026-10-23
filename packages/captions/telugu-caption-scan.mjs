// Telugu caption scan (360 Life reel finishing, step 1). Read-only.
//
// Applies an optional source-bound correction overlay to a job transcript,
// then reports every word that cannot be shown as-is under the house rule
// "every caption word in correct Telugu script":
//   - MALFORMED: broken Telugu letter sequences (two vowel signs, a vowel sign
//     or virama with no consonant, double virama) - render as broken glyphs;
//   - LATIN: English letters (loanwords must be written in Telugu script).
// It also prints the full text in short timed lines (optionally limited to a
// time range) so the reviewer can read every word for misspellings and
// mishearings that are valid-looking Telugu. Proposals are written by the
// reviewer, never guessed by this script.
//
// Usage:
//   node packages/captions/telugu-caption-scan.mjs --job <job dir>
//     [--overlay <corrections.json>] [--from <s>] [--to <s>] [--json <out.json>]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { applySourceCorrections } from "./transcript-corrections.mjs";

const VOWEL_SIGNS = "ా-ౌౕౖౢౣ";
const VIRAMA = "్";
const CONSONANTS = "క-హౘ-ౚ";
const RULES = [
  [new RegExp(`[${VOWEL_SIGNS}][${VOWEL_SIGNS}]`), "two vowel signs on one letter"],
  [new RegExp(`${VIRAMA}[${VOWEL_SIGNS}]`), "vowel sign after virama"],
  [new RegExp(`(^|[^${CONSONANTS}఼])[${VOWEL_SIGNS}${VIRAMA}]`), "vowel sign or virama without a consonant"],
  [new RegExp(`${VIRAMA}${VIRAMA}`), "double virama"],
];

export const teluguProblems = (text) => {
  const core = text.replace(/[^ఀ-౿]/g, "");
  const problems = RULES.filter(([re]) => re.test(core)).map(([, why]) => `MALFORMED: ${why}`);
  if (/[A-Za-z]/.test(text)) problems.push("LATIN: English letters (write loanwords in Telugu script)");
  return problems;
};

export const scanTranscript = ({ transcript, overlay = null, sourceSha256 = null, from = 0, to = Infinity }) => {
  const corrected = overlay ? applySourceCorrections(transcript, overlay, sourceSha256) : structuredClone(transcript);
  const words = corrected.segments.flatMap((s) => s.words ?? []);
  const suspects = [];
  words.forEach((w, i) => {
    if (w.start < from || w.start >= to) return;
    const problems = teluguProblems(w.word);
    if (problems.length) {
      suspects.push({ wordIndex: i, sourceSeconds: w.start, word: w.word, problems, context: words.slice(Math.max(0, i - 4), i + 5).map((x) => x.word).join(" ") });
    }
  });
  const lines = [];
  const inRange = words.map((w, i) => ({ ...w, i })).filter((w) => w.start >= from && w.start < to);
  for (let k = 0; k < inRange.length; k += 10) lines.push({ sourceSeconds: inRange[k].start, text: inRange.slice(k, k + 10).map((w) => w.word).join(" ") });
  return { wordCount: inRange.length, suspects, lines };
};

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const job = arg("--job");
  if (!job) { console.error("usage: --job <job dir> [--overlay f] [--from s] [--to s] [--json out]"); process.exit(2); }
  // Overlays bind to RAW tokens; the display transcript is checked through the verified RAW mapping.
  const { loadJobTranscripts, applyOverlayToDisplay } = await import("./job-transcripts.mjs");
  const jt = loadJobTranscripts(job), sha = jt.sha;
  const overlay = arg("--overlay") ? JSON.parse(fs.readFileSync(arg("--overlay"), "utf8")) : null;
  const transcript = applyOverlayToDisplay(jt, overlay).display;
  const result = scanTranscript({ transcript, from: Number(arg("--from") ?? 0), to: Number(arg("--to") ?? Infinity) });
  for (const l of result.lines) console.log(`${l.sourceSeconds.toFixed(2).padStart(8)}s  ${l.text}`);
  console.log(`\n${result.wordCount} words; ${result.suspects.length} cannot be shown as-is:`);
  for (const s of result.suspects) console.log(`  ${s.sourceSeconds.toFixed(2)}s  ${s.word}  [${s.problems.join("; ")}]  | ${s.context}`);
  if (arg("--json")) fs.writeFileSync(arg("--json"), JSON.stringify({ sourceSha256: sha, ...result }, null, 1));
}
