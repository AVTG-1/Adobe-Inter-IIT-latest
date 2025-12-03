/**
 * Professional Canvas Component
 * Main canvas view with Photoshop-like functionality
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  PanResponder,
  GestureResponderEvent,
  Image,
} from 'react-native';
import { COLORS } from '../../config/theme';
import {
  CanvasLayer,
  BrushEngine,
  BrushSettings,
  Point,
  BrushStroke,
  AdjustmentEngine,
  TransformController,
} from './CanvasEditor';
import TransformControls from './TransformControls';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ProfessionalCanvasProps {
  width?: number;
  height?: number;
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  activeTool: 'select' | 'brush' | 'eraser' | 'pencil' | 'transform';
  brushSettings: BrushSettings;
  onStrokeComplete: (layerId: string, stroke: BrushStroke, previousState: ImageData | null) => void;
  onLayerSelect: (layerId: string | null) => void;
  onTransformStart: (layerId: string, transform: any) => void;
  onTransformEnd: (layerId: string, transform: any) => void;
  showTransformControls?: boolean;
}

const ProfessionalCanvas: React.FC<ProfessionalCanvasProps> = ({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT * 0.6,
  layers,
  selectedLayerId,
  activeTool,
  brushSettings,
  onStrokeComplete,
  onLayerSelect,
  onTransformStart,
  onTransformEnd,
  showTransformControls = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<View>(null);
  const brushEngineRef = useRef<BrushEngine | null>(null);
  const transformControllerRef = useRef(new TransformController());
  const [isDrawing, setIsDrawing] = useState(false);
  const previousStateRef = useRef<ImageData | null>(null);

  // Initialize canvas (web only)
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Create main compositing canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvasRef.current = canvas;

      // Initialize brush engine
      const ctx = canvas.getContext('2d');
      brushEngineRef.current = new BrushEngine(ctx);
    }
  }, [width, height]);

  // Update brush settings
  useEffect(() => {
    if (brushEngineRef.current) {
      brushEngineRef.current.setSettings(brushSettings);
      
      // Set eraser mode
      if (activeTool === 'eraser') {
        brushEngineRef.current.setEraserMode(true);
      } else {
        brushEngineRef.current.setEraserMode(false);
      }
    }
  }, [brushSettings, activeTool]);

  // Get touch position relative to canvas
  const getTouchPosition = useCallback((evt: GestureResponderEvent): Point => {
    const { locationX, locationY } = evt.nativeEvent;
    return { x: locationX, y: locationY, timestamp: Date.now() };
  }, []);

  // Get selected layer canvas
  const getSelectedLayerCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!selectedLayerId) return null;
    const layer = layers.find(l => l.id === selectedLayerId);
    return layer?.canvas || null;
  }, [selectedLayerId, layers]);

  // Handle drawing start
  const handleDrawingStart = useCallback((evt: GestureResponderEvent) => {
    if (!['brush', 'eraser', 'pencil'].includes(activeTool)) return;

    const layerCanvas = getSelectedLayerCanvas();
    if (!layerCanvas) return;

    const ctx = layerCanvas.getContext('2d');
    if (!ctx) return;

    // Save previous state for undo
    previousStateRef.current = ctx.getImageData(0, 0, layerCanvas.width, layerCanvas.height);

    // Set brush engine context to layer canvas
    brushEngineRef.current?.setContext(ctx);
    
    const point = getTouchPosition(evt);
    brushEngineRef.current?.startStroke(point);
    setIsDrawing(true);
  }, [activeTool, getSelectedLayerCanvas, getTouchPosition]);

  // Handle drawing move
  const handleDrawingMove = useCallback((evt: GestureResponderEvent) => {
    if (!isDrawing || !['brush', 'eraser', 'pencil'].includes(activeTool)) return;

    const point = getTouchPosition(evt);
    brushEngineRef.current?.continueStroke(point);
  }, [isDrawing, activeTool, getTouchPosition]);

  // Handle drawing end
  const handleDrawingEnd = useCallback(() => {
    if (!isDrawing) return;

    const stroke = brushEngineRef.current?.endStroke();
    setIsDrawing(false);

    if (stroke && selectedLayerId) {
      onStrokeComplete(selectedLayerId, stroke, previousStateRef.current);
    }
  }, [isDrawing, selectedLayerId, onStrokeComplete]);

  // Handle layer selection by click
  const handleCanvasPress = useCallback((evt: GestureResponderEvent) => {
    if (activeTool !== 'select') return;

    const point = getTouchPosition(evt);
    
    // Check which layer was clicked (from top to bottom)
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible || layer.locked) continue;

      const { x, y, scaleX, scaleY } = layer.transform;
      const layerWidth = (layer.canvas?.width || 0) * scaleX;
      const layerHeight = (layer.canvas?.height || 0) * scaleY;

      if (
        point.x >= x &&
        point.x <= x + layerWidth &&
        point.y >= y &&
        point.y <= y + layerHeight
      ) {
        onLayerSelect(layer.id);
        return;
      }
    }

    // Click on empty area - deselect
    onLayerSelect(null);
  }, [activeTool, layers, getTouchPosition, onLayerSelect]);

  // Create pan responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (['brush', 'eraser', 'pencil'].includes(activeTool)) {
          handleDrawingStart(evt);
        } else if (activeTool === 'select') {
          handleCanvasPress(evt);
        }
      },
      onPanResponderMove: (evt) => {
        if (['brush', 'eraser', 'pencil'].includes(activeTool)) {
          handleDrawingMove(evt);
        }
      },
      onPanResponderRelease: () => {
        if (['brush', 'eraser', 'pencil'].includes(activeTool)) {
          handleDrawingEnd();
        }
      },
      onPanResponderTerminate: () => {
        handleDrawingEnd();
      },
    })
  ).current;

  // Composite and render all layers
  const renderLayers = useCallback(() => {
    if (Platform.OS !== 'web' || !canvasRef.current) return;

    const mainCtx = canvasRef.current.getContext('2d');
    if (!mainCtx) return;

    // Clear main canvas
    mainCtx.clearRect(0, 0, width, height);

    // Draw checkerboard background (transparency indicator)
    const patternSize = 10;
    for (let y = 0; y < height; y += patternSize) {
      for (let x = 0; x < width; x += patternSize) {
        const isEven = ((x / patternSize) + (y / patternSize)) % 2 === 0;
        mainCtx.fillStyle = isEven ? '#FFFFFF' : '#CCCCCC';
        mainCtx.fillRect(x, y, patternSize, patternSize);
      }
    }

    // Render each visible layer
    layers.forEach((layer) => {
      if (!layer.visible || !layer.canvas) return;

      mainCtx.save();

      // Apply transform
      const { x, y, scaleX, scaleY, rotation } = layer.transform;
      const centerX = x + (layer.canvas.width * scaleX) / 2;
      const centerY = y + (layer.canvas.height * scaleY) / 2;

      mainCtx.translate(centerX, centerY);
      mainCtx.rotate((rotation * Math.PI) / 180);
      mainCtx.scale(scaleX, scaleY);
      mainCtx.translate(-layer.canvas.width / 2, -layer.canvas.height / 2);

      // Apply opacity and blend mode
      mainCtx.globalAlpha = layer.opacity;
      mainCtx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;

      // Draw layer content
      mainCtx.drawImage(layer.canvas, 0, 0);

      mainCtx.restore();
    });
  }, [layers, width, height]);

  // Render on layer changes
  useEffect(() => {
    renderLayers();
  }, [renderLayers, layers]);

  // Get bounding box for selected layer
  const getSelectedBoundingBox = useCallback(() => {
    if (!selectedLayerId) return null;
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer?.canvas) return null;

    const { x, y, scaleX, scaleY, rotation } = layer.transform;
    return {
      x,
      y,
      width: layer.canvas.width * scaleX,
      height: layer.canvas.height * scaleY,
      rotation,
    };
  }, [selectedLayerId, layers]);

  // Handle transform start
  const handleTransformStart = useCallback((point: Point, handle: string) => {
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer) return;

    transformControllerRef.current.setLayer(layer);
    transformControllerRef.current.startTransform(point, handle);
    onTransformStart(layer.id, layer.transform);
  }, [selectedLayerId, layers, onTransformStart]);

  // Handle transform update
  const handleTransformUpdate = useCallback((point: Point, shiftKey: boolean) => {
    transformControllerRef.current.updateTransform(point, shiftKey);
    renderLayers();
  }, [renderLayers]);

  // Handle transform end
  const handleTransformEnd = useCallback(() => {
    const transform = transformControllerRef.current.endTransform();
    const layer = transformControllerRef.current.getLayer();
    if (layer && transform) {
      onTransformEnd(layer.id, transform);
    }
  }, [onTransformEnd]);

  // Handle double-click to reset rotation
  const handleResetRotation = useCallback(() => {
    transformControllerRef.current.resetRotation();
    renderLayers();
    
    const layer = transformControllerRef.current.getLayer();
    if (layer) {
      onTransformEnd(layer.id, layer.transform);
    }
  }, [renderLayers, onTransformEnd]);

  return (
    <View
      ref={containerRef}
      style={[styles.container, { width, height }]}
      {...panResponder.panHandlers}
    >
      {/* Background */}
      <View style={styles.background} />

      {/* Render layers as images for non-web platforms */}
      {Platform.OS !== 'web' &&
        layers.map((layer) => {
          if (!layer.visible) return null;
          
          const { x, y, scaleX, scaleY, rotation } = layer.transform;
          
          return (
            <View
              key={layer.id}
              style={[
                styles.layerContainer,
                {
                  left: x,
                  top: y,
                  opacity: layer.opacity,
                  transform: [
                    { scaleX },
                    { scaleY },
                    { rotate: `${rotation}deg` },
                  ],
                },
                selectedLayerId === layer.id && styles.selectedLayer,
              ]}
            >
              {layer.content.imageUri && (
                <Image
                  source={{ uri: layer.content.imageUri }}
                  style={styles.layerImage}
                  resizeMode="contain"
                />
              )}
            </View>
          );
        })}

      {/* Transform controls */}
      {showTransformControls && activeTool === 'transform' && (
        <TransformControls
          boundingBox={getSelectedBoundingBox()}
          onTransformStart={handleTransformStart}
          onTransformUpdate={handleTransformUpdate}
          onTransformEnd={handleTransformEnd}
          onDoubleClick={handleResetRotation}
          showRotation={true}
          showScale={true}
          enabled={!!selectedLayerId}
        />
      )}

      {/* Selection outline for non-transform modes */}
      {selectedLayerId && activeTool !== 'transform' && (
        <View
          style={[
            styles.selectionOutline,
            (() => {
              const layer = layers.find(l => l.id === selectedLayerId);
              if (!layer?.canvas) return {};
              const { x, y, scaleX, scaleY, rotation } = layer.transform;
              return {
                left: x - 2,
                top: y - 2,
                width: layer.canvas.width * scaleX + 4,
                height: layer.canvas.height * scaleY + 4,
                transform: [{ rotate: `${rotation}deg` }],
              };
            })(),
          ]}
          pointerEvents="none"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
    position: 'relative',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2A2A2A',
  },
  layerContainer: {
    position: 'absolute',
  },
  layerImage: {
    width: '100%',
    height: '100%',
  },
  selectedLayer: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  selectionOutline: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
});

export default ProfessionalCanvas;

