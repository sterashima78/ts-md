# Virtual File

各 `.ts.md` コードフェンスを、一つの仮想 TypeScript module として公開します。

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
