import { sjs } from '../../src/runtime/jsx';

type CounterProps {
  initialCount?: number;
  label?: string;
}

function Counter({ initialCount = 0, label = 'Counter' }: CounterProps) {
  let count = initialCount;

  function increment() {
    count++;
    // Re-render the component
    sjs.render(<Counter initialCount={count} label={label} />, document.getElementById('app'));
  }

  function decrement() {
    count--;
    sjs.render(<Counter initialCount={count} label={label} />, document.getElementById('app'));
  }

  return (
    <div className="counter">
      <h2>{label}</h2>
      <div className="counter-controls">
        <button onClick={decrement} disabled={count <= 0}>-</button>
        <span className="count">{count}</span>
        <button onClick={increment}>+</button>
      </div>
    </div>
  );
}

// Initialize the app
sjs.render(
  <Counter initialCount={5} label="My Counter" />,
  document.getElementById('app')
); 