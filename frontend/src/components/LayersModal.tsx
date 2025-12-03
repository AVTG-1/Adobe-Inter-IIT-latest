/**
 * Layers Modal - 30% Height Bottom Sheet
 *
 * Full layer management UI with add, delete, rename, visibility, reorder
 * Integrated with useLayerManager hook
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Easing,
  Image,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';
import { Layer } from './InteractiveCanvas';

interface LayersModalProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
  // Layer management props
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onRenameLayer: (layerId: string, name: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onSetOpacity: (layerId: string, opacity: number) => void;
}

const LayersModal: React.FC<LayersModalProps> = ({
  bottomSheetRef,
  onClose,
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onToggleVisibility,
  onRenameLayer,
  onDuplicateLayer,
  onSetOpacity,
}) => {
  const snapPoints = useMemo(() => ['30%'], []);

  // Smooth and slow animation configuration
  const animationConfigs = useMemo(
    () => ({
      duration: 500, // Slower animation (500ms)
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth ease-in-out curve
    }),
    []
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);

  const renderBackdrop = (props: any) => null;

  const handleAddLayer = () => {
    onAddLayer();
  };

  const handleDeleteLayer = (id: string) => {
    if (layers.length === 1) {
      Alert.alert('Cannot Delete', 'You must have at least one layer');
      return;
    }
    Alert.alert(
      'Delete Layer',
      'Are you sure you want to delete this layer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteLayer(id),
        },
      ]
    );
  };

  const handleToggleVisibility = (id: string) => {
    onToggleVisibility(id);
  };

  const handleStartRename = (layer: Layer) => {
    setEditingId(layer.id);
    setEditingName(layer.name);
  };

  const handleFinishRename = () => {
    if (editingId && editingName.trim()) {
      onRenameLayer(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleClose = () => {
    bottomSheetRef.current?.close();
  };

  const handleLayerPress = (layerId: string) => {
    onSelectLayer(layerId);
    // Toggle expanded state for opacity slider
    setExpandedLayerId(expandedLayerId === layerId ? null : layerId);
  };

  const handleDuplicateLayer = (layerId: string) => {
    onDuplicateLayer(layerId);
  };

  const renderLayer = ({ item }: { item: Layer }) => {
    const isSelected = item.id === selectedLayerId;
    const isExpanded = item.id === expandedLayerId;

    return (
      <View style={styles.layerWrapper}>
        <TouchableOpacity
          style={[
            styles.layerCard,
            isSelected && styles.layerCardSelected,
          ]}
          onPress={() => handleLayerPress(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.layerLeft}>
            {/* Thumbnail */}
            {item.imageUri && (
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Layer Name */}
            {editingId === item.id ? (
              <TextInput
                style={styles.layerNameInput}
                value={editingName}
                onChangeText={setEditingName}
                onBlur={handleFinishRename}
                onSubmitEditing={handleFinishRename}
                autoFocus
                selectTextOnFocus
                placeholderTextColor={COLORS.textTertiary}
              />
            ) : (
              <View style={styles.layerNameContainer}>
                <Text style={[styles.layerName, isSelected && styles.layerNameSelected]}>
                  {item.name}
                </Text>
                <Text style={styles.layerType}>
                  {item.type} • {Math.round(item.opacity * 100)}%
                </Text>
              </View>
            )}
          </View>

          <View style={styles.layerRight}>
            {/* Edit Icon (Pen) */}
            <TouchableOpacity
              onPress={() => handleStartRename(item)}
              style={styles.iconButton}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Eye Toggle */}
            <TouchableOpacity
              onPress={() => handleToggleVisibility(item.id)}
              style={styles.iconButton}
            >
              <Ionicons
                name={item.visible ? 'eye' : 'eye-off'}
                size={18}
                color={item.visible ? COLORS.primary : COLORS.textTertiary}
              />
            </TouchableOpacity>

            {/* Delete (only if not base layer) */}
            {item.id !== 'base-layer' && (
              <TouchableOpacity
                onPress={() => handleDeleteLayer(item.id)}
                style={styles.iconButton}
              >
                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
              </TouchableOpacity>
            )}
            
            {/* Expand/Collapse indicator */}
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color={COLORS.textTertiary} 
            />
          </View>
        </TouchableOpacity>

        {/* Expanded Section with Opacity Slider */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            {/* Opacity Slider */}
            <View style={styles.opacityRow}>
              <Text style={styles.opacityLabel}>Opacity</Text>
              <Slider
                style={styles.opacitySlider}
                minimumValue={0}
                maximumValue={1}
                value={item.opacity}
                onValueChange={(value) => onSetOpacity(item.id, value)}
                minimumTrackTintColor="#FFCC00"
                maximumTrackTintColor="#444"
                thumbTintColor="#FFCC00"
              />
              <Text style={styles.opacityValue}>{Math.round(item.opacity * 100)}%</Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={() => handleDuplicateLayer(item.id)}
              >
                <Ionicons name="copy-outline" size={18} color="#007AFF" />
                <Text style={styles.quickActionText}>Duplicate</Text>
              </TouchableOpacity>

              {item.id !== 'base-layer' && (
                <TouchableOpacity 
                  style={styles.quickActionBtn}
                  onPress={() => handleDeleteLayer(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  <Text style={[styles.quickActionText, { color: '#FF3B30' }]}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      enableContentPanningGesture={false}
      animateOnMount={true}
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Layers</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleAddLayer} style={styles.addButton}>
              <Ionicons name="add-circle" size={28} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Layers List - Reversed to show topmost layer at top (like Photoshop) */}
        <BottomSheetFlatList
          data={[...layers].reverse()}
          renderItem={renderLayer}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="layers-outline" size={60} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>No layers yet</Text>
            </View>
          }
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  handleIndicator: {
    backgroundColor: COLORS.border,
    width: 40,
  },
  container: {
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  addButton: {
    padding: SPACING.xs,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  layerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardLight,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  layerCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  layerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  layerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  dragHandle: {
    marginRight: SPACING.md,
  },
  layerNameContainer: {
    flex: 1,
  },
  thumbnailContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: '#2A2A2A',
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  layerName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  layerNameSelected: {
    color: COLORS.primary,
  },
  layerType: {
    fontSize: 10,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  layerNameInput: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingVertical: 2,
    minWidth: 100,
  },
  iconButton: {
    padding: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  // New styles for expanded section
  layerWrapper: {
    marginBottom: SPACING.xs,
  },
  expandedSection: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: -4,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  opacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  opacityLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 55,
  },
  opacitySlider: {
    flex: 1,
    height: 30,
  },
  opacityValue: {
    fontSize: 12,
    color: '#FFCC00',
    width: 40,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#2C2C2E',
  },
  quickActionText: {
    fontSize: 12,
    color: '#007AFF',
  },
});

export default LayersModal;
