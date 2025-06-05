import { createRequire } from 'node:module';
import path from 'node:path';
import { spawnNode } from '../utils/spawn';

const require = createRequire(import.meta.url);

export async function runTsMd(entryFile: string, nodeArgs: string[]) {
  const loader = require.resolve('@sterashima78/ts-md-loader');
  const tsx = require.resolve('tsx/esm');

  const args = ['--import', tsx, '--loader', loader, entryFile, ...nodeArgs];
  const code = await spawnNode(args, { cwd: path.dirname(entryFile) });
  process.exit(code);
}
