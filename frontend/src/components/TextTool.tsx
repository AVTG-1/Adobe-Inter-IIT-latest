/**
 * Text Tool - Professional Text Layer Creation
 * 
 * Add text layers with font selection, styling options
 * Similar to Canva/Photoshop text tool
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Font options (web-safe fonts that work on all platforms)
const FONT_OPTIONS = [
  { id: 'default', name: 'Default', family: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  { id: 'serif', name: 'Serif', family: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  { id: 'mono', name: 'Monospace', family: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  { id: 'condensed', name: 'Condensed', family: Platform.OS === 'ios' ? 'AvenirNextCondensed-Regular' : 'sans-serif-condensed' },
  { id: 'rounded', name: 'Rounded', family: Platform.OS === 'ios' ? 'Arial Rounded MT Bold' : 'sans-serif' },
];

// Color options
const TEXT_COLORS = [
  '#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55',
];

export interface TextLayerConfig {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  position: { x: number; y: number };
}

interface TextToolProps {
  visible: boolean;
  onConfirm: (config: TextLayerConfig) => void;
  onCancel: () => void;
  initialText?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

const TextTool: React.FC<TextToolProps> = ({
  visible,
  onConfirm,
  onCancel,
  initialText = '',
  canvasWidth = SCREEN_WIDTH,
  canvasHeight = SCREEN_HEIGHT * 0.6,
}) => {
  const [text, setText] = useState(initialText);
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0]);
  const [fontSize, setFontSize] = useState(32);
  const [color, setColor] = useState('#FFFFFF');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center');
  const [showFontPicker, setShowFontPicker] = useState(false);
  
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setText(initialText);
      // Auto focus after modal opens
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible, initialText]);

  const handleConfirm = () => {
    if (!text.trim()) {
      onCancel();
      return;
    }
    
    onConfirm({
      text: text.trim(),
      fontFamily: selectedFont.family,
      fontSize,
      color,
      bold,
      italic,
      align,
      position: { x: canvasWidth / 2, y: canvasHeight / 2 },
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color="#FF6B6B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Text</Text>
            <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn}>
              <Ionicons name="checkmark" size={24} color="#34C759" />
            </TouchableOpacity>
          </View>

          {/* Text Preview Area */}
          <View style={styles.previewArea}>
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                {
                  fontFamily: selectedFont.family,
                  fontSize: fontSize,
                  color: color,
                  fontWeight: bold ? 'bold' : 'normal',
                  fontStyle: italic ? 'italic' : 'normal',
                  textAlign: align,
                }
              ]}
              value={text}
              onChangeText={setText}
              placeholder="Type your text..."
              placeholderTextColor="#666"
              multiline
              autoFocus
            />
          </View>

          {/* Font Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Font</Text>
            <TouchableOpacity 
              style={styles.fontSelector}
              onPress={() => setShowFontPicker(!showFontPicker)}
            >
              <Text style={[styles.fontSelectorText, { fontFamily: selectedFont.family }]}>
                {selectedFont.name}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#888" />
            </TouchableOpacity>

            {showFontPicker && (
              <View style={styles.fontPicker}>
                {FONT_OPTIONS.map((font) => (
                  <TouchableOpacity
                    key={font.id}
                    style={[
                      styles.fontOption,
                      selectedFont.id === font.id && styles.fontOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedFont(font);
                      setShowFontPicker(false);
                    }}
                  >
                    <Text style={[styles.fontOptionText, { fontFamily: font.family }]}>
                      {font.name}
                    </Text>
                    {selectedFont.id === font.id && (
                      <Ionicons name="checkmark" size={16} color="#34C759" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Font Size */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Size</Text>
              <Text style={styles.sectionValue}>{fontSize}px</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={12}
              maximumValue={120}
              value={fontSize}
              onValueChange={(val) => setFontSize(Math.round(val))}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#333"
              thumbTintColor="#007AFF"
            />
          </View>

          {/* Color */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Color</Text>
            <View style={styles.colorRow}>
              {TEXT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    color === c && styles.colorOptionSelected,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
          </View>

          {/* Style Options */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Style</Text>
            <View style={styles.styleRow}>
              <TouchableOpacity
                style={[styles.styleBtn, bold && styles.styleBtnActive]}
                onPress={() => setBold(!bold)}
              >
                <Text style={[styles.styleBtnText, { fontWeight: 'bold' }]}>B</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.styleBtn, italic && styles.styleBtnActive]}
                onPress={() => setItalic(!italic)}
              >
                <Text style={[styles.styleBtnText, { fontStyle: 'italic' }]}>I</Text>
              </TouchableOpacity>

              <View style={styles.alignGroup}>
                <TouchableOpacity
                  style={[styles.alignBtn, align === 'left' && styles.alignBtnActive]}
                  onPress={() => setAlign('left')}
                >
                  <Ionicons name="menu" size={16} color={align === 'left' ? '#FFF' : '#888'} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alignBtn, align === 'center' && styles.alignBtnActive]}
                  onPress={() => setAlign('center')}
                >
                  <Ionicons name="reorder-four" size={16} color={align === 'center' ? '#FFF' : '#888'} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alignBtn, align === 'right' && styles.alignBtnActive]}
                  onPress={() => setAlign('right')}
                >
                  <Ionicons name="menu" size={16} color={align === 'right' ? '#FFF' : '#888'} style={{ transform: [{ scaleX: -1 }] }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH - 40,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewArea: {
    minHeight: 150,
    padding: 20,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
  },
  textInput: {
    color: '#FFF',
    fontSize: 32,
    textAlign: 'center',
    padding: 10,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionValue: {
    color: '#FFF',
    fontSize: 12,
  },
  fontSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fontSelectorText: {
    color: '#FFF',
    fontSize: 16,
  },
  fontPicker: {
    marginTop: 8,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  fontOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  fontOptionSelected: {
    backgroundColor: '#3C3C3E',
  },
  fontOptionText: {
    color: '#FFF',
    fontSize: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#FFF',
  },
  styleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  styleBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleBtnActive: {
    backgroundColor: '#007AFF',
  },
  styleBtnText: {
    color: '#FFF',
    fontSize: 18,
  },
  alignGroup: {
    flexDirection: 'row',
    marginLeft: 'auto',
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  alignBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alignBtnActive: {
    backgroundColor: '#007AFF',
  },
});

export default TextTool;

