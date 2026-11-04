import { describe, expect, it } from 'vitest'
import { stories } from './stories'

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

  it('uses lowercase SHA-256 values', () => {
    for (const story of stories) {
      expect(story.sha256).toMatch(/^[a-f0-9]{64}$/)
    }
  })
})
