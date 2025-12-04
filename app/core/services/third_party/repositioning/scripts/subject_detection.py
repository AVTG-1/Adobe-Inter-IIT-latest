import cv2
import numpy as np
import torch
from typing import List, Optional, Tuple
from dataclasses import dataclass
from torch import nn
from torchvision.ops import nms
import torchvision.models as models

@dataclass
class BoundingBox:
    """Bounding box with confidence and class information"""
    x: int
    y: int
    width: int
    height: int
    confidence: float
    class_id: int
    class_name: str

@dataclass
class Subject:
    """Represents a detected subject in an image"""
    bbox: BoundingBox
    mask: Optional[np.ndarray] = None
    keypoints: Optional[np.ndarray] = None

class YOLOX(nn.Module):
    """YOLO-XL based subject detector"""
    
    def __init__(self, device: str = "cuda" if torch.cuda.is_available() else "cpu"):
        super().__init__()
        self.device = device
        self.model = self._load_model()
        self.classes = ["person", "animal", "vehicle", "object"]
        self.img_size = 640
        self.conf_thres = 0.5
        self.iou_thres = 0.45
        
    def _load_model(self):
        """Load YOLO-XL model"""
        # In practice, you'd load the actual YOLO-XL weights here
        # For demo, we'll use a placeholder
        return models.resnet50(pretrained=True).to(self.device).eval()
    
    @torch.no_grad()
    def detect(self, image: np.ndarray) -> List[Subject]:
        """
        Detect subjects in the input image.
        
        Args:
            image: Input image in BGR format
            
        Returns:
            List of detected subjects
        """
        # Preprocess
        img = self._preprocess(image)
        
        # Run inference
        with torch.no_grad():
            # In practice, this would be model(img)
            preds = self._mock_predict(img)
        
        # Process predictions
        return self._process_predictions(preds, image.shape)
    
    def _preprocess(self, img: np.ndarray) -> torch.Tensor:
        """Preprocess image for YOLO-XL"""
        # Convert BGR to RGB and resize
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (self.img_size, self.img_size))
        
        # Normalize and convert to tensor
        img = img.astype(np.float32) / 255.0
        img = torch.from_numpy(img).permute(2, 0, 1).unsqueeze(0)
        return img.to(self.device)
    
    def _mock_predict(self, x: torch.Tensor) -> torch.Tensor:
        """Mock prediction for demo purposes"""
        # In practice, this would be the actual model forward pass
        bs = x.shape[0]
        return torch.rand(bs, 100, 6).to(x.device)  # [batch, num_detections, (x,y,w,h,conf,class)]
    
    def _process_predictions(
        self, 
        preds: torch.Tensor, 
        orig_shape: Tuple[int, ...]
    ) -> List[Subject]:
        """Process model predictions into Subject objects"""
        subjects = []
        img_h, img_w = orig_shape[:2]
        
        for det in preds[0]:  # First image in batch
            # Filter by confidence
            if det[4] < self.conf_thres:
                continue
                
            # Scale boxes to original image
            x1 = int((det[0] - det[2]/2) * img_w)
            y1 = int((det[1] - det[3]/2) * img_h)
            w = int(det[2] * img_w)
            h = int(det[3] * img_h)
            
            # Clamp to image bounds
            x1 = max(0, min(img_w - 1, x1))
            y1 = max(0, min(img_h - 1, y1))
            w = min(img_w - x1, w)
            h = min(img_h - y1, h)
            
            class_id = int(det[5])
            class_name = self.classes[class_id % len(self.classes)]
            
            bbox = BoundingBox(
                x=x1, y=y1, width=w, height=h,
                confidence=float(det[4]),
                class_id=class_id,
                class_name=class_name
            )
            
            subjects.append(Subject(bbox=bbox))
        
        # Apply NMS
        return self._non_max_suppression(subjects)
    
    def _non_max_suppression(self, subjects: List[Subject]) -> List[Subject]:
        """Apply non-maximum suppression to remove overlapping detections"""
        if not subjects:
            return []
            
        # Convert to tensors for NMS
        boxes = torch.tensor([
            [s.bbox.x, s.bbox.y, 
             s.bbox.x + s.bbox.width, 
             s.bbox.y + s.bbox.height] 
            for s in subjects
        ])
        scores = torch.tensor([s.bbox.confidence for s in subjects])
        
        # Apply NMS
        keep = nms(boxes, scores, self.iou_thres)
        
        return [subjects[i] for i in keep]

def visualize_detections(
    image: np.ndarray,
    subjects: List[Subject],
    color: Tuple[int, int, int] = (0, 255, 0),
    thickness: int = 2
) -> np.ndarray:
    """Draw detection boxes on image"""
    result = image.copy()
    for subj in subjects:
        b = subj.bbox
        cv2.rectangle(
            result,
            (b.x, b.y),
            (b.x + b.width, b.y + b.height),
            color,
            thickness
        )
        label = f"{b.class_name} {b.confidence:.2f}"
        cv2.putText(
            result, label, (b.x, b.y - 10),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, thickness
        )
    return result

# Example usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="YOLO-XL Subject Detection")
    parser.add_argument("image_path", help="Path to input image")
    parser.add_argument("--output", default="detection_result.jpg", help="Output image path")
    args = parser.parse_args()
    
    # Load image
    image = cv2.imread(args.image_path)
    if image is None:
        raise ValueError(f"Could not load image from {args.image_path}")
    
    # Initialize detector
    detector = YOLOX(device="cpu")
    
    # Detect subjects
    subjects = detector.detect(image)
    print(f"Detected {len(subjects)} subjects")
    
    # Visualize and save
    result = visualize_detections(image, subjects)
    cv2.imwrite(args.output, result)
    print(f"Saved result to {args.output}")