/**
 * Editor Screen - Phase 3 & 4 (Dark Mode Redesign)
 *
 * Main image editing interface with 5-tool toolbar and dark theme
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
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ToolOptionsDrawer from '../components/ToolOptionsDrawer';
import EditExpandedPanel from '../components/EditExpandedPanel';
import LayersModal from '../components/LayersModal';
import ExportSheet, { ExportFormat } from '../components/ExportSheet';
import AddMenuSheet from '../components/AddMenuSheet';
import AIFeaturesSheet from '../components/AIFeaturesSheet';
import GlobalAIModal from '../components/GlobalAIModal';
import { saveProject } from '../services/projects';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Editor'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 5 Main Tools - Always Visible
const TOOLS = [
  { id: 'edit', icon: 'create-outline', label: 'Edit' },
  { id: 'ai', icon: 'sparkles', label: 'AI' },
  { id: 'add', icon: 'add-circle-outline', label: '+Add' },
  { id: 'layers', icon: 'layers', label: 'Layers' },
  { id: 'magic', icon: 'color-wand', label: 'Magic AI' },
] as const;

export default function EditorScreen({ route, navigation }: Props) {
  const { imageUrl, isBlankCanvas, canvasWidth, canvasHeight } = route.params;

  // Refs for bottom sheets
  const toolOptionsRef = useRef<BottomSheet>(null);
  const editPanelRef = useRef<BottomSheet>(null);
  const layersModalRef = useRef<BottomSheet>(null);
  const exportSheetRef = useRef<BottomSheet>(null);
  const addMenuRef = useRef<BottomSheet>(null);
  const aiFeaturesRef = useRef<BottomSheet>(null);

  // State
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(isBlankCanvas || false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [globalAIModalVisible, setGlobalAIModalVisible] = useState(false);

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const [toolbarAnim] = useState(new Animated.Value(0));

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

  const handleBack = () => {
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to go back? Any unsaved changes will be lost.',
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
    console.log('Undo pressed');
    // TODO: Implement undo functionality
  };

  const handleRedo = () => {
    console.log('Redo pressed');
    // TODO: Implement redo functionality
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

  const handleToolPress = (toolId: string) => {
    setSelectedTool(toolId);

    // Handle Edit - Opens 9 tools panel (35% height)
    if (toolId === 'edit') {
      console.log('Edit tool pressed - opening 9 tools panel');
      editPanelRef.current?.expand();
      return;
    }

    // Handle AI - Opens AI features sheet (35% height)
    if (toolId === 'ai') {
      console.log('AI tool pressed - opening AI features');
      aiFeaturesRef.current?.expand();
      return;
    }

    // Handle +Add - Opens add menu (20% height)
    if (toolId === 'add') {
      console.log('Add tool pressed - opening add menu');
      addMenuRef.current?.expand();
      return;
    }

    // Handle Layers - Opens layers modal (20% height)
    if (toolId === 'layers') {
      console.log('Layers tool pressed - opening layers modal');
      layersModalRef.current?.expand();
      return;
    }

    // Handle Magic AI - Same as global AI modal (full screen)
    if (toolId === 'magic') {
      console.log('Magic AI tool pressed - opening global AI modal');
      setGlobalAIModalVisible(true);
      return;
    }
  };

  const handleCloseToolDrawer = () => {
    setSelectedTool(null);
  };

  const handleEditToolSelect = (toolId: string) => {
    console.log('Edit tool selected:', toolId);
    // Close the edit panel
    editPanelRef.current?.close();
    // TODO: Open specific adjustment screen or apply tool
    Toast.show({
      type: 'info',
      text1: `${toolId} tool`,
      text2: 'This feature will be implemented soon',
    });
  };

  const handleCloseEditPanel = () => {
    setSelectedTool(null);
  };

  const handleCloseLayersModal = () => {
    setSelectedTool(null);
  };

  const handleCloseExportSheet = () => {
    // Sheet closed
  };

  const handleAddOptionSelect = (option: string) => {
    console.log('Add option selected:', option);
    Toast.show({
      type: 'info',
      text1: `${option} feature`,
      text2: 'This feature will be implemented soon',
    });
  };

  const handleCloseAddMenu = () => {
    setSelectedTool(null);
  };

  const handleAIFeatureSelect = (feature: string) => {
    console.log('AI feature selected:', feature);
    Toast.show({
      type: 'info',
      text1: `${feature} AI`,
      text2: 'Processing with AI...',
    });
  };

  const handleCloseAIFeatures = () => {
    setSelectedTool(null);
  };

  const handleGlobalAIFeatureSelect = (feature: string) => {
    console.log('Global AI feature selected:', feature);
    Toast.show({
      type: 'info',
      text1: `${feature}`,
      text2: 'AI is processing your request...',
    });
  };

  const handleOpenGlobalAI = () => {
    console.log('Global AI button pressed');
    setGlobalAIModalVisible(true);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Top Navbar */}
        <View style={styles.navbar}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.circularNavButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.navActions}>
            <TouchableOpacity
              onPress={handleUndo}
              style={[styles.circularNavButton, !canUndo && styles.navButtonDisabled]}
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
              style={[
                styles.circularNavButton,
                !canRedo && styles.navButtonDisabled,
                { marginLeft: 8 },
              ]}
              disabled={!canRedo}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-redo"
                size={20}
                color={canRedo ? COLORS.textPrimary : COLORS.textTertiary}
              />
            </TouchableOpacity>

            {/* Global AI Button */}
            <TouchableOpacity
              onPress={handleOpenGlobalAI}
              style={[styles.navButton, styles.globalAIButton]}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles" size={20} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExport}
              style={[styles.navButton, styles.exportButton]}
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

        {/* Bottom Toolbar */}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolbarContent}
          >
            {TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={[
                  styles.toolButton,
                  selectedTool === tool.id && styles.toolButtonActive,
                ]}
                onPress={() => handleToolPress(tool.id)}
                activeOpacity={0.7}
              >
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
          </ScrollView>
        </Animated.View>

        {/* Tool Options Drawer */}
        <ToolOptionsDrawer
          bottomSheetRef={toolOptionsRef}
          selectedTool={selectedTool}
          onClose={handleCloseToolDrawer}
        />

        {/* Edit Expanded Panel */}
        <EditExpandedPanel
          bottomSheetRef={editPanelRef}
          onToolSelect={handleEditToolSelect}
          onClose={handleCloseEditPanel}
        />

        {/* Layers Modal */}
        <LayersModal
          bottomSheetRef={layersModalRef}
          onClose={handleCloseLayersModal}
        />

        {/* Export Sheet */}
        <ExportSheet
          bottomSheetRef={exportSheetRef}
          onExport={handleExportFormat}
          onClose={handleCloseExportSheet}
        />

        {/* Add Menu Sheet - 20% height */}
        <AddMenuSheet
          bottomSheetRef={addMenuRef}
          onOptionSelect={handleAddOptionSelect}
          onClose={handleCloseAddMenu}
        />

        {/* AI Features Sheet - 35% height */}
        <AIFeaturesSheet
          bottomSheetRef={aiFeaturesRef}
          onFeatureSelect={handleAIFeatureSelect}
          onClose={handleCloseAIFeatures}
        />

        {/* Global AI Modal - Full screen */}
        <GlobalAIModal
          visible={globalAIModalVisible}
          onClose={() => setGlobalAIModalVisible(false)}
          onFeatureSelect={handleGlobalAIFeatureSelect}
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
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
    justifyContent: 'center',
  },
  toolButton: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  toolIconContainerActive: {
    backgroundColor: COLORS.toolBackgroundActive,
  },
  toolLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  toolLabelActive: {
    color: COLORS.toolActive,
    fontWeight: '600',
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
});
