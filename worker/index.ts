const UPSTREAM_BASE = 'https://raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/'
const PAGES_ORIGIN = 'https://wilfer380.github.io'

export const ALLOWED_FILENAMES = new Set([
  '01-el-barro-antes-de-la-pizarra.mp4',
  '02-el-precio-de-una-barra-de-cobertura.mp4',
  '03-aprender-con-las-manos-vacias.mp4',
  '04-el-precio-oculto-de-estudiar-de-noche.mp4',
  '05-el-precio-de-una-pantalla-compartida.mp4',
  '06-el-tercer-turno-diario.mp4',
  '07-el-turno-de-noche-antes-de-los-deberes.mp4',
  '08-aprender-a-contrarreloj-por-un-libro.mp4',
  '09-el-privilegio-invisible-del-silencio.mp4',
  '10-el-muro-invisible-de-la-educacion-escolar.mp4',
  '11-el-precio-de-llegar-a-clase.mp4',
  '12-la-barrera-invisible-de-los-deberes.mp4',
] as const)

const FORWARDED_REQUEST_HEADERS = [
  'Range',
  'If-Range',
  'If-None-Match',
  'If-Modified-Since',
  'If-Match',
  'If-Unmodified-Since',
] as const

const PRESERVED_RESPONSE_HEADERS = [
  'Content-Length',
  'Content-Range',
  'ETag',
  'Last-Modified',
] as const

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

function errorResponse(status: number, message: string, extraHeaders?: HeadersInit) {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders(),
      ...extraHeaders,
    },
  })
}

function upstreamErrorResponse(status = 502, message = 'Upstream media request failed', extraHeaders?: HeadersInit) {
  return errorResponse(status, message, {
    'Cache-Control': 'no-store',
    ...extraHeaders,
  })
}

function allowedFilename(pathname: string) {
  const match = /^\/videos\/([^/]+)$/.exec(pathname)
  if (!match) return undefined

  const encodedFilename = match[1]
  if (!encodedFilename || encodedFilename.includes('%')) return undefined
  return ALLOWED_FILENAMES.has(encodedFilename as never) ? encodedFilename : undefined
}

async function handleRequest(request: Request) {
  let url: URL
  try {
    url = new URL(request.url)
  } catch {
    return errorResponse(400, 'Invalid request URL')
  }

  if (url.search || url.hash) return errorResponse(400, 'Queries and fragments are not accepted')

  const origin = request.headers.get('Origin')
  if (origin && origin !== PAGES_ORIGIN) return errorResponse(403, 'Origin not allowed')

  const filename = allowedFilename(url.pathname)
  if (!filename) return errorResponse(404, 'Video not found')

  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return errorResponse(405, 'Method not allowed', { Allow: 'GET, HEAD, OPTIONS' })
  }

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() })

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
    return upstreamErrorResponse()
  }

  if (upstream.status === 416) {
    const contentRange = upstream.headers.get('Content-Range')
    if (contentRange && /^bytes \*\/\d+$/.test(contentRange)) {
      return upstreamErrorResponse(416, 'Range not satisfiable', { 'Content-Range': contentRange })
    }
    return upstreamErrorResponse()
  }

  if (upstream.status !== 200 && upstream.status !== 206) {
    return upstreamErrorResponse()
  }

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

  return new Response(request.method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}

export default {
  fetch: handleRequest,
}
