# Editor Redesign Implementation Plan

## Overview
Complete redesign of the image editor to support local-only processing with proper canvas handling, 20% bottom panel, and all features working.

## Architecture Changes

### 1. Local Image Processing
- **Remove**: Cloud storage dependencies for core editing
- **Add**: Local canvas-based image processing
- **Libraries**: Use Expo ImageManipulator for local editing
- **Storage**: Use base64 URIs and local file system only

### 2. Canvas Implementation
```typescript
interface CanvasState {
  imageUri: string;              // Current image URI (local)
  originalUri: string;           // Original image URI (for reset)
  dimensions: { width: number; height: number };
  aspectRatio: number;
  zoom: number;                  // 0.5 to 3.0
  pan: { x: number; y: number }; // Pan offset
  rotation: number;              // 0, 90, 180, 270
}
```

### 3. Bottom Panel Structure (20% Height)
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│           CANVAS AREA (80%)             │
│         (Auto-sized image)              │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│     HORIZONTAL SCROLLABLE FEATURES      │
│  [Crop] [Rotate] [Filters] [Adjust]... │
│            (20% Height)                 │
└─────────────────────────────────────────┘
```

### 4. Feature Organization

#### Bottom Panel Features (Horizontal Scroll):
1. **Crop** - Aspect ratio selection, free crop
2. **Rotate** - 90°, 180°, 270°, Flip H/V
3. **Filters** - 50+ filters (local processing)
4. **Adjust** - Brightness, contrast, saturation, etc.
5. **Draw** - Brush, shapes, colors
6. **Text** - Add text overlays
7. **Stickers** - Emojis, shapes, icons
8. **Effects** - Blur, sharpen, vignette
9. **Layers** - Layer management
10. **Export** - Save to device

#### Top Toolbar (Fixed):
- Back button (with unsaved warning)
- Undo button
- Redo button
- Compare (before/after)
- Zoom controls (+/-)
- Fit to screen
- Reset to original

## Implementation Steps

### Step 1: Create Image Processing Utilities
**File**: `src/utils/imageProcessing.ts`

Functions needed:
- `applyFilter(imageUri, filterType)` - Apply filter locally
- `adjustImage(imageUri, adjustments)` - Brightness, contrast, etc.
- `cropImage(imageUri, cropArea)` - Crop to selection
- `rotateImage(imageUri, degrees)` - Rotate image
- `flipImage(imageUri, direction)` - Flip horizontal/vertical
- `resizeImage(imageUri, dimensions)` - Resize image
- `mergeLayersToUri(layers)` - Combine all layers

### Step 2: Create Undo/Redo System
**File**: `src/utils/historyManager.ts`

```typescript
class HistoryManager {
  private history: string[] = [];      // Image URIs
  private currentIndex: number = -1;
  private maxHistory: number = 50;

  addState(imageUri: string): void
  undo(): string | null
  redo(): string | null
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
}
```

### Step 3: Redesign EditorScreen
**File**: `src/screens/EditorScreen.tsx`

Key changes:
- Remove cloud storage dependencies
- Add canvas with proper aspect ratio handling
- Implement zoom/pan with gestures
- Create 20% bottom panel with horizontal scroll
- Wire up all feature buttons to actual implementations
- Add undo/redo UI
- Implement local export

### Step 4: Update HomeScreen
**File**: `src/screens/HomeScreen.tsx`

Changes:
- Remove cloud upload for image selection
- Pass local image URI directly to editor
- Use Expo ImagePicker result URI as-is

### Step 5: Implement Working Filters
**File**: `src/components/FiltersPanel.tsx`

Add real filter implementations using:
- Expo ImageManipulator
- Canvas API (via react-native-canvas)
- Or expo-gl for advanced filters

Filters to implement:
- Grayscale, Sepia, Invert
- Brightness, Contrast adjustments as filters
- Blur (Gaussian)
- Sharpen
- Vintage, Retro effects

### Step 6: Implement Working Adjustments
**File**: `src/components/EnhancedAdjustmentPanel.tsx`

Real-time adjustments:
- Brightness (-100 to +100)
- Contrast (-100 to +100)
- Saturation (-100 to +100)
- Exposure, Vibrance, Temperature
- Highlights, Shadows
- Sharpness, Grain

Use Expo ImageManipulator or custom canvas processing.

### Step 7: Implement Crop Tool
**New File**: `src/components/CropTool.tsx`

Features:
- Free crop
- Aspect ratio presets (1:1, 4:3, 16:9, etc.)
- Draggable crop area
- Apply/Cancel buttons

### Step 8: Implement Rotate/Flip Tool
**New File**: `src/components/RotateFlipTool.tsx`

Features:
- Rotate 90° CW/CCW
- Rotate 180°
- Flip Horizontal
- Flip Vertical
- Apply/Cancel

### Step 9: Implement Text Tool
**New File**: `src/components/TextTool.tsx`

Features:
- Add text overlay
- Font selection
- Color picker
- Size adjustment
- Position/drag text
- Multiple text layers

### Step 10: Implement Sticker Tool
**New File**: `src/components/StickerTool.tsx`

Features:
- Emoji picker
- Shape library
- Icon library
- Drag and position
- Resize/rotate stickers

### Step 11: Update Layers System
**File**: `src/components/LayersModal.tsx`

Features:
- List all layers (image, text, stickers, overlays)
- Toggle visibility
- Reorder layers (drag and drop)
- Delete layers
- Opacity per layer
- Merge layers

### Step 12: Implement Local Export
**File**: `src/components/ExportSheet.tsx`

Features:
- Export formats: JPG, PNG, WebP
- Quality selection (1-100%)
- Resolution presets
- Save to device media library
- Share functionality
- No cloud upload

## Required Dependencies

Add to `package.json`:
```json
{
  "expo-image-manipulator": "~12.0.5",
  "expo-file-system": "~17.0.1",
  "expo-media-library": "~16.0.3",
  "react-native-view-shot": "^4.0.0-alpha.3",
  "@shopify/react-native-skia": "^1.0.0"  // For advanced canvas
}
```

## UI/UX Specifications

### Canvas Area (80% height)
- Background: `#1a1a1a` (dark grey)
- Image: Centered, auto-fit with aspect ratio preserved
- Max zoom: 3x
- Min zoom: 0.5x (to fit entire image)
- Pinch to zoom enabled
- Double tap to fit
- Pan enabled when zoomed

