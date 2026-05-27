import { runCli } from './index.mjs';
const argv = process.argv[2] === '--' ? process.argv.slice(3) : process.argv.slice(2);

await runCli(argv, {
  write: (value) => process.stdout.write(value),
  error: (value) => process.stderr.write(value),
});
