/**
 * History Manager for Undo/Redo Functionality
 * Manages image state history for undo/redo operations
 */

export interface HistoryState {
  imageUri: string;
  timestamp: number;
  operation?: string; // Description of the operation
}

export class HistoryManager {
  private history: HistoryState[] = [];
  private currentIndex: number = -1;
  private maxHistory: number = 50;

  /**
   * Add a new state to history
   */
  addState(imageUri: string, operation?: string): void {
    // Remove any states after current index (when adding new state after undo)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new state
    const newState: HistoryState = {
      imageUri,
      timestamp: Date.now(),
      operation,
    };

    this.history.push(newState);
    this.currentIndex++;

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  /**
   * Undo to previous state
   * Returns the previous image URI, or null if can't undo
   */
  undo(): string | null {
    if (!this.canUndo()) {
      return null;
    }

    this.currentIndex--;
    return this.history[this.currentIndex].imageUri;
  }

  /**
   * Redo to next state
   * Returns the next image URI, or null if can't redo
   */
  redo(): string | null {
    if (!this.canRedo()) {
      return null;
    }

    this.currentIndex++;
    return this.history[this.currentIndex].imageUri;
  }

  /**
   * Check if undo is possible
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if redo is possible
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current state
   */
  getCurrentState(): HistoryState | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return null;
  }

  /**
   * Get original state (first state)
   */
  getOriginalState(): HistoryState | null {
    return this.history.length > 0 ? this.history[0] : null;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Get history length
   */
  getHistoryLength(): number {
    return this.history.length;
  }

  /**
   * Get current index
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Get operation description at index
   */
  getOperationAt(index: number): string | undefined {
    if (index >= 0 && index < this.history.length) {
      return this.history[index].operation;
    }
    return undefined;
  }

  /**
   * Reset to original state
   * Returns the original image URI
   */
  resetToOriginal(): string | null {
    const original = this.getOriginalState();
    if (!original) {
      return null;
    }

    this.currentIndex = 0;
    return original.imageUri;
  }
}

// Export a singleton instance
export const globalHistoryManager = new HistoryManager();
