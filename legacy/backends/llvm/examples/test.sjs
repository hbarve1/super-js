// SuperJS test file
// Testing basic language features

// Variable declarations with type annotations
let number: number = 42;
let text: string = "Hello, SuperJS!";
let flag: boolean = true;

// Function with type annotations
function add(a: number, b: number): number {
    return a + b;
}

// Function call
let result = add(5, 3);
print(result);

// Conditional statement
if (result > 5) {
    print("Result is greater than 5");
} else {
    print("Result is less than or equal to 5");
}

// Loop
let i: number = 0;
while (i < 3) {
    print(i);
    i = i + 1;
} 