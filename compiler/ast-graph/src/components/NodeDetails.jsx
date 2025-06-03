import React from "react";

export default function NodeDetails({ node }) {
  return (
    <aside style={{
      width: 320,
      background: "#f5f5f5",
      borderLeft: "1px solid #ddd",
      padding: 24,
      overflow: "auto"
    }}>
      <h3>Node Details</h3>
      {node ? (
        <pre style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(node, null, 2)}
        </pre>
      ) : (
        <div style={{ color: "#888" }}>Select a node to see details.</div>
      )}
    </aside>
  );
}
