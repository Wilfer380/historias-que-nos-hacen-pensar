# Historias que nos hacen pensar

Aplicación web en React y TypeScript para descubrir, sin repeticiones, doce historias de **Aprender Sin Barreras** mediante una ruleta interactiva. Cada resultado conserva una correspondencia verificada entre frase, archivo canónico y video original.

## Estado de publicación

El repositorio está preparado para GitHub Pages en `Wilfer380/historias-que-nos-hacen-pensar`.

**URL pública prevista (pendiente de despliegue y verificación):** `https://wilfer380.github.io/historias-que-nos-hacen-pensar/`

No se considera publicada hasta que el workflow se ejecute en `main` y se comprueben la página y las doce rutas MP4 desde un navegador limpio.

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

El desarrollo local usa `/` como base. Por eso las URL del registro se mantienen como `/videos/...` en desarrollo, pruebas unitarias y ejecución directa desde Node.

## Registro e integridad de medios

`src/data/stories.ts` es la fuente central de las doce correspondencias. Cada entrada contiene:

- identificador y frase;
- nombre del archivo original;
- nombre web canónico;
- URL calculada a partir de la base de Vite;
- SHA-256 esperado.

Los archivos publicados están en `public/videos/`. No se transcodifican: el nombre puede ser canónico, pero sus bytes deben seguir siendo idénticos a los del original autorizado.

Verificá el conjunto y sus hashes con:

```bash
npm run verify:media
```

El comando falla si falta o sobra un MP4, o si cualquier SHA-256 difiere del registro.

## Comprobaciones locales

```bash
npm test -- --run
npm run build
npm run verify:media
npm run test:e2e
npm run build -- --base=/historias-que-nos-hacen-pensar/
```

La última orden reproduce la base de producción. El resultado queda en `dist/`; los recursos de la aplicación y las URL MP4 del bundle deben empezar con `/historias-que-nos-hacen-pensar/`.

## Despliegue

`.github/workflows/deploy-pages.yml` se activa al enviar cambios a `main` (o manualmente). El workflow:

1. instala dependencias reproducibles con `npm ci`;
2. ejecuta las pruebas unitarias;
3. verifica los doce hashes;
4. compila con la base `/historias-que-nos-hacen-pensar/`;
5. sube `dist/` como artefacto de Pages;
6. despliega mediante las acciones oficiales de GitHub Pages.

Antes del primer despliegue, el repositorio debe tener **Settings → Pages → Source: GitHub Actions**. Después, verificá externamente el HTTPS, el tipo `video/mp4`, las respuestas por rango, la carga diferida y la reproducción de los doce videos. No edites este documento para marcar la URL como disponible antes de completar esas comprobaciones.

## Reemplazar un video

Seguí el procedimiento seguro de [`docs/REEMPLAZAR_VIDEO.md`](docs/REEMPLAZAR_VIDEO.md). El principio central es reemplazar únicamente la copia canónica autorizada, recalcular el SHA-256, sincronizar el registro y ejecutar todas las comprobaciones antes de desplegar.
