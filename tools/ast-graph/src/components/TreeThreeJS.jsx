import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { v4 as uuidv4 } from 'uuid';

// Helper: Convert AST to nodes/links for 3D rendering
function astToGraph(ast) {
  const nodes = [];
  const links = [];
  const isNode = (obj) => obj && typeof obj === "object" && typeof obj.type === "string";
  function traverse(node, depth = 0, siblingIdx = 0, parentId = null) {
    if (!isNode(node)) return null;
    const nodeId = uuidv4();
    nodes.push({
      id: nodeId,
      label: node.type,
      depth,
      siblingIdx,
      position: [siblingIdx * 3, -depth * 3, 0],
      raw: node,
    });
    if (parentId) {
      links.push({ source: parentId, target: nodeId });
    }
    let childIdx = 0;
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) {
        v.forEach((child) => {
          if (isNode(child)) {
            traverse(child, depth + 1, childIdx, nodeId);
            childIdx++;
          }
        });
      } else if (isNode(v)) {
        traverse(v, depth + 1, childIdx, nodeId);
        childIdx++;
      }
    }
    return nodeId;
  }
  if (isNode(ast)) traverse(ast, 0, 0, null);
  return { nodes, links };
}

function NodeSphere({ position, label, onClick, selected }) {
  return (
    <group position={position}>
      <mesh onClick={onClick}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={selected ? "#ff9800" : "#4f8cff"} />
      </mesh>
      <Html center style={{ pointerEvents: "none", fontSize: 14, color: selected ? "#ff9800" : "#4f8cff" }}>
        {label}
      </Html>
    </group>
  );
}

function LinkLine({ source, target }) {
  const points = useMemo(
    () => [
      new THREE.Vector3(...source),
      new THREE.Vector3(...target),
    ],
    [source, target]
  );
  return (
    <line>
      <bufferGeometry setFromPoints={points} />
      <lineBasicMaterial color="#888" linewidth={2} />
    </line>
  );
}

export default function TreeThreeJS({ ast, onNodeSelect }) {
  const [selected, setSelected] = React.useState(null);
  const { nodes, links } = useMemo(() => astToGraph(ast), [ast]);
  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Canvas camera={{ position: [0, 0, 20], fov: 50 }} style={{ background: "#181c20" }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 10]} intensity={0.7} />
        <OrbitControls />
        {links.map((link, i) =>
          nodeMap[link.source] && nodeMap[link.target] ? (
            <LinkLine key={i} source={nodeMap[link.source].position} target={nodeMap[link.target].position} />
          ) : null
        )}
        {nodes.map((node) => (
          <NodeSphere
            key={node.id}
            position={node.position}
            label={node.label}
            selected={selected === node.id}
            onClick={() => {
              setSelected(node.id);
              if (onNodeSelect) onNodeSelect(node);
            }}
          />
        ))}
      </Canvas>
    </div>
  );
}
