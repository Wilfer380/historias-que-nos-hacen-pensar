import { defineConfig } from '@playwright/test'

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const localBaseURL = 'http://127.0.0.1:4173/'

export function normalizeBaseURL(value: string) {
  try {
    const url = new URL(value)
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/`
    return url.href
  } catch (error) {
    throw new Error(`PLAYWRIGHT_BASE_URL must be an absolute URL: ${value}`, { cause: error })
  }
}

export function publicMediaURL(webFilename: string, baseURL: string) {
  return new URL(`videos/${webFilename}`, baseURL).href
}

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim()
const baseURL = externalBaseURL ? normalizeBaseURL(externalBaseURL) : localBaseURL

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: externalBaseURL ? undefined : {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173',
    url: localBaseURL,
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
