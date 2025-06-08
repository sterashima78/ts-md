import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';
import { test } from 'vitest';

const ROOT = path.resolve(__dirname, '../../../');
const EXT = path.resolve(ROOT, 'packages/vscode');
const TESTS = path.resolve(__dirname, 'suite/index.cjs');
const WS = path.resolve(__dirname, 'fixtures/error-project');

test.skip('vscode extension e2e', async () => {
  await runTests({
    version: 'stable',
    extensionDevelopmentPath: EXT,
    extensionTestsPath: TESTS,
    launchArgs: [WS, '--disable-workspace-trust'],
  });
});
