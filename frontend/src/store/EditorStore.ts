/**
 * Editor Store - Layer-Based Editing System
 * 
 * CORE PRINCIPLES:
 * 1. All tools apply ONLY to selected layer
 * 2. Non-destructive editing (params stored in layer)
 * 3. Real-time preview
 * 4. Full undo/redo with state snapshots
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Simple ID generator
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// =============================================================================
// TYPES
// =============================================================================

export type LayerType = 'image' | 'adjustment' | 'draw' | 'blur' | 'crop' | 'filter' | 'text' | 'shape';

// Layer parameters
export interface AdjustmentParams {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  exposure: number;
}

export interface CropParams {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformParams {
  rotate: number;      // degrees
  scaleX: number;
  scaleY: number;
  flipX: boolean;
  flipY: boolean;
}

export interface DrawParams {
  strokes: Array<{
    id: string;
    points: string;
    color: string;
    strokeWidth: number;
    tool: string;
  }>;
}

export interface BlurParams {
  type: 'gaussian' | 'motion' | 'radial';
  intensity: number;
  radius: number;
}

// Main Layer interface
export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  enabled: boolean;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  
  // Source image for this layer (if applicable)
  sourceImage?: string;
  
  // Layer-specific params (non-destructive)
  params: {
    // Adjustments
    adjustment?: AdjustmentParams;
    // Transform (per-layer crop/rotate)
    crop?: CropParams;
    transform?: TransformParams;
    // Drawing
    draw?: DrawParams;
    // Blur
    blur?: BlurParams;
    // Text
    text?: {
      content: string;
      fontSize: number;
      fontFamily: string;
      color: string;
      x: number;
      y: number;
    };
    // Shape
    shape?: {
      shapeType: string;
      strokeColor: string;
      fillColor?: string;
      strokeWidth: number;
      points: string;
    };
    // Filter
    filter?: {
      id: string;
      name: string;
      intensity: number;
    };
  };
  
  createdAt: number;
  updatedAt: number;
}

// State snapshot for history
export interface EditorSnapshot {
  layers: Layer[];
  selectedLayerId: string | null;
  timestamp: number;
}

// Default adjustment values
export const DEFAULT_ADJUSTMENTS: AdjustmentParams = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  exposure: 0,
};

// Default transform values
export const DEFAULT_TRANSFORM: TransformParams = {
  rotate: 0,
  scaleX: 1,
  scaleY: 1,
  flipX: false,
  flipY: false,
};

// =============================================================================
// CONTEXT
// =============================================================================

export interface EditorContextValue {
  // State
  layers: Layer[];
  selectedLayerId: string | null;
  history: EditorSnapshot[];
  future: EditorSnapshot[];
  canUndo: boolean;
  canRedo: boolean;
  
  // =========== LAYER SELECTION ===========
  selectLayer: (id: string | null) => void;
  getSelectedLayer: () => Layer | null;
  isLayerSelected: () => boolean;
  
  // =========== LAYER CRUD ===========
  addLayer: (type: LayerType, name?: string, sourceImage?: string) => string;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => string | null;
  setLayerEnabled: (id: string, enabled: boolean) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  renameLayer: (id: string, name: string) => void;
  
  // =========== APPLY TO SELECTED LAYER ONLY ===========
  // These check selectedLayerId first!
  
  // Adjustments (real-time, no history during drag)
  updateSelectedLayerAdjustment: (params: Partial<AdjustmentParams>) => void;
  commitAdjustment: () => void;
  
  // Crop (per-layer)
  cropSelectedLayer: (crop: CropParams) => void;
  
  // Rotate (per-layer)
  rotateSelectedLayer: (angle: number) => void;
  
  // Flip (per-layer)
  flipSelectedLayer: (axis: 'x' | 'y') => void;
  
  // Drawing (per-layer)
  addDrawingToSelectedLayer: (stroke: DrawParams['strokes'][0]) => void;
  
  // Blur (per-layer)
  updateSelectedLayerBlur: (blur: Partial<BlurParams>) => void;
  
  // Generic update
  updateSelectedLayerParams: (params: Partial<Layer['params']>) => void;
  
  // =========== HISTORY ===========
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  
  // =========== UTILITY ===========
  getLayer: (id: string) => Layer | undefined;
  getVisibleLayers: () => Layer[];
  reset: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export const EditorProvider: React.FC<{ children: ReactNode; initialImage?: string }> = ({ 
  children, 
  initialImage 
}) => {
  // Initialize with base image layer if provided
  const [layers, setLayers] = useState<Layer[]>(() => {
    if (initialImage) {
      return [{
        id: 'base-layer',
        type: 'image',
        name: 'Background',
        enabled: true,
        opacity: 1,
        blendMode: 'normal',
        sourceImage: initialImage,
        params: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }];
    }
    return [];
  });
  
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    initialImage ? 'base-layer' : null
  );
  const [history, setHistory] = useState<EditorSnapshot[]>([]);
  const [future, setFuture] = useState<EditorSnapshot[]>([]);
  
  // ==========================================================================
  // HISTORY FUNCTIONS
  // ==========================================================================
  
  const pushHistory = useCallback(() => {
    const snapshot: EditorSnapshot = {
      layers: JSON.parse(JSON.stringify(layers)),
      selectedLayerId,
      timestamp: Date.now(),
    };
    setHistory(prev => [...prev.slice(-49), snapshot]);
    setFuture([]);
  }, [layers, selectedLayerId]);
  
  const undo = useCallback(() => {
    if (history.length === 0) return;
    
    const current: EditorSnapshot = {
      layers: JSON.parse(JSON.stringify(layers)),
      selectedLayerId,
      timestamp: Date.now(),
    };
    
    const prev = history[history.length - 1];
    setLayers(prev.layers);
    setSelectedLayerId(prev.selectedLayerId);
    setHistory(h => h.slice(0, -1));
    setFuture(f => [current, ...f]);
  }, [history, layers, selectedLayerId]);
  
  const redo = useCallback(() => {
    if (future.length === 0) return;
    
    const current: EditorSnapshot = {
      layers: JSON.parse(JSON.stringify(layers)),
      selectedLayerId,
      timestamp: Date.now(),
    };
    
    const next = future[0];
    setLayers(next.layers);
    setSelectedLayerId(next.selectedLayerId);
    setHistory(h => [...h, current]);
    setFuture(f => f.slice(1));
  }, [future, layers, selectedLayerId]);
  
  const clearHistory = useCallback(() => {
    setHistory([]);
    setFuture([]);
  }, []);
  
  // ==========================================================================
  // LAYER SELECTION
  // ==========================================================================
  
  const selectLayer = useCallback((id: string | null) => {
    setSelectedLayerId(id);
  }, []);
  
  const getSelectedLayer = useCallback((): Layer | null => {
    return layers.find(l => l.id === selectedLayerId) || null;
  }, [layers, selectedLayerId]);
  
  const isLayerSelected = useCallback((): boolean => {
    return selectedLayerId !== null && layers.some(l => l.id === selectedLayerId);
  }, [selectedLayerId, layers]);
  
  // ==========================================================================
  // LAYER CRUD
  // ==========================================================================
  
  const addLayer = useCallback((type: LayerType, name?: string, sourceImage?: string): string => {
    const id = generateId();
    const layerName = name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${layers.filter(l => l.type === type).length + 1}`;
    
    const newLayer: Layer = {
      id,
      type,
      name: layerName,
      enabled: true,
      opacity: 1,
      blendMode: 'normal',
      sourceImage,
      params: type === 'adjustment' ? { adjustment: { ...DEFAULT_ADJUSTMENTS } } : {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    pushHistory();
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(id);
    
    return id;
  }, [layers, pushHistory]);
  
  const removeLayer = useCallback((id: string) => {
    if (layers.length <= 1) return;
    
    pushHistory();
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(layers[layers.length - 2]?.id || null);
    }
  }, [layers, selectedLayerId, pushHistory]);
  
  const duplicateLayer = useCallback((id: string): string | null => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return null;
    
    const newId = generateId();
    const newLayer: Layer = {
      ...JSON.parse(JSON.stringify(layer)),
      id: newId,
      name: `${layer.name} Copy`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    pushHistory();
    const index = layers.findIndex(l => l.id === id);
    setLayers(prev => [...prev.slice(0, index + 1), newLayer, ...prev.slice(index + 1)]);
    setSelectedLayerId(newId);
    
    return newId;
  }, [layers, pushHistory]);
  
  const setLayerEnabled = useCallback((id: string, enabled: boolean) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, enabled } : l));
  }, []);
  
  const setLayerOpacity = useCallback((id: string, opacity: number) => {
    setLayers(prev => prev.map(l => 
      l.id === id ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l
    ));
  }, []);
  
  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    pushHistory();
    setLayers(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
  }, [pushHistory]);
  
  const renameLayer = useCallback((id: string, name: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l));
  }, []);
  
  // ==========================================================================
  // APPLY TO SELECTED LAYER ONLY
  // ==========================================================================
  
  // Update adjustment on selected layer (real-time, no history)
  const updateSelectedLayerAdjustment = useCallback((params: Partial<AdjustmentParams>) => {
    if (!selectedLayerId) {
      console.warn('No layer selected - cannot apply adjustment');
      return;
    }
    
    setLayers(prev => prev.map(layer => {
      if (layer.id !== selectedLayerId) return layer;
      
      return {
        ...layer,
        params: {
          ...layer.params,
          adjustment: {
            ...(layer.params.adjustment || DEFAULT_ADJUSTMENTS),
            ...params,
          },
        },
        updatedAt: Date.now(),
      };
    }));
  }, [selectedLayerId]);
  
  // Commit adjustment to history
  const commitAdjustment = useCallback(() => {
    pushHistory();
  }, [pushHistory]);
  
  // Crop selected layer
  const cropSelectedLayer = useCallback((crop: CropParams) => {
    if (!selectedLayerId) {
      console.warn('No layer selected - cannot apply crop');
      return;
    }
    
    pushHistory();
    setLayers(prev => prev.map(layer => {
      if (layer.id !== selectedLayerId) return layer;
      
      return {
        ...layer,
        params: { ...layer.params, crop },
        updatedAt: Date.now(),
      };
    }));
  }, [selectedLayerId, pushHistory]);
  
  // Rotate selected layer
  const rotateSelectedLayer = useCallback((angle: number) => {
    if (!selectedLayerId) {
      console.warn('No layer selected - cannot apply rotation');
      return;
    }
    
    pushHistory();
    setLayers(prev => prev.map(layer => {
      if (layer.id !== selectedLayerId) return layer;
      
      const currentTransform = layer.params.transform || { ...DEFAULT_TRANSFORM };
      return {
        ...layer,
        params: {
          ...layer.params,
          transform: { ...currentTransform, rotate: angle },
        },
        updatedAt: Date.now(),
      };
    }));
  }, [selectedLayerId, pushHistory]);
  
  // Flip selected layer
  const flipSelectedLayer = useCallback((axis: 'x' | 'y') => {
    if (!selectedLayerId) {
      console.warn('No layer selected - cannot apply flip');
      return;
    }
    
    pushHistory();
    setLayers(prev => prev.map(layer => {
      if (layer.id !== selectedLayerId) return layer;
      
      const currentTransform = layer.params.transform || { ...DEFAULT_TRANSFORM };
      return {
        ...layer,
        params: {
          ...layer.params,
          transform: {
            ...currentTransform,
            flipX: axis === 'x' ? !currentTransform.flipX : currentTransform.flipX,
            flipY: axis === 'y' ? !currentTransform.flipY : currentTransform.flipY,
          },
        },
        updatedAt: Date.now(),
      };
    }));
  }, [selectedLayerId, pushHistory]);
  
  // Add drawing stroke to selected layer
  const addDrawingToSelectedLayer = useCallback((stroke: DrawParams['strokes'][0]) => {
    if (!selectedLayerId) {
      console.warn('No layer selected - cannot add drawing');
      return;
    }
    
    pushHistory();
    setLayers(prev => prev.map(layer => {
      if (layer.id !== selectedLayerId) return layer;
      
      const currentDraw = layer.params.draw || { strokes: [] };
      return {
        ...layer,
        params: {
          ...layer.params,
          draw: {
            strokes: [...currentDraw.strokes, stroke],
          },
        },
        updatedAt: Date.now(),
      };
    }));
  }, [selectedLayerId, pushHistory]);
  
  // Update blur on selected layer
  const updateSelectedLayerBlur = useCallback((blur: Partial<BlurParams>) => {
    if (!selectedLayerId) {
      console.warn('No layer selected - cannot apply blur');
      return;
    }
    
    setLayers(prev => prev.map(layer => {
      if (layer.id !== selectedLayerId) return layer;
      
      const currentBlur = layer.params.blur || { type: 'gaussian', intensity: 0, radius: 0 };
      return {
        ...layer,
        params: {
          ...layer.params,
          blur: { ...currentBlur, ...blur },
        },
        updatedAt: Date.now(),
      };
    }));
  }, [selectedLayerId]);
  
  // Generic params update
  const updateSelectedLayerParams = useCallback((params: Partial<Layer['params']>) => {
    if (!selectedLayerId) {
      console.warn('No layer selected - cannot update params');
      return;
    }
    
    setLayers(prev => prev.map(layer => {
      if (layer.id !== selectedLayerId) return layer;
      
      return {
        ...layer,
        params: { ...layer.params, ...params },
        updatedAt: Date.now(),
      };
    }));
  }, [selectedLayerId]);
  
  // ==========================================================================
  // UTILITY
  // ==========================================================================
  
  const getLayer = useCallback((id: string) => layers.find(l => l.id === id), [layers]);
  const getVisibleLayers = useCallback(() => layers.filter(l => l.enabled), [layers]);
  
  const reset = useCallback(() => {
    setLayers([]);
    setSelectedLayerId(null);
    setHistory([]);
    setFuture([]);
  }, []);
  
  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================
  
  const value: EditorContextValue = {
    layers,
    selectedLayerId,
    history,
    future,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    
    selectLayer,
    getSelectedLayer,
    isLayerSelected,
    
    addLayer,
    removeLayer,
    duplicateLayer,
    setLayerEnabled,
    setLayerOpacity,
    reorderLayers,
    renameLayer,
    
    updateSelectedLayerAdjustment,
    commitAdjustment,
    cropSelectedLayer,
    rotateSelectedLayer,
    flipSelectedLayer,
    addDrawingToSelectedLayer,
    updateSelectedLayerBlur,
    updateSelectedLayerParams,
    
    pushHistory,
    undo,
    redo,
    clearHistory,
    
    getLayer,
    getVisibleLayers,
    reset,
  };
  
  return React.createElement(EditorContext.Provider, { value }, children);
};

// =============================================================================
// HOOK
// =============================================================================

export const useEditorStore = (): EditorContextValue => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorStore must be used within EditorProvider');
  }
  return context;
};

export default useEditorStore;
