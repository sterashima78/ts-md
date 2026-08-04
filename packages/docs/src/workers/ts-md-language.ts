import type {
  CodeInformation,
  CodeMapping,
  LanguagePlugin,
  Mapping,
  VirtualCode,
} from '@volar/language-service';
import { forEachEmbeddedCode } from '@volar/language-service';
import ts from 'typescript';
import { URI } from 'vscode-uri';

const virtualModuleMarker = '.__tsmd__.';
const moduleNamePattern = /^[a-zA-Z0-9._-]+$/;

export interface TsMdModule {
  name: string;
  language: 'ts' | 'tsx';
  code: string;
  start: number;
  end: number;
}

interface FenceOpening {
  fence: string;
  info: string;
}

const typescriptFeatures = {
  completion: true,
  format: true,
  navigation: true,
  semantic: true,
  structure: true,
  verification: true,
} satisfies CodeInformation;

export const tsMdEditorPlugin: LanguagePlugin<unknown, TsMdVirtualFile> = {
  getLanguageId(fileName) {
    return getFileName(fileName).endsWith('.ts.md') ? 'ts-md' : undefined;
  },

  createVirtualCode(fileName, languageId, snapshot) {
    if (languageId !== 'ts-md') return;
    return new TsMdVirtualFile(snapshot, getFileName(fileName));
  },

  updateVirtualCode(fileName, oldFile, snapshot) {
    if (!getFileName(fileName).endsWith('.ts.md')) return;
    oldFile.update(snapshot);
    return oldFile;
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
      const main = root.getModuleCode('main');
      if (!main) {
        return {
          code: createDocumentServiceCode(root),
          extension: '.ts',
          scriptKind: ts.ScriptKind.TS,
        };
      }
      return {
        code: main,
        extension: root.getExtension('main'),
        scriptKind: root.getScriptKind('main'),
      };
    },

    getExtraServiceScripts(_fileName, root) {
      const main = root.getModuleCode('main');
      const scripts: Array<{
        fileName: string;
        code: VirtualCode;
        extension: '.ts' | '.tsx';
        scriptKind: ts.ScriptKind;
      }> = [];

      for (const code of forEachEmbeddedCode(root)) {
        if (code.languageId !== 'typescript' || code === main) continue;
        const moduleName = parseVirtualModuleFileName(code.id)?.moduleName;
        if (!moduleName) continue;
        scripts.push({
          fileName: code.id,
          code,
          extension: root.getExtension(moduleName),
          scriptKind: root.getScriptKind(moduleName),
        });
      }
      return scripts;
    },
  },
};

export function resolveTsMdFileName(
  specifier: string,
  fromFile: unknown,
): string | undefined {
  const resolved = resolveTsMdImport(specifier, getFileName(fromFile));
  if (!resolved) return;
  if (resolved.moduleName === 'main') return resolved.documentPath;
  return createVirtualModuleFileName(resolved);
}

class TsMdVirtualFile implements VirtualCode {
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

  getModuleCode(moduleName: string) {
    const id = createVirtualModuleFileName({
      documentPath: this.fileName,
      moduleName,
    });
    return this.embeddedCodes.find((code) => code.id === id);
  }

  getScriptKind(moduleName: string) {
    return this.modules.get(moduleName)?.language === 'tsx'
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS;
  }

  getExtension(moduleName: string): '.ts' | '.tsx' {
    return this.modules.get(moduleName)?.language === 'tsx' ? '.tsx' : '.ts';
  }

