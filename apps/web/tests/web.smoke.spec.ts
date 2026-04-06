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
  await expect(page.getByRole('heading', { name: 'Academic workbench' })).toBeVisible();
  await expect(
    page.getByText('This standalone second surface stays on the same local-first, read-only contract'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Focus Queue' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weekly Load' })).toBeVisible();
  await expect(page.getByText('Light load: 1 calendar item.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Change Journal' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Discussion Highlights' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Schedule Outlook' })).toBeVisible();

  await page.getByRole('button', { name: 'Export current view' }).click();
  await expect(page.getByText(/Downloaded .*current-view/i)).toBeVisible();
});
