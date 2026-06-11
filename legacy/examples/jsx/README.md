# JSX Examples

SJS + JSX for building type-safe React components.

## Files

| File | Demonstrates |
|------|-------------|
| `basic-counter.sjs` | useState, event handlers, typed props |
| `fragments-and-composition.sjs` | Fragment syntax, component composition, children |
| `todo-list.sjs` | Controlled inputs, list rendering, state updates |
| `server-side-rendering.sjs` | SSR patterns, async data, hydration |
| `sum-types.sjs` | LoadingState, Result in props, variant styling |

## Key SJS + JSX Idioms

```sjs
// Sum type for loading states
type LoadingState<T> = | Loading | Loaded { data: T } | Failed { error: string }

// match in JSX
match props.state {
  Loading => <Spinner />
  Loaded { data } => <Content data={data} />
  Failed { error } => <Error message={error} />
}

// dynamic for DOM event targets (no as-cast)
onChange={(e: dynamic) => setValue(e.target.value)}

// dynamic for children prop (not any)
interface Props { children?: dynamic }
```

## Running JSX Examples

JSX examples require a bundler (Vite, webpack) and React:

```bash
# From prototype/examples/web or your own React project
npm install react react-dom
```
