# Bundle

```ts main
import { Project, SyntaxKind } from 'ts-morph';
import { parseChunkInfos } from './parser.ts.md';
import { escapeChunk } from './utils.ts.md';

export function bundleMarkdown(
  markdown: string,
  uri: string,
  entry = 'main',
): string {
  const infos = parseChunkInfos(markdown, uri);
  const ordered = Object.entries(infos).sort((a, b) => a[1].start - b[1].start);
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true },
  });
  const files: Record<string, import('ts-morph').SourceFile> = {};
  for (const [name, info] of ordered) {
    files[name] = project.createSourceFile(`${name}.ts`, info.code, {
      overwrite: true,
    });
  }

  for (const [name, file] of Object.entries(files)) {
    const prefix = `${escapeChunk(name)}_`;
    prefixDeclarations(file, prefix);
  }

  for (const [name, file] of Object.entries(files)) {
    transformImportsExports(file);
    if (name !== entry) removeExports(file);
  }

  let output = '';
  for (const [name] of ordered) {
    if (name === entry) continue;
    output += `${files[name].getFullText()}\n`;
  }
  if (files[entry]) {
    output += files[entry].getFullText();
  }
  return output;
}

function prefixDeclarations(
  file: import('ts-morph').SourceFile,
  prefix: string,
) {
  for (const stmt of file.getStatements()) {
    if (stmt.getKind() === SyntaxKind.VariableStatement) {
      const vs = stmt.asKindOrThrow(SyntaxKind.VariableStatement);
      const exports: string[] = [];
      for (const decl of vs.getDeclarationList().getDeclarations()) {
        const name = decl.getNameNode();
        if (name.getKind() === SyntaxKind.Identifier) {
          const orig = name.getText();
          (name as import('ts-morph').Identifier).rename(`${prefix}${orig}`);
          if (vs.hasExportKeyword())
            exports.push(`${prefix}${orig} as ${orig}`);
        }
      }
      if (exports.length) {
        vs.toggleModifier('export', false);
        file.insertStatements(
          vs.getChildIndex() + 1,
          `export { ${exports.join(', ')} };`,
        );
      }
    } else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
      const fn = stmt.asKindOrThrow(SyntaxKind.FunctionDeclaration);
      const id = fn.getNameNode();
      if (id) {
        const orig = id.getText();
        id.rename(`${prefix}${orig}`);
        if (fn.hasExportKeyword()) {
          fn.toggleModifier('export', false);
          file.insertStatements(
            fn.getChildIndex() + 1,
            `export { ${prefix}${orig} as ${orig} };`,
          );
        }
      }
    } else if (stmt.getKind() === SyntaxKind.ClassDeclaration) {
      const cl = stmt.asKindOrThrow(SyntaxKind.ClassDeclaration);
      const id = cl.getNameNode();
      if (id) {
        const orig = id.getText();
        id.rename(`${prefix}${orig}`);
        if (cl.hasExportKeyword()) {
          cl.toggleModifier('export', false);
          file.insertStatements(
            cl.getChildIndex() + 1,
            `export { ${prefix}${orig} as ${orig} };`,
          );
        }
      }
    } else if (stmt.getKind() === SyntaxKind.InterfaceDeclaration) {
      const it = stmt.asKindOrThrow(SyntaxKind.InterfaceDeclaration);
      const id = it.getNameNode();
      if (id) {
        const orig = id.getText();
        id.rename(`${prefix}${orig}`);
        if (it.hasExportKeyword()) {
          it.toggleModifier('export', false);
          file.insertStatements(
            it.getChildIndex() + 1,
            `export { ${prefix}${orig} as ${orig} };`,
          );
        }
      }
    } else if (stmt.getKind() === SyntaxKind.TypeAliasDeclaration) {
      const ta = stmt.asKindOrThrow(SyntaxKind.TypeAliasDeclaration);
      const id = ta.getNameNode();
      if (id) {
        const orig = id.getText();
        id.rename(`${prefix}${orig}`);
        if (ta.hasExportKeyword()) {
          ta.toggleModifier('export', false);
          file.insertStatements(
            ta.getChildIndex() + 1,
            `export { ${prefix}${orig} as ${orig} };`,
          );
        }
      }
    } else if (stmt.getKind() === SyntaxKind.EnumDeclaration) {
      const en = stmt.asKindOrThrow(SyntaxKind.EnumDeclaration);
      const id = en.getNameNode();
      if (id) {
        const orig = id.getText();
        id.rename(`${prefix}${orig}`);
        if (en.hasExportKeyword()) {
          en.toggleModifier('export', false);
          file.insertStatements(
            en.getChildIndex() + 1,
            `export { ${prefix}${orig} as ${orig} };`,
          );
        }
      }
    }
  }
}

function transformImportsExports(file: import('ts-morph').SourceFile) {
  for (const imp of file.getImportDeclarations()) {
    const mod = imp.getModuleSpecifierValue();
    if (mod.startsWith(':') || mod.startsWith('#')) {
      const chunk = mod.slice(1);
      const prefix = `${escapeChunk(chunk)}_`;
      for (const spec of imp.getNamedImports()) {
        const target = spec.getAliasNode() ?? spec.getNameNode();
        if (target.getKind() === SyntaxKind.Identifier) {
          (target as import('ts-morph').Identifier).rename(
            `${prefix}${spec.getName()}`,
          );
        }
      }
      imp.remove();
    }
  }

  for (const exp of file.getExportDeclarations()) {
    const mod = exp.getModuleSpecifierValue();
    if (mod && (mod.startsWith(':') || mod.startsWith('#'))) {
      const chunk = mod.slice(1);
      const prefix = `${escapeChunk(chunk)}_`;
      const parts: string[] = [];
      for (const spec of exp.getNamedExports()) {
        const alias = spec.getAliasNode()?.getText() ?? spec.getName();
        parts.push(`${prefix}${spec.getName()} as ${alias}`);
      }
      exp.replaceWithText(`export { ${parts.join(', ')} };`);
    }
  }
}

function removeExports(file: import('ts-morph').SourceFile) {
  for (const exp of file.getExportDeclarations()) {
    exp.remove();
  }
  for (const ass of file.getExportAssignments()) {
    ass.remove();
  }
}
```
