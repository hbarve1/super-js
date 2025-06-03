import React, { useMemo, useCallback } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";

// --- AST to React Flow nodes/edges ---
function astToReactFlow(ast) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();

  // Use a grid layout for better spacing and center nodes
  function traverse(node, id, parentId, depth = 0, siblingIdx = 0, siblingsCount = 1) {
    if (nodeIds.has(id)) return;
    const xSpacing = 220;
    const ySpacing = 120;
    const x = (siblingIdx - (siblingsCount - 1) / 2) * xSpacing;
    const y = depth * ySpacing;
    // Label: show type if present, else value/primitive/array/object
    let label = node && node.type ? node.type : Array.isArray(node) ? 'Array' : typeof node === 'object' && node !== null ? 'Object' : String(node);
    if (typeof node !== 'object' || node === null) label = String(node);
    nodes.push({
      id,
      data: { label },
      position: { x, y },
      type: "default",
      style: {
        border: '2px solid #4f8cff',
        borderRadius: 8,
        background: '#fff',
        color: '#222',
        fontWeight: 600,
        boxShadow: '0 2px 8px #0002',
        padding: 8,
      },
    });
    nodeIds.add(id);
    if (parentId && parentId !== id && nodeIds.has(parentId)) {
      edges.push({
        id: `${parentId}->${id}`,
        source: parentId,
        target: id,
        animated: true,
        style: { stroke: '#4f8cff', strokeWidth: 2 },
        type: 'smoothstep',
      });
    }
    let children = [];
    if (Array.isArray(node)) {
      node.forEach((child, idx) => {
        const childId = `${id}-${idx}`;
        children.push([child, childId]);
      });
    } else if (
      typeof node === 'object' &&
      node !== null &&
      Object.prototype.toString.call(node) === '[object Object]'
    ) {
      for (const [k, v] of Object.entries(node)) {
        const childId = `${id}-${k}`;
        children.push([v, childId]);
      }
    }
    // Only traverse children if node is array or plain object
    if (children.length > 0) {
      children.forEach(([child, childId], idx) => {
        traverse(child, childId, id, depth + 1, idx, children.length);
      });
    }
  }

  if (ast) traverse(ast, "root", null, 0, 0, 1);
  return { nodes, edges };
}

// Custom node for better appearance
function CustomNode({ data }) {
  return (
    <div style={{
      border: '2px solid #4f8cff',
      borderRadius: 8,
      background: '#fff',
      color: '#222',
      fontWeight: 600,
      boxShadow: '0 2px 8px #0002',
      padding: 8,
      minWidth: 80,
      textAlign: 'center',
    }}>{data.label}</div>
  );
}

const nodeTypes = { custom: CustomNode };

export default function TreeReactFlow({ ast, onNodeSelect }) {
  const { nodes, edges } = useMemo(() => {
    // Use custom node type for all nodes and set draggable: true
    const { nodes, edges } = astToReactFlow(ast);
    return {
      nodes: nodes.map(n => ({ ...n, type: 'custom', draggable: true })),
      edges,
    };
  }, [ast]);

  const handleNodeClick = useCallback((_, node) => {
    if (onNodeSelect) onNodeSelect(node.data);
  }, [onNodeSelect]);

  return (
    <div style={{ height: "100%", width: "100%", background: '#f6faff' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        panOnScroll
        zoomOnScroll
        defaultEdgeOptions={{ type: 'smoothstep' }}
        // Remove nodesDraggable prop, use 'draggable' on each node
      >
        <MiniMap nodeColor={() => '#4f8cff'} nodeStrokeWidth={2} maskColor="#e3f0ff" />
        <Controls showInteractive={false} />
        <Background color="#e3f0ff" gap={16} />
      </ReactFlow>
    </div>
  );
}
