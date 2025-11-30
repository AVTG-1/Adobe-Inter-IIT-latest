/**
 * Layer Manager Hook
 *
 * Manages layer state and operations for the editor
 * Provides layer CRUD operations, reordering, visibility, opacity, etc.
 */

import { useState, useCallback } from 'react';
import { Layer } from '../components/InteractiveCanvas';

export interface LayerManagerState {
  layers: Layer[];
  selectedLayerId: string | null;
}

export interface LayerManagerActions {
  // Layer CRUD
  addLayer: (layer: Omit<Layer, 'id'>) => string;
  deleteLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;

  // Layer selection
  selectLayer: (layerId: string | null) => void;
  getSelectedLayer: () => Layer | null;

  // Layer visibility
  toggleLayerVisibility: (layerId: string) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;

  // Layer opacity
  setLayerOpacity: (layerId: string, opacity: number) => void;

  // Layer ordering
  moveLayerUp: (layerId: string) => void;
  moveLayerDown: (layerId: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;

  // Layer properties
  updateLayerTransform: (
    layerId: string,
    transform: Partial<Layer['transform']>
  ) => void;
  renameLayer: (layerId: string, name: string) => void;

  // Bulk operations
  mergeDown: (layerId: string) => void;
  flattenAll: () => void;
  deleteAllLayers: () => void;

  // Utility
  getLayer: (layerId: string) => Layer | undefined;
  getAllLayers: () => Layer[];
}

export interface UseLayerManagerReturn extends LayerManagerState, LayerManagerActions {}

let layerIdCounter = 0;

export function useLayerManager(
  initialImageUrl?: string
): UseLayerManagerReturn {
  // Initialize with base image layer if provided
  const [layers, setLayers] = useState<Layer[]>(
    initialImageUrl
      ? [
          {
            id: 'base-layer',
            type: 'image',
            name: 'Base Image',
            visible: true,
            opacity: 1,
            imageUri: initialImageUrl,
            transform: { x: 0, y: 0, scale: 1, rotation: 0 },
          },
        ]
      : []
  );

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    initialImageUrl ? 'base-layer' : null
  );

  // Generate unique layer ID
  const generateLayerId = useCallback(() => {
    return `layer-${Date.now()}-${layerIdCounter++}`;
  }, []);

  // Add new layer
  const addLayer = useCallback(
    (layerData: Omit<Layer, 'id'>): string => {
      const newLayerId = generateLayerId();
      const newLayer: Layer = {
        ...layerData,
        id: newLayerId,
      };

      setLayers((prev) => [...prev, newLayer]);
      setSelectedLayerId(newLayerId);
      return newLayerId;
    },
    [generateLayerId]
  );

  // Delete layer
  const deleteLayer = useCallback((layerId: string) => {
    setLayers((prev) => {
      const filtered = prev.filter((layer) => layer.id !== layerId);
      // Don't allow deleting the last layer
      if (filtered.length === 0) {
        return prev;
      }
      return filtered;
    });

    setSelectedLayerId((prev) => {
      if (prev === layerId) {
        // Select the layer above the deleted one
        const currentIndex = layers.findIndex((l) => l.id === layerId);
        const newIndex = Math.max(0, currentIndex - 1);
        return layers[newIndex]?.id || null;
      }
      return prev;
    });
  }, [layers]);

  // Duplicate layer
  const duplicateLayer = useCallback(
    (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      const duplicatedLayer: Omit<Layer, 'id'> = {
        ...layer,
        name: `${layer.name} Copy`,
      };

      addLayer(duplicatedLayer);
    },
    [layers, addLayer]
  );

  // Select layer
  const selectLayer = useCallback((layerId: string | null) => {
    setSelectedLayerId(layerId);
  }, []);

  // Get selected layer
  const getSelectedLayer = useCallback((): Layer | null => {
    if (!selectedLayerId) return null;
    return layers.find((l) => l.id === selectedLayerId) || null;
  }, [selectedLayerId, layers]);

  // Toggle layer visibility
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  }, []);

  // Set layer visibility
  const setLayerVisibility = useCallback((layerId: string, visible: boolean) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, visible } : layer
      )
    );
  }, []);

  // Set layer opacity
  const setLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, opacity } : layer
      )
    );
  }, []);

  // Move layer up in stack
  const moveLayerUp = useCallback((layerId: string) => {
    setLayers((prev) => {
      const index = prev.findIndex((l) => l.id === layerId);
      if (index === -1 || index === prev.length - 1) return prev;

      const newLayers = [...prev];
      [newLayers[index], newLayers[index + 1]] = [
        newLayers[index + 1],
        newLayers[index],
      ];
      return newLayers;
    });
  }, []);

  // Move layer down in stack
  const moveLayerDown = useCallback((layerId: string) => {
    setLayers((prev) => {
      const index = prev.findIndex((l) => l.id === layerId);
      if (index <= 0) return prev;

      const newLayers = [...prev];
      [newLayers[index], newLayers[index - 1]] = [
        newLayers[index - 1],
        newLayers[index],
      ];
      return newLayers;
    });
  }, []);

  // Reorder layers (for drag-and-drop)
  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    setLayers((prev) => {
      const newLayers = [...prev];
      const [movedLayer] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, movedLayer);
      return newLayers;
    });
  }, []);

  // Update layer transform
  const updateLayerTransform = useCallback(
    (layerId: string, transform: Partial<Layer['transform']>) => {
      setLayers((prev) =>
        prev.map((layer) =>
          layer.id === layerId
            ? {
                ...layer,
                transform: { ...layer.transform, ...transform },
              }
            : layer
        )
      );
    },
    []
  );

  // Rename layer
  const renameLayer = useCallback((layerId: string, name: string) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === layerId ? { ...layer, name } : layer))
    );
  }, []);

  // Merge layer with the one below it
  const mergeDown = useCallback((layerId: string) => {
    // TODO: Implement actual image merging
    // For now, just hide the upper layer
    console.warn('mergeDown not fully implemented yet');
    setLayerVisibility(layerId, false);
  }, [setLayerVisibility]);

  // Flatten all layers into one
  const flattenAll = useCallback(() => {
    // TODO: Implement actual flattening
    // For now, just keep the base layer and hide others
    console.warn('flattenAll not fully implemented yet');
    setLayers((prev) =>
      prev.map((layer, index) => ({
        ...layer,
        visible: index === 0,
      }))
    );
  }, []);

  // Delete all layers except base
  const deleteAllLayers = useCallback(() => {
    setLayers((prev) => [prev[0]]);
    setSelectedLayerId(layers[0]?.id || null);
  }, [layers]);

  // Get specific layer
  const getLayer = useCallback(
    (layerId: string): Layer | undefined => {
      return layers.find((l) => l.id === layerId);
    },
    [layers]
  );

  // Get all layers
  const getAllLayers = useCallback((): Layer[] => {
    return layers;
  }, [layers]);

  return {
    // State
    layers,
    selectedLayerId,

    // Actions
    addLayer,
    deleteLayer,
    duplicateLayer,
    selectLayer,
    getSelectedLayer,
    toggleLayerVisibility,
    setLayerVisibility,
    setLayerOpacity,
    moveLayerUp,
    moveLayerDown,
    reorderLayers,
    updateLayerTransform,
    renameLayer,
    mergeDown,
    flattenAll,
    deleteAllLayers,
    getLayer,
    getAllLayers,
  };
}
