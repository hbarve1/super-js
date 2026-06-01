// JSX with custom pragma
function Button({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick}>{label}</button>
}

function App() {
  return (
    <div className="app">
      <h1>Hello Super.js</h1>
      <Button label="Click me" onClick={() => console.log("clicked")} />
    </div>
  )
}
