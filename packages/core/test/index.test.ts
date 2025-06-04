import { parseChunks, resolveImport, collectVirtualFiles } from '../src';
import path from 'path'
import fs from 'fs'

describe('parseChunks のテスト', () => {
  const md = [
    '# Example',
    '',
    '```ts foo',
    "console.log('foo')",
    '```',
    '',
    '```ts bar',
    'import "#./dep.ts.md:dep"',
    '```',
  ].join('\n')

  const chunks = parseChunks(md, '/test/example.ts.md')
  it('チャンクを抽出できる', () => {
    expect(Object.keys(chunks)).toEqual(['foo', 'bar'])
    expect(chunks.foo.code.trim()).toBe("console.log('foo')")
    expect(chunks.foo.start).toBe(4)
  })
})

describe('resolveImport のテスト', () => {
  it('インポート元からの相対パスを解決できる', () => {
    const info = resolveImport('#../dep.ts.md:main', '/a/b/src/app.ts.md')!
    expect(info.file).toBe(path.resolve('/a/b/src', '../dep.ts.md'))
    expect(info.name).toBe('main')
  })
})

describe('collectVirtualFiles のテスト', () => {
  const dir = path.join(__dirname, 'fixtures')
  const mainPath = path.join(dir, 'main.ts.md')

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'dep.ts.md'), [
      '# Dep',
      '',
      '```ts dep',
      "export const msg = 'dep'",
      '```',
    ].join('\n'))
    fs.writeFileSync(mainPath, [
      '# Main',
      '',
      '```ts main',
      'import "#./dep.ts.md:dep"',
      'console.log(msg)',
      '```',
    ].join('\n'))
  })

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('再帰的にチャンクを収集できる', () => {
    const files = collectVirtualFiles(mainPath)
    const keys = Object.keys(files)
    expect(keys).toContain(path.resolve(mainPath) + ':main')
    expect(keys).toContain(path.resolve(dir, 'dep.ts.md') + ':dep')
  })

  it('循環参照を検出できる', () => {
    const cyclePath = path.join(dir, 'cycle.ts.md')
    fs.writeFileSync(cyclePath, [
      '```ts a',
      'import "#./cycle.ts.md:a"',
      '```',
    ].join('\n'))
    expect(() => collectVirtualFiles(cyclePath)).toThrow('circular')
  })
})
