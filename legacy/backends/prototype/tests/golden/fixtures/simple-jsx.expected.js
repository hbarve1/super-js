"use strict";

// JSX with custom pragma
function Button({
  label,
  onClick
}) {
  return sjs.createElement("button", {
    onClick: onClick
  }, label);
}
function App() {
  return sjs.createElement("div", {
    className: "app"
  }, sjs.createElement("h1", null, "Hello Super.js"), sjs.createElement(Button, {
    label: "Click me",
    onClick: () => console.log("clicked")
  }));
}