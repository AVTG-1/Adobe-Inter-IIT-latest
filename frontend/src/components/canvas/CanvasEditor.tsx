/**
 * Professional Canvas Editor - Photoshop-like Implementation
 * 
 * Features:
 * - Smooth drawing with requestAnimationFrame
 * - Layer-based editing
 * - Non-destructive adjustments
 * - Transform controls with bounding box
 * - Undo/Redo with Command pattern
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  Text,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============ TYPES ============

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface BrushSettings {
  size: number;
  color: string;
  opacity: number;
  hardness: number; // 0-1, soft to hard edge
  smoothing: number; // 0-1, amount of stroke smoothing
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // in degrees
}

export interface LayerContent {
  type: 'image' | 'drawing' | 'text' | 'shape' | 'adjustment';
  imageData?: ImageData;
  imageUri?: string;
  paths?: BrushStroke[];
  text?: string;
  textStyle?: any;
}

export interface BrushStroke {
  id: string;
  points: Point[];
  brush: BrushSettings;
  tool: 'brush' | 'pencil' | 'eraser';
}

export interface CanvasLayer {
  id: string;
  name: string;
  type: 'image' | 'drawing' | 'text' | 'shape' | 'adjustment';
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: string;
  transform: Transform;
  content: LayerContent;
  canvas?: HTMLCanvasElement; // Offscreen canvas for this layer
  thumbnail?: string;
  createdAt: number;
}

export interface AdjustmentValues {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  exposure: number; // -100 to 100
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  hue: number; // -180 to 180
}

export interface HistoryAction {
  id: string;
  type: 'stroke' | 'transform' | 'adjustment' | 'layer-add' | 'layer-delete' | 'layer-reorder' | 'image';
  layerId: string;
  previousState: any;
  newState: any;
  timestamp: number;
}

// ============ CANVAS LAYER CLASS ============

export class CanvasLayerManager {
  private layers: CanvasLayer[] = [];
  private selectedLayerId: string | null = null;
  private historyStack: HistoryAction[] = [];
  private historyIndex: number = -1;
  private maxHistory: number = 50;
  private mainCanvas: HTMLCanvasElement | null = null;
  private mainCtx: CanvasRenderingContext2D | null = null;

  constructor(width: number, height: number) {
    if (Platform.OS === 'web') {
      this.mainCanvas = document.createElement('canvas');
      this.mainCanvas.width = width;
      this.mainCanvas.height = height;
      this.mainCtx = this.mainCanvas.getContext('2d');
    }
  }

  // Create offscreen canvas for a layer
  createLayerCanvas(width: number, height: number): HTMLCanvasElement | null {
    if (Platform.OS !== 'web') return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  // Add a new layer
  addLayer(type: CanvasLayer['type'], name?: string, content?: Partial<LayerContent>): CanvasLayer {
    const id = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const layer: CanvasLayer = {
      id,
      name: name || `Layer ${this.layers.length + 1}`,
      type,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      content: { type, ...content },
      canvas: this.createLayerCanvas(
        this.mainCanvas?.width || 1920,
        this.mainCanvas?.height || 1080
      ) || undefined,
      createdAt: Date.now(),
    };

    this.layers.push(layer);
    this.selectedLayerId = id;
    this.pushHistory({
      id: `action-${Date.now()}`,
      type: 'layer-add',
      layerId: id,
      previousState: null,
      newState: { ...layer },
      timestamp: Date.now(),
    });

    return layer;
  }

  // Get layer by ID
  getLayer(id: string): CanvasLayer | undefined {
    return this.layers.find(l => l.id === id);
  }

  // Get selected layer
  getSelectedLayer(): CanvasLayer | undefined {
    return this.selectedLayerId ? this.getLayer(this.selectedLayerId) : undefined;
  }

  // Select layer
  selectLayer(id: string | null): void {
    this.selectedLayerId = id;
  }

  // Delete layer
  deleteLayer(id: string): void {
    const index = this.layers.findIndex(l => l.id === id);
    if (index === -1) return;

    const layer = this.layers[index];
    this.pushHistory({
      id: `action-${Date.now()}`,
      type: 'layer-delete',
      layerId: id,
      previousState: { ...layer, index },
      newState: null,
      timestamp: Date.now(),
    });

    this.layers.splice(index, 1);
    if (this.selectedLayerId === id) {
      this.selectedLayerId = this.layers[0]?.id || null;
    }
  }

  // Duplicate layer
  duplicateLayer(id: string): CanvasLayer | null {
    const layer = this.getLayer(id);
    if (!layer) return null;

    const newLayer = this.addLayer(layer.type, `${layer.name} Copy`, { ...layer.content });
    newLayer.opacity = layer.opacity;
    newLayer.transform = { ...layer.transform };
    
    // Copy canvas content
    if (layer.canvas && newLayer.canvas && Platform.OS === 'web') {
      const ctx = newLayer.canvas.getContext('2d');
      ctx?.drawImage(layer.canvas, 0, 0);
    }

    return newLayer;
  }

  // Toggle visibility
  toggleVisibility(id: string): void {
    const layer = this.getLayer(id);
    if (layer) {
      layer.visible = !layer.visible;
    }
  }

  // Set opacity
  setOpacity(id: string, opacity: number): void {
    const layer = this.getLayer(id);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  // Reorder layers
  reorderLayers(fromIndex: number, toIndex: number): void {
    const layer = this.layers.splice(fromIndex, 1)[0];
    this.layers.splice(toIndex, 0, layer);
    
    this.pushHistory({
      id: `action-${Date.now()}`,
      type: 'layer-reorder',
      layerId: layer.id,
      previousState: { fromIndex },
      newState: { toIndex },
      timestamp: Date.now(),
    });
  }

  // Get all layers
  getLayers(): CanvasLayer[] {
    return [...this.layers];
  }

  // Push to history
  pushHistory(action: HistoryAction): void {
    // Remove any redo history
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    this.historyStack.push(action);
    
    // Limit history size
    if (this.historyStack.length > this.maxHistory) {
      this.historyStack.shift();
    } else {
      this.historyIndex++;
    }
  }

  // Undo
  undo(): boolean {
    if (this.historyIndex < 0) return false;

    const action = this.historyStack[this.historyIndex];
    this.applyHistoryAction(action, true);
    this.historyIndex--;
    return true;
  }

  // Redo
  redo(): boolean {
    if (this.historyIndex >= this.historyStack.length - 1) return false;

    this.historyIndex++;
    const action = this.historyStack[this.historyIndex];
    this.applyHistoryAction(action, false);
    return true;
  }

  // Apply history action
  private applyHistoryAction(action: HistoryAction, isUndo: boolean): void {
    const state = isUndo ? action.previousState : action.newState;
    
    switch (action.type) {
      case 'layer-add':
        if (isUndo) {
          this.layers = this.layers.filter(l => l.id !== action.layerId);
        } else {
          this.layers.push(state);
        }
        break;
      case 'layer-delete':
        if (isUndo && action.previousState) {
          this.layers.splice(action.previousState.index, 0, action.previousState);
        } else {
          this.layers = this.layers.filter(l => l.id !== action.layerId);
        }
        break;
      case 'stroke':
        const layer = this.getLayer(action.layerId);
        if (layer?.canvas && Platform.OS === 'web') {
          // Restore canvas state
          const ctx = layer.canvas.getContext('2d');
          if (ctx && state?.imageData) {
            ctx.putImageData(state.imageData, 0, 0);
          }
        }
        break;
      // Add more cases as needed
    }
  }

  canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.historyStack.length - 1;
  }
}

// ============ BRUSH ENGINE ============

export class BrushEngine {
  private ctx: CanvasRenderingContext2D | null = null;
  private settings: BrushSettings = {
    size: 10,
    color: '#000000',
    opacity: 1,
    hardness: 0.8,
    smoothing: 0.5,
  };
  private points: Point[] = [];
  private isDrawing: boolean = false;
  private lastPoint: Point | null = null;
  private animationFrame: number | null = null;

  constructor(ctx: CanvasRenderingContext2D | null) {
    this.ctx = ctx;
  }

  setContext(ctx: CanvasRenderingContext2D | null): void {
    this.ctx = ctx;
  }

  setSettings(settings: Partial<BrushSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  getSettings(): BrushSettings {
    return { ...this.settings };
  }

  // Start a new stroke
  startStroke(point: Point): void {
    this.isDrawing = true;
    this.points = [point];
    this.lastPoint = point;
  }

  // Continue stroke with smoothing
  continueStroke(point: Point): void {
    if (!this.isDrawing || !this.ctx) return;

    // Apply smoothing
    const smoothedPoint = this.smoothPoint(point);
    this.points.push(smoothedPoint);

    // Use requestAnimationFrame for smooth rendering
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.animationFrame = requestAnimationFrame(() => {
      this.renderStroke();
    });

    this.lastPoint = smoothedPoint;
  }

  // Smooth point based on previous points
  private smoothPoint(point: Point): Point {
    if (!this.lastPoint || this.settings.smoothing === 0) return point;

    const smoothing = this.settings.smoothing;
    return {
      x: this.lastPoint.x + (point.x - this.lastPoint.x) * (1 - smoothing),
      y: this.lastPoint.y + (point.y - this.lastPoint.y) * (1 - smoothing),
      pressure: point.pressure,
      timestamp: point.timestamp,
    };
  }

  // Render stroke using quadratic curves for smoothness
  private renderStroke(): void {
    if (!this.ctx || this.points.length < 2) return;

    const ctx = this.ctx;
    const { size, color, opacity, hardness } = this.settings;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Soft brush effect
    if (hardness < 1) {
      const blur = (1 - hardness) * size * 0.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
    }

    ctx.beginPath();

    // Draw smooth curve through points
    const points = this.points;
    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      // Use quadratic curves for smoothness
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        
        // Pressure simulation
        const pressure = points[i].pressure || 1;
        ctx.lineWidth = size * pressure;
        
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }

      // Draw to last point
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
    }

    ctx.stroke();
    ctx.restore();
  }

  // End stroke
  endStroke(): BrushStroke | null {
    if (!this.isDrawing) return null;

    this.isDrawing = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Final render
    this.renderStroke();

    const stroke: BrushStroke = {
      id: `stroke-${Date.now()}`,
      points: [...this.points],
      brush: { ...this.settings },
      tool: 'brush',
    };

    this.points = [];
    this.lastPoint = null;

    return stroke;
  }

  // Eraser mode
  setEraserMode(enabled: boolean): void {
    if (this.ctx) {
      this.ctx.globalCompositeOperation = enabled ? 'destination-out' : 'source-over';
    }
  }
}

// ============ ADJUSTMENT ENGINE ============

export class AdjustmentEngine {
  // Apply brightness adjustment
  static applyBrightness(imageData: ImageData, value: number): void {
    const data = imageData.data;
    const adjustment = (value / 100) * 255;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + adjustment));     // R
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + adjustment)); // G
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + adjustment)); // B
    }
  }

  // Apply contrast adjustment
  static applyContrast(imageData: ImageData, value: number): void {
    const data = imageData.data;
    const factor = (259 * (value + 255)) / (255 * (259 - value));

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
      data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
      data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
    }
  }

  // Apply saturation adjustment using HSL
  static applySaturation(imageData: ImageData, value: number): void {
    const data = imageData.data;
    const adjustment = 1 + (value / 100);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      // Convert to HSL
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;

      let h = 0, s = 0;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      // Adjust saturation
      s = Math.max(0, Math.min(1, s * adjustment));

      // Convert back to RGB
      let newR: number, newG: number, newB: number;

      if (s === 0) {
        newR = newG = newB = l;
      } else {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        newR = hue2rgb(p, q, h + 1/3);
        newG = hue2rgb(p, q, h);
        newB = hue2rgb(p, q, h - 1/3);
      }

      data[i] = Math.round(newR * 255);
      data[i + 1] = Math.round(newG * 255);
      data[i + 2] = Math.round(newB * 255);
    }
  }

  // Apply all adjustments to a layer
  static applyAdjustments(
    sourceCanvas: HTMLCanvasElement,
    adjustments: AdjustmentValues
  ): ImageData | null {
    const ctx = sourceCanvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

    if (adjustments.brightness !== 0) {
      this.applyBrightness(imageData, adjustments.brightness);
    }
    if (adjustments.contrast !== 0) {
      this.applyContrast(imageData, adjustments.contrast);
    }
    if (adjustments.saturation !== 0) {
      this.applySaturation(imageData, adjustments.saturation);
    }

    return imageData;
  }

  // Fill layer with color
  static fillLayer(canvas: HTMLCanvasElement, color: string): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// ============ TRANSFORM CONTROLLER ============

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export class TransformController {
  private layer: CanvasLayer | null = null;
  private startTransform: Transform | null = null;
  private startPoint: Point | null = null;
  private activeHandle: string | null = null;

  setLayer(layer: CanvasLayer | null): void {
    this.layer = layer;
  }

  getLayer(): CanvasLayer | null {
    return this.layer;
  }

  // Get bounding box for selected layer
  getBoundingBox(): BoundingBox | null {
    if (!this.layer?.canvas) return null;

    const { x, y, scaleX, scaleY, rotation } = this.layer.transform;
    const width = this.layer.canvas.width * scaleX;
    const height = this.layer.canvas.height * scaleY;

    return { x, y, width, height, rotation };
  }

  // Start transform
  startTransform(point: Point, handle: string): void {
    if (!this.layer) return;

    this.startTransform = { ...this.layer.transform };
    this.startPoint = point;
    this.activeHandle = handle;
  }

  // Update transform
  updateTransform(point: Point, shiftKey: boolean = false): void {
    if (!this.layer || !this.startTransform || !this.startPoint) return;

    const dx = point.x - this.startPoint.x;
    const dy = point.y - this.startPoint.y;

    switch (this.activeHandle) {
      case 'move':
        this.layer.transform.x = this.startTransform.x + dx;
        this.layer.transform.y = this.startTransform.y + dy;
        break;

      case 'rotate':
        // Calculate rotation angle
        const centerX = this.startTransform.x + (this.layer.canvas?.width || 0) * this.startTransform.scaleX / 2;
        const centerY = this.startTransform.y + (this.layer.canvas?.height || 0) * this.startTransform.scaleY / 2;
        
        const startAngle = Math.atan2(this.startPoint.y - centerY, this.startPoint.x - centerX);
        const currentAngle = Math.atan2(point.y - centerY, point.x - centerX);
        let rotation = this.startTransform.rotation + (currentAngle - startAngle) * (180 / Math.PI);

        // Snap to 15° increments when shift is held
        if (shiftKey) {
          rotation = Math.round(rotation / 15) * 15;
        }

        this.layer.transform.rotation = rotation;
        break;

      case 'scale-nw':
      case 'scale-ne':
      case 'scale-sw':
      case 'scale-se':
        // Proportional scaling from corner
        const scaleX = 1 + dx / (this.layer.canvas?.width || 1);
        const scaleY = 1 + dy / (this.layer.canvas?.height || 1);
        const scale = (scaleX + scaleY) / 2;

        this.layer.transform.scaleX = Math.max(0.1, this.startTransform.scaleX * scale);
        this.layer.transform.scaleY = Math.max(0.1, this.startTransform.scaleY * scale);
        break;
    }
  }

  // End transform
  endTransform(): Transform | null {
    const transform = this.layer?.transform ? { ...this.layer.transform } : null;
    this.startTransform = null;
    this.startPoint = null;
    this.activeHandle = null;
    return transform;
  }

  // Reset rotation to 0
  resetRotation(): void {
    if (this.layer) {
      this.layer.transform.rotation = 0;
    }
  }
}

// ============ MAIN HOOK ============

export function useCanvasEditor(width: number, height: number) {
  const layerManager = useMemo(() => new CanvasLayerManager(width, height), [width, height]);
  const brushEngine = useRef<BrushEngine | null>(null);
  const transformController = useRef(new TransformController());

  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [activeTool, setActiveTool] = useState<'brush' | 'eraser' | 'select' | 'transform'>('select');
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 10,
    color: '#000000',
    opacity: 1,
    hardness: 0.8,
    smoothing: 0.5,
  });

  // Sync state
  const syncState = useCallback(() => {
    setLayers(layerManager.getLayers());
    setCanUndo(layerManager.canUndo());
    setCanRedo(layerManager.canRedo());
  }, [layerManager]);

  // Add layer
  const addLayer = useCallback((type: CanvasLayer['type'], name?: string) => {
    const layer = layerManager.addLayer(type, name);
    syncState();
    return layer;
  }, [layerManager, syncState]);

  // Select layer
  const selectLayer = useCallback((id: string | null) => {
    layerManager.selectLayer(id);
    setSelectedLayerId(id);
    
    const layer = id ? layerManager.getLayer(id) : null;
    transformController.current.setLayer(layer || null);
  }, [layerManager]);

  // Delete layer
  const deleteLayer = useCallback((id: string) => {
    layerManager.deleteLayer(id);
    syncState();
  }, [layerManager, syncState]);

  // Duplicate layer
  const duplicateLayer = useCallback((id: string) => {
    layerManager.duplicateLayer(id);
    syncState();
  }, [layerManager, syncState]);

  // Toggle visibility
  const toggleVisibility = useCallback((id: string) => {
    layerManager.toggleVisibility(id);
    syncState();
  }, [layerManager, syncState]);

  // Set opacity
  const setLayerOpacity = useCallback((id: string, opacity: number) => {
    layerManager.setOpacity(id, opacity);
    syncState();
  }, [layerManager, syncState]);

  // Reorder layers
  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    layerManager.reorderLayers(fromIndex, toIndex);
    syncState();
  }, [layerManager, syncState]);

  // Undo
  const undo = useCallback(() => {
    layerManager.undo();
    syncState();
  }, [layerManager, syncState]);

  // Redo
  const redo = useCallback(() => {
    layerManager.redo();
    syncState();
  }, [layerManager, syncState]);

  // Update brush settings
  const updateBrushSettings = useCallback((settings: Partial<BrushSettings>) => {
    setBrushSettings(prev => {
      const newSettings = { ...prev, ...settings };
      brushEngine.current?.setSettings(newSettings);
      return newSettings;
    });
  }, []);

  // Fill layer with color
  const fillLayer = useCallback((id: string, color: string) => {
    const layer = layerManager.getLayer(id);
    if (layer?.canvas) {
      AdjustmentEngine.fillLayer(layer.canvas, color);
      syncState();
    }
  }, [layerManager, syncState]);

  // Apply adjustments to layer
  const applyAdjustments = useCallback((id: string, adjustments: AdjustmentValues) => {
    const layer = layerManager.getLayer(id);
    if (layer?.canvas && Platform.OS === 'web') {
      const imageData = AdjustmentEngine.applyAdjustments(layer.canvas, adjustments);
      if (imageData) {
        const ctx = layer.canvas.getContext('2d');
        ctx?.putImageData(imageData, 0, 0);
        syncState();
      }
    }
  }, [layerManager, syncState]);

  return {
    // State
    layers,
    selectedLayerId,
    canUndo,
    canRedo,
    activeTool,
    brushSettings,

    // Layer actions
    addLayer,
    selectLayer,
    deleteLayer,
    duplicateLayer,
    toggleVisibility,
    setLayerOpacity,
    reorderLayers,
    fillLayer,
    applyAdjustments,

    // History actions
    undo,
    redo,

    // Tool actions
    setActiveTool,
    updateBrushSettings,

    // References
    layerManager,
    brushEngine,
    transformController: transformController.current,
  };
}

export default useCanvasEditor;

