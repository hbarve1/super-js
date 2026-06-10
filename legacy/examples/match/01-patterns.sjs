// match/01-patterns.sjs — struct variant patterns, tuple variant patterns, unit variant patterns

// Three variant shapes work in match patterns:
//   - struct  : named fields destructured by name  — Click { x; y }
//   - tuple   : positional field bound by name     — KeyPress(key)
//   - unit    : no data, name alone                — Resize

// All three forms can appear in the same match expression.

// --- Sum type with all three variant kinds ---

type Event =
  | Click { x: number; y: number }
  | KeyPress(string)
  | Scroll { delta: number; direction: string }
  | Resize
  | Focus

// Struct pattern:  Click { x; y }         — binds fields x and y
// Tuple pattern:   KeyPress(key)           — binds first positional field as key
// Unit pattern:    Resize / Focus          — no bindings, just match by name

function handleEvent(e: Event): string {
  return match e {
    Click { x; y }             => `clicked at ${x},${y}`
    KeyPress(key)              => `key: ${key}`
    Scroll { delta; direction } => `scroll ${direction} by ${delta}`
    Resize                     => "window resized"
    Focus                      => "focus gained"
  }
}

// --- A richer type showing struct patterns with more fields ---

type NetworkEvent =
  | Connected { host: string; port: number }
  | Disconnected { host: string; code: number }
  | DataReceived(number)
  | Timeout
  | Retry { attempt: number; maxAttempts: number }

function describeNetworkEvent(ev: NetworkEvent): string {
  return match ev {
    Connected { host; port }           => `connected to ${host}:${port}`
    Disconnected { host; code }        => `disconnected from ${host} (code ${code})`
    DataReceived(bytes)                => `received ${bytes} bytes`
    Timeout                            => "connection timed out"
    Retry { attempt; maxAttempts }     => `retry ${attempt}/${maxAttempts}`
  }
}

// --- Return non-string values from match ---

type Priority = | Low | Medium | High | Critical

function priorityWeight(p: Priority): number {
  return match p {
    Low      => 1
    Medium   => 2
    High     => 3
    Critical => 4
  }
}

function isUrgent(p: Priority): boolean {
  return match p {
    Low    => false
    Medium => false
    High   => true
    Critical => true
  }
}

// --- Demos ---

console.log(handleEvent(Click { x: 100; y: 200 }))          // clicked at 100,200
console.log(handleEvent(KeyPress("Enter")))                  // key: Enter
console.log(handleEvent(Scroll { delta: 3; direction: "down" }))  // scroll down by 3
console.log(handleEvent(Resize))                             // window resized
console.log(handleEvent(Focus))                              // focus gained

console.log(describeNetworkEvent(Connected { host: "api.example.com"; port: 443 }))
// connected to api.example.com:443
console.log(describeNetworkEvent(DataReceived(1024)))        // received 1024 bytes
console.log(describeNetworkEvent(Timeout))                   // connection timed out
console.log(describeNetworkEvent(Retry { attempt: 2; maxAttempts: 5 }))
// retry 2/5

console.log(priorityWeight(Critical))   // 4
console.log(isUrgent(Medium))           // false
console.log(isUrgent(High))             // true
