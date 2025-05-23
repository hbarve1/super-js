// Event System Example

// Event types
type EventCallback<T> = (data: T) => void;

// Generic event emitter
class EventEmitter<T extends { [K in keyof T]: any }> {
  #listeners: { [K in keyof T]?: Set<EventCallback<T[K]>> } = {};

  on<K extends keyof T>(event: K, callback: EventCallback<T[K]>): void {
    if (!this.#listeners[event]) {
      this.#listeners[event] = new Set();
    }
    this.#listeners[event]?.add(callback);
  }

  off<K extends keyof T>(event: K, callback: EventCallback<T[K]>): void {
    this.#listeners[event]?.delete(callback);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.#listeners[event]?.forEach(callback => callback(data));
  }
}

// Example chat system
interface ChatEvents {
  message: { user: string; text: string };
  join: string;
  leave: string;
  typing: { user: string; isTyping: boolean };
}

class ChatRoom extends EventEmitter<ChatEvents> {
  #users: Set<string> = new Set();

  join(username: string): void {
    this.#users.add(username);
    this.emit('join', username);
  }

  leave(username: string): void {
    this.#users.delete(username);
    this.emit('leave', username);
  }

  sendMessage(user: string, text: string): void {
    this.emit('message', { user, text });
  }

  setTyping(user: string, isTyping: boolean): void {
    this.emit('typing', { user, isTyping });
  }

  getUsers(): string[] {
    return Array.from(this.#users);
  }
}

// Usage example
function main(): void {
  const chatRoom = new ChatRoom();

  // Set up event listeners
  chatRoom.on('join', username => {
    console.log(`${username} joined the chat`);
  });

  chatRoom.on('leave', username => {
    console.log(`${username} left the chat`);
  });

  chatRoom.on('message', ({ user, text }) => {
    console.log(`${user}: ${text}`);
  });

  chatRoom.on('typing', ({ user, isTyping }) => {
    console.log(`${user} is ${isTyping ? 'typing...' : 'stopped typing'}`);
  });

  // Simulate chat activity
  chatRoom.join('Alice');
  chatRoom.join('Bob');
  
  chatRoom.setTyping('Alice', true);
  chatRoom.sendMessage('Alice', 'Hello everyone!');
  chatRoom.setTyping('Alice', false);
  
  chatRoom.setTyping('Bob', true);
  chatRoom.sendMessage('Bob', 'Hi Alice!');
  chatRoom.setTyping('Bob', false);
  
  chatRoom.leave('Alice');
  
  console.log('Current users:', chatRoom.getUsers());
}

main(); 