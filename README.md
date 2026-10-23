# telugu-creator-toolkit

> **Status: developer toolkit (v0.1).** These are building blocks extracted from a working editing workflow,
> not a complete install-and-render application. Caption and reel modules run with Node; the video templates are
> source code that needs your own Remotion project. See "What runs today" below.

AI-assisted tools for Telugu video creators, built around one rule: **AI does the repetitive work, a human approves
everything that changes meaning or brand.**

Extracted from the workflow behind the Telugu YouTube channel **360 LIFE**, used to produce one complete episode so
far (a captioned long video, five styled vertical reels, story B-roll, thumbnails and an upload kit). Repeatability
across fresh recordings is not yet proven.

📐 **Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the agentic architecture (builder / independent reviewer /
human approver), 14 problems with their solutions and evidence, what did not work, remaining release work and open
problems for collaborators.

## What runs today

| Part | What it does | Runs today? |
|---|---|---|
| [`packages/captions/transcript-corrections.mjs`](packages/captions/transcript-corrections.mjs) | **Source-bound caption correction**: one spoken word → one corrected word at an exact time, approved by a human; fails closed on ambiguous, stale or unapproved edits; the raw transcript is preserved | ✅ requires Node ≥ 20 (tested) |
| [`packages/captions/telugu-caption-scan.mjs`](packages/captions/telugu-caption-scan.mjs) | **Telugu script scanner**: flags Latin letters and the malformed Telugu sequences it checks | ✅ (tested) |
| [`packages/captions/spelling-memory.mjs`](packages/captions/spelling-memory.mjs) | **Spelling memory**: learns owner-approved fixes (validated) and proposes them for review | ✅ (tested, demo below) |
| [`packages/captions/apply-caption-decisions.mjs`](packages/captions/apply-caption-decisions.mjs) | Turns accepted review decisions into a validated correction file | ✅ with a job folder |
| [`packages/captions/caption-review-page.mjs`](packages/captions/caption-review-page.mjs) | Review page with 3-second audio clips per proposal | ⚠️ needs a job folder with its source video and FFmpeg; not runnable with the synthetic demo |
| [`packages/reels`](packages/reels) | **Reel motion planner** (punch-ins, key-word emphasis, whips at real joins, behind-the-host titles) and **pause tightening** that never cuts inside a word | ✅ planning library (tested); no renderer included |
| [`packages/broll/long-broll-entry.tsx`](packages/broll/long-broll-entry.tsx) | 13 **story B-roll** Remotion templates; each label appears when its word is spoken | 🔜 template source only; not runnable on its own yet |
| [`packages/publish`](packages/publish) | **Thumbnail / Shorts cover** Remotion templates and an offline person cut-out helper (`cutout.py`) | 🔜 template source only; `cutout.py` needs Python with MediaPipe, OpenCV, NumPy |
| [`skills/`](skills) | Operating procedures for an AI agent (e.g. Claude Code): captions & reel styles, story B-roll, publish kit | 📄 documentation (paths refer to the original workflow) |
| [`examples/`](examples) | Synthetic sample data only (invented sentences) | ✅ |

## Quick start

```bash
git clone https://github.com/chadalavadabapiraju-eng/telugu-creator-toolkit.git
cd telugu-creator-toolkit
npm test          # Node 20+; no npm install needed for captions and reels
```

Spelling memory on the bundled synthetic demo job:

```bash
node packages/captions/spelling-memory.mjs learn --raw examples/captions/demo-job/transcript_raw.json \
  --overlay examples/captions/source-corrections.synthetic.json --episode demo --memory memory.json
node packages/captions/spelling-memory.mjs propose --job examples/captions/demo-job --memory memory.json --out proposals.json
```

Telugu script scan of the demo job:

```bash
node packages/captions/telugu-caption-scan.mjs --job examples/captions/demo-job
```

Optional: set `TCT_PROTECTED_DIRS` (paths separated by `;` on Windows, `:` elsewhere) to folders the correction CLI
must never write into.

## Design principles
1. **Keep the spoken words.** Fix spelling and mishearing only; never rephrase. Telugu script on screen.
2. **Approvals are data**, intended to be bound to file fingerprints so a changed file loses its approval. In this
   toolkit that binding exists for caption corrections (source hash); the full render-approval contract lives in the
   original workflow and is not included here.
3. **Fail closed**: ambiguous, stale or unapproved input stops the job instead of being "fixed".
4. **One timing authority**: integer frames; renderers only draw.
5. **Previews before final renders. Nothing is published automatically.**

## Known limitations
- Not an install-and-render application: no video engine, ASR or renderer is included.
- The B-roll and thumbnail templates need your own Remotion project; a runnable demo is planned.
- Requires Node ≥ 20. Tested only on Windows with Node 24.16.0; other versions and platforms are untested.
- Correction files bind to the RAW speech-recognition tokens (`transcript_raw.json`). The review page and decisions use
  the display transcript (`transcript.json`); the tools map the two by word position and refuse when they do not match.
- The caption review page embeds short audio excerpts of the real recording. Keep generated review folders private;
  `reviews/` is git-ignored for that purpose.
- Telugu script checks catch Latin letters and specific malformed sequences; they do not judge spelling or meaning.
- Spelling-memory gains were measured only on a re-transcription of the same talk.

## Licence
Original project contributions use MIT (see [LICENSE](LICENSE)). Dependencies, models and upstream material keep
their own terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The Remotion templates depend on **Remotion,
which has its own licence**: https://www.remotion.dev/docs/license

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md). Open problems are listed at the end of
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Support is best-effort.
