/**
 * Before/After Comparison Slider
 * 
 * Inspired by ImageToolbox - Compare original vs edited image
 * Features: Swipe slider, toggle tap, side-by-side view
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  onClose: () => void;
  imageWidth?: number;
  imageHeight?: number;
}

type CompareMode = 'slider' | 'toggle' | 'sideBySide' | 'overlay';

const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  onClose,
  imageWidth = SCREEN_WIDTH,
  imageHeight = SCREEN_HEIGHT * 0.6,
}) => {
  const [sliderPosition, setSliderPosition] = useState(imageWidth / 2);
  const [compareMode, setCompareMode] = useState<CompareMode>('slider');
  const [showBefore, setShowBefore] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  
  const sliderAnim = useRef(new Animated.Value(imageWidth / 2)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newPosition = Math.max(20, Math.min(imageWidth - 20, gestureState.moveX));
        setSliderPosition(newPosition);
        sliderAnim.setValue(newPosition);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const renderSliderMode = () => (
    <View style={[styles.imageContainer, { width: imageWidth, height: imageHeight }]}>
      {/* After Image (Full - Bottom Layer) */}
      <Image
        source={{ uri: afterImage }}
        style={[styles.image, { width: imageWidth, height: imageHeight }]}
        resizeMode="contain"
      />
      
      {/* Before Image (Clipped - Top Layer) */}
      <View style={[styles.beforeContainer, { width: sliderPosition, height: imageHeight }]}>
        <Image
          source={{ uri: beforeImage }}
          style={[styles.image, { width: imageWidth, height: imageHeight }]}
          resizeMode="contain"
        />
      </View>
      
      {/* Slider Line & Handle */}
      <View 
        {...panResponder.panHandlers}
        style={[styles.sliderLine, { left: sliderPosition - 2 }]}
      >
        <View style={styles.sliderHandle}>
          <Ionicons name="code" size={20} color="#000" />
        </View>
      </View>

      {/* Labels */}
      <View style={[styles.label, styles.beforeLabel]}>
        <Text style={styles.labelText}>BEFORE</Text>
      </View>
      <View style={[styles.label, styles.afterLabel]}>
        <Text style={styles.labelText}>AFTER</Text>
      </View>
    </View>
  );

  const renderToggleMode = () => (
    <TouchableOpacity
      style={[styles.imageContainer, { width: imageWidth, height: imageHeight }]}
      onPress={() => setShowBefore(!showBefore)}
      activeOpacity={1}
    >
      <Image
        source={{ uri: showBefore ? beforeImage : afterImage }}
        style={[styles.image, { width: imageWidth, height: imageHeight }]}
        resizeMode="contain"
      />
      <View style={[styles.label, styles.centerLabel]}>
        <Text style={styles.labelText}>
          {showBefore ? 'BEFORE' : 'AFTER'}
        </Text>
        <Text style={styles.tapHint}>Tap to toggle</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSideBySideMode = () => (
    <View style={[styles.sideBySideContainer, { width: imageWidth, height: imageHeight }]}>
      <View style={styles.sideBySideImage}>
        <Image
          source={{ uri: beforeImage }}
          style={[styles.image, { width: imageWidth / 2 - 4, height: imageHeight }]}
          resizeMode="contain"
        />
        <View style={[styles.label, styles.bottomLabel]}>
          <Text style={styles.labelText}>BEFORE</Text>
        </View>
      </View>
      <View style={styles.sideBySideDivider} />
      <View style={styles.sideBySideImage}>
        <Image
          source={{ uri: afterImage }}
          style={[styles.image, { width: imageWidth / 2 - 4, height: imageHeight }]}
          resizeMode="contain"
        />
        <View style={[styles.label, styles.bottomLabel]}>
          <Text style={styles.labelText}>AFTER</Text>
        </View>
      </View>
    </View>
  );

  const renderOverlayMode = () => (
    <View style={[styles.imageContainer, { width: imageWidth, height: imageHeight }]}>
      {/* Before Image (Base) */}
      <Image
        source={{ uri: beforeImage }}
        style={[styles.image, { width: imageWidth, height: imageHeight }]}
        resizeMode="contain"
      />
      {/* After Image (Overlay with opacity) */}
      <Image
        source={{ uri: afterImage }}
        style={[
          styles.image,
          styles.overlayImage,
          { width: imageWidth, height: imageHeight, opacity: overlayOpacity }
        ]}
        resizeMode="contain"
      />
      {/* Opacity Slider */}
      <View style={styles.opacitySliderContainer}>
        <Text style={styles.opacityLabel}>Opacity: {Math.round(overlayOpacity * 100)}%</Text>
        <View style={styles.opacitySliderTrack}>
          <TouchableOpacity
            style={styles.opacitySliderFill}
            onPress={(e) => {
              const x = e.nativeEvent.locationX;
              setOverlayOpacity(Math.max(0, Math.min(1, x / 200)));
            }}
          >
            <Animated.View 
              style={[
                styles.opacitySliderThumb,
                { left: `${overlayOpacity * 100}%` }
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderCompareContent = () => {
    switch (compareMode) {
      case 'slider':
        return renderSliderMode();
      case 'toggle':
        return renderToggleMode();
      case 'sideBySide':
        return renderSideBySideMode();
      case 'overlay':
        return renderOverlayMode();
      default:
        return renderSliderMode();
    }
  };

  const COMPARE_MODES: { id: CompareMode; icon: string; label: string }[] = [
    { id: 'slider', icon: 'code-outline', label: 'Slide' },
    { id: 'toggle', icon: 'swap-horizontal-outline', label: 'Toggle' },
    { id: 'sideBySide', icon: 'albums-outline', label: 'Side' },
    { id: 'overlay', icon: 'layers-outline', label: 'Blend' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Compare</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Image Comparison Area */}
      <View style={styles.compareArea}>
        {renderCompareContent()}
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        {COMPARE_MODES.map((mode) => (
          <TouchableOpacity
            key={mode.id}
            style={[
              styles.modeButton,
              compareMode === mode.id && styles.modeButtonActive,
            ]}
            onPress={() => setCompareMode(mode.id)}
          >
            <Ionicons
              name={mode.icon as any}
              size={24}
              color={compareMode === mode.id ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.modeLabel,
                compareMode === mode.id && styles.modeLabelActive,
              ]}
            >
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  compareArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS.lg,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  beforeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    borderRightWidth: 0,
  },
  sliderLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderHandle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  label: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
  },
  beforeLabel: {
    top: 16,
    left: 16,
  },
  afterLabel: {
    top: 16,
    right: 16,
  },
  centerLabel: {
    top: 16,
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -40 }],
    alignItems: 'center',
  },
  bottomLabel: {
    bottom: 16,
    alignSelf: 'center',
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tapHint: {
    color: '#AAAAAA',
    fontSize: 10,
    marginTop: 2,
  },
  sideBySideContainer: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  sideBySideImage: {
    flex: 1,
    position: 'relative',
  },
  sideBySideDivider: {
    width: 4,
    backgroundColor: COLORS.border,
  },
  overlayImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  opacitySliderContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
  },
  opacityLabel: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  opacitySliderTrack: {
    height: 8,
    backgroundColor: '#444',
    borderRadius: 4,
    overflow: 'hidden',
  },
  opacitySliderFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    position: 'relative',
  },
  opacitySliderThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  modeButton: {
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 70,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
  },
  modeLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  modeLabelActive: {
    color: COLORS.primary,
  },
});

export default BeforeAfterSlider;

