const { useState, useEffect, useRef, useMemo } = React;

// --- Components ---

const StepItem = ({ step, index, isActive, onClick }) => {
    const StatusIcon = ({ status }) => {
        switch (status) {
            case 'pending':
                return (
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    </svg>
                );
            case 'processing':
                return (
                    <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                );
            case 'completed':
                return (
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'stopped':
                return (
                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                );
        }
    };

    const handleDownload = (e) => {
        e.stopPropagation();
        if (step.image_url) {
            const link = document.createElement('a');
            link.href = step.image_url;
            link.download = `step_${index}_${step.tool}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    if (step.tool === 'input') {
        return (
            <div
                className={`p-3 mb-2 rounded cursor-pointer border ${isActive ? 'border-green-500 bg-gray-800' : 'border-gray-700 bg-gray-900'} hover:bg-gray-800 transition relative group`}
                onClick={() => onClick(step.id)}
            >
                <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-green-400">Original Image</span>
                    <div className="flex items-center gap-2">
                        {step.image_url && (
                            <button
                                onClick={handleDownload}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition"
                                title="Download Image"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                        )}
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                </div>
                {step.thumbnail_url && (
                    <img src={step.thumbnail_url} alt="thumb" className="w-full h-20 object-cover mt-2 rounded" />
                )}
            </div>
        );
    }

    return (
        <div
            className={`p-3 mb-2 rounded cursor-pointer border ${isActive ? 'border-blue-500 bg-gray-800' : 'border-gray-700 bg-gray-900'} hover:bg-gray-800 transition relative group`}
            onClick={() => onClick(step.id)}
        >
            <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm">Step {index}: {step.tool}</span>
                <div className="flex items-center gap-2">
                    {step.image_url && (
                        <button
                            onClick={handleDownload}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition"
                            title="Download Image"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                    )}
                    <StatusIcon status={step.status} />
                </div>
            </div>
            <div className="text-xs text-gray-400 truncate">{step.intent}</div>
            {step.thumbnail_url && (
                <img src={step.thumbnail_url} alt="thumb" className="w-full h-20 object-cover mt-2 rounded" />
            )}
        </div>
    );
};

const VersionSelector = ({ parentId, childrenIds, currentChildId, onSelectVersion, fullTree, onRename }) => {
    const [editingId, setEditingId] = useState(null);
    const [newName, setNewName] = useState("");

    const startEditing = (id, currentName) => {
        setEditingId(id);
        setNewName(currentName);
    };

    const saveName = (id) => {
        if (newName.trim()) {
            onRename(id, newName);
        }
        setEditingId(null);
    };

    return (
        <div className="ml-4 pl-4 border-l-2 border-gray-700 my-2">
            <div className="text-xs text-gray-500 mb-1 font-bold">Select Version to Continue:</div>
            <div className="flex flex-col gap-2">
                {childrenIds.map((childId, idx) => {
                    const isSelected = childId === currentChildId;
                    const node = fullTree[childId];
                    const displayName = node.name || `Version ${idx + 1}`;
                    const toolName = node.tool;

                    return (
                        <div key={childId} className="flex items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onSelectVersion(childId); }}
                                className={`flex-1 text-left px-3 py-2 rounded text-xs font-bold transition flex justify-between items-center ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                <span>{displayName} <span className="font-normal opacity-75">({toolName})</span></span>
                            </button>
                            {editingId === childId ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="w-20 bg-gray-900 border border-gray-600 text-xs text-white px-1"
                                        autoFocus
                                        onBlur={() => saveName(childId)}
                                        onKeyDown={(e) => e.key === 'Enter' && saveName(childId)}
                                    />
                                </div>
                            ) : (
                                <button
                                    onClick={() => startEditing(childId, displayName)}
                                    className="text-gray-500 hover:text-white px-1"
                                    title="Rename Version"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const TreeGraph = ({ tree, currentPathIds, onNodeClick, onClose }) => {
    const { nodes, links, width, height } = useMemo(() => {
        if (!tree || Object.keys(tree).length === 0) return { nodes: [], links: [], width: 0, height: 0 };

        const nodeIds = Object.keys(tree);
        const rootId = nodeIds.find(id => !tree[id].parent_id);
        if (!rootId) return { nodes: [], links: [], width: 0, height: 0 };

        const levels = {};
        const positions = {};

        const getDepth = (id, depth = 0) => {
            if (!levels[depth]) levels[depth] = [];
            levels[depth].push(id);
            const children = tree[id].children_ids || [];
            children.forEach(childId => getDepth(childId, depth + 1));
        };
        getDepth(rootId);

        const levelHeight = 120; // Increased spacing
        const nodeWidth = 140;
        const nodeSpacing = 160; // Increased spacing

        let maxNodesInLevel = 0;
        Object.keys(levels).forEach(d => maxNodesInLevel = Math.max(maxNodesInLevel, levels[d].length));

        const canvasWidth = Math.max(1000, maxNodesInLevel * nodeSpacing + 100);
        const canvasHeight = Object.keys(levels).length * levelHeight + 100;

        Object.keys(levels).forEach(depth => {
            const levelNodes = levels[depth];
            const totalWidth = levelNodes.length * nodeSpacing;
            const startX = (canvasWidth - totalWidth) / 2;

            levelNodes.forEach((id, idx) => {
                positions[id] = {
                    x: startX + idx * nodeSpacing + nodeSpacing / 2,
                    y: parseInt(depth) * levelHeight + 80
                };
            });
        });

        const linkData = [];
        nodeIds.forEach(id => {
            const node = tree[id];
            if (node.parent_id && positions[node.parent_id] && positions[id]) {
                linkData.push({
                    x1: positions[node.parent_id].x,
                    y1: positions[node.parent_id].y,
                    x2: positions[id].x,
                    y2: positions[id].y,
                    isActive: currentPathIds.includes(id) && currentPathIds.includes(node.parent_id)
                });
            }
        });

        return { nodes: positions, links: linkData, width: canvasWidth, height: canvasHeight };
    }, [tree, currentPathIds]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8">
            <div className="bg-gray-900/90 border border-gray-700 rounded-xl shadow-2xl w-full h-full max-w-6xl flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                            Edit Tree
                        </h2>
                        <p className="text-xs text-gray-400">Click any node to switch to that version</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center transition"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-[#111] relative custom-scrollbar">
                    <svg width={width} height={height} className="min-w-full min-h-full">
                        <defs>
                            <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.5" />
                            </linearGradient>
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Links */}
                        {links.map((link, i) => {
                            const midY = (link.y1 + link.y2) / 2;
                            const path = `M ${link.x1} ${link.y1} C ${link.x1} ${midY}, ${link.x2} ${midY}, ${link.x2} ${link.y2}`;
                            return (
                                <path
                                    key={i}
                                    d={path}
                                    fill="none"
                                    stroke={link.isActive ? "#3B82F6" : "#333"}
                                    strokeWidth={link.isActive ? "3" : "2"}
                                    className="transition-all duration-300"
                                />
                            );
                        })}

                        {/* Nodes */}
                        {Object.keys(nodes).map(id => {
                            const isActive = currentPathIds.includes(id);
                            const isCurrent = currentPathIds[currentPathIds.length - 1] === id;
                            const node = tree[id];
                            const isRoot = !node.parent_id;

                            return (
                                <g
                                    key={id}
                                    onClick={() => { onNodeClick(id); onClose(); }}
                                    className="cursor-pointer hover:opacity-90 transition-opacity"
                                >
                                    {/* Main Node Circle */}
                                    <circle
                                        cx={nodes[id].x}
                                        cy={nodes[id].y}
                                        r={isCurrent ? 20 : 16}
                                        fill={isCurrent ? '#2563EB' : (isActive ? '#1E40AF' : '#1F2937')}
                                        stroke={isCurrent ? '#60A5FA' : (isActive ? '#3B82F6' : '#374151')}
                                        strokeWidth={isCurrent ? "3" : "2"}
                                        className="transition-all duration-300"
                                    />

                                    {/* Icon/Text inside node */}
                                    <text
                                        x={nodes[id].x}
                                        y={nodes[id].y}
                                        dy=".3em"
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="10"
                                        className="pointer-events-none select-none font-bold"
                                    >
                                        {isRoot ? "R" : (node.tool ? node.tool[0].toUpperCase() : "?")}
                                    </text>

                                    {/* Label below node */}
                                    <foreignObject x={nodes[id].x - 60} y={nodes[id].y + 25} width="120" height="60">
                                        <div className={`text-center text-[10px] px-2 py-1 rounded ${isCurrent ? 'bg-blue-900/50 text-blue-200 border border-blue-800' : 'text-gray-400'}`}>
                                            <div className="font-bold truncate">{node.tool}</div>
                                            <div className="truncate opacity-75">{node.intent}</div>
                                        </div>
                                    </foreignObject>

                                    <title>{node.tool} - {node.intent}</title>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>
        </div>
    );
};

const Sidebar = ({ steps, activeStepId, onStepClick, isProcessing, fullTree, currentPathIds, onNodeClick, onSaveMacro, onApplyMacro, onVersionSelect, onRenameNode, macros }) => {
    const [isTreeVisible, setIsTreeVisible] = useState(false);
    const [macroName, setMacroName] = useState("");
    const [showMacros, setShowMacros] = useState(false);

    const renderPath = () => {
        // ... (renderPath logic remains unchanged, I will just replace the start of the function and the return block)
        if (!steps || steps.length === 0) return null;

        const renderedItems = [];
        const renderedIds = new Set();

        // 1. Render the Active Path (History + Current)
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            renderedIds.add(step.id);

            renderedItems.push(
                <StepItem
                    key={step.id}
                    step={step}
                    index={i}
                    isActive={step.id === activeStepId}
                    onClick={onStepClick}
                />
            );

            // Check for branching at this step (Persist Selector)
            const nodeInTree = fullTree[step.id];
            if (nodeInTree && nodeInTree.children_ids && nodeInTree.children_ids.length > 1) {
                const nextStepInPath = steps[i + 1];
                const currentChildId = nextStepInPath ? nextStepInPath.id : null;

                renderedItems.push(
                    <VersionSelector
                        key={`ver-${step.id}`}
                        parentId={step.id}
                        childrenIds={nodeInTree.children_ids}
                        currentChildId={currentChildId}
                        onSelectVersion={onVersionSelect}
                        fullTree={fullTree}
                        onRename={onRenameNode}
                    />
                );
            }
        }


        // 2. Lookahead: Traverse forward from the last step if there's a single linear path
        if (steps.length > 0) {
            let currentNodeId = steps[steps.length - 1].id;
            let lookaheadNode = fullTree[currentNodeId];
            let lookaheadIndex = steps.length;

            while (lookaheadNode && lookaheadNode.children_ids && lookaheadNode.children_ids.length === 1) {
                const nextNodeId = lookaheadNode.children_ids[0];
                const nextNode = fullTree[nextNodeId];

                if (!nextNode) break;

                // Render this future step
                renderedItems.push(
                    <StepItem
                        key={nextNodeId}
                        step={{ ...nextNode, status: 'pending' }} // Visual indication it's future/pending
                        index={lookaheadIndex}
                        isActive={nextNodeId === activeStepId} // Should not be active usually, but for safety
                        onClick={onStepClick}
                    />
                );

                renderedIds.add(nextNodeId);
                currentNodeId = nextNodeId;
                lookaheadNode = nextNode;
                lookaheadIndex++;
            }

            // 3. Check for Branching at the end of our rendered path
            // Only render if we have advanced beyond the active steps (to avoid duplication with the loop)
            if (currentNodeId !== steps[steps.length - 1].id) {
                const lastRenderedNode = fullTree[currentNodeId];

                if (lastRenderedNode && lastRenderedNode.children_ids && lastRenderedNode.children_ids.length > 1) {
                    renderedItems.push(
                        <VersionSelector
                            key={`ver-${currentNodeId}`}
                            parentId={currentNodeId}
                            childrenIds={lastRenderedNode.children_ids}
                            currentChildId={null}
                            onSelectVersion={onVersionSelect}
                            fullTree={fullTree}
                            onRename={onRenameNode}
                        />
                    );
                }
            }
        }

        return renderedItems;
    };

    return (
        <div className="w-72 bg-black border-r border-gray-800 flex flex-col h-full flex-shrink-0 relative">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <span className="font-bold text-xl text-white">OmniEdit AI</span>
                <button
                    onClick={() => setIsTreeVisible(true)}
                    className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded hover:bg-blue-800"
                >
                    View Tree
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {renderPath()}
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-900">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500 font-bold">MACROS</span>
                    <button onClick={() => setShowMacros(!showMacros)} className="text-xs text-gray-400 hover:text-white">
                        {showMacros ? "Hide" : "Show"}
                    </button>
                </div>

                {showMacros && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={macroName}
                                onChange={(e) => setMacroName(e.target.value)}
                                placeholder="Save current path as..."
                                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                            />
                            <button
                                onClick={() => { if (macroName) onSaveMacro(macroName); setMacroName(""); }}
                                className="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold"
                            >
                                Save
                            </button>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                            {macros && macros.length > 0 ? (
                                macros.map((macro, idx) => (
                                    <MacroItem key={idx} macro={macro} onApply={onApplyMacro} />
                                ))
                            ) : (
                                <div className="text-xs text-gray-500 text-center py-2">No macros saved yet</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isTreeVisible && (
                <TreeGraph
                    tree={fullTree}
                    currentPathIds={currentPathIds}
                    onNodeClick={onNodeClick}
                    onClose={() => setIsTreeVisible(false)}
                />
            )}
        </div>
    );
};

const MacroItem = ({ macro, onApply }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-gray-800 rounded border border-gray-700 overflow-hidden">
            <div
                className="flex justify-between items-center p-2 cursor-pointer hover:bg-gray-700 transition"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-300">{macro.name}</span>
                    <span className="text-[10px] text-gray-500">{macro.step_count} steps</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onApply(macro.name); }}
                        className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded hover:bg-blue-800 border border-blue-800"
                    >
                        Apply
                    </button>
                    <span className="text-gray-500 text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                </div>
            </div>

            {isExpanded && (
                <div className="bg-gray-900 p-2 border-t border-gray-700">
                    <div className="space-y-1">
                        {macro.steps && macro.steps.map((step, idx) => (
                            <div key={idx} className="text-[10px] text-gray-400 flex gap-2">
                                <span className="font-bold text-blue-400 min-w-[50px]">{step.tool}</span>
                                <span className="truncate">{step.intent}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const PropertiesPanel = ({ step, index, onUpdate, onEdit, isEditing, onRefine, onContinue, isProcessing }) => {
    const [params, setParams] = useState(step ? { ...step.params } : {});
    const [refinePrompt, setRefinePrompt] = useState("");
    const [continuePrompt, setContinuePrompt] = useState("");
    const [referenceImage, setReferenceImage] = useState(null);
    const [referenceImagePath, setReferenceImagePath] = useState(null);

    useEffect(() => {
        if (step) {
            setParams({ ...step.params });
            setRefinePrompt("");
            setContinuePrompt("");
            setReferenceImage(null);
            setReferenceImagePath(null);
        }
    }, [step]);

    const handleReferenceImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("http://localhost:8000/upload", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            setReferenceImagePath(data.url);
            setReferenceImage(file.name);
        } catch (error) {
            console.error("Error uploading reference image:", error);
            alert("Failed to upload reference image");
        }
    };

    const handleChange = (key, value) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onUpdate(index, params);
    };

    const handleRefine = (mode) => {
        if (refinePrompt.trim()) {
            onRefine(step.id, refinePrompt, mode, referenceImagePath);
            setRefinePrompt("");
            setReferenceImage(null);
            setReferenceImagePath(null);
        }
    };

    const handleContinue = (mode) => {
        if (continuePrompt.trim()) {
            onContinue(step.id, continuePrompt, mode, referenceImagePath);
            setContinuePrompt("");
            setReferenceImage(null);
            setReferenceImagePath(null);
        }
    };

    if (!step) return (
        <div className="w-80 bg-gray-900 border-l border-gray-800 p-6 flex items-center justify-center text-gray-500 text-sm font-medium">
            Select a step to view properties
        </div>
    );

    const SectionHeader = ({ title, className = "mt-6" }) => (
        <div className={`text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ${className} border-b border-gray-800 pb-1`}>
            {title}
        </div>
    );

    const InputLabel = ({ label }) => (
        <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
    );

    const StyledInput = (props) => (
        <input
            {...props}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        />
    );

    const StyledTextArea = (props) => (
        <textarea
            {...props}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
        />
    );

    const ActionButton = ({ onClick, label, variant = "primary" }) => {
        const baseClasses = "flex-1 py-2 px-3 rounded text-sm font-semibold transition-all duration-200 border";
        const variants = {
            primary: "bg-blue-600 hover:bg-blue-500 text-white border-transparent shadow-sm",
            secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700",
            danger: "bg-red-900/50 hover:bg-red-900/80 text-red-200 border-red-900/50",
            success: "bg-emerald-900/50 hover:bg-emerald-900/80 text-emerald-200 border-emerald-900/50"
        };
        return (
            <button onClick={onClick} className={`${baseClasses} ${variants[variant]}`}>
                {label}
            </button>
        );
    };

    if (step.tool === 'input') {
        return (
            <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full flex-shrink-0">
                <div className="p-4 border-b border-gray-800 flex-shrink-0">
                    <h3 className="text-base font-bold text-white">Root Image</h3>
                    <p className="text-sm text-gray-500 mt-1">Original Source</p>
                </div>

                <div className="flex-1 min-h-0"></div>

                <div className="border-t border-gray-800 p-4 bg-gray-900 flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] z-10">
                    <SectionHeader title="Add Next Step" className="mt-0" />
                    <StyledTextArea
                        value={continuePrompt}
                        onChange={(e) => setContinuePrompt(e.target.value)}
                        placeholder="Describe the next transformation..."
                        rows={4}
                    />

                    <div className="mt-3">
                        <InputLabel label="Reference Image (Optional)" />
                        <div className="flex items-center gap-2">
                            <label className="cursor-pointer bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded text-xs transition-colors">
                                {referenceImage ? "Change File" : "Upload File"}
                                <input type="file" onChange={handleReferenceImageUpload} className="hidden" accept="image/*" />
                            </label>
                            {referenceImage && <span className="text-xs text-blue-400 truncate flex-1">{referenceImage}</span>}
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <ActionButton onClick={() => handleContinue('overwrite')} label="Overwrite" variant="danger" />
                        <ActionButton onClick={() => handleContinue('branch')} label="New Branch" variant="success" />
                    </div>
                </div>
            </div>
        );
    }

    const renderControls = () => {
        switch (step.tool) {
            case 'crop':
                return (
                    <div className="space-y-3">
                        {!isEditing && (
                            <ActionButton onClick={onEdit} label="Adjust Crop Box" variant="secondary" />
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div><InputLabel label="X" /><StyledInput type="number" value={params.x || 0} onChange={(e) => handleChange('x', parseInt(e.target.value))} /></div>
                            <div><InputLabel label="Y" /><StyledInput type="number" value={params.y || 0} onChange={(e) => handleChange('y', parseInt(e.target.value))} /></div>
                            <div><InputLabel label="Width" /><StyledInput type="number" value={params.w || 100} onChange={(e) => handleChange('w', parseInt(e.target.value))} /></div>
                            <div><InputLabel label="Height" /><StyledInput type="number" value={params.h || 100} onChange={(e) => handleChange('h', parseInt(e.target.value))} /></div>
                        </div>
                    </div>
                );
            case 'rotate':
                return (
                    <div>
                        <div className="flex justify-between mb-1">
                            <InputLabel label="Angle" />
                            <span className="text-xs text-gray-400">{params.angle || 0}°</span>
                        </div>
                        <input
                            type="range" min="-180" max="180"
                            value={params.angle || 0}
                            onChange={(e) => handleChange('angle', parseFloat(e.target.value))}
                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                );
            case 'brightness':
            case 'contrast':
            case 'saturation':
            case 'sharpness':
                return (
                    <div>
                        <div className="flex justify-between mb-1">
                            <InputLabel label="Factor" />
                            <span className="text-xs text-gray-400">{params.factor !== undefined ? params.factor : 1.0}</span>
                        </div>
                        <input
                            type="range" min="0" max="2" step="0.1"
                            value={params.factor !== undefined ? params.factor : 1.0}
                            onChange={(e) => handleChange('factor', parseFloat(e.target.value))}
                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                );
            case 'filter':
                return (
                    <div>
                        <InputLabel label="Filter Type" />
                        <select
                            value={params.type || 'contrast'}
                            onChange={(e) => handleChange('type', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                        >
                            <option value="contrast">Contrast</option>
                            <option value="sepia">Sepia</option>
                            <option value="grayscale">Grayscale</option>
                            <option value="cyberpunk">Cyberpunk</option>
                        </select>
                    </div>
                );
            case 'overlay':
                return (
                    <div>
                        <InputLabel label="Overlay Type" />
                        <select
                            value={params.type || 'rain'}
                            onChange={(e) => handleChange('type', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                        >
                            <option value="rain">Rain</option>
                            <option value="sun">Sun</option>
                            <option value="snow">Snow</option>
                        </select>
                    </div>
                );
            default:
                return (
                    <StyledTextArea
                        value={JSON.stringify(params, null, 2)}
                        onChange={(e) => {
                            try { setParams(JSON.parse(e.target.value)); } catch (err) { }
                        }}
                        rows={6}
                        className="font-mono text-xs text-green-400"
                    />
                );
        }
    };

    return (
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full flex-shrink-0">
            <div className="p-4 border-b border-gray-800 flex-shrink-0">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-base font-bold text-white uppercase tracking-wide">Step {index + 1}</h3>
                        <p className="text-sm text-blue-400 font-mono mt-0.5">{step.tool}</p>
                    </div>
                </div>
                <p className="text-sm text-gray-500 mt-2 italic line-clamp-2">"{step.intent}"</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
                <SectionHeader title="Parameters" className="mt-0" />
                {renderControls()}
                <div className="mt-4">
                    <ActionButton onClick={handleSave} label="Update Parameters" variant="primary" />
                </div>
            </div>

            <div className="border-t border-gray-800 p-4 bg-gray-900 flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] z-10">
                <SectionHeader title="Refine with AI" className="mt-0" />
                <StyledTextArea
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    placeholder="E.g., 'Make it more intense'..."
                    rows={3}
                />
                <div className="mt-3">
                    <InputLabel label="Reference Image (Optional)" />
                    <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded text-xs transition-colors">
                            {referenceImage ? "Change File" : "Upload File"}
                            <input type="file" onChange={handleReferenceImageUpload} className="hidden" accept="image/*" />
                        </label>
                        {referenceImage && <span className="text-xs text-blue-400 truncate flex-1">{referenceImage}</span>}
                    </div>
                </div>
                <div className="flex gap-2 mt-3">
                    <ActionButton onClick={() => handleRefine('overwrite')} label="Update Current" variant="danger" />
                    <ActionButton onClick={() => handleRefine('branch')} label="New Branch" variant="success" />
                </div>

                <SectionHeader title="Add Next Step" />
                <StyledTextArea
                    value={continuePrompt}
                    onChange={(e) => setContinuePrompt(e.target.value)}
                    placeholder="E.g., 'Add a rain effect'..."
                    rows={3}
                />
                <div className="mt-3">
                    <InputLabel label="Reference Image (Optional)" />
                    <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded text-xs transition-colors">
                            {referenceImage ? "Change File" : "Upload File"}
                            <input type="file" onChange={handleReferenceImageUpload} className="hidden" accept="image/*" />
                        </label>
                        {referenceImage && <span className="text-xs text-blue-400 truncate flex-1">{referenceImage}</span>}
                    </div>
                </div>
                <div className="flex gap-2 mt-3 mb-4">
                    <ActionButton onClick={() => handleContinue('overwrite')} label="Overwrite" variant="danger" />
                    <ActionButton onClick={() => handleContinue('branch')} label="New Branch" variant="success" />
                </div>
            </div>
        </div>
    );
};

const Toolbar = ({ onUpload, onStart, isProcessing, prompt, setPrompt, onStop, onReferenceUpload, referenceImageName }) => {
    return (
        <div className="h-24 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-4 flex-shrink-0">
            {/* Left: Main Image Upload */}
            <div className="flex flex-col w-48 flex-shrink-0 border-r border-gray-800 pr-4">
                <label className="text-[10px] text-gray-500 mb-1 font-bold">MAIN IMAGE</label>
                <input
                    type="file"
                    onChange={onUpload}
                    className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
            </div>

            {/* Center: Prompt & Reference Image */}
            <div className="flex-1 flex flex-col gap-2 justify-center">
                {/* Top: Prompt Bar */}
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isProcessing) {
                            onStart();
                        }
                    }}
                    placeholder="Describe your edits... (e.g., 'Make it cyberpunk', 'Crop to face')"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                />

                {/* Bottom: Reference Image Option */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-bold">REFERENCE IMAGE (OPTIONAL):</span>
                    <label className="cursor-pointer bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition">
                        <span>{referenceImageName ? "Change File" : "Upload File"}</span>
                        <input type="file" onChange={onReferenceUpload} className="hidden" accept="image/*" />
                    </label>
                    {referenceImageName && (
                        <span className="text-[10px] text-blue-400 truncate max-w-[200px] bg-blue-900/30 px-2 py-0.5 rounded">
                            {referenceImageName}
                        </span>
                    )}
                </div>
            </div>

            {/* Right: Action Button */}
            <div className="w-32 flex-shrink-0 flex justify-end pl-4 border-l border-gray-800">
                {!isProcessing ? (
                    <button
                        onClick={onStart}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition shadow-lg shadow-blue-900/20 flex items-center justify-center"
                    >
                        Start
                    </button>
                ) : (
                    <button
                        onClick={onStop}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition shadow-lg shadow-red-900/20 flex items-center justify-center"
                    >
                        Stop
                    </button>
                )}
            </div>
        </div>
    );
};

const Canvas = ({ imageUrl, activeStep, onCropUpdate, isEditing }) => {
    const canvasRef = useRef(null);
    const fabricRef = useRef(null);
    const imageRef = useRef(null);
    const cropRectRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current && !fabricRef.current) {
            fabricRef.current = new fabric.Canvas(canvasRef.current, {
                backgroundColor: '#222',
                width: 800,
                height: 600
            });
        }
    }, []);

    useEffect(() => {
        if (fabricRef.current && imageUrl) {
            fabric.Image.fromURL(imageUrl, (img) => {
                fabricRef.current.clear();
                fabricRef.current.setBackgroundColor('#222', fabricRef.current.renderAll.bind(fabricRef.current));

                const canvasWidth = fabricRef.current.width;
                const canvasHeight = fabricRef.current.height;
                const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);

                img.set({
                    scaleX: scale,
                    scaleY: scale,
                    originX: 'center',
                    originY: 'center',
                    left: canvasWidth / 2,
                    top: canvasHeight / 2,
                    selectable: false
                });

                imageRef.current = img;
                fabricRef.current.add(img);

                if (activeStep && activeStep.tool === 'crop' && isEditing) {
                    addCropRect(activeStep.params, img, scale);
                }

                fabricRef.current.renderAll();
            });
        }
    }, [imageUrl, activeStep, isEditing]);

    const addCropRect = (params, img, scale) => {
        if (cropRectRef.current) {
            fabricRef.current.remove(cropRectRef.current);
        }

        const imgLeft = img.left - (img.width * scale) / 2;
        const imgTop = img.top - (img.height * scale) / 2;

        const rect = new fabric.Rect({
            left: imgLeft + (params.x || 0) * scale,
            top: imgTop + (params.y || 0) * scale,
            width: (params.w || 100) * scale,
            height: (params.h || 100) * scale,
            fill: 'rgba(255, 255, 255, 0.3)',
            stroke: 'white',
            strokeWidth: 2,
            cornerColor: 'white',
            cornerSize: 10,
            transparentCorners: false,
            hasRotatingPoint: false
        });

        rect.on('modified', () => {
            const newX = (rect.left - imgLeft) / scale;
            const newY = (rect.top - imgTop) / scale;
            const newW = (rect.width * rect.scaleX) / scale;
            const newH = (rect.height * rect.scaleY) / scale;

            onCropUpdate({
                x: Math.max(0, Math.round(newX)),
                y: Math.max(0, Math.round(newY)),
                w: Math.round(newW),
                h: Math.round(newH)
            });
        });

        cropRectRef.current = rect;
        fabricRef.current.add(rect);
        fabricRef.current.setActiveObject(rect);
    };

    return (
        <div className="flex-1 bg-gray-800 flex items-center justify-center overflow-hidden relative">
            <canvas ref={canvasRef} />
        </div>
    );
};

// --- Main App ---


const App = () => {
    const [sessionId] = useState(() => "session_" + Math.random().toString(36).substr(2, 9));
    const [socket, setSocket] = useState(null);
    const [steps, setSteps] = useState([]);
    const [fullTree, setFullTree] = useState({});
    const [currentNodeId, setCurrentNodeId] = useState(null);
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [prompt, setPrompt] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const [uploadedImagePath, setUploadedImagePath] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [macros, setMacros] = useState([]);
    const [mainReferenceImage, setMainReferenceImage] = useState(null);
    const [mainReferenceImagePath, setMainReferenceImagePath] = useState(null);

    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);

        ws.onopen = () => {
            console.log("Connected to WebSocket");
            // Request macros on connect
            ws.send(JSON.stringify({ action: "get_macros", session_id: sessionId }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };

        setSocket(ws);

        return () => ws.close();
    }, [sessionId]);

    const handleWebSocketMessage = (data) => {
        console.log("WS Message:", data);
        if (data.event === "path_update") {
            setSteps(data.path);
            setFullTree(data.tree || {});
            setCurrentNodeId(data.current_node_id);
            setActiveStepIndex(data.path.length - 1);

            const lastNode = data.path[data.path.length - 1];
            if (lastNode && lastNode.image_url) {
                setCurrentImage(lastNode.image_url);
            }
            setIsProcessing(false);

        } else if (data.event === "step_start") {
            setIsProcessing(true);
        } else if (data.event === "error") {
            alert("Error: " + data.message);
            setIsProcessing(false);
        } else if (data.event === "macro_saved") {
            alert(`Macro "${data.name}" saved with ${data.steps} steps!`);
        } else if (data.event === "macro_list") {
            setMacros(data.macros);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await fetch("http://localhost:8000/upload", { method: "POST", body: formData });
            const data = await res.json();
            setUploadedImagePath(data.url);
            setCurrentImage(data.url);
            setSteps([]);
        } catch (err) { console.error("Upload failed", err); }
    };

    const handleStart = () => {
        if (!uploadedImagePath) {
            alert("Please upload an image first");
            return;
        }
        if (!prompt) {
            alert("Please enter a prompt");
            return;
        }

        setIsProcessing(true); // Immediate UI update

        socket.send(JSON.stringify({
            action: "start_processing",
            session_id: sessionId,
            prompt: prompt,
            image_path: uploadedImagePath,
            reference_image_path: mainReferenceImagePath // Pass reference image
        }));
    };

    const handleMainReferenceUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("http://localhost:8000/upload", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            setMainReferenceImagePath(data.url);
            setMainReferenceImage(file.name);
        } catch (error) {
            console.error("Error uploading reference image:", error);
            alert("Failed to upload reference image");
        }
    };

    const handleContinue = (parentNodeId, newPrompt, mode, referenceImagePath) => {
        if (!socket || !parentNodeId) return;
        setIsProcessing(true); // Immediate UI update
        socket.send(JSON.stringify({
            action: "continue_processing",
            session_id: sessionId,
            parent_node_id: parentNodeId,
            prompt: newPrompt,
            mode: mode,
            reference_image_path: referenceImagePath
        }));
    };

    const handleStepUpdate = (index, newParams) => {
        if (!socket) return;
        setIsEditing(false);
        socket.send(JSON.stringify({
            action: "update_step",
            session_id: sessionId,
            step_index: index,
            params: newParams
        }));
    };

    const handleRefine = (nodeId, refinePrompt, mode, referenceImagePath) => {
        if (!socket) return;
        setIsEditing(false);
        setIsProcessing(true); // Immediate UI update
        socket.send(JSON.stringify({
            action: "refine_step",
            session_id: sessionId,
            node_id: nodeId,
            prompt: refinePrompt,
            global_goal: prompt,
            mode: mode,
            reference_image_path: referenceImagePath
        }));
    };

    const handleStepClick = (nodeId) => {
        handleNodeClick(nodeId);
    };

    const handleNodeClick = (nodeId) => {
        if (!socket) return;
        socket.send(JSON.stringify({
            action: "switch_node",
            session_id: sessionId,
            node_id: nodeId
        }));
    };

    const handleCropUpdate = (newParams) => {
        setSteps(prev => prev.map((s, i) => i === activeStepIndex ? { ...s, params: { ...s.params, ...newParams } } : s));
    };

    const handleEditMode = () => {
        setIsEditing(true);
        if (activeStepIndex > 0) {
            setCurrentImage(steps[activeStepIndex - 1].image_url);
        } else if (activeStepIndex === 0) {
            setCurrentImage(uploadedImagePath);
        }
    };

    const handleSaveMacro = (name) => {
        if (!socket || !currentNodeId) return;
        socket.send(JSON.stringify({
            action: "save_macro",
            session_id: sessionId,
            name: name,
            node_id: currentNodeId
        }));
    };

    const handleApplyMacro = (name) => {
        if (!socket || !currentNodeId) return;
        socket.send(JSON.stringify({
            action: "apply_macro",
            session_id: sessionId,
            name: name,
            target_node_id: currentNodeId
        }));
    };

    const handleRenameNode = (nodeId, newName) => {
        if (!socket) return;
        socket.send(JSON.stringify({
            action: "rename_node",
            session_id: sessionId,
            node_id: nodeId,
            new_name: newName
        }));
    };

    const handleVersionSelect = (selectedNodeId) => {
        let targetId = selectedNodeId;
        let currentNode = fullTree[selectedNodeId];

        while (currentNode && currentNode.children_ids && currentNode.children_ids.length === 1) {
            targetId = currentNode.children_ids[0];
            currentNode = fullTree[targetId];
        }
        handleNodeClick(targetId);
    };

    const handleStop = () => {
        if (!socket) return;
        socket.send(JSON.stringify({
            action: "stop_processing",
            session_id: sessionId
        }));
    };

    const currentPathIds = steps.map(s => s.id);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-black text-white font-sans">
            <Sidebar
                steps={steps}
                activeStepId={currentNodeId}
                onStepClick={handleStepClick}
                isProcessing={isProcessing}
                fullTree={fullTree}
                currentPathIds={currentPathIds}
                onNodeClick={handleNodeClick}
                onSaveMacro={handleSaveMacro}
                onApplyMacro={handleApplyMacro}
                onVersionSelect={handleVersionSelect}
                onRenameNode={handleRenameNode}
                macros={macros}
            />
            <div className="flex-1 flex flex-col min-w-0">
                <Toolbar
                    onUpload={handleUpload}
                    onStart={handleStart}
                    onStop={handleStop}
                    isProcessing={isProcessing}
                    prompt={prompt}
                    setPrompt={setPrompt}
                    onReferenceUpload={handleMainReferenceUpload}
                    referenceImageName={mainReferenceImage}
                />
                <Canvas
                    imageUrl={currentImage}
                    activeStep={steps[activeStepIndex]}
                    onCropUpdate={handleCropUpdate}
                    isEditing={isEditing}
                />
            </div>
            <PropertiesPanel
                step={steps[activeStepIndex]}
                index={activeStepIndex}
                onUpdate={handleStepUpdate}
                onEdit={handleEditMode}
                isEditing={isEditing}
                onRefine={handleRefine}
                onContinue={handleContinue}
                isProcessing={isProcessing}
            />
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
