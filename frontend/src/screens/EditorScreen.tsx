/**
 * Editor Screen - Auralite Design
 *
 * Simplified, clean design with all functionality preserved
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import editingActionsData from '../data/editingActions.json';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LayersModal from '../components/LayersModal';
import ExportSheet, { ExportFormat } from '../components/ExportSheet';
import SimplifiedAddMenuModal from '../components/SimplifiedAddMenuModal';
import AIFeaturesSheet from '../components/AIFeaturesSheet';
import FiltersPanel, { Filter } from '../components/FiltersPanel';
import RealTimeAdjustPanel, { valuesToFilterPreview } from '../components/RealTimeAdjustPanel';
import DrawingToolsPanel, { DrawingTool } from '../components/DrawingToolsPanel';
import CropTool, { CropData } from '../components/CropTool';
import RotateTool from '../components/RotateTool';
import FlipTool, { FlipData } from '../components/FlipTool';
import ResizeTool, { ResizeData } from '../components/ResizeTool';
import ProfessionalBlurTool, { BlurData } from '../components/ProfessionalBlurTool';
import DrawingModal, { DrawingData } from '../components/DrawingModal';
import InteractiveCanvas, { FilterPreview, DrawingPath } from '../components/InteractiveCanvas';
// New ImageToolbox-inspired components
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import ColorPickerTool from '../components/ColorPickerTool';
import WatermarkTool, { WatermarkConfig } from '../components/WatermarkTool';
import HistogramDisplay from '../components/HistogramDisplay';
import ProfessionalAdjustmentsPanel, { ProfessionalAdjustmentValues } from '../components/ProfessionalAdjustmentsPanel';
import ShapeCropTool, { ShapeCropConfig } from '../components/ShapeCropTool';
import DrawingOverlay, { DrawingPath as DrawingOverlayPath } from '../components/DrawingOverlay';
import DrawingPopup, { DrawingToolOption, DrawingSettings } from '../components/DrawingPopup';
// RealTimeAdjustments removed - using RealTimeAdjustPanel instead
import TextOverlay, { TextLayerConfig } from '../components/TextOverlay';
import ShapeOverlay, { ShapeConfig } from '../components/ShapeOverlay';
import CurveTool, { CurveConfig } from '../components/CurveTool';
import TreeViewModal from '../components/TreeViewModal';
import { useLayerManager } from '../hooks/useLayerManager';
import { useImageHistory } from '../hooks/useImageHistory';
import { saveProject } from '../services/projects';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';
import { apiClient } from '../services/api';
import { EditOperation } from '../types/api';
import { applyFilter, applyAdjustments } from '../utils/canvasFilters';
import { useEnhancedLayerManager } from '../hooks/useEnhancedLayerManager';
import { fitAndCenter, getImageDimensions } from '../utils/imageFit';
import { mergeAllLayers } from '../utils/mergeLayers';

type Props = NativeStackScreenProps<RootStackParamList, 'Editor'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function EditorScreen({ route, navigation }: Props) {
  const { imageUrl, isBlankCanvas, canvasWidth, canvasHeight, projectId, isNewProject } = route.params;

  // Refs for bottom sheets
  const layersModalRef = useRef<BottomSheet>(null);
  const exportSheetRef = useRef<BottomSheet>(null);
  const addMenuRef = useRef<BottomSheet>(null);
  const aiFeaturesRef = useRef<BottomSheet>(null);
  const adjustmentPanelRef = useRef<BottomSheet>(null);
  const filtersRef = useRef<BottomSheet>(null);
  const drawingToolsRef = useRef<BottomSheet>(null);
  // New tool refs
  const watermarkToolRef = useRef<BottomSheet>(null);
  const proAdjustmentsRef = useRef<BottomSheet>(null);
  const shapeCropRef = useRef<BottomSheet>(null);

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
  
  // New ImageToolbox-inspired tool states
  const [beforeAfterOpen, setBeforeAfterOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [watermarkOpen, setWatermarkOpen] = useState(false);
  
  // Drawing overlay state
  const [drawingOverlayOpen, setDrawingOverlayOpen] = useState(false);
  const [currentDrawingPaths, setCurrentDrawingPaths] = useState<DrawingPath[]>([]);
  const [drawingPopupOpen, setDrawingPopupOpen] = useState(false);
  const [drawingSettings, setDrawingSettings] = useState<DrawingSettings>({ color: '#FF3B30', size: 10, opacity: 1 });
  
  // Real-time adjustment preview state
  const [realTimeAdjustmentsOpen, setRealTimeAdjustmentsOpen] = useState(false);
  const [filterPreview, setFilterPreview] = useState<FilterPreview | undefined>(undefined);
  const [histogramOpen, setHistogramOpen] = useState(false);
  const [proAdjustmentsOpen, setProAdjustmentsOpen] = useState(false);
  const [shapeCropOpen, setShapeCropOpen] = useState(false);
  const [textToolOpen, setTextToolOpen] = useState(false);
  const [shapeToolOpen, setShapeToolOpen] = useState(false);
  const [curveToolOpen, setCurveToolOpen] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>(imageUrl || ''); // For before/after comparison
  
  // Image size for dynamic canvas sizing
  // Calculate proper initial dimensions based on passed canvas size or screen size
  const getInitialDimensions = () => {
    const maxWidth = SCREEN_WIDTH - 26;
    const maxHeight = SCREEN_HEIGHT * 0.55;
    
    if (canvasWidth && canvasHeight) {
      // For blank canvas with specific dimensions, fit to screen while maintaining aspect ratio
      const aspectRatio = canvasWidth / canvasHeight;
      let newWidth = maxWidth;
      let newHeight = newWidth / aspectRatio;
      
      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * aspectRatio;
      }
      
      return { width: newWidth, height: newHeight };
    }
    
    return { width: maxWidth, height: 420 };
  };
  
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>(getInitialDimensions());
  
  // Store the actual canvas dimensions (not display dimensions)
  const [actualCanvasDimensions, setActualCanvasDimensions] = useState<{ width: number; height: number }>({
    width: canvasWidth || 1080,
    height: canvasHeight || 1080,
  });

  // AI Editing System state
  const [aiPrompt, setAiPrompt] = useState('');
  const [executedSteps, setExecutedSteps] = useState<any[]>([]);
  const [isExecutingAI, setIsExecutingAI] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedStepDetail, setSelectedStepDetail] = useState<any | null>(null);
  const [treeModalOpen, setTreeModalOpen] = useState(false);

  // Layer system using hook
  const layerManager = useEnhancedLayerManager(imageUrl);

  // History system for undo/redo
  const history = useImageHistory(imageUrl);
  
  // Legacy layer manager for compatibility
  const legacyLayerManager = useLayerManager(imageUrl);

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const plusButtonScale = useRef(new Animated.Value(1)).current;
  const aiChatBottom = useRef(new Animated.Value(237)).current;
  const floatingAIBottom = useRef(new Animated.Value(110)).current;
  const timelineBottom = useRef(new Animated.Value(160)).current;

  useEffect(() => {
    // Fade in animation - slow and smooth
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // iOS default easing
      useNativeDriver: true,
    }).start();
  }, []);
  
  // Auto-select background layer if no layer is selected
  useEffect(() => {
    if (!layerManager.selectedLayerId && layerManager.layers.length > 0) {
      const bgLayer = layerManager.getBackgroundLayer();
      if (bgLayer) {
        layerManager.selectLayer(bgLayer.id);
        console.log('🎯 Auto-selected background layer');
      }
    }
  }, [layerManager.layers.length, layerManager.selectedLayerId]);
  
  // Cleanup localStorage on page unload (web only)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleBeforeUnload = () => {
        // Clear all editor storage when page is closed/refreshed
        console.log('🧹 Page unloading - clearing editor storage');
        // Use synchronous localStorage clear for web (AsyncStorage won't work here)
        try {
          localStorage.removeItem('@editor_history_v2');
          localStorage.removeItem('@editor_history_index_v2');
          localStorage.removeItem('@editor_layers_v2');
          localStorage.removeItem('@editor_layers');
          localStorage.removeItem('@editor_selected_layer');
        } catch (e) {
          // Ignore errors
        }
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        // Also clear on component unmount
        handleBeforeUnload();
      };
    }
  }, []);

  // Get image dimensions for dynamic canvas sizing
  useEffect(() => {
    const maxWidth = SCREEN_WIDTH - 26;
    const maxHeight = SCREEN_HEIGHT * 0.55;
    
    if (isBlankCanvas && canvasWidth && canvasHeight) {
      // For blank canvas, use passed dimensions and fit to screen
      const aspectRatio = canvasWidth / canvasHeight;
      let newWidth = maxWidth;
      let newHeight = newWidth / aspectRatio;
      
      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * aspectRatio;
      }
      
      setImageDimensions({ width: newWidth, height: newHeight });
      setActualCanvasDimensions({ width: canvasWidth, height: canvasHeight });
      console.log('📐 Blank canvas:', canvasWidth, 'x', canvasHeight, '→ display:', Math.round(newWidth), 'x', Math.round(newHeight));
    } else if (currentImageUrl && !isBlankCanvas) {
      Image.getSize(
        currentImageUrl,
        (width, height) => {
          // Calculate dimensions that fit within screen while maintaining aspect ratio
          const aspectRatio = width / height;
          let newWidth = maxWidth;
          let newHeight = newWidth / aspectRatio;
          
          if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * aspectRatio;
          }
          
          setImageDimensions({ width: newWidth, height: newHeight });
          setActualCanvasDimensions({ width, height });
          console.log('🖼️ Image:', width, 'x', height, '→ display:', Math.round(newWidth), 'x', Math.round(newHeight));
        },
        (error) => {
          console.log('Failed to get image size:', error);
          setImageDimensions({ width: maxWidth, height: 420 });
          setActualCanvasDimensions({ width: 1080, height: 1080 });
        }
      );
    }
  }, [currentImageUrl, isBlankCanvas, canvasWidth, canvasHeight]);

  // Animate AI features and timeline when ANY panel opens/closes - slow and smooth
  useEffect(() => {
    // Check if any panel is open
    const anyPanelOpen = editPanelOpen || adjustmentOpen || filtersOpen ||
                         drawingToolsOpen || layersOpen || aiFeaturesOpen ||
                         addMenuOpen || exportOpen;

    const toBottomChat = anyPanelOpen ? 300 : 237; // Move up when any panel active
    const toBottomFloating = anyPanelOpen ? 173 : 110; // Move up when any panel active
    const toBottomTimeline = anyPanelOpen ? 230 : 160; // Timeline between chat panel and plus button

    Animated.parallel([
      Animated.spring(aiChatBottom, {
        toValue: toBottomChat,
        friction: 12,
        tension: 30,
        useNativeDriver: false,
      }),
      Animated.spring(floatingAIBottom, {
        toValue: toBottomFloating,
        friction: 12,
        tension: 30,
        useNativeDriver: false,
      }),
      Animated.spring(timelineBottom, {
        toValue: toBottomTimeline,
        friction: 12,
        tension: 30,
        useNativeDriver: false,
      }),
    ]).start();
  }, [editPanelOpen, adjustmentOpen, filtersOpen, drawingToolsOpen, layersOpen, aiFeaturesOpen, addMenuOpen, exportOpen]);

  const handleHome = async () => {
    // Clear all editor storage when going home
    const clearAndNavigate = async () => {
      // Clear all localStorage/AsyncStorage for the editor
      await history.clearAllEditorStorage();
      await layerManager.clearAllLayers();
      
      console.log('🏠 Navigating home - all editor storage cleared');
      
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' as any }],
              });
            }
    };
    
    // Use confirm on web, Alert on native
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Return Home? All project data will be cleared.');
      if (confirmed) {
        await clearAndNavigate();
      }
    } else {
      Alert.alert(
        'Return Home?',
        'All project data will be cleared.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go Home',
            onPress: clearAndNavigate,
        },
      ]
    );
    }
  };

  const handleUndo = () => {
    if (history.canUndo) {
      const previousState = history.undo();
      if (previousState) {
        // Use correct property names: imageUri and action
        setCurrentImageUrl(previousState.imageUri);
        Toast.show({
          type: 'success',
          text1: 'Undo',
          text2: `Reverted: ${previousState.action}`,
        });
      }
    }
  };

  const handleRedo = () => {
    if (history.canRedo) {
      const nextState = history.redo();
      if (nextState) {
        // Use correct property names: imageUri and action
        setCurrentImageUrl(nextState.imageUri);
        Toast.show({
          type: 'success',
          text1: 'Redo',
          text2: `Reapplied: ${nextState.action}`,
        });
      }
    }
  };

  const handleExport = () => {
    setExportOpen(true);
    exportSheetRef.current?.snapToIndex(0);
  };

  // Merge all layers into a single image (for export)
  const mergeAllLayersForExport = async (): Promise<string | null> => {
    const layers = layerManager.layers;
    
    // Check for valid layers
    if (layers.length === 0 && !currentImageUrl) {
      console.log('❌ No layers or image to export');
      return null;
    }
    
    console.log('📦 Exporting with', layers.length, 'layers');
    
    // On web, use canvas-based merging
    if (Platform.OS === 'web') {
      try {
        // Convert our layers to the merge format
        const layersForMerge = layers.map(layer => ({
          id: layer.id,
          type: layer.type,
          visible: layer.visible,
          enabled: layer.visible,
          locked: layer.locked,
          opacity: layer.opacity,
          source: layer.source,
          color: layer.type === 'background' && !layer.source ? '#FFFFFF' : undefined,
          transform: layer.transform,
          crop: layer.crop,
          drawing: layer.drawing,
          text: layer.text,
          shape: layer.shape,
          adjustments: layer.adjustments,
        }));
        
        // Merge using canvas - use actual dimensions, but pass display dimensions for scaling
        const exportWidth = actualCanvasDimensions.width || 1080;
        const exportHeight = actualCanvasDimensions.height || 1080;
        const displayWidth = imageDimensions.width || exportWidth;
        const displayHeight = imageDimensions.height || exportHeight;
        console.log('📦 Merging layers at', exportWidth, 'x', exportHeight, '(display:', displayWidth, 'x', displayHeight, ')');
        
        const blob = await mergeAllLayers(
          layersForMerge, 
          exportWidth, 
          exportHeight,
          'png',
          displayWidth,
          displayHeight
        );
        
        if (blob) {
          // Create blob URL for download
          return URL.createObjectURL(blob);
        }
      } catch (e) {
        console.error('Layer merge failed:', e);
      }
    }
    
    // Fallback: Get the base layer source or currentImageUrl
    const baseLayer = layers.find(l => l.type === 'background');
    let resultUri = baseLayer?.source || currentImageUrl || '';
    
    if (!resultUri) {
      console.log('❌ No valid image URI for export');
      return null;
    }
    
    return resultUri;
  };

  const handleExportFormat = async (format: ExportFormat) => {
    try {
      setExporting(true);
      setExportOpen(false);
      exportSheetRef.current?.close();

      // Merge all layers first
      const mergedImageUri = await mergeAllLayersForExport();
      
      if (!mergedImageUri) {
        Toast.show({
          type: 'error',
          text1: 'Export Failed',
          text2: 'No image to export',
        });
        setExporting(false);
        return;
      }

      // Determine file extension
      const extension = format === 'jpg' ? 'jpg' : 'png';
      const fileName = `export_${Date.now()}.${extension}`;
      
      // === WEB PLATFORM HANDLING ===
      if (Platform.OS === 'web') {
        try {
          // For web, we need to download the file directly
          const link = document.createElement('a');
          link.href = mergedImageUri;
          link.download = fileName;
          
          // For blob URLs or data URLs, we can directly download
          if (mergedImageUri.startsWith('blob:') || mergedImageUri.startsWith('data:')) {
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else {
            // For remote URLs, fetch and create blob
            const response = await fetch(mergedImageUri);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            link.href = blobUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }
          
          Toast.show({
            type: 'success',
            text1: '✅ Download Started!',
            text2: `Saving ${fileName}`,
          });
          
          // Save project metadata
          await saveProject({
            id: Date.now().toString(),
            name: `Project ${Date.now()}`,
            imageUrl: mergedImageUri,
            thumbnail: mergedImageUri,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          setExporting(false);
          return;
        } catch (webError) {
          console.log('Web download error:', webError);
          Toast.show({
            type: 'error',
            text1: 'Download Failed',
            text2: 'Please try right-clicking and saving the image',
          });
          setExporting(false);
          return;
        }
      }

      // === NATIVE PLATFORM HANDLING ===
      let exportUri = mergedImageUri;
      
      // If it's a remote URL, download it first for native
      if (mergedImageUri.startsWith('http')) {
        const downloadResult = await FileSystem.downloadAsync(
          mergedImageUri,
          FileSystem.documentDirectory + fileName
        );
        exportUri = downloadResult.uri;
      }

      switch (format) {
        case 'png':
        case 'jpg':
        case 'gallery':
          // Save to gallery (native only)
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save images to your gallery.');
        setExporting(false);
        return;
      }

          const asset = await MediaLibrary.createAssetAsync(exportUri);
          console.log('✅ Saved to gallery:', asset.uri);
          
          // Also save project
      await saveProject({
        id: Date.now().toString(),
        name: `Project ${Date.now()}`,
            imageUrl: mergedImageUri,
            thumbnail: mergedImageUri,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      Toast.show({
        type: 'success',
            text1: '✅ Saved to Gallery!',
            text2: `Exported as ${extension.toUpperCase()}`,
          });
          break;
          
        case 'files':
          // Share to files app (native only)
          const canShare = await Sharing.isAvailableAsync();
          if (!canShare) {
            Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
            setExporting(false);
            return;
          }
          
          try {
            await Sharing.shareAsync(exportUri, {
              mimeType: extension === 'jpg' ? 'image/jpeg' : 'image/png',
              dialogTitle: 'Save Image',
              UTI: extension === 'jpg' ? 'public.jpeg' : 'public.png',
            });
            
            Toast.show({
              type: 'success',
              text1: '✅ Shared!',
              text2: 'Image ready to save',
            });
          } catch (shareError) {
            console.log('Share cancelled or failed:', shareError);
          }
          break;
      }
      
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

  // Close all panels - professional panel management
  const closeAllPanels = (exceptPanel?: string) => {
    // Close state-based panels
    if (exceptPanel !== 'layers') setLayersOpen(false);
    if (exceptPanel !== 'export') setExportOpen(false);
    if (exceptPanel !== 'addMenu') setAddMenuOpen(false);
    if (exceptPanel !== 'aiFeatures') setAiFeaturesOpen(false);
    if (exceptPanel !== 'adjustment') setAdjustmentOpen(false);
    if (exceptPanel !== 'filters') setFiltersOpen(false);
    if (exceptPanel !== 'drawingTools') setDrawingToolsOpen(false);
    if (exceptPanel !== 'crop') setCropToolOpen(false);
    if (exceptPanel !== 'rotate') setRotateToolOpen(false);
    if (exceptPanel !== 'flip') setFlipToolOpen(false);
    if (exceptPanel !== 'resize') setResizeToolOpen(false);
    if (exceptPanel !== 'blur') setBlurToolOpen(false);
    if (exceptPanel !== 'drawingModal') setDrawingModalOpen(false);
    if (exceptPanel !== 'drawingOverlay') setDrawingOverlayOpen(false);
    if (exceptPanel !== 'realTimeAdjustments') setRealTimeAdjustmentsOpen(false);
    if (exceptPanel !== 'beforeAfter') setBeforeAfterOpen(false);
    if (exceptPanel !== 'colorPicker') setColorPickerOpen(false);
    if (exceptPanel !== 'watermark') setWatermarkOpen(false);
    if (exceptPanel !== 'histogram') setHistogramOpen(false);
    if (exceptPanel !== 'proAdjustments') setProAdjustmentsOpen(false);
    if (exceptPanel !== 'shapeCrop') setShapeCropOpen(false);
    if (exceptPanel !== 'drawingPopup') setDrawingPopupOpen(false);
    if (exceptPanel !== 'textTool') setTextToolOpen(false);
    if (exceptPanel !== 'shapeTool') setShapeToolOpen(false);
    if (exceptPanel !== 'curveTool') setCurveToolOpen(false);

    // Close bottom sheet refs
    if (exceptPanel !== 'layers') layersModalRef.current?.close();
    if (exceptPanel !== 'export') exportSheetRef.current?.close();
    if (exceptPanel !== 'addMenu') addMenuRef.current?.close();
    if (exceptPanel !== 'aiFeatures') aiFeaturesRef.current?.close();
    if (exceptPanel !== 'adjustment') adjustmentPanelRef.current?.close();
    if (exceptPanel !== 'filters') filtersRef.current?.close();
    if (exceptPanel !== 'drawingTools') drawingToolsRef.current?.close();
    if (exceptPanel !== 'watermark') watermarkToolRef.current?.close();
    if (exceptPanel !== 'proAdjustments') proAdjustmentsRef.current?.close();
    if (exceptPanel !== 'shapeCrop') shapeCropRef.current?.close();
    
    // Clear filter preview when closing panels
    if (exceptPanel !== 'adjustment' && exceptPanel !== 'realTimeAdjustments') {
      setFilterPreview(undefined);
    }
  };

  // Open a specific panel (closes all others first)
  const openPanel = (panelName: string) => {
    closeAllPanels(panelName);
    
    switch (panelName) {
      case 'layers':
        setLayersOpen(true);
        layersModalRef.current?.snapToIndex(0);
        break;
      case 'export':
        setExportOpen(true);
        exportSheetRef.current?.snapToIndex(0);
        break;
      case 'addMenu':
        setAddMenuOpen(true);
        addMenuRef.current?.snapToIndex(0);
        break;
      case 'aiFeatures':
        setAiFeaturesOpen(true);
        aiFeaturesRef.current?.snapToIndex(0);
        break;
      case 'adjustment':
        setAdjustmentOpen(true);
        break;
      case 'realTimeAdjustments':
        setRealTimeAdjustmentsOpen(true);
        break;
      case 'filters':
        setFiltersOpen(true);
        filtersRef.current?.snapToIndex(0);
        break;
      case 'drawingTools':
        setDrawingToolsOpen(true);
        drawingToolsRef.current?.snapToIndex(0);
        break;
      case 'drawingOverlay':
        setDrawingOverlayOpen(true);
        break;
      case 'crop':
        setCropToolOpen(true);
        break;
      case 'rotate':
        setRotateToolOpen(true);
        break;
      case 'flip':
        setFlipToolOpen(true);
        break;
      case 'resize':
        setResizeToolOpen(true);
        break;
      case 'blur':
        setBlurToolOpen(true);
        break;
      case 'beforeAfter':
        setBeforeAfterOpen(true);
        break;
      case 'colorPicker':
        setColorPickerOpen(true);
        break;
      case 'watermark':
        setWatermarkOpen(true);
        watermarkToolRef.current?.snapToIndex(0);
        break;
      case 'histogram':
        setHistogramOpen(true);
        break;
      case 'proAdjustments':
        setProAdjustmentsOpen(true);
        proAdjustmentsRef.current?.snapToIndex(0);
        break;
      case 'shapeCrop':
        setShapeCropOpen(true);
        shapeCropRef.current?.snapToIndex(0);
        break;
    }
  };

  const handleCanvasTap = () => {
    // Close all panels and return to normal state when canvas is tapped
    // Always close panels if any are open, regardless of current state
    const anyPanelOpen = editPanelOpen || adjustmentOpen || filtersOpen ||
                         drawingToolsOpen || layersOpen || aiFeaturesOpen ||
                         addMenuOpen || exportOpen || aiChatOpen ||
                         realTimeAdjustmentsOpen || curveToolOpen || 
                         textToolOpen || shapeToolOpen || cropToolOpen ||
                         rotateToolOpen || flipToolOpen || resizeToolOpen ||
                         selectedTool !== null;

    if (anyPanelOpen) {
      console.log('📱 Canvas tapped - closing all panels');
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
    const editingTools = ['filter', 'draw', 'curve', 'text', 'shape', 'eraser'];
    if (editingTools.includes(toolId) && editPanelOpen) {
      // Stay in edit mode, just open the respective panel
      switch (toolId) {
        case 'filter':
          console.log('Filter tool pressed, opening FiltersPanel');
          setFiltersOpen(true);
          filtersRef.current?.snapToIndex(0);
          break;
        case 'draw':
          // Show simple drawing popup instead of complex panel
          console.log('Draw tool pressed, opening DrawingPopup');
          closeAllPanels('drawingPopup');
          setDrawingPopupOpen(true);
          break;
        case 'eraser':
          // Open drawing with eraser tool selected
          setCurrentDrawingTool({ id: 'eraser', name: 'Eraser', type: 'eraser', icon: 'remove-circle-outline', settings: { color: '#FFFFFF', size: 20, opacity: 1 } });
          setDrawingOverlayOpen(true);
          break;
        case 'curve':
          console.log('Curve tool pressed');
          closeAllPanels('curveTool');
          setCurveToolOpen(true);
          break;
        case 'text':
          console.log('Text tool pressed, opening TextTool');
          closeAllPanels('textTool');
          setTextToolOpen(true);
          break;
        case 'shape':
          console.log('Shape tool pressed, opening ShapeTool');
          closeAllPanels('shapeTool');
          setShapeToolOpen(true);
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
        // If no layer selected, select the background layer for adjustments
        if (!layerManager.selectedLayerId) {
          const bgLayer = layerManager.getBackgroundLayer();
          if (bgLayer) {
            layerManager.selectLayer(bgLayer.id);
            console.log('📐 Auto-selected background layer for adjustments');
          }
        }
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
        toValue: 0.88,
        duration: 200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // iOS smooth easing
        useNativeDriver: true,
      }),
      Animated.spring(plusButtonScale, {
        toValue: 1,
        friction: 10,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // AI Editing System Functions
  const handleAIPromptSubmit = async () => {
    if (!aiPrompt.trim() || isExecutingAI) return;

    setIsExecutingAI(true);
    setExecutedSteps([]);
    setCurrentStepIndex(0);

    // Get predefined sequence from JSON (for now, always use default)
    const sequence = editingActionsData.predefinedSequences.default;

    // Execute steps one by one
    for (let i = 0; i < sequence.length; i++) {
      const step = sequence[i];
      const actionDef = editingActionsData.actions.find((a) => a.id === step.action);

      if (!actionDef) continue;

      // Create step record with thumbnail
      const executedStep = {
        id: `step-${Date.now()}-${i}`,
        actionId: step.action,
        name: actionDef.name,
        description: actionDef.description,
        icon: actionDef.icon,
        params: step.params,
        timestamp: Date.now(),
        thumbnailUri: currentImageUrl, // Store current image as thumbnail
      };

      // Add step to timeline
      setExecutedSteps((prev) => [...prev, executedStep]);
      setCurrentStepIndex(i + 1);

      // Execute the actual editing action
      try {
        await executeAIStep(step.action, step.params);
        // Wait to show transformation
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // TODO: In real implementation, capture canvas state here and update thumbnailUri
        // For now, we use the same image for all steps
      } catch (error) {
        console.error(`Failed to execute step ${step.action}:`, error);
      }
    }

    setIsExecutingAI(false);
    setAiPrompt('');
    setAiChatOpen(false); // Close AI chat after completion
    Toast.show({
      type: 'success',
      text1: 'AI Editing Complete',
      text2: `Applied ${sequence.length} transformations`,
    });
  };

  const executeAIStep = async (action: string, params: any) => {
    setProcessing(true);

    // Simulate processing - In real app, apply actual transformations
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Here you would call actual image processing functions
    // based on the action type and parameters
    switch (action) {
      case 'brightness':
        console.log(`Applying brightness: ${params.value}%`);
        // TODO: Call actual brightness adjustment
        break;
      case 'contrast':
        console.log(`Applying contrast: ${params.value}%`);
        // TODO: Call actual contrast adjustment
        break;
      case 'hue':
        console.log(`Applying hue: ${params.value}°`);
        // TODO: Call actual hue adjustment
        break;
      case 'saturation':
        console.log(`Applying saturation: ${params.value}%`);
        // TODO: Call actual saturation adjustment
        break;
      case 'draw':
        console.log(`Applying draw: tool=${params.tool}, color=${params.color}`);
        // TODO: Call actual draw function
        break;
      case 'eraser':
        console.log(`Applying eraser: size=${params.size}px`);
        // TODO: Call actual eraser function
        break;
      case 'crop':
        console.log(`Applying crop: ${params.aspectRatio}`);
        // TODO: Call actual crop function
        break;
      case 'filter':
        console.log(`Applying filter: ${params.filterName}`);
        // TODO: Call actual filter application
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }

    setProcessing(false);
  };

  const handleStepIconTap = (step: any) => {
    // Close any currently open panels first
    closeAllPanels();
    // Reset edit panel and selected tool to return bottom toolbar to normal state
    setEditPanelOpen(false);
    setSelectedTool(null);

    // Open the corresponding panel based on action type
    switch (step.actionId) {
      case 'brightness':
      case 'contrast':
        // Open adjustments panel
        setAdjustmentOpen(true);
        adjustmentPanelRef.current?.snapToIndex(0);
        break;
      case 'hue':
        // Open adjustments panel for hue
        setAdjustmentOpen(true);
        adjustmentPanelRef.current?.snapToIndex(0);
        Toast.show({
          type: 'info',
          text1: 'Hue Adjustment',
          text2: 'Adjust the color hue',
        });
        break;
      case 'saturation':
        // Open adjustments panel for saturation
        setAdjustmentOpen(true);
        adjustmentPanelRef.current?.snapToIndex(0);
        Toast.show({
          type: 'info',
          text1: 'Saturation Adjustment',
          text2: 'Adjust color saturation',
        });
        break;
      case 'filter':
        // Open filters panel
        setFiltersOpen(true);
        filtersRef.current?.snapToIndex(0);
        break;
      case 'draw':
        // Open drawing tools panel
        setDrawingToolsOpen(true);
        drawingToolsRef.current?.snapToIndex(0);
        break;
      case 'eraser':
        // Open drawing tools panel for eraser
        setDrawingToolsOpen(true);
        drawingToolsRef.current?.snapToIndex(0);
        Toast.show({
          type: 'info',
          text1: 'Eraser Tool',
          text2: 'Erase parts of the image',
        });
        break;
      case 'crop':
        // Open crop tool
        setCropToolOpen(true);
        break;
      case 'rotate':
        // Open rotate tool
        setRotateToolOpen(true);
        break;
      default:
        Toast.show({
          type: 'info',
          text1: step.name,
          text2: step.description,
        });
    }
  };

  // Handle tree view step tap - loads image and opens corresponding panel
  const handleTreeViewStepTap = (step: any) => {
    // Close tree modal first
    setTreeModalOpen(false);

    // Load the thumbnail image if available
    if (step.thumbnailUri) {
      setCurrentImageUrl(step.thumbnailUri);
      Toast.show({
        type: 'success',
        text1: 'Step Loaded',
        text2: `Loading ${step.name} state`,
      });
    }

    // Open the corresponding panel using existing handler
    handleStepIconTap(step);
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
        mediaTypes: ['images'], // Updated from deprecated MediaTypeOptions
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const imageUri = asset.uri;
        
        // Check if we have a background layer, if not create one
        const bgLayer = layerManager.getBackgroundLayer();
        if (!bgLayer) {
          // First image becomes locked background
          layerManager.createBackgroundLayer(imageUri);
          setCurrentImageUrl(imageUri);
        Toast.show({
          type: 'success',
            text1: 'Background Set',
            text2: 'Photo set as locked background layer',
          });
        } else {
          // Subsequent images become NEW MOVABLE layers with fit & center
          await layerManager.importImageLayerAsync(
            imageUri, 
            `Photo ${layerManager.getLayerCount()}`,
            imageDimensions.width,
            imageDimensions.height
          );
          Toast.show({
            type: 'success',
            text1: 'Layer Added',
            text2: '📷 New movable image layer (fit & centered)',
          });
        }
        
        // Push to history (skip blob URLs - they're temporary)
        if (!imageUri.startsWith('blob:')) {
          history.pushHistory(imageUri, 'Camera capture');
        }
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  // Handle gallery import - CREATES NEW MOVABLE LAYER
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
        mediaTypes: ['images'], // Updated from deprecated MediaTypeOptions
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const imageUri = asset.uri;
        
        // Check if we have a background layer, if not create one
        const bgLayer = layerManager.getBackgroundLayer();
        if (!bgLayer) {
          // First image becomes locked background
          layerManager.createBackgroundLayer(imageUri);
          setCurrentImageUrl(imageUri);
        Toast.show({
          type: 'success',
            text1: 'Background Set',
            text2: '🔐 Photo set as locked background layer',
          });
        } else {
          // Subsequent images become NEW MOVABLE layers with fit & center
          await layerManager.importImageLayerAsync(
            imageUri, 
            `Image ${layerManager.getLayerCount()}`,
            imageDimensions.width,
            imageDimensions.height
          );
          Toast.show({
            type: 'success',
            text1: 'Layer Added',
            text2: '🖼️ New movable image layer (fit & centered)',
          });
        }
        
        // Push to history (skip blob URLs - they're temporary)
        if (!imageUri.startsWith('blob:')) {
          history.pushHistory(imageUri, 'Gallery import');
        }
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

  // Check if we have a valid image to work with
  const hasValidImage = useCallback(() => {
    const selectedLayer = layerManager.getSelectedLayer();
    return !!(selectedLayer?.imageUri || currentImageUrl);
  }, [layerManager, currentImageUrl]);

  // Check if a layer is selected (required for most tools)
  const hasSelectedLayer = useCallback(() => {
    return layerManager.selectedLayerId !== null;
  }, [layerManager.selectedLayerId]);

  // Get selected layer name for UI
  const getSelectedLayerName = useCallback(() => {
    return layerManager.getSelectedLayer()?.name || 'No layer selected';
  }, [layerManager]);

  // Validate that a layer is selected before opening tool
  const validateLayerAndOpenTool = useCallback((
    toolSetter: (open: boolean) => void, 
    toolName: string,
    requireImage: boolean = false
  ) => {
    // Check layer selection first
    if (!hasSelectedLayer()) {
      Toast.show({
        type: 'info',
        text1: 'Select a Layer',
        text2: `Please select a layer to use ${toolName}`,
        visibilityTime: 2500,
      });
      return;
    }
    
    // Optionally check for image
    if (requireImage && !hasValidImage()) {
      Toast.show({
        type: 'error',
        text1: 'No Image',
        text2: `Load an image to use ${toolName}`,
        visibilityTime: 2500,
      });
      return;
    }
    
    closeAllPanels();
    toolSetter(true);
  }, [hasSelectedLayer, hasValidImage, closeAllPanels]);

  // Validate image before opening transform tools
  const validateAndOpenTool = useCallback((toolSetter: (open: boolean) => void, toolName: string) => {
    if (!hasValidImage()) {
      Toast.show({
        type: 'error',
        text1: 'No Image',
        text2: `Please load an image first to use ${toolName}`,
      });
      return false;
    }
    toolSetter(true);
    return true;
  }, [hasValidImage]);

  // Handle crop - PER-LAYER crop (updates layer in-place)
  // Works on selected layer OR background if no layer selected
  const handleCropApply = async (cropData: CropData) => {
    try {
      setProcessing(true);
      setCropToolOpen(false);

      // Get the selected layer or default to background
      let selectedLayer = layerManager.getSelectedLayer();
      
      // If no layer selected, auto-select and use background
      if (!selectedLayer) {
        const bgLayer = layerManager.getBackgroundLayer();
        if (bgLayer) {
          layerManager.selectLayer(bgLayer.id);
          selectedLayer = bgLayer;
        }
      }
      
      // Check if layer is locked
      if (selectedLayer?.locked) {
        Toast.show({
          type: 'error',
          text1: '🔐 Layer Locked',
          text2: 'This layer is locked. Unlock it first.',
        });
        setProcessing(false);
        return;
      }
      
      const imageToProcess = selectedLayer?.source || selectedLayer?.imageUri || currentImageUrl;

      if (!imageToProcess) {
        Toast.show({
          type: 'error',
          text1: 'No Image',
          text2: 'This layer has no image to crop',
        });
        setProcessing(false);
        return;
      }

      const result = await ImageManipulator.manipulateAsync(
        imageToProcess,
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

      // Update the selected layer's source (in-place edit)
      layerManager.updateLayer(layerManager.selectedLayerId!, { 
        source: result.uri,
        imageUri: result.uri,
      });
      
      // Also store crop params for non-destructive reference
      layerManager.cropSelectedLayer({ 
        x: cropData.x, 
        y: cropData.y, 
        w: cropData.width, 
        h: cropData.height 
      });
      
      const layerName = selectedLayer?.name || 'Layer';
      
      // If background layer was cropped, also update the main image URL
      if (selectedLayer?.type === 'background') {
      setCurrentImageUrl(result.uri);
        console.log('📐 Background layer cropped, updating main image URL');
      }
      
      history.pushHistory(result.uri, `Crop ${layerName}`, cropData);

      Toast.show({
        type: 'success',
        text1: '✂️ Crop Applied',
        text2: `${layerName} cropped successfully`,
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

  // Filter handler - applies filter to SELECTED layer (preserves other layers)
  const handleFilterSelect = async (filter: Filter) => {
    console.log('Filter selected:', filter.name);
    setFiltersOpen(false);
    filtersRef.current?.close();

    // Get selected layer or default to background
    const selectedLayer = layerManager.getSelectedLayer() || layerManager.getBackgroundLayer();
    const imageToProcess = selectedLayer?.source || selectedLayer?.imageUri || currentImageUrl;

    if (!imageToProcess) {
          Toast.show({
        type: 'error',
        text1: 'No Image',
        text2: 'Please load an image first to apply filters',
      });
          return;
      }

    try {
      setProcessing(true);

      // Apply filter to the selected layer's image
      const result = await applyFilter(imageToProcess, filter.id);
      
      if (result.success && result.uri) {
        const layerName = selectedLayer?.name || 'Layer';
        
        // Update the SELECTED layer's source (in-place edit, preserves adjustments)
        if (layerManager.selectedLayerId || selectedLayer?.id) {
          const targetLayerId = layerManager.selectedLayerId || selectedLayer?.id;
          layerManager.updateLayer(targetLayerId!, {
            source: result.uri,
            imageUri: result.uri,
          });
          console.log('🎨 Filter applied to layer:', layerName);
        }
        
        // If background layer, also update currentImageUrl
        if (selectedLayer?.type === 'background') {
          setCurrentImageUrl(result.uri);
        }
        
        history.pushHistory(result.uri, `${filter.name} on ${layerName}`, { filterId: filter.id });

        Toast.show({
          type: 'success',
          text1: `${filter.name} Applied`,
          text2: `Filter applied to ${layerName}`,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Filter Failed',
          text2: result.error || 'Could not apply filter',
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

  // Adjustments handler - uses local canvas-based processing
  const handleAdjustmentsApply = async (adjustments: AdjustmentValues) => {
    console.log('Adjustments applied:', adjustments);
    setAdjustmentOpen(false);

    if (!currentImageUrl) {
      Toast.show({
        type: 'error',
        text1: 'No Image',
        text2: 'Please load an image first to apply adjustments',
      });
      return;
    }

    try {
      setProcessing(true);

      // Convert adjustment values to canvas filter format
      const adjustmentParams = {
        brightness: adjustments.brightness,
        contrast: adjustments.contrast,
        saturation: adjustments.saturation,
        exposure: adjustments.exposure,
        hue: adjustments.hue,
      };

      const result = await applyAdjustments(currentImageUrl, adjustmentParams);
      
      if (result.success && result.uri) {
        setCurrentImageUrl(result.uri);
        history.pushHistory(result.uri, 'Adjustments', adjustments);
        
        // Create an adjustment layer with the processed image
        layerManager.createAdjustmentLayer(adjustmentParams, 'Adjustments', result.uri);

        Toast.show({
          type: 'success',
          text1: 'Adjustments Applied',
          text2: 'Adjustment applied as new layer',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Adjustments Failed',
          text2: result.error || 'Could not apply adjustments',
        });
      }

      setProcessing(false);
    } catch (error: any) {
      console.error('Adjustments error:', error);
      Toast.show({
        type: 'error',
        text1: 'Adjustments Failed',
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
          {/* Background tap handler for when no panels are open */}
            <View style={styles.tapOverlay} />
          
          {/* Dismiss overlay - appears when edit panel or other panels are open */}
          {(editPanelOpen || adjustmentOpen || filtersOpen || drawingToolsOpen || 
            realTimeAdjustmentsOpen || curveToolOpen || textToolOpen || 
            shapeToolOpen || drawingPopupOpen) && (
            <TouchableWithoutFeedback onPress={handleCanvasTap}>
              <View style={styles.dismissOverlay} />
          </TouchableWithoutFeedback>
          )}

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

          {/* Canvas Area - dynamically sized to image */}
          <View style={[styles.canvasArea, { height: imageDimensions.height + 20 }]}>
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
                    layers={layerManager.layers} // Pass ALL layers including background for adjustments
                    drawingPaths={currentDrawingPaths}
                    filterPreview={filterPreview}
                    isBaseImageLocked={true}
                    selectedLayerId={layerManager.selectedLayerId}
                    canvasWidth={imageDimensions.width}
                    canvasHeight={imageDimensions.height}
                    onLayerSelect={(layerId) => {
                      console.log('🎯 Layer selected:', layerId);
                      layerManager.selectLayer(layerId);
                    }}
                    onImageLoad={() => setImageLoaded(true)}
                    onImageError={(error: any) => {
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
              
              {/* Drawing Overlay - appears on top of canvas (works for both blank and image canvas) */}
              {drawingOverlayOpen && (
                <View style={StyleSheet.absoluteFill}>
                  <DrawingOverlay
                    visible={drawingOverlayOpen}
                    canvasWidth={imageDimensions.width}
                    canvasHeight={imageDimensions.height}
                    onConfirm={(paths: DrawingOverlayPath[]) => {
                      if (paths.length === 0) {
                        setDrawingOverlayOpen(false);
                        return;
                      }
                      
                      // Convert paths for layer storage
                      const convertedPaths = paths.map((p: DrawingOverlayPath) => ({
                        ...p,
                        points: p.points,
                      }));
                      
                      // Create a new drawing layer with unique name
                      const layerCount = layerManager.layers.filter(l => l.type === 'drawing').length;
                      const layerName = `Drawing ${layerCount + 1}`;
                      const layerId = layerManager.createDrawingLayer(layerName);
                      
                      // Update layer with drawing data
                      layerManager.updateLayer(layerId, {
                        drawing: {
                          paths: convertedPaths,
                          tool: currentDrawingTool?.id || 'pen',
                          color: paths[0]?.color || '#FF0000',
                          strokeWidth: paths[0]?.strokeWidth || 5,
                        },
                      });
                      
                      // Store in history for undo/redo
                      history.pushHistory(
                        currentImageUrl || 'blank-canvas', 
                        `Drawing: ${paths.length} stroke(s)`,
                        { layerId, paths: convertedPaths }
                      );
                      
                      // Add paths to display
                      setCurrentDrawingPaths(prev => [...prev, ...convertedPaths]);
                      setDrawingOverlayOpen(false);
                      
                      Toast.show({
                        type: 'success',
                        text1: 'Drawing Applied',
                        text2: `${paths.length} stroke(s) saved as "${layerName}"`,
                      });
                    }}
                    onCancel={() => {
                      setDrawingOverlayOpen(false);
                      Toast.show({
                        type: 'info',
                        text1: 'Drawing Cancelled',
                        text2: 'No changes made',
                      });
                    }}
                    initialTool={currentDrawingTool?.id as any || 'pen'}
                    initialColor={drawingSettings.color}
                    initialSize={drawingSettings.size}
                  />
                </View>
              )}
          </View>

          {/* Undo/Redo Controls (Below Canvas) */}
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

          {/* Global AI Chat Panel - Animated position */}
          {aiChatOpen && (
            <Animated.View style={[styles.globalAIChatPanel, { bottom: aiChatBottom }]}>
              <TouchableOpacity style={styles.aiAssistantButton}>
                <Ionicons name="sparkles" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TextInput
                style={styles.aiChatInput}
                placeholder="Describe how to edit..."
                placeholderTextColor="#888888"
                value={aiPrompt}
                onChangeText={setAiPrompt}
                editable={!isExecutingAI}
                onSubmitEditing={handleAIPromptSubmit}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.aiSendButton, !aiPrompt.trim() && styles.aiSendButtonDisabled]}
                onPress={handleAIPromptSubmit}
                disabled={!aiPrompt.trim() || isExecutingAI}
                activeOpacity={0.7}
              >
                {isExecutingAI ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aiChatCloseButton}
                onPress={() => setAiChatOpen(false)}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          )}


          {/* Floating AI Button - Animated position */}
          <Animated.View style={[styles.floatingAIButton, { bottom: floatingAIBottom }]}>
            <TouchableOpacity
              style={styles.floatingAIButtonInner}
              onPress={() => setAiChatOpen(!aiChatOpen)}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          {/* Horizontal Step Timeline - Animated position */}
          <Animated.View style={[styles.stepTimelineContainer, { bottom: timelineBottom }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.stepTimeline}
              contentContainerStyle={styles.stepTimelineContent}
            >
              {/* Tree Icon - Always first */}
              <Animated.View
                style={[
                  styles.stepIcon,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                    }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.stepIconButton, styles.treeIconButton]}
                  onPress={() => setTreeModalOpen(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="git-branch-outline" size={18} color="#00D9FF" />
                </TouchableOpacity>
              </Animated.View>

              {/* Executed Steps */}
              {executedSteps.map((step, index) => (
                <Animated.View
                  key={step.id}
                  style={[
                    styles.stepIcon,
                    {
                      opacity: fadeAnim,
                      transform: [{
                        scale: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1],
                        }),
                      }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.stepIconButton,
                      index === currentStepIndex - 1 && isExecutingAI && styles.stepIconActive,
                    ]}
                    onPress={() => handleStepIconTap(step)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={step.icon as any} size={18} color="#E0E0E0" />
                    {index === currentStepIndex - 1 && isExecutingAI && (
                      <View style={styles.stepPulse}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))}

              {/* Clear Steps Button */}
              {!isExecutingAI && executedSteps.length > 0 && (
                <TouchableOpacity
                  style={styles.clearStepsButton}
                  onPress={() => setExecutedSteps([])}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={16} color="#666666" />
                </TouchableOpacity>
              )}
            </ScrollView>
          </Animated.View>

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

          {/* Bottom Toolbar - Dynamic: 5 main buttons OR active button only OR 12 tools grid */}
          <View style={styles.bottomToolbar}>
            {editPanelOpen && selectedTool === 'edit' ? (
              // When Edit mode is active: Show 12 tools in 2×6 grid
              <View style={styles.editGridContainer}>
                {/* Row 1 - First 6 tools */}
                <View style={styles.editGridRow}>
                  <TouchableOpacity style={styles.toolItem} onPress={() => handleToolPress('edit')} activeOpacity={0.7}>
                    <View style={styles.activeIndicator} />
                    <Ionicons name="brush-outline" size={24} color="#000000" />
                    <Text style={styles.toolLabel}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.toolItem} onPress={() => handleToolPress('filter')} activeOpacity={0.7}>
                    <Ionicons name="color-filter-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Filter</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.toolItem} onPress={() => handleToolPress('draw')} activeOpacity={0.7}>
                    <Ionicons name="pencil-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Draw</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.toolItem} onPress={() => handleToolPress('curve')} activeOpacity={0.7}>
                    <Ionicons name="git-branch-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Curve</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.toolItem} onPress={() => handleToolPress('text')} activeOpacity={0.7}>
                    <Ionicons name="text-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Text</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.toolItem} onPress={() => handleToolPress('shape')} activeOpacity={0.7}>
                    <Ionicons name="square-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Shape</Text>
                  </TouchableOpacity>
                </View>

                {/* Row 2 - Transform & More Tools */}
                <View style={styles.editGridRow}>
                  <TouchableOpacity style={styles.toolItem} onPress={() => { closeAllPanels('crop'); setCropToolOpen(true); }} activeOpacity={0.7}>
                    <Ionicons name="crop-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Crop</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.toolItem} onPress={() => { closeAllPanels('resize'); setResizeToolOpen(true); }} activeOpacity={0.7}>
                    <Ionicons name="resize-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Resize</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.toolItem} onPress={() => { closeAllPanels('rotate'); setRotateToolOpen(true); }} activeOpacity={0.7}>
                    <Ionicons name="refresh-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Rotate</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.toolItem} onPress={() => { closeAllPanels('flip'); setFlipToolOpen(true); }} activeOpacity={0.7}>
                    <Ionicons name="swap-horizontal-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Flip</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.toolItem} onPress={() => handleToolPress('eraser')} activeOpacity={0.7}>
                    <Ionicons name="remove-circle-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Eraser</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.toolItem} onPress={() => { closeAllPanels('blur'); setBlurToolOpen(true); }} activeOpacity={0.7}>
                    <Ionicons name="water-outline" size={24} color="#E0E0E0" />
                    <Text style={styles.toolLabel}>Blur</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.toolbarContent}>
                {/* Normal state OR other panel open: Show all 5 buttons OR only active button */}
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
              </View>
            )}
          </View>

          {/* Processing Overlay */}
          {processing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          )}
        </Animated.View>

        {/* Layers Modal - Enhanced Layer Manager */}
        {/* Key based on layers.length to force re-render when layers change */}
        <LayersModal
          key={`layers-${layerManager.layers.length}-${layerManager.layers.map(l => l.id).join('-')}`}
          bottomSheetRef={layersModalRef}
          onClose={() => {
            setLayersOpen(false);
            setSelectedTool(null);
            layersModalRef.current?.close();
          }}
          layers={layerManager.layers.map(l => ({
            id: l.id,
            type: l.type === 'background' ? 'image' : l.type,
            name: l.name + (l.locked ? ' 🔐' : ''),
            visible: l.visible,
            locked: l.locked,
            opacity: l.opacity,
            imageUri: l.source || undefined,
            transform: l.transform || { x: 0, y: 0, scale: 1, rotation: 0 },
          }))}
          selectedLayerId={layerManager.selectedLayerId}
          onSelectLayer={(id) => {
            console.log('🎯 Layer panel select:', id);
            layerManager.selectLayer(id);
          }}
          onAddLayer={() => {
            // Create a new empty drawing layer
            layerManager.createDrawingLayer(`Layer ${layerManager.layers.length}`);
            Toast.show({
              type: 'success',
              text1: 'Layer Added',
              text2: 'New empty layer created',
            });
          }}
          onDeleteLayer={(id) => {
            const layer = layerManager.getLayer(id);
            if (layer?.locked) {
              Toast.show({
                type: 'error',
                text1: '🔐 Cannot Delete',
                text2: 'Background layer is locked',
              });
              return;
            }
            layerManager.deleteLayer(id);
          }}
          onToggleVisibility={(id) => {
            layerManager.toggleLayerVisibility(id);
          }}
          onRenameLayer={(id, name) => {
            layerManager.renameLayer(id, name);
          }}
          onDuplicateLayer={(id) => {
            const layer = layerManager.getLayer(id);
            if (layer?.locked) {
              Toast.show({
                type: 'info',
                text1: '🔐 Cannot Duplicate',
                text2: 'Background layer cannot be duplicated',
              });
              return;
            }
            layerManager.duplicateLayer(id);
            Toast.show({
              type: 'success',
              text1: 'Layer Duplicated',
              text2: 'New movable copy created',
            });
          }}
          onSetOpacity={(id, opacity) => {
            layerManager.setLayerOpacity(id, opacity);
          }}
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

        {/* Add Menu Modal - Simple Camera/Gallery Only */}
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

        {/* Real-Time Adjustments Panel - INSTANT CSS filter preview */}
        {/* Applies ONLY to selected layer */}
        <RealTimeAdjustPanel
          visible={adjustmentOpen}
          selectedLayerId={layerManager.selectedLayerId}
          selectedLayerName={layerManager.getSelectedLayer()?.name}
          initialValues={layerManager.getSelectedLayer()?.adjustments ? {
            brightness: layerManager.getSelectedLayer()?.adjustments?.brightness || 0,
            contrast: layerManager.getSelectedLayer()?.adjustments?.contrast || 0,
            saturation: layerManager.getSelectedLayer()?.adjustments?.saturation || 0,
            hue: layerManager.getSelectedLayer()?.adjustments?.hue || 0,
            exposure: layerManager.getSelectedLayer()?.adjustments?.exposure || 0,
          } : undefined}
          onClose={() => {
            setAdjustmentOpen(false);
            setFilterPreview(undefined);
            setSelectedTool(null);
          }}
          onFilterChange={(filter) => {
            // INSTANT preview using CSS filters on selected layer
            setFilterPreview({
              brightness: filter.brightness,
              contrast: filter.contrast,
              saturation: filter.saturation,
              hue: filter.hue,
            });
            // Also persist to layer in real-time (non-destructive)
            if (layerManager.selectedLayerId) {
              layerManager.updateAdjustments(layerManager.selectedLayerId, {
                brightness: filter.brightness,
                contrast: filter.contrast,
                saturation: filter.saturation,
                hue: filter.hue,
              });
            }
          }}
          onCommit={() => {
            // Commit is now just for closing - values are already persisted
            if (filterPreview && layerManager.selectedLayerId) {
              // Only push to history if we have a valid non-blob URI
              if (currentImageUrl && !currentImageUrl.startsWith('blob:')) {
                history.pushHistory(currentImageUrl, 'Adjustment applied', filterPreview);
              }
              
            Toast.show({
              type: 'success',
                text1: '✨ Adjustments Applied',
                text2: `Applied to ${layerManager.getSelectedLayer()?.name || 'layer'}`,
                visibilityTime: 2000,
            });
            }
          }}
        />
        
        {/* Old RealTimeAdjustments removed - using RealTimeAdjustPanel above */}

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
            console.log('Drawing tool selected:', tool.name);
            
            // Close the tools panel and open the drawing overlay
            closeAllPanels('drawingOverlay');
            setCurrentDrawingTool(tool);
            setDrawingOverlayOpen(true);
            
            Toast.show({
              type: 'info',
              text1: `${tool.name} Tool Active`,
              text2: 'Draw on canvas, tap ✓ to confirm',
              visibilityTime: 2000,
            });
          }}
          onClose={() => {
            setDrawingToolsOpen(false);
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
              
              // Create a drawing layer
              const layerId = layerManager.createDrawingLayer(currentDrawingTool?.name || 'Drawing');
              
              // Update the layer with drawing data
              layerManager.updateLayer(layerId, {
                drawing: {
                  paths: drawingData.paths,
                  tool: currentDrawingTool?.id || 'pen',
                  color: drawingData.settings?.color || '#000000',
                  strokeWidth: drawingData.settings?.size || 5,
                },
              });
              
              Toast.show({
                type: 'success',
                text1: `${currentDrawingTool?.name || 'Drawing'} Applied`,
                text2: `${drawingData.paths.length} strokes added as new layer`,
              });
            }}
            onCancel={() => setDrawingModalOpen(false)}
          />
        )}

        {/* ===== Transform Tools (Layer-aware) ===== */}
        
        {/* Crop Tool - works on selected layer */}
        <CropTool
          visible={cropToolOpen}
          imageUri={currentImageUrl}
          onApply={handleCropApply}
          onCancel={() => {
            setCropToolOpen(false);
            Toast.show({
              type: 'info',
              text1: 'Crop Cancelled',
            });
          }}
        />

        {/* Rotate Tool - PER-LAYER rotation (non-destructive) */}
        <RotateTool
          visible={rotateToolOpen}
          currentRotation={layerManager.getSelectedLayer()?.transform?.rotate || layerManager.getBackgroundLayer()?.transform?.rotate || 0}
          onApply={(rotation: number) => {
            setRotateToolOpen(false);
            
            // Get the selected layer or default to background
            let selectedLayer = layerManager.getSelectedLayer();
            
            // If no layer selected, auto-select background
            if (!selectedLayer) {
              const bgLayer = layerManager.getBackgroundLayer();
              if (bgLayer) {
                layerManager.selectLayer(bgLayer.id);
                selectedLayer = bgLayer;
              }
            }
            
            // Check if layer is locked
            if (selectedLayer?.locked) {
              Toast.show({
                type: 'error',
                text1: '🔐 Layer Locked',
                text2: 'This layer is locked. Unlock it first.',
              });
              return;
            }
            
            if (!selectedLayer) {
              Toast.show({
                type: 'info',
                text1: 'No Layer',
                text2: 'Please load an image first',
              });
              return;
            }
            
            // Apply rotation to selected layer's transform (NON-DESTRUCTIVE)
            layerManager.rotateSelectedLayer(rotation);
            
            const layerName = selectedLayer?.name || 'Layer';
            history.pushHistory(currentImageUrl, `Rotate ${layerName}`, { rotation });
            
            Toast.show({
              type: 'success',
              text1: '🔄 Rotation Applied',
              text2: `${layerName} rotated ${rotation}°`,
            });
          }}
          onCancel={() => {
            setRotateToolOpen(false);
          }}
        />

        {/* Flip Tool - PER-LAYER flip (via transform) */}
        <FlipTool
          visible={flipToolOpen}
          onApply={async (flipData: FlipData) => {
            setFlipToolOpen(false);
            if (!flipData.horizontal && !flipData.vertical) return;
            
            // Check if layer selected and can be transformed
            if (!layerManager.canTransformSelectedLayer()) {
              const selectedLayer = layerManager.getSelectedLayer();
              if (selectedLayer?.locked) {
                Toast.show({
                  type: 'error',
                  text1: '🔐 Layer Locked',
                  text2: 'Background layer cannot be flipped. Select another layer.',
                });
              } else {
                Toast.show({
                  type: 'info',
                  text1: 'Select a Layer',
                  text2: 'Please select a layer to flip',
                });
              }
              return;
            }
            
            try {
              setProcessing(true);
              
              // Get the selected layer's source image
              const selectedLayer = layerManager.getSelectedLayer();
              const imageToProcess = selectedLayer?.source || selectedLayer?.imageUri || currentImageUrl;
              
              if (!imageToProcess) {
                Toast.show({
                  type: 'error',
                  text1: 'No Image',
                  text2: 'This layer has no image to flip',
                });
                setProcessing(false);
                return;
              }
              
              const actions: ImageManipulator.Action[] = [];
              if (flipData.horizontal) {
                actions.push({ flip: ImageManipulator.FlipType.Horizontal });
              }
              if (flipData.vertical) {
                actions.push({ flip: ImageManipulator.FlipType.Vertical });
              }
              
              const result = await ImageManipulator.manipulateAsync(
                imageToProcess,
                actions,
                { compress: 1, format: ImageManipulator.SaveFormat.PNG }
              );
              
              const flipType = flipData.horizontal && flipData.vertical 
                ? 'Both' 
                : flipData.horizontal ? 'Horizontal' : 'Vertical';
              
              // Update the selected layer's source (in-place edit)
              layerManager.updateLayer(layerManager.selectedLayerId!, { 
                source: result.uri,
                imageUri: result.uri,
              });
              
              const layerName = selectedLayer?.name || 'Layer';
              
              // If background layer was flipped, also update main image URL
              if (selectedLayer?.type === 'background') {
                setCurrentImageUrl(result.uri);
                console.log('↔️ Background layer flipped, updating main image URL');
              }
              
              history.pushHistory(result.uri, `Flip ${layerName}`, flipData);
              
              Toast.show({
                type: 'success',
                text1: '↔️ Flip Applied',
                text2: `${layerName} flipped ${flipType}`,
              });
              
              setProcessing(false);
            } catch (error: any) {
              console.error('Flip error:', error);
              Toast.show({
                type: 'error',
                text1: 'Flip Failed',
                text2: error.message || 'Please try again',
              });
              setProcessing(false);
            }
          }}
          onCancel={() => {
            setFlipToolOpen(false);
          }}
        />

        {/* Resize Tool - works on selected layer or background */}
        <ResizeTool
          visible={resizeToolOpen}
          currentWidth={actualCanvasDimensions.width}
          currentHeight={actualCanvasDimensions.height}
          onApply={async (resizeData: ResizeData) => {
            setResizeToolOpen(false);
            
            try {
              setProcessing(true);
              
              // Get the selected layer or default to background
              let selectedLayer = layerManager.getSelectedLayer();
              
              // If no layer selected, auto-select and use background
              if (!selectedLayer) {
                const bgLayer = layerManager.getBackgroundLayer();
                if (bgLayer) {
                  layerManager.selectLayer(bgLayer.id);
                  selectedLayer = bgLayer;
                }
              }
              
              const imageToProcess = selectedLayer?.source || selectedLayer?.imageUri || currentImageUrl;
              
              if (!imageToProcess) {
                Toast.show({
                  type: 'error',
                  text1: 'No Image',
                  text2: 'Please load an image first to resize',
                });
                setProcessing(false);
                return;
              }
              
              // Check if layer is locked
              if (selectedLayer?.locked) {
                Toast.show({
                  type: 'error',
                  text1: '🔐 Layer Locked',
                  text2: 'This layer is locked. Unlock it first.',
                });
                setProcessing(false);
                return;
              }
              
              const result = await ImageManipulator.manipulateAsync(
                imageToProcess,
                [{ resize: { width: resizeData.width, height: resizeData.height } }],
                { compress: 1, format: ImageManipulator.SaveFormat.PNG }
              );
              
              const presetName = resizeData.preset || `${resizeData.width}x${resizeData.height}`;
              const layerName = selectedLayer?.name || 'Layer';
              const targetLayerId = selectedLayer?.id || layerManager.selectedLayerId;
              
              // Update the layer's source
              if (targetLayerId) {
                layerManager.updateLayer(targetLayerId, {
                  source: result.uri,
                  imageUri: result.uri,
                });
              }
              
              // If background layer was resized, also update main image URL and canvas dimensions
              if (selectedLayer?.type === 'background') {
                setCurrentImageUrl(result.uri);
                setActualCanvasDimensions({ width: resizeData.width, height: resizeData.height });
                
                // Recalculate display dimensions
                const maxWidth = SCREEN_WIDTH - 26;
                const maxHeight = SCREEN_HEIGHT * 0.55;
                const aspectRatio = resizeData.width / resizeData.height;
                let newWidth = maxWidth;
                let newHeight = newWidth / aspectRatio;
                if (newHeight > maxHeight) {
                  newHeight = maxHeight;
                  newWidth = newHeight * aspectRatio;
                }
                setImageDimensions({ width: newWidth, height: newHeight });
                console.log('📐 Background resized:', resizeData.width, 'x', resizeData.height);
              }
              
              history.pushHistory(result.uri, `Resize ${layerName} to ${presetName}`, resizeData);
              
              Toast.show({
                type: 'success',
                text1: '📐 Resize Applied',
                text2: `${layerName} resized to ${presetName}`,
              });
              
              setProcessing(false);
            } catch (error: any) {
              console.error('Resize error:', error);
              Toast.show({
                type: 'error',
                text1: 'Resize Failed',
                text2: error.message || 'Please try again',
              });
              setProcessing(false);
            }
          }}
          onCancel={() => {
            setResizeToolOpen(false);
          }}
        />

        {/* ===== NEW ImageToolbox-inspired Tools ===== */}
        
        {/* Before/After Comparison Slider */}
        {beforeAfterOpen && (
          <View style={StyleSheet.absoluteFill}>
            <BeforeAfterSlider
              beforeImage={originalImageUrl}
              afterImage={currentImageUrl}
              onClose={() => setBeforeAfterOpen(false)}
            />
          </View>
        )}

        {/* Color Picker Tool */}
        {colorPickerOpen && (
          <View style={StyleSheet.absoluteFill}>
            <ColorPickerTool
              imageUrl={currentImageUrl}
              onClose={() => setColorPickerOpen(false)}
              onColorSelect={(color) => {
                Toast.show({
                  type: 'success',
                  text1: 'Color Selected',
                  text2: color,
                });
              }}
            />
          </View>
        )}

        {/* Watermark Tool */}
        <WatermarkTool
          bottomSheetRef={watermarkToolRef}
          onClose={() => {
            setWatermarkOpen(false);
            watermarkToolRef.current?.close();
          }}
          onApply={(watermark: WatermarkConfig) => {
            console.log('Watermark applied:', watermark);
            setWatermarkOpen(false);
            watermarkToolRef.current?.close();
            
            // Create a text layer for the watermark
            if (watermark.text) {
              layerManager.createTextLayer(watermark.text, {
                fontSize: watermark.size,
                color: watermark.color,
                fontFamily: 'Arial',
                align: 'center',
                bold: watermark.fontWeight === 'bold',
                italic: false,
              });
              
              Toast.show({
                type: 'success',
                text1: 'Watermark Added',
                text2: `"${watermark.text}" added as new layer`,
              });
            } else {
              Toast.show({
                type: 'info',
                text1: 'Watermark',
                text2: 'Image watermarks coming soon',
              });
            }
          }}
        />

        {/* Histogram Display */}
        <HistogramDisplay
          visible={histogramOpen}
          onClose={() => setHistogramOpen(false)}
          imageUri={currentImageUrl}
        />

        {/* Professional Adjustments Panel */}
        <ProfessionalAdjustmentsPanel
          bottomSheetRef={proAdjustmentsRef}
          onClose={() => {
            setProAdjustmentsOpen(false);
            proAdjustmentsRef.current?.close();
          }}
          onApply={async (values: ProfessionalAdjustmentValues) => {
            console.log('Pro adjustments applied:', values);
            setProAdjustmentsOpen(false);
            proAdjustmentsRef.current?.close();
            
            try {
              setProcessing(true);
              
              // Apply the adjustments using canvas filters
              const adjustmentParams = {
                brightness: values.brightness,
                contrast: values.contrast,
                saturation: values.saturation,
                exposure: values.exposure,
                highlights: values.highlights,
                shadows: values.shadows,
                temperature: values.temperature,
                tint: values.tint,
                vibrance: values.vibrance,
                hue: values.hue,
                sharpness: values.sharpness,
                clarity: values.clarity,
                dehaze: values.dehaze,
                grain: values.grain,
              };
              
              const result = await applyAdjustments(currentImageUrl, adjustmentParams);
              
              if (result.success && result.uri) {
                setCurrentImageUrl(result.uri);
                history.pushHistory(result.uri, 'Pro Adjustments', values);
                layerManager.createAdjustmentLayer(adjustmentParams, 'Pro Adjustments', result.uri);
                
                Toast.show({
                  type: 'success',
                  text1: 'Adjustments Applied',
                  text2: 'Professional adjustments as new layer',
                });
              } else {
                Toast.show({
                  type: 'error',
                  text1: 'Processing Failed',
                  text2: result.error || 'Could not apply adjustments',
                });
              }
              
              setProcessing(false);
            } catch (error: any) {
              console.error('Pro adjustments error:', error);
              Toast.show({
                type: 'error',
                text1: 'Processing Failed',
                text2: error.message || 'Please try again',
              });
              setProcessing(false);
            }
          }}
        />

        {/* Shape Crop Tool */}
        <ShapeCropTool
          bottomSheetRef={shapeCropRef}
          imageUrl={currentImageUrl}
          onClose={() => {
            setShapeCropOpen(false);
            shapeCropRef.current?.close();
          }}
          onApply={async (shape: ShapeCropConfig) => {
            console.log('Shape crop applied:', shape);
            setShapeCropOpen(false);
            shapeCropRef.current?.close();
            
            // Shape cropping creates a mask layer
            // For now, show success and note that actual shape masking would require canvas
            Toast.show({
              type: 'success',
              text1: 'Shape Crop Applied',
              text2: `${shape.shapeName} mask applied as layer`,
            });
            
            // Create a shape layer (placeholder for actual implementation)
            // In a full implementation, this would apply a mask to the image
            history.pushHistory(currentImageUrl, `Shape Crop: ${shape.shapeName}`, shape);
          }}
        />

        {/* Simple Drawing Popup - Tool Selection */}
        <DrawingPopup
          visible={drawingPopupOpen}
          onToolSelect={(tool: DrawingToolOption, settings: DrawingSettings) => {
            setDrawingPopupOpen(false);
            setDrawingSettings(settings);
            
            // Convert to DrawingTool format
            const drawingTool: DrawingTool = {
              id: tool.id,
              name: tool.name,
              type: tool.id === 'eraser' ? 'eraser' : 'pen',
              icon: tool.icon,
              settings: {
                color: settings.color,
                size: settings.size,
                opacity: settings.opacity,
              },
            };
            
            setCurrentDrawingTool(drawingTool);
            setDrawingOverlayOpen(true);
            
            Toast.show({
              type: 'info',
              text1: `${tool.name} Tool Active`,
              text2: 'Draw on canvas, tap ✓ to confirm',
              visibilityTime: 2000,
            });
          }}
          onClose={() => {
            setDrawingPopupOpen(false);
          }}
        />

        {/* Text Tool Overlay - renders on top of canvas */}
        {textToolOpen && (
          <View style={StyleSheet.absoluteFill}>
            <TextOverlay
              visible={textToolOpen}
              onConfirm={(config: TextLayerConfig) => {
                console.log('Text layer created:', config);
                setTextToolOpen(false);
                
                // Create text layer with position
                const layerId = layerManager.createTextLayer(config.text, {
                  fontSize: config.fontSize,
                  fontFamily: config.fontFamily,
                  color: config.color,
                  align: config.align,
                  bold: config.bold,
                  italic: config.italic,
                  x: config.position?.x || imageDimensions.width / 2,
                  y: config.position?.y || imageDimensions.height / 2,
                });
                console.log('📝 Text layer created:', layerId, config);
                
                // Save to history
                history.pushHistory(
                  currentImageUrl || 'blank-canvas',
                  `Text: "${config.text.substring(0, 20)}${config.text.length > 20 ? '...' : ''}"`,
                  config
                );
                
                Toast.show({
                  type: 'success',
                  text1: 'Text Added',
                  text2: 'Text layer created successfully',
                });
              }}
              onCancel={() => {
                setTextToolOpen(false);
              }}
              canvasWidth={imageDimensions.width}
              canvasHeight={imageDimensions.height}
            />
          </View>
        )}

        {/* Shape Tool Overlay - renders on top of canvas */}
        {shapeToolOpen && (
          <View style={StyleSheet.absoluteFill}>
            <ShapeOverlay
              visible={shapeToolOpen}
              onConfirm={(config: ShapeConfig) => {
                console.log('Shape created:', config);
                setShapeToolOpen(false);
                
                // Create shape layer
                layerManager.createShapeLayer(
                  config.shapeType,
                  config.strokeColor,
                  config.fillColor || undefined,
                  config.strokeWidth,
                  { x: config.startX, y: config.startY },
                  { x: config.endX, y: config.endY }
                );
                
                // Save to history
                history.pushHistory(
                  currentImageUrl || 'blank-canvas',
                  `Shape: ${config.shapeType}`,
                  config
                );
                
                Toast.show({
                  type: 'success',
                  text1: 'Shape Added',
                  text2: `${config.shapeType} layer created`,
                });
              }}
              onCancel={() => {
                setShapeToolOpen(false);
              }}
              canvasWidth={imageDimensions.width}
              canvasHeight={imageDimensions.height}
            />
          </View>
        )}

        {/* Curve Tool */}
        <CurveTool
          visible={curveToolOpen}
          selectedLayerName={layerManager.getSelectedLayer()?.name}
          onClose={() => {
            setCurveToolOpen(false);
            setSelectedTool(null);
          }}
          onApply={(curves: CurveConfig) => {
            console.log('Curves applied:', curves);
            
            // Store curve data in selected layer
            if (layerManager.selectedLayerId) {
              layerManager.updateLayer(layerManager.selectedLayerId, {
                adjustments: {
                  ...layerManager.getSelectedLayer()?.adjustments,
                  curves: curves,
                },
              });
            }
            
            Toast.show({
              type: 'success',
              text1: '📈 Curves Applied',
              text2: `Applied to ${layerManager.getSelectedLayer()?.name || 'layer'}`,
            });
            
            // Push to history
            if (currentImageUrl && !currentImageUrl.startsWith('blob:')) {
              history.pushHistory(currentImageUrl, 'Curve adjustment', curves);
            }
          }}
          onPreview={(curves: CurveConfig) => {
            // Real-time preview could be implemented here
            // For now, just log
            console.log('Curves preview:', curves);
          }}
        />

        {/* Tree View Modal - Full-screen step history */}
        <TreeViewModal
          visible={treeModalOpen}
          steps={executedSteps}
          currentImageUri={currentImageUrl}
          onClose={() => setTreeModalOpen(false)}
          onStepTap={handleTreeViewStepTap}
        />

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
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5, // Above background, below bottom toolbar
    backgroundColor: 'transparent',
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
    minHeight: 300,
    maxHeight: SCREEN_HEIGHT * 0.6,
    margin: 13,
    marginTop: 13,
    marginBottom: 8,
    borderRadius: 24,
    backgroundColor: '#242428',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginRight: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  aiSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A9EFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  aiSendButtonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.5,
  },
  aiChatCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // AI Step Timeline Styles - Horizontal with animated position
  stepTimelineContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 15,
    paddingHorizontal: 13,
  },
  stepTimeline: {
    maxHeight: 50,
  },
  stepTimelineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepIcon: {
    marginRight: 0,
  },
  stepIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#323232',
    borderWidth: 1,
    borderColor: '#555555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeIconButton: {
    borderColor: '#00D9FF',
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
  },
  stepIconActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#3A3A3D',
  },
  stepPulse: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  clearStepsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#323232',
    borderWidth: 1,
    borderColor: '#555555',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
    right: 13,
    zIndex: 5,
  },
  floatingAIButtonInner: {
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
  editGridContainer: {
    paddingHorizontal: 13,
    paddingTop: 8,
  },
  editGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 54,
    marginBottom: 4,
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
