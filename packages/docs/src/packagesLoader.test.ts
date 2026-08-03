import { describe, expect, it } from 'vitest';
import {
  addModuleTitles,
  selectPackageDocumentEntries,
} from './packagesLoader';

describe('packagesLoader', () => {
  it('TS-MD 実装を持つパッケージとその README を対象にする', () => {
    const sourceEntries = [
      'packages/vscode/src/commands.ts.md',
      'packages/cli/src/index.ts.md',
      'packages/monaco/src/browser/index.ts.md',
    ];
    const readmeEntries = [
      'packages/docs/README.md',
      'packages/monaco/README.md',
      'packages/vscode/README.md',
      'packages/cli/README.md',
    ];

    expect(
      selectPackageDocumentEntries(sourceEntries, readmeEntries),
    ).toEqual([
      'packages/cli/README.md',
      'packages/cli/src/index.ts.md',
      'packages/monaco/README.md',
      'packages/monaco/src/browser/index.ts.md',
      'packages/vscode/README.md',
      'packages/vscode/src/commands.ts.md',
    ]);
  });

  it('TS-MD のモジュール名を Starlight のコードブロックタイトルにする', () => {
    const markdown = [
      '```ts split',
      "export const value = 'split';",
      '```',
      '',
      '~~~tsx component-name',
      'export const Component = () => null;',
      '~~~',
    ].join('\n');

    expect(addModuleTitles(markdown)).toBe(
      [
        '```ts title="split"',
        "export const value = 'split';",
        '```',
        '',
        '~~~tsx title="component-name"',
        'export const Component = () => null;',
        '~~~',
      ].join('\n'),
    );
  });

  it('Markdown の例示用フェンス内は書き換えない', () => {
    const markdown = [
      '````markdown',
      '```ts example',
      'export const example = true;',
      '```',
      '````',
      '',
      '```js example',
      'export const javascript = true;',
      '```',
    ].join('\n');

    expect(addModuleTitles(markdown)).toBe(markdown);
  });
});
