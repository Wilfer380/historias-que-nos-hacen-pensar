import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pagesBase = '/historias-que-nos-hacen-pensar/'

export default defineConfig({
  // Local development and tests stay at root. Deployment overrides this with
  // --base=/historias-que-nos-hacen-pensar/.
  base: '/',
  plugins: [
    react(),
    {
      name: 'normalize-msys-pages-base',
      config(config, { command }) {
        // Git Bash expands a leading-slash CLI value into its installation
        // path before npm receives it. Keep the documented command portable.
        if (command === 'build' && config.base?.replaceAll('\\', '/').endsWith(pagesBase)) {
          return { base: pagesBase }
        }
      },
    },
  ],
})
