import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const fixture = path.join(__dirname, 'fixtures', 'tsc');
const dist = path.join(fixture, 'dist');

function runTsMdTsc(...args: string[]) {
  execFileSync('pnpm', ['exec', 'ts-md-tsc', ...args], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
}

function checkDeclarationConsumer() {
  execFileSync(
    'pnpm',
    [
      'exec',
      'tsc',
      '--noEmit',
      '--strict',
      '--module',
      'ESNext',
      '--moduleResolution',
      'Node',
      '--target',
      'ESNext',
      'consumer.ts',
    ],
    { cwd: fixture, stdio: 'inherit' },
  );
}

async function readOutput(fileName: string) {
  return fs.readFile(path.join(dist, fileName), 'utf8');
}

describe('ts-md-tsc', () => {
  beforeEach(async () => {
    await fs.rm(dist, { recursive: true, force: true });
  });

  afterAll(async () => {
    await fs.rm(dist, { recursive: true, force: true });
  });

  it('emits resolvable declarations when project is a directory', async () => {
    runTsMdTsc('-p', fixture, '--emitDeclarationOnly');

    const declaration = await readOutput('dep.ts.md.d.ts');
    expect(declaration).toContain(
      "export { bar } from './dep.ts.md.__tsmd__.bar.js';",
    );
    expect(declaration).toContain('sourceMappingURL=dep.ts.md.d.ts.map');

    const declarationMap = JSON.parse(await readOutput('dep.ts.md.d.ts.map'));
    expect(declarationMap.file).toBe('dep.ts.md.d.ts');
    checkDeclarationConsumer();
  });

  it('rewrites runtime imports and source map references', async () => {
    runTsMdTsc('-p', fixture);

    const documentJavaScript = await readOutput('dep.ts.md.js');
    expect(documentJavaScript).toContain(
      "export { bar } from './dep.ts.md.__tsmd__.bar.js';",
    );
    expect(documentJavaScript).toContain('sourceMappingURL=dep.ts.md.js.map');

    const importingJavaScript = await readOutput('index.js');
    expect(importingJavaScript).toContain("from './dep.ts.md.js'");

    const sourceMap = JSON.parse(await readOutput('dep.ts.md.js.map'));
    expect(sourceMap.file).toBe('dep.ts.md.js');
    const declarationMap = JSON.parse(await readOutput('dep.ts.md.d.ts.map'));
    expect(declarationMap.file).toBe('dep.ts.md.d.ts');
  });
});
