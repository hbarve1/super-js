// null-safety/03-defaults.sjs — ?? nullish coalescing, ??= nullish assignment, difference from ||

// ?? returns the right-hand side only when the left is null or undefined.
// || returns the right-hand side for ANY falsy value (0, "", false, null, undefined).
// ??= assigns only when the variable is currently null or undefined — leaves other values intact.

interface AppSettings {
  theme: string?
  fontSize: number?
  language: string?
  maxRetries: number?
}

// Fill in null fields with defaults — ?? leaves non-null values (including 0, "") untouched.
function resolveSettings(partial: AppSettings): AppSettings {
  return {
    theme: partial.theme ?? "light",
    fontSize: partial.fontSize ?? 14,
    language: partial.language ?? "en",
    maxRetries: partial.maxRetries ?? 3
  }
}

// name is string? — null gets replaced, real name passes through.
function greet(name: string?): string {
  return "Hello, " + (name ?? "stranger") + "!"
}

// Demonstrate ?? vs || with numbers and strings.
function showNullishVsFalsy(): void {
  const count: number? = 0
  const label: string? = ""

  // ?? only triggers on null — 0 and "" pass through
  console.log(count ?? 99)    // 0
  console.log(label ?? "n/a") // (empty string — not replaced)

  // || triggers on any falsy value — 0 and "" get replaced
  console.log(count || 99)    // 99
  console.log(label || "n/a") // n/a
}

// ??= assigns a default only when the target is null.
function applyDefaults(settings: AppSettings): void {
  settings.theme ??= "dark"
  settings.fontSize ??= 16
  settings.language ??= "en"
}

// --- Demo ---

const allNull: AppSettings = { theme: null, fontSize: null, language: null, maxRetries: null }
const resolved: AppSettings = resolveSettings(allNull)
console.log(resolved.theme)       // light
console.log(resolved.fontSize)    // 14
console.log(resolved.language)    // en
console.log(resolved.maxRetries)  // 3

// Partial settings: theme already set, fontSize is 0 (a real value), maxRetries null.
const partial: AppSettings = { theme: "ocean", fontSize: 0, language: null, maxRetries: null }
const resolvedPartial: AppSettings = resolveSettings(partial)
console.log(resolvedPartial.theme)      // ocean   — existing value kept
console.log(resolvedPartial.fontSize)   // 0       — 0 is NOT null; ?? does not replace it
console.log(resolvedPartial.language)   // en      — null replaced
console.log(resolvedPartial.maxRetries) // 3       — null replaced

console.log(greet("Erin"))  // Hello, Erin!
console.log(greet(null))    // Hello, stranger!

showNullishVsFalsy()

// ??= in action
const cfg: AppSettings = { theme: "solarized", fontSize: null, language: null, maxRetries: null }
applyDefaults(cfg)
console.log(cfg.theme)    // solarized — already set; ??= did not overwrite
console.log(cfg.fontSize) // 16        — was null; ??= assigned the default
