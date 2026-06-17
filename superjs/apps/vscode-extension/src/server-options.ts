/**
 * How to launch the SuperJS language server, derived from the user's settings.
 * Kept free of any `vscode` import so it can be unit-tested in plain Node — the
 * extension entry point (`extension.ts`) reads the settings and calls this.
 */

export interface SuperjsSettings {
  /** Override for the `superjs` binary path; empty/undefined means "on PATH". */
  readonly serverPath?: string;
  /** LSP cache budget in MB, forwarded as an initialization option. */
  readonly memoryBudgetMB?: number;
}

export interface ServerCommand {
  readonly command: string;
  readonly args: readonly string[];
  readonly initializationOptions: { memoryBudgetMB?: number };
}

/** Resolve the spawn command for `superjs lsp` from the extension settings. */
export function resolveServerCommand(settings: SuperjsSettings = {}): ServerCommand {
  const path = settings.serverPath?.trim();
  const command = path && path.length > 0 ? path : 'superjs';
  const initializationOptions: { memoryBudgetMB?: number } = {};
  if (typeof settings.memoryBudgetMB === 'number' && settings.memoryBudgetMB > 0) {
    initializationOptions.memoryBudgetMB = settings.memoryBudgetMB;
  }
  return { command, args: ['lsp'], initializationOptions };
}
