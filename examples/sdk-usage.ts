import { CampusCopilotClient, readImportedWorkbenchSnapshot, buildSnapshotSiteView } from '@campus-copilot/sdk';

async function main() {
  const client = new CampusCopilotClient();
  const status = await client.getProviderStatus();
  const snapshot = await readImportedWorkbenchSnapshot('examples/workspace-snapshot.sample.json');
  const canvas = buildSnapshotSiteView(snapshot, 'canvas', 10);

  console.log(status.providers);
  console.log(canvas.counts);
}

void main();
