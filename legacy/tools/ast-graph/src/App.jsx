import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavTabs from "./components/NavTabs";
import NodeDetails from "./components/NodeDetails";
import TreeD3 from "./components/TreeD3";
import TreeCytoscape from "./components/TreeCytoscape";
import Tree3DForceGraph from "./components/Tree3DForceGraph";
import TreeSigmaJS from "./components/TreeSigmaJS";
import TreeThreeJS from "./components/TreeThreeJS";
import TreeReactFlow from "./components/TreeReactFlow";
import "./App.css";

function App() {
  const [ast, setAst] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    fetch("/ast.json")
      .then((res) => res.json())
      .then(setAst);
  }, []);

  if (!ast) return <div>Loading AST...</div>;

  return (
    <Router>
      <NavTabs />
      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Routes>
            <Route path="/d3" element={
              <TreeD3 ast={ast} onNodeSelect={setSelectedNode} />
            } />
            <Route path="/cytoscape" element={
              <TreeCytoscape ast={ast} onNodeSelect={setSelectedNode} />
            } />
            <Route path="/3d-force" element={
              <Tree3DForceGraph ast={ast} onNodeSelect={setSelectedNode} />
            } />
            <Route path="/sigmajs" element={
              <TreeSigmaJS ast={ast} onNodeSelect={setSelectedNode} />
            } />
            <Route path="/threejs" element={
              <TreeThreeJS ast={ast} onNodeSelect={setSelectedNode} />
            } />
            <Route path="/reactflow" element={
              <TreeReactFlow ast={ast} onNodeSelect={setSelectedNode} />
            } />
            <Route path="*" element={<div>Select a visualization from above.</div>} />
          </Routes>
        </div>
        {/* <NodeDetails node={selectedNode} /> */}
      </div>
    </Router>
  );
}

export default App;
