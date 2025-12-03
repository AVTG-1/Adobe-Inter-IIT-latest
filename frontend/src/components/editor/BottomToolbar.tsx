/**
 * BottomToolbar - Professional Editor Bottom Bar
 * Clean, Photoshop-like toolbar with proper state management
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ToolId = 
  | 'edit' | 'adjust' | 'layers' | 'ai' | 'add'
  | 'filter' | 'draw' | 'curve' | 'text' | 'shape'
  | 'overlay' | 'style' | 'scene' | 'eraser' | 'pose' | 'expand';

export type PanelType = 
  | 'none' | 'edit-grid' | 'adjust' | 'layers' | 'ai' | 'add'
  | 'filter' | 'draw' | 'crop' | 'rotate' | 'flip' | 'resize';

interface ToolItem {
  id: ToolId;
  icon: string;
  label: string;
  color?: string;
  comingSoon?: boolean;
}

interface BottomToolbarProps {
  activePanel: PanelType;
  selectedTool: ToolId | null;
  onToolPress: (toolId: ToolId) => void;
  onPlusPress: () => void;
  showPlusButton?: boolean;
}

// Main toolbar buttons
const MAIN_TOOLS: ToolItem[] = [
  { id: 'edit', icon: 'brush-outline', label: 'Edit' },
  { id: 'adjust', icon: 'options-outline', label: 'Adjust' },
  // Plus button goes here (handled separately)
  { id: 'layers', icon: 'layers-outline', label: 'Layer' },
  { id: 'ai', icon: 'rocket-outline', label: 'AI' },
];

// Edit mode grid - Row 1
const EDIT_ROW_1: ToolItem[] = [
  { id: 'edit', icon: 'brush-outline', label: 'Edit' },
  { id: 'filter', icon: 'color-filter-outline', label: 'Filter' },
  { id: 'draw', icon: 'pencil-outline', label: 'Draw' },
  { id: 'curve', icon: 'git-branch-outline', label: 'Curve', comingSoon: true },
  { id: 'text', icon: 'text-outline', label: 'Text', comingSoon: true },
  { id: 'shape', icon: 'square-outline', label: 'Shape', comingSoon: true },
];

// Edit mode grid - Row 2
const EDIT_ROW_2: ToolItem[] = [
  { id: 'overlay', icon: 'layers-outline', label: 'Overlay', comingSoon: true },
  { id: 'style', icon: 'color-palette-outline', label: 'Style*', comingSoon: true },
  { id: 'scene', icon: 'images-outline', label: 'Scene*', comingSoon: true },
  { id: 'eraser', icon: 'remove-circle-outline', label: 'Eraser' },
  { id: 'pose', icon: 'body-outline', label: 'Pose*', comingSoon: true },
  { id: 'expand', icon: 'expand-outline', label: 'Expand', comingSoon: true },
];

const BottomToolbar: React.FC<BottomToolbarProps> = ({
  activePanel,
  selectedTool,
  onToolPress,
  onPlusPress,
  showPlusButton = true,
}) => {
  const plusButtonScale = useRef(new Animated.Value(1)).current;

  // Animate plus button
  const animatePlusButton = useCallback(() => {
    Animated.sequence([
      Animated.timing(plusButtonScale, {
        toValue: 0.88,
        duration: 150,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.spring(plusButtonScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [plusButtonScale]);

  const handlePlusPress = useCallback(() => {
    animatePlusButton();
    onPlusPress();
  }, [animatePlusButton, onPlusPress]);

  // Check if we're in edit grid mode
  const isEditGridMode = activePanel === 'edit-grid';

  // Check if a main tool is active (hides other buttons)
  const isToolActive = ['adjust', 'layers', 'ai'].includes(activePanel);

  // Render single tool button
  const renderToolButton = (tool: ToolItem, isActive: boolean = false, isInGrid: boolean = false) => {
    const isCurrentlyActive = selectedTool === tool.id || isActive;

    return (
      <TouchableOpacity
        key={tool.id}
        style={[
          styles.toolItem,
          isInGrid && styles.gridToolItem,
        ]}
        onPress={() => onToolPress(tool.id)}
        activeOpacity={0.7}
        disabled={tool.comingSoon}
      >
        {isCurrentlyActive && !isInGrid && (
          <View style={styles.activeIndicator} />
        )}
        <Ionicons
          name={tool.icon as any}
          size={isInGrid ? 22 : 24}
          color={
            tool.comingSoon 
              ? COLORS.border 
              : isCurrentlyActive 
                ? '#000000' 
                : '#E0E0E0'
          }
        />
        <Text 
          style={[
            styles.toolLabel,
            tool.comingSoon && styles.toolLabelDisabled,
            isCurrentlyActive && styles.toolLabelActive,
          ]}
        >
          {tool.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render edit grid (2 rows × 6 columns)
  const renderEditGrid = () => (
    <View style={styles.editGridContainer}>
      {/* Row 1 */}
      <View style={styles.editGridRow}>
        {EDIT_ROW_1.map(tool => renderToolButton(tool, tool.id === 'edit', true))}
      </View>
      {/* Row 2 */}
      <View style={styles.editGridRow}>
        {EDIT_ROW_2.map(tool => renderToolButton(tool, false, true))}
      </View>
    </View>
  );

  // Render main toolbar (5 buttons)
  const renderMainToolbar = () => (
    <View style={styles.mainToolbar}>
      {/* Edit button */}
      {(!isToolActive || activePanel === 'none' || selectedTool === 'edit') && (
        renderToolButton(MAIN_TOOLS[0], selectedTool === 'edit')
      )}

      {/* Adjust button */}
      {(!isToolActive || activePanel === 'adjust') && (
        renderToolButton(MAIN_TOOLS[1], activePanel === 'adjust')
      )}

      {/* Plus button spacer */}
      {!isToolActive && showPlusButton && (
        <View style={styles.plusSpacer} />
      )}

      {/* Layer button */}
      {(!isToolActive || activePanel === 'layers') && (
        renderToolButton(MAIN_TOOLS[2], activePanel === 'layers')
      )}

      {/* AI button */}
      {(!isToolActive || activePanel === 'ai') && (
        renderToolButton(MAIN_TOOLS[3], activePanel === 'ai')
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Plus Button - Floating above toolbar */}
      {showPlusButton && !isToolActive && !isEditGridMode && (
        <Animated.View 
          style={[
            styles.plusButtonContainer,
            { transform: [{ scale: plusButtonScale }] }
          ]}
        >
          <TouchableOpacity
            style={styles.plusButton}
            onPress={handlePlusPress}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={30} color="#000000" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Bottom Bar */}
      <View style={styles.toolbar}>
        {isEditGridMode ? renderEditGrid() : renderMainToolbar()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  plusButtonContainer: {
    position: 'absolute',
    bottom: 85,
    left: SCREEN_WIDTH / 2 - 30,
    zIndex: 10,
  },
  plusButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFCC00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toolbar: {
    backgroundColor: '#242428',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 34, // Safe area
    paddingTop: 12,
  },
  mainToolbar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 13,
  },
  plusSpacer: {
    width: 60,
  },
  toolItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 50,
  },
  gridToolItem: {
    flex: 1,
    minWidth: 0,
  },
  toolLabel: {
    fontSize: 10,
    fontWeight: '300',
    color: '#FFFFFF',
    marginTop: 2,
  },
  toolLabelDisabled: {
    color: COLORS.border,
  },
  toolLabelActive: {
    color: '#000000',
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 3,
    backgroundColor: '#FFCC00',
    borderRadius: 2,
  },
  editGridContainer: {
    paddingHorizontal: 8,
  },
  editGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 54,
    marginBottom: 4,
  },
});

export default BottomToolbar;

