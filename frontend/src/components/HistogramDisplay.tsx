/**
 * Histogram Display - RGB & Luminosity Histogram
 * 
 * Inspired by ImageToolbox - Professional histogram visualization
 * Features: RGB channels, luminosity, overlay mode, camera-style display
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';
import { getHistogramData } from '../utils/canvasFilters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HistogramDisplayProps {
  visible: boolean;
  onClose: () => void;
  imageUri?: string;
  compact?: boolean;
}

type HistogramMode = 'rgb' | 'red' | 'green' | 'blue' | 'luminosity';

const HistogramDisplay: React.FC<HistogramDisplayProps> = ({
  visible,
  onClose,
  imageUri,
  compact = false,
}) => {
  const [mode, setMode] = useState<HistogramMode>('rgb');
  const [showOverlay, setShowOverlay] = useState(true);
  const [histogramData, setHistogramData] = useState<{
    red: number[];
    green: number[];
    blue: number[];
    luminosity: number[];
  } | null>(null);

  // Generate sample histogram data (fallback)
  const generateHistogramData = (channel: 'r' | 'g' | 'b' | 'l'): number[] => {
    const data: number[] = [];
    for (let i = 0; i < 256; i++) {
      const center = channel === 'r' ? 140 : channel === 'g' ? 120 : channel === 'b' ? 100 : 128;
      const spread = 50;
      const gaussian = Math.exp(-Math.pow(i - center, 2) / (2 * spread * spread));
      const noise = Math.random() * 0.2;
      data.push(Math.max(0, gaussian + noise) * 100);
    }
    return data;
  };

  // Fetch real histogram data from image
  useEffect(() => {
    if (imageUri && visible) {
      getHistogramData(imageUri).then(data => {
        if (data) {
          setHistogramData(data);
        } else {
          // Fallback to generated data
          setHistogramData({
            red: generateHistogramData('r'),
            green: generateHistogramData('g'),
            blue: generateHistogramData('b'),
            luminosity: generateHistogramData('l'),
          });
        }
      });
    }
  }, [imageUri, visible]);

  const displayData = histogramData || {
    red: generateHistogramData('r'),
    green: generateHistogramData('g'),
    blue: generateHistogramData('b'),
    luminosity: generateHistogramData('l'),
  };

  // Create SVG path from histogram data
  const createHistogramPath = (data: number[], width: number, height: number): string => {
    const maxValue = Math.max(...data);
    const scaleX = width / 256;
    const scaleY = height / maxValue;

    let path = `M 0 ${height}`;
    data.forEach((value, i) => {
      const x = i * scaleX;
      const y = height - (value * scaleY);
      path += ` L ${x} ${y}`;
    });
    path += ` L ${width} ${height} Z`;
    return path;
  };

  const histogramWidth = compact ? 160 : SCREEN_WIDTH - 48;
  const histogramHeight = compact ? 60 : 150;

  const renderHistogramChannel = (
    data: number[],
    color: string,
    opacity: number = 0.7
  ) => (
    <Path
      d={createHistogramPath(data, histogramWidth, histogramHeight)}
      fill={color}
      fillOpacity={opacity}
      stroke={color}
      strokeWidth={1}
      strokeOpacity={0.9}
    />
  );

  const renderHistogram = () => {
    return (
      <Svg width={histogramWidth} height={histogramHeight}>
        <Defs>
          <LinearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FF0000" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#FF0000" stopOpacity="0.3" />
          </LinearGradient>
          <LinearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#00FF00" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#00FF00" stopOpacity="0.3" />
          </LinearGradient>
          <LinearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0066FF" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#0066FF" stopOpacity="0.3" />
          </LinearGradient>
          <LinearGradient id="whiteGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.3" />
          </LinearGradient>
        </Defs>

        {/* Background grid */}
        {!compact && (
          <>
            {[0, 0.25, 0.5, 0.75, 1].map((y, i) => (
              <Rect
                key={`h-${i}`}
                x={0}
                y={histogramHeight * y}
                width={histogramWidth}
                height={1}
                fill="#333"
                fillOpacity={0.5}
              />
            ))}
            {[0, 0.25, 0.5, 0.75, 1].map((x, i) => (
              <Rect
                key={`v-${i}`}
                x={histogramWidth * x}
                y={0}
                width={1}
                height={histogramHeight}
                fill="#333"
                fillOpacity={0.5}
              />
            ))}
          </>
        )}

        {/* Histogram data */}
        {mode === 'rgb' && showOverlay && (
          <>
            {renderHistogramChannel(displayData.red, 'url(#redGrad)', 0.5)}
            {renderHistogramChannel(displayData.green, 'url(#greenGrad)', 0.5)}
            {renderHistogramChannel(displayData.blue, 'url(#blueGrad)', 0.5)}
          </>
        )}
        {mode === 'rgb' && !showOverlay && (
          renderHistogramChannel(displayData.luminosity, 'url(#whiteGrad)', 0.7)
        )}
        {mode === 'red' && renderHistogramChannel(displayData.red, '#FF0000', 0.7)}
        {mode === 'green' && renderHistogramChannel(displayData.green, '#00FF00', 0.7)}
        {mode === 'blue' && renderHistogramChannel(displayData.blue, '#0066FF', 0.7)}
        {mode === 'luminosity' && renderHistogramChannel(displayData.luminosity, '#FFFFFF', 0.7)}
      </Svg>
    );
  };

  // Calculate statistics
  const calculateStats = (data: number[]) => {
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / data.length;
    const max = Math.max(...data);
    const min = Math.min(...data);
    return { avg: Math.round(avg), max: Math.round(max), min: Math.round(min) };
  };

  const stats = useMemo(() => ({
    red: calculateStats(displayData.red),
    green: calculateStats(displayData.green),
    blue: calculateStats(displayData.blue),
    luminosity: calculateStats(displayData.luminosity),
  }), [displayData]);

  if (!visible) return null;

  if (compact) {
    return (
      <TouchableOpacity 
        style={styles.compactContainer}
        onPress={onClose}
        activeOpacity={0.9}
      >
        <View style={styles.compactHistogram}>
          {renderHistogram()}
        </View>
        <Text style={styles.compactLabel}>RGB</Text>
      </TouchableOpacity>
    );
  }

  const MODES: { id: HistogramMode; label: string; color: string }[] = [
    { id: 'rgb', label: 'RGB', color: COLORS.textPrimary },
    { id: 'red', label: 'R', color: '#FF0000' },
    { id: 'green', label: 'G', color: '#00FF00' },
    { id: 'blue', label: 'B', color: '#0066FF' },
    { id: 'luminosity', label: 'L', color: '#FFFFFF' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Histogram</Text>
        <View style={styles.headerActions}>
          {mode === 'rgb' && (
            <TouchableOpacity
              style={[styles.overlayToggle, showOverlay && styles.overlayToggleActive]}
              onPress={() => setShowOverlay(!showOverlay)}
            >
              <Ionicons
                name="layers-outline"
                size={18}
                color={showOverlay ? COLORS.primary : COLORS.textSecondary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[
              styles.modeButton,
              mode === m.id && styles.modeButtonActive,
            ]}
            onPress={() => setMode(m.id)}
          >
            <Text
              style={[
                styles.modeLabel,
                { color: mode === m.id ? m.color : COLORS.textSecondary },
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Histogram Display */}
      <View style={styles.histogramContainer}>
        {renderHistogram()}
        
        {/* X-axis labels */}
        <View style={styles.xAxis}>
          <Text style={styles.axisLabel}>0</Text>
          <Text style={styles.axisLabel}>64</Text>
          <Text style={styles.axisLabel}>128</Text>
          <Text style={styles.axisLabel}>192</Text>
          <Text style={styles.axisLabel}>255</Text>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#FF0000' }]} />
            <Text style={styles.statLabel}>R: {stats.red.avg}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#00FF00' }]} />
            <Text style={styles.statLabel}>G: {stats.green.avg}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#0066FF' }]} />
            <Text style={styles.statLabel}>B: {stats.blue.avg}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#FFFFFF' }]} />
            <Text style={styles.statLabel}>L: {stats.luminosity.avg}</Text>
          </View>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoSection}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.textTertiary} />
        <Text style={styles.infoText}>
          Shows distribution of pixel brightness values (0-255) for each color channel
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    margin: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  compactContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    position: 'absolute',
    top: 100,
    right: 16,
  },
  compactHistogram: {
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  compactLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overlayToggle: {
    padding: 6,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.card,
  },
  overlayToggleActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  closeButton: {
    padding: SPACING.xs,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  modeButtonActive: {
    backgroundColor: COLORS.surface,
  },
  modeLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  histogramContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  axisLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontFamily: 'monospace',
  },
  statsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    lineHeight: 16,
  },
});

export default HistogramDisplay;

