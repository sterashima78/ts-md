import { describe, expect, it } from 'vitest';
import { SpanMapKind, transformTsMd } from '../src/index.js';

describe('transformTsMd', () => {
  it('main チャンクだけを TypeScript の canonical output にする', () => {
    const mainCode = 'export const answer = 42;';
    const content = `# 文書 😀

\`\`\`ts helper
export const helper = 'internal';
\`\`\`

\`\`\`ts main
${mainCode}
\`\`\`
`;

    const result = transformTsMd({
      fileName: '/project/example.ts.md',
      content,
    });

    expect(result.text).toBe(mainCode);
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
    expect(result.supplemental).toBeUndefined();
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
      text: code,
      extension: '.tsx',
    });
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
