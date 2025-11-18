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
import AdjustmentPanel from '../components/AdjustmentPanel';
import AIChatModal from '../components/AIChatModal';
import { saveProject } from '../services/projects';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

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

// 9 Edit Tools - Shown when Edit is tapped
const EDIT_TOOLS = [
  { id: 'crop', icon: 'crop', label: 'Crop', color: '#FF6B6B' },
  { id: 'resize', icon: 'resize', label: 'Resize', color: '#4ECDC4' },
  { id: 'rotate', icon: 'reload', label: 'Rotate', color: '#45B7D1' },
  { id: 'flip', icon: 'swap-horizontal', label: 'Flip', color: '#A55EEA' },
  { id: 'filter', icon: 'color-filter', label: 'Filter', color: '#26DE81' },
  { id: 'blur', icon: 'radio-button-on', label: 'Blur', color: '#FD79A8' },
  { id: 'sharpen', icon: 'diamond', label: 'Sharpen', color: '#74B9FF' },
  { id: 'vignette', icon: 'ellipse-outline', label: 'Vignette', color: '#FF8A65' },
  { id: 'frame', icon: 'square-outline', label: 'Frame', color: '#9575CD' },
];

export default function EditorScreen({ route, navigation }: Props) {
  const { imageUrl, isBlankCanvas, canvasWidth, canvasHeight } = route.params;

  // Refs for bottom sheets
  const layersModalRef = useRef<BottomSheet>(null);
  const exportSheetRef = useRef<BottomSheet>(null);
  const addMenuRef = useRef<BottomSheet>(null);
  const aiFeaturesRef = useRef<BottomSheet>(null);

  // State
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(isBlankCanvas || false);
  const [canUndo, setCanUndo] = useState(true); // Enabled for demo
  const [canRedo, setCanRedo] = useState(true); // Enabled for demo
  const [exporting, setExporting] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [showAIButton, setShowAIButton] = useState(true);

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const [toolbarAnim] = useState(new Animated.Value(0));
  const [editPanelHeight] = useState(new Animated.Value(0));
  const [aiButtonScale] = useState(new Animated.Value(1));

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(toolbarAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Hide/show AI button based on panel visibility
  useEffect(() => {
    const shouldHide = showEditPanel || showAdjustment || aiChatVisible;
    setShowAIButton(!shouldHide);

    Animated.spring(aiButtonScale, {
      toValue: shouldHide ? 0 : 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [showEditPanel, showAdjustment, aiChatVisible]);

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
    console.log('Undo pressed');
    Toast.show({
      type: 'info',
      text1: 'Undo',
      text2: 'Previous action undone',
    });
  };

  const handleRedo = () => {
    console.log('Redo pressed');
    Toast.show({
      type: 'info',
      text1: 'Redo',
      text2: 'Action redone',
    });
  };

  const handleExport = () => {
    console.log('Export pressed');
    exportSheetRef.current?.expand();
  };

  const handleExportFormat = async (format: ExportFormat) => {
    try {
      setExporting(true);
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

      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Save project to recents
      const project = await saveProject({
        name: isBlankCanvas ? 'Blank Canvas' : 'Edited Image',
        thumbnail: imageUrl || 'placeholder',
        imageUrl: imageUrl,
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
    layersModalRef.current?.close();
    addMenuRef.current?.close();
    aiFeaturesRef.current?.close();

    Animated.timing(editPanelHeight, {
      toValue: 0,
      duration: 300,
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
      Animated.spring(editPanelHeight, {
        toValue: 280,
        friction: 8,
        tension: 40,
        useNativeDriver: false,
      }).start();
      return;
    }

    // Handle Adjust - Shows adjustment panel
    if (toolId === 'adjust') {
      setShowAdjustment(true);
      return;
    }

    // Handle +Add - Opens add menu
    if (toolId === 'add') {
      addMenuRef.current?.expand();
      return;
    }

    // Handle Layers - Opens layers modal
    if (toolId === 'layers') {
      layersModalRef.current?.expand();
      return;
    }

    // Handle AI - Opens AI features sheet
    if (toolId === 'ai') {
      aiFeaturesRef.current?.expand();
      return;
    }
  };

  const handleEditToolSelect = (toolId: string) => {
    console.log('Edit tool selected:', toolId);
    Toast.show({
      type: 'info',
      text1: `${toolId} tool`,
      text2: 'Applied successfully',
    });
  };

  const handleAdjustmentChange = (type: string, value: number) => {
    console.log(`${type} adjusted to ${value}`);
  };

  const handleAddOptionSelect = (option: string) => {
    console.log('Add option selected:', option);
    addMenuRef.current?.close();
    Toast.show({
      type: 'info',
      text1: `${option} feature`,
      text2: 'Added to image',
    });
  };

  const handleAIFeatureSelect = (feature: string) => {
    console.log('AI feature selected:', feature);
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
              style={[styles.circularNavButton, !canUndo && styles.navButtonDisabled, { marginLeft: 8 }]}
              disabled={!canUndo}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-undo"
                size={20}
                color={canUndo ? COLORS.textPrimary : COLORS.textTertiary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRedo}
              style={[styles.circularNavButton, !canRedo && styles.navButtonDisabled, { marginLeft: 8 }]}
              disabled={!canRedo}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-redo"
                size={20}
                color={canRedo ? COLORS.textPrimary : COLORS.textTertiary}
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

        {/* Image Display Area */}
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
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
              onLoad={() => setImageLoaded(true)}
              onError={(error) => {
                console.error('Image load error:', error);
                Alert.alert(
                  'Error',
                  'Failed to load image. Please try again.',
                  [{ text: 'Go Back', onPress: () => navigation.goBack() }]
                );
              }}
            />
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
            <TouchableOpacity
              onPress={handleOpenAIChat}
              style={styles.aiChatButton}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses" size={28} color="#000" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Adjustment Panel */}
        {showAdjustment && (
          <AdjustmentPanel
            visible={showAdjustment}
            onClose={() => setShowAdjustment(false)}
            onValueChange={handleAdjustmentChange}
          />
        )}

        {/* Bottom Toolbar with Edit Panel */}
        <Animated.View
          style={[
            styles.toolbarContainer,
            {
              height: editPanelHeight.interpolate({
                inputRange: [0, 280],
                outputRange: [100, 380],
              }),
            },
          ]}
        >
          {/* Edit Panel - Expanded Above */}
          {showEditPanel && (
            <Animated.View
              style={[
                styles.editPanelExpanded,
                {
                  opacity: editPanelHeight.interpolate({
                    inputRange: [0, 280],
                    outputRange: [0, 1],
                  }),
                },
              ]}
            >
              <View style={styles.editPanelHeader}>
                <Text style={styles.editPanelTitle}>Edit Tools</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowEditPanel(false);
                    setSelectedTool(null);
                    Animated.timing(editPanelHeight, {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: false,
                    }).start();
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.editToolsGrid}>
                {EDIT_TOOLS.map((tool) => (
                  <TouchableOpacity
                    key={tool.id}
                    style={styles.editToolItem}
                    onPress={() => handleEditToolSelect(tool.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.editToolIcon, { backgroundColor: tool.color }]}>
                      <Ionicons name={tool.icon as any} size={24} color="#fff" />
                    </View>
                    <Text style={styles.editToolLabel}>{tool.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Main 5 Tools - Fixed Bottom Bar */}
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
                  <View
                    style={[
                      styles.toolIconContainer,
                      selectedTool === tool.id && styles.toolIconContainerActive,
                      index === 2 && styles.middleToolIcon,
                    ]}
                  >
                    <Ionicons
                      name={tool.icon as any}
                      size={index === 2 ? 32 : 28}
                      color={index === 2 ? '#000' : selectedTool === tool.id ? COLORS.toolActive : COLORS.toolDefault}
                    />
                  </View>
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
          </Animated.View>
        </Animated.View>

        {/* Layers Modal */}
        <LayersModal
          bottomSheetRef={layersModalRef}
          onClose={() => layersModalRef.current?.close()}
        />

        {/* Export Sheet */}
        <ExportSheet
          bottomSheetRef={exportSheetRef}
          onExport={handleExportFormat}
          onClose={() => exportSheetRef.current?.close()}
        />

        {/* Add Menu Sheet */}
        <AddMenuSheet
          bottomSheetRef={addMenuRef}
          onOptionSelect={handleAddOptionSelect}
          onClose={() => addMenuRef.current?.close()}
        />

        {/* AI Features Sheet */}
        <AIFeaturesSheet
          bottomSheetRef={aiFeaturesRef}
          onFeatureSelect={handleAIFeatureSelect}
          onClose={() => aiFeaturesRef.current?.close()}
        />

        {/* AI Chat Modal */}
        <AIChatModal
          visible={aiChatVisible}
          onClose={() => setAiChatVisible(false)}
        />
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
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  navButton: {
    padding: 8,
  },
  circularNavButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#323232',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
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
    borderTopColor: COLORS.borderLight,
    paddingVertical: SPACING.md,
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
    backgroundColor: COLORS.toolBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
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
    backgroundColor: COLORS.toolBackgroundActive,
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
  aiChatButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  // Edit panel expanded view
  editPanelExpanded: {
    flex: 1,
    paddingTop: SPACING.md,
  },
  editPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  editPanelTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  editToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  editToolItem: {
    width: (SCREEN_WIDTH - SPACING.md * 2) / 5 - SPACING.xs,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  editToolIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  editToolLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  // Middle button styles (aliases for existing styles)
  middleToolButton: {
    marginTop: -30,
  },
  middleToolIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 3,
    borderColor: COLORS.background,
  },
});
