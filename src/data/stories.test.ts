import { describe, expect, it } from 'vitest'
import { RAW_GITHUB_MEDIA_BASE_URL, normalizeMediaBaseURL, stories } from './stories'

const expectedMapping = [
  [1, 'El largo camino hacia la escuela', 'El_barro_antes_de_la_pizarra.mp4', '01-el-barro-antes-de-la-pizarra.mp4'],
  [2, 'Sin internet para estudiar', 'El_precio_de_una_barra_de_cobertura.mp4', '02-el-precio-de-una-barra-de-cobertura.mp4'],
  [3, 'Estudiar sin materiales escolares suficientes', 'Aprender_con_las_manos_vacías.mp4', '03-aprender-con-las-manos-vacias.mp4'],
  [4, 'Trabajar de día y estudiar de noche', 'El_precio_oculto_de_estudiar_de_noche.mp4', '04-el-precio-oculto-de-estudiar-de-noche.mp4'],
  [5, 'Un solo celular para varios estudiantes', 'El_precio_de_una_pantalla_compartida.mp4', '05-el-precio-de-una-pantalla-compartida.mp4'],
  [6, 'Nunca es tarde para volver a estudiar', 'El_tercer_turno_diario.mp4', '06-el-tercer-turno-diario.mp4'],
  [7, 'Entre las tareas y las responsabilidades del hogar', 'El_turno_de_noche_antes_de_los_deberes.mp4', '07-el-turno-de-noche-antes-de-los-deberes.mp4'],
  [8, 'Una escuela con pocos recursos para aprender', 'Aprender_a_contrarreloj_por_un_libro.mp4', '08-aprender-a-contrarreloj-por-un-libro.mp4'],
  [9, 'Estudiar sin un espacio tranquilo', 'El_privilegio_invisible_del_silencio.mp4', '09-el-privilegio-invisible-del-silencio.mp4'],
  [10, 'Cuando la escuela no es accesible para todos', 'El_muro_invisible_de_la_educación_escolar.mp4', '10-el-muro-invisible-de-la-educacion-escolar.mp4'],
  [11, 'Cuando no alcanza para el transporte escolar', 'El_precio_de_llegar_a_clase.mp4', '11-el-precio-de-llegar-a-clase.mp4'],
  [12, 'Aprender sin suficiente acompañamiento', 'La_barrera_invisible_de_los_deberes.mp4', '12-la-barrera-invisible-de-los-deberes.mp4'],
] as const

const expectedHashes = [
  '65087b92e433094bab357bd785b6875823d794d450ea93e81b8f979ccc8719cb',
  'ec7542131afaf56ec46b5c0a0905b95a1076a72f060137ab121516afa618eb27',
  'a422a5b19fe451f708253bf2c7df6dd4370e8c71f84b3b9cd4a3092dd654c194',
  '5a1f28d88f411104aed80e2b80c5fc587694f96910e3d1c35d51202a50d11a34',
  '6c1a6658f34b3d36c42ff0c06ebce13985df8b72e8074b170d4cd21e4061dad9',
  '1d787a6c3298d4f756e01fced134931037a491623254a763c5186a7f183a93ea',
  '40274c75ee37471a69e8a285bb8017203036e984c5c0f36b97b1ac8f6b4dbf76',
  '9d982f473e70d35755087593600cddbd3480b595b4a72d96bdfd2702d228ec2b',
  'bf8507695195ab365cf98ff56463d35f4e6f4b995ca0b7895eacc0b052ad749c',
  '80a7ac6752225f4f9a8d5716797731917582b9687d099cdd546540d0112d53d0',
  '6f0fc189e3754a700d9ec513f165694ed3bb5a0c117944f82a0a7bab4b5305eb',
  '750bc3a295ccdc2d55aaaaf748c8ee0bc127c193940dda7939a229933f875fd5',
] as const

describe('story registry', () => {
  it('contains exactly 12 unique IDs, phrases, and URLs', () => {
    expect(stories).toHaveLength(12)
    expect(new Set(stories.map(({ id }) => id))).toHaveLength(12)
    expect(new Set(stories.map(({ phrase }) => phrase))).toHaveLength(12)
    expect(new Set(stories.map(({ videoUrl }) => videoUrl))).toHaveLength(12)
  })

  it('preserves the exact phrase-to-file mapping', () => {
    expect(
      stories.map(({ id, phrase, sourceFilename, webFilename, videoUrl }) => [
        id,
        phrase,
        sourceFilename,
        webFilename,
        videoUrl,
      ]),
    ).toEqual(expectedMapping.map(([id, phrase, source, web]) => [id, phrase, source, web, `/videos/${web}`]))
  })

  it('normalizes only the exact raw GitHub media base into twelve allowlisted URLs', () => {
    const base = normalizeMediaBaseURL(RAW_GITHUB_MEDIA_BASE_URL.slice(0, -1))
    const urls = stories.map(({ webFilename }) => `${base}${webFilename}`)
    expect(base).toBe(RAW_GITHUB_MEDIA_BASE_URL)
    expect(urls).toHaveLength(12)
    expect(new Set(urls)).toHaveLength(12)
    expect(urls).toEqual(expectedMapping.map(([, , , web]) => `${RAW_GITHUB_MEDIA_BASE_URL}${web}`))
  })

  it('keeps same-origin local media but rejects every configured alternative loudly', () => {
    expect(normalizeMediaBaseURL(undefined)).toBe('/videos/')
    expect(normalizeMediaBaseURL(undefined, '/historias-que-nos-hacen-pensar/')).toBe('/historias-que-nos-hacen-pensar/videos/')

    for (const invalid of [
      '',
      '/videos/',
      'http://raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/',
      'https://github.com/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/',
      'https://raw.githubusercontent.com:443/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/',
      'https://user:secret@raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/',
      'https://raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/dev/public/videos/',
      'https://raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/main/videos/',
      `${RAW_GITHUB_MEDIA_BASE_URL}?download=1`,
      `${RAW_GITHUB_MEDIA_BASE_URL}#media`,
    ]) {
      expect(() => normalizeMediaBaseURL(invalid), invalid).toThrow(`VITE_MEDIA_BASE_URL must be exactly ${RAW_GITHUB_MEDIA_BASE_URL}`)
    }
  })

  it('uses the exact lowercase SHA-256 values', () => {
    expect(stories.map(({ sha256 }) => sha256)).toEqual(expectedHashes)
    for (const story of stories) {
      expect(story.sha256).toMatch(/^[a-f0-9]{64}$/)
    }
  })
})
