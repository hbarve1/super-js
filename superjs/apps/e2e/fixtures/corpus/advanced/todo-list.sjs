// Todo item type definition
type Priority = 'low' | 'medium' | 'high';

type TodoItem {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
  dueDate: Date | null;
}

// Todo list manager class
class TodoList {
  private items: TodoItem[];

  constructor() {
    this.items = [];
  }

  addTodo(
    title: string,
    description: string | null = null,
    priority: Priority = 'medium'
  ): TodoItem {
    const newItem: TodoItem = {
      id: this.items.length + 1,
      title,
      description,
      completed: false,
      priority,
      dueDate: null
    };

    this.items.push(newItem);
    return newItem;
  }

  toggleComplete(id: number): boolean {
    const todo = this.items.find(item => item.id === id);
    if (!todo) {
      return false;
    }

    todo.completed = !todo.completed;
    return true;
  }

  setDueDate(id: number, date: Date): boolean {
    const todo = this.items.find(item => item.id === id);
    if (!todo) {
      return false;
    }

    todo.dueDate = date;
    return true;
  }

  getTodosByPriority(priority: Priority): TodoItem[] {
    return this.items.filter(item => item.priority === priority);
  }

  getPendingTodos(): TodoItem[] {
    return this.items.filter(item => !item.completed);
  }
}

// Example usage
function main(): void {
  const todoList = new TodoList();

  // Add some todos
  todoList.addTodo('Complete super.js compiler', 'Implement type checking and code generation', 'high');
  todoList.addTodo('Write documentation');
  todoList.addTodo('Add tests', null, 'high');

  // Set due dates
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  todoList.setDueDate(1, nextWeek);

  // Mark some as complete
  todoList.toggleComplete(2);

  // Get high priority todos
  const highPriorityTodos = todoList.getTodosByPriority('high');
  console.log('High priority todos:', highPriorityTodos);

  // Get pending todos
  const pendingTodos = todoList.getPendingTodos();
  console.log('Pending todos:', pendingTodos);
}

main(); 