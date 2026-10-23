// Reel host-motion track (trial, 20 October 2026). Preview-only and optional:
// an item without `motion` renders exactly as before. Derived deterministically
// from the item's existing beats and canonical word frames; it never moves,
// adds or removes a word, a cut or a caption, and never touches audio.
//
// Owner direction for the trial: dense motion in reels, strong rotation
// (whip-spins at sentence transitions, small tilts elsewhere), all five reels,
// judged on one reel first before it becomes the house rule.
//
// Layers, all applied to the host video only (captions and graphics stay still):
//   1. shots: each beat is split at word gaps into ~2.5 s shots that cut
//      between wide / close / medium framing (hard punch-ins, no slow push);
//   2. tilt: medium and close shots sit at a small alternating angle;
//   3. emphasis: the longest word of a shot punches in (held to the cut),
//      with a small extra tilt and a 3-frame shake;
//   4. whips: every beat join (a source cut) spins out and spins back in;
//   5. behind titles: each beat's first emphasis word, exactly as spoken, is
//      offered as a large title for a depth layer behind the host (rendered
//      only when a person-matte foreground exists).
// Every frame is scaled up just enough that the rotated, enlarged picture
// still covers the whole canvas - no background ever shows.

export const REEL_MOTION_VERSION = "reel-motion-trial-2";

export const DEFAULT_REEL_MOTION_STYLE = Object.freeze({
  width: 1080,
  height: 1920,
  originX: 0.38, // the host's face in the vertical crop (measured on reel 1)
  originY: 0.48,
  targetShotFrames: 75, // ~2.5 s
  minShotFrames: 54,
  maxShotFrames: 96,
  minWordGapFrames: 2, // only split where speech pauses, never inside a word
  sizes: [1.0, 1.2, 1.12], // wide, close, medium - cycled per shot
  // Owner revision (20 Oct): zoom changes are hard punch-ins, not slow pushes.
  // punchHold: an emphasis punch jumps in on its word and holds to the cut.
  pushAmount: 0,
  punchHold: true,
  tiltDeg: 1.5,
  emphasisMinFrames: 8,
  emphasisPunch: 0.07,
  emphasisTiltDeg: 1.2,
  emphasisAttack: 3,
  emphasisDecay: 12,
  shake: [[6, -4], [-5, 3], [3, -2]],
  whipFrames: 6,
  whipDeg: 18,
  whipBlurPx: 8,
});

// Reel style presets (360 LIFE rotation spec, 20 Oct 2026), selected by item.style.
// An item without a style keeps the default above, unchanged.
export const REEL_STYLE_PRESETS = Object.freeze({
  // Punchy: a visual change every 1.5-2 s; zoom alternates 100% / 115% on every cut; the
  // key word of each shot punches in 20%. Owner keeps whips and behind-host titles.
  punchy: { targetShotFrames: 52, minShotFrames: 40, maxShotFrames: 66, minWordGapFrames: 0, sizes: [1.0, 1.15], emphasisPunch: 0.2 },
  // Explainer: calm documentary rhythm - a gentle reframe every ~2.5 s at speech pauses;
  // no tilt, punch, shake or whip (the visual change comes from full-screen cards/B-roll).
  explainer: { targetShotFrames: 75, minShotFrames: 60, maxShotFrames: 96, sizes: [1.0, 1.08], tiltDeg: 0, emphasisPunch: 0, emphasisTiltDeg: 0, shake: [], whipDeg: 0, whipBlurPx: 0 },
  // Listicle: clean and steady - a soft reframe every ~2.7 s, no tilt, punch, shake or whip.
  listicle: { targetShotFrames: 82, minShotFrames: 66, maxShotFrames: 100, sizes: [1.0, 1.06], tiltDeg: 0, emphasisPunch: 0, emphasisTiltDeg: 0, shake: [], whipDeg: 0, whipBlurPx: 0 },
});

