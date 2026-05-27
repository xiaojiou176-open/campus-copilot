export const LOCAL_BFF_CANDIDATES = ['http://127.0.0.1:8787', 'http://localhost:8787'] as const;

export type LocalBffResolutionSource = 'manual' | 'autodiscovered' | 'none';

export type LocalBffResolution = {
  baseUrl?: string;
  source: LocalBffResolutionSource;
  checkedUrls: string[];
  error?: 'not_found' | 'manual_unreachable';
};

type FetchLike = typeof fetch;

export function normalizeLocalBffBaseUrl(value?: string | null) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return undefined;
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    return undefined;
  }
}

function buildHealthUrl(baseUrl: string) {
  return `${baseUrl}/health`;
}

export async function canReachLocalBff(
  baseUrl: string,
  fetchImpl: FetchLike = fetch,
  timeoutMs = 1500,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(buildHealthUrl(baseUrl), {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveLocalBffBaseUrl(input: {
  configuredBaseUrl?: string | null;
  candidates?: readonly string[];
  fetchImpl?: FetchLike;
  timeoutMs?: number;
} = {}): Promise<LocalBffResolution> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const timeoutMs = input.timeoutMs ?? 1500;
  const configuredBaseUrl = normalizeLocalBffBaseUrl(input.configuredBaseUrl);
  const checkedUrls: string[] = [];
  const candidates = (input.candidates ?? LOCAL_BFF_CANDIDATES)
    .map((candidate) => normalizeLocalBffBaseUrl(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));

  if (configuredBaseUrl) {
    checkedUrls.push(configuredBaseUrl);
    if (await canReachLocalBff(configuredBaseUrl, fetchImpl, timeoutMs)) {
      return {
        baseUrl: configuredBaseUrl,
        source: 'manual',
        checkedUrls,
      };
    }

    return {
      source: 'none',
      checkedUrls,
      error: 'manual_unreachable',
    };
  }

  for (const candidate of candidates) {
    checkedUrls.push(candidate);
    if (await canReachLocalBff(candidate, fetchImpl, timeoutMs)) {
      return {
        baseUrl: candidate,
        source: 'autodiscovered',
        checkedUrls,
      };
    }
  }

  return {
    source: 'none',
    checkedUrls,
    error: configuredBaseUrl ? 'manual_unreachable' : 'not_found',
  };
}
