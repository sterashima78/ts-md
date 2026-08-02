#!/usr/bin/env node
import { runTsMdTsc } from './compiler.ts.md';

export { runTsMdTsc };

process.exitCode = runTsMdTsc(process.argv.slice(2));
