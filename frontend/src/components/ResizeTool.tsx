/**
 * Resize Tool Component
 *
 * Resize controls for selected layer
 * Features:
 * - Width and height inputs
 * - Aspect ratio lock
 * - Percentage scaling
 * - Social media presets (inspired by ImageToolbox)
 * - Apply/Cancel actions
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface ResizeToolProps {
  visible: boolean;
  currentWidth: number;
  currentHeight: number;
  onApply: (resizeData: ResizeData) => void;
  onCancel: () => void;
}

export interface ResizeData {
  width: number;
  height: number;
  scale: number;
  preset?: string;
}

// Social Media & Common Presets (inspired by ImageToolbox)
interface SizePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'social' | 'print' | 'screen' | 'custom';
  icon: string;
}

const SIZE_PRESETS: SizePreset[] = [
  // Social Media - Instagram
  { id: 'ig-post', name: 'Instagram Post', width: 1080, height: 1080, category: 'social', icon: 'logo-instagram' },
  { id: 'ig-story', name: 'Instagram Story', width: 1080, height: 1920, category: 'social', icon: 'logo-instagram' },
  { id: 'ig-landscape', name: 'Instagram Landscape', width: 1080, height: 566, category: 'social', icon: 'logo-instagram' },
  { id: 'ig-portrait', name: 'Instagram Portrait', width: 1080, height: 1350, category: 'social', icon: 'logo-instagram' },
  
  // Social Media - Facebook
  { id: 'fb-post', name: 'Facebook Post', width: 1200, height: 630, category: 'social', icon: 'logo-facebook' },
  { id: 'fb-cover', name: 'Facebook Cover', width: 820, height: 312, category: 'social', icon: 'logo-facebook' },
  { id: 'fb-profile', name: 'Facebook Profile', width: 170, height: 170, category: 'social', icon: 'logo-facebook' },
  
  // Social Media - Twitter/X
  { id: 'tw-post', name: 'Twitter Post', width: 1200, height: 675, category: 'social', icon: 'logo-twitter' },
  { id: 'tw-header', name: 'Twitter Header', width: 1500, height: 500, category: 'social', icon: 'logo-twitter' },
  
  // Social Media - YouTube
  { id: 'yt-thumbnail', name: 'YouTube Thumbnail', width: 1280, height: 720, category: 'social', icon: 'logo-youtube' },
  { id: 'yt-banner', name: 'YouTube Banner', width: 2560, height: 1440, category: 'social', icon: 'logo-youtube' },
  
  // Social Media - LinkedIn
  { id: 'li-post', name: 'LinkedIn Post', width: 1200, height: 627, category: 'social', icon: 'logo-linkedin' },
  { id: 'li-cover', name: 'LinkedIn Cover', width: 1584, height: 396, category: 'social', icon: 'logo-linkedin' },
  
  // Social Media - Pinterest
  { id: 'pin-post', name: 'Pinterest Pin', width: 1000, height: 1500, category: 'social', icon: 'logo-pinterest' },
  
  // Social Media - TikTok
  { id: 'tiktok', name: 'TikTok Video', width: 1080, height: 1920, category: 'social', icon: 'logo-tiktok' },
  
  // Screen Resolutions
  { id: '4k', name: '4K Ultra HD', width: 3840, height: 2160, category: 'screen', icon: 'tv-outline' },
  { id: '1080p', name: 'Full HD 1080p', width: 1920, height: 1080, category: 'screen', icon: 'desktop-outline' },
  { id: '720p', name: 'HD 720p', width: 1280, height: 720, category: 'screen', icon: 'laptop-outline' },
  { id: 'iphone-pro', name: 'iPhone Pro Max', width: 1290, height: 2796, category: 'screen', icon: 'phone-portrait-outline' },
  { id: 'ipad-pro', name: 'iPad Pro', width: 2048, height: 2732, category: 'screen', icon: 'tablet-portrait-outline' },
  
  // Print Sizes (at 300 DPI)
  { id: 'a4', name: 'A4 Paper', width: 2480, height: 3508, category: 'print', icon: 'document-outline' },
  { id: 'a5', name: 'A5 Paper', width: 1748, height: 2480, category: 'print', icon: 'document-outline' },
  { id: 'letter', name: 'US Letter', width: 2550, height: 3300, category: 'print', icon: 'document-outline' },
  { id: '4x6', name: '4×6 Photo', width: 1200, height: 1800, category: 'print', icon: 'image-outline' },
  { id: '5x7', name: '5×7 Photo', width: 1500, height: 2100, category: 'print', icon: 'image-outline' },
  { id: '8x10', name: '8×10 Photo', width: 2400, height: 3000, category: 'print', icon: 'image-outline' },
];

const PRESET_CATEGORIES = [
  { id: 'social', label: 'Social Media', icon: 'share-social-outline' },
  { id: 'screen', label: 'Screen', icon: 'desktop-outline' },
  { id: 'print', label: 'Print', icon: 'print-outline' },
];

const ResizeTool: React.FC<ResizeToolProps> = ({
  visible,
  currentWidth,
  currentHeight,
  onApply,
  onCancel,
}) => {
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [scale, setScale] = useState(100);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [presetCategory, setPresetCategory] = useState<'social' | 'screen' | 'print'>('social');
  const [showPresets, setShowPresets] = useState(true);

  const originalAspectRatio = currentWidth / currentHeight;
  
  const filteredPresets = SIZE_PRESETS.filter(p => p.category === presetCategory);

  // Update dimensions when scale changes
  useEffect(() => {
    const newWidth = Math.round((currentWidth * scale) / 100);
    const newHeight = Math.round((currentHeight * scale) / 100);
    setWidth(newWidth);
    setHeight(newHeight);
  }, [scale, currentWidth, currentHeight]);

  const handleWidthChange = useCallback((value: string) => {
    const newWidth = parseInt(value) || 0;
    setWidth(newWidth);

    if (lockAspectRatio) {
      const newHeight = Math.round(newWidth / originalAspectRatio);
      setHeight(newHeight);
    }

    // Update scale based on width
    const newScale = Math.round((newWidth / currentWidth) * 100);
    setScale(newScale);
  }, [lockAspectRatio, originalAspectRatio, currentWidth]);

  const handleHeightChange = useCallback((value: string) => {
    const newHeight = parseInt(value) || 0;
    setHeight(newHeight);

    if (lockAspectRatio) {
      const newWidth = Math.round(newHeight * originalAspectRatio);
      setWidth(newWidth);
    }

    // Update scale based on height
    const newScale = Math.round((newHeight / currentHeight) * 100);
    setScale(newScale);
  }, [lockAspectRatio, originalAspectRatio, currentHeight]);

  const handleApply = useCallback(() => {
    onApply({
      width,
      height,
      scale: scale / 100,
      preset: selectedPreset || undefined,
    });
  }, [width, height, scale, selectedPreset, onApply]);

  const handleReset = useCallback(() => {
    setWidth(currentWidth);
    setHeight(currentHeight);
    setScale(100);
    setSelectedPreset(null);
  }, [currentWidth, currentHeight]);

  const handlePresetSelect = useCallback((preset: SizePreset) => {
    setSelectedPreset(preset.id);
    setWidth(preset.width);
    setHeight(preset.height);
    setLockAspectRatio(false); // Unlock when using preset
    // Calculate approximate scale
    const scaleW = (preset.width / currentWidth) * 100;
    setScale(Math.round(scaleW));
  }, [currentWidth]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resize</Text>
          <TouchableOpacity onPress={handleApply} style={styles.headerButton}>
            <Ionicons name="checkmark" size={24} color={COLORS.primary} />
            <Text style={[styles.headerButtonText, { color: COLORS.primary }]}>Apply</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Presets Toggle */}
          <TouchableOpacity 
            style={styles.presetsToggle}
            onPress={() => setShowPresets(!showPresets)}
          >
            <View style={styles.presetsToggleLeft}>
              <Ionicons name="resize-outline" size={20} color={COLORS.primary} />
              <Text style={styles.presetsToggleText}>Size Presets</Text>
            </View>
            <Ionicons 
              name={showPresets ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={COLORS.textSecondary} 
            />
          </TouchableOpacity>

          {/* Presets Section */}
          {showPresets && (
            <View style={styles.presetsSection}>
              {/* Category Tabs */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoryTabs}
              >
                {PRESET_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryTab,
                      presetCategory === cat.id && styles.categoryTabActive,
                    ]}
                    onPress={() => setPresetCategory(cat.id as any)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={16}
                      color={presetCategory === cat.id ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryTabText,
                        presetCategory === cat.id && styles.categoryTabTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Preset Grid */}
              <View style={styles.presetsGrid}>
                {filteredPresets.map(preset => (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetCard,
                      selectedPreset === preset.id && styles.presetCardSelected,
                    ]}
                    onPress={() => handlePresetSelect(preset)}
                  >
                    <Ionicons
                      name={preset.icon as any}
                      size={20}
                      color={selectedPreset === preset.id ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text style={styles.presetName} numberOfLines={1}>{preset.name}</Text>
                    <Text style={styles.presetSize}>{preset.width}×{preset.height}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

        {/* Scale Slider */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scale: {scale}%</Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>25%</Text>
            <Slider
              style={styles.slider}
              minimumValue={25}
              maximumValue={400}
              value={scale}
                onValueChange={(v) => {
                  setScale(v);
                  setSelectedPreset(null); // Clear preset when manually scaling
                }}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
            <Text style={styles.sliderLabel}>400%</Text>
          </View>
        </View>

        {/* Dimensions */}
        <View style={styles.section}>
          <View style={styles.dimensionsHeader}>
            <Text style={styles.sectionTitle}>Dimensions</Text>
            <View style={styles.lockContainer}>
              <Ionicons
                name={lockAspectRatio ? 'lock-closed' : 'lock-open'}
                size={16}
                color={lockAspectRatio ? COLORS.primary : COLORS.textTertiary}
              />
              <Text style={styles.lockText}>Lock Ratio</Text>
              <Switch
                value={lockAspectRatio}
                onValueChange={setLockAspectRatio}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.textPrimary}
              />
            </View>
          </View>

          <View style={styles.inputsContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Width (px)</Text>
              <TextInput
                style={styles.input}
                value={width.toString()}
                onChangeText={handleWidthChange}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <Ionicons name="close" size={20} color={COLORS.textTertiary} />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height (px)</Text>
              <TextInput
                style={styles.input}
                value={height.toString()}
                onChangeText={handleHeightChange}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>
        </View>

        {/* Preview Info */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Original Size:</Text>
          <Text style={styles.previewText}>
            {currentWidth} × {currentHeight} px
          </Text>
          <Text style={styles.previewLabel}>New Size:</Text>
          <Text style={styles.previewText}>
            {width} × {height} px
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleReset} style={styles.actionButton}>
            <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
            <Text style={styles.actionButtonText}>Reset to Original</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  presetsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  presetsToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presetsToggleText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  presetsSection: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  categoryTabs: {
    marginBottom: SPACING.md,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    marginRight: 8,
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  categoryTabText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  categoryTabTextActive: {
    color: COLORS.primary,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  presetCard: {
    width: '31%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  presetName: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  presetSize: {
    fontSize: 9,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  dimensionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  lockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  inputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
  },
  previewContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.cardLight,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  previewLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  previewText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surface,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});

export default ResizeTool;
