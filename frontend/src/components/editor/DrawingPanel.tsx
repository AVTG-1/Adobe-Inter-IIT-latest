/**
 * DrawingPanel - Clean Drawing Tools UI
 * Simple and intuitive like Procreate/Photoshop
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/theme';
import { BrushSettings } from '../../store/EditorStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DrawingPanelProps {
  visible: boolean;
  settings: BrushSettings;
  activeTool: 'brush' | 'pencil' | 'eraser';
  onSettingsChange: (settings: Partial<BrushSettings>) => void;
  onToolChange: (tool: 'brush' | 'pencil' | 'eraser') => void;
  onConfirm: () => void;
  onCancel: () => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
}

// Preset colors
const COLORS_PRESET = [
  '#000000', '#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55',
];

// Brush sizes
const SIZE_PRESETS = [2, 8, 16, 32, 64];

// Hardness presets
const HARDNESS_PRESETS = [
  { label: 'Soft', value: 0.2, icon: 'ellipse' },
  { label: 'Medium', value: 0.5, icon: 'ellipse' },
  { label: 'Hard', value: 0.8, icon: 'ellipse' },
  { label: 'Solid', value: 1.0, icon: 'ellipse' },
];

const DrawingPanel: React.FC<DrawingPanelProps> = ({
  visible,
  settings,
  activeTool,
  onSettingsChange,
  onToolChange,
  onConfirm,
  onCancel,
  onUndo,
  onClear,
  canUndo,
}) => {
  const [showColorGrid, setShowColorGrid] = useState(false);

  if (!visible) return null;

  const handleColorSelect = (color: string) => {
    onSettingsChange({ color });
    setShowColorGrid(false);
  };

  return (
    <View style={styles.container}>
      {/* Header with confirm/cancel */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color="#FF3B30" />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Drawing</Text>

        <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
          <Ionicons name="checkmark" size={24} color="#34C759" />
          <Text style={styles.confirmText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Tool Selection */}
      <View style={styles.toolSection}>
        <View style={styles.toolRow}>
          {/* Brush */}
          <TouchableOpacity
            style={[styles.toolButton, activeTool === 'brush' && styles.toolButtonActive]}
            onPress={() => onToolChange('brush')}
          >
            <Ionicons
              name="brush"
              size={24}
              color={activeTool === 'brush' ? '#FFCC00' : COLORS.textSecondary}
            />
            <Text style={[styles.toolLabel, activeTool === 'brush' && styles.toolLabelActive]}>
              Brush
            </Text>
          </TouchableOpacity>

          {/* Pencil */}
          <TouchableOpacity
            style={[styles.toolButton, activeTool === 'pencil' && styles.toolButtonActive]}
            onPress={() => onToolChange('pencil')}
          >
            <Ionicons
              name="pencil"
              size={24}
              color={activeTool === 'pencil' ? '#FFCC00' : COLORS.textSecondary}
            />
            <Text style={[styles.toolLabel, activeTool === 'pencil' && styles.toolLabelActive]}>
              Pencil
            </Text>
          </TouchableOpacity>

          {/* Eraser */}
          <TouchableOpacity
            style={[styles.toolButton, activeTool === 'eraser' && styles.toolButtonActive]}
            onPress={() => onToolChange('eraser')}
          >
            <Ionicons
              name="remove-circle-outline"
              size={24}
              color={activeTool === 'eraser' ? '#FF3B30' : COLORS.textSecondary}
            />
            <Text style={[styles.toolLabel, activeTool === 'eraser' && { color: '#FF3B30' }]}>
              Eraser
            </Text>
          </TouchableOpacity>

          {/* Undo */}
          <TouchableOpacity
            style={[styles.toolButton, !canUndo && styles.toolButtonDisabled]}
            onPress={onUndo}
            disabled={!canUndo}
          >
            <Ionicons
              name="arrow-undo"
              size={24}
              color={canUndo ? COLORS.textSecondary : COLORS.border}
            />
            <Text style={[styles.toolLabel, !canUndo && styles.toolLabelDisabled]}>
              Undo
            </Text>
          </TouchableOpacity>

          {/* Clear */}
          <TouchableOpacity style={styles.toolButton} onPress={onClear}>
            <Ionicons name="trash-outline" size={24} color={COLORS.textSecondary} />
            <Text style={styles.toolLabel}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Controls Section */}
      <View style={styles.controlsSection}>
        {/* Size Control */}
        <View style={styles.controlRow}>
          <View style={styles.controlLabel}>
            <Ionicons name="resize" size={18} color={COLORS.textSecondary} />
            <Text style={styles.labelText}>Size</Text>
          </View>
          <View style={styles.sliderContainer}>
            {/* Size presets */}
            <View style={styles.presetsRow}>
              {SIZE_PRESETS.map(size => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizePreset,
                    settings.size === size && styles.sizePresetActive
                  ]}
                  onPress={() => onSettingsChange({ size })}
                >
                  <View
                    style={[
                      styles.sizeDot,
                      {
                        width: Math.min(size / 3, 18),
                        height: Math.min(size / 3, 18),
                        backgroundColor: activeTool === 'eraser' ? '#888' : settings.color,
                      }
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={100}
              value={settings.size}
              onValueChange={(v) => onSettingsChange({ size: v })}
              minimumTrackTintColor="#FFCC00"
              maximumTrackTintColor={COLORS.border}
              thumbTintColor="#FFCC00"
            />
          </View>
          <Text style={styles.valueText}>{Math.round(settings.size)}px</Text>
        </View>

        {/* Color Control (hidden for eraser) */}
        {activeTool !== 'eraser' && (
          <View style={styles.controlRow}>
            <View style={styles.controlLabel}>
              <Ionicons name="color-palette" size={18} color={COLORS.textSecondary} />
              <Text style={styles.labelText}>Color</Text>
            </View>
            <View style={styles.colorContainer}>
              {/* Current color */}
              <TouchableOpacity
                style={[styles.currentColor, { backgroundColor: settings.color }]}
                onPress={() => setShowColorGrid(!showColorGrid)}
              >
                {showColorGrid && (
                  <Ionicons name="chevron-up" size={16} color={settings.color === '#FFFFFF' ? '#000' : '#FFF'} />
                )}
              </TouchableOpacity>

              {/* Color presets */}
              {COLORS_PRESET.slice(0, 5).map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorPreset,
                    { backgroundColor: color },
                    settings.color === color && styles.colorPresetActive
                  ]}
                  onPress={() => handleColorSelect(color)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Full color grid */}
        {showColorGrid && activeTool !== 'eraser' && (
          <View style={styles.colorGrid}>
            {COLORS_PRESET.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorGridItem,
                  { backgroundColor: color },
                  settings.color === color && styles.colorGridItemActive
                ]}
                onPress={() => handleColorSelect(color)}
              >
                {settings.color === color && (
                  <Ionicons name="checkmark" size={18} color={color === '#FFFFFF' ? '#000' : '#FFF'} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Opacity Control */}
        <View style={styles.controlRow}>
          <View style={styles.controlLabel}>
            <Ionicons name="water" size={18} color={COLORS.textSecondary} />
            <Text style={styles.labelText}>Opacity</Text>
          </View>
          <Slider
            style={[styles.slider, { flex: 1 }]}
            minimumValue={0.05}
            maximumValue={1}
            value={settings.opacity}
            onValueChange={(v) => onSettingsChange({ opacity: v })}
            minimumTrackTintColor="#FFCC00"
            maximumTrackTintColor={COLORS.border}
            thumbTintColor="#FFCC00"
          />
          <Text style={styles.valueText}>{Math.round(settings.opacity * 100)}%</Text>
        </View>

        {/* Hardness Control */}
        <View style={styles.controlRow}>
          <View style={styles.controlLabel}>
            <Ionicons name="ellipse" size={18} color={COLORS.textSecondary} />
            <Text style={styles.labelText}>Hardness</Text>
          </View>
          <View style={styles.hardnessContainer}>
            {HARDNESS_PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.label}
                style={[
                  styles.hardnessButton,
                  Math.abs(settings.hardness - preset.value) < 0.1 && styles.hardnessButtonActive
                ]}
                onPress={() => onSettingsChange({ hardness: preset.value })}
              >
                <Text style={[
                  styles.hardnessLabel,
                  Math.abs(settings.hardness - preset.value) < 0.1 && styles.hardnessLabelActive
                ]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Brush Preview */}
      <View style={styles.previewContainer}>
        <View
          style={[
            styles.brushPreview,
            {
              width: Math.min(settings.size * 1.5, 80),
              height: Math.min(settings.size * 1.5, 80),
              borderRadius: settings.size,
              backgroundColor: activeTool === 'eraser' ? '#888' : settings.color,
              opacity: settings.opacity,
              shadowColor: activeTool === 'eraser' ? '#888' : settings.color,
              shadowOpacity: settings.hardness < 1 ? (1 - settings.hardness) : 0,
              shadowRadius: (1 - settings.hardness) * settings.size * 0.3,
            }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cancelText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmText: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: '500',
  },
  toolSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
  },
  toolButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
  },
  toolButtonActive: {
    backgroundColor: '#2C2C2E',
  },
  toolButtonDisabled: {
    opacity: 0.4,
  },
  toolLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  toolLabelActive: {
    color: '#FFCC00',
    fontWeight: '500',
  },
  toolLabelDisabled: {
    color: COLORS.border,
  },
  controlsSection: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: 8,
  },
  controlLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
    gap: 6,
  },
  labelText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sliderContainer: {
    flex: 1,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sizePreset: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sizePresetActive: {
    borderColor: '#FFCC00',
  },
  sizeDot: {
    borderRadius: 50,
  },
  slider: {
    height: 36,
  },
  valueText: {
    fontSize: 12,
    color: '#FFCC00',
    minWidth: 45,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  colorContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentColor: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFCC00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPreset: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorPresetActive: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: SPACING.sm,
    backgroundColor: '#2C2C2E',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  colorGridItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGridItemActive: {
    borderColor: '#FFFFFF',
  },
  hardnessContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  hardnessButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
  },
  hardnessButtonActive: {
    backgroundColor: '#FFCC00',
  },
  hardnessLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  hardnessLabelActive: {
    color: '#000000',
    fontWeight: '600',
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: '#2C2C2E',
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  brushPreview: {
    // Dynamic styles applied inline
  },
});

export default DrawingPanel;

