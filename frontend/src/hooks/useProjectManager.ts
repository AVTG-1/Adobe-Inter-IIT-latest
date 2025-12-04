/**
 * Project Manager Hook
 * 
 * Handles project creation, loading, saving with undo/redo
 * 
 * KEY RULES:
 * 1. New project ONLY from HomeScreen import
 * 2. EditorScreen imports → add new layer to existing project
 * 3. Every change pushes to undo stack
 * 4. Auto-save after every change
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Layer types
export type LayerType = 'background' | 'image' | 'adjustment' | 'drawing' | 'text' | 'shape' | 'filter';

// Layer transform
export interface LayerTransform {
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

// Crop box
export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Layer interface
export interface ProjectLayer {
  id: string;
  type: LayerType;
  name: string;
  source: string | null;
  locked: boolean;
  visible: boolean;
  opacity: number;
  transform: LayerTransform;
  crop: CropBox | null;
  adjustments?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    hue?: number;
    exposure?: number;
  };
  // Drawing, text, shape data...
  data?: any;
}

// Project interface
export interface Project {
  id: string;
  createdAt: number;
  updatedAt: number;
  layers: ProjectLayer[];
  selectedLayerId: string | null;
  undoStack: ProjectLayer[][];  // Stack of layer states
  redoStack: ProjectLayer[][];
  canvasWidth?: number;
  canvasHeight?: number;
}

// Default transform
const DEFAULT_TRANSFORM: LayerTransform = { x: 0, y: 0, scale: 1, rotate: 0 };

// Generate unique ID
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Storage key prefix
const PROJECT_KEY_PREFIX = 'project_';
const PROJECTS_LIST_KEY = '@projects_list';

// Hook return type
export interface UseProjectManagerReturn {
  // Project state
  project: Project | null;
  isLoading: boolean;
  error: string | null;
  
  // Layer state shortcuts
  layers: ProjectLayer[];
  selectedLayerId: string | null;
  selectedLayer: ProjectLayer | null;
  
  // Undo/Redo state
  canUndo: boolean;
  canRedo: boolean;
  
  // Project lifecycle
  createNewProject: (imageUri: string) => Promise<string>;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  
  // Layer operations (push to undo automatically)
  selectLayer: (layerId: string | null) => void;
  addImageLayer: (imageUri: string, name?: string) => string;
  deleteLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => string | null;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  renameLayer: (layerId: string, name: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  
  // Transform operations (per-layer)
  moveLayer: (layerId: string, dx: number, dy: number) => void;
  rotateSelectedLayer: (angle: number) => void;
  cropSelectedLayer: (crop: CropBox) => void;
  scaleSelectedLayer: (scale: number) => void;
  
  // Adjustments
  applyAdjustments: (adjustments: ProjectLayer['adjustments']) => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  
  // Check if can transform
  canTransformSelected: () => boolean;
  
  // Get layer by ID
  getLayer: (layerId: string) => ProjectLayer | undefined;
}

export function useProjectManager(initialProjectId?: string): UseProjectManagerReturn {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track if we need to save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // =========================================================================
  // DERIVED STATE
  // =========================================================================
  
  const layers = project?.layers || [];
  const selectedLayerId = project?.selectedLayerId || null;
  const selectedLayer = layers.find(l => l.id === selectedLayerId) || null;
  const canUndo = (project?.undoStack.length || 0) > 0;
  const canRedo = (project?.redoStack.length || 0) > 0;
  
  // =========================================================================
  // AUTO SAVE (debounced)
  // =========================================================================
  
  const scheduleAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      if (project) {
        try {
          // Don't save image data to storage (too large)
          const projectToSave = {
            ...project,
            layers: project.layers.map(l => ({
              ...l,
              source: l.type === 'background' ? undefined : undefined, // Don't save base64
            })),
            undoStack: [], // Don't persist undo stack (too large)
            redoStack: [],
          };
          await AsyncStorage.setItem(
            `${PROJECT_KEY_PREFIX}${project.id}`,
            JSON.stringify(projectToSave)
          );
          console.log('📁 Project auto-saved:', project.id);
        } catch (e) {
          console.error('Failed to auto-save project:', e);
        }
      }
    }, 1000);
  }, [project]);
  
  // =========================================================================
  // CREATE NEW PROJECT (ONLY FROM HOMESCREEN)
  // =========================================================================
  
  const createNewProject = useCallback(async (imageUri: string): Promise<string> => {
    const projectId = `proj_${Date.now()}`;
    
    const newProject: Project = {
      id: projectId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      layers: [
        {
          id: 'bg',
          type: 'background',
          name: 'Background',
          source: imageUri,
          locked: true,  // 🔐 BACKGROUND ALWAYS LOCKED
          visible: true,
          opacity: 1,
          transform: { ...DEFAULT_TRANSFORM },
          crop: null,
        },
      ],
      selectedLayerId: 'bg',
      undoStack: [],
      redoStack: [],
    };
    
    // Save to storage
    try {
      await AsyncStorage.setItem(
        `${PROJECT_KEY_PREFIX}${projectId}`,
        JSON.stringify({
          ...newProject,
          layers: newProject.layers.map(l => ({ ...l, source: undefined })),
        })
      );
      
      // Update projects list
      const listJson = await AsyncStorage.getItem(PROJECTS_LIST_KEY);
      const list = listJson ? JSON.parse(listJson) : [];
      list.unshift({ id: projectId, createdAt: Date.now(), imageUri });
      await AsyncStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(list.slice(0, 20)));
      
      console.log('🆕 New project created:', projectId);
    } catch (e) {
      console.error('Failed to save new project:', e);
    }
    
    setProject(newProject);
    return projectId;
  }, []);
  
  // =========================================================================
  // LOAD PROJECT
  // =========================================================================
  
  const loadProject = useCallback(async (projectId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await AsyncStorage.getItem(`${PROJECT_KEY_PREFIX}${projectId}`);
      if (data) {
        const parsed = JSON.parse(data);
        setProject({
          ...parsed,
          undoStack: [],
          redoStack: [],
        });
        console.log('📂 Project loaded:', projectId);
      } else {
        setError('Project not found');
      }
    } catch (e) {
      console.error('Failed to load project:', e);
      setError('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // =========================================================================
  // SAVE PROJECT
  // =========================================================================
  
  const saveProject = useCallback(async () => {
    if (!project) return;
    scheduleAutoSave();
  }, [project, scheduleAutoSave]);
  
  // =========================================================================
  // PUSH TO UNDO STACK
  // =========================================================================
  
  const pushUndo = useCallback(() => {
    if (!project) return;
    
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        undoStack: [...prev.undoStack.slice(-49), prev.layers], // Max 50
        redoStack: [], // Clear redo on new action
        updatedAt: Date.now(),
      };
    });
  }, [project]);
  
  // =========================================================================
  // LAYER OPERATIONS
  // =========================================================================
  
  const selectLayer = useCallback((layerId: string | null) => {
    setProject(prev => {
      if (!prev) return prev;
      return { ...prev, selectedLayerId: layerId };
    });
  }, []);
  
  // Add new image layer (for EditorScreen imports)
  const addImageLayer = useCallback((imageUri: string, name?: string): string => {
    const layerId = generateId();
    const layerName = name || `Image ${layers.filter(l => l.type === 'image').length + 1}`;
    
    pushUndo();
    
    setProject(prev => {
      if (!prev) return prev;
      
      const newLayer: ProjectLayer = {
        id: layerId,
        type: 'image',
        name: layerName,
        source: imageUri,
        locked: false,  // ✅ Movable
        visible: true,
        opacity: 1,
        transform: { ...DEFAULT_TRANSFORM },
        crop: null,
      };
      
      return {
        ...prev,
        layers: [...prev.layers, newLayer],
        selectedLayerId: layerId,
        updatedAt: Date.now(),
      };
    });
    
    scheduleAutoSave();
    console.log('📷 New image layer added:', layerName);
    return layerId;
  }, [layers, pushUndo, scheduleAutoSave]);
  
  const deleteLayer = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type === 'background') return; // Can't delete background
    
    pushUndo();
    
    setProject(prev => {
      if (!prev) return prev;
      const newLayers = prev.layers.filter(l => l.id !== layerId);
      return {
        ...prev,
        layers: newLayers,
        selectedLayerId: prev.selectedLayerId === layerId 
          ? newLayers[newLayers.length - 1]?.id || null 
          : prev.selectedLayerId,
        updatedAt: Date.now(),
      };
    });
    
    scheduleAutoSave();
  }, [layers, pushUndo, scheduleAutoSave]);
  
  const duplicateLayer = useCallback((layerId: string): string | null => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type === 'background') return null;
    
    const newId = generateId();
    pushUndo();
    
    setProject(prev => {
      if (!prev) return prev;
      const newLayer: ProjectLayer = {
        ...JSON.parse(JSON.stringify(layer)),
        id: newId,
        name: `${layer.name} Copy`,
        locked: false,
      };
      
      const index = prev.layers.findIndex(l => l.id === layerId);
      const newLayers = [...prev.layers];
      newLayers.splice(index + 1, 0, newLayer);
      
      return {
        ...prev,
        layers: newLayers,
        selectedLayerId: newId,
        updatedAt: Date.now(),
      };
    });
    
    scheduleAutoSave();
    return newId;
  }, [layers, pushUndo, scheduleAutoSave]);
  
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        layers: prev.layers.map(l => 
          l.id === layerId ? { ...l, visible: !l.visible } : l
        ),
        updatedAt: Date.now(),
      };
    });
    scheduleAutoSave();
  }, [scheduleAutoSave]);
  
  const setLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        layers: prev.layers.map(l => 
          l.id === layerId ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l
        ),
        updatedAt: Date.now(),
      };
    });
    scheduleAutoSave();
  }, [scheduleAutoSave]);
  
  const renameLayer = useCallback((layerId: string, name: string) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        layers: prev.layers.map(l => 
          l.id === layerId ? { ...l, name } : l
        ),
        updatedAt: Date.now(),
      };
    });
    scheduleAutoSave();
  }, [scheduleAutoSave]);
  
  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    pushUndo();
    setProject(prev => {
      if (!prev) return prev;
      const newLayers = [...prev.layers];
      const [moved] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, moved);
      return { ...prev, layers: newLayers, updatedAt: Date.now() };
    });
    scheduleAutoSave();
  }, [pushUndo, scheduleAutoSave]);
  
  // =========================================================================
  // TRANSFORM OPERATIONS (PER-LAYER)
  // =========================================================================
  
  const canTransformSelected = useCallback((): boolean => {
    return selectedLayer !== null && !selectedLayer.locked;
  }, [selectedLayer]);
  
  const moveLayer = useCallback((layerId: string, dx: number, dy: number) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.locked) return;
    
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        layers: prev.layers.map(l => 
          l.id === layerId 
            ? {
                ...l,
                transform: {
                  ...l.transform,
                  x: l.transform.x + dx,
                  y: l.transform.y + dy,
                },
              }
            : l
        ),
        updatedAt: Date.now(),
      };
    });
  }, [layers]);
  
  const rotateSelectedLayer = useCallback((angle: number) => {
    if (!selectedLayerId || !canTransformSelected()) return;
    
    pushUndo();
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        layers: prev.layers.map(l => 
          l.id === selectedLayerId 
            ? { ...l, transform: { ...l.transform, rotate: angle } }
            : l
        ),
        updatedAt: Date.now(),
      };
    });
    scheduleAutoSave();
    console.log('🔄 Layer rotated:', angle);
  }, [selectedLayerId, canTransformSelected, pushUndo, scheduleAutoSave]);
  
  const cropSelectedLayer = useCallback((crop: CropBox) => {
    if (!selectedLayerId || !canTransformSelected()) return;
    
    pushUndo();
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        layers: prev.layers.map(l => 
          l.id === selectedLayerId ? { ...l, crop } : l
        ),
        updatedAt: Date.now(),
      };
    });
    scheduleAutoSave();
    console.log('✂️ Layer cropped');
  }, [selectedLayerId, canTransformSelected, pushUndo, scheduleAutoSave]);
  
  const scaleSelectedLayer = useCallback((scale: number) => {
    if (!selectedLayerId || !canTransformSelected()) return;
    
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        layers: prev.layers.map(l => 
          l.id === selectedLayerId 
            ? { ...l, transform: { ...l.transform, scale } }
            : l
        ),
        updatedAt: Date.now(),
      };
    });
  }, [selectedLayerId, canTransformSelected]);
  
  // =========================================================================
  // ADJUSTMENTS
  // =========================================================================
  
  const applyAdjustments = useCallback((adjustments: ProjectLayer['adjustments']) => {
    if (!selectedLayerId) return;
    
    pushUndo();
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        layers: prev.layers.map(l => 
          l.id === selectedLayerId 
            ? { ...l, adjustments: { ...l.adjustments, ...adjustments } }
            : l
        ),
        updatedAt: Date.now(),
      };
    });
    scheduleAutoSave();
  }, [selectedLayerId, pushUndo, scheduleAutoSave]);
  
  // =========================================================================
  // UNDO / REDO
  // =========================================================================
  
  const undo = useCallback(() => {
    setProject(prev => {
      if (!prev || prev.undoStack.length === 0) return prev;
      
      const previousLayers = prev.undoStack[prev.undoStack.length - 1];
      
      return {
        ...prev,
        layers: previousLayers,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, prev.layers],
        updatedAt: Date.now(),
      };
    });
    console.log('⬅️ Undo');
  }, []);
  
  const redo = useCallback(() => {
    setProject(prev => {
      if (!prev || prev.redoStack.length === 0) return prev;
      
      const nextLayers = prev.redoStack[prev.redoStack.length - 1];
      
      return {
        ...prev,
        layers: nextLayers,
        redoStack: prev.redoStack.slice(0, -1),
        undoStack: [...prev.undoStack, prev.layers],
        updatedAt: Date.now(),
      };
    });
    console.log('➡️ Redo');
  }, []);
  
  // =========================================================================
  // UTILITY
  // =========================================================================
  
  const getLayer = useCallback((layerId: string): ProjectLayer | undefined => {
    return layers.find(l => l.id === layerId);
  }, [layers]);
  
  // Load initial project if ID provided
  useEffect(() => {
    if (initialProjectId) {
      loadProject(initialProjectId);
    }
  }, [initialProjectId, loadProject]);
  
  // =========================================================================
  // RETURN
  // =========================================================================
  
  return {
    project,
    isLoading,
    error,
    
    layers,
    selectedLayerId,
    selectedLayer,
    
    canUndo,
    canRedo,
    
    createNewProject,
    loadProject,
    saveProject,
    
    selectLayer,
    addImageLayer,
    deleteLayer,
    duplicateLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    renameLayer,
    reorderLayers,
    
    moveLayer,
    rotateSelectedLayer,
    cropSelectedLayer,
    scaleSelectedLayer,
    
    applyAdjustments,
    
    undo,
    redo,
    
    canTransformSelected,
    getLayer,
  };
}

