/**
 * Tree View Modal - Full-Screen Step Navigation
 *
 * Shows all executed steps with thumbnail previews
 * Tap any step to load that image and open corresponding panel
 */

import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface ExecutedStep {
  id: string;
  actionId: string;
  name: string;
  description: string;
  icon: string;
  params: any;
  timestamp: number;
  thumbnailUri?: string;
}

interface TreeViewModalProps {
  visible: boolean;
  steps: ExecutedStep[];
  currentImageUri: string;
  onClose: () => void;
  onStepTap: (step: ExecutedStep) => void;
}

const TreeViewModal: React.FC<TreeViewModalProps> = ({
  visible,
  steps,
  currentImageUri,
  onClose,
  onStepTap,
}) => {
  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Edit History</Text>
            <Text style={styles.headerSubtitle}>{steps.length} steps</Text>
          </View>

          <View style={styles.closeButton} />
        </View>

        {/* Steps List */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {steps.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="git-branch-outline" size={64} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>No steps yet</Text>
              <Text style={styles.emptySubtext}>
                Execute AI prompts to see your editing history
              </Text>
            </View>
          ) : (
            steps.map((step, index) => (
              <TouchableOpacity
                key={step.id}
                style={styles.stepCard}
                onPress={() => onStepTap(step)}
                activeOpacity={0.7}
              >
                {/* Step Number & Icon */}
                <View style={styles.stepLeft}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepIconContainer}>
                    <Ionicons
                      name={step.icon as any}
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>
                </View>

                {/* Step Info */}
                <View style={styles.stepCenter}>
                  <Text style={styles.stepName}>{step.name}</Text>
                  <Text style={styles.stepDescription} numberOfLines={2}>
                    {step.description}
                  </Text>
                  <Text style={styles.stepTimestamp}>
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </Text>
                </View>

                {/* Thumbnail */}
                <View style={styles.stepRight}>
                  {step.thumbnailUri ? (
                    <Image
                      source={{ uri: step.thumbnailUri }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <Ionicons
                        name="image-outline"
                        size={32}
                        color={COLORS.textTertiary}
                      />
                    </View>
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={COLORS.textSecondary}
                    style={styles.chevron}
                  />
                </View>
              </TouchableOpacity>
            ))
          )}
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
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  stepLeft: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  stepNumber: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: '#000',
  },
  stepIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCenter: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  stepName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  stepTimestamp: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  stepRight: {
    alignItems: 'center',
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chevron: {
    marginTop: 4,
  },
});

export default TreeViewModal;
