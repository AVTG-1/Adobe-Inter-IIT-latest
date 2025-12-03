/**
 * Curve Tool Component - Compact Photoshop-like Tone Curve
 * 
 * Compact floating panel for preset-based curve adjustments
 * Clean UI with instant preview
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import Svg, { Path, Line, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Curve point interface
export interface CurvePoint {
  x: number;  // 0-255 input
  y: number;  // 0-255 output
}

// Channel type
export type CurveChannel = 'rgb' | 'red' | 'green' | 'blue';

// Curve configuration
export interface CurveConfig {
  rgb: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

// Default linear curve (no adjustment)
const DEFAULT_POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 255, y: 255 },
];

// Preset curves with icons
const CURVE_PRESETS: { name: string; icon: string; points: CurvePoint[] }[] = [
  { name: 'Linear', icon: 'remove-outline', points: [{ x: 0, y: 0 }, { x: 255, y: 255 }] },
  { name: 'Contrast', icon: 'contrast-outline', points: [{ x: 0, y: 0 }, { x: 64, y: 48 }, { x: 192, y: 208 }, { x: 255, y: 255 }] },
  { name: 'Bright', icon: 'sunny-outline', points: [{ x: 0, y: 0 }, { x: 128, y: 180 }, { x: 255, y: 255 }] },
  { name: 'Dark', icon: 'moon-outline', points: [{ x: 0, y: 0 }, { x: 128, y: 80 }, { x: 255, y: 255 }] },
  { name: 'S-Curve', icon: 'analytics-outline', points: [{ x: 0, y: 0 }, { x: 64, y: 40 }, { x: 192, y: 215 }, { x: 255, y: 255 }] },
  { name: 'Fade', icon: 'water-outline', points: [{ x: 0, y: 30 }, { x: 255, y: 230 }] },
];

// Channel colors
const CHANNEL_COLORS: Record<CurveChannel, string> = {
  rgb: '#FFFFFF',
  red: '#FF6B6B',
  green: '#51CF66',
  blue: '#339AF0',
};

interface CurveToolProps {
  visible: boolean;
  onClose: () => void;
  onApply: (curves: CurveConfig) => void;
  onPreview?: (curves: CurveConfig) => void;
  selectedLayerName?: string;
}

const CurveTool: React.FC<CurveToolProps> = ({
  visible,
  onClose,
  onApply,
  onPreview,
  selectedLayerName,
}) => {
  const [activeChannel, setActiveChannel] = useState<CurveChannel>('rgb');
  const [curves, setCurves] = useState<CurveConfig>({
    rgb: [...DEFAULT_POINTS],
    red: [...DEFAULT_POINTS],
    green: [...DEFAULT_POINTS],
    blue: [...DEFAULT_POINTS],
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('Linear');
  
  // Canvas size - compact
  const CANVAS_SIZE = 120;
  
  // Get current channel points
  const currentPoints = curves[activeChannel];
  
  // Convert curve point to canvas coordinates
  const toCanvasCoords = useCallback((point: CurvePoint) => ({
    x: (point.x / 255) * CANVAS_SIZE,
    y: CANVAS_SIZE - (point.y / 255) * CANVAS_SIZE,
  }), [CANVAS_SIZE]);
  
  // Generate smooth curve path
  const generateCurvePath = useCallback((points: CurvePoint[]): string => {
    if (points.length < 2) return '';
    
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);
    const canvasPoints = sortedPoints.map(toCanvasCoords);
    
    let path = `M ${canvasPoints[0].x} ${canvasPoints[0].y}`;
    
    for (let i = 0; i < canvasPoints.length - 1; i++) {
      const p0 = canvasPoints[Math.max(0, i - 1)];
      const p1 = canvasPoints[i];
      const p2 = canvasPoints[i + 1];
      const p3 = canvasPoints[Math.min(canvasPoints.length - 1, i + 2)];
      
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    
    return path;
  }, [toCanvasCoords]);
  
  // Apply preset
  const handlePresetSelect = useCallback((preset: typeof CURVE_PRESETS[0]) => {
    setSelectedPreset(preset.name);
    setCurves(prev => {
      const newCurves = { ...prev, [activeChannel]: [...preset.points] };
      onPreview?.(newCurves);
      return newCurves;
    });
  }, [activeChannel, onPreview]);
  
  // Reset all
  const handleReset = useCallback(() => {
    const newCurves: CurveConfig = {
      rgb: [...DEFAULT_POINTS],
      red: [...DEFAULT_POINTS],
      green: [...DEFAULT_POINTS],
      blue: [...DEFAULT_POINTS],
    };
    setCurves(newCurves);
    setSelectedPreset('Linear');
    onPreview?.(newCurves);
  }, [onPreview]);
  
  // Done
  const handleDone = useCallback(() => {
    onApply(curves);
    onClose();
  }, [curves, onApply, onClose]);
  
  // Cancel
  const handleCancel = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);
  
  // Grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    const step = CANVAS_SIZE / 4;
    
    for (let i = 0; i <= 4; i++) {
      const pos = i * step;
      lines.push(
        <Line key={`h-${i}`} x1={0} y1={pos} x2={CANVAS_SIZE} y2={pos} stroke="#333" strokeWidth={0.5} />,
        <Line key={`v-${i}`} x1={pos} y1={0} x2={pos} y2={CANVAS_SIZE} stroke="#333" strokeWidth={0.5} />
      );
    }
    lines.push(
      <Line key="diag" x1={0} y1={CANVAS_SIZE} x2={CANVAS_SIZE} y2={0} stroke="#444" strokeWidth={0.5} strokeDasharray="2,2" />
    );
    
    return lines;
  }, [CANVAS_SIZE]);
  
  const hasChanges = selectedPreset !== 'Linear';
  
  if (!visible) return null;
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
          <Ionicons name="close" size={20} color="#FF3B30" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Curves</Text>
        
        <TouchableOpacity onPress={handleDone} style={styles.headerBtn}>
          <Ionicons name="checkmark" size={20} color="#34C759" />
        </TouchableOpacity>
      </View>
      
      {/* Main content */}
      <View style={styles.content}>
        {/* Mini curve preview */}
        <View style={styles.curvePreview}>
          <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}>
            <Rect x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE} fill="#1C1C1E" />
            {gridLines}
            <Path
              d={generateCurvePath(currentPoints)}
              stroke={CHANNEL_COLORS[activeChannel]}
              strokeWidth={2}
              fill="none"
            />
          </Svg>
        </View>
        
        {/* Channel + Presets */}
        <View style={styles.controls}>
          {/* Channel selector */}
          <View style={styles.channelRow}>
            {(['rgb', 'red', 'green', 'blue'] as CurveChannel[]).map(ch => (
              <TouchableOpacity
                key={ch}
                style={[styles.channelBtn, activeChannel === ch && styles.channelBtnActive]}
                onPress={() => setActiveChannel(ch)}
              >
                <View style={[styles.channelDot, { backgroundColor: CHANNEL_COLORS[ch] }]} />
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Presets */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
            {CURVE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.name}
                style={[styles.presetBtn, selectedPreset === preset.name && styles.presetBtnActive]}
                onPress={() => handlePresetSelect(preset)}
              >
                <Ionicons 
                  name={preset.icon as any} 
                  size={16} 
                  color={selectedPreset === preset.name ? '#007AFF' : '#888'} 
                />
                <Text style={[styles.presetText, selectedPreset === preset.name && styles.presetTextActive]}>
                  {preset.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Reset */}
          {hasChanges && (
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Ionicons name="refresh" size={14} color="#FF9500" />
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerBtn: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flexDirection: 'row',
    gap: 12,
  },
  curvePreview: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  controls: {
    flex: 1,
    justifyContent: 'space-between',
  },
  channelRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  channelBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelBtnActive: {
    backgroundColor: '#3C3C3E',
    borderWidth: 1,
    borderColor: '#555',
  },
  channelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  presetScroll: {
    maxHeight: 60,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    marginRight: 6,
  },
  presetBtnActive: {
    backgroundColor: '#007AFF20',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  presetText: {
    fontSize: 11,
    color: '#888',
  },
  presetTextActive: {
    color: '#007AFF',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  resetText: {
    fontSize: 12,
    color: '#FF9500',
  },
});

export default CurveTool;
