import type {
  CodeInformation,
  CodeMapping,
  LanguagePlugin,
  VirtualCode,
} from '@volar/language-core';
import type {
  LanguageServiceEnvironment,
  ProjectContext,
} from '@volar/language-service';
import { createTypeScriptWorkerLanguageService } from '@volar/monaco/worker';
import type * as monaco from 'monaco-editor';
import * as editorWorker from 'monaco-editor/editor/editor.worker';
import ts from 'typescript';
import { create as createTypeScriptServicePlugins } from 'volar-service-typescript';
import type { URI } from 'vscode-uri';
import { URI as Uri } from 'vscode-uri';

const typescriptFeatures = {
  completion: true,
  format: true,
  navigation: true,
  semantic: true,
  structure: true,
  verification: true,
} satisfies CodeInformation;

const rawTypeScriptLibraries = import.meta.glob(
  '../../node_modules/typescript/lib/lib.*.d.ts',
  {
    eager: true,
    import: 'default',
    query: '?raw',
  },
) as Record<string, string>;

const defaultTypeScriptLibraryFileName = '/lib.es2022.full.d.ts';
const defaultTypeScriptLibrarySource = Object.entries(rawTypeScriptLibraries)
  .filter(([path]) => isIncludedLibrary(path))
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([, source]) => stripReferenceDirectives(source))
  .join('\n');
const defaultTypeScriptLibrarySnapshot = ts.ScriptSnapshot.fromString(
  defaultTypeScriptLibrarySource,
);

const testTsMdLanguagePlugin: LanguagePlugin<URI, TestTsMdVirtualFile> = {
  getLanguageId(uri) {
    return uri.path.endsWith('.ts.md') ? 'ts-md' : undefined;
  },

  createVirtualCode(_uri, languageId, snapshot) {
    if (languageId !== 'ts-md') return;
    return new TestTsMdVirtualFile(snapshot);
  },

  updateVirtualCode(_uri, virtualCode, snapshot) {
    virtualCode.update(snapshot);
    return virtualCode;
  },

  typescript: {
    extraFileExtensions: [
      {
        extension: 'ts.md',
        isMixedContent: true,
        scriptKind: ts.ScriptKind.Deferred,
      },
    ],

    getServiceScript(root) {
      const main = root.embeddedCodes.find((code) => code.id === 'main');
      if (!main) return;
      return {
        code: main,
        extension: root.mainScriptKind === ts.ScriptKind.TSX ? '.tsx' : '.ts',
        scriptKind: root.mainScriptKind,
      };
    },
  },
};

self.onmessage = () => {
  editorWorker.initialize((workerContext: monaco.worker.IWorkerContext) => {
    const env: LanguageServiceEnvironment = {
      workspaceFolders: [Uri.parse('file:///')],
    };

    return createTypeScriptWorkerLanguageService({
      typescript: ts,
      compilerOptions: {
        allowNonTsExtensions: true,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        noEmit: true,
        strict: true,
        target: ts.ScriptTarget.ES2022,
      },
      env,
      uriConverter: {
        asFileName: (uri) => uri.fsPath,
        asUri: (fileName) => Uri.file(fileName),
      },
      workerContext,
      languagePlugins: [testTsMdLanguagePlugin],
      languageServicePlugins: createTypeScriptServicePlugins(ts),
      setup({ project }) {
        installTypeScriptLibraries(project);
      },
    });
  });
};

class TestTsMdVirtualFile implements VirtualCode {
  readonly id = 'root';
  readonly languageId = 'markdown';
  mappings: CodeMapping[] = [];
  embeddedCodes: VirtualCode[] = [];
  linkedCodeMappings = [];
  mainScriptKind = ts.ScriptKind.TS;

  constructor(public snapshot: ts.IScriptSnapshot) {
    this.update(snapshot);
  }

