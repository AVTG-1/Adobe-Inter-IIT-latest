/**
 * Real-Time Adjustment Panel - Auralite Design
 * 
 * SAME UI as SimplifiedAdjustmentsPanel but with:
 * - Real-time CSS filter preview (instant)
 * - Applies ONLY to selected layer
 * - No destructive edits
 */

import React, { useState, useCallback, useEffect } from 'react';
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

// Convert our values to CSS filter string for instant preview
export const valuesToCSSFilter = (values: AdjustmentValues): string => {
  const brightness = 1 + (values.brightness / 100) * 0.5;
  const contrast = 1 + (values.contrast / 100) * 0.5;
  const saturate = 1 + (values.saturation / 100);
  const hueRotate = values.hue;
  const exposureBright = 1 + (values.exposure / 100) * 0.3;
  
  return `brightness(${brightness * exposureBright}) contrast(${contrast}) saturate(${saturate}) hue-rotate(${hueRotate}deg)`;
};

// Convert to FilterPreview format for InteractiveCanvas
export const valuesToFilterPreview = (values: AdjustmentValues) => ({
  brightness: values.brightness,
  contrast: values.contrast,
  saturation: values.saturation,
  hue: values.hue,
});

const ADJUSTMENTS: Array<{ key: AdjustmentType; label: string; icon: any }> = [
  { key: 'hue', label: 'Hue', icon: 'color-palette' },
  { key: 'saturation', label: 'Saturation', icon: 'water' },
  { key: 'brightness', label: 'Brightness', icon: 'sunny' },
  { key: 'exposure', label: 'Exposure', icon: 'bulb' },
  { key: 'contrast', label: 'Contrast', icon: 'contrast' },
];

const DEFAULT_VALUES: AdjustmentValues = {
  hue: 0,
  saturation: 0,
  brightness: 0,
  exposure: 0,
  contrast: 0,
};

interface RealTimeAdjustPanelProps {
  visible: boolean;
  onClose: () => void;
  onFilterChange: (filter: ReturnType<typeof valuesToFilterPreview>) => void;
  onCommit?: () => void;
  selectedLayerId?: string | null;
  selectedLayerName?: string;
  initialValues?: AdjustmentValues;  // Load existing values from layer
}

