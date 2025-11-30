/**
 * Interactive Canvas Component
 *
 * Provides zoom/pan gestures for image editing
 * Foundation for layer-based editing system
 *
 * Features:
 * - Pinch to zoom (0.5x to 5x)
 * - Pan with gestures
 * - Double tap to reset
 * - Layer rendering support
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface Layer {
  id: string;
  type: 'image' | 'adjustment' | 'text' | 'shape' | 'drawing';
  name: string;
  visible: boolean;
  opacity: number;
  imageUri?: string;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
}

interface InteractiveCanvasProps {
  imageUri: string;
  layers?: Layer[];
  onImageLoad?: () => void;
  onImageError?: (error: any) => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  imageUri,
  layers = [],
  onImageLoad,
  onImageError,
  canvasWidth = SCREEN_WIDTH,
  canvasHeight = SCREEN_HEIGHT * 0.7, // 70% of screen for canvas
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
    const { width, height } = event.nativeEvent.source;
    setImageDimensions({ width, height });
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

  // Pan gesture
  const panGesture = Gesture.Pan()
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

  return (
    <View style={[styles.container, { width: canvasWidth, height: canvasHeight }]}>
      {/* Canvas background */}
      <View style={styles.canvasBackground}>
        {/* Zoom controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => {
              const newScale = Math.min(5, scale.value + 0.5);
              scale.value = withSpring(newScale);
              savedScale.value = newScale;
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.zoomButton}
            onPress={resetTransform}
            activeOpacity={0.7}
          >
            <Text style={styles.zoomText}>
              {Math.round(scale.value * 100)}%
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => {
              const newScale = Math.max(0.5, scale.value - 0.5);
              scale.value = withSpring(newScale);
              savedScale.value = newScale;
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

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
            {/* Base image */}
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
              onLoad={handleImageLoad}
              onError={onImageError}
            />

            {/* Render layers (placeholder for future implementation) */}
            {layers
              .filter((layer) => layer.visible)
              .map((layer) => (
                <View
                  key={layer.id}
                  style={[
                    styles.layerOverlay,
                    {
                      opacity: layer.opacity,
                      transform: [
                        { translateX: layer.transform.x },
                        { translateY: layer.transform.y },
                        { scale: layer.transform.scale },
                        { rotate: `${layer.transform.rotation}deg` },
                      ],
                    },
                  ]}
                >
                  {layer.imageUri && (
                    <Image
                      source={{ uri: layer.imageUri }}
                      style={styles.image}
                      resizeMode="contain"
                    />
                  )}
                </View>
              ))}
          </Animated.View>
        </GestureDetector>

        {/* Helper text */}
        {imageLoaded && (
          <View style={styles.helperContainer}>
            <Text style={styles.helperText}>
              Pinch to zoom • Double tap to reset • Drag to pan
            </Text>
          </View>
        )}
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
  zoomControls: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    flexDirection: 'column',
    gap: 8,
    zIndex: 10,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(50, 50, 50, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  zoomText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
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
