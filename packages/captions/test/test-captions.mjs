// Caption tools on synthetic data (invented Telugu sentences, no real speech).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { applySourceCorrections } from "../transcript-corrections.mjs";
import { teluguProblems } from "../telugu-caption-scan.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ex = path.resolve(here, "../../../examples/captions");
const read = (f) => JSON.parse(fs.readFileSync(path.join(ex, f), "utf8"));
const raw = read("native-report.synthetic.json"), overlay = read("source-corrections.synthetic.json");

test("source-bound corrections: exactly the 4 approved words change, timing is untouched", () => {
  const r = applySourceCorrections(raw, overlay, overlay.sourceSha256);
  assert.equal(r.corrections.applied.length, 4);
  const before = raw.segments.flatMap((s) => s.words), after = r.segments.flatMap((s) => s.words);
  assert.deepEqual(after.map((w) => [w.start, w.end]), before.map((w) => [w.start, w.end]));
  assert.equal(after.filter((w, i) => w.word !== before[i].word).length, 4);
  assert.equal(raw.segments[0].words[5].word, "టెస్టు", "the input transcript is never mutated");
});

test("corrections fail closed: wrong recording, ambiguous word, or unapproved edit", () => {
  assert.throws(() => applySourceCorrections(raw, overlay, "f".repeat(64)));
  // "ఒక" occurs twice; a wide tolerance between them makes the edit ambiguous.
  assert.throws(() => applySourceCorrections(raw, { ...overlay, edits: [{ ...overlay.edits[1], sourceSeconds: 3.0, toleranceSeconds: 0.25 }] }, overlay.sourceSha256));
  const unapproved = structuredClone(overlay); unapproved.edits[0].approval = "auto";
  assert.throws(() => applySourceCorrections(raw, unapproved, overlay.sourceSha256));
  const multiword = structuredClone(overlay); multiword.edits[0].replacement = "రెండు పదాలు";
  assert.throws(() => applySourceCorrections(raw, multiword, overlay.sourceSha256));
});

test("Telugu scan flags English letters and broken letter combinations, passes clean words", () => {
  assert.ok(teluguProblems("decision").some((p) => p.startsWith("LATIN")));
  assert.ok(teluguProblems("డిెసిషన్").length > 0, "two vowel signs on one letter");
  assert.deepEqual(teluguProblems("డిసిషన్"), []);
});

test("spelling memory learns approved fixes and proposes them on a new transcript", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tct-"));
  const mem = path.join(dir, "memory.json"), out = path.join(dir, "proposals.json");
  const cli = path.resolve(here, "../spelling-memory.mjs");
  const learn = spawnSync(process.execPath, [cli, "learn", "--raw", path.join(ex, "demo-job/transcript_raw.json"), "--overlay", path.join(ex, "source-corrections.synthetic.json"), "--episode", "demo", "--memory", mem], { encoding: "utf8" });
  assert.equal(learn.status, 0, learn.stderr);
  const propose = spawnSync(process.execPath, [cli, "propose", "--job", path.join(ex, "demo-job"), "--memory", mem, "--out", out], { encoding: "utf8" });
  assert.equal(propose.status, 0, propose.stderr);
  const p = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.ok(p.some((x) => x.expected === "తప్పలు" && x.replacement === "తప్పులు"));
  assert.ok(p.every((x) => ["memory", "check"].includes(x.confidence)), "proposals only; the owner decides");
  const again = spawnSync(process.execPath, [cli, "learn", "--raw", path.join(ex, "demo-job/transcript_raw.json"), "--overlay", path.join(ex, "source-corrections.synthetic.json"), "--episode", "demo", "--memory", mem], { encoding: "utf8" });
  assert.notEqual(again.status, 0, "the same episode cannot be learned twice");
});
