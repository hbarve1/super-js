/**
 * SuperJS VS Code extension entry point. Beyond the static grammar/snippets,
 * this starts the SuperJS language server (`superjs lsp`) and connects it as an
 * LSP client, so the editor gets diagnostics, hover, go-to-definition,
 * completion, signature help, semantic tokens, formatting, rename, references,
 * code actions and inlay hints from the compiler.
 */

import { workspace, commands, type ExtensionContext } from 'vscode';
import {
  LanguageClient, TransportKind,
  type LanguageClientOptions, type ServerOptions,
} from 'vscode-languageclient/node';
import { resolveServerCommand } from './server-options';

let client: LanguageClient | undefined;

export function activate(context: ExtensionContext): void {
  start();
  context.subscriptions.push(
    commands.registerCommand('superjs.restartServer', async () => {
      await stop();
      start();
    }),
  );
}

function start(): void {
  const cfg = workspace.getConfiguration('superjs');
  const { command, args, initializationOptions } = resolveServerCommand({
    serverPath: cfg.get<string>('server.path'),
    memoryBudgetMB: cfg.get<number>('lsp.memoryBudgetMB'),
  });

  const serverOptions: ServerOptions = { command, args: [...args], transport: TransportKind.stdio };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'superjs' }],
    initializationOptions,
  };

  client = new LanguageClient('superjs', 'SuperJS Language Server', serverOptions, clientOptions);
  void client.start();
}

async function stop(): Promise<void> {
  if (client) {
    await client.stop();
    client = undefined;
  }
}

export function deactivate(): Thenable<void> | undefined {
  return stop();
}
