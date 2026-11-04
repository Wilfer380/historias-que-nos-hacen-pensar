export type StoryId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export interface Story {
  readonly id: StoryId
  readonly phrase: string
  readonly sourceFilename: string
  readonly webFilename: string
  readonly videoUrl: `${string}videos/${string}.mp4`
  readonly sha256: string
}

// Vite replaces these values in browser builds. Playwright and Node import this
// registry directly, where import.meta.env is absent and root-relative URLs are
// required.
type MediaEnv = { readonly BASE_URL?: string; readonly VITE_MEDIA_BASE_URL?: string }
const viteEnv = (import.meta as ImportMeta & { readonly env?: MediaEnv }).env
const baseUrl = viteEnv?.BASE_URL ?? '/'

export const RAW_GITHUB_MEDIA_BASE_URL = 'https://raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/'

function localMediaBaseURL(fallback: string): `${string}videos/` {
  return `${fallback.replace(/\/+$/, '')}/videos/`
}

export function normalizeMediaBaseURL(value: string | undefined, fallback = '/'): `${string}videos/` {
  if (value === undefined) return localMediaBaseURL(fallback)
  const candidate = value.trim()
  const authority = candidate.match(/^[a-z][a-z\d+.-]*:\/\/([^/?#]*)/i)?.[1]
  const hostnameAndPort = authority?.split('@').at(-1)

  if (!candidate || /[?#]/.test(candidate) || hostnameAndPort?.includes(':')) {
    throw new Error(`VITE_MEDIA_BASE_URL must be exactly ${RAW_GITHUB_MEDIA_BASE_URL}`)
  }

  let url: URL
  try {
    url = new URL(candidate)
  } catch (error) {
    throw new Error(`VITE_MEDIA_BASE_URL must be exactly ${RAW_GITHUB_MEDIA_BASE_URL}`, { cause: error })
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
    throw new Error(`VITE_MEDIA_BASE_URL must be exactly ${RAW_GITHUB_MEDIA_BASE_URL}`)
  }

  return RAW_GITHUB_MEDIA_BASE_URL
}

const mediaBaseUrl = normalizeMediaBaseURL(viteEnv?.VITE_MEDIA_BASE_URL, baseUrl)

function mediaUrl(webFilename: `${string}.mp4`): Story['videoUrl'] {
  return `${mediaBaseUrl}${webFilename}`
}

export const stories = [
  {
    id: 1,
    phrase: 'El largo camino hacia la escuela',
    sourceFilename: 'El_barro_antes_de_la_pizarra.mp4',
    webFilename: '01-el-barro-antes-de-la-pizarra.mp4',
    videoUrl: mediaUrl('01-el-barro-antes-de-la-pizarra.mp4'),
    sha256: '65087b92e433094bab357bd785b6875823d794d450ea93e81b8f979ccc8719cb',
  },
  {
    id: 2,
    phrase: 'Sin internet para estudiar',
    sourceFilename: 'El_precio_de_una_barra_de_cobertura.mp4',
    webFilename: '02-el-precio-de-una-barra-de-cobertura.mp4',
    videoUrl: mediaUrl('02-el-precio-de-una-barra-de-cobertura.mp4'),
    sha256: 'ec7542131afaf56ec46b5c0a0905b95a1076a72f060137ab121516afa618eb27',
  },
  {
    id: 3,
    phrase: 'Estudiar sin materiales escolares suficientes',
    sourceFilename: 'Aprender_con_las_manos_vacías.mp4',
    webFilename: '03-aprender-con-las-manos-vacias.mp4',
    videoUrl: mediaUrl('03-aprender-con-las-manos-vacias.mp4'),
    sha256: 'a422a5b19fe451f708253bf2c7df6dd4370e8c71f84b3b9cd4a3092dd654c194',
  },
  {
    id: 4,
    phrase: 'Trabajar de día y estudiar de noche',
    sourceFilename: 'El_precio_oculto_de_estudiar_de_noche.mp4',
    webFilename: '04-el-precio-oculto-de-estudiar-de-noche.mp4',
    videoUrl: mediaUrl('04-el-precio-oculto-de-estudiar-de-noche.mp4'),
    sha256: '5a1f28d88f411104aed80e2b80c5fc587694f96910e3d1c35d51202a50d11a34',
  },
  {
    id: 5,
    phrase: 'Un solo celular para varios estudiantes',
    sourceFilename: 'El_precio_de_una_pantalla_compartida.mp4',
    webFilename: '05-el-precio-de-una-pantalla-compartida.mp4',
    videoUrl: mediaUrl('05-el-precio-de-una-pantalla-compartida.mp4'),
    sha256: '6c1a6658f34b3d36c42ff0c06ebce13985df8b72e8074b170d4cd21e4061dad9',
  },
  {
    id: 6,
    phrase: 'Nunca es tarde para volver a estudiar',
    sourceFilename: 'El_tercer_turno_diario.mp4',
    webFilename: '06-el-tercer-turno-diario.mp4',
    videoUrl: mediaUrl('06-el-tercer-turno-diario.mp4'),
    sha256: '1d787a6c3298d4f756e01fced134931037a491623254a763c5186a7f183a93ea',
  },
  {
    id: 7,
    phrase: 'Entre las tareas y las responsabilidades del hogar',
    sourceFilename: 'El_turno_de_noche_antes_de_los_deberes.mp4',
    webFilename: '07-el-turno-de-noche-antes-de-los-deberes.mp4',
    videoUrl: mediaUrl('07-el-turno-de-noche-antes-de-los-deberes.mp4'),
    sha256: '40274c75ee37471a69e8a285bb8017203036e984c5c0f36b97b1ac8f6b4dbf76',
  },
  {
    id: 8,
    phrase: 'Una escuela con pocos recursos para aprender',
    sourceFilename: 'Aprender_a_contrarreloj_por_un_libro.mp4',
    webFilename: '08-aprender-a-contrarreloj-por-un-libro.mp4',
    videoUrl: mediaUrl('08-aprender-a-contrarreloj-por-un-libro.mp4'),
    sha256: '9d982f473e70d35755087593600cddbd3480b595b4a72d96bdfd2702d228ec2b',
  },
  {
    id: 9,
    phrase: 'Estudiar sin un espacio tranquilo',
    sourceFilename: 'El_privilegio_invisible_del_silencio.mp4',
    webFilename: '09-el-privilegio-invisible-del-silencio.mp4',
    videoUrl: mediaUrl('09-el-privilegio-invisible-del-silencio.mp4'),
    sha256: 'bf8507695195ab365cf98ff56463d35f4e6f4b995ca0b7895eacc0b052ad749c',
  },
  {
    id: 10,
    phrase: 'Cuando la escuela no es accesible para todos',
    sourceFilename: 'El_muro_invisible_de_la_educación_escolar.mp4',
    webFilename: '10-el-muro-invisible-de-la-educacion-escolar.mp4',
    videoUrl: mediaUrl('10-el-muro-invisible-de-la-educacion-escolar.mp4'),
    sha256: '80a7ac6752225f4f9a8d5716797731917582b9687d099cdd546540d0112d53d0',
  },
  {
    id: 11,
    phrase: 'Cuando no alcanza para el transporte escolar',
    sourceFilename: 'El_precio_de_llegar_a_clase.mp4',
    webFilename: '11-el-precio-de-llegar-a-clase.mp4',
    videoUrl: mediaUrl('11-el-precio-de-llegar-a-clase.mp4'),
    sha256: '6f0fc189e3754a700d9ec513f165694ed3bb5a0c117944f82a0a7bab4b5305eb',
  },
  {
    id: 12,
    phrase: 'Aprender sin suficiente acompañamiento',
    sourceFilename: 'La_barrera_invisible_de_los_deberes.mp4',
    webFilename: '12-la-barrera-invisible-de-los-deberes.mp4',
    videoUrl: mediaUrl('12-la-barrera-invisible-de-los-deberes.mp4'),
    sha256: '750bc3a295ccdc2d55aaaaf748c8ee0bc127c193940dda7939a229933f875fd5',
  },
] as const satisfies readonly Story[]