const easeInOut =(t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeIn = (t) => t * t * t;
const easeOut = (t) => 1 - (1 - t) ** 3;

const splitBeatIntoShots = (beat, words, style) => {
  const start = beat.timelineStartFrame;
  const end = beat.timelineEndFrame;
  const inside = words.filter((w) => w.startFrame >= start && w.endFrame <= end).sort((a, b) => a.startFrame - b.startFrame);
  // A cut point is the start of a word that follows a real pause.
  const candidates = [];
  for (let i = 1; i < inside.length; i++) {
    if (inside[i].startFrame - inside[i - 1].endFrame >= style.minWordGapFrames) candidates.push(inside[i].startFrame);
  }
  const shots = [];
  let cursor = start;
  while (end - cursor > style.maxShotFrames) {
    const usable = candidates.filter((c) => c - cursor >= style.minShotFrames && end - c >= style.minShotFrames);
    if (usable.length === 0) break;
    const target = cursor + style.targetShotFrames;
    const next = usable.reduce((best, c) => (Math.abs(c - target) < Math.abs(best - target) ? c : best));
    shots.push({ startFrame: cursor, endFrame: next });
    cursor = next;
  }
  shots.push({ startFrame: cursor, endFrame: end });
  return shots;
};

/**
 * Build the motion track for one preview item ({beats, words, totalFrames}).
 * Pure and deterministic: the same item always yields the same track.
 */
export const buildReelMotion = (item, overrides = {}) => {
  const style = { ...DEFAULT_REEL_MOTION_STYLE, ...(REEL_STYLE_PRESETS[item.style] ?? {}), ...overrides };
  const words = (item.words ?? []).filter((w) => Number.isInteger(w.startFrame) && Number.isInteger(w.endFrame) && w.endFrame > w.startFrame);
  const shots = [];
  const emphases = [];
  const whips = [];
  let shotIndex = 0;
  item.beats.forEach((beat, beatIndex) => {
    for (const s of splitBeatIntoShots(beat, words, style)) {
      const size = style.sizes[shotIndex % style.sizes.length];
      const tilt = size > 1 ? (shotIndex % 2 === 0 ? 1 : -1) * style.tiltDeg : 0;
      const pushIn = shotIndex % 2 === 0;
      shots.push({ ...s, beatIndex, size, tilt, pushIn });
      // Emphasis: the shot's longest word, away from the shot edges.
      const candidates = words.filter((w) => w.startFrame >= s.startFrame + style.whipFrames && w.startFrame + style.emphasisAttack + style.emphasisDecay <= s.endFrame && w.endFrame - w.startFrame >= style.emphasisMinFrames);
      if (candidates.length > 0) {
        const w = candidates.reduce((best, c) => (c.endFrame - c.startFrame > best.endFrame - best.startFrame ? c : best));
        emphases.push({ frame: w.startFrame, direction: shotIndex % 2 === 0 ? 1 : -1, text: w.text });
      }
      shotIndex++;
    }
    if (beatIndex > 0 && beat.joinKind !== "trim") whips.push({ frame: beat.timelineStartFrame, direction: whips.length % 2 === 0 ? 1 : -1 });
  });
  // One behind-host title per beat: its first emphasis word, shown from the
  // word to the end of that shot (at least one second), never across a join.
  // A title is never placed where a full-screen graphic hides the host.
  const covered = (item.cues ?? []).filter((c) => c.placement !== "above-you").map((c) => [c.visualStartFrame ?? c.timelineStartFrame, c.visualEndFrame ?? c.timelineEndFrame]);
  const titles = [];
  // Sections: original beats, with pause-trim pieces merged back together.
  const sections = [];
  for (const b of item.beats) {
    if (b.joinKind === "trim" && sections.length) sections[sections.length - 1].timelineEndFrame = b.timelineEndFrame;
    else sections.push({ timelineStartFrame: b.timelineStartFrame, timelineEndFrame: b.timelineEndFrame });
  }
  const titleEnd = (startFrame) => {
    const beat = sections.find((b) => startFrame >= b.timelineStartFrame && startFrame < b.timelineEndFrame);
    const shot = shots.find((s) => startFrame >= s.startFrame && startFrame < s.endFrame);
    return beat && shot ? Math.min(beat.timelineEndFrame - style.whipFrames, Math.max(shot.endFrame, startFrame + 45)) : null;
  };
  if (Array.isArray(item.behindTitles)) {
    // Owner-chosen key words (spoken words, corrected spelling). Never under a
    // full-screen graphic. A small "above-you" graphic shares the title's top
    // band, so a title that would collide starts when that graphic ends (same
    // beat, still >= 30 frames on screen) or is skipped; it never overlaps.
    const above = (item.cues ?? []).filter((c) => c.placement === "above-you").map((c) => [c.visualStartFrame ?? c.timelineStartFrame, c.visualEndFrame ?? c.timelineEndFrame]);
    for (const t of item.behindTitles) {
      let startFrame = t.startFrame;
      let endFrame = titleEnd(startFrame);
      const hit = endFrame === null ? null : above.find(([a, b]) => startFrame < b && endFrame > a);
      if (hit) {
        const beat = sections.find((b) => t.startFrame >= b.timelineStartFrame && t.startFrame < b.timelineEndFrame);
        startFrame = hit[1];
        endFrame = beat && startFrame < beat.timelineEndFrame ? titleEnd(startFrame) : null;
        if (endFrame !== null && endFrame - startFrame < 30) endFrame = null;
      }
      if (endFrame === null || endFrame - startFrame < 20) continue;
      if ([...covered, ...above].some(([a, b]) => startFrame < b && endFrame > a)) continue;
      titles.push({ text: t.text, startFrame, endFrame });
    }
    return { version: REEL_MOTION_VERSION, style, shots, emphases, whips, titles, totalFrames: item.totalFrames };
  }
  item.beats.forEach((beat) => {
    for (const e of emphases.filter((x) => x.frame >= beat.timelineStartFrame && x.frame < beat.timelineEndFrame)) {
      const shot = shots.find((s) => e.frame >= s.startFrame && e.frame < s.endFrame);
      const endFrame = Math.min(beat.timelineEndFrame - style.whipFrames, Math.max(shot.endFrame, e.frame + 30));
      if (endFrame - e.frame < 20 || covered.some(([a, b]) => e.frame < b && endFrame > a)) continue;
      titles.push({ text: e.text, startFrame: e.frame, endFrame });
      break;
    }
  });
  return { version: REEL_MOTION_VERSION, style, shots, emphases, whips, titles, totalFrames: item.totalFrames };
};

// Smallest scale (>= requested) at which the transformed picture still covers
// the whole canvas: every canvas corner, mapped back through the inverse
// transform, must land inside the source picture.
export const coversCanvas = ({ scale, rotateDeg, tx, ty }, style) => {
  const { width: W, height: H } = style;
  const ox = style.originX * W;
  const oy = style.originY * H;
  const r = (-rotateDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  for (const [px, py] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const dx = px - ox - tx;
    const dy = py - oy - ty;
    const sx = ox + (dx * cos - dy * sin) / scale;
    const sy = oy + (dx * sin + dy * cos) / scale;
    if (sx < -0.5 || sx > W + 0.5 || sy < -0.5 || sy > H + 0.5) return false;
  }
  return true;
};

const coverScale = (pose, style) => {
  if (coversCanvas(pose, style)) return pose.scale;
  let lo = pose.scale;
  let hi = pose.scale * 3;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (coversCanvas({ ...pose, scale: mid }, style)) hi = mid;
    else lo = mid;
  }
  return hi;
};

/** Host transform at one composition frame: {scale, rotateDeg, tx, ty, blurPx}. */
export const motionAt = (motion, frame) => {
  const { style } = motion;
  const shot = motion.shots.find((s) => frame >= s.startFrame && frame < s.endFrame) ?? motion.shots[motion.shots.length - 1];
  const progress = shot ? (frame - shot.startFrame) / Math.max(1, shot.endFrame - shot.startFrame) : 0;
  const push = easeInOut(Math.min(1, Math.max(0, progress))) * style.pushAmount;
  let scale = shot ? shot.size * (1 + (shot.pushIn ? push : style.pushAmount - push)) : 1;
  let rotateDeg = shot ? shot.tilt : 0;
  let tx = 0;
  let ty = 0;
  let blurPx = 0;

  for (const e of motion.emphases) {
    const t = frame - e.frame;
    if (style.punchHold) {
      // Hard punch-in on the word, held until the shot's cut.
      if (t < 0 || !shot || e.frame < shot.startFrame || e.frame >= shot.endFrame) continue;
    } else if (t < 0 || t >= style.emphasisAttack + style.emphasisDecay) continue;
    const envelope = style.punchHold ? 1 : t < style.emphasisAttack ? easeOut((t + 1) / style.emphasisAttack) : 1 - easeOut((t - style.emphasisAttack) / style.emphasisDecay);
    scale *= 1 + style.emphasisPunch * envelope;
    rotateDeg += e.direction * style.emphasisTiltDeg * envelope;
    const shake = style.shake[t];
    if (shake) { tx += shake[0] * e.direction; ty += shake[1]; }
  }

  for (const w of motion.whips) {
    const n = style.whipFrames;
    const before = w.frame - frame; // 1..n frames before the join: spinning out
    const after = frame - w.frame; // 0..n-1 frames after the join: spinning in
    if (before >= 1 && before <= n) {
      const k = easeIn((n - before + 1) / n);
      rotateDeg += w.direction * style.whipDeg * k;
      blurPx = Math.max(blurPx, style.whipBlurPx * k);
    } else if (after >= 0 && after < n) {
      const k = 1 - easeOut((after + 1) / n);
      rotateDeg -= w.direction * style.whipDeg * k;
      blurPx = Math.max(blurPx, style.whipBlurPx * k);
    }
  }

  scale = coverScale({ scale, rotateDeg, tx, ty }, style);
  return { scale, rotateDeg, tx, ty, blurPx };
};

/** CSS for the host layer at `frame`. */
export const motionCss = (motion, frame) => {
  const m = motionAt(motion, frame);
  const { style } = motion;
  return {
    transform: `translate(${m.tx.toFixed(2)}px, ${m.ty.toFixed(2)}px) rotate(${m.rotateDeg.toFixed(3)}deg) scale(${m.scale.toFixed(4)})`,
    transformOrigin: `${(style.originX * 100).toFixed(1)}% ${(style.originY * 100).toFixed(1)}%`,
    filter: m.blurPx > 0.05 ? `blur(${m.blurPx.toFixed(2)}px)` : undefined,
  };
};
