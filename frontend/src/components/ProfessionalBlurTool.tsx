/**
 * Professional Blur Tool
 *
 * Real-time blur with adjustable radius
 * Similar to Photoshop's Gaussian Blur
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

export interface BlurData {
  radius: number; // 0-25
}

interface ProfessionalBlurToolProps {
  visible: boolean;
  onApply: (blurData: BlurData) => void;
  onCancel: () => void;
  onPreview?: (blurData: BlurData) => void; // Real-time preview
}

const ProfessionalBlurTool: React.FC<ProfessionalBlurToolProps> = ({
  visible,
  onApply,
  onCancel,
  onPreview,
}) => {
  const [radius, setRadius] = useState(10);

  const handleRadiusChange = useCallback(
    (value: number) => {
      setRadius(value);
      // Real-time preview
      if (onPreview) {
        onPreview({ radius: value });
      }
    },
    [onPreview]
  );

  const handleApply = useCallback(() => {
    onApply({ radius });
  }, [radius, onApply]);

  const handleReset = useCallback(() => {
    const defaultRadius = 10;
    setRadius(defaultRadius);
    if (onPreview) {
      onPreview({ radius: defaultRadius });
    }
  }, [onPreview]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gaussian Blur</Text>
          <TouchableOpacity onPress={handleApply} style={styles.headerButton}>
            <Ionicons name="checkmark" size={24} color={COLORS.primary} />
            <Text style={[styles.headerButtonText, { color: COLORS.primary }]}>
              Apply
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preview Info */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Blur Radius</Text>
          <Text style={styles.previewValue}>{radius.toFixed(1)} px</Text>
          <Text style={styles.previewHint}>
            {radius === 0 && 'No blur'}
            {radius > 0 && radius <= 5 && 'Subtle blur'}
            {radius > 5 && radius <= 15 && 'Medium blur'}
            {radius > 15 && 'Strong blur'}
          </Text>
        </View>

        {/* Blur Radius Control */}
        <View style={styles.controlSection}>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>None</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={25}
              step={0.5}
              value={radius}
              onValueChange={handleRadiusChange}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
            <Text style={styles.sliderLabel}>Max</Text>
          </View>

          {/* Quick Presets */}
          <View style={styles.presetsContainer}>
            <Text style={styles.presetsTitle}>Quick Presets</Text>
            <View style={styles.presetButtons}>
              {[
                { label: 'Subtle', value: 3 },
                { label: 'Normal', value: 10 },
                { label: 'Strong', value: 20 },
              ].map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    styles.presetButton,
                    radius === preset.value && styles.presetButtonActive,
                  ]}
                  onPress={() => handleRadiusChange(preset.value)}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      radius === preset.value && styles.presetButtonTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleReset} style={styles.actionButton}>
            <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
            <Text style={styles.actionButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={16} color={COLORS.textTertiary} />
          <Text style={styles.infoText}>
            Adjust the slider for real-time blur preview
          </Text>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.cardLight,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  previewLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  previewValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  previewHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  controlSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xl,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  presetsContainer: {
    marginTop: SPACING.xl,
  },
  presetsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  presetButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  presetButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  presetButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  presetButtonTextActive: {
    color: COLORS.primary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surface,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.cardLight,
    borderRadius: BORDER_RADIUS.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    flex: 1,
  },
});

export default ProfessionalBlurTool;
