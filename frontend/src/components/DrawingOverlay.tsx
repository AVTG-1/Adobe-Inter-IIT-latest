/**
 * Drawing Overlay Component - Professional Minimal Design
 * 
 * Clean drawing layer with minimal floating controls
 * Inspired by Photoshop and Canva drawing tools
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Text,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Path, Circle, Rect, Line, Polygon, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Drawing path interface
export interface DrawingPath {
  id: string;
  type: 'pen' | 'brush' | 'eraser' | 'shape';
  points: string;
  color: string;
  strokeWidth: number;
  opacity: number;
  shapeType?: 'rectangle' | 'circle' | 'line' | 'triangle' | 'arrow' | 'star';
  fill?: string;
}

// Tool types
export type DrawingToolType = 
  | 'pen' 
  | 'brush' 
  | 'highlighter'
  | 'eraser' 
  | 'rectangle' 
  | 'circle' 
  | 'line' 
  | 'triangle'
  | 'arrow'
  | 'star';

interface DrawingOverlayProps {
  visible: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onConfirm: (paths: DrawingPath[], imageDataUrl?: string) => void;
  onCancel: () => void;
  initialTool?: DrawingToolType;
  initialColor?: string;
  initialSize?: number;
}

// Color palette - minimal
const QUICK_COLORS = ['#FF0000', '#FFEB3B', '#4CAF50', '#2196F3', '#000000', '#FFFFFF'];

const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  visible,
  canvasWidth,
  canvasHeight,
  onConfirm,
  onCancel,
  initialTool = 'pen',
  initialColor = '#FF0000',
  initialSize = 5,
}) => {
  // Drawing state
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null);
  
  // Tool settings
  const [activeTool, setActiveTool] = useState<DrawingToolType>(initialTool);
  const [color, setColor] = useState(initialColor);
  const [strokeWidth, setStrokeWidth] = useState(initialSize);
  const [opacity, setOpacity] = useState(1);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);

  // Reset when visibility changes AND sync with initial props when opening
  useEffect(() => {
    if (!visible) {
      setPaths([]);
      setCurrentPath('');
      setStartPoint(null);
      setEndPoint(null);
    } else {
      // Sync with initial props when overlay opens
      setActiveTool(initialTool);
      setColor(initialColor);
      setStrokeWidth(initialSize);
      console.log('🎨 Drawing opened with:', { tool: initialTool, color: initialColor, size: initialSize });
    }
  }, [visible, initialTool, initialColor, initialSize]);

  // Get stroke width based on tool
  const getEffectiveStrokeWidth = useCallback(() => {
    switch (activeTool) {
      case 'highlighter':
        return strokeWidth * 3;
      case 'brush':
        return strokeWidth * 1.5;
      case 'eraser':
        return strokeWidth * 2;
      default:
        return strokeWidth;
    }
  }, [activeTool, strokeWidth]);

  // Get color based on tool
  const getEffectiveColor = useCallback(() => {
    if (activeTool === 'eraser') return 'white';
    return color;
  }, [activeTool, color]);

  // Get opacity based on tool
  const getEffectiveOpacity = useCallback(() => {
    if (activeTool === 'highlighter') return 0.4;
    return opacity;
  }, [activeTool, opacity]);

  // Check if shape tool
  const isShapeTool = useCallback(() => {
    return ['rectangle', 'circle', 'line', 'triangle', 'arrow', 'star'].includes(activeTool);
  }, [activeTool]);

  // Smoothing for brush strokes
  const pointsBuffer = useRef<{ x: number; y: number }[]>([]);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const smoothingFactor = 0.3;

  const smoothPoint = useCallback((point: { x: number; y: number }) => {
    if (!lastPoint.current) return point;
    return {
      x: lastPoint.current.x + (point.x - lastPoint.current.x) * (1 - smoothingFactor),
      y: lastPoint.current.y + (point.y - lastPoint.current.y) * (1 - smoothingFactor),
    };
  }, []);

  const buildSmoothPath = useCallback((points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    let path = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
    if (points.length === 2) {
      path += ` L${points[1].x.toFixed(2)},${points[1].y.toFixed(2)}`;
    } else {
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        path += ` Q${points[i].x.toFixed(2)},${points[i].y.toFixed(2)} ${midX.toFixed(2)},${midY.toFixed(2)}`;
      }
      const last = points[points.length - 1];
      path += ` L${last.x.toFixed(2)},${last.y.toFixed(2)}`;
    }
    return path;
  }, []);

  // Pan responder for drawing
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const point = { x: locationX, y: locationY };
        
        // Close any open pickers
        setShowColorPicker(false);
        setShowSizePicker(false);
        
        if (isShapeTool()) {
          setStartPoint(point);
          setEndPoint(point);
        } else {
          pointsBuffer.current = [point];
          lastPoint.current = point;
          setCurrentPath(`M${locationX.toFixed(2)},${locationY.toFixed(2)}`);
        }
      },

      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const rawPoint = { x: locationX, y: locationY };

        if (isShapeTool()) {
          setEndPoint(rawPoint);
        } else {
          const smoothed = smoothPoint(rawPoint);
          pointsBuffer.current.push(smoothed);
          lastPoint.current = smoothed;
          const smoothPath = buildSmoothPath(pointsBuffer.current);
          setCurrentPath(smoothPath);
        }
      },

      onPanResponderRelease: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;

        if (isShapeTool() && startPoint) {
          const newPath: DrawingPath = {
            id: `path-${Date.now()}`,
            type: 'shape',
            points: `${startPoint.x},${startPoint.y},${locationX},${locationY}`,
            color: getEffectiveColor(),
            strokeWidth: getEffectiveStrokeWidth(),
            opacity: getEffectiveOpacity(),
            shapeType: activeTool as any,
          };
          setPaths((prev) => [...prev, newPath]);
          setStartPoint(null);
          setEndPoint(null);
        } else if (pointsBuffer.current.length > 0) {
          const finalPath = buildSmoothPath(pointsBuffer.current);
          const newPath: DrawingPath = {
            id: `path-${Date.now()}`,
            type: activeTool === 'eraser' ? 'eraser' : activeTool === 'brush' ? 'brush' : 'pen',
            points: finalPath,
            color: getEffectiveColor(),
            strokeWidth: getEffectiveStrokeWidth(),
            opacity: getEffectiveOpacity(),
          };
          setPaths((prev) => [...prev, newPath]);
          setCurrentPath('');
          pointsBuffer.current = [];
          lastPoint.current = null;
        }
      },
    })
  ).current;

  const handleUndo = useCallback(() => {
    setPaths((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPaths([]);
    setCurrentPath('');
    setStartPoint(null);
    setEndPoint(null);
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(paths);
  }, [paths, onConfirm]);

  // Render shape preview
  const renderShapePreview = () => {
    if (!startPoint || !endPoint || !isShapeTool()) return null;

    const x1 = startPoint.x, y1 = startPoint.y;
    const x2 = endPoint.x, y2 = endPoint.y;
    const width = Math.abs(x2 - x1), height = Math.abs(y2 - y1);
    const minX = Math.min(x1, x2), minY = Math.min(y1, y2);

    const strokeProps = {
      stroke: getEffectiveColor(),
      strokeWidth: getEffectiveStrokeWidth(),
      fill: 'none',
      opacity: getEffectiveOpacity(),
      strokeDasharray: '5,5',
    };

    switch (activeTool) {
      case 'rectangle':
        return <Rect x={minX} y={minY} width={width} height={height} {...strokeProps} />;
      case 'circle':
        const radius = Math.sqrt(width ** 2 + height ** 2) / 2;
        return <Circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r={radius} {...strokeProps} />;
      case 'line':
        return <Line x1={x1} y1={y1} x2={x2} y2={y2} {...strokeProps} />;
      case 'triangle':
        return <Polygon points={`${(x1 + x2) / 2},${minY} ${minX},${minY + height} ${minX + width},${minY + height}`} {...strokeProps} />;
      case 'arrow':
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 15, headAngle = Math.PI / 6;
        return (
          <G>
            <Line x1={x1} y1={y1} x2={x2} y2={y2} {...strokeProps} />
            <Line x1={x2} y1={y2} x2={x2 - headLength * Math.cos(angle - headAngle)} y2={y2 - headLength * Math.sin(angle - headAngle)} {...strokeProps} />
            <Line x1={x2} y1={y2} x2={x2 - headLength * Math.cos(angle + headAngle)} y2={y2 - headLength * Math.sin(angle + headAngle)} {...strokeProps} />
          </G>
        );
      default:
        return null;
    }
  };

  // Render completed shape
  const renderShape = (path: DrawingPath) => {
    const [x1Str, y1Str, x2Str, y2Str] = path.points.split(',');
    const x1 = parseFloat(x1Str), y1 = parseFloat(y1Str);
    const x2 = parseFloat(x2Str), y2 = parseFloat(y2Str);
    const width = Math.abs(x2 - x1), height = Math.abs(y2 - y1);
    const minX = Math.min(x1, x2), minY = Math.min(y1, y2);

    const strokeProps = {
      stroke: path.color,
      strokeWidth: path.strokeWidth,
      fill: path.fill || 'none',
      opacity: path.opacity,
    };

    switch (path.shapeType) {
      case 'rectangle':
        return <Rect key={path.id} x={minX} y={minY} width={width} height={height} {...strokeProps} />;
      case 'circle':
        return <Circle key={path.id} cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r={Math.sqrt(width ** 2 + height ** 2) / 2} {...strokeProps} />;
      case 'line':
        return <Line key={path.id} x1={x1} y1={y1} x2={x2} y2={y2} {...strokeProps} />;
      case 'triangle':
        return <Polygon key={path.id} points={`${(x1 + x2) / 2},${minY} ${minX},${minY + height} ${minX + width},${minY + height}`} {...strokeProps} />;
      case 'arrow':
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 15, headAngle = Math.PI / 6;
        return (
          <G key={path.id}>
            <Line x1={x1} y1={y1} x2={x2} y2={y2} {...strokeProps} />
            <Line x1={x2} y1={y2} x2={x2 - headLength * Math.cos(angle - headAngle)} y2={y2 - headLength * Math.sin(angle - headAngle)} {...strokeProps} />
            <Line x1={x2} y1={y2} x2={x2 - headLength * Math.cos(angle + headAngle)} y2={y2 - headLength * Math.sin(angle + headAngle)} {...strokeProps} />
          </G>
        );
      case 'star':
        const starCx = (x1 + x2) / 2, starCy = (y1 + y2) / 2;
        const outerRadius = Math.min(width, height) / 2, innerRadius = outerRadius * 0.4;
        let starPoints = '';
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          starPoints += `${starCx + r * Math.cos(a)},${starCy + r * Math.sin(a)} `;
        }
        return <Polygon key={path.id} points={starPoints.trim()} {...strokeProps} />;
      default:
        return null;
    }
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, { width: canvasWidth, height: canvasHeight }]}>
      {/* Drawing Surface */}
      <View style={styles.drawingSurface} {...panResponder.panHandlers}>
        <Svg width={canvasWidth} height={canvasHeight} style={styles.svg}>
          {paths.map((path) => {
            if (path.type === 'shape') return renderShape(path);
            return (
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
            );
          })}
          {currentPath && (
            <Path
              d={currentPath}
              stroke={getEffectiveColor()}
              strokeWidth={getEffectiveStrokeWidth()}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={getEffectiveOpacity()}
            />
          )}
          {renderShapePreview()}
        </Svg>
      </View>

      {/* Minimal Floating Toolbar - Bottom Center */}
      <View style={styles.minimalToolbar}>
        {/* Color indicator & picker */}
        <TouchableOpacity 
          style={[styles.colorIndicator, { backgroundColor: color }]}
          onPress={() => setShowColorPicker(!showColorPicker)}
        />
        
        {/* Size indicator */}
        <TouchableOpacity 
          style={styles.sizeIndicator}
          onPress={() => setShowSizePicker(!showSizePicker)}
        >
          <View style={[styles.sizeDot, { width: Math.min(strokeWidth, 20), height: Math.min(strokeWidth, 20) }]} />
        </TouchableOpacity>

        <View style={styles.toolbarDivider} />

        {/* Undo */}
        <TouchableOpacity style={styles.toolbarBtn} onPress={handleUndo} disabled={paths.length === 0}>
          <Ionicons name="arrow-undo" size={20} color={paths.length > 0 ? '#FFF' : '#666'} />
        </TouchableOpacity>

        {/* Clear */}
        <TouchableOpacity style={styles.toolbarBtn} onPress={handleClear} disabled={paths.length === 0}>
          <Ionicons name="trash-outline" size={20} color={paths.length > 0 ? '#FFF' : '#666'} />
        </TouchableOpacity>

        <View style={styles.toolbarDivider} />

        {/* Cancel */}
        <TouchableOpacity style={styles.toolbarBtn} onPress={onCancel}>
          <Ionicons name="close" size={22} color="#FF6B6B" />
        </TouchableOpacity>

        {/* Confirm */}
        <TouchableOpacity style={[styles.toolbarBtn, styles.confirmBtn]} onPress={handleConfirm}>
          <Ionicons name="checkmark" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Color Picker Popup */}
      {showColorPicker && (
        <View style={styles.pickerPopup}>
          <Text style={styles.pickerTitle}>Color</Text>
          <View style={styles.colorGrid}>
            {QUICK_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorOption, { backgroundColor: c }, color === c && styles.selectedColor]}
                onPress={() => { setColor(c); setShowColorPicker(false); }}
              />
            ))}
          </View>
        </View>
      )}

      {/* Size Picker Popup */}
      {showSizePicker && (
        <View style={styles.pickerPopup}>
          <Text style={styles.pickerTitle}>Size</Text>
          <View style={styles.sizeGrid}>
            {[2, 5, 10, 15, 25, 40].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sizeOption, strokeWidth === s && styles.selectedSize]}
                onPress={() => { setStrokeWidth(s); setShowSizePicker(false); }}
              >
                <View style={[styles.sizePreview, { width: Math.min(s, 30), height: Math.min(s, 30) }]} />
                <Text style={styles.sizeLabel}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Stroke count */}
      {paths.length > 0 && (
        <View style={styles.strokeCount}>
          <Text style={styles.strokeCountText}>{paths.length}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 100,
  },
  drawingSurface: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  svg: {
    flex: 1,
  },
  minimalToolbar: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  colorIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  sizeIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeDot: {
    backgroundColor: '#FFF',
    borderRadius: 15,
  },
  toolbarDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#444',
    marginHorizontal: 4,
  },
  toolbarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtn: {
    backgroundColor: '#34C759',
  },
  pickerPopup: {
    position: 'absolute',
    bottom: 160,
    alignSelf: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.98)',
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
  },
  pickerTitle: {
    color: '#888',
    fontSize: 11,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#FFF',
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  selectedSize: {
    backgroundColor: '#555',
  },
  sizePreview: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 4,
  },
  sizeLabel: {
    color: '#AAA',
    fontSize: 10,
  },
  strokeCount: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  strokeCountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default DrawingOverlay;
