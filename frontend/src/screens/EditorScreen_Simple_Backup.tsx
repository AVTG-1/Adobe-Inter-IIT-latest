/**
 * EditorScreen - Redesigned with 80/20 Layout
 *
 * Layout:
 * - 80% Canvas Area (top) - Image display with zoom/pan
 * - 20% Bottom Panel (fixed) - Horizontal scrollable features
 * - Top toolbar - Undo/Redo/Export controls
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import Toast from 'react-native-toast-message';
import { HistoryManager } from '../utils/historyManager';
import { getImageDimensions, getFittedDimensions } from '../utils/imageProcessing';

type Props = NativeStackScreenProps<RootStackParamList, 'Editor'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_HEIGHT = SCREEN_HEIGHT * 0.8; // 80% for canvas
const BOTTOM_PANEL_HEIGHT = SCREEN_HEIGHT * 0.2; // 20% for features

// Feature buttons in bottom panel
const FEATURES = [
  { id: 'crop', icon: 'crop', label: 'Crop', color: '#FF6B6B' },
  { id: 'rotate', icon: 'reload', label: 'Rotate', color: '#4ECDC4' },
  { id: 'filters', icon: 'color-filter', label: 'Filters', color: '#95E1D3' },
  { id: 'adjust', icon: 'options', label: 'Adjust', color: '#F38181' },
  { id: 'draw', icon: 'brush', label: 'Draw', color: '#AA96DA' },
  { id: 'text', icon: 'text', label: 'Text', color: '#FCBAD3' },
  { id: 'stickers', icon: 'happy', label: 'Stickers', color: '#FFFFD2' },
  { id: 'effects', icon: 'sparkles', label: 'Effects', color: '#A8D8EA' },
  { id: 'layers', icon: 'layers', label: 'Layers', color: '#FFAAA6' },
  { id: 'export', icon: 'download', label: 'Export', color: '#C7CEEA' },
];

export default function EditorScreen({ route, navigation }: Props) {
  const { imageUrl } = route.params;

  // State
  const [currentImageUri, setCurrentImageUri] = useState<string>(imageUrl);
  const [originalImageUri] = useState<string>(imageUrl);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 });
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // History manager for undo/redo
  const [historyManager] = useState(() => new HistoryManager());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Load image dimensions on mount
  useEffect(() => {
    loadImageDimensions();
  }, [imageUrl]);

  // Add initial state to history
  useEffect(() => {
    if (imageLoaded && currentImageUri) {
      historyManager.addState(currentImageUri, 'Initial state');
      updateUndoRedoState();
    }
  }, [imageLoaded]);

  const loadImageDimensions = async () => {
    try {
      const dims = await getImageDimensions(imageUrl);
      setImageDimensions(dims);

      // Calculate display dimensions to fit in canvas
      const fitted = getFittedDimensions(
        dims.width,
        dims.height,
        SCREEN_WIDTH,
        CANVAS_HEIGHT - 60 // Account for top toolbar
      );
      setDisplayDimensions(fitted);
      setImageLoaded(true);
    } catch (error) {
      console.error('Error loading image:', error);
      Alert.alert('Error', 'Failed to load image');
    }
  };

  const updateUndoRedoState = () => {
    setCanUndo(historyManager.canUndo());
    setCanRedo(historyManager.canRedo());
  };

  // Handlers
  const handleBack = () => {
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to go back? Unsaved changes will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handleUndo = () => {
    const previousUri = historyManager.undo();
    if (previousUri) {
      setCurrentImageUri(previousUri);
      updateUndoRedoState();
      Toast.show({
        type: 'info',
        text1: 'Undo',
        text2: 'Previous action undone',
      });
    }
  };

  const handleRedo = () => {
    const nextUri = historyManager.redo();
    if (nextUri) {
      setCurrentImageUri(nextUri);
      updateUndoRedoState();
      Toast.show({
        type: 'info',
        text1: 'Redo',
        text2: 'Action redone',
      });
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to Original?',
      'This will discard all edits and return to the original image.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const originalUri = historyManager.resetToOriginal();
            if (originalUri) {
              setCurrentImageUri(originalUri);
              updateUndoRedoState();
              Toast.show({
                type: 'success',
                text1: 'Reset',
                text2: 'Image reset to original',
              });
            }
          },
        },
      ]
    );
  };

  const handleFeaturePress = (featureId: string) => {
    setSelectedFeature(featureId);
    console.log('Feature pressed:', featureId);

    // Show coming soon message for now
    Toast.show({
      type: 'info',
      text1: featureId.charAt(0).toUpperCase() + featureId.slice(1),
      text2: 'Feature coming soon!',
    });

    // Handle specific features
    switch (featureId) {
      case 'export':
        handleExport();
        break;
      default:
        // Feature not yet implemented
        break;
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Cannot save without media library access');
        setExporting(false);
        return;
      }

      // Copy image to local file for saving
      const filename = `edited_${Date.now()}.jpg`;
      const destUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.copyAsync({
        from: currentImageUri,
        to: destUri,
      });

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(destUri);
      await MediaLibrary.createAlbumAsync('Photo Editor', asset, false);

      setExporting(false);

      Toast.show({
        type: 'success',
        text1: 'Export Successful!',
        text2: 'Image saved to your gallery',
      });

      // Navigate back to home after delay
      setTimeout(() => {
        navigation.navigate('Home');
      }, 1500);

    } catch (error: any) {
      console.error('Export error:', error);
      setExporting(false);
      Alert.alert('Export Failed', error.message || 'Please try again');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Toolbar */}
      <View style={styles.topToolbar}>
        {/* Left - Back button */}
        <TouchableOpacity
          onPress={handleBack}
          style={styles.toolbarButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={styles.toolbarButtonText}>Back</Text>
        </TouchableOpacity>

        {/* Center - Undo/Redo */}
        <View style={styles.toolbarCenter}>
          <TouchableOpacity
            onPress={handleUndo}
            style={[styles.toolbarButton, !canUndo && styles.toolbarButtonDisabled]}
            disabled={!canUndo}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-undo" size={24} color={canUndo ? "#FFFFFF" : "#666666"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRedo}
            style={[styles.toolbarButton, !canRedo && styles.toolbarButtonDisabled]}
            disabled={!canRedo}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-redo" size={24} color={canRedo ? "#FFFFFF" : "#666666"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReset}
            style={styles.toolbarButton}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Right - Export */}
        <TouchableOpacity
          onPress={handleExport}
          style={styles.toolbarButton}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={24} color="#FFFFFF" />
          <Text style={styles.toolbarButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Canvas Area (80%) */}
      <View style={styles.canvasArea}>
        {!imageLoaded ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: currentImageUri }}
              style={[
                styles.image,
                {
                  width: displayDimensions.width,
                  height: displayDimensions.height,
                },
              ]}
              resizeMode="contain"
              onError={() => {
                Alert.alert('Error', 'Failed to load image');
              }}
            />
          </View>
        )}
      </View>

      {/* Bottom Feature Panel (20%) */}
      <View style={styles.bottomPanel}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuresScroll}
        >
          {FEATURES.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              onPress={() => handleFeaturePress(feature.id)}
              style={[
                styles.featureButton,
                selectedFeature === feature.id && styles.featureButtonActive,
              ]}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.featureIconContainer,
                  { backgroundColor: feature.color },
                  selectedFeature === feature.id && styles.featureIconActive,
                ]}
              >
                <Ionicons
                  name={feature.icon as any}
                  size={28}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.featureLabel}>{feature.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Export Loading */}
      {exporting && (
        <View style={styles.exportOverlay}>
          <View style={styles.exportModal}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.exportText}>Saving to gallery...</Text>
          </View>
        </View>
      )}

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topToolbar: {
    height: 60,
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 6,
  },
  toolbarButtonDisabled: {
    opacity: 0.4,
  },
  toolbarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  toolbarCenter: {
    flexDirection: 'row',
    gap: 16,
  },
  canvasArea: {
    height: CANVAS_HEIGHT - 60, // Subtract toolbar height
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    backgroundColor: '#000000',
  },
  bottomPanel: {
    height: BOTTOM_PANEL_HEIGHT,
    backgroundColor: '#2a2a2a',
    borderTopWidth: 2,
    borderTopColor: '#333333',
  },
  featuresScroll: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  featureButton: {
    alignItems: 'center',
    width: 70,
  },
  featureButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  featureIconActive: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  featureLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  exportOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportModal: {
    backgroundColor: '#2a2a2a',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  exportText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
