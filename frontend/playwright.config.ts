import { defineConfig } from '@playwright/test';

const port = Number(process.env.UI_SNAP_PORT ?? 4173);
const snapshotTarget = process.env.UI_SNAP_TARGET === 'latest' ? 'latest' : 'baseline';

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: false,
  reporter: [['list']],
  snapshotPathTemplate:
    `Docs/Snapshots/${snapshotTarget}/{projectName}/{arg}{ext}`,
  testMatch: /snapshots\.spec\.ts/,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'off',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        viewport: { width: 1440, height: 1200 },
      },
    },
    {
      name: 'mobile',
      use: {
        viewport: { width: 390, height: 844 },
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
