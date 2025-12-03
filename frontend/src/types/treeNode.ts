/**
 * Tree Node Data Structure for Editing History
 *
 * Supports branching paths and multiple editing routes
 */

export interface TreeNode {
  id: string;
  tool: string;
  image_url: string;
  parent_id: string | null;
  children_ids: string[];
  intent: string;
  icon: string;
  params: any;
  timestamp: number;
}

export interface TreeStructure {
  [nodeId: string]: TreeNode;
}

/**
 * Convert flat executed steps array to tree structure
 */
export function buildTreeStructure(executedSteps: any[], rootImageUrl: string): TreeStructure {
  const tree: TreeStructure = {};

  // Create root node (original image)
  const rootNode: TreeNode = {
    id: 'node-root',
    tool: 'input',
    image_url: rootImageUrl,
    parent_id: null,
    children_ids: executedSteps.length > 0 ? [`node-${executedSteps[0].id}`] : [],
    intent: 'Original image',
    icon: 'image-outline',
    params: {},
    timestamp: Date.now(),
  };

  tree['node-root'] = rootNode;

  // Convert each step to a tree node
  executedSteps.forEach((step, index) => {
    const nodeId = `node-${step.id}`;
    const parentId = index === 0 ? 'node-root' : `node-${executedSteps[index - 1].id}`;
    const childrenIds = index < executedSteps.length - 1 ? [`node-${executedSteps[index + 1].id}`] : [];

    const node: TreeNode = {
      id: nodeId,
      tool: step.actionId,
      image_url: step.thumbnailUri || rootImageUrl,
      parent_id: parentId,
      children_ids: childrenIds,
      intent: step.description,
      icon: step.icon,
      params: step.params,
      timestamp: step.timestamp,
    };

    tree[nodeId] = node;
  });

  return tree;
}

/**
 * Get root node from tree structure
 */
export function getRootNode(tree: TreeStructure): TreeNode | null {
  return tree['node-root'] || null;
}

/**
 * Get node by ID
 */
export function getNode(tree: TreeStructure, nodeId: string): TreeNode | null {
  return tree[nodeId] || null;
}

/**
 * Get children nodes of a node
 */
export function getChildren(tree: TreeStructure, nodeId: string): TreeNode[] {
  const node = tree[nodeId];
  if (!node) return [];

  return node.children_ids
    .map(childId => tree[childId])
    .filter(child => child !== undefined);
}

/**
 * Get depth of a node (distance from root)
 */
export function getNodeDepth(tree: TreeStructure, nodeId: string): number {
  let depth = 0;
  let currentId: string | null = nodeId;

  while (currentId) {
    const node: TreeNode | undefined = tree[currentId];
    if (!node || node.parent_id === null) break;
    depth++;
    currentId = node.parent_id;
  }

  return depth;
}

/**
 * Get all leaf nodes (nodes with no children)
 */
export function getLeafNodes(tree: TreeStructure): TreeNode[] {
  return Object.values(tree).filter(node => node.children_ids.length === 0 && node.id !== 'node-root');
}

/**
 * Add a new child node to a parent
 */
export function addChildNode(
  tree: TreeStructure,
  parentId: string,
  childNode: Omit<TreeNode, 'id' | 'parent_id' | 'children_ids'>
): TreeStructure {
  const newTree = { ...tree };
  const parent = newTree[parentId];

  if (!parent) return tree;

  const childId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const fullChildNode: TreeNode = {
    ...childNode,
    id: childId,
    parent_id: parentId,
    children_ids: [],
  };

  newTree[childId] = fullChildNode;
  parent.children_ids.push(childId);

  return newTree;
}
