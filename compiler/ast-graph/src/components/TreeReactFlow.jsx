import React, { useMemo, useCallback } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";

// --- AST to React Flow nodes/edges ---
function astToReactFlow(ast) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();

  const isNode = obj => obj && typeof obj === "object" && typeof obj.type === "string";

  function addNode(node, id) {
    nodes.push({
      id,
      data: { label: node.type },
      position: { x: Math.random() * 800, y: Math.random() * 600 },
      type: "default"
    });
    nodeIds.add(id);
  }

  function addEdge(parentId, id) {
    edges.push({ id: `${parentId}->${id}`, source: parentId, target: id });
  }

  function traverse(node, id, parentId) {
    if (!isNode(node) || nodeIds.has(id)) return;
    addNode(node, id);
    if (parentId && parentId !== id && nodeIds.has(parentId)) {
      addEdge(parentId, id);
    }
    for (const [k, v] of Object.entries(node)) {
      if (Array.isArray(v)) {
        v.forEach((child, i) => {
          if (isNode(child)) traverse(child, `${id}-${k}-${i}`, id);
        });
      } else if (isNode(v)) {
        traverse(v, `${id}-${k}`, id);
      }
    }
  }

  if (isNode(ast)) traverse(ast, "root", null);
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
