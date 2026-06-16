// Async/Await in SJS — using Result<T,E> for errors

type Result<T, E> = | Ok(T) | Err(E)

type User {
  id: number
  name: string
  email: string
}

type Post {
  id: number
  userId: number
  title: string
}

// Wrap fetch in Result
async function fetchUser(id: number): Promise<Result<User, string>> {
  try {
    const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`)
    if (!res.ok) return Err(`HTTP ${res.status}`)
    const user = await res.json()
    return Ok(user)
  } catch (e) {
    return Err(String(e))
  }
}

async function fetchUserPosts(userId: number): Promise<Result<Post[], string>> {
  try {
    const res = await fetch(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`)
    if (!res.ok) return Err(`HTTP ${res.status}`)
    const posts = await res.json()
    return Ok(posts)
  } catch (e) {
    return Err(String(e))
  }
}

// Sequential async with Result
async function getUserWithPosts(id: number): Promise<Result<{ user: User; posts: Post[] }, string>> {
  const userResult = await fetchUser(id)
  match userResult {
    Err(e) => return Err(e)
    Ok(user) => {
      const postsResult = await fetchUserPosts(user.id)
      match postsResult {
        Err(e) => return Err(e)
        Ok(posts) => return Ok({ user, posts })
      }
    }
  }
}

// Parallel async
async function fetchMultipleUsers(ids: number[]): Promise<Result<User, string>[]> {
  return Promise.all(ids.map(fetchUser))
}

async function main(): Promise<void> {
  const result = await getUserWithPosts(1)
  match result {
    Ok({ user, posts }) => {
      console.log(`User: ${user.name}`)
      console.log(`Posts: ${posts.length}`)
      for (const p of posts.slice(0, 3)) {
        console.log(` - ${p.title}`)
      }
    }
    Err(message) => console.error('Failed:', message)
  }

  const users = await fetchMultipleUsers([1, 2, 3])
  for (const u of users) {
    match u {
      Ok(user) => console.log(user.name)
      Err(e) => console.error('Error:', e)
    }
  }
}

main().catch(console.error)
