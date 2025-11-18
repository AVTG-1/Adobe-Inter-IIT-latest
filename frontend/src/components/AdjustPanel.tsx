/**
 * Adjust Panel - Horizontal Scrollable Strip
 *
 * Shows adjustment tools: Brightness, Contrast, Saturation, etc.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface AdjustPanelProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onAdjustSelect: (adjust: string) => void;
  onClose: () => void;
}

const ADJUST_TOOLS = [
  { id: 'brightness', icon: 'sunny-outline', label: 'Brightness' },
  { id: 'contrast', icon: 'contrast-outline', label: 'Contrast' },
  { id: 'saturation', icon: 'color-palette-outline', label: 'Saturation' },
  { id: 'exposure', icon: 'aperture-outline', label: 'Exposure' },
  { id: 'warmth', icon: 'thermometer-outline', label: 'Warmth' },
  { id: 'shadows', icon: 'moon-outline', label: 'Shadows' },
  { id: 'highlights', icon: 'flash-outline', label: 'Highlights' },
  { id: 'sharpness', icon: 'diamond-outline', label: 'Sharpness' },
  { id: 'clarity', icon: 'sparkles-outline', label: 'Clarity' },
];

const AdjustPanel: React.FC<AdjustPanelProps> = ({
  bottomSheetRef,
  onAdjustSelect,
  onClose,
}) => {
  const snapPoints = React.useMemo(() => ['15%'], []);

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.2}
      />
    ),
    []
  );

  const handleAdjustPress = (adjustId: string) => {
    onAdjustSelect(adjustId);
  };

  const handleClose = () => {
    bottomSheetRef.current?.close();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {ADJUST_TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={styles.adjustItem}
                onPress={() => handleAdjustPress(tool.id)}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name={tool.icon as any} size={24} color={COLORS.textPrimary} />
                </View>
                <Text style={styles.label}>{tool.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </BottomSheetView>
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
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  adjustItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  closeButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
});

export default AdjustPanel;
