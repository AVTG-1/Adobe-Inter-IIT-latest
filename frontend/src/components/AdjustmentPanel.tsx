/**
 * Adjustment Panel - With Functional Sliders and ScrollView
 *
 * Provides sliders for Hue, Saturation, and Brightness adjustments
 * Height: 30% of screen, with scrolling support
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Easing,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface AdjustmentPanelProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
  onValueChange?: (type: string, value: number) => void;
  onApply?: (values: { hue: number; saturation: number; brightness: number }) => void;
}

const ADJUSTMENT_TOOLS = [
  { id: 'hue', label: 'Hue', icon: 'color-palette', min: -180, max: 180, default: 0, color: '#FF6348' },
  { id: 'saturation', label: 'Saturation', icon: 'water', min: -100, max: 100, default: 0, color: '#26DE81' },
  { id: 'brightness', label: 'Brightness', icon: 'sunny', min: -100, max: 100, default: 0, color: '#FFA502' },
];

const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({
  bottomSheetRef,
  onClose,
  onValueChange,
  onApply,
}) => {
  const [values, setValues] = useState({
    hue: 0,
    saturation: 0,
    brightness: 0,
  });

  const snapPoints = React.useMemo(() => ['30%'], []);

  // Smooth and slow animation configuration
  const animationConfigs = React.useMemo(
    () => ({
      duration: 500, // Slower animation (500ms)
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth ease-in-out curve
    }),
    []
  );

  const renderBackdrop = React.useCallback(
    (props: any) => null,
    []
  );

  const handleSliderChange = (type: string, value: number) => {
    setValues(prev => ({ ...prev, [type]: value }));
    onValueChange?.(type, value);
  };

  const resetValue = (type: string) => {
    const tool = ADJUSTMENT_TOOLS.find(t => t.id === type);
    if (tool) {
      handleSliderChange(type, tool.default);
    }
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
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Adjustments</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Scrollable Adjustment Controls */}
        <BottomSheetScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.adjustmentsContainer}>
            {ADJUSTMENT_TOOLS.map((tool) => (
              <View key={tool.id} style={styles.adjustmentItem}>
                <View style={styles.adjustmentHeader}>
                  <View style={styles.labelContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: tool.color }]}>
                      <Ionicons name={tool.icon as any} size={20} color="#FFFFFF" />
                    </View>
                    <Text style={styles.adjustmentLabel}>{tool.label}</Text>
                  </View>
                  <View style={styles.valueContainer}>
                    <Text style={styles.adjustmentValue}>
                      {Math.round(values[tool.id as keyof typeof values])}
                    </Text>
                    <TouchableOpacity
                      onPress={() => resetValue(tool.id)}
                      style={styles.resetButton}
                    >
                      <Ionicons name="refresh" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Slider
                  style={styles.slider}
                  minimumValue={tool.min}
                  maximumValue={tool.max}
                  value={values[tool.id as keyof typeof values]}
                  onValueChange={(value) => handleSliderChange(tool.id, value)}
                  minimumTrackTintColor={tool.color}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={tool.color}
                />
              </View>
            ))}

            {/* Apply Button */}
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Changes</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  closeButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  adjustmentsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
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
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  adjustmentLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#000000',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

export default AdjustmentPanel;
