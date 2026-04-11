import { defineConfig } from '@playwright/test';

const port = Number(process.env.UI_SNAP_PORT ?? 4173);

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: false,
  reporter: [['list']],
  testMatch: /auth\.smoke\.spec\.ts/,
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
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
