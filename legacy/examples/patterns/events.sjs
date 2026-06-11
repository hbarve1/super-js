// Event System Example

// Event types as sum types
type AppEvent =
  | UserLogin { userId: string; timestamp: number }
  | UserLogout { userId: string }
  | DataLoaded { count: number }
  | ErrorOccurred { message: string }

interface EventHandler<E> {
  handle(event: E): void
}

// Simple typed event bus
interface EventBus {
  emit(event: AppEvent): void
  on(handler: (event: AppEvent) => void): void
  off(handler: (event: AppEvent) => void): void
}

function createEventBus(): EventBus {
  const handlers: ((event: AppEvent) => void)[] = []
  return {
    emit(event) {
      for (const h of handlers) h(event)
    },
    on(handler) { handlers.push(handler) },
    off(handler) {
      const i = handlers.indexOf(handler)
      if (i >= 0) handlers.splice(i, 1)
    }
  }
}

function main(): void {
  const bus = createEventBus()

  const logHandler = (event: AppEvent) => {
    match event {
      UserLogin { userId } => console.log('Login:', userId)
      UserLogout { userId } => console.log('Logout:', userId)
      DataLoaded { count } => console.log('Loaded', count, 'items')
      ErrorOccurred { message } => console.error('Error:', message)
    }
  }

  bus.on(logHandler)

  bus.emit(UserLogin({ userId: 'u1', timestamp: Date.now() }))
  bus.emit(DataLoaded({ count: 42 }))
  bus.emit(UserLogin({ userId: 'u2', timestamp: Date.now() }))
  bus.emit(ErrorOccurred({ message: 'Connection timeout' }))
  bus.emit(UserLogout({ userId: 'u1' }))

  bus.off(logHandler)

  // After unsubscribing, this should not be logged
  bus.emit(DataLoaded({ count: 0 }))
  console.log('Handler removed — no output above for last event')
}

main()
