# Reemplazo seguro de un video

Este procedimiento protege la correspondencia entre historia, archivo y hash. No edites, recortes, recomprimas ni transcodifiques un original por accidente.

## Antes de empezar

1. Confirmá cuál de las doce historias se reemplazará.
2. Conservá el archivo original autorizado fuera de cualquier herramienta que pueda modificarlo.
3. Identificá su nombre web canónico en `src/data/stories.ts`.
4. Trabajá solo sobre la copia correspondiente en `public/videos/`.

El nombre canónico mantiene el formato numerado y sin espacios, por ejemplo `01-el-barro-antes-de-la-pizarra.mp4`. Si cambia la historia o el nombre, la frase, `sourceFilename`, `webFilename`, URL, pruebas y documentación deben seguir sincronizados. No agregues aliases, parámetros ni rutas genéricas: producción admite exactamente los doce nombres del registro.

## Procedimiento

### 1. Reemplazá la copia canónica

Copiá el MP4 autorizado a `public/videos/<nombre-canónico>.mp4`. Evitá abrirlo y guardarlo con editores multimedia: el guardado puede cambiar los bytes aunque el video parezca igual.

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

Actualizá también las expectativas exactas en `src/data/stories.test.ts`. No modifiques las otras once correspondencias ni sus hashes.

La base de producción permanece fija en:

```text
https://raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/
```

No cambies rama, repositorio, autoridad ni ruta para publicar un reemplazo.

### 4. Ejecutá todas las comprobaciones

Desde la raíz de este proyecto:

```bash
npm test -- --run
npm run build
npm run verify:media
npm run test:e2e
set VITE_MEDIA_BASE_URL=https://raw.githubusercontent.com/Wilfer380/historias-que-nos-hacen-pensar/main/public/videos/&& npm run build -- --base=/historias-que-nos-hacen-pensar/
```

Inspeccioná además `dist/` para confirmar que contiene la base exacta de GitHub Raw y los doce nombres canónicos, mientras un build local sin variable conserva `/videos/...`.

### 5. Revisá, desplegá y verificá

Revisá el diff para confirmar que solo cambió el archivo previsto y sus metadatos sincronizados. GitHub Actions publica la aplicación en GitHub Pages desde `main`; no subas manualmente una copia generada.

Después del redespliegue, verificá desde un navegador limpio:

- carga HTTPS de la aplicación;
- cero solicitudes MP4 antes de pulsar **VER VIDEO**;
- URL exacta de la historia reemplazada bajo la base fija;
- respuesta completa `200` y rango real `206`;
- `Accept-Ranges: bytes`, `Content-Range`, `Content-Length` y CORS `*`;
- `Content-Type: application/octet-stream`, que es la limitación conocida de GitHub Raw;
- imagen, audio, frames y avance de reproducción;
- funcionamiento y liberación de recursos de las otras once historias en Chrome, Edge y Firefox.

Como referencia, antes de este cambio el video 1 reprodujo directamente en los tres navegadores con 720×1280, duración 58.351746 s, avance mayor que 0.2 s, `readyState` 4, una pista de audio y ningún error multimedia. No uses esa evidencia para afirmar que la suite pública completa pasó después de un redespliegue nuevo.

## Regla de seguridad

Si el hash no coincide, detenete. No “arregles” el archivo mediante conversión ni actualices el hash sin confirmar que esos bytes son el reemplazo autorizado. La integridad prueba identidad de bytes, no solamente que el video pueda reproducirse.
