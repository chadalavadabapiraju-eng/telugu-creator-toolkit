// Display ↔ RAW transcript binding for a job folder (release audit 83, P1).
//
// Correction overlays always bind to the RAW ASR tokens (transcript_raw.json: original words and times). People
// review the DISPLAY transcript (transcript.json: the same words, times adjusted to video frames). The two are
// mapped by word position, and the mapping is verified (same count, same words, start times within MAX_SHIFT);
// anything else is refused instead of guessed.
import fs from "node:fs";
import path from "node:path";
import { applySourceCorrections, CorrectionError } from "./transcript-corrections.mjs";

export const MAX_SHIFT = 0.05; // seconds between RAW and display start times for the same word
const words = (t) => t.segments.flatMap((s) => s.words ?? []);
const bad = (m) => { throw new CorrectionError(m); };

/** Load a job and verify that its display transcript maps 1:1 onto the RAW transcript. */
export function loadJobTranscripts(job) {
  const sha = JSON.parse(fs.readFileSync(path.join(job, "job.json"), "utf8")).source?.sha256;
  if (!/^[0-9a-f]{64}$/.test(sha ?? "")) bad("job.json has no source sha256");
  const raw = JSON.parse(fs.readFileSync(path.join(job, "transcript_raw.json"), "utf8"));
  const display = JSON.parse(fs.readFileSync(path.join(job, "transcript.json"), "utf8"));
  const r = words(raw), d = words(display);
  if (r.length !== d.length) bad(`display transcript has ${d.length} words, RAW has ${r.length}: cannot map`);
  r.forEach((w, i) => {
    if (w.word.trim() !== d[i].word.trim()) bad(`word ${i} differs between RAW ('${w.word.trim()}') and display ('${d[i].word.trim()}'): cannot map`);
    if (Math.abs(w.start - d[i].start) > MAX_SHIFT) bad(`word ${i} start differs by ${Math.abs(w.start - d[i].start).toFixed(3)} s (> ${MAX_SHIFT}): cannot map`);
  });
  return { sha, raw, display, rawWords: r, displayWords: d };
}

/** Validate a RAW-bound overlay and return { display (corrected), replacementByIndex: Map(wordIndex -> word) }. */
export function applyOverlayToDisplay(jt, overlay) {
  const display = structuredClone(jt.display), replacementByIndex = new Map();
  if (overlay) {
    // applySourceCorrections throws on a stale source, or on any edit that matches zero or several RAW tokens.
    for (const a of applySourceCorrections(jt.raw, overlay, jt.sha).corrections.applied) replacementByIndex.set(a.wordIndex, a.replacement);
  }
  const dw = words(display);
  for (const [i, w] of replacementByIndex) dw[i].word = w;
  for (const s of display.segments) s.text = (s.words ?? []).map((w) => w.word).join(" ");
  return { display, replacementByIndex };
}

/** The canonical RAW-bound edit for word index i. */
export const rawEdit = (jt, i, replacement) => ({ approval: "user", sourceSeconds: jt.rawWords[i].start, toleranceSeconds: 0.01, expected: [jt.rawWords[i].word.trim()], replacement });
