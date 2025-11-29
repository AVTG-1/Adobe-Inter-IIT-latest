/**
 * Layers Screen
 *
 * Manage editing layers - add, rename, delete, reorder
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Layers'>;

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

export default function LayersScreen({ navigation }: Props) {
  const [layers, setLayers] = useState<Layer[]>([
    { id: '1', name: 'Background', visible: true, locked: false, opacity: 100 },
    { id: '2', name: 'Layer 1', visible: true, locked: false, opacity: 100 },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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

  const renderLayer = ({ item }: { item: Layer }) => (
    <View style={styles.layerItem}>
      <View style={styles.layerLeft}>
        <TouchableOpacity
          onPress={() => handleToggleVisibility(item.id)}
          style={styles.iconButton}
        >
          <Ionicons
            name={item.visible ? 'eye' : 'eye-off'}
            size={24}
            color={item.visible ? '#667eea' : '#ccc'}
          />
        </TouchableOpacity>

        {editingId === item.id ? (
          <TextInput
            style={styles.layerNameInput}
            value={editingName}
            onChangeText={setEditingName}
            onBlur={handleFinishRename}
            onSubmitEditing={handleFinishRename}
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <TouchableOpacity onPress={() => handleStartRename(item)}>
            <Text style={styles.layerName}>{item.name}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.layerRight}>
        <TouchableOpacity
          onPress={() => handleToggleLock(item.id)}
          style={styles.iconButton}
        >
          <Ionicons
            name={item.locked ? 'lock-closed' : 'lock-open'}
            size={20}
            color={item.locked ? '#667eea' : '#999'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDeleteLayer(item.id)}
          style={styles.iconButton}
        >
          <Ionicons name="trash-outline" size={20} color="#f5576c" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Layers</Text>
        <TouchableOpacity onPress={handleAddLayer} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#667eea" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={layers}
        renderItem={renderLayer}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="layers-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No layers yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    padding: 4,
  },
  listContainer: {
    padding: 16,
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  layerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  layerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
  },
  layerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  layerNameInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
    paddingVertical: 4,
    minWidth: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
});
