"use strict";

function distance(a, b) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}
const p1 = {
  x: 0,
  y: 0
};
const p2 = {
  x: 3,
  y: 4
};
console.log(distance(p1, p2));