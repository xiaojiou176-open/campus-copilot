import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContainerSurface } from './check-container-surface.mjs';

test('container surface keeps the documented Docker path in sync', () => {
  assert.deepEqual(validateContainerSurface(), []);
});
