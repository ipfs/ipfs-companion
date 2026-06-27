import globals from 'globals'
import neostandard from 'neostandard'

// vitest's test API (used as globals via vitest.config.js `globals: true`),
// plus the before/after aliases test/setup/vitest-setup.js installs.
const vitestGlobals = {
  suite: 'readonly',
  test: 'readonly',
  describe: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  vi: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  before: 'readonly',
  after: 'readonly'
}

export default [
  {
    ignores: [
      ...neostandard.resolveIgnoresFromGitignore(),
      'add-on/dist/**',
      'add-on/ui-kit/**',
      'add-on/webui/**',
      'build/**'
    ]
  },
  ...neostandard({ ts: true }),
  {
    // void-as-statement marks deliberately unawaited promises (fire-and-forget)
    rules: {
      'no-void': ['error', { allowAsStatement: true }]
    }
  },
  {
    // extension code runs in browser windows and the MV3 service worker
    files: ['add-on/src/**/*.js', 'add-on/src/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.serviceworker, ...globals.webextensions }
    }
  },
  {
    // tests, build configs, and scripts run in node; tests add vitest globals
    files: ['test/**/*.js', 'test/**/*.ts', '*.config.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: { ...globals.node, ...vitestGlobals }
    }
  },
  {
    // chai getter assertions (expect(x).to.be.true) read as unused expressions
    files: ['test/**/*.js', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-unused-expressions': 'off'
    }
  }
]
