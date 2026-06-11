"use strict";

class Animal {
  constructor(name, sound) {
    this.name = name;
    this.sound = sound;
  }
  speak() {
    return `${this.name} says ${this.sound}`;
  }
}
class Dog extends Animal {
  constructor(name, breed) {
    super(name, "woof");
    this.breed = breed;
  }
}
const d = new Dog("Rex", "Labrador");
console.log(d.speak());
console.log(d.breed);