import { describe, it, expect } from 'vitest';
import { serve } from './transport.js';
import { encodeMessage, MessageBuffer } from './jsonrpc.js';

/** A minimal readable: hand-feed chunks via `emit`. */
class FakeInput {
  private listener?: (chunk: string) => void;
  on(_event: 'data', listener: (chunk: string) => void) { this.listener = listener; return this; }
  emit(chunk: string) { this.listener?.(chunk); }
}

class FakeOutput {
  raw = '';
  write(chunk: string) { this.raw += chunk; return true; }
}

describe('serve — stdio binding', () => {
  it('decodes framed input and writes framed replies', () => {
    const input = new FakeInput();
    const output = new FakeOutput();
    serve({ input, output });

    input.emit(encodeMessage({ id: 1, method: 'initialize', params: {} }));

    const replies = new MessageBuffer().append(output.raw);
    expect(replies[0]).toMatchObject({ id: 1, result: { capabilities: {} } });
  });

  it('handles a frame delivered in two chunks', () => {
    const input = new FakeInput();
    const output = new FakeOutput();
    serve({ input, output });

    const framed = encodeMessage({ id: 2, method: 'shutdown' });
    const mid = Math.floor(framed.length / 2);
    input.emit(framed.slice(0, mid));
    expect(output.raw).toBe('');
    input.emit(framed.slice(mid));

    const replies = new MessageBuffer().append(output.raw);
    expect(replies[0]).toMatchObject({ id: 2, result: null });
  });
});
