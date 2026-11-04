import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { MEDIA_METADATA } from './index'

const filename = '01-el-barro-antes-de-la-pizarra.mp4'
const size = MEDIA_METADATA[filename]
const workerURL = `https://media.example/videos/${filename}`
const upstreamURL = `https://raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/${filename}`

function request(path = `/videos/${filename}`, init?: RequestInit) {
  return new Request(`https://media.example${path}`, init)
}

function mockUpstream(response: Response) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
}

function bytesAt(start: number, length: number) {
  return Uint8Array.from({ length }, (_, index) => (start + index) % 251)
}

function chunkedBody(total: number, chunkSizes: number[] = [1_048_576]) {
  let offset = 0
  let chunkIndex = 0
  const state = { cancelled: false, produced: 0 }
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= total) {
        controller.close()
        return
      }
      const requestedSize = chunkSizes[chunkIndex++ % chunkSizes.length]!
      const length = Math.min(requestedSize, total - offset)
      controller.enqueue(bytesAt(offset, length))
      offset += length
      state.produced = offset
    },
    cancel() {
      state.cancelled = true
    },
  }, { highWaterMark: 0 })
  return { stream, state }
}

async function responseBytes(response: Response) {
  const reader = response.body!.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    length += value.byteLength
  }
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

afterEach(() => vi.restoreAllMocks())

