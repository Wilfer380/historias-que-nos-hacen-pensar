const UPSTREAM_BASE = 'https://raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/'
const PAGES_ORIGIN = 'https://wilfer380.github.io'

export const MEDIA_METADATA = Object.freeze({
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
} as const)

// Compatibility export for the existing cross-config security assertion. Routing uses
// MEDIA_METADATA as its sole allowlist and size authority.
export const ALLOWED_FILENAMES = new Set(Object.keys(MEDIA_METADATA))

type MediaFilename = keyof typeof MEDIA_METADATA
type ByteRange = { start: number; end: number }

const FORWARDED_REQUEST_HEADERS = [
  'Range',
  'If-Range',
  'If-None-Match',
  'If-Modified-Since',
  'If-Match',
  'If-Unmodified-Since',
] as const

const PRESERVED_RESPONSE_HEADERS = ['ETag', 'Last-Modified'] as const

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': PAGES_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, If-Range, If-None-Match, If-Modified-Since, If-Match, If-Unmodified-Since',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Length, Content-Range, ETag, Last-Modified',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function controlledResponse(request: Request, body: BodyInit | null, init: ResponseInit) {
  return new Response(request.method === 'HEAD' ? null : body, init)
}

function errorResponse(request: Request, status: number, message: string, extraHeaders?: HeadersInit) {
  return controlledResponse(request, message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders(),
      ...extraHeaders,
    },
  })
}

function upstreamErrorResponse(request: Request) {
  return errorResponse(request, 502, 'Upstream media request failed')
}

function allowedFilename(pathname: string): MediaFilename | undefined {
  const match = /^\/videos\/([^/]+)$/.exec(pathname)
  if (!match) return undefined

  const encodedFilename = match[1]
  if (!encodedFilename || encodedFilename.includes('%')) return undefined
  return Object.prototype.hasOwnProperty.call(MEDIA_METADATA, encodedFilename)
    ? encodedFilename as MediaFilename
    : undefined
}

function parseRange(value: string, size: number): ByteRange | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value)
  if (!match) return undefined

  const [, startText, endText] = match
  if (!startText && !endText) return undefined

  if (!startText) {
    const suffix = Number(endText)
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return undefined
    return { start: Math.max(0, size - suffix), end: size - 1 }
  }

  const start = Number(startText)
  if (!Number.isSafeInteger(start) || start >= size) return undefined

  if (!endText) return { start, end: size - 1 }

  const requestedEnd = Number(endText)
  if (!Number.isSafeInteger(requestedEnd) || requestedEnd < start) return undefined
  return { start, end: Math.min(requestedEnd, size - 1) }
}

function rangeNotSatisfiable(request: Request, size: number) {
  return errorResponse(request, 416, 'Range not satisfiable', {
    'Content-Range': `bytes */${size}`,
  })
}

function mediaHeaders(upstream: Response) {
  const headers = new Headers()
  for (const header of PRESERVED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(header)
    if (value !== null) headers.set(header, value)
  }
  for (const [name, value] of Object.entries(corsHeaders())) headers.set(name, value)
  headers.set('Content-Type', 'video/mp4')
  headers.set('Content-Disposition', 'inline')
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400')
  headers.set('X-Content-Type-Options', 'nosniff')
  return headers
}

function hasExactContentLength(upstream: Response, expectedLength: number) {
  return upstream.headers.get('Content-Length') === String(expectedLength)
}

function validUpstreamRange(upstream: Response, range: ByteRange, size: number) {
  const expectedLength = range.end - range.start + 1
  return upstream.headers.get('Content-Range') === `bytes ${range.start}-${range.end}/${size}`
    && hasExactContentLength(upstream, expectedLength)
}

function cancelReader(reader: ReadableStreamDefaultReader<Uint8Array>, reason?: unknown) {
  try {
    return reader.cancel(reason).catch(() => undefined)
  } catch {
    return Promise.resolve()
  }
}

function discardUpstream(upstream: Response) {
  if (!upstream.body) return
  try {
    void upstream.body.cancel().catch(() => undefined)
  } catch {
    // A disturbed or already-completed body needs no further cleanup.
  }
}

function exactLengthStream(body: ReadableStream<Uint8Array>, expectedLength: number) {
  const reader = body.getReader()
  let received = 0
  let finished = false

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (finished) return
      try {
        const { done, value } = await reader.read()
        if (done) {
          finished = true
          if (received === expectedLength) controller.close()
          else controller.error(new Error('Upstream body ended before its declared length'))
          return
        }

        if (received + value.byteLength > expectedLength) {
          finished = true
          void cancelReader(reader, 'Upstream body exceeded its declared length')
          controller.error(new Error('Upstream body exceeded its declared length'))
          return
        }

        received += value.byteLength
        if (value.byteLength > 0) controller.enqueue(value)
      } catch (error) {
        finished = true
        controller.error(error)
      }
    },
    cancel(reason) {
      if (finished) return
      finished = true
      return cancelReader(reader, reason)
    },
  })
}

