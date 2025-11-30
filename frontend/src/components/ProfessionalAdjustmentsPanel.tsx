/**
 * Professional Adjustments Panel
 *
 * Real-time adjustments with live preview
 * Similar to Photoshop's adjustment layers
 */

import React, { useState, useCallback, useMemo } from 'react';
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

export interface AdjustmentValues {
  brightness: number;    // -100 to 100
  contrast: number;      // -100 to 100
  saturation: number;    // -100 to 100
  exposure: number;      // -100 to 100
  highlights: number;    // -100 to 100
  shadows: number;       // -100 to 100
  vibrance: number;      // -100 to 100
  warmth: number;        // -100 to 100
  tint: number;          // -100 to 100
  sharpness: number;     // 0 to 100
}

interface ProfessionalAdjustmentsPanelProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
  onAdjust: (values: AdjustmentValues) => void; // Real-time callback
  onApply: (values: AdjustmentValues) => void;  // Final apply
  initialValues?: Partial<AdjustmentValues>;
}

interface AdjustmentControl {
  key: keyof AdjustmentValues;
  label: string;
  icon: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

const ADJUSTMENT_CONTROLS: AdjustmentControl[] = [
  { key: 'brightness', label: 'Brightness', icon: 'sunny', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'contrast', label: 'Contrast', icon: 'contrast', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'saturation', label: 'Saturation', icon: 'color-palette', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'exposure', label: 'Exposure', icon: 'bulb', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'highlights', label: 'Highlights', icon: 'flash', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'shadows', label: 'Shadows', icon: 'moon', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'vibrance', label: 'Vibrance', icon: 'sparkles', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'warmth', label: 'Warmth', icon: 'flame', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'tint', label: 'Tint', icon: 'water', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'sharpness', label: 'Sharpness', icon: 'diamond', min: 0, max: 100, step: 1, defaultValue: 0 },
];

const ProfessionalAdjustmentsPanel: React.FC<ProfessionalAdjustmentsPanelProps> = ({
  bottomSheetRef,
  onClose,
  onAdjust,
  onApply,
  initialValues = {},
}) => {
  const snapPoints = useMemo(() => ['70%'], []);

  // Initialize adjustment values
  const getInitialValues = (): AdjustmentValues => {
    const defaults: AdjustmentValues = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      highlights: 0,
      shadows: 0,
      vibrance: 0,
      warmth: 0,
      tint: 0,
      sharpness: 0,
    };
    return { ...defaults, ...initialValues };
  };

  const [values, setValues] = useState<AdjustmentValues>(getInitialValues());

  const animationConfigs = useMemo(
    () => ({
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    []
  );

  const handleValueChange = useCallback(
    (key: keyof AdjustmentValues, value: number) => {
      const newValues = { ...values, [key]: value };
      setValues(newValues);
      // Real-time preview callback
      onAdjust(newValues);
    },
    [values, onAdjust]
  );

  const handleReset = useCallback(() => {
    const resetValues = getInitialValues();
    setValues(resetValues);
    onAdjust(resetValues);
  }, [onAdjust]);

  const handleApply = useCallback(() => {
    onApply(values);
    onClose();
  }, [values, onApply, onClose]);

  const renderBackdrop = () => null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      enableContentPanningGesture={true}
      animateOnMount={true}
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Adjustments</Text>
            <Text style={styles.subtitle}>Real-time preview</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
              <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleApply} style={styles.applyButton}>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Adjustment Controls */}
        <BottomSheetScrollView style={styles.scrollView}>
          {ADJUSTMENT_CONTROLS.map((control) => (
            <View key={control.key} style={styles.controlContainer}>
              <View style={styles.controlHeader}>
                <View style={styles.controlLabelContainer}>
                  <Ionicons
                    name={control.icon as any}
                    size={18}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.controlLabel}>{control.label}</Text>
                </View>
                <Text style={styles.controlValue}>
                  {values[control.key] > 0 ? '+' : ''}
                  {values[control.key]}
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={control.min}
                maximumValue={control.max}
                step={control.step}
                value={values[control.key]}
                onValueChange={(value) => handleValueChange(control.key, value)}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.primary}
              />
            </View>
          ))}
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.cardLight,
  },
  resetButtonText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  applyButtonText: {
    fontSize: FONT_SIZES.xs,
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    paddingHorizontal: SPACING.md,
  },
  controlContainer: {
    marginVertical: SPACING.sm,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  controlLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  controlLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  controlValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.primary,
    minWidth: 40,
    textAlign: 'right',
  },
  slider: {
    height: 40,
  },
});

export default ProfessionalAdjustmentsPanel;