describe('Cloudflare media worker', () => {
  it('contains exact immutable metadata for the twelve audited originals', () => {
    expect(MEDIA_METADATA).toEqual({
      '01-el-barro-antes-de-la-pizarra.mp4': 10_563_746,
      '02-el-precio-de-una-barra-de-cobertura.mp4': 10_544_265,
      '03-aprender-con-las-manos-vacias.mp4': 9_838_864,
      '04-el-precio-oculto-de-estudiar-de-noche.mp4': 7_204_824,
      '05-el-precio-de-una-pantalla-compartida.mp4': 9_559_136,
      '06-el-tercer-turno-diario.mp4': 7_241_181,
      '07-el-turno-de-noche-antes-de-los-deberes.mp4': 8_881_649,
      '08-aprender-a-contrarreloj-por-un-libro.mp4': 7_060_346,
      '09-el-privilegio-invisible-del-silencio.mp4': 8_872_420,
      '10-el-muro-invisible-de-la-educacion-escolar.mp4': 7_589_424,
      '11-el-precio-de-llegar-a-clase.mp4': 7_679_802,
      '12-la-barrera-invisible-de-los-deberes.mp4': 10_481_500,
    })
    expect(Object.isFrozen(MEDIA_METADATA)).toBe(true)
    for (const [name, expectedSize] of Object.entries(MEDIA_METADATA)) {
      expect(statSync(resolve('public/videos', name)).size, name).toBe(expectedSize)
    }
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
    expect(response.headers.get('Cache-Control')).toBe('no-store')
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

  it('forwards validators and preserves a valid streamed upstream 206', async () => {
    const bytes = bytesAt(10, 5)
    const fetchSpy = mockUpstream(new Response(bytes, {
      status: 206,
      headers: {
        'Content-Length': '5',
        'Content-Range': `bytes 10-14/${size}`,
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

    const [target, init] = fetchSpy.mock.calls[0]!
    expect(target).toBe(upstreamURL)
    expect(init?.method).toBe('GET')
    expect(new Headers(init?.headers).get('Range')).toBe('bytes=10-14')
    expect(new Headers(init?.headers).get('If-Range')).toBe('"media-etag"')
    expect(new Headers(init?.headers).get('If-None-Match')).toBe('"older-etag"')
    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Range')).toBe(`bytes 10-14/${size}`)
    expect(response.headers.get('Content-Length')).toBe('5')
    expect(response.headers.get('ETag')).toBe('"media-etag"')
    expect(response.headers.get('Content-Type')).toBe('video/mp4')
    expect(response.headers.get('Content-Disposition')).toBe('inline')
    expect(response.headers.get('Accept-Ranges')).toBe('bytes')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://wilfer380.github.io')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(await responseBytes(response)).toEqual(bytes)
  })

  it.each([
    ['bounded', 'bytes=3-8', 3, 8, [2, 3, 4]],
    ['open', `bytes=${size - 5}-`, size - 5, size - 1, [1_000_003]],
    ['suffix', 'bytes=-7', size - 7, size - 1, [999_983]],
  ] as const)('streams exact bytes across chunk boundaries for a %s fallback range', async (_name, rangeHeader, start, end, chunks) => {
    const { stream, state } = chunkedBody(size, [...chunks])
    const upstream = new Response(stream, { status: 200, headers: { 'Content-Length': String(size) } })
    const arrayBufferSpy = vi.spyOn(upstream, 'arrayBuffer')
    const textSpy = vi.spyOn(upstream, 'text')
    const blobSpy = vi.spyOn(upstream, 'blob')
    mockUpstream(upstream)

    const response = await worker.fetch(request(undefined, { headers: { Range: rangeHeader } }))

    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Range')).toBe(`bytes ${start}-${end}/${size}`)
    expect(response.headers.get('Content-Length')).toBe(String(end - start + 1))
    expect(await responseBytes(response)).toEqual(bytesAt(start, end - start + 1))
    expect(state.cancelled).toBe(true)
    expect(state.produced).toBeLessThanOrEqual(size)
    expect(arrayBufferSpy).not.toHaveBeenCalled()
    expect(textSpy).not.toHaveBeenCalled()
    expect(blobSpy).not.toHaveBeenCalled()
  })

  it('cancels upstream immediately after a small bounded interval', async () => {
    const { stream, state } = chunkedBody(size, [4])
    mockUpstream(new Response(stream, { status: 200, headers: { 'Content-Length': String(size) } }))
    const response = await worker.fetch(request(undefined, { headers: { Range: 'bytes=1-5' } }))
    expect(await responseBytes(response)).toEqual(bytesAt(1, 5))
    expect(state.cancelled).toBe(true)
    expect(state.produced).toBe(8)
  })

  it.each([
    'items=0-1',
    'bytes=0-1,3-4',
    'bytes=-0',
    'bytes=-',
    'bytes=9-3',
    `bytes=${size}-`,
    'bytes=not-a-number',
  ])('returns a controlled 416 without fetching for invalid range %s', async (range) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await worker.fetch(request(undefined, { headers: { Range: range } }))
    expect(response.status).toBe(416)
    expect(response.headers.get('Content-Range')).toBe(`bytes */${size}`)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('Accept-Ranges')).toBeNull()
    expect(response.headers.get('Content-Disposition')).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns fallback 206 headers and no body for a ranged HEAD request', async () => {
    const fetchSpy = mockUpstream(new Response(null, {
      status: 200,
      headers: { 'Content-Length': String(size), ETag: '"head"' },
    }))
    const response = await worker.fetch(request(undefined, { method: 'HEAD', headers: { Range: 'bytes=2-6' } }))
    expect(fetchSpy.mock.calls[0]?.[1]?.method).toBe('HEAD')
    expect(new Headers(fetchSpy.mock.calls[0]?.[1]?.headers).get('Range')).toBe('bytes=2-6')
    expect(response.status).toBe(206)
    expect(response.body).toBeNull()
    expect(response.headers.get('Content-Range')).toBe(`bytes 2-6/${size}`)
    expect(response.headers.get('Content-Length')).toBe('5')
    expect(response.headers.get('ETag')).toBe('"head"')
  })

  it('preserves a validated full 200 response as a stream', async () => {
    const { stream } = chunkedBody(size, [1_000_003])
    mockUpstream(new Response(stream, {
      status: 200,
      headers: { 'Content-Length': String(size) },
    }))
    const response = await worker.fetch(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Length')).toBe(String(size))
    expect((await responseBytes(response)).byteLength).toBe(size)
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

  it.each([404, 416, 500, 503])('converts upstream %i into a controlled non-cacheable gateway failure', async (status) => {
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
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Accept-Ranges')).toBeNull()
    expect(response.headers.get('Content-Range')).toBeNull()
    expect(response.headers.get('Content-Disposition')).toBeNull()
  })

  it('rejects a malformed upstream 206 as a controlled gateway failure', async () => {
    mockUpstream(new Response(new Uint8Array([1]), {
      status: 206,
      headers: { 'Content-Range': `bytes 0-0/${size}` },
    }))
    const response = await worker.fetch(request(undefined, { headers: { Range: 'bytes=10-14' } }))
    expect(response.status).toBe(502)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Range')).toBeNull()
  })

  it('preserves an If-Range validator mismatch as a full streamed 200', async () => {
    const { stream } = chunkedBody(size, [1_000_003])
    mockUpstream(new Response(stream, {
      status: 200,
      headers: { 'Content-Length': String(size), ETag: '"new"' },
    }))

    const response = await worker.fetch(request(undefined, {
      headers: { Range: 'bytes=10-14', 'If-Range': '"old"' },
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Range')).toBeNull()
    expect(response.headers.get('Content-Length')).toBe(String(size))
    expect(response.headers.get('ETag')).toBe('"new"')
    expect((await responseBytes(response)).byteLength).toBe(size)
  })

  it('preserves an If-Range validator mismatch as a bodyless full HEAD 200', async () => {
    mockUpstream(new Response(null, {
      status: 200,
      headers: { 'Content-Length': String(size), ETag: '"new"' },
    }))

    const response = await worker.fetch(request(undefined, {
      method: 'HEAD',
      headers: { Range: 'bytes=10-14', 'If-Range': '"old"' },
    }))

    expect(response.status).toBe(200)
    expect(response.body).toBeNull()
    expect(response.headers.get('Content-Range')).toBeNull()
    expect(response.headers.get('Content-Length')).toBe(String(size))
  })

  it.each([
    ['missing Content-Range', { 'Content-Length': '5' }],
    ['missing Content-Length', { 'Content-Range': `bytes 10-14/${size}` }],
    ['mismatched Content-Range', { 'Content-Length': '5', 'Content-Range': `bytes 11-15/${size}` }],
    ['mismatched Content-Length', { 'Content-Length': '4', 'Content-Range': `bytes 10-14/${size}` }],
  ])('rejects a 206 with %s', async (_case, headers) => {
    mockUpstream(new Response(bytesAt(10, 5), { status: 206, headers }))
    const response = await worker.fetch(request(undefined, { headers: { Range: 'bytes=10-14' } }))
    expect(response.status).toBe(502)
    expect(response.headers.get('Content-Range')).toBeNull()
  })

  it.each([
    ['short', bytesAt(10, 4)],
    ['excess', bytesAt(10, 6)],
  ])('fails a streamed 206 whose body is %s', async (_case, bytes) => {
    mockUpstream(new Response(bytes, {
      status: 206,
      headers: {
        'Content-Length': '5',
        'Content-Range': `bytes 10-14/${size}`,
      },
    }))
    const response = await worker.fetch(request(undefined, { headers: { Range: 'bytes=10-14' } }))
    await expect(responseBytes(response)).rejects.toThrow(/Upstream body/)
  })

  it('rejects a null GET body on an otherwise valid 206', async () => {
    mockUpstream(new Response(null, {
      status: 206,
      headers: {
        'Content-Length': '5',
        'Content-Range': `bytes 10-14/${size}`,
      },
    }))
    const response = await worker.fetch(request(undefined, { headers: { Range: 'bytes=10-14' } }))
    expect(response.status).toBe(502)
  })

  it('fails a fallback range stream when the full body ends before the requested end', async () => {
    mockUpstream(new Response(bytesAt(0, 4), {
      status: 200,
      headers: { 'Content-Length': String(size) },
    }))
    const response = await worker.fetch(request(undefined, { headers: { Range: 'bytes=2-6' } }))
    expect(response.status).toBe(206)
    await expect(responseBytes(response)).rejects.toThrow('Upstream body ended before the requested range')
  })

  it.each([
    ['missing length', undefined],
    ['mismatched length', String(size - 1)],
  ])('rejects a full 200 with %s', async (_case, contentLength) => {
    const headers = new Headers()
    if (contentLength) headers.set('Content-Length', contentLength)
    mockUpstream(new Response(bytesAt(0, 1), { status: 200, headers }))
    const response = await worker.fetch(request())
    expect(response.status).toBe(502)
    expect(response.headers.get('Content-Length')).not.toBe(String(size))
  })

  it('rejects a null GET body on an otherwise valid full 200', async () => {
    mockUpstream(new Response(null, {
      status: 200,
      headers: { 'Content-Length': String(size) },
    }))
    const response = await worker.fetch(request())
    expect(response.status).toBe(502)
  })

  it.each([
    ['short', size - 1],
    ['excess', size + 1],
  ])('fails a streamed full 200 whose body is %s', async (_case, bodySize) => {
    const { stream } = chunkedBody(bodySize, [1_000_003])
    mockUpstream(new Response(stream, {
      status: 200,
      headers: { 'Content-Length': String(size) },
    }))
    const response = await worker.fetch(request())
    expect(response.status).toBe(200)
    await expect(responseBytes(response)).rejects.toThrow(/Upstream body/)
  })

  it.each([
    ['/videos/not-allowed.mp4', {}, 404],
    [`/videos/${filename}?query=1`, {}, 400],
    [`/videos/${filename}`, { headers: { Origin: 'https://evil.example' } }, 403],
    [`/videos/${filename}`, { headers: { Range: `bytes=${size}-` } }, 416],
  ])('keeps the HEAD error body null for %s', async (path, init, status) => {
    const response = await worker.fetch(request(path, { method: 'HEAD', ...init }))
    expect(response.status).toBe(status)
    expect(response.body).toBeNull()
  })

  it('keeps a HEAD gateway error body null', async () => {
    mockUpstream(new Response('untrusted', { status: 500 }))
    const response = await worker.fetch(request(undefined, { method: 'HEAD' }))
    expect(response.status).toBe(502)
    expect(response.body).toBeNull()
  })

  it('ignores reader cancellation rejection after a valid fallback response completes', async () => {
    let sent = false
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent) return
        sent = true
        controller.enqueue(bytesAt(0, 10))
      },
      cancel() {
        return Promise.reject(new Error('cancel failed'))
      },
    }, { highWaterMark: 0 })
    mockUpstream(new Response(stream, {
      status: 200,
      headers: { 'Content-Length': String(size) },
    }))

    const response = await worker.fetch(request(undefined, { headers: { Range: 'bytes=1-5' } }))
    expect(await responseBytes(response)).toEqual(bytesAt(1, 5))
    await Promise.resolve()
  })

  it('forwards an unranged HEAD without exposing an upstream body', async () => {
    const fetchSpy = mockUpstream(new Response(null, {
      status: 200,
      headers: { 'Content-Length': String(size) },
    }))
    const response = await worker.fetch(request(undefined, { method: 'HEAD' }))
    expect(fetchSpy.mock.calls[0]?.[1]?.method).toBe('HEAD')
    expect(response.body).toBeNull()
    expect(response.headers.get('Content-Length')).toBe(String(size))
  })
})
