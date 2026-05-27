import { buildMyUwSnapshotView } from '../packages/myuw-api/dist/index.js';

const snapshot = {
  generatedAt: '2026-04-06T00:00:00.000Z',
  events: [
    {
      id: 'myuw:event:lecture',
      site: 'myuw',
      title: 'CSE 312 lecture',
    },
  ],
};

console.log(JSON.stringify(buildMyUwSnapshotView(snapshot, 20), null, 2));
