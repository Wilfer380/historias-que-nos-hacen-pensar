import { expect, test, type ElementHandle, type Locator, type Page } from '@playwright/test'
import { publicMediaURL } from '../playwright.config'
import { stories } from '../src/data/stories'

type Story = (typeof stories)[number]

function requireBaseURL(baseURL: string | undefined) {
  if (!baseURL) throw new Error('Playwright baseURL must be configured')
  return baseURL
}

function expectedMediaSource(story: Story, baseURL: string | undefined) {
  const appURL = new URL(requireBaseURL(baseURL))
  const mediaURL = new URL(publicMediaURL(story.webFilename, appURL.href))
  return mediaURL.origin === appURL.origin ? mediaURL.pathname : mediaURL.href
}

function expectedMediaURLs(baseURL: string | undefined) {
  const configuredBaseURL = requireBaseURL(baseURL)
  return new Set(stories.map((story) => publicMediaURL(story.webFilename, configuredBaseURL)))
}

function allowlistedMediaURL(candidate: string, baseURL: string | undefined) {
  const url = new URL(candidate, requireBaseURL(baseURL)).href
  if (!expectedMediaURLs(baseURL).has(url)) {
    throw new Error(`Rejected non-registry media URL: ${url}`)
  }
  return url
}

function trackMp4Requests(page: Page) {
  const requests: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (/\.mp4$/i.test(url.pathname)) requests.push(url.href)
  })
  return requests
}

async function openDeterministicApp(page: Page) {
  await page.addInitScript(() => {
    Math.random = () => 0
  })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Historias que nos hacen pensar' })).toBeVisible()
}

async function expectWithinViewport(locator: Locator) {
  await expect(locator).toBeVisible()
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  const viewport = locator.page().viewportSize()
  expect(box, 'Visible control must have a bounding box').not.toBeNull()
  expect(viewport, 'The test must use an explicit viewport').not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height)
}

async function expectReleasedMedia(
  handle: ElementHandle<HTMLVideoElement>,
  context: string,
  expectedURL: string,
) {
  await expect.poll(async () => handle.evaluate((media) => ({
    isConnected: media.isConnected,
    paused: media.paused,
    hasSrcAttribute: media.hasAttribute('src'),
    hasActiveCurrentSource: media.currentSrc !== '' && media.readyState !== HTMLMediaElement.HAVE_NOTHING,
    isLoading: media.networkState === HTMLMediaElement.NETWORK_LOADING,
    readyState: media.readyState,
  })), { message: `${context} must be detached, paused, source-free, and empty/non-loading` }).toEqual({
    isConnected: false,
    paused: true,
    hasSrcAttribute: false,
    hasActiveCurrentSource: false,
    isLoading: false,
    readyState: 0,
  })

  const currentSrc = await handle.evaluate((media) => media.currentSrc)
  expect([expectedURL, ''], `${context} may only expose an empty or browser-retained stale currentSrc`).toContain(currentSrc)
  if (currentSrc !== '') {
    console.info(`CLEANUP ${context}: currentSrc retains the prior URL after load(), but HAVE_NOTHING and non-loading prove it is not active`)
  }
}

async function spinNext(page: Page, discovered: number) {
  await page.getByRole('button', { name: 'GIRAR RULETA' }).click()
  await expect(page.getByLabel(`${discovered} de 12 historias descubiertas`)).toBeVisible()
}

async function openSelectedVideo(page: Page, storyIndex: number, baseURL: string | undefined) {
  const story = stories[storyIndex]
  await page.getByRole('button', { name: 'VER VIDEO' }).click()
  const video = page.getByLabel(`Video de la historia ${story.id}: ${story.phrase}`)
  await expect(video).toHaveAttribute('src', expectedMediaSource(story, baseURL))
  await video.evaluate(async (element) => {
    const media = element as HTMLVideoElement
    media.muted = true
    await media.play()
  })
  await expect.poll(() => video.evaluate((element) => {
    const media = element as HTMLVideoElement
    return media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && media.videoWidth > 0 && media.videoHeight > 0
  })).toBe(true)
  const handle = await video.elementHandle() as ElementHandle<HTMLVideoElement> | null
  expect(handle, 'The opened video must have a concrete browser element').not.toBeNull()
  return { video, handle: handle! }
}

