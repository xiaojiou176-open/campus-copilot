import { createCampusCopilotApiServer, loadApiEnv } from './index.ts';

const env = loadApiEnv();
const port = Number(env.PORT ?? '8787');
const host = '127.0.0.1';

const server = createCampusCopilotApiServer(env);

server.listen(port, host, () => {
  process.stdout.write(`Campus Copilot BFF listening on http://${host}:${port}\n`);
});
