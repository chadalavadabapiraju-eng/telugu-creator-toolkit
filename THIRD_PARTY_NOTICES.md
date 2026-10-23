# Third-party notices

This repository contains only original project code, documentation and synthetic example data, released under the
MIT License (see `LICENSE`). **No third-party source code, model weights, fonts, media or binaries are included.**

Some parts use third-party software **at run time**, installed separately by you. Each keeps its own licence:

| Software | Used by | Licence |
|---|---|---|
| [Remotion](https://www.remotion.dev) | `packages/broll`, `packages/publish` (templates) | Remotion License — free for individuals and companies of up to 3 people; larger companies need a Remotion Company License. See https://www.remotion.dev/docs/license |
| [React](https://react.dev) | Remotion templates | MIT |
| [MediaPipe](https://github.com/google-ai-edge/mediapipe) | `packages/publish/cutout.py` (person cut-out) | Apache-2.0; its bundled models are distributed with the MediaPipe package under its terms |
| [OpenCV](https://opencv.org) library | `packages/publish/cutout.py` | Apache-2.0 for OpenCV 4.5 and later (earlier versions: BSD-3-Clause) |
| [opencv-python](https://github.com/opencv/opencv-python) packaging (the pip wheels) | `packages/publish/cutout.py` | MIT for the packaging code ([licence](https://github.com/opencv/opencv-python/blob/master/LICENSE.txt)); the wheels also bundle third-party components with their own notices |
| [NumPy](https://numpy.org) | `packages/publish/cutout.py` | BSD-3-Clause |
| [Node.js](https://nodejs.org) | everything in `packages/` | MIT |
| [FFmpeg](https://ffmpeg.org) | the caption review page cuts audio clips with it | LGPL/GPL depending on your build |

Fonts: the templates name **Nirmala UI** (installed with Windows) and fall back to system fonts; no font files are
included. Check the licence of any font you use when you publish videos.

Verify each licence yourself before commercial use; this table is a convenience, not legal advice.
