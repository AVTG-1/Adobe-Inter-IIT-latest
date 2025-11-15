/**
 * Editor Screen
 *
 * Main image editing interface with toolbar and controls
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  Dimensions,
  Animated,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Editor'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Tool icons for bottom toolbar
const TOOLS = [
  { id: 'crop', icon: 'crop', label: 'Crop' },
  { id: 'filter', icon: 'color-filter', label: 'Filter' },
  { id: 'adjust', icon: 'contrast', label: 'Adjust' },
  { id: 'text', icon: 'text', label: 'Text' },
  { id: 'draw', icon: 'brush', label: 'Draw' },
  { id: 'sticker', icon: 'happy', label: 'Sticker' },
  { id: 'background', icon: 'layers', label: 'Background' },
  { id: 'ai', icon: 'sparkles', label: 'AI' },
] as const;

export default function EditorScreen({ route, navigation }: Props) {
  const { imageUrl } = route.params;

  // State
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const [toolbarAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(toolbarAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBack = () => {
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to go back? Any unsaved changes will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handleUndo = () => {
    console.log('Undo pressed');
    // TODO: Implement undo functionality in future phases
  };

  const handleRedo = () => {
    console.log('Redo pressed');
    // TODO: Implement redo functionality in future phases
  };

  const handleExport = () => {
    console.log('Export pressed');
    // TODO: Implement export/save functionality in future phases
    Alert.alert('Export', 'Export functionality coming soon!');
  };

  const handleToolPress = (toolId: string) => {
    // Animate tool selection
    Animated.sequence([
      Animated.timing(toolbarAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(toolbarAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedTool(toolId);
    console.log('Tool selected:', toolId);
    // TODO: Implement tool-specific functionality in future phases
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <Text style={styles.navTitle}>Edit Photo</Text>

        <View style={styles.navActions}>
          <TouchableOpacity
            onPress={handleUndo}
            style={[styles.navButton, !canUndo && styles.navButtonDisabled]}
            disabled={!canUndo}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-undo"
              size={22}
              color={canUndo ? '#333' : '#ccc'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRedo}
            style={[
              styles.navButton,
              !canRedo && styles.navButtonDisabled,
              { marginLeft: 8 },
            ]}
            disabled={!canRedo}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-redo"
              size={22}
              color={canRedo ? '#333' : '#ccc'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleExport}
            style={[styles.navButton, styles.exportButton]}
            activeOpacity={0.7}
          >
            <Ionicons name="download" size={20} color="#fff" />
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Display Area */}
      <Animated.View
        style={[
          styles.imageContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {!imageLoaded && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading image...</Text>
          </View>
        )}

        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
          onLoad={() => setImageLoaded(true)}
          onError={(error) => {
            console.error('Image load error:', error);
            Alert.alert(
              'Error',
              'Failed to load image. Please try again.',
              [{ text: 'Go Back', onPress: () => navigation.goBack() }]
            );
          }}
        />
      </Animated.View>

      {/* Bottom Toolbar */}
      <Animated.View
        style={[
          styles.toolbar,
          {
            transform: [
              {
                translateY: toolbarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
            opacity: toolbarAnim,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolbarContent}
        >
          {TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={[
                styles.toolButton,
                selectedTool === tool.id && styles.toolButtonActive,
              ]}
              onPress={() => handleToolPress(tool.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.toolIconContainer,
                  selectedTool === tool.id && styles.toolIconContainerActive,
                ]}
              >
                <Ionicons
                  name={tool.icon as any}
                  size={24}
                  color={selectedTool === tool.id ? '#667eea' : '#666'}
                />
              </View>
              <Text
                style={[
                  styles.toolLabel,
                  selectedTool === tool.id && styles.toolLabelActive,
                ]}
              >
                {tool.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  navButton: {
    padding: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  exportText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  image: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  toolbar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 12,
  },
  toolbarContent: {
    paddingHorizontal: 8,
    gap: 4,
  },
  toolButton: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolButtonActive: {
    // Active state styling handled by child components
  },
  toolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  toolIconContainerActive: {
    backgroundColor: '#e8ebfc',
  },
  toolLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  toolLabelActive: {
    color: '#667eea',
    fontWeight: '600',
  },
});
