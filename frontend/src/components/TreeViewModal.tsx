/**
 * Tree View Modal - Horizontal Multi-Branch Tree Visualization
 *
 * Shows editing history as a horizontal tree with multiple branches
 * Scrollable in both directions, attached to top
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';
import { TreeStructure, TreeNode, getRootNode, getChildren } from '../types/treeNode';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const NODE_WIDTH = 180;
const NODE_HEIGHT = 100;
const HORIZONTAL_SPACING = 120;
const VERTICAL_SPACING = 40;

interface TreeViewModalProps {
  visible: boolean;
  tree: TreeStructure;
  currentImageUri: string;
  currentNodeId?: string;
  onClose: () => void;
  onNodeTap: (node: TreeNode) => void;
}

interface NodePosition {
  x: number;
  y: number;
  node: TreeNode;
}

/**
 * Calculate positions for all nodes in the tree
 */
function calculateNodePositions(tree: TreeStructure, rootNode: TreeNode): NodePosition[] {
  const positions: NodePosition[] = [];
  const levelHeights: Map<number, number> = new Map();

  function traverse(node: TreeNode, level: number, startY: number): number {
    const children = getChildren(tree, node.id);
    const x = level * (NODE_WIDTH + HORIZONTAL_SPACING);

    if (children.length === 0) {
      // Leaf node
      positions.push({ x, y: startY, node });
      return startY + NODE_HEIGHT + VERTICAL_SPACING;
    }

    // Calculate positions for all children first
    let childY = startY;
    const childPositions: number[] = [];
    children.forEach((child) => {
      const childStartY = childY;
      childPositions.push(childStartY);
      childY = traverse(child, level + 1, childStartY);
    });

    // Position parent node at the center of its children
    const firstChildY = childPositions[0];
    const lastChildY = childY - NODE_HEIGHT - VERTICAL_SPACING;
    const parentY = (firstChildY + lastChildY) / 2;

    positions.push({ x, y: parentY, node });

    return childY;
  }

  traverse(rootNode, 0, 0);
  return positions;
}

/**
 * Single node component
 */
