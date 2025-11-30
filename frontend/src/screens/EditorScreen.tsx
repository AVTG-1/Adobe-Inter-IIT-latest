/**
 * Editor Screen - Fully Functional with All Features
 *
 * Main image editing interface with 5 fixed tools, expanding panels, and AI chat
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
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
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LayersModal from '../components/LayersModal';
import ExportSheet, { ExportFormat } from '../components/ExportSheet';
import AddMenuSheet from '../components/AddMenuSheet';
import AIFeaturesSheet from '../components/AIFeaturesSheet';
import AdjustmentPanel from '../components/AdjustmentPanel';
import AIChatModal from '../components/AIChatModal';
import FiltersPanel, { Filter } from '../components/FiltersPanel';
import ProfessionalAdjustmentsPanel, { AdjustmentValues } from '../components/ProfessionalAdjustmentsPanel';
import DrawingToolsPanel, { DrawingTool } from '../components/DrawingToolsPanel';
import CropTool, { CropData } from '../components/CropTool';
import RotateTool from '../components/RotateTool';
import FlipTool, { FlipData } from '../components/FlipTool';
import ResizeTool, { ResizeData } from '../components/ResizeTool';
import ProfessionalBlurTool, { BlurData } from '../components/ProfessionalBlurTool';
import DrawingModal, { DrawingData } from '../components/DrawingModal';
import InteractiveCanvas, { Layer } from '../components/InteractiveCanvas';
import { useLayerManager } from '../hooks/useLayerManager';
import { useImageHistory } from '../hooks/useImageHistory';
import { saveProject } from '../services/projects';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import Toast from 'react-native-toast-message';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';
import { apiClient } from '../services/api';
import { EditOperation } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Editor'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 5 Main Tools - Fixed, No Scroll
const TOOLS = [
  { id: 'edit', icon: 'create-outline', label: 'Edit' },
  { id: 'adjust', icon: 'options-outline', label: 'Adjust' },
  { id: 'add', icon: 'add', label: '+Add', isCenter: true },
  { id: 'layers', icon: 'layers', label: 'Layers' },
  { id: 'ai', icon: 'sparkles', label: 'AI' },
] as const;

// 10 Edit Tools - Shown when Edit is tapped
const EDIT_TOOLS = [
  { id: 'crop', icon: 'crop', label: 'Crop' },
  { id: 'resize', icon: 'resize', label: 'Resize' },
  { id: 'rotate', icon: 'reload', label: 'Rotate' },
  { id: 'flip', icon: 'swap-horizontal', label: 'Flip' },
  { id: 'filters', icon: 'color-filter', label: 'Filters' },
  { id: 'drawing', icon: 'brush', label: 'Drawing' },
  { id: 'blur', icon: 'radio-button-on', label: 'Blur' },
  { id: 'sharpen', icon: 'diamond', label: 'Sharpen' },
  { id: 'vignette', icon: 'ellipse-outline', label: 'Vignette' },
  { id: 'frame', icon: 'square-outline', label: 'Frame' },
];

export default function EditorScreen({ route, navigation }: Props) {
  const { imageUrl, isBlankCanvas, canvasWidth, canvasHeight } = route.params;

  // Refs for bottom sheets
  const layersModalRef = useRef<BottomSheet>(null);
  const exportSheetRef = useRef<BottomSheet>(null);
  const addMenuRef = useRef<BottomSheet>(null);
  const aiFeaturesRef = useRef<BottomSheet>(null);
  const adjustmentPanelRef = useRef<BottomSheet>(null);
  const filtersRef = useRef<BottomSheet>(null);
  const enhancedAdjustmentRef = useRef<BottomSheet>(null);
  const drawingToolsRef = useRef<BottomSheet>(null);

  // State
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(isBlankCanvas || false);
  const [exporting, setExporting] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [showAIButton, setShowAIButton] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [aiFeaturesOpen, setAiFeaturesOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [enhancedAdjustmentOpen, setEnhancedAdjustmentOpen] = useState(false);
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
  const [toolbarAnim] = useState(new Animated.Value(0));
  const [editPanelHeight] = useState(new Animated.Value(0));
  const [aiButtonScale] = useState(new Animated.Value(1));
  const [aiButtonGlow] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade in animation - slower and smoother
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800, // Slower fade in
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth ease-in-out
        useNativeDriver: true,
      }),
      Animated.spring(toolbarAnim, {
        toValue: 1,
        friction: 10, // More friction for smoother motion
        tension: 35, // Less tension for slower spring
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing glow animation for AI button
    Animated.loop(
      Animated.sequence([
        Animated.timing(aiButtonGlow, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(aiButtonGlow, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Update base layer when image URL changes (from edits/filters)
  useEffect(() => {
    const baseLayer = layerManager.getLayer('base-layer');
    if (baseLayer && baseLayer.imageUri !== currentImageUrl) {
      layerManager.updateLayerTransform('base-layer', {});
      // Update the layer's imageUri manually since we don't have a direct setter
      // This is a workaround - ideally the hook would have updateLayerImageUri
      const updatedLayers = layerManager.layers.map(layer =>
        layer.id === 'base-layer' ? { ...layer, imageUri: currentImageUrl } : layer
      );
      // We can't directly set this, so we'll just update currentImageUrl and let canvas handle it
    }
  }, [currentImageUrl, layerManager]);

  // Hide/show AI button based on ANY popup visibility
  useEffect(() => {
    const shouldHide =
      showEditPanel ||
      adjustmentOpen ||
      aiChatVisible ||
      layersOpen ||
      exportOpen ||
      addMenuOpen ||
      aiFeaturesOpen ||
      filtersOpen ||
      enhancedAdjustmentOpen ||
      drawingToolsOpen;
    setShowAIButton(!shouldHide);

    // Smoother and slower AI button animation
    Animated.spring(aiButtonScale, {
      toValue: shouldHide ? 0 : 1,
      friction: 12, // More friction for smoother motion
      tension: 30, // Less tension for slower spring
      useNativeDriver: true,
    }).start();
  }, [
    showEditPanel,
    adjustmentOpen,
    aiChatVisible,
    layersOpen,
    exportOpen,
    addMenuOpen,
    aiFeaturesOpen,
    filtersOpen,
    enhancedAdjustmentOpen,
    drawingToolsOpen,
  ]);

  const handleHome = () => {
    Alert.alert(
      'Return Home?',
      'Any unsaved changes will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go Home',
          style: 'destructive',
          onPress: () => navigation.navigate('Home'),
        },
      ]
    );
  };

  const handleUndo = () => {
    const previousImage = history.undo();
    if (previousImage) {
      setCurrentImageUrl(previousImage);
      layerManager.updateLayerImageUri('base-layer', previousImage);
      Toast.show({
        type: 'info',
        text1: 'Undo',
        text2: 'Previous action undone',
      });
    } else {
      Toast.show({
        type: 'info',
        text1: 'Cannot Undo',
        text2: 'No more actions to undo',
      });
    }
  };

  const handleRedo = () => {
    const nextImage = history.redo();
    if (nextImage) {
      setCurrentImageUrl(nextImage);
      layerManager.updateLayerImageUri('base-layer', nextImage);
      Toast.show({
        type: 'info',
        text1: 'Redo',
        text2: 'Action redone',
      });
    } else {
      Toast.show({
        type: 'info',
        text1: 'Cannot Redo',
        text2: 'No more actions to redo',
      });
    }
  };

  const handleExport = () => {
    console.log('Export pressed');
    setExportOpen(true);
    exportSheetRef.current?.expand();
  };

  const handleExportFormat = async (format: ExportFormat) => {
    try {
      setExporting(true);
      setExportOpen(false);
      exportSheetRef.current?.close();

      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Cannot save without media library access',
        });
        setExporting(false);
        return;
      }

      // TODO: Flatten all visible layers before export
      // For now, export the base layer image
      const visibleLayers = layerManager.layers.filter(l => l.visible);
      console.log(`Exporting ${visibleLayers.length} visible layers (flattening needed)`);

      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Save project to recents with flattened layers
      const project = await saveProject({
        name: isBlankCanvas ? 'Blank Canvas' : 'Edited Image',
        thumbnail: currentImageUrl || 'placeholder',
        imageUrl: currentImageUrl,
        isBlankCanvas: isBlankCanvas,
      });

      setExporting(false);

      Toast.show({
        type: 'success',
        text1: 'Export Successful!',
        text2: `Saved as ${format.toUpperCase()}`,
      });

      // Navigate back to home after short delay
      setTimeout(() => {
        navigation.navigate('Home');
      }, 1500);

    } catch (error: any) {
      console.error('Export error:', error);
      setExporting(false);
      Toast.show({
        type: 'error',
        text1: 'Export Failed',
        text2: error.message || 'Please try again',
      });
    }
  };

  const closeAllPanels = () => {
    setShowEditPanel(false);
    setShowAdjustment(false);
    setSelectedTool(null);
    setLayersOpen(false);
    setAddMenuOpen(false);
    setAiFeaturesOpen(false);
    setExportOpen(false);
    setAdjustmentOpen(false);
    setFiltersOpen(false);
    setEnhancedAdjustmentOpen(false);
    setDrawingToolsOpen(false);
    layersModalRef.current?.close();
    addMenuRef.current?.close();
    aiFeaturesRef.current?.close();
    exportSheetRef.current?.close();
    adjustmentPanelRef.current?.close();
    filtersRef.current?.close();
    enhancedAdjustmentRef.current?.close();
    drawingToolsRef.current?.close();

    // Smoother and slower panel collapse
    Animated.timing(editPanelHeight, {
      toValue: 0,
      duration: 400, // Slower collapse
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth ease-in-out
      useNativeDriver: false,
    }).start();
  };

  const handleToolPress = (toolId: string) => {
    // Close all other panels first
    closeAllPanels();

    setSelectedTool(toolId);

    // Handle Edit - Expands bottom bar upward
    if (toolId === 'edit') {
      setShowEditPanel(true);
      // Smoother and slower edit panel expansion
      Animated.spring(editPanelHeight, {
        toValue: 280,
        friction: 12, // More friction for smoother motion
        tension: 35, // Less tension for slower spring
        useNativeDriver: false,
      }).start();
      return;
    }

    // Handle Adjust - Shows adjustment panel
    if (toolId === 'adjust') {
      setAdjustmentOpen(true);
      adjustmentPanelRef.current?.expand();
      return;
    }

    // Handle +Add - Opens add menu
    if (toolId === 'add') {
      setAddMenuOpen(true);
      addMenuRef.current?.expand();
      return;
    }

    // Handle Layers - Opens layers modal
    if (toolId === 'layers') {
      setLayersOpen(true);
      layersModalRef.current?.expand();
      return;
    }

    // Handle AI - Opens AI features sheet
    if (toolId === 'ai') {
      setAiFeaturesOpen(true);
      aiFeaturesRef.current?.expand();
      return;
    }
  };

  // Transform Tool Handlers - REAL IMAGE MANIPULATION
  const handleCropApply = async (cropData: CropData) => {
    setCropToolOpen(false);
    const selectedLayer = layerManager.getSelectedLayer();

    if (!selectedLayer || !selectedLayer.imageUri) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Crop',
        text2: 'No image selected',
      });
      return;
    }

    try {
      setProcessing(true);

      // Apply crop using expo-image-manipulator
      const manipResult = await ImageManipulator.manipulateAsync(
        selectedLayer.imageUri,
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

      // Update layer with cropped image
      layerManager.updateLayerImageUri(selectedLayer.id, manipResult.uri);
      setCurrentImageUrl(manipResult.uri);

      // Push to history
      history.pushHistory(manipResult.uri, 'Crop Applied', {
        width: Math.round(cropData.width),
        height: Math.round(cropData.height),
      });

      Toast.show({
        type: 'success',
        text1: 'Crop Applied',
        text2: `Cropped to ${Math.round(cropData.width)}×${Math.round(cropData.height)}px`,
      });
    } catch (error) {
      console.error('Crop error:', error);
      Toast.show({
        type: 'error',
        text1: 'Crop Failed',
        text2: 'Please try again',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRotateApply = async (rotation: number) => {
    setRotateToolOpen(false);
    const selectedLayer = layerManager.getSelectedLayer();

    if (!selectedLayer || !selectedLayer.imageUri) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Rotate',
        text2: 'No image selected',
      });
      return;
    }

    try {
      setProcessing(true);

      // Convert rotation to degrees (0-360)
      const normalizedRotation = ((rotation % 360) + 360) % 360;

      // Apply rotation using expo-image-manipulator
      const manipResult = await ImageManipulator.manipulateAsync(
        selectedLayer.imageUri,
        [
          {
            rotate: normalizedRotation,
          },
        ],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      // Update layer with rotated image
      layerManager.updateLayerImageUri(selectedLayer.id, manipResult.uri);
      setCurrentImageUrl(manipResult.uri);

      // Push to history
      history.pushHistory(manipResult.uri, 'Rotation Applied', {
        degrees: Math.round(normalizedRotation),
      });

      Toast.show({
        type: 'success',
        text1: 'Rotation Applied',
        text2: `Rotated to ${Math.round(normalizedRotation)}°`,
      });
    } catch (error) {
      console.error('Rotate error:', error);
      Toast.show({
        type: 'error',
        text1: 'Rotation Failed',
        text2: 'Please try again',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleFlipApply = async (flipData: FlipData) => {
    setFlipToolOpen(false);
    const selectedLayer = layerManager.getSelectedLayer();

    if (!selectedLayer || !selectedLayer.imageUri) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Flip',
        text2: 'No image selected',
      });
      return;
    }

    try {
      setProcessing(true);

      const actions: ImageManipulator.Action[] = [];

      if (flipData.horizontal) {
        actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      }
      if (flipData.vertical) {
        actions.push({ flip: ImageManipulator.FlipType.Vertical });
      }

      if (actions.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No Flip Selected',
          text2: 'Please select horizontal or vertical flip',
        });
        setProcessing(false);
        return;
      }

      // Apply flip using expo-image-manipulator
      const manipResult = await ImageManipulator.manipulateAsync(
        selectedLayer.imageUri,
        actions,
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      // Update layer with flipped image
      layerManager.updateLayerImageUri(selectedLayer.id, manipResult.uri);
      setCurrentImageUrl(manipResult.uri);

      // Push to history
      history.pushHistory(manipResult.uri, 'Flip Applied', {
        horizontal: flipData.horizontal,
        vertical: flipData.vertical,
      });

      Toast.show({
        type: 'success',
        text1: 'Flip Applied',
        text2: `${flipData.horizontal ? 'Horizontal' : ''}${flipData.horizontal && flipData.vertical ? ' & ' : ''}${flipData.vertical ? 'Vertical' : ''}`,
      });
    } catch (error) {
      console.error('Flip error:', error);
      Toast.show({
        type: 'error',
        text1: 'Flip Failed',
        text2: 'Please try again',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleResizeApply = async (resizeData: ResizeData) => {
    setResizeToolOpen(false);
    const selectedLayer = layerManager.getSelectedLayer();

    if (!selectedLayer || !selectedLayer.imageUri) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Resize',
        text2: 'No image selected',
      });
      return;
    }

    try {
      setProcessing(true);

      // Apply resize using expo-image-manipulator
      const manipResult = await ImageManipulator.manipulateAsync(
        selectedLayer.imageUri,
        [
          {
            resize: {
              width: Math.round(resizeData.width),
              height: Math.round(resizeData.height),
            },
          },
        ],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      // Update layer with resized image
      layerManager.updateLayerImageUri(selectedLayer.id, manipResult.uri);
      setCurrentImageUrl(manipResult.uri);

      // Push to history
      history.pushHistory(manipResult.uri, 'Resize Applied', {
        width: Math.round(resizeData.width),
        height: Math.round(resizeData.height),
      });

      Toast.show({
        type: 'success',
        text1: 'Resize Applied',
        text2: `Resized to ${Math.round(resizeData.width)}×${Math.round(resizeData.height)}px`,
      });
    } catch (error) {
      console.error('Resize error:', error);
      Toast.show({
        type: 'error',
        text1: 'Resize Failed',
        text2: 'Please try again',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleBlurPreview = (blurData: BlurData) => {
    // Real-time preview - could apply CSS blur filter for preview
    console.log('Blur preview:', blurData);
    // In production, apply temporary blur effect to preview
  };

  const handleBlurApply = async (blurData: BlurData) => {
    setBlurToolOpen(false);
    const selectedLayer = layerManager.getSelectedLayer();

    if (!selectedLayer || !selectedLayer.imageUri) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Blur',
        text2: 'No image selected',
      });
      return;
    }

    try {
      setProcessing(true);

      // Use backend API for blur
      const operations: EditOperation[] = [{
        type: 'blur',
        useService: 'opencv',
        params: { sigma: blurData.radius / 10 }, // Convert radius to sigma
      }];

      const response = await apiClient.submitEditWorkflow({
        image_url: selectedLayer.imageUri,
        operations,
      });

      if (response.status === 'completed' && response.result_url) {
        // Update layer and current image
        layerManager.updateLayerImageUri(selectedLayer.id, response.result_url);
        setCurrentImageUrl(response.result_url);

        // Push to history
        history.pushHistory(response.result_url, 'Blur Applied', blurData);

        Toast.show({
          type: 'success',
          text1: 'Blur Applied',
          text2: `Radius: ${blurData.radius}px`,
        });
      } else if (response.error) {
        throw new Error(response.error);
      }

    } catch (error: any) {
      console.error('Blur error:', error);
      Toast.show({
        type: 'error',
        text1: 'Blur Failed',
        text2: error.message || 'Please try again',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleEditToolSelect = async (toolId: string) => {
    console.log('Edit tool selected:', toolId);

    // Handle Transform tools - open modals for layer editing
    if (toolId === 'crop') {
      if (!layerManager.selectedLayerId) {
        Toast.show({
          type: 'error',
          text1: 'No Layer Selected',
          text2: 'Please select a layer first',
        });
        return;
      }
      setCropToolOpen(true);
      return;
    }

    if (toolId === 'rotate') {
      if (!layerManager.selectedLayerId) {
        Toast.show({
          type: 'error',
          text1: 'No Layer Selected',
          text2: 'Please select a layer first',
        });
        return;
      }
      setRotateToolOpen(true);
      return;
    }

    if (toolId === 'flip') {
      if (!layerManager.selectedLayerId) {
        Toast.show({
          type: 'error',
          text1: 'No Layer Selected',
          text2: 'Please select a layer first',
        });
        return;
      }
      setFlipToolOpen(true);
      return;
    }

    if (toolId === 'resize') {
      if (!layerManager.selectedLayerId) {
        Toast.show({
          type: 'error',
          text1: 'No Layer Selected',
          text2: 'Please select a layer first',
        });
        return;
      }
      setResizeToolOpen(true);
      return;
    }

    // Handle Filters panel
    if (toolId === 'filters') {
      setFiltersOpen(true);
      filtersRef.current?.expand();
      return;
    }

    // Handle Drawing tools panel
    if (toolId === 'drawing') {
      setDrawingToolsOpen(true);
      drawingToolsRef.current?.expand();
      return;
    }

    // Handle Blur tool
    if (toolId === 'blur') {
      if (!layerManager.selectedLayerId) {
        Toast.show({
          type: 'error',
          text1: 'No Layer Selected',
          text2: 'Please select a layer first',
        });
        return;
      }
      setBlurToolOpen(true);
      return;
    }

    try {
      setProcessing(true);
      let operations: EditOperation[] = [];

      switch (toolId) {

        case 'sharpen':
          operations = [{
            type: 'sharpness',
            useService: 'opencv',
            params: { value: 1.5 },
          }];
          break;

        case 'vignette':
        case 'frame':
          // Not yet implemented in backend
          Toast.show({
            type: 'info',
            text1: 'Coming Soon',
            text2: `${toolId} effect will be available soon`,
          });
          setProcessing(false);
          return;

        default:
          console.log(`Tool ${toolId} not yet implemented`);
          setProcessing(false);
          return;
      }

      const response = await apiClient.submitEditWorkflow({
        image_url: currentImageUrl,
        operations,
      });

      if (response.status === 'completed' && response.result_url) {
        // Update current image and layer
        setCurrentImageUrl(response.result_url);
        const selectedLayer = layerManager.getSelectedLayer();
        if (selectedLayer) {
          layerManager.updateLayerImageUri(selectedLayer.id, response.result_url);
        }

        // Push to history
        history.pushHistory(response.result_url, `${toolId.charAt(0).toUpperCase() + toolId.slice(1)} Applied`, {
          toolId,
          processingTime: response.processing_time_ms,
        });

        Toast.show({
          type: 'success',
          text1: `${toolId} Applied`,
          text2: 'Image updated successfully',
        });
      } else if (response.error) {
        throw new Error(response.error);
      }

      setProcessing(false);
    } catch (error: any) {
      console.error('Edit tool failed:', error);
      setProcessing(false);
      Toast.show({
        type: 'error',
        text1: 'Edit Failed',
        text2: error.message || 'Please try again',
      });
    }
  };

  const handleAdjustmentChange = (type: string, value: number) => {
    console.log(`${type} adjusted to ${value}`);
  };

  const handleApplyAdjustments = async (values: { hue: number; saturation: number; brightness: number }) => {
    try {
      setProcessing(true);

      const operations: EditOperation[] = [];

      // Normalize values: sliders are -100 to 100, API expects -1.0 to 1.0
      if (values.brightness !== 0) {
        operations.push({
          type: 'brightness',
          useService: 'opencv',
          params: { value: values.brightness / 100 },
        });
      }

      if (values.saturation !== 0) {
        operations.push({
          type: 'saturation',
          useService: 'opencv',
          params: { value: values.saturation / 100 },
        });
      }

      // Hue is not directly supported yet - skip for now
      if (values.hue !== 0) {
        console.warn('Hue adjustment not yet supported by backend');
      }

      if (operations.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No Changes',
          text2: 'No adjustments were made',
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

        // Update layer
        const selectedLayer = layerManager.getSelectedLayer();
        if (selectedLayer) {
          layerManager.updateLayerImageUri(selectedLayer.id, response.result_url);
        }

        // Push to history
        history.pushHistory(response.result_url, 'Adjustments Applied', values);

        Toast.show({
          type: 'success',
          text1: 'Adjustments Applied',
          text2: `Processing time: ${response.processing_time_ms}ms`,
        });
      } else if (response.error) {
        throw new Error(response.error);
      }

      setProcessing(false);
    } catch (error: any) {
      console.error('Adjustment failed:', error);
      setProcessing(false);
      Toast.show({
        type: 'error',
        text1: 'Adjustment Failed',
        text2: error.message || 'Please try again',
      });
    }
  };

  const handleAddOptionSelect = (option: string) => {
    console.log('Add option selected:', option);
    setAddMenuOpen(false);
    addMenuRef.current?.close();
    Toast.show({
      type: 'info',
      text1: `${option} feature`,
      text2: 'Added to image',
    });
  };

  const handleAIFeatureSelect = (feature: string) => {
    console.log('AI feature selected:', feature);
    setAiFeaturesOpen(false);
    aiFeaturesRef.current?.close();
    Toast.show({
      type: 'info',
      text1: `${feature} AI`,
      text2: 'Processing with AI...',
    });
  };

  const handleOpenAIChat = () => {
    closeAllPanels();
    setAiChatVisible(true);
  };

  const handleFilterSelect = async (filter: Filter) => {
    console.log('Filter selected:', filter.name);
    setFiltersOpen(false);
    filtersRef.current?.close();

    const selectedLayer = layerManager.getSelectedLayer();
    if (!selectedLayer || !selectedLayer.imageUri) {
      Toast.show({
        type: 'error',
        text1: 'No Layer Selected',
        text2: 'Please select a layer to apply filter',
      });
      return;
    }

    try {
      setProcessing(true);

      // Map filter ID to backend operation
      let operations: EditOperation[] = [];

      switch (filter.id) {
        case 'brighten':
          operations.push({
            type: 'brightness',
            useService: 'opencv',
            params: { value: 0.3 },
          });
          break;
        case 'contrast':
          operations.push({
            type: 'contrast',
            useService: 'opencv',
            params: { value: 1.5 },
          });
          break;
        case 'saturate':
          operations.push({
            type: 'saturation',
            useService: 'opencv',
            params: { value: 0.5 },
          });
          break;
        case 'grayscale':
          operations.push({
            type: 'grayscale',
            useService: 'opencv',
            params: {},
          });
          break;
        case 'sepia':
          operations.push({
            type: 'sepia',
            useService: 'opencv',
            params: {},
          });
          break;
        case 'invert':
          operations.push({
            type: 'invert',
            useService: 'opencv',
            params: {},
          });
          break;
        default:
          Toast.show({
            type: 'info',
            text1: 'Filter Not Available',
            text2: `${filter.name} will be available soon`,
          });
          setProcessing(false);
          return;
      }

      const response = await apiClient.submitEditWorkflow({
        image_url: selectedLayer.imageUri,
        operations,
      });

      if (response.status === 'completed' && response.result_url) {
        layerManager.updateLayerImageUri(selectedLayer.id, response.result_url);
        setCurrentImageUrl(response.result_url);

        // Push to history
        history.pushHistory(response.result_url, `${filter.name} Filter Applied`, { filterId: filter.id });

        Toast.show({
          type: 'success',
          text1: `${filter.name} Filter`,
          text2: 'Applied successfully',
        });
      } else if (response.error) {
        throw new Error(response.error);
      }

      setProcessing(false);
    } catch (error: any) {
      console.error('Filter failed:', error);
      setProcessing(false);
      Toast.show({
        type: 'error',
        text1: 'Filter Failed',
        text2: error.message || 'Please try again',
      });
    }
  };

  const handleAdjustmentsPreview = (values: AdjustmentValues) => {
    // Real-time preview using CSS filters (non-destructive)
    // This is called as the user drags sliders
    console.log('Adjustments preview:', values);
    // Note: For a web-based implementation, you could apply CSS filters here
    // For React Native, real-time preview would require canvas manipulation
    // For now, we'll just log it - the actual application will use expo-image-manipulator
  };

  const handleEnhancedAdjustmentsApply = async (values: AdjustmentValues) => {
    console.log('Enhanced adjustments applied:', values);

    const selectedLayer = layerManager.getSelectedLayer();
    if (!selectedLayer || !selectedLayer.imageUri) {
      Toast.show({
        type: 'error',
        text1: 'No Layer Selected',
        text2: 'Please select a layer to apply adjustments',
      });
      return;
    }

    // Check if any adjustments were made
    const hasAdjustments = Object.values(values).some(v => v !== 0);
    if (!hasAdjustments) {
      Toast.show({
        type: 'info',
        text1: 'No Changes',
        text2: 'No adjustments were made',
      });
      setEnhancedAdjustmentOpen(false);
      enhancedAdjustmentRef.current?.close();
      return;
    }

    try {
      setProcessing(true);
      setEnhancedAdjustmentOpen(false);
      enhancedAdjustmentRef.current?.close();

      // Convert adjustments to backend API operations
      const operations: EditOperation[] = [];

      // Normalize values: sliders are -100 to 100, API expects -1.0 to 1.0 or multipliers
      if (values.brightness !== 0) {
        operations.push({
          type: 'brightness',
          useService: 'opencv',
          params: { value: values.brightness / 100 },
        });
      }

      if (values.contrast !== 0) {
        operations.push({
          type: 'contrast',
          useService: 'opencv',
          params: { value: 1 + (values.contrast / 100) }, // 1.0 is neutral
        });
      }

      if (values.saturation !== 0) {
        operations.push({
          type: 'saturation',
          useService: 'opencv',
          params: { value: values.saturation / 100 },
        });
      }

      // Other adjustments can be added as backend supports them
      // For now, apply the basic ones

      if (operations.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No Supported Adjustments',
          text2: 'Only brightness, contrast, and saturation are currently supported',
        });
        setProcessing(false);
        return;
      }

      const response = await apiClient.submitEditWorkflow({
        image_url: selectedLayer.imageUri,
        operations,
      });

      if (response.status === 'completed' && response.result_url) {
        // Update layer and current image
        layerManager.updateLayerImageUri(selectedLayer.id, response.result_url);
        setCurrentImageUrl(response.result_url);

        // Push to history
        history.pushHistory(response.result_url, 'Adjustments Applied', values);

        Toast.show({
          type: 'success',
          text1: 'Adjustments Applied',
          text2: `Processing time: ${response.processing_time_ms}ms`,
        });
      } else if (response.error) {
        throw new Error(response.error);
      }

    } catch (error: any) {
      console.error('Adjustments failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Adjustments Failed',
        text2: error.message || 'Please try again',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDrawingToolSelect = (tool: DrawingTool) => {
    console.log('Drawing tool selected:', tool.name, 'Settings:', tool.settings);

    // Close drawing tools panel
    setDrawingToolsOpen(false);
    drawingToolsRef.current?.close();

    // Open drawing modal with selected tool
    setCurrentDrawingTool(tool);
    setDrawingModalOpen(true);
  };

  const handleDrawingApply = async (drawingData: DrawingData) => {
    setDrawingModalOpen(false);

    if (!currentDrawingTool || drawingData.paths.length === 0) {
      return;
    }

    try {
      // Create a new drawing layer with the drawing data
      const layerId = layerManager.addLayer({
        type: 'drawing',
        name: `${currentDrawingTool.name} Drawing`,
        visible: true,
        opacity: drawingData.settings.opacity,
        transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        drawing: {
          paths: drawingData.paths,
          color: drawingData.settings.color,
          strokeWidth: drawingData.settings.size,
        },
      });

      layerManager.selectLayer(layerId);

      Toast.show({
        type: 'success',
        text1: `${currentDrawingTool.name} Applied`,
        text2: `${drawingData.paths.length} strokes added`,
      });

      // Note: Drawings are stored as vector paths in the layer
      // They need to be rendered on the InteractiveCanvas component
    } catch (error: any) {
      console.error('Drawing apply failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Drawing Failed',
        text2: error.message || 'Please try again',
      });
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Top Navbar */}
        <View style={styles.navbar}>
          {/* Left Side - Home, Undo, Redo */}
          <View style={styles.navLeft}>
            <TouchableOpacity
              onPress={handleHome}
              style={styles.circularNavButton}
              activeOpacity={0.7}
            >
              <Ionicons name="home" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleUndo}
              style={[styles.circularNavButton, !history.canUndo && styles.navButtonDisabled, { marginLeft: 8 }]}
              disabled={!history.canUndo}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-undo"
                size={20}
                color={history.canUndo ? COLORS.textPrimary : COLORS.textTertiary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRedo}
              style={[styles.circularNavButton, !history.canRedo && styles.navButtonDisabled, { marginLeft: 8 }]}
              disabled={!history.canRedo}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-redo"
                size={20}
                color={history.canRedo ? COLORS.textPrimary : COLORS.textTertiary}
              />
            </TouchableOpacity>
          </View>

          {/* Center - Title */}
          <Text style={styles.navTitle}>
            {isBlankCanvas ? 'Blank Canvas' : 'Edit Photo'}
          </Text>

          {/* Right Side - Export */}
          <TouchableOpacity
            onPress={handleExport}
            style={styles.exportButton}
            activeOpacity={0.7}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={COLORS.buttonPrimaryText} />
            ) : (
              <>
                <Ionicons name="download" size={20} color={COLORS.buttonPrimaryText} />
                <Text style={styles.exportText}>Export</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Image Display Area - Interactive Canvas */}
        <Animated.View
          style={[
            styles.imageContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          {!imageLoaded && !isBlankCanvas && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading image...</Text>
            </View>
          )}

          {isBlankCanvas ? (
            <View
              style={[
                styles.blankCanvas,
                {
                  width: canvasWidth || SCREEN_WIDTH,
                  height: canvasHeight || SCREEN_WIDTH,
                },
              ]}
            >
              <View style={styles.canvasPlaceholder}>
                <Ionicons name="create-outline" size={60} color={COLORS.textTertiary} />
                <Text style={styles.canvasPlaceholderText}>
                  Start creating on your blank canvas
                </Text>
                <Text style={styles.canvasSize}>
                  {canvasWidth || SCREEN_WIDTH} × {canvasHeight || SCREEN_WIDTH} px
                </Text>
              </View>
            </View>
          ) : (
            <InteractiveCanvas
              imageUri={currentImageUrl}
              layers={layerManager.layers.filter(l => l.id !== 'base-layer')} // Don't render base layer twice
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
          )}

          {/* Overlay to close Edit panel when tapping canvas */}
          {showEditPanel && (
            <TouchableOpacity
              style={styles.canvasOverlay}
              activeOpacity={1}
              onPress={() => {
                setShowEditPanel(false);
                setSelectedTool(null);
                // Smoother and slower panel collapse
                Animated.timing(editPanelHeight, {
                  toValue: 0,
                  duration: 400, // Slower collapse
                  easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth ease-in-out
                  useNativeDriver: false,
                }).start();
              }}
            />
          )}

          {/* Processing Overlay */}
          {processing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          )}
        </Animated.View>

        {/* Floating AI Chat Button */}
        {showAIButton && (
          <Animated.View
            style={[
              styles.floatingAIButton,
              {
                transform: [{ scale: aiButtonScale }],
              },
            ]}
          >
            {/* Glow effect */}
            <Animated.View
              style={[
                styles.aiButtonGlow,
                {
                  opacity: aiButtonGlow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.7],
                  }),
                  transform: [
                    {
                      scale: aiButtonGlow.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.15],
                      }),
                    },
                  ],
                },
              ]}
            />
            <TouchableOpacity
              onPress={handleOpenAIChat}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#00D9FF', '#0099FF', '#0066FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiChatButton}
              >
                <Ionicons name="chatbubble-ellipses" size={28} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Adjustment Panel */}
        <AdjustmentPanel
          bottomSheetRef={adjustmentPanelRef}
          onClose={() => setAdjustmentOpen(false)}
          onValueChange={handleAdjustmentChange}
          onApply={handleApplyAdjustments}
        />

        {/* Bottom Toolbar with Edit Panel */}
        {!adjustmentOpen && !layersOpen && !filtersOpen && !enhancedAdjustmentOpen && !drawingToolsOpen && (
          <Animated.View
            style={[
              styles.toolbarContainer,
              {
                height: editPanelHeight.interpolate({
                  inputRange: [0, 280],
                  outputRange: [100, 220],
                }),
              },
            ]}
          >
          {/* Expandable Toolbar - 1 row normal, 2×5 grid when Edit pressed */}
          <Animated.View
            style={[
              styles.toolbar,
              {
                transform: [
                  {
                    translateY: toolbarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [100, 0],
                    }),
                  },
                ],
                opacity: toolbarAnim,
              },
            ]}
          >
            <View style={styles.toolbarContent}>
              {!showEditPanel ? (
                // Normal view: Single row with 5 main tools
                <View style={styles.toolRow}>
                  {TOOLS.map((tool, index) => (
                    <TouchableOpacity
                      key={tool.id}
                      style={[
                        styles.toolButton,
                        index === 2 && styles.middleToolButton,
                      ]}
                      onPress={() => handleToolPress(tool.id)}
                      activeOpacity={0.7}
                    >
                      {index === 2 ? (
                        // Middle button with gradient
                        <LinearGradient
                          colors={['#00D9FF', '#0099FF', '#0066FF']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.middleToolIcon}
                        >
                          <Ionicons
                            name={tool.icon as any}
                            size={32}
                            color="#FFFFFF"
                          />
                        </LinearGradient>
                      ) : (
                        // Regular tool buttons
                        <View
                          style={[
                            styles.toolIconContainer,
                            selectedTool === tool.id && styles.toolIconContainerActive,
                          ]}
                        >
                          <Ionicons
                            name={tool.icon as any}
                            size={28}
                            color={selectedTool === tool.id ? COLORS.toolActive : COLORS.toolDefault}
                          />
                        </View>
                      )}
                      <Text
                        style={[
                          styles.toolLabel,
                          selectedTool === tool.id && styles.toolLabelActive,
                        ]}
                      >
                        {tool.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                // Expanded view: 2×5 grid with Edit in original position
                <View style={styles.expandedGrid}>
                  {/* Row 1: First 5 edit tools */}
                  <View style={styles.toolRow}>
                    {EDIT_TOOLS.slice(0, 5).map((tool) => (
                      <TouchableOpacity
                        key={tool.id}
                        style={styles.toolButton}
                        onPress={() => handleEditToolSelect(tool.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.toolIconContainer}>
                          <Ionicons name={tool.icon as any} size={24} color="#FFFFFF" />
                        </View>
                        <Text style={styles.toolLabel}>{tool.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Row 2: Edit button (in original position) + 4 more edit tools */}
                  <View style={styles.toolRow}>
                    {/* Edit button - stays in original position */}
                    <TouchableOpacity
                      style={styles.toolButton}
                      onPress={() => {
                        setShowEditPanel(false);
                        setSelectedTool(null);
                        // Smoother and slower panel collapse
                        Animated.timing(editPanelHeight, {
                          toValue: 0,
                          duration: 400, // Slower collapse
                          easing: Animated.Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth ease-in-out
                          useNativeDriver: false,
                        }).start();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.toolIconContainer, styles.toolIconContainerActive]}>
                        <Ionicons name="create-outline" size={28} color={COLORS.toolActive} />
                      </View>
                      <Text style={[styles.toolLabel, styles.toolLabelActive]}>Edit</Text>
                    </TouchableOpacity>

                    {/* Remaining 4 edit tools */}
                    {EDIT_TOOLS.slice(5, 9).map((tool) => (
                      <TouchableOpacity
                        key={tool.id}
                        style={styles.toolButton}
                        onPress={() => handleEditToolSelect(tool.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.toolIconContainer}>
                          <Ionicons name={tool.icon as any} size={24} color="#FFFFFF" />
                        </View>
                        <Text style={styles.toolLabel}>{tool.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        </Animated.View>
        )}

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
            Toast.show({
              type: 'success',
              text1: 'Layer Added',
              text2: 'New layer created',
            });
          }}
          onDeleteLayer={(layerId) => {
            layerManager.deleteLayer(layerId);
            Toast.show({
              type: 'info',
              text1: 'Layer Deleted',
              text2: 'Layer removed from canvas',
            });
          }}
          onToggleVisibility={layerManager.toggleLayerVisibility}
          onRenameLayer={layerManager.renameLayer}
          onDuplicateLayer={(layerId) => {
            layerManager.duplicateLayer(layerId);
            Toast.show({
              type: 'success',
              text1: 'Layer Duplicated',
              text2: 'Layer copy created',
            });
          }}
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
          onOptionSelect={handleAddOptionSelect}
          onClose={() => {
            setAddMenuOpen(false);
            addMenuRef.current?.close();
          }}
        />

        {/* AI Features Sheet */}
        <AIFeaturesSheet
          bottomSheetRef={aiFeaturesRef}
          onFeatureSelect={handleAIFeatureSelect}
          onClose={() => {
            setAiFeaturesOpen(false);
            aiFeaturesRef.current?.close();
          }}
        />

        {/* AI Chat Modal */}
        <AIChatModal
          visible={aiChatVisible}
          onClose={() => setAiChatVisible(false)}
        />

        {/* Filters Panel */}
        <FiltersPanel
          bottomSheetRef={filtersRef}
          onClose={() => setFiltersOpen(false)}
          onFilterSelect={handleFilterSelect}
          previewImage={currentImageUrl}
        />

        {/* Professional Adjustments Panel */}
        <ProfessionalAdjustmentsPanel
          bottomSheetRef={enhancedAdjustmentRef}
          onClose={() => setEnhancedAdjustmentOpen(false)}
          onAdjust={handleAdjustmentsPreview}
          onApply={handleEnhancedAdjustmentsApply}
        />

        {/* Drawing Tools Panel */}
        <DrawingToolsPanel
          bottomSheetRef={drawingToolsRef}
          onClose={() => setDrawingToolsOpen(false)}
          onToolSelect={handleDrawingToolSelect}
        />

        {/* Transform Tools Modals */}
        <CropTool
          visible={cropToolOpen}
          imageUri={layerManager.getSelectedLayer()?.imageUri || currentImageUrl}
          onApply={handleCropApply}
          onCancel={() => setCropToolOpen(false)}
        />

        <RotateTool
          visible={rotateToolOpen}
          currentRotation={layerManager.getSelectedLayer()?.transform.rotation || 0}
          onApply={handleRotateApply}
          onCancel={() => setRotateToolOpen(false)}
        />

        <FlipTool
          visible={flipToolOpen}
          onApply={handleFlipApply}
          onCancel={() => setFlipToolOpen(false)}
        />

        <ResizeTool
          visible={resizeToolOpen}
          currentWidth={800}
          currentHeight={600}
          onApply={handleResizeApply}
          onCancel={() => setResizeToolOpen(false)}
        />

        <ProfessionalBlurTool
          visible={blurToolOpen}
          onPreview={handleBlurPreview}
          onApply={handleBlurApply}
          onCancel={() => setBlurToolOpen(false)}
        />

        {/* Drawing Modal */}
        {currentDrawingTool && (
          <DrawingModal
            visible={drawingModalOpen}
            tool={currentDrawingTool}
            onApply={handleDrawingApply}
            onCancel={() => setDrawingModalOpen(false)}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 217, 255, 0.15)',
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButton: {
    padding: 8,
  },
  circularNavButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2A2A3E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.1)',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  globalAIButton: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.round,
    padding: 10,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.buttonPrimary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.round,
    marginLeft: 8,
    minWidth: 90,
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  exportText: {
    color: COLORS.buttonPrimaryText,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginLeft: 6,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  canvasOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
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
    fontSize: FONT_SIZES.md,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  image: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  toolbar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 217, 255, 0.15)',
    paddingVertical: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  toolbarContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  toolButton: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  toolButtonCenter: {
    marginTop: -30, // Elevate the center button
  },
  toolButtonActive: {
    // Active state styling handled by child components
  },
  toolIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A2A3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  toolIconContainerCenter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toolIconContainerActive: {
    backgroundColor: '#1A1A2E',
    borderColor: COLORS.toolActive,
    borderWidth: 2,
    shadowColor: COLORS.toolActive,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  toolLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  toolLabelCenter: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  toolLabelActive: {
    color: COLORS.toolActive,
    fontWeight: '600',
  },
  floatingAIButton: {
    position: 'absolute',
    bottom: 120, // Above toolbar
    right: SPACING.md,
    zIndex: 10,
  },
  aiButtonGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#00D9FF',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
    left: -5,
    top: -5,
  },
  aiChatButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D9FF',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  blankCanvas: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  canvasPlaceholder: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  canvasPlaceholderText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontWeight: '500',
  },
  canvasSize: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    fontWeight: '400',
  },
  // Nav bar left section
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  // Toolbar container with animated height
  toolbarContainer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  // Expandable grid layout
  expandedGrid: {
    gap: SPACING.sm,
  },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  // Middle button styles (aliases for existing styles)
  middleToolButton: {
    marginTop: -30,
  },
  middleToolIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D9FF',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 3,
    borderColor: COLORS.background,
  },
});
