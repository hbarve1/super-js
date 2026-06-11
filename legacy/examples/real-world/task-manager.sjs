// Task Manager — CRUD with Result<T,E>
// Node.js example: fs-based persistence

import * as fs from 'fs'
import * as path from 'path'

// Domain types
type Priority = | Low | Medium | High

type TaskStatus = | Todo | InProgress | Done

interface Task {
  id: string
  title: string
  description: string?
  priority: Priority
  status: TaskStatus
  createdAt: number
  tags: string[]
}

// Error sum type
type TaskError =
  | NotFound { id: string }
  | InvalidData { message: string }
  | StorageError { message: string }

type Result<T, E> = | Ok(T) | Err(E)

interface TaskUpdate {
  title?: string
  status?: TaskStatus
  priority?: Priority
  tags?: string[]
}

// Storage interface
interface TaskStore {
  getAll(): Result<Task[], TaskError>
  getById(id: string): Result<Task, TaskError>
  create(title: string, priority: Priority, description?: string): Result<Task, TaskError>
  update(id: string, updates: TaskUpdate): Result<Task, TaskError>
  delete(id: string): Result<void, TaskError>
}

function createFileStore(filePath: string): TaskStore {
  function load(): Task[] {
    try {
      if (!fs.existsSync(filePath)) return []
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  function save(tasks: Task[]): Result<void, TaskError> {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2))
      return Ok(undefined)
    } catch (e) {
      return Err(StorageError({ message: String(e) }))
    }
  }

  function genId(): string {
    return Math.random().toString(36).slice(2, 10)
  }

  return {
    getAll() {
      return Ok(load())
    },

    getById(id) {
      const tasks = load()
      const task = tasks.find(t => t.id === id)
      return task !== undefined ? Ok(task) : Err(NotFound({ id }))
    },

    create(title, priority, description) {
      if (title.trim().length === 0) {
        return Err(InvalidData({ message: 'Title cannot be empty' }))
      }
      const task: Task = {
        id: genId(),
        title: title.trim(),
        description: description ?? null,
        priority,
        status: Todo(),
        createdAt: Date.now(),
        tags: []
      }
      const tasks = load()
      tasks.push(task)
      const saveResult = save(tasks)
      match saveResult {
        Ok(_) => return Ok(task)
        Err(e) => return Err(e)
      }
    },

    update(id, updates) {
      const tasks = load()
      const idx = tasks.findIndex(t => t.id === id)
      if (idx < 0) return Err(NotFound({ id }))
      tasks[idx] = { ...tasks[idx], ...updates }
      const saveResult = save(tasks)
      match saveResult {
        Ok(_) => return Ok(tasks[idx])
        Err(e) => return Err(e)
      }
    },

    delete(id) {
      const tasks = load()
      const idx = tasks.findIndex(t => t.id === id)
      if (idx < 0) return Err(NotFound({ id }))
      tasks.splice(idx, 1)
      return save(tasks)
    }
  }
}

function describeError(e: TaskError): string {
  match e {
    NotFound { id } => `Task ${id} not found`
    InvalidData { message } => `Invalid: ${message}`
    StorageError { message } => `Storage error: ${message}`
  }
}

function main(): void {
  const store = createFileStore('/tmp/sjs-tasks.json')

  const r1 = store.create('Buy groceries', High())
  match r1 {
    Ok(task) => console.log('Created:', task.id, task.title)
    Err(e) => console.error(describeError(e))
  }

  const r2 = store.create('Write report', Medium(), 'Q2 quarterly report')
  match r2 {
    Ok(task) => {
      console.log('Created:', task.id)
      const r3 = store.update(task.id, { status: InProgress() })
      match r3 {
        Ok(updated) => console.log('Updated status:', updated.id)
        Err(e) => console.error(describeError(e))
      }
    }
    Err(e) => console.error(describeError(e))
  }

  const all = store.getAll()
  match all {
    Ok(tasks) => {
      console.log(`Total tasks: ${tasks.length}`)
      for (const t of tasks) {
        const pri = match t.priority {
          High => 'HIGH'
          Medium => 'MED'
          Low => 'LOW'
        }
        console.log(`  [${pri}] ${t.title}`)
      }
    }
    Err(e) => console.error(describeError(e))
  }
}

main()
