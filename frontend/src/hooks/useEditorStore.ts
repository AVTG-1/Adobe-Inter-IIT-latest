/**
 * useEditorStore - React Hook for EditorStore
 * Provides reactive state management for the photo editor
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import editorStore, { 
  EditorState, 
  Layer, 
  BrushSettings, 
  BrushPath,
  AdjustmentParams,
  Transform,
} from '../store/EditorStore';

export interface UseEditorStoreReturn {
  // State
  layers: Layer[];
  selectedLayerId: string | null;
  selectedLayer: Layer | undefined;
  canUndo: boolean;
  canRedo: boolean;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  brushSettings: BrushSettings;

  // Layer Actions
  addImageLayer: (imageUri: string, name?: string) => Layer;
  addDrawingLayer: (name?: string) => Layer;
  addEmptyLayer: (name?: string) => Layer;
  addAdjustmentLayer: (adjustments: Partial<AdjustmentParams>, name?: string) => Layer;
  deleteLayer: (id: string) => boolean;
  duplicateLayer: (id: string) => Layer | null;
  selectLayer: (id: string | null) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  renameLayer: (id: string, name: string) => void;
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  fillLayer: (id: string, color: string) => void;

  // Transform Actions (Layer-specific)
  updateTransform: (id: string, transform: Partial<Transform>) => void;
  rotateLayer: (id: string, angle: number, snap?: boolean) => void;
  resetRotation: (id: string) => void;
  flipHorizontal: (id: string) => void;
  flipVertical: (id: string) => void;
  scaleLayer: (id: string, scale: number) => void;
  moveLayer: (id: string, x: number, y: number) => void;
  cropLayer: (id: string, cropData: { x: number; y: number; width: number; height: number }) => void;
  updateLayerImage: (id: string, imageUri: string) => void;

  // Drawing Actions
  addPathToLayer: (id: string, path: BrushPath) => void;
  addPathsToLayer: (id: string, paths: BrushPath[]) => void;
  removeLastPath: (id: string) => void;
  clearDrawingLayer: (id: string) => void;
  getOrCreateDrawingLayer: () => Layer;

  // Adjustment Actions
  applyAdjustments: (id: string, adjustments: Partial<AdjustmentParams>) => void;

  // Brush Settings
  setBrushSettings: (settings: Partial<BrushSettings>) => void;

  // History Actions
  undo: () => boolean;
  redo: () => boolean;

  // Canvas Actions
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;

  // Initialization
  initWithImage: (imageUri: string, width?: number, height?: number) => Promise<void>;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  reset: () => Promise<void>;
}

export function useEditorStore(): UseEditorStoreReturn {
  const [state, setState] = useState<EditorState>(editorStore.getState());
  const [brushSettings, setBrushSettingsState] = useState<BrushSettings>(editorStore.getBrushSettings());

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = editorStore.subscribe((newState) => {
      setState(newState);
    });

    // Load from storage on mount
    editorStore.loadFromStorage();

    return unsubscribe;
  }, []);

  // Memoized values
  const selectedLayer = useMemo(() => 
    state.selectedLayerId ? state.layers.find(l => l.id === state.selectedLayerId) : undefined,
    [state.layers, state.selectedLayerId]
  );

  // Layer Actions
  const addImageLayer = useCallback((imageUri: string, name?: string) => 
    editorStore.addImageLayer(imageUri, name), []);

  const addDrawingLayer = useCallback((name?: string) => 
    editorStore.addDrawingLayer(name), []);

  const addEmptyLayer = useCallback((name?: string) => 
    editorStore.addEmptyLayer(name), []);

  const addAdjustmentLayer = useCallback((adjustments: Partial<AdjustmentParams>, name?: string) => 
    editorStore.addAdjustmentLayer(adjustments, name), []);

  const deleteLayer = useCallback((id: string) => 
    editorStore.deleteLayer(id), []);

  const duplicateLayer = useCallback((id: string) => 
    editorStore.duplicateLayer(id), []);

  const selectLayer = useCallback((id: string | null) => 
    editorStore.selectLayer(id), []);

  const toggleVisibility = useCallback((id: string) => 
    editorStore.toggleVisibility(id), []);

  const toggleLock = useCallback((id: string) => 
    editorStore.toggleLock(id), []);

  const setLayerOpacity = useCallback((id: string, opacity: number) => 
    editorStore.setLayerOpacity(id, opacity), []);

  const renameLayer = useCallback((id: string, name: string) => 
    editorStore.renameLayer(id, name), []);

  const moveLayerUp = useCallback((id: string) => 
    editorStore.moveLayerUp(id), []);

  const moveLayerDown = useCallback((id: string) => 
    editorStore.moveLayerDown(id), []);

  const fillLayer = useCallback((id: string, color: string) => 
    editorStore.fillLayer(id, color), []);

  // Transform Actions
  const updateTransform = useCallback((id: string, transform: Partial<Transform>) => 
    editorStore.updateTransform(id, transform), []);

  const rotateLayer = useCallback((id: string, angle: number, snap?: boolean) => 
    editorStore.rotateLayer(id, angle, snap), []);

  const resetRotation = useCallback((id: string) => 
    editorStore.resetRotation(id), []);

  const flipHorizontal = useCallback((id: string) => 
    editorStore.flipHorizontal(id), []);

  const flipVertical = useCallback((id: string) => 
    editorStore.flipVertical(id), []);

  const scaleLayer = useCallback((id: string, scale: number) => 
    editorStore.scaleLayer(id, scale), []);

  const moveLayer = useCallback((id: string, x: number, y: number) => 
    editorStore.moveLayer(id, x, y), []);

  const cropLayer = useCallback((id: string, cropData: { x: number; y: number; width: number; height: number }) => 
    editorStore.cropLayer(id, cropData), []);

  const updateLayerImage = useCallback((id: string, imageUri: string) => 
    editorStore.updateLayerImage(id, imageUri), []);

  // Drawing Actions
  const addPathToLayer = useCallback((id: string, path: BrushPath) => 
    editorStore.addPathToLayer(id, path), []);

  const addPathsToLayer = useCallback((id: string, paths: BrushPath[]) => 
    editorStore.addPathsToLayer(id, paths), []);

  const removeLastPath = useCallback((id: string) => 
    editorStore.removeLastPath(id), []);

  const clearDrawingLayer = useCallback((id: string) => 
    editorStore.clearDrawingLayer(id), []);

  const getOrCreateDrawingLayer = useCallback(() => 
    editorStore.getOrCreateDrawingLayer(), []);

  // Adjustment Actions
  const applyAdjustments = useCallback((id: string, adjustments: Partial<AdjustmentParams>) => 
    editorStore.applyAdjustments(id, adjustments), []);

  // Brush Settings
  const setBrushSettings = useCallback((settings: Partial<BrushSettings>) => {
    editorStore.setBrushSettings(settings);
    setBrushSettingsState(editorStore.getBrushSettings());
  }, []);

  // History Actions
  const undo = useCallback(() => editorStore.undo(), []);
  const redo = useCallback(() => editorStore.redo(), []);

  // Canvas Actions
  const setZoom = useCallback((zoom: number) => editorStore.setZoom(zoom), []);
  const setPan = useCallback((x: number, y: number) => editorStore.setPan(x, y), []);

  // Initialization
  const initWithImage = useCallback(async (imageUri: string, width?: number, height?: number) => 
    editorStore.initWithImage(imageUri, width, height), []);

  const loadFromStorage = useCallback(async () => editorStore.loadFromStorage(), []);
  const saveToStorage = useCallback(async () => editorStore.saveToStorage(), []);
  const reset = useCallback(async () => editorStore.reset(), []);

  return {
    // State
    layers: state.layers,
    selectedLayerId: state.selectedLayerId,
    selectedLayer,
    canUndo: editorStore.canUndo(),
    canRedo: editorStore.canRedo(),
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    zoom: state.zoom,
    brushSettings,

    // Layer Actions
    addImageLayer,
    addDrawingLayer,
    addEmptyLayer,
    addAdjustmentLayer,
    deleteLayer,
    duplicateLayer,
    selectLayer,
    toggleVisibility,
    toggleLock,
    setLayerOpacity,
    renameLayer,
    moveLayerUp,
    moveLayerDown,
    fillLayer,

    // Transform Actions
    updateTransform,
    rotateLayer,
    resetRotation,
    flipHorizontal,
    flipVertical,
    scaleLayer,
    moveLayer,
    cropLayer,
    updateLayerImage,

    // Drawing Actions
    addPathToLayer,
    addPathsToLayer,
    removeLastPath,
    clearDrawingLayer,
    getOrCreateDrawingLayer,

    // Adjustment Actions
    applyAdjustments,

    // Brush Settings
    setBrushSettings,

    // History Actions
    undo,
    redo,

    // Canvas Actions
    setZoom,
    setPan,

    // Initialization
    initWithImage,
    loadFromStorage,
    saveToStorage,
    reset,
  };
}

export default useEditorStore;

