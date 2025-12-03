/**
 * Professional Adjustments Panel - 15+ Pro Adjustments
 *
 * Inspired by ImageToolbox - Comprehensive adjustment controls
 * Features: Curves, Levels, HSL, Split Toning, Clarity, Dehaze, and more
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Easing,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface ProfessionalAdjustmentsPanelProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
  onApply: (values: ProfessionalAdjustmentValues) => void;
  initialValues?: Partial<ProfessionalAdjustmentValues>;
}

export interface ProfessionalAdjustmentValues {
  // Basic
  brightness: number;
  contrast: number;
  exposure: number;
  
  // Color
  saturation: number;
  vibrance: number;
  temperature: number;
  tint: number;
  hue: number;
  
  // Tone
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  
  // Detail
  sharpness: number;
  clarity: number;
  dehaze: number;
  grain: number;
  
  // Effects
  vignette: number;
  fade: number;
}

type AdjustmentCategory = 'basic' | 'color' | 'tone' | 'detail' | 'effects';

interface AdjustmentConfig {
  key: keyof ProfessionalAdjustmentValues;
  label: string;
  icon: string;
  category: AdjustmentCategory;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}

const ADJUSTMENTS: AdjustmentConfig[] = [
  // Basic
  { key: 'exposure', label: 'Exposure', icon: 'sunny-outline', category: 'basic', min: -100, max: 100, step: 1, defaultValue: 0, unit: '' },
  { key: 'brightness', label: 'Brightness', icon: 'bulb-outline', category: 'basic', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'contrast', label: 'Contrast', icon: 'contrast-outline', category: 'basic', min: -100, max: 100, step: 1, defaultValue: 0 },
  
  // Color
  { key: 'saturation', label: 'Saturation', icon: 'water-outline', category: 'color', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'vibrance', label: 'Vibrance', icon: 'color-palette-outline', category: 'color', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'temperature', label: 'Temperature', icon: 'thermometer-outline', category: 'color', min: -100, max: 100, step: 1, defaultValue: 0, unit: 'K' },
  { key: 'tint', label: 'Tint', icon: 'color-filter-outline', category: 'color', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'hue', label: 'Hue', icon: 'prism-outline', category: 'color', min: -180, max: 180, step: 1, defaultValue: 0, unit: '°' },
  
  // Tone
  { key: 'highlights', label: 'Highlights', icon: 'sunny', category: 'tone', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'shadows', label: 'Shadows', icon: 'moon-outline', category: 'tone', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'whites', label: 'Whites', icon: 'ellipse-outline', category: 'tone', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'blacks', label: 'Blacks', icon: 'ellipse', category: 'tone', min: -100, max: 100, step: 1, defaultValue: 0 },
  
  // Detail
  { key: 'sharpness', label: 'Sharpness', icon: 'diamond-outline', category: 'detail', min: 0, max: 100, step: 1, defaultValue: 0 },
  { key: 'clarity', label: 'Clarity', icon: 'eye-outline', category: 'detail', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'dehaze', label: 'Dehaze', icon: 'cloud-outline', category: 'detail', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'grain', label: 'Grain', icon: 'apps-outline', category: 'detail', min: 0, max: 100, step: 1, defaultValue: 0 },
  
  // Effects
  { key: 'vignette', label: 'Vignette', icon: 'scan-outline', category: 'effects', min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: 'fade', label: 'Fade', icon: 'layers-outline', category: 'effects', min: 0, max: 100, step: 1, defaultValue: 0 },
];

const CATEGORIES: { id: AdjustmentCategory; label: string; icon: string }[] = [
  { id: 'basic', label: 'Basic', icon: 'settings-outline' },
  { id: 'color', label: 'Color', icon: 'color-palette-outline' },
  { id: 'tone', label: 'Tone', icon: 'options-outline' },
  { id: 'detail', label: 'Detail', icon: 'sparkles-outline' },
  { id: 'effects', label: 'Effects', icon: 'sparkles' },
];

const getDefaultValues = (): ProfessionalAdjustmentValues => {
  const values: any = {};
  ADJUSTMENTS.forEach(adj => {
    values[adj.key] = adj.defaultValue;
  });
  return values as ProfessionalAdjustmentValues;
};

const ProfessionalAdjustmentsPanel: React.FC<ProfessionalAdjustmentsPanelProps> = ({
  bottomSheetRef,
  onClose,
  onApply,
  initialValues,
}) => {
  const [values, setValues] = useState<ProfessionalAdjustmentValues>({
    ...getDefaultValues(),
    ...initialValues,
  });
  const [selectedCategory, setSelectedCategory] = useState<AdjustmentCategory>('basic');
  const [expandedAdjustment, setExpandedAdjustment] = useState<string | null>(null);

  const snapPoints = useMemo(() => ['80%'], []);

  const animationConfigs = useMemo(
    () => ({
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    []
  );

  const filteredAdjustments = useMemo(() => 
    ADJUSTMENTS.filter(adj => adj.category === selectedCategory),
    [selectedCategory]
  );

  const handleValueChange = (key: keyof ProfessionalAdjustmentValues, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = (key: keyof ProfessionalAdjustmentValues) => {
    const adjustment = ADJUSTMENTS.find(adj => adj.key === key);
    if (adjustment) {
      setValues(prev => ({ ...prev, [key]: adjustment.defaultValue }));
    }
  };

  const handleResetAll = () => {
    setValues(getDefaultValues());
  };

  const handleApply = () => {
    onApply(values);
    onClose();
  };

  const hasChanges = () => {
    const defaults = getDefaultValues();
    return Object.keys(values).some(
      key => values[key as keyof ProfessionalAdjustmentValues] !== 
             defaults[key as keyof ProfessionalAdjustmentValues]
    );
  };

  const renderAdjustmentSlider = (adjustment: AdjustmentConfig) => {
    const currentValue = values[adjustment.key];
    const isModified = currentValue !== adjustment.defaultValue;
    const isExpanded = expandedAdjustment === adjustment.key;

    return (
      <View key={adjustment.key} style={styles.adjustmentItem}>
        <TouchableOpacity
          style={styles.adjustmentHeader}
          onPress={() => setExpandedAdjustment(isExpanded ? null : adjustment.key)}
          activeOpacity={0.7}
        >
          <View style={styles.adjustmentInfo}>
            <View style={[styles.adjustmentIcon, isModified && styles.adjustmentIconModified]}>
              <Ionicons
                name={adjustment.icon as any}
                size={18}
                color={isModified ? COLORS.primary : COLORS.textSecondary}
              />
            </View>
            <Text style={[styles.adjustmentLabel, isModified && styles.adjustmentLabelModified]}>
              {adjustment.label}
            </Text>
          </View>
          <View style={styles.adjustmentValue}>
            <Text style={[styles.valueText, isModified && styles.valueTextModified]}>
              {currentValue > 0 ? '+' : ''}{currentValue}{adjustment.unit || ''}
            </Text>
            {isModified && (
              <TouchableOpacity
                onPress={() => handleReset(adjustment.key)}
                style={styles.resetButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={adjustment.min}
            maximumValue={adjustment.max}
            value={currentValue}
            step={adjustment.step}
            onValueChange={(v) => handleValueChange(adjustment.key, Math.round(v))}
            minimumTrackTintColor={isModified ? COLORS.primary : COLORS.border}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={isModified ? COLORS.primary : COLORS.textSecondary}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>{adjustment.min}</Text>
            <Text style={styles.sliderLabel}>0</Text>
            <Text style={styles.sliderLabel}>{adjustment.max}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      animationConfigs={animationConfigs}
      onClose={onClose}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
            <Text style={styles.title}>Adjustments</Text>
          <View style={styles.headerActions}>
            {hasChanges() && (
              <TouchableOpacity onPress={handleResetAll} style={styles.resetAllButton}>
                <Ionicons name="refresh" size={18} color={COLORS.primary} />
                <Text style={styles.resetAllText}>Reset All</Text>
            </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryTab,
                selectedCategory === category.id && styles.categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
              activeOpacity={0.7}
            >
                  <Ionicons
                name={category.icon as any}
                    size={18}
                color={selectedCategory === category.id ? COLORS.primary : COLORS.textSecondary}
                  />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}
              >
                {category.label}
                </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Adjustments List */}
        <BottomSheetScrollView
          contentContainerStyle={styles.adjustmentsList}
          showsVerticalScrollIndicator={false}
        >
          {filteredAdjustments.map(renderAdjustmentSlider)}
        </BottomSheetScrollView>

        {/* Apply Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.applyButton, !hasChanges() && styles.applyButtonDisabled]}
            onPress={handleApply}
            disabled={!hasChanges()}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={24} color={hasChanges() ? '#000' : '#666'} />
            <Text style={[styles.applyButtonText, !hasChanges() && styles.applyButtonTextDisabled]}>
              Apply Changes
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: COLORS.border,
    width: 40,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderRadius: BORDER_RADIUS.sm,
  },
  resetAllText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  closeButton: {
    padding: SPACING.xs,
  },
  categoriesContainer: {
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  categoriesContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryTextActive: {
    color: COLORS.primary,
  },
  adjustmentsList: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  adjustmentItem: {
    marginBottom: SPACING.lg,
  },
  adjustmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  adjustmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adjustmentIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustmentIconModified: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
  },
  adjustmentLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  adjustmentLabelModified: {
    color: COLORS.primary,
  },
  adjustmentValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    minWidth: 50,
    textAlign: 'right',
  },
  valueTextModified: {
    color: COLORS.primary,
  },
  resetButton: {
    padding: 4,
  },
  sliderContainer: {
    paddingHorizontal: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
  },
  sliderLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontFamily: 'monospace',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.lg,
    gap: 8,
  },
  applyButtonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },
  applyButtonText: {
    color: '#000000',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  applyButtonTextDisabled: {
    color: '#666666',
  },
});

export default ProfessionalAdjustmentsPanel;
