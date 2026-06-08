import React, { useMemo, useCallback } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";
import { v4 as uuidv4 } from 'uuid';
import dagre from 'dagre';

// --- AST to React Flow nodes/edges ---
function getNodeUUID(node, nodeMap) {
  if (!node || typeof node !== 'object') return undefined;
  if (!nodeMap.has(node)) {
    nodeMap.set(node, uuidv4());
  }
  return nodeMap.get(node);
}

function traverseAST(node, parentId, nodes, edges, nodeMap) {
  if (node && typeof node === 'object' && node.type) {
    const uuid = getNodeUUID(node, nodeMap);
    const label = node.type;
    // Only add node if not already present (avoid duplicates)
    if (!nodes.some(n => n.id === uuid)) {
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
    }
    if (parentId && parentId !== uuid) {
      // Only add edge if not already present (avoid duplicates)
      const edgeId = `${parentId}->${uuid}`;
      if (!edges.some(e => e.id === edgeId)) {
        edges.push({
          id: edgeId,
          source: parentId,
          target: uuid,
          // animated: true,
          // style: { stroke: '#4f8cff', strokeWidth: 2 },
          // type: 'smoothstep',
        });
      }
    }
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) {
        v.forEach((child) => {
          traverseAST(child, uuid, nodes, edges, nodeMap);
        });
      } else {
        traverseAST(v, uuid, nodes, edges, nodeMap);
      }
    }
  } else if (Array.isArray(node)) {
    node.forEach((child) => {
      traverseAST(child, parentId, nodes, edges, nodeMap);
    });
  } else if (typeof node === 'object' && node !== null) {
    for (const v of Object.values(node)) {
      traverseAST(v, parentId, nodes, edges, nodeMap);
    }
  }
  // Primitives: do nothing
}

function layoutWithDagre(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB' });

  nodes.forEach((node) => {
    g.setNode(String(node.id), { width: 120, height: 40 });
  });
  edges.forEach((edge) => {
    g.setEdge(String(edge.source), String(edge.target));
  });
  dagre.layout(g);
  nodes.forEach((node) => {
    const pos = g.node(String(node.id));
    node.position = { x: pos.x, y: pos.y };
    node.targetPosition = 'top';
    node.sourcePosition = 'bottom';
    node.id = String(node.id);
  });
  // --- FIX: React Flow expects edges to have source/target handles as undefined or 'default' ---
  // Also filter out edges with missing nodes
  const nodeIds = new Set(nodes.map(n => n.id));
  const validEdges = edges.filter(edge => {
    const valid = nodeIds.has(String(edge.source)) && nodeIds.has(String(edge.target));
    if (!valid) {
      // eslint-disable-next-line no-console
      console.warn('Dropping invalid edge:', edge);
    }
    edge.source = String(edge.source);
    edge.target = String(edge.target);
    edge.id = String(edge.id);
    edge.sourceHandle = null;
    edge.targetHandle = null;
    return valid;
  });
  return { nodes, edges: validEdges };
}

function astToReactFlow(ast) {
  const nodes = [];
  const edges = [];
  const nodeMap = new Map();
  if (ast) traverseAST(ast, null, nodes, edges, nodeMap);
  return layoutWithDagre(nodes, edges);
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
  console.log({nodes, edges});

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
