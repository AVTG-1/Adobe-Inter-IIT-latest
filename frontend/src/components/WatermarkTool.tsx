/**
 * Watermark Tool - Add Text & Image Watermarks
 * 
 * Inspired by ImageToolbox - Professional watermarking capabilities
 * Features: Text watermark, image watermark, tiled pattern, position control
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Easing,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface WatermarkToolProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
  onApply: (watermark: WatermarkConfig) => void;
}

export interface WatermarkConfig {
  type: 'text' | 'image' | 'pattern';
  text?: string;
  imageUri?: string;
  position: WatermarkPosition;
  opacity: number;
  size: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  rotation: number;
  tiled: boolean;
  tileSpacing: number;
}

type WatermarkPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

const POSITIONS: { id: WatermarkPosition; icon: string }[] = [
  { id: 'top-left', icon: 'arrow-up' },
  { id: 'top-center', icon: 'arrow-up' },
  { id: 'top-right', icon: 'arrow-up' },
  { id: 'center-left', icon: 'remove' },
  { id: 'center', icon: 'ellipse' },
  { id: 'center-right', icon: 'remove' },
  { id: 'bottom-left', icon: 'arrow-down' },
  { id: 'bottom-center', icon: 'arrow-down' },
  { id: 'bottom-right', icon: 'arrow-down' },
];

const PRESET_COLORS = [
  '#FFFFFF', // White
  '#000000', // Black
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#808080', // Gray
  '#FFA500', // Orange
];

const PRESET_TEXTS = [
  '© Copyright',
  'CONFIDENTIAL',
  'DRAFT',
  'SAMPLE',
  'DO NOT COPY',
  'PREVIEW',
];

const WatermarkTool: React.FC<WatermarkToolProps> = ({
  bottomSheetRef,
  onClose,
  onApply,
}) => {
  const [watermarkType, setWatermarkType] = useState<'text' | 'image' | 'pattern'>('text');
  const [watermarkText, setWatermarkText] = useState('© Your Name');
  const [position, setPosition] = useState<WatermarkPosition>('bottom-right');
  const [opacity, setOpacity] = useState(50);
  const [fontSize, setFontSize] = useState(24);
  const [color, setColor] = useState('#FFFFFF');
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [rotation, setRotation] = useState(0);
  const [tiled, setTiled] = useState(false);
  const [tileSpacing, setTileSpacing] = useState(100);

  const snapPoints = useMemo(() => ['75%'], []);

  const animationConfigs = useMemo(
    () => ({
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    []
  );

  const handleApply = () => {
    onApply({
      type: watermarkType,
      text: watermarkText,
      position,
      opacity: opacity / 100,
      size: fontSize,
      color,
      fontWeight,
      rotation,
      tiled,
      tileSpacing,
    });
    onClose();
  };

  const renderPresetTexts = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.presetRow}>
        {PRESET_TEXTS.map((text) => (
          <TouchableOpacity
            key={text}
            style={[
              styles.presetButton,
              watermarkText === text && styles.presetButtonActive,
            ]}
            onPress={() => setWatermarkText(text)}
          >
            <Text
              style={[
                styles.presetButtonText,
                watermarkText === text && styles.presetButtonTextActive,
              ]}
            >
              {text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderPositionGrid = () => (
    <View style={styles.positionGrid}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.positionRow}>
          {[0, 1, 2].map((col) => {
            const index = row * 3 + col;
            const pos = POSITIONS[index];
            return (
              <TouchableOpacity
                key={pos.id}
                style={[
                  styles.positionButton,
                  position === pos.id && styles.positionButtonActive,
                ]}
                onPress={() => setPosition(pos.id)}
              >
                <View
                  style={[
                    styles.positionDot,
                    position === pos.id && styles.positionDotActive,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );

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
          <Text style={styles.title}>Watermark</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Type</Text>
              <View style={styles.typeRow}>
                {[
                  { id: 'text', icon: 'text-outline', label: 'Text' },
                  { id: 'pattern', icon: 'grid-outline', label: 'Tiled' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      watermarkType === type.id && styles.typeButtonActive,
                    ]}
                    onPress={() => {
                      setWatermarkType(type.id as any);
                      if (type.id === 'pattern') setTiled(true);
                      else setTiled(false);
                    }}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={24}
                      color={watermarkType === type.id ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        watermarkType === type.id && styles.typeLabelActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Text Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Watermark Text</Text>
              <TextInput
                style={styles.textInput}
                value={watermarkText}
                onChangeText={setWatermarkText}
                placeholder="Enter watermark text..."
                placeholderTextColor={COLORS.textTertiary}
                maxLength={50}
              />
              {renderPresetTexts()}
            </View>

            {/* Preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preview</Text>
              <View style={styles.previewContainer}>
                <View style={styles.previewImage}>
                  <Text
                    style={[
                      styles.previewWatermark,
                      {
                        color: color,
                        opacity: opacity / 100,
                        fontSize: Math.min(fontSize, 18),
                        fontWeight,
                        transform: [{ rotate: `${rotation}deg` }],
                      },
                    ]}
                  >
                    {watermarkText}
                  </Text>
                </View>
              </View>
            </View>

            {/* Position */}
            {!tiled && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Position</Text>
                {renderPositionGrid()}
              </View>
            )}

            {/* Opacity */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sectionTitle}>Opacity</Text>
                <Text style={styles.sliderValue}>{opacity}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={10}
                maximumValue={100}
                value={opacity}
                onValueChange={(v) => setOpacity(Math.round(v))}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.primary}
              />
            </View>

            {/* Font Size */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sectionTitle}>Size</Text>
                <Text style={styles.sliderValue}>{fontSize}px</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={12}
                maximumValue={72}
                value={fontSize}
                onValueChange={(v) => setFontSize(Math.round(v))}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.primary}
              />
            </View>

            {/* Rotation */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sectionTitle}>Rotation</Text>
                <Text style={styles.sliderValue}>{rotation}°</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={-45}
                maximumValue={45}
                value={rotation}
                onValueChange={(v) => setRotation(Math.round(v))}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.primary}
              />
            </View>

            {/* Tiled Pattern Spacing */}
            {tiled && (
              <View style={styles.section}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sectionTitle}>Tile Spacing</Text>
                  <Text style={styles.sliderValue}>{tileSpacing}px</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={50}
                  maximumValue={200}
                  value={tileSpacing}
                  onValueChange={(v) => setTileSpacing(Math.round(v))}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.primary}
                />
              </View>
            )}

            {/* Color */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Color</Text>
              <View style={styles.colorsGrid}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorButton,
                      { backgroundColor: c },
                      color === c && styles.colorButtonActive,
                    ]}
                    onPress={() => setColor(c)}
                  >
                    {color === c && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={c === '#FFFFFF' || c === '#FFFF00' || c === '#00FF00' ? '#000' : '#FFF'}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Font Weight */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Style</Text>
              <View style={styles.styleRow}>
                <TouchableOpacity
                  style={[
                    styles.styleButton,
                    fontWeight === 'normal' && styles.styleButtonActive,
                  ]}
                  onPress={() => setFontWeight('normal')}
                >
                  <Text style={styles.styleButtonText}>Regular</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.styleButton,
                    fontWeight === 'bold' && styles.styleButtonActive,
                  ]}
                  onPress={() => setFontWeight('bold')}
                >
                  <Text style={[styles.styleButtonText, { fontWeight: 'bold' }]}>Bold</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={24} color="#000" />
              <Text style={styles.applyButtonText}>Apply Watermark</Text>
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
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  typeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  typeLabelActive: {
    color: COLORS.primary,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: SPACING.xs,
  },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.card,
  },
  presetButtonActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  presetButtonText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  presetButtonTextActive: {
    color: COLORS.primary,
  },
  previewContainer: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#2A2A2A',
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewWatermark: {
    textAlign: 'center',
  },
  positionGrid: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  positionButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  positionButtonActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  positionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  positionDotActive: {
    backgroundColor: COLORS.primary,
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
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonActive: {
    borderColor: COLORS.primary,
  },
  styleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  styleButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  styleButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  styleButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.lg,
    gap: 8,
    marginTop: SPACING.md,
  },
  applyButtonText: {
    color: '#000000',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

export default WatermarkTool;

