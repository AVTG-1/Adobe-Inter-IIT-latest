/**
 * Interactive Canvas Component
 *
 * Professional image editing canvas with layer support.
 * Inspired by ImageToolbox, PhotoDemon, and Filerobot.
 *
 * Features:
 * - Pinch to zoom (0.5x to 5x)
 * - Pan with gestures
 * - Double tap to reset
 * - Layer rendering with proper compositing
 * - Real-time CSS filter preview (web)
 * - Locked base image support
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Text,
  Platform,
} from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Rect, Line, Polygon, G, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface Layer {
  id: string;
  type: 'background' | 'image' | 'adjustment' | 'text' | 'shape' | 'drawing' | 'filter' | 'overlay' | 'blur';
  name: string;
  visible: boolean;
  locked?: boolean;  // 🔐 If true, cannot be transformed (background layer)
  opacity: number;
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';
  imageUri?: string;
  source?: string;  // Alternative to imageUri
  adjustments?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    exposure?: number;
    highlights?: number;
    shadows?: number;
    temperature?: number;
    tint?: number;
    vibrance?: number;
    sharpness?: number;
  };
  text?: {
    content: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    align: 'left' | 'center' | 'right';
    bold?: boolean;
    italic?: boolean;
  };
  shape?: {
    shapeType: string;
    strokeColor: string;
    fillColor?: string;
    strokeWidth: number;
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };
  };
  drawing?: {
    paths: any[];
    color: string;
    strokeWidth: number;
  };
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
}

// CSS filter preview values (for real-time preview on web)
export interface FilterPreview {
  brightness?: number;      // -100 to 100
  contrast?: number;        // -100 to 100
  saturation?: number;      // -100 to 100
  hue?: number;            // -180 to 180
  blur?: number;           // 0 to 100
  grayscale?: number;      // 0 to 100
  sepia?: number;          // 0 to 100
  invert?: number;         // 0 to 100
}

// Drawing path for overlay
export interface DrawingPath {
  id: string;
  type: 'pen' | 'brush' | 'eraser' | 'shape';
  points: string;
  color: string;
  strokeWidth: number;
  opacity: number;
  shapeType?: 'rectangle' | 'circle' | 'line' | 'triangle' | 'arrow' | 'star';
}

interface InteractiveCanvasProps {
  imageUri: string;
  layers?: Layer[];
  drawingPaths?: DrawingPath[];
  filterPreview?: FilterPreview;
  isBaseImageLocked?: boolean;
  showDrawingOverlay?: boolean;
  onImageLoad?: () => void;
  onImageError?: (error: any) => void;
  canvasWidth?: number;
  canvasHeight?: number;
  // Layer selection
  selectedLayerId?: string | null;
  onLayerSelect?: (layerId: string | null) => void;
  // Called while a layer is dragged: (layerId, deltaX, deltaY)
  onLayerMove?: (layerId: string, dx: number, dy: number) => void;
}

const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  imageUri,
  layers = [],
  drawingPaths = [],
  filterPreview,
  isBaseImageLocked = true,
  showDrawingOverlay = false,
  onImageLoad,
  onImageError,
  canvasWidth = SCREEN_WIDTH,
  canvasHeight = SCREEN_HEIGHT * 0.7, // 70% of screen for canvas
  selectedLayerId,
  onLayerSelect,
  onLayerMove,
}) => {
  // Gesture values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Image dimensions
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Handle image load
  const handleImageLoad = useCallback((event: any) => {
    // Cross-platform: On native, use nativeEvent.source; on web, use target
    let width = 0;
    let height = 0;

    if (event.nativeEvent?.source) {
      // React Native
      width = event.nativeEvent.source.width;
      height = event.nativeEvent.source.height;
    } else if (event.target) {
      // Web
      width = event.target.naturalWidth || event.target.width;
      height = event.target.naturalHeight || event.target.height;
    }

    if (width && height) {
      setImageDimensions({ width, height });
    }
    setImageLoaded(true);
    onImageLoad?.();
  }, [onImageLoad]);

  // Calculate fitted dimensions
  const getFittedDimensions = () => {
    if (!imageDimensions.width || !imageDimensions.height) {
      return { width: canvasWidth, height: canvasHeight };
    }

    const imageAspectRatio = imageDimensions.width / imageDimensions.height;
    const canvasAspectRatio = canvasWidth / canvasHeight;

    let width: number;
    let height: number;

    if (imageAspectRatio > canvasAspectRatio) {
      // Image is wider than canvas
      width = canvasWidth * 0.9; // 90% of canvas width for padding
      height = width / imageAspectRatio;
    } else {
      // Image is taller than canvas
      height = canvasHeight * 0.9; // 90% of canvas height for padding
      width = height * imageAspectRatio;
    }

    return { width, height };
  };

  const fittedDimensions = getFittedDimensions();

  // Reset zoom and pan
  const resetTransform = useCallback(() => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, []);

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;
      // Limit zoom between 0.5x and 5x
      scale.value = Math.max(0.5, Math.min(5, newScale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Pan gesture - requires 2 fingers to avoid conflicts with layer selection taps
  const panGesture = Gesture.Pan()
    .minPointers(2) // Require 2 fingers to pan, allowing single taps to pass through
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Double tap to reset
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(resetTransform)();
    });

  // Compose gestures
  const composedGestures = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture
  );

  // Animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Track incremental translation per-layer for pan gestures
  const translationRefs = useRef<Record<string, { x: number; y: number }>>({});

  // Find background layer adjustments for persistent filter
  const backgroundLayer = useMemo(() => {
    return layers.find(l => l.type === 'background');
  }, [layers]);
  
  // Check if background layer is currently selected
  const isBackgroundSelected = useMemo(() => {
    return backgroundLayer?.id === selectedLayerId;
  }, [backgroundLayer?.id, selectedLayerId]);
  
  // Generate CSS filter string for BASE IMAGE ONLY
  // Only apply filterPreview if BACKGROUND is selected, otherwise use background's saved adjustments
  const cssFilterStyle = useMemo(() => {
    if (Platform.OS !== 'web') return {};
    
    // Determine what adjustments to apply to the base image:
    // - If background is selected AND filterPreview exists: use filterPreview (live editing)
    // - Otherwise: use background layer's saved adjustments
    const adjustments = (isBackgroundSelected && filterPreview) 
      ? filterPreview 
      : backgroundLayer?.adjustments;
      
    if (!adjustments) return {};
    
    const filters: string[] = [];
    
    if (adjustments.brightness !== undefined && adjustments.brightness !== 0) {
      const value = 1 + (adjustments.brightness / 100);
      filters.push(`brightness(${value})`);
    }
    
    if (adjustments.contrast !== undefined && adjustments.contrast !== 0) {
      const value = 1 + (adjustments.contrast / 100);
      filters.push(`contrast(${value})`);
    }
    
    if (adjustments.saturation !== undefined && adjustments.saturation !== 0) {
      const value = 1 + (adjustments.saturation / 100);
      filters.push(`saturate(${value})`);
    }
    
    if (adjustments.hue !== undefined && adjustments.hue !== 0) {
      filters.push(`hue-rotate(${adjustments.hue}deg)`);
    }
    
    // Only from filterPreview (live preview specific) when background is selected
    if (isBackgroundSelected && filterPreview) {
      const preview = filterPreview as FilterPreview;
      if (preview.blur !== undefined && preview.blur > 0) {
        const value = (preview.blur / 100) * 10;
        filters.push(`blur(${value}px)`);
      }
      if (preview.grayscale !== undefined && preview.grayscale > 0) {
        filters.push(`grayscale(${preview.grayscale}%)`);
      }
      if (preview.sepia !== undefined && preview.sepia > 0) {
        filters.push(`sepia(${preview.sepia}%)`);
      }
      if (preview.invert !== undefined && preview.invert > 0) {
        filters.push(`invert(${preview.invert}%)`);
      }
    }
    
    return filters.length > 0 ? { filter: filters.join(' ') } : {};
  }, [filterPreview, backgroundLayer?.adjustments, isBackgroundSelected]);
  
  // Helper function to generate CSS filter string for individual layer adjustments
  const getLayerFilterStyle = useCallback((adjustments?: Layer['adjustments']) => {
    if (Platform.OS !== 'web' || !adjustments) return {};
    
    const filters: string[] = [];
    
    if (adjustments.brightness !== undefined && adjustments.brightness !== 0) {
      const value = 1 + (adjustments.brightness / 100);
      filters.push(`brightness(${value})`);
    }
    
    if (adjustments.contrast !== undefined && adjustments.contrast !== 0) {
      const value = 1 + (adjustments.contrast / 100);
      filters.push(`contrast(${value})`);
    }
    
    if (adjustments.saturation !== undefined && adjustments.saturation !== 0) {
      const value = 1 + (adjustments.saturation / 100);
      filters.push(`saturate(${value})`);
    }
    
    if (adjustments.exposure !== undefined && adjustments.exposure !== 0) {
      const value = 1 + (adjustments.exposure / 100);
      filters.push(`brightness(${value})`);
    }
    
    return filters.length > 0 ? { filter: filters.join(' ') } : {};
  }, []);

  // Render drawing paths as SVG
  const renderDrawingPaths = useCallback(() => {
    if (drawingPaths.length === 0) return null;
    
    return (
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox={`0 0 ${fittedDimensions.width} ${fittedDimensions.height}`}
      >
        {drawingPaths.map((path) => {
          if (path.type === 'shape' && path.shapeType) {
            return renderShape(path);
          }
          return (
            <Path
              key={path.id}
              d={path.points}
              stroke={path.color}
              strokeWidth={path.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={path.opacity}
            />
          );
        })}
      </Svg>
    );
  }, [drawingPaths, fittedDimensions]);

  // Render shape from drawing path
  const renderShape = (path: DrawingPath) => {
    const [x1Str, y1Str, x2Str, y2Str] = path.points.split(',');
    const x1 = parseFloat(x1Str);
    const y1 = parseFloat(y1Str);
    const x2 = parseFloat(x2Str);
    const y2 = parseFloat(y2Str);

    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);

    const strokeProps = {
      stroke: path.color,
      strokeWidth: path.strokeWidth,
      fill: 'none',
      opacity: path.opacity,
    };

    switch (path.shapeType) {
      case 'rectangle':
        return <Rect key={path.id} x={minX} y={minY} width={width} height={height} {...strokeProps} />;
      
      case 'circle':
        const radius = Math.sqrt(width ** 2 + height ** 2) / 2;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        return <Circle key={path.id} cx={cx} cy={cy} r={radius} {...strokeProps} />;
      
      case 'line':
        return <Line key={path.id} x1={x1} y1={y1} x2={x2} y2={y2} {...strokeProps} />;
      
      case 'triangle':
        const midX = (x1 + x2) / 2;
        return (
          <Polygon 
            key={path.id}
            points={`${midX},${minY} ${minX},${minY + height} ${minX + width},${minY + height}`}
            {...strokeProps}
          />
        );
      
      case 'arrow':
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 15;
        const headAngle = Math.PI / 6;
        const arrowX1 = x2 - headLength * Math.cos(angle - headAngle);
        const arrowY1 = y2 - headLength * Math.sin(angle - headAngle);
        const arrowX2 = x2 - headLength * Math.cos(angle + headAngle);
        const arrowY2 = y2 - headLength * Math.sin(angle + headAngle);
        return (
          <G key={path.id}>
            <Line x1={x1} y1={y1} x2={x2} y2={y2} {...strokeProps} />
            <Line x1={x2} y1={y2} x2={arrowX1} y2={arrowY1} {...strokeProps} />
            <Line x1={x2} y1={y2} x2={arrowX2} y2={arrowY2} {...strokeProps} />
          </G>
        );

      default:
        return null;
    }
  };

  // Render shape from layer data
  const renderShapeLayer = (layer: Layer) => {
    if (!layer.shape) return null;
    
    const { shapeType, strokeColor, fillColor, strokeWidth, startPoint, endPoint } = layer.shape;
    const x1 = startPoint.x;
    const y1 = startPoint.y;
    const x2 = endPoint.x;
    const y2 = endPoint.y;
    
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    
    const strokeProps = {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      fill: fillColor || 'none',
    };
    
    switch (shapeType) {
      case 'rectangle':
        return <Rect key={layer.id} x={minX} y={minY} width={width} height={height} {...strokeProps} />;
      
      case 'circle':
        const radius = Math.sqrt(width ** 2 + height ** 2) / 2;
        return <Circle key={layer.id} cx={cx} cy={cy} r={radius} {...strokeProps} />;
      
      case 'line':
        return <Line key={layer.id} x1={x1} y1={y1} x2={x2} y2={y2} {...strokeProps} />;
      
      case 'triangle':
        return (
          <Polygon 
            key={layer.id}
            points={`${cx},${minY} ${minX},${minY + height} ${minX + width},${minY + height}`}
            {...strokeProps}
          />
        );
      
      case 'arrow':
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 20;
        const headAngle = Math.PI / 6;
        return (
          <G key={layer.id}>
            <Line x1={x1} y1={y1} x2={x2} y2={y2} {...strokeProps} />
            <Line 
              x1={x2} y1={y2} 
              x2={x2 - headLength * Math.cos(angle - headAngle)} 
              y2={y2 - headLength * Math.sin(angle - headAngle)} 
              {...strokeProps} 
            />
            <Line 
              x1={x2} y1={y2} 
              x2={x2 - headLength * Math.cos(angle + headAngle)} 
              y2={y2 - headLength * Math.sin(angle + headAngle)} 
              {...strokeProps} 
            />
          </G>
        );
      
      case 'star':
        const outerRadius = Math.min(width, height) / 2;
        const innerRadius = outerRadius * 0.4;
        let starPoints = '';
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          starPoints += `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)} `;
        }
        return <Polygon key={layer.id} points={starPoints.trim()} {...strokeProps} />;
      
      case 'pentagon':
        let pentPoints = '';
        for (let i = 0; i < 5; i++) {
          const r = Math.min(width, height) / 2;
          const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          pentPoints += `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)} `;
        }
        return <Polygon key={layer.id} points={pentPoints.trim()} {...strokeProps} />;
      
      case 'hexagon':
        let hexPoints = '';
        for (let i = 0; i < 6; i++) {
          const r = Math.min(width, height) / 2;
          const a = (i * Math.PI) / 3;
          hexPoints += `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)} `;
        }
        return <Polygon key={layer.id} points={hexPoints.trim()} {...strokeProps} />;
      
      case 'heart':
        const heartSize = Math.min(width, height) / 2;
        return (
          <Path
            key={layer.id}
            d={`M ${cx} ${cy + heartSize * 0.3}
                C ${cx} ${cy - heartSize * 0.3} ${cx - heartSize} ${cy - heartSize * 0.3} ${cx - heartSize} ${cy}
                C ${cx - heartSize} ${cy + heartSize * 0.5} ${cx} ${cy + heartSize} ${cx} ${cy + heartSize}
                C ${cx} ${cy + heartSize} ${cx + heartSize} ${cy + heartSize * 0.5} ${cx + heartSize} ${cy}
                C ${cx + heartSize} ${cy - heartSize * 0.3} ${cx} ${cy - heartSize * 0.3} ${cx} ${cy + heartSize * 0.3}`}
            {...strokeProps}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { width: canvasWidth, height: canvasHeight }]}>
      {/* Canvas background */}
      <View style={styles.canvasBackground}>

        {/* Interactive image with gestures */}
        <GestureDetector gesture={composedGestures}>
          <Animated.View
            style={[
              styles.imageWrapper,
              animatedStyle,
              {
                width: fittedDimensions.width,
                height: fittedDimensions.height,
              },
            ]}
          >
            {/* Base image with background layer transform and real-time filter preview */}
            <View style={[
              styles.image,
              { zIndex: 1 }, // Background is always at bottom (z-index 1)
              backgroundLayer?.transform && {
                transform: [
                  { translateX: backgroundLayer.transform.x || 0 },
                  { translateY: backgroundLayer.transform.y || 0 },
                  { scale: backgroundLayer.transform.scale || 1 },
                  { rotate: `${backgroundLayer.transform.rotate || 0}deg` },
                ],
              },
            ]}>
              <Image
                source={{ uri: imageUri }}
                style={[
                  StyleSheet.absoluteFill,
                  Platform.OS === 'web' && cssFilterStyle,
                ]}
                resizeMode="contain"
                onLoad={handleImageLoad}
                onError={onImageError}
              />
            </View>

            {/* Lock indicator - only show if background is actually locked */}
            {backgroundLayer?.locked && (
              <View style={[styles.lockIndicator, { zIndex: 2 }]}>
                <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.5)" />
              </View>
            )}

            {/* Render layer stack (Photoshop-style compositing) */}
            {/* Layers rendered in order: first in array = bottom, last in array = top */}
            {layers
              .filter((layer) => layer.visible && layer.type !== 'background')
              .map((layer, index, filteredArray) => {
                const isSelected = selectedLayerId === layer.id;
                const isLocked = layer.locked || false;
                const layerImage = layer.imageUri || layer.source;
                // z-index: newer layers (later in array) get higher z-index
                // Start at 10 to ensure all layers are above background (z-index 1)
                const layerZIndex = index + 10;
                
                if (isSelected) {
                  // Debug: show transform for selected layer
                  // eslint-disable-next-line no-console
                  console.log('🧭 Selected layer transform:', layer.id, layer.transform);
                }

                return (
                  <GestureDetector
                    key={layer.id}
                    gesture={Gesture.Pan()
                      .minPointers(1)
                      .onBegin(() => {
                        runOnJS(onLayerSelect)?.(layer.id);
                      })
                      .onUpdate((event) => {
                        const prev = translationRefs.current[layer.id] || { x: 0, y: 0 };
                        const dx = event.translationX - prev.x;
                        const dy = event.translationY - prev.y;
                        translationRefs.current[layer.id] = { x: event.translationX, y: event.translationY };
                        if ((dx !== 0 || dy !== 0) && onLayerMove) {
                          runOnJS(onLayerMove)(layer.id, dx, dy);
                        }
                      })
                      .onEnd(() => {
                        translationRefs.current[layer.id] = { x: 0, y: 0 };
                      })
                    }
                  >
                    <Pressable
                      onPress={() => {
                        console.log('🔵 Layer tapped:', layer.id, layer.name, 'zIndex:', layerZIndex);
                        onLayerSelect?.(layer.id);
                      }}
                      style={({ pressed }) => [
                        styles.layerOverlay,
                        {
                          opacity: pressed ? (layer.opacity * 0.8) : layer.opacity,
                          transform: [
                            { translateX: layer.transform?.x || 0 },
                            { translateY: layer.transform?.y || 0 },
                            { scale: layer.transform?.scale || 1 },
                            { rotate: `${layer.transform?.rotation || layer.transform?.rotate || 0}deg` },
                          ],
                          zIndex: layerZIndex, // Newer layers (higher index) are on top
                        },
                      ]}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                  {/* Selection bounding box - different style for locked layers */}
                  {isSelected && (
                    <View style={[
                      styles.selectionBox,
                      isLocked && styles.lockedSelectionBox,
                    ]}>
                      {/* Lock indicator for locked layers */}
                      {isLocked && (
                        <View style={styles.layerLockBadge}>
                          <Ionicons name="lock-closed" size={12} color="#FFF" />
                          <Text style={styles.layerLockText}>Locked</Text>
                        </View>
                      )}
                      {/* Corner handles - only show for unlocked layers */}
                      {!isLocked && (
                        <>
                          <View style={[styles.selectionHandle, styles.handleTopLeft]} />
                          <View style={[styles.selectionHandle, styles.handleTopRight]} />
                          <View style={[styles.selectionHandle, styles.handleBottomLeft]} />
                          <View style={[styles.selectionHandle, styles.handleBottomRight]} />
                          {/* Rotation handle */}
                          <View style={styles.rotationHandle}>
                            <Ionicons name="refresh" size={14} color="#007AFF" />
                          </View>
                        </>
                      )}
                    </View>
                  )}
                  {/* Image layers with per-layer adjustments */}
                  {/* Image layers with per-layer adjustments OR live preview if selected */}
                  {layerImage && (
                    <Image
                      source={{ uri: layerImage }}
                      style={[
                        styles.image,
                        // Use filterPreview if this layer is selected, otherwise use saved adjustments
                        isSelected && filterPreview 
                          ? getLayerFilterStyle(filterPreview as any)
                          : getLayerFilterStyle(layer.adjustments),
                      ]}
                      resizeMode="contain"
                    />
                  )}
                  
                  {/* Drawing layers */}
                  {layer.drawing && layer.drawing.paths && layer.drawing.paths.length > 0 && (
                    <Svg
                      style={StyleSheet.absoluteFill}
                      width="100%"
                      height="100%"
                    >
                      {layer.drawing.paths.map((path: any, pathIndex: number) => (
                        <Path
                          key={`${layer.id}-path-${pathIndex}`}
                          d={path.points || path}
                          stroke={layer.drawing?.color || '#000'}
                          strokeWidth={layer.drawing?.strokeWidth || 3}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </Svg>
                  )}
                  
                  {/* Text layers */}
                  {layer.text && (
                    <View style={styles.textLayerContainer}>
                      <Text style={[
                        styles.textLayerText,
                        {
                          color: layer.text.color,
                          fontSize: layer.text.fontSize,
                          fontWeight: layer.text.bold ? 'bold' : 'normal',
                          fontStyle: layer.text.italic ? 'italic' : 'normal',
                          textAlign: layer.text.align,
                        }
                      ]}>
                        {layer.text.content}
                      </Text>
                    </View>
                  )}
                  
                  {/* Shape layers */}
                  {layer.shape && (
                    <Svg
                      style={StyleSheet.absoluteFill}
                      width={fittedDimensions.width}
                      height={fittedDimensions.height}
                      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {renderShapeLayer(layer)}
                    </Svg>
                  )}
                </Pressable>
                </GestureDetector>
              );
              })}

            {/* Drawing paths overlay (current drawing session) */}
            {renderDrawingPaths()}
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  canvasBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  layerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lockIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 4,
    padding: 4,
  },
  textLayerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textLayerText: {
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  selectionBox: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  lockedSelectionBox: {
    borderColor: '#FF9500',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  layerLockBadge: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 149, 0, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  layerLockText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  selectionHandle: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 2,
  },
  handleTopLeft: {
    top: -6,
    left: -6,
  },
  handleTopRight: {
    top: -6,
    right: -6,
  },
  handleBottomLeft: {
    bottom: -6,
    left: -6,
  },
  handleBottomRight: {
    bottom: -6,
    right: -6,
  },
  rotationHandle: {
    position: 'absolute',
    top: -30,
    alignSelf: 'center',
    width: 24,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperContainer: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  helperText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
});

export default InteractiveCanvas;
