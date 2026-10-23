# One-frame person cutout (same MediaPipe selfie model and edge rule as person_matte.py) -> RGBA PNG.
import sys
import cv2
import mediapipe as mp
import numpy as np

src, out = sys.argv[1], sys.argv[2]
img = cv2.imread(src)
rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
with mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=0) as seg:
    m = seg.process(rgb).segmentation_mask
a = cv2.GaussianBlur(np.clip((m - 0.35) / 0.3, 0, 1), (0, 0), 3)
rgba = np.dstack([img, (a * 255).astype(np.uint8)])
cv2.imwrite(out, rgba)
print("ok", img.shape, float(a.mean()))
