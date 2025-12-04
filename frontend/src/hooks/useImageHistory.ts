/**
 * Image History Hook - Professional Undo/Redo System with Persistence
 *
 * Implements a robust undo/redo stack similar to Photoshop
 * Tracks image states and allows non-destructive editing
 * Saves to AsyncStorage for persistence across app restarts
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_STORAGE_KEY = '@editor_history_v2';
const HISTORY_INDEX_KEY = '@editor_history_index_v2';
const MAX_HISTORY_SIZE = 10; // Reduced to 10 states to save storage space
const MAX_IMAGE_URI_LENGTH = 1000; // Don't store base64 images longer than this

// Helper to check if a URI is a blob URL (temporary, will expire)
const isBlobUrl = (uri: string): boolean => {
  return uri?.startsWith('blob:') || false;
};

// Helper to check if URI is valid for storage/use
const isValidUri = (uri: string): boolean => {
  if (!uri) return false;
  // Blob URLs are temporary and will expire - skip them
  if (isBlobUrl(uri)) return false;
  // Placeholder entries from previous saves are invalid
  if (uri.startsWith('placeholder-')) return false;
  return true;
};

export interface HistoryEntry {
  imageUri: string;
  timestamp: number;
  action: string;
  metadata?: any;
}

export interface UseImageHistoryReturn {
  // State
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  history: HistoryEntry[];
  isLoaded: boolean;

  // Actions
  pushHistory: (imageUri: string, action: string, metadata?: any) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  clearHistory: () => void;
  clearAllEditorStorage: () => Promise<void>;
  getCurrentImage: () => string | null;
  getHistoryEntry: (index: number) => HistoryEntry | null;
  loadHistory: () => Promise<void>;
  saveHistory: () => Promise<void>;
}

export function useImageHistory(initialImageUri?: string): UseImageHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Debounce save operations
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load history from AsyncStorage on mount
  const loadHistory = useCallback(async () => {
    try {
      const [savedHistory, savedIndex] = await Promise.all([
        AsyncStorage.getItem(HISTORY_STORAGE_KEY),
        AsyncStorage.getItem(HISTORY_INDEX_KEY),
      ]);

      if (savedHistory) {
        const parsed = JSON.parse(savedHistory) as HistoryEntry[];
        setHistory(parsed);
        
        if (savedIndex !== null) {
          const idx = parseInt(savedIndex, 10);
          setCurrentIndex(Math.min(idx, parsed.length - 1));
        } else {
          setCurrentIndex(parsed.length - 1);
        }
      } else if (initialImageUri) {
        // No saved history, initialize with initial image
        const initialEntry: HistoryEntry = {
          imageUri: initialImageUri,
          timestamp: Date.now(),
          action: 'Initial State',
        };
        setHistory([initialEntry]);
        setCurrentIndex(0);
      }
      
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load history:', error);
      setIsLoaded(true);
      
      // Initialize with initial image on error
      if (initialImageUri) {
        const initialEntry: HistoryEntry = {
          imageUri: initialImageUri,
          timestamp: Date.now(),
          action: 'Initial State',
        };
        setHistory([initialEntry]);
        setCurrentIndex(0);
      }
    }
  }, [initialImageUri]);

  // Save history to AsyncStorage (debounced)
  // IMPORTANT: We don't save base64 image data to avoid QuotaExceededError
  const saveHistory = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Create lightweight history without large base64 images
        const historyToSave = history.map(entry => ({
          ...entry,
          // Only keep short URIs (file paths), not base64 data URLs
          imageUri: entry.imageUri && entry.imageUri.length < MAX_IMAGE_URI_LENGTH 
            ? entry.imageUri 
            : `placeholder-${entry.timestamp}`, // Store placeholder for large images
        }));
        
        await Promise.all([
          AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyToSave)),
          AsyncStorage.setItem(HISTORY_INDEX_KEY, currentIndex.toString()),
        ]);
      } catch (error) {
        // Handle quota exceeded error
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          console.warn('History storage quota exceeded, clearing old history...');
          try {
            await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
            await AsyncStorage.removeItem(HISTORY_INDEX_KEY);
            // Also clear old v1 keys if they exist
            await AsyncStorage.removeItem('@editor_history');
            await AsyncStorage.removeItem('@editor_history_index');
          } catch (clearError) {
            console.error('Failed to clear history storage:', clearError);
          }
        } else {
          console.error('Failed to save history:', error);
        }
      }
    }, 500); // 500ms debounce
  }, [history, currentIndex]);

  // Load on mount - also clean up any corrupted storage
  useEffect(() => {
    const initHistory = async () => {
      // First, try to clear any old large data that might be causing issues
      try {
        // Check if old v1 keys exist and remove them
        const oldHistory = await AsyncStorage.getItem('@editor_history');
        if (oldHistory && oldHistory.length > 100000) { // If > 100KB, clear it
          console.log('Clearing large old history data...');
          await AsyncStorage.removeItem('@editor_history');
          await AsyncStorage.removeItem('@editor_history_index');
        }
      } catch (e) {
        console.log('Error checking old history:', e);
      }
      
      loadHistory();
    };
    
    initHistory();
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Save when history changes (after initial load)
  useEffect(() => {
    if (isLoaded && history.length > 0) {
      saveHistory();
    }
  }, [history, currentIndex, isLoaded]);

  // Push new history entry
  const pushHistory = useCallback(
    (imageUri: string, action: string, metadata?: any) => {
      // Skip blob URLs - they are temporary and will cause errors on reload
      // Note: This is expected for web - blob URLs are session-only
      if (isBlobUrl(imageUri)) {
        // Silently skip - this is expected behavior on web
        return;
      }
      
      setHistory((prev) => {
        // Remove any history after current index (when user does action after undo)
        const newHistory = prev.slice(0, currentIndex + 1);

        // Add new entry
        newHistory.push({
          imageUri,
          timestamp: Date.now(),
          action,
          metadata,
        });

        // Limit history size (keep most recent)
        if (newHistory.length > MAX_HISTORY_SIZE) {
          return newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
        }

        return newHistory;
      });

      setCurrentIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
    },
    [currentIndex]
  );

  // Undo - go back one step (skip invalid entries like blob URLs)
  const undo = useCallback((): HistoryEntry | null => {
    if (currentIndex <= 0) {
      console.log('Cannot undo: at beginning of history');
      return null;
    }

    // Find the previous valid entry (skip blob URLs and placeholders)
    let newIndex = currentIndex - 1;
    while (newIndex >= 0 && !isValidUri(history[newIndex]?.imageUri)) {
      console.log('⚠️ Skipping invalid history entry during undo:', history[newIndex]?.imageUri?.substring(0, 50));
      newIndex--;
    }
    
    if (newIndex < 0) {
      console.log('Cannot undo: no valid entries found');
      return null;
    }
    
    setCurrentIndex(newIndex);
    return history[newIndex];
  }, [currentIndex, history]);

  // Redo - go forward one step (skip invalid entries like blob URLs)
  const redo = useCallback((): HistoryEntry | null => {
    if (currentIndex >= history.length - 1) {
      console.log('Cannot redo: at end of history');
      return null;
    }

    // Find the next valid entry (skip blob URLs and placeholders)
    let newIndex = currentIndex + 1;
    while (newIndex < history.length && !isValidUri(history[newIndex]?.imageUri)) {
      console.log('⚠️ Skipping invalid history entry during redo:', history[newIndex]?.imageUri?.substring(0, 50));
      newIndex++;
    }
    
    if (newIndex >= history.length) {
      console.log('Cannot redo: no valid entries found');
      return null;
    }
    
    setCurrentIndex(newIndex);
    return history[newIndex];
  }, [currentIndex, history]);

  // Clear all history
  const clearHistory = useCallback(async () => {
    setHistory([]);
    setCurrentIndex(-1);
    
    try {
      await Promise.all([
        AsyncStorage.removeItem(HISTORY_STORAGE_KEY),
        AsyncStorage.removeItem(HISTORY_INDEX_KEY),
        // Also clear old v1 keys
        AsyncStorage.removeItem('@editor_history'),
        AsyncStorage.removeItem('@editor_history_index'),
      ]);
      console.log('✅ History cleared successfully');
    } catch (error) {
      console.error('Failed to clear history storage:', error);
    }
  }, []);
  
  // Clear ALL editor-related storage (call when leaving editor)
  const clearAllEditorStorage = useCallback(async () => {
    setHistory([]);
    setCurrentIndex(-1);
    
    try {
      // Clear all editor-related keys
      const keysToRemove = [
        HISTORY_STORAGE_KEY,
        HISTORY_INDEX_KEY,
        '@editor_history',
        '@editor_history_index',
        '@editor_layers_v2',
        '@editor_layers',
        '@editor_selected_layer',
        '@editor_canvas_settings',
        '@editor_brush_settings',
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('✅ All editor storage cleared');
    } catch (error) {
      console.error('Failed to clear editor storage:', error);
    }
  }, []);

  // Get current image URI
  const getCurrentImage = useCallback((): string | null => {
    if (currentIndex < 0 || currentIndex >= history.length) {
      return null;
    }
    return history[currentIndex].imageUri;
  }, [currentIndex, history]);

  // Get specific history entry
  const getHistoryEntry = useCallback((index: number): HistoryEntry | null => {
    if (index < 0 || index >= history.length) {
      return null;
    }
    return history[index];
  }, [history]);

  return {
    currentIndex,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    history,
    isLoaded,
    pushHistory,
    undo,
    redo,
    clearHistory,
    clearAllEditorStorage,
    getCurrentImage,
    getHistoryEntry,
    loadHistory,
    saveHistory,
  };
}
