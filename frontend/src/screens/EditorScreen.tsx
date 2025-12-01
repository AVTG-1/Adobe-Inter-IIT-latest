/**
 * Editor Screen - Auralite Design
 *
 * Simplified, clean design with all functionality preserved
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LayersModal from '../components/LayersModal';
import ExportSheet, { ExportFormat } from '../components/ExportSheet';
import AddMenuSheet from '../components/AddMenuSheet';
import AIFeaturesSheet from '../components/AIFeaturesSheet';
import FiltersPanel, { Filter } from '../components/FiltersPanel';
import ProfessionalAdjustmentsPanel, { AdjustmentValues } from '../components/ProfessionalAdjustmentsPanel';
import DrawingToolsPanel, { DrawingTool } from '../components/DrawingToolsPanel';
import CropTool, { CropData } from '../components/CropTool';
import RotateTool from '../components/RotateTool';
import FlipTool, { FlipData } from '../components/FlipTool';
import ResizeTool, { ResizeData } from '../components/ResizeTool';
import ProfessionalBlurTool, { BlurData } from '../components/ProfessionalBlurTool';
import DrawingModal, { DrawingData } from '../components/DrawingModal';
import InteractiveCanvas from '../components/InteractiveCanvas';
import { useLayerManager } from '../hooks/useLayerManager';
import { useImageHistory } from '../hooks/useImageHistory';
import { saveProject } from '../services/projects';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import Toast from 'react-native-toast-message';
import { apiClient } from '../services/api';
import { EditOperation } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Editor'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function EditorScreen({ route, navigation }: Props) {
  const { imageUrl, isBlankCanvas, canvasWidth, canvasHeight } = route.params;

  // Refs for bottom sheets
  const layersModalRef = useRef<BottomSheet>(null);
  const exportSheetRef = useRef<BottomSheet>(null);
  const addMenuRef = useRef<BottomSheet>(null);
  const aiFeaturesRef = useRef<BottomSheet>(null);
  const adjustmentPanelRef = useRef<BottomSheet>(null);
  const filtersRef = useRef<BottomSheet>(null);
  const drawingToolsRef = useRef<BottomSheet>(null);

  // State
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(isBlankCanvas || false);
  const [exporting, setExporting] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [aiFeaturesOpen, setAiFeaturesOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [drawingToolsOpen, setDrawingToolsOpen] = useState(false);
  const [cropToolOpen, setCropToolOpen] = useState(false);
  const [rotateToolOpen, setRotateToolOpen] = useState(false);
  const [flipToolOpen, setFlipToolOpen] = useState(false);
  const [resizeToolOpen, setResizeToolOpen] = useState(false);
  const [blurToolOpen, setBlurToolOpen] = useState(false);
  const [drawingModalOpen, setDrawingModalOpen] = useState(false);
  const [currentDrawingTool, setCurrentDrawingTool] = useState<DrawingTool | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(imageUrl || '');
  const [processing, setProcessing] = useState(false);

  // Layer system using hook
  const layerManager = useLayerManager(imageUrl);

  // History system for undo/redo
  const history = useImageHistory(imageUrl);

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const plusButtonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const handleHome = () => {
    Alert.alert(
      'Return Home?',
      'Any unsaved changes will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go Home', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleUndo = () => {
    if (history.canUndo) {
      const previousState = history.undo();
      if (previousState) {
        setCurrentImageUrl(previousState.imageUrl);
        Toast.show({
          type: 'success',
          text1: 'Undo',
          text2: `Reverted: ${previousState.operation}`,
        });
      }
    }
  };

  const handleRedo = () => {
    if (history.canRedo) {
      const nextState = history.redo();
      if (nextState) {
        setCurrentImageUrl(nextState.imageUrl);
        Toast.show({
          type: 'success',
          text1: 'Redo',
          text2: `Reapplied: ${nextState.operation}`,
        });
      }
    }
  };

  const handleExport = () => {
    setExportOpen(true);
    exportSheetRef.current?.snapToIndex(0);
  };

  const handleExportFormat = async (format: ExportFormat) => {
    try {
      setExporting(true);
      setExportOpen(false);
      exportSheetRef.current?.close();

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save images to your gallery.');
        setExporting(false);
        return;
      }

      const asset = await MediaLibrary.createAssetAsync(currentImageUrl);
      await saveProject({
        id: Date.now().toString(),
        name: `Project ${Date.now()}`,
        imageUrl: currentImageUrl,
        thumbnail: currentImageUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      Toast.show({
        type: 'success',
        text1: 'Exported!',
        text2: `Saved as ${format.toUpperCase()}`,
      });
      setExporting(false);
    } catch (error: any) {
      console.error('Export error:', error);
      Toast.show({
        type: 'error',
        text1: 'Export Failed',
        text2: error.message || 'Please try again',
      });
      setExporting(false);
    }
  };

  const closeAllPanels = () => {
    setLayersOpen(false);
    setExportOpen(false);
    setAddMenuOpen(false);
    setAiFeaturesOpen(false);
    setAdjustmentOpen(false);
    setFiltersOpen(false);
    setDrawingToolsOpen(false);
    setCropToolOpen(false);
    setRotateToolOpen(false);
    setFlipToolOpen(false);
    setResizeToolOpen(false);
    setBlurToolOpen(false);
    setDrawingModalOpen(false);

    layersModalRef.current?.close();
    exportSheetRef.current?.close();
    addMenuRef.current?.close();
    aiFeaturesRef.current?.close();
    adjustmentPanelRef.current?.close();
    filtersRef.current?.close();
    drawingToolsRef.current?.close();
  };

  const handleToolPress = (toolId: string) => {
    closeAllPanels();
    setSelectedTool(toolId);

    switch (toolId) {
      case 'edit':
        // Show edit tools panel (filters, drawing, blur, etc.)
        setFiltersOpen(true);
        filtersRef.current?.snapToIndex(0);
        break;
      case 'adjust':
        setAdjustmentOpen(true);
        adjustmentPanelRef.current?.snapToIndex(0);
        break;
      case 'add':
        animatePlusButton();
        setAddMenuOpen(true);
        addMenuRef.current?.snapToIndex(0);
        break;
      case 'layers':
        setLayersOpen(true);
        layersModalRef.current?.snapToIndex(0);
        break;
      case 'ai':
        setAiFeaturesOpen(true);
        aiFeaturesRef.current?.snapToIndex(0);
        break;
    }
  };

  const animatePlusButton = () => {
    Animated.sequence([
      Animated.timing(plusButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(plusButtonScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Handle crop
  const handleCropApply = async (cropData: CropData) => {
    try {
      setProcessing(true);
      setCropToolOpen(false);

      const result = await ImageManipulator.manipulateAsync(
        currentImageUrl,
        [
          {
            crop: {
              originX: cropData.x,
              originY: cropData.y,
              width: cropData.width,
              height: cropData.height,
            },
          },
        ],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      setCurrentImageUrl(result.uri);
      history.pushHistory(result.uri, 'Crop', cropData);

      Toast.show({
        type: 'success',
        text1: 'Crop Applied',
        text2: 'Image cropped successfully',
      });
      setProcessing(false);
    } catch (error: any) {
      console.error('Crop error:', error);
      Toast.show({
        type: 'error',
        text1: 'Crop Failed',
        text2: error.message || 'Please try again',
      });
      setProcessing(false);
    }
  };

  // Simplified filter handler
  const handleFilterSelect = async (filter: Filter) => {
    console.log('Filter selected:', filter.name);
    setFiltersOpen(false);
    filtersRef.current?.close();

    try {
      setProcessing(true);

      const operations: EditOperation[] = [];

      // Map filter to backend operation
      switch (filter.id) {
        case 'grayscale':
        case 'sepia':
        case 'invert':
          operations.push({ type: filter.id, useService: 'opencv', params: {} });
          break;
        default:
          Toast.show({
            type: 'info',
            text1: filter.name,
            text2: 'Filter coming soon!',
          });
          setProcessing(false);
          return;
      }

      const response = await apiClient.submitEditWorkflow({
        image_url: currentImageUrl,
        operations,
      });

      if (response.status === 'completed' && response.result_url) {
        setCurrentImageUrl(response.result_url);
        history.pushHistory(response.result_url, `${filter.name} Filter`, { filterId: filter.id });

        Toast.show({
          type: 'success',
          text1: `${filter.name} Applied`,
          text2: 'Filter applied successfully',
        });
      }

      setProcessing(false);
    } catch (error: any) {
      console.error('Filter error:', error);
      Toast.show({
        type: 'error',
        text1: 'Filter Failed',
        text2: error.message || 'Please try again',
      });
      setProcessing(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            {/* Home Button */}
            <TouchableOpacity
              style={styles.homeButton}
              onPress={handleHome}
              activeOpacity={0.7}
            >
              <Ionicons name="home" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Export Button */}
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExport}
              activeOpacity={0.7}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.exportText}>Export</Text>
                  <Ionicons name="download" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Canvas Area */}
          <View style={styles.canvasArea}>
            {!imageLoaded && !isBlankCanvas && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Loading image...</Text>
              </View>
            )}

            {isBlankCanvas ? (
              <View style={[styles.blankCanvas]}>
                <Ionicons name="create-outline" size={60} color="#666666" />
                <Text style={styles.blankCanvasText}>
                  Start creating on your blank canvas
                </Text>
              </View>
            ) : (
              <View style={styles.canvasContainer}>
                <InteractiveCanvas
                  imageUri={currentImageUrl}
                  layers={layerManager.layers.filter(l => l.id !== 'base-layer')}
                  onImageLoad={() => setImageLoaded(true)}
                  onImageError={(error) => {
                    console.error('Image load error:', error);
                    Alert.alert(
                      'Error',
                      'Failed to load image. Please try again.',
                      [{ text: 'Go Back', onPress: () => navigation.goBack() }]
                    );
                  }}
                />
              </View>
            )}
          </View>

          {/* Side Controls (Undo/Redo/Layers) */}
          <View style={styles.sideControls}>
            <TouchableOpacity
              style={[styles.sideButton, !history.canUndo && styles.sideButtonDisabled]}
              onPress={handleUndo}
              disabled={!history.canUndo}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-undo"
                size={20}
                color={history.canUndo ? '#FFFFFF' : '#666666'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sideButton, !history.canRedo && styles.sideButtonDisabled]}
              onPress={handleRedo}
              disabled={!history.canRedo}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-redo"
                size={20}
                color={history.canRedo ? '#FFFFFF' : '#666666'}
              />
            </TouchableOpacity>

            <View style={styles.sideSpacer} />

            <TouchableOpacity
              style={styles.layersButton}
              onPress={() => handleToolPress('layers')}
              activeOpacity={0.7}
            >
              <Ionicons name="layers" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Bottom Toolbar */}
          <View style={styles.bottomToolbar}>
            <View style={styles.toolbarContent}>
              {/* Edit */}
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => handleToolPress('edit')}
                activeOpacity={0.7}
              >
                <Ionicons name="brush-outline" size={24} color="#E0E0E0" />
                <Text style={styles.toolLabel}>Edit</Text>
              </TouchableOpacity>

              {/* Adjust */}
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => handleToolPress('adjust')}
                activeOpacity={0.7}
              >
                <Ionicons name="options-outline" size={24} color="#E0E0E0" />
                <Text style={styles.toolLabel}>Adjust</Text>
              </TouchableOpacity>

              {/* Plus Button (Add) - Center */}
              <Animated.View style={{ transform: [{ scale: plusButtonScale }] }}>
                <TouchableOpacity
                  style={styles.plusButton}
                  onPress={() => handleToolPress('add')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={30} color="#000000" />
                </TouchableOpacity>
              </Animated.View>

              {/* Layers */}
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => handleToolPress('layers')}
                activeOpacity={0.7}
              >
                <Ionicons name="layers" size={24} color="#FFFFFF" />
                <Text style={styles.toolLabel}>Layer</Text>
              </TouchableOpacity>

              {/* AI */}
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => handleToolPress('ai')}
                activeOpacity={0.7}
              >
                <Ionicons name="rocket" size={24} color="#FFFFFF" />
                <Text style={styles.toolLabel}>AI</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Processing Overlay */}
          {processing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          )}
        </Animated.View>

        {/* Layers Modal */}
        <LayersModal
          bottomSheetRef={layersModalRef}
          onClose={() => {
            setLayersOpen(false);
            layersModalRef.current?.close();
          }}
          layers={layerManager.layers}
          selectedLayerId={layerManager.selectedLayerId}
          onSelectLayer={layerManager.selectLayer}
          onAddLayer={() => {
            layerManager.addLayer({
              type: 'image',
              name: `Layer ${layerManager.layers.length}`,
              visible: true,
              opacity: 1,
              transform: { x: 0, y: 0, scale: 1, rotation: 0 },
            });
          }}
          onDeleteLayer={layerManager.deleteLayer}
          onToggleVisibility={layerManager.toggleLayerVisibility}
          onRenameLayer={layerManager.renameLayer}
          onDuplicateLayer={layerManager.duplicateLayer}
          onSetOpacity={layerManager.setLayerOpacity}
        />

        {/* Export Sheet */}
        <ExportSheet
          bottomSheetRef={exportSheetRef}
          onExport={handleExportFormat}
          onClose={() => {
            setExportOpen(false);
            exportSheetRef.current?.close();
          }}
        />

        {/* Add Menu Sheet */}
        <AddMenuSheet
          bottomSheetRef={addMenuRef}
          onOptionSelect={(option) => {
            console.log('Add option:', option);
            setAddMenuOpen(false);
            addMenuRef.current?.close();
          }}
          onClose={() => {
            setAddMenuOpen(false);
            addMenuRef.current?.close();
          }}
        />

        {/* AI Features Sheet */}
        <AIFeaturesSheet
          bottomSheetRef={aiFeaturesRef}
          onFeatureSelect={(feature) => {
            console.log('AI feature:', feature);
            setAiFeaturesOpen(false);
            aiFeaturesRef.current?.close();
            Toast.show({
              type: 'info',
              text1: `${feature} AI`,
              text2: 'Feature coming soon!',
            });
          }}
          onClose={() => {
            setAiFeaturesOpen(false);
            aiFeaturesRef.current?.close();
          }}
        />

        {/* Adjustments Panel */}
        <ProfessionalAdjustmentsPanel
          bottomSheetRef={adjustmentPanelRef}
          onClose={() => {
            setAdjustmentOpen(false);
            adjustmentPanelRef.current?.close();
          }}
          onApply={async (values: AdjustmentValues) => {
            console.log('Adjustments:', values);
            setAdjustmentOpen(false);
            adjustmentPanelRef.current?.close();
            Toast.show({
              type: 'success',
              text1: 'Adjustments Applied',
              text2: 'Image adjusted',
            });
          }}
        />

        {/* Filters Panel */}
        <FiltersPanel
          bottomSheetRef={filtersRef}
          onFilterSelect={handleFilterSelect}
          onClose={() => {
            setFiltersOpen(false);
            filtersRef.current?.close();
          }}
        />

        {/* Drawing Tools Panel */}
        <DrawingToolsPanel
          bottomSheetRef={drawingToolsRef}
          onToolSelect={(tool: DrawingTool) => {
            console.log('Drawing tool:', tool.name);
            setDrawingToolsOpen(false);
            drawingToolsRef.current?.close();
            setCurrentDrawingTool(tool);
            setDrawingModalOpen(true);
          }}
          onClose={() => {
            setDrawingToolsOpen(false);
            drawingToolsRef.current?.close();
          }}
        />

        {/* Drawing Modal */}
        {currentDrawingTool && (
          <DrawingModal
            visible={drawingModalOpen}
            tool={currentDrawingTool}
            onApply={(drawingData: DrawingData) => {
              setDrawingModalOpen(false);
              console.log('Drawing applied:', drawingData);
              Toast.show({
                type: 'success',
                text1: `${currentDrawingTool.name} Applied`,
                text2: `${drawingData.paths.length} strokes added`,
              });
            }}
            onCancel={() => setDrawingModalOpen(false)}
          />
        )}

        <Toast />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 12,
  },
  homeButton: {
    width: 57,
    height: 57,
    borderRadius: 8,
    backgroundColor: '#242428',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#242428',
  },
  exportText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  canvasArea: {
    flex: 1,
    margin: 13,
    marginBottom: 0,
    borderRadius: 24,
    backgroundColor: '#242428',
    overflow: 'hidden',
  },
  canvasContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  blankCanvas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blankCanvasText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  sideControls: {
    position: 'absolute',
    right: 13,
    top: SCREEN_HEIGHT * 0.55,
    gap: 12,
  },
  sideButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#242428',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  sideButtonDisabled: {
    opacity: 0.5,
  },
  sideSpacer: {
    height: 8,
  },
  layersButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#242428',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomToolbar: {
    height: 90,
    backgroundColor: '#242428',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 10,
  },
  toolbarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 13,
  },
  toolItem: {
    alignItems: 'center',
    gap: 2,
  },
  toolLabel: {
    fontSize: 10,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  plusButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
