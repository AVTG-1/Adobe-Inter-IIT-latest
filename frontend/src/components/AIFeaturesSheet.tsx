/**
 * AI Features Sheet - 35% Height Popup
 *
 * Grid of AI tools with Transparent Background as first tile
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface AIFeaturesSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onFeatureSelect: (feature: string) => void;
  onClose: () => void;
}

const AI_FEATURES = [
  { id: 'ai_enhance', icon: 'sparkles', label: 'AI Enhance', color: '#00D9FF' },
  { id: 'remove_object', icon: 'cut', label: 'Remove Object', color: '#FF6B9D' },
  { id: 'sky_replace', icon: 'cloud', label: 'Sky Replace', color: '#74B9FF' },
  { id: 'color_grade', icon: 'color-palette', label: 'Color Grade', color: '#FFB74D' },
  { id: 'background_blur', icon: 'layers', label: 'Background Blur', color: '#9C27B0' },
  { id: 'portrait_fix', icon: 'person', label: 'Portrait Fix', color: '#E91E63' },
];

const AIFeaturesSheet: React.FC<AIFeaturesSheetProps> = ({
  bottomSheetRef,
  onFeatureSelect,
  onClose,
}) => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const snapPoints = React.useMemo(() => ['35%'], []);

  // Animation values for stagger effect
  const fadeAnims = React.useRef(
    AI_FEATURES.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Stagger animation with 50ms delay between each card
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

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.2}
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
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Features</Text>
          <Text style={styles.subtitle}>Enhance your image with AI</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        >
          {AI_FEATURES.map((feature, index) => (
            <Animated.View
              key={feature.id}
              style={{
                opacity: fadeAnims[index],
                transform: [
                  {
                    translateY: fadeAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.featureCard,
                  selectedFeature === feature.id && styles.featureCardSelected,
                ]}
                onPress={() => handleFeaturePress(feature.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: feature.color }]}>
                  <Ionicons
                    name={feature.icon as any}
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.featureLabel} numberOfLines={2}>
                  {feature.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: COLORS.surface,
  },
  handleIndicator: {
    backgroundColor: COLORS.border,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingBottom: SPACING.md,
  },
  featureCard: {
    width: '30%',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  featureCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.cardLight,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
  },
});

export default AIFeaturesSheet;