async function observePlayback(video: ReturnType<Page['locator']>) {
  const initialTime = await video.evaluate((element) => (element as HTMLVideoElement).currentTime)
  await expect.poll(
    () => video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    { timeout: 10_000 },
  ).toBeGreaterThan(initialTime + 0.15)

  const frameEvidence = await video.evaluate(async (element) => {
    const media = element as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number
    }
    if (typeof media.requestVideoFrameCallback === 'function') {
      return await new Promise<string>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('No presented video frame observed')), 5_000)
        media.requestVideoFrameCallback?.(() => {
          window.clearTimeout(timeout)
          resolve('requestVideoFrameCallback')
        })
      })
    }
    const quality = media.getVideoPlaybackQuality?.()
    if (quality && quality.totalVideoFrames > 0) return 'getVideoPlaybackQuality'
    if (media.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && media.currentTime > 0 && media.videoWidth > 0) {
      return 'decoded-frame-fallback'
    }
    throw new Error('No presented-frame evidence API produced evidence')
  })
  expect(['requestVideoFrameCallback', 'getVideoPlaybackQuality', 'decoded-frame-fallback']).toContain(frameEvidence)

  const duration = await video.evaluate((element) => (element as HTMLVideoElement).duration)
  expect(Number.isFinite(duration), 'Decoded media duration must be finite').toBe(true)
  expect(duration, 'Decoded media duration must be greater than zero').toBeGreaterThan(0)

  const audioEvidence = await video.evaluate((element) => {
    const media = element as HTMLVideoElement & {
      captureStream?: () => MediaStream
      mozCaptureStream?: () => MediaStream
      mozHasAudio?: boolean
      webkitAudioDecodedByteCount?: number
    }
    const stream = media.captureStream?.() ?? media.mozCaptureStream?.()
    if (stream?.getAudioTracks().length) return `capture-stream:${stream.getAudioTracks().length}`
    if (media.mozHasAudio === true) return 'mozHasAudio'
    if ((media.webkitAudioDecodedByteCount ?? 0) > 0) return `decoded-bytes:${media.webkitAudioDecodedByteCount}`
    return null
  })
  expect(audioEvidence, 'The browser must expose an actual audio track or decoded-audio evidence').not.toBeNull()

  return { duration, frameEvidence, audioEvidence }
}

test.describe('cross-browser compatibility', () => {
  test('supports deterministic roulette, reset, and lazy exact media selection', async ({ page, baseURL }) => {
    const mp4Requests = trackMp4Requests(page)
    await openDeterministicApp(page)
    await expect(page.locator('video')).toHaveCount(0)
    await expect(page.locator('[data-testid^="segment-"]')).toHaveCount(12)
    expect(mp4Requests, 'Initial page load must not request MP4 media').toEqual([])

    await spinNext(page, 1)
    await expect(page.getByRole('heading', { name: stories[0].phrase })).toBeVisible()
    await expect(page.getByTestId('segment-1')).toHaveAttribute('data-revealed', 'true')
    expect(mp4Requests, 'Spinning must not request MP4 media before VER VIDEO').toEqual([])
    const { video, handle } = await openSelectedVideo(page, 0, baseURL)
    await expect.poll(() => mp4Requests.length, { message: 'VER VIDEO must trigger a media request' }).toBeGreaterThan(0)
    const selectedMediaURL = publicMediaURL(stories[0].webFilename, requireBaseURL(baseURL))
    expect(new Set(mp4Requests)).toEqual(new Set([allowlistedMediaURL(selectedMediaURL, baseURL)]))
    await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'CERRAR VIDEO' }).click()
    await expect(page.locator('video')).toHaveCount(0)
    await expectReleasedMedia(handle, 'Closing the selected video', selectedMediaURL)
    await page.getByRole('button', { name: 'REINICIAR RULETA' }).click()
    await expect(page.getByLabel('0 de 12 historias descubiertas')).toBeVisible()
    await expect(page.getByTestId('segment-1')).toHaveAttribute('data-revealed', 'false')
  })

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`${viewport.name} viewport has no horizontal overflow and usable controls`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await openDeterministicApp(page)
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      const spin = page.getByRole('button', { name: 'GIRAR RULETA' })
      await expect(spin).toBeEnabled()
      await expectWithinViewport(spin)
      await spin.click()
      const open = page.getByRole('button', { name: 'VER VIDEO' })
      await expectWithinViewport(open)
      await open.click()
      const close = page.getByRole('button', { name: 'CERRAR VIDEO' })
      const restart = page.getByRole('button', { name: 'VOLVER AL INICIO' })
      await expectWithinViewport(close)
      await expectWithinViewport(restart)
      const video = page.locator('video')
      await expect(video).toHaveCount(1)
      await expect.poll(
        () => video.evaluate((element) => (element as HTMLVideoElement).currentTime),
        { timeout: 10_000 },
      ).toBeGreaterThan(0.35)
      await restart.click()
      await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeLessThan(0.2)
      await close.click()
      await expect(page.locator('video')).toHaveCount(0)
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    })
  }
})

