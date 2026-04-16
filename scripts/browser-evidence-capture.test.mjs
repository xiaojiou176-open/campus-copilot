import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectRequestedPageTarget,
  shouldFinalizeFallbackMatch,
  shouldNavigateRequestedPage,
} from './browser-evidence-capture.mjs';

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

test('selectRequestedPageTarget prefers an exact requested page over the generic home page', () => {
  const target = selectRequestedPageTarget(
    [
      { type: 'page', url: 'https://my.uw.edu/', title: 'Home - MyUW' },
      { type: 'page', url: 'https://my.uw.edu/accounts/', title: 'Accounts - MyUW' },
    ],
    'https://my.uw.edu/accounts/',
  );

  assert.equal(target?.title, 'Accounts - MyUW');
});

test('selectRequestedPageTarget falls back to a known SSO redirect when no exact page target exists', () => {
  const target = selectRequestedPageTarget(
    [
      {
        type: 'page',
        url: 'https://idp.u.washington.edu/idp/profile/SAML2/Redirect/SSO?execution=e1s1',
        title: 'UW NetID sign-in',
      },
    ],
    'https://www.gradescope.com/auth/saml/uw',
  );

  assert.equal(target?.title, 'UW NetID sign-in');
});

test('shouldFinalizeFallbackMatch rejects a generic same-host tab after explicit navigation', () => {
  assert.equal(
    shouldFinalizeFallbackMatch({
      matchedTarget: { url: 'https://my.uw.edu/' },
      requestedUrl: 'https://my.uw.edu/accounts/',
      navigationAttempted: true,
    }),
    false,
  );
});

test('shouldFinalizeFallbackMatch accepts a known redirect target after explicit navigation', () => {
  assert.equal(
    shouldFinalizeFallbackMatch({
      matchedTarget: {
        url: 'https://idp.u.washington.edu/idp/profile/SAML2/Redirect/SSO?execution=e1s1',
      },
      requestedUrl: 'https://www.gradescope.com/auth/saml/uw',
      navigationAttempted: true,
    }),
    true,
  );
});
