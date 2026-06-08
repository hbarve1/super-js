// Template Literals in SJS

// Basic interpolation
const name = 'World'
console.log(`Hello, ${name}!`)

// Expression interpolation
const a = 5
const b = 3
console.log(`${a} + ${b} = ${a + b}`)
console.log(`${a} * ${b} = ${a * b}`)

// Multi-line strings
const poem = `
  Roses are red,
  Violets are blue,
  SJS is typed,
  And so are you.
`
console.log(poem.trim())

// Method calls in templates
const items = ['apple', 'banana', 'cherry']
console.log(`Items: ${items.join(', ')}`)
console.log(`Count: ${items.length}`)

// Nested templates
function formatList(label: string, values: string[]): string {
  return `${label}:\n${values.map((v, i) => `  ${i + 1}. ${v}`).join('\n')}`
}
console.log(formatList('Fruits', items))

// Nullable with template (using ??)
const nickname: string? = null
console.log(`Display name: ${nickname ?? name}`)

// Template with ternary
const score = 85
const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : 'C'
console.log(`Score: ${score} → Grade: ${grade}`)

// Tagged template (advanced)
function highlight(strings: TemplateStringsArray, ...values: string[]): string {
  return strings.reduce((acc, str, i) => {
    const val = values[i - 1]
    return acc + (val ? `[${val}]` : '') + str
  })
}

const lang = 'SJS'
const result = highlight`The language ${lang} is cool`
console.log(result)

function main(): void {
  const user = { name: 'Alice', age: 30 }
  console.log(`User: ${user.name}, Age: ${user.age}`)
}

main()
