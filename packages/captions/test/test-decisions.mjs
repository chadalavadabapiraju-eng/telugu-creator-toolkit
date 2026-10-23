// CLI regression tests for apply-caption-decisions (release audit 83): RAW binding with RAW/display times that
// differ, and refusal of stale, unbound or conflicting decisions. Synthetic words only.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { applySourceCorrections } from "../transcript-corrections.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(here, "../apply-caption-decisions.mjs");
const SHA = "0".repeat(63) + "2";
const W = [["ఈ", 0.0], ["రోజు", 0.5], ["టెస్టు", 1.0], ["చూద్దాం", 1.6]];

// Display times are frame-adjusted; RAW times are 19 ms later (the case the audit found).
const makeJob = ({ shift = 0.019, rawWords = W, displayWords = W } = {}) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "tct-job-"));
  const doc = (ws, dt) => ({ segments: [{ start: ws[0][1] + dt, end: ws.at(-1)[1] + dt + 0.4, words: ws.map(([word, s]) => ({ word, start: +(s + dt).toFixed(3), end: +(s + dt + 0.4).toFixed(3) })) }] });
  fs.writeFileSync(path.join(d, "job.json"), JSON.stringify({ source: { sha256: SHA } }));
  fs.writeFileSync(path.join(d, "transcript_raw.json"), JSON.stringify(doc(rawWords, shift)));
  fs.writeFileSync(path.join(d, "transcript.json"), JSON.stringify(doc(displayWords, 0)));
  return d;
};
const hashes = (d) => Object.fromEntries(fs.readdirSync(d).map((f) => [f, crypto.createHash("sha256").update(fs.readFileSync(path.join(d, f))).digest("hex")]));
const run = (job, decisions, extra = []) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tct-dec-")), dec = path.join(dir, "decisions.json"), out = path.join(dir, "overlay.json");
  fs.writeFileSync(dec, JSON.stringify(decisions));
  const before = hashes(job);
  const r = spawnSync(process.execPath, [CLI, "--job", job, "--decisions", dec, "--evidence", "test", "--out", out, ...extra], { encoding: "utf8" });
  assert.deepEqual(hashes(job), before, "job files must never change");
  return { ...r, out, written: fs.existsSync(out) };
};
const accept = (sourceSeconds, expected, replacement) => ({ sourceSeconds, expected, replacement, decision: "accept" });

test("valid decision: emitted edit uses the RAW word and RAW time, and applies to the RAW transcript", () => {
  const job = makeJob(), r = run(job, { sourceSha256: SHA, decisions: [accept(1.0, "టెస్టు", "పరీక్ష")] });
  assert.equal(r.status, 0, r.stderr);
  const ov = JSON.parse(fs.readFileSync(r.out, "utf8"));
  assert.equal(ov.edits.length, 1);
  assert.equal(ov.edits[0].sourceSeconds, 1.019);
  assert.deepEqual(ov.edits[0].expected, ["టెస్టు"]);
  const raw = JSON.parse(fs.readFileSync(path.join(job, "transcript_raw.json"), "utf8"));
  assert.equal(applySourceCorrections(raw, ov, SHA).corrections.applied.length, 1);
});
test("missing or wrong sourceSha256 is refused", () => {
  const job = makeJob();
  for (const d of [{ decisions: [accept(1.0, "టెస్టు", "పరీక్ష")] }, { sourceSha256: "f".repeat(64), decisions: [accept(1.0, "టెస్టు", "పరీక్ష")] }]) {
    const r = run(job, d); assert.equal(r.status, 1); assert.equal(r.written, false); assert.match(r.stderr, /sourceSha256/);
  }
});
test("a wrong expected (stale) word is refused, not silently rebound", () => {
  const r = run(makeJob(), { sourceSha256: SHA, decisions: [accept(1.0, "వేరే", "పరీక్ష")] });
  assert.equal(r.status, 1); assert.equal(r.written, false); assert.match(r.stderr, /stale decision/);
});
test("missing expected word is refused", () => {
  const r = run(makeJob(), { sourceSha256: SHA, decisions: [{ sourceSeconds: 1.0, replacement: "పరీక్ష", decision: "accept" }] });
  assert.equal(r.status, 1); assert.match(r.stderr, /expected/);
});
test("two accepted decisions for the same word are refused", () => {
  const r = run(makeJob(), { sourceSha256: SHA, decisions: [accept(1.0, "టెస్టు", "పరీక్ష"), accept(1.0, "టెస్టు", "పరీక్షా")] });
  assert.equal(r.status, 1); assert.equal(r.written, false); assert.match(r.stderr, /second accepted decision/);
});
test("a time that matches no displayed word is refused", () => {
  const r = run(makeJob(), { sourceSha256: SHA, decisions: [accept(1.3, "టెస్టు", "పరీక్ష")] });
  assert.equal(r.status, 1); assert.match(r.stderr, /matches 0/);
});
test("a display transcript that does not map onto RAW is refused (different word, count, or time shift)", () => {
  const changed = W.map(([w, s], i) => [i === 1 ? "నిన్న" : w, s]);
  for (const job of [makeJob({ displayWords: changed }), makeJob({ displayWords: W.slice(0, 3) }), makeJob({ shift: 0.2 })]) {
    const r = run(job, { sourceSha256: SHA, decisions: [accept(1.0, "టెస్టు", "పరీక్ష")] });
    assert.equal(r.status, 1); assert.equal(r.written, false); assert.match(r.stderr, /cannot map/);
  }
});
test("revising a base edit replaces it; accepting the original RAW word removes it", () => {
  const job = makeJob(), dir = fs.mkdtempSync(path.join(os.tmpdir(), "tct-base-")), basePath = path.join(dir, "base.json");
  fs.writeFileSync(basePath, JSON.stringify({ sourceSha256: SHA, approvalEvidence: "base", edits: [{ approval: "user", sourceSeconds: 1.019, toleranceSeconds: 0.01, expected: ["టెస్టు"], replacement: "పరీక్ష" }, { approval: "user", sourceSeconds: 0.519, toleranceSeconds: 0.01, expected: ["రోజు"], replacement: "దినం" }] }));
  // The review page shows the corrected word, so a decision names "పరీక్ష" as expected.
  const r = run(job, { sourceSha256: SHA, decisions: [accept(1.0, "పరీక్ష", "పరిశీలన"), accept(0.5, "దినం", "రోజు")] }, ["--base", basePath]);
  assert.equal(r.status, 0, r.stderr);
  const ov = JSON.parse(fs.readFileSync(r.out, "utf8"));
  assert.deepEqual(ov.edits.map((e) => [e.sourceSeconds, e.expected[0], e.replacement]), [[1.019, "టెస్టు", "పరిశీలన"]]);
});
test("a base overlay bound to adjusted (non-RAW) times is refused", () => {
  const job = makeJob(), dir = fs.mkdtempSync(path.join(os.tmpdir(), "tct-base-")), basePath = path.join(dir, "base.json");
  fs.writeFileSync(basePath, JSON.stringify({ sourceSha256: SHA, edits: [{ approval: "user", sourceSeconds: 1.0, toleranceSeconds: 0.01, expected: ["టెస్టు"], replacement: "పరీక్ష" }] }));
  const r = run(job, { sourceSha256: SHA, decisions: [accept(1.6, "చూద్దాం", "చూడండి")] }, ["--base", basePath]);
  assert.equal(r.status, 1); assert.match(r.stderr, /base overlay does not apply/);
});
