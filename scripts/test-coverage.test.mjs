import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRetryVitestCoverageRun } from './test-coverage.mjs';

test('shouldRetryVitestCoverageRun retries ENOENT errors inside the runtime coverage tree', () => {
  assert.equal(
    shouldRetryVitestCoverageRun({
      status: 1,
      combinedOutput:
        "Error: ENOENT: no such file or directory, scandir '/repo/.runtime-cache/coverage/packages/adapters-edstem'",
      coverageDir: '/repo/.runtime-cache/coverage/packages/adapters-edstem',
      aggregateOutputDir: '/repo/.runtime-cache/coverage',
    }),
    true,
  );
});

test('shouldRetryVitestCoverageRun ignores ENOENT errors outside the runtime coverage tree', () => {
  assert.equal(
    shouldRetryVitestCoverageRun({
      status: 1,
      combinedOutput: "Error: ENOENT: no such file or directory, scandir '/repo/packages/adapters-edstem'",
      coverageDir: '/repo/.runtime-cache/coverage/packages/adapters-edstem',
      aggregateOutputDir: '/repo/.runtime-cache/coverage',
    }),
    false,
  );
});

test('shouldRetryVitestCoverageRun ignores non-ENOENT failures', () => {
  assert.equal(
    shouldRetryVitestCoverageRun({
      status: 1,
      combinedOutput: 'Error: Expected 200 to equal 404',
      coverageDir: '/repo/.runtime-cache/coverage/packages/adapters-edstem',
      aggregateOutputDir: '/repo/.runtime-cache/coverage',
    }),
    false,
  );
});
