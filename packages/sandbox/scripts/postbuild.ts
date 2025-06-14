import { execSync } from 'node:child_process';
import { join } from 'node:path';

function main() {
  const root = join(__dirname, '..');
  execSync('pnpm exec tsmd emit "src/**/*.ts.md" -o dist/types', {
    cwd: root,
    stdio: 'inherit',
  });
}

main();
