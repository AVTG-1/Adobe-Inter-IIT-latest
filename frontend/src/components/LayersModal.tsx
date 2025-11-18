/**
 * Layers Modal - 20% Height Bottom Sheet
 *
 * Minimal layers list with icons: Eye (visibility), Pen (rename), Drag handle (reorder)
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
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

interface LayersModalProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
}

const LayersModal: React.FC<LayersModalProps> = ({
  bottomSheetRef,
  onClose,
}) => {
  const snapPoints = useMemo(() => ['25%'], []);

  const [layers, setLayers] = useState<Layer[]>([
    { id: '1', name: 'Background', visible: true, locked: false, opacity: 100 },
    { id: '2', name: 'Layer 1', visible: true, locked: false, opacity: 100 },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.2}
    />
  );

  const handleAddLayer = () => {
    const newLayer: Layer = {
      id: Date.now().toString(),
      name: `Layer ${layers.length}`,
      visible: true,
      locked: false,
      opacity: 100,
    };
    setLayers([newLayer, ...layers]);
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
          onPress: () => setLayers(layers.filter(l => l.id !== id)),
        },
      ]
    );
  };

  const handleToggleVisibility = (id: string) => {
    setLayers(layers.map(l =>
      l.id === id ? { ...l, visible: !l.visible } : l
    ));
  };

  const handleToggleLock = (id: string) => {
    setLayers(layers.map(l =>
      l.id === id ? { ...l, locked: !l.locked } : l
    ));
  };

  const handleStartRename = (layer: Layer) => {
    setEditingId(layer.id);
    setEditingName(layer.name);
  };

  const handleFinishRename = () => {
    if (editingId && editingName.trim()) {
      setLayers(layers.map(l =>
        l.id === editingId ? { ...l, name: editingName.trim() } : l
      ));
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleClose = () => {
    bottomSheetRef.current?.close();
  };

  const renderLayer = ({ item }: { item: Layer }) => (
    <View style={styles.layerCard}>
      <View style={styles.layerLeft}>
        {/* Drag Handle */}
        <View style={styles.dragHandle}>
          <Ionicons name="menu" size={16} color={COLORS.textSecondary} />
        </View>

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
            <Text style={styles.layerName}>{item.name}</Text>
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
      </View>
    </View>
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
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

        {/* Layers List */}
        <BottomSheetFlatList
          data={layers}
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
    flex: 1,
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
  layerName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
});

export default LayersModal;