test.describe('HTTP media registry', () => {
  test('all twelve exact registry routes support MP4 byte ranges', async ({ request, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'chrome', 'One HTTP verification run is sufficient')
    const seen = new Set<string>()
    for (const story of stories) {
      expect(story.videoUrl).toBe(`/videos/${story.webFilename}`)
      expect(seen.has(story.videoUrl)).toBe(false)
      seen.add(story.videoUrl)
      const mediaUrl = allowlistedMediaURL(publicMediaURL(story.webFilename, requireBaseURL(baseURL)), baseURL)

      const full = await request.get(mediaUrl)
      expect(full.status(), `${story.videoUrl} full response must be exactly HTTP 200`).toBe(200)
      expect(full.headers()['content-type']).toMatch(/^video\/mp4(?:;|$)/)

      const range = await request.get(mediaUrl, { headers: { Range: 'bytes=0-1023' } })
      expect(range.status()).toBe(206)
      expect(range.headers()['content-type']).toMatch(/^video\/mp4(?:;|$)/)
      expect(range.headers()['accept-ranges']).toBe('bytes')
      expect(range.headers()['content-range']).toMatch(/^bytes 0-1023\/\d+$/)
      expect((await range.body()).byteLength).toBe(1024)
    }
    expect(seen.size).toBe(12)
  })
})

test.describe('full Chrome media lifecycle', () => {
  test('plays all twelve without repeats and closes each resource before the next', async ({ page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'chrome', 'The exhaustive sequential run is Chrome-specific')
    test.setTimeout(180_000)
    await openDeterministicApp(page)
    const observedUrls: string[] = []

    for (const [index, story] of stories.entries()) {
      await spinNext(page, index + 1)
      await expect(page.getByRole('heading', { name: story.phrase })).toBeVisible()
      const { video, handle } = await openSelectedVideo(page, index, baseURL)
      observedUrls.push(await video.getAttribute('src') ?? '')
      const evidence = await observePlayback(video)
      const evidenceDescription = `${story.videoUrl}; duration=${evidence.duration}; frame=${evidence.frameEvidence}; audio=${evidence.audioEvidence}`
      testInfo.annotations.push({ type: `media-${story.id}`, description: evidenceDescription })
      console.info(`MEDIA ${story.id}: ${evidenceDescription}`)

      if (index === 0) {
        await video.evaluate((element) => (element as HTMLVideoElement).pause())
        const pausedAt = await video.evaluate((element) => (element as HTMLVideoElement).currentTime)
        await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeCloseTo(pausedAt, 1)
        await video.evaluate((element) => (element as HTMLVideoElement).play())
        await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(pausedAt + 0.1)
        await page.getByRole('button', { name: 'VOLVER AL INICIO' }).click()
        await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeLessThan(0.2)
        await video.evaluate((element) => (element as HTMLVideoElement).play())
      }

      await page.getByRole('button', { name: 'CERRAR VIDEO' }).click()
      await expect(page.locator('video')).toHaveCount(0)
      await expect(page.locator('video[src]')).toHaveCount(0)
      await expectReleasedMedia(
        handle,
        `Closing story ${story.id}`,
        publicMediaURL(story.webFilename, requireBaseURL(baseURL)),
      )
    }

    expect(observedUrls).toEqual(stories.map((story) => expectedMediaSource(story, baseURL)))
    expect(new Set(observedUrls).size).toBe(12)
  })

  test('switching stories releases the old URL and loads only the new URL', async ({ page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'chrome', 'Detailed switching lifecycle is covered in Chrome')
    await openDeterministicApp(page)
    await spinNext(page, 1)
    const first = await openSelectedVideo(page, 0, baseURL)
    await page.getByRole('button', { name: 'GIRAR RULETA' }).click()
    await expect(page.locator('video')).toHaveCount(0)
    await expectReleasedMedia(
      first.handle,
      'Switching away from story 1',
      publicMediaURL(stories[0].webFilename, requireBaseURL(baseURL)),
    )
    await expect(page.getByLabel('2 de 12 historias descubiertas')).toBeVisible()
    const second = await openSelectedVideo(page, 1, baseURL)
    await expect(second.video).toHaveAttribute('src', expectedMediaSource(stories[1], baseURL))
    await expect(second.video).not.toHaveAttribute('src', expectedMediaSource(stories[0], baseURL))
  })
})
