import fs from 'node:fs/promises';
import path from 'node:path';

interface SourceModule {
  code: string;
  moduleType: 'ts' | 'tsx';
}

const moduleQueryName = 'ts-md-bootstrap-module';

function parseRequest(id: string) {
  const queryIndex = id.indexOf('?');
  const fileName = queryIndex === -1 ? id : id.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : id.slice(queryIndex + 1);
  const moduleName = new URLSearchParams(query).get(moduleQueryName) ?? 'main';
  return { fileName, moduleName, query };
}

function extractModule(
  markdown: string,
  fileName: string,
  expectedModuleName: string,
): SourceModule {
  const lines = markdown.split(/\r?\n/);
  let matchedModule: SourceModule | undefined;

  for (let index = 0; index < lines.length; index++) {
    const opening = lines[index].match(/^(`{3,}|~{3,})(ts|tsx)\s+([^\s]+)\s*$/);
    if (!opening) continue;

    const marker = opening[1];
    const language = opening[2] as SourceModule['moduleType'];
    const moduleName = opening[3];
    const codeStart = index + 1;
    let codeEnd = codeStart;
    while (codeEnd < lines.length && lines[codeEnd].trim() !== marker) {
      codeEnd++;
    }
    if (codeEnd === lines.length) {
      throw new Error(`Unclosed module '${moduleName}' in ${fileName}`);
    }

    if (moduleName === expectedModuleName) {
      if (matchedModule) {
        throw new Error(
          `Duplicate module '${expectedModuleName}' in ${fileName}`,
        );
      }
      matchedModule = {
        code: lines.slice(codeStart, codeEnd).join('\n'),
        moduleType: language,
      };
    }
    index = codeEnd;
  }

  if (!matchedModule) {
    throw new Error(`Module '${expectedModuleName}' not found in ${fileName}`);
  }
  return matchedModule;
}

export function tsMdBootstrapPlugin() {
  return {
    name: 'ts-md-bootstrap',
    enforce: 'pre' as const,

    resolveId(source: string, importer?: string) {
      if (source.startsWith(':') && importer) {
        const moduleName = source.slice(1);
        const importerRequest = parseRequest(importer);
        if (!moduleName || !importerRequest.fileName.endsWith('.ts.md')) {
          return;
        }
        const query = new URLSearchParams({
          [moduleQueryName]: moduleName,
        });
        return `${importerRequest.fileName}?${query}`;
      }

      const request = parseRequest(source);
      if (!request.fileName.endsWith('.ts.md')) return;
      if (path.isAbsolute(request.fileName)) return source;
      const importerFileName = importer
        ? parseRequest(importer).fileName
        : undefined;
      const resolved = path.resolve(
        importerFileName ? path.dirname(importerFileName) : process.cwd(),
        request.fileName,
      );
      return request.query ? `${resolved}?${request.query}` : resolved;
    },

    async load(id: string) {
      const request = parseRequest(id);
      if (!request.fileName.endsWith('.ts.md')) return;
      const markdown = await fs.readFile(request.fileName, 'utf8');
      return extractModule(markdown, request.fileName, request.moduleName);
    },
  };
}
