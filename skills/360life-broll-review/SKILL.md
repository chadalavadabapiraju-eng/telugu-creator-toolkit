---
name: 360life-broll-review
description: Find, propose, and preview meaningful B-roll for 360 Life videos from a transcript and timeline. Use when planning B-roll, motion graphics, maps, visual metaphors, or a user-choice review page.
---

> Adapted from the 360 LIFE production pipeline (Telugu talking-head channel). Paths such as
> `scripts/automation/...` refer to that pipeline; the toolkit equivalents live in `packages/`.


# 360 Life B-roll Review

Turn spoken ideas into visual options that the creator can select. B-roll should clarify the story and feel intentional, not fill time.

## Find candidate moments

- Use the approved transcript, word timings, and canonical timeline. Do not guess timestamps.
- Respect protected thesis, hook, closing, cut, crossfade, caption, and existing graphic windows in the project plan.
- Prefer moments where a visual adds context, scale, contrast, place, or a useful metaphor. Leave the host on screen when a cutaway adds little.
- Avoid repeating a visual for every name or noun. Build one coherent motif when it fits several related lines.

## Offer choices

For each suitable moment, show up to three genuinely different concepts:

1. Literal: show the subject or action directly.
2. Cinematic or metaphorical: visualize the idea with a clear, respectful metaphor.
3. Explanatory: use a sourced map, diagram, comparison, or sequence.

Also offer “Keep host on screen” and “Skip.” For every choice, show the exact spoken line, time range, a short preview/mockup in context, why it fits, and any tradeoff. Do not preselect a choice or treat a recommendation badge as approval.

## Claims, assets, and review

- Do not invent figures, dates, boundaries, titles, or historical claims. Cite reliable sources for factual graphics; if verification is unavailable, label the idea illustrative or omit the claim.
- Keep captions faithful to the recording. Put factual corrections in a clearly identified graphic or flag the spoken line for a cut/re-record; do not silently alter subtitles to change the claim.
- Use only approved assets and sources. Record creator, source, license, and file hash for stock media. Do not download, generate paid media, or spend credits before approval.
- Keep face and captions visible for overlays. For full-screen cutaways, preserve the voice and timing and explain that the host will be hidden.
- Collect the creator's explicit selection for each moment. Validate the combined plan against timing, protected windows, media rights, and project limits before rendering.
- Build review previews only after selection. Stop for the creator's review before full rendering or publishing.


## Story B-roll for the long video (owner direction, 21 October 2026)

Read the corrected captions as **stories**, not keywords: one B-roll follows one complete story beat
(setup → turn → point), and a motif can return (episode 1: the alien story comes back at "ఒక ఏలియన్ అవ్వండి").

1. **Moments.** From the long video's canonical `resolved_timeline.json` (`captionWords`), print timed lines and
   pick story beats. Write `moments.json` with exact frames, the spoken line, three concepts (literal /
   story-metaphor / explanatory) + Keep host + Skip, why, and tradeoff. Political, medical and real-person
   moments: no real leaders, parties, logos, actors or health claims on screen; flag unverified claims.
2. **Choice page.** Local page (127.0.0.1) with a frame per moment; nothing preselected; export JSON.
   If the creator delegates ("you choose for me"), record that sentence as the decision and still show previews.
3. **Picks.** `picks.json`: per moment `from`/`to` (timeline frames), `placement` (`above-you` = top panel,
   face and burned captions visible; `full-screen` = covers all above the caption band), `template`, and
   labels `{text, anchor}`; the anchor is a spoken word, so each label appears when it is said.
   Templates: flow, ladder, balance, loop, triangle, gauge, battery, box, curve, views, compare, title,
   scene (aliens-arrive, owners, child-stars). Labels must be Telugu (the renderer refuses English letters).
4. **Previews** (graphic over the final captioned base, with the exact voice of that span):
   `node scripts/automation/long-broll/render-long-broll.mjs --picks picks.json --base <captioned long_form.mp4> --timeline <resolved_timeline.json> --out <new folder>`
   Check every clip at 4 points (text clipped? overlapping? empty panel?), fix, re-render, then send to the creator.
5. **Final** only after the creator approves the previews: same command with `--final --clips <preview folder>`.
   It refuses changed clips or a different base, keeps every frame count, and copies the voice unchanged.

Never lay B-roll clips that contain an older base video (stale captions come back). Batch all caption
fixes before the long video run; B-roll is built last, over the final captioned base.
