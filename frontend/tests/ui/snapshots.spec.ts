import { expect, test } from '@playwright/test';
import {
  installUiSnapshotMocking,
  prepareSnapshotScenario,
  snapshotCases,
  stabilizeSnapshotViewport,
} from '../../scripts/ui-snapshots/shared.mjs';

for (const testCase of snapshotCases) {
  test(testCase.name, async ({ page }) => {
    await installUiSnapshotMocking(page, testCase.scenario);
    await page.goto(testCase.path, { waitUntil: 'networkidle' });
    await prepareSnapshotScenario(page, testCase.scenario);
    await stabilizeSnapshotViewport(page);

    await expect(page).toHaveScreenshot(`${testCase.name}.png`, {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    });
  });
}
