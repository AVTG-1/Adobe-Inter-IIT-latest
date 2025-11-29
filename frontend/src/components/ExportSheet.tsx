/**
 * Export Sheet
 *
 * Bottom sheet for exporting edited images in various formats
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Easing } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

export type ExportFormat = 'jpg' | 'png' | 'psd';

interface ExportOption {
  format: ExportFormat;
  title: string;
  description: string;
  icon: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: 'jpg',
    title: 'JPEG',
    description: 'Compressed image, smaller file size',
    icon: 'image',
  },
  {
    format: 'png',
    title: 'PNG',
    description: 'Lossless quality, supports transparency',
    icon: 'images',
  },
  {
    format: 'psd',
    title: 'PSD',
    description: 'Photoshop format with layers',
    icon: 'layers',
  },
];

interface ExportSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onExport: (format: ExportFormat) => void;
  onClose: () => void;
}

export default function ExportSheet({
  bottomSheetRef,
  onExport,
  onClose,
}: ExportSheetProps) {
  const snapPoints = useMemo(() => ['50%'], []);

  // Smooth and slow animation configuration
  const animationConfigs = useMemo(
    () => ({
      duration: 500, // Slower animation (500ms)
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth ease-in-out curve
    }),
    []
  );

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const handleExportOption = (format: ExportFormat) => {
    onExport(format);
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      animationConfigs={animationConfigs}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Export Image</Text>
          <Text style={styles.subtitle}>Choose a format to save your work</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {EXPORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.format}
            style={styles.optionItem}
            onPress={() => handleExportOption(option.format)}
            activeOpacity={0.7}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name={option.icon as any} size={28} color="#667eea" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  handleIndicator: {
    backgroundColor: '#d0d0d0',
    width: 40,
    height: 4,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  optionsContainer: {
    flex: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8ebfc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#999',
  },
});
