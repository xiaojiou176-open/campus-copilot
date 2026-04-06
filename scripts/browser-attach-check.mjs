import {
  collectChromeProcessList,
  detectProcessesUsingPath,
  getCacheGovernancePolicy,
  isBrowserRootBootstrapped,
  isPidRunning,
  readBrowserInstanceState,
} from './lib/cache-governance.mjs';

const policy = getCacheGovernancePolicy(process.env);
const bootstrapped = isBrowserRootBootstrapped(policy);
const instanceState = readBrowserInstanceState(policy.browserStateRoot);
const rootProcesses = detectProcessesUsingPath(collectChromeProcessList(), policy.browserUserDataRoot);

let status = 'ok';
let blocked;

if (!bootstrapped.ok) {
  status = 'blocked';
  blocked = 'browser_root_not_bootstrapped';
} else if (!instanceState?.pid || !isPidRunning(instanceState.pid)) {
  status = 'blocked';
  blocked = 'browser_attach_missing_repo_instance';
} else if (rootProcesses.length > 0 && !rootProcesses.some((entry) => entry.pid === instanceState.pid)) {
  status = 'blocked';
  blocked = 'browser_root_in_use_by_foreign_process';
}

console.log(
  JSON.stringify(
    {
      status,
      blocked,
      browserRoot: policy.browserUserDataRoot,
      bootstrapped,
      instanceState,
      rootProcesses,
      cdpUrl: instanceState?.cdpUrl ?? `http://127.0.0.1:${policy.browserCdpPort}`,
    },
    null,
    2,
  ),
);

if (status !== 'ok') {
  process.exit(2);
}
