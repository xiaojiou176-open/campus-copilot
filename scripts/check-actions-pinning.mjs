import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowDir = '.github/workflows';
const files = readdirSync(workflowDir).filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'));
const failures = [];
const shaPattern = /^[0-9a-f]{40}$/;

for (const file of files) {
  const path = join(workflowDir, file);
  const content = readFileSync(path, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/uses:\s*([^\s]+)/);
    if (!match) continue;
    const value = match[1];
    if (value.startsWith('./') || value.startsWith('docker://')) continue;

    const atIndex = value.lastIndexOf('@');
    if (atIndex === -1) {
      failures.push(`missing_ref:${path}:${value}`);
      continue;
    }

    const ref = value.slice(atIndex + 1);
    if (!shaPattern.test(ref)) {
      failures.push(`not_sha_pinned:${path}:${value}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('actions_pinning_ok');
