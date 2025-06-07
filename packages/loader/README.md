# @sterashima78/ts-md-loader

Experimental Node.js ES module loader that allows importing `.ts.md` files and
individual chunks. Used by the CLI `run` command.

## Structure
- `src/index.ts` – `resolve` and `load` hooks
- `test/` – integration tests running Node with the loader
