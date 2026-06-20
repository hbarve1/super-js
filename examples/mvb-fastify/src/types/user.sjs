export type User = Admin(string) | Member(string)

export type UserStore {
  findById(id: string): User?
  list(): User[]
  add(user: User): void
}

export function userAdmin(name: string): User {
  return Admin(name)
}

export function userMember(name: string): User {
  return Member(name)
}
