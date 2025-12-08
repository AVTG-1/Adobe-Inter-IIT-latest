import cv2
import numpy as np

# Image size
height, width = 183, 275  # you can change this

# Create a black RGB image
img = np.zeros((height, width, 3), dtype=np.uint8)

background_color = (60, 60, 60)          # soft grey
img = np.full((height, width, 3), background_color, dtype=np.uint8)

# Center of the oval
center_x, center_y = width // 2, height // 2

# Axes lengths (oval size)
axis_x, axis_y = width // 4, height // 4

# Warm color for the oval
warm_color = (180, 220, 255)             # warm (BGR — OpenCV uses BGR)

cv2.ellipse(
    img,
    center=(center_x, center_y),
    axes=(axis_x, axis_y),
    angle=0,
    startAngle=0,
    endAngle=360,
    color=warm_color,
    thickness=-1
)

cv2.imwrite("warm_oval.png", img)