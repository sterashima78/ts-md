import * as fs from 'node:fs';
import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';
import { test } from 'vitest';

const ROOT = path.resolve(__dirname, '../../../');
const EXT = path.resolve(ROOT, 'packages/vscode');
const TESTS = path.resolve(__dirname, 'suite/index.cjs');
const WS = path.resolve(__dirname, 'fixtures/error-project');
const VSCODE = path.resolve(ROOT, '.vscode-test', 'VSCode-linux-x64', 'code');

test('vscode extension e2e', async () => {
  const options: Parameters<typeof runTests>[0] = {
    extensionDevelopmentPath: EXT,
    extensionTestsPath: TESTS,
    launchArgs: [WS, '--disable-workspace-trust'],
    reuseMachineInstall: true,
  };
  if (fs.existsSync(VSCODE)) {
    options.vscodeExecutablePath = VSCODE;
  } else {
    options.version = 'stable';
  }
  await runTests(options);
});
