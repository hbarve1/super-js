import React, { useMemo, useCallback } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";

// --- AST to React Flow nodes/edges ---
function astToReactFlow(ast) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();

  const isNode = obj => obj && typeof obj === "object" && typeof obj.type === "string";

  // Use a grid layout for better spacing
  let yLevelMap = {};
  function traverse(node, id, parentId, depth = 0, siblingIdx = 0) {
    if (!isNode(node) || nodeIds.has(id)) return;
    // Calculate position: x by sibling index, y by depth
    const xSpacing = 220;
    const ySpacing = 120;
    if (!yLevelMap[depth]) yLevelMap[depth] = 0;
    const x = siblingIdx * xSpacing;
    const y = depth * ySpacing;
    nodes.push({
      id,
      data: { label: node.type },
      position: { x, y },
      type: "default"
    });
    nodeIds.add(id);
    if (parentId && parentId !== id && nodeIds.has(parentId)) {
      edges.push({ id: `${parentId}->${id}`, source: parentId, target: id });
    }
    // Traverse children, keep sibling index for spacing
    let childIdx = 0;
    for (const [k, v] of Object.entries(node)) {
      if (Array.isArray(v)) {
        v.forEach((child) => {
          if (isNode(child)) {
            traverse(child, `${id}-${k}-${childIdx}`, id, depth + 1, childIdx);
            childIdx++;
          }
        });
      } else if (isNode(v)) {
        traverse(v, `${id}-${k}`, id, depth + 1, childIdx);
        childIdx++;
      }
    }
  }

  if (isNode(ast)) traverse(ast, "root", null, 0, 0);
  return { nodes, edges };
}

export default function TreeReactFlow({ ast, onNodeSelect }) {
  const { nodes, edges } = useMemo(() => astToReactFlow(ast), [ast]);

  const handleNodeClick = useCallback((_, node) => {
    if (onNodeSelect) onNodeSelect(node.data);
  }, [onNodeSelect]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <MiniMap />
        <Controls />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  );
}
