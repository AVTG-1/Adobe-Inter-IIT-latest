/**
 * PoseOverlay Component
 * 
 * Displays pose skeleton points and connections directly on the canvas
 * Works in conjunction with PoseTool bottom sheet for controls
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Pose keypoints structure
export interface PosePoint {
  id: number;
  name: string;
  x: number; // 0-1 relative to canvas
  y: number; // 0-1 relative to canvas
  color: string;
}

// Connections between keypoints
export interface PoseConnection {
  from: number;
  to: number;
}

interface PoseOverlayProps {
  visible: boolean;
  canvasWidth: number;
  canvasHeight: number;
  points: PosePoint[];
  connections: PoseConnection[];
  editable: boolean;
  selectedPoint: number | null;
  onPointSelect: (id: number) => void;
  onPointMove: (id: number, dx: number, dy: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const PoseOverlay: React.FC<PoseOverlayProps> = ({
  visible,
  canvasWidth,
  canvasHeight,
  points,
  connections,
  editable,
  selectedPoint,
  onPointSelect,
  onPointMove,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <View style={[styles.overlay, { width: canvasWidth, height: canvasHeight }]} pointerEvents="box-none">
      {/* Canvas for skeleton */}
      <View style={styles.skeletonCanvas} pointerEvents="box-none">
        {/* Draw connections first (behind points) */}
        {connections.map((conn, index) => {
          const fromPoint = points[conn.from];
          const toPoint = points[conn.to];

          const x1 = fromPoint.x * canvasWidth;
          const y1 = fromPoint.y * canvasHeight;
          const x2 = toPoint.x * canvasWidth;
          const y2 = toPoint.y * canvasHeight;

          const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

          return (
            <View
              key={`conn-${index}`}
              style={[
                styles.connection,
                {
                  position: 'absolute',
                  left: x1,
                  top: y1,
                  width: length,
                  transformOrigin: 'left center',
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}

        {/* Draw points */}
        {points.map((point) => (
          <DraggablePoint
            key={point.id}
            point={point}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            editable={editable}
            isSelected={selectedPoint === point.id}
            onSelect={() => onPointSelect(point.id)}
            onMove={(dx, dy) => onPointMove(point.id, dx, dy)}
          />
        ))}
      </View>

      {/* Control buttons */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
          <Ionicons name="checkmark" size={28} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      {editable && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            {selectedPoint !== null
              ? `Drag to adjust ${points[selectedPoint]?.name.replace(/_/g, ' ')}`
              : 'Tap and drag any point to adjust the pose'}
          </Text>
        </View>
      )}
    </View>
  );
};

// Draggable Point Component
interface DraggablePointProps {
  point: PosePoint;
  canvasWidth: number;
  canvasHeight: number;
  editable: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (dx: number, dy: number) => void;
}

const DraggablePoint: React.FC<DraggablePointProps> = ({
  point,
  canvasWidth,
  canvasHeight,
  editable,
  isSelected,
  onSelect,
  onMove,
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const editableRef = useRef(editable);

  // Keep PanResponder in sync with latest editable flag
  useEffect(() => {
    editableRef.current = editable;
  }, [editable]);

  // Reset pan animation when point position changes from parent
  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [point.x, point.y, pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true, // Always capture touches
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Allow movement if in editable mode AND user has moved finger enough
        return editableRef.current && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2);
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderGrant: () => {
        onSelect();
        if (editableRef.current) {
          // In edit mode, scale up
          Animated.spring(scale, {
            toValue: 1.8,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        if (editableRef.current && (Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2)) {
          const dx = gesture.dx / canvasWidth;
          const dy = gesture.dy / canvasHeight;
          onMove(dx, dy);
          // Pan will be reset by useEffect when point prop updates
        } else {
          pan.setValue({ x: 0, y: 0 });
        }
        
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const x = point.x * canvasWidth;
  const y = point.y * canvasHeight;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      style={[
        styles.point,
        {
          position: 'absolute',
          left: x - 12,
          top: y - 12,
          backgroundColor: point.color,
          borderColor: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
          borderWidth: isSelected ? 3 : 2,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale },
          ],
        },
      ]}
    >
      {isSelected && editable && (
        <View style={styles.pointPulse} pointerEvents="none">
          <Ionicons name="move" size={12} color="#000000" />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  skeletonCanvas: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  connection: {
    height: 3,
    backgroundColor: '#00D9FF',
    opacity: 0.8,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  point: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointPulse: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
    gap: 12,
    zIndex: 200,
  },
  cancelButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D9534F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  confirmButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00D9FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
  instructionsContainer: {
    position: 'absolute',
    top: -56,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default PoseOverlay;
