type HttpError =
  | NetworkError({ message: string })
  | NotFound({ url: string })
  | Unauthorized

type Result<T, E> = Ok(T) | Err(E)

type User {
  id: number
  name: string
  email: string?
}

async function fetchUser(id: number): Promise<Result<User, HttpError>> {
  const data: dynamic = await fetch("/users")
  return Ok(data)
}

const result = match await fetchUser(1) {
  Ok(user) => console.log(user.name)
  Err(NotFound({ url })) => console.error("not found:", url)
  Err(Unauthorized) => console.error("unauthorized")
}
