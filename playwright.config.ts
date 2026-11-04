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

export function normalizeMediaBaseURL(value: string) {
  const candidate = value.trim()
  const authority = candidate.match(/^[a-z][a-z\d+.-]*:\/\/([^/?#]*)/i)?.[1]
  const hostnameAndPort = authority?.split('@').at(-1)

  if (/[?#]/.test(candidate) || hostnameAndPort?.includes(':')) {
    throw new Error('PLAYWRIGHT_MEDIA_BASE_URL must be an HTTPS historias-videos.<account>.workers.dev root URL without credentials, port, path, query, or fragment')
  }

  let url: URL
  try {
    url = new URL(candidate)
  } catch (error) {
    throw new Error(`PLAYWRIGHT_MEDIA_BASE_URL must be an absolute HTTPS Worker root URL: ${candidate}`, { cause: error })
  }

  const workerHostname = /^historias-videos\.([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.workers\.dev$/
  if (
    url.protocol !== 'https:'
    || !workerHostname.test(url.hostname)
    || url.username
    || url.password
    || url.port
    || url.pathname !== '/'
    || url.search
    || url.hash
  ) {
    throw new Error('PLAYWRIGHT_MEDIA_BASE_URL must be an HTTPS historias-videos.<account>.workers.dev root URL without credentials, port, path, query, or fragment')
  }

  return url.href
}

export function publicMediaURL(webFilename: string, baseURL: string, configuredMediaBaseURL = mediaBaseURL) {
  return new URL(`videos/${webFilename}`, configuredMediaBaseURL ?? baseURL).href
}

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim()
const baseURL = externalBaseURL ? normalizeBaseURL(externalBaseURL) : localBaseURL
const externalMediaBaseURL = process.env.PLAYWRIGHT_MEDIA_BASE_URL
export const mediaBaseURL = externalMediaBaseURL === undefined ? undefined : normalizeMediaBaseURL(externalMediaBaseURL)

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
