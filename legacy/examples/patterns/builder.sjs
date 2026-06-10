// Builder Pattern in SJS

interface QueryConfig {
  table: string
  conditions: string[]
  limit: number?
  orderBy: string?
}

interface QueryBuilder {
  from(table: string): QueryBuilder
  where(condition: string): QueryBuilder
  limitTo(n: number): QueryBuilder
  orderByField(field: string): QueryBuilder
  build(): string
}

function createQuery(): QueryBuilder {
  let config: QueryConfig = { table: '', conditions: [], limit: null, orderBy: null }
  const self: QueryBuilder = {
    from(table) { config = { ...config, table }; return self },
    where(condition) {
      config = { ...config, conditions: [...config.conditions, condition] }
      return self
    },
    limitTo(n) { config = { ...config, limit: n }; return self },
    orderByField(field) { config = { ...config, orderBy: field }; return self },
    build() {
      let q = `SELECT * FROM ${config.table}`
      if (config.conditions.length > 0) {
        q += ` WHERE ${config.conditions.join(' AND ')}`
      }
      if (config.orderBy !== null) q += ` ORDER BY ${config.orderBy}`
      if (config.limit !== null) q += ` LIMIT ${config.limit}`
      return q
    }
  }
  return self
}

function main(): void {
  // Simple select
  const simple = createQuery()
    .from('products')
    .build()
  console.log(simple)
  // SELECT * FROM products

  // Full query with conditions, ordering, and limit
  const complex = createQuery()
    .from('users')
    .where('active = true')
    .where('age > 18')
    .orderByField('name')
    .limitTo(10)
    .build()
  console.log(complex)
  // SELECT * FROM users WHERE active = true AND age > 18 ORDER BY name LIMIT 10

  // Reuse builder for two related queries
  const base = createQuery().from('orders').where('status = "pending"')
  const recent = base.orderByField('created_at').limitTo(5).build()
  console.log(recent)
  // SELECT * FROM orders WHERE status = "pending" ORDER BY created_at LIMIT 5
}

main()
