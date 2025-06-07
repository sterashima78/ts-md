# @sterashima78/ts-md-unplugin

Bundler plugin to handle `.ts.md` files. It exposes wrappers for Vite, Rollup,
Webpack and Esbuild.

When a document is loaded, its chunks become virtual modules that can be
imported via `#path:chunk` syntax.

## Structure
- `src/index.ts` – common plugin logic
- `src/vite.ts`, `src/rollup.ts`, `src/webpack.ts`, `src/esbuild.ts` – wrappers
- `test/` – tests using the Rollup plugin
