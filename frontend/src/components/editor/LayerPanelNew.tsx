/**
 * LayerPanelNew - Professional Layer Management
 * Photoshop-like layer panel with all essential features
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
import { Layer } from '../../store/EditorStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LayerPanelNewProps {
  visible: boolean;
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onAddLayer: () => void;
  onAddDrawingLayer: () => void;
  onMoveLayerUp: (id: string) => void;
  onMoveLayerDown: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onFillLayer: (id: string, color: string) => void;
  onClose: () => void;
}

// Fill colors for layers
const FILL_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF',
  '#5856D6', '#AF52DE', '#FF2D55', '#000000', '#FFFFFF',
];

const LayerPanelNew: React.FC<LayerPanelNewProps> = ({
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
  onAddDrawingLayer,
  onMoveLayerUp,
  onMoveLayerDown,
  onRenameLayer,
  onFillLayer,
  onClose,
}) => {
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);
  const [showFillColors, setShowFillColors] = useState<string | null>(null);

  if (!visible) return null;

  const getLayerIcon = (type: Layer['type']) => {
    switch (type) {
      case 'image': return 'image';
      case 'drawing': return 'brush';
      case 'adjustment': return 'color-filter';
      case 'text': return 'text';
      case 'shape': return 'shapes';
      default: return 'layers';
    }
  };

  const handleLayerPress = (id: string) => {
    onSelectLayer(id);
    setExpandedLayerId(expandedLayerId === id ? null : id);
  };

  const renderLayerItem = (layer: Layer, index: number) => {
    const isSelected = layer.id === selectedLayerId;
    const isExpanded = layer.id === expandedLayerId;
    const isFirst = index === layers.length - 1; // Top layer (rendered in reverse)
    const isLast = index === 0; // Bottom layer

    return (
      <View key={layer.id}>
        {/* Layer Row */}
        <TouchableOpacity
          style={[
            styles.layerItem,
            isSelected && styles.layerItemSelected,
          ]}
          onPress={() => handleLayerPress(layer.id)}
          activeOpacity={0.7}
        >
          {/* Selection indicator */}
          {isSelected && <View style={styles.selectionBar} />}

          {/* Visibility toggle */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => onToggleVisibility(layer.id)}
          >
            <Ionicons
              name={layer.visible ? 'eye' : 'eye-off'}
              size={18}
              color={layer.visible ? '#34C759' : '#666'}
            />
          </TouchableOpacity>

          {/* Lock toggle */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => onToggleLock(layer.id)}
          >
            <Ionicons
              name={layer.locked ? 'lock-closed' : 'lock-open-outline'}
              size={16}
              color={layer.locked ? '#FF9500' : '#666'}
            />
          </TouchableOpacity>

          {/* Thumbnail */}
          <View style={styles.thumbnail}>
            {layer.imageUri ? (
              <Image
                source={{ uri: layer.imageUri }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons
                name={getLayerIcon(layer.type)}
                size={20}
                color="#888"
              />
            )}
          </View>

          {/* Layer info */}
          <View style={styles.layerInfo}>
            <Text 
              style={[styles.layerName, isSelected && styles.layerNameSelected]}
              numberOfLines={1}
            >
              {layer.name}
            </Text>
            <Text style={styles.layerMeta}>
              {layer.type} • {Math.round(layer.opacity * 100)}%
            </Text>
          </View>

          {/* Reorder buttons */}
          <View style={styles.reorderButtons}>
            <TouchableOpacity
              style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
              onPress={() => onMoveLayerUp(layer.id)}
              disabled={isFirst}
            >
              <Ionicons
                name="chevron-up"
                size={14}
                color={isFirst ? '#333' : '#888'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
              onPress={() => onMoveLayerDown(layer.id)}
              disabled={isLast}
            >
              <Ionicons
                name="chevron-down"
                size={14}
                color={isLast ? '#333' : '#888'}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Expanded Controls */}
        {isExpanded && (
          <View style={styles.expandedPanel}>
            {/* Opacity slider */}
            <View style={styles.opacityRow}>
              <Text style={styles.opacityLabel}>Opacity</Text>
              <Slider
                style={styles.opacitySlider}
                minimumValue={0}
                maximumValue={1}
                value={layer.opacity}
                onValueChange={(v) => onSetOpacity(layer.id, v)}
                minimumTrackTintColor="#FFCC00"
                maximumTrackTintColor="#333"
                thumbTintColor="#FFCC00"
              />
              <Text style={styles.opacityValue}>
                {Math.round(layer.opacity * 100)}%
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              {/* Fill */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowFillColors(showFillColors === layer.id ? null : layer.id)}
              >
                <Ionicons name="color-fill" size={18} color="#007AFF" />
                <Text style={styles.actionLabel}>Fill</Text>
              </TouchableOpacity>

              {/* Duplicate */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onDuplicateLayer(layer.id)}
              >
                <Ionicons name="copy" size={18} color="#888" />
                <Text style={styles.actionLabel}>Duplicate</Text>
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                style={[styles.actionButton, layer.locked && styles.actionButtonDisabled]}
                onPress={() => !layer.locked && onDeleteLayer(layer.id)}
                disabled={layer.locked}
              >
                <Ionicons
                  name="trash"
                  size={18}
                  color={layer.locked ? '#333' : '#FF3B30'}
                />
                <Text style={[styles.actionLabel, layer.locked && styles.actionLabelDisabled]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>

            {/* Fill color picker */}
            {showFillColors === layer.id && (
              <View style={styles.fillColorPicker}>
                <Text style={styles.fillLabel}>Fill with color:</Text>
                <View style={styles.fillColors}>
                  {FILL_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.fillColor, { backgroundColor: color }]}
                      onPress={() => {
                        onFillLayer(layer.id, color);
                        setShowFillColors(null);
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
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Layers</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Layer List (reversed - top layer first) */}
      <ScrollView style={styles.layerList} showsVerticalScrollIndicator={false}>
        {[...layers].reverse().map((layer, index) => renderLayerItem(layer, index))}

        {layers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="layers-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>No layers yet</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.addButton} onPress={onAddLayer}>
          <Ionicons name="add-circle" size={24} color="#007AFF" />
          <Text style={styles.addButtonText}>New Layer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addButton} onPress={onAddDrawingLayer}>
          <Ionicons name="brush" size={24} color="#34C759" />
          <Text style={styles.addButtonText}>Drawing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, !selectedLayerId && styles.addButtonDisabled]}
          onPress={() => selectedLayerId && onDuplicateLayer(selectedLayerId)}
          disabled={!selectedLayerId}
        >
          <Ionicons
            name="copy-outline"
            size={24}
            color={selectedLayerId ? '#888' : '#333'}
          />
          <Text style={[styles.addButtonText, !selectedLayerId && styles.addButtonTextDisabled]}>
            Duplicate
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, !selectedLayerId && styles.addButtonDisabled]}
          onPress={() => selectedLayerId && onDeleteLayer(selectedLayerId)}
          disabled={!selectedLayerId}
        >
          <Ionicons
            name="trash-outline"
            size={24}
            color={selectedLayerId ? '#FF3B30' : '#333'}
          />
          <Text style={[styles.addButtonText, { color: selectedLayerId ? '#FF3B30' : '#333' }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: 60,
    bottom: 180,
    width: 280,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderBottomLeftRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  layerList: {
    flex: 1,
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    position: 'relative',
  },
  layerItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  selectionBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#007AFF',
  },
  iconButton: {
    padding: 6,
  },
  thumbnail: {
    width: 40,
    height: 40,
    backgroundColor: '#2C2C2E',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  layerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  layerName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  layerNameSelected: {
    color: '#007AFF',
  },
  layerMeta: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  reorderButtons: {
    flexDirection: 'column',
  },
  reorderBtn: {
    padding: 2,
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  expandedPanel: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  opacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  opacityLabel: {
    fontSize: 11,
    color: '#888',
    width: 50,
  },
  opacitySlider: {
    flex: 1,
    height: 30,
  },
  opacityValue: {
    fontSize: 11,
    color: '#FFCC00',
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
    opacity: 0.3,
  },
  actionLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
  actionLabelDisabled: {
    color: '#333',
  },
  fillColorPicker: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
  },
  fillLabel: {
    fontSize: 11,
    color: '#888',
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
    borderColor: '#333',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  addButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontSize: 9,
    color: '#888',
    marginTop: 2,
  },
  addButtonTextDisabled: {
    color: '#333',
  },
});

export default LayerPanelNew;

