import type { User } from "../types/user"
import { userAdmin, userMember } from "../types/user.js"
import { ok, err } from "@superjs/std-core"
import { List, listOf } from "@superjs/std-collections"

type Result<T, E> = Ok(T) | Err(E)

const store: User[] = [
  userAdmin("alice"),
  userMember("bob"),
]

function findById(id: string): User? {
  for (const u of store) {
    const name = displayName(u)
    if (name === id) return u
  }
  return null
}

function displayName(user: User): string {
  return match user {
    Admin(name) => name,
    Member(name) => name,
  }
}

function parseCreate(body: dynamic): Result<User, string> {
  if (body === null || typeof body !== "object") {
    return err("body must be an object")
  }
  const name: dynamic = body.name
  const role: dynamic = body.role
  if (typeof name !== "string" || name.length === 0) {
    return err("name is required")
  }
  if (role === "admin") {
    return ok(userAdmin(name))
  }
  if (role === "member") {
    return ok(userMember(name))
  }
  return err('role must be "admin" or "member"')
}

function roleLabel(user: User): string {
  return match user {
    Admin(_) => "admin",
    Member(_) => "member",
  }
}

/** GET /users, POST /users — sum types, match, Result, nullable, List<T>. */
export function registerUsers(app: dynamic): void {
  app.get("/users", async () => {
    const list: List<User> = listOf(store)
    const out: { id: string; role: string }[] = []
    let i: number = 0
    while (i < list.length) {
      const u: User = list.get(i)
      out.push({ id: displayName(u), role: roleLabel(u) })
      i = i + 1
    }
    return out
  })

  app.get("/users/:id", async (req: dynamic) => {
    const id: string = req.params.id
    const found: User? = findById(id)
    if (found === null) {
      return { error: "not found" }
    }
    return { id: displayName(found), role: roleLabel(found) }
  })

  app.post("/users", async (req: dynamic) => {
    const created: Result<User, string> = parseCreate(req.body)
    return match created {
      Ok(user) => {
        store.push(user)
        return { id: displayName(user), role: roleLabel(user) }
      },
      Err(message) => ({ error: message }),
    }
  })
}
