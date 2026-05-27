import { buildGradescopeSnapshotView } from '../packages/gradescope-api/dist/index.js';

const snapshot = {
  generatedAt: '2026-04-06T00:00:00.000Z',
  assignments: [
    {
      id: 'gradescope:assignment:ps3',
      site: 'gradescope',
      title: 'Problem Set 3',
      status: 'graded',
    },
  ],
};

console.log(JSON.stringify(buildGradescopeSnapshotView(snapshot, 20), null, 2));
