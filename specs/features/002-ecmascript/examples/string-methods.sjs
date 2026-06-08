// L2: String method signatures

const s: string = "  Hello, World!  ";

// Searching
const has: boolean = s.includes("World");
const starts: boolean = s.startsWith("  Hello");
const ends: boolean = s.endsWith("!  ");
const idx: number = s.indexOf("World");
const lastIdx: number = s.lastIndexOf("l");

// Slicing
const sliced: string = s.slice(2, 7);       // "Hello"
const sub: string = s.substring(2, 7);      // "Hello"

// Splitting
const words: string[] = s.trim().split(", "); // ["Hello", "World!"]

// Replace
const replaced: string = s.replace("World", "SJS");
const allReplaced: string = "aabbaa".replaceAll("aa", "cc");

// Case
const upper: string = s.toUpperCase();
const lower: string = s.toLowerCase();

// Trim
const trimmed: string = s.trim();
const trimStart: string = s.trimStart();
const trimEnd: string = s.trimEnd();

// Pad
const padded: string = "5".padStart(3, "0");  // "005"
const paddedEnd: string = "5".padEnd(3, "0"); // "500"

// Repeat
const repeated: string = "ab".repeat(3); // "ababab"

// at — string | undefined
const char: string | undefined = s.at(0);
const last: string | undefined = s.at(-1);

// Char codes
const code: number = s.charCodeAt(2);
const cp: number | undefined = s.codePointAt(0);

// Match
const match: RegExpMatchArray | null = s.match(/\w+/g);
const matchAll: IterableIterator<RegExpExecArray> = "test".matchAll(/t/g);

// length
const len: number = s.length;
