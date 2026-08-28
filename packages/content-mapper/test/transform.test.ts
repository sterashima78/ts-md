import { describe, expect, it } from 'vitest';
import { SpanMapKind, transformTsMd } from '../src/index.js';

const MODULE_MARKER = '\nexport {};';

describe('transformTsMd', () => {
  it('main を canonical output、named chunk を supplemental output にする', () => {
    const helperCode = "const value = 'internal';";
    const mainCode = 'const value = 42;';
    const content = `# 文書 😀

\`\`\`ts helper
${helperCode}
\`\`\`

\`\`\`ts main
${mainCode}
\`\`\`
`;

    const result = transformTsMd({
      fileName: '/project/example.ts.md',
      content,
    });

    expect(result.text).toBe(`${mainCode}${MODULE_MARKER}`);
    expect(result.extension).toBe('.ts');
    expect(result.mappings).toEqual([
      [
        0,
        mainCode.length,
        content.indexOf(mainCode),
        mainCode.length,
        SpanMapKind.Verbatim,
      ],
    ]);
    expect(result.supplemental).toEqual([
      {
        text: `${helperCode}${MODULE_MARKER}`,
        extension: '.ts',
        mappings: [
          [
            0,
            helperCode.length,
            content.indexOf(helperCode),
            helperCode.length,
            SpanMapKind.Verbatim,
          ],
        ],
      },
    ]);
  });

  it('各チャンクへ module marker を追加して lexical scope を分離する', () => {
    const content = `\`\`\`ts helper
const value = 1;
\`\`\`

\`\`\`ts main
const value = 2;
\`\`\`
`;

    const result = transformTsMd({
      fileName: '/project/example.ts.md',
      content,
    });

    expect(result.text).toBe(`const value = 2;${MODULE_MARKER}`);
    expect(result.supplemental?.[0]?.text).toBe(
      `const value = 1;${MODULE_MARKER}`,
    );
  });

  it('main が tsx の場合は .tsx を返す', () => {
    const code = 'export const view = <div />;';
    const content = `\`\`\`tsx main
${code}
\`\`\`
`;

    expect(
      transformTsMd({ fileName: '/project/view.ts.md', content }),
    ).toMatchObject({
      text: `${code}${MODULE_MARKER}`,
      extension: '.tsx',
    });
  });

  it('named chunk ごとに ts/tsx extension を維持する', () => {
    const content = `\`\`\`tsx view
export const view = <div />;
\`\`\`

\`\`\`ts main
export const answer = 42;
\`\`\`
`;

    const result = transformTsMd({
      fileName: '/project/example.ts.md',
      content,
    });

    expect(result.supplemental?.[0]?.extension).toBe('.tsx');
  });

  it('main チャンクがない場合は mapper diagnostic を返す', () => {
    const content = `\`\`\`ts helper
export const helper = 1;
\`\`\`
`;

    const result = transformTsMd({
      fileName: '/project/example.ts.md',
      content,
    });

    expect(result.text).toBe('');
    expect(result.diagnostics?.[0]?.messageText).toContain("named 'main'");
  });

  it('TS-MD の parse error を元ドキュメント位置の diagnostic にする', () => {
    const content = `\`\`\`ts main
export const first = 1;
\`\`\`

\`\`\`ts main
export const second = 2;
\`\`\`
`;

    const result = transformTsMd({
      fileName: '/project/example.ts.md',
      content,
    });

    expect(result.text).toBe('');
    expect(result.diagnostics?.[0]?.messageText).toContain(
      "Duplicate module 'main'",
    );
    expect(result.diagnostics?.[0]?.start).toBeGreaterThan(0);
  });
});
