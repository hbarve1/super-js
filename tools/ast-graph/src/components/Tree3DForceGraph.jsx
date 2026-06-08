import React, { useRef, useEffect } from "react";
import ForceGraph3D from "react-force-graph-3d";

// AST to force-graph format: only objects with 'type' become nodes, links only between valid nodes
function astToForceGraph(ast) {
  const nodes = [];
  const links = [];
  const nodeIds = new Set();
  const linkSpecs = [];

  const isNode = obj => obj && typeof obj === "object" && typeof obj.type === "string";

  // Collect all nodes and their IDs
  function collectNodes(node, id) {
    if (!isNode(node) || nodeIds.has(id)) return;
    nodes.push({
      id,
      label: node.type,
      ...Object.fromEntries(Object.entries(node).filter(([k, v]) => k !== "type" && typeof v !== "object"))
    });
    nodeIds.add(id);
    for (const [k, v] of Object.entries(node)) {
      if (Array.isArray(v)) {
        v.forEach((child, i) => {
          if (isNode(child)) collectNodes(child, `${id}-${k}-${i}`);
        });
      } else if (isNode(v)) {
        collectNodes(v, `${id}-${k}`);
      }
    }
  }

  // Collect all links, only if both nodes exist
  function collectLinks(node, id, parentId) {
    if (!isNode(node) || !nodeIds.has(id)) return;
    if (parentId && parentId !== id && nodeIds.has(parentId) && nodeIds.has(id)) {
      linkSpecs.push({ source: parentId, target: id });
    }
    for (const [k, v] of Object.entries(node)) {
      if (Array.isArray(v)) {
        v.forEach((child, i) => {
          if (!isNode(child)) return; // skip non-nodes
          const childId = `${id}-${k}-${i}`;
          if (nodeIds.has(childId)) {
            collectLinks(child, childId, id);
          }
        });
      } else if (isNode(v)) {
        const childId = `${id}-${k}`;
        if (nodeIds.has(childId)) {
          collectLinks(v, childId, id);
        }
      }
    }
  }

  if (isNode(ast)) {
    collectNodes(ast, "root");
    collectLinks(ast, "root", null);
  }
  linkSpecs.forEach(link => {
    if (nodeIds.has(link.source) && nodeIds.has(link.target)) links.push(link);
  });
  return { nodes, links };
}

export default function Tree3DForceGraph({ ast, onNodeSelect }) {
  const fgRef = useRef();
  const { nodes, links } = ast ? astToForceGraph(ast) : { nodes: [], links: [] };

  useEffect(() => {
    if (fgRef.current) fgRef.current.zoomToFit(400);
  }, [ast]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={{ nodes, links }}
        nodeLabel={node => node.label}
        nodeAutoColorBy="label"
        onNodeClick={node => onNodeSelect && onNodeSelect(node)}
        backgroundColor="#181c20"
        linkColor={() => "#888"}
        nodeThreeObjectExtend={true}
      />
    </div>
  );
}
