/**
 * Shape Overlay Component - Compact Professional Design
 * 
 * Minimal floating toolbar for shapes - similar to DrawingOverlay
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Animated,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Rect, Circle, Line, Polygon, G, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Shape types
export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow' | 'star';

// Quick colors
const QUICK_COLORS = ['#FF3B30', '#FFCC00', '#34C759', '#007AFF', '#000000', '#FFFFFF'];

// Shape options
const SHAPES: { id: ShapeType; icon: string }[] = [
  { id: 'rectangle', icon: 'square-outline' },
  { id: 'circle', icon: 'ellipse-outline' },
  { id: 'triangle', icon: 'triangle-outline' },
  { id: 'line', icon: 'remove-outline' },
  { id: 'arrow', icon: 'arrow-forward-outline' },
  { id: 'star', icon: 'star-outline' },
];

export interface ShapeConfig {
  shapeType: ShapeType;
  strokeColor: string;
  fillColor: string | null;
  strokeWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface ShapeOverlayProps {
  visible: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onConfirm: (config: ShapeConfig) => void;
  onCancel: () => void;
}

const ShapeOverlay: React.FC<ShapeOverlayProps> = ({
  visible,
  canvasWidth,
  canvasHeight,
  onConfirm,
  onCancel,
}) => {
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle');
  const [strokeColor, setStrokeColor] = useState('#FF3B30');
  const [fillColor, setFillColor] = useState<string | null>(null);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pan responder for drawing shapes
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setStartPoint({ x: locationX, y: locationY });
        setEndPoint({ x: locationX, y: locationY });
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setEndPoint({ x: locationX, y: locationY });
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setStartPoint(null);
      setEndPoint(null);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleConfirm = () => {
    if (!startPoint || !endPoint) {
      onCancel();
      return;
    }
    onConfirm({
      shapeType: selectedShape,
      strokeColor,
      fillColor,
      strokeWidth,
      startX: startPoint.x,
      startY: startPoint.y,
      endX: endPoint.x,
      endY: endPoint.y,
    });
  };

  const handleReset = () => {
    setStartPoint(null);
    setEndPoint(null);
  };

  // Render shape preview
  const renderShapePreview = () => {
    if (!startPoint || !endPoint) return null;

    const x1 = startPoint.x, y1 = startPoint.y;
    const x2 = endPoint.x, y2 = endPoint.y;
    const width = Math.abs(x2 - x1), height = Math.abs(y2 - y1);
    const minX = Math.min(x1, x2), minY = Math.min(y1, y2);
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;

    const strokeProps = {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      fill: fillColor || 'none',
    };

    switch (selectedShape) {
      case 'rectangle':
        return <Rect x={minX} y={minY} width={width} height={height} {...strokeProps} />;
      
      case 'circle':
        const radius = Math.sqrt(width ** 2 + height ** 2) / 2;
        return <Circle cx={cx} cy={cy} r={radius} {...strokeProps} />;
      
      case 'triangle':
        return (
          <Polygon
            points={`${cx},${minY} ${minX},${minY + height} ${minX + width},${minY + height}`}
            {...strokeProps}
          />
        );
      
      case 'line':
        return <Line x1={x1} y1={y1} x2={x2} y2={y2} {...strokeProps} />;
      
      case 'arrow':
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 20, headAngle = Math.PI / 6;
        return (
          <G>
            <Line x1={x1} y1={y1} x2={x2} y2={y2} {...strokeProps} />
            <Line 
              x1={x2} y1={y2} 
              x2={x2 - headLength * Math.cos(angle - headAngle)} 
              y2={y2 - headLength * Math.sin(angle - headAngle)} 
              {...strokeProps} 
            />
            <Line 
              x1={x2} y1={y2} 
              x2={x2 - headLength * Math.cos(angle + headAngle)} 
              y2={y2 - headLength * Math.sin(angle + headAngle)} 
              {...strokeProps} 
            />
          </G>
        );
      
      case 'star':
        const outerRadius = Math.min(width, height) / 2;
        const innerRadius = outerRadius * 0.4;
        let starPoints = '';
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          starPoints += `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)} `;
        }
        return <Polygon points={starPoints.trim()} {...strokeProps} />;

      default:
        return null;
    }
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Canvas area for drawing shapes */}
      <View 
        style={[styles.canvasArea, { width: canvasWidth, height: canvasHeight }]}
        {...panResponder.panHandlers}
      >
        <Svg width={canvasWidth} height={canvasHeight}>
          {renderShapePreview()}
        </Svg>

        {!startPoint && (
          <View style={styles.hint}>
            <Ionicons name="finger-print" size={32} color="#555" />
            <Text style={styles.hintText}>Drag to draw {selectedShape}</Text>
          </View>
        )}
      </View>

      {/* Floating toolbar at bottom */}
      <View style={styles.toolbar}>
        {/* Main row */}
        <View style={styles.mainRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={onCancel}>
            <Ionicons name="close" size={22} color="#FF6B6B" />
          </TouchableOpacity>

          {/* Shape selector */}
          <TouchableOpacity 
            style={[styles.toolBtn, showShapePicker && styles.toolBtnActive]}
            onPress={() => {
              setShowShapePicker(!showShapePicker);
              setShowColorPicker(false);
            }}
          >
            <Ionicons 
              name={SHAPES.find(s => s.id === selectedShape)?.icon as any} 
              size={18} 
              color="#FFF" 
            />
          </TouchableOpacity>

          {/* Stroke color */}
          <TouchableOpacity 
            style={[styles.colorBtn, { backgroundColor: strokeColor }]}
            onPress={() => {
              setShowColorPicker(!showColorPicker);
              setShowShapePicker(false);
            }}
          />

          {/* Fill toggle */}
          <TouchableOpacity 
            style={[styles.toolBtn, fillColor && styles.toolBtnActive]}
            onPress={() => setFillColor(fillColor ? null : strokeColor)}
          >
            <Text style={styles.fillText}>{fillColor ? 'Fill' : 'No Fill'}</Text>
          </TouchableOpacity>

          {/* Stroke width */}
          <View style={styles.strokeGroup}>
            <TouchableOpacity onPress={() => setStrokeWidth(Math.max(1, strokeWidth - 1))}>
              <Ionicons name="remove" size={16} color="#888" />
            </TouchableOpacity>
            <Text style={styles.strokeText}>{strokeWidth}</Text>
            <TouchableOpacity onPress={() => setStrokeWidth(Math.min(20, strokeWidth + 1))}>
              <Ionicons name="add" size={16} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Reset */}
          {startPoint && (
            <TouchableOpacity style={styles.toolBtn} onPress={handleReset}>
              <Ionicons name="refresh" size={18} color="#FFF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.actionBtn, !startPoint && styles.actionBtnDisabled]} 
            onPress={handleConfirm}
            disabled={!startPoint}
          >
            <Ionicons name="checkmark" size={22} color={startPoint ? "#34C759" : "#666"} />
          </TouchableOpacity>
        </View>

        {/* Shape picker row */}
        {showShapePicker && (
          <View style={styles.pickerRow}>
            {SHAPES.map((shape) => (
              <TouchableOpacity
                key={shape.id}
                style={[
                  styles.shapeOption,
                  selectedShape === shape.id && styles.shapeOptionSelected,
                ]}
                onPress={() => {
                  setSelectedShape(shape.id);
                  setShowShapePicker(false);
                  handleReset();
                }}
              >
                <Ionicons 
                  name={shape.icon as any} 
                  size={20} 
                  color={selectedShape === shape.id ? '#FFF' : '#888'} 
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Color picker row */}
        {showColorPicker && (
          <View style={styles.pickerRow}>
            {QUICK_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorOption,
                  { backgroundColor: c },
                  strokeColor === c && styles.colorOptionSelected,
                ]}
                onPress={() => {
                  setStrokeColor(c);
                  if (fillColor) setFillColor(c);
                  setShowColorPicker(false);
                }}
              />
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  canvasArea: {
    backgroundColor: 'transparent',
  },
  hint: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  hintText: {
    color: '#555',
    fontSize: 14,
  },
  toolbar: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderRadius: 16,
    padding: 12,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  toolBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolBtnActive: {
    backgroundColor: '#007AFF',
  },
  colorBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  fillText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  strokeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 36,
    gap: 8,
  },
  strokeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  shapeOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shapeOptionSelected: {
    backgroundColor: '#007AFF',
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#FFF',
  },
});

export default ShapeOverlay;

