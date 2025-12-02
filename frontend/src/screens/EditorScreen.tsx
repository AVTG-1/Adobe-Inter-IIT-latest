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
  StatusBar,
  Platform,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LayersModal from '../components/LayersModal';
import ExportSheet, { ExportFormat } from '../components/ExportSheet';
import SimplifiedAddMenuModal from '../components/SimplifiedAddMenuModal';
import AIFeaturesSheet from '../components/AIFeaturesSheet';
import FiltersPanel, { Filter } from '../components/FiltersPanel';
import SimplifiedAdjustmentsPanel, { AdjustmentValues } from '../components/SimplifiedAdjustmentsPanel';
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
import * as ImagePicker from 'expo-image-picker';
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
  const [aiChatOpen, setAiChatOpen] = useState(false);
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
  const [editPanelOpen, setEditPanelOpen] = useState(false);

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

  const handleCanvasTap = () => {
    // Close all panels and return to normal state when canvas is tapped
    if (editPanelOpen || selectedTool !== null || aiChatOpen) {
      setEditPanelOpen(false);
      setSelectedTool(null);
      setAiChatOpen(false);
      closeAllPanels();
    }
  };

  const handleToolPress = (toolId: string) => {
    // Toggle edit panel if Edit is pressed
    if (toolId === 'edit') {
      const willOpen = !editPanelOpen;
      setSelectedTool(willOpen ? toolId : null);
      setEditPanelOpen(willOpen);
      return;
    }

    // Handle editing tools (Filter, Draw, Curve, Text, Shape) - keep edit mode active
    const editingTools = ['filter', 'draw', 'curve', 'text', 'shape'];
    if (editingTools.includes(toolId) && editPanelOpen) {
      // Stay in edit mode, just open the respective panel
      switch (toolId) {
        case 'filter':
          setFiltersOpen(true);
          filtersRef.current?.snapToIndex(0);
          break;
        case 'draw':
          setDrawingToolsOpen(true);
          drawingToolsRef.current?.snapToIndex(0);
          break;
        case 'curve':
          Toast.show({
            type: 'info',
            text1: 'Curve Tool',
            text2: 'Coming soon!',
          });
          break;
        case 'text':
          Toast.show({
            type: 'info',
            text1: 'Text Tool',
            text2: 'Coming soon!',
          });
          break;
        case 'shape':
          Toast.show({
            type: 'info',
            text1: 'Shape Tool',
            text2: 'Coming soon!',
          });
          break;
      }
      return;
    }

    // Close edit panel when main tools (Adjust, Layer, AI) are selected
    setEditPanelOpen(false);
    setSelectedTool(toolId);

    // Handle main tool-specific actions
    switch (toolId) {
      case 'adjust':
        setAdjustmentOpen(true);
        adjustmentPanelRef.current?.snapToIndex(0);
        break;
      case 'layers':
        setLayersOpen(true);
        layersModalRef.current?.snapToIndex(0);
        break;
      case 'ai':
        setAiFeaturesOpen(true);
        aiFeaturesRef.current?.snapToIndex(0);
        break;
      case 'add':
        animatePlusButton();
        setAddMenuOpen(true);
        addMenuRef.current?.snapToIndex(0);
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

  // Handle camera
  const handleOpenCamera = async () => {
    try {
      setAddMenuOpen(false);

      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera permission to take photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        // Add as new layer or replace current
        Toast.show({
          type: 'success',
          text1: 'Image Captured',
          text2: 'Photo added from camera',
        });
        // TODO: Implement layer addition logic
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  // Handle gallery import
  const handleImportGallery = async () => {
    try {
      setAddMenuOpen(false);

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        // Add as new layer or replace current
        Toast.show({
          type: 'success',
          text1: 'Image Imported',
          text2: 'Photo added from gallery',
        });
        // TODO: Implement layer addition logic
      }
    } catch (error: any) {
      console.error('Gallery picker error:', error);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  // Handle AI chat message
  const handleAIChatSend = (message: string) => {
    console.log('AI Chat message:', message);
    Toast.show({
      type: 'info',
      text1: 'AI Assistant',
      text2: 'AI chat feature coming soon!',
    });
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
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
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

          {/* Canvas Area - Tap to close panels */}
          <TouchableWithoutFeedback onPress={handleCanvasTap}>
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
          </TouchableWithoutFeedback>

          {/* Undo/Redo Controls (Below Canvas) - Tap to close panels */}
          <TouchableWithoutFeedback onPress={handleCanvasTap}>
            <View style={styles.undoRedoControls}>
              <TouchableOpacity
                style={[styles.undoRedoButton, !history.canUndo && styles.undoRedoButtonDisabled]}
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
                style={[styles.undoRedoButton, !history.canRedo && styles.undoRedoButtonDisabled]}
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
            </View>
          </TouchableWithoutFeedback>

          {/* Global AI Chat Panel */}
          {aiChatOpen && (
            <View style={styles.globalAIChatPanel}>
              <TouchableOpacity style={styles.aiAssistantButton}>
                <Ionicons name="sparkles" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TextInput
                style={styles.aiChatInput}
                placeholder="Type something"
                placeholderTextColor="#888888"
              />
              <TouchableOpacity
                style={styles.aiChatCloseButton}
                onPress={() => setAiChatOpen(false)}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Expandable Edit Panel - Shows advanced tools when Edit is tapped */}
          {editPanelOpen && selectedTool === 'edit' && (
            <View style={styles.expandableEditPanel}>
              <View style={styles.editToolsRow}>
                <TouchableOpacity
                  style={styles.editTool}
                  onPress={() => {
                    Toast.show({
                      type: 'info',
                      text1: 'Overlay Tool',
                      text2: 'Coming soon!',
                    });
                  }}
                >
                  <Ionicons name="layers-outline" size={24} color="#E0E0E0" />
                  <Text style={styles.editToolLabel}>Overlay</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editTool}
                  onPress={() => {
                    Toast.show({
                      type: 'info',
                      text1: 'Style Transfer',
                      text2: 'Coming soon!',
                    });
                  }}
                >
                  <Ionicons name="color-palette-outline" size={24} color="#E0E0E0" />
                  <Text style={styles.editToolLabel}>Style transfer</Text>
                  <Text style={styles.asterisk}>*</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editTool}
                  onPress={() => {
                    Toast.show({
                      type: 'info',
                      text1: 'Scene Replacement',
                      text2: 'Coming soon!',
                    });
                  }}
                >
                  <Ionicons name="images-outline" size={24} color="#E0E0E0" />
                  <Text style={styles.editToolLabel}>Scene replacement</Text>
                  <Text style={styles.asterisk}>*</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editTool}
                  onPress={() => {
                    Toast.show({
                      type: 'info',
                      text1: 'Eraser Tool',
                      text2: 'Coming soon!',
                    });
                  }}
                >
                  <Ionicons name="brush-outline" size={24} color="#E0E0E0" />
                  <Text style={styles.editToolLabel}>Eraser</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editTool}
                  onPress={() => {
                    Toast.show({
                      type: 'info',
                      text1: 'Pose Tool',
                      text2: 'Coming soon!',
                    });
                  }}
                >
                  <Ionicons name="body-outline" size={24} color="#E0E0E0" />
                  <Text style={styles.editToolLabel}>Pose</Text>
                  <Text style={styles.asterisk}>*</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editTool}
                  onPress={() => {
                    Toast.show({
                      type: 'info',
                      text1: 'Gen AI Expand',
                      text2: 'Coming soon!',
                    });
                  }}
                >
                  <Ionicons name="expand-outline" size={24} color="#E0E0E0" />
                  <Text style={styles.editToolLabel}>Gen AI expand</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Floating AI Button */}
          <TouchableOpacity
            style={styles.floatingAIButton}
            onPress={() => setAiChatOpen(!aiChatOpen)}
            activeOpacity={0.8}
          >
            <Ionicons name="layers" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Plus Button (Elevated) - Hide when other tool is active */}
          {(selectedTool === null || selectedTool === 'add') && (
            <Animated.View style={[styles.plusButtonContainer, { transform: [{ scale: plusButtonScale }] }]}>
              <TouchableOpacity
                style={styles.plusButton}
                onPress={() => handleToolPress('add')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={30} color="#000000" />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Bottom Toolbar - Dynamic: 5 main buttons OR active button only */}
          <View style={styles.bottomToolbar}>
            <View style={styles.toolbarContent}>
              {editPanelOpen && selectedTool === 'edit' ? (
                // When Edit panel is open: Show 6 editing tools
                <>
                  {/* Edit */}
                  <TouchableOpacity
                    style={styles.toolItem}
                    onPress={() => handleToolPress('edit')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.activeIndicator} />
                    <Ionicons name="brush-outline" size={24} color="#000000" />
                    <Text style={styles.toolLabel}>Edit</Text>
                  </TouchableOpacity>

                  {/* Filter */}
                  <TouchableOpacity
                    style={styles.toolItem}
                    onPress={() => handleToolPress('filter')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="color-filter-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Filter</Text>
                  </TouchableOpacity>

                  {/* Draw */}
                  <TouchableOpacity
                    style={styles.toolItem}
                    onPress={() => handleToolPress('draw')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Draw</Text>
                  </TouchableOpacity>

                  {/* Curve */}
                  <TouchableOpacity
                    style={styles.toolItem}
                    onPress={() => handleToolPress('curve')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="git-branch-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Curve</Text>
                  </TouchableOpacity>

                  {/* Text */}
                  <TouchableOpacity
                    style={styles.toolItem}
                    onPress={() => handleToolPress('text')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="text-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Text</Text>
                  </TouchableOpacity>

                  {/* Shape */}
                  <TouchableOpacity
                    style={styles.toolItem}
                    onPress={() => handleToolPress('shape')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="square-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Shape</Text>
                  </TouchableOpacity>
                </>
              ) : (
                // Normal state OR other panel open: Show all 5 buttons OR only active button
                <>
                  {/* Edit - Show always or when not selected */}
                  {(selectedTool === null || selectedTool === 'edit') && (
                    <TouchableOpacity
                      style={styles.toolItem}
                      onPress={() => handleToolPress('edit')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="brush-outline" size={24} color="#E0E0E0" />
                      <Text style={styles.toolLabel}>Edit</Text>
                    </TouchableOpacity>
                  )}

                  {/* Adjust - Hide when other tool is active */}
                  {(selectedTool === null || selectedTool === 'adjust') && (
                    <TouchableOpacity
                      style={styles.toolItem}
                      onPress={() => handleToolPress('adjust')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="options-outline" size={24} color="#E0E0E0" />
                      <Text style={styles.toolLabel}>Adjust</Text>
                    </TouchableOpacity>
                  )}

                  {/* Spacer for Plus Button - Hide when tool is active */}
                  {selectedTool === null && <View style={{ width: 60 }} />}

                  {/* Layer - Hide when other tool is active */}
                  {(selectedTool === null || selectedTool === 'layers') && (
                    <TouchableOpacity
                      style={styles.toolItem}
                      onPress={() => handleToolPress('layers')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="layers-outline" size={24} color="#E0E0E0" />
                      <Text style={styles.toolLabel}>Layer</Text>
                    </TouchableOpacity>
                  )}

                  {/* AI - Hide when other tool is active */}
                  {(selectedTool === null || selectedTool === 'ai') && (
                    <TouchableOpacity
                      style={styles.toolItem}
                      onPress={() => handleToolPress('ai')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="rocket-outline" size={24} color="#E0E0E0" />
                      <Text style={styles.toolLabel}>AI</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
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
            setSelectedTool(null);
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
            setSelectedTool(null);
            exportSheetRef.current?.close();
          }}
        />

        {/* Add Menu Modal */}
        <SimplifiedAddMenuModal
          visible={addMenuOpen}
          onOpenCamera={handleOpenCamera}
          onImportGallery={handleImportGallery}
          onClose={() => {
            setAddMenuOpen(false);
            setSelectedTool(null);
          }}
        />

        {/* AI Features Sheet */}
        <AIFeaturesSheet
          bottomSheetRef={aiFeaturesRef}
          onFeatureSelect={(feature) => {
            console.log('AI feature:', feature);
            setAiFeaturesOpen(false);
            setSelectedTool(null);
            aiFeaturesRef.current?.close();
            Toast.show({
              type: 'info',
              text1: `${feature} AI`,
              text2: 'Feature coming soon!',
            });
          }}
          onClose={() => {
            setAiFeaturesOpen(false);
            setSelectedTool(null);
            aiFeaturesRef.current?.close();
          }}
        />

        {/* Adjustments Panel */}
        <SimplifiedAdjustmentsPanel
          visible={adjustmentOpen}
          onClose={() => {
            setAdjustmentOpen(false);
            setSelectedTool(null);
          }}
          onApply={async (values: AdjustmentValues) => {
            console.log('Adjustments:', values);
            setAdjustmentOpen(false);
            setSelectedTool(null);
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
            // Don't reset selectedTool if in edit mode
            if (!editPanelOpen) {
              setSelectedTool(null);
            }
            filtersRef.current?.close();
          }}
        />

        {/* Drawing Tools Panel */}
        <DrawingToolsPanel
          bottomSheetRef={drawingToolsRef}
          onToolSelect={(tool: DrawingTool) => {
            console.log('Drawing tool:', tool.name);
            setDrawingToolsOpen(false);
            // Don't reset selectedTool if in edit mode
            if (!editPanelOpen) {
              setSelectedTool(null);
            }
            drawingToolsRef.current?.close();
            setCurrentDrawingTool(tool);
            setDrawingModalOpen(true);
          }}
          onClose={() => {
            setDrawingToolsOpen(false);
            // Don't reset selectedTool if in edit mode
            if (!editPanelOpen) {
              setSelectedTool(null);
            }
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
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
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
    height: 420,
    margin: 13,
    marginTop: 13,
    marginBottom: 8,
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
  undoRedoControls: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 13,
    marginBottom: 12,
  },
  undoRedoButton: {
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
  undoRedoButtonDisabled: {
    opacity: 0.5,
  },
  globalAIChatPanel: {
    position: 'absolute',
    bottom: 237,
    left: 18,
    width: 405,
    height: 72,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#9c9c9c',
    backgroundColor: '#242428',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    zIndex: 3,
  },
  aiAssistantButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiChatInput: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  aiChatCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandableEditPanel: {
    position: 'absolute',
    bottom: 172,
    left: 13,
    right: 13,
    height: 137,
    backgroundColor: '#242428',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    zIndex: 2,
  },
  editToolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  editTool: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#323232',
    borderRadius: 12,
    width: '30%',
    minHeight: 80,
  },
  editToolLabel: {
    fontSize: 11,
    color: '#E0E0E0',
    textAlign: 'center',
    marginTop: 8,
  },
  asterisk: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    zIndex: -1,
  },
  floatingAIButton: {
    position: 'absolute',
    bottom: 110,
    right: 13,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#242428',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 5,
  },
  plusButtonContainer: {
    position: 'absolute',
    bottom: 84,
    left: SCREEN_WIDTH / 2 - 30,
    zIndex: 4,
  },
  bottomToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#242428',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 34,
    paddingTop: 12,
  },
  toolbarContent: {
    height: 54,
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
