/**
 * Drawing Modal - Full-Screen Drawing Interface
 *
 * Opens when user selects a drawing tool
 * Provides canvas for pen, brush, shapes, and text
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DrawingCanvas, { DrawingPath } from './DrawingCanvas';
import { COLORS, SPACING, BORDER_RADIUS } from '../config/theme';

export interface DrawingData {
  paths: DrawingPath[];
  settings: {
    color: string;
    size: number;
    opacity: number;
  };
}

interface DrawingModalProps {
  visible: boolean;
  tool: {
    id: string;
    name: string;
    type: 'pen' | 'shape' | 'text';
    settings: {
      color: string;
      size: number;
      opacity: number;
    };
  };
  onApply: (drawingData: DrawingData) => void;
  onCancel: () => void;
}

const COLORS_PALETTE = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
];

const DrawingModal: React.FC<DrawingModalProps> = ({
  visible,
  tool,
  onApply,
  onCancel,
}) => {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [color, setColor] = useState(tool.settings.color);
  const [strokeWidth, setStrokeWidth] = useState(tool.settings.size);
  const [opacity, setOpacity] = useState(tool.settings.opacity);

  const handleApply = useCallback(() => {
    onApply({
      paths,
      settings: { color, size: strokeWidth, opacity },
    });
  }, [paths, color, strokeWidth, opacity, onApply]);

  const handleCancel = useCallback(() => {
    setPaths([]);
    onCancel();
  }, [onCancel]);

  // Determine drawing mode based on tool type
  const drawingMode =
    tool.type === 'pen'
      ? 'pen'
      : tool.id === 'rectangle'
      ? 'rectangle'
      : tool.id === 'circle'
      ? 'circle'
      : tool.id === 'line'
      ? 'line'
      : tool.id === 'triangle'
      ? 'triangle'
      : 'pen';

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{tool.name}</Text>
            <Text style={styles.headerSubtitle}>{paths.length} strokes</Text>
          </View>

          <TouchableOpacity
            onPress={handleApply}
            style={styles.headerButton}
            disabled={paths.length === 0}
          >
            <Ionicons
              name="checkmark"
              size={24}
              color={paths.length === 0 ? COLORS.textTertiary : COLORS.primary}
            />
            <Text
              style={[
                styles.headerButtonText,
                { color: paths.length === 0 ? COLORS.textTertiary : COLORS.primary },
              ]}
            >
              Apply
            </Text>
          </TouchableOpacity>
        </View>

        {/* Drawing Canvas */}
        <DrawingCanvas
          onPathsChange={setPaths}
          color={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
          mode={drawingMode}
        />

        {/* Toolbar */}
        <View style={styles.toolbar}>
          {/* Color Picker */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Color</Text>
            <View style={styles.colorPicker}>
              {COLORS_PALETTE.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    color === c && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setColor(c)}
                >
                  {color === c && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={c === '#FFFFFF' || c === '#FFFF00' ? '#000000' : '#FFFFFF'}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Brush Size */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Size: {strokeWidth}px</Text>
            <View style={styles.sizeButtons}>
              {[1, 3, 5, 8, 12].map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeButton,
                    strokeWidth === size && styles.sizeButtonSelected,
                  ]}
                  onPress={() => setStrokeWidth(size)}
                >
                  <View style={[styles.sizeDot, { width: size, height: size }]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </SafeAreaView>
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
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  toolbar: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  section: {
    gap: SPACING.xs,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  sizeButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  sizeButton: {
    width: 50,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  sizeButtonSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.primary + '10',
  },
  sizeDot: {
    borderRadius: 100,
    backgroundColor: COLORS.textPrimary,
  },
});

export default DrawingModal;