  private refreshEmbedded() {
    const markdown = this.snapshot.getText(0, this.snapshot.getLength());
    const modules = parseTsMdModules(markdown, this.fileName);
    this.modules = new Map(modules.map((module) => [module.name, module]));
    this.embeddedCodes = modules.map((module) => ({
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
      snapshot: ts.ScriptSnapshot.fromString(module.code),
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

function createDocumentServiceCode(root: TsMdVirtualFile): VirtualCode {
  return {
    id: `${root.fileName}.__tsmd_document__.ts`,
    languageId: 'typescript',
    mappings: [],
    embeddedCodes: [],
    linkedCodeMappings: [],
    snapshot: ts.ScriptSnapshot.fromString('export {};'),
  };
}

export function parseTsMdModules(markdown: string, uri: string): TsMdModule[] {
  const modules: TsMdModule[] = [];
  const names = new Set<string>();
  let offset = 0;

  while (offset <= markdown.length) {
    const line = readLine(markdown, offset);
    const opening = parseFenceOpening(line.text);
    if (!opening) {
      if (line.nextOffset === undefined) break;
      offset = line.nextOffset;
      continue;
    }

    const codeStart = line.nextOffset ?? markdown.length;
    const closing = findClosingFence(markdown, codeStart, opening.fence);
    const [language, ...metadata] = opening.info.split(/[ \t]+/);

    if (language === 'ts' || language === 'tsx') {
      const name = metadata.join(' ').trim();
      if (!name) {
        throw new Error(
          `${uri}:${line.start}: TypeScript code fence requires a module name`,
        );
      }
      if (!moduleNamePattern.test(name)) {
        throw new Error(`${uri}:${line.start}: Invalid module name '${name}'`);
      }
      if (names.has(name)) {
        throw new Error(`${uri}:${line.start}: Duplicate module '${name}'`);
      }
      names.add(name);

      const code = markdown.slice(codeStart, closing.codeEnd);
      modules.push({
        name,
        language,
        code,
        start: codeStart,
        end: codeStart + code.length,
      });
    }

    if (closing.nextOffset === undefined) break;
    offset = closing.nextOffset;
  }

  return modules;
}

function parseFenceOpening(line: string): FenceOpening | undefined {
  const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  if (!match) return;

  const fence = match[1];
  const info = match[2].trim();
  if (fence[0] === '`' && info.includes('`')) return;
  return { fence, info };
}

function findClosingFence(markdown: string, codeStart: number, fence: string) {
  const closingPattern = new RegExp(
    `^ {0,3}${escapeRegExp(fence[0])}{${fence.length},}[ \\t]*$`,
  );
  let cursor = codeStart;

  while (cursor <= markdown.length) {
    const candidate = readLine(markdown, cursor);
    if (closingPattern.test(candidate.text)) {
      return {
        codeEnd: trimLineBreakBefore(markdown, candidate.start),
        nextOffset: candidate.nextOffset,
      };
    }
    if (candidate.nextOffset === undefined) break;
    cursor = candidate.nextOffset;
  }

  return {
    codeEnd: markdown.length,
    nextOffset: undefined,
  };
}

function readLine(source: string, start: number) {
  const newline = source.indexOf('\n', start);
  if (newline === -1) {
    const end = source.endsWith('\r') ? source.length - 1 : source.length;
    return {
      start,
      text: source.slice(start, end),
      nextOffset: undefined,
    };
  }
  const end =
    newline > start && source[newline - 1] === '\r' ? newline - 1 : newline;
  return {
    start,
    text: source.slice(start, end),
    nextOffset: newline + 1,
  };
}

function trimLineBreakBefore(source: string, offset: number) {
  if (offset === 0 || source[offset - 1] !== '\n') return offset;
  return offset > 1 && source[offset - 2] === '\r' ? offset - 2 : offset - 1;
}

function createVirtualModuleFileName({
  documentPath,
  moduleName,
}: {
  documentPath: string;
  moduleName: string;
}) {
  return `${normalizeAbsolutePath(documentPath)}${virtualModuleMarker}${encodeURIComponent(moduleName)}.ts`;
}

function parseVirtualModuleFileName(value: string) {
  const normalized = normalizeAbsolutePath(value);
  const markerIndex = normalized.lastIndexOf(virtualModuleMarker);
  if (markerIndex === -1 || !normalized.endsWith('.ts')) return;

  const documentPath = normalized.slice(0, markerIndex);
  if (!documentPath.endsWith('.ts.md')) return;
  const encodedModuleName = normalized.slice(
    markerIndex + virtualModuleMarker.length,
    -'.ts'.length,
  );
  if (!encodedModuleName || encodedModuleName.includes('/')) return;

  try {
    return {
      documentPath,
      moduleName: decodeURIComponent(encodedModuleName),
    };
  } catch {
    return;
  }
}

function resolveTsMdImport(specifier: string, importer: string) {
  const virtualModule = parseVirtualModuleFileName(importer);
  const base = virtualModule?.documentPath ?? normalizeAbsolutePath(importer);

  if (specifier.startsWith(':')) {
    const moduleName = specifier.slice(1);
    if (!moduleName) return;
    return { documentPath: base, moduleName };
  }

  if (specifier.endsWith('.ts.md')) {
    return {
      documentPath: resolvePath(dirname(base), specifier),
      moduleName: 'main',
    };
  }

  return undefined;
}

function getFileName(fileName: unknown) {
  if (
    typeof fileName === 'object' &&
    fileName !== null &&
    'fsPath' in fileName &&
    typeof fileName.fsPath === 'string'
  ) {
    return fileName.fsPath;
  }
  return String(fileName);
}

function normalizeAbsolutePath(value: string) {
  let path = value;
  if (path.startsWith('file:')) {
    try {
      path = URI.parse(path).fsPath;
    } catch {
      return path;
    }
  }
  path = path.replace(/[?#].*$/, '').replaceAll('\\', '/');
  return resolvePath('/', path);
}

function resolvePath(base: string, value: string) {
  const path = value.startsWith('/') ? value : `${base}/${value}`;
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return `/${parts.join('/')}`;
}

function dirname(path: string) {
  const separator = path.lastIndexOf('/');
  return separator <= 0 ? '/' : path.slice(0, separator);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
