import { expect, test } from '@playwright/test';

test('shows the standalone workbench and exports the current view', async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.__CAMPUS_WEB_BOOTSTRAP_DELAY_MS__ = 150;
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const loadingWorkbenchHeading = page.getByRole('heading', { name: 'Loading shared workbench' });
  const firstStatCard = page.locator('.stats-grid .stat-card').first();

  await expect(loadingWorkbenchHeading).toBeVisible();
  await expect(firstStatCard.getByText('—')).toBeVisible();

  await expect(loadingWorkbenchHeading).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Student decision workspace' })).toBeVisible();
  await expect(
    page.getByText('One local workspace where academic work and administrative signals stay grouped on the same decision desk.'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Focus Queue' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weekly Load' })).toBeVisible();
  await expect(page.getByText('Light load: 1 calendar item.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Change Journal' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Discussion Highlights' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Schedule Outlook' })).toBeVisible();

  const orientationHeading = page.getByRole('heading', { name: 'Student decision workspace' });
  const focusQueueHeading = page.getByRole('heading', { name: 'Focus Queue' });
  const weeklyLoadHeading = page.getByRole('heading', { name: 'Weekly Load' });
  const trustSummaryHeading = page.getByRole('heading', { name: 'Trust summary' });
  const loadImportLabel = page.getByText('Load / Import', { exact: true });
  const planningPulseHeading = page.getByRole('heading', { name: 'Planning Pulse' });
  const currentTasksHeading = page.getByRole('heading', { name: 'Current Tasks' });
  const studyMaterialsHeading = page.getByRole('heading', { name: 'Study Materials' });
  const importedCountsHeading = page.getByRole('heading', { name: 'Imported site counts' });

  const orientationBox = await orientationHeading.boundingBox();
  const focusQueueBox = await focusQueueHeading.boundingBox();
  const weeklyLoadBox = await weeklyLoadHeading.boundingBox();
  const trustSummaryBox = await trustSummaryHeading.boundingBox();
  const loadImportBox = await loadImportLabel.boundingBox();
  const planningPulseBox = await planningPulseHeading.boundingBox();
  const currentTasksBox = await currentTasksHeading.boundingBox();
  const studyMaterialsBox = await studyMaterialsHeading.boundingBox();
  const importedCountsBox = await importedCountsHeading.boundingBox();

  expect(orientationBox).not.toBeNull();
  expect(focusQueueBox).not.toBeNull();
  expect(weeklyLoadBox).not.toBeNull();
  expect(trustSummaryBox).not.toBeNull();
  expect(loadImportBox).not.toBeNull();
  expect(planningPulseBox).not.toBeNull();
  expect(currentTasksBox).not.toBeNull();
  expect(studyMaterialsBox).not.toBeNull();
  expect(importedCountsBox).not.toBeNull();

  expect(orientationBox!.y).toBeLessThan(focusQueueBox!.y);
  expect(orientationBox!.y).toBeLessThan(weeklyLoadBox!.y);
  expect(focusQueueBox!.y).toBeLessThan(trustSummaryBox!.y);
  expect(weeklyLoadBox!.y).toBeLessThan(loadImportBox!.y);
  expect(trustSummaryBox!.y).toBeLessThan(loadImportBox!.y);
  expect(focusQueueBox!.y).toBeLessThan(planningPulseBox!.y);
  expect(planningPulseBox!.y).toBeLessThan(currentTasksBox!.y);
  expect(currentTasksBox!.y).toBeLessThan(studyMaterialsBox!.y);
  expect(studyMaterialsBox!.y).toBeLessThan(importedCountsBox!.y);

  await page.getByRole('button', { name: 'Export current view' }).click();
  await expect(page.getByText(/Downloaded .*current-view/i)).toBeVisible();
});
