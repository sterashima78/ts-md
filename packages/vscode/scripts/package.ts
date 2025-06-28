import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageCommand } from '@vscode/vsce/out/package';

async function main() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(__dirname, '../package.json');
  const text = await readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(text) as { name: string };
  const originalName = pkg.name;
  pkg.name = 'ts-md';
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  try {
    await packageCommand({ cwd: join(__dirname, '..'), dependencies: false });
  } finally {
    pkg.name = originalName;
    await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
