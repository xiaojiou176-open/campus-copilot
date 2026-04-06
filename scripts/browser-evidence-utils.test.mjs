import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHarLikeArchive,
  createBrowserEvidenceState,
  createNetworkEntry,
  recordConsoleMessage,
  recordPageError,
  settleNetworkEntryWithFailure,
  settleNetworkEntryWithResponse,
  summarizeBrowserEvidence,
} from './browser-evidence-utils.mjs';

test('summarizeBrowserEvidence keeps console, page error, and network counts', () => {
  const state = createBrowserEvidenceState({
    requestedUrl: 'https://canvas.uw.edu',
    startedAt: '2026-04-03T10:00:00.000Z',
  });

  recordConsoleMessage(state, {
    level: 'warning',
    text: 'Canvas warning',
    location: {
      url: 'https://canvas.uw.edu/app.js',
      lineNumber: 10,
      columnNumber: 4,
    },
  });
  recordPageError(state, new Error('runtime failure'));

  const requestEntry = createNetworkEntry(
    {
      method: 'GET',
      url: 'https://canvas.uw.edu/api/v1/courses',
      resourceType: 'xhr',
    },
    '2026-04-03T10:00:01.000Z',
  );
  settleNetworkEntryWithResponse(
    requestEntry,
    {
      status: 200,
      ok: true,
      statusText: 'OK',
      url: 'https://canvas.uw.edu/api/v1/courses',
    },
    '2026-04-03T10:00:02.000Z',
  );
  state.networkEntries.push(requestEntry);

  const failedRequestEntry = createNetworkEntry(
    {
      method: 'GET',
      url: 'https://canvas.uw.edu/api/v1/messages',
      resourceType: 'xhr',
    },
    '2026-04-03T10:00:03.000Z',
  );
  settleNetworkEntryWithFailure(failedRequestEntry, 'net::ERR_ABORTED', '2026-04-03T10:00:04.000Z');
  state.networkEntries.push(failedRequestEntry);

  const summary = summarizeBrowserEvidence(state);

  assert.equal(summary.counts.consoleMessages, 1);
  assert.equal(summary.counts.pageErrors, 1);
  assert.equal(summary.counts.networkEntries, 2);
  assert.equal(summary.counts.failedRequests, 1);
  assert.equal(summary.consoleMessages[0]?.text, 'Canvas warning');
  assert.equal(summary.pageErrors[0]?.message, 'runtime failure');
  assert.equal(summary.networkEntries[1]?.failure?.errorText, 'net::ERR_ABORTED');
});

test('buildHarLikeArchive emits HAR-like entries for successful and failed requests', () => {
  const state = createBrowserEvidenceState({
    requestedUrl: 'https://my.uw.edu',
    startedAt: '2026-04-03T11:00:00.000Z',
  });
  state.title = 'MyUW';
  state.finalUrl = 'https://my.uw.edu';

  const okEntry = createNetworkEntry(
    {
      method: 'GET',
      url: 'https://my.uw.edu/api/v1/notices',
      resourceType: 'fetch',
    },
    '2026-04-03T11:00:01.000Z',
  );
  settleNetworkEntryWithResponse(
    okEntry,
    {
      status: 200,
      ok: true,
      statusText: 'OK',
      url: 'https://my.uw.edu/api/v1/notices',
    },
    '2026-04-03T11:00:02.000Z',
  );
  state.networkEntries.push(okEntry);

  const failedEntry = createNetworkEntry(
    {
      method: 'POST',
      url: 'https://my.uw.edu/api/v1/deptcal',
      resourceType: 'xhr',
    },
    '2026-04-03T11:00:03.000Z',
  );
  settleNetworkEntryWithFailure(failedEntry, 'blocked_by_client', '2026-04-03T11:00:03.500Z');
  state.networkEntries.push(failedEntry);

  const har = buildHarLikeArchive(state);

  assert.equal(har.log.entries.length, 2);
  assert.equal(har.log.entries[0]?.request.url, 'https://my.uw.edu/api/v1/notices');
  assert.equal(har.log.entries[0]?.response.status, 200);
  assert.equal(har.log.entries[1]?.response.status, 0);
  assert.equal(har.log.entries[1]?._campusCopilot.failure.errorText, 'blocked_by_client');
});
