import React, { useMemo, useCallback } from "react";
import { SigmaContainer, useLoadGraph, useRegisterEvents } from "react-sigma-v2";
import Graph from "graphology";
import "react-sigma-v2/lib/react-sigma-v2.css";

// Helper: Convert AST to Graphology graph
function astToGraphology(ast) {
  const graph = new Graph();
  const isNode = obj => obj && typeof obj === "object" && typeof obj.type === "string";

  function traverse(node, id, parentId) {
    if (!isNode(node) || graph.hasNode(id)) return;
    graph.addNode(id, {
      label: node.type,
      color: "#4f8cff",
      size: 10
    });
    if (parentId && parentId !== id && graph.hasNode(parentId)) {
      graph.addEdge(parentId, id);
    }
    let childIdx = 0;
    for (const [k, v] of Object.entries(node)) {
      if (Array.isArray(v)) {
        v.forEach((child) => {
          if (isNode(child)) {
            traverse(child, `${id}-${k}-${childIdx}`, id);
            childIdx++;
          }
        });
      } else if (isNode(v)) {
        traverse(v, `${id}-${k}`, id);
        childIdx++;
      }
    }
  }
  if (isNode(ast)) traverse(ast, "root", null);
  return graph;
}

function SigmaGraph({ ast, onNodeSelect }) {
  const graph = useMemo(() => astToGraphology(ast), [ast]);
  useLoadGraph(graph);
  useRegisterEvents({
    clickNode: useCallback((e) => {
      if (onNodeSelect) onNodeSelect(graph.getNodeAttributes(e.node));
    }, [onNodeSelect, graph])
  });
  // Debug: log node/edge count
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("SigmaJS graph nodes:", graph.order, "edges:", graph.size);
    if (graph.order > 0) {
      for (const node of graph.nodes()) {
        // eslint-disable-next-line no-console
        console.log("Node:", node, graph.getNodeAttributes(node));
      }
    }
  }, [graph]);
  // Add a fallback message if the graph is empty
  if (graph.order === 0) {
    return <div style={{ color: '#888', padding: 32 }}>No AST nodes to display.</div>;
  }
  return null;
}

export default function TreeSigmaJS({ ast, onNodeSelect }) {
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <SigmaContainer style={{ height: "100%", width: "100%" }}>
        <SigmaGraph ast={ast} onNodeSelect={onNodeSelect} />
      </SigmaContainer>
    </div>
  );
}
