import { downloadAndUnzipVSCode } from '@vscode/test-electron';

async function main() {
  const path = await downloadAndUnzipVSCode('stable');
  console.log(`Downloaded VS Code to: ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
