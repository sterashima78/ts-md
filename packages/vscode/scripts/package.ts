// VS Code 拡張パッケージ処理でパッケージ名に
// スラッシュを含むと失敗するため、
// name を一時的に "ts-md" に更えてパッケージ完了後に
// 元に戻す。
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function run(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`${command} ${args.join(' ')} exited with code ${code}`),
        );
    });
  });
}

async function main() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(__dirname, '../package.json');
  const text = await readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(text) as { name: string };
  const originalName = pkg.name;
  pkg.name = 'ts-md';
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  try {
    await run('pnpm', ['exec', 'vsce', 'package'], join(__dirname, '..'));
  } finally {
    pkg.name = originalName;
    await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
