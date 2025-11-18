/**
 * Add Menu Sheet - 20% Height Compact Popup
 *
 * Shows 5 options: Text, Shape, Sticker, Brush, Import New Image
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface AddMenuSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onOptionSelect: (option: string) => void;
  onClose: () => void;
}

const ADD_OPTIONS = [
  { id: 'add_photo', icon: 'add-circle-outline', label: 'Add photo' },
  { id: 'replace_photo', icon: 'swap-horizontal-outline', label: 'Replace photo' },
  { id: 'gallery', icon: 'images-outline', label: 'Import from gallery' },
  { id: 'camera', icon: 'camera-outline', label: 'Import from camera' },
  { id: 'png_overlay', icon: 'layers-outline', label: 'Add PNG overlay' },
  { id: 'draw', icon: 'brush-outline', label: 'Paint / Draw mode' },
];

const AddMenuSheet: React.FC<AddMenuSheetProps> = ({
  bottomSheetRef,
  onOptionSelect,
  onClose,
}) => {
  const snapPoints = React.useMemo(() => ['20%'], []);

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

  const handleOptionPress = (optionId: string) => {
    onOptionSelect(optionId);
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
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Element</Text>
        </View>

        <View style={styles.optionsList}>
          {ADD_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionButton}
              onPress={() => handleOptionPress(option.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={option.icon as any}
                size={24}
                color={COLORS.textPrimary}
              />
              <Text style={styles.optionLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: COLORS.surface,
  },
  handleIndicator: {
    backgroundColor: COLORS.border,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  header: {
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  optionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  optionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 70,
  },
  optionLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default AddMenuSheet;
