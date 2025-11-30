/**
 * Filters Panel - 50+ Image Filters
 *
 * Inspired by ImageToolbox - comprehensive filter collection
 * Categories: Basic, Artistic, Blur, Color, Edge Detection, Distortion
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Easing,
  Image,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface FiltersPanelProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
  onFilterSelect: (filter: Filter) => void;
  previewImage?: string;
}

export interface Filter {
  id: string;
  name: string;
  category: FilterCategory;
  icon: string;
  params?: Record<string, any>;
  backend?: 'imaginary' | 'opencv' | 'custom';
}

type FilterCategory = 'basic' | 'artistic' | 'blur' | 'color' | 'edge' | 'distortion' | 'vintage';

const FILTERS: Filter[] = [
  // BASIC FILTERS
  { id: 'grayscale', name: 'Grayscale', category: 'basic', icon: 'contrast-outline', backend: 'opencv' },
  { id: 'sepia', name: 'Sepia', category: 'basic', icon: 'film-outline', backend: 'custom' },
  { id: 'invert', name: 'Invert', category: 'basic', icon: 'invert-mode-outline', backend: 'opencv' },
  { id: 'brightness_up', name: 'Brighten', category: 'basic', icon: 'sunny-outline', backend: 'opencv', params: { value: 0.3 } },
  { id: 'brightness_down', name: 'Darken', category: 'basic', icon: 'moon-outline', backend: 'opencv', params: { value: -0.3 } },
  { id: 'contrast_high', name: 'High Contrast', category: 'basic', icon: 'contrast', backend: 'opencv', params: { value: 0.5 } },
  { id: 'saturation_boost', name: 'Vivid', category: 'basic', icon: 'color-fill-outline', backend: 'opencv', params: { value: 0.4 } },
  { id: 'saturation_low', name: 'Desaturate', category: 'basic', icon: 'color-filter-outline', backend: 'opencv', params: { value: -0.4 } },

  // ARTISTIC FILTERS
  { id: 'oil_painting', name: 'Oil Paint', category: 'artistic', icon: 'brush-outline', backend: 'custom' },
  { id: 'watercolor', name: 'Watercolor', category: 'artistic', icon: 'water-outline', backend: 'custom' },
  { id: 'sketch', name: 'Sketch', category: 'artistic', icon: 'create-outline', backend: 'custom' },
  { id: 'cartoon', name: 'Cartoon', category: 'artistic', icon: 'happy-outline', backend: 'custom' },
  { id: 'pencil', name: 'Pencil', category: 'artistic', icon: 'pencil-outline', backend: 'custom' },
  { id: 'ink', name: 'Ink', category: 'artistic', icon: 'color-wand-outline', backend: 'custom' },
  { id: 'posterize', name: 'Posterize', category: 'artistic', icon: 'layers-outline', backend: 'custom' },
  { id: 'pixelate', name: 'Pixelate', category: 'artistic', icon: 'grid-outline', backend: 'custom' },

  // BLUR FILTERS
  { id: 'gaussian_blur', name: 'Gaussian Blur', category: 'blur', icon: 'radio-button-on-outline', backend: 'opencv', params: { sigma: 3.0 } },
  { id: 'motion_blur', name: 'Motion Blur', category: 'blur', icon: 'flash-outline', backend: 'custom' },
  { id: 'radial_blur', name: 'Radial Blur', category: 'blur', icon: 'radio-outline', backend: 'custom' },
  { id: 'zoom_blur', name: 'Zoom Blur', category: 'blur', icon: 'expand-outline', backend: 'custom' },
  { id: 'tilt_shift', name: 'Tilt-Shift', category: 'blur', icon: 'aperture-outline', backend: 'custom' },
  { id: 'bokeh', name: 'Bokeh', category: 'blur', icon: 'ellipse-outline', backend: 'custom' },

  // COLOR FILTERS
  { id: 'warm', name: 'Warm', category: 'color', icon: 'flame-outline', backend: 'custom' },
  { id: 'cool', name: 'Cool', category: 'color', icon: 'snow-outline', backend: 'custom' },
  { id: 'vintage', name: 'Vintage', category: 'vintage', icon: 'time-outline', backend: 'custom' },
  { id: 'polaroid', name: 'Polaroid', category: 'vintage', icon: 'camera-outline', backend: 'custom' },
  { id: 'retro', name: 'Retro', category: 'vintage', icon: 'tv-outline', backend: 'custom' },
  { id: 'faded', name: 'Faded', category: 'vintage', icon: 'partly-sunny-outline', backend: 'custom' },
  { id: 'hdr', name: 'HDR', category: 'color', icon: 'contrast-outline', backend: 'custom' },
  { id: 'technicolor', name: 'Technicolor', category: 'color', icon: 'film-outline', backend: 'custom' },

  // EDGE DETECTION
  { id: 'edge_sobel', name: 'Sobel Edge', category: 'edge', icon: 'scan-outline', backend: 'custom' },
  { id: 'edge_canny', name: 'Canny Edge', category: 'edge', icon: 'analytics-outline', backend: 'custom' },
  { id: 'emboss', name: 'Emboss', category: 'edge', icon: 'cube-outline', backend: 'custom' },
  { id: 'outline', name: 'Outline', category: 'edge', icon: 'square-outline', backend: 'custom' },

  // DISTORTION EFFECTS
  { id: 'swirl', name: 'Swirl', category: 'distortion', icon: 'sync-outline', backend: 'custom' },
  { id: 'bulge', name: 'Bulge', category: 'distortion', icon: 'ellipse', backend: 'custom' },
  { id: 'pinch', name: 'Pinch', category: 'distortion', icon: 'contract-outline', backend: 'custom' },
  { id: 'fisheye', name: 'Fisheye', category: 'distortion', icon: 'eye-outline', backend: 'custom' },
  { id: 'ripple', name: 'Ripple', category: 'distortion', icon: 'pulse-outline', backend: 'custom' },
  { id: 'vignette', name: 'Vignette', category: 'distortion', icon: 'ellipse-outline', backend: 'custom' },
];

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'grid-outline' },
  { id: 'basic', name: 'Basic', icon: 'settings-outline' },
  { id: 'artistic', name: 'Artistic', icon: 'brush-outline' },
  { id: 'blur', name: 'Blur', icon: 'radio-button-on-outline' },
  { id: 'color', name: 'Color', icon: 'color-palette-outline' },
  { id: 'vintage', name: 'Vintage', icon: 'time-outline' },
  { id: 'edge', name: 'Edge', icon: 'scan-outline' },
  { id: 'distortion', name: 'FX', icon: 'sparkles-outline' },
];

const FiltersPanel: React.FC<FiltersPanelProps> = ({
  bottomSheetRef,
  onClose,
  onFilterSelect,
  previewImage,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const snapPoints = useMemo(() => ['50%'], []);

  const animationConfigs = useMemo(
    () => ({
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    []
  );

  const renderBackdrop = useMemo(() => null, []);

  const filteredFilters = useMemo(() => {
    if (selectedCategory === 'all') return FILTERS;
    return FILTERS.filter(f => f.category === selectedCategory);
  }, [selectedCategory]);

  const handleFilterPress = (filter: Filter) => {
    setSelectedFilter(filter.id);
    onFilterSelect(filter);
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
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <View style={styles.headerActions}>
            <Text style={styles.filterCount}>{filteredFilters.length} filters</Text>
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
                size={20}
                color={selectedCategory === category.id ? COLORS.primary : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filters Grid */}
        <BottomSheetScrollView
          contentContainerStyle={styles.filtersGrid}
          showsVerticalScrollIndicator={false}
        >
          {filteredFilters.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterCard,
                selectedFilter === filter.id && styles.filterCardSelected,
              ]}
              onPress={() => handleFilterPress(filter)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.filterIconContainer,
                  selectedFilter === filter.id && styles.filterIconContainerSelected,
                ]}
              >
                <Ionicons
                  name={filter.icon as any}
                  size={28}
                  color={selectedFilter === filter.id ? COLORS.primary : COLORS.textPrimary}
                />
              </View>
              <Text style={styles.filterName} numberOfLines={2}>
                {filter.name}
              </Text>
              {selectedFilter === filter.id && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark" size={12} color="#000" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </BottomSheetScrollView>
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
  filterCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  closeButton: {
    padding: SPACING.xs,
  },
  categoriesContainer: {
    maxHeight: 60,
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
    paddingHorizontal: 16,
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
  filtersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.md,
    gap: 12,
  },
  filterCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  filterCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  filterIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterIconContainerSelected: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  filterName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 13,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FiltersPanel;
