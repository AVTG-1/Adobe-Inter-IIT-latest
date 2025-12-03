/**
 * Professional Layer Panel
 * Photoshop-like layer management
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/theme';
import { CanvasLayer } from './CanvasEditor';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LayerPanelProps {
  visible: boolean;
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onAddLayer: () => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
  onFillLayer: (id: string, color: string) => void;
  onClose: () => void;
}

// Fill colors
const FILL_COLORS = [
  '#FF0000', '#FF6B00', '#FFEB3B', '#4CAF50', '#2196F3',
  '#9C27B0', '#E91E63', '#00BCD4', '#000000', '#FFFFFF',
];

const LayerPanel: React.FC<LayerPanelProps> = ({
  visible,
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onSetOpacity,
  onDuplicateLayer,
  onDeleteLayer,
  onAddLayer,
  onReorderLayers,
  onFillLayer,
  onClose,
}) => {
  const [showFillPicker, setShowFillPicker] = useState<string | null>(null);
  const [opacityEditing, setOpacityEditing] = useState<string | null>(null);

  if (!visible) return null;

  const getLayerIcon = (type: CanvasLayer['type']) => {
    switch (type) {
      case 'image': return 'image';
      case 'drawing': return 'brush';
      case 'text': return 'text';
      case 'shape': return 'shapes';
      case 'adjustment': return 'color-filter';
      default: return 'layers';
    }
  };

  const handleMoveUp = (index: number) => {
    if (index < layers.length - 1) {
      onReorderLayers(index, index + 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index > 0) {
      onReorderLayers(index, index - 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Layers</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onAddLayer} style={styles.headerButton}>
            <Ionicons name="add" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Layer List */}
      <ScrollView style={styles.layerList} showsVerticalScrollIndicator={false}>
        {layers.slice().reverse().map((layer, reverseIndex) => {
          const index = layers.length - 1 - reverseIndex;
          const isSelected = layer.id === selectedLayerId;
          
          return (
            <View key={layer.id}>
              <TouchableOpacity
                style={[styles.layerItem, isSelected && styles.layerItemSelected]}
                onPress={() => onSelectLayer(layer.id)}
                activeOpacity={0.7}
              >
                {/* Selection indicator */}
                {isSelected && <View style={styles.selectionIndicator} />}

                {/* Visibility toggle */}
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => onToggleVisibility(layer.id)}
                >
                  <Ionicons
                    name={layer.visible ? 'eye' : 'eye-off'}
                    size={18}
                    color={layer.visible ? COLORS.primary : COLORS.textSecondary}
                  />
                </TouchableOpacity>

                {/* Lock toggle */}
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => onToggleLock(layer.id)}
                >
                  <Ionicons
                    name={layer.locked ? 'lock-closed' : 'lock-open'}
                    size={16}
                    color={layer.locked ? '#FF9800' : COLORS.textSecondary}
                  />
                </TouchableOpacity>

                {/* Thumbnail */}
                <View style={styles.thumbnail}>
                  {layer.thumbnail ? (
                    <Image source={{ uri: layer.thumbnail }} style={styles.thumbnailImage} />
                  ) : (
                    <Ionicons
                      name={getLayerIcon(layer.type)}
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  )}
                </View>

                {/* Layer info */}
                <View style={styles.layerInfo}>
                  <Text style={[styles.layerName, isSelected && styles.layerNameSelected]} numberOfLines={1}>
                    {layer.name}
                  </Text>
                  <Text style={styles.layerType}>
                    {layer.type.charAt(0).toUpperCase() + layer.type.slice(1)} • {Math.round(layer.opacity * 100)}%
                  </Text>
                </View>

                {/* Reorder buttons */}
                <View style={styles.reorderButtons}>
                  <TouchableOpacity
                    style={[styles.reorderButton, reverseIndex === 0 && styles.reorderButtonDisabled]}
                    onPress={() => handleMoveUp(index)}
                    disabled={reverseIndex === 0}
                  >
                    <Ionicons name="chevron-up" size={14} color={reverseIndex === 0 ? COLORS.border : COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reorderButton, reverseIndex === layers.length - 1 && styles.reorderButtonDisabled]}
                    onPress={() => handleMoveDown(index)}
                    disabled={reverseIndex === layers.length - 1}
                  >
                    <Ionicons name="chevron-down" size={14} color={reverseIndex === layers.length - 1 ? COLORS.border : COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {/* Expanded controls for selected layer */}
              {isSelected && (
                <View style={styles.expandedControls}>
                  {/* Opacity slider */}
                  <View style={styles.opacityRow}>
                    <Text style={styles.opacityLabel}>Opacity</Text>
                    <Slider
                      style={styles.opacitySlider}
                      minimumValue={0}
                      maximumValue={1}
                      value={layer.opacity}
                      onValueChange={(value) => onSetOpacity(layer.id, value)}
                      minimumTrackTintColor={COLORS.primary}
                      maximumTrackTintColor={COLORS.border}
                      thumbTintColor={COLORS.primary}
                    />
                    <Text style={styles.opacityValue}>{Math.round(layer.opacity * 100)}%</Text>
                  </View>

                  {/* Layer actions */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setShowFillPicker(showFillPicker === layer.id ? null : layer.id)}
                    >
                      <Ionicons name="color-fill" size={18} color={COLORS.primary} />
                      <Text style={styles.actionText}>Fill</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => onDuplicateLayer(layer.id)}
                    >
                      <Ionicons name="copy" size={18} color={COLORS.textSecondary} />
                      <Text style={styles.actionText}>Duplicate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, layer.locked && styles.actionButtonDisabled]}
                      onPress={() => !layer.locked && onDeleteLayer(layer.id)}
                      disabled={layer.locked}
                    >
                      <Ionicons name="trash" size={18} color={layer.locked ? COLORS.border : '#FF4444'} />
                      <Text style={[styles.actionText, layer.locked && styles.actionTextDisabled]}>Delete</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Fill color picker */}
                  {showFillPicker === layer.id && (
                    <View style={styles.fillPicker}>
                      <Text style={styles.fillLabel}>Fill Layer with Color</Text>
                      <View style={styles.fillColors}>
                        {FILL_COLORS.map((color) => (
                          <TouchableOpacity
                            key={color}
                            style={[styles.fillColor, { backgroundColor: color }]}
                            onPress={() => {
                              onFillLayer(layer.id, color);
                              setShowFillPicker(null);
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {layers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="layers-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No layers yet</Text>
            <TouchableOpacity style={styles.addLayerButton} onPress={onAddLayer}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addLayerText}>Add Layer</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom toolbar */}
      <View style={styles.bottomToolbar}>
        <TouchableOpacity style={styles.toolbarButton} onPress={onAddLayer}>
          <Ionicons name="add-circle" size={24} color={COLORS.primary} />
          <Text style={styles.toolbarText}>New</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolbarButton, !selectedLayerId && styles.toolbarButtonDisabled]}
          onPress={() => selectedLayerId && onDuplicateLayer(selectedLayerId)}
          disabled={!selectedLayerId}
        >
          <Ionicons name="copy-outline" size={24} color={selectedLayerId ? COLORS.textSecondary : COLORS.border} />
          <Text style={[styles.toolbarText, !selectedLayerId && styles.toolbarTextDisabled]}>Duplicate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolbarButton, !selectedLayerId && styles.toolbarButtonDisabled]}
          onPress={() => selectedLayerId && onDeleteLayer(selectedLayerId)}
          disabled={!selectedLayerId}
        >
          <Ionicons name="trash-outline" size={24} color={selectedLayerId ? '#FF4444' : COLORS.border} />
          <Text style={[styles.toolbarText, { color: selectedLayerId ? '#FF4444' : COLORS.border }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: 80,
    bottom: 200,
    width: 280,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderBottomLeftRadius: BORDER_RADIUS.lg,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
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
  title: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { padding: 4 },
  layerList: { flex: 1 },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: 'relative',
  },
  layerItemSelected: {
    backgroundColor: COLORS.primary + '15',
  },
  selectionIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: COLORS.primary,
  },
  iconButton: {
    padding: 6,
  },
  thumbnail: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.sm,
  },
  layerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  layerName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  layerNameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  layerType: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  reorderButtons: {
    flexDirection: 'column',
    marginLeft: 4,
  },
  reorderButton: {
    padding: 2,
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  expandedControls: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  opacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  opacityLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 50,
  },
  opacitySlider: {
    flex: 1,
    height: 30,
  },
  opacityValue: {
    fontSize: 12,
    color: COLORS.primary,
    width: 40,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionTextDisabled: {
    color: COLORS.border,
  },
  fillPicker: {
    marginTop: 8,
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
  },
  fillLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  fillColors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fillColor: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 16,
  },
  addLayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  addLayerText: {
    color: '#FFF',
    fontWeight: '600',
  },
  bottomToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  toolbarButton: {
    alignItems: 'center',
  },
  toolbarButtonDisabled: {
    opacity: 0.4,
  },
  toolbarText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  toolbarTextDisabled: {
    color: COLORS.border,
  },
});

export default LayerPanel;