### Bottom Panel (20% height)
- Background: `#2a2a2a` (slightly lighter grey)
- Height: Exactly 20% of screen height
- Horizontal ScrollView with features
- Each feature: Icon (32px) + Label (12px)
- Feature width: 70px
- Spacing: 10px between features
- Active feature: Blue highlight (#007AFF)

### Top Toolbar
- Background: `#000000` with 95% opacity
- Height: 60px (including safe area)
- Buttons: 44x44pt touch targets
- Icons: 24px, white color
- Back button: Left side
- Undo/Redo: Next to back
- Zoom controls: Right side
- Compare: Middle

## Performance Considerations

1. **Image Loading**: Use progressive loading, show placeholder
2. **Filter Preview**: Generate small thumbnail for real-time preview
3. **History Management**: Limit to 50 states, cleanup old URIs
4. **Memory**: Cleanup temp files after export
5. **Rendering**: Use `shouldComponentUpdate` to prevent unnecessary re-renders

## Testing Checklist

- [ ] Image loads correctly with proper aspect ratio
- [ ] Canvas auto-resizes for portrait/landscape images
- [ ] Bottom panel stays at 20% height
- [ ] All features in bottom panel are accessible via horizontal scroll
- [ ] Zoom in/out works smoothly
- [ ] Pan works when zoomed in
- [ ] Filters apply correctly and show preview
- [ ] Adjustments work in real-time
- [ ] Crop tool allows free and aspect ratio crops
- [ ] Rotate/flip work correctly
- [ ] Text can be added and positioned
- [ ] Stickers can be added and positioned
- [ ] Layers panel shows all layers
- [ ] Undo/redo work for all operations
- [ ] Export saves to device successfully
- [ ] No cloud uploads occur for core editing
- [ ] All buttons are functional (no placeholders)

## Migration Notes

### Breaking Changes:
- `imageUrl` parameter now expects local URI, not cloud URL
- `uploadImageToGCS` removed from HomeScreen import flow
- Backend API calls removed from core editing (optional for AI features)

### Backward Compatibility:
- Keep AI features using backend API (optional enhancement)
- Maintain same navigation structure
- Keep existing project structure for gradual migration

## File Structure After Implementation

```
frontend/src/
├── utils/
│   ├── imageProcessing.ts       # NEW - Local image processing
│   ├── historyManager.ts        # NEW - Undo/redo system
│   └── canvas.ts                # NEW - Canvas utilities
├── components/
│   ├── CropTool.tsx             # NEW - Crop functionality
│   ├── RotateFlipTool.tsx       # NEW - Rotate/flip
│   ├── TextTool.tsx             # NEW - Text overlay
│   ├── StickerTool.tsx          # NEW - Stickers
│   ├── FiltersPanel.tsx         # UPDATED - Working filters
│   ├── EnhancedAdjustmentPanel.tsx  # UPDATED - Working adjustments
│   ├── DrawingToolsPanel.tsx    # UPDATED - Working drawing
│   ├── LayersModal.tsx          # UPDATED - Better layer management
│   └── ExportSheet.tsx          # UPDATED - Local export only
├── screens/
│   ├── EditorScreen.tsx         # MAJOR UPDATE - New architecture
│   └── HomeScreen.tsx           # UPDATED - Local image handling
└── services/
    ├── storage.ts               # UPDATED - Local storage only
    └── projects.ts              # UPDATED - Local project storage
```

## Timeline

- **Phase 1** (Day 1-2): Core utilities + Undo/Redo
- **Phase 2** (Day 3-4): EditorScreen redesign + Canvas
- **Phase 3** (Day 5-6): Working Filters + Adjustments
- **Phase 4** (Day 7-8): Crop, Rotate, Text, Stickers
- **Phase 5** (Day 9-10): Layers + Export + Testing

## Success Criteria

✅ All features work with local processing only
✅ No cloud uploads for core editing
✅ Canvas auto-resizes based on image
✅ Bottom panel exactly 20% height
✅ All buttons functional (no placeholders)
✅ Undo/redo works globally
✅ Export saves to device
✅ Smooth performance (60 FPS)
✅ Professional UI/UX matching requirements
