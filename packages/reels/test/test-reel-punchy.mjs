// Punchy preset and pause tightening (pure).
import test from "node:test";
import assert from "node:assert/strict";
import { buildReelMotion, motionAt, coversCanvas } from "../reel-motion.mjs";
import { tightenPauses } from "../reel-pause-trim.mjs";

// Two beats, words of 10 frames separated by 3- and 15-frame pauses; one graphic.
const makeItem = () => {
  const beats = [
    { sourceStartFrame: 1000, sourceEndFrame: 2200, timelineStartFrame: 0, timelineEndFrame: 1200 },
    { sourceStartFrame: 5000, sourceEndFrame: 5900, timelineStartFrame: 1200, timelineEndFrame: 2100 },
  ];
  const words = [];
  for (const b of beats) for (let f = b.timelineStartFrame + 6, k = 0; f + 10 <= b.timelineEndFrame - 6; k++) { words.push({ text: `w${words.length}`, startFrame: f, endFrame: f + 10 }); f += 10 + (k % 4 === 3 ? 15 : 3); }
  const cues = [{ id: "c0", placement: "full", timelineStartFrame: 400, timelineEndFrame: 480, visualStartFrame: 400, visualEndFrame: 480 }];
  const captionGroups = []; for (let i = 0; i < words.length; i += 3) captionGroups.push({ timelineStartFrame: words[i].startFrame, timelineEndFrame: words[Math.min(words.length - 1, i + 2)].endFrame });
  return { beats, words, cues, pacing: { captionGroups }, totalFrames: 2100 };
};

test("punchy: shots of ~1.3-2.2 s, zoom alternates 100% / 115%", () => {
  const motion = buildReelMotion({ ...makeItem(), style: "punchy" });
  for (const s of motion.shots.slice(0, -1)) assert.ok(s.endFrame - s.startFrame <= 66 + 40, `shot ${s.startFrame} too long`);
  const avg = 2100 / motion.shots.length / 30;
  assert.ok(avg >= 1.3 && avg <= 2.2, `average shot ${avg.toFixed(2)} s`);
  assert.deepEqual([...new Set(motion.shots.map((s) => s.size))].sort(), [1.0, 1.15]);
  for (let f = 0; f < 2100; f++) assert.ok(coversCanvas(motionAt(motion, f), motion.style));
});

test("default style is unchanged when no style is set", () => {
  const motion = buildReelMotion(makeItem());
  assert.deepEqual([...new Set(motion.shots.map((s) => s.size))].sort(), [1.0, 1.12, 1.2]);
});

test("pause trim: never below the floor, never inside a word or graphic, timeline remapped", () => {
  const item = makeItem();
  const { item: t, removedFrames } = tightenPauses(item, { maxPauseFrames: 4, minTotalFrames: 1900 });
  assert.equal(t.totalFrames, 2100 - removedFrames);
  assert.ok(t.totalFrames >= 1900);
  // Beats tile the new timeline and keep source/timeline lengths equal.
  let cursor = 0;
  for (const b of t.beats) { assert.equal(b.timelineStartFrame, cursor); assert.equal(b.sourceEndFrame - b.sourceStartFrame, b.timelineEndFrame - b.timelineStartFrame); cursor = b.timelineEndFrame; }
  assert.equal(cursor, t.totalFrames);
  // Every word keeps its length and stays mapped to the same source frames.
  const srcOf = (it, f) => { const b = it.beats.find((x) => f >= x.timelineStartFrame && f < x.timelineEndFrame); return b.sourceStartFrame + (f - b.timelineStartFrame); };
  item.words.forEach((w, i) => { const n = t.words[i]; assert.equal(n.endFrame - n.startFrame, w.endFrame - w.startFrame); assert.equal(srcOf(t, n.startFrame), srcOf(item, w.startFrame)); });
  // The graphic keeps its exact length.
  assert.equal(t.cues[0].timelineEndFrame - t.cues[0].timelineStartFrame, 80);
});

test("pause trim with room removes every long pause down to the limit", () => {
  const { item: t, gapsLeft } = tightenPauses(makeItem(), { maxPauseFrames: 4, minTotalFrames: 0 });
  assert.equal(gapsLeft, 0);
  for (let i = 1; i < t.words.length; i++) {
    const sameBeat = t.beats.some((b) => t.words[i - 1].startFrame >= b.timelineStartFrame && t.words[i].startFrame < b.timelineEndFrame);
    const inCue = t.cues.some((c) => t.words[i - 1].endFrame >= c.timelineStartFrame && t.words[i].startFrame <= c.timelineEndFrame);
    if (sameBeat && !inCue) assert.ok(t.words[i].startFrame - t.words[i - 1].endFrame <= 4, `gap before ${t.words[i].text}`);
  }
});

test("pause-trim joins get no whip; real sentence joins keep theirs", () => {
  const { item: t } = tightenPauses(makeItem(), { maxPauseFrames: 4, minTotalFrames: 0 });
  assert.ok(t.beats.filter((b) => b.joinKind === "trim").length > 0);
  const motion = buildReelMotion({ ...t, style: "punchy" });
  const realJoins = t.beats.filter((b, i) => i > 0 && b.joinKind !== "trim").map((b) => b.timelineStartFrame);
  assert.deepEqual(motion.whips.map((w) => w.frame), realJoins);
});
