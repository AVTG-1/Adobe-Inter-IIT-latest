/**
 * Flip Tool Component
 *
 * Flip controls for selected layer
 * Features:
 * - Flip horizontal
 * - Flip vertical
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
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface FlipToolProps {
  visible: boolean;
  onApply: (flipData: FlipData) => void;
  onCancel: () => void;
}

export interface FlipData {
  horizontal: boolean;
  vertical: boolean;
}

const FlipTool: React.FC<FlipToolProps> = ({
  visible,
  onApply,
  onCancel,
}) => {
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);

  const handleApply = useCallback(() => {
    onApply({
      horizontal: flipHorizontal,
      vertical: flipVertical,
    });
  }, [flipHorizontal, flipVertical, onApply]);

  const handleReset = useCallback(() => {
    setFlipHorizontal(false);
    setFlipVertical(false);
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
          <Text style={styles.headerTitle}>Flip Layer</Text>
          <TouchableOpacity onPress={handleApply} style={styles.headerButton}>
            <Ionicons name="checkmark" size={24} color={COLORS.primary} />
            <Text style={[styles.headerButtonText, { color: COLORS.primary }]}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Flip Options */}
        <View style={styles.optionsContainer}>
          <Text style={styles.sectionTitle}>Flip Options</Text>

          {/* Flip Horizontal */}
          <TouchableOpacity
            style={[
              styles.flipOption,
              flipHorizontal && styles.flipOptionActive,
            ]}
            onPress={() => setFlipHorizontal(!flipHorizontal)}
          >
            <View style={styles.flipOptionLeft}>
              <Ionicons
                name="swap-horizontal"
                size={32}
                color={flipHorizontal ? COLORS.primary : COLORS.textSecondary}
              />
              <View style={styles.flipOptionText}>
                <Text
                  style={[
                    styles.flipOptionTitle,
                    flipHorizontal && styles.flipOptionTitleActive,
                  ]}
                >
                  Flip Horizontal
                </Text>
                <Text style={styles.flipOptionDescription}>
                  Mirror left to right
                </Text>
              </View>
            </View>
            <Ionicons
              name={flipHorizontal ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={flipHorizontal ? COLORS.primary : COLORS.textTertiary}
            />
          </TouchableOpacity>

          {/* Flip Vertical */}
          <TouchableOpacity
            style={[
              styles.flipOption,
              flipVertical && styles.flipOptionActive,
            ]}
            onPress={() => setFlipVertical(!flipVertical)}
          >
            <View style={styles.flipOptionLeft}>
              <Ionicons
                name="swap-vertical"
                size={32}
                color={flipVertical ? COLORS.primary : COLORS.textSecondary}
              />
              <View style={styles.flipOptionText}>
                <Text
                  style={[
                    styles.flipOptionTitle,
                    flipVertical && styles.flipOptionTitleActive,
                  ]}
                >
                  Flip Vertical
                </Text>
                <Text style={styles.flipOptionDescription}>
                  Mirror top to bottom
                </Text>
              </View>
            </View>
            <Ionicons
              name={flipVertical ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={flipVertical ? COLORS.primary : COLORS.textTertiary}
            />
          </TouchableOpacity>

          {/* Status */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {!flipHorizontal && !flipVertical && 'No flips selected'}
              {flipHorizontal && !flipVertical && 'Horizontal flip active'}
              {!flipHorizontal && flipVertical && 'Vertical flip active'}
              {flipHorizontal && flipVertical && 'Both flips active'}
            </Text>
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
  optionsContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  flipOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  flipOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  flipOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  flipOptionText: {
    gap: 4,
  },
  flipOptionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  flipOptionTitleActive: {
    color: COLORS.primary,
  },
  flipOptionDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  statusContainer: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.cardLight,
    alignItems: 'center',
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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

export default FlipTool;
