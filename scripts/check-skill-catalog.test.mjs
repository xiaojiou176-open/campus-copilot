import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSkillCatalog } from './check-skill-catalog.mjs';

test('skill catalog stays aligned with the repo-owned public skill pack surface', () => {
  assert.deepEqual(validateSkillCatalog(), []);
});
