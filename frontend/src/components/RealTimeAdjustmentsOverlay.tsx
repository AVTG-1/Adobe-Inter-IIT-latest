/**
 * Real-Time Adjustments Overlay
 * 
 * Professional adjustment panel with REAL-TIME updates:
 * - NO apply button - changes are instant
 * - Updates layer params as sliders move
 * - Commits to history when slider released
 * 
 * Adjustments: Brightness, Contrast, Saturation, Hue, Exposure
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Adjustment configuration
interface AdjustmentConfig {
  key: string;
  label: string;
  icon: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const ADJUSTMENTS: AdjustmentConfig[] = [
  { key: 'brightness', label: 'Brightness', icon: 'sunny', min: -100, max: 100, step: 1, unit: '' },
  { key: 'contrast', label: 'Contrast', icon: 'contrast', min: -100, max: 100, step: 1, unit: '' },
  { key: 'saturation', label: 'Saturation', icon: 'color-palette', min: -100, max: 100, step: 1, unit: '' },
  { key: 'hue', label: 'Hue', icon: 'color-filter', min: -180, max: 180, step: 1, unit: '°' },
  { key: 'exposure', label: 'Exposure', icon: 'aperture', min: -100, max: 100, step: 1, unit: '' },
  { key: 'highlights', label: 'Highlights', icon: 'flash', min: -100, max: 100, step: 1, unit: '' },
  { key: 'shadows', label: 'Shadows', icon: 'moon', min: -100, max: 100, step: 1, unit: '' },
  { key: 'temperature', label: 'Temperature', icon: 'thermometer', min: -100, max: 100, step: 1, unit: '' },
  { key: 'vibrance', label: 'Vibrance', icon: 'sparkles', min: -100, max: 100, step: 1, unit: '' },
  { key: 'sharpness', label: 'Sharpness', icon: 'triangle', min: 0, max: 100, step: 1, unit: '' },
];

interface AdjustmentValues {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  exposure: number;
  highlights: number;
  shadows: number;
  temperature: number;
  vibrance: number;
  sharpness: number;
}

interface RealTimeAdjustmentsOverlayProps {
  visible: boolean;
  onClose: () => void;
  values: AdjustmentValues;
  onValueChange: (key: keyof AdjustmentValues, value: number) => void;
  onValueCommit: () => void; // Called when slider released
  onReset: () => void;
}

const RealTimeAdjustmentsOverlay: React.FC<RealTimeAdjustmentsOverlayProps> = ({
  visible,
  onClose,
  values,
  onValueChange,
  onValueCommit,
  onReset,
}) => {
  const [activeSlider, setActiveSlider] = useState<string | null>(null);
  
  // Check if any value is modified
  const hasChanges = Object.values(values).some(v => v !== 0);
  
  // Handle slider change (real-time)
  const handleSliderChange = useCallback((key: keyof AdjustmentValues, value: number) => {
    onValueChange(key, Math.round(value));
  }, [onValueChange]);
  
  // Handle slider release (commit to history)
  const handleSliderComplete = useCallback(() => {
    setActiveSlider(null);
    onValueCommit();
  }, [onValueCommit]);
  
  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Adjustments</Text>
        
        {hasChanges && (
          <TouchableOpacity onPress={onReset} style={styles.resetBtn}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Sliders */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {ADJUSTMENTS.map((adjustment) => {
          const value = values[adjustment.key as keyof AdjustmentValues] || 0;
          const isActive = activeSlider === adjustment.key;
          const isModified = value !== 0;
          
          return (
            <View 
              key={adjustment.key} 
              style={[styles.sliderContainer, isActive && styles.sliderContainerActive]}
            >
              <View style={styles.sliderHeader}>
                <View style={styles.labelContainer}>
                  <Ionicons 
                    name={adjustment.icon as any} 
                    size={16} 
                    color={isModified ? '#007AFF' : '#888'} 
                  />
                  <Text style={[styles.label, isModified && styles.labelModified]}>
                    {adjustment.label}
                  </Text>
                </View>
                
                <Text style={[styles.value, isModified && styles.valueModified]}>
                  {value > 0 ? `+${value}` : value}{adjustment.unit}
                </Text>
              </View>
              
              <Slider
                style={styles.slider}
                value={value}
                minimumValue={adjustment.min}
                maximumValue={adjustment.max}
                step={adjustment.step}
                onValueChange={(v) => handleSliderChange(adjustment.key as keyof AdjustmentValues, v)}
                onSlidingStart={() => setActiveSlider(adjustment.key)}
                onSlidingComplete={handleSliderComplete}
                minimumTrackTintColor={isModified ? '#007AFF' : '#555'}
                maximumTrackTintColor="#333"
                thumbTintColor={isModified ? '#007AFF' : '#888'}
              />
              
              {/* Zero marker */}
              {adjustment.min < 0 && (
                <View style={[styles.zeroMarker, { left: `${((0 - adjustment.min) / (adjustment.max - adjustment.min)) * 100}%` }]} />
              )}
            </View>
          );
        })}
      </ScrollView>
      
      {/* Quick info */}
      <View style={styles.footer}>
        <Ionicons name="information-circle" size={14} color="#666" />
        <Text style={styles.footerText}>
          Changes apply instantly • Release slider to save
        </Text>
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
    backgroundColor: 'rgba(20, 20, 22, 0.98)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetBtn: {
    padding: 4,
  },
  resetText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  sliderContainer: {
    marginBottom: 20,
    paddingHorizontal: 4,
    position: 'relative',
  },
  sliderContainerActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    marginHorizontal: -8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  labelModified: {
    color: '#FFF',
  },
  value: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  valueModified: {
    color: '#007AFF',
  },
  slider: {
    width: '100%',
    height: 36,
  },
  zeroMarker: {
    position: 'absolute',
    bottom: 16,
    width: 2,
    height: 8,
    backgroundColor: '#555',
    transform: [{ translateX: -1 }],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  footerText: {
    color: '#666',
    fontSize: 11,
  },
});

export default RealTimeAdjustmentsOverlay;

