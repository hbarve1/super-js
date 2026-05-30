export interface SourceSpan {
    file: string;
    startLine: number;
    startCol: number;
    endLine: number;
    endCol: number;
    byteStart: number;
    byteEnd: number;
}
export declare function spanUnion(a: SourceSpan, b: SourceSpan): SourceSpan;
//# sourceMappingURL=span.d.ts.map