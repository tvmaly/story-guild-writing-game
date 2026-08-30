export type RuntimeDiagnosticKind = 'error' | 'unhandledrejection' | 'asset-load';

export interface RuntimeDiagnosticEntry {
  kind: RuntimeDiagnosticKind;
  message: string;
  url?: string;
}

export interface RuntimeDiagnosticsSnapshot {
  entries: RuntimeDiagnosticEntry[];
}

declare global {
  interface Window {
    __STORY_GUILD_TEST_DIAGNOSTICS__?: RuntimeDiagnosticsSnapshot;
  }
}

const describeReason = (reason: unknown): string => {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  try { return JSON.stringify(reason); }
  catch { return 'Unknown rejected promise.'; }
};

export class RuntimeDiagnostics {
  private readonly entries: RuntimeDiagnosticEntry[] = [];

  constructor() {
    this.publish();
    window.addEventListener('error', (event) => {
      this.record('error', event.message || 'Uncaught browser error.', event.filename || undefined);
    });
    window.addEventListener('unhandledrejection', (event) => {
      this.record('unhandledrejection', describeReason(event.reason));
    });
  }

  record(kind: RuntimeDiagnosticKind, message: string, url?: string): void {
    const entry: RuntimeDiagnosticEntry = { kind, message, ...(url ? { url } : {}) };
    if (!this.entries.some((existing) => existing.kind === entry.kind && existing.message === entry.message && existing.url === entry.url)) {
      this.entries.push(entry);
      this.publish();
    }
  }

  snapshot(): RuntimeDiagnosticsSnapshot {
    return { entries: structuredClone(this.entries) };
  }

  private publish(): void {
    window.__STORY_GUILD_TEST_DIAGNOSTICS__ = this.snapshot();
  }
}
