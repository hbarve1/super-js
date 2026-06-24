/**
 * SuperJS Debug Adapter Protocol server (WS-B2 skeleton).
 *
 * Phase 0: initialize + launch handshake; compile/CDP wiring lands in Phase 1.
 */

import {
  DebugSession,
  InitializedEvent,
  OutputEvent,
  TerminatedEvent,
} from '@vscode/debugadapter';
import type { DebugProtocol } from '@vscode/debugprotocol';

export interface LaunchArgs extends DebugProtocol.LaunchRequestArguments {
  program?: string;
  outDir?: string;
  stopOnEntry?: boolean;
}

export class SuperJsDebugSession extends DebugSession {
  protected override initializeRequest(
    response: DebugProtocol.InitializeResponse,
    _args: DebugProtocol.InitializeRequestArguments,
  ): void {
    response.body = response.body ?? {};
    response.body.supportsConfigurationDoneRequest = false;
    response.body.supportsSetVariable = false;
    this.sendResponse(response);
    this.sendEvent(new InitializedEvent());
  }

  protected override launchRequest(
    response: DebugProtocol.LaunchResponse,
    args: DebugProtocol.LaunchRequestArguments,
  ): void {
    const launch = args as LaunchArgs;
    if (!launch.program) {
      this.sendErrorResponse(response, 1, 'launch requires `program` (path to .sjs entrypoint)');
      return;
    }
    this.sendResponse(response);
    const outDir = launch.outDir ?? 'dist';
    this.sendEvent(new OutputEvent(
      `SuperJS DAP skeleton (WS-B2 Phase 0) — Node/CDP backend not wired yet.\n`
      + `  program: ${launch.program}\n  outDir: ${outDir}\n`,
      'console',
    ));
    this.sendEvent(new TerminatedEvent());
  }

  protected override disconnectRequest(
    response: DebugProtocol.DisconnectResponse,
    _args: DebugProtocol.DisconnectArguments,
  ): void {
    this.sendResponse(response);
  }

  protected override setBreakPointsRequest(
    response: DebugProtocol.SetBreakpointsResponse,
    args: DebugProtocol.SetBreakpointsArguments,
  ): void {
    response.body = {
      breakpoints: (args.breakpoints ?? []).map((bp: DebugProtocol.SourceBreakpoint) => ({
        verified: false,
        line: bp.line,
        message: 'Breakpoints land in WS-B2 Phase 1',
      })),
    };
    this.sendResponse(response);
  }
}

/** Start the DAP server on stdin/stdout (production entry for `superjs debug`). */
export function runDebugStdio(): void {
  DebugSession.run(SuperJsDebugSession);
}
