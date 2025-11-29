/**
 * Tool Options Drawer
 *
 * Bottom sheet that displays tool-specific options when a tool is selected
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';

interface ToolOptionsDrawerProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  selectedTool: string | null;
  onClose: () => void;
}

// Tool-specific options configuration
const TOOL_OPTIONS: Record<string, any> = {
  crop: {
    title: 'Crop',
    options: [
      { id: 'aspect', label: 'Aspect Ratio', type: 'buttons', values: ['Free', '1:1', '4:3', '16:9'] },
    ],
  },
  filter: {
    title: 'Filter',
    options: [
      { id: 'intensity', label: 'Intensity', type: 'slider', min: 0, max: 100, default: 50 },
    ],
  },
  adjust: {
    title: 'Adjust',
    options: [
      { id: 'brightness', label: 'Brightness', type: 'slider', min: -100, max: 100, default: 0 },
      { id: 'contrast', label: 'Contrast', type: 'slider', min: -100, max: 100, default: 0 },
      { id: 'saturation', label: 'Saturation', type: 'slider', min: -100, max: 100, default: 0 },
      { id: 'hue', label: 'Hue', type: 'slider', min: 0, max: 360, default: 180 },
    ],
  },
  text: {
    title: 'Text',
    options: [
      { id: 'size', label: 'Size', type: 'slider', min: 10, max: 100, default: 24 },
      { id: 'opacity', label: 'Opacity', type: 'slider', min: 0, max: 100, default: 100 },
    ],
  },
  draw: {
    title: 'Draw',
    options: [
      { id: 'brushSize', label: 'Brush Size', type: 'slider', min: 1, max: 50, default: 5 },
      { id: 'opacity', label: 'Opacity', type: 'slider', min: 0, max: 100, default: 100 },
    ],
  },
  sticker: {
    title: 'Sticker',
    options: [
      { id: 'size', label: 'Size', type: 'slider', min: 20, max: 200, default: 80 },
      { id: 'rotation', label: 'Rotation', type: 'slider', min: 0, max: 360, default: 0 },
    ],
  },
  background: {
    title: 'Background',
    options: [
      { id: 'blur', label: 'Blur', type: 'slider', min: 0, max: 100, default: 0 },
      { id: 'opacity', label: 'Opacity', type: 'slider', min: 0, max: 100, default: 100 },
    ],
  },
  ai: {
    title: 'AI Tools',
    options: [
      { id: 'strength', label: 'Effect Strength', type: 'slider', min: 0, max: 100, default: 50 },
    ],
  },
};

export default function ToolOptionsDrawer({
  bottomSheetRef,
  selectedTool,
  onClose,
}: ToolOptionsDrawerProps) {
  const snapPoints = useMemo(() => ['40%', '60%'], []);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const toolConfig = selectedTool ? TOOL_OPTIONS[selectedTool] : null;

  const renderSlider = (option: any) => {
    const [value, setValue] = React.useState(option.default);

    return (
      <View key={option.id} style={styles.optionContainer}>
        <View style={styles.optionHeader}>
          <Text style={styles.optionLabel}>{option.label}</Text>
          <Text style={styles.optionValue}>{Math.round(value)}</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={option.min}
          maximumValue={option.max}
          value={value}
          onValueChange={setValue}
          minimumTrackTintColor="#667eea"
          maximumTrackTintColor="#e0e0e0"
          thumbTintColor="#667eea"
        />
      </View>
    );
  };

  if (!toolConfig) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer}>
        <Text style={styles.title}>{toolConfig.title}</Text>
        <View style={styles.optionsContainer}>
          {toolConfig.options.map((option: any) => {
            if (option.type === 'slider') {
              return renderSlider(option);
            }
            return null;
          })}
        </View>
      </BottomSheetView>
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
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
  },
  optionContainer: {
    marginBottom: 24,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
