# Phase-by-Phase Implementation Plan
# Full Working Editor with Layer-Based Editing

## Current Status
- ❌ Features are placeholders (not working)
- ❌ Panels cover entire screen
- ❌ No layer system
- ❌ Crop/Rotate/Resize are embedded (should work on layers)
- ❌ Canvas not interactive

## Implementation Plan

### Phase 1: Foundation & Canvas System (Week 1)
**Goal:** Working canvas with image display and basic interactions

Tasks:
1. ✅ Fix deprecation warnings
2. ✅ Fix panel sizing (use proper snap points, max 50% screen)
3. ✅ Remove embedded crop/rotate from Edit panel
4. ✅ Create working canvas with zoom/pan
5. ✅ Implement image loading and display

**Deliverable:** Interactive canvas that displays image properly

---

### Phase 2: Layer System (Week 1-2)
**Goal:** Full layer management like Photoshop/ImageToolbox

Tasks:
1. Create Layer data structure
   - Base image layer
   - Adjustment layers
   - Text layers
   - Shape layers
   - Filter layers

2. Layer Manager Component
   - Add/Delete layers
   - Show/Hide layers
   - Reorder layers (drag & drop)
   - Opacity per layer
   - Blend modes (optional)

3. Layer Operations
   - Merge layers
   - Duplicate layer
   - Flatten all layers
   - Export single layer

**Deliverable:** Working layer system - can add, remove, reorder layers

---

### Phase 3: Crop Tool (Week 2)
**Goal:** Working crop with aspect ratios

Tasks:
1. Crop overlay on canvas
   - Draggable crop area
   - Corner handles for resizing
   - Aspect ratio presets (Free, 1:1, 4:3, 16:9, 3:2)
   - Grid overlay (rule of thirds)

2. Crop operations
   - Apply crop → Creates new layer
   - Cancel crop
   - Reset crop area
   - Rotate while cropping

3. UI
   - Toolbar: Aspect ratio buttons
   - Apply/Cancel buttons
   - Crop dimensions display

**Deliverable:** Full working crop tool on canvas

---

### Phase 4: Transform Tools (Week 2-3)
**Goal:** Rotate, Flip, Resize working on layers

Tasks:
1. Rotate Tool
   - Rotate 90° CW/CCW
   - Rotate 180°
   - Free rotation (0-360°)
   - Rotate current layer only

2. Flip Tool
   - Flip Horizontal
   - Flip Vertical
   - Works on selected layer

3. Resize Tool
   - Resize canvas
   - Resize layer
   - Maintain aspect ratio option
   - Presets (HD, 4K, etc.)

**Deliverable:** Working rotate, flip, resize on layers

---

### Phase 5: Filters (Week 3)
**Goal:** Real working filters (not placeholders)

Tasks:
1. Basic Filters
   - Grayscale
   - Sepia
   - Invert
   - Brightness/Darken

2. Blur Filters
   - Gaussian Blur
   - Box Blur
   - Motion Blur (if possible)

3. Artistic Filters
   - Oil Paint (approximation)
   - Sketch
   - Posterize

4. Filter Application
   - Apply to layer (creates new filtered layer)
   - Real-time preview
   - Intensity slider
   - Undo/Redo support

**Deliverable:** 10+ working filters with preview

---

### Phase 6: Adjustments (Week 3-4)
**Goal:** Real-time color/tone adjustments

Tasks:
1. Basic Adjustments
   - Brightness (-100 to +100)
   - Contrast (-100 to +100)
   - Saturation (-100 to +100)
   - Exposure

2. Advanced Adjustments
   - Highlights/Shadows
   - Temperature
   - Tint
   - Vibrance

3. Implementation
   - Apply to adjustment layer (non-destructive)
   - Real-time preview
   - Reset individual/all adjustments

**Deliverable:** Working adjustments with real-time preview

---

### Phase 7: Drawing & Shapes (Week 4)
**Goal:** Draw on canvas, add shapes

Tasks:
1. Drawing Tool
   - Freehand brush
   - Brush size (1-100px)
   - Color picker
   - Opacity control
   - Eraser mode

2. Shapes
   - Line
   - Rectangle (fill/stroke)
   - Circle
   - Arrow
   - Custom shapes

3. Drawing Layer
   - Each drawing creates new layer
   - Undo/Redo per stroke
   - Clear drawing layer

**Deliverable:** Working drawing tools with layers

---

### Phase 8: Text Tool (Week 4-5)
**Goal:** Add and edit text on canvas

Tasks:
1. Text Layer
   - Add text overlay
   - Edit text
   - Font selection (system fonts)
   - Font size
   - Color picker

2. Text Formatting
   - Bold, Italic, Underline
   - Alignment (left, center, right)
   - Line height
   - Letter spacing

