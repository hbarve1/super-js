import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";

// --- REWRITE: robust two-pass AST to Cytoscape conversion ---
function astToCytoscapeElements(ast) {
  if (!ast) return { nodes: [], edges: [] };
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();

  // First pass: collect all nodes
  function collectNodes(node, id) {
    if (!node || nodeIds.has(id)) return;
    nodes.push({
      data: {
        id,
        label: node.type || "Node",
        ...Object.fromEntries(
          Object.entries(node).filter(([k, v]) => k !== "type" && typeof v !== "object")
        ),
      },
    });
    nodeIds.add(id);
    Object.entries(node)
      .filter(([, v]) => typeof v === "object" && v !== null)
      .forEach(([k, v]) => {
        if (Array.isArray(v)) {
          v.forEach((child, i) => {
            collectNodes(child, `${id}-${k}-${i}`);
          });
        } else {
          collectNodes(v, `${id}-${k}`);
        }
      });
  }

  // Second pass: collect all edges (only if both nodes exist)
  function collectEdges(node, id, parentId) {
    if (!node || !nodeIds.has(id)) return;
    if (parentId && nodeIds.has(parentId) && parentId !== id) {
      edges.push({ data: { source: parentId, target: id } });
    }
    Object.entries(node)
      .filter(([, v]) => typeof v === "object" && v !== null)
      .forEach(([k, v]) => {
        if (Array.isArray(v)) {
          v.forEach((child, i) => {
            collectEdges(child, `${id}-${k}-${i}`, id);
          });
        } else {
          collectEdges(v, `${id}-${k}`, id);
        }
      });
  }

  collectNodes(ast, "root");
  collectEdges(ast, "root", null);
  return { nodes, edges };
}

export default function TreeCytoscape({ ast, onNodeSelect }) {
  const cyRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!ast || !containerRef.current) return;
    if (cyRef.current) {
      cyRef.current.destroy();
    }
    const { nodes, edges } = astToCytoscapeElements(ast);
    const elements = [...nodes, ...edges];
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "background-color": "#1976d2",
            color: "#fff",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": 12,
            width: 32,
            height: 32,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#bbb",
            "target-arrow-color": "#bbb",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
      ],
      layout: { name: "breadthfirst", directed: true, padding: 40 },
      boxSelectionEnabled: false,
      autoungrabify: true,
    });
    cyRef.current.on("tap", "node", (evt) => {
      const node = evt.target.data();
      onNodeSelect && onNodeSelect(node);
    });
    // Clean up
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [ast, onNodeSelect]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", background: "#fff" }} />
  );
}
