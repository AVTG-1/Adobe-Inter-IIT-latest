/**
 * Add Menu Sheet - Clean 3-Option Import Menu
 *
 * Shows 3 options: Import, Replace, Add Object
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Easing,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface AddMenuSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onOptionSelect: (option: string) => void;
  onClose: () => void;
}

const ADD_OPTIONS = [
  { id: 'import', icon: 'cloud-download-outline', label: 'Import' },
  { id: 'replace', icon: 'swap-horizontal-outline', label: 'Replace' },
  { id: 'add_object', icon: 'add-circle-outline', label: 'Add Object' },
];

const AddMenuSheet: React.FC<AddMenuSheetProps> = ({
  bottomSheetRef,
  onOptionSelect,
  onClose,
}) => {
  const snapPoints = React.useMemo(() => ['25%'], []);

  // Smooth and slow animation configuration
  const animationConfigs = React.useMemo(
    () => ({
      duration: 500, // Slower animation (500ms)
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth ease-in-out curve
    }),
    []
  );

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
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
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Import Options</Text>
      </View>

      <BottomSheetScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.optionsList}>
          {ADD_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionButton}
              onPress={() => handleOptionPress(option.id)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name={option.icon as any}
                  size={28}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.optionLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: COLORS.border,
    width: 40,
  },
  container: {
    paddingHorizontal: SPACING.lg,
  },
  scrollContent: {
    paddingBottom: SPACING.md,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  optionsList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: SPACING.md,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  optionLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});

export default AddMenuSheet;
