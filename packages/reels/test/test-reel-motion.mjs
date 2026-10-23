// Pure tests for the trial reel host-motion track (lib/reel-motion.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { buildReelMotion, motionAt, motionCss, coversCanvas, DEFAULT_REEL_MOTION_STYLE } from "../reel-motion.mjs";

// Two beats (one source join) of steady speech: 10-frame words, 3-frame pauses.
const makeItem = () => {
  const beats = [
    { sourceStartFrame: 1000, sourceEndFrame: 1600, timelineStartFrame: 0, timelineEndFrame: 600 },
    { sourceStartFrame: 3000, sourceEndFrame: 3450, timelineStartFrame: 600, timelineEndFrame: 1050 },
  ];
  const words = [];
  for (const b of beats) {
    for (let f = b.timelineStartFrame + 4; f + 10 <= b.timelineEndFrame - 2; f += 13) {
      words.push({ text: `w${words.length}`, startFrame: f, endFrame: f + (words.length % 7 === 0 ? 14 : 10) });
    }
  }
  return { beats, words, totalFrames: 1050 };
};

test("shots tile every beat exactly and never split inside a word", () => {
  const item = makeItem();
  const motion = buildReelMotion(item);
  for (const b of item.beats) {
    const shots = motion.shots.filter((s) => s.startFrame >= b.timelineStartFrame && s.endFrame <= b.timelineEndFrame);
    assert.equal(shots[0].startFrame, b.timelineStartFrame);
    assert.equal(shots.at(-1).endFrame, b.timelineEndFrame);
    for (let i = 1; i < shots.length; i++) assert.equal(shots[i].startFrame, shots[i - 1].endFrame);
  }
  for (const s of motion.shots) {
    for (const w of item.words) assert.ok(!(s.startFrame > w.startFrame && s.startFrame < w.endFrame), `cut at ${s.startFrame} splits ${w.text}`);
  }
});

test("shots change at least every ~3 s where speech pauses allow", () => {
  const motion = buildReelMotion(makeItem());
  for (const s of motion.shots) assert.ok(s.endFrame - s.startFrame <= DEFAULT_REEL_MOTION_STYLE.maxShotFrames + DEFAULT_REEL_MOTION_STYLE.minShotFrames, `shot ${s.startFrame}-${s.endFrame} too long`);
  const sizes = motion.shots.map((s) => s.size);
  for (let i = 1; i < sizes.length; i++) assert.notEqual(sizes[i], sizes[i - 1], "consecutive shots must change framing");
});

test("one whip per source join, none at the start", () => {
  const motion = buildReelMotion(makeItem());
  assert.deepEqual(motion.whips.map((w) => w.frame), [600]);
});

test("picture covers the canvas on every frame (no background corners)", () => {
  const motion = buildReelMotion(makeItem());
  for (let f = 0; f < motion.totalFrames; f++) {
    const m = motionAt(motion, f);
    assert.ok(coversCanvas(m, motion.style), `frame ${f} exposes background: ${JSON.stringify(m)}`);
    assert.ok(m.scale >= 1 && m.scale < 1.9, `frame ${f} scale ${m.scale}`);
  }
});

test("rotation stays small except during whips, and whips peak near the join", () => {
  const motion = buildReelMotion(makeItem());
  const { whipFrames, whipDeg, tiltDeg, emphasisTiltDeg } = motion.style;
  for (let f = 0; f < motion.totalFrames; f++) {
    const nearWhip = motion.whips.some((w) => f >= w.frame - whipFrames && f < w.frame + whipFrames);
    const r = Math.abs(motionAt(motion, f).rotateDeg);
    if (!nearWhip) assert.ok(r <= tiltDeg + emphasisTiltDeg + 1e-9, `frame ${f} rotated ${r}`);
  }
  assert.ok(Math.abs(motionAt(motion, 599).rotateDeg) >= whipDeg - tiltDeg - emphasisTiltDeg, "whip peak (net of the shot's own tilt)");
  assert.ok(motionAt(motion, 599).blurPx > 0);
  assert.equal(motionAt(motion, 300).blurPx, 0);
});

