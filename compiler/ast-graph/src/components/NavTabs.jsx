import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function NavTabs() {
  const location = useLocation();
  return (
    <nav style={{ display: "flex", gap: 16, padding: 16, borderBottom: "1px solid #eee" }}>
      <Link to="/d3" style={{ fontWeight: location.pathname === "/d3" ? "bold" : "normal" }}>D3 Tree</Link>
      <Link to="/cytoscape" style={{ fontWeight: location.pathname === "/cytoscape" ? "bold" : "normal" }}>Cytoscape</Link>
      <Link to="/3d-force" style={{ fontWeight: location.pathname === "/3d-force" ? "bold" : "normal" }}>3D Force Graph</Link>
      <Link to="/sigmajs" style={{ fontWeight: location.pathname === "/sigmajs" ? "bold" : "normal" }}>Sigma.js</Link>
      <Link to="/threejs" style={{ fontWeight: location.pathname === "/threejs" ? "bold" : "normal" }}>Three.js</Link>
      <Link to="/reactflow" style={{ fontWeight: location.pathname === "/reactflow" ? "bold" : "normal" }}>React Flow</Link>
    </nav>
  );
}
