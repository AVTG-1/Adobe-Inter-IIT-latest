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
 * Create a sample tree with multiple branches for demonstration
 */
export function createSampleBranchedTree(rootImageUrl: string): TreeStructure {
  const now = Date.now();

  return {
    'node-root': {
      id: 'node-root',
      tool: 'input',
      image_url: rootImageUrl,
      parent_id: null,
      children_ids: ['node-1', 'node-2', 'node-3'],
      intent: 'Original image',
      icon: 'image-outline',
      params: {},
      timestamp: now,
    },
    // Branch 1: Brightness path
    'node-1': {
      id: 'node-1',
      tool: 'brightness',
      image_url: rootImageUrl,
      parent_id: 'node-root',
      children_ids: ['node-4', 'node-5'],
      intent: 'Increased brightness',
      icon: 'sunny-outline',
      params: { value: 20 },
      timestamp: now + 1000,
    },
    'node-4': {
      id: 'node-4',
      tool: 'contrast',
      image_url: rootImageUrl,
      parent_id: 'node-1',
      children_ids: ['node-8'],
      intent: 'Enhanced contrast',
      icon: 'contrast-outline',
      params: { value: 15 },
      timestamp: now + 2000,
    },
    'node-8': {
      id: 'node-8',
      tool: 'saturation',
      image_url: rootImageUrl,
      parent_id: 'node-4',
      children_ids: [],
      intent: 'Boosted saturation',
      icon: 'color-palette-outline',
      params: { value: 10 },
      timestamp: now + 3000,
    },
    'node-5': {
      id: 'node-5',
      tool: 'filter',
      image_url: rootImageUrl,
      parent_id: 'node-1',
      children_ids: ['node-9'],
      intent: 'Applied vintage filter',
      icon: 'color-filter-outline',
      params: { filter: 'vintage' },
      timestamp: now + 2500,
    },
    'node-9': {
      id: 'node-9',
      tool: 'draw',
      image_url: rootImageUrl,
      parent_id: 'node-5',
      children_ids: [],
      intent: 'Added drawing',
      icon: 'pencil-outline',
      params: { tool: 'brush', color: '#FF0000' },
      timestamp: now + 3500,
    },
    // Branch 2: Crop path
    'node-2': {
      id: 'node-2',
      tool: 'crop',
      image_url: rootImageUrl,
      parent_id: 'node-root',
      children_ids: ['node-6'],
      intent: 'Cropped to focus',
      icon: 'crop-outline',
      params: { x: 0, y: 0, width: 800, height: 600 },
      timestamp: now + 1200,
    },
    'node-6': {
      id: 'node-6',
      tool: 'rotate',
      image_url: rootImageUrl,
      parent_id: 'node-2',
      children_ids: ['node-10'],
      intent: 'Rotated 90 degrees',
      icon: 'reload-outline',
      params: { degrees: 90 },
      timestamp: now + 2200,
    },
    'node-10': {
      id: 'node-10',
      tool: 'hue',
      image_url: rootImageUrl,
      parent_id: 'node-6',
      children_ids: [],
      intent: 'Adjusted hue',
      icon: 'color-wand-outline',
      params: { value: 30 },
      timestamp: now + 3200,
    },
    // Branch 3: Filter path
    'node-3': {
      id: 'node-3',
      tool: 'filter',
      image_url: rootImageUrl,
      parent_id: 'node-root',
      children_ids: ['node-7'],
      intent: 'Applied dramatic filter',
      icon: 'color-filter-outline',
      params: { filter: 'dramatic' },
      timestamp: now + 1500,
    },
    'node-7': {
      id: 'node-7',
      tool: 'blur',
      image_url: rootImageUrl,
      parent_id: 'node-3',
      children_ids: [],
      intent: 'Applied background blur',
      icon: 'ellipse-outline',
      params: { radius: 10 },
      timestamp: now + 2500,
    },
  };
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
