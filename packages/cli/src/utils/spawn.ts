import { spawn } from 'node:child_process';

export function spawnNode(
  args: string[],
  opts: { cwd?: string } = {},
): Promise<number> {
  return new Promise((res) => {
    const p = spawn(process.execPath, args, {
      stdio: 'inherit',
      cwd: opts.cwd ?? process.cwd(),
    });
    p.on('close', (code) => res(code ?? 0));
  });
}
