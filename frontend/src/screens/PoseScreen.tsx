/**
 * Pose Screen
 *
 * Screen for changing poses in images with draggable skeleton keypoints
 * Follows the same pattern as RelightScreen
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
  ScrollView,
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

type Props = NativeStackScreenProps<RootStackParamList, 'Pose'>;

const { width, height } = Dimensions.get('window');

// Pose keypoint structure (COCO format - 17 keypoints)
interface PoseKeypoint {
  id: number;
  name: string;
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  color: string;
}

// Default pose in neutral standing position
const DEFAULT_POSE_KEYPOINTS: PoseKeypoint[] = [
  { id: 0, name: 'nose', x: 0.5, y: 0.15, color: '#00D9FF' },
  { id: 1, name: 'left_eye', x: 0.48, y: 0.12, color: '#00D9FF' },
  { id: 2, name: 'right_eye', x: 0.52, y: 0.12, color: '#00D9FF' },
  { id: 3, name: 'left_ear', x: 0.46, y: 0.12, color: '#00D9FF' },
  { id: 4, name: 'right_ear', x: 0.54, y: 0.12, color: '#00D9FF' },
  { id: 5, name: 'left_shoulder', x: 0.42, y: 0.25, color: '#00D9FF' },
  { id: 6, name: 'right_shoulder', x: 0.58, y: 0.25, color: '#00D9FF' },
  { id: 7, name: 'left_elbow', x: 0.38, y: 0.4, color: '#00D9FF' },
  { id: 8, name: 'right_elbow', x: 0.62, y: 0.4, color: '#00D9FF' },
  { id: 9, name: 'left_wrist', x: 0.35, y: 0.52, color: '#00D9FF' },
  { id: 10, name: 'right_wrist', x: 0.65, y: 0.52, color: '#00D9FF' },
  { id: 11, name: 'left_hip', x: 0.45, y: 0.55, color: '#00D9FF' },
  { id: 12, name: 'right_hip', x: 0.55, y: 0.55, color: '#00D9FF' },
  { id: 13, name: 'left_knee', x: 0.43, y: 0.72, color: '#00D9FF' },
  { id: 14, name: 'right_knee', x: 0.57, y: 0.72, color: '#00D9FF' },
  { id: 15, name: 'left_ankle', x: 0.42, y: 0.9, color: '#00D9FF' },
  { id: 16, name: 'right_ankle', x: 0.58, y: 0.9, color: '#00D9FF' },
];

// Skeleton connections (bones)
const POSE_CONNECTIONS = [
  // Head
  [0, 1], [0, 2], [1, 3], [2, 4],
  // Torso
  [5, 6], [5, 11], [6, 12], [11, 12],
  // Left arm
  [5, 7], [7, 9],
  // Right arm
  [6, 8], [8, 10],
  // Left leg
  [11, 13], [13, 15],
  // Right leg
  [12, 14], [14, 16],
];

export default function PoseScreen({ navigation, route }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processedImageUri, setProcessedImageUri] = useState<string | null>(null);
  const [poseKeypoints, setPoseKeypoints] = useState<PoseKeypoint[]>(DEFAULT_POSE_KEYPOINTS);
  const [selectedKeypoint, setSelectedKeypoint] = useState<number | null>(null);
  const [showControlsModal, setShowControlsModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [confidence, setConfidence] = useState(0.7); // Pose detection confidence threshold

  const [imageContainerLayout, setImageContainerLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

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
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  }, []);

  // Load image from route params
  useEffect(() => {
    if (route.params?.imageUrl) {
      setImageUri(route.params.imageUrl);
      setProcessedImageUri(null);
    } else {
      handleSelectImage();
    }
  }, [route.params, handleSelectImage]);

  // Call pose API when keypoints change (debounced)
  const callPoseAPI = useCallback(async () => {
    if (!imageUri || imageContainerLayout.width === 0) {
      return;
    }

    // Clear previous timer
    if (apiCallTimer.current) {
      clearTimeout(apiCallTimer.current);
    }

    // Debounce API call by 800ms
    apiCallTimer.current = setTimeout(async () => {
      setIsProcessing(true);
      console.log("POSE API KEYPOINTS →", {
        image: imageUri,
        keypoints: poseKeypoints,
        confidence,
      });

      try {
        const response = await apiClient.poseChange({
          image_url: imageUri,
          keypoints: poseKeypoints.map(kp => ({
            id: kp.id,
            name: kp.name,
            x: kp.x,
            y: kp.y,
          })),
          confidence_threshold: confidence,
        });

        if (response.result_url) {
          setProcessedImageUri(response.result_url);
        } else {
          console.warn('Pose API did not return result_url');
        }
      } catch (error) {
        console.error('Pose API error:', error);
        Alert.alert('Error', 'Failed to process image. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }, 800);
  }, [imageUri, poseKeypoints, confidence, imageContainerLayout.width]);

  // Call API when keypoints change
  useEffect(() => {
    if (imageUri && imageContainerLayout.width > 0) {
      callPoseAPI();
    }

    return () => {
      if (apiCallTimer.current) {
        clearTimeout(apiCallTimer.current);
      }
    };
  }, [imageUri, poseKeypoints, confidence, imageContainerLayout.width, callPoseAPI]);

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

      const extension = format === 'jpg' ? 'jpg' : 'png';
      const fileName = `pose_${Date.now()}.${extension}`;

      // === WEB PLATFORM HANDLING ===
      if (Platform.OS === 'web') {
        try {
          const link = document.createElement('a');
          link.href = imageToExport;
          link.download = fileName;

          if (imageToExport.startsWith('blob:') || imageToExport.startsWith('data:')) {
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else {
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

          await saveProject({
            id: Date.now().toString(),
            name: `Pose Project ${Date.now()}`,
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
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant permission to save images to your gallery.');
            setExporting(false);
            return;
          }

          const asset = await MediaLibrary.createAssetAsync(exportUri);
          console.log('✅ Saved to gallery:', asset.uri);

          await saveProject({
            id: Date.now().toString(),
            name: `Pose Project ${Date.now()}`,
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

  // Update keypoint position
  const updateKeypointPosition = useCallback((keypointId: number, clientX: number, clientY: number) => {
    const containerX = imageContainerLayout.x;
    const containerY = imageContainerLayout.y;
    const containerWidth = imageContainerLayout.width;
    const containerHeight = imageContainerLayout.height;

    const relativeX = clientX - containerX;
    const relativeY = clientY - containerY;

    // Clamp to container bounds
    const clampedX = Math.max(0, Math.min(containerWidth, relativeX));
    const clampedY = Math.max(0, Math.min(containerHeight, relativeY));

    // Normalize to 0-1
    const normalizedX = clampedX / containerWidth;
    const normalizedY = clampedY / containerHeight;

    // Update keypoint
    setPoseKeypoints(prev => prev.map(kp =>
      kp.id === keypointId
        ? { ...kp, x: normalizedX, y: normalizedY }
        : kp
    ));
  }, [imageContainerLayout]);

  // Reset pose to default
  const handleResetPose = () => {
    setPoseKeypoints(DEFAULT_POSE_KEYPOINTS);
    Toast.show({
      type: 'info',
      text1: 'Pose Reset',
      text2: 'Skeleton returned to default position',
    });
  };

  // Detect pose from image (placeholder - would call backend)
  const handleDetectPose = () => {
    Toast.show({
      type: 'info',
      text1: 'Pose Detection',
      text2: 'Automatic pose detection coming soon!',
    });
  };

  // Render skeleton overlay
  const renderSkeleton = () => {
    if (!showSkeleton || imageContainerLayout.width === 0) return null;

    const containerWidth = imageContainerLayout.width;
    const containerHeight = imageContainerLayout.height;

    return (
      <View style={styles.skeletonOverlay} pointerEvents="box-none">
        {/* Draw connections/bones */}
        {POSE_CONNECTIONS.map((connection, index) => {
          const [fromId, toId] = connection;
          const fromKp = poseKeypoints[fromId];
          const toKp = poseKeypoints[toId];

          if (!fromKp || !toKp) return null;

          const x1 = fromKp.x * containerWidth;
          const y1 = fromKp.y * containerHeight;
          const x2 = toKp.x * containerWidth;
          const y2 = toKp.y * containerHeight;

          const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

          return (
            <View
              key={`connection-${index}`}
              style={[
                styles.skeletonBone,
                {
                  position: 'absolute',
                  left: x1,
                  top: y1,
                  width: length,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}

        {/* Draw keypoints */}
        {poseKeypoints.map((keypoint) => {
          const x = keypoint.x * containerWidth;
          const y = keypoint.y * containerHeight;

          return (
            <TouchableOpacity
              key={keypoint.id}
              style={[
                styles.skeletonKeypoint,
                {
                  left: x - 8,
                  top: y - 8,
                  backgroundColor: keypoint.color,
                  borderColor: selectedKeypoint === keypoint.id ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  borderWidth: selectedKeypoint === keypoint.id ? 3 : 2,
                  transform: [{ scale: selectedKeypoint === keypoint.id ? 1.3 : 1 }],
                },
              ]}
              onPress={() => setSelectedKeypoint(keypoint.id)}
              activeOpacity={0.7}
            >
              {selectedKeypoint === keypoint.id && (
                <View style={styles.keypointDragIndicator}>
                  <Ionicons name="move" size={10} color="#000" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Handle touch/mouse dragging of selected keypoint
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => selectedKeypoint !== null,
      onMoveShouldSetPanResponder: () => selectedKeypoint !== null,
      onPanResponderGrant: (evt) => {
        setIsDragging(true);
      },
      onPanResponderMove: (evt) => {
        if (selectedKeypoint !== null) {
          const { pageX, pageY } = evt.nativeEvent;
          updateKeypointPosition(selectedKeypoint, pageX, pageY);
        }
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
      },
    })
  ).current;

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

          <Text style={styles.headerTitle}>Pose Change</Text>

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

        {/* Image Preview Area with Skeleton Overlay */}
        <View
          style={styles.imageContainer}
          onLayout={(event) => {
            const { width, height, x, y } = event.nativeEvent.layout;
            setImageContainerLayout({ width, height, x, y });
          }}
          {...panResponder.panHandlers}
        >
          {imageUri ? (
            <>
              <Image
                source={{ uri: processedImageUri || imageUri }}
                style={styles.previewImage}
                resizeMode="contain"
                onError={() => {
                  Alert.alert('Error', 'Failed to load image. Please try again.');
                }}
              />
              {isProcessing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.processingText}>Processing Pose...</Text>
                </View>
              )}
              {renderSkeleton()}
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
          <Text style={styles.sectionTitle}>Pose Controls</Text>

          {selectedKeypoint !== null && (
            <View style={styles.selectedKeypointInfo}>
              <Ionicons name="information-circle" size={20} color="#00D9FF" />
              <Text style={styles.selectedKeypointText}>
                Editing: {poseKeypoints[selectedKeypoint]?.name.replace(/_/g, ' ')}
              </Text>
            </View>
          )}

          {/* Action Buttons Row */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleDetectPose}
              activeOpacity={0.7}
            >
              <View style={styles.controlButtonIcon}>
                <Ionicons name="scan" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.controlButtonText}>Detect</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleResetPose}
              activeOpacity={0.7}
            >
              <View style={styles.controlButtonIcon}>
                <Ionicons name="refresh" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.controlButtonText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, showSkeleton && styles.controlButtonActive]}
              onPress={() => setShowSkeleton(!showSkeleton)}
              activeOpacity={0.7}
            >
              <View style={styles.controlButtonIcon}>
                <Ionicons name={showSkeleton ? "eye" : "eye-off"} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.controlButtonText}>Skeleton</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setShowControlsModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.controlButtonIcon}>
                <Ionicons name="settings" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.controlButtonText}>Settings</Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsText}>
              Tap a keypoint to select it, then drag on the image to reposition.
            </Text>
          </View>
        </View>

        {/* Settings Modal */}
        <Modal
          visible={showControlsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowControlsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pose Settings</Text>
                <TouchableOpacity
                  onPress={() => setShowControlsModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalSliderContainer}>
                <Text style={styles.modalSliderLabel}>
                  Confidence Threshold: {Math.round(confidence * 100)}%
                </Text>
                <Slider
                  style={styles.modalSlider}
                  minimumValue={0.3}
                  maximumValue={1.0}
                  value={confidence}
                  onValueChange={setConfidence}
                  minimumTrackTintColor="#FFFFFF"
                  maximumTrackTintColor="#3A3A3C"
                  thumbTintColor="#FFFFFF"
                />
                <View style={styles.modalSliderRange}>
                  <Text style={styles.modalSliderRangeText}>Low</Text>
                  <Text style={styles.modalSliderRangeText}>High</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
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
  skeletonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  skeletonBone: {
    height: 3,
    backgroundColor: '#00D9FF',
    opacity: 0.8,
  },
  skeletonKeypoint: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypointDragIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 16,
  },
  selectedKeypointInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedKeypointText: {
    fontSize: 14,
    color: '#00D9FF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#242428',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#00D9FF',
  },
  controlButtonIcon: {
    marginBottom: 6,
  },
  controlButtonText: {
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  instructionsBox: {
    backgroundColor: '#242428',
    padding: 12,
    borderRadius: 8,
  },
  instructionsText: {
    fontSize: 13,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 18,
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
