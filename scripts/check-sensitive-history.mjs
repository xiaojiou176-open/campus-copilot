import { execFileSync } from 'node:child_process';
import { collectContentFailures, collectTrackedPathFailures } from './check-sensitive-surface.mjs';

function listReachableHistoryEntries() {
  const stdout = execFileSync('git', ['rev-list', '--objects', '--all'], {
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 64 * 1024 * 1024,
  });

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      const firstSpace = line.indexOf(' ');
      if (firstSpace <= 0) {
        return [];
      }

      const objectId = line.slice(0, firstSpace);
      const file = line.slice(firstSpace + 1).trim();
      if (file.length === 0) {
        return [];
      }

      return [{ objectId, file }];
    });
}

function loadObjectTypes(objectIds) {
  if (objectIds.length === 0) {
    return new Map();
  }

  const stdout = execFileSync('git', ['cat-file', '--batch-check=%(objectname) %(objecttype)'], {
    encoding: 'utf8',
    input: `${objectIds.join('\n')}\n`,
    stdio: 'pipe',
    maxBuffer: 64 * 1024 * 1024,
  });

  return new Map(
    stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [objectId, objectType] = line.split(' ');
        return [objectId, objectType];
      }),
  );
}

export function collectSensitiveHistoryFailures({ historyEntries, readObject }) {
  const failures = [];
  const firstPathByObject = new Map();

  for (const entry of historyEntries) {
    failures.push(...collectTrackedPathFailures({ files: [entry.file], prefix: 'history_' }));
    if (!firstPathByObject.has(entry.objectId)) {
      firstPathByObject.set(entry.objectId, entry.file);
    }
  }

  for (const [objectId, file] of firstPathByObject.entries()) {
    const buffer = readObject(objectId);
    failures.push(
      ...collectContentFailures({
        file,
        buffer,
        prefix: 'history_',
        objectId: objectId.slice(0, 12),
      }),
    );
  }

  return failures;
}

function main() {
  const historyEntries = listReachableHistoryEntries();
  const objectTypes = loadObjectTypes(historyEntries.map((entry) => entry.objectId));
  const failures = collectSensitiveHistoryFailures({
    historyEntries: historyEntries.filter((entry) => objectTypes.get(entry.objectId) === 'blob'),
    readObject: (objectId) =>
      execFileSync('git', ['cat-file', '-p', objectId], {
        encoding: null,
        stdio: 'pipe',
        maxBuffer: 64 * 1024 * 1024,
      }),
  });

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log('sensitive_history_ok');
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