const TreeNodeCard: React.FC<{
  node: TreeNode;
  position: NodePosition;
  isRoot: boolean;
  isOnPath: boolean;
  onTap: (node: TreeNode) => void;
}> = ({ node, position, isRoot, isOnPath, onTap }) => {
  // Format timestamp as time elapsed
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = Math.abs(now - timestamp);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.nodeCard,
        {
          left: position.x,
          top: position.y,
        },
        isRoot && styles.rootNodeCard,
        isOnPath && styles.pathNodeCard,
      ]}
      onPress={() => onTap(node)}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={[
        styles.nodeIcon,
        isRoot && styles.rootNodeIcon,
        isOnPath && styles.pathNodeIcon,
      ]}>
        <Ionicons
          name={node.icon as any}
          size={isRoot ? 32 : 24}
          color={isRoot ? COLORS.primary : isOnPath ? COLORS.primary : COLORS.textPrimary}
        />
      </View>

      {/* Content */}
      <View style={styles.nodeContent}>
        <Text style={[styles.nodeIntent, isRoot && styles.rootNodeText]} numberOfLines={2}>
          {node.intent}
        </Text>
        <View style={styles.nodeFooter}>
          <Text style={styles.nodeTool}>
            {node.tool === 'input' ? 'Original' : node.tool}
          </Text>
          <Text style={styles.nodeTime}>{formatTime(node.timestamp)}</Text>
        </View>
      </View>

      {/* Thumbnail */}
      {node.image_url && (
        <Image
          source={{ uri: node.image_url }}
          style={styles.nodeThumbnail}
          resizeMode="cover"
        />
      )}

      {/* Highlight indicator for root */}
      {isRoot && (
        <View style={styles.rootIndicator}>
          <Ionicons name="star" size={16} color={COLORS.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

/**
 * Connection line component
 */
const ConnectionLine: React.FC<{
  from: NodePosition;
  to: NodePosition;
  isOnPath: boolean;
}> = ({ from, to, isOnPath }) => {
  const startX = from.x + NODE_WIDTH;
  const startY = from.y + NODE_HEIGHT / 2;
  const endX = to.x;
  const endY = to.y + NODE_HEIGHT / 2;

  const horizontalLineWidth = endX - startX;
  const verticalLineHeight = Math.abs(endY - startY);

  return (
    <View style={styles.connectionContainer}>
      {/* Horizontal line from parent */}
      <View
        style={[
          styles.horizontalConnection,
          {
            left: startX,
            top: startY,
            width: horizontalLineWidth / 2,
          },
          isOnPath && styles.pathConnection,
        ]}
      />

      {/* Vertical line */}
      {verticalLineHeight > 0 && (
        <View
          style={[
            styles.verticalConnection,
            {
              left: startX + horizontalLineWidth / 2,
              top: Math.min(startY, endY),
              height: verticalLineHeight,
            },
            isOnPath && styles.pathConnection,
          ]}
        />
      )}

      {/* Horizontal line to child */}
      <View
        style={[
          styles.horizontalConnection,
          {
            left: startX + horizontalLineWidth / 2,
            top: endY,
            width: horizontalLineWidth / 2,
          },
          isOnPath && styles.pathConnection,
        ]}
      />
    </View>
  );
};

const TreeViewModal: React.FC<TreeViewModalProps> = ({
  visible,
  tree,
  currentImageUri,
  currentNodeId,
  onClose,
  onNodeTap,
}) => {
  const rootNode = useMemo(() => getRootNode(tree), [tree]);
  const totalNodes = useMemo(() => Object.keys(tree).length, [tree]);

  // Calculate all node positions
  const nodePositions = useMemo(() => {
    if (!rootNode) return [];
    return calculateNodePositions(tree, rootNode);
  }, [tree, rootNode]);

  // Calculate content dimensions
  const contentWidth = useMemo(() => {
    if (nodePositions.length === 0) return SCREEN_WIDTH;
    const maxX = Math.max(...nodePositions.map(p => p.x));
    return maxX + NODE_WIDTH + 100;
  }, [nodePositions]);

  const contentHeight = useMemo(() => {
    if (nodePositions.length === 0) return SCREEN_HEIGHT;
    const maxY = Math.max(...nodePositions.map(p => p.y));
    return Math.max(maxY + NODE_HEIGHT + 100, SCREEN_HEIGHT - 200);
  }, [nodePositions]);

  // Get path from root to current node for highlighting
  const pathNodeIds = useMemo(() => {
    if (!currentNodeId) return new Set<string>(['node-root']);

    const path = new Set<string>();
    let currentId: string | null = currentNodeId;

    while (currentId) {
      path.add(currentId);
      const node: TreeNode | undefined = tree[currentId];
      if (!node) break;
      currentId = node.parent_id;
    }

    return path;
  }, [currentNodeId, tree]);

  // Create connection lines
  const connections = useMemo(() => {
    const lines: { from: NodePosition; to: NodePosition; isOnPath: boolean }[] = [];

    nodePositions.forEach((pos) => {
      const children = getChildren(tree, pos.node.id);
      children.forEach((child) => {
        const childPos = nodePositions.find(p => p.node.id === child.id);
        if (childPos) {
          const isOnPath = pathNodeIds.has(pos.node.id) && pathNodeIds.has(child.id);
          lines.push({ from: pos, to: childPos, isOnPath });
        }
      });
    });

    return lines;
  }, [nodePositions, tree, pathNodeIds]);

  if (!rootNode) {
    return (
      <Modal visible={visible} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Tree</Text>
            <View style={styles.closeButton} />
          </View>
          <View style={styles.emptyState}>
            <Ionicons name="git-branch-outline" size={64} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>No editing history</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={styles.container}>
        {/* Header - Fixed at top */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Edit Tree</Text>
            <Text style={styles.headerSubtitle}>{totalNodes} nodes • Multi-branch</Text>
          </View>

          <View style={styles.closeButton} />
        </View>

        {/* Tree Canvas - Scrollable both ways */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ width: contentWidth }}
        >
          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ height: contentHeight }}
          >
            <View style={[styles.treeCanvas, { width: contentWidth, height: contentHeight }]}>
              {/* Connection lines */}
              {connections.map((conn, index) => (
                <ConnectionLine
                  key={`conn-${index}`}
                  from={conn.from}
                  to={conn.to}
                  isOnPath={conn.isOnPath}
                />
              ))}

              {/* Nodes */}
              {nodePositions.map((pos) => (
                <TreeNodeCard
                  key={pos.node.id}
                  node={pos.node}
                  position={pos}
                  isRoot={pos.node.id === 'node-root'}
                  isOnPath={pathNodeIds.has(pos.node.id)}
                  onTap={onNodeTap}
                />
              ))}
            </View>
          </ScrollView>
        </ScrollView>

        {/* Legend - Fixed at bottom */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.legendText}>Root Node</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(0, 217, 255, 0.3)' }]} />
            <Text style={styles.legendText}>Active Path</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.border }]} />
            <Text style={styles.legendText}>Other Branches</Text>
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
  },
  treeCanvas: {
    position: 'relative',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  connectionContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  horizontalConnection: {
    position: 'absolute',
    height: 2,
    backgroundColor: COLORS.border,
  },
  verticalConnection: {
    position: 'absolute',
    width: 2,
    backgroundColor: COLORS.border,
  },
  pathConnection: {
    backgroundColor: COLORS.primary,
    height: 3,
    width: 3,
  },
  nodeCard: {
    position: 'absolute',
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rootNodeCard: {
    borderColor: COLORS.primary,
    borderWidth: 3,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  pathNodeCard: {
    borderColor: 'rgba(0, 217, 255, 0.5)',
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
  },
  nodeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  rootNodeIcon: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  pathNodeIcon: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
  },
  nodeContent: {
    flex: 1,
  },
  nodeIntent: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  rootNodeText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  nodeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nodeTool: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  nodeTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  nodeThumbnail: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rootIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});

export default TreeViewModal;
