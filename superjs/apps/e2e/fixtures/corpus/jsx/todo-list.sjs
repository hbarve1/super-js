import { sjs } from '../../src/runtime/jsx';

type TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

type TodoListProps {
  items: TodoItem[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

type TodoInputProps {
  onAdd: (text: string) => void;
}

// TodoInput component for adding new todos
function TodoInput({ onAdd }: TodoInputProps) {
  let inputValue = '';

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      inputValue = '';
      const input = document.querySelector('input');
      if (input) input.value = '';
    }
  }

  return (
    <form onSubmit={handleSubmit} className="todo-form">
      <input
        type="text"
        placeholder="What needs to be done?"
        onChange={(e: dynamic) => { inputValue = e.target.value }}
      />
      <button type="submit">Add Todo</button>
    </form>
  );
}

// TodoList component for displaying todos
function TodoList({ items, onToggle, onDelete }: TodoListProps) {
  if (items.length === 0) {
    return <p className="empty-message">No todos yet! Add some above.</p>;
  }

  return (
    <ul className="todo-list">
      {items.map(item => (
        <li key={item.id} className={item.completed ? 'completed' : ''}>
          <label className="todo-item">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => onToggle(item.id)}
            />
            <span className="todo-text">{item.text}</span>
          </label>
          <button
            onClick={() => onDelete(item.id)}
            className="delete-btn"
            title="Delete todo"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

// Main TodoApp component
function TodoApp() {
  let todos: TodoItem[] = [
    { id: 1, text: 'Learn super.js JSX', completed: false },
    { id: 2, text: 'Build a todo app', completed: false },
    { id: 3, text: 'Write documentation', completed: false }
  ];

  function addTodo(text: string) {
    const newId = Math.max(0, ...todos.map(t => t.id)) + 1;
    todos = [...todos, { id: newId, text, completed: false }];
    renderApp();
  }

  function toggleTodo(id: number) {
    todos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    renderApp();
  }

  function deleteTodo(id: number) {
    todos = todos.filter(todo => todo.id !== id);
    renderApp();
  }

  function renderApp() {
    sjs.render(<TodoApp />, document.getElementById('app'));
  }

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;

  return (
    <div className="todo-app">
      <h1>Todo List</h1>
      <TodoInput onAdd={addTodo} />
      <TodoList
        items={todos}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
      />
      <footer className="todo-footer">
        <p>
          {completedCount} of {totalCount} items completed
        </p>
      </footer>
    </div>
  );
}

// Initialize the app
sjs.render(<TodoApp />, document.getElementById('app')); 