import { useState, useEffect, useCallback } from 'react';
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

function App() {
  const [ast, setAst] = useState(null);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    fetch('/ast.json')
      .then(res => res.json())
      .then(data => setAst(transformASTtoTree(data)));
  }, []);

  const handleNodeClick = useCallback((nodeData) => {
    setSelected(nodeData);
    setDrawerOpen(true);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: drawerOpen ? 2 : 1, minWidth: 0, height: '100vh', position: 'relative', transition: 'flex 0.3s' }}>
        {ast && (
          <Tree
            data={ast}
            orientation="vertical"
            collapsible
            onNodeClick={handleNodeClick}
            translate={{ x: 400, y: 100 }}
            zoomable
            dimensions={{ width: '100%', height: '100%' }}
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            styles={{
              nodes: {
                node: { circle: { fill: '#1976d2' }, name: { fontWeight: 'bold' } },
                leafNode: { circle: { fill: '#43a047' } }
              }
            }}
          />
        )}
      </div>
      <div style={{
        flex: drawerOpen ? 1 : '0 0 32px',
        padding: drawerOpen ? 16 : 0,
        background: '#f5f5f5',
        borderLeft: '1px solid #ddd',
        overflow: 'auto',
        minWidth: drawerOpen ? 200 : 32,
        maxWidth: drawerOpen ? 500 : 32,
        transition: 'all 0.3s',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
      }}>
        <button
          onClick={() => setDrawerOpen((open) => !open)}
          style={{
            position: 'absolute',
            left: -16,
            top: 16,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid #bbb',
            background: '#fff',
            cursor: 'pointer',
            zIndex: 2,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
          }}
          title={drawerOpen ? 'Collapse details' : 'Expand details'}
        >
          {drawerOpen ? '<' : '>'}
        </button>
        {drawerOpen && (
          <>
            <h2 style={{ marginTop: 0 }}>Node Details</h2>
            {selected ? (
              <pre style={{ fontSize: 14 }}>{JSON.stringify(selected, null, 2)}</pre>
            ) : (
              <p>Select a node to see details.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
