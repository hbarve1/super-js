import { describe, it, expect } from 'vitest';
import { SYNTHETIC_SPAN } from '@superjs/types';
import {
  REGISTRY,
  Codes,
  getDescriptor,
  allCodes,
  formatMessage,
  specUrlFor,
  createDiagnostic,
  DiagnosticBag,
} from '../index.js';

describe('registry integrity', () => {
  it('every descriptor is self-consistent (code field matches key)', () => {
    for (const [key, desc] of Object.entries(REGISTRY)) {
      expect(desc.code).toBe(key);
      expect(['error', 'warning', 'info', 'hint']).toContain(desc.severity);
      expect(desc.template.length).toBeGreaterThan(0);
    }
  });

  it('contains the canonical Stage-0 + Stage-1 codes', () => {
    for (const code of ['SJS-P001', 'SJS-E001', 'SJS-E019', 'SJS-W012', 'SJS-L011']) {
      expect(getDescriptor(code)).toBeDefined();
    }
    // 6 parser + 19 type + 11 warning + 6 lint = 42
    expect(allCodes().length).toBe(42);
  });

  it('severity matches spec: parser/E* error, L001 warning, L011 error', () => {
    expect(getDescriptor('SJS-P099')?.severity).toBe('error');
    expect(getDescriptor('SJS-E004')?.severity).toBe('error');
    expect(getDescriptor('SJS-L001')?.severity).toBe('warning');
    expect(getDescriptor('SJS-L011')?.severity).toBe('error');
    expect(getDescriptor('SJS-W012')?.severity).toBe('warning');
  });

  it('Codes constants strip the SJS- prefix', () => {
    expect(Codes['E001']).toBe('SJS-E001');
    expect(Codes['L011']).toBe('SJS-L011');
  });
});

describe('message templating', () => {
  it('fills named placeholders', () => {
    expect(formatMessage('SJS-E001', { type: 'string' })).toBe(
      'Null or undefined assigned to non-nullable type `string`',
    );
    expect(formatMessage('SJS-E002', { expected: 'number', found: 'string' })).toBe(
      'Type mismatch: expected `number`, found `string`',
    );
  });

  it('leaves unknown tokens in place and unknown codes as the code', () => {
    expect(formatMessage('SJS-E001')).toContain('{type}');
    expect(formatMessage('SJS-X999')).toBe('SJS-X999');
  });
});

describe('createDiagnostic', () => {
  it('builds a diagnostic from a code + span with registry severity & url', () => {
    const diag = createDiagnostic({
      code: 'SJS-E007',
      span: SYNTHETIC_SPAN,
      params: { variant: 'None' },
      file: 'a.sjs',
    });
    expect(diag.severity).toBe('error');
    expect(diag.message).toBe('Match expression is not exhaustive: missing variant `None`');
    expect(diag.specUrl).toBe(specUrlFor('SJS-E007'));
    expect(diag.file).toBe('a.sjs');
  });

  it('honours severity override and message override', () => {
    const diag = createDiagnostic({
      code: 'SJS-W001',
      span: SYNTHETIC_SPAN,
      severity: 'error',
      message: 'custom',
    });
    expect(diag.severity).toBe('error');
    expect(diag.message).toBe('custom');
  });
});

describe('DiagnosticBag', () => {
  it('collects and partitions errors vs warnings', () => {
    const bag = new DiagnosticBag({ file: 'x.sjs' });
    bag.report({ code: 'SJS-E003', span: SYNTHETIC_SPAN });
    bag.report({ code: 'SJS-W005', span: SYNTHETIC_SPAN });
    expect(bag.size).toBe(2);
    expect(bag.errors).toHaveLength(1);
    expect(bag.warnings).toHaveLength(1);
    expect(bag.hasErrors).toBe(true);
    expect(bag.all[0]?.file).toBe('x.sjs');
  });

  it('strict mode promotes warnings to errors', () => {
    const bag = new DiagnosticBag({ strict: true });
    const d = bag.report({ code: 'SJS-W005', span: SYNTHETIC_SPAN });
    expect(d.severity).toBe('error');
    expect(bag.hasErrors).toBe(true);
  });
});
