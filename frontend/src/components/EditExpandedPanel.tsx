/**
 * Edit Expanded Panel - Bottom Sheet
 *
 * Displays 9 editing tools when Edit is pressed
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface EditExpandedPanelProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onToolSelect: (toolId: string) => void;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

// 9 Editing Tools with colorful icons
const EDIT_TOOLS = [
  { id: 'crop', icon: 'crop', label: 'Crop', color: '#FF6B6B' },
  { id: 'resize', icon: 'resize', label: 'Resize', color: '#4ECDC4' },
  { id: 'rotate', icon: 'reload', label: 'Rotate', color: '#45B7D1' },
  { id: 'brightness', icon: 'sunny', label: 'Brightness', color: '#FFA502' },
  { id: 'contrast', icon: 'contrast', label: 'Contrast', color: '#A55EEA' },
  { id: 'hue', icon: 'color-palette', label: 'Hue', color: '#FF6348' },
  { id: 'saturation', icon: 'water', label: 'Saturation', color: '#26DE81' },
  { id: 'tint', icon: 'color-filter', label: 'Tint', color: '#FC5C65' },
  { id: 'sharpness', icon: 'diamond', label: 'Sharpness', color: '#FD79A8' },
];

const EditExpandedPanel: React.FC<EditExpandedPanelProps> = ({
  bottomSheetRef,
  onToolSelect,
  onClose,
}) => {
  const snapPoints = useMemo(() => ['50%', '70%'], []);

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.5}
    />
  );

  const handleToolPress = (toolId: string) => {
    onToolSelect(toolId);
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
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Edit Tools</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tools Grid */}
        <View style={styles.toolsGrid}>
          {EDIT_TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.toolItem}
              onPress={() => handleToolPress(tool.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIconContainer, { backgroundColor: tool.color }]}>
                <Ionicons name={tool.icon as any} size={32} color="#fff" />
              </View>
              <Text style={styles.toolLabel}>{tool.label}</Text>
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
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  toolItem: {
    width: (width - SPACING.lg * 2 - SPACING.md * 2) / 3,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  toolIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toolLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
});

export default EditExpandedPanel;
