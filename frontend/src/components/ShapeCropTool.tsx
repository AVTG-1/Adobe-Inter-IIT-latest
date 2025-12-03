/**
 * Shape Crop Tool - Crop Images with Various Shapes
 * 
 * Inspired by ImageToolbox - 15+ shape masks for creative cropping
 * Features: Circle, Heart, Star, Hexagon, Custom shapes, Preview
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Rect, Polygon, Path, Defs, ClipPath, G } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShapeCropToolProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
  onApply: (shape: ShapeCropConfig) => void;
  imageUrl: string;
}

export interface ShapeCropConfig {
  shapeId: string;
  shapeName: string;
  svgPath?: string;
  rotation: number;
  scale: number;
  borderRadius?: number;
}

interface ShapeOption {
  id: string;
  name: string;
  icon: string;
  category: ShapeCategory;
  svgRenderer: (size: number, fill: string) => React.ReactNode;
}

type ShapeCategory = 'basic' | 'geometric' | 'fun' | 'custom';

const PREVIEW_SIZE = 200;

// Define shapes with their SVG renderers
const SHAPES: ShapeOption[] = [
  // Basic Shapes
  {
    id: 'circle',
    name: 'Circle',
    icon: 'ellipse-outline',
    category: 'basic',
    svgRenderer: (size, fill) => (
      <Circle cx={size/2} cy={size/2} r={size/2 - 2} fill={fill} />
    ),
  },
  {
    id: 'square',
    name: 'Square',
    icon: 'square-outline',
    category: 'basic',
    svgRenderer: (size, fill) => (
      <Rect x={2} y={2} width={size-4} height={size-4} fill={fill} />
    ),
  },
  {
    id: 'rounded-square',
    name: 'Rounded',
    icon: 'square-outline',
    category: 'basic',
    svgRenderer: (size, fill) => (
      <Rect x={2} y={2} width={size-4} height={size-4} rx={size/6} fill={fill} />
    ),
  },
  {
    id: 'oval',
    name: 'Oval',
    icon: 'ellipse-outline',
    category: 'basic',
    svgRenderer: (size, fill) => (
      <Rect x={2} y={size/4} width={size-4} height={size/2} rx={size/4} fill={fill} />
    ),
  },

  // Geometric Shapes
  {
    id: 'triangle',
    name: 'Triangle',
    icon: 'triangle-outline',
    category: 'geometric',
    svgRenderer: (size, fill) => (
      <Polygon points={`${size/2},4 ${size-4},${size-4} 4,${size-4}`} fill={fill} />
    ),
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    icon: 'hexagon-outline',
    category: 'geometric',
    svgRenderer: (size, fill) => {
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 4;
      const points = Array.from({ length: 6 }, (_, i) => {
        const angle = (i * 60 - 90) * Math.PI / 180;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      }).join(' ');
      return <Polygon points={points} fill={fill} />;
    },
  },
  {
    id: 'octagon',
    name: 'Octagon',
    icon: 'stop-outline',
    category: 'geometric',
    svgRenderer: (size, fill) => {
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 4;
      const points = Array.from({ length: 8 }, (_, i) => {
        const angle = (i * 45 - 22.5) * Math.PI / 180;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      }).join(' ');
      return <Polygon points={points} fill={fill} />;
    },
  },
  {
    id: 'pentagon',
    name: 'Pentagon',
    icon: 'pentagon-outline',
    category: 'geometric',
    svgRenderer: (size, fill) => {
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 4;
      const points = Array.from({ length: 5 }, (_, i) => {
        const angle = (i * 72 - 90) * Math.PI / 180;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      }).join(' ');
      return <Polygon points={points} fill={fill} />;
    },
  },
  {
    id: 'diamond',
    name: 'Diamond',
    icon: 'diamond-outline',
    category: 'geometric',
    svgRenderer: (size, fill) => (
      <Polygon points={`${size/2},4 ${size-4},${size/2} ${size/2},${size-4} 4,${size/2}`} fill={fill} />
    ),
  },

  // Fun Shapes
  {
    id: 'heart',
    name: 'Heart',
    icon: 'heart-outline',
    category: 'fun',
    svgRenderer: (size, fill) => {
      const scale = size / 100;
      return (
        <Path
          d={`M ${50*scale} ${88*scale} 
              C ${20*scale} ${60*scale} ${5*scale} ${35*scale} ${25*scale} ${20*scale} 
              C ${40*scale} ${8*scale} ${50*scale} ${20*scale} ${50*scale} ${30*scale} 
              C ${50*scale} ${20*scale} ${60*scale} ${8*scale} ${75*scale} ${20*scale} 
              C ${95*scale} ${35*scale} ${80*scale} ${60*scale} ${50*scale} ${88*scale} Z`}
          fill={fill}
        />
      );
    },
  },
  {
    id: 'star',
    name: 'Star',
    icon: 'star-outline',
    category: 'fun',
    svgRenderer: (size, fill) => {
      const cx = size / 2;
      const cy = size / 2;
      const outerR = size / 2 - 4;
      const innerR = outerR * 0.4;
      const points = Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * 36 - 90) * Math.PI / 180;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      }).join(' ');
      return <Polygon points={points} fill={fill} />;
    },
  },
  {
    id: 'star-6',
    name: '6-Star',
    icon: 'star-outline',
    category: 'fun',
    svgRenderer: (size, fill) => {
      const cx = size / 2;
      const cy = size / 2;
      const outerR = size / 2 - 4;
      const innerR = outerR * 0.5;
      const points = Array.from({ length: 12 }, (_, i) => {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * 30 - 90) * Math.PI / 180;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      }).join(' ');
      return <Polygon points={points} fill={fill} />;
    },
  },
  {
    id: 'cloud',
    name: 'Cloud',
    icon: 'cloud-outline',
    category: 'fun',
    svgRenderer: (size, fill) => {
      const scale = size / 100;
      return (
        <Path
          d={`M ${25*scale} ${60*scale} 
              A ${15*scale} ${15*scale} 0 1 1 ${35*scale} ${40*scale}
              A ${20*scale} ${20*scale} 0 1 1 ${65*scale} ${40*scale}
              A ${15*scale} ${15*scale} 0 1 1 ${75*scale} ${60*scale}
              L ${25*scale} ${60*scale} Z`}
          fill={fill}
        />
      );
    },
  },
  {
    id: 'arrow',
    name: 'Arrow',
    icon: 'arrow-forward-outline',
    category: 'fun',
    svgRenderer: (size, fill) => {
      const scale = size / 100;
      return (
        <Polygon
          points={`${100*scale},${50*scale} ${60*scale},${20*scale} ${60*scale},${40*scale} ${10*scale},${40*scale} ${10*scale},${60*scale} ${60*scale},${60*scale} ${60*scale},${80*scale}`}
          fill={fill}
        />
      );
    },
  },
  {
    id: 'cross',
    name: 'Cross',
    icon: 'add-outline',
    category: 'fun',
    svgRenderer: (size, fill) => {
      const scale = size / 100;
      return (
        <Polygon
          points={`${35*scale},${10*scale} ${65*scale},${10*scale} ${65*scale},${35*scale} ${90*scale},${35*scale} ${90*scale},${65*scale} ${65*scale},${65*scale} ${65*scale},${90*scale} ${35*scale},${90*scale} ${35*scale},${65*scale} ${10*scale},${65*scale} ${10*scale},${35*scale} ${35*scale},${35*scale}`}
          fill={fill}
        />
      );
    },
  },
];

const CATEGORIES: { id: ShapeCategory; label: string }[] = [
  { id: 'basic', label: 'Basic' },
  { id: 'geometric', label: 'Geometric' },
  { id: 'fun', label: 'Fun' },
];

const ShapeCropTool: React.FC<ShapeCropToolProps> = ({
  bottomSheetRef,
  onClose,
  onApply,
  imageUrl,
}) => {
  const [selectedShape, setSelectedShape] = useState<string>('circle');
  const [selectedCategory, setSelectedCategory] = useState<ShapeCategory>('basic');
  const [rotation, setRotation] = useState<number>(0);
  const [scale, setScale] = useState<number>(100);

  const snapPoints = useMemo(() => ['85%'], []);

  const animationConfigs = useMemo(
    () => ({
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    []
  );

  const filteredShapes = useMemo(() =>
    SHAPES.filter(s => s.category === selectedCategory),
    [selectedCategory]
  );

  const currentShape = SHAPES.find(s => s.id === selectedShape);

  const handleApply = () => {
    if (currentShape) {
      onApply({
        shapeId: selectedShape,
        shapeName: currentShape.name,
        rotation,
        scale: scale / 100,
      });
    }
    onClose();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      animationConfigs={animationConfigs}
      onClose={onClose}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Shape Crop</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Preview */}
            <View style={styles.previewSection}>
              <Text style={styles.sectionTitle}>Preview</Text>
              <View style={styles.previewContainer}>
                <View style={styles.previewWrapper}>
                  <Svg width={PREVIEW_SIZE} height={PREVIEW_SIZE}>
                    <Defs>
                      <ClipPath id="shapeClip">
                        <G transform={`translate(${PREVIEW_SIZE/2}, ${PREVIEW_SIZE/2}) rotate(${rotation}) scale(${scale/100}) translate(${-PREVIEW_SIZE/2}, ${-PREVIEW_SIZE/2})`}>
                          {currentShape?.svgRenderer(PREVIEW_SIZE, '#FFF')}
                        </G>
                      </ClipPath>
                    </Defs>
                    <Rect
                      width={PREVIEW_SIZE}
                      height={PREVIEW_SIZE}
                      fill="#2A2A2A"
                      clipPath="url(#shapeClip)"
                    />
                    {/* Shape outline */}
                    <G transform={`rotate(${rotation}, ${PREVIEW_SIZE/2}, ${PREVIEW_SIZE/2})`}>
                      {currentShape?.svgRenderer(PREVIEW_SIZE * (scale/100), 'none')}
                    </G>
                  </Svg>
                  <Text style={styles.previewLabel}>{currentShape?.name || 'Select a shape'}</Text>
                </View>
              </View>
            </View>

            {/* Category Tabs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryButton,
                      selectedCategory === cat.id && styles.categoryButtonActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        selectedCategory === cat.id && styles.categoryTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Shapes Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shapes</Text>
              <View style={styles.shapesGrid}>
                {filteredShapes.map(shape => (
                  <TouchableOpacity
                    key={shape.id}
                    style={[
                      styles.shapeCard,
                      selectedShape === shape.id && styles.shapeCardSelected,
                    ]}
                    onPress={() => setSelectedShape(shape.id)}
                    activeOpacity={0.7}
                  >
                    <Svg width={50} height={50}>
                      {shape.svgRenderer(50, selectedShape === shape.id ? COLORS.primary : '#666')}
                    </Svg>
                    <Text style={styles.shapeName}>{shape.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Rotation */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sectionTitle}>Rotation</Text>
                <Text style={styles.sliderValue}>{rotation}°</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={360}
                value={rotation}
                onValueChange={(v) => setRotation(Math.round(v))}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.primary}
              />
              <View style={styles.quickRotations}>
                {[0, 45, 90, 180, 270].map(angle => (
                  <TouchableOpacity
                    key={angle}
                    style={[
                      styles.quickButton,
                      rotation === angle && styles.quickButtonActive,
                    ]}
                    onPress={() => setRotation(angle)}
                  >
                    <Text style={styles.quickButtonText}>{angle}°</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Scale */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sectionTitle}>Scale</Text>
                <Text style={styles.sliderValue}>{scale}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={50}
                maximumValue={150}
                value={scale}
                onValueChange={(v) => setScale(Math.round(v))}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.primary}
              />
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={24} color="#000" />
              <Text style={styles.applyButtonText}>Apply Shape Crop</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: COLORS.border,
    width: 40,
  },
  container: {
    flex: 1,
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
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  previewSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  previewContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  previewWrapper: {
    alignItems: 'center',
  },
  previewLabel: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  categoryText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryTextActive: {
    color: COLORS.primary,
  },
  shapesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shapeCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  shapeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  shapeName: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  quickRotations: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  quickButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.card,
  },
  quickButtonActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  quickButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.lg,
    gap: 8,
    marginTop: SPACING.lg,
  },
  applyButtonText: {
    color: '#000000',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

export default ShapeCropTool;

