import React, { useMemo, useCallback } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";
import { v4 as uuidv4 } from 'uuid';
import dagre from 'dagre';

// --- AST to React Flow nodes/edges ---
function astToReactFlow(ast) {
  const nodes = [];
  const edges = [];
  const nodeMap = new Map(); // Map from object reference to UUID

  // Helper to assign/get UUID for each node
  function getNodeUUID(node) {
    if (!node || typeof node !== 'object') return undefined;
    if (!nodeMap.has(node)) {
      nodeMap.set(node, uuidv4());
    }
    return nodeMap.get(node);
  }

  // Traverse and build nodes/edges (no manual position)
  function traverse(node, parentId = null) {
    if (node && typeof node === 'object' && node.type) {
      const uuid = getNodeUUID(node);
      const label = node.type;
      nodes.push({
        id: uuid,
        data: { label, uuid },
        type: 'default',
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
      if (parentId) {
        edges.push({
          id: `${parentId}->${uuid}`,
          source: parentId,
          target: uuid,
          animated: true,
          style: { stroke: '#4f8cff', strokeWidth: 2 },
          type: 'smoothstep',
        });
      }
      for (const v of Object.values(node)) {
        if (Array.isArray(v)) {
          v.forEach((child) => {
            traverse(child, uuid);
          });
        } else {
          traverse(v, uuid);
        }
      }
    } else if (Array.isArray(node)) {
      node.forEach((child) => {
        traverse(child, parentId);
      });
    } else if (typeof node === 'object' && node !== null) {
      for (const v of Object.values(node)) {
        traverse(v, parentId);
      }
    }
    // Primitives: do nothing
  }

  if (ast) traverse(ast, null);

  // Layout with dagre
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB' });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 120, height: 40 });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });
  dagre.layout(g);
  nodes.forEach((node) => {
    const pos = g.node(node.id);
    node.position = { x: pos.x, y: pos.y };
    node.targetPosition = 'top';
    node.sourcePosition = 'bottom';
  });

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
    console.log("React Flow nodes:", nodes.length, "edges:", edges.length);
    // console.log("React Flow nodes:", nodes.map(n => [n.data.id, n.data.label]).join(', '));
    // console.log("React Flow edges:", edges.map(e => `${e.source} -> ${e.target}`).join(', '));
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
