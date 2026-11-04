import { defineConfig } from '@playwright/test'
import { RAW_GITHUB_MEDIA_BASE_URL } from './src/data/stories'

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

export function normalizeMediaBaseURL(value: string | undefined) {
  if (value === undefined) return undefined
  const candidate = value.trim()
  const authority = candidate.match(/^[a-z][a-z\d+.-]*:\/\/([^/?#]*)/i)?.[1]
  const hostnameAndPort = authority?.split('@').at(-1)

  if (!candidate || /[?#]/.test(candidate) || hostnameAndPort?.includes(':')) {
    throw new Error(`PLAYWRIGHT_MEDIA_BASE_URL must be exactly ${RAW_GITHUB_MEDIA_BASE_URL}`)
  }

  let url: URL
  try {
    url = new URL(candidate)
  } catch (error) {
    throw new Error(`PLAYWRIGHT_MEDIA_BASE_URL must be exactly ${RAW_GITHUB_MEDIA_BASE_URL}`, { cause: error })
  }

  if (
    url.protocol !== 'https:'
    || url.username
    || url.password
    || url.port
    || url.search
    || url.hash
    || ![RAW_GITHUB_MEDIA_BASE_URL, RAW_GITHUB_MEDIA_BASE_URL.slice(0, -1)].includes(url.href)
  ) {
    throw new Error(`PLAYWRIGHT_MEDIA_BASE_URL must be exactly ${RAW_GITHUB_MEDIA_BASE_URL}`)
  }

  return RAW_GITHUB_MEDIA_BASE_URL
}

export function publicMediaURL(webFilename: string, baseURL: string, configuredMediaBaseURL = mediaBaseURL) {
  return configuredMediaBaseURL
    ? new URL(webFilename, configuredMediaBaseURL).href
    : new URL(`videos/${webFilename}`, baseURL).href
}

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim()
const baseURL = externalBaseURL ? normalizeBaseURL(externalBaseURL) : localBaseURL
export const mediaBaseURL = normalizeMediaBaseURL(process.env.PLAYWRIGHT_MEDIA_BASE_URL)

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
