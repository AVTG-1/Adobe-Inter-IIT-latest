"""
DWPose Detector Integration
Wraps the DWPose detector for use in the pose change feature
Integrates with existing pose_estimation.py and pose_generation.py
"""

import os
import cv2
import torch
import numpy as np
from PIL import Image
from typing import List, Tuple, Dict, Any, Optional
import base64
from io import BytesIO

# Import the existing DWPose estimator and PCDM
try:
    from .pose_estimation import DWPoseEstimator, Pose, Keypoint, visualize_pose
    from .pose_generation import PCDM, PCDMConfig
    HAS_DWPOSE = True
except ImportError as e:
    HAS_DWPOSE = False
    print(f"Warning: DWPose not available: {e}. Using mock detector.")


class PoseDetectorWrapper:
    """
    Wrapper for DWPose detector that provides a clean interface
    for the pose change feature. Integrates with the existing DWPoseEstimator
    and PCDM for pose-guided image generation.
    """

    def __init__(self, device: str = "cuda" if torch.cuda.is_available() else "cpu"):
        self.device = device
        self.detector = None
        self.pcdm = None
        self.last_detected_poses = None

        if HAS_DWPOSE:
            try:
                # Initialize DWPose estimator
                self.detector = DWPoseEstimator(device=device)
                print(f"✅ DWPose detector initialized on {device}")

                # Initialize PCDM for pose transformation
                try:
                    pcdm_config = PCDMConfig(device=device, num_inference_steps=20)
                    self.pcdm = PCDM(pcdm_config)
                    print(f"✅ PCDM initialized on {device}")
                except Exception as e:
                    print(f"⚠️ PCDM initialization failed: {e}. Pose transformation will not be available.")
                    self.pcdm = None

            except Exception as e:
                print(f"⚠️ Failed to initialize DWPose: {e}")
                self.detector = None

    def detect_pose(
        self,
        image: Image.Image,
        detect_resolution: int = 512,
        image_resolution: int = 512,
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Detect pose keypoints in an image.

        Args:
            image: PIL Image
            detect_resolution: Resolution for detection (not used with current detector)
            image_resolution: Output image resolution (not used with current detector)

        Returns:
            Tuple of (pose_map_image, keypoints_dict)
            - pose_map_image: numpy array of the pose visualization
            - keypoints_dict: Dictionary containing detected keypoints
        """
        if self.detector is None:
            # Return mock data if detector not available
            return self._mock_detect(image)

        try:
            # Convert PIL to numpy array (RGB format)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            img_array = np.array(image)

            # Convert RGB to BGR for OpenCV operations
            img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

            # Run DWPose detection
            poses = self.detector.detect(img_bgr)

            # Store detected poses for later use
            self.last_detected_poses = poses

            if not poses:
                print("⚠️ No poses detected in image, returning mock data")
                return self._mock_detect(image)

            # Take the first (most prominent) pose
            detected_pose = poses[0]

            # Visualize the detected pose
            pose_map_bgr = visualize_pose(img_bgr, poses)
            pose_map_rgb = cv2.cvtColor(pose_map_bgr, cv2.COLOR_BGR2RGB)

            # Convert Pose object to dictionary format expected by frontend
            keypoints_dict = self._pose_to_dict(detected_pose, image.size)

            return pose_map_rgb, keypoints_dict

        except Exception as e:
            print(f"Error during pose detection: {e}")
            import traceback
            traceback.print_exc()
            return self._mock_detect(image)

    def _pose_to_dict(self, pose: 'Pose', image_size: Tuple[int, int]) -> Dict[str, Any]:
        """
        Convert Pose object to dictionary format expected by frontend.

        Args:
            pose: Pose object from DWPoseEstimator
            image_size: (width, height) of the image

        Returns:
            Dictionary with keypoints in normalized coordinates
        """
        width, height = image_size

        keypoints_list = []
        for kpt in pose.keypoints:
            keypoints_list.append({
                'id': kpt.id,
                'name': kpt.name,
                'x': float(kpt.x / width),  # Normalize to 0-1
                'y': float(kpt.y / height),  # Normalize to 0-1
                'confidence': float(kpt.confidence),
            })

        # Normalize bbox coordinates
        bbox_x, bbox_y, bbox_w, bbox_h = pose.bbox
        normalized_bbox = [
            bbox_x / width,
            bbox_y / height,
            bbox_w / width,
            bbox_h / height,
        ]

        return {
            'keypoints': keypoints_list,
            'bbox': normalized_bbox,
            'score': float(pose.score),
        }

    def _dict_to_pose(self, keypoints_dict: Dict[str, Any], image_size: Tuple[int, int]) -> 'Pose':
        """
        Convert dictionary format to Pose object.

        Args:
            keypoints_dict: Dictionary with normalized keypoints
            image_size: (width, height) of the image

        Returns:
            Pose object
        """
        width, height = image_size

        keypoints = []
        for kpt_dict in keypoints_dict['keypoints']:
            keypoints.append(Keypoint(
                x=float(kpt_dict['x'] * width),
                y=float(kpt_dict['y'] * height),
                confidence=float(kpt_dict.get('confidence', 0.9)),
                id=int(kpt_dict['id']),
                name=kpt_dict['name']
            ))

        # Denormalize bbox
        bbox_norm = keypoints_dict.get('bbox', [0.25, 0.1, 0.5, 0.8])
        bbox = (
            bbox_norm[0] * width,
            bbox_norm[1] * height,
            bbox_norm[2] * width,
            bbox_norm[3] * height,
        )

        return Pose(
            keypoints=keypoints,
            bbox=bbox,
            score=float(keypoints_dict.get('score', 0.9))
        )

    def apply_pose_transformation(
        self,
        source_image: Image.Image,
        source_keypoints: Dict[str, Any],
        target_keypoints: Dict[str, Any],
        prompt: str = "",
        negative_prompt: str = "low quality, blurry, distorted",
    ) -> Image.Image:
        """
        Apply pose transformation from source to target keypoints using PCDM.

        Args:
            source_image: Original image
            source_keypoints: Detected keypoints from source (dict format)
            target_keypoints: Target keypoints to transform to (dict format)
            prompt: Optional text prompt for generation
            negative_prompt: Negative prompt for generation

        Returns:
            Transformed image with new pose
        """
        if self.pcdm is None:
            print("⚠️ PCDM not available, returning source image")
            return source_image

        try:
            # Convert PIL to numpy (RGB)
            if source_image.mode != 'RGB':
                source_image = source_image.convert('RGB')
            img_array = np.array(source_image)

            # Convert keypoints dict to Pose objects
            source_pose = self._dict_to_pose(source_keypoints, source_image.size)
            target_pose = self._dict_to_pose(target_keypoints, source_image.size)

            # Generate image with target pose using PCDM
            result = self.pcdm.generate_from_pose(
                source_image=img_array,
                source_pose=source_pose,
                target_pose=target_pose,
                prompt=prompt or "a person in the specified pose, high quality, detailed, photorealistic",
                negative_prompt=negative_prompt,
            )

            # Return the generated image
            return result['image']

        except Exception as e:
            print(f"⚠️ Pose transformation failed: {e}")
            import traceback
            traceback.print_exc()
            return source_image

    def _generate_mock_keypoints(self, image_size: Optional[Tuple[int, int]] = None) -> Dict[str, Any]:
        """Generate mock keypoints in COCO format with normalized coordinates"""
        keypoint_names = [
            'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
            'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
        ]

        # Default neutral standing pose (normalized 0-1)
        default_positions = [
            [0.5, 0.15],   # nose
            [0.48, 0.12],  # left_eye
            [0.52, 0.12],  # right_eye
            [0.46, 0.12],  # left_ear
            [0.54, 0.12],  # right_ear
            [0.42, 0.25],  # left_shoulder
            [0.58, 0.25],  # right_shoulder
            [0.38, 0.4],   # left_elbow
            [0.62, 0.4],   # right_elbow
            [0.35, 0.52],  # left_wrist
            [0.65, 0.52],  # right_wrist
            [0.45, 0.55],  # left_hip
            [0.55, 0.55],  # right_hip
            [0.43, 0.72],  # left_knee
            [0.57, 0.72],  # right_knee
            [0.42, 0.9],   # left_ankle
            [0.58, 0.9],   # right_ankle
        ]

        keypoints = []
        for i, (name, pos) in enumerate(zip(keypoint_names, default_positions)):
            keypoints.append({
                'id': i,
                'name': name,
                'x': pos[0],
                'y': pos[1],
                'confidence': 0.9,
            })

        return {
            'keypoints': keypoints,
            'bbox': [0.35, 0.12, 0.3, 0.78],  # [x, y, w, h] normalized
            'score': 0.9,
        }

    def _mock_detect(self, image: Image.Image) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Return mock detection results"""
        # Convert image to numpy array
        img_array = np.array(image)

        # Draw simple skeleton on image
        pose_map = self._draw_mock_skeleton(img_array)

        # Return mock keypoints
        keypoints = self._generate_mock_keypoints(image.size)

        return pose_map, keypoints

    def _draw_mock_skeleton(self, image: np.ndarray) -> np.ndarray:
        """Draw a simple skeleton for testing"""
        h, w = image.shape[:2]
        overlay = image.copy()

        # Draw simple stick figure
        keypoints = self._generate_mock_keypoints((w, h))['keypoints']

        # Draw bones (connections)
        connections = [
            (0, 1), (0, 2),  # Head
            (5, 6),  # Shoulders
            (5, 7), (7, 9),  # Left arm
            (6, 8), (8, 10),  # Right arm
            (11, 12),  # Hips
            (5, 11), (6, 12),  # Torso
            (11, 13), (13, 15),  # Left leg
            (12, 14), (14, 16),  # Right leg
        ]

        for i, j in connections:
            if i < len(keypoints) and j < len(keypoints):
                pt1 = (int(keypoints[i]['x'] * w), int(keypoints[i]['y'] * h))
                pt2 = (int(keypoints[j]['x'] * w), int(keypoints[j]['y'] * h))
                cv2.line(overlay, pt1, pt2, (0, 255, 255), 2)

        # Draw keypoints
        for kp in keypoints:
            x = int(kp['x'] * w)
            y = int(kp['y'] * h)
            cv2.circle(overlay, (x, y), 4, (0, 255, 0), -1)

        return overlay


def pil_to_base64(image: Image.Image, format: str = 'PNG') -> str:
    """Convert PIL image to base64 string"""
    buffered = BytesIO()
    image.save(buffered, format=format)
    return base64.b64encode(buffered.getvalue()).decode('utf-8')


def base64_to_pil(base64_string: str) -> Image.Image:
    """Convert base64 string to PIL image"""
    image_bytes = base64.b64decode(base64_string)
    return Image.open(BytesIO(image_bytes))


# Example usage
if __name__ == "__main__":
    # Test the detector
    detector = PoseDetectorWrapper()

    # Create a test image
    test_image = Image.new('RGB', (512, 512), color='white')

    # Detect pose
    pose_map, keypoints = detector.detect_pose(test_image)

    print(f"Detected {len(keypoints['keypoints'])} keypoints")
    print(f"Pose map shape: {pose_map.shape}")

    # Test transformation
    target_keypoints = detector._generate_mock_keypoints(test_image.size)
    # Modify some keypoints for testing
    target_keypoints['keypoints'][9]['y'] = 0.3  # Move left wrist up
    target_keypoints['keypoints'][10]['y'] = 0.3  # Move right wrist up

    transformed = detector.apply_pose_transformation(
        test_image,
        keypoints,
        target_keypoints
    )

    print(f"Transformation complete. Result type: {type(transformed)}")
