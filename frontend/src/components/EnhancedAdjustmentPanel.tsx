/**
 * Enhanced Adjustment Panel - Advanced Image Adjustments
 *
 * Includes: Brightness, Contrast, Saturation, Exposure, Vibrance,
 * Highlights, Shadows, Temperature, Tint, Sharpness, Grain
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Easing,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface EnhancedAdjustmentPanelProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
  onValueChange?: (type: string, value: number) => void;
  onApply?: (values: AdjustmentValues) => void;
}

export interface AdjustmentValues {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  vibrance: number;
  highlights: number;
  shadows: number;
  temperature: number;
  tint: number;
  sharpness: number;
  grain: number;
}

interface AdjustmentTool {
  id: keyof AdjustmentValues;
  label: string;
  icon: string;
  min: number;
  max: number;
  default: number;
  color: string;
  step?: number;
}

const ADJUSTMENT_TOOLS: AdjustmentTool[] = [
  // BASIC ADJUSTMENTS
  { id: 'brightness', label: 'Brightness', icon: 'sunny', min: -100, max: 100, default: 0, color: '#FFA502', step: 1 },
  { id: 'contrast', label: 'Contrast', icon: 'contrast', min: -100, max: 100, default: 0, color: '#4B7BEC', step: 1 },
  { id: 'saturation', label: 'Saturation', icon: 'water', min: -100, max: 100, default: 0, color: '#26DE81', step: 1 },
  { id: 'exposure', label: 'Exposure', icon: 'aperture', min: -100, max: 100, default: 0, color: '#FD79A8', step: 1 },

  // COLOR ADJUSTMENTS
  { id: 'vibrance', label: 'Vibrance', icon: 'color-fill', min: -100, max: 100, default: 0, color: '#A29BFE', step: 1 },
  { id: 'temperature', label: 'Temperature', icon: 'thermometer', min: -100, max: 100, default: 0, color: '#FF7675', step: 1 },
  { id: 'tint', label: 'Tint', icon: 'color-palette', min: -100, max: 100, default: 0, color: '#FF6348', step: 1 },

  // TONE ADJUSTMENTS
  { id: 'highlights', label: 'Highlights', icon: 'flash', min: -100, max: 100, default: 0, color: '#F0F0F0', step: 1 },
  { id: 'shadows', label: 'Shadows', icon: 'moon', min: -100, max: 100, default: 0, color: '#2D3436', step: 1 },

  // DETAIL ADJUSTMENTS
  { id: 'sharpness', label: 'Sharpness', icon: 'cut', min: 0, max: 100, default: 0, color: '#00B894', step: 1 },
  { id: 'grain', label: 'Grain', icon: 'grid', min: 0, max: 100, default: 0, color: '#FDCB6E', step: 1 },
];

const EnhancedAdjustmentPanel: React.FC<EnhancedAdjustmentPanelProps> = ({
  bottomSheetRef,
  onClose,
  onValueChange,
  onApply,
}) => {
  const [values, setValues] = useState<AdjustmentValues>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    vibrance: 0,
    highlights: 0,
    shadows: 0,
    temperature: 0,
    tint: 0,
    sharpness: 0,
    grain: 0,
  });

  const snapPoints = React.useMemo(() => ['50%'], []);

  const animationConfigs = React.useMemo(
    () => ({
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    []
  );

  const renderBackdrop = React.useCallback(() => null, []);

  const handleSliderChange = (type: keyof AdjustmentValues, value: number) => {
    setValues(prev => ({ ...prev, [type]: value }));
    onValueChange?.(type, value);
  };

  const resetValue = (type: keyof AdjustmentValues) => {
    const tool = ADJUSTMENT_TOOLS.find(t => t.id === type);
    if (tool) {
      handleSliderChange(type, tool.default);
    }
  };

  const resetAll = () => {
    const resetValues: AdjustmentValues = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      vibrance: 0,
      highlights: 0,
      shadows: 0,
      temperature: 0,
      tint: 0,
      sharpness: 0,
      grain: 0,
    };
    setValues(resetValues);
  };

  const handleClose = () => {
    onClose();
    bottomSheetRef.current?.close();
  };

  const handleApply = () => {
    onApply?.(values);
    handleClose();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      enableContentPanningGesture={false}
      animateOnMount={true}
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Adjustments</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={resetAll} style={styles.resetAllButton}>
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
              <Text style={styles.resetAllText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Adjustment Controls */}
        <BottomSheetScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.adjustmentsContainer}>
            {ADJUSTMENT_TOOLS.map(tool => (
              <View key={tool.id} style={styles.adjustmentItem}>
                <View style={styles.adjustmentHeader}>
                  <View style={styles.labelContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: tool.color }]}>
                      <Ionicons name={tool.icon as any} size={18} color="#FFF" />
                    </View>
                    <Text style={styles.adjustmentLabel}>{tool.label}</Text>
                  </View>
                  <View style={styles.valueContainer}>
                    <Text style={styles.adjustmentValue}>
                      {Math.round(values[tool.id])}
                    </Text>
                    <TouchableOpacity
                      onPress={() => resetValue(tool.id)}
                      style={styles.resetButton}
                    >
                      <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Slider
                  style={styles.slider}
                  minimumValue={tool.min}
                  maximumValue={tool.max}
                  value={values[tool.id]}
                  onValueChange={(value) => handleSliderChange(tool.id, value)}
                  minimumTrackTintColor={tool.color}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={tool.color}
                  step={tool.step || 1}
                />
              </View>
            ))}

            {/* Apply Button */}
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Ionicons name="checkmark-circle" size={24} color="#000" />
              <Text style={styles.applyButtonText}>Apply Adjustments</Text>
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
    height: '100%',
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
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  resetAllText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  adjustmentsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  adjustmentItem: {
    marginBottom: SPACING.lg,
  },
  adjustmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustmentLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustmentValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
    minWidth: 40,
    textAlign: 'right',
  },
  resetButton: {
    padding: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginTop: SPACING.xl,
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.lg,
    gap: 8,
  },
  applyButtonText: {
    color: '#000000',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

export default EnhancedAdjustmentPanel;
