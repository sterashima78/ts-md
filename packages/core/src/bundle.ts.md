# Bundle

複数のチャンクを結合して一つの TypeScript ファイルを生成するモジュールです。

## loadSourceFiles: ts-morph プロジェクト生成

チャンク情報を受け取り `ts-morph` のソースファイルとして読み込みます。

```ts loadSourceFiles
import { Project } from 'ts-morph';
import type { ChunkInfo } from './parser.ts.md';

export function loadSourceFiles(infos: Record<string, ChunkInfo>) {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true },
  });
  const files: Record<string, import('ts-morph').SourceFile> = {};
  for (const [name, info] of Object.entries(infos)) {
    files[name] = project.createSourceFile(`${name}.ts`, info.code, {
      overwrite: true,
    });
  }
  return files;
}
```

## bundleMarkdown: チャンクの結合

Markdown 内のチャンク群を解析し、宣言の衝突を避けながら単一ファイルへまとめます。

```ts bundleMarkdown
import { SyntaxKind } from 'ts-morph';
import { parseChunkInfos } from './parser.ts.md';
import { escapeChunk } from './utils.ts.md';
import { loadSourceFiles } from ':loadSourceFiles';
import { prefixDeclarations } from ':prefixDeclarations';
import { transformImportsExports } from ':transformImportsExports';
import { removeExports } from ':removeExports';

export function bundleMarkdown(
  markdown: string,
  uri: string,
  entry = 'main',
): string {
  const infos = parseChunkInfos(markdown, uri);
  const orderedAll = Object.entries(infos).sort((a, b) => a[1].start - b[1].start);
  const ordered = orderedAll.filter(([name]) => !name.endsWith('.test'));
  const files = loadSourceFiles(infos);

  for (const [name, file] of Object.entries(files)) {
    if (name.endsWith('.test')) continue;
    const prefix = `${escapeChunk(name)}_`;
    prefixDeclarations(file, prefix);
  }

  for (const [name, file] of Object.entries(files)) {
    if (name.endsWith('.test')) continue;
    transformImportsExports(file);
    if (name !== entry) removeExports(file);
  }

  let output = '';
  for (const [name] of orderedAll) {
    if (name.endsWith('.test')) continue;
    if (name === entry) continue;
    output += `${files[name].getFullText()}\n`;
  }
  if (files[entry]) {
    output += files[entry].getFullText();
  }
  return output;
}
```

```ts bundleMarkdown.test
import { describe, expect, it } from 'vitest';
import { bundleMarkdown } from ':bundleMarkdown';

const md = [
  '# Test',
  '',
  '```ts main',
  "import { msg } from ':foo'",
  'console.log(msg)',
  '```',
  '',
  '```ts foo',
  "export const msg = 'hi'",
  '```',
].join('\n');

describe('bundleMarkdown', () => {
  const code = bundleMarkdown(md, '/doc.ts.md');
  it('bundles chunks with prefix', () => {
    expect(code).toContain('const foo_msg');
    expect(code).toContain('console.log(foo_msg)');
    expect(code).not.toContain('export { foo_msg as msg }');
  });
});
```

## prefixDeclarations: 宣言の衝突回避

ファイル間で名前が重複しないよう各宣言にプレフィックスを付与します。

```ts prefixDeclarations
import { SyntaxKind } from 'ts-morph';

export function prefixDeclarations(
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
```

## transformImportsExports: 依存チャンクの解決

チャンク間の import/export をプレフィックス付きで書き換えます。

```ts transformImportsExports
import { SyntaxKind } from 'ts-morph';
import { escapeChunk } from './utils.ts.md';

export function transformImportsExports(file: import('ts-morph').SourceFile) {
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

  for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (call.getExpression().getKind() === SyntaxKind.ImportKeyword) {
      const arg = call.getArguments()[0];
      if (arg && arg.getKind() === SyntaxKind.StringLiteral) {
        const mod = arg.getLiteralText();
        if (mod.startsWith(':') && mod.endsWith('.test')) {
          call.remove();
        }
      }
    }
  }
}
```

## removeExports: 出力対象外チャンクのクリーンアップ

余分な export 文を削除します。

```ts removeExports
export function removeExports(file: import('ts-morph').SourceFile) {
  for (const exp of file.getExportDeclarations()) {
    exp.remove();
  }
  for (const ass of file.getExportAssignments()) {
    ass.remove();
  }
}
```

## 公開インタフェース

```ts main
export { bundleMarkdown } from ':bundleMarkdown';

if (import.meta.vitest) {
  await import(':bundleMarkdown.test');
}
```

