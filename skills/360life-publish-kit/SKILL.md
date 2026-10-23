---
name: 360life-publish-kit
description: Prepare a finished 360 Life episode for YouTube - long-video thumbnail(s), Shorts/Reels covers, and the copy-paste upload kit (titles, description, chapters, tags, pinned comment, settings, schedule). Use after the long video and reels are final and owner-approved; the creator uploads.
---

> Adapted from the 360 LIFE production pipeline (Telugu talking-head channel). Paths such as
> `scripts/automation/...` refer to that pipeline; the toolkit equivalents live in `packages/`.


# 360 Life publish kit

Owner-approved on 21 October 2026 (episode 1). Follow the creator's current instruction when it differs.
Nothing is uploaded or posted by Claude. Everything goes into the episode folder
`<output>/<episode>-<date>/` next to the final videos.

## House rules

- Every word comes from what the creator says in the video (or an approved hook). No invented facts, numbers,
  quotes or promises. Political, medical and real-person topics: no names of leaders, parties, actors or
  health claims in titles, tags, thumbnails or covers.
- On-screen text is Telugu (digits allowed); the renderer refuses English letters. Description and tags
  may mix Telugu and English.
- Photos: only the creator's own approved photos (`<brand-assets>/profile_photo*.png`)
  or a frame of the episode. Never images with third-party logos (e.g. a branded T-shirt) or other people.
- Show every image to the creator before calling it done; he picks the long thumbnail.

## 1. Thumbnails and covers (house look: thumbnail "C")

Black background, red-orange burst with rays, host cut-out with a warm rim, two heavy outlined lines
(white + amber), a red tag, one story icon. Long thumbnail 1280x720; Shorts/Reels covers 1080x1920 with an
`n/5` badge, text and icon in the upper-middle band (clear of the Shorts UI and the profile-grid crop).

Write `thumbs.json` (see `scripts/automation/publish-kit/examples/ep1-thumbs.json`): two long-thumbnail
options (one matching the title question, one curiosity/story angle) and one cover per reel using its
approved hook. Icon kinds: `ufo-cap`, `balance`, `rocket`, `train`, `number-<n>`, `stamp` (add new kinds in
`thumbnail-entry.tsx` when a story needs one). Serious photo for questions/shock; smiling photo for tips and
positive endings. Then:

```
node scripts/automation/publish-kit/render-thumbs.mjs --spec thumbs.json --out <new folder>
```

It cuts out the photo (MediaPipe, offline), adds the wordmark, renders, writes JPGs, checks < 2 MB.
Look at every image: text clipped or overflowing? icon on the face? Fix the spec and re-run into a new folder.
Copy the chosen JPGs to the episode folder as `thumbnail-<X>-<angle>.jpg` and `reel-<n>-<style>-cover.jpg`.

YouTube Shorts usually take a cover from a frame in the app; the covers work directly on Instagram Reels and
Facebook. Inserting a cover as a Short's first frame changes the approved video: only on the creator's explicit OK.

## 2. Upload kit (`YOUTUBE-UPLOAD-KIT.txt` in the episode folder)

Get timed lines from the final long video's timeline:
```
node scripts/automation/publish-kit/timed-lines.mjs --timeline <long_form resolved_timeline.json>
```
Then write, in this order (episode 1's kit is the template):
- **Titles**: 3 options, Telugu question/hook + `| 360 LIFE`.
- **Description**: the opening question, the two-sentence setup in his words, 5–7 bullets of the stories in
  the video, the closing message, his own call to action, "ఇలాంటి ఆలోచనల కోసం 360 LIFE ని ఫాలో అవ్వండి".
- **Chapters**: first at 0:00, at least 3, each >= 10 s, one per story beat, times from the timed lines.
- **Tags** (about 15, Telugu + English topic words, no people/parties), **3 hashtags** (#360LIFE #Telugu #<topic>),
  **thumbnail text options**, **pinned comment** (a question that invites answers), **settings**
  (language and category to suit the video; **the creator decides per video** the "made for kids" answer and the
  altered/synthetic-content disclosure, e.g. AI voices or realistic AI visuals must be disclosed),
  optional `.srt` note.
- **Each Short**: title = approved hook + emoji + `#Shorts`, a one-line caption from the reel, 4–5 hashtags,
  "link the long video as Related video".

## 3. When to upload (general guidance until the channel has its own data)

- Long video: Saturday/Sunday 10 AM–12 noon IST, or a weekday 6–8 PM IST.
- Shorts: one a day, about 12–2 PM or 7–10 PM IST, in reel order, starting the day after the long video.
- Upload or schedule 1–2 hours before the target time. After 3–4 uploads use YouTube Studio →
  Analytics → Audience → "When your viewers are on YouTube" instead of these defaults.
- Say clearly that this is general guidance, not the channel's data.
