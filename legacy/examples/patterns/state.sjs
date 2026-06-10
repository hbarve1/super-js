// State Management Example

// Action sum types
type Action =
  | Increment
  | Decrement
  | Reset
  | SetValue { value: number }

interface State {
  count: number
  history: number[]
}

function reducer(state: State, action: Action): State {
  match action {
    Increment => ({ count: state.count + 1, history: [...state.history, state.count] })
    Decrement => ({ count: state.count - 1, history: [...state.history, state.count] })
    Reset => ({ count: 0, history: [] })
    SetValue { value } => ({ count: value, history: [...state.history, state.count] })
  }
}

interface Store<S> {
  getState(): S
  dispatch(action: Action): void
  subscribe(listener: (state: S) => void): () => void
}

function createStore(initial: State): Store<State> {
  let state = initial
  const listeners: ((s: State) => void)[] = []
  return {
    getState: () => state,
    dispatch(action) {
      state = reducer(state, action)
      for (const l of listeners) l(state)
    },
    subscribe(listener) {
      listeners.push(listener)
      return () => {
        const i = listeners.indexOf(listener)
        if (i >= 0) listeners.splice(i, 1)
      }
    }
  }
}

function main(): void {
  const store = createStore({ count: 0, history: [] })

  const unsubscribe = store.subscribe(s => {
    console.log('State:', s.count, '| History:', s.history)
  })

  store.dispatch(Increment())
  store.dispatch(Increment())
  store.dispatch(Increment())
  store.dispatch(Decrement())
  store.dispatch(SetValue({ value: 10 }))

  console.log('\nUnsubscribing...')
  unsubscribe()

  store.dispatch(Reset())
  console.log('Final state (no listener):', store.getState())
}

main()
