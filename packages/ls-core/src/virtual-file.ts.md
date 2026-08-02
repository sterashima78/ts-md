# Projecting Markdown as virtual TypeScript files

Volar は source document と、その中に埋め込まれた language ごとの virtual code を対応付けて language feature を提供します。TS-MD では Markdown document 自体を root とし、各 TypeScript code fence を独立した embedded code として公開します。

この class が維持する情報は三層あります。

- root は元の Markdown snapshot 全体を表す
- `modules` は parser が返した論理的な TS-MD module を名前で引けるようにする
- `embeddedCodes` は TypeScript service が読む仮想 source と source mapping を表す

document が編集されるたびに三層を同じ parser 結果から再構築し、古い module や mapping が残らないようにします。

## Mapping policy

すべての TypeScript feature を code fence 内で有効にします。各 embedded code は生成側 offset 0 から始まり、元 Markdown 側では parser が計算した `module.start` に対応します。

これにより TypeScript service は通常の `.ts` source として code を扱い、Volar は completion、diagnostics、navigation の位置を Markdown 上へ戻せます。

```ts main
import {
  createVirtualModuleFileName,
  parseDocument,
  type TsMdModule,
} from '@sterashima78/ts-md-core';
import type {
  CodeInformation,
  CodeMapping,
  Mapping,
  VirtualCode,
} from '@volar/language-core';
import type ts from 'typescript';

const typescriptFeatures = {
  completion: true,
  format: true,
  navigation: true,
  semantic: true,
  structure: true,
  verification: true,
} satisfies CodeInformation;

export class TsMdVirtualFile implements VirtualCode {
  id: string;
  languageId = 'markdown';
  mappings: CodeMapping[] = [];
  embeddedCodes: VirtualCode[] = [];
  linkedCodeMappings: Mapping[] = [];
  private modules = new Map<string, TsMdModule>();

  constructor(
    public snapshot: ts.IScriptSnapshot,
    public readonly fileName: string,
  ) {
    this.id = fileName;
    this.refreshEmbedded();
  }

  update(snapshot: ts.IScriptSnapshot) {
    this.snapshot = snapshot;
    this.refreshEmbedded();
  }

  getModule(moduleName: string): TsMdModule | undefined {
    return this.modules.get(moduleName);
  }

  private refreshEmbedded() {
    const markdown = this.snapshot.getText(0, this.snapshot.getLength());
    const document = parseDocument(markdown, this.fileName);
    this.modules = new Map(
      document.modules.map((module) => [module.name, module]),
    );
    this.embeddedCodes = document.modules.map((module) => ({
      id: createVirtualModuleFileName({
        documentPath: this.fileName,
        moduleName: module.name,
      }),
      languageId: 'typescript',
      mappings: [
        {
          sourceOffsets: [module.start],
          generatedOffsets: [0],
          lengths: [module.code.length],
          data: typescriptFeatures,
        },
      ],
      linkedCodeMappings: [],
      snapshot: {
        getText: (start, end) => module.code.slice(start, end),
        getLength: () => module.code.length,
        getChangeRange: () => undefined,
      },
    }));
    this.linkedCodeMappings = [];
    this.mappings = [
      {
        sourceOffsets: [0],
        generatedOffsets: [0],
        lengths: [this.snapshot.getLength()],
        data: typescriptFeatures,
      },
    ];
  }
}
```

`getModule` は language plugin が module の `ts` / `tsx` 種別を調べるための橋渡しです。embedded code の ID には core の仮想 module 規則を使うため、compiler、loader、bundler と同じ module identity を共有できます。
