// State Management Example

// Action types
type Action = 
  | { type: 'ADD_TODO'; payload: string }
  | { type: 'TOGGLE_TODO'; payload: number }
  | { type: 'SET_FILTER'; payload: FilterType };

// State types
type FilterType = 'all' | 'active' | 'completed';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface State {
  todos: Todo[];
  filter: FilterType;
}

// Store implementation
class Store<S, A> {
  #state: S;
  #listeners: Set<(state: S) => void> = new Set();
  #reducer: (state: S, action: A) => S;

  constructor(reducer: (state: S, action: A) => S, initialState: S) {
    this.#state = initialState;
    this.#reducer = reducer;
  }

  getState(): S {
    return this.#state;
  }

  dispatch(action: A): void {
    this.#state = this.#reducer(this.#state, action);
    this.#notifyListeners();
  }

  subscribe(listener: (state: S) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notifyListeners(): void {
    this.#listeners.forEach(listener => listener(this.#state));
  }
}

// Reducer function
function todoReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: state.todos.length + 1,
            text: action.payload,
            completed: false
          }
        ]
      };

    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      };

    case 'SET_FILTER':
      return {
        ...state,
        filter: action.payload
      };

    default:
      return state;
  }
}

// Usage example
function main(): void {
  // Create store
  const store = new Store<State, Action>(todoReducer, {
    todos: [],
    filter: 'all'
  });

  // Subscribe to state changes
  store.subscribe(state => {
    console.log('\nState updated:');
    console.log('Filter:', state.filter);
    console.log('Todos:', state.todos);
  });

  // Dispatch actions
  store.dispatch({ type: 'ADD_TODO', payload: 'Learn super.js' });
  store.dispatch({ type: 'ADD_TODO', payload: 'Write examples' });
  store.dispatch({ type: 'ADD_TODO', payload: 'Create documentation' });

  store.dispatch({ type: 'TOGGLE_TODO', payload: 2 });
  store.dispatch({ type: 'SET_FILTER', payload: 'active' });

  // Get final state
  const finalState = store.getState();
  console.log('\nFinal filtered todos:', 
    finalState.todos.filter(todo => 
      finalState.filter === 'all' ||
      (finalState.filter === 'completed' && todo.completed) ||
      (finalState.filter === 'active' && !todo.completed)
    )
  );
}

main(); 