// null-safety/02-chaining.sjs — ?. optional chaining on objects, arrays, and function calls

// ?. short-circuits to undefined (JS semantics) when the left-hand side is null or undefined.
// Return type of a ?. expression is T | undefined — this is JS operator behaviour, not a banned pattern.
// Use ?. to traverse nullable object chains without manual null checks at every step.

interface Address {
  street: string
  city: string
  zip: string?
}

interface Profile {
  displayName: string?
  address: Address?
  tags: string[]?
  greet: (() => string)?
}

interface Organization {
  name: string
  owner: Profile?
  auditor: Profile?
}

// obj?.prop?.nested — each ?. guards against null/undefined on the left side.
function getCity(org: Organization): string | undefined {
  return org.owner?.address?.city
}

// profile?.tags?.[0] — ?. works on array index access too.
function firstTag(profile: Profile?): string | undefined {
  return profile?.tags?.[0]
}

// profile?.greet?.() — ?. on a function-typed field calls the function only if non-null.
function callGreeter(profile: Profile?): string | undefined {
  return profile?.greet?.()
}

// Zip is string? — chaining through two nullable levels gives string | undefined.
function getZip(org: Organization): string | undefined {
  return org.owner?.address?.zip
}

// --- Demo data ---

const acme: Organization = {
  name: "Acme",
  owner: {
    displayName: "Ada",
    address: null,         // address is null — city chain will short-circuit
    tags: ["eng", "ops"],
    greet: null
  },
  auditor: null
}

const betaCorp: Organization = {
  name: "BetaCorp",
  owner: {
    displayName: "Bruno",
    address: { street: "1 Main St", city: "Springfield", zip: "12345" },
    tags: [],
    greet: () => "Hi from Bruno!"
  },
  auditor: {
    displayName: null,
    address: { street: "99 Elm Ave", city: "Shelbyville", zip: null },
    tags: null,
    greet: () => "Audit complete."
  }
}

// owner.address is null → city chain yields undefined
console.log(getCity(acme))             // undefined

// owner.address exists and has city
console.log(getCity(betaCorp))         // Springfield

// tags is ["eng","ops"], index 0 exists
console.log(firstTag(acme.owner))      // eng

// tags is empty array — index 0 is undefined
console.log(firstTag(betaCorp.owner))  // undefined

// auditor is null — entire chain short-circuits
console.log(firstTag(acme.auditor))    // undefined

// auditor.tags is null — short-circuits at tags
console.log(firstTag(betaCorp.auditor)) // undefined

// owner.greet is null — short-circuits, does not throw
console.log(callGreeter(acme.owner))   // undefined

// owner.greet is a function — called normally
console.log(callGreeter(betaCorp.owner))   // Hi from Bruno!

// zip is "12345"
console.log(getZip(betaCorp))          // 12345

// auditor.zip is null — string? accessed via ?. yields null propagated as undefined? No:
// address.zip is string? so getZip returns string | undefined (the zip value may be null too).
// Here betaCorp.auditor.address.zip === null, so the result is null (through the chain).
console.log(getZip({ name: "X", owner: null, auditor: null }))  // undefined (owner is null)
