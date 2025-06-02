import { useState, useEffect, useCallback, useRef } from 'react';
import Tree from 'react-d3-tree';
import './App.css';

function transformASTtoTree(ast) {
  // Recursively convert AST to react-d3-tree format
  if (!ast) return null;
  if (Array.isArray(ast)) {
    return ast.map(transformASTtoTree);
  }
  const node = {
    name: ast.type || 'Node',
    attributes: Object.fromEntries(
      Object.entries(ast)
        .filter(([k, v]) => k !== 'type' && typeof v !== 'object')
    ),
    children: Object.entries(ast)
      .filter(([, v]) => typeof v === 'object' && v !== null)
      .flatMap(([k, v]) => {
        if (Array.isArray(v)) {
          return v.map(child => ({ ...transformASTtoTree(child), name: `${k}` }));
        } else {
          return [{ ...transformASTtoTree(v), name: `${k}` }];
        }
      })
      .filter(Boolean)
  };
  return node;
}

function Drawer({ open, onToggle, children }) {
  return (
    <div
      style={{
        flex: open ? 1 : '0 0 40px',
        background: '#f5f5f5',
        borderLeft: '1px solid #ddd',
        overflow: 'auto',
        minWidth: open ? 260 : 40,
        maxWidth: open ? 420 : 40,
        transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        boxShadow: open ? '-2px 0 8px 0 rgba(0,0,0,0.04)' : 'none',
        zIndex: 1,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          left: -16,
          top: 24,
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '1px solid #bbb',
          background: '#fff',
          cursor: 'pointer',
          zIndex: 2,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}
        title={open ? 'Collapse details' : 'Expand details'}
        aria-label={open ? 'Collapse details' : 'Expand details'}
      >
        {open ? <span>&#x25C0;</span> : <span>&#x25B6;</span>}
      </button>
      {open && <div style={{ padding: 24, flex: 1 }}>{children}</div>}
    </div>
  );
}

function NodeDetails({ node }) {
  if (!node) return <p style={{ color: '#888' }}>Select a node to see details.</p>;
  return (
    <>
      <h2 style={{ marginTop: 0, fontSize: 20, color: '#1976d2' }}>Node Details</h2>
      <pre style={{ fontSize: 14, background: '#fff', borderRadius: 6, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {JSON.stringify(node, null, 2)}
      </pre>
    </>
  );
}

function App() {
  const [ast, setAst] = useState(null);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const treeContainerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 400, y: 100 });

  useEffect(() => {
    fetch('/ast.json')
      .then(res => res.json())
      .then(data => setAst(transformASTtoTree(data)));
  }, []);

  // Center tree on mount
  useEffect(() => {
    if (treeContainerRef.current) {
      const { width } = treeContainerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 80 });
    }
  }, [drawerOpen, ast]);

  const handleNodeClick = useCallback((nodeData) => {
    setSelected(nodeData);
    setDrawerOpen(true);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f2f5' }}>
      <div
        ref={treeContainerRef}
        style={{
          flex: drawerOpen ? 2 : 1,
          minWidth: 0,
          height: '100vh',
          position: 'relative',
          transition: 'flex 0.3s cubic-bezier(.4,0,.2,1)',
          background: '#fff',
          boxShadow: '2px 0 8px 0 rgba(0,0,0,0.03)',
        }}
      >
        {ast && (
          <Tree
            data={ast}
            orientation="vertical"
            collapsible
            onNodeClick={handleNodeClick}
            translate={translate}
            zoomable
            dimensions={{ width: '100%', height: '100%' }}
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            styles={{
              nodes: {
                node: { circle: { fill: '#1976d2', r: 14 }, name: { fontWeight: 'bold', fontSize: 16 } },
                leafNode: { circle: { fill: '#43a047', r: 12 } }
              },
              links: {
                link: { stroke: '#bbb', strokeWidth: 2 }
              }
            }}
          />
        )}
      </div>
      <Drawer open={drawerOpen} onToggle={() => setDrawerOpen((open) => !open)}>
        <NodeDetails node={selected} />
      </Drawer>
    </div>
  );
}

export default App;
