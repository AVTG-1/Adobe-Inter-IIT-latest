/**
 * Transform Tools Panel - Bottom Sheet
 *
 * Quick access to transformation tools for selected layer:
 * - Crop
 * - Rotate
 * - Flip
 * - Resize
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Easing,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface TransformToolsPanelProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
  onCrop: () => void;
  onRotate: () => void;
  onFlip: () => void;
  onResize: () => void;
  selectedLayerName?: string;
}

interface TransformTool {
  id: string;
  name: string;
  icon: string;
  description: string;
  onPress: () => void;
}

const TransformToolsPanel: React.FC<TransformToolsPanelProps> = ({
  bottomSheetRef,
  onClose,
  onCrop,
  onRotate,
  onFlip,
  onResize,
  selectedLayerName = 'No layer selected',
}) => {
  const snapPoints = useMemo(() => ['40%'], []);

  const animationConfigs = useMemo(
    () => ({
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    []
  );

  const tools: TransformTool[] = [
    {
      id: 'crop',
      name: 'Crop',
      icon: 'crop',
      description: 'Crop layer to custom size',
      onPress: onCrop,
    },
    {
      id: 'rotate',
      name: 'Rotate',
      icon: 'sync',
      description: 'Rotate layer by any angle',
      onPress: onRotate,
    },
    {
      id: 'flip',
      name: 'Flip',
      icon: 'swap-horizontal',
      description: 'Flip horizontally or vertically',
      onPress: onFlip,
    },
    {
      id: 'resize',
      name: 'Resize',
      icon: 'expand',
      description: 'Resize layer dimensions',
      onPress: onResize,
    },
  ];

  const renderBackdrop = () => null;

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
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Transform Tools</Text>
            <Text style={styles.subtitle}>Layer: {selectedLayerName}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tools Grid */}
        <View style={styles.toolsGrid}>
          {tools.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.toolCard}
              onPress={tool.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.toolIconContainer}>
                <Ionicons name={tool.icon as any} size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.toolName}>{tool.name}</Text>
              <Text style={styles.toolDescription}>{tool.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  closeButton: {
    padding: SPACING.xs,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  toolCard: {
    width: '48%',
    backgroundColor: COLORS.cardLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  toolIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  toolName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  toolDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});

export default TransformToolsPanel;
