// types/literal-and-enum.sjs — sum types replace enums, string constants for named values
// SJS has no `enum` keyword. Named sets of values are expressed as sum types,
// which support exhaustive matching via `match`.

// --- Simple unit-only sum types (replace enum) ---

type Direction = | North | South | East | West

type LogLevel = | Debug | Info | Warn | Error

type HttpStatus =
  | Ok200
  | Created201
  | BadRequest400
  | NotFound404
  | InternalError500

type Permission = | None | Read | Write | Execute | Admin

type Season = | Spring | Summer | Autumn | Winter

// --- Functions using match for dispatch ---

function move(d: Direction): string {
  return match d {
    North => "up"
    South => "down"
    East  => "right"
    West  => "left"
  }
}

function logPrefix(level: LogLevel): string {
  return match level {
    Debug => "[DEBUG]"
    Info  => "[INFO] "
    Warn  => "[WARN] "
    Error => "[ERROR]"
  }
}

function log(level: LogLevel, message: string): void {
  console.log(logPrefix(level) + " " + message)
}

function isSuccess(s: HttpStatus): boolean {
  return match s {
    Ok200      => true
    Created201 => true
    _          => false
  }
}

function statusMessage(s: HttpStatus): string {
  return match s {
    Ok200             => "200 OK"
    Created201        => "201 Created"
    BadRequest400     => "400 Bad Request"
    NotFound404       => "404 Not Found"
    InternalError500  => "500 Internal Server Error"
  }
}

function canWrite(p: Permission): boolean {
  return match p {
    Write   => true
    Execute => true
    Admin   => true
    _       => false
  }
}

function seasonLength(s: Season): number {
  return match s {
    Spring => 92
    Summer => 94
    Autumn => 90
    Winter => 89
  }
}

// --- String constants for named values that are truly strings ---
// Use plain const for simple named string/number values (not sets).

const RED   = "#FF0000"
const GREEN = "#00FF00"
const BLUE  = "#0000FF"

const HTTP_OK        = 200
const HTTP_NOT_FOUND = 404

// --- Demos ---

console.log(move(North))   // up
console.log(move(East))    // right
console.log(move(South))   // down
console.log(move(West))    // left

log(Info,  "server started")   // [INFO]  server started
log(Warn,  "high memory use")  // [WARN]  high memory use
log(Error, "connection lost")  // [ERROR] connection lost
log(Debug, "request received") // [DEBUG] request received

console.log(isSuccess(Ok200))          // true
console.log(isSuccess(Created201))     // true
console.log(isSuccess(NotFound404))    // false
console.log(isSuccess(InternalError500)) // false

console.log(statusMessage(Ok200))          // 200 OK
console.log(statusMessage(NotFound404))    // 404 Not Found
console.log(statusMessage(BadRequest400))  // 400 Bad Request

console.log(canWrite(Read))    // false
console.log(canWrite(Write))   // true
console.log(canWrite(Admin))   // true

console.log(seasonLength(Summer))  // 94
console.log(seasonLength(Winter))  // 89

console.log(RED, GREEN, BLUE)      // #FF0000 #00FF00 #0000FF
console.log(HTTP_OK, HTTP_NOT_FOUND) // 200 404
