// Graph (Adjacency List) in SJS

interface Graph {
  addVertex(vertex: string): void
  addEdge(from: string, to: string): void
  neighbors(vertex: string): string[]
  bfs(start: string): string[]
  dfs(start: string): string[]
  hasPath(from: string, to: string): boolean
}

function createGraph(): Graph {
  const adjacency = new Map<string, string[]>()

  return {
    addVertex(vertex) {
      if (!adjacency.has(vertex)) adjacency.set(vertex, [])
    },
    addEdge(from, to) {
      const fromList = adjacency.get(from)
      const toList = adjacency.get(to)
      // Map.get() returns T | undefined — check before use
      if (fromList !== undefined) fromList.push(to)
      if (toList !== undefined) toList.push(from)
    },
    neighbors(vertex) {
      const list = adjacency.get(vertex)
      return list !== undefined ? list : []
    },
    bfs(start) {
      const visited = new Set<string>()
      const queue: string[] = [start]
      const result: string[] = []
      visited.add(start)
      while (queue.length > 0) {
        const vertex = queue.shift()
        if (vertex === undefined) break
        result.push(vertex)
        for (const n of this.neighbors(vertex)) {
          if (!visited.has(n)) { visited.add(n); queue.push(n) }
        }
      }
      return result
    },
    dfs(start) {
      const visited = new Set<string>()
      const result: string[] = []
      const visit = (v: string) => {
        if (visited.has(v)) return
        visited.add(v)
        result.push(v)
        for (const n of this.neighbors(v)) visit(n)
      }
      visit(start)
      return result
    },
    hasPath(from, to) {
      return this.bfs(from).includes(to)
    }
  }
}

function main(): void {
  const g = createGraph()
  for (const v of ['A', 'B', 'C', 'D', 'E']) g.addVertex(v)
  g.addEdge('A', 'B')
  g.addEdge('A', 'C')
  g.addEdge('B', 'D')
  g.addEdge('C', 'D')
  g.addEdge('D', 'E')

  console.log('BFS from A:', g.bfs('A'))
  console.log('DFS from A:', g.dfs('A'))
  console.log('A->E path:', g.hasPath('A', 'E'))  // true
  console.log('E->A path:', g.hasPath('E', 'A'))  // true
}

main()
