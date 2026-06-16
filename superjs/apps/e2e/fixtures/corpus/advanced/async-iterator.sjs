// Async Iterator Example

// Async data source interface
type DataSource<T> {
  fetch(page: number): Promise<T[]>;
  hasMore(page: number): Promise<boolean>;
}

// Mock API data source
class MockAPI implements DataSource<string> {
  #data: string[];
  #pageSize: number;

  constructor(items: string[], pageSize: number) {
    this.#data = items;
    this.#pageSize = pageSize;
  }

  async fetch(page: number): Promise<string[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const start = page * this.#pageSize;
    return this.#data.slice(start, start + this.#pageSize);
  }

  async hasMore(page: number): Promise<boolean> {
    return page * this.#pageSize < this.#data.length;
  }
}

// Async iterator implementation
class AsyncPageIterator<T> implements AsyncIterableIterator<T[]> {
  #dataSource: DataSource<T>;
  #currentPage: number;

  constructor(dataSource: DataSource<T>) {
    this.#dataSource = dataSource;
    this.#currentPage = 0;
  }

  async next(): Promise<IteratorResult<T[]>> {
    const hasMore = await this.#dataSource.hasMore(this.#currentPage);
    
    if (!hasMore) {
      return { done: true, value: undefined };
    }

    const value = await this.#dataSource.fetch(this.#currentPage);
    this.#currentPage++;

    return { done: false, value };
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T[]> {
    return this;
  }
}

// Helper function to process data in chunks
async function processInChunks<T>(
  iterator: AsyncIterableIterator<T[]>,
  processor: (chunk: T[]) => void
): Promise<void> {
  for await (const chunk of iterator) {
    processor(chunk);
  }
}

// Usage example
async function main(): Promise<void> {
  // Create mock data
  const items = Array.from({ length: 25 }, (_, i) => `Item ${i + 1}`);
  const api = new MockAPI(items, 5);
  const iterator = new AsyncPageIterator(api);

  console.log('Processing items in chunks...\n');

  // Process all items
  await processInChunks(iterator, chunk => {
    console.log('Received chunk:', chunk);
    console.log('Chunk size:', chunk.length);
    console.log('---');
  });

  console.log('\nAll items processed!');
}

// Run with error handling
main().catch(error => {
  console.error('Error:', error);
}); 