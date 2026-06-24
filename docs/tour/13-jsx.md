---
title: 13 — JSX
sidebar_position: 14
description: JSX syntax in .sjsx files.
section: tour
---

# JSX

**Goal:** Write components with JSX enabled.

Enable JSX in `superjs.config.json` (`"jsx": true`) or use the `.sjsx` extension.
JSX lowers to your configured factory (e.g. `React.createElement`).

## Example

```sjs
// Save as component.sjsx with jsx enabled
export function Greeting(props: { name: string }): dynamic {
  return <p>Hello, {props.name}</p>
}
```

[Open in playground](https://superjs.org/playground#code=Ly8gU2F2ZSBhcyBjb21wb25lbnQuc2pzeCB3aXRoIGpzeCBlbmFibGVkCmV4cG9ydCBmdW5jdGlvbiBHcmVldGluZyhwcm9wczogeyBuYW1lOiBzdHJpbmcgfSk6IGR5bmFtaWMgewogIHJldHVybiA8cD5IZWxsbywge3Byb3BzLm5hbWV9PC9wPgp9)

## Key takeaways

- JSX requires jsx mode — not valid in plain `.sjs` by default.
- Props are usually a structural object type.
- See specs/language/039-jsx.md for factory config.

**Next:** [Calling JS from SJS](./14-calling-js-from-sjs.md)
