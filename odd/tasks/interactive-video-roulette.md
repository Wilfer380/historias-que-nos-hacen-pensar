# Interactive Video Roulette

## Objective

Build and publish **“Historias que nos hacen pensar”**, a responsive Spanish-language roulette for the “Aprender Sin Barreras” community project. Each of twelve non-repeating outcomes must reveal the exact configured phrase, highlight the exact segment selected by the fixed pointer, and lazily load the corresponding original MP4 in an integrated player.

## Problem and Why

The virtual event needs a reliable, shareable HTTPS experience that works without local folders, downloads, installations, or a developer machine remaining online. Correct phrase-to-video correspondence and real browser playback are more important than decorative effects.

## Scope

- React + TypeScript responsive single-page application.
- SVG or Canvas wheel with twelve numbered segments, progressive spin deceleration, exact pointer/result agreement, persistent revealed segments, no repeats, and reset.
- Central typed story registry containing number, Spanish phrase, source filename, canonical web filename, URL, and SHA-256.
- Byte-identical canonical copies of all twelve original MP4 files; originals remain untouched.
- Integrated lazy-loaded HTML5 video player with loading/error states, controls, fullscreen support, restart, close, cleanup, and portrait-video layout.
- Automated unit/component tests plus Playwright browser tests.
- Public HTTPS deployment and post-deployment validation of the app and all twelve video routes.
- Spanish replacement/deployment documentation.

## Out of Scope

- Editing, transcoding, trimming, regenerating, or otherwise modifying source videos.
- Autoplaying or preloading all videos when the page opens.
- Paid hosting without explicit user authorization.
- Localhost or local filesystem paths as the final delivery.

## Critical Story Mapping

| No. | Phrase | Actual original file | Canonical web file | SHA-256 |
|---:|---|---|---|---|
| 1 | El largo camino hacia la escuela | `El_barro_antes_de_la_pizarra.mp4` | `01-el-barro-antes-de-la-pizarra.mp4` | `65087b92e433094bab357bd785b6875823d794d450ea93e81b8f979ccc8719cb` |
| 2 | Sin internet para estudiar | `El_precio_de_una_barra_de_cobertura.mp4` | `02-el-precio-de-una-barra-de-cobertura.mp4` | `ec7542131afaf56ec46b5c0a0905b95a1076a72f060137ab121516afa618eb27` |
| 3 | Estudiar sin materiales escolares suficientes | `Aprender_con_las_manos_vacías.mp4` | `03-aprender-con-las-manos-vacias.mp4` | `a422a5b19fe451f708253bf2c7df6dd4370e8c71f84b3b9cd4a3092dd654c194` |
| 4 | Trabajar de día y estudiar de noche | `El_precio_oculto_de_estudiar_de_noche.mp4` | `04-el-precio-oculto-de-estudiar-de-noche.mp4` | `5a1f28d88f411104aed80e2b80c5fc587694f96910e3d1c35d51202a50d11a34` |
| 5 | Un solo celular para varios estudiantes | `El_precio_de_una_pantalla_compartida.mp4` | `05-el-precio-de-una-pantalla-compartida.mp4` | `6c1a6658f34b3d36c42ff0c06ebce13985df8b72e8074b170d4cd21e4061dad9` |
| 6 | Nunca es tarde para volver a estudiar | `El_tercer_turno_diario.mp4` | `06-el-tercer-turno-diario.mp4` | `1d787a6c3298d4f756e01fced134931037a491623254a763c5186a7f183a93ea` |
| 7 | Entre las tareas y las responsabilidades del hogar | `El_turno_de_noche_antes_de_los_deberes.mp4` | `07-el-turno-de-noche-antes-de-los-deberes.mp4` | `40274c75ee37471a69e8a285bb8017203036e984c5c0f36b97b1ac8f6b4dbf76` |
| 8 | Una escuela con pocos recursos para aprender | `Aprender_a_contrarreloj_por_un_libro.mp4` | `08-aprender-a-contrarreloj-por-un-libro.mp4` | `9d982f473e70d35755087593600cddbd3480b595b4a72d96bdfd2702d228ec2b` |
| 9 | Estudiar sin un espacio tranquilo | `El_privilegio_invisible_del_silencio.mp4` | `09-el-privilegio-invisible-del-silencio.mp4` | `bf8507695195ab365cf98ff56463d35f4e6f4b995ca0b7895eacc0b052ad749c` |
| 10 | Cuando la escuela no es accesible para todos | `El_muro_invisible_de_la_educación_escolar.mp4` | `10-el-muro-invisible-de-la-educacion-escolar.mp4` | `80a7ac6752225f4f9a8d5716797731917582b9687d099cdd546540d0112d53d0` |
| 11 | Cuando no alcanza para el transporte escolar | `El_precio_de_llegar_a_clase.mp4` | `11-el-precio-de-llegar-a-clase.mp4` | `6f0fc189e3754a700d9ec513f165694ed3bb5a0c117944f82a0a7bab4b5305eb` |
| 12 | Aprender sin suficiente acompañamiento | `La_barrera_invisible_de_los_deberes.mp4` | `12-la-barrera-invisible-de-los-deberes.mp4` | `750bc3a295ccdc2d55aaaaf748c8ee0bc127c193940dda7939a229933f875fd5` |

