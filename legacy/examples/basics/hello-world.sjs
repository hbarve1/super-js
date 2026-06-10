// Hello World in SJS

function greet(name: string): string {
  return `Hello, ${name}!`
}

function main(): void {
  console.log(greet('World'))
  console.log(greet('SuperJS'))

  // Template literal
  const version = '0.1.0'
  console.log(`SJS version: ${version}`)
}

main()
