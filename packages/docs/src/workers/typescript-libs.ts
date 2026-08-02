import type { ProjectContext } from '@volar/language-service';
import ts from 'typescript';

const rawTypeScriptLibraries = import.meta.glob(
  '../../node_modules/typescript/lib/lib.*.d.ts',
  {
    eager: true,
    import: 'default',
    query: '?raw',
  },
) as Record<string, string>;

export const defaultTypeScriptLibraryFileName = '/lib.es2022.full.d.ts';

export const defaultTypeScriptLibrarySource = Object.entries(
  rawTypeScriptLibraries,
)
  .filter(([path]) => isIncludedLibrary(path))
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([, source]) => stripReferenceDirectives(source))
  .join('\n');

const defaultTypeScriptLibrarySnapshot = ts.ScriptSnapshot.fromString(
  defaultTypeScriptLibrarySource,
);

export function installTypeScriptLibraries(project: ProjectContext) {
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
