import tsMd from '@sterashima78/ts-md-unplugin/esbuild';
import { build } from 'esbuild';

build({
  entryPoints: ['../../docs/app.ts.md'],
  bundle: true,
  plugins: [tsMd],
  outfile: 'out.js',
});
