import { defineConfig } from '@playwright/test'

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chrome',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          executablePath: chromePath,
          args: ['--autoplay-policy=no-user-gesture-required'],
        },
      },
    },
    {
      name: 'edge',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          executablePath: edgePath,
          args: ['--autoplay-policy=no-user-gesture-required'],
        },
      },
    },
    {
      name: 'firefox',
      use: {
        browserName: 'firefox',
        viewport: { width: 1440, height: 900 },
        launchOptions: { firefoxUserPrefs: { 'media.autoplay.default': 0 } },
      },
    },
  ],
})
