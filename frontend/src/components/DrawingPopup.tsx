/**
 * DrawingPopup - Simple Drawing Tool Selector
 * 
 * Shows as a small popup above bottom bar when Draw is tapped
 * Select tool → opens drawing overlay directly
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface DrawingToolOption {
  id: 'pen' | 'brush' | 'marker' | 'highlighter' | 'eraser';
  name: string;
  icon: string;
  defaultSize: number;
  defaultOpacity: number;
}

const DRAWING_TOOLS: DrawingToolOption[] = [
  { id: 'pen', name: 'Pen', icon: 'pencil', defaultSize: 3, defaultOpacity: 1 },
  { id: 'brush', name: 'Brush', icon: 'brush', defaultSize: 10, defaultOpacity: 0.8 },
  { id: 'marker', name: 'Marker', icon: 'create', defaultSize: 15, defaultOpacity: 0.7 },
  { id: 'highlighter', name: 'Highlight', icon: 'color-fill', defaultSize: 20, defaultOpacity: 0.4 },
  { id: 'eraser', name: 'Eraser', icon: 'remove-circle-outline', defaultSize: 20, defaultOpacity: 1 },
];

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55',
];

interface DrawingPopupProps {
  visible: boolean;
  onToolSelect: (tool: DrawingToolOption, settings: DrawingSettings) => void;
  onClose: () => void;
}

export interface DrawingSettings {
  color: string;
  size: number;
  opacity: number;
}

const DrawingPopup: React.FC<DrawingPopupProps> = ({
  visible,
  onToolSelect,
  onClose,
}) => {
  const [selectedTool, setSelectedTool] = useState<DrawingToolOption | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [color, setColor] = useState('#FF3B30');
  const [size, setSize] = useState(10);
  const [opacity, setOpacity] = useState(1);

  if (!visible) return null;

  const handleToolPress = (tool: DrawingToolOption) => {
    setSelectedTool(tool);
    setSize(tool.defaultSize);
    setOpacity(tool.defaultOpacity);
    setShowSettings(true);
  };

  const handleConfirm = () => {
    if (selectedTool) {
      onToolSelect(selectedTool, { color, size, opacity });
      setShowSettings(false);
      setSelectedTool(null);
    }
  };

  const handleCancel = () => {
    setShowSettings(false);
    setSelectedTool(null);
    onClose();
  };

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={handleCancel}
      />

      {/* Popup Content */}
      <View style={styles.popup}>
        {!showSettings ? (
          // Tool Selection Row
          <>
            <Text style={styles.title}>Select Drawing Tool</Text>
            <View style={styles.toolsRow}>
              {DRAWING_TOOLS.map((tool) => (
                <TouchableOpacity
                  key={tool.id}
                  style={styles.toolButton}
                  onPress={() => handleToolPress(tool)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.toolIconWrapper,
                    tool.id === 'eraser' && styles.eraserWrapper
                  ]}>
                    <Ionicons 
                      name={tool.icon as any} 
                      size={24} 
                      color={tool.id === 'eraser' ? '#FF3B30' : '#FFFFFF'} 
                    />
                  </View>
                  <Text style={styles.toolName}>{tool.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Settings Panel
          <>
            <View style={styles.settingsHeader}>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.settingsTitle}>
                {selectedTool?.name} Settings
              </Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Ionicons name="checkmark" size={28} color="#34C759" />
              </TouchableOpacity>
            </View>

            {/* Color Picker (hide for eraser) */}
            {selectedTool?.id !== 'eraser' && (
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Color</Text>
                <View style={styles.colorsRow}>
                  {PRESET_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorDot,
                        { backgroundColor: c },
                        color === c && styles.colorDotSelected,
                      ]}
                      onPress={() => setColor(c)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Size Slider */}
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Text style={styles.settingLabel}>Size</Text>
                <Text style={styles.settingValue}>{Math.round(size)}px</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={50}
                value={size}
                onValueChange={setSize}
                minimumTrackTintColor="#FFCC00"
                maximumTrackTintColor="#444"
                thumbTintColor="#FFCC00"
              />
            </View>

            {/* Opacity Slider */}
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Text style={styles.settingLabel}>Opacity</Text>
                <Text style={styles.settingValue}>{Math.round(opacity * 100)}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.1}
                maximumValue={1}
                value={opacity}
                onValueChange={setOpacity}
                minimumTrackTintColor="#FFCC00"
                maximumTrackTintColor="#444"
                thumbTintColor="#FFCC00"
              />
            </View>

            {/* Preview */}
            <View style={styles.previewContainer}>
              <View
                style={[
                  styles.brushPreview,
                  {
                    width: Math.min(size * 2, 60),
                    height: Math.min(size * 2, 60),
                    borderRadius: size,
                    backgroundColor: selectedTool?.id === 'eraser' ? '#888' : color,
                    opacity: opacity,
                  }
                ]}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={handleCancel}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.startBtn} 
                onPress={handleConfirm}
              >
                <Ionicons name="brush" size={20} color="#000" />
                <Text style={styles.startBtnText}>Start Drawing</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    zIndex: 100,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  popup: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  toolButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  toolIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  eraserWrapper: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  toolName: {
    fontSize: 11,
    color: '#AAAAAA',
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingRow: {
    marginBottom: 16,
  },
  settingLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: '#AAAAAA',
    marginBottom: 8,
  },
  settingValue: {
    fontSize: 14,
    color: '#FFCC00',
    fontFamily: 'monospace',
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  slider: {
    width: '100%',
    height: 40,
  },
  previewContainer: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginBottom: 16,
  },
  brushPreview: {
    // Dynamic styles inline
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
  },
  cancelBtnText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  startBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#FFCC00',
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

export default DrawingPopup;

