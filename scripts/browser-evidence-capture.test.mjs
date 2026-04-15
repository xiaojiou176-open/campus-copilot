import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldNavigateRequestedPage } from './browser-evidence-capture.mjs';

test('shouldNavigateRequestedPage skips navigation only when the requested page already matches exactly', () => {
  assert.equal(
    shouldNavigateRequestedPage({
      currentUrl: 'https://my.uw.edu/accounts/',
      requestedUrl: 'https://my.uw.edu/accounts/',
      reload: false,
    }),
    false,
  );
});

test('shouldNavigateRequestedPage reloads when the existing tab is the same origin but the wrong path', () => {
  assert.equal(
    shouldNavigateRequestedPage({
      currentUrl: 'https://my.uw.edu/',
      requestedUrl: 'https://my.uw.edu/accounts/',
      reload: false,
    }),
    true,
  );
});

test('shouldNavigateRequestedPage reloads when the hash-targeted page differs', () => {
  assert.equal(
    shouldNavigateRequestedPage({
      currentUrl: 'https://myplan.uw.edu/plan/#/su26',
      requestedUrl: 'https://myplan.uw.edu/plan/#/sp26',
      reload: false,
    }),
    true,
  );
});

test('shouldNavigateRequestedPage honors explicit reload', () => {
  assert.equal(
    shouldNavigateRequestedPage({
      currentUrl: 'https://my.uw.edu/accounts/',
      requestedUrl: 'https://my.uw.edu/accounts/',
      reload: true,
    }),
    true,
  );
});
