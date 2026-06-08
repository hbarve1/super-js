// SJS Example: WeakRef<T> and FinalizationRegistry<T> (ES2021)
// Task 2.2 — specs/002-ecmascript-features/implementation-plan.md

// WeakRef<T> — hold weak reference to an object
type CacheEntry = { key: string; data: unknown; timestamp: number }

const entry: CacheEntry = { key: "user:42", data: { name: "Alice" }, timestamp: Date.now() }
const entryRef: WeakRef<CacheEntry> = new WeakRef(entry)

// deref() returns T | undefined (undefined if GC collected)
function readCache(ref: WeakRef<CacheEntry>): CacheEntry | undefined {
  return ref.deref()
}
const cached: CacheEntry | undefined = entryRef.deref()
if (cached !== undefined) {
  console.log(cached.key)    // cached: CacheEntry here (narrowed)
}

// FinalizationRegistry<T> — cleanup notification
const cleanupRegistry: FinalizationRegistry<string> = new FinalizationRegistry((heldKey: string) => {
  console.log(`Cache entry '${heldKey}' was garbage collected — cleaning up`)
})

// Register with the registry
const resource = { id: 123, buffer: new ArrayBuffer(1024) }
cleanupRegistry.register(resource, "resource-123")

// Unregister when no longer needed
const token = {}
cleanupRegistry.register(resource, "resource-with-token", token)
cleanupRegistry.unregister(token)