The six `(1)` suffixes in the initial specification are absent from the supplied files. The mapping above adopts the observed originals while preserving the required semantic correspondence.

## Constraints and Decisions

- Supplied collection: 12 files, 105,517,157 bytes (100.63 MiB); no individual file exceeds 25 MiB.
- Canonical deployment copies may change filenames only; content hashes must remain identical.
- The source files in `C:/Users/wandica/Downloads/rule` are read-only inputs.
- Video URLs must be HTTPS in production, return `video/mp4`, and support browser playback/range requests.
- Production must not preload the twelve videos.
- Strict TDD mode: off. Source: the user requires automated tests and real playback validation but did not request strict RED/GREEN sequencing, and this new project has no existing TDD configuration. Ordinary functional testing remains mandatory.
- Planned runners: `npm test`, `npm run build`, and `npm run test:e2e` after project scaffolding.
- Delivery strategy: `ask-on-risk` because the forecast exceeds 400 authored lines.
- Chain strategy: `feature-branch-chain`, explicitly selected by the user. Implementation lives on `feature/interactive-video-roulette` and each coherent task closes with a work-unit commit.

## Review Workload Forecast

Expected authored source/test/documentation changes: approximately 1,200–1,800 lines, excluding the twelve binary videos and generated lockfile. Work will be implemented and verified as cohesive work units rather than compressed to fit a line target.

## Actionable Checklist

- [x] **T1 — Scaffold and protect the media registry**
  - Initialized the React + TypeScript project and test tooling.
  - Added the typed twelve-story registry and integrity manifest.
  - Copied each source MP4 to its canonical web filename without altering bytes.
  - Added automated mapping/integrity checks.
  - Checks passed: exactly twelve unique IDs/phrases/URLs; expected SHA-256 values; all deployed-copy hashes match.
  - Work-unit commit: `cf37302` (`feat(media): establish verified story registry`).
  - Native assessment/review was unavailable because the native authority inventory returned `schema-incompatible`; the required independent verifier completed with no findings.

- [x] **T2 — Implement exact non-repeating roulette behavior**
  - Built the responsive SVG wheel, fixed pointer, eased animation, exported selection math, revealed state, end-of-round state, and reset.
  - Verified that the resting rotation, pointer, selected segment, displayed phrase, and selected story ID agree across all twelve IDs.
  - Added accessible status semantics, keyboard-operable controls, focus styles, reduced-motion handling, and responsive layouts.
  - Checks passed: twelve initial numbers; no initial selection; disabled control while spinning; deterministic selection tests; no repeats; persistent red revealed segments; full-round completion; reset restores state.
  - Corrected a verifier finding so the twelfth story remains visible in the result panel alongside the separate round-complete message.
  - Work-unit commit: `644105d` (`feat(roulette): add exact non-repeating spins`).
  - Independent re-verification completed with no remaining findings.

- [x] **T3 — Implement the integrated lazy video player**
  - The video element and source are created only after the user presses “VER VIDEO” for a selected story.
  - Implemented loading/waiting/error states, autoplay-policy fallback, native controls, restart, close, cleanup, and portrait-friendly containment.
  - Added focused component tests for exact URL selection, playback attempt, lifecycle cleanup, story switching, reset, and preserved roulette progress.
  - Checks passed: no video element/source before explicit activation; selected URL matches selected ID; close pauses, removes the source, calls `load()`, and preserves revealed stories; switching stories and reset release prior media.
  - Work-unit commit: `bc106ce` (`feat(video): add lazy integrated playback`).
  - Independent verification completed with no findings; real decoding/rendering/audio validation remains assigned to T4.

