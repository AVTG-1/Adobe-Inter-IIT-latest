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
 * Get the appropriate icon for a tool based on its name
 */
export function getIconForTool(tool: string): string {
  const iconMap: { [key: string]: string } = {
    // Root/Input
    'input': 'image-outline',

    // Basic Adjustments
    'brightness': 'bulb-outline',
    'contrast': 'contrast-outline',
    'exposure': 'sunny-outline',

    // Color Adjustments
    'saturation': 'water-outline',
    'vibrance': 'color-palette-outline',
    'temperature': 'thermometer-outline',
    'tint': 'color-filter-outline',
    'hue': 'prism-outline',

    // Tone Adjustments
    'shadows': 'moon-outline',
    'highlights': 'sunny-outline',
    'whites': 'ellipse-outline',
    'blacks': 'square-outline',

    // Detail Adjustments
    'sharpness': 'diamond-outline',
    'clarity': 'eye-outline',
    'dehaze': 'cloud-outline',
    'grain': 'apps-outline',

    // Effects
    'vignette': 'scan-outline',
    'fade': 'layers-outline',
    'blur': 'water-outline',
    'sharpen': 'diamond-outline',

    // Tools
    'crop': 'crop-outline',
    'rotate': 'refresh-outline',
    'resize': 'resize-outline',
    'flip': 'swap-horizontal-outline',

    // Drawing & Text
    'draw': 'pencil-outline',
    'brush': 'brush-outline',
    'text': 'text-outline',
    'shape': 'square-outline',
    'eraser': 'remove-circle-outline',

    // Filters & Effects
    'filter': 'color-filter-outline',
    'curve': 'options-outline',

    // AI Features
    'ai': 'sparkles-outline',
    'remove-background': 'cut-outline',
    'enhance': 'star-outline',

    // Default
    'default': 'ellipse-outline',
  };

  return iconMap[tool.toLowerCase()] || iconMap['default'];
}

/**
 * Convert flat executed steps array to tree structure
 */
export function buildTreeStructure(executedSteps: any[], rootImageUrl: string): TreeStructure {
  const tree: TreeStructure = {};

  console.log("building tree structure with received steps: ", executedSteps)

  // Create root node (original image)
  // const rootNode: TreeNode = {
  //   id: 'node-root',
  //   tool: 'input',
  //   image_url: rootImageUrl,
  //   parent_id: null,
  //   children_ids: executedSteps.length > 0 ? [`node-${executedSteps[0].id}`] : [],
  //   intent: 'Original image',
  //   icon: getIconForTool('input'),
  //   params: {},
  //   timestamp: Date.now(),
  // };

  // tree['node-root'] = rootNode;

  // Convert each step to a tree node
  executedSteps.forEach((step, index) => {
    const nodeId = index === 0 ? 'node-root' : `node-${step.id}`;
    const parentId = index === 1 ? 'node-root' : `node-${executedSteps[index].raw.parent_id}`;
    const nonAppendedChildrenIds = executedSteps[index].raw.children_ids;

    const childrenIds = nonAppendedChildrenIds.map((childId: string) => `node-${childId}`);
    const node: TreeNode = {
      id: nodeId,
      tool: step.actionId,
      image_url: step.thumbnailUri || rootImageUrl,
      parent_id: parentId,
      children_ids: childrenIds,
      intent: step.description,
      icon: getIconForTool(step.actionId),  // Use tool-based icon mapping
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
      icon: getIconForTool('input'),
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
      icon: getIconForTool('brightness'),
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
      icon: getIconForTool('contrast'),
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
      icon: getIconForTool('saturation'),
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
      icon: getIconForTool('filter'),
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
      icon: getIconForTool('draw'),
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
      icon: getIconForTool('crop'),
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
      icon: getIconForTool('rotate'),
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
      icon: getIconForTool('hue'),
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
      icon: getIconForTool('filter'),
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
      icon: getIconForTool('blur'),
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
