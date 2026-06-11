import type { SourceSpan } from './span.js';

export type Severity = 'error' | 'warning' | 'info';

export interface DiagnosticLabel {
  span: SourceSpan;
  message: string;
  style: 'primary' | 'secondary';
}

export interface DiagnosticFix {
  message: string;
  replacements: Array<{ span: SourceSpan; replacement: string }>;
}

export interface Diagnostic {
  version: '1';
  code: string;
  severity: Severity;
  message: string;
  span: SourceSpan;
  labels: DiagnosticLabel[];
  notes: string[];
  helps: string[];
  fix?: DiagnosticFix;
}
