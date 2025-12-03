/**
 * EditorCanvas - Professional Canvas Renderer
 * Renders layers with transforms, handles selection, drawing
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Path, G, Rect, Defs, ClipPath } from 'react-native-svg';
import { COLORS } from '../../config/theme';
import { Layer, BrushPath, BrushSettings, Transform } from '../../store/EditorStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EditorCanvasProps {
  layers: Layer[];
  selectedLayerId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panX: number;
  panY: number;
  
  // Drawing mode
  isDrawing: boolean;
  brushSettings: BrushSettings;
  activeTool: 'brush' | 'pencil' | 'eraser' | 'select' | 'transform';
  
  // Callbacks
  onLayerSelect: (id: string | null) => void;
  onDrawingPath: (path: string) => void;
  onDrawingComplete: (paths: BrushPath[]) => void;
  onTransformStart?: (layerId: string) => void;
  onTransformUpdate?: (transform: Partial<Transform>) => void;
  onTransformEnd?: () => void;
  onCanvasTap?: () => void;
}

// Smooth point calculation
interface Point {
  x: number;
  y: number;
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  layers,
  selectedLayerId,
  canvasWidth,
  canvasHeight,
  zoom,
  panX,
  panY,
  isDrawing,
  brushSettings,
  activeTool,
  onLayerSelect,
  onDrawingPath,
  onDrawingComplete,
  onTransformStart,
  onTransformUpdate,
  onTransformEnd,
  onCanvasTap,
}) => {
  const containerRef = useRef<View>(null);
  const pointsBuffer = useRef<Point[]>([]);
  const lastPoint = useRef<Point | null>(null);
  const currentPathRef = useRef<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [tempPaths, setTempPaths] = useState<BrushPath[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Calculate display dimensions
  const displayWidth = canvasWidth * zoom;
  const displayHeight = canvasHeight * zoom;
  const offsetX = (SCREEN_WIDTH - displayWidth) / 2 + panX;
  const offsetY = 0 + panY;

  // Smoothing factor
  const smoothingFactor = brushSettings.smoothing || 0.3;

  // Smooth point calculation
  const smoothPoint = useCallback((point: Point): Point => {
    if (!lastPoint.current) return point;
    return {
      x: lastPoint.current.x + (point.x - lastPoint.current.x) * (1 - smoothingFactor),
      y: lastPoint.current.y + (point.y - lastPoint.current.y) * (1 - smoothingFactor),
    };
  }, [smoothingFactor]);

  // Build smooth path from points
  const buildSmoothPath = useCallback((points: Point[]): string => {
    if (points.length < 2) return '';
    
    let path = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
    
    if (points.length === 2) {
      path += ` L${points[1].x.toFixed(2)},${points[1].y.toFixed(2)}`;
    } else {
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        path += ` Q${points[i].x.toFixed(2)},${points[i].y.toFixed(2)} ${midX.toFixed(2)},${midY.toFixed(2)}`;
      }
      const last = points[points.length - 1];
      path += ` L${last.x.toFixed(2)},${last.y.toFixed(2)}`;
    }
    
    return path;
  }, []);

  // Update path with requestAnimationFrame
  const updatePath = useCallback(() => {
    if (pointsBuffer.current.length > 0) {
      const smoothPath = buildSmoothPath(pointsBuffer.current);
      currentPathRef.current = smoothPath;
      setCurrentPath(smoothPath);
      onDrawingPath(smoothPath);
    }
    animationFrameRef.current = null;
  }, [buildSmoothPath, onDrawingPath]);

  // Schedule path update
  const schedulePathUpdate = useCallback(() => {
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(updatePath);
    }
  }, [updatePath]);

  // Convert screen coordinates to canvas coordinates
  const toCanvasCoords = useCallback((screenX: number, screenY: number): Point => {
    return {
      x: (screenX - offsetX) / zoom,
      y: (screenY - offsetY) / zoom,
    };
  }, [offsetX, offsetY, zoom]);

  // Pan responder for drawing and interaction
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const point = toCanvasCoords(locationX, locationY);

        if (isDrawing && ['brush', 'pencil', 'eraser'].includes(activeTool)) {
          // Start drawing
          pointsBuffer.current = [point];
          lastPoint.current = point;
          currentPathRef.current = `M${point.x.toFixed(2)},${point.y.toFixed(2)}`;
          setCurrentPath(currentPathRef.current);
        } else if (activeTool === 'select') {
          // Check layer selection
          for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            if (!layer.visible || layer.locked) continue;

            const { x, y, scale } = layer.transform;
            const layerWidth = canvasWidth * scale;
            const layerHeight = canvasHeight * scale;

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
          onLayerSelect(null);
          onCanvasTap?.();
        }
      },

      onPanResponderMove: (evt: GestureResponderEvent) => {
        if (!isDrawing || !['brush', 'pencil', 'eraser'].includes(activeTool)) return;

        const { locationX, locationY } = evt.nativeEvent;
        const rawPoint = toCanvasCoords(locationX, locationY);
        const smoothed = smoothPoint(rawPoint);
        
        pointsBuffer.current.push(smoothed);
        lastPoint.current = smoothed;
        schedulePathUpdate();
      },

      onPanResponderRelease: () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        if (isDrawing && pointsBuffer.current.length > 0) {
          const finalPath = buildSmoothPath(pointsBuffer.current);
          
          const newPath: BrushPath = {
            id: `path-${Date.now()}`,
            d: finalPath,
            color: activeTool === 'eraser' ? 'white' : brushSettings.color,
            strokeWidth: brushSettings.size,
            opacity: brushSettings.opacity,
            tool: activeTool as 'brush' | 'pencil' | 'eraser',
          };

          setTempPaths(prev => [...prev, newPath]);
          onDrawingComplete([...tempPaths, newPath]);
        }

        setCurrentPath('');
        pointsBuffer.current = [];
        lastPoint.current = null;
      },

      onPanResponderTerminate: () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setCurrentPath('');
        pointsBuffer.current = [];
        lastPoint.current = null;
      },
    })
  ).current;

  // Clear temp paths when drawing mode changes
  useEffect(() => {
    if (!isDrawing) {
      setTempPaths([]);
    }
  }, [isDrawing]);

  // Get selected layer
  const selectedLayer = useMemo(() => 
    selectedLayerId ? layers.find(l => l.id === selectedLayerId) : null,
    [layers, selectedLayerId]
  );

  // Render layer
  const renderLayer = (layer: Layer) => {
    if (!layer.visible) return null;

    const { x, y, scale, rotation } = layer.transform;
    const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

    switch (layer.type) {
      case 'image':
        return (
          <View
            key={layer.id}
            style={[
              styles.layer,
              {
                left: x * zoom + offsetX,
                top: y * zoom + offsetY,
                width: canvasWidth * scale * zoom,
                height: canvasHeight * scale * zoom,
                opacity: layer.opacity,
                transform: [{ rotate: `${rotation}deg` }],
              },
            ]}
          >
            {layer.imageUri && (
              <Image
                source={{ uri: layer.imageUri }}
                style={styles.layerImage}
                resizeMode="contain"
              />
            )}
          </View>
        );

      case 'drawing':
        return (
          <Svg
            key={layer.id}
            style={[
              styles.drawingLayer,
              {
                left: offsetX,
                top: offsetY,
                width: displayWidth,
                height: displayHeight,
                opacity: layer.opacity,
              },
            ]}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          >
            <G transform={transform}>
              {layer.paths?.map(path => (
                <Path
                  key={path.id}
                  d={path.d}
                  stroke={path.color}
                  strokeWidth={path.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={path.opacity}
                  strokeOpacity={path.opacity}
                />
              ))}
            </G>
          </Svg>
        );

      default:
        return null;
    }
  };

  // Render selection box
  const renderSelectionBox = () => {
    if (!selectedLayer) return null;

    const { x, y, scale, rotation } = selectedLayer.transform;
    const width = canvasWidth * scale * zoom;
    const height = canvasHeight * scale * zoom;
    const left = x * zoom + offsetX;
    const top = y * zoom + offsetY;

    return (
      <View
        style={[
          styles.selectionBox,
          {
            left: left - 2,
            top: top - 2,
            width: width + 4,
            height: height + 4,
            transform: [{ rotate: `${rotation}deg` }],
          },
        ]}
        pointerEvents="none"
      >
        {/* Corner handles */}
        <View style={[styles.handle, styles.handleNW]} />
        <View style={[styles.handle, styles.handleNE]} />
        <View style={[styles.handle, styles.handleSW]} />
        <View style={[styles.handle, styles.handleSE]} />
        
        {/* Rotation handle */}
        <View style={styles.rotationHandle}>
          <View style={styles.rotationLine} />
          <View style={styles.rotationKnob} />
        </View>
      </View>
    );
  };

  return (
    <View
      ref={containerRef}
      style={styles.container}
      {...panResponder.panHandlers}
    >
      {/* Background (checkerboard for transparency) */}
      <View style={[styles.background, { width: displayWidth, height: displayHeight }]}>
        {/* Checkerboard pattern would go here */}
      </View>

      {/* Render all layers */}
      {layers.map(renderLayer)}

      {/* Current drawing path */}
      {isDrawing && currentPath && (
        <Svg
          style={[
            styles.drawingLayer,
            {
              left: offsetX,
              top: offsetY,
              width: displayWidth,
              height: displayHeight,
            },
          ]}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        >
          <Path
            d={currentPath}
            stroke={activeTool === 'eraser' ? 'rgba(128,128,128,0.5)' : brushSettings.color}
            strokeWidth={brushSettings.size}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={brushSettings.opacity}
          />
        </Svg>
      )}

      {/* Temporary paths during drawing session */}
      {isDrawing && tempPaths.length > 0 && (
        <Svg
          style={[
            styles.drawingLayer,
            {
              left: offsetX,
              top: offsetY,
              width: displayWidth,
              height: displayHeight,
            },
          ]}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        >
          {tempPaths.map(path => (
            <Path
              key={path.id}
              d={path.d}
              stroke={path.tool === 'eraser' ? 'rgba(128,128,128,0.5)' : path.color}
              strokeWidth={path.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={path.opacity}
            />
          ))}
        </Svg>
      )}

      {/* Selection box for selected layer */}
      {selectedLayerId && !isDrawing && renderSelectionBox()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
    backgroundColor: '#2A2A2A',
  },
  layer: {
    position: 'absolute',
  },
  layerImage: {
    width: '100%',
    height: '100%',
  },
  drawingLayer: {
    position: 'absolute',
  },
  selectionBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'solid',
    backgroundColor: 'transparent',
  },
  handle: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 2,
  },
  handleNW: {
    top: -5,
    left: -5,
  },
  handleNE: {
    top: -5,
    right: -5,
  },
  handleSW: {
    bottom: -5,
    left: -5,
  },
  handleSE: {
    bottom: -5,
    right: -5,
  },
  rotationHandle: {
    position: 'absolute',
    top: -40,
    left: '50%',
    marginLeft: -5,
    alignItems: 'center',
  },
  rotationLine: {
    width: 1,
    height: 25,
    backgroundColor: '#007AFF',
  },
  rotationKnob: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
});

export default EditorCanvas;

