/**
 * Drawing Canvas - Simple Drawing Implementation
 *
 * Uses React Native's built-in components for drawing
 * Supports pen, brush, shapes, and text
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native';
import Svg, { Path, Circle, Rect, Line, Polygon } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../config/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface DrawingPath {
  id: string;
  type: 'pen' | 'shape';
  points: string;
  color: string;
  strokeWidth: number;
  opacity: number;
  shapeType?: 'rectangle' | 'circle' | 'line' | 'triangle';
}

interface DrawingCanvasProps {
  onPathsChange?: (paths: DrawingPath[]) => void;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  mode?: 'pen' | 'rectangle' | 'circle' | 'line' | 'triangle';
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  onPathsChange,
  color = COLORS.primary,
  strokeWidth = 3,
  opacity = 1,
  mode = 'pen',
}) => {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;

        if (mode === 'pen') {
          setCurrentPath(`M${locationX},${locationY}`);
        } else {
          setStartPoint({ x: locationX, y: locationY });
        }
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;

        if (mode === 'pen') {
          setCurrentPath((prev) => `${prev} L${locationX},${locationY}`);
        }
      },

      onPanResponderRelease: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;

        if (mode === 'pen' && currentPath) {
          const newPath: DrawingPath = {
            id: Date.now().toString(),
            type: 'pen',
            points: currentPath,
            color,
            strokeWidth,
            opacity,
          };

          const updated = [...paths, newPath];
          setPaths(updated);
          setCurrentPath('');
          onPathsChange?.(updated);
        } else if (startPoint) {
          // Create shape
          const newPath: DrawingPath = {
            id: Date.now().toString(),
            type: 'shape',
            points: `${startPoint.x},${startPoint.y},${locationX},${locationY}`,
            color,
            strokeWidth,
            opacity,
            shapeType: mode as any,
          };

          const updated = [...paths, newPath];
          setPaths(updated);
          setStartPoint(null);
          onPathsChange?.(updated);
        }
      },
    })
  ).current;

  const handleUndo = useCallback(() => {
    const updated = paths.slice(0, -1);
    setPaths(updated);
    onPathsChange?.(updated);
  }, [paths, onPathsChange]);

  const handleClear = useCallback(() => {
    setPaths([]);
    onPathsChange?.([]);
  }, [onPathsChange]);

  const renderShape = (path: DrawingPath) => {
    const [x1Str, y1Str, x2Str, y2Str] = path.points.split(',');
    const x1 = parseFloat(x1Str);
    const y1 = parseFloat(y1Str);
    const x2 = parseFloat(x2Str);
    const y2 = parseFloat(y2Str);

    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);

    switch (path.shapeType) {
      case 'rectangle':
        return (
          <Rect
            key={path.id}
            x={minX}
            y={minY}
            width={width}
            height={height}
            stroke={path.color}
            strokeWidth={path.strokeWidth}
            fill="none"
            opacity={path.opacity}
          />
        );

      case 'circle':
        const radius = Math.sqrt(width ** 2 + height ** 2) / 2;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        return (
          <Circle
            key={path.id}
            cx={cx}
            cy={cy}
            r={radius}
            stroke={path.color}
            strokeWidth={path.strokeWidth}
            fill="none"
            opacity={path.opacity}
          />
        );

      case 'line':
        return (
          <Line
            key={path.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={path.color}
            strokeWidth={path.strokeWidth}
            opacity={path.opacity}
          />
        );

      case 'triangle':
        const midX = (x1 + x2) / 2;
        return (
          <Polygon
            key={path.id}
            points={`${midX},${minY} ${x1},${y2} ${x2},${y2}`}
            stroke={path.color}
            strokeWidth={path.strokeWidth}
            fill="none"
            opacity={path.opacity}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Drawing Area */}
      <View style={styles.canvas} {...panResponder.panHandlers}>
        <Svg height="100%" width="100%">
          {/* Render saved paths */}
          {paths.map((path) =>
            path.type === 'pen' ? (
              <Path
                key={path.id}
                d={path.points}
                stroke={path.color}
                strokeWidth={path.strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={path.opacity}
              />
            ) : (
              renderShape(path)
            )
          )}

          {/* Render current path being drawn */}
          {currentPath && (
            <Path
              d={currentPath}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={opacity}
            />
          )}
        </Svg>
      </View>

      {/* Drawing Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={handleUndo} disabled={paths.length === 0}>
          <Ionicons
            name="arrow-undo"
            size={24}
            color={paths.length === 0 ? COLORS.textTertiary : COLORS.textPrimary}
          />
          <Text style={styles.buttonText}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleClear} disabled={paths.length === 0}>
          <Ionicons
            name="trash-outline"
            size={24}
            color={paths.length === 0 ? COLORS.textTertiary : COLORS.error}
          />
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>

        <View style={styles.info}>
          <Text style={styles.infoText}>{paths.length} strokes</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  canvas: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  controls: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  button: {
    alignItems: 'center',
    padding: SPACING.sm,
  },
  buttonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default DrawingCanvas;
