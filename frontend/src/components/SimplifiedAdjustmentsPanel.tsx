/**
 * Simplified Adjustments Panel - Auralite Design
 *
 * 5 adjustment buttons at bottom with slider control above
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const { width } = Dimensions.get('window');

export interface AdjustmentValues {
  hue: number;
  saturation: number;
  brightness: number;
  exposure: number;
  contrast: number;
}

type AdjustmentType = keyof AdjustmentValues;

interface SimplifiedAdjustmentsPanelProps {
  visible: boolean;
  onApply: (values: AdjustmentValues) => void;
  onClose: () => void;
}

const ADJUSTMENTS: Array<{ key: AdjustmentType; label: string; icon: any }> = [
  { key: 'hue', label: 'Hue', icon: 'color-palette' },
  { key: 'saturation', label: 'Saturation', icon: 'water' },
  { key: 'brightness', label: 'Brightness', icon: 'sunny' },
  { key: 'exposure', label: 'Exposure', icon: 'bulb' },
  { key: 'contrast', label: 'Contrast', icon: 'contrast' },
];

const SimplifiedAdjustmentsPanel: React.FC<SimplifiedAdjustmentsPanelProps> = ({
  visible,
  onApply,
  onClose,
}) => {
  const [values, setValues] = useState<AdjustmentValues>({
    hue: 0,
    saturation: 0,
    brightness: 0,
    exposure: 0,
    contrast: 0,
  });

  const [activeAdjustment, setActiveAdjustment] = useState<AdjustmentType>('brightness');

  if (!visible) return null;

  const handleSliderChange = (value: number) => {
    setValues({ ...values, [activeAdjustment]: value });
  };

  const handleAdjustmentSelect = (key: AdjustmentType) => {
    setActiveAdjustment(key);
  };

  const currentValue = values[activeAdjustment];

  return (
    <View style={styles.container}>
      {/* Slider Area */}
      <View style={styles.sliderArea}>
        <Slider
          style={styles.slider}
          minimumValue={-100}
          maximumValue={100}
          value={currentValue}
          onValueChange={handleSliderChange}
          minimumTrackTintColor="#FFFFFF"
          maximumTrackTintColor="#666666"
          thumbTintColor="#FFFFFF"
        />

        {/* Value Display */}
        <View style={styles.valueDisplay}>
          <Text style={styles.valueText}>{Math.round(currentValue)}</Text>
        </View>
      </View>

      {/* Adjustment Buttons */}
      <View style={styles.buttonsContainer}>
        {ADJUSTMENTS.map((adj) => (
          <TouchableOpacity
            key={adj.key}
            style={[
              styles.adjustmentButton,
              activeAdjustment === adj.key && styles.adjustmentButtonActive,
            ]}
            onPress={() => handleAdjustmentSelect(adj.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={adj.icon}
              size={24}
              color={activeAdjustment === adj.key ? '#FFFFFF' : '#E0E0E0'}
            />
            <Text style={styles.adjustmentLabel}>{adj.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingBottom: 20,
  },
  sliderArea: {
    paddingHorizontal: 19,
    marginBottom: 24,
    position: 'relative',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  valueDisplay: {
    position: 'absolute',
    right: 30,
    top: -12,
    width: 32,
    height: 26,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  valueText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 29,
    gap: 16,
  },
  adjustmentButton: {
    width: 55,
    height: 55,
    backgroundColor: '#242428',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustmentButtonActive: {
    backgroundColor: '#3A3A3E',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  adjustmentLabel: {
    marginTop: 2,
    fontSize: 7,
    fontWeight: '300',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default SimplifiedAdjustmentsPanel;
