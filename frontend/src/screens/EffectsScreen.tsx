/**
 * Effects Screen
 *
 * Grid of effect thumbnails with preview
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Effects'>;

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 3; // 3 columns with padding

interface Effect {
  id: string;
  name: string;
  icon: string;
  preview?: string;
}

const EFFECTS: Effect[] = [
  { id: 'none', name: 'Original', icon: 'image-outline' },
  { id: 'grayscale', name: 'Grayscale', icon: 'contrast' },
  { id: 'sepia', name: 'Sepia', icon: 'color-palette' },
  { id: 'vintage', name: 'Vintage', icon: 'time' },
  { id: 'cold', name: 'Cold', icon: 'snow' },
  { id: 'warm', name: 'Warm', icon: 'sunny' },
  { id: 'vivid', name: 'Vivid', icon: 'color-fill' },
  { id: 'dramatic', name: 'Dramatic', icon: 'flash' },
  { id: 'noir', name: 'Noir', icon: 'moon' },
  { id: 'fade', name: 'Fade', icon: 'radio-button-off' },
  { id: 'chrome', name: 'Chrome', icon: 'glasses' },
  { id: 'instant', name: 'Instant', icon: 'camera' },
];

export default function EffectsScreen({ navigation }: Props) {
  const [selectedEffect, setSelectedEffect] = useState('none');

  const handleApplyEffect = () => {
    // TODO: Apply effect to image
    console.log('Applying effect:', selectedEffect);
    navigation.goBack();
  };

  const renderEffect = ({ item }: { item: Effect }) => {
    const isSelected = selectedEffect === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.effectItem,
          isSelected && styles.effectItemSelected,
        ]}
        onPress={() => setSelectedEffect(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.effectPreview, isSelected && styles.effectPreviewSelected]}>
          <Ionicons
            name={item.icon as any}
            size={32}
            color={isSelected ? '#667eea' : '#666'}
          />
        </View>
        <Text style={[styles.effectName, isSelected && styles.effectNameSelected]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Effects</Text>
        <TouchableOpacity onPress={handleApplyEffect} style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={EFFECTS}
        renderItem={renderEffect}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.columnWrapper}
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
  applyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#667eea',
    borderRadius: 20,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  gridContainer: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  effectItem: {
    width: ITEM_WIDTH,
    marginBottom: 16,
    alignItems: 'center',
  },
  effectItemSelected: {
    // Selected state handled by child components
  },
  effectPreview: {
    width: ITEM_WIDTH - 8,
    height: ITEM_WIDTH - 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  effectPreviewSelected: {
    borderColor: '#667eea',
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
  },
  effectName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  effectNameSelected: {
    color: '#667eea',
    fontWeight: '600',
  },
});
