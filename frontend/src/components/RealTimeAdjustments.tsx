/**
 * Real-Time Adjustments Panel
 * 
 * Adjustments that preview in real-time on the image.
 * Inspired by ImageToolbox, PhotoDemon, and Filerobot.
 * 
 * Features:
 * - Brightness, Contrast, Saturation, Exposure
 * - Highlights, Shadows, Temperature, Tint
 * - Real-time preview using CSS filters (web) / Image manipulation (native)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

// Adjustment values interface
export interface RealTimeAdjustmentValues {
  brightness: number;      // -100 to 100
  contrast: number;        // -100 to 100
  saturation: number;      // -100 to 100
  exposure: number;        // -100 to 100
  highlights: number;      // -100 to 100
  shadows: number;         // -100 to 100
  temperature: number;     // -100 to 100 (warm/cool)
  tint: number;           // -100 to 100 (green/magenta)
  vibrance: number;        // -100 to 100
  hue: number;            // -180 to 180
  sharpness: number;       // 0 to 100
  blur: number;           // 0 to 100
  vignette: number;       // 0 to 100
  grain: number;          // 0 to 100
}

// Default values
const DEFAULT_VALUES: RealTimeAdjustmentValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  hue: 0,
  sharpness: 0,
  blur: 0,
  vignette: 0,
  grain: 0,
};

interface RealTimeAdjustmentsProps {
  visible: boolean;
  onClose: () => void;
  onPreview: (values: RealTimeAdjustmentValues) => void;
  onApply: (values: RealTimeAdjustmentValues) => void;
  onReset: () => void;
  initialValues?: Partial<RealTimeAdjustmentValues>;
}

// Adjustment categories
const ADJUSTMENT_CATEGORIES = [
  { id: 'basic', name: 'Basic', icon: 'sunny-outline' },
  { id: 'color', name: 'Color', icon: 'color-palette-outline' },
  { id: 'tone', name: 'Tone', icon: 'contrast-outline' },
  { id: 'effects', name: 'Effects', icon: 'sparkles-outline' },
];

// Adjustment definitions
const ADJUSTMENTS: Record<string, Array<{
  key: keyof RealTimeAdjustmentValues;
  name: string;
  icon: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}>> = {
  basic: [
    { key: 'brightness', name: 'Brightness', icon: 'sunny', min: -100, max: 100, step: 1 },
    { key: 'contrast', name: 'Contrast', icon: 'contrast', min: -100, max: 100, step: 1 },
    { key: 'exposure', name: 'Exposure', icon: 'flashlight', min: -100, max: 100, step: 1 },
    { key: 'saturation', name: 'Saturation', icon: 'color-fill', min: -100, max: 100, step: 1 },
  ],
  color: [
    { key: 'temperature', name: 'Temperature', icon: 'thermometer', min: -100, max: 100, step: 1 },
    { key: 'tint', name: 'Tint', icon: 'color-filter', min: -100, max: 100, step: 1 },
    { key: 'vibrance', name: 'Vibrance', icon: 'pulse', min: -100, max: 100, step: 1 },
    { key: 'hue', name: 'Hue', icon: 'color-wand', min: -180, max: 180, step: 1, suffix: '°' },
  ],
  tone: [
    { key: 'highlights', name: 'Highlights', icon: 'sunny-outline', min: -100, max: 100, step: 1 },
    { key: 'shadows', name: 'Shadows', icon: 'moon-outline', min: -100, max: 100, step: 1 },
  ],
  effects: [
    { key: 'sharpness', name: 'Sharpness', icon: 'diamond', min: 0, max: 100, step: 1 },
    { key: 'blur', name: 'Blur', icon: 'water', min: 0, max: 100, step: 1 },
    { key: 'vignette', name: 'Vignette', icon: 'ellipse', min: 0, max: 100, step: 1 },
    { key: 'grain', name: 'Grain', icon: 'grid', min: 0, max: 100, step: 1 },
  ],
};

const RealTimeAdjustments: React.FC<RealTimeAdjustmentsProps> = ({
  visible,
  onClose,
  onPreview,
  onApply,
  onReset,
  initialValues = {},
}) => {
  // State
  const [values, setValues] = useState<RealTimeAdjustmentValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [activeCategory, setActiveCategory] = useState('basic');
  const [activeSlider, setActiveSlider] = useState<keyof RealTimeAdjustmentValues | null>(null);
  
  // Animation
  const slideAnim = useRef(new Animated.Value(visible ? 0 : 300)).current;
  
  // Debounce timer
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Slide animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 300,
      useNativeDriver: true,
      friction: 12,
      tension: 50,
    }).start();
  }, [visible]);

  // Reset values when opening
  useEffect(() => {
    if (visible) {
      setValues({ ...DEFAULT_VALUES, ...initialValues });
    }
  }, [visible, initialValues]);

  // Handle value change with debounced preview
  const handleValueChange = useCallback((key: keyof RealTimeAdjustmentValues, value: number) => {
    const newValues = { ...values, [key]: value };
    setValues(newValues);
    
    // Debounce preview updates for performance
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    previewTimeoutRef.current = setTimeout(() => {
      onPreview(newValues);
    }, 16); // ~60fps
  }, [values, onPreview]);

  // Handle slider start
  const handleSliderStart = useCallback((key: keyof RealTimeAdjustmentValues) => {
    setActiveSlider(key);
  }, []);

  // Handle slider end
  const handleSliderComplete = useCallback((key: keyof RealTimeAdjustmentValues, value: number) => {
    setActiveSlider(null);
    const newValues = { ...values, [key]: value };
    setValues(newValues);
    onPreview(newValues);
  }, [values, onPreview]);

  // Reset all values
  const handleReset = useCallback(() => {
    setValues(DEFAULT_VALUES);
    onPreview(DEFAULT_VALUES);
    onReset();
  }, [onPreview, onReset]);

  // Reset single value
  const handleResetSingle = useCallback((key: keyof RealTimeAdjustmentValues) => {
    const defaultValue = DEFAULT_VALUES[key];
    const newValues = { ...values, [key]: defaultValue };
    setValues(newValues);
    onPreview(newValues);
  }, [values, onPreview]);

  // Apply changes
  const handleApply = useCallback(() => {
    onApply(values);
    onClose();
  }, [values, onApply, onClose]);

  // Check if values have changed
  const hasChanges = Object.keys(values).some(
    (key) => values[key as keyof RealTimeAdjustmentValues] !== DEFAULT_VALUES[key as keyof RealTimeAdjustmentValues]
  );

  // Render a single adjustment slider
  const renderAdjustment = (adjustment: typeof ADJUSTMENTS.basic[0]) => {
    const value = values[adjustment.key];
    const isActive = activeSlider === adjustment.key;
    const isModified = value !== DEFAULT_VALUES[adjustment.key];

    return (
      <View key={adjustment.key} style={styles.adjustmentItem}>
        <View style={styles.adjustmentHeader}>
          <View style={styles.adjustmentLabel}>
            <Ionicons 
              name={adjustment.icon as any} 
              size={16} 
              color={isModified ? COLORS.primary : '#888'} 
            />
            <Text style={[styles.adjustmentName, isModified && styles.modifiedText]}>
              {adjustment.name}
            </Text>
          </View>
          
          <View style={styles.valueContainer}>
            <Text style={[styles.valueText, isActive && styles.activeValueText]}>
              {value > 0 ? '+' : ''}{Math.round(value)}{adjustment.suffix || ''}
            </Text>
            {isModified && (
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={() => handleResetSingle(adjustment.key)}
              >
                <Ionicons name="refresh" size={14} color="#888" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <Slider
          style={styles.slider}
          minimumValue={adjustment.min}
          maximumValue={adjustment.max}
          step={adjustment.step}
          value={value}
          onValueChange={(val) => handleValueChange(adjustment.key, val)}
          onSlidingStart={() => handleSliderStart(adjustment.key)}
          onSlidingComplete={(val) => handleSliderComplete(adjustment.key, val)}
          minimumTrackTintColor={value >= 0 ? COLORS.primary : '#FF6B6B'}
          maximumTrackTintColor="#333"
          thumbTintColor={isActive ? COLORS.primary : '#FFF'}
        />
        
        {/* Center marker */}
        <View style={styles.centerMarker} />
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Adjustments</Text>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.headerButton, !hasChanges && styles.disabledButton]}
            onPress={handleReset}
            disabled={!hasChanges}
          >
            <Ionicons name="refresh" size={18} color={hasChanges ? '#FFF' : '#666'} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.applyButton, !hasChanges && styles.disabledButton]}
            onPress={handleApply}
            disabled={!hasChanges}
          >
            <Ionicons name="checkmark" size={20} color="#FFF" />
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category tabs */}
      <View style={styles.categoryTabs}>
        {ADJUSTMENT_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryTab,
              activeCategory === category.id && styles.activeCategoryTab,
            ]}
            onPress={() => setActiveCategory(category.id)}
          >
            <Ionicons 
              name={category.icon as any} 
              size={18} 
              color={activeCategory === category.id ? COLORS.primary : '#888'} 
            />
            <Text style={[
              styles.categoryText,
              activeCategory === category.id && styles.activeCategoryText,
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Adjustments */}
      <ScrollView 
        style={styles.adjustmentsList}
        showsVerticalScrollIndicator={false}
      >
        {ADJUSTMENTS[activeCategory]?.map(renderAdjustment)}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(20, 20, 20, 0.98)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '55%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    gap: 6,
  },
  applyText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.4,
  },
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
    borderRadius: 8,
  },
  activeCategoryTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryText: {
    fontSize: 12,
    color: '#888',
  },
  activeCategoryText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  adjustmentsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  adjustmentItem: {
    marginVertical: 8,
    position: 'relative',
  },
  adjustmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  adjustmentLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustmentName: {
    fontSize: 14,
    color: '#AAA',
  },
  modifiedText: {
    color: '#FFF',
    fontWeight: '500',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueText: {
    fontSize: 14,
    color: '#888',
    minWidth: 45,
    textAlign: 'right',
  },
  activeValueText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  resetButton: {
    padding: 4,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  centerMarker: {
    position: 'absolute',
    bottom: 17,
    left: '50%',
    marginLeft: -1,
    width: 2,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
  },
  bottomPadding: {
    height: 20,
  },
});

export default RealTimeAdjustments;

