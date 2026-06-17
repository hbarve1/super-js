import { describe, it, expect } from 'vitest';
import { encodeMessage, MessageBuffer } from './jsonrpc.js';

describe('encodeMessage', () => {
  it('prepends a Content-Length header sized in UTF-8 bytes', () => {
    const framed = encodeMessage({ method: 'ping', params: { s: 'é' } });
    const [header, body] = framed.split('\r\n\r\n');
    const length = Number(/Content-Length: (\d+)/.exec(header!)![1]);
    expect(Buffer.byteLength(body!, 'utf8')).toBe(length);
    expect(JSON.parse(body!)).toMatchObject({ jsonrpc: '2.0', method: 'ping' });
  });
});

describe('MessageBuffer', () => {
  it('decodes a single complete frame', () => {
    const buf = new MessageBuffer();
    const msgs = buf.append(encodeMessage({ id: 1, method: 'initialize' }));
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ id: 1, method: 'initialize' });
  });

  it('reassembles a frame split across chunks', () => {
    const buf = new MessageBuffer();
    const framed = encodeMessage({ id: 2, method: 'shutdown' });
    const mid = Math.floor(framed.length / 2);
    expect(buf.append(framed.slice(0, mid))).toHaveLength(0);
    const msgs = buf.append(framed.slice(mid));
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ id: 2, method: 'shutdown' });
  });

  it('drains back-to-back frames in one chunk', () => {
    const buf = new MessageBuffer();
    const chunk = encodeMessage({ id: 1, method: 'a' }) + encodeMessage({ id: 2, method: 'b' });
    const msgs = buf.append(chunk);
    expect(msgs.map((m) => m.method)).toEqual(['a', 'b']);
  });

  it('skips a malformed-JSON frame without stalling the next', () => {
    const buf = new MessageBuffer();
    const bad = `Content-Length: 3\r\n\r\n{ x`;
    const msgs = buf.append(bad + encodeMessage({ id: 9, method: 'ok' }));
    expect(msgs.map((m) => m.method)).toEqual(['ok']);
  });
});
