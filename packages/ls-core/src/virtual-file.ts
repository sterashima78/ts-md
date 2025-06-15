import type { VirtualCode } from '@volar/language-core';
import type ts from 'typescript';

export class TsMdVirtualFile implements VirtualCode {
  id!: string;
  languageId = 'ts';
  mappings: [] = [];
  embeddedCodes: VirtualCode[] = [];

  constructor(
    public snapshot: ts.IScriptSnapshot,
    public uri: string,
    private dict: Record<string, string>,
  ) {
    this.id = uri;
    this.refreshEmbedded();
  }

  /** Markdown が更新された時に呼ぶ */
  update(snapshot: ts.IScriptSnapshot, dict: Record<string, string>) {
    this.snapshot = snapshot;
    this.dict = dict;
    this.refreshEmbedded();
  }

  private refreshEmbedded() {
    this.embeddedCodes = Object.entries(this.dict).map(([name, code]) => ({
      id: `${this.uri}:${name}`,
      languageId: 'ts',
      mappings: [],
      snapshot: {
        getText: (s, e) => code.slice(s, e),
        getLength: () => code.length,
        getChangeRange: () => undefined,
      },
    }));
  }
}