const RealTimeAdjustPanel: React.FC<RealTimeAdjustPanelProps> = ({
  visible,
  onClose,
  onFilterChange,
  onCommit,
  selectedLayerId,
  selectedLayerName,
  initialValues,
}) => {
  const [values, setValues] = useState<AdjustmentValues>({ ...DEFAULT_VALUES });
  const [activeAdjustment, setActiveAdjustment] = useState<AdjustmentType>('brightness');

  // Load initial values from layer when panel opens
  useEffect(() => {
    if (visible) {
      // Use initial values if provided, otherwise reset to default
      if (initialValues) {
        setValues({ ...DEFAULT_VALUES, ...initialValues });
        // Apply initial filter preview
        requestAnimationFrame(() => {
          onFilterChange(valuesToFilterPreview({ ...DEFAULT_VALUES, ...initialValues }));
        });
      } else {
        setValues({ ...DEFAULT_VALUES });
      }
    }
  }, [visible, initialValues]);

  // REAL-TIME: Update filter preview as slider moves
  const handleSliderChange = useCallback((value: number) => {
    const newValues = { ...values, [activeAdjustment]: value };
    setValues(newValues);
    // Call onFilterChange AFTER state update to avoid setState during render
    requestAnimationFrame(() => {
      onFilterChange(valuesToFilterPreview(newValues));
    });
  }, [activeAdjustment, onFilterChange, values]);

  const handleAdjustmentSelect = useCallback((key: AdjustmentType) => {
    setActiveAdjustment(key);
  }, []);

  const handleDone = useCallback(() => {
    // Commit to history when closing
    onCommit?.();
    onClose();
  }, [onCommit, onClose]);

  const handleCancel = useCallback(() => {
    // Reset and clear filter
    setValues({ ...DEFAULT_VALUES });
    onFilterChange(valuesToFilterPreview(DEFAULT_VALUES));
    onClose();
  }, [onClose, onFilterChange]);

  const handleReset = useCallback(() => {
    setValues({ ...DEFAULT_VALUES });
    onFilterChange(valuesToFilterPreview(DEFAULT_VALUES));
  }, [onFilterChange]);

  if (!visible) return null;

  const currentValue = values[activeAdjustment];
  const hasChanges = Object.values(values).some(v => v !== 0);

  return (
    <View style={styles.container}>
      {/* Header with title and action buttons */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={22} color="#FF3B30" />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Adjustments</Text>
          {selectedLayerName && (
            <Text style={styles.layerIndicator}>→ {selectedLayerName}</Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.headerButton, !hasChanges && styles.disabledButton]} 
          onPress={handleDone}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark" size={22} color={hasChanges ? "#34C759" : "#888"} />
          <Text style={[styles.applyText, !hasChanges && styles.disabledText]}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Real-time indicator */}
      <View style={styles.realtimeIndicator}>
        <Ionicons name="flash" size={12} color="#007AFF" />
        <Text style={styles.realtimeText}>Real-time preview • Changes apply instantly</Text>
      </View>

      {/* Reset button */}
      {hasChanges && (
        <TouchableOpacity 
          style={styles.resetButton} 
          onPress={handleReset}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={16} color="#AAA" />
          <Text style={styles.resetText}>Reset All</Text>
        </TouchableOpacity>
      )}

      {/* Slider Area */}
      <View style={styles.sliderArea}>
        <Text style={styles.sliderLabel}>
          {ADJUSTMENTS.find(a => a.key === activeAdjustment)?.label}
        </Text>
        
        <View style={styles.sliderRow}>
          <Text style={styles.minMaxText}>-100</Text>
          <Slider
            style={styles.slider}
            minimumValue={-100}
            maximumValue={100}
            value={currentValue}
            onValueChange={handleSliderChange}
            onSlidingComplete={() => onCommit?.()}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#666666"
            thumbTintColor="#FFFFFF"
          />
          <Text style={styles.minMaxText}>+100</Text>
        </View>

        {/* Value Display */}
        <View style={styles.valueDisplay}>
          <Text style={styles.valueText}>{Math.round(currentValue)}</Text>
        </View>
      </View>

      {/* Adjustment Buttons */}
      <View style={styles.buttonsContainer}>
        {ADJUSTMENTS.map((adj) => {
          const isActive = activeAdjustment === adj.key;
          const hasValue = values[adj.key] !== 0;
          
          return (
            <TouchableOpacity
              key={adj.key}
              style={[
                styles.adjustmentButton,
                isActive && styles.adjustmentButtonActive,
                hasValue && !isActive && styles.adjustmentButtonModified,
              ]}
              onPress={() => handleAdjustmentSelect(adj.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={adj.icon}
                size={24}
                color={isActive ? '#FFFFFF' : hasValue ? '#007AFF' : '#E0E0E0'}
              />
              <Text style={[
                styles.adjustmentLabel,
                hasValue && !isActive && styles.adjustmentLabelModified,
              ]}>
                {adj.label}
              </Text>
              {hasValue && (
                <View style={styles.modifiedIndicator}>
                  <Text style={styles.modifiedValue}>
                    {values[adj.key] > 0 ? '+' : ''}{Math.round(values[adj.key])}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
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
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    paddingBottom: 30,
    paddingTop: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  layerIndicator: {
    fontSize: 10,
    color: '#007AFF',
    marginTop: 2,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  applyText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
  },
  disabledText: {
    color: '#666',
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  realtimeText: {
    fontSize: 11,
    color: '#007AFF',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    marginBottom: 8,
  },
  resetText: {
    fontSize: 12,
    color: '#AAA',
  },
  sliderArea: {
    paddingHorizontal: 19,
    marginBottom: 20,
    position: 'relative',
  },
  sliderLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minMaxText: {
    color: '#888',
    fontSize: 10,
    width: 30,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  valueDisplay: {
    position: 'absolute',
    right: 30,
    top: -6,
    minWidth: 40,
    height: 26,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  valueText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    gap: 8,
  },
  adjustmentButton: {
    flex: 1,
    maxWidth: 65,
    aspectRatio: 1,
    backgroundColor: '#242428',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  adjustmentButtonActive: {
    backgroundColor: '#007AFF',
    borderWidth: 0,
  },
  adjustmentButtonModified: {
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  adjustmentLabel: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  adjustmentLabelModified: {
    color: '#007AFF',
  },
  modifiedIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  modifiedValue: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default RealTimeAdjustPanel;
