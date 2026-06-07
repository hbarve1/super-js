"use strict";

const name = "Alice";
const age = 30;
const active = true;
const score = null;
function greet(person, times = 1) {
  return person.repeat(times);
}
console.log(name, age, active, score);
console.log(greet("hi", 2));