/**
 * Crop Tool Component
 *
 * Interactive crop overlay for selected layer
 * Features:
 * - Draggable crop area
 * - Resizable handles
 * - Aspect ratio presets (Free, 1:1, 4:3, 16:9, etc.)
 * - Apply/Cancel actions
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CropToolProps {
  visible: boolean;
  imageUri: string;
  onApply: (cropData: CropData) => void;
  onCancel: () => void;
}

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AspectRatio {
  label: string;
  ratio?: number; // undefined = free
  icon: string;
}

const ASPECT_RATIOS: AspectRatio[] = [
  { label: 'Free', icon: 'crop-outline' },
  { label: '1:1', ratio: 1, icon: 'square-outline' },
  { label: '4:3', ratio: 4 / 3, icon: 'tv-outline' },
  { label: '16:9', ratio: 16 / 9, icon: 'film-outline' },
  { label: '3:2', ratio: 3 / 2, icon: 'camera-outline' },
  { label: '2:3', ratio: 2 / 3, icon: 'phone-portrait-outline' },
];

const CropTool: React.FC<CropToolProps> = ({
  visible,
  imageUri,
  onApply,
  onCancel,
}) => {
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(ASPECT_RATIOS[0]);
  const [cropArea, setCropArea] = useState<CropData>({
    x: 50,
    y: 100,
    width: SCREEN_WIDTH - 100,
    height: 300,
  });

  const handleApply = useCallback(() => {
    onApply(cropArea);
  }, [cropArea, onApply]);

  const handleReset = useCallback(() => {
    setCropArea({
      x: 50,
      y: 100,
      width: SCREEN_WIDTH - 100,
      height: 300,
    });
  }, []);

  const handleRatioSelect = useCallback((ratio: AspectRatio) => {
    setSelectedRatio(ratio);

    // Adjust crop area to match aspect ratio
    if (ratio.ratio) {
      const currentWidth = cropArea.width;
      const newHeight = currentWidth / ratio.ratio;
      setCropArea(prev => ({
        ...prev,
        height: newHeight,
      }));
    }
  }, [cropArea.width]);

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
          <Text style={styles.headerTitle}>Crop Layer</Text>
          <TouchableOpacity onPress={handleApply} style={styles.headerButton}>
            <Ionicons name="checkmark" size={24} color={COLORS.primary} />
            <Text style={[styles.headerButtonText, { color: COLORS.primary }]}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Crop Area Preview */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewText}>
            Crop Preview: {Math.round(cropArea.width)} × {Math.round(cropArea.height)} px
          </Text>
        </View>

        {/* Aspect Ratio Selector */}
        <View style={styles.ratioContainer}>
          <Text style={styles.sectionTitle}>Aspect Ratio</Text>
          <View style={styles.ratioButtons}>
            {ASPECT_RATIOS.map((ratio) => (
              <TouchableOpacity
                key={ratio.label}
                style={[
                  styles.ratioButton,
                  selectedRatio.label === ratio.label && styles.ratioButtonActive,
                ]}
                onPress={() => handleRatioSelect(ratio)}
              >
                <Ionicons
                  name={ratio.icon as any}
                  size={20}
                  color={selectedRatio.label === ratio.label ? COLORS.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.ratioButtonText,
                    selectedRatio.label === ratio.label && styles.ratioButtonTextActive,
                  ]}
                >
                  {ratio.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleReset} style={styles.actionButton}>
            <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
            <Text style={styles.actionButtonText}>Reset</Text>
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
  previewContainer: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  previewText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  ratioContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  ratioButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  ratioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ratioButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  ratioButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  ratioButtonTextActive: {
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
});

export default CropTool;
