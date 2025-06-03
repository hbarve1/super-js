import React, { useRef, useEffect } from "react";
import Tree from "react-d3-tree";

function transformASTtoTree(ast) {
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

export default function TreeD3({ ast, onNodeSelect }) {
  const treeRef = useRef(null);
  const [translate, setTranslate] = React.useState({ x: 400, y: 100 });
  const data = React.useMemo(() => transformASTtoTree(ast), [ast]);

  useEffect(() => {
    if (treeRef.current) {
      const { width } = treeRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 80 });
    }
  }, [ast]);

  return (
    <div ref={treeRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      {data && (
        <Tree
          data={data}
          orientation="vertical"
          collapsible
          onNodeClick={onNodeSelect}
          translate={translate}
          zoomable
          dimensions={{ width: "100%", height: "100%" }}
          style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
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
  );
}
