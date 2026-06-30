import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// The TypeScript sources use NodeNext specifiers, importing siblings as
// './x.js' when the file on disk is './x.ts'. Vite does not remap that, so
// redirect relative .js specifiers to a .ts file when one exists.
const jsSpecifierToTs = {
  name: 'js-specifier-to-ts',
  enforce: 'pre',
  resolveId (source, importer) {
    if (importer == null) return null
    if (!source.startsWith('./') && !source.startsWith('../')) return null
    if (!source.endsWith('.js')) return null
    const candidate = resolve(dirname(importer.split('?')[0]), `${source.slice(0, -3)}.ts`)
    return existsSync(candidate) ? candidate : null
  }
}

export default defineConfig({
  plugins: [jsSpecifierToTs],
  test: {
    environment: 'node',
    globals: true,
    css: false,
    setupFiles: ['./test/setup/vitest-setup.js'],
    include: ['test/functional/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      include: ['add-on/src/**'],
      reporter: ['text']
    }
  }
})
