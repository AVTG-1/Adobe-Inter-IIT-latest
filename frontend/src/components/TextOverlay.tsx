/**
 * Text Overlay Component - Compact Professional Design
 * 
 * Minimal floating toolbar for text - similar to DrawingOverlay
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Quick colors for text
const QUICK_COLORS = ['#FFFFFF', '#000000', '#FF3B30', '#FFCC00', '#34C759', '#007AFF'];

// Quick fonts
const FONTS = [
  { id: 'sans', name: 'Sans', family: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  { id: 'serif', name: 'Serif', family: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  { id: 'mono', name: 'Mono', family: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
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

interface TextOverlayProps {
  visible: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onConfirm: (config: TextLayerConfig) => void;
  onCancel: () => void;
}

const TextOverlay: React.FC<TextOverlayProps> = ({
  visible,
  canvasWidth,
  canvasHeight,
  onConfirm,
  onCancel,
}) => {
  const [text, setText] = useState('');
  const [color, setColor] = useState('#FFFFFF');
  const [fontSize, setFontSize] = useState(32);
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setText('');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleConfirm = () => {
    if (!text.trim()) {
      onCancel();
      return;
    }
    Keyboard.dismiss();
    onConfirm({
      text: text.trim(),
      fontFamily: selectedFont.family,
      fontSize,
      color,
      bold,
      italic,
      align: 'center',
      position: { x: canvasWidth / 2, y: canvasHeight / 2 },
    });
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Transparent canvas area for positioning text */}
      <View style={[styles.canvasArea, { width: canvasWidth, height: canvasHeight }]}>
        {/* Text preview in center */}
        <View style={styles.textPreviewContainer}>
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              {
                color,
                fontSize,
                fontFamily: selectedFont.family,
                fontWeight: bold ? 'bold' : 'normal',
                fontStyle: italic ? 'italic' : 'normal',
              }
            ]}
            value={text}
            onChangeText={setText}
            placeholder="Type here..."
            placeholderTextColor="#666"
            multiline
            textAlign="center"
          />
        </View>
      </View>

      {/* Floating toolbar at bottom */}
      <View style={styles.toolbar}>
        {/* Cancel/Confirm row */}
        <View style={styles.mainRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={onCancel}>
            <Ionicons name="close" size={22} color="#FF6B6B" />
          </TouchableOpacity>

          {/* Font button */}
          <TouchableOpacity 
            style={[styles.toolBtn, showFontPicker && styles.toolBtnActive]}
            onPress={() => {
              setShowFontPicker(!showFontPicker);
              setShowColorPicker(false);
              setShowSizePicker(false);
            }}
          >
            <Text style={styles.fontBtnText}>{selectedFont.name}</Text>
          </TouchableOpacity>

          {/* Size button */}
          <TouchableOpacity 
            style={[styles.toolBtn, showSizePicker && styles.toolBtnActive]}
            onPress={() => {
              setShowSizePicker(!showSizePicker);
              setShowColorPicker(false);
              setShowFontPicker(false);
            }}
          >
            <Text style={styles.sizeBtnText}>{fontSize}</Text>
          </TouchableOpacity>

          {/* Color button */}
          <TouchableOpacity 
            style={[styles.colorBtn, { backgroundColor: color }]}
            onPress={() => {
              setShowColorPicker(!showColorPicker);
              setShowFontPicker(false);
              setShowSizePicker(false);
            }}
          />

          {/* Bold/Italic */}
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

          <TouchableOpacity style={styles.actionBtn} onPress={handleConfirm}>
            <Ionicons name="checkmark" size={22} color="#34C759" />
          </TouchableOpacity>
        </View>

        {/* Color picker row */}
        {showColorPicker && (
          <View style={styles.pickerRow}>
            {QUICK_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorOption,
                  { backgroundColor: c },
                  color === c && styles.colorOptionSelected,
                ]}
                onPress={() => {
                  setColor(c);
                  setShowColorPicker(false);
                }}
              />
            ))}
          </View>
        )}

        {/* Font picker row */}
        {showFontPicker && (
          <View style={styles.pickerRow}>
            {FONTS.map((font) => (
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
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Size picker row */}
        {showSizePicker && (
          <View style={styles.pickerRow}>
            {[18, 24, 32, 48, 64, 96].map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.sizeOption,
                  fontSize === size && styles.sizeOptionSelected,
                ]}
                onPress={() => {
                  setFontSize(size);
                  setShowSizePicker(false);
                }}
              >
                <Text style={styles.sizeOptionText}>{size}</Text>
              </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  textPreviewContainer: {
    padding: 20,
    minWidth: 200,
    maxWidth: '90%',
  },
  textInput: {
    textAlign: 'center',
    padding: 10,
    minHeight: 50,
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
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
  fontBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sizeBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  colorBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  styleBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleBtnActive: {
    backgroundColor: '#007AFF',
  },
  styleBtnText: {
    color: '#FFF',
    fontSize: 16,
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
  fontOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  fontOptionSelected: {
    backgroundColor: '#007AFF',
  },
  fontOptionText: {
    color: '#FFF',
    fontSize: 14,
  },
  sizeOption: {
    width: 44,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeOptionSelected: {
    backgroundColor: '#007AFF',
  },
  sizeOptionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TextOverlay;

