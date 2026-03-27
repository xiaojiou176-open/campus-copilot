import { existsSync } from 'node:fs';

const forbidden = [
  '.DS_Store',
  'apps/.DS_Store',
];

const failures = forbidden.filter((path) => existsSync(path)).map((path) => `forbidden_root_noise:${path}`);

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('root_hygiene_ok');