test("deterministic, and CSS is well formed", () => {
  const a = buildReelMotion(makeItem());
  const b = buildReelMotion(makeItem());
  assert.deepEqual(a, b);
  const css = motionCss(a, 123);
  assert.match(css.transform, /^translate\(-?\d+\.\d+px, -?\d+\.\d+px\) rotate\(-?\d+\.\d+deg\) scale\(\d+\.\d+\)$/);
  assert.equal(css.transformOrigin, "38.0% 48.0%");
});

test("zoom only changes as hard punch-ins: constant inside a shot except one step at the emphasis word", () => {
  const motion = buildReelMotion(makeItem());
  const { whipFrames } = motion.style;
  for (const s of motion.shots) {
    const e = motion.emphases.find((x) => x.frame >= s.startFrame && x.frame < s.endFrame);
    const scales = [];
    for (let f = s.startFrame + whipFrames; f < s.endFrame - whipFrames; f++) scales.push(Number(motionAt(motion, f).scale.toFixed(6)));
    const steps = scales.filter((v, i) => i > 0 && v !== scales[i - 1]).length;
    assert.ok(steps <= (e ? 1 : 0), `shot ${s.startFrame}: ${steps} scale changes`);
  }
});

test("behind titles: one per beat at most, spoken text, never across a join", () => {
  const item = makeItem();
  const motion = buildReelMotion(item);
  assert.ok(motion.titles.length >= 1 && motion.titles.length <= item.beats.length);
  for (const t of motion.titles) {
    assert.ok(item.words.some((w) => w.text === t.text && w.startFrame === t.startFrame), `title ${t.text} is not a spoken word at its frame`);
    const beat = item.beats.find((b) => t.startFrame >= b.timelineStartFrame && t.startFrame < b.timelineEndFrame);
    assert.ok(t.endFrame <= beat.timelineEndFrame - motion.style.whipFrames);
    assert.ok(t.endFrame - t.startFrame >= 20);
  }
});

test("an item with no words still gets a valid, covering track", () => {
  const motion = buildReelMotion({ beats: [{ timelineStartFrame: 0, timelineEndFrame: 200, sourceStartFrame: 0, sourceEndFrame: 200 }], words: [], totalFrames: 200 });
  assert.equal(motion.shots.length, 1);
  for (let f = 0; f < 200; f++) assert.ok(coversCanvas(motionAt(motion, f), motion.style));
});

test("owner-chosen behind titles replace automatic picks and skip covered moments", () => {
  const item = { ...makeItem(), cues: [{ placement: "full", visualStartFrame: 700, visualEndFrame: 800 }] };
  item.behindTitles = [{ text: "కీ", startFrame: item.words[3].startFrame }, { text: "hidden", startFrame: 710 }];
  const motion = buildReelMotion(item);
  assert.deepEqual(motion.titles.map((t) => t.text), ["కీ"]);
  assert.ok(motion.titles[0].endFrame - motion.titles[0].startFrame >= 20);
});

test("owner titles never overlap a small above-you graphic: moved after it, or skipped", () => {
  const item = makeItem();
  const w = item.words[3];
  item.cues = [{ placement: "above-you", visualStartFrame: w.startFrame - 5, visualEndFrame: w.startFrame + 20 }];
  item.behindTitles = [{ text: "moved", startFrame: w.startFrame }];
  const motion = buildReelMotion(item);
  assert.equal(motion.titles.length, 1);
  assert.equal(motion.titles[0].startFrame, w.startFrame + 20);
  item.cues = [{ placement: "above-you", visualStartFrame: 0, visualEndFrame: 590 }];
  assert.equal(buildReelMotion(item).titles.length, 0, "no room left in the beat: skipped, not overlapped");
});
