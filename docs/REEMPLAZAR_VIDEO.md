# Reemplazo seguro de un video

Este procedimiento protege la correspondencia entre historia, archivo y hash. No edites, recortes, recomprimas ni transcodifiques un original por accidente.

## Antes de empezar

1. Confirmá cuál de las doce historias se reemplazará.
2. Conservá el archivo original autorizado fuera de cualquier herramienta que pueda modificarlo automáticamente.
3. Identificá su nombre web canónico en `src/data/stories.ts`.
4. Trabajá solo sobre la copia correspondiente en `public/videos/`; no sobrescribas el original fuente.

El nombre canónico mantiene el formato numerado y sin espacios, por ejemplo `01-el-barro-antes-de-la-pizarra.mp4`. Si el reemplazo cambia la historia o el nombre, la frase, `sourceFilename`, `webFilename`, URL, allowlist de `worker/index.ts` y documentación deben seguir sincronizados. El Worker no acepta ningún nombre fuera de sus doce entradas exactas.

## Procedimiento

### 1. Reemplazá la copia canónica

Copiá el nuevo MP4 autorizado a `public/videos/<nombre-canónico>.mp4`. Evitá abrir y guardar el archivo con editores multimedia: una operación de guardado puede cambiar sus bytes aunque el video parezca igual.

### 2. Calculá el SHA-256

En PowerShell, desde la raíz del proyecto:

```powershell
(Get-FileHash -Algorithm SHA256 public/videos/<nombre-canónico>.mp4).Hash.ToLower()
```

En Linux o macOS:

```bash
sha256sum public/videos/<nombre-canónico>.mp4
```

Registrá exactamente los 64 caracteres hexadecimales en minúsculas.

### 3. Sincronizá el registro

Actualizá la única entrada correspondiente en `src/data/stories.ts`:

- `sourceFilename`: nombre real del original autorizado;
- `webFilename`: nombre de la copia canónica;
- argumento de `mediaUrl(...)`: el mismo `webFilename`;
- `sha256`: hash recién calculado;
- `phrase`: solo si el contenido aprobado exige cambiar la historia.

Actualizá también las expectativas exactas en `src/data/stories.test.ts`. Si cambió `webFilename`, reemplazá exactamente el mismo nombre en `worker/index.ts`; no agregues aliases, parámetros ni rutas genéricas. No modifiques otras correspondencias ni hashes.

### 4. Ejecutá todas las comprobaciones

Desde la raíz de este proyecto:

```bash
npm test -- --run
npm run build
npm run verify:media
npm run test:e2e
npm run build -- --base=/historias-que-nos-hacen-pensar/
npm exec wrangler -- deploy --dry-run
```

`verify:media` debe informar doce MP4 verificados. Además, inspeccioná `dist/` para confirmar que:

- existen los doce archivos en `dist/videos/`;
- los hashes de las copias construidas coinciden con `public/videos/`;
- `dist/index.html`, sus recursos y las URL MP4 del bundle usan `/historias-que-nos-hacen-pensar/` en la compilación de Pages.

### 5. Revisá y desplegá

Revisá el diff para confirmar que solo cambió el archivo canónico previsto y sus metadatos sincronizados. El despliegue ocurre por GitHub Actions desde `main`; no publiques una copia generada manualmente sobre los videos originales.

El dry-run solo valida el empaquetado: no despliega ni autentica el Worker. El despliegue de Cloudflare sigue pendiente hasta que la persona responsable lo ejecute y configure `VITE_MEDIA_BASE_URL` en las variables de GitHub Actions. Si querés probar la URL pública del Worker con Playwright, definí `PLAYWRIGHT_MEDIA_BASE_URL` con el origen HTTPS absoluto; sin esa variable, las pruebas conservan el modo local de mismo origen.

Después del despliegue, verificá desde un navegador limpio:

- carga HTTPS de la aplicación;
- ausencia de solicitudes MP4 antes de pulsar **VER VIDEO**;
- URL exacta de la historia reemplazada;
- respuesta `video/mp4`, `Accept-Ranges: bytes`, CORS para Pages y soporte real de respuestas 206 y 416;
- imagen, audio y avance de reproducción;
- funcionamiento de las otras once historias.

## Regla de seguridad

Si el hash no coincide, detenete. No “arregles” el archivo mediante conversión ni actualices el hash sin confirmar que esos bytes son el reemplazo autorizado. La integridad prueba identidad de bytes, no solamente que el video pueda reproducirse.
