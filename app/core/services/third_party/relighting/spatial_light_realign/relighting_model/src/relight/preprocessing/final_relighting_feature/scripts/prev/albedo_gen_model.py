import cv2
import numpy as np
from chrislib.data_util import load_image

from intrinsic.pipeline import load_models, run_pipeline

# load the models from the given paths
models = load_models('v2')

# load an image (np float array in [0-1])
image = load_image('scene.jpg')

# run the model on the image using R_0 resizing
results = run_pipeline(models, image)

alb = results['hr_alb']
alb = np.clip(alb, 0, 1)

if alb.shape[0] == 3:      # CHW
    alb = np.transpose(alb, (1,2,0))

# convert RGB → BGR
np.save("albedo.npy", alb)
alb_bgr = alb[..., ::-1]

cv2.imwrite("albedo.png", (alb_bgr * 255).astype(np.uint8))
# + multiple other keys for different intermediate components