- [x] **T4 — Run local browser and media verification**
  - Added Playwright coverage for deterministic roulette state, exact mapping, lazy request timing, no repeats, reset, responsive interaction, and all twelve video routes.
  - Validated exact HTTP 200/206 semantics, `video/mp4`, byte ranges, finite duration, positive dimensions, presented frames, exposed audio tracks, time progression, pause/resume, restart, close cleanup, and story switching.
  - Chrome ran the exhaustive twelve-video lifecycle; Chrome, Edge, and Firefox ran compatibility plus desktop/mobile interaction checks.
  - Checks passed: `npm test -- --run` (19 tests), `npm run build`, `npm run verify:media` (12 hashes), and `npm run test:e2e` (12 passed, 6 deliberately browser-scoped skips).
  - Work-unit commit: `77d3442` (`test(e2e): verify roulette and all media`).
  - Independent verification initially found coverage gaps; two correction rounds closed them, and final re-verification reported no findings.

- [ ] **T5 — Deploy and verify public HTTPS delivery**
  - Select an authorized free provider based on actual limits and available user access.
  - Deploy the site and byte-identical videos.
  - Validate the public page and all twelve HTTPS MP4 URLs from a clean browser context, including content type, range behavior, image/audio, and time progression.
  - Document how to replace a video and re-run integrity/deployment checks.
  - Checks: public HTTPS URL works outside localhost; all twelve production media tests pass; final URL is reported only after verification.

## Acceptance Criteria

1. A participant can open one public HTTPS URL without installing software.
2. The wheel begins with twelve numbers and no selected/revealed story.
3. Every spin ends with exact agreement among pointer, segment, phrase, story ID, and video URL.
4. Revealed stories stay red and visible, and cannot repeat until reset.
5. “VER VIDEO” appears only after selection and opens the correct original video inside the same page.
6. The selected video visibly renders frames, has its original audio when present, and advances playback time.
7. Closing the player stops playback, releases the resource, and preserves roulette progress.
8. Reset restores all twelve numbers, colors, and selection state.
9. The deployed application lazily requests only the chosen video.
10. All twelve deployed videos are byte-identical to their supplied originals and available over stable HTTPS URLs.

## Progress and Evidence

- Input audit complete: exactly twelve MP4 files found.
- SHA-256 and byte-size audit complete using Python standard-library read-only hashing.
- Total input size: 105,517,157 bytes (100.63 MiB); largest files are approximately 10 MiB, so no file crosses the common 25 MiB per-asset threshold.
- Full codec/audio/duration metadata is still pending because `ffprobe` is not installed.
- T1 ordinary verification passed: `npm test -- --run` (3 tests), `npm run build`, and `npm run verify:media` (12 hashes).
- An independent verification run repeated all three commands and reported no findings.
- Parent spot check repeated `npm run verify:media` successfully.
- T1 was committed as work unit `cf37302` on `feature/interactive-video-roulette`.
- T2 ordinary verification passed: `npm test -- --run` (11 tests), `npm run build`, and `npm run verify:media` (12 hashes).
- Independent T2 verification found one final-spin result-panel defect; it was corrected and independently re-verified with no remaining findings.
- Parent spot check ran the focused roulette suite successfully (6 tests).
- T2 was committed as work unit `644105d` on `feature/interactive-video-roulette`.
- An accidental root-level npm installation was diagnosed and its exact three generated artifacts were removed after explicit user authorization; the nested project remained intact.
- T3 ordinary verification passed: `npm test -- --run` (19 tests), `npm run build`, and `npm run verify:media` (12 hashes).
- Independent T3 verification found no issues and confirmed all cleanup paths; parent focused player spot check passed 5 tests.
- T3 was committed as work unit `bc106ce` on `feature/interactive-video-roulette`.
- T4 final browser matrix passed: Chrome 6/6; Edge 3/3 applicable; Firefox 3/3 applicable; 6 skips were deliberate Chrome-only exhaustive/HTTP scopes.
- All twelve Chrome videos had finite durations (53.96–70.36 seconds), positive dimensions, advancing time, a presented frame via `requestVideoFrameCallback`, and one audio track via `captureStream()`.
- Network tests proved zero MP4 requests before explicit activation, only the selected allowlisted URL afterward, exact HTTP 200 full responses, and exact HTTP 206 range responses.
- T4 was committed as work unit `77d3442` on `feature/interactive-video-roulette`.

## Next Step

Execute T5: document video replacement, deploy the production build to an authorized free HTTPS provider, then rerun route, range, lazy-load, roulette, responsive, and all-video playback checks against the public URL.
