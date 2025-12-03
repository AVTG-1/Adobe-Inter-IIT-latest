/**
 * Tree View Modal - Visual Tree Navigation
 *
 * Shows editing history as a tree structure with branching support
 * Tap any node to load that image and open corresponding panel
 */

import React, { useMemo } from 'react';
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
import { TreeStructure, TreeNode, getRootNode, getChildren, getNodeDepth } from '../types/treeNode';

interface TreeViewModalProps {
  visible: boolean;
  tree: TreeStructure;
  currentImageUri: string;
  onClose: () => void;
  onNodeTap: (node: TreeNode) => void;
}

interface TreeNodeComponentProps {
  node: TreeNode;
  tree: TreeStructure;
  depth: number;
  isLast: boolean;
  onNodeTap: (node: TreeNode) => void;
}

const TreeNodeComponent: React.FC<TreeNodeComponentProps> = ({
  node,
  tree,
  depth,
  isLast,
  onNodeTap,
}) => {
  const children = getChildren(tree, node.id);
  const hasChildren = children.length > 0;

  return (
    <View style={styles.treeNodeContainer}>
      {/* Node Card */}
      <View style={styles.nodeRow}>
        {/* Indentation based on depth */}
        {depth > 0 && (
          <View style={styles.indentationContainer}>
            {Array.from({ length: depth }).map((_, i) => (
              <View key={i} style={styles.indentationLine} />
            ))}
          </View>
        )}

        {/* Connection Line */}
        {depth > 0 && (
          <View style={styles.connectionLine}>
            <View style={styles.horizontalLine} />
            <View style={[styles.verticalLine, isLast && styles.verticalLineShort]} />
          </View>
        )}

        {/* Node Content */}
        <TouchableOpacity
          style={[
            styles.nodeCard,
            node.tool === 'input' && styles.rootNodeCard,
          ]}
          onPress={() => onNodeTap(node)}
          activeOpacity={0.7}
        >
          {/* Left: Icon */}
          <View style={[
            styles.nodeIconContainer,
            node.tool === 'input' && styles.rootNodeIconContainer,
          ]}>
            <Ionicons
              name={node.icon as any}
              size={node.tool === 'input' ? 28 : 24}
              color={node.tool === 'input' ? COLORS.primary : COLORS.textPrimary}
            />
          </View>

          {/* Center: Info */}
          <View style={styles.nodeInfo}>
            <Text style={styles.nodeIntent} numberOfLines={2}>
              {node.intent}
            </Text>
            <Text style={styles.nodeTool}>
              {node.tool === 'input' ? 'Original' : node.tool}
            </Text>
          </View>

          {/* Right: Thumbnail */}
          <View style={styles.nodeThumbnail}>
            {node.image_url ? (
              <Image
                source={{ uri: node.image_url }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Ionicons name="image-outline" size={24} color={COLORS.textTertiary} />
              </View>
            )}
          </View>

          {/* Chevron */}
          <Ionicons
            name="chevron-forward"
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Render Children Recursively */}
      {hasChildren && (
        <View style={styles.childrenContainer}>
          {children.map((child, index) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              tree={tree}
              depth={depth + 1}
              isLast={index === children.length - 1}
              onNodeTap={onNodeTap}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const TreeViewModal: React.FC<TreeViewModalProps> = ({
  visible,
  tree,
  currentImageUri,
  onClose,
  onNodeTap,
}) => {
  const rootNode = useMemo(() => getRootNode(tree), [tree]);
  const totalNodes = useMemo(() => Object.keys(tree).length, [tree]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Edit Tree</Text>
            <Text style={styles.headerSubtitle}>{totalNodes} nodes</Text>
          </View>

          <View style={styles.closeButton} />
        </View>

        {/* Tree Structure */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {rootNode ? (
            <TreeNodeComponent
              node={rootNode}
              tree={tree}
              depth={0}
              isLast={true}
              onNodeTap={onNodeTap}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="git-branch-outline" size={64} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>No editing history</Text>
              <Text style={styles.emptySubtext}>
                Execute AI prompts to build your editing tree
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIcon, { backgroundColor: 'rgba(0, 217, 255, 0.2)' }]}>
              <Ionicons name="image-outline" size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.legendText}>Root (Original)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIcon, { backgroundColor: COLORS.card }]}>
              <Ionicons name="color-wand-outline" size={16} color={COLORS.textPrimary} />
            </View>
            <Text style={styles.legendText}>Editing Steps</Text>
          </View>
        </View>
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
  treeNodeContainer: {
    marginBottom: 0,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  indentationContainer: {
    flexDirection: 'row',
    marginRight: SPACING.xs,
  },
  indentationLine: {
    width: 24,
    height: 1,
  },
  connectionLine: {
    width: 24,
    height: '100%',
    position: 'relative',
    marginRight: SPACING.xs,
  },
  horizontalLine: {
    position: 'absolute',
    top: 32,
    left: 0,
    width: 24,
    height: 2,
    backgroundColor: COLORS.border,
  },
  verticalLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 2,
    height: '100%',
    backgroundColor: COLORS.border,
  },
  verticalLineShort: {
    height: 32,
  },
  nodeCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  rootNodeCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
  },
  nodeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  rootNodeIconContainer: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  nodeInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  nodeIntent: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  nodeTool: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  nodeThumbnail: {
    marginRight: SPACING.sm,
  },
  thumbnailImage: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  childrenContainer: {
    marginLeft: 0,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});

export default TreeViewModal;
