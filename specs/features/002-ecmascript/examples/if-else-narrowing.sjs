// S1: if/else type narrowing

function describe(x: string | number | null): string {
  if (x === null) {
    return "nothing"; // x: null here
  } else if (typeof x === "string") {
    return x.toUpperCase(); // x: string — .toUpperCase() safe
  } else {
    return x.toFixed(2); // x: number — .toFixed() safe
  }
}

// instanceof narrowing
class Dog { bark() { return "woof"; } }
class Cat { meow() { return "meow"; } }

function speak(animal: Dog | Cat): string {
  if (animal instanceof Dog) {
    return animal.bark(); // animal: Dog
  } else {
    return animal.meow(); // animal: Cat
  }
}

// Null check narrowing
function getLength(s: string | null): number {
  if (s !== null) {
    return s.length; // s: string — length safe
  }
  return 0;
}

// Truthy narrowing
function formatName(name: string | undefined): string {
  if (name) {
    return name.trim(); // name: string
  }
  return "Anonymous";
}
