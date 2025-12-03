/**
 * Professional Adjustments Panel
 * Real-time image adjustments like Photoshop
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/theme';
import { AdjustmentValues } from './CanvasEditor';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AdjustmentsPanelProps {
  visible: boolean;
  values: AdjustmentValues;
  onValuesChange: (values: Partial<AdjustmentValues>) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
  layerName?: string;
}

interface AdjustmentSlider {
  key: keyof AdjustmentValues;
  label: string;
  icon: string;
  min: number;
  max: number;
  step: number;
  description: string;
}

const ADJUSTMENTS: AdjustmentSlider[] = [
  { key: 'brightness', label: 'Brightness', icon: 'sunny', min: -100, max: 100, step: 1, description: 'Adjust overall lightness' },
  { key: 'contrast', label: 'Contrast', icon: 'contrast', min: -100, max: 100, step: 1, description: 'Increase/decrease tonal range' },
  { key: 'saturation', label: 'Saturation', icon: 'color-palette', min: -100, max: 100, step: 1, description: 'Adjust color intensity' },
  { key: 'exposure', label: 'Exposure', icon: 'aperture', min: -100, max: 100, step: 1, description: 'Simulate camera exposure' },
  { key: 'highlights', label: 'Highlights', icon: 'flashlight', min: -100, max: 100, step: 1, description: 'Adjust bright areas' },
  { key: 'shadows', label: 'Shadows', icon: 'moon', min: -100, max: 100, step: 1, description: 'Adjust dark areas' },
  { key: 'hue', label: 'Hue', icon: 'color-filter', min: -180, max: 180, step: 1, description: 'Shift all colors' },
];

const DEFAULT_VALUES: AdjustmentValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  hue: 0,
};

const AdjustmentsPanel: React.FC<AdjustmentsPanelProps> = ({
  visible,
  values,
  onValuesChange,
  onApply,
  onReset,
  onClose,
  layerName,
}) => {
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Check if any value differs from default
    const changed = Object.keys(values).some(
      (key) => values[key as keyof AdjustmentValues] !== DEFAULT_VALUES[key as keyof AdjustmentValues]
    );
    setHasChanges(changed);
  }, [values]);

  const handleSliderChange = useCallback((key: keyof AdjustmentValues, value: number) => {
    onValuesChange({ [key]: Math.round(value) });
  }, [onValuesChange]);

  const handleResetSingle = useCallback((key: keyof AdjustmentValues) => {
    onValuesChange({ [key]: DEFAULT_VALUES[key] });
  }, [onValuesChange]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Adjustments</Text>
          {layerName && (
            <Text style={styles.layerIndicator}>
              <Ionicons name="layers" size={12} color={COLORS.primary} /> {layerName}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, !hasChanges && styles.headerButtonDisabled]}
            onPress={onReset}
            disabled={!hasChanges}
          >
            <Ionicons name="refresh" size={20} color={hasChanges ? COLORS.textSecondary : COLORS.border} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={16} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Adjustments apply to the selected layer only
        </Text>
      </View>

      {/* Adjustment Sliders */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {ADJUSTMENTS.map((adj) => {
          const value = values[adj.key];
          const isChanged = value !== DEFAULT_VALUES[adj.key];
          
          return (
            <View key={adj.key} style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <View style={styles.sliderLabel}>
                  <Ionicons name={adj.icon as any} size={16} color={isChanged ? COLORS.primary : COLORS.textSecondary} />
                  <Text style={[styles.labelText, isChanged && styles.labelTextActive]}>
                    {adj.label}
                  </Text>
                </View>
                <View style={styles.valueContainer}>
                  <Text style={[styles.valueText, isChanged && styles.valueTextActive]}>
                    {value > 0 ? '+' : ''}{value}
                  </Text>
                  {isChanged && (
                    <TouchableOpacity
                      style={styles.resetButton}
                      onPress={() => handleResetSingle(adj.key)}
                    >
                      <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.sliderRow}>
                {/* Min label */}
                <Text style={styles.rangeLabel}>{adj.min}</Text>
                
                <View style={styles.sliderWrapper}>
                  {/* Center marker */}
                  <View style={styles.centerMarker} />
                  
                  <Slider
                    style={styles.slider}
                    minimumValue={adj.min}
                    maximumValue={adj.max}
                    value={value}
                    step={adj.step}
                    onValueChange={(v) => handleSliderChange(adj.key, v)}
                    minimumTrackTintColor={value >= 0 ? COLORS.primary : COLORS.textSecondary}
                    maximumTrackTintColor={value >= 0 ? COLORS.textSecondary : COLORS.primary}
                    thumbTintColor={COLORS.primary}
                  />
                </View>

                {/* Max label */}
                <Text style={styles.rangeLabel}>{adj.max}</Text>
              </View>

              <Text style={styles.description}>{adj.description}</Text>
            </View>
          );
        })}

        {/* Quick Presets */}
        <View style={styles.presetsSection}>
          <Text style={styles.presetTitle}>Quick Presets</Text>
          <View style={styles.presetGrid}>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => onValuesChange({ brightness: 20, contrast: 10, saturation: 15 })}
            >
              <Ionicons name="sunny" size={20} color={COLORS.primary} />
              <Text style={styles.presetLabel}>Vivid</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => onValuesChange({ brightness: -10, contrast: 30, saturation: -20 })}
            >
              <Ionicons name="moon" size={20} color={COLORS.primary} />
              <Text style={styles.presetLabel}>Drama</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => onValuesChange({ saturation: -100 })}
            >
              <Ionicons name="contrast" size={20} color={COLORS.textSecondary} />
              <Text style={styles.presetLabel}>B&W</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => onValuesChange({ brightness: 15, saturation: -30, hue: 20 })}
            >
              <Ionicons name="leaf" size={20} color="#4CAF50" />
              <Text style={styles.presetLabel}>Vintage</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Apply Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.applyButton, !hasChanges && styles.applyButtonDisabled]}
          onPress={onApply}
          disabled={!hasChanges}
        >
          <Ionicons name="checkmark" size={20} color="#FFF" />
          <Text style={styles.applyText}>Apply Adjustments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    maxHeight: 500,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flex: 1,
  },
  title: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  layerIndicator: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerButton: { padding: 4 },
  headerButtonDisabled: { opacity: 0.4 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  content: { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  sliderSection: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '50',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  labelTextActive: {
    color: COLORS.primary,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: COLORS.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  valueTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  resetButton: {
    padding: 2,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  rangeLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    width: 30,
    textAlign: 'center',
  },
  sliderWrapper: {
    flex: 1,
    position: 'relative',
  },
  centerMarker: {
    position: 'absolute',
    left: '50%',
    top: 10,
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
    marginLeft: -1,
    borderRadius: 1,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  description: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  presetsSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  presetGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  presetButton: {
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 70,
  },
  presetLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    gap: 8,
  },
  applyButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  applyText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  cancelButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
});

export default AdjustmentsPanel;

