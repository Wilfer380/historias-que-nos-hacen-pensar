import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { ALLOWED_FILENAMES } from './index'

const filename = '01-el-barro-antes-de-la-pizarra.mp4'
const workerURL = `https://media.example/videos/${filename}`
const upstreamURL = `https://raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/${filename}`

function request(path = `/videos/${filename}`, init?: RequestInit) {
  return new Request(`https://media.example${path}`, init)
}

function mockUpstream(response: Response) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
}

afterEach(() => vi.restoreAllMocks())

describe('Cloudflare media worker', () => {
  it('contains only the twelve canonical filenames', () => {
    expect([...ALLOWED_FILENAMES]).toHaveLength(12)
    expect([...ALLOWED_FILENAMES].every((name) => /^\d{2}-[a-z0-9-]+\.mp4$/.test(name))).toBe(true)
  })

  it.each([
    ['/videos/not-allowed.mp4', 404],
    ['/videos/../secret.mp4', 404],
    ['/videos/%2e%2e%2fsecret.mp4', 404],
    [`/videos/${filename}?url=https://evil.example/file.mp4`, 400],
  ])('rejects non-allowlisted surface %s', async (path, status) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await worker.fetch(request(path))
    expect(response.status).toBe(status)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects unsupported methods and non-Pages browser origins', async () => {
    const methodResponse = await worker.fetch(request(undefined, { method: 'POST' }))
    expect(methodResponse.status).toBe(405)
    expect(methodResponse.headers.get('Allow')).toBe('GET, HEAD, OPTIONS')

    const originResponse = await worker.fetch(request(undefined, {
      headers: { Origin: 'https://evil.example' },
    }))
    expect(originResponse.status).toBe(403)
  })

  it('answers CORS preflight only for an exact allowlisted route and Pages origin', async () => {
    const response = await worker.fetch(request(undefined, {
      method: 'OPTIONS',
      headers: { Origin: 'https://wilfer380.github.io' },
    }))
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://wilfer380.github.io')
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('HEAD')
  })

  it('forwards Range and validators and preserves an exact streamed 206 response', async () => {
    const bytes = new Uint8Array([0, 1, 2, 127, 255])
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes)
        controller.close()
      },
    })
    const fetchSpy = mockUpstream(new Response(stream, {
      status: 206,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(bytes.byteLength),
        'Content-Range': 'bytes 10-14/100',
        ETag: '"media-etag"',
      },
    }))

    const response = await worker.fetch(new Request(workerURL, {
      headers: {
        Range: 'bytes=10-14',
        'If-Range': '"media-etag"',
        'If-None-Match': '"older-etag"',
      },
    }))

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [target, init] = fetchSpy.mock.calls[0]!
    expect(target).toBe(upstreamURL)
    expect(init?.method).toBe('GET')
    expect(new Headers(init?.headers).get('Range')).toBe('bytes=10-14')
    expect(new Headers(init?.headers).get('If-Range')).toBe('"media-etag"')
    expect(new Headers(init?.headers).get('If-None-Match')).toBe('"older-etag"')
    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Range')).toBe('bytes 10-14/100')
    expect(response.headers.get('Content-Length')).toBe(String(bytes.byteLength))
    expect(response.headers.get('ETag')).toBe('"media-etag"')
    expect(response.headers.get('Content-Type')).toBe('video/mp4')
    expect(response.headers.get('Content-Disposition')).toBe('inline')
    expect(response.headers.get('Accept-Ranges')).toBe('bytes')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://wilfer380.github.io')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
  })

  it('preserves full 200 responses without changing bytes', async () => {
    const bytes = new Uint8Array([9, 8, 7, 6])
    mockUpstream(new Response(bytes, { status: 200, headers: { 'Content-Length': '4' } }))
    const response = await worker.fetch(request())
    expect(response.status).toBe(200)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
  })

  it('preserves valid 416 range semantics without success caching or media headers', async () => {
    mockUpstream(new Response(null, {
      status: 416,
      headers: { 'Content-Range': 'bytes */100' },
    }))
    const response = await worker.fetch(request(undefined, { headers: { Range: 'bytes=200-300' } }))
    expect(response.status).toBe(416)
    expect(response.headers.get('Content-Range')).toBe('bytes */100')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('Accept-Ranges')).toBeNull()
    expect(response.headers.get('Content-Disposition')).toBeNull()
  })

  it('returns a controlled CORS-visible 502 when upstream fetch rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('private upstream detail'))

    const response = await worker.fetch(request())

    expect(response.status).toBe(502)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://wilfer380.github.io')
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Accept-Ranges')).toBeNull()
    expect(response.headers.get('Content-Range')).toBeNull()
    expect(response.headers.get('Content-Disposition')).toBeNull()
    expect(await response.text()).toBe('Upstream media request failed')
  })

  it.each([404, 500, 503])('converts upstream %i into a controlled non-cacheable gateway failure', async (status) => {
    mockUpstream(new Response(`untrusted upstream ${status}`, {
      status,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=86400',
        'Content-Range': 'bytes 0-9/10',
      },
    }))

    const response = await worker.fetch(request())

    expect(response.status).toBe(502)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://wilfer380.github.io')
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Accept-Ranges')).toBeNull()
    expect(response.headers.get('Content-Range')).toBeNull()
    expect(response.headers.get('Content-Disposition')).toBeNull()
    expect(await response.text()).toBe('Upstream media request failed')
  })

  it('rejects a malformed upstream 416 as a controlled gateway failure', async () => {
    mockUpstream(new Response('untrusted range error', { status: 416 }))
    const response = await worker.fetch(request(undefined, { headers: { Range: 'bytes=200-300' } }))
    expect(response.status).toBe(502)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Range')).toBeNull()
    expect(await response.text()).toBe('Upstream media request failed')
  })

  it('forwards HEAD without exposing an upstream body', async () => {
    const fetchSpy = mockUpstream(new Response(null, {
      status: 200,
      headers: { 'Content-Length': '100' },
    }))
    const response = await worker.fetch(request(undefined, { method: 'HEAD' }))
    expect(fetchSpy.mock.calls[0]?.[1]?.method).toBe('HEAD')
    expect(response.body).toBeNull()
    expect(response.headers.get('Content-Length')).toBe('100')
  })
})
