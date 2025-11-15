/**
 * Edit Expanded Panel - 35% Height Bottom Sheet
 *
 * Displays 9 editing tools in 2×5 grid layout
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface EditExpandedPanelProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onToolSelect: (toolId: string) => void;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

// 9 Editing Tools - exactly these tools in this order
const EDIT_TOOLS = [
  { id: 'crop', icon: 'crop', label: 'Crop', color: '#FF6B6B' },
  { id: 'resize', icon: 'resize', label: 'Resize', color: '#4ECDC4' },
  { id: 'rotate', icon: 'reload', label: 'Rotate', color: '#45B7D1' },
  { id: 'brightness', icon: 'sunny', label: 'Brightness', color: '#FFA502' },
  { id: 'contrast', icon: 'contrast', label: 'Contrast', color: '#A55EEA' },
  { id: 'hue', icon: 'color-palette', label: 'Hue', color: '#FF6348' },
  { id: 'saturation', icon: 'water', label: 'Saturation', color: '#26DE81' },
  { id: 'sharpness', icon: 'diamond', label: 'Sharpness', color: '#FD79A8' },
  { id: 'temperature', icon: 'thermometer', label: 'Temperature', color: '#74B9FF' },
];

const EditExpandedPanel: React.FC<EditExpandedPanelProps> = ({
  bottomSheetRef,
  onToolSelect,
  onClose,
}) => {
  const snapPoints = useMemo(() => ['35%'], []);

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
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Edit Tools</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tools Grid - 2 rows × 5 columns layout */}
        <ScrollView
          contentContainerStyle={styles.toolsGrid}
          showsVerticalScrollIndicator={false}
        >
          {EDIT_TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.toolItem}
              onPress={() => handleToolPress(tool.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIconContainer, { backgroundColor: tool.color }]}>
                <Ionicons name={tool.icon as any} size={28} color="#fff" />
              </View>
              <Text style={styles.toolLabel}>{tool.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
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
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingBottom: SPACING.md,
  },
  toolItem: {
    width: (width - SPACING.md * 2) / 5 - SPACING.xs,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  toolIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  toolLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
});

export default EditExpandedPanel;
