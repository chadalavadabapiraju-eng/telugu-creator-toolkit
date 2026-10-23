---
name: 360life-reel-finishing
description: Finish 360 Life Telugu reels - correct every caption word into proper Telugu script with owner audio approval, then apply the house reel style (hard punch-ins, emphasis shake, whip-spins, key words behind the host). Use after reels exist (screenplay preview props or a completed job) and before final review/render, or whenever captions need a Telugu spelling pass.
---

> Adapted from the 360 LIFE production pipeline (Telugu talking-head channel). Paths such as
> `scripts/automation/...` refer to that pipeline; the toolkit equivalents live in `packages/`.


# 360 Life reel finishing

Owner-approved on 20 October 2026 (the creator). Follow the creator's current instruction when it differs.

## House rules

- **Every caption word is correct Telugu script.** English loanwords are written in Telugu script
  (చూజ్ not choose, థ్రస్ట్ not thrust, పార్ట్‌నర్ not partner). No Latin letters in captions.
- Captions keep the spoken words and meaning. Fix spelling and mishearing only; never rephrase,
  shorten or "improve" what was said. The owner approves every change after listening.
- Corrections are **source-bound overlays** (`lib/transcript-corrections.mjs`): one native word →
  one replacement word at an exact source time. Never edit `transcript.json`. A multi-word fix is
  split across neighbouring tokens (పక్కి తోడ → పక్కింటి వాడు) or hyphen-joined in one token
  (డౌన్-ద-లైన్); a word can never be deleted or invented.
- **Graphic labels are Telugu too** (owner rule, 20 Oct): every `cue.labels` entry and every built-in
  diagram word (`cue.builtin`: fuel, mass, thrust, processNote, boundaryNote, trajectoryNote) is written
  in Telugu, meaning-preserving; never add words the speaker did not imply - leave a point unlabelled
  instead. Graphics render in Nirmala UI. Verify by checking the rendered SVG text has no Latin letters.
- **Captions: run steps 1-4 on the whole transcript, long video included** (no --from/--to), so the
  long video and all five reels share one overlay. Episode 1: 252 owner-approved edits, 21 Oct 2026.
- Reels get the dense style below. **The long video stays calm** (no punch-in rhythm, no whips).
- Captions and graphics never move with the camera; only the host layer is transformed.
- Behind-host titles are words the speaker actually says, with corrected spelling, chosen by the
  owner (or proposed and approved). Never a claim, number or phrase that was not spoken.

## Step 1 - scan (deterministic)

```
node scripts/automation/reel-finishing/telugu-caption-scan.mjs --job <job dir> --overlay <latest corrections.json> [--from s --to s] --json <scan.json>
```

Reports every word that is **MALFORMED** (broken Telugu letters: two vowel signs, vowel sign or
virama with no consonant, double virama) or **LATIN**, and prints the whole text in timed lines.

## Step 0 - before the run: framing check (owner picks the long-video route)

```
node scripts/automation/publish-kit/framing-check.mjs --source <recording> --out <new folder>
```
Shows the recording's shape, black borders, median face position and preview pictures for: A keep the
source shape, B 16:9 face crop (exact `--crop` given), C record landscape next time, D host on a theme
background (planned). the creator chooses; pass the chosen `--crop` to `auto-editor.mjs run`. Use the clean
original recording, never a processed copy with burned captions or added borders.

## Step 1b - spelling memory (start of Step 2)

```
node scripts/automation/reel-finishing/spelling-memory.mjs propose --job <job dir> --memory docs/automation/TELUGU_SPELLING_MEMORY.json --out memory-proposals.json
```
Fixes approved in earlier episodes come back as proposals: `memory` (always corrected that way, word
long enough or seen twice) or `check` (corrected only sometimes, or very short). Merge them into
`proposals.json`, then still read every line. They are proposals only; the creator approves on the review page.
After the episode's corrections are final, teach the memory (overlay bound to the RAW tokens):
```
node scripts/automation/reel-finishing/spelling-memory.mjs learn --raw <job>/transcript_raw.json --overlay <final RAW overlay> --episode "<name>" --memory docs/automation/TELUGU_SPELLING_MEMORY.json
```

