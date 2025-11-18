/**
 * Adjustment Panel - With Functional Sliders
 *
 * Provides sliders for Hue, Saturation, and Brightness adjustments
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface AdjustmentPanelProps {
  visible: boolean;
  onClose: () => void;
  onValueChange?: (type: string, value: number) => void;
}

const ADJUSTMENT_TOOLS = [
  { id: 'hue', label: 'Hue', icon: 'color-palette', min: -180, max: 180, default: 0, color: '#FF6348' },
  { id: 'saturation', label: 'Saturation', icon: 'water', min: -100, max: 100, default: 0, color: '#26DE81' },
  { id: 'brightness', label: 'Brightness', icon: 'sunny', min: -100, max: 100, default: 0, color: '#FFA502' },
];

const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({
  visible,
  onClose,
  onValueChange,
}) => {
  const [values, setValues] = useState({
    hue: 0,
    saturation: 0,
    brightness: 0,
  });

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

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Adjustments</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Adjustment Controls */}
      <View style={styles.adjustmentsContainer}>
        {ADJUSTMENT_TOOLS.map((tool) => (
          <View key={tool.id} style={styles.adjustmentItem}>
            <View style={styles.adjustmentHeader}>
              <View style={styles.labelContainer}>
                <View style={[styles.iconCircle, { backgroundColor: tool.color }]}>
                  <Ionicons name={tool.icon as any} size={20} color="#fff" />
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
                  <Ionicons name="refresh" size={18} color={COLORS.textSecondary} />
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
      </View>

      {/* Apply Button */}
      <TouchableOpacity style={styles.applyButton} onPress={onClose}>
        <Text style={styles.applyButtonText}>Apply Changes</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingBottom: SPACING.xl,
    maxHeight: '50%',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  adjustmentsContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
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
    fontWeight: 'bold',
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
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#000',
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
  },
});

export default AdjustmentPanel;
