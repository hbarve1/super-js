export interface SourceSpan {
  file: string;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  byteStart: number;
  byteEnd: number;
}

export function spanUnion(a: SourceSpan, b: SourceSpan): SourceSpan {
  return {
    file: a.file,
    startLine: Math.min(a.startLine, b.startLine),
    startCol: a.startLine < b.startLine ? a.startCol
             : a.startLine > b.startLine ? b.startCol
             : Math.min(a.startCol, b.startCol),
    endLine: Math.max(a.endLine, b.endLine),
    endCol: a.endLine > b.endLine ? a.endCol
           : a.endLine < b.endLine ? b.endCol
           : Math.max(a.endCol, b.endCol),
    byteStart: Math.min(a.byteStart, b.byteStart),
    byteEnd: Math.max(a.byteEnd, b.byteEnd),
  };
}
