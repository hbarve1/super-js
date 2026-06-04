// S2: Loop statement type checking

// for...of — loop var gets element type
const nums: number[] = [1, 2, 3, 4, 5];
let sum = 0;
for (const n of nums) {
  sum += n; // n: number
}

// for...of with index using entries()
const words: string[] = ["hello", "world"];
for (const [i, word] of words.entries()) {
  console.log(i, word.toUpperCase()); // word: string
}

// for...in — loop var is string (key type)
const obj = { a: 1, b: 2, c: 3 };
for (const key in obj) {
  console.log(key); // key: string
}

// classic for loop
for (let i = 0; i < nums.length; i++) {
  console.log(nums[i]); // nums[i]: number
}

// while loop
let count = 0;
while (count < 5) {
  count++;
}

// do/while loop
let x = 0;
do {
  x += 2;
} while (x < 10);

// async for...of iteration
async function processItems(items: AsyncIterable<string>): Promise<void> {
  for await (const item of items) {
    console.log(item.trim()); // item: string
  }
}
