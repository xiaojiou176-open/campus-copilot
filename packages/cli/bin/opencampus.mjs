#!/usr/bin/env -S node --experimental-strip-types
import { runCli } from '../src/index.mjs';

const argv = process.argv[2] === '--' ? process.argv.slice(3) : process.argv.slice(2);

await runCli(argv, {
  write: (value) => process.stdout.write(value),
  error: (value) => process.stderr.write(value),
});
