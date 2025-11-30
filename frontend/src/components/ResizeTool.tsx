/**
 * Resize Tool Component
 *
 * Resize controls for selected layer
 * Features:
 * - Width and height inputs
 * - Aspect ratio lock
 * - Percentage scaling
 * - Apply/Cancel actions
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface ResizeToolProps {
  visible: boolean;
  currentWidth: number;
  currentHeight: number;
  onApply: (resizeData: ResizeData) => void;
  onCancel: () => void;
}

export interface ResizeData {
  width: number;
  height: number;
  scale: number;
}

const ResizeTool: React.FC<ResizeToolProps> = ({
  visible,
  currentWidth,
  currentHeight,
  onApply,
  onCancel,
}) => {
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [scale, setScale] = useState(100);

  const originalAspectRatio = currentWidth / currentHeight;

  // Update dimensions when scale changes
  useEffect(() => {
    const newWidth = Math.round((currentWidth * scale) / 100);
    const newHeight = Math.round((currentHeight * scale) / 100);
    setWidth(newWidth);
    setHeight(newHeight);
  }, [scale, currentWidth, currentHeight]);

  const handleWidthChange = useCallback((value: string) => {
    const newWidth = parseInt(value) || 0;
    setWidth(newWidth);

    if (lockAspectRatio) {
      const newHeight = Math.round(newWidth / originalAspectRatio);
      setHeight(newHeight);
    }

    // Update scale based on width
    const newScale = Math.round((newWidth / currentWidth) * 100);
    setScale(newScale);
  }, [lockAspectRatio, originalAspectRatio, currentWidth]);

  const handleHeightChange = useCallback((value: string) => {
    const newHeight = parseInt(value) || 0;
    setHeight(newHeight);

    if (lockAspectRatio) {
      const newWidth = Math.round(newHeight * originalAspectRatio);
      setWidth(newWidth);
    }

    // Update scale based on height
    const newScale = Math.round((newHeight / currentHeight) * 100);
    setScale(newScale);
  }, [lockAspectRatio, originalAspectRatio, currentHeight]);

  const handleApply = useCallback(() => {
    onApply({
      width,
      height,
      scale: scale / 100,
    });
  }, [width, height, scale, onApply]);

  const handleReset = useCallback(() => {
    setWidth(currentWidth);
    setHeight(currentHeight);
    setScale(100);
  }, [currentWidth, currentHeight]);

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
          <Text style={styles.headerTitle}>Resize Layer</Text>
          <TouchableOpacity onPress={handleApply} style={styles.headerButton}>
            <Ionicons name="checkmark" size={24} color={COLORS.primary} />
            <Text style={[styles.headerButtonText, { color: COLORS.primary }]}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Scale Slider */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scale: {scale}%</Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>25%</Text>
            <Slider
              style={styles.slider}
              minimumValue={25}
              maximumValue={400}
              value={scale}
              onValueChange={setScale}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
            <Text style={styles.sliderLabel}>400%</Text>
          </View>
        </View>

        {/* Dimensions */}
        <View style={styles.section}>
          <View style={styles.dimensionsHeader}>
            <Text style={styles.sectionTitle}>Dimensions</Text>
            <View style={styles.lockContainer}>
              <Ionicons
                name={lockAspectRatio ? 'lock-closed' : 'lock-open'}
                size={16}
                color={lockAspectRatio ? COLORS.primary : COLORS.textTertiary}
              />
              <Text style={styles.lockText}>Lock Ratio</Text>
              <Switch
                value={lockAspectRatio}
                onValueChange={setLockAspectRatio}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.textPrimary}
              />
            </View>
          </View>

          <View style={styles.inputsContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Width (px)</Text>
              <TextInput
                style={styles.input}
                value={width.toString()}
                onChangeText={handleWidthChange}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <Ionicons name="close" size={20} color={COLORS.textTertiary} />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height (px)</Text>
              <TextInput
                style={styles.input}
                value={height.toString()}
                onChangeText={handleHeightChange}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>
        </View>

        {/* Preview Info */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Original Size:</Text>
          <Text style={styles.previewText}>
            {currentWidth} × {currentHeight} px
          </Text>
          <Text style={styles.previewLabel}>New Size:</Text>
          <Text style={styles.previewText}>
            {width} × {height} px
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleReset} style={styles.actionButton}>
            <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
            <Text style={styles.actionButtonText}>Reset to Original</Text>
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
  section: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
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
  dimensionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  lockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  inputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
  },
  previewContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.cardLight,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  previewLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  previewText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xl,
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

export default ResizeTool;
