export interface IScriptSnapshot {
  getText(start: number, end: number): string;
  getLength(): number;
  getChangeRange(
    oldSnapshot: IScriptSnapshot,
  ): import('typescript').TextChangeRange | undefined;
}

export interface VirtualCode {
  id: string;
  languageId: string;
  snapshot: IScriptSnapshot;
  embeddedCodes?: VirtualCode[];
}

export interface EmbeddedLanguagePlugin {
  getLanguageId(scriptId: string): string | undefined;
  createVirtualCode?(
    scriptId: string,
    languageId: string,
    snapshot: IScriptSnapshot,
  ): VirtualCode | undefined;
  updateVirtualCode?(
    scriptId: string,
    virtualCode: VirtualCode,
    newSnapshot: IScriptSnapshot,
  ): VirtualCode | undefined;
  disposeVirtualCode?(scriptId: string, virtualCode: VirtualCode): void;
}
