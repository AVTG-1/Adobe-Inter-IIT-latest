/**
 * Professional Drawing Panel
 * Photoshop-like brush controls
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/theme';
import { BrushSettings } from './CanvasEditor';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DrawingPanelProps {
  visible: boolean;
  settings: BrushSettings;
  activeTool: 'brush' | 'eraser' | 'pencil';
  onSettingsChange: (settings: Partial<BrushSettings>) => void;
  onToolChange: (tool: 'brush' | 'eraser' | 'pencil') => void;
  onClose: () => void;
}

const COLOR_PRESETS = [
  '#000000', '#FFFFFF', '#FF0000', '#FF6B00', '#FFEB3B',
  '#4CAF50', '#2196F3', '#9C27B0', '#E91E63', '#00BCD4',
];

const SIZE_PRESETS = [2, 8, 16, 32, 64];

const HARDNESS_PRESETS = [
  { label: 'Soft', value: 0.2 },
  { label: 'Medium', value: 0.5 },
  { label: 'Hard', value: 0.8 },
  { label: 'Solid', value: 1.0 },
];

const DrawingPanel: React.FC<DrawingPanelProps> = ({
  visible,
  settings,
  activeTool,
  onSettingsChange,
  onToolChange,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Drawing Tools</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tool Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tool</Text>
          <View style={styles.toolRow}>
            {['brush', 'pencil', 'eraser'].map((tool) => (
              <TouchableOpacity
                key={tool}
                style={[styles.toolButton, activeTool === tool && styles.toolButtonActive]}
                onPress={() => onToolChange(tool as any)}
              >
                <Ionicons
                  name={tool === 'brush' ? 'brush' : tool === 'pencil' ? 'pencil' : 'remove-circle-outline'}
                  size={24}
                  color={activeTool === tool ? COLORS.primary : COLORS.textSecondary}
                />
                <Text style={[styles.toolLabel, activeTool === tool && styles.toolLabelActive]}>
                  {tool.charAt(0).toUpperCase() + tool.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Brush Size */}
        <View style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sectionTitle}>Size</Text>
            <Text style={styles.valueText}>{Math.round(settings.size)}px</Text>
          </View>
          <View style={styles.presetsRow}>
            {SIZE_PRESETS.map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.sizePreset, settings.size === size && styles.sizePresetActive]}
                onPress={() => onSettingsChange({ size })}
              >
                <View style={[styles.sizePreviewDot, { width: Math.min(size / 2, 20), height: Math.min(size / 2, 20), backgroundColor: settings.color }]} />
              </TouchableOpacity>
            ))}
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={100}
            value={settings.size}
            onValueChange={(size) => onSettingsChange({ size })}
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.primary}
          />
        </View>

        {/* Color */}
        {activeTool !== 'eraser' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Color</Text>
            <View style={styles.colorGrid}>
              {COLOR_PRESETS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorSwatch, { backgroundColor: color }, settings.color === color && styles.colorSwatchActive]}
                  onPress={() => onSettingsChange({ color })}
                >
                  {settings.color === color && <Ionicons name="checkmark" size={16} color={color === '#FFFFFF' ? '#000' : '#FFF'} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Opacity */}
        <View style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sectionTitle}>Opacity</Text>
            <Text style={styles.valueText}>{Math.round(settings.opacity * 100)}%</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0.01}
            maximumValue={1}
            value={settings.opacity}
            onValueChange={(opacity) => onSettingsChange({ opacity })}
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.primary}
          />
        </View>

        {/* Hardness */}
        <View style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sectionTitle}>Hardness</Text>
            <Text style={styles.valueText}>{Math.round(settings.hardness * 100)}%</Text>
          </View>
          <View style={styles.hardnessPresets}>
            {HARDNESS_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={[styles.hardnessButton, Math.abs(settings.hardness - preset.value) < 0.1 && styles.hardnessButtonActive]}
                onPress={() => onSettingsChange({ hardness: preset.value })}
              >
                <Text style={[styles.hardnessLabel, Math.abs(settings.hardness - preset.value) < 0.1 && styles.hardnessLabelActive]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Smoothing */}
        <View style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sectionTitle}>Smoothing</Text>
            <Text style={styles.valueText}>{Math.round(settings.smoothing * 100)}%</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={0.9}
            value={settings.smoothing}
            onValueChange={(smoothing) => onSettingsChange({ smoothing })}
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.primary}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    maxHeight: 400,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  closeButton: { padding: SPACING.xs },
  content: { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  section: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  valueText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  slider: { width: '100%', height: 40 },
  toolRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: SPACING.xs },
  toolButton: { alignItems: 'center', padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.background, minWidth: 80 },
  toolButtonActive: { backgroundColor: COLORS.primary + '20', borderWidth: 2, borderColor: COLORS.primary },
  toolLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  toolLabelActive: { color: COLORS.primary, fontWeight: '600' },
  presetsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  sizePreset: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  sizePresetActive: { borderColor: COLORS.primary },
  sizePreviewDot: { borderRadius: 100 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorSwatch: { width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  colorSwatchActive: { borderColor: COLORS.primary, transform: [{ scale: 1.1 }] },
  hardnessPresets: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  hardnessButton: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.background },
  hardnessButtonActive: { backgroundColor: COLORS.primary },
  hardnessLabel: { fontSize: 12, color: COLORS.textSecondary },
  hardnessLabelActive: { color: '#FFF', fontWeight: '600' },
});

export default DrawingPanel;

