/**
 * Transform Controls Component
 * Photoshop-like bounding box with rotation handles
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  Dimensions,
} from 'react-native';
import Svg, { Rect, Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../../config/theme';
import { Transform, BoundingBox, Point } from './CanvasEditor';

interface TransformControlsProps {
  boundingBox: BoundingBox | null;
  onTransformStart: (point: Point, handle: string) => void;
  onTransformUpdate: (point: Point, shiftKey: boolean) => void;
  onTransformEnd: () => void;
  onDoubleClick?: () => void;
  showRotation?: boolean;
  showScale?: boolean;
  enabled?: boolean;
}

const HANDLE_SIZE = 10;
const ROTATION_HANDLE_DISTANCE = 30;

const TransformControls: React.FC<TransformControlsProps> = ({
  boundingBox,
  onTransformStart,
  onTransformUpdate,
  onTransformEnd,
  onDoubleClick,
  showRotation = true,
  showScale = true,
  enabled = true,
}) => {
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [shiftPressed, setShiftPressed] = useState(false);
  const lastTapRef = useRef<number>(0);

  if (!boundingBox || !enabled) return null;

  const { x, y, width, height, rotation } = boundingBox;

  // Calculate corner positions
  const corners = {
    nw: { x: x, y: y },
    ne: { x: x + width, y: y },
    sw: { x: x, y: y + height },
    se: { x: x + width, y: y + height },
  };

  // Calculate edge midpoints
  const edges = {
    n: { x: x + width / 2, y: y },
    s: { x: x + width / 2, y: y + height },
    e: { x: x + width, y: y + height / 2 },
    w: { x: x, y: y + height / 2 },
  };

  // Center point
  const center = {
    x: x + width / 2,
    y: y + height / 2,
  };

  // Rotation handle position (above center)
  const rotationHandle = {
    x: center.x,
    y: y - ROTATION_HANDLE_DISTANCE,
  };

  const createPanResponder = (handle: string) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      
      // Double-click detection
      const now = Date.now();
      if (now - lastTapRef.current < 300 && onDoubleClick) {
        onDoubleClick();
        return;
      }
      lastTapRef.current = now;

      setActiveHandle(handle);
      onTransformStart({ x: locationX, y: locationY }, handle);
    },
    onPanResponderMove: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      onTransformUpdate({ x: pageX, y: pageY }, shiftPressed);
    },
    onPanResponderRelease: () => {
      setActiveHandle(null);
      onTransformEnd();
    },
    onPanResponderTerminate: () => {
      setActiveHandle(null);
      onTransformEnd();
    },
  });

  // Pre-create pan responders for each handle
  const handleResponders = {
    move: createPanResponder('move'),
    rotate: createPanResponder('rotate'),
    'scale-nw': createPanResponder('scale-nw'),
    'scale-ne': createPanResponder('scale-ne'),
    'scale-sw': createPanResponder('scale-sw'),
    'scale-se': createPanResponder('scale-se'),
    'scale-n': createPanResponder('scale-n'),
    'scale-s': createPanResponder('scale-s'),
    'scale-e': createPanResponder('scale-e'),
    'scale-w': createPanResponder('scale-w'),
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Svg style={StyleSheet.absoluteFill}>
        <G
          transform={`rotate(${rotation}, ${center.x}, ${center.y})`}
        >
          {/* Main bounding box */}
          <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="none"
            stroke={COLORS.primary}
            strokeWidth={2}
            strokeDasharray="5,5"
          />

          {/* Selection highlight */}
          <Rect
            x={x - 1}
            y={y - 1}
            width={width + 2}
            height={height + 2}
            fill="none"
            stroke={COLORS.primary + '40'}
            strokeWidth={4}
          />

          {/* Corner handles (for scaling) */}
          {showScale && (
            <>
              {Object.entries(corners).map(([key, pos]) => (
                <Rect
                  key={key}
                  x={pos.x - HANDLE_SIZE / 2}
                  y={pos.y - HANDLE_SIZE / 2}
                  width={HANDLE_SIZE}
                  height={HANDLE_SIZE}
                  fill="#FFFFFF"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                />
              ))}
            </>
          )}

          {/* Edge handles (for non-proportional scaling) */}
          {showScale && (
            <>
              {Object.entries(edges).map(([key, pos]) => (
                <Rect
                  key={key}
                  x={pos.x - HANDLE_SIZE / 2}
                  y={pos.y - HANDLE_SIZE / 2}
                  width={HANDLE_SIZE}
                  height={HANDLE_SIZE}
                  fill="#FFFFFF"
                  stroke={COLORS.primary}
                  strokeWidth={1}
                />
              ))}
            </>
          )}

          {/* Rotation handle */}
          {showRotation && (
            <>
              {/* Line connecting to rotation handle */}
              <Line
                x1={center.x}
                y1={y}
                x2={rotationHandle.x}
                y2={rotationHandle.y}
                stroke={COLORS.primary}
                strokeWidth={1}
              />
              
              {/* Rotation handle circle */}
              <Circle
                cx={rotationHandle.x}
                cy={rotationHandle.y}
                r={HANDLE_SIZE}
                fill="#FFFFFF"
                stroke={COLORS.primary}
                strokeWidth={2}
              />

              {/* Rotation icon hint */}
              <SvgText
                x={rotationHandle.x}
                y={rotationHandle.y + 4}
                textAnchor="middle"
                fontSize={10}
                fill={COLORS.primary}
              >
                ↻
              </SvgText>
            </>
          )}

          {/* Center point */}
          <Circle
            cx={center.x}
            cy={center.y}
            r={4}
            fill={COLORS.primary}
          />

          {/* Rotation angle indicator */}
          {rotation !== 0 && (
            <SvgText
              x={center.x}
              y={y - ROTATION_HANDLE_DISTANCE - 20}
              textAnchor="middle"
              fontSize={12}
              fill={COLORS.primary}
              fontWeight="bold"
            >
              {Math.round(rotation)}°
            </SvgText>
          )}
        </G>
      </Svg>

      {/* Interactive overlay for move (entire box) */}
      <View
        style={[
          styles.moveArea,
          {
            left: x,
            top: y,
            width,
            height,
            transform: [{ rotate: `${rotation}deg` }],
          },
        ]}
        {...handleResponders.move.panHandlers}
      />

      {/* Interactive corners for scaling */}
      {showScale && Object.entries(corners).map(([key, pos]) => (
        <View
          key={key}
          style={[
            styles.handle,
            styles[`cursor-${key}` as keyof typeof styles] || {},
            {
              left: pos.x - HANDLE_SIZE,
              top: pos.y - HANDLE_SIZE,
              width: HANDLE_SIZE * 2,
              height: HANDLE_SIZE * 2,
            },
          ]}
          {...handleResponders[`scale-${key}` as keyof typeof handleResponders].panHandlers}
        />
      ))}

      {/* Interactive rotation handle */}
      {showRotation && (
        <View
          style={[
            styles.handle,
            styles.rotateHandle,
            {
              left: rotationHandle.x - HANDLE_SIZE * 1.5,
              top: rotationHandle.y - HANDLE_SIZE * 1.5,
              width: HANDLE_SIZE * 3,
              height: HANDLE_SIZE * 3,
            },
          ]}
          {...handleResponders.rotate.panHandlers}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  moveArea: {
    position: 'absolute',
    cursor: 'move',
  },
  handle: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  rotateHandle: {
    cursor: 'grab',
  },
  'cursor-nw': {
    cursor: 'nw-resize',
  },
  'cursor-ne': {
    cursor: 'ne-resize',
  },
  'cursor-sw': {
    cursor: 'sw-resize',
  },
  'cursor-se': {
    cursor: 'se-resize',
  },
});

export default TransformControls;

