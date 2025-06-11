import { cp } from 'node:fs/promises';

async function main() {
  await cp(
    'src/language-configuration.json',
    'dist/language-configuration.json',
  );
  await cp('syntaxes', 'dist/syntaxes', { recursive: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
