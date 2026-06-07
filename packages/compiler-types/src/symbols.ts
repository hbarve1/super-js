export type ModuleId = string;

export interface SJSSymbol {
  readonly id: number;
  readonly name: string;
  readonly moduleId: ModuleId;
  readonly declaredAt: { readonly line: number; readonly col: number };
}
