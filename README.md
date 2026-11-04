# Historias que nos hacen pensar

Aplicación web en React y TypeScript para descubrir, sin repeticiones, doce historias de **Aprender Sin Barreras** mediante una ruleta interactiva. Cada resultado conserva una correspondencia verificada entre frase, archivo canónico y video original.

## Estado de publicación

La aplicación se publica únicamente con GitHub Pages desde `Wilfer380/historias-que-nos-hacen-pensar`.

**URL pública prevista (pendiente de redespliegue y verificación completa):** `https://wilfer380.github.io/historias-que-nos-hacen-pensar/`

Los MP4 de producción se sirven directamente desde esta base pública e inmutable en la configuración:

```text
https://raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/
```

GitHub Raw respondió con rangos reales `206`, `Content-Range` y `Content-Length` válidos, `Accept-Ranges: bytes` y CORS `*`. Su limitación conocida es que entrega los MP4 como `Content-Type: application/octet-stream`, no como `video/mp4`.

La compatibilidad directa se comprobó con el video 1 en Chrome, Edge y Firefox: resolución 720×1280, duración 58.351746 s, avance mayor que 0.2 s, `readyState` 4, una pista de audio y ningún error multimedia. Esta evidencia no equivale a afirmar que la suite pública final de las doce historias pasó después del redespliegue; esa comprobación sigue pendiente.

## Requisitos

- Node.js 22
- npm
- Chrome y Edge instalados en las rutas usadas por `playwright.config.ts`; Firefox de Playwright disponible para la matriz local

## Desarrollo local

Ejecutá todos los comandos desde la raíz de este proyecto:

```bash
npm ci
npm run dev
```

Sin `VITE_MEDIA_BASE_URL`, desarrollo, pruebas y builds manuales conservan rutas del mismo origen `/videos/...` (o la base de Vite seguida de `videos/...`). Si se define, la variable solo admite la base exacta de GitHub Raw indicada arriba; se rechazan otros esquemas, autoridades, ramas, rutas, puertos, credenciales, queries y fragmentos.

`PLAYWRIGHT_MEDIA_BASE_URL` aplica la misma regla. Si no está definida, Playwright prueba `/videos/...` en el origen de la aplicación.

## Registro e integridad de medios

`src/data/stories.ts` es la fuente central de las doce correspondencias. Cada entrada contiene identificador, frase, nombre original, nombre web canónico, URL calculada y SHA-256 esperado. La allowlist permanece limitada exactamente a esos doce nombres.

Los archivos están en `public/videos/` y no se transcodifican. Verificá nombres y hashes con:

```bash
npm run verify:media
```

## Comprobaciones locales

```bash
npm test -- --run
npm run build
npm run verify:media
npm run test:e2e
set VITE_MEDIA_BASE_URL=https://raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/&& npm run build -- --base=/historias-que-nos-hacen-pensar/
```

La E2E exige `video/mp4` para el servidor local. Solo acepta `application/octet-stream` cuando cada URL pertenece a la allowlist exacta bajo la base exacta de GitHub Raw. También comprueba respuestas completas `200`, rangos `206`, cabeceras, ausencia de carga antes del clic, URL seleccionada, reproducción, frames, audio, tiempo, liberación de recursos y los tres navegadores.

## Uso con Microsoft Teams

Para una dinámica guiada, la persona presentadora comparte en Teams la ventana del navegador con la aplicación, selecciona a una persona participante en los controles de Teams y le concede el control. Ese permiso continúa hasta que la persona presentadora lo revoca o detiene el control. La aplicación no lee ni muestra los nombres de participantes de Teams: el flujo de selección y permisos pertenece por completo a Teams.

El enlace público también se puede compartir por separado. En ese caso, cada navegador mantiene su propio estado independiente de la ruleta; los giros, historias descubiertas y videos abiertos no se sincronizan entre participantes.

## Despliegue

`.github/workflows/deploy-pages.yml` se activa en `main` o manualmente. Instala dependencias, ejecuta unitarias, verifica hashes, compila con `/historias-que-nos-hacen-pensar/` y despliega mediante las acciones oficiales de GitHub Pages.

El workflow fija directamente la base exacta de GitHub Raw; no confía en variables del repositorio. Antes del primer despliegue, configurá **Settings → Pages → Source: GitHub Actions**. No hay infraestructura adicional ni proveedor externo que configurar.

Para comprobar la publicación después del redespliegue:

```bash
set PLAYWRIGHT_BASE_URL=https://wilfer380.github.io/historias-que-nos-hacen-pensar/
set PLAYWRIGHT_MEDIA_BASE_URL=https://raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/
npm run test:e2e
```

No marques la suite pública como aprobada hasta ejecutar esa matriz contra el despliegue nuevo y registrar cualquier diferencia respecto de la evidencia directa ya observada.

## Reemplazar un video

Seguí el procedimiento seguro de [`docs/REEMPLAZAR_VIDEO.md`](docs/REEMPLAZAR_VIDEO.md). Reemplazá únicamente la copia canónica autorizada, recalculá el SHA-256, sincronizá el registro y ejecutá todas las comprobaciones antes de desplegar.
