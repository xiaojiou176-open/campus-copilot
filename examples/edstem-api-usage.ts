import { buildEdStemSnapshotView } from '../packages/edstem-api/dist/index.js';

const snapshot = {
  generatedAt: '2026-04-06T00:00:00.000Z',
  messages: [
    {
      id: 'edstem:message:office-hours',
      site: 'edstem',
      title: 'Office hours',
    },
  ],
};

console.log(JSON.stringify(buildEdStemSnapshotView(snapshot, 20), null, 2));
