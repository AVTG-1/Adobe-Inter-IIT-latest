/**
 * AI Features Sheet - 4×3 Grid with Blurred Background
 *
 * 12 AI features in scrollable grid with smooth animations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface AIFeaturesSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onFeatureSelect: (feature: string) => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2) / 3;

const AI_FEATURES = [
  { id: 'ai_enhance', icon: 'sparkles', label: 'AI Enhance' },
  { id: 'remove_object', icon: 'cut', label: 'Remove Object' },
  { id: 'sky_replace', icon: 'cloud', label: 'Sky Replace' },
  { id: 'color_grade', icon: 'color-palette', label: 'Color Grade' },
  { id: 'background_blur', icon: 'layers', label: 'BG Blur' },
  { id: 'portrait_fix', icon: 'person', label: 'Portrait Fix' },
  { id: 'style_transfer', icon: 'brush', label: 'Style Transfer' },
  { id: 'face_swap', icon: 'happy', label: 'Face Swap' },
  { id: 'object_detect', icon: 'scan', label: 'Object Detect' },
  { id: 'upscale', icon: 'expand', label: 'Upscale' },
  { id: 'denoise', icon: 'analytics', label: 'Denoise' },
  { id: 'auto_correct', icon: 'checkmark-circle', label: 'Auto Correct' },
];

const AIFeaturesSheet: React.FC<AIFeaturesSheetProps> = ({
  bottomSheetRef,
  onFeatureSelect,
  onClose,
}) => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const snapPoints = React.useMemo(() => ['50%'], []);

  // Smooth and slow animation configuration
  const animationConfigs = React.useMemo(
    () => ({
      duration: 500, // Slower animation (500ms)
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth ease-in-out curve
    }),
    []
  );

  // Animation values for stagger effect
  const fadeAnims = React.useRef(
    AI_FEATURES.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Stagger animation with 40ms delay between each card
    const animations = fadeAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * 40,
        useNativeDriver: true,
      })
    );
    Animated.parallel(animations).start();
  }, []);

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.7}
      />
    ),
    []
  );

  const handleFeaturePress = (featureId: string) => {
    setSelectedFeature(featureId);
    onFeatureSelect(featureId);
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Features</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gridContainer}>
            {AI_FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.id}
                style={[
                  styles.cardWrapper,
                  {
                    opacity: fadeAnims[index],
                    transform: [
                      {
                        translateY: fadeAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.featureCard,
                    selectedFeature === feature.id && styles.featureCardSelected,
                  ]}
                  onPress={() => handleFeaturePress(feature.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconContainer}>
                    <Ionicons
                      name={feature.icon as any}
                      size={32}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.featureLabel} numberOfLines={2}>
                    {feature.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: COLORS.border,
    width: 40,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  scrollContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: `${100 / 3}%`,
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.md,
  },
  featureCard: {
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  featureCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureLabel: {
    fontSize: 11,
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 13,
  },
});

export default AIFeaturesSheet;
