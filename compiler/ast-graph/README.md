# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# AST Graph Visualizer

This project is a React app (bootstrapped with Vite) for visualizing Abstract Syntax Trees (AST) from JSON files. 

## Features
- Load an AST JSON file (e.g., exported from your parser)
- Display the AST as a collapsible, interactive tree
- Click nodes to inspect their details

## Getting Started

1. Place your AST JSON file (e.g., `ast.json`) in the project directory.
2. Run the app:
   ```sh
   npm run dev
   ```
3. Open the app in your browser (default: http://localhost:5173)

## Customization
- The tree visualization uses a modern React tree library (e.g., react-d3-tree).
- You can modify the UI to support additional features like search, filtering, or custom node rendering.

---

For more details, see the source code and comments.
