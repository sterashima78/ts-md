import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

async function runVscePackage(cwd: string) {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('pnpm', ['exec', 'vsce', 'package'], {
      cwd,
      stdio: 'inherit',
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`vsce package exited with code ${code}`));
    });
  });
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageJsonPath = join(__dirname, '..', 'package.json');
  const text = await readFile(packageJsonPath, 'utf8');
  const json = JSON.parse(text) as { name: string } & Record<string, unknown>;
  const originalName = json.name;
  let modified = false;
  if (json.name !== 'ts-md') {
    json.name = 'ts-md';
    await writeFile(packageJsonPath, `${JSON.stringify(json, null, 2)}\n`);
    modified = true;
  }
  try {
    await runVscePackage(join(__dirname, '..'));
  } finally {
    if (modified) {
      json.name = originalName;
      await writeFile(packageJsonPath, `${JSON.stringify(json, null, 2)}\n`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
