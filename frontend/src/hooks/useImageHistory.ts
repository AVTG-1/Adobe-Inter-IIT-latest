/**
 * Image History Hook - Professional Undo/Redo System
 *
 * Implements a robust undo/redo stack similar to Photoshop
 * Tracks image states and allows non-destructive editing
 */

import { useState, useCallback, useRef } from 'react';

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

  // Actions
  pushHistory: (imageUri: string, action: string, metadata?: any) => void;
  undo: () => string | null;
  redo: () => string | null;
  clearHistory: () => void;
  getCurrentImage: () => string | null;
}

const MAX_HISTORY_SIZE = 50; // Keep last 50 states like Photoshop

export function useImageHistory(initialImageUri?: string): UseImageHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>(
    initialImageUri
      ? [
          {
            imageUri: initialImageUri,
            timestamp: Date.now(),
            action: 'Initial State',
          },
        ]
      : []
  );

  const [currentIndex, setCurrentIndex] = useState(initialImageUri ? 0 : -1);

  // Push new history entry
  const pushHistory = useCallback(
    (imageUri: string, action: string, metadata?: any) => {
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

  // Undo - go back one step
  const undo = useCallback((): string | null => {
    if (currentIndex <= 0) {
      console.log('Cannot undo: at beginning of history');
      return null;
    }

    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return history[newIndex].imageUri;
  }, [currentIndex, history]);

  // Redo - go forward one step
  const redo = useCallback((): string | null => {
    if (currentIndex >= history.length - 1) {
      console.log('Cannot redo: at end of history');
      return null;
    }

    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return history[newIndex].imageUri;
  }, [currentIndex, history]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  // Get current image URI
  const getCurrentImage = useCallback((): string | null => {
    if (currentIndex < 0 || currentIndex >= history.length) {
      return null;
    }
    return history[currentIndex].imageUri;
  }, [currentIndex, history]);

  return {
    currentIndex,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    history,
    pushHistory,
    undo,
    redo,
    clearHistory,
    getCurrentImage,
  };
}
