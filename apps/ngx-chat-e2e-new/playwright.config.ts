import { devices, PlaywrightTestConfig } from '@playwright/test';
import { baseConfig } from './playwright.config.base';
// import * as puppeteer from 'puppeteer';

// const executablePath: string = puppeteer.executablePath();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  ...baseConfig,
  /* Maximum time one test can run for. */
  timeout: 60 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 10000,
  },
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env['CI'],
  /* Retry on CI only */
  retries: process.env['CI'] ? 2 : 0,
  /* Allow all tests to run to expose all failures */
  maxFailures: 0,
  /* Opt out of parallel tests to skip for now additional complexity in the tests. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    ...baseConfig.use,
    baseURL: 'http://localhost:4201/',
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
    headless: true,
  },
  testDir: './src',
  globalSetup: require.resolve('./src/global-setup'),
  testMatch: /.*\.spec\.ts/,
  /* Configure projects for chromium only */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // launchOptions: {
        //   executablePath,
        // },
      },
    },
    /* Test against a major browsers. */
    //    {
    //       name: 'firefox',
    //       use: {
    //         ...devices['Desktop Firefox'],
    //       },
    //     },
    //
    //     {
    //       name: 'webkit',
    //       use: {
    //         ...devices['Desktop Safari'],
    //      },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: {
    //     ...devices['iPhone 12'],
    //   },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: {
    //     channel: 'msedge',
    //   },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: {
    //     channel: 'chrome',
    //   },
    // },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  // outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npx nx serve demo-new',
    url: 'http://localhost:4201/',
    reuseExistingServer: true,
    timeout: 300 * 1000,
  },
};

export default config;
