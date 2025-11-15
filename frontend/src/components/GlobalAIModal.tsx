/**
 * Global AI Modal - Full Screen Modal for LLM AI Features
 *
 * Advanced AI features: Make Cinematic, Remove Background, Fix Colors, Describe Image
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GlobalAIModalProps {
  visible: boolean;
  onClose: () => void;
  onFeatureSelect: (feature: string) => void;
}

const AI_LLM_FEATURES = [
  {
    id: 'cinematic',
    icon: 'film',
    label: 'Make Cinematic',
    description: 'Transform your photo with cinematic color grading',
    color: '#FF6B9D',
  },
  {
    id: 'remove_bg',
    icon: 'cut-outline',
    label: 'Remove Background',
    description: 'AI-powered background removal',
    color: '#00D9FF',
  },
  {
    id: 'fix_colors',
    icon: 'color-palette-outline',
    label: 'Fix Colors',
    description: 'Auto-correct colors and white balance',
    color: '#FFB74D',
  },
  {
    id: 'describe',
    icon: 'text-outline',
    label: 'Describe Image',
    description: 'Generate AI description of your image',
    color: '#9C27B0',
  },
  {
    id: 'enhance_pro',
    icon: 'sparkles-outline',
    label: 'Pro Enhance',
    description: 'Advanced AI enhancement with detail preservation',
    color: '#4CAF50',
  },
  {
    id: 'style_transfer',
    icon: 'brush-outline',
    label: 'Style Transfer',
    description: 'Apply artistic styles to your image',
    color: '#E91E63',
  },
];

const GlobalAIModal: React.FC<GlobalAIModalProps> = ({
  visible,
  onClose,
  onFeatureSelect,
}) => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const handleFeaturePress = (featureId: string) => {
    setSelectedFeature(featureId);
    onFeatureSelect(featureId);
    // Auto-close after selection
    setTimeout(() => {
      onClose();
      setSelectedFeature(null);
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>AI Magic</Text>
            <Text style={styles.headerSubtitle}>Powered by Advanced AI</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={28} color={COLORS.primary} />
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {AI_LLM_FEATURES.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[
                styles.featureCard,
                selectedFeature === feature.id && styles.featureCardSelected,
              ]}
              onPress={() => handleFeaturePress(feature.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: feature.color }]}>
                <Ionicons
                  name={feature.icon as any}
                  size={32}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureLabel}>{feature.label}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerIcon: {
    padding: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  featureCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureContent: {
    flex: 1,
  },
  featureLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

export default GlobalAIModal;