  update(snapshot: ts.IScriptSnapshot) {
    this.snapshot = snapshot;
    const markdown = snapshot.getText(0, snapshot.getLength());
    const main = extractMainModule(markdown);

    this.mappings = [
      {
        sourceOffsets: [0],
        generatedOffsets: [0],
        lengths: [snapshot.getLength()],
        data: typescriptFeatures,
      },
    ];
    this.embeddedCodes = main
      ? [
          {
            id: 'main',
            languageId: 'typescript',
            snapshot: ts.ScriptSnapshot.fromString(main.code),
            mappings: [
              {
                sourceOffsets: [main.start],
                generatedOffsets: [0],
                lengths: [main.code.length],
                data: typescriptFeatures,
              },
            ],
            embeddedCodes: [],
            linkedCodeMappings: [],
          },
        ]
      : [];
    this.mainScriptKind = main?.scriptKind ?? ts.ScriptKind.TS;
  }
}

function extractMainModule(markdown: string) {
  const opening = /^(`{3,}|~{3,})(ts|tsx)\s+main\s*$(?:\r?\n)?/m.exec(
    markdown,
  );
  if (!opening) return;

  const start = opening.index + opening[0].length;
  const closing = new RegExp(
    `^${escapeRegExp(opening[1])}\\s*$`,
    'm',
  ).exec(markdown.slice(start));
  if (!closing) return;

  return {
    code: markdown.slice(start, start + closing.index),
    start,
    scriptKind:
      opening[2] === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function installTypeScriptLibraries(project: ProjectContext) {
  const host = project.typescript?.languageServiceHost;
  if (!host) return;

  const fallbackGetScriptFileNames = host.getScriptFileNames.bind(host);
  const fallbackGetScriptSnapshot = host.getScriptSnapshot.bind(host);
  const fallbackGetScriptVersion = host.getScriptVersion?.bind(host);
  const fallbackFileExists = host.fileExists?.bind(host);
  const fallbackReadFile = host.readFile?.bind(host);

  host.getDefaultLibFileName = () => defaultTypeScriptLibraryFileName;
  host.getScriptFileNames = () => [
    ...fallbackGetScriptFileNames(),
    defaultTypeScriptLibraryFileName,
  ];
  host.getScriptSnapshot = (fileName) =>
    isDefaultTypeScriptLibrary(fileName)
      ? defaultTypeScriptLibrarySnapshot
      : fallbackGetScriptSnapshot(fileName);
  host.getScriptVersion = (fileName) =>
    isDefaultTypeScriptLibrary(fileName)
      ? '0'
      : (fallbackGetScriptVersion?.(fileName) ?? '0');
  host.fileExists = (fileName) =>
    isDefaultTypeScriptLibrary(fileName) ||
    (fallbackFileExists?.(fileName) ?? false);
  host.readFile = (fileName) =>
    isDefaultTypeScriptLibrary(fileName)
      ? defaultTypeScriptLibrarySource
      : fallbackReadFile?.(fileName);
}

function isDefaultTypeScriptLibrary(fileName: string) {
  return normalizeFileName(fileName) === defaultTypeScriptLibraryFileName;
}

function normalizeFileName(fileName: string) {
  const normalized = fileName.replaceAll('\\', '/');
  return `/${normalized.slice(normalized.lastIndexOf('/') + 1)}`;
}

function isIncludedLibrary(path: string) {
  const fileName = normalizeFileName(path).slice(1);
  if (
    fileName === 'lib.dom.d.ts' ||
    fileName === 'lib.dom.iterable.d.ts' ||
    fileName === 'lib.dom.asynciterable.d.ts' ||
    fileName === 'lib.scripthost.d.ts' ||
    fileName === 'lib.decorators.d.ts' ||
    fileName === 'lib.decorators.legacy.d.ts'
  ) {
    return true;
  }

  const match = /^lib\.es(\d+)(?:\..+)?\.d\.ts$/.exec(fileName);
  return match ? Number(match[1]) <= 2022 : false;
}

function stripReferenceDirectives(source: string) {
  return source.replace(/^\/\/\/\s*<reference\b[^>]*\/>\s*$/gm, '');
}
