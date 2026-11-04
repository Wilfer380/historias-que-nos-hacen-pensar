import { describe, expect, it } from 'vitest'
import {
  normalizeMediaBaseURL as normalizePlaywrightMediaBaseURL,
  publicMediaURL,
} from '../playwright.config'
import {
  normalizeMediaBaseURL as normalizeViteMediaBaseURL,
  stories,
} from '../src/data/stories'
import { ALLOWED_FILENAMES } from './index'

const exampleBase = 'https://HISTORIAS-VIDEOS.Example-Account.workers.dev'

const unsafeBases = [
  '',
  '   ',
  'http://historias-videos.example-account.workers.dev',
  'https://arbitrary.example',
  'https://other-worker.example-account.workers.dev',
  'https://historias-videos.example-account.workers.dev/nested/',
  'https://historias-videos.example-account.workers.dev:8443/',
  'https://historias-videos.example-account.workers.dev:443/',
  'https://user:secret@historias-videos.example-account.workers.dev/',
  'https://historias-videos.example-account.workers.dev/?',
  'https://historias-videos.example-account.workers.dev/#',
  'https://historias-videos.example-account.workers.dev/?target=other',
  'https://historias-videos.example-account.workers.dev/#fragment',
  'https://historias-videos.example-account.workers.dev/?target=other#fragment',
  'https://historias-videos.example-account.workers.dev/#fragment?target=other',
  'not a URL',
]

describe('public media URL structure', () => {
  it('maps Vite and Playwright to the same exact twelve normalized Worker URLs', () => {
    const viteBase = normalizeViteMediaBaseURL(exampleBase)
    const playwrightBase = normalizePlaywrightMediaBaseURL(exampleBase)
    const viteURLs = stories.map(({ webFilename }) => `${viteBase}videos/${webFilename}`)
    const playwrightURLs = stories.map(({ webFilename }) => publicMediaURL(
      webFilename,
      'https://wilfer380.github.io/historias-que-nos-hacen-pensar/',
      playwrightBase,
    ))

    expect(viteBase).toBe('https://historias-videos.example-account.workers.dev/')
    expect(playwrightBase).toBe(viteBase)
    expect(viteURLs).toEqual(playwrightURLs)
    expect(viteURLs).toEqual(stories.map(({ webFilename }) =>
      `https://historias-videos.example-account.workers.dev/videos/${webFilename}`,
    ))
    expect(new Set(viteURLs)).toHaveLength(12)
    expect(new Set(stories.map(({ webFilename }) => webFilename))).toEqual(ALLOWED_FILENAMES)
  })

  it.each(unsafeBases)('rejects unsafe deployment media base %s in both configs', (unsafeBase) => {
    expect(() => normalizeViteMediaBaseURL(unsafeBase)).toThrow()
    expect(() => normalizePlaywrightMediaBaseURL(unsafeBase)).toThrow()
  })
})
