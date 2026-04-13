import { afterEach, describe, expect, it } from 'vitest';
import { createCampusCopilotApiServer, loadApiEnv } from './index';

const servers: Array<import('node:http').Server> = [];
const TRANSIENT_LOOPBACK_RETRY_COUNT = 3;
const TRANSIENT_LOOPBACK_RETRY_DELAY_MS = 150;

function isTransientLoopbackConnectError(error: unknown) {
  return (
    error instanceof Error &&
    /EADDRNOTAVAIL/.test(error.message) &&
    /127\.0\.0\.1/.test(error.message)
  );
}

async function fetchWithTransientLoopbackRetry(url: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < TRANSIENT_LOOPBACK_RETRY_COUNT; attempt += 1) {
    try {
      return await fetch(url);
    } catch (error) {
      lastError = error;
      if (!isTransientLoopbackConnectError(error) || attempt === TRANSIENT_LOOPBACK_RETRY_COUNT - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, TRANSIENT_LOOPBACK_RETRY_DELAY_MS));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('fetch failed without an error object');
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        }),
    ),
  );
});

describe('api server runtime', () => {
  it('starts a real HTTP server and serves health', async () => {
    const server = createCampusCopilotApiServer(
      loadApiEnv({
        PORT: '0',
      }),
    );
    servers.push(server);

    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected an inet server address.');
    }

    const response = await fetchWithTransientLoopbackRetry(`http://127.0.0.1:${address.port}/health`);
    const payload = (await response.json()) as { ok: boolean; service: string };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.service).toBe('campus-copilot-bff');
  });
});