3. Text Positioning
   - Drag to move
   - Resize text box
   - Rotation

**Deliverable:** Full text editing on layers

---

### Phase 9: Export System (Week 5)
**Goal:** Save edited images

Tasks:
1. Export Options
   - Format: JPG, PNG, WebP
   - Quality slider (1-100%)
   - Resolution presets
   - File size estimation

2. Export Modes
   - Export current layer
   - Export visible layers (flatten)
   - Export all layers (if format supports)
   - Export with/without background

3. Save Operations
   - Save to device gallery
   - Download (web)
   - Share functionality
   - Save project (with all layers)

**Deliverable:** Working export with all options

---

### Phase 10: Undo/Redo System (Week 5)
**Goal:** Complete undo/redo for all operations

Tasks:
1. History Manager
   - Track all operations
   - Undo any operation
   - Redo any operation
   - History limit (50 states)

2. Operations to Track
   - Layer add/delete
   - Filter application
   - Adjustments
   - Drawing strokes
   - Crop/Rotate/Flip
   - Text edits

**Deliverable:** Full undo/redo system

---

## Technical Architecture

### Layer System
```typescript
interface Layer {
  id: string;
  type: 'image' | 'adjustment' | 'text' | 'shape' | 'drawing';
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen';
  imageUri?: string;  // For image layers
  adjustments?: AdjustmentValues;  // For adjustment layers
  text?: TextData;  // For text layers
  drawing?: DrawingData;  // For drawing layers
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
}
```

### Canvas System
```typescript
interface CanvasState {
  layers: Layer[];
  selectedLayerId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  canvasSize: { width: number; height: number };
}
```

### Tool System
```typescript
type Tool =
  | 'select'
  | 'crop'
  | 'transform'
  | 'draw'
  | 'text'
  | 'shape'
  | null;

interface ToolState {
  activeTool: Tool;
  toolOptions: Record<string, any>;
}
```

---

## UI/UX Requirements

### Canvas Area
- 70-80% of screen
- Zoom: 0.1x to 5x
- Pan: Touch drag or two-finger pan
- Grid overlay (optional)
- Rulers (optional)

### Tool Panels
- Max 30-50% of screen height
- Collapsible
- Smooth animations
- Does NOT cover canvas completely

### Layer Panel
- Fixed on side or bottom
- Thumbnail preview for each layer
- Drag to reorder
- Tap to select
- Eye icon for visibility
- Opacity slider

### Toolbar
- Undo/Redo always visible
- Tool buttons (Crop, Transform, Draw, Text, etc.)
- Export button
- Settings

---

## Testing Checklist

### Phase 1
- [ ] Canvas displays image correctly
- [ ] Zoom in/out works
- [ ] Pan works
- [ ] No deprecation warnings

### Phase 2
- [ ] Can add new layer
- [ ] Can delete layer
- [ ] Can reorder layers
- [ ] Layer visibility toggles work
- [ ] Selected layer highlighted

### Phase 3
- [ ] Crop overlay appears
- [ ] Can drag crop area
- [ ] Can resize crop area
- [ ] Aspect ratios work
- [ ] Apply crop creates new layer

### Phase 4
- [ ] Rotate 90° works
- [ ] Flip H/V works
- [ ] Free rotation works
- [ ] Only selected layer affected

### Phase 5
- [ ] Filters apply correctly
- [ ] Preview shows before applying
- [ ] Can cancel filter
- [ ] Filter creates new layer

### Phase 6
- [ ] Adjustments work in real-time
- [ ] Can reset individual adjustment
- [ ] Can reset all adjustments
- [ ] Adjustment layer created

### Phase 7
- [ ] Can draw on canvas
- [ ] Brush size changes
- [ ] Color changes
- [ ] Eraser works
- [ ] Drawing creates new layer

### Phase 8
- [ ] Can add text
- [ ] Can edit text
- [ ] Can change font/size/color
- [ ] Can move text
- [ ] Text creates layer

### Phase 9
- [ ] Export works
- [ ] Format selection works
- [ ] Quality slider works
- [ ] Saves to gallery

### Phase 10
- [ ] Undo works for all operations
- [ ] Redo works
- [ ] History limit works

---

## Priority Order (If Time Limited)

**Must Have (MVP):**
1. Canvas system (Phase 1)
2. Layer system (Phase 2)
3. Crop (Phase 3)
4. Rotate/Flip (Phase 4)
5. Export (Phase 9)
6. Undo/Redo (Phase 10)

**Should Have:**
7. Filters (Phase 5)
8. Adjustments (Phase 6)

**Nice to Have:**
9. Drawing (Phase 7)
10. Text (Phase 8)

---

## Current Focus: Phase 1
Fix immediate issues and create working canvas foundation.

Next: I'll start implementing Phase 1 properly.
