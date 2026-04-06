export function trimEvidenceEntries(entries, limit = 25) {
  return entries.slice(0, limit);
}

export function createBrowserEvidenceState(options = {}) {
  return {
    startedAt: options.startedAt ?? new Date().toISOString(),
    requestedUrl: options.requestedUrl,
    finalUrl: undefined,
    title: undefined,
    consoleMessages: [],
    pageErrors: [],
    networkEntries: [],
  };
}

export function recordConsoleMessage(state, entry) {
  state.consoleMessages.push({
    level: entry.level ?? 'log',
    text: String(entry.text ?? ''),
    location: entry.location,
  });
}

export function recordPageError(state, error) {
  state.pageErrors.push({
    message: String(error?.message ?? error ?? 'page_error'),
  });
}

export function createNetworkEntry(request, startedAt = new Date().toISOString()) {
  return {
    id: `${request.method}:${request.url}`,
    startedAt,
    request: {
      method: request.method,
      url: request.url,
      resourceType: request.resourceType,
    },
    response: undefined,
    failure: undefined,
  };
}

export function settleNetworkEntryWithResponse(entry, response, completedAt = new Date().toISOString()) {
  entry.completedAt = completedAt;
  entry.response = {
    status: response.status,
    ok: response.ok,
    statusText: response.statusText,
    url: response.url,
  };
}

export function settleNetworkEntryWithFailure(entry, failureText, completedAt = new Date().toISOString()) {
  entry.completedAt = completedAt;
  entry.failure = {
    errorText: String(failureText ?? 'request_failed'),
  };
}

export function buildHarLikeArchive(state) {
  return {
    log: {
      version: '1.2',
      creator: {
        name: 'campus-copilot',
        version: '0.1.0',
      },
      pages: [
        {
          id: 'page_0',
          startedDateTime: state.startedAt,
          title: state.title ?? '',
          pageTimings: {},
        },
      ],
      entries: state.networkEntries.map((entry) => ({
        pageref: 'page_0',
        startedDateTime: entry.startedAt,
        time:
          entry.completedAt && entry.startedAt
            ? Math.max(new Date(entry.completedAt).getTime() - new Date(entry.startedAt).getTime(), 0)
            : 0,
        request: {
          method: entry.request.method,
          url: entry.request.url,
          httpVersion: 'HTTP/1.1',
          headers: [],
          queryString: [],
          cookies: [],
          headersSize: -1,
          bodySize: -1,
        },
        response: entry.response
          ? {
              status: entry.response.status,
              statusText: entry.response.statusText ?? '',
              httpVersion: 'HTTP/1.1',
              headers: [],
              cookies: [],
              content: {
                mimeType: 'application/octet-stream',
                size: 0,
              },
              redirectURL: '',
              headersSize: -1,
              bodySize: -1,
            }
          : {
              status: 0,
              statusText: entry.failure?.errorText ?? 'request_failed',
              httpVersion: 'HTTP/1.1',
              headers: [],
              cookies: [],
              content: {
                mimeType: 'application/octet-stream',
                size: 0,
              },
              redirectURL: '',
              headersSize: -1,
              bodySize: -1,
            },
        cache: {},
        timings: {},
        _campusCopilot: {
          resourceType: entry.request.resourceType,
          failure: entry.failure,
          finalUrl: entry.response?.url,
        },
      })),
    },
  };
}

export function summarizeBrowserEvidence(state, options = {}) {
  const consoleMessages = trimEvidenceEntries(state.consoleMessages, options.consoleLimit ?? 20);
  const pageErrors = trimEvidenceEntries(state.pageErrors, options.errorLimit ?? 10);
  const networkEntries = trimEvidenceEntries(state.networkEntries, options.networkLimit ?? 40);

  return {
    requestedUrl: state.requestedUrl,
    finalUrl: state.finalUrl,
    title: state.title,
    counts: {
      consoleMessages: state.consoleMessages.length,
      pageErrors: state.pageErrors.length,
      networkEntries: state.networkEntries.length,
      failedRequests: state.networkEntries.filter((entry) => entry.failure).length,
    },
    consoleMessages,
    pageErrors,
    networkEntries: networkEntries.map((entry) => ({
      request: entry.request,
      response: entry.response,
      failure: entry.failure,
      startedAt: entry.startedAt,
      completedAt: entry.completedAt,
    })),
  };
}