## Step 2 - read every line and write proposals (reviewer)

Read all printed lines, not only the scan suspects. Write `proposals.json`:
`[{ "sourceSeconds", "expected" (native word), "replacement" (one word), "confidence", "reason" }]`

| confidence | use for |
|---|---|
| `certain` | MALFORMED/LATIN words with an obvious intended spelling |
| `likely` | loanword misspellings and inconsistent spellings (pick ONE spelling per loanword across the video: ఫ్యూయల్, థ్రస్ట్, వెయిట్, క్వశ్చన్, పర్స్పెక్టివ్…), grammar slips (పెరిగుతే → పెరిగితే), truncations |
| `check` | anything that needs the audio (misheard words, unclear phrases). Use `?` when no confident guess exists - the owner types it |

Watch for ASR patterns seen on this channel: doubled vowel signs, English loanwords split or
misspelled, "trust" for rocket "thrust", "ట అవర్స్" for "two hours", dropped final syllables.
Context decides: a rocket section means థ్రస్ట్; a person's choice means చూజ్.

## Step 3 - owner listens and decides

```
node scripts/automation/reel-finishing/caption-review-page.mjs --job <job dir> --proposals proposals.json --overlay <latest corrections.json> --out <new review folder>
python -m http.server <port> --bind 127.0.0.1 --directory <new review folder>
```

Open it in the browser pane. Each row: caption now, proposed spelling (editable), 3-second clip,
Accept/Keep. The owner exports `caption-spelling-decisions.json` (or pastes it). "Accept all" from
the owner in chat is valid approval for the listed proposals; record it in the evidence text.

## Step 4 - apply (validated)

```
node scripts/automation/reel-finishing/apply-caption-decisions.mjs --job <job dir> --decisions caption-spelling-decisions.json --base <latest corrections.json> --evidence "the creator approved <what> on <date> after listening" --out docs/automation/<EPISODE>_SOURCE_CORRECTIONS_<date>.json [--from s --to s]
```

Refuses to write unless every edit binds to exactly one native word and nothing in range is still
broken or in English letters. Earlier owner edits are kept unless a newer decision replaces them.

## Step 5 - key words behind the host

Propose 1 key word or short phrase per reel section (~one every 10-15 s): the idea of that section
(డిసిషన్, థ్రస్ట్ జనరేషన్, సక్సెస్ ఏంటి?). Prefer nouns/ideas over filler (not దగ్గర, ఇచ్చే).
It must be spoken in that section, in corrected spelling, and **not under a full-screen graphic**
(the renderer skips covered titles - check and swap before showing the owner). Get the owner's OK,
then add to the reel props: `item.behindTitles = [{ "text", "startFrame" }]` (startFrame = the word's
timeline frame).

## Step 6 - render for review

```
node scripts/automation/reel-finishing/render-reel-motion.mjs --props <reel>.props.json --wav <reel>.wav --source <normalized source.mp4> --out <new folder> [--bundle <dir from a previous run>] [--asset <media a graphic plays, e.g. traffic-preview.mp4>]
```

Preview scale (540×960) by default; `--scale 1` for full 1080×1920 after the owner approves the
preview. Checks: exact frame count, 30 fps, full decode, both streams start at 0, audio length.
Then show the owner a contact sheet and the reel; final render needs separate approval.

## The reel style (`lib/reel-motion.mjs`, version reel-motion-trial-2; Punchy base, owner-approved 20 Oct 2026)

