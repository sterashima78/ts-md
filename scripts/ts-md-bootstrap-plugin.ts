import fs from 'node:fs/promises';
import path from 'node:path';

interface MainModule {
  code: string;
  moduleType: 'ts' | 'tsx';
}

function getFileName(id: string) {
  const queryIndex = id.indexOf('?');
  return queryIndex === -1 ? id : id.slice(0, queryIndex);
}

function extractMainModule(markdown: string, fileName: string): MainModule {
  const lines = markdown.split(/\r?\n/);
  let main: MainModule | undefined;

  for (let index = 0; index < lines.length; index++) {
    const opening = lines[index].match(/^(`{3,}|~{3,})(ts|tsx)\s+main\s*$/);
    if (!opening) continue;

    const marker = opening[1];
    const language = opening[2] as MainModule['moduleType'];
    const codeStart = index + 1;
    let codeEnd = codeStart;
    while (codeEnd < lines.length && lines[codeEnd].trim() !== marker) {
      codeEnd++;
    }
    if (codeEnd === lines.length) {
      throw new Error(`Unclosed main module in ${fileName}`);
    }
    if (main) {
      throw new Error(`Duplicate main module in ${fileName}`);
    }

    main = {
      code: lines.slice(codeStart, codeEnd).join('\n'),
      moduleType: language,
    };
    index = codeEnd;
  }

  if (!main) {
    throw new Error(`Main module not found in ${fileName}`);
  }
  return main;
}

export function tsMdBootstrapPlugin() {
  return {
    name: 'ts-md-bootstrap',
    enforce: 'pre' as const,

    resolveId(source: string, importer?: string) {
      const fileName = getFileName(source);
      if (!fileName.endsWith('.ts.md')) return;
      if (path.isAbsolute(fileName)) return source;
      const resolved = path.resolve(
        importer ? path.dirname(getFileName(importer)) : process.cwd(),
        fileName,
      );
      return source.slice(fileName.length)
        ? `${resolved}${source.slice(fileName.length)}`
        : resolved;
    },

    async load(id: string) {
      const fileName = getFileName(id);
      if (!fileName.endsWith('.ts.md')) return;
      const markdown = await fs.readFile(fileName, 'utf8');
      return extractMainModule(markdown, fileName);
    },
  };
}
