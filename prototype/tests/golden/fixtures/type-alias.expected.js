"use strict";

function activate(id) {
  console.log("activating", id);
  return "active";
}
const result = activate(42);
console.log(result);