| Layer | Spec |
|---|---|
| Shots | Each source beat split at word gaps (≥2 frames) into ~2.5 s shots (54-96 frames); never inside a word |
| Framing | Hard punch-in cycle wide 1.0 → close 1.2 → medium 1.12; no slow push |
| Tilt | Medium/close shots ±1.5°, alternating |
| Emphasis | Longest word of each shot: instant +7% punch held to the cut, +1.2° tilt, 3-frame shake |
| Whip | Every source join: 6 frames spin-out to 18° with blur, 6 frames spin-in |
| Coverage | Scale is raised per frame so the rotated picture always covers the canvas |
| Pivot | Host face (38% / 48% of the vertical frame) |
| Titles | Behind the host via a MediaPipe person matte; white, heavy, sized to fit the tightest shot |

## Known limits - tell the owner

- Close-up + punch reaches ~2.4× total enlargement of a 1080p landscape source; the face softens.
- The person matte can miss a raised hand at the frame edge; text may show over it.
- ASR Telugu accuracy is the main quality risk (~1 word in 7 needed fixing on episode 1).
- A whip at a join that opens with a full-screen graphic is hidden under the graphic.

## Tests

`node --test scripts/automation/test/test-reel-motion.mjs` (shots, coverage, punch-ins, titles).
- Behind-host titles never overlap a graphic: under a full-screen one they are skipped; under a small
  above-you one they start when it ends (same section) or are skipped.

## Reel style rotation — OWNER-APPROVED 20 Oct 2026 (episode 1 previews, final3)

Reels only (the long video stays calm). Each reel gets exactly ONE style, chosen by reel type;
brand constants (`reel-finishing/brand.mjs`: amber #FFD166, Nirmala UI captions, wordmark top-left,
end card) are shared. Owner decisions: **reels stay >= 60 s** (not 30-60); **Punchy keeps whips and
behind-host titles**; sound effects are original (`assets/sfx`, synthesised), music beds only from
owner-supplied licensed tracks. Approval covers the styles; each new episode's hook text, end-card
line, text cards and list titles are new on-screen words and still need the owner's OK, and a
full-resolution render still needs separate final-render approval.

| Style | Use for | Build |
|---|---|---|
| Punchy | opinion, hot take, motivation, straight to camera | `prepare-reel-style.mjs --style punchy --hook ... --end-line ...` |
| Explainer | curiosity, did-you-know, history, how-things-work | `prepare-reel-style.mjs --style explainer --spec <spec.json> --end-line ...` |
| Listicle | tips, how-to, "3 things", takeaways | `prepare-reel-style.mjs --style listicle --spec <spec.json> --end-line ...` |

Then `render-reel-motion.mjs` (preview scale) and owner review.

**Captions (all styles):** bottom-anchored just above the bottom-20% safe line (`safeZone.bottomPercent + 1`),
below the mouth, clear of the right-edge buttons. Owner moved them down from 60% height — never over the face.

**Punchy:** pauses tightened to <= 0.15 s (longest first; stops at the 60 s floor, so some pauses remain),
a visual change every ~1.5-2 s, zoom 100%/115% per cut, +20% punch on the key word, whips at real
sentence joins only (never at pause trims), word-by-word captions with the key word in amber and a pop,
hook text (top 11%) for 2 s, logo (hidden under small top graphics), behind-host titles, end card,
whoosh on zooms/whips and pop on key words.

**Explainer:** calm 100%/108% cuts (~2.5 s), no tilt/whip/punch; sentence captions (<= 6 words, break at
pauses >= 0.3 s) with keyword underline, hidden while a text card shows; highlighter text cards (2.5 s,
placed after full-screen graphics, >= 1.5 s apart) with a paper sound; 3 s hook; end card.

**Listicle:** 100%/106% cuts (~2.7 s), warm grade; big number pop then the point title at top 9%
(captions pause during the pop), ding per point, corner tag, 4-5 word captions, 2 s hook, end card.

Spec files (owner-reviewable): explainer `{hook, keywords, textCards:[{anchor, from, sentence, highlight}]}`;
listicle `{hook, keywords, points:[{n, anchor, from, title}]}`. Anchors are Telugu words at/after `from` seconds.

Episode 1 mapping: Punchy reels 1 and 5; Explainer reels 2 and 3; Listicle reel 4.
