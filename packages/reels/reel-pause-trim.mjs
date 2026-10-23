// Punchy-style pause tightening for one reel item (preview props). Pure.
//
// Shortens silent gaps between words (and at beat edges) to `maxPauseFrames`
// by removing source frames, longest gaps first, until either every gap is at
// most `maxPauseFrames` or the reel would drop below `minTotalFrames` (owner
// rule: reels stay >= 60 s). Never trims inside a graphic's window (its timing
// and the SVG's frame count stay exact) and never touches a word: only frames
// strictly between two words' spans are removed. Everything on the timeline -
// beats, words, caption groups, graphics, owner titles - is remapped.
//
// Returns { item, removedFrames, gapsTrimmed, gapsLeft }.

export const tightenPauses = (item, { maxPauseFrames = 4, minTotalFrames = 1815, keepEachSide = 2 } = {}) => {
  const words = [...item.words].sort((a, b) => a.startFrame - b.startFrame);
  const cueWindows = (item.cues ?? []).map((c) => [Math.min(c.timelineStartFrame, c.visualStartFrame ?? c.timelineStartFrame), Math.max(c.timelineEndFrame, c.visualEndFrame ?? c.timelineEndFrame)]);
  // Candidate removals: [start, end) timeline frames inside one beat, between words.
  const candidates = [];
  for (const b of item.beats) {
    const ws = words.filter((w) => w.startFrame >= b.timelineStartFrame && w.startFrame < b.timelineEndFrame);
    const edges = [b.timelineStartFrame, ...ws.flatMap((w) => [w.startFrame, w.endFrame]), b.timelineEndFrame];
    for (let i = 0; i < edges.length; i += 2) {
      const gapStart = edges[i], gapEnd = edges[i + 1], gap = gapEnd - gapStart;
      if (gap <= maxPauseFrames) continue;
      const lead = i === 0, tail = i === edges.length - 2;
      // Keep `keepEachSide` frames next to speech; at a beat edge keep nothing extra on the open side.
      const from = gapStart + (lead ? 0 : keepEachSide), to = gapEnd - (tail ? 0 : keepEachSide);
      const removable = Math.min(to - from, gap - maxPauseFrames);
      if (removable <= 0 || cueWindows.some(([a, z]) => from < z && to > a)) continue;
      const mid = Math.round((from + to) / 2);
      candidates.push({ start: mid - Math.floor(removable / 2), end: mid - Math.floor(removable / 2) + removable, gap });
    }
  }
  candidates.sort((a, b) => b.gap - a.gap || a.start - b.start);
  const chosen = [];
  let budget = item.totalFrames - minTotalFrames;
  for (const c of candidates) {
    if (budget <= 0) break;
    const take = Math.min(c.end - c.start, budget);
    chosen.push({ start: c.start, end: c.start + take });
    budget -= take;
  }
  chosen.sort((a, b) => a.start - b.start);
  const removedBefore = (f) => chosen.reduce((n, c) => n + (c.end <= f ? c.end - c.start : f > c.start ? f - c.start : 0), 0);
  const map = (f) => f - removedBefore(f);

  // Beats: split each beat around removed ranges, keeping source frames aligned.
  const beats = [];
  for (const b of item.beats) {
    let cursor = b.timelineStartFrame, first = true;
    const cuts = chosen.filter((c) => c.start >= b.timelineStartFrame && c.end <= b.timelineEndFrame);
    for (const c of [...cuts, { start: b.timelineEndFrame, end: b.timelineEndFrame }]) {
      if (c.start > cursor) {
        const srcStart = b.sourceStartFrame + (cursor - b.timelineStartFrame);
        // Pieces after the first are pause trims inside one original beat: a jump
        // cut, not a sentence join (no whip; titles may run across it).
        beats.push({ ...b, sourceStartFrame: srcStart, sourceEndFrame: srcStart + (c.start - cursor), timelineStartFrame: map(cursor), timelineEndFrame: map(c.start), ...(first ? {} : { joinKind: "trim" }) });
        first = false;
      }
      cursor = c.end;
    }
  }
  const shift = (o, keys) => { const r = { ...o }; for (const k of keys) if (Number.isInteger(r[k])) r[k] = map(r[k]); return r; };
  const out = {
    ...item,
    beats,
    words: item.words.map((w) => shift(w, ["startFrame", "endFrame"])),
    cues: (item.cues ?? []).map((c) => shift(c, ["timelineStartFrame", "timelineEndFrame", "visualStartFrame", "visualEndFrame"])),
    pacing: item.pacing ? { ...item.pacing, captionGroups: (item.pacing.captionGroups ?? []).map((g) => shift(g, ["timelineStartFrame", "timelineEndFrame"])) } : item.pacing,
    behindTitles: item.behindTitles?.map((t) => shift(t, ["startFrame"])),
    totalFrames: item.totalFrames - chosen.reduce((n, c) => n + c.end - c.start, 0),
  };
  // Gaps still longer than maxPauseFrames: untouched candidates plus any only partly trimmed at the floor.
  const fullyTrimmed = chosen.filter((c) => candidates.some((k) => k.start === c.start && k.end === c.end)).length;
  const gapsLeft = candidates.length - fullyTrimmed;
  return { item: out, removedFrames: item.totalFrames - out.totalFrames, gapsTrimmed: chosen.length, gapsLeft };
};
