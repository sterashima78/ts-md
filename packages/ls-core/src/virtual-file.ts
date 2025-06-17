import type { Mapping, VirtualCode } from '@volar/language-core';
import type ts from 'typescript';
import { getChunkInfoDict } from './parsers.js';

export class TsMdVirtualFile implements VirtualCode {
  id!: string;
  languageId = 'ts';
  mappings: [] = [];
  embeddedCodes: VirtualCode[] = [];
  linkedCodeMappings: Mapping[] = [];

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
    const infoDict = getChunkInfoDict(this.snapshot, this.uri);
    this.embeddedCodes = [];
    this.linkedCodeMappings = [];
    this.dict = {};

    for (const [name, info] of Object.entries(infoDict)) {
      const { code, start } = info;
      this.dict[name] = code;
      this.embeddedCodes.push({
        id: `${this.uri}__${name}.ts`,
        languageId: 'ts',
        mappings: [],
        linkedCodeMappings: [
          {
            sourceOffsets: [0],
            generatedOffsets: [start],
            lengths: [code.length],
            generatedLengths: [code.length],
            data: {},
          },
        ],
        snapshot: {
          getText: (s, e) => code.slice(s, e),
          getLength: () => code.length,
          getChangeRange: () => undefined,
        },
      });
      this.linkedCodeMappings.push({
        sourceOffsets: [start],
        generatedOffsets: [0],
        lengths: [code.length],
        generatedLengths: [code.length],
        data: {},
      });
    }
  }
}
