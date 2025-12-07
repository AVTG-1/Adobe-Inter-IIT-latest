/**
 * PoseTool Component
 * 
 * Provides pose detection and editing functionality
 * - Detect Pose: Shows dummy skeleton points and lines
 * - Edit Pose: Makes points draggable for manual adjustment
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  ScrollView,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pose keypoints structure based on the image
interface PosePoint {
  id: number;
  name: string;
  x: number;
  y: number;
  color: string;
}

// Connections between keypoints
interface PoseConnection {
  from: number;
  to: number;
}

// Dummy pose data matching the image structure
const DUMMY_POSE_POINTS: PosePoint[] = [
  // Head
  { id: 0, name: 'nose', x: 0.5, y: 0.15, color: '#00D9FF' },
  { id: 1, name: 'left_eye', x: 0.48, y: 0.12, color: '#00D9FF' },
  { id: 2, name: 'right_eye', x: 0.52, y: 0.12, color: '#00D9FF' },
  // Shoulders
  { id: 3, name: 'left_shoulder', x: 0.42, y: 0.25, color: '#00D9FF' },
  { id: 4, name: 'right_shoulder', x: 0.58, y: 0.25, color: '#00D9FF' },
  // Elbows
  { id: 5, name: 'left_elbow', x: 0.38, y: 0.4, color: '#00D9FF' },
  { id: 6, name: 'right_elbow', x: 0.62, y: 0.4, color: '#00D9FF' },
  // Wrists
  { id: 7, name: 'left_wrist', x: 0.35, y: 0.52, color: '#00D9FF' },
  { id: 8, name: 'right_wrist', x: 0.65, y: 0.52, color: '#00D9FF' },
  // Hips
  { id: 9, name: 'left_hip', x: 0.45, y: 0.55, color: '#00D9FF' },
  { id: 10, name: 'right_hip', x: 0.55, y: 0.55, color: '#00D9FF' },
  // Knees
  { id: 11, name: 'left_knee', x: 0.43, y: 0.72, color: '#00D9FF' },
  { id: 12, name: 'right_knee', x: 0.57, y: 0.72, color: '#00D9FF' },
  // Ankles
  { id: 13, name: 'left_ankle', x: 0.42, y: 0.9, color: '#00D9FF' },
  { id: 14, name: 'right_ankle', x: 0.58, y: 0.9, color: '#00D9FF' },
];

// Skeleton connections
const POSE_CONNECTIONS: PoseConnection[] = [
  // Head
  { from: 0, to: 1 }, { from: 0, to: 2 },
  // Torso
  { from: 1, to: 3 }, { from: 2, to: 4 },
  { from: 3, to: 4 },
  { from: 3, to: 9 }, { from: 4, to: 10 },
  { from: 9, to: 10 },
  // Arms
  { from: 3, to: 5 }, { from: 5, to: 7 },
  { from: 4, to: 6 }, { from: 6, to: 8 },
  // Legs
  { from: 9, to: 11 }, { from: 11, to: 13 },
  { from: 10, to: 12 }, { from: 12, to: 14 },
];

interface PoseToolProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onApply: (targetPose: string, prompt?: string) => Promise<void>;
  onClose: () => void;
  onDetectPose: () => void;
  onEditPose: () => void;
  isProcessing: boolean;
}

const PoseTool: React.FC<PoseToolProps> = ({
  bottomSheetRef,
  onApply,
  onClose,
  onDetectPose,
  onEditPose,
  isProcessing,
}) => {
  const snapPoints = useMemo(() => ['50%', '75%'], []);
  const [mode, setMode] = useState<'detect' | 'edit'>('detect');

  const animationConfigs = useMemo(
    () => ({
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    []
  );

  const renderBackdrop = useMemo(() => null, []);

  // Debug logging
  useEffect(() => {
    console.log('🎭 PoseTool: Component mounted/updated', {
      snapPoints,
      mode,
      bottomSheetRef: bottomSheetRef.current,
    });
    
    // Log when bottomSheetRef becomes available
    if (bottomSheetRef.current) {
      console.log('🎭 BottomSheet ref is ready:', {
        snapToIndex: typeof bottomSheetRef.current.snapToIndex,
        expand: typeof bottomSheetRef.current.expand,
      });
    }
  }, [snapPoints, mode, bottomSheetRef.current]);

  // Handle pose detection
  const handleDetectPose = () => {
    setMode('detect');
    onDetectPose(); // Call parent handler to show overlay
  };

  // Switch to edit mode
  const handleEditPose = () => {
    setMode('edit');
    onEditPose(); // Call parent handler to enable editing
  };

  // Apply pose changes
  const handleApplyPose = async () => {
    const poseData = {
      mode,
    };
    await onApply(JSON.stringify(poseData));
  };

  console.log('🎭 PoseTool rendering, snapPoints:', snapPoints);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      onClose={onClose}
      onChange={(index) => {
        console.log('🎭 PoseTool BottomSheet index changed to:', index);
        if (index === -1) console.log('🎭 BottomSheet is closed');
        if (index === 0) console.log('🎭 BottomSheet opened to first snap point (40%)');
        if (index === 1) console.log('🎭 BottomSheet opened to second snap point (60%)');
      }}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="body-outline" size={24} color="#00D9FF" />
            <Text style={styles.title}>Pose Change</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'detect' && styles.modeButtonActive]}
            onPress={handleDetectPose}
          >
            <Ionicons
              name="scan-outline"
              size={20}
              color={mode === 'detect' ? '#FFFFFF' : '#888888'}
            />
            <Text style={[styles.modeText, mode === 'detect' && styles.modeTextActive]}>
              Detect Pose
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, mode === 'edit' && styles.modeButtonActive]}
            onPress={handleEditPose}
          >
            <Ionicons
              name="hand-left-outline"
              size={20}
              color={mode === 'edit' ? '#FFFFFF' : '#888888'}
            />
            <Text style={[styles.modeText, mode === 'edit' && styles.modeTextActive]}>
              Edit Pose
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.instructionsContainer}>
            <Ionicons name="information-circle-outline" size={48} color="#00D9FF" />
            <Text style={styles.instructionTitle}>
              {mode === 'detect' ? 'Detect Pose' : 'Edit Pose'}
            </Text>
            <Text style={styles.instructionText}>
              {mode === 'detect'
                ? 'Tap "Detect Pose" to analyze the body position in your image. The skeleton overlay will appear on the canvas above.'
                : 'The skeleton is now displayed on the canvas. Drag any point on the canvas to adjust the pose. Use the controls above the canvas to save or cancel.'}
            </Text>
            
            {mode === 'edit' && (
              <View style={styles.tipBox}>
                <Ionicons name="bulb-outline" size={20} color="#FFD700" />
                <Text style={styles.tipText}>
                  Tip: The skeleton overlay is shown directly on your image. Drag the cyan points to adjust the pose.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.applyButton, isProcessing && styles.applyButtonDisabled]}
            onPress={handleApplyPose}
            disabled={isProcessing}
          >
            <Ionicons name="checkmark" size={20} color="#000000" />
            <Text style={styles.applyButtonText}>
              {isProcessing ? 'Processing...' : 'Apply Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: '#555555',
    width: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: '#00D9FF',
    borderColor: '#00D9FF',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#FFD700',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#00D9FF',
  },
  applyButtonDisabled: {
    backgroundColor: '#555555',
    opacity: 0.5,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});

export default PoseTool;
