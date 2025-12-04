/**
 * Rotate Tool Component
 *
 * Rotation controls for selected layer
 * Features:
 * - Quick rotate: 90°, 180°, 270° buttons
 * - Free rotation: slider for any angle
 * - Apply/Cancel actions
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

interface RotateToolProps {
  visible: boolean;
  currentRotation: number; // Current rotation in degrees
  onApply: (rotation: number) => void;
  onCancel: () => void;
}

const RotateTool: React.FC<RotateToolProps> = ({
  visible,
  currentRotation,
  onApply,
  onCancel,
}) => {
  const [rotation, setRotation] = useState(currentRotation);

  const handleQuickRotate = useCallback((degrees: number) => {
    setRotation(prev => (prev + degrees) % 360);
  }, []);

  const handleApply = useCallback(() => {
    onApply(rotation);
  }, [rotation, onApply]);

  const handleReset = useCallback(() => {
    setRotation(0);
  }, []);

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
          <Text style={styles.headerTitle}>Rotate Layer</Text>
          <TouchableOpacity onPress={handleApply} style={styles.headerButton}>
            <Ionicons name="checkmark" size={24} color={COLORS.primary} />
            <Text style={[styles.headerButtonText, { color: COLORS.primary }]}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Rotation Display */}
        <View style={styles.displayContainer}>
          <Text style={styles.rotationValue}>{Math.round(rotation)}°</Text>
          <Text style={styles.displayLabel}>Current Rotation</Text>
        </View>

        {/* Quick Rotate Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Rotate</Text>
          <View style={styles.quickButtons}>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => handleQuickRotate(90)}
            >
              <Ionicons name="arrow-undo" size={24} color={COLORS.textPrimary} />
              <Text style={styles.quickButtonText}>90° Left</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => handleQuickRotate(180)}
            >
              <Ionicons name="swap-vertical" size={24} color={COLORS.textPrimary} />
              <Text style={styles.quickButtonText}>180°</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => handleQuickRotate(-90)}
            >
              <Ionicons name="arrow-redo" size={24} color={COLORS.textPrimary} />
              <Text style={styles.quickButtonText}>90° Right</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Free Rotation Slider */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fine Tune Rotation</Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>0°</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={360}
              value={rotation}
              onValueChange={setRotation}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
            <Text style={styles.sliderLabel}>360°</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleReset} style={styles.actionButton}>
            <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
            <Text style={styles.actionButtonText}>Reset to 0°</Text>
          </TouchableOpacity>
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
  displayContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  rotationValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  displayLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  section: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  quickButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: SPACING.sm,
  },
  quickButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surface,
  },
  quickButtonText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontWeight: '600',
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
});

export default RotateTool;
