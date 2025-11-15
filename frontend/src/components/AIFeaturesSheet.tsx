/**
 * AI Features Sheet - 35% Height Popup
 *
 * Grid of AI tools with Transparent Background as first tile
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
  { id: 'transparent_bg', icon: 'cut', label: 'Transparent\nBackground', color: '#FF6B9D' },
  { id: 'auto_enhance', icon: 'sparkles', label: 'Auto\nEnhance', color: '#00D9FF' },
  { id: 'hdr', icon: 'contrast', label: 'HDR', color: '#FFB74D' },
  { id: 'portrait', icon: 'person', label: 'Portrait', color: '#9C27B0' },
  { id: 'artistic', icon: 'brush', label: 'Artistic\nLooks', color: '#E91E63' },
  { id: 'color_pop', icon: 'color-palette', label: 'Color\nPop', color: '#4CAF50' },
];

const AIFeaturesSheet: React.FC<AIFeaturesSheetProps> = ({
  bottomSheetRef,
  onFeatureSelect,
  onClose,
}) => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const snapPoints = React.useMemo(() => ['35%'], []);

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
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
          {AI_FEATURES.map((feature) => (
            <TouchableOpacity
              key={feature.id}
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
