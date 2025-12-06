/**
 * Relight Screen
 * 
 * Screen for relighting images with Z-Depth, Intensity, and Color Temperature controls
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  PanResponder,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { Alert, ActivityIndicator } from 'react-native';
import { apiClient } from '../services';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ExportSheet, { ExportFormat } from '../components/ExportSheet';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';
import { saveProject } from '../services/projects';

type Props = NativeStackScreenProps<RootStackParamList, 'Relight'>;

const { width, height } = Dimensions.get('window');

export default function RelightScreen({ navigation, route }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processedImageUri, setProcessedImageUri] = useState<string | null>(null);
  const [zDepth, setZDepth] = useState(50);
  const [intensity, setIntensity] = useState(50);
  const [colorTemperature, setColorTemperature] = useState(50);
  const [showIntensityModal, setShowIntensityModal] = useState(false);
  const [showColorTempModal, setShowColorTempModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Selector position (x, y coordinates)
  const [selectorX, setSelectorX] = useState(0);
  const [selectorY, setSelectorY] = useState(0);
  const [imageContainerLayout, setImageContainerLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [isRightButtonPressed, setIsRightButtonPressed] = useState(false);
  
  // Animated values for selector position
  const selectorPanX = useRef(new Animated.Value(0)).current;
  const selectorPanY = useRef(new Animated.Value(0)).current;
  
  // Debounce timer for API calls
  const apiCallTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Export sheet ref
  const exportSheetRef = useRef<BottomSheet>(null);

  const handleSelectImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      } else if (result.canceled) {
        // User cancelled, go back
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  }, []);

  // Load image from route params if provided, otherwise prompt user
  useEffect(() => {
    if (route.params?.imageUrl) {
      setImageUri(route.params.imageUrl);
      setProcessedImageUri(null); // Reset processed image when new image is loaded
    } else {
      // If no image provided, prompt user to select one
      handleSelectImage();
    }
  }, [route.params, handleSelectImage]);

  // Call relight API when parameters change (debounced)
  const callRelightAPI = useCallback(async () => {
    if (!imageUri) {
      return; // Don't call API if image is not ready
    }
    
    // Wait for coordinates to be initialized (they start at 0,0)
    if (imageContainerLayout.width === 0 || imageContainerLayout.height === 0) {
      return; // Don't call API if container layout is not ready
    }

    // Clear previous timer
    if (apiCallTimer.current) {
      clearTimeout(apiCallTimer.current);
    }

    // Debounce API call by 500ms
    apiCallTimer.current = setTimeout(async () => {
      setIsProcessing(true);
      try {
        const response = await apiClient.relightImage({
          image_url: imageUri,
          x: selectorX,
          y: selectorY,
          z_depth: zDepth,
          warmth: colorTemperature, // Using colorTemperature as warmth value
          intensity: intensity,
        });

        if (response.result_url) {
          setProcessedImageUri(response.result_url);
        } else {
          console.warn('Relight API did not return result_url');
        }
      } catch (error) {
        console.error('Relight API error:', error);
        Alert.alert('Error', 'Failed to process image. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }, 500);
  }, [imageUri, selectorX, selectorY, zDepth, colorTemperature, intensity]);

  // Call API when parameters change
  useEffect(() => {
    // Only call API if we have image, valid coordinates, and container layout
    if (
      imageUri && 
      imageContainerLayout.width > 0 && 
      imageContainerLayout.height > 0 &&
      selectorX > 0 && 
      selectorY > 0
    ) {
      callRelightAPI();
    }

    // Cleanup timer on unmount
    return () => {
      if (apiCallTimer.current) {
        clearTimeout(apiCallTimer.current);
      }
    };
  }, [imageUri, selectorX, selectorY, zDepth, colorTemperature, intensity, imageContainerLayout.width, imageContainerLayout.height, callRelightAPI]);

  const handleExport = () => {
    if (!processedImageUri && !imageUri) {
      Alert.alert('No Image', 'Please wait for the image to be processed.');
      return;
    }
    setExportOpen(true);
    exportSheetRef.current?.snapToIndex(0);
  };

  const handleExportFormat = async (format: ExportFormat) => {
    try {
      setExporting(true);
      setExportOpen(false);
      exportSheetRef.current?.close();

      // Use processed image if available, otherwise use original
      const imageToExport = processedImageUri || imageUri;

      if (!imageToExport) {
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
      const fileName = `relight_${Date.now()}.${extension}`;

      // === WEB PLATFORM HANDLING ===
      if (Platform.OS === 'web') {
        try {
          // For web, we need to download the file directly
          const link = document.createElement('a');
          link.href = imageToExport;
          link.download = fileName;

          // For blob URLs or data URLs, we can directly download
          if (imageToExport.startsWith('blob:') || imageToExport.startsWith('data:')) {
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else {
            // For remote URLs, fetch and create blob
            const response = await fetch(imageToExport);
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
            name: `Relight Project ${Date.now()}`,
            imageUrl: imageToExport,
            thumbnail: imageToExport,
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
      let exportUri = imageToExport;

      // If it's a remote URL, download it first for native
      if (imageToExport.startsWith('http')) {
        const downloadResult = await FileSystem.downloadAsync(
          imageToExport,
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
            name: `Relight Project ${Date.now()}`,
            imageUrl: imageToExport,
            thumbnail: imageToExport,
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

  const handleHome = () => {
    navigation.navigate('Home');
  };

  // Calculate circle size based on z-depth (inverse relationship)
  // Higher z-depth = smaller circle, Lower z-depth = larger circle
  // z-depth range: 0-100, circle size range: 200-50 (pixels)
  const getCircleSize = () => {
    // Inverse relationship: when zDepth = 0, size = 200; when zDepth = 100, size = 50
    const minSize = 50;
    const maxSize = 200;
    return maxSize - ((zDepth / 100) * (maxSize - minSize));
  };

  // Update selector position based on mouse/touch coordinates
  const updateSelectorPosition = useCallback((clientX: number, clientY: number) => {
    const containerX = imageContainerLayout.x;
    const containerY = imageContainerLayout.y;
    const containerWidth = imageContainerLayout.width;
    const containerHeight = imageContainerLayout.height;
    
    // Calculate relative position within the image container
    const relativeX = clientX - containerX;
    const relativeY = clientY - containerY;
    
    // Clamp to container bounds
    const clampedX = Math.max(0, Math.min(containerWidth, relativeX));
    const clampedY = Math.max(0, Math.min(containerHeight, relativeY));
    
    // Update animated values
    selectorPanX.setValue(clampedX);
    selectorPanY.setValue(clampedY);
    
    // Store x and y coordinates
    setSelectorX(clampedX);
    setSelectorY(clampedY);
  }, [imageContainerLayout, selectorPanX, selectorPanY]);

  // Mouse event handlers for web (right-click drag)
  const handleMouseDown = useCallback((e: any) => {
    // Check if right mouse button (button === 2)
    // React Native Web: e.nativeEvent.button, Standard: e.button
    const button = e.nativeEvent?.button ?? e.button;
    if (button === 2) {
      e.preventDefault?.();
      e.stopPropagation?.();
      setIsRightButtonPressed(true);
      const clientX = e.nativeEvent?.clientX ?? e.clientX ?? e.pageX;
      const clientY = e.nativeEvent?.clientY ?? e.clientY ?? e.pageY;
      updateSelectorPosition(clientX, clientY);
    }
  }, [updateSelectorPosition]);

  const handleMouseMove = useCallback((e: any) => {
    if (isRightButtonPressed) {
      const clientX = e.nativeEvent?.clientX ?? e.clientX ?? e.pageX;
      const clientY = e.nativeEvent?.clientY ?? e.clientY ?? e.pageY;
      updateSelectorPosition(clientX, clientY);
    }
  }, [isRightButtonPressed, updateSelectorPosition]);

  const handleMouseUp = useCallback((e: any) => {
    const button = e.nativeEvent?.button ?? e.button;
    if (button === 2) {
      setIsRightButtonPressed(false);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Release button when mouse leaves the container
    setIsRightButtonPressed(false);
  }, []);

  const handleContextMenu = useCallback((e: any) => {
    // Prevent default right-click context menu
    e.preventDefault();
  }, []);

  // PanResponder for touch events (mobile)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsRightButtonPressed(true);
        const { pageX, pageY } = evt.nativeEvent;
        updateSelectorPosition(pageX, pageY);
      },
      onPanResponderMove: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        updateSelectorPosition(pageX, pageY);
      },
      onPanResponderRelease: () => {
        setIsRightButtonPressed(false);
      },
    })
  ).current;

  // Initialize selector position to center when image loads
  useEffect(() => {
    if (imageContainerLayout.width > 0 && imageContainerLayout.height > 0 && selectorX === 0 && selectorY === 0) {
      const centerX = imageContainerLayout.width / 2;
      const centerY = imageContainerLayout.height / 2;
      selectorPanX.setValue(centerX);
      selectorPanY.setValue(centerY);
      setSelectorX(centerX);
      setSelectorY(centerY);
    }
  }, [imageContainerLayout.width, imageContainerLayout.height, selectorX, selectorY]);

  // Global mouse listeners for web (to catch events outside container)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleGlobalMouseUp = (e: MouseEvent) => {
        if (e.button === 2 && isRightButtonPressed) {
          setIsRightButtonPressed(false);
        }
      };

      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isRightButtonPressed) {
          updateSelectorPosition(e.clientX, e.clientY);
        }
      };

      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('mousemove', handleGlobalMouseMove);
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [isRightButtonPressed, updateSelectorPosition]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleHome}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <Ionicons name="home" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleExport}
          style={styles.exportButton}
          activeOpacity={0.7}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="document-text" size={20} color="#FFFFFF" />
              <Text style={styles.exportButtonText}>Export</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Image Preview Area */}
      <View 
        style={styles.imageContainer}
        onLayout={(event) => {
          const { width, height, x, y } = event.nativeEvent.layout;
          setImageContainerLayout({ width, height, x, y });
        }}
        onMouseDown={Platform.OS === 'web' ? handleMouseDown : undefined}
        onMouseMove={Platform.OS === 'web' ? handleMouseMove : undefined}
        onMouseUp={Platform.OS === 'web' ? handleMouseUp : undefined}
        onMouseLeave={Platform.OS === 'web' ? handleMouseLeave : undefined}
        onContextMenu={Platform.OS === 'web' ? handleContextMenu : undefined}
        {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
      >
        {imageUri ? (
          <>
            {/* Show processed image if available, otherwise show original */}
            <Image
              source={{ uri: processedImageUri || imageUri }}
              style={styles.previewImage}
              resizeMode="contain"
              onError={() => {
                Alert.alert('Error', 'Failed to load image. Please try again.');
              }}
            />
            {/* Loading overlay */}
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            )}
            {/* Circular Selector Overlay - Only visible when right button is pressed */}
            {imageContainerLayout.width > 0 && isRightButtonPressed && (() => {
              const circleSize = getCircleSize();
              const halfSize = circleSize / 2;
              return (
                <Animated.View
                  style={[
                    styles.selectorWrapper,
                    {
                      width: circleSize,
                      height: circleSize,
                      transform: [
                        {
                          translateX: Animated.add(selectorPanX, -halfSize),
                        },
                        {
                          translateY: Animated.add(selectorPanY, -halfSize),
                        },
                      ],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.selectorCircle,
                      {
                        width: circleSize,
                        height: circleSize,
                        borderRadius: halfSize,
                      },
                    ]}
                  />
                </Animated.View>
              );
            })()}
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="image-outline" size={64} color="#666666" />
            <Text style={styles.placeholderText}>No image selected</Text>
            <TouchableOpacity
              style={styles.selectImageButton}
              onPress={handleSelectImage}
            >
              <Text style={styles.selectImageButtonText}>Select Image</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Controls Section */}
      <View style={styles.controlsContainer}>
        <Text style={styles.sectionTitle}>Relighting</Text>

        {/* Z-Depth Slider */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Z-Depth:</Text>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              value={zDepth}
              onValueChange={setZDepth}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor="#3A3A3C"
              thumbTintColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Control Buttons Row */}
        <View style={styles.buttonsRow}>
          {/* Color Temperature Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowColorTempModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.controlButtonIcon}>
              <Ionicons name="sunny" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.controlButtonText}>Color Temperature</Text>
          </TouchableOpacity>

          {/* Shadow Settings Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              // TODO: Open shadow settings
              Alert.alert('Shadow Settings', 'Shadow settings coming soon!');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.controlButtonIcon}>
              <Ionicons name="contrast" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.controlButtonText}>Shadow Settings</Text>
          </TouchableOpacity>

          {/* Intensity Button */}
          <TouchableOpacity
            style={styles.intensityButton}
            onPress={() => setShowIntensityModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.intensityButtonText}>Intensity</Text>
            <View style={styles.intensityValueBox}>
              <Text style={styles.intensityValueText}>0-100</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Intensity Modal */}
      <Modal
        visible={showIntensityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowIntensityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Intensity</Text>
              <TouchableOpacity
                onPress={() => setShowIntensityModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSliderContainer}>
              <Text style={styles.modalSliderLabel}>
                Value: {Math.round(intensity)}
              </Text>
              <Slider
                style={styles.modalSlider}
                minimumValue={1}
                maximumValue={100}
                value={intensity}
                onValueChange={setIntensity}
                minimumTrackTintColor="#FFFFFF"
                maximumTrackTintColor="#3A3A3C"
                thumbTintColor="#FFFFFF"
              />
              <View style={styles.modalSliderRange}>
                <Text style={styles.modalSliderRangeText}>1</Text>
                <Text style={styles.modalSliderRangeText}>100</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Color Temperature Modal */}
      <Modal
        visible={showColorTempModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowColorTempModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Color Temperature</Text>
              <TouchableOpacity
                onPress={() => setShowColorTempModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSliderContainer}>
              <Text style={styles.modalSliderLabel}>
                Value: {Math.round(colorTemperature)}
              </Text>
              <Slider
                style={styles.modalSlider}
                minimumValue={0}
                maximumValue={100}
                value={colorTemperature}
                onValueChange={setColorTemperature}
                minimumTrackTintColor="#FFFFFF"
                maximumTrackTintColor="#3A3A3C"
                thumbTintColor="#FFFFFF"
              />
              <View style={styles.modalSliderRange}>
                <Text style={styles.modalSliderRangeText}>Cool</Text>
                <Text style={styles.modalSliderRangeText}>Warm</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Sheet */}
      <ExportSheet
        bottomSheetRef={exportSheetRef}
        onExport={handleExportFormat}
        onClose={() => {
          setExportOpen(false);
          exportSheetRef.current?.close();
        }}
      />

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#242428',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242428',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  imageContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  selectorWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
    marginTop: 0,
  },
  selectorCircle: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  selectImageButton: {
    backgroundColor: '#242428',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectImageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  controlsContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  controlRow: {
    marginBottom: 24,
  },
  controlLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  sliderContainer: {
    width: '100%',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#242428',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonIcon: {
    marginBottom: 8,
  },
  controlButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  intensityButton: {
    flex: 1,
    backgroundColor: '#242428',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intensityButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  intensityValueBox: {
    backgroundColor: '#3A3A3C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  intensityValueText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSliderContainer: {
    marginBottom: 20,
  },
  modalSliderLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSlider: {
    width: '100%',
    height: 40,
  },
  modalSliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalSliderRangeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});

