# @sterashima78/ts-md-cli

CLI toolset for working with `.ts.md` files. It wraps the core parser and loader
so that documents can be type-checked, tangled into real files and executed.

## Commands
- `check` – tsc と同様に `.ts.md` を型チェックします
- `tangle` – extract chunks to the given directory
- `run` – execute a document with the Node loader

## Structure
- `src/commands/` – implementations of each command
- `src/utils/` – helpers for glob expansion and spawning Node
- `test/` – Vitest tests
