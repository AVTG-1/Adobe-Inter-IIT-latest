/**
 * Shape Tool - Professional Shape Creation
 * 
 * Add shape layers with various shapes and styling
 * Similar to Canva/Photoshop shape tool
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Rect, Circle, Line, Polygon, G, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Shape types
export type ShapeType = 
  | 'rectangle' 
  | 'circle' 
  | 'triangle' 
  | 'line' 
  | 'arrow' 
  | 'star'
  | 'pentagon'
  | 'hexagon'
  | 'heart';

// Shape options with icons (using valid Ionicons names)
const SHAPE_OPTIONS: { id: ShapeType; icon: string; name: string }[] = [
  { id: 'rectangle', icon: 'square-outline', name: 'Rectangle' },
  { id: 'circle', icon: 'ellipse-outline', name: 'Circle' },
  { id: 'triangle', icon: 'triangle-outline', name: 'Triangle' },
  { id: 'line', icon: 'remove-outline', name: 'Line' },
  { id: 'arrow', icon: 'arrow-forward-outline', name: 'Arrow' },
  { id: 'star', icon: 'star-outline', name: 'Star' },
  { id: 'pentagon', icon: 'shapes-outline', name: 'Pentagon' },
  { id: 'hexagon', icon: 'grid-outline', name: 'Hexagon' },
  { id: 'heart', icon: 'heart-outline', name: 'Heart' },
];

// Color options
const SHAPE_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF',
  '#5856D6', '#AF52DE', '#FF2D55', '#000000', '#FFFFFF',
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

interface ShapeToolProps {
  visible: boolean;
  onConfirm: (config: ShapeConfig) => void;
  onCancel: () => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

const ShapeTool: React.FC<ShapeToolProps> = ({
  visible,
  onConfirm,
  onCancel,
  canvasWidth = SCREEN_WIDTH,
  canvasHeight = SCREEN_HEIGHT * 0.5,
}) => {
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle');
  const [strokeColor, setStrokeColor] = useState('#FF3B30');
  const [fillColor, setFillColor] = useState<string | null>(null);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Pan responder for drawing shapes
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setStartPoint({ x: locationX, y: locationY });
        setEndPoint({ x: locationX, y: locationY });
        setIsDrawing(true);
      },

      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setEndPoint({ x: locationX, y: locationY });
      },

      onPanResponderRelease: () => {
        setIsDrawing(false);
      },
    })
  ).current;

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

      case 'pentagon':
        let pentPoints = '';
        for (let i = 0; i < 5; i++) {
          const r = Math.min(width, height) / 2;
          const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          pentPoints += `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)} `;
        }
        return <Polygon points={pentPoints.trim()} {...strokeProps} />;

      case 'hexagon':
        let hexPoints = '';
        for (let i = 0; i < 6; i++) {
          const r = Math.min(width, height) / 2;
          const a = (i * Math.PI) / 3;
          hexPoints += `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)} `;
        }
        return <Polygon points={hexPoints.trim()} {...strokeProps} />;

      case 'heart':
        const heartSize = Math.min(width, height) / 2;
        return (
          <Path
            d={`M ${cx} ${cy + heartSize * 0.3}
                C ${cx} ${cy - heartSize * 0.3} ${cx - heartSize} ${cy - heartSize * 0.3} ${cx - heartSize} ${cy}
                C ${cx - heartSize} ${cy + heartSize * 0.5} ${cx} ${cy + heartSize} ${cx} ${cy + heartSize}
                C ${cx} ${cy + heartSize} ${cx + heartSize} ${cy + heartSize * 0.5} ${cx + heartSize} ${cy}
                C ${cx + heartSize} ${cy - heartSize * 0.3} ${cx} ${cy - heartSize * 0.3} ${cx} ${cy + heartSize * 0.3}`}
            {...strokeProps}
          />
        );

      default:
        return null;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color="#FF6B6B" />
            <Text style={styles.headerBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Draw Shape</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn} disabled={!startPoint}>
            <Ionicons name="checkmark" size={24} color={startPoint ? "#34C759" : "#666"} />
            <Text style={[styles.headerBtnText, { color: startPoint ? "#34C759" : "#666" }]}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Canvas Area */}
        <View 
          style={[styles.canvasArea, { width: canvasWidth, height: canvasHeight }]}
          {...panResponder.panHandlers}
        >
          <Svg width={canvasWidth} height={canvasHeight}>
            {renderShapePreview()}
          </Svg>

          {!startPoint && (
            <View style={styles.canvasHint}>
              <Ionicons name="finger-print" size={40} color="#444" />
              <Text style={styles.canvasHintText}>Drag to draw {selectedShape}</Text>
            </View>
          )}
        </View>

        {/* Shape Selection */}
        <View style={styles.shapeSection}>
          <Text style={styles.sectionLabel}>Shape</Text>
          <View style={styles.shapeGrid}>
            {SHAPE_OPTIONS.map((shape) => (
              <TouchableOpacity
                key={shape.id}
                style={[
                  styles.shapeOption,
                  selectedShape === shape.id && styles.shapeOptionSelected,
                ]}
                onPress={() => {
                  setSelectedShape(shape.id);
                  handleReset();
                }}
              >
                <Ionicons 
                  name={shape.icon as any} 
                  size={22} 
                  color={selectedShape === shape.id ? '#FFF' : '#888'} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Colors */}
        <View style={styles.colorSection}>
          <View style={styles.colorRow}>
            <Text style={styles.sectionLabel}>Stroke</Text>
            <View style={styles.colors}>
              {SHAPE_COLORS.map((c) => (
                <TouchableOpacity
                  key={`stroke-${c}`}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    strokeColor === c && styles.colorSelected,
                  ]}
                  onPress={() => setStrokeColor(c)}
                />
              ))}
            </View>
          </View>

          <View style={styles.colorRow}>
            <View style={styles.fillLabelRow}>
              <Text style={styles.sectionLabel}>Fill</Text>
              <TouchableOpacity onPress={() => setFillColor(null)}>
                <Text style={styles.clearFill}>{fillColor ? 'Clear' : 'None'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.colors}>
              {SHAPE_COLORS.map((c) => (
                <TouchableOpacity
                  key={`fill-${c}`}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    fillColor === c && styles.colorSelected,
                  ]}
                  onPress={() => setFillColor(c)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Stroke Width */}
        <View style={styles.strokeSection}>
          <View style={styles.strokeHeader}>
            <Text style={styles.sectionLabel}>Stroke Width</Text>
            <Text style={styles.strokeValue}>{strokeWidth}px</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={20}
            value={strokeWidth}
            onValueChange={(val) => setStrokeWidth(Math.round(val))}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#333"
            thumbTintColor="#007AFF"
          />
        </View>

        {/* Reset Button */}
        {startPoint && (
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Ionicons name="refresh" size={18} color="#FFF" />
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerBtnText: {
    color: '#FFF',
    fontSize: 14,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  canvasArea: {
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasHint: {
    position: 'absolute',
    alignItems: 'center',
    gap: 8,
  },
  canvasHintText: {
    color: '#444',
    fontSize: 14,
  },
  shapeSection: {
    padding: 16,
    backgroundColor: '#1C1C1E',
  },
  sectionLabel: {
    color: '#888',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  shapeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shapeOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shapeOptionSelected: {
    backgroundColor: '#007AFF',
  },
  colorSection: {
    padding: 16,
    backgroundColor: '#1C1C1E',
    gap: 16,
  },
  colorRow: {
    gap: 8,
  },
  fillLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearFill: {
    color: '#007AFF',
    fontSize: 12,
  },
  colors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#FFF',
  },
  strokeSection: {
    padding: 16,
    backgroundColor: '#1C1C1E',
  },
  strokeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strokeValue: {
    color: '#FFF',
    fontSize: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: '#333',
    borderRadius: 10,
  },
  resetBtnText: {
    color: '#FFF',
    fontSize: 14,
  },
});

export default ShapeTool;

