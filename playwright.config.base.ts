import type { PlaywrightTestConfig } from '@playwright/test';

const baseURL = 'http://localhost:4200/';

export const baseConfig: PlaywrightTestConfig = {
  retries: 3,
  maxFailures: 2,
  timeout: 120000,
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,
    testIdAttribute: 'data-zid',
    contextOptions: {
      ignoreHTTPSErrors: true,
    },
  },
};
