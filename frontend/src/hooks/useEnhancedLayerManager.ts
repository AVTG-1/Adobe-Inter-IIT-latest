/**
 * Enhanced Layer Manager Hook - Photoshop-like Layer System
 * 
 * KEY RULES:
 * 1. Background layer is ALWAYS LOCKED (cannot move/rotate/crop)
 * 2. Imported photos become NEW MOVABLE layers
 * 3. All transforms apply ONLY to selected layer (if not locked)
 * 4. Render order: crop → rotate → scale/translate → adjustments → blend
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fitAndCenter } from '../utils/imageFit';

// Storage keys
const LAYERS_STORAGE_KEY = '@editor_layers_v3';
const SELECTED_LAYER_KEY = '@editor_selected_layer_v3';

// Layer types
export type LayerType = 
  | 'background'    // Base background - ALWAYS LOCKED
  | 'image'         // Imported image - MOVABLE
  | 'adjustment'    // Adjustment layer
  | 'filter'        // Filter effect layer
  | 'drawing'       // Drawing/annotation layer
  | 'text'          // Text layer
  | 'shape'         // Shape layer
  | 'blur'          // Blur layer
  | 'overlay';      // Imported image overlay

export type BlendMode = 
  | 'normal' | 'multiply' | 'screen' | 'overlay'
  | 'darken' | 'lighten' | 'color-dodge' | 'color-burn'
  | 'soft-light' | 'hard-light' | 'difference' | 'exclusion';

// Transform for per-layer positioning
export interface LayerTransform {
  x: number;
  y: number;
  scale: number;
  rotate: number;  // degrees
}

// Crop box for per-layer cropping
export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Layer interface
export interface EnhancedLayer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;          // 🔐 If true, cannot transform
  opacity: number;          // 0-1
  blendMode: BlendMode;
  
  // Source image
  source: string | null;    // image URI
  // Compatibility alias for other parts of the codebase that expect `imageUri`
  imageUri?: string | null;
  thumbnailUri?: string;
  
  // Per-layer transform
  transform: LayerTransform;
  
  // Per-layer crop (non-destructive)
  crop?: CropBox;
  
  // Adjustment params
  adjustments?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    exposure?: number;
    highlights?: number;
    shadows?: number;
    temperature?: number;
    tint?: number;
    vibrance?: number;
    hue?: number;
    // Curve adjustments (per-channel control points)
    curves?: {
      rgb?: Array<{ x: number; y: number }>;
      red?: Array<{ x: number; y: number }>;
      green?: Array<{ x: number; y: number }>;
      blue?: Array<{ x: number; y: number }>;
    };
  };
  
  // Filter data
  filter?: {
    id: string;
    name: string;
    intensity: number;
  };
  
  // Drawing data
  drawing?: {
    paths: any[];
    tool: string;
    color: string;
    strokeWidth: number;
  };
  
  // Text data
  text?: {
    content: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    align: 'left' | 'center' | 'right';
    bold: boolean;
    italic: boolean;
    x?: number;  // Position X
    y?: number;  // Position Y
  };
  
  // Shape data
  shape?: {
    shapeType: string;
    strokeColor: string;
    fillColor?: string;
    strokeWidth: number;
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };
  };
  
  // Blur data
  blur?: {
    type: 'gaussian' | 'motion' | 'radial';
    intensity: number;
    radius: number;
  };
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

// Layer history entry
interface LayerHistoryEntry {
  layerId: string;
  previousState: Partial<EnhancedLayer>;
  action: string;
  timestamp: number;
}

// Default transform
const DEFAULT_TRANSFORM: LayerTransform = { x: 0, y: 0, scale: 1, rotate: 0 };

// Hook return type
export interface UseEnhancedLayerManagerReturn {
  // State
  layers: EnhancedLayer[];
  selectedLayerId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  
  // ========== BACKGROUND LAYER ==========
  createBackgroundLayer: (imageUri: string) => string;
  
  // ========== IMPORT NEW PHOTO = NEW MOVABLE LAYER ==========
  importImageLayer: (imageUri: string, name?: string, canvasWidth?: number, canvasHeight?: number) => string;
  importImageLayerAsync: (imageUri: string, name?: string, canvasWidth?: number, canvasHeight?: number) => Promise<string>;
  
  // ========== LAYER CRUD ==========
  createImageLayer: (imageUri: string, name?: string) => string;
  createAdjustmentLayer: (adjustments: EnhancedLayer['adjustments'], name?: string, processedImageUri?: string) => string;
  createFilterLayer: (filterId: string, filterName: string, intensity?: number, processedImageUri?: string) => string;
  createDrawingLayer: (name?: string) => string;
  createTextLayer: (text: string, options?: Partial<EnhancedLayer['text']>) => string;
  createShapeLayer: (
    shapeType: string,
    strokeColor: string,
    fillColor?: string,
    strokeWidth?: number,
    startPoint?: { x: number; y: number },
    endPoint?: { x: number; y: number }
  ) => string;
  duplicateLayer: (layerId: string) => string | null;
  deleteLayer: (layerId: string) => boolean;
  
  // ========== LAYER SELECTION ==========
  selectLayer: (layerId: string | null) => void;
  getSelectedLayer: () => EnhancedLayer | null;
  
  // ========== CHECK IF CAN TRANSFORM ==========
  canTransformSelectedLayer: () => boolean;
  
  // ========== PER-LAYER TRANSFORM (ONLY IF NOT LOCKED) ==========
  moveLayer: (layerId: string, deltaX: number, deltaY: number) => void;
  rotateSelectedLayer: (angle: number) => void;
  cropSelectedLayer: (crop: CropBox) => void;
  scaleSelectedLayer: (scale: number) => void;
  
  // ========== LAYER PROPERTIES ==========
  updateLayer: (layerId: string, updates: Partial<EnhancedLayer>) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setLayerBlendMode: (layerId: string, blendMode: BlendMode) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  renameLayer: (layerId: string, name: string) => void;
  
  // ========== LAYER ORDERING ==========
  moveLayerUp: (layerId: string) => void;
  moveLayerDown: (layerId: string) => void;
  moveLayerToTop: (layerId: string) => void;
  moveLayerToBottom: (layerId: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  
  // ========== ADJUSTMENTS ==========
  updateAdjustments: (layerId: string, adjustments: Partial<EnhancedLayer['adjustments']>) => void;
  
  // ========== HISTORY ==========
  undo: () => void;
  redo: () => void;
  
  // ========== UTILITY ==========
  getLayer: (layerId: string) => EnhancedLayer | undefined;
  getVisibleLayers: () => EnhancedLayer[];
  getLayerCount: () => number;
  getBackgroundLayer: () => EnhancedLayer | null;
  
  // ========== EXPORT ==========
  exportFlattenedImage: () => Promise<string | null>;
  flattenAll: () => Promise<string>;
  mergeDown: (layerId: string) => Promise<void>;
  mergeVisible: () => Promise<void>;
}

let layerCounter = 0;

export function useEnhancedLayerManager(
  initialImageUrl?: string
): UseEnhancedLayerManagerReturn {
  
  // Initialize with LOCKED background layer
  const [layers, setLayers] = useState<EnhancedLayer[]>(() => {
    if (initialImageUrl) {
      return [{
        id: 'background',
        type: 'background',
        name: 'Background',
        visible: true,
        locked: false,  // ✅ UNLOCKED - allows crop/resize/rotate on main image
        opacity: 1,
        blendMode: 'normal',
        source: initialImageUrl,
        transform: { ...DEFAULT_TRANSFORM },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }];
    }
    return [];
  });
  
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    initialImageUrl ? 'background' : null
  );
  
  // Track if initial load is complete
  const initialLoadComplete = useRef(false);
  
  // History
  const historyRef = useRef<LayerHistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);
  const [historyVersion, setHistoryVersion] = useState(0);
  
  // Generate layer ID
  const generateLayerId = useCallback(() => {
    return `layer-${Date.now()}-${++layerCounter}`;
  }, []);
  
  // Load from storage on mount
  useEffect(() => {
    const loadFromStorage = async () => {
      try {
        const [storedLayers, storedSelectedId] = await Promise.all([
          AsyncStorage.getItem(LAYERS_STORAGE_KEY),
          AsyncStorage.getItem(SELECTED_LAYER_KEY),
        ]);
        
        if (storedLayers) {
          const parsedLayers: EnhancedLayer[] = JSON.parse(storedLayers);
          if (parsedLayers.length > 0) {
            setLayers(parsedLayers);
            console.log('Loaded', parsedLayers.length, 'layers from storage');
          }
        }
        
        if (storedSelectedId) {
          setSelectedLayerId(storedSelectedId);
        }
      } catch (e) {
        console.error('Failed to load layers from storage:', e);
      } finally {
        initialLoadComplete.current = true;
      }
    };
    
    if (!initialImageUrl) {
      loadFromStorage();
    } else {
      initialLoadComplete.current = true;
    }
  }, []);
  
  // Save to storage (debounced, without large image data)
  useEffect(() => {
    if (!initialLoadComplete.current) return;
    
    const saveTimeout = setTimeout(async () => {
      try {
        const layersToSave = layers.map(layer => ({
          ...layer,
          source: undefined,  // Don't save base64 images
          thumbnailUri: undefined,
        }));
        
        await Promise.all([
          AsyncStorage.setItem(LAYERS_STORAGE_KEY, JSON.stringify(layersToSave)),
          AsyncStorage.setItem(SELECTED_LAYER_KEY, selectedLayerId || ''),
        ]);
      } catch (e) {
        if (e instanceof Error && e.name === 'QuotaExceededError') {
          console.warn('Storage quota exceeded, clearing...');
          await AsyncStorage.removeItem(LAYERS_STORAGE_KEY);
          await AsyncStorage.removeItem(SELECTED_LAYER_KEY);
        } else {
          console.error('Failed to save layers:', e);
        }
      }
    }, 500);
    
    return () => clearTimeout(saveTimeout);
  }, [layers, selectedLayerId]);
  
  // Add to history
  const addToHistory = useCallback((layerId: string, previousState: Partial<EnhancedLayer>, action: string) => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push({ layerId, previousState, action, timestamp: Date.now() });
    historyIndexRef.current++;
    if (historyRef.current.length > 50) {
      historyRef.current = historyRef.current.slice(-50);
      historyIndexRef.current = historyRef.current.length - 1;
    }
    setHistoryVersion(v => v + 1);
  }, []);

  // ==========================================================================
  // 🔐 BACKGROUND LAYER (LOCKED)
  // ==========================================================================
  
  const createBackgroundLayer = useCallback((imageUri: string): string => {
    const existing = layers.find(l => l.type === 'background');
    if (existing) {
      // Update existing background
      setLayers(prev => prev.map(l => 
        l.type === 'background' 
          ? { ...l, source: imageUri, updatedAt: Date.now() }
          : l
      ));
      return existing.id;
    }
    
    const backgroundLayer: EnhancedLayer = {
      id: 'background',
      type: 'background',
      name: 'Background',
      visible: true,
      locked: false,  // ✅ UNLOCKED - allows crop/resize/rotate on main image
      opacity: 1,
      blendMode: 'normal',
      source: imageUri,
      transform: { ...DEFAULT_TRANSFORM },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setLayers(prev => [backgroundLayer, ...prev.filter(l => l.type !== 'background')]);
    return 'background';
  }, [layers]);

  // ==========================================================================
  // 🖼 IMPORT NEW PHOTO = NEW MOVABLE LAYER
  // ==========================================================================
  
  const importImageLayer = useCallback((
    imageUri: string, 
    name?: string, 
    canvasWidth?: number, 
    canvasHeight?: number
  ): string => {
    const layerId = generateLayerId();
    const layerName = name || `Image ${layers.filter(l => l.type === 'image').length + 1}`;
    
    const newLayer: EnhancedLayer = {
      id: layerId,
      type: 'image',
      name: layerName,
      visible: true,
      locked: false,  // ✅ MOVABLE
      opacity: 1,
      blendMode: 'normal',
      source: imageUri,
      // Provide `imageUri` alias for compatibility with UI components
      // that expect `imageUri` on layer objects.
      // This keeps both fields in sync.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      imageUri: imageUri,
      // Also include `rotation` to be compatible with components
      // that read `transform.rotation` instead of `transform.rotate`.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      transform: { ...DEFAULT_TRANSFORM, rotation: DEFAULT_TRANSFORM.rotate },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(layerId);  // Auto-select the new layer
    
    console.log('📷 Imported new movable image layer:', layerName);
    return layerId;
  }, [generateLayerId, layers]);
  
  // Async version that computes fit & center transform
  const importImageLayerAsync = useCallback(async (
    imageUri: string, 
    name?: string, 
    canvasWidth?: number, 
    canvasHeight?: number
  ): Promise<string> => {
    const layerId = generateLayerId();
    const layerName = name || `Image ${layers.filter(l => l.type === 'image').length + 1}`;
    
    // Default transform
    let transform = { ...DEFAULT_TRANSFORM };
    
    // If canvas dimensions provided, compute fit & center
    if (canvasWidth && canvasHeight) {
      try {
        // Get image dimensions
        const imgDims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          Image.getSize(
            imageUri,
            (width, height) => resolve({ width, height }),
            (error) => reject(error)
          );
        });
        
        // Compute fit & center
        const fit = fitAndCenter(imgDims.width, imgDims.height, canvasWidth, canvasHeight);
        transform = {
          x: fit.x,
          y: fit.y,
          scale: fit.scale,
          rotate: 0,
        };
        
        console.log('📐 Computed fit:', fit);
      } catch (e) {
        console.warn('Could not compute image fit:', e);
      }
    }
    
    const newLayer: EnhancedLayer = {
      id: layerId,
      type: 'image',
      name: layerName,
      visible: true,
      locked: false,  // ✅ MOVABLE
      opacity: 1,
      blendMode: 'normal',
      source: imageUri,
      // Also set `imageUri` for compatibility
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      imageUri: imageUri,
      // Ensure both `rotate` and `rotation` exist on the transform so
      // downstream consumers (some expect `rotation`) pick up changes.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      transform: { ...transform, rotation: transform.rotate },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(layerId);  // Auto-select the new layer
    
    console.log('📷 Imported new movable image layer:', layerName);
    return layerId;
  }, [generateLayerId, layers]);

  // ==========================================================================
  // LAYER CRUD
  // ==========================================================================
  
  const createImageLayer = useCallback((imageUri: string, name?: string): string => {
    return importImageLayer(imageUri, name);
  }, [importImageLayer]);
  
  const createAdjustmentLayer = useCallback((
    adjustments: EnhancedLayer['adjustments'],
    name?: string,
    processedImageUri?: string
  ): string => {
    const layerId = generateLayerId();
    const layerName = name || `Adjustment ${layers.filter(l => l.type === 'adjustment').length + 1}`;
    
    const newLayer: EnhancedLayer = {
      id: layerId,
      type: 'adjustment',
      name: layerName,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      source: processedImageUri || null,
      adjustments,
      transform: { ...DEFAULT_TRANSFORM },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(layerId);
    return layerId;
  }, [generateLayerId, layers]);
  
  const createFilterLayer = useCallback((
    filterId: string,
    filterName: string,
    intensity: number = 100,
    processedImageUri?: string
  ): string => {
    const layerId = generateLayerId();
    
    const newLayer: EnhancedLayer = {
      id: layerId,
      type: 'filter',
      name: filterName,
      visible: true,
      locked: false,
      opacity: intensity / 100,
      blendMode: 'normal',
      source: processedImageUri || null,
      filter: { id: filterId, name: filterName, intensity },
      transform: { ...DEFAULT_TRANSFORM },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(layerId);
    return layerId;
  }, [generateLayerId]);
  
  const createDrawingLayer = useCallback((name?: string): string => {
    const layerId = generateLayerId();
    const layerName = name || `Drawing ${layers.filter(l => l.type === 'drawing').length + 1}`;
    
    const newLayer: EnhancedLayer = {
      id: layerId,
      type: 'drawing',
      name: layerName,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      source: null,
      drawing: { paths: [], tool: 'pen', color: '#FF0000', strokeWidth: 5 },
      transform: { ...DEFAULT_TRANSFORM },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(layerId);
    return layerId;
  }, [generateLayerId, layers]);
  
  const createTextLayer = useCallback((text: string, options?: Partial<EnhancedLayer['text']>): string => {
    const layerId = generateLayerId();
    
    const newLayer: EnhancedLayer = {
      id: layerId,
      type: 'text',
      name: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      source: null,
      text: {
        content: text,
        fontSize: 24,
        fontFamily: 'System',
        color: '#FFFFFF',
        align: 'center',
        bold: false,
        italic: false,
        ...options,
      },
      transform: { ...DEFAULT_TRANSFORM },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(layerId);
    return layerId;
  }, [generateLayerId]);

  const createShapeLayer = useCallback((
    shapeType: string,
    strokeColor: string,
    fillColor?: string,
    strokeWidth: number = 3,
    startPoint: { x: number; y: number } = { x: 0, y: 0 },
    endPoint: { x: number; y: number } = { x: 100, y: 100 }
  ): string => {
    const layerId = generateLayerId();
    
    const newLayer: EnhancedLayer = {
      id: layerId,
      type: 'shape',
      name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      source: null,
      shape: { shapeType, strokeColor, fillColor, strokeWidth, startPoint, endPoint },
      transform: { ...DEFAULT_TRANSFORM },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(layerId);
    return layerId;
  }, [generateLayerId]);
  
  const duplicateLayer = useCallback((layerId: string): string | null => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type === 'background') return null;  // Can't duplicate background
    
    const newLayerId = generateLayerId();
    const newLayer: EnhancedLayer = {
      ...JSON.parse(JSON.stringify(layer)),
      id: newLayerId,
      name: `${layer.name} Copy`,
      locked: false,  // Duplicate is always unlocked
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const index = layers.findIndex(l => l.id === layerId);
    setLayers(prev => [...prev.slice(0, index + 1), newLayer, ...prev.slice(index + 1)]);
    setSelectedLayerId(newLayerId);
    
    return newLayerId;
  }, [layers, generateLayerId]);
  
  const deleteLayer = useCallback((layerId: string): boolean => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type === 'background') return false;  // Can't delete background
    
    addToHistory(layerId, layer, 'delete');
    setLayers(prev => prev.filter(l => l.id !== layerId));
    
    if (selectedLayerId === layerId) {
      const remaining = layers.filter(l => l.id !== layerId);
      setSelectedLayerId(remaining[remaining.length - 1]?.id || null);
    }
    
    return true;
  }, [layers, selectedLayerId, addToHistory]);

  // ==========================================================================
  // LAYER SELECTION
  // ==========================================================================
  
  const selectLayer = useCallback((layerId: string | null) => {
    setSelectedLayerId(layerId);
  }, []);
  
  const getSelectedLayer = useCallback((): EnhancedLayer | null => {
    if (!selectedLayerId) return null;
    return layers.find(l => l.id === selectedLayerId) || null;
  }, [layers, selectedLayerId]);
  
  // ✅ Check if selected layer can be transformed
  const canTransformSelectedLayer = useCallback((): boolean => {
    const layer = layers.find(l => l.id === selectedLayerId);
    return layer !== undefined && !layer.locked;
  }, [layers, selectedLayerId]);

  // ==========================================================================
  // 🔄 PER-LAYER TRANSFORMS (ONLY IF NOT LOCKED)
  // ==========================================================================
  
  // Move layer (respects locked)
  const moveLayer = useCallback((layerId: string, deltaX: number, deltaY: number) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.locked) {
      console.warn('🚫 Cannot move locked layer:', layer?.name);
      return;
    }
    
    setLayers(prev => prev.map(l => 
      l.id === layerId 
        ? {
            ...l,
            transform: {
              ...l.transform,
              x: l.transform.x + deltaX,
              y: l.transform.y + deltaY,
            },
            updatedAt: Date.now(),
          }
        : l
    ));
  }, [layers]);
  
  // Rotate SELECTED layer
  const rotateSelectedLayer = useCallback((angle: number) => {
    if (!selectedLayerId) {
      console.warn('No layer selected');
      return;
    }
    
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer || layer.locked) {
      console.warn('🚫 Cannot rotate locked layer:', layer?.name);
      return;
    }
    
    addToHistory(selectedLayerId, { transform: { ...layer.transform } }, 'rotate');

    // Update both `rotate` and `rotation` to be robust to consumers
    // that use either naming convention.
    setLayers(prev => prev.map(l => 
      l.id === selectedLayerId 
        ? {
            ...l,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            transform: { ...l.transform, rotate: angle, rotation: angle },
            updatedAt: Date.now(),
          }
        : l
    ));

    console.log('🔄 Rotated layer:', layer.name, 'to', angle, 'degrees', 'prevTransform:', layer.transform);
  }, [selectedLayerId, layers, addToHistory]);
  
  // Crop SELECTED layer
  const cropSelectedLayer = useCallback((crop: CropBox) => {
    if (!selectedLayerId) {
      console.warn('No layer selected');
      return;
    }
    
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer || layer.locked) {
      console.warn('🚫 Cannot crop locked layer:', layer?.name);
      return;
    }
    
    addToHistory(selectedLayerId, { crop: layer.crop }, 'crop');
    
    setLayers(prev => prev.map(l => 
      l.id === selectedLayerId 
        ? { ...l, crop, updatedAt: Date.now() }
        : l
    ));
    
    console.log('✂️ Cropped layer:', layer.name);
  }, [selectedLayerId, layers, addToHistory]);
  
  // Scale SELECTED layer
  const scaleSelectedLayer = useCallback((scale: number) => {
    if (!selectedLayerId) return;
    
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer || layer.locked) {
      console.warn('🚫 Cannot scale locked layer:', layer?.name);
      return;
    }
    
    setLayers(prev => prev.map(l => 
      l.id === selectedLayerId 
        ? {
            ...l,
            transform: { ...l.transform, scale },
            updatedAt: Date.now(),
          }
        : l
    ));
  }, [selectedLayerId, layers]);

  // ==========================================================================
  // LAYER PROPERTIES
  // ==========================================================================
  
  const updateLayer = useCallback((layerId: string, updates: Partial<EnhancedLayer>) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      addToHistory(layerId, { ...layer }, 'update');
    }
    
    setLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, ...updates, updatedAt: Date.now() } : l
    ));
  }, [layers, addToHistory]);
  
  const setLayerOpacity = useCallback((layerId: string, opacity: number) => {
    updateLayer(layerId, { opacity: Math.max(0, Math.min(1, opacity)) });
  }, [updateLayer]);
  
  const setLayerBlendMode = useCallback((layerId: string, blendMode: BlendMode) => {
    updateLayer(layerId, { blendMode });
  }, [updateLayer]);
  
  const toggleLayerVisibility = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      updateLayer(layerId, { visible: !layer.visible });
    }
  }, [layers, updateLayer]);
  
  const toggleLayerLock = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    // Background cannot be unlocked
    if (layer && layer.type !== 'background') {
      updateLayer(layerId, { locked: !layer.locked });
    }
  }, [layers, updateLayer]);
  
  const renameLayer = useCallback((layerId: string, name: string) => {
    updateLayer(layerId, { name });
  }, [updateLayer]);

  // ==========================================================================
  // LAYER ORDERING
  // ==========================================================================
  
  const moveLayerUp = useCallback((layerId: string) => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === layerId);
      if (index === -1 || index === prev.length - 1) return prev;
      
      const newLayers = [...prev];
      [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
      return newLayers;
    });
  }, []);
  
  const moveLayerDown = useCallback((layerId: string) => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === layerId);
      // Can't move below background
      if (index <= 1) return prev;
      
      const newLayers = [...prev];
      [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
      return newLayers;
    });
  }, []);
  
  const moveLayerToTop = useCallback((layerId: string) => {
    setLayers(prev => {
      const layer = prev.find(l => l.id === layerId);
      if (!layer || layer.type === 'background') return prev;
      return [...prev.filter(l => l.id !== layerId), layer];
    });
  }, []);
  
  const moveLayerToBottom = useCallback((layerId: string) => {
    setLayers(prev => {
      const layer = prev.find(l => l.id === layerId);
      if (!layer || layer.type === 'background') return prev;
      // Put above background
      const bg = prev.find(l => l.type === 'background');
      const others = prev.filter(l => l.id !== layerId && l.type !== 'background');
      return bg ? [bg, layer, ...others] : [layer, ...others];
    });
  }, []);
  
  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    setLayers(prev => {
      const newLayers = [...prev];
      const [moved] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, moved);
      return newLayers;
    });
  }, []);

  // ==========================================================================
  // ADJUSTMENTS
  // ==========================================================================
  
  const updateAdjustments = useCallback((layerId: string, adjustments: Partial<EnhancedLayer['adjustments']>) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      updateLayer(layerId, {
        adjustments: { ...layer.adjustments, ...adjustments },
      });
    }
  }, [layers, updateLayer]);

  // ==========================================================================
  // HISTORY
  // ==========================================================================
  
  const undo = useCallback(() => {
    if (historyIndexRef.current < 0) return;
    
    const entry = historyRef.current[historyIndexRef.current];
    if (entry) {
      setLayers(prev => prev.map(l =>
        l.id === entry.layerId ? { ...l, ...entry.previousState } : l
      ));
      historyIndexRef.current--;
      setHistoryVersion(v => v + 1);
    }
  }, []);
  
  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    setHistoryVersion(v => v + 1);
  }, []);

  // ==========================================================================
  // UTILITY
  // ==========================================================================
  
  const getLayer = useCallback((layerId: string): EnhancedLayer | undefined => {
    return layers.find(l => l.id === layerId);
  }, [layers]);
  
  const getVisibleLayers = useCallback((): EnhancedLayer[] => {
    return layers.filter(l => l.visible);
  }, [layers]);
  
  const getLayerCount = useCallback((): number => {
    return layers.length;
  }, [layers]);
  
  const getBackgroundLayer = useCallback((): EnhancedLayer | null => {
    return layers.find(l => l.type === 'background') || null;
  }, [layers]);
  
  const exportFlattenedImage = useCallback(async (): Promise<string | null> => {
    const baseLayer = layers.find(l => l.type === 'background' || l.type === 'image');
    return baseLayer?.source || null;
  }, [layers]);
  
  const flattenAll = useCallback(async (): Promise<string> => {
    const baseLayer = layers.find(l => l.type === 'background');
    return baseLayer?.source || '';
  }, [layers]);
  
  const mergeDown = useCallback(async (layerId: string) => {
    console.log('Merge down:', layerId);
  }, []);
  
  const mergeVisible = useCallback(async () => {
    console.log('Merge visible layers');
  }, []);
  
  // Clear all layers and storage (call when leaving editor)
  const clearAllLayers = useCallback(async () => {
    setLayers([]);
    setSelectedLayerId(null);
    historyRef.current = [];
    historyIndexRef.current = -1;
    
    try {
      await AsyncStorage.multiRemove([
        LAYERS_STORAGE_KEY,
        '@editor_layers',
        '@editor_selected_layer',
      ]);
      console.log('✅ All layers cleared');
    } catch (error) {
      console.error('Failed to clear layers storage:', error);
    }
  }, []);

  // ==========================================================================
  // RETURN
  // ==========================================================================
  
  return {
    layers,
    selectedLayerId,
    canUndo: historyIndexRef.current >= 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,
    
    // Background
    createBackgroundLayer,
    
    // Import (NEW MOVABLE LAYER)
    importImageLayer,
    importImageLayerAsync,
    
    // CRUD
    createImageLayer,
    createAdjustmentLayer,
    createFilterLayer,
    createDrawingLayer,
    createTextLayer,
    createShapeLayer,
    duplicateLayer,
    deleteLayer,
    
    // Selection
    selectLayer,
    getSelectedLayer,
    canTransformSelectedLayer,
    
    // Transform (per-layer)
    moveLayer,
    rotateSelectedLayer,
    cropSelectedLayer,
    scaleSelectedLayer,
    
    // Properties
    updateLayer,
    setLayerOpacity,
    setLayerBlendMode,
    toggleLayerVisibility,
    toggleLayerLock,
    renameLayer,
    
    // Ordering
    moveLayerUp,
    moveLayerDown,
    moveLayerToTop,
    moveLayerToBottom,
    reorderLayers,
    
    // Adjustments
    updateAdjustments,
    
    // History
    undo,
    redo,
    
    // Utility
    getLayer,
    getVisibleLayers,
    getLayerCount,
    getBackgroundLayer,
    
    // Export
    exportFlattenedImage,
    flattenAll,
    
    // Cleanup
    clearAllLayers,
    mergeDown,
    mergeVisible,
  };
}
