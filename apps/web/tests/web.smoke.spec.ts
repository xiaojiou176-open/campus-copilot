import { expect, test } from '@playwright/test';

test('shows the standalone workbench and exports the current view', async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.__CAMPUS_WEB_BOOTSTRAP_DELAY_MS__ = 150;
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const loadingWorkbenchHeading = page.getByRole('heading', { name: 'Loading shared workbench' });
  const firstStatCard = page.locator('.stats-grid .stat-card').first();

  if (await loadingWorkbenchHeading.count()) {
    await expect(loadingWorkbenchHeading).toBeVisible();
    await expect(firstStatCard.getByText('—')).toBeVisible();
    await expect(loadingWorkbenchHeading).toBeHidden();
  }
  await expect(page.getByRole('heading', { name: 'Campus Copilot workbench' })).toBeVisible();
  await expect(
    page.getByText('One local desk for academic work, administrative signals, and the next decision.'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Focus Queue' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weekly Load' })).toBeVisible();
  await expect(page.getByText('Light load: 1 calendar item.')).toBeVisible();
  const orientationHeading = page.getByRole('heading', { name: 'Campus Copilot workbench' });
  const focusQueueHeading = page.getByRole('heading', { name: 'Focus Queue' });
  const weeklyLoadHeading = page.getByRole('heading', { name: 'Weekly Load' });
  const trustSummaryHeading = page.getByRole('heading', { name: 'Why this desk is trustworthy' });
  const askAiHeading = page.getByRole('heading', { name: 'Ask AI about this workspace' });
  const loadImportLabel = page.getByText('Load a desk', { exact: true });
  const planningPulseHeading = page.getByRole('heading', { name: 'Planning Pulse' });
  const deepReviewSummary = page.locator('summary').filter({ hasText: 'More review details' });
  const currentTasksHeading = page.getByRole('heading', { name: 'Current Tasks' });
  const studyMaterialsHeading = page.getByRole('heading', { name: 'Study Materials' });
  const importedCountsHeading = page.getByRole('heading', { name: 'Imported site counts' });
  const changeJournalHeading = page.getByRole('heading', { name: 'Change Journal' });
  const discussionHighlightsHeading = page.getByRole('heading', { name: 'Discussion Highlights' });
  const scheduleOutlookHeading = page.getByRole('heading', { name: 'Schedule Outlook' });

  const orientationBox = await orientationHeading.boundingBox();
  const focusQueueBox = await focusQueueHeading.boundingBox();
  const weeklyLoadBox = await weeklyLoadHeading.boundingBox();
  const trustSummaryBox = await trustSummaryHeading.boundingBox();
  const askAiBox = await askAiHeading.boundingBox();
  const loadImportBox = await loadImportLabel.boundingBox();
  const planningPulseBox = await planningPulseHeading.boundingBox();
  const deepReviewSummaryBox = await deepReviewSummary.boundingBox();

  expect(orientationBox).not.toBeNull();
  expect(focusQueueBox).not.toBeNull();
  expect(weeklyLoadBox).not.toBeNull();
  expect(trustSummaryBox).not.toBeNull();
  expect(askAiBox).not.toBeNull();
  expect(loadImportBox).not.toBeNull();
  expect(planningPulseBox).not.toBeNull();
  expect(deepReviewSummaryBox).not.toBeNull();

  expect(orientationBox!.y).toBeLessThan(focusQueueBox!.y);
  expect(orientationBox!.y).toBeLessThan(weeklyLoadBox!.y);
  expect(focusQueueBox!.y).toBeLessThan(planningPulseBox!.y);
  expect(weeklyLoadBox!.y).toBeLessThan(planningPulseBox!.y);
  expect(planningPulseBox!.y).toBeLessThan(loadImportBox!.y);
  expect(trustSummaryBox!.y).toBeLessThan(loadImportBox!.y);
  expect(loadImportBox!.y).toBeLessThan(askAiBox!.y);
  expect(focusQueueBox!.y).toBeLessThan(planningPulseBox!.y);
  expect(planningPulseBox!.y).toBeLessThan(deepReviewSummaryBox!.y);

  await deepReviewSummary.click();
  await expect(changeJournalHeading).toBeVisible();
  await expect(discussionHighlightsHeading).toBeVisible();
  await expect(scheduleOutlookHeading).toBeVisible();
  await expect(currentTasksHeading).toBeVisible();
  await expect(studyMaterialsHeading).toBeVisible();
  await expect(importedCountsHeading).toBeVisible();

  await page.getByRole('button', { name: 'Export current view' }).click();
  await expect(page.getByText(/Downloaded .*current-view/i)).toBeVisible();
});
