/**
 * Edit Expanded Panel - 35% Height Bottom Sheet
 *
 * Displays 9 editing tools in 2×5 grid layout
 */

import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface EditExpandedPanelProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onToolSelect: (toolId: string) => void;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

// 9 Editing Tools - exactly these tools in this order
const EDIT_TOOLS = [
  { id: 'rotate', icon: 'reload-outline', label: 'Rotate' },
  { id: 'flip', icon: 'swap-horizontal-outline', label: 'Flip' },
  { id: 'resize', icon: 'resize-outline', label: 'Resize' },
  { id: 'perspective', icon: 'cube-outline', label: 'Perspective' },
  { id: 'draw', icon: 'pencil-outline', label: 'Draw' },
  { id: 'brush', icon: 'brush-outline', label: 'Brush' },
  { id: 'eraser', icon: 'trash-outline', label: 'Eraser' },
  { id: 'shape', icon: 'shapes-outline', label: 'Shape' },
  { id: 'text', icon: 'text-outline', label: 'Text' },
];

const EditExpandedPanel: React.FC<EditExpandedPanelProps> = ({
  bottomSheetRef,
  onToolSelect,
  onClose,
}) => {
  const snapPoints = useMemo(() => ['25%'], []);

  // Animation values for stagger effect
  const fadeAnims = useRef(
    EDIT_TOOLS.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Stagger animation with 50ms delay between each tool
    const animations = fadeAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      })
    );
    Animated.parallel(animations).start();
  }, []);

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.2}
    />
  );

  const handleToolPress = (toolId: string) => {
    onToolSelect(toolId);
  };

  const handleClose = () => {
    bottomSheetRef.current?.close();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Edit Tools</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tools Grid - 2 rows × 5 columns layout */}
        <ScrollView
          contentContainerStyle={styles.toolsGrid}
          showsVerticalScrollIndicator={false}
        >
          {EDIT_TOOLS.map((tool, index) => (
            <Animated.View
              key={tool.id}
              style={[
                styles.toolItem,
                {
                  opacity: fadeAnims[index],
                  transform: [
                    {
                      translateY: fadeAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => handleToolPress(tool.id)}
                activeOpacity={0.7}
              >
                <View style={styles.toolIconContainer}>
                  <Ionicons name={tool.icon as any} size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.toolLabel}>{tool.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  handleIndicator: {
    backgroundColor: COLORS.border,
    width: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingBottom: SPACING.md,
  },
  toolItem: {
    width: (width - SPACING.md * 2) / 5 - SPACING.xs,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  toolIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  toolLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
});

export default EditExpandedPanel;