function streamRange(body: ReadableStream<Uint8Array>, range: ByteRange, size: number) {
  const reader = body.getReader()
  let offset = 0
  let finished = false

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (finished) return

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            finished = true
            controller.error(new Error('Upstream body ended before the requested range'))
            return
          }

          const chunkStart = offset
          const nextOffset = chunkStart + value.byteLength
          if (nextOffset > size) {
            finished = true
            void cancelReader(reader, 'Upstream body exceeded its declared length')
            controller.error(new Error('Upstream body exceeded its declared length'))
            return
          }

          offset = nextOffset
          const chunkEnd = nextOffset - 1
          if (chunkEnd < range.start) continue

          const sliceStart = Math.max(0, range.start - chunkStart)
          const sliceEnd = Math.min(value.byteLength, range.end - chunkStart + 1)
          if (sliceEnd > sliceStart) controller.enqueue(value.subarray(sliceStart, sliceEnd))

          if (chunkEnd >= range.end) {
            finished = true
            controller.close()
            void cancelReader(reader, 'Requested range completed')
          }
          return
        }
      } catch (error) {
        finished = true
        controller.error(error)
      }
    },
    cancel(reason) {
      if (finished) return
      finished = true
      return cancelReader(reader, reason)
    },
  })
}

function fullResponse(request: Request, upstream: Response, size: number) {
  if (!hasExactContentLength(upstream, size)) {
    discardUpstream(upstream)
    return upstreamErrorResponse(request)
  }

  const headers = mediaHeaders(upstream)
  headers.set('Content-Length', String(size))

  if (request.method === 'HEAD') {
    discardUpstream(upstream)
    return controlledResponse(request, null, { status: 200, headers })
  }
  if (!upstream.body) return upstreamErrorResponse(request)

  return controlledResponse(request, exactLengthStream(upstream.body, size), { status: 200, headers })
}

async function handleRequest(request: Request) {
  let url: URL
  try {
    url = new URL(request.url)
  } catch {
    return errorResponse(request, 400, 'Invalid request URL')
  }

  if (url.search || url.hash) return errorResponse(request, 400, 'Queries and fragments are not accepted')

  const origin = request.headers.get('Origin')
  if (origin && origin !== PAGES_ORIGIN) return errorResponse(request, 403, 'Origin not allowed')

  const filename = allowedFilename(url.pathname)
  if (!filename) return errorResponse(request, 404, 'Video not found')

  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return errorResponse(request, 405, 'Method not allowed', { Allow: 'GET, HEAD, OPTIONS' })
  }

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() })

  const size = MEDIA_METADATA[filename]
  const rangeValue = request.headers.get('Range')
  const range = rangeValue === null ? undefined : parseRange(rangeValue, size)
  if (rangeValue !== null && !range) return rangeNotSatisfiable(request, size)

  const upstreamHeaders = new Headers()
  for (const header of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(header)
    if (value !== null) upstreamHeaders.set(header, value)
  }

  let upstream: Response
  try {
    upstream = await fetch(`${UPSTREAM_BASE}${filename}`, {
      method: request.method,
      headers: upstreamHeaders,
      redirect: 'follow',
    })
  } catch {
    return upstreamErrorResponse(request)
  }

  if (upstream.status !== 200 && upstream.status !== 206) {
    discardUpstream(upstream)
    return upstreamErrorResponse(request)
  }

  if (!range) {
    if (upstream.status !== 200) {
      discardUpstream(upstream)
      return upstreamErrorResponse(request)
    }
    return fullResponse(request, upstream, size)
  }

  if (upstream.status === 200 && request.headers.has('If-Range')) {
    return fullResponse(request, upstream, size)
  }

  const rangeLength = range.end - range.start + 1
  const headers = mediaHeaders(upstream)
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
  headers.set('Content-Length', String(rangeLength))

  if (upstream.status === 206) {
    if (!validUpstreamRange(upstream, range, size)) {
      discardUpstream(upstream)
      return upstreamErrorResponse(request)
    }
    if (request.method === 'HEAD') {
      discardUpstream(upstream)
      return controlledResponse(request, null, { status: 206, headers })
    }
    if (!upstream.body) return upstreamErrorResponse(request)
    return controlledResponse(request, exactLengthStream(upstream.body, rangeLength), { status: 206, headers })
  }

  if (!hasExactContentLength(upstream, size)) {
    discardUpstream(upstream)
    return upstreamErrorResponse(request)
  }
  if (request.method === 'HEAD') {
    discardUpstream(upstream)
    return controlledResponse(request, null, { status: 206, headers })
  }
  if (!upstream.body) return upstreamErrorResponse(request)

  return controlledResponse(request, streamRange(upstream.body, range, size), {
    status: 206,
    headers,
  })
}

export default {
  fetch: handleRequest,
}
