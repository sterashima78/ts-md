import tsMd from '@sterashima78/ts-md-unplugin/esbuild';
import { build } from 'esbuild';

build({
  entryPoints: ['../../packages/sandbox/src/app.ts.md'],
  bundle: true,
  plugins: [tsMd],
  outfile: 'out.js',
});
