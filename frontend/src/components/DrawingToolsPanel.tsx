/**
 * Drawing Tools Panel - Drawing, Shapes, Text Annotations
 *
 * Tools: Pen, Highlighter, Shapes (Rectangle, Circle, Arrow, Line), Text
 * Features: Color picker, brush size, opacity, undo/redo
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Easing,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface DrawingToolsPanelProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
  onToolSelect: (tool: DrawingTool) => void;
}

export interface DrawingTool {
  id: string;
  name: string;
  type: 'pen' | 'shape' | 'text' | 'eraser';
  icon: string;
  settings: DrawingSettings;
}

export interface DrawingSettings {
  color: string;
  size: number;
  opacity: number;
  style?: 'solid' | 'dashed' | 'dotted';
}

const DRAWING_TOOLS = [
  // PEN TOOLS
  { id: 'pen', name: 'Pen', type: 'pen', icon: 'pencil-outline' },
  { id: 'brush', name: 'Brush', type: 'pen', icon: 'brush-outline' },
  { id: 'highlighter', name: 'Highlighter', type: 'pen', icon: 'color-fill-outline' },
  { id: 'marker', name: 'Marker', type: 'pen', icon: 'create-outline' },

  // SHAPE TOOLS
  { id: 'rectangle', name: 'Rectangle', type: 'shape', icon: 'square-outline' },
  { id: 'circle', name: 'Circle', type: 'shape', icon: 'ellipse-outline' },
  { id: 'triangle', name: 'Triangle', type: 'shape', icon: 'triangle-outline' },
  { id: 'arrow', name: 'Arrow', type: 'shape', icon: 'arrow-forward-outline' },
  { id: 'line', name: 'Line', type: 'shape', icon: 'remove-outline' },
  { id: 'star', name: 'Star', type: 'shape', icon: 'star-outline' },
  { id: 'heart', name: 'Heart', type: 'shape', icon: 'heart-outline' },

  // TEXT TOOL
  { id: 'text', name: 'Text', type: 'text', icon: 'text-outline' },

  // ERASER
  { id: 'eraser', name: 'Eraser', type: 'eraser', icon: 'trash-outline' },
];

const PRESET_COLORS = [
  '#FF0000', // Red
  '#FF6B00', // Orange
  '#FFEB3B', // Yellow
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#9C27B0', // Purple
  '#E91E63', // Pink
  '#FFFFFF', // White
  '#000000', // Black
  '#9E9E9E', // Gray
];

const DrawingToolsPanel: React.FC<DrawingToolsPanelProps> = ({
  bottomSheetRef,
  onClose,
  onToolSelect,
}) => {
  const [selectedTool, setSelectedTool] = useState<string>('pen');
  const [selectedColor, setSelectedColor] = useState<string>('#FF0000');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [opacity, setOpacity] = useState<number>(100);

  const snapPoints = useMemo(() => ['65%'], []);

  const animationConfigs = useMemo(
    () => ({
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    []
  );

  const renderBackdrop = useMemo(() => null, []);

  const handleToolPress = (toolId: string) => {
    // Only select the tool, don't trigger onToolSelect yet
    // User can adjust settings first, then tap "Start Drawing"
    setSelectedTool(toolId);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  const handleStartDrawing = () => {
    // Called when user taps "Start Drawing" button
    const tool = DRAWING_TOOLS.find(t => t.id === selectedTool);
    if (tool) {
      onToolSelect({
        ...tool,
        settings: {
          color: selectedColor,
          size: brushSize,
          opacity: opacity / 100,
        },
      } as DrawingTool);
    }
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
          <Text style={styles.title}>Drawing Tools</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Tools Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tools</Text>
              <View style={styles.toolsGrid}>
                {DRAWING_TOOLS.map(tool => (
                  <TouchableOpacity
                    key={tool.id}
                    style={[
                      styles.toolCard,
                      selectedTool === tool.id && styles.toolCardSelected,
                    ]}
                    onPress={() => handleToolPress(tool.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.toolIconContainer,
                        selectedTool === tool.id && styles.toolIconContainerSelected,
                      ]}
                    >
                      <Ionicons
                        name={tool.icon as any}
                        size={24}
                        color={selectedTool === tool.id ? COLORS.primary : COLORS.textPrimary}
                      />
                    </View>
                    <Text style={styles.toolName} numberOfLines={1}>
                      {tool.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Color Picker */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Color</Text>
              <View style={styles.colorsGrid}>
                {PRESET_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorButtonSelected,
                    ]}
                    onPress={() => handleColorSelect(color)}
                    activeOpacity={0.7}
                  >
                    {selectedColor === color && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={color === '#FFFFFF' ? '#000' : '#FFF'}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Brush Size */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sectionTitle}>Brush Size</Text>
                <Text style={styles.sliderValue}>{Math.round(brushSize)}px</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={50}
                value={brushSize}
                onValueChange={setBrushSize}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.primary}
              />
              <View style={styles.previewContainer}>
                <View
                  style={[
                    styles.brushPreview,
                    {
                      width: brushSize * 2,
                      height: brushSize * 2,
                      backgroundColor: selectedColor,
                      opacity: opacity / 100,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Opacity */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sectionTitle}>Opacity</Text>
                <Text style={styles.sliderValue}>{Math.round(opacity)}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={10}
                maximumValue={100}
                value={opacity}
                onValueChange={setOpacity}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.primary}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {}}
                activeOpacity={0.7}
                disabled
              >
                <Ionicons name="arrow-undo" size={20} color={COLORS.textTertiary} />
                <Text style={[styles.actionButtonText, { color: COLORS.textTertiary }]}>Undo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {}}
                activeOpacity={0.7}
                disabled
              >
                <Ionicons name="arrow-redo" size={20} color={COLORS.textTertiary} />
                <Text style={[styles.actionButtonText, { color: COLORS.textTertiary }]}>Redo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  // Reset all settings to defaults
                  setSelectedTool('pen');
                  setSelectedColor('#FF0000');
                  setBrushSize(5);
                  setOpacity(100);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={20} color={COLORS.textPrimary} />
                <Text style={styles.actionButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              style={[styles.applyButton, !selectedTool && styles.applyButtonDisabled]}
              onPress={handleStartDrawing}
              disabled={!selectedTool}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={24} color={selectedTool ? "#000" : "#666"} />
              <Text style={[styles.applyButtonText, !selectedTool && styles.applyButtonTextDisabled]}>
                Start Drawing
              </Text>
            </TouchableOpacity>
          </View>
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
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toolCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toolCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  toolIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  toolIconContainerSelected: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  toolName: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: COLORS.primary,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sliderValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  previewContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  brushPreview: {
    borderRadius: 100,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    gap: 6,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
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

export default DrawingToolsPanel;